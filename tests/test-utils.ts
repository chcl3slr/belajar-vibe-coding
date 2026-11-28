import { db } from "../src/db";
import { sessions, users } from "../src/db/schema";

export const cleanDatabase = async () => {
  try {
    await db.delete(sessions);
    await db.delete(users);
  } catch (error) {
    console.error("cleanDatabase error:", error);
  }
};
