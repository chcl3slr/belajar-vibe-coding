import { beforeEach, describe, expect, it } from "bun:test";
import { app } from "../src/index";
import { cleanDatabase } from "./test-utils";
import { extractBearerToken } from "../src/routes/user-routes";

describe("GET /api/users/current - Current User", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("Returns current user profile without password for valid Bearer token", async () => {
    // Register user
    await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ben Current",
          email: "current@localhost",
          password: "rahasiaPassword",
        }),
      })
    );

    // Login to get token
    const loginRes = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "current@localhost",
          password: "rahasiaPassword",
        }),
      })
    );
    const loginJson = (await loginRes.json()) as Record<string, any>;
    const token = loginJson.data;

    // Get current user
    const response = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as Record<string, any>;
    expect(json.data).toBeDefined();
    expect(json.data.name).toBe("Ben Current");
    expect(json.data.email).toBe("current@localhost");
    expect(json.data.id).toBeDefined();
    expect(json.data.password).toBeUndefined();
  });

  it("Accepts case-insensitive Bearer schemes (bearer / BEARER)", async () => {
    // Register and login
    await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Case User",
          email: "case@localhost",
          password: "password123",
        }),
      })
    );
    const loginRes = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "case@localhost",
          password: "password123",
        }),
      })
    );
    const token = ((await loginRes.json()) as Record<string, any>).data;

    // Test with lowercase "bearer"
    const resLower = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `bearer ${token}`,
        },
      })
    );
    expect(resLower.status).toBe(200);

    // Test with uppercase "BEARER"
    const resUpper = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `BEARER ${token}`,
        },
      })
    );
    expect(resUpper.status).toBe(200);
  });

  it("Returns 401 when Authorization header is missing", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
      })
    );

    expect(response.status).toBe(401);
    const json = (await response.json()) as Record<string, any>;
    expect(json.error).toBe("Unauthorized");
  });

  it("Returns 401 when Authorization header is not Bearer", async () => {
    const badHeaders = [
      "Basic dXNlcjpwYXNz",
      "Token 123456",
      "Digest some-digest-auth",
    ];

    for (const auth of badHeaders) {
      const response = await app.handle(
        new Request("http://localhost:3000/api/users/current", {
          method: "GET",
          headers: { Authorization: auth },
        })
      );

      expect(response.status).toBe(401);
      const json = (await response.json()) as Record<string, any>;
      expect(json.error).toBe("Unauthorized");
    }
  });

  it("Returns 401 when Bearer token is empty or whitespace", async () => {
    const badTokens = ["Bearer", "Bearer ", "Bearer    "];

    for (const auth of badTokens) {
      const response = await app.handle(
        new Request("http://localhost:3000/api/users/current", {
          method: "GET",
          headers: { Authorization: auth },
        })
      );

      expect(response.status).toBe(401);
      const json = (await response.json()) as Record<string, any>;
      expect(json.error).toBe("Unauthorized");
    }
  });

  it("Returns 401 when token is invalid or does not exist in database", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: "Bearer 00000000-0000-0000-0000-000000000000",
        },
      })
    );

    expect(response.status).toBe(401);
    const json = (await response.json()) as Record<string, any>;
    expect(json.error).toBe("Unauthorized");
  });

  it("Unit test: extractBearerToken helper function", () => {
    expect(extractBearerToken("Bearer token123")).toBe("token123");
    expect(extractBearerToken("bearer token123")).toBe("token123");
    expect(extractBearerToken("BEARER token123")).toBe("token123");
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken("")).toBeNull();
    expect(extractBearerToken("   ")).toBeNull();
    expect(extractBearerToken("Basic 123")).toBeNull();
    expect(extractBearerToken("Bearer ")).toBeNull();
    expect(extractBearerToken("Bearer   ")).toBeNull();
  });
});
