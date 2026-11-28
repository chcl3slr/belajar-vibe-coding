import { describe, expect, it, spyOn } from "bun:test";
import { app } from "../src/index";
import { poolConnection } from "../src/db";

describe("System & Health Endpoints", () => {
  it("GET / returns 200 with application running status", async () => {
    const response = await app.handle(new Request("http://localhost:3000/"));
    expect(response.status).toBe(200);

    const json = (await response.json()) as Record<string, any>;
    expect(json.name).toBe("belajar-vibe-coding API");
    expect(json.status).toBe("running");
    expect(json.timestamp).toBeDefined();
  });

  it("GET /health returns 200 when database is connected", async () => {
    const response = await app.handle(new Request("http://localhost:3000/health"));
    expect(response.status).toBe(200);

    const json = (await response.json()) as Record<string, any>;
    expect(json.status).toBe("ok");
    expect(json.database).toBe("connected");
    expect(json.uptime).toBeDefined();
    expect(json.timestamp).toBeDefined();
  });

  it("GET /health returns 503 degraded when database connection fails", async () => {
    const spy = spyOn(poolConnection, "query").mockRejectedValue(
      new Error("Database connection timeout")
    );

    try {
      const response = await app.handle(new Request("http://localhost:3000/health"));
      expect(response.status).toBe(503);

      const json = (await response.json()) as Record<string, any>;
      expect(json.status).toBe("degraded");
      expect(json.database).toBe("disconnected");
      expect(json.error).toBe("Database connection timeout");
    } finally {
      spy.mockRestore();
    }
  });

  it("Returns 404 for unknown/unregistered route", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/unknown-endpoint")
    );
    expect(response.status).toBe(404);
  });
});
