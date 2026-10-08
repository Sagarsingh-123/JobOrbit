const express = require("express");
const router = express.Router();

const Job = require("../models/job");
const User = require("../models/user");
const Application = require("../models/application");
const { verifyAdmin } = require("../middleware/auth");

const withAppliedCounts = async (filter = {}) => {
  const jobs = await Job.find(filter).sort({ createdAt: -1 }).lean();
  const jobIds = jobs.map((job) => job._id);

  const counts = await Application.aggregate([
    { $match: { job: { $in: jobIds } } },
    { $group: { _id: "$job", appliedCount: { $sum: 1 } } },
  ]);

  const countMap = new Map(
    counts.map((item) => [String(item._id), item.appliedCount])
  );

  return jobs.map((job) => ({
    ...job,
    appliedCount: countMap.get(String(job._id)) || 0,
  }));
};

router.get("/admin/stats", verifyAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalAdmins,
      totalJobs,
      totalApplications,
      shortlistedApplications,
      pendingApplications,
      activeJobs,
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "admin" }),
      Job.countDocuments(),
      Application.countDocuments(),
      Application.countDocuments({ status: "Shortlisted" }),
      Application.countDocuments({ status: "Pending" }),
      Job.countDocuments({ deadline: { $gt: new Date() } }),
    ]);

    res.json({
      totalUsers,
      totalAdmins,
      totalJobs,
      activeJobs,
      totalApplications,
      shortlistedApplications,
      pendingApplications,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({
      message: "Failed to load admin stats",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const jobs = await withAppliedCounts();
    res.status(200).json(jobs);
  } catch (error) {
    console.error("Get jobs error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
});


router.get("/search", async (req, res) => {
  try {
    const { q, location } = req.query;
    const filter = {};

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { company: { $regex: q, $options: "i" } },
        { skills: { $regex: q, $options: "i" } },
      ];
    }

    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    const jobs = await withAppliedCounts(filter);
    res.json(jobs);
  } catch (error) {
    console.error("Search jobs error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).lean();

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    const appliedCount = await Application.countDocuments({
      job: job._id,
    });

    res.json({
      ...job,
      appliedCount,
    });
  } catch (error) {
    console.error("Get job error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
});

router.post("/", verifyAdmin, async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      type,
      salary,
      skills,
      description,
      vacancies,
      deadline,
    } = req.body;

    if (!title || !company || !location) {
      return res.status(400).json({
        message: "Title, company and location are required",
      });
    }

    if (!vacancies || Number(vacancies) < 1) {
      return res.status(400).json({
        message: "Vacancies must be at least 1",
      });
    }

    if (!deadline) {
      return res.status(400).json({
        message: "Application deadline is required",
      });
    }

    const deadlineDate = new Date(deadline);

    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({
        message: "Invalid deadline",
      });
    }

    if (deadlineDate <= new Date()) {
      return res.status(400).json({
        message: "Deadline must be a future date",
      });
    }

    const job = await Job.create({
      title,
      company,
      location,
      type,
      salary,
      skills,
      description,
      vacancies: Number(vacancies),
      deadline: deadlineDate,
    });

    res.status(201).json({
      message: "Job added successfully",
      job,
    });
  } catch (error) {
    console.error("Add job error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
});

router.put("/:id", verifyAdmin, async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      type,
      salary,
      skills,
      description,
      vacancies,
      deadline,
    } = req.body;

    const updateData = {
      title,
      company,
      location,
      type,
      salary,
      skills,
      description,
    };

    if (vacancies !== undefined) {
      if (Number(vacancies) < 1) {
        return res.status(400).json({
          message: "Vacancies must be at least 1",
        });
      }

      updateData.vacancies = Number(vacancies);
    }

    if (deadline !== undefined) {
      const deadlineDate = new Date(deadline);

      if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({
          message: "Invalid deadline",
        });
      }

      if (deadlineDate <= new Date()) {
        return res.status(400).json({
          message: "Deadline must be a future date",
        });
      }

      updateData.deadline = deadlineDate;
    }

    const job = await Job.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    res.json({
      message: "Job updated successfully",
      job,
    });
  } catch (error) {
    console.error("Edit job error:", error);
    res.status(500).json({
      message: error.message,
    });
  }
});

router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    await Application.deleteMany({
      job: req.params.id,
    });

    res.json({
      message: "Job deleted successfully",
    });
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({
      message: "Failed to delete job",
    });
  }
});

module.exports = router;
