import { Elysia } from "elysia";
import { poolConnection } from "./db";

const port = Number(process.env.PORT) || 3000;

export const app = new Elysia()
  .get("/", () => ({
    name: "belajar-vibe-coding API",
    status: "running",
    timestamp: new Date().toISOString(),
  }))
  .get("/health", async ({ set }) => {
    try {
      await poolConnection.query("SELECT 1");
      return {
        status: "ok",
        database: "connected",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      set.status = 503;
      return {
        status: "degraded",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Database unavailable",
        timestamp: new Date().toISOString(),
      };
    }
  })
  .onError(({ code, error, set }) => {
    return {
      success: false,
      code,
      message: "message" in error ? (error as Error).message : String(error),
    };
  });

export const startServer = () => {
  return app.listen(port, () => {
    console.log(`🦊 Elysia server is running at http://localhost:${port}`);
  });
};

if (import.meta.main) {
  startServer();
}
