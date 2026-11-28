import { Elysia, t } from "elysia";
import { openapi } from "@elysia/openapi";
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
  .use(
    openapi({
      provider: "swagger-ui",
      path: "/swagger",
      documentation: {
        info: {
          title: "Belajar Vibe Coding API",
          version: "1.0.0",
          description:
            "Dokumentasi API RESTful Backend menggunakan Bun, ElysiaJS, Drizzle ORM, dan MySQL.",
        },
        tags: [
          { name: "System", description: "Endpoint informasi server & health check" },
          { name: "Users", description: "Endpoint otentikasi & manajemen user" },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "UUID",
              description: "Masukkan token sesi yang didapat dari POST /api/users/login",
            },
          },
        },
      },
    })
  )
  .use(userRoutes)
  .get(
    "/",
    () => ({
      name: "belajar-vibe-coding API",
      status: "running",
      timestamp: new Date().toISOString(),
    }),
    {
      detail: {
        tags: ["System"],
        summary: "Root / Ping endpoint",
        description: "Menampilkan informasi dasar aplikasi dan status berjalan.",
      },
      response: {
        200: t.Object({
          name: t.String(),
          status: t.String(),
          timestamp: t.String(),
        }),
      },
    }
  )
  .get(
    "/health",
    async ({ set }) => {
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
    },
    {
      detail: {
        tags: ["System"],
        summary: "Health Check",
        description: "Memeriksa konektivitas database MySQL dan waktu aktif aplikasi (uptime).",
      },
      response: {
        200: t.Object({
          status: t.String(),
          database: t.String(),
          uptime: t.Number(),
          timestamp: t.String(),
        }),
        503: t.Object({
          status: t.String(),
          database: t.String(),
          error: t.String(),
          timestamp: t.String(),
        }),
      },
    }
  );

export const startServer = () => {
  return app.listen(port, () => {
    console.log(`🦊 Elysia server is running at http://localhost:${port}`);
  });
};

if (import.meta.main) {
  startServer();
}
