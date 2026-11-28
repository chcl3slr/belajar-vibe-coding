import { beforeEach, describe, expect, it } from "bun:test";
import { app } from "../src/index";
import { db } from "../src/db";
import { sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { cleanDatabase } from "./test-utils";

describe("POST /api/users/login - Login User", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("Logs in successfully with matching email and password, creating a valid session", async () => {
    // 1. Register a user
    await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ben",
          email: "ben@localhost",
          password: "rahasiaPassword",
        }),
      })
    );

    // 2. Login
    const response = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "ben@localhost",
          password: "rahasiaPassword",
        }),
      })
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as Record<string, any>;
    expect(typeof json.data).toBe("string");

    const token = json.data;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(token)).toBe(true);

    // 3. Verify session exists in DB
    const [savedSession] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token))
      .limit(1);

    expect(savedSession).toBeDefined();
    expect(savedSession!.token).toBe(token);
  });

  it("Supports multiple logins creating different valid sessions for the same user", async () => {
    // Register
    await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Multi User",
          email: "multi@localhost",
          password: "password123",
        }),
      })
    );

    // Login 1
    const res1 = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "multi@localhost",
          password: "password123",
        }),
      })
    );
    const json1 = (await res1.json()) as Record<string, any>;
    const token1 = json1.data;

    // Login 2
    const res2 = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "multi@localhost",
          password: "password123",
        }),
      })
    );
    const json2 = (await res2.json()) as Record<string, any>;
    const token2 = json2.data;

    expect(token1).not.toBe(token2);

    const allSessions = await db.select().from(sessions);
    expect(allSessions.length).toBe(2);
  });

  it("Rejects login when email is not registered with 401 'Email atau password salah'", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "notfound@localhost",
          password: "somePassword",
        }),
      })
    );

    expect(response.status).toBe(401);
    const json = (await response.json()) as Record<string, any>;
    expect(json.error).toBe("Email atau password salah");
  });

  it("Rejects login when password does not match with 401 'Email atau password salah'", async () => {
    // Register
    await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ben",
          email: "ben@localhost",
          password: "correctPassword",
        }),
      })
    );

    // Login with wrong password
    const response = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "ben@localhost",
          password: "wrongPassword123",
        }),
      })
    );

    expect(response.status).toBe(401);
    const json = (await response.json()) as Record<string, any>;
    expect(json.error).toBe("Email atau password salah");
  });

  it("Rejects validation errors on empty or missing fields with status 422", async () => {
    const badBodies = [
      {},
      { email: "" },
      { email: "invalid-email", password: "123" },
      { email: "valid@domain.com", password: "" },
      { email: "a".repeat(250) + "@localhost.com", password: "123" },
      { email: "valid@domain.com", password: "p".repeat(256) },
    ];

    for (const body of badBodies) {
      const response = await app.handle(
        new Request("http://localhost:3000/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      );

      expect(response.status).toBe(422);
    }
  });
});
