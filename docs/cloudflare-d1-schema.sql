PRAGMA foreign_keys = ON;

-- ============================================================
-- Core users and auth
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'employee')),
  full_name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  avatar_file_id TEXT,
  telegram_chat_id TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================
-- Config and reference
-- ============================================================

CREATE TABLE IF NOT EXISTS config (
  id TEXT PRIMARY KEY,
  app_name TEXT NOT NULL,
  app_logo_file_id TEXT,
  organization_name TEXT DEFAULT '',
  organization_address TEXT DEFAULT '',
  organization_phone TEXT DEFAULT '',
  organization_email TEXT DEFAULT '',
  telegram_bot_token TEXT DEFAULT '',
  telegram_chat_id TEXT DEFAULT '',
  telegram_enabled INTEGER NOT NULL DEFAULT 0,
  line_enabled INTEGER NOT NULL DEFAULT 0,
  line_token TEXT DEFAULT '',
  notification_recipients TEXT DEFAULT '',
  notify_low_stock INTEGER NOT NULL DEFAULT 1,
  notify_pending_approval INTEGER NOT NULL DEFAULT 1,
  bridge_url TEXT DEFAULT '',
  gas_endpoint TEXT DEFAULT '',
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  app_version TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS machine_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS machines (
  id TEXT PRIMARY KEY,
  machine_group_id TEXT,
  machine_code TEXT,
  machine_name TEXT NOT NULL UNIQUE,
  location_name TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (machine_group_id) REFERENCES machine_groups(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_machines_group_id ON machines(machine_group_id);

-- ============================================================
-- Files
-- ============================================================

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  storage_key TEXT NOT NULL UNIQUE,
  public_url TEXT,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER DEFAULT 0,
  owner_type TEXT DEFAULT '',
  owner_id TEXT DEFAULT '',
  source_drive_file_id TEXT DEFAULT '',
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- Items
-- ============================================================

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  item_code TEXT NOT NULL UNIQUE,
  item_name TEXT NOT NULL,
  size_label TEXT DEFAULT '',
  unit TEXT NOT NULL,
  category_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('consumable', 'spare_part')),
  part_no TEXT DEFAULT '',
  machine_name_legacy TEXT DEFAULT '',
  compatible_machines_text TEXT DEFAULT '',
  condition_status TEXT DEFAULT '',
  serial_tracking INTEGER NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  spare_part_units TEXT DEFAULT '',
  description TEXT DEFAULT '',
  image_file_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (image_file_id) REFERENCES files(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_items_type ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_name);
CREATE INDEX IF NOT EXISTS idx_items_stock ON items(current_stock, min_stock);

CREATE TABLE IF NOT EXISTS item_machines (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  machine_id TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(item_id, machine_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_item_machines_item_id ON item_machines(item_id);
CREATE INDEX IF NOT EXISTS idx_item_machines_machine_id ON item_machines(machine_id);

CREATE TABLE IF NOT EXISTS item_serials (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  serial_no TEXT NOT NULL,
  condition_status TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'issued', 'repair', 'retired')),
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(item_id, serial_no),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_item_serials_item_id ON item_serials(item_id);

-- ============================================================
-- Stock movement
-- ============================================================

CREATE TABLE IF NOT EXISTS receives (
  id TEXT PRIMARY KEY,
  receive_no TEXT NOT NULL UNIQUE,
  item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL,
  receive_date TEXT NOT NULL,
  note TEXT DEFAULT '',
  received_by_user_id TEXT,
  received_by_name TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (received_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_receives_item_id ON receives(item_id);
CREATE INDEX IF NOT EXISTS idx_receives_date ON receives(receive_date);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id TEXT PRIMARY KEY,
  withdraw_no TEXT NOT NULL UNIQUE,
  request_group TEXT,
  purpose TEXT DEFAULT '',
  note TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  via_qr INTEGER NOT NULL DEFAULT 0,
  requested_by_user_id TEXT NOT NULL,
  requested_by_name TEXT DEFAULT '',
  requested_at TEXT NOT NULL,
  approved_by_user_id TEXT,
  approved_by_name TEXT DEFAULT '',
  approved_at TEXT,
  reject_reason TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (requested_by_user_id) REFERENCES users(id),
  FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_requested_by ON withdrawal_requests(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_requested_at ON withdrawal_requests(requested_at);

CREATE TABLE IF NOT EXISTS withdrawal_request_items (
  id TEXT PRIMARY KEY,
  withdrawal_request_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  unit TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('consumable', 'spare_part')),
  quantity_requested INTEGER NOT NULL,
  quantity_approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (withdrawal_request_id) REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_request_items_request_id ON withdrawal_request_items(withdrawal_request_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_request_items_item_id ON withdrawal_request_items(item_id);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('receive', 'withdraw', 'adjust', 'stocktake')),
  item_id TEXT NOT NULL,
  item_code TEXT DEFAULT '',
  item_name TEXT DEFAULT '',
  item_type TEXT NOT NULL CHECK (item_type IN ('consumable', 'spare_part')),
  quantity INTEGER NOT NULL,
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  ref_id TEXT DEFAULT '',
  actor_user_id TEXT,
  actor_name TEXT DEFAULT '',
  actor_role TEXT DEFAULT '',
  approved_by_name TEXT DEFAULT '',
  note TEXT DEFAULT '',
  tx_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(tx_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(tx_type);

-- ============================================================
-- Audit and errors
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  module_name TEXT NOT NULL,
  detail TEXT DEFAULT '',
  actor_user_id TEXT,
  actor_name TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_module_name ON audit_logs(module_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE TABLE IF NOT EXISTS error_logs (
  id TEXT PRIMARY KEY,
  source_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT DEFAULT '',
  payload_json TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

-- ============================================================
-- Suggested seed config
-- ============================================================

-- Keep exactly one row in config. Use a fixed id such as 'system-config'
