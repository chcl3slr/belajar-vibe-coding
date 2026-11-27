import { describe, expect, it, spyOn } from "bun:test";
import { app } from "../src/index";
import { db } from "../src/db";
import { extractBearerToken } from "../src/routes/user-routes";
import * as userServices from "../src/services/user-services";

describe("User Registration Endpoint (POST /api/users)", () => {
  it("Validates required fields in request body", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "",
          email: "not-an-email",
          password: "",
        }),
      })
    );

    expect(response.status).toBe(422);
  });

  it("Accepts valid local domain email like ben@localhost", async () => {
    const spy = spyOn(userServices, "registerUser").mockResolvedValue({
      success: true,
    });

    try {
      const response = await app.handle(
        new Request("http://localhost:3000/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Ben",
            email: "ben@localhost",
            password: "rahasia",
          }),
        })
      );

      expect(response.status).toBe(201);
      const json = (await response.json()) as Record<string, any>;
      expect(json.data).toBe("OK");
      expect(spy).toHaveBeenCalledWith({
        name: "Ben",
        email: "ben@localhost",
        password: "rahasia",
      });
    } finally {
      spy.mockRestore();
    }
  });

  it("Returns 400 with 'Email sudah terdaftar' when email is already registered", async () => {
    const spy = spyOn(userServices, "registerUser").mockRejectedValue(
      new userServices.UserAlreadyExistsError("Email sudah terdaftar")
    );

    try {
      const response = await app.handle(
        new Request("http://localhost:3000/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Ben",
            email: "ben@localhost",
            password: "rahasia",
          }),
        })
      );

      expect(response.status).toBe(400);
      const json = (await response.json()) as Record<string, any>;
      expect(json.error).toBe("Email sudah terdaftar");
    } finally {
      spy.mockRestore();
    }
  });

  it("Hashes password using bcrypt correctly", async () => {
    const plainPassword = "rahasia";
    const hashedPassword = await Bun.password.hash(plainPassword, {
      algorithm: "bcrypt",
      cost: 10,
    });

    expect(hashedPassword).not.toBe(plainPassword);
    expect(hashedPassword.startsWith("$2")).toBe(true);

    const isMatch = await Bun.password.verify(plainPassword, hashedPassword);
    expect(isMatch).toBe(true);
  });
});

describe("User Login Endpoint (POST /api/users/login)", () => {
  it("Validates required fields in request body", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "invalid-email",
          password: "",
        }),
      })
    );

    expect(response.status).toBe(422);
  });

  it("Logs in successfully with valid credentials and returns session token", async () => {
    const dummyToken = "550e8400-e29b-41d4-a716-446655440000";
    const spy = spyOn(userServices, "loginUser").mockResolvedValue({
      token: dummyToken,
    });

    try {
      const response = await app.handle(
        new Request("http://localhost:3000/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "ben@localhost",
            password: "rahasia",
          }),
        })
      );

      expect(response.status).toBe(200);
      const json = (await response.json()) as Record<string, any>;
      expect(json.data).toBe(dummyToken);
      expect(spy).toHaveBeenCalledWith({
        email: "ben@localhost",
        password: "rahasia",
      });
    } finally {
      spy.mockRestore();
    }
  });

  it("Returns 401 with 'Email atau password salah' on invalid credentials", async () => {
    const spy = spyOn(userServices, "loginUser").mockRejectedValue(
      new userServices.InvalidCredentialsError("Email atau password salah")
    );

    try {
      const response = await app.handle(
        new Request("http://localhost:3000/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "ben@localhost",
            password: "wrong-password",
          }),
        })
      );

      expect(response.status).toBe(401);
      const json = (await response.json()) as Record<string, any>;
      expect(json.error).toBe("Email atau password salah");
    } finally {
      spy.mockRestore();
    }
  });

  it("Generates a valid UUID token format", () => {
    const token = crypto.randomUUID();
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(token)).toBe(true);
  });
});

describe("extractBearerToken Helper", () => {
  it("Extracts token from standard Bearer header", () => {
    expect(extractBearerToken("Bearer my-token-123")).toBe("my-token-123");
  });

  it("Extracts token case-insensitively (bearer / BEARER)", () => {
    expect(extractBearerToken("bearer my-token-abc")).toBe("my-token-abc");
    expect(extractBearerToken("BEARER my-token-xyz")).toBe("my-token-xyz");
  });

  it("Returns null for missing, null, or undefined headers", () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken("")).toBeNull();
    expect(extractBearerToken("   ")).toBeNull();
  });

  it("Returns null for non-Bearer schemes", () => {
    expect(extractBearerToken("Basic dXNlcjpwYXNz")).toBeNull();
    expect(extractBearerToken("Token 12345")).toBeNull();
  });

  it("Returns null for Bearer scheme with empty or whitespace token", () => {
    expect(extractBearerToken("Bearer")).toBeNull();
    expect(extractBearerToken("Bearer ")).toBeNull();
    expect(extractBearerToken("Bearer    ")).toBeNull();
  });
});

