# Belajar Vibe Coding - Backend API

Proyek backend menggunakan **Bun**, **ElysiaJS**, **Drizzle ORM**, dan **MySQL**.

## Tech Stack
- **Runtime:** [Bun](https://bun.sh/)
- **Web Framework:** [ElysiaJS](https://elysiajs.com/)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Database Driver:** `mysql2`

## Struktur Project
```text
.
├── src/
│   ├── db/
│   │   ├── index.ts     # Inisialisasi pool MySQL dan instance Drizzle
│   │   └── schema.ts    # Definisi skema tabel database
│   └── index.ts         # Server Elysia, routing, & error handling
├── test/
│   └── index.test.ts    # Unit & integration tests
├── drizzle/             # File migrasi SQL hasil generate Drizzle
├── drizzle.config.ts    # Konfigurasi Drizzle Kit untuk MySQL
├── index.ts             # Entrypoint root
├── package.json
├── tsconfig.json
└── .env.example         # Template konfigurasi environment
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

### 6. Endpoint API
- `GET http://localhost:3000/` — Info status server.
- `GET http://localhost:3000/health` — Health check status koneksi database.
