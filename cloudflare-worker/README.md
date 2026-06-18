# Cloudflare Worker Scaffold

โฟลเดอร์นี้คือ backend เป้าหมายสำหรับย้ายออกจาก Google Apps Script

## Included

- `src/index.js` Worker API + compat endpoint
- `wrangler.toml` bindings สำหรับ D1 / R2 / KV
- `migrations/0001_init.sql` schema เริ่มต้น
- `scripts/generate-import-sql.mjs` ตัวแปลง Google Sheets export -> SQL import สำหรับ D1
- `scripts/export-from-gas.mjs` ตัวดึงข้อมูลจาก GAS production ออกมาเป็น JSON สำหรับ import

## Quick Start

1. ติดตั้ง Wrangler
2. แก้ `database_id`, `kv id`, และ bucket name ใน [wrangler.toml](C:\Users\NITRO 5\Documents\Codex\2026-06-13\gemini\work\cloudflare-worker\wrangler.toml)
3. สร้าง D1 / R2 / KV ใน Cloudflare
4. รัน migration

```bash
wrangler d1 migrations apply requisition-consumables-db
```

5. ถ้าต้องการช่วงเปลี่ยนผ่านแบบ fallback ไป GAS:

- ตั้ง `ALLOW_GAS_FALLBACK=true`
- ตั้ง `GAS_FALLBACK_URL=https://script.google.com/macros/s/.../exec`

## Compat Endpoint

ใช้งานได้ที่:

```text
/api/compat?fn=getConfig
/api/compat?fn=getItems&args=["token"]
```

เหมาะกับการเอา frontend เดิมมาต่อก่อน แล้วค่อย refactor ไป REST endpoint ทีหลัง

REST endpoints ที่ scaffold ไว้แล้ว:

- `GET /api/config`
- `GET /api/items`
- `GET /api/users`
- `GET /api/receives`
- `POST /api/receives`
- `GET /api/withdrawals`
- `POST /api/withdrawals`
- `POST /api/withdrawals/:id/approve`
- `POST /api/withdrawals/:id/reject`
- `POST /api/withdrawals/:id/cancel`
- `GET /api/transactions`
- `GET /api/reports/dashboard`
- `GET /api/audit-logs`

## Import Script

เตรียม export JSON จาก Sheets โดยใช้ชื่อไฟล์ประมาณนี้:

- `Config.json`
- `Users.json`
- `Sessions.json`
- `Items.json`
- `Receives.json`
- `Withdrawals.json`
- `Transactions.json`
- `AuditLogs.json`

แล้วรัน:

```bash
node scripts/generate-import-sql.mjs --input ../exports --output ./tmp/import.sql
```

จากนั้น execute เข้า D1:

```bash
wrangler d1 execute requisition-consumables-db --file ./tmp/import.sql
```

## Export from GAS

ตัวอย่างการดึงข้อมูลจากระบบเดิม:

```bash
node scripts/export-from-gas.mjs ^
  --base-url "https://script.google.com/macros/s/.../exec" ^
  --username "admin" ^
  --password "123456" ^
  --output "../exports"
```

ไฟล์ที่จะได้ เช่น:

- `Config.json`
- `Users.json`
- `Items.json`
- `Receives.json`
- `Withdrawals.json`
- `Transactions.json`
- `AuditLogs.json`

จากนั้นค่อยรัน `generate-import-sql.mjs` เพื่อนำเข้า D1
