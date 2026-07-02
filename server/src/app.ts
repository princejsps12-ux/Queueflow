import "express-async-errors";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import authRoutes from "./routes/auth";
import queueRoutes from "./routes/queues";
import tokenRoutes from "./routes/tokens";
import analyticsRoutes from "./routes/analytics";
import { env } from "./utils/env";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientOrigin }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/auth", authRoutes);
  app.use("/queues", queueRoutes);
  app.use("/tokens", tokenRoutes);
  app.use("/analytics", analyticsRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