describe("Current User Endpoint (GET /api/users/current)", () => {
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

  it("Returns 401 when Authorization header format is not Bearer", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: "Basic dXNlcjpwYXNz",
        },
      })
    );

    expect(response.status).toBe(401);
    const json = (await response.json()) as Record<string, any>;
    expect(json.error).toBe("Unauthorized");
  });

  it("Returns 401 when Bearer token is empty", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users/current", {
        method: "GET",
        headers: {
          Authorization: "Bearer    ",
        },
      })
    );

    expect(response.status).toBe(401);
    const json = (await response.json()) as Record<string, any>;
    expect(json.error).toBe("Unauthorized");
  });

  it("Returns 401 when session token is invalid or not found", async () => {
    const spy = spyOn(userServices, "getCurrentUser").mockRejectedValue(
      new userServices.UnauthorizedError("Unauthorized")
    );

    try {
      const response = await app.handle(
        new Request("http://localhost:3000/api/users/current", {
          method: "GET",
          headers: {
            Authorization: "Bearer invalid-token",
          },
        })
      );

      expect(response.status).toBe(401);
      const json = (await response.json()) as Record<string, any>;
      expect(json.error).toBe("Unauthorized");
    } finally {
      spy.mockRestore();
    }
  });

  it("Returns 200 with user profile on valid session token", async () => {
    const mockUser = {
      id: 1,
      name: "Ben",
      email: "ben@localhost",
    };
    const validToken = "550e8400-e29b-41d4-a716-446655440000";
    const spy = spyOn(userServices, "getCurrentUser").mockResolvedValue(mockUser);

    try {
      const response = await app.handle(
        new Request("http://localhost:3000/api/users/current", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(response.status).toBe(200);
      const json = (await response.json()) as Record<string, any>;
      expect(json.data).toEqual(mockUser);
      expect(json.data.password).toBeUndefined();
      expect(spy).toHaveBeenCalledWith(validToken);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("Logout User Endpoint (DELETE /api/users/logout)", () => {
  it("Returns 401 when Authorization header is missing", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
      })
    );

    expect(response.status).toBe(401);
    const json = (await response.json()) as Record<string, any>;
    expect(json.error).toBe("Unauthorized");
  });

  it("Returns 401 when Authorization header format is not Bearer", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: "Basic dXNlcjpwYXNz",
        },
      })
    );

    expect(response.status).toBe(401);
    const json = (await response.json()) as Record<string, any>;
    expect(json.error).toBe("Unauthorized");
  });

  it("Returns 401 when Bearer token is empty", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/api/users/logout", {
        method: "DELETE",
        headers: {
          Authorization: "Bearer    ",
        },
      })
    );

    expect(response.status).toBe(401);
    const json = (await response.json()) as Record<string, any>;
    expect(json.error).toBe("Unauthorized");
  });

  it("Returns 401 when session token is invalid or not found", async () => {
    const spy = spyOn(userServices, "logoutUser").mockRejectedValue(
      new userServices.UnauthorizedError("Unauthorized")
    );

    try {
      const response = await app.handle(
        new Request("http://localhost:3000/api/users/logout", {
          method: "DELETE",
          headers: {
            Authorization: "Bearer invalid-token",
          },
        })
      );

      expect(response.status).toBe(401);
      const json = (await response.json()) as Record<string, any>;
      expect(json.error).toBe("Unauthorized");
    } finally {
      spy.mockRestore();
    }
  });

  it("Returns 200 with data 'OK' on successful logout", async () => {
    const validToken = "550e8400-e29b-41d4-a716-446655440000";
    const spy = spyOn(userServices, "logoutUser").mockResolvedValue(undefined);

    try {
      const response = await app.handle(
        new Request("http://localhost:3000/api/users/logout", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${validToken}`,
          },
        })
      );

      expect(response.status).toBe(200);
      const json = (await response.json()) as Record<string, any>;
      expect(json.data).toBe("OK");
      expect(spy).toHaveBeenCalledWith(validToken);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("logoutUser Service Logic", () => {
  it("Throws UnauthorizedError for empty or whitespace-only token", async () => {
    await expect(userServices.logoutUser("")).rejects.toThrow(
      userServices.UnauthorizedError
    );
    await expect(userServices.logoutUser("   ")).rejects.toThrow(
      userServices.UnauthorizedError
    );
  });

  it("Throws UnauthorizedError when token does not exist (affectedRows === 0)", async () => {
    const deleteSpy = spyOn(db, "delete").mockReturnValue({
      where: () => Promise.resolve([{ affectedRows: 0 }]),
    } as any);

    try {
      await expect(
        userServices.logoutUser("nonexistent-token")
      ).rejects.toThrow(userServices.UnauthorizedError);
    } finally {
      deleteSpy.mockRestore();
    }
  });

  it("Succeeds when token exists and is deleted (affectedRows === 1)", async () => {
    const deleteSpy = spyOn(db, "delete").mockReturnValue({
      where: () => Promise.resolve([{ affectedRows: 1 }]),
    } as any);

    try {
      await expect(
        userServices.logoutUser("valid-active-token")
      ).resolves.toBeUndefined();
    } finally {
      deleteSpy.mockRestore();
    }
  });
});
