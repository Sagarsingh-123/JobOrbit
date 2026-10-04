const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const Job = require("../models/job");
const User = require("../models/User");
const Application = require("../models/Application");

// Verify Admin
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

/* =====================================================
   ADMIN STATS
   ===================================================== */

router.get("/admin/stats", verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({
      role: "user",
    });

    const totalAdmins = await User.countDocuments({
      role: "admin",
    });

    const totalJobs = await Job.countDocuments();

    const totalApplications =
      await Application.countDocuments();

    const shortlistedApplications =
      await Application.countDocuments({
        status: "Shortlisted",
      });

    const pendingApplications =
      await Application.countDocuments({
        status: "Pending",
      });

    const activeJobs = await Job.countDocuments({
      deadline: {
        $gt: new Date(),
      },
    });

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

/* =====================================================
   GET ALL JOBS
   ===================================================== */

router.get("/", async (req, res) => {
  try {
    const jobs = await Job.find()
      .sort({ createdAt: -1 })
      .lean();

    const jobsWithApplications = await Promise.all(
      jobs.map(async (job) => {
        const appliedCount =
          await Application.countDocuments({
            job: job._id,
          });

        return {
          ...job,
          appliedCount,
        };
      })
    );

    res.status(200).json(jobsWithApplications);
  } catch (error) {
    console.error("Get jobs error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
});

/* =====================================================
   SEARCH JOBS
   ===================================================== */

router.get("/search", async (req, res) => {
  try {
    const { q, location } = req.query;

    const filter = {};

    if (q) {
      filter.$or = [
        {
          title: {
            $regex: q,
            $options: "i",
          },
        },
        {
          company: {
            $regex: q,
            $options: "i",
          },
        },
        {
          skills: {
            $regex: q,
            $options: "i",
          },
        },
      ];
    }

    if (location) {
      filter.location = {
        $regex: location,
        $options: "i",
      };
    }

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const jobsWithApplications = await Promise.all(
      jobs.map(async (job) => {
        const appliedCount =
          await Application.countDocuments({
            job: job._id,
          });

        return {
          ...job,
          appliedCount,
        };
      })
    );

    res.json(jobsWithApplications);
  } catch (error) {
    console.error("Search jobs error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
});

/* =====================================================
   ADD NEW JOB - ADMIN ONLY
   ===================================================== */

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
        message:
          "Title, company and location are required",
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

/* =====================================================
   EDIT JOB - ADMIN ONLY
   ===================================================== */

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

      // Deadline must be in future
      if (deadlineDate <= new Date()) {
        return res.status(400).json({
          message: "Deadline must be a future date",
        });
      }

      updateData.deadline = deadlineDate;
    }

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

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

/* =====================================================
   DELETE JOB - ADMIN ONLY
   ===================================================== */

router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(
      req.params.id
    );

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    // Delete applications related to this job
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