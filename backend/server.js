function formatStartupError(error) {
  const name = error?.name || "Error";
  const code =
    typeof error?.code === "string" || typeof error?.code === "number"
      ? ` (${error.code})`
      : "";
  const message =
    typeof error?.message === "string"
      ? error.message
          .replace(/mongodb(?:\+srv)?:\/\/[^\s"'`]+/gi, "[redacted MongoDB URI]")
          .replace(/(password|passwd|pwd)=([^&\s]+)/gi, "$1=[redacted]")
      : "No error message available";

  return `${name}${code}: ${message}`;
}

async function startServer() {
  let mongoose;
  let phase = "loading dependencies";

  try {
    require("dotenv").config();

    const express = require("express");
    const cors = require("cors");
    mongoose = require("mongoose");

    phase = "validating environment";
    const requiredVariables = ["MONGO_URI", "JWT_SECRET"];
    const missingVariables = requiredVariables.filter(
      (name) => !process.env[name]?.trim()
    );

    if (missingVariables.length > 0) {
      throw new Error(
        `Missing required environment variable(s): ${missingVariables.join(", ")}`
      );
    }

    const mongoUri = process.env.MONGO_URI.trim();
    if (!/^mongodb(?:\+srv)?:\/\//i.test(mongoUri)) {
      throw new Error("MONGO_URI does not use a supported MongoDB URI scheme.");
    }

    const port = Number(process.env.PORT || 5000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("PORT must be a valid integer between 1 and 65535.");
    }

    phase = "loading API routes";
    const authRoutes = require("./routes/auth");
    const jobRoutes = require("./routes/job");
    const applicationRoutes = require("./routes/application");
    const userRoutes = require("./routes/user");

    phase = "configuring API";
    const app = express();
    app.use(cors());

    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ limit: "10mb", extended: true }));

    app.use("/api/auth", authRoutes);
    app.use("/api/jobs", jobRoutes);
    app.use("/api/applications", applicationRoutes);
    app.use("/api/users", userRoutes);

    app.get("/", (req, res) => {
      res.json({
        message: "Welcome to JobOrbit API!",
        status: "Backend is running",
      });
    });

    phase = "connecting to MongoDB";
    console.log("[startup] Connecting to MongoDB.");
    await mongoose.connect(mongoUri);
    console.log("[startup] MongoDB connection established.");

    phase = "starting HTTP listener";
    await new Promise((resolve, reject) => {
      const server = app.listen(port, "0.0.0.0");
      const onListening = () => {
        server.off("error", onError);
        resolve();
      };
      const onError = (error) => {
        server.off("listening", onListening);
        reject(error);
      };

      server.once("listening", onListening);
      server.once("error", onError);
    });

    console.log(`[startup] JobOrbit API listening on 0.0.0.0:${port}.`);
  } catch (error) {
    console.error(`[startup] Startup failed while ${phase}: ${formatStartupError(error)}`);

    if (mongoose?.connection.readyState) {
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        console.error(
          `[startup] MongoDB cleanup failed: ${formatStartupError(disconnectError)}`
        );
      }
    }

    process.exitCode = 1;
  }
}

startServer();
