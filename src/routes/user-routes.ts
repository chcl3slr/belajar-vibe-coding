import { Elysia, t } from "elysia";
import {
  InvalidCredentialsError,
  loginUser,
  registerUser,
  UserAlreadyExistsError,
} from "../services/user-services";

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
        name: t.String({ minLength: 1 }),
        email: t.String({
          minLength: 3,
          pattern: "^[^@\\s]+@[^@\\s]+$",
          error: "Format email tidak valid",
        }),
        password: t.String({ minLength: 1 }),
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
          pattern: "^[^@\\s]+@[^@\\s]+$",
          error: "Format email tidak valid",
        }),
        password: t.String({ minLength: 1 }),
      }),
    }
  );
