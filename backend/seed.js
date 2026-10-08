const mongoose = require("mongoose");
require("dotenv").config();
const Job = require("./models/job");

const deadline = new Date();
deadline.setDate(deadline.getDate() + 30);

const jobs = [
  {
    title: "Junior React Developer",
    company: "Tech Solutions",
    location: "Prayagraj",
    type: "Full-time",
    salary: "₹15,000/month",
    skills: ["React", "JavaScript", "CSS"],
    description: "Fresher React developer required.",
    vacancies: 3,
    deadline,
  },
  {
    title: "Frontend Developer Intern",
    company: "WebTech",
    location: "Noida",
    type: "Internship",
    salary: "₹10,000/month",
    skills: ["HTML", "CSS", "JavaScript"],
    description: "Frontend internship for freshers.",
    vacancies: 5,
    deadline,
  },
  {
    title: "MERN Stack Developer",
    company: "Code Labs",
    location: "Remote",
    type: "Full-time",
    salary: "₹20,000/month",
    skills: ["React", "Node.js", "MongoDB"],
    description: "MERN stack developer for entry-level role.",
    vacancies: 2,
    deadline,
  },
];

async function seedJobs() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);

    const existingCount = await Job.countDocuments();

    if (existingCount > 0) {
      console.log(`Jobs already exist (${existingCount}). Skipping seed.`);
      return;
    }

    await Job.insertMany(jobs);
    console.log("3 jobs added successfully!");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedJobs();
