# Belajar Vibe Coding - Backend API

Proyek backend RESTful API menggunakan **Bun**, **ElysiaJS**, **Drizzle ORM**, **MySQL**, dan **Swagger UI (@elysia/openapi)**.

## Tech Stack
- **Runtime:** [Bun](https://bun.sh/)
- **Web Framework:** [ElysiaJS](https://elysiajs.com/)
- **API Documentation:** [@elysia/openapi](https://elysiajs.com/plugins/openapi.html) (Swagger UI)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Database Driver:** `mysql2`

## Struktur Project
```text
.
├── src/
│   ├── db/
│   │   ├── index.ts           # Inisialisasi pool MySQL dan instance Drizzle
│   │   └── schema.ts          # Definisi skema tabel users & sessions
│   ├── routes/
│   │   └── user-routes.ts     # Endpoint user, login, logout, & current user
│   ├── services/
│   │   └── user-services.ts   # Business logic, otentikasi bcrypt, & hashing
│   └── index.ts               # Server Elysia, Swagger setup, & global error handling
├── tests/                     # Unit & integration test suite (bun test)
│   ├── current-user.test.ts   # Pengujian GET /api/users/current
│   ├── login.test.ts          # Pengujian POST /api/users/login
│   ├── logout.test.ts         # Pengujian DELETE /api/users/logout
│   ├── register.test.ts       # Pengujian POST /api/users
│   ├── swagger.test.ts        # Pengujian GET /swagger & /swagger/json
│   ├── system.test.ts         # Pengujian GET / & GET /health
│   └── test-utils.ts          # Helper pembersih database untuk testing
├── drizzle/                   # File migrasi SQL hasil generate Drizzle
├── drizzle.config.ts          # Konfigurasi Drizzle Kit untuk MySQL
├── index.ts                   # Entrypoint root
├── package.json
├── tsconfig.json
└── .env.example               # Template konfigurasi environment
```

## Prasyarat
- [Bun](https://bun.sh) (v1.0+)
- Server MySQL (lokal atau remote)

## Panduan Penggunaan

### 1. Konfigurasi Environment
Salin file template environment:
```bash
cp .env.example .env
```
Sesuaikan `DATABASE_URL` atau konfigurasi kredensial MySQL di file `.env`.

### 2. Install Dependencies
```bash
bun install
```

### 3. Migrasi & Skema Database (Drizzle Kit)
- **Generate migrasi baru:**
  ```bash
  bun run db:generate
  ```
- **Push skema langsung ke database:**
  ```bash
  bun run db:push
  ```
- **Buka visual web dashboard (Drizzle Studio):**
  ```bash
  bun run db:studio
  ```

### 4. Menjalankan Server
- **Mode Development (dengan watch/hot-reload):**
  ```bash
  bun run dev
  ```
- **Mode Production:**
  ```bash
  bun run start
  # atau
  bun run index.ts
  ```

### 5. Pengujian & Typecheck
- **Menjalankan test suite:**
  ```bash
  bun test
  ```
- **Type checking TypeScript:**
  ```bash
  bun run typecheck
  ```

### 6. Dokumentasi API Interaktif (Swagger UI)
Aplikasi ini dilengkapi dengan dokumentasi interaktif berbasis Swagger UI:
- **Swagger UI:** [http://localhost:3000/swagger](http://localhost:3000/swagger)
- **OpenAPI JSON Spec:** [http://localhost:3000/swagger/json](http://localhost:3000/swagger/json)

#### Cara Menguji API Melalui Swagger UI:
1. Jalankan server (`bun run dev`).
2. Buka `http://localhost:3000/swagger` pada browser.
3. Gunakan endpoint `POST /api/users` untuk registrasi user baru.
4. Gunakan endpoint `POST /api/users/login` untuk login dan salin token UUID dari response body (`data`).
5. Klik tombol **Authorize** (ikon gembok) di pojok kanan atas Swagger UI, masukkan token sesi ke kolom value, lalu klik **Authorize**.
6. Sekarang Anda dapat langsung menguji endpoint terproteksi seperti `GET /api/users/current` dan `DELETE /api/users/logout` langsung dari antarmuka browser.

### 7. Daftar Endpoint API

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
