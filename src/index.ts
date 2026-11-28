import { Elysia } from "elysia";
import { poolConnection } from "./db";
import { userRoutes } from "./routes/user-routes";

const port = Number(process.env.PORT) || 3000;

export const app = new Elysia()
  .onError({ as: "global" }, ({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 422;
      return {
        success: false,
        code,
        message: "message" in error ? (error as Error).message : "Validation error",
      };
    }

    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        success: false,
        code,
        message: "Not Found",
      };
    }

    console.error("Internal Server Error:", error);
    set.status = 500;
    return {
      success: false,
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal Server Error",
    };
  })
  .use(userRoutes)
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
  });

export const startServer = () => {
  return app.listen(port, () => {
    console.log(`🦊 Elysia server is running at http://localhost:${port}`);
  });
};

if (import.meta.main) {
  startServer();
}
