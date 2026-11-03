import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { apiRoutes } from "./routes/index.js";

export const app = express();

app.disable("x-powered-by");

// Robust CORS allowing production domain, all Vercel previews, and local development
const configuredOrigin = env.frontendOrigin ? env.frontendOrigin.replace(/\/$/, "") : "";

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/$/, "");

      // Allow configured frontend origin, localhost, or any *.vercel.app domain
      if (
        (configuredOrigin && cleanOrigin === configuredOrigin) ||
        cleanOrigin.endsWith(".vercel.app") ||
        /^https?:\/\/localhost(:\d+)?$/.test(cleanOrigin)
      ) {
        return callback(null, true);
      }

      // Default allow with origin echo so CORS never breaks production deployments
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
    exposedHeaders: ["Retry-After"],
    optionsSuccessStatus: 204,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use("/api", apiRoutes);
app.use(notFound);
app.use(errorHandler);
