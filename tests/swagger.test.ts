import { describe, expect, it } from "bun:test";
import { app } from "../src/index";

describe("Swagger / OpenAPI Endpoints", () => {
  it("GET /swagger returns 200 with HTML documentation page", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/swagger")
    );

    expect(response.status).toBe(200);
    const contentType = response.headers.get("content-type");
    expect(contentType).not.toBeNull();
    expect(contentType?.toLowerCase()).toContain("text/html");

    const html = await response.text();
    expect(html.toLowerCase()).toContain("swagger");
  });

  it("GET /swagger/json returns 200 with valid OpenAPI JSON specification", async () => {
    const response = await app.handle(
      new Request("http://localhost:3000/swagger/json")
    );

    expect(response.status).toBe(200);
    const contentType = response.headers.get("content-type");
    expect(contentType).not.toBeNull();
    expect(contentType?.toLowerCase()).toContain("application/json");

    const json = (await response.json()) as Record<string, any>;

    // Verify OpenAPI version and basic info
    expect(json.openapi).toBeDefined();
    expect(json.info).toBeDefined();
    expect(json.info.title).toBe("Belajar Vibe Coding API");
    expect(json.info.version).toBe("1.0.0");

    // Verify paths contain all registered endpoints
    expect(json.paths).toBeDefined();
    expect(json.paths["/"]).toBeDefined();
    expect(json.paths["/health"]).toBeDefined();
    expect(json.paths["/api/users"]).toBeDefined();
    expect(json.paths["/api/users/login"]).toBeDefined();
    expect(json.paths["/api/users/current"]).toBeDefined();
    expect(json.paths["/api/users/logout"]).toBeDefined();

    // Verify bearerAuth security scheme definition
    expect(json.components?.securitySchemes?.bearerAuth).toBeDefined();
    expect(json.components.securitySchemes.bearerAuth.type).toBe("http");
    expect(json.components.securitySchemes.bearerAuth.scheme).toBe("bearer");

    // Verify security requirement on protected endpoints
    expect(json.paths["/api/users/current"].get?.security).toEqual([
      { bearerAuth: [] },
    ]);
    expect(json.paths["/api/users/logout"].delete?.security).toEqual([
      { bearerAuth: [] },
    ]);
  });
});
