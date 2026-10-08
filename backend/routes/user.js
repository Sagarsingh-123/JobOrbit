const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

const User = require("../models/user");
const Application = require("../models/Application");

// ===============================
// ADMIN VERIFICATION
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
    console.error("Admin verification error:", error);

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

// ===============================
// GET ALL USERS
// ===============================
router.get("/", verifyAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error("Load users error:", error);

    res.status(500).json({
      message: "Failed to load users",
    });
  }
});

// ===============================
// DELETE USER
// ===============================
router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Admin khud ko delete nahi kar sakta
    if (req.user._id.toString() === userId) {
      return res.status(400).json({
        message: "You cannot delete your own admin account",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Dusre admin ko delete nahi karne denge
    if (user.role === "admin") {
      return res.status(400).json({
        message: "Admin account cannot be deleted",
      });
    }

    // User ki applications bhi delete karo
    await Application.deleteMany({
      user: userId,
    });

    await User.findByIdAndDelete(userId);

    res.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    res.status(500).json({
      message: "Failed to delete user",
    });
  }
});

module.exports = router;