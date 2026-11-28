import { eq } from "drizzle-orm";
import { db } from "../db";
import { sessions, users } from "../db/schema";

export class UserAlreadyExistsError extends Error {
  constructor(message = "Email sudah terdaftar") {
    super(message);
    this.name = "UserAlreadyExistsError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor(message = "Email atau password salah") {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export interface RegisterUserInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
}

/**
 * Mendaftarkan user baru ke sistem.
 * Memeriksa apakah email sudah terdaftar, meng-hash password menggunakan bcrypt,
 * lalu menyimpan data user baru ke tabel `users`.
 *
 * @throws {UserAlreadyExistsError} Jika email sudah terdaftar di database.
 */
export const registerUser = async (input: RegisterUserInput) => {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    throw new UserAlreadyExistsError();
  }

  const hashedPassword = await Bun.password.hash(input.password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  await db.insert(users).values({
    name: input.name,
    email: input.email,
    password: hashedPassword,
  });

  return { success: true };
};

/**
 * Memproses login user dengan memverifikasi email dan kecocokan password bcrypt.
 * Jika valid, membuat token session UUID baru dan menyimpannya ke tabel `sessions`.
 *
 * @throws {InvalidCredentialsError} Jika email tidak ditemukan atau password salah.
 */
export const loginUser = async (input: LoginUserInput) => {
  const [user] = await db
    .select({
      id: users.id,
      password: users.password,
    })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user) {
    throw new InvalidCredentialsError();
  }

  const isPasswordValid = await Bun.password.verify(
    input.password,
    user.password
  );

  if (!isPasswordValid) {
    throw new InvalidCredentialsError();
  }

  const token = crypto.randomUUID();

  await db.insert(sessions).values({
    token,
    userId: user.id,
  });

  return { token };
};

/**
 * Mengambil data profil user yang sedang login (`id`, `name`, `email`) berdasarkan token session.
 * Melakukan join antara tabel `sessions` dan `users` tanpa mengembalikan field sensitif.
 *
 * @throws {UnauthorizedError} Jika token kosong atau session tidak ditemukan.
 */
export const getCurrentUser = async (token: string): Promise<CurrentUser> => {
  const trimmedToken = token ? token.trim() : "";
  if (!trimmedToken) {
    throw new UnauthorizedError();
  }

  const [result] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, trimmedToken))
    .limit(1);

  if (!result) {
    throw new UnauthorizedError();
  }

  return result;
};

/**
 * Melakukan logout user dengan menghapus data session terkait dari tabel `sessions`.
 * Menggunakan single query delete yang atomik untuk memastikan token langsung tidak berlaku.
 *
 * @throws {UnauthorizedError} Jika token kosong atau session tidak ditemukan.
 */
export const logoutUser = async (token: string): Promise<void> => {
  const trimmedToken = token ? token.trim() : "";
  if (!trimmedToken) {
    throw new UnauthorizedError();
  }

  const [result] = await db
    .delete(sessions)
    .where(eq(sessions.token, trimmedToken));

  if (!result || (result as any).affectedRows === 0) {
    throw new UnauthorizedError();
  }
};
