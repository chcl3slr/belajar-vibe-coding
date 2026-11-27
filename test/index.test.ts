import { describe, expect, it } from "bun:test";
import { app } from "../src/index";

describe("Elysia App Endpoints", () => {
  it("GET / returns status running and 200 status", async () => {
    const response = await app.handle(new Request("http://localhost:3000/"));
    expect(response.status).toBe(200);

    const json = (await response.json()) as Record<string, any>;
    expect(json.name).toBe("belajar-vibe-coding API");
    expect(json.status).toBe("running");
    expect(json.timestamp).toBeDefined();
  });

  it("GET /health responds gracefully", async () => {
    const response = await app.handle(new Request("http://localhost:3000/health"));
    expect([200, 503]).toContain(response.status);

    const json = (await response.json()) as Record<string, any>;
    if (response.status === 200) {
      expect(json.status).toBe("ok");
      expect(json.database).toBe("connected");
    } else {
      expect(json.status).toBe("degraded");
      expect(json.database).toBe("disconnected");
      expect(json.error).toBeDefined();
    }
  });

  it("Returns 404 for unknown routes", async () => {
    const response = await app.handle(new Request("http://localhost:3000/unknown-route"));
    expect(response.status).toBe(404);
  });
});
