const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    applicantName: {
      type: String,
      required: true,
    },

    applicantEmail: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
    },

    resume: {
      type: String,
    },

    coverLetter: {
      type: String,
    },

    status: {
      type: String,
      enum: ["Pending", "Reviewed", "Shortlisted", "Rejected"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

applicationSchema.index({ job: 1, user: 1 }, { unique: true, background: true });

module.exports = mongoose.model("Application", applicationSchema);