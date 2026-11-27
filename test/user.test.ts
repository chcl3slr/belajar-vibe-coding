import { describe, expect, it, spyOn } from "bun:test";
import { app } from "../src/index";
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
