import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { app } from "../src/index";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { cleanDatabase } from "./test-utils";
import * as userServices from "../src/services/user-services";

describe("POST /api/users - Register User", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("Registers a new user successfully and stores bcrypt password hash in database", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ben",
          email: "ben@example.com",
          password: "rahasiaSuperSecure123",
        }),
      })
    );

    expect(response.status).toBe(201);
    const json = (await response.json()) as Record<string, any>;
    expect(json.data).toBe("OK");

    const [savedUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "ben@example.com"))
      .limit(1);

    expect(savedUser).toBeDefined();
    expect(savedUser!.name).toBe("Ben");
    expect(savedUser!.email).toBe("ben@example.com");
    expect(savedUser!.password).not.toBe("rahasiaSuperSecure123");
    expect(savedUser!.password.startsWith("$2")).toBe(true);

    const isPasswordValid = await Bun.password.verify(
      "rahasiaSuperSecure123",
      savedUser!.password
    );
    expect(isPasswordValid).toBe(true);
  });

  it("Accepts email with local domain such as ben@localhost", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ben Local",
          email: "ben@localhost",
          password: "rahasiaLocalPassword",
        }),
      })
    );

    expect(response.status).toBe(201);
    const json = (await response.json()) as Record<string, any>;
    expect(json.data).toBe("OK");
  });

  it("Accepts inputs with exact maximum length of 255 characters", async () => {
    const exactName255 = "a".repeat(255);
    const exactPassword255 = "p".repeat(255);
    const exactEmail255 = "u" + "x".repeat(238) + "@domain.com"; // 1 + 238 + 11 = 250 chars <= 255
    expect(exactName255.length).toBe(255);
    expect(exactPassword255.length).toBe(255);
    expect(exactEmail255.length).toBeLessThanOrEqual(255);

    const response = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: exactName255,
          email: exactEmail255,
          password: exactPassword255,
        }),
      })
    );

    expect(response.status).toBe(201);
  });

  it("Rejects when name is empty or missing (422)", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "",
          email: "valid@domain.com",
          password: "rahasiaPassword",
        }),
      })
    );

    expect(response.status).toBe(422);
  });

  it("Rejects when email is empty or invalid format (422)", async () => {
    const invalidEmails = [
      "",
      "invalid-no-at",
      "space in@email.com",
      "@missinguser.com",
    ];

    for (const email of invalidEmails) {
      const response = await app.handle(
        new Request("http://localhost:3000/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Ben",
            email,
            password: "rahasiaPassword",
          }),
        })
      );

      expect(response.status).toBe(422);
    }
  });

  it("Rejects when password is empty or missing (422)", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ben",
          email: "valid@domain.com",
          password: "",
        }),
      })
    );

    expect(response.status).toBe(422);
  });

  it("Rejects when name exceeds 255 characters (e.g. 300 characters) with status 422", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "a".repeat(300),
          email: "valid300@domain.com",
          password: "rahasiaPassword",
        }),
      })
    );

    expect(response.status).toBe(422);
  });

  it("Rejects when email exceeds 255 characters with status 422", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ben",
          email: "a".repeat(250) + "@localhost.com",
          password: "rahasiaPassword",
        }),
      })
    );

    expect(response.status).toBe(422);
  });

  it("Rejects when password exceeds 255 characters with status 422", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Ben",
          email: "valid@domain.com",
          password: "p".repeat(256),
        }),
      })
    );

    expect(response.status).toBe(422);
  });

  it("Rejects duplicate email with status 400 and error message 'Email sudah terdaftar'", async () => {
    const res1 = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "First User",
          email: "duplicate@example.com",
          password: "password123",
        }),
      })
    );
    expect(res1.status).toBe(201);

    const res2 = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Second User",
          email: "duplicate@example.com",
          password: "password456",
        }),
      })
    );

    expect(res2.status).toBe(400);
    const json = (await res2.json()) as Record<string, any>;
    expect(json.error).toBe("Email sudah terdaftar");

    const allUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, "duplicate@example.com"));
    expect(allUsers.length).toBe(1);
  });

  it("Internal server error 500 does not leak SQL queries to response", async () => {
    const spy = spyOn(userServices, "registerUser").mockRejectedValue(
      new Error(
        "Failed query: select * from secret_table where password = ? params: secret,1"
      )
    );

    try {
      const response = await app.handle(
        new Request("http://localhost:3000/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Ben",
            email: "error500@domain.com",
            password: "password123",
          }),
        })
      );

      expect(response.status).toBe(500);
      const json = (await response.json()) as Record<string, any>;
      expect(json.code).toBe("INTERNAL_SERVER_ERROR");
      expect(json.message).toBe("Internal Server Error");
      expect(JSON.stringify(json)).not.toContain("Failed query");
      expect(JSON.stringify(json)).not.toContain("secret_table");
    } finally {
      spy.mockRestore();
    }
  });
});
