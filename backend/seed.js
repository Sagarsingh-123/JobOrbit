const mongoose = require("mongoose");
require("dotenv").config();
const Job = require("./models/Job");

const jobs = [
  {
    title: "Junior React Developer",
    company: "Tech Solutions",
    location: "Prayagraj",
    type: "Full-time",
    salary: "₹15,000/month",
    skills: ["React", "JavaScript", "CSS"],
    description: "Fresher React developer required."
  },
  {
    title: "Frontend Developer Intern",
    company: "WebTech",
    location: "Noida",
    type: "Internship",
    salary: "₹10,000/month",
    skills: ["HTML", "CSS", "JavaScript"],
    description: "Frontend internship for freshers."
  },
  {
    title: "MERN Stack Developer",
    company: "Code Labs",
    location: "Remote",
    type: "Full-time",
    salary: "₹20,000/month",
    skills: ["React", "Node.js", "MongoDB"],
    description: "MERN stack developer for entry-level role."
  }
];

async function seedJobs() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Job.insertMany(jobs);
    console.log("3 jobs added successfully!");
  } catch (error) {
    console.log(error.message);
  } finally {
    await mongoose.disconnect();
  }
}

seedJobs();