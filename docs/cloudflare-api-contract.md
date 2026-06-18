# Cloudflare API Contract

เอกสารนี้กำหนด API target สำหรับย้ายระบบจาก Apps Script ไป Cloudflare Workers โดยตั้งใจให้ frontend เดิมแก้น้อยที่สุดในช่วงแรก และค่อย refactor เป็นมาตรฐานมากขึ้นภายหลัง

## Base URL

```text
https://<worker-domain>/api
```

## Authentication

### Login

- client ส่ง `username` + `password`
- server สร้าง session token แบบสุ่ม
- token เก็บใน D1 table `sessions`
- frontend ส่ง token ผ่าน header

Recommended header:

```text
Authorization: Bearer <token>
```

Compatibility fallback ช่วงแรก:

- อนุญาตรับ `token` ใน query/body สำหรับหน้าบ้านเดิมที่ยังไม่ refactor ครบ

## Response Envelope

เพื่อให้ใกล้ของเดิม:

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

Error shape:

```json
{
  "success": false,
  "message": "human readable message",
  "error_code": "OPTIONAL_CODE"
}
```

## Compatibility Mapping

Apps Script ปัจจุบันใช้ `?fn=<name>&args=...`

Target API ควรมี route จริง แต่ใน phase แรกอาจทำ compatibility endpoint เพิ่ม:

```text
POST /api/compat
GET  /api/compat?fn=getConfig
```

จากนั้น map ไป endpoint ด้านล่าง

## Auth Endpoints

### POST /api/login

Request:

```json
{
  "username": "admin",
  "password": "******",
  "role": "admin"
}
```

Response:

```json
{
  "success": true,
  "token": "session-token",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin",
    "name": "ผู้ดูแลระบบ",
    "avatar": ""
  }
}
```

### GET /api/session

ใช้ตรวจ token ปัจจุบัน

Response:

```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "username": "admin",
    "role": "admin",
    "name": "ผู้ดูแลระบบ",
    "expires_at": "2026-06-18T10:00:00Z"
  }
}
```

### POST /api/logout

Invalidate current session

### POST /api/forgot-password

Request:

```json
{
  "email": "user@example.com"
}
```

หมายเหตุ:

- หากยังไม่พร้อมส่ง email ใน phase แรก ให้ตอบว่า feature pending หรือจำกัด admin reset แทน

## Config Endpoints

### GET /api/config

Public-ish config สำหรับหน้า login และ branding

### PUT /api/config

Admin only

Request example:

```json
{
  "app_name": "Requisition of consumables (Eng-RD) System",
  "app_logo_file_id": "file-id",
  "organization_name": "Eng-RD",
  "telegram_enabled": true,
  "telegram_bot_token": "secret",
  "telegram_chat_id": "123456",
  "notify_low_stock": true,
  "notify_pending_approval": true,
  "low_stock_threshold": 5,
  "app_version": "3.09"
}
```

## User Endpoints

### GET /api/users

Admin only

### POST /api/users

Admin only

Request:

```json
{
  "username": "staff",
  "password": "temp-pass",
  "role": "staff",
  "name": "เจ้าหน้าที่คลัง",
  "email": "",
  "phone": ""
}
```

### PUT /api/users/:id

Admin or owner for allowed profile fields

### POST /api/users/:id/reset-password

Admin only

### POST /api/users/change-password

Authenticated user

Request:

```json
{
  "old_password": "old",
  "new_password": "new"
}
```

### POST /api/users/:id/toggle-active

Admin only

## Item Endpoints

### GET /api/items

Query params:

- `q`
- `item_type`
- `category`
- `machine_id`
- `stock_status`
- `active`

Response item shape:

```json
{
  "id": "uuid",
  "item_code": "SUP-001",
  "name": "ดอกมิลลิ่ง",
  "size": "3 MM",
  "unit": "EA",
  "category": "หมวดดอกมิลลิ่ง ( Milling )",
  "item_type": "consumable",
  "part_no": "",
  "machine_name": "",
  "compatible_machines": "",
  "condition_status": "",
  "serial_tracking": false,
  "current_stock": 4,
  "min_stock": 3,
  "spare_part_units": "",
  "description": "",
  "image_file_id": "",
  "active": true
}
```

### GET /api/items/:id

### POST /api/items

Admin only

Request:

```json
{
  "item_code": "PLC-001",
  "name": "PLC (FX1N-14MR)",
  "size": "-",
  "unit": "EA",
  "category": "อะไหล่เครื่องจักร",
  "part_no": "FX1N-14MR",
  "machine_name": "เครื่องตัดเอ็นกลาง",
  "compatible_machines": "เครื่องตัดเอ็นกลาง\nเครื่องเจียร",
  "condition_status": "พร้อมใช้",
  "serial_tracking": true,
  "current_stock": 1,
  "min_stock": 1,
  "spare_part_units": "",
  "description": "",
  "image_file_id": "file-id"
}
```

Required behavior:

- ถ้า `category` ขึ้นต้นด้วย `หมวด` ให้ `item_type = consumable`
- อื่น ๆ ให้ `item_type = spare_part`
- รองรับ manual `item_code`

### PUT /api/items/:id

Admin only

### DELETE /api/items/:id

Soft delete by default

## Machine Reference Endpoints

### GET /api/machines

### POST /api/machines

### PUT /api/machines/:id

### GET /api/machine-groups

### POST /api/machine-groups

ใช้เมื่อระบบอะไหล่เครื่องจักรขยายเต็มรูปแบบ

## Receive Endpoints

### GET /api/receives

Query:

- `date_from`
- `date_to`
- `item_type`
- `item_id`

### POST /api/receives

Request:

```json
{
  "item_id": "uuid",
  "item_type": "consumable",
  "quantity": 5,
  "date": "2026-06-18",
  "note": "รับจากจัดซื้อ"
}
```

Required behavior:

- create receive record
- increment item stock
- write `transactions` row of type `receive`

## Withdrawal Endpoints

### GET /api/withdrawals

Query:

- `status`
- `requested_by_me`
- `date_from`
- `date_to`

Employee must see only own requests

### POST /api/withdrawals

Target request must support multi-item natively:

```json
{
  "purpose": "ซ่อมเครื่องจักร",
  "note": "เครื่องหยุดฉุกเฉิน",
  "via_qr": false,
  "items": [
    {
      "item_id": "item-1",
      "quantity": 1
    },
    {
      "item_id": "item-2",
      "quantity": 2
    }
  ]
}
```

Compatibility fallback:

```json
{
  "item_id": "item-1",
  "quantity": 1,
  "purpose": "ใช้ทั่วไป",
  "note": ""
}
```

Response:

```json
{
  "success": true,
  "message": "ยื่นคำขอเบิกเรียบร้อย รอการอนุมัติ",
  "withdraw_no": "WD-2569-0003",
  "items_count": 2
}
```

### POST /api/withdrawals/:id/approve

Admin only

Request:

```json
{
  "items": [
    {
      "withdrawal_item_id": "line-1",
      "quantity_approved": 1
    },
    {
      "withdrawal_item_id": "line-2",
      "quantity_approved": 2
    }
  ]
}
```

Compatibility fallback for legacy single-item approval:

```json
{
  "quantity_approved": 1
}
```

Required behavior:

- validate status is `pending`
- deduct stock atomically
- update request + detail rows
- create `transactions`
- trigger low stock notification if `current_stock <= min_stock`

### POST /api/withdrawals/:id/reject

Admin only

Request:

```json
{
  "reason": "ข้อมูลไม่ครบ"
}
```

### POST /api/withdrawals/:id/cancel

Owner only while pending

## Transaction and Report Endpoints

### GET /api/transactions

Query:

- `type`
- `date_from`
- `date_to`
- `item_type`
- `mine`

### GET /api/reports/dashboard

Response should include enough data for current dashboard cards/charts:

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_items": 0,
      "low_stock": 0,
      "pending_withdrawals": 0,
      "today_transactions": 0
    },
    "monthly": [],
    "top_items": [],
    "low_stock_items": []
  }
}
```

### GET /api/reports/monthly?year=2026&month=6

### GET /api/reports/low-stock

Recommended response split by type:

```json
{
  "success": true,
  "data": {
    "total": 5,
    "consumable": [],
    "spare_part": []
  }
}
```

### GET /api/audit-logs

Admin only

## File Endpoints

### POST /api/files

Use multipart upload instead of base64 if possible

Response:

```json
{
  "success": true,
  "data": {
    "file_id": "uuid",
    "url": "https://public-r2-url/..."
  }
}
```

### DELETE /api/files/:id

Optional cleanup route

## Notification Endpoints

### POST /api/notifications/test-telegram

Admin only

### POST /api/notifications/test-line

Optional future route

## HTTP Status Guidance

- `200` success and business validation failure with `success: false` during compatibility phase
- later refactor to real status codes:
  - `400` invalid input
  - `401` invalid session
  - `403` forbidden
  - `404` not found
  - `409` state conflict
  - `500` internal error

## Migration Notes for Frontend

Current frontend is tightly coupled to `callAPI(fnName, ...)` in:

- [api.js](C:\Users\NITRO 5\Documents\Codex\2026-06-13\gemini\work\api.js)
- [app.js](C:\Users\NITRO 5\Documents\Codex\2026-06-13\gemini\work\app.js)

Recommended migration order:

1. Add Worker compatibility endpoint for `fn` style calls
2. Switch frontend base URL from GAS to Worker
3. Confirm all existing flows work
4. Gradually refactor frontend to proper REST routes

## Non-goals for Phase 1

- perfect REST purity
- full domain-driven refactor
- replacing every UI assumption at once
- advanced queue-based notification fanout

Phase 1 goal is stable cutover with lower latency and no data loss.
