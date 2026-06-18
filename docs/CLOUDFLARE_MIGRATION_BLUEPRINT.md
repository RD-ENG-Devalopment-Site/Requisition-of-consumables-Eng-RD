# Cloudflare Migration Blueprint

เอกสารนี้เป็นแผนย้ายระบบจาก Google Apps Script + Google Sheets ไปเป็น Cloudflare stack โดยยังคงเก็บระบบเดิมไว้สำหรับ rollback และ backup จนกว่าระบบใหม่จะนิ่ง

## เป้าหมาย

- ลดเวลา response ของ API จากระดับหลายวินาทีลงมาเป็นหลักสิบถึงหลักร้อย ms
- ย้าย backend ออกจาก Google Apps Script ที่เป็นคอขวดหลัก
- เก็บโครงสร้างหน้าบ้านเดิมไว้ให้มากที่สุด
- รองรับวัสดุสิ้นเปลืองและอะไหล่เครื่องจักรใน schema เดียว
- รองรับ multi-item withdrawal เป็น first-class flow
- มี rollback path ชัดเจน หาก cutover แล้วพบปัญหา

## Target Architecture

```text
Browser
  -> GitHub Pages (frontend static files)
  -> Cloudflare Worker (API)
     -> D1 (transactional data)
     -> R2 (logo / item images / attachments)
     -> optional KV cache (config / light cache)
```

## สถานะระบบปัจจุบัน

Backend ปัจจุบันอยู่ใน [รหัส.js](C:\Users\NITRO 5\Documents\Codex\2026-06-13\gemini\work\รหัส.js)

Current callable functions:

- `login`
- `validateSession`
- `logout`
- `forgotPassword`
- `getItems`
- `getItemById`
- `addItem`
- `updateItem`
- `deleteItem`
- `addReceive`
- `getReceives`
- `addWithdrawal`
- `getWithdrawals`
- `approveWithdrawal`
- `rejectWithdrawal`
- `cancelWithdrawal`
- `getTransactions`
- `getDashboardStats`
- `getAuditLogs`
- `getUsers`
- `addUser`
- `updateUser`
- `changePassword`
- `resetUserPassword`
- `toggleUserActive`
- `saveConfig`
- `getConfig`
- `getMonthlyReport`
- `generateExportUrl`
- `uploadFile`
- `testTelegram`

Current sheet stores:

- `Config`
- `Users`
- `Sessions`
- `Items`
- `Receives`
- `Withdrawals`
- `Transactions`
- `AuditLogs`
- `Errors`

## Migration Principles

1. ย้ายแบบ parallel run
2. ข้อมูลเดิมต้อง export ก่อนแตะ production
3. API ใหม่ช่วงแรกต้องตอบ shape ใกล้ของเดิม
4. เปลี่ยน frontend ให้น้อยที่สุดก่อน
5. ย้ายเสร็จแล้วค่อย refactor API ให้สวยขึ้นเป็น phase ถัดไป

## Recommended Cutover Strategy

### Phase 0: Freeze and Inventory

- หยุด schema change ฝั่ง GAS ชั่วคราว
- snapshot code ปัจจุบันลง GitHub
- บันทึก deployment URL ปัจจุบันของ GAS
- export รายชื่อ functions ที่ frontend ใช้งานจริง

### Phase 1: Backup

ต้องมี backup 3 ชั้น

1. Code backup
   - GitHub repository
   - tag ก่อนย้าย เช่น `pre-cloudflare-migration`

2. Data backup
   - export Google Sheets ทุก sheet เป็น CSV/JSON
   - export แยกตาม logical table

3. File backup
   - export ไฟล์จาก Google Drive ที่อ้างผ่าน `image_file_id` และ `app_logo`
   - เก็บ mapping เดิม `file_id -> filename -> item/config reference`

### Phase 2: Provision Cloudflare

- สร้าง Worker project
- สร้าง D1 database
- สร้าง R2 bucket
- สร้าง environments `dev` และ `prod`
- ตั้ง secrets เช่น notification tokens

### Phase 3: Create Compatibility Backend

สร้าง API ใหม่ให้รองรับ business rules ปัจจุบันก่อน:

- session token login
- item type inference
- low-stock threshold logic
- admin/employee role filtering
- multi-item withdrawal
- audit log

### Phase 4: Import Data

ลำดับ import ที่แนะนำ:

1. `config`
2. `users`
3. `items`
4. `receives`
5. `withdrawal_requests` + `withdrawal_items`
6. `transactions`
7. `audit_logs`
8. `files`

หมายเหตุ:

- `Withdrawals` ปัจจุบันบาง record เป็น single-item และบางชุดเป็น grouped multi-item ผ่าน `withdraw_no` และ `request_group`
- ตอน import ให้ normalize เป็น header/detail model

### Phase 5: Shadow Test

ยิง Worker จาก local/staging frontend แล้วทดสอบ:

- login/logout/session
- users page
- items CRUD
- receive stock
- submit withdrawal
- approve/reject/cancel
- dashboard/report
- logo upload / item image upload
- low stock notifications

### Phase 6: Controlled Cutover

- เปลี่ยน `config.js` หรือ runtime config ให้ชี้ไป Worker API
- ปล่อยให้ผู้ใช้จริงใช้งานช่วงจำกัด
- monitor errors, latency, and data consistency

