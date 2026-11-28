import { Elysia, t } from "elysia";
import {
  getCurrentUser,
  InvalidCredentialsError,
  loginUser,
  logoutUser,
  registerUser,
  UnauthorizedError,
  UserAlreadyExistsError,
} from "../services/user-services";

export const extractBearerToken = (authHeader?: string | null): string | null => {
  if (!authHeader) return null;
  const trimmed = authHeader.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) return null;
  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
};

export const userRoutes = new Elysia()
  .post(
    "/api/users",
    async ({ body, set }) => {
      try {
        await registerUser(body);
        set.status = 201;
        return {
          data: "OK",
        };
      } catch (error) {
        if (error instanceof UserAlreadyExistsError) {
          set.status = 400;
          return {
            error: error.message,
          };
        }
        throw error;
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        email: t.String({
          minLength: 3,
          maxLength: 255,
          pattern: "^[^@\\s]+@[^@\\s]+$",
          error: "Format email tidak valid",
        }),
        password: t.String({ minLength: 1, maxLength: 255 }),
      }),
    }
  )
  .post(
    "/api/users/login",
    async ({ body, set }) => {
      try {
        const result = await loginUser(body);
        set.status = 200;
        return {
          data: result.token,
        };
      } catch (error) {
        if (error instanceof InvalidCredentialsError) {
          set.status = 401;
          return {
            error: error.message,
          };
        }
        throw error;
      }
    },
    {
      body: t.Object({
        email: t.String({
          minLength: 3,
          maxLength: 255,
          pattern: "^[^@\\s]+@[^@\\s]+$",
          error: "Format email tidak valid",
        }),
        password: t.String({ minLength: 1, maxLength: 255 }),
      }),
    }
  )
  .get("/api/users/current", async ({ headers, set }) => {
    const token = extractBearerToken(headers.authorization);
    if (!token) {
      set.status = 401;
      return {
        error: "Unauthorized",
      };
    }

    try {
      const user = await getCurrentUser(token);
      set.status = 200;
      return {
        data: user,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        set.status = 401;
        return {
          error: error.message,
        };
      }
      throw error;
    }
  })
  .delete("/api/users/logout", async ({ headers, set }) => {
    const token = extractBearerToken(headers.authorization);
    if (!token) {
      set.status = 401;
      return {
        error: "Unauthorized",
      };
    }

    try {
      await logoutUser(token);
      set.status = 200;
      return {
        data: "OK",
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        set.status = 401;
        return {
          error: error.message,
        };
      }
      throw error;
    }
  });
