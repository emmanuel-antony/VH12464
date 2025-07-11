import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const AUTH_TOKEN = process.env.AUTH_TOKEN;
const LOG_API_URL = process.env.LOG_API_URL;

if (!AUTH_TOKEN || !LOG_API_URL) {
  console.error(
    "Missing required environment variables: AUTH_TOKEN and/or LOG_API_URL"
  );
  process.exit(1);
}

const VALID_STACKS = ["backend", "frontend"];
const VALID_LEVELS = ["debug", "info", "warn", "error", "fatal"];
const VALID_PACKAGES = {
  backend: [
    "cache",
    "controller",
    "cron job",
    "db",
    "domain",
    "handler",
    "repository",
    "route",
    "service",
  ],
  frontend: ["api", "component", "hook", "page", "state", "style"],
  common: ["auth", "config", "middleware", "utils"],
};

// const LOG_API_URL = "http://20.244.56.144/evaluation-service/logs";

// // Your evaluation token goes here
// const AUTH_TOKEN =
//   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJlbW1hbnVlbGFudG9ueTIwMDVAZ21haWwuY29tIiwiZXhwIjoxNzUyMjE2MzQ5LCJpYXQiOjE3NTIyMTU0NDksImlzcyI6IkFmZm9yZCBNZWRpY2FsIFRlY2hub2xvZ2llcyBQcml2YXRlIExpbWl0ZWQiLCJqdGkiOiJhZmNhYjdjNi04OGVhLTRlNjEtOGViYS1lNTIzYzUyMGY4NWUiLCJsb2NhbGUiOiJlbi1JTiIsIm5hbWUiOiJlbW1hbnVlbCAuIGEiLCJzdWIiOiI3Nzk1YzI0Yy1iNDIxLTQ3NmYtODExMi1iYzJlNzhhZjI4ODUifSwiZW1haWwiOiJlbW1hbnVlbGFudG9ueTIwMDVAZ21haWwuY29tIiwibmFtZSI6ImVtbWFudWVsIC4gYSIsInJvbGxObyI6InZoMTI0NjQiLCJhY2Nlc3NDb2RlIjoiQ1dicWdLIiwiY2xpZW50SUQiOiI3Nzk1YzI0Yy1iNDIxLTQ3NmYtODExMi1iYzJlNzhhZjI4ODUiLCJjbGllbnRTZWNyZXQiOiJxSlFGc01iYVVmUlBWYUZ4In0.MUmI-zQBQeoVfBIY-GG14lriXQYV4lwh-ln99Tekv8U";

class Logger {
  async log(stack, level, packageName, message) {
    // Validate parameters
    if (!this.validateParams(stack, level, packageName)) {
      throw new Error("Invalid logging parameters");
    }

    try {
      const response = await axios.post(
        LOG_API_URL,
        {
          stack,
          level,
          package: packageName,
          message,
        },
        {
          headers: {
            Authorization: `Bearer ${AUTH_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Logging failed:", error.message);
      throw error;
    }
  }

  validateParams(stack, level, packageName) {
    if (!VALID_STACKS.includes(stack)) {
      return false;
    }

    if (!VALID_LEVELS.includes(level)) {
      return false;
    }

    const validPackages = [
      ...(stack === "backend" ? VALID_PACKAGES.backend : []),
      ...(stack === "frontend" ? VALID_PACKAGES.frontend : []),
      ...VALID_PACKAGES.common,
    ];

    return validPackages.includes(packageName);
  }
}

const logger = new Logger();

const loggingMiddleware = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (body) {
    logger
      .log(
        "backend",
        "info",
        "middleware",
        `Request: ${req.method} ${req.url} - Response Status: ${res.statusCode}`
      )
      .catch(console.error);

    return originalSend.apply(res, arguments);
  };

  next();
};

export { logger, loggingMiddleware };
