require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function makeAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    const email = process.argv[2]?.trim().toLowerCase();

    if (!email) {
      console.log("Usage: node makeAdmin.js your-email@example.com");
      return;
    }

    const user = await User.findOne({ email });

    if (!user) {
      console.log("User not found. Please sign up first.");
      return;
    }

    user.role = "admin";
    await user.save();

    console.log(`${user.email} is now an admin.`);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

makeAdmin();