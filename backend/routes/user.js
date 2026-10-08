const express = require("express");
const router = express.Router();

const User = require("../models/user");
const Application = require("../models/application");
const { verifyAdmin } = require("../middleware/auth");

router.get("/", verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Load users error:", error);
    res.status(500).json({
      message: "Failed to load users",
    });
  }
});

router.delete("/:id", verifyAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

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

    if (user.role === "admin") {
      return res.status(400).json({
        message: "Admin account cannot be deleted",
      });
    }

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
