import { beforeEach, describe, expect, it } from "bun:test";
import { app } from "../src/index";
import { db } from "../src/db";
import { sessions } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { cleanDatabase } from "./test-utils";

describe("DELETE /api/users/logout - Logout User", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("Logs out user successfully and removes session from database", async () => {
    // 1. Register and login
    await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Logout User",
          email: "logout@localhost",
          password: "password123",
        }),
      })
    );
    const loginRes = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "logout@localhost",
          password: "password123",
        }),
      })
    );
    const token = ((await loginRes.json()) as Record<string, any>).data;

    // 2. Perform logout
    const logoutRes = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );

    expect(logoutRes.status).toBe(200);
    const json = (await logoutRes.json()) as Record<string, any>;
    expect(json.data).toBe("OK");

    // 3. Verify session was removed from database
    const sessionInDb = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, token));
    expect(sessionInDb.length).toBe(0);

    // 4. Token can no longer access GET /api/users/current (401)
    const currentRes = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );
    expect(currentRes.status).toBe(401);

    // 5. Subsequent logout with same token fails (401)
    const logoutAgainRes = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );
    expect(logoutAgainRes.status).toBe(401);
  });

  it("Maintains session isolation when logging out one of multiple sessions", async () => {
    // Register
    await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Isolation User",
          email: "isolation@localhost",
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
          email: "isolation@localhost",
          password: "password123",
        }),
      })
    );
    const token1 = ((await res1.json()) as Record<string, any>).data;

    // Login 2
    const res2 = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "isolation@localhost",
          password: "password123",
        }),
      })
    );
    const token2 = ((await res2.json()) as Record<string, any>).data;

    // Logout session 1 only
    const logoutRes = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token1}`,
        },
      })
    );
    expect(logoutRes.status).toBe(200);

    // Session 1 is invalid
    const cur1 = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: { Authorization: `Bearer ${token1}` },
      })
    );
    expect(cur1.status).toBe(401);

    // Session 2 is still valid!
    const cur2 = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: { Authorization: `Bearer ${token2}` },
      })
    );
    expect(cur2.status).toBe(200);
    const user2 = ((await cur2.json()) as Record<string, any>).data;
    expect(user2.email).toBe("isolation@localhost");
  });

  it("Accepts case-insensitive Bearer prefix on logout", async () => {
    // Register and login
    await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Case Logout",
          email: "caselogout@localhost",
          password: "password123",
        }),
      })
    );
    const loginRes = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "caselogout@localhost",
          password: "password123",
        }),
      })
    );
    const token = ((await loginRes.json()) as Record<string, any>).data;

    // Logout using lowercase bearer
    const logoutRes = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: `bearer ${token}`,
        },
      })
    );
    expect(logoutRes.status).toBe(200);
  });

  it("Returns 401 when Authorization header is missing on logout", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
      })
    );

    expect(response.status).toBe(401);
    const json = (await response.json()) as Record<string, any>;
    expect(json.error).toBe("Unauthorized");
  });

  it("Returns 401 when Authorization header format is not Bearer on logout", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: "Basic dXNlcjpwYXNz",
        },
      })
    );

    expect(response.status).toBe(401);
  });

  it("Returns 401 when Bearer token is empty or whitespace on logout", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer    ",
        },
      })
    );

    expect(response.status).toBe(401);
  });

  it("Returns 401 when session token does not exist in database on logout", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer 00000000-0000-0000-0000-000000000000",
        },
      })
    );

    expect(response.status).toBe(401);
    const json = (await response.json()) as Record<string, any>;
    expect(json.error).toBe("Unauthorized");
  });
});