### Phase 7: Stabilization

เก็บ GAS เดิมไว้แบบ read-only ชั่วคราว 7-14 วัน

หลังนิ่งแล้ว:

- ปิด flow write ฝั่ง GAS
- เก็บ export archive
- ค่อยย้ายออกจาก Apps Script เต็มตัว

## Rollback Plan

Rollback ต้องทำได้ภายใน 15-30 นาที

1. เปลี่ยน frontend API URL กลับไป GAS endpoint เดิม
2. ปิด Worker write routes ชั่วคราว
3. export delta data จาก D1 ถ้ามี write ใหม่หลัง cutover
4. ตรวจว่าผู้ใช้กลับมาใช้งานบนระบบเดิมได้
5. ทำ incident note ว่าล้มตรงไหนก่อนเริ่ม cutover ใหม่

## Data Mapping

### Config -> `config`

Fields currently used:

- `app_name`
- `app_logo`
- `organization_name`
- `organization_address`
- `organization_phone`
- `organization_email`
- `telegram_bot_token`
- `telegram_chat_id`
- `telegram_enabled`
- `line_enabled`
- `line_token`
- `notification_recipients`
- `notify_low_stock`
- `notify_pending_approval`
- `bridge_url`
- `gas_endpoint`
- `low_stock_threshold`
- `app_version`
- optional `folder_id`

### Users -> `users`

- `id`
- `username`
- `password`
- `role`
- `name`
- `email`
- `phone`
- `avatar`
- `telegram_chat_id`
- `active`
- `last_login`
- timestamps

### Sessions -> `sessions`

- `id`
- `token`
- `user_id`
- `username`
- `role`
- `name`
- `expires_at`
- timestamps

### Items -> `items`

- `id`
- `item_code`
- `name`
- `size`
- `unit`
- `category`
- `item_type`
- `part_no`
- `machine_name`
- `compatible_machines`
- `condition_status`
- `serial_tracking`
- `current_stock`
- `min_stock`
- `spare_part_units`
- `description`
- `image_file_id`
- `active`
- timestamps

Rule that must be preserved for compatibility:

- category ที่ขึ้นต้นด้วย `หมวด` => `consumable`
- category อื่น => `spare_part`

### Receives -> `receives`

- `receive_no`
- `item_id`
- `item_code`
- `item_name`
- `item_type`
- `quantity`
- `unit`
- `date`
- `note`
- `received_by`
- `received_by_name`

### Withdrawals -> split into header/detail

Current GAS stores one row per item even in grouped request.

Target:

- `withdrawal_requests`
- `withdrawal_request_items`

Header-level fields:

- `withdraw_no`
- `request_group`
- `purpose`
- `note`
- `status`
- `requested_by`
- `requested_by_name`
- `requested_at`
- `approved_by`
- `approved_by_name`
- `approved_at`
- `reject_reason`
- `via_qr`

Line-level fields:

- `item_id`
- `item_code`
- `item_name`
- `item_type`
- `unit`
- `quantity_requested`
- `quantity_approved`

### Transactions -> `transactions`

- `type`
- `item_id`
- `item_code`
- `item_name`
- `item_type`
- `quantity`
- `stock_before`
- `stock_after`
- `ref_id`
- `actor_id`
- `actor_name`
- `actor_role`
- `approved_by_name`
- `note`
- `date`

### AuditLogs -> `audit_logs`

- `action`
- `module`
- `detail`
- `actor_id`
- `actor_name`
- `created_at`

## File Migration Strategy

### Existing file types

- application logo
- item image
- user avatar
- future attachments

### Target in R2

Recommended key layout:

```text
logos/{uuid}-{filename}
items/{item_id}/{uuid}-{filename}
avatars/{user_id}/{uuid}-{filename}
exports/{date}/{filename}
```

Keep a metadata table `files` with:

- `id`
- `storage_key`
- `original_name`
- `mime_type`
- `size_bytes`
- `owner_type`
- `owner_id`
- `public_url`
- `source_drive_file_id`
- timestamps

## Business Rules to Preserve

1. Session timeout and token validation
2. Employee sees only own withdrawal requests and own movement history
3. Admin can approve/reject/toggle users/config changes
4. Approve withdrawal must atomically deduct stock
5. Low stock means `current_stock <= min_stock`
6. Notifications for low stock and pending approval
7. Multi-item withdrawal should be native, not workaround
8. Manual `item_code` entry must be supported

## Recommended Delivery Order

1. Auth/session
2. Items + files
3. Receives
4. Withdrawals
5. Approvals
6. Dashboard/reports
7. Notifications
8. Export tools

## Definition of Done for Migration

- Frontend production points to Worker API
- CRUD and approval flows use D1 successfully
- Logo and item image upload use R2 successfully
- Data totals match exported Sheets baseline
- Response time improves materially vs GAS baseline
- Rollback instructions verified

## Follow-up Files

- D1 schema: [cloudflare-d1-schema.sql](C:\Users\NITRO 5\Documents\Codex\2026-06-13\gemini\work\docs\cloudflare-d1-schema.sql)
- API contract: [cloudflare-api-contract.md](C:\Users\NITRO 5\Documents\Codex\2026-06-13\gemini\work\docs\cloudflare-api-contract.md)
