const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const Application = require("../models/Application");
const Job = require("../models/Job");
const User = require("../models/User");

// ===============================
// Verify Logged-in User
// ===============================
const verifyUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Please login first",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("User verification error:", error);

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

// ===============================
// Verify Admin
// ===============================
const verifyAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.userId);

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Admin verification error:", error);

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

// ===============================
// Apply For Job
// ===============================
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

    // Required fields
    if (!jobId || !applicantName || !applicantEmail) {
      return res.status(400).json({
        message: "Job ID, name and email are required",
      });
    }

    // Find Job
    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    // ===============================
    // Check Application Deadline
    // ===============================
    if (
      job.deadline &&
      new Date() > new Date(job.deadline)
    ) {
      return res.status(400).json({
        message: "Applications are closed for this job",
      });
    }

    // ===============================
    // Prevent Duplicate Application
    // ===============================
    const existingApplication =
      await Application.findOne({
        job: jobId,
        user: req.user._id,
      });

    if (existingApplication) {
      return res.status(400).json({
        message: "You have already applied for this job",
      });
    }

    // ===============================
    // Create Application
    // ===============================
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
      message:
        "Your application has been submitted successfully!",
      application,
    });
  } catch (error) {
    console.error("Application error:", error);

    res.status(500).json({
      message: "Failed to submit application",
    });
  }
});

// ===============================
// My Applications
// ===============================
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

// ===============================
// View All Applications - Admin
// ===============================
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

// ===============================
// Update Application Status - Admin
// ===============================
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

    const application =
      await Application.findByIdAndUpdate(
        req.params.id,
        {
          status,
        },
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
      message:
        "Application status updated successfully!",
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