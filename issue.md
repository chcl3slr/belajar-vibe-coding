# Feature: Login User & Session Management (`POST /api/users/login`)

## Tujuan
Menambahkan fitur login user menggunakan **email** dan **password** pada backend **Bun + ElysiaJS + Drizzle ORM + MySQL**. Saat login berhasil, aplikasi akan memverifikasi password bcrypt, membuat token session berupa **UUID**, menyimpannya ke tabel `sessions`, dan mengembalikan token tersebut ke client.

Dokumen ini disusun bertahap agar mudah diikuti oleh junior programmer maupun model AI yang lebih ringan, mengikuti pola kode yang sudah ada di repository.

---

## Spesifikasi Database

Tambahkan tabel `sessions` pada `src/db/schema.ts` dengan struktur kolom berikut:

| Kolom | Tipe Data | Constraint / Keterangan |
| --- | --- | --- |
| `id` | `INTEGER` | Primary Key, `AUTO_INCREMENT` |
| `token` | `VARCHAR(255)` | `NOT NULL` (berisi UUID token session user yang login; disarankan `UNIQUE`) |
| `user_id` | `INTEGER` | `NOT NULL`, Foreign Key mengacu ke `users.id` |
| `created_at` | `TIMESTAMP` | `NOT NULL`, default `CURRENT_TIMESTAMP` |

> **Catatan Penting MySQL Foreign Key:**  
> Pada `src/db/schema.ts`, kolom `users.id` menggunakan tipe `int("id")`. Pastikan kolom `user_id` pada tabel `sessions` juga menggunakan `int("user_id")` dengan `.references(() => users.id)` agar tipe datanya kompatibel sebagai Foreign Key di MySQL.

---

## Spesifikasi API

- **Endpoint:** `POST /api/users/login`
- **Content-Type:** `application/json`

### Request Body
```json
{
  "email": "ben@localhost",
  "password": "rahasia"
}
```

### Response Body (Success)
HTTP Status: `200 OK`
```json
{
  "data": "550e8400-e29b-41d4-a716-446655440000"
}
```
*(Nilai `"data"` berupa string UUID token session yang tersimpan di tabel `sessions`.)*

### Response Body (Error - Kredensial Salah)
HTTP Status: `401 Unauthorized`
```json
{
  "error": "Email atau password salah"
}
```

> **Catatan Validasi Email:** Sama seperti endpoint registrasi (`POST /api/users`), pastikan validasi `email` tetap menerima domain lokal seperti `"ben@localhost"` (jangan gunakan validator email TLD ketat yang menolak `@localhost`).

---

## Struktur Folder & Penamaan File

Struktur folder `routes/` dan `services/` sudah tersedia di dalam `src/`. Tambahkan implementasi login ke file yang sesuai dengan konvensi berikut:

```text
src/
├── db/
│   ├── index.ts
│   └── schema.ts              # Tambahkan definisi tabel sessions
├── routes/
│   └── user-routes.ts         # Tambahkan route POST /api/users/login
├── services/
│   └── user-services.ts       # Tambahkan logic login & pembuatan session
└── index.ts                   # Sudah mendaftarkan userRoutes
```

---

## Tahapan Implementasi

Ikuti langkah-langkah berikut secara berurutan:

### Tahap 1: Tambahkan Tabel `sessions` di `src/db/schema.ts` & Generate Migrasi
1. Buka `src/db/schema.ts`.
2. Tambahkan definisi tabel `sessions` menggunakan `mysqlTable("sessions", { ... })` dengan kolom:
   - `id`: `int("id").autoincrement().primaryKey()`
   - `token`: `varchar("token", { length: 255 }).notNull().unique()`
   - `userId`: `int("user_id").notNull().references(() => users.id, { onDelete: "cascade" })`
   - `createdAt`: `timestamp("created_at").defaultNow().notNull()`
3. Export type helper `Session` dan `NewSession` (mengikuti pola `User` dan `NewUser`).
4. Jalankan `bun run db:generate` untuk membuat file migrasi SQL baru di folder `drizzle/`.
5. Jika server MySQL lokal aktif, jalankan `bun run db:push` atau `bun run db:migrate` untuk menerapkan tabel baru ke database.

### Tahap 2: Tambahkan Logic Login di `src/services/user-services.ts`
1. Buat custom error class `InvalidCredentialsError` dengan pesan default `"Email atau password salah"` (mengikuti pola `UserAlreadyExistsError` yang sudah ada).
2. Buat interface `LoginUserInput` (`email: string`, `password: string`) dan fungsi `loginUser(input: LoginUserInput)`.
3. Di dalam `loginUser`:
   - Query tabel `users` berdasarkan `email` (`.where(eq(users.email, input.email)).limit(1)`).
   - Jika user tidak ditemukan, lempar `InvalidCredentialsError`.
   - Verifikasi password menggunakan API bawaan Bun: `await Bun.password.verify(input.password, user.password)`.
   - Jika hasil verifikasi `false`, lempar `InvalidCredentialsError` (gunakan pesan error yang sama agar tidak membocorkan apakah email terdaftar atau tidak).
   - Buat token UUID baru menggunakan API bawaan `crypto.randomUUID()`.
   - Simpan session baru ke tabel `sessions` (`token`, `userId: user.id`) menggunakan `db.insert(sessions).values(...)`.
   - Kembalikan string `token` tersebut (atau objek `{ token }`, lalu di route ambil `token`-nya untuk dikembalikan sebagai `{ "data": token }`).

### Tahap 3: Tambahkan Endpoint `POST /api/users/login` di `src/routes/user-routes.ts`
1. Buka `src/routes/user-routes.ts` dan tambahkan `.post("/api/users/login", ...)` pada `userRoutes` yang sudah ada.
2. Definisikan validasi `body` dengan `t.Object`:
   - `email`: gunakan aturan validasi yang sama seperti route registrasi agar `"ben@localhost"` diterima.
   - `password`: `t.String({ minLength: 1 })`.
3. Panggil `loginUser(body)` di dalam blok `try/catch`:
   - Jika berhasil: set status `200` dan kembalikan `{ "data": token }`.
   - Jika menangkap `InvalidCredentialsError`: set status `401` dan kembalikan `{ "error": error.message }`.
   - Error lain tetap diteruskan (`throw error`) agar ditangani oleh global error handler.
4. Pastikan `userRoutes` tetap terpasang di `src/index.ts` via `.use(userRoutes)`.

### Tahap 4: Tambahkan Pengujian di `test/user.test.ts`
1. Perluas test suite di `test/user.test.ts` dengan skenario berikut (gunakan `spyOn` seperti test registrasi yang sudah ada agar test tidak bergantung pada koneksi MySQL aktif):
   - **Validasi input:** request dengan body kosong atau format email tidak valid mengembalikan status `422`.
   - **Login sukses:** email lokal seperti `"ben@localhost"` dan password valid mengembalikan status `200` dengan response `{ "data": "<token>" }`.
   - **Login gagal:** saat service melempar `InvalidCredentialsError`, endpoint mengembalikan status `401` dengan response `{ "error": "Email atau password salah" }`.
   - **Verifikasi helper:** uji bahwa `Bun.password.verify` mengembalikan `true` untuk password cocok dan `false` untuk password salah, serta `crypto.randomUUID()` menghasilkan string UUID yang valid.

### Tahap 5: Verifikasi Akhir
Pastikan seluruh pemeriksaan berikut berjalan tanpa error setelah perubahan selesai:
- `bun run typecheck`
- `bun test`
- `bun run db:generate` (pastikan tidak ada schema drift yang belum ter-generate)

---

## Acceptance Criteria (Kriteria Selesai)
- [ ] Tabel `sessions` terdefinisi di `src/db/schema.ts` (`id`, `token`, `user_id` FK ke `users.id`, `created_at`) dan file migrasi Drizzle telah di-generate.
- [ ] Service `loginUser` di `src/services/user-services.ts` memverifikasi password bcrypt, membuat token UUID, dan menyimpannya ke tabel `sessions`.
- [ ] Endpoint `POST /api/users/login` tersedia di `src/routes/user-routes.ts`.
- [ ] Login berhasil mengembalikan HTTP `200` dengan body `{ "data": "<token-uuid>" }`.
- [ ] Login gagal (email tidak ditemukan atau password salah) mengembalikan HTTP `401` dengan body `{ "error": "Email atau password salah" }`.
- [ ] `bun run typecheck` dan `bun test` lolos tanpa error.
