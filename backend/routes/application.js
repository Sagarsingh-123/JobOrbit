const express = require("express");
const router = express.Router();

const Application = require("../models/application");
const Job = require("../models/job");
const { verifyUser, verifyAdmin } = require("../middleware/auth");

router.post("/", verifyUser, async (req, res) => {
  try {
    const {
      jobId,
      applicantName,
      applicantEmail,
      phone,
      resume,
      coverLetter,
    } = req.body;

    if (!jobId || !applicantName || !applicantEmail) {
      return res.status(400).json({
        message: "Job ID, name and email are required",
      });
    }

    if (req.user.role === "admin") {
      return res.status(403).json({
        message: "Admin accounts cannot apply for jobs",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    if (job.deadline && new Date() > new Date(job.deadline)) {
      return res.status(400).json({
        message: "Applications are closed for this job",
      });
    }

    const existingApplication = await Application.findOne({
      job: jobId,
      user: req.user._id,
    });

    if (existingApplication) {
      return res.status(400).json({
        message: "You have already applied for this job",
      });
    }

    const appliedCount = await Application.countDocuments({ job: jobId });
    const vacancies = Number(job.vacancies);

    if (Number.isFinite(vacancies) && vacancies > 0 && appliedCount >= vacancies) {
      return res.status(400).json({
        message: "All vacancies for this job have been filled",
      });
    }

    const application = await Application.create({
      job: jobId,
      user: req.user._id,
      applicantName,
      applicantEmail,
      phone,
      resume,
      coverLetter,
      status: "Pending",
    });

    res.status(201).json({
      message: "Your application has been submitted successfully!",
      application,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "You have already applied for this job",
      });
    }

    console.error("Application error:", error);
    res.status(500).json({
      message: "Failed to submit application",
    });
  }
});

router.get("/my", verifyUser, async (req, res) => {
  try {
    const applications = await Application.find({
      user: req.user._id,
    })
      .populate("job")
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error("My applications error:", error);
    res.status(500).json({
      message: "Failed to load your applications",
    });
  }
});

router.get("/", verifyAdmin, async (req, res) => {
  try {
    const applications = await Application.find()
      .populate("job")
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error("Load applications error:", error);
    res.status(500).json({
      message: "Failed to load applications",
    });
  }
});

router.patch("/:id/status", verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = [
      "Pending",
      "Reviewed",
      "Shortlisted",
      "Rejected",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid application status",
      });
    }

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("job")
      .populate("user", "name email");

    if (!application) {
      return res.status(404).json({
        message: "Application not found",
      });
    }

    res.json({
      message: "Application status updated successfully!",
      application,
    });
  } catch (error) {
    console.error("Status update error:", error);
    res.status(500).json({
      message: "Failed to update application status",
    });
  }
});

module.exports = router;
