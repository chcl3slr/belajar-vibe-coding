# Belajar Vibe Coding — Backend API

Backend REST API untuk manajemen user dan autentikasi berbasis session token (registrasi, login, profil user aktif, dan logout), pemantauan status layanan (*health check*), serta dokumentasi interaktif menggunakan **Swagger UI (@elysia/openapi)**. Proyek ini dibangun menggunakan **Bun**, **ElysiaJS**, **Drizzle ORM**, dan **MySQL** dengan pemisahan layer yang rapi antara routing, business logic, dan akses database.

---

## Daftar Isi
- [Technology Stack](#technology-stack)
- [Library yang Digunakan](#library-yang-digunakan)
- [Arsitektur & Struktur Project](#arsitektur--struktur-project)
- [Schema Database](#schema-database)
- [Dokumentasi API Interaktif (Swagger UI)](#dokumentasi-api-interaktif-swagger-ui)
- [API yang Tersedia](#api-yang-tersedia)
- [Cara Setup Project](#cara-setup-project)
- [Cara Menjalankan Aplikasi](#cara-menjalankan-aplikasi)
- [Cara Test & Verifikasi Aplikasi](#cara-test--verifikasi-aplikasi)

---

## Technology Stack
- **Runtime, Package Manager & Test Runner:** [Bun](https://bun.sh/)
- **Bahasa Pemrograman:** TypeScript (`strict: true`)
- **Web Framework:** [ElysiaJS](https://elysiajs.com/)
- **API Documentation:** [@elysia/openapi](https://elysiajs.com/plugins/openapi.html) (Swagger UI)
- **ORM & Schema Migration:** [Drizzle ORM](https://orm.drizzle.team/) & Drizzle Kit
- **Database Driver:** `mysql2`
- **Database:** MySQL

---

## Library yang Digunakan

### Dependencies (`package.json`)
| Package | Versi | Kegunaan |
| --- | --- | --- |
| `elysia` | `^1.4.32` | Web framework, HTTP routing, validasi schema (`t` / TypeBox), dan global error handling |
| `@elysia/openapi` | `^1.4.17` | Plugin OpenAPI untuk dokumentasi Swagger UI (`/swagger`) dan spesifikasi JSON (`/swagger/json`) |
| `drizzle-orm` | `^0.45.4` | ORM type-safe untuk definisi skema tabel dan query builder MySQL |
| `mysql2` | `^3.24.6` | Driver MySQL berbasis connection pool (`mysql2/promise`) yang digunakan oleh Drizzle |
| `dotenv` | `^18.0.10` | Memuat konfigurasi environment variable dari file `.env` |

### DevDependencies (`package.json`)
| Package | Versi | Kegunaan |
| --- | --- | --- |
| `drizzle-kit` | `^0.31.11` | CLI untuk generate SQL migration, push skema, dan membuka Drizzle Studio |
| `@types/bun` | `^1.4.5` | Definisi tipe TypeScript untuk API bawaan Bun |
| `typescript` | `^7.0.2` | Compiler untuk type checking (`bun check`) |

### API Bawaan Bun / Web Standard
- **`Bun.password.hash` & `Bun.password.verify`** (algoritma `bcrypt`, cost `10`) — Hashing dan verifikasi password user secara aman.
- **`crypto.randomUUID()`** — Pembuatan token session UUID saat user login.
- **`bun:test`** — Test runner bawaan untuk unit dan integration test.

---

## Arsitektur & Struktur Project

Aplikasi ini menerapkan arsitektur berlapis (*layered architecture*) untuk memisahkan tanggung jawab HTTP, logic bisnis, dan akses database:

1. **Entry Point (`src/index.ts` & `index.ts`)**
   - Menginisialisasi aplikasi `Elysia`, mendaftarkan global error handler (`.onError({ as: "global" }, ...)`), memasang dokumentasi OpenAPI / Swagger UI, memasang route plugin (`userRoutes`), menyediakan endpoint sistem (`/` dan `/health`), serta menjalankan HTTP server.
   - Global error handler memastikan error validasi (`422`), route tidak ditemukan (`404`), dan error internal server (`500`) tertangani seragam tanpa membocorkan query SQL mentah ke client.
2. **Routes Layer (`src/routes/`)**
   - Bertanggung jawab atas routing HTTP, validasi payload (`t.Object`), metadata OpenAPI (detail tag, summary, description, response schema, dan security), ekstraksi token Bearer via helper `extractBearerToken` (mendukung skema `Bearer` secara *case-insensitive*), pemanggilan service, dan pemetaan hasil/error menjadi status HTTP & JSON response.
3. **Services Layer (`src/services/`)**
   - Menyimpan seluruh logic bisnis aplikasi (pengecekan email duplikat, hashing/verifikasi password, pembuatan/penghapusan session, dan query relasi user–session) serta mendefinisikan custom domain error (`UserAlreadyExistsError`, `InvalidCredentialsError`, `UnauthorizedError`).
4. **Database Layer (`src/db/`)**
   - Mengelola connection pool MySQL + instance Drizzle ORM (`src/db/index.ts`) dan skema tabel database beserta tipe TypeScript (`src/db/schema.ts`).
5. **Testing Layer (`tests/`)**
   - Menyimpan seluruh unit & integration test per fitur API dengan pembersihan data database sebelum setiap skenario dijalankan.

### Konvensi Penamaan File
- **Routes:** `src/routes/<domain>-routes.ts` (contoh: `user-routes.ts`)
- **Services:** `src/services/<domain>-services.ts` (contoh: `user-services.ts`)
- **Tests:** `tests/<fitur>.test.ts` (contoh: `register.test.ts`, `login.test.ts`, `current-user.test.ts`, `logout.test.ts`, `swagger.test.ts`, `system.test.ts`)

### Struktur Direktori
```text
.
├── drizzle/                        # File migrasi SQL hasil generate Drizzle Kit
│   ├── 0000_mighty_the_hunter.sql  # Migrasi awal tabel users
│   ├── 0001_famous_nightcrawler.sql# Penambahan kolom password & int auto_increment pada users
│   ├── 0002_far_husk.sql           # Pembuatan tabel sessions & FK ke users.id
│   └── meta/                       # Metadata snapshot migrasi Drizzle
├── src/
│   ├── db/
│   │   ├── index.ts                # Pool koneksi MySQL & inisialisasi Drizzle ORM
│   │   └── schema.ts               # Definisi skema tabel users & sessions
│   ├── routes/
│   │   └── user-routes.ts          # Routing API /api/users/* & helper extractBearerToken
│   ├── services/
│   │   └── user-services.ts        # Logic bisnis registrasi, login, current user, & logout
│   └── index.ts                    # Inisialisasi server Elysia, Swagger setup, global error handler, & health check
├── tests/
│   ├── test-utils.ts               # Helper cleanDatabase() untuk reset tabel sebelum tiap skenario
│   ├── system.test.ts              # Test endpoint GET /, GET /health, dan 404
│   ├── swagger.test.ts             # Test endpoint GET /swagger & /swagger/json
│   ├── register.test.ts            # Test endpoint POST /api/users
│   ├── login.test.ts               # Test endpoint POST /api/users/login
│   ├── current-user.test.ts        # Test endpoint GET /api/users/current & extractBearerToken
│   └── logout.test.ts              # Test endpoint DELETE /api/users/logout
├── .env.example                    # Template environment variable
├── .gitignore
├── drizzle.config.ts               # Konfigurasi Drizzle Kit (dialect MySQL)
├── index.ts                        # Entrypoint root (menjalankan startServer dari src/index.ts)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Schema Database

Skema didefinisikan pada `src/db/schema.ts` untuk database MySQL dengan relasi **`users` (1) ───< (N) `sessions`**.

### 1. Tabel `users`
| Kolom | Tipe Data | Constraint / Keterangan |
| --- | --- | --- |
| `id` | `INT` | Primary Key, `AUTO_INCREMENT` |
| `name` | `VARCHAR(255)` | `NOT NULL` |
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` |
| `password` | `VARCHAR(255)` | `NOT NULL` (menyimpan hash `bcrypt`) |
| `created_at` | `TIMESTAMP` | `NOT NULL`, default `CURRENT_TIMESTAMP` |

### 2. Tabel `sessions`
| Kolom | Tipe Data | Constraint / Keterangan |
| --- | --- | --- |
| `id` | `INT` | Primary Key, `AUTO_INCREMENT` |
| `token` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` (berisi UUID token session login) |
| `user_id` | `INT` | `NOT NULL`, Foreign Key ke `users.id` (`ON DELETE CASCADE`) |
| `created_at` | `TIMESTAMP` | `NOT NULL`, default `CURRENT_TIMESTAMP` |

---

## Dokumentasi API Interaktif (Swagger UI)

Aplikasi ini dilengkapi dengan antarmuka dokumentasi API interaktif berbasis Swagger UI:
- **Swagger UI:** [http://localhost:3000/swagger](http://localhost:3000/swagger)
- **OpenAPI JSON Spec:** [http://localhost:3000/swagger/json](http://localhost:3000/swagger/json)

### Cara Menguji API Melalui Swagger UI:
1. Jalankan server (`bun run dev`).
2. Buka `http://localhost:3000/swagger` pada browser.
3. Gunakan endpoint `POST /api/users` untuk registrasi user baru.
4. Gunakan endpoint `POST /api/users/login` untuk login dan salin token UUID dari response body (`data`).
5. Klik tombol **Authorize** (ikon gembok) di pojok kanan atas Swagger UI, masukkan token sesi ke kolom value, lalu klik **Authorize**.
6. Sekarang Anda dapat langsung menguji endpoint terproteksi seperti `GET /api/users/current` dan `DELETE /api/users/logout` langsung dari antarmuka browser.

---

## API yang Tersedia

Base URL default: `http://localhost:3000`

| Method | Endpoint | Auth | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Tidak | Status aplikasi dan waktu server |
| `GET` | `/health` | Tidak | Health check koneksi database MySQL & uptime |
| `GET` | `/swagger` | Tidak | Antarmuka interaktif Swagger UI |
| `GET` | `/swagger/json` | Tidak | Spesifikasi OpenAPI 3.0 dalam format JSON |
| `POST` | `/api/users` | Tidak | Registrasi akun pengguna baru |
| `POST` | `/api/users/login` | Tidak | Login akun dan membuat session token |
| `GET` | `/api/users/current` | Bearer Token | Mengambil data profil pengguna yang sedang login |
| `DELETE` | `/api/users/logout` | Bearer Token | Menghapus session token yang aktif (logout) |

### 1. Info Aplikasi — `GET /`
Mengembalikan informasi dasar dan status aplikasi.
- **Response `200 OK`:**
  ```json
  {
    "name": "belajar-vibe-coding API",
    "status": "running",
    "timestamp": "2026-11-28T00:00:00.000Z"
  }
  ```

### 2. Health Check — `GET /health`
Memeriksa kesehatan aplikasi dan koneksi ke MySQL (`SELECT 1`).
- **Response `200 OK`** (Database terhubung):
  ```json
  {
    "status": "ok",
    "database": "connected",
    "uptime": 12.345,
    "timestamp": "2026-11-28T00:00:00.000Z"
  }
  ```
- **Response `503 Service Unavailable`** (Database terputus):
  ```json
  {
    "status": "degraded",
    "database": "disconnected",
    "error": "Database unavailable",
    "timestamp": "2026-11-28T00:00:00.000Z"
  }
  ```

### 3. Registrasi User Baru — `POST /api/users`
Mendaftarkan user baru dengan password yang otomatis di-hash menggunakan `bcrypt`.
- **Request Body** (`application/json`):
  ```json
  {
    "name": "Ben",
    "email": "ben@localhost",
    "password": "rahasia"
  }
  ```
  - **Aturan Validasi:** `name` (1–255 karakter), `email` (3–255 karakter, mendukung domain lokal seperti `ben@localhost`), `password` (1–255 karakter).
- **Response `201 Created`:**
  ```json
  {
    "data": "OK"
  }
  ```
- **Response `400 Bad Request`** (Email sudah terdaftar):
  ```json
  {
    "error": "Email sudah terdaftar"
  }
  ```
- **Response `422 Unprocessable Content`:** Jika validasi input gagal (misalnya field kosong, format email salah, atau panjang melebihi 255 karakter).

### 4. Login User — `POST /api/users/login`
Memverifikasi kredensial user, membuat token session UUID baru, dan menyimpannya ke tabel `sessions`.
- **Request Body** (`application/json`):
  ```json
  {
    "email": "ben@localhost",
    "password": "rahasia"
  }
  ```
  - **Aturan Validasi:** `email` (3–255 karakter), `password` (1–255 karakter).
- **Response `200 OK`:**
  ```json
  {
    "data": "550e8400-e29b-41d4-a716-446655440000"
  }
  ```
- **Response `401 Unauthorized`** (Email tidak terdaftar atau password salah):
  ```json
  {
    "error": "Email atau password salah"
  }
  ```

### 5. Ambil Profil User Saat Ini — `GET /api/users/current`
Mengembalikan profil user yang sedang login berdasarkan token session pada header `Authorization` (tanpa menyertakan `password`).
- **Request Headers:**
  - `Authorization: Bearer <token>` *(prefix `Bearer` bersifat case-insensitive)*
- **Response `200 OK`:**
  ```json
  {
    "data": {
      "id": 1,
      "name": "Ben",
      "email": "ben@localhost"
    }
  }
  ```
- **Response `401 Unauthorized`** (Header hilang, bukan format Bearer, token kosong, atau token tidak ditemukan di `sessions`):
  ```json
  {
    "error": "Unauthorized"
  }
  ```

### 6. Logout User — `DELETE /api/users/logout`
Menghapus session user dari tabel `sessions` berdasarkan token yang dikirimkan.
- **Request Headers:**
  - `Authorization: Bearer <token>` *(prefix `Bearer` bersifat case-insensitive)*
- **Response `200 OK`:**
  ```json
  {
    "data": "OK"
  }
  ```
- **Response `401 Unauthorized`** (Header hilang, bukan format Bearer, token kosong, atau token tidak ditemukan di `sessions`):
  ```json
  {
    "error": "Unauthorized"
  }
  ```

### Penanganan Error Global
- **Route tidak ditemukan (`404`):** `{ "success": false, "code": "NOT_FOUND", "message": "Not Found" }`
- **Validasi payload gagal (`422`):** `{ "success": false, "code": "VALIDATION", "message": "..." }`
- **Error internal server (`500`):** Detail error dicatat di log server, sedangkan client hanya menerima `{ "success": false, "code": "INTERNAL_SERVER_ERROR", "message": "Internal Server Error" }` tanpa membocorkan query SQL.

---

## Cara Setup Project

### Prasyarat
- [Bun](https://bun.sh/) (v1.0 atau lebih baru)
- Server **MySQL** yang aktif (lokal maupun Docker/remote)

### Langkah Setup
1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Konfigurasi Environment:**
   Salin file template `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
   Sesuaikan isi `.env` dengan konfigurasi MySQL Anda:
   ```env
   PORT=3000

   # Database Configuration
   DATABASE_URL=mysql://root:password@localhost:3306/belajar_vibe_coding

   # Optional granular connection details
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=password
   DB_NAME=belajar_vibe_coding
   ```
   > **Catatan:** Aplikasi dan `drizzle.config.ts` memprioritaskan `DATABASE_URL` jika variabel tersebut diisi. Pastikan `DATABASE_URL` dan variabel granular (`DB_*`) menggunakan kredensial yang sesuai.

3. **Buat Database & Terapkan Skema:**
   Pastikan database `belajar_vibe_coding` sudah dibuat di MySQL:
   ```sql
   CREATE DATABASE IF NOT EXISTS belajar_vibe_coding;
   ```
   Lalu terapkan skema/migrasi menggunakan Drizzle Kit:
   ```bash
   # Menerapkan file migrasi di folder drizzle/
   bun run db:migrate

   # Atau sinkronisasi skema langsung (development)
   bun run db:push
   ```
   Perintah Drizzle lainnya yang tersedia:
   - `bun run db:generate` — Membuat file migrasi SQL baru setelah mengubah `src/db/schema.ts`.
   - `bun run db:studio` — Membuka antarmuka web Drizzle Studio untuk melihat isi database.

---

## Cara Menjalankan Aplikasi

- **Mode Development (hot-reload saat file berubah):**
  ```bash
  bun run dev
  ```
- **Mode Production:**
  ```bash
  bun run start
  ```
  *(Atau langsung melalui root entrypoint: `bun run index.ts`)*

Server akan berjalan pada `http://localhost:3000` (atau sesuai nilai `PORT` di `.env`).

---

## Cara Test & Verifikasi Aplikasi

1. **Menjalankan seluruh test suite (`tests/`):**
   ```bash
   bun test
   ```
2. **Menjalankan file test tertentu:**
   ```bash
   bun test tests/swagger.test.ts
   ```
3. **Menjalankan TypeScript type checking:**
   ```bash
   bun run typecheck
   ```

> **Peringatan Penting:** Test suite di folder `tests/` berjalan terhadap koneksi MySQL yang terkonfigurasi di `.env` dan akan menghapus seluruh data pada tabel `sessions` serta `users` sebelum setiap skenario (`cleanDatabase()` di `beforeEach`) untuk menjaga konsistensi pengujian. Selalu gunakan database khusus development/testing, **bukan** database production.
