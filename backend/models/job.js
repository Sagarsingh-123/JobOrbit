const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    company: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["Full-time", "Internship", "Part-time"],
      default: "Full-time",
    },

    salary: {
      type: String,
      default: "Not disclosed",
    },

    skills: {
      type: [String],
      default: [],
    },

    description: {
      type: String,
      default: "",
    },

    // 👇 NEW: Total number of vacancies
    vacancies: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    // 👇 NEW: Last date to apply
    deadline: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Job", jobSchema);