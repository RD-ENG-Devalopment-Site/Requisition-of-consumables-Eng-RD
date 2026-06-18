import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_IMPORTED_PASSWORD_HASH = 'e13fa5592155fb1419436bdf06ffb4bf0fc2ee69808aef33a624a789fccfab9a';

const args = parseArgs(process.argv.slice(2));
const inputDir = path.resolve(process.cwd(), args.input || '../exports');
const outputFile = path.resolve(process.cwd(), args.output || './tmp/import.sql');

const source = {
  config: readJsonFile('Config'),
  users: readJsonFile('Users'),
  sessions: readJsonFile('Sessions'),
  items: readJsonFile('Items'),
  receives: readJsonFile('Receives'),
  withdrawals: readJsonFile('Withdrawals'),
  transactions: readJsonFile('Transactions'),
  auditLogs: readJsonFile('AuditLogs')
};

const sql = [];
sql.push('-- Generated import SQL for Cloudflare D1');
sql.push("PRAGMA foreign_keys = OFF;");
truncateTables(sql);
insertConfig(sql, source.config);
insertUsers(sql, source.users);
insertSessions(sql, source.sessions);
insertItems(sql, source.items);
insertReceives(sql, source.receives);
insertWithdrawals(sql, source.withdrawals);
insertTransactions(sql, source.transactions);
insertAuditLogs(sql, source.auditLogs);
sql.push("PRAGMA foreign_keys = ON;");

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, sql.join('\n') + '\n', 'utf8');

console.log(`Import SQL written to ${outputFile}`);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    out[key] = value;
  }
  return out;
}

function readJsonFile(baseName) {
  const filePath = path.join(inputDir, `${baseName}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`Skipping missing file: ${filePath}`);
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function truncateTables(sql) {
  [
    'sessions',
    'audit_logs',
    'transactions',
    'withdrawal_request_items',
    'withdrawal_requests',
    'receives',
    'item_serials',
    'item_machines',
    'items',
    'files',
    'machines',
    'machine_groups',
    'users',
    'config'
  ].forEach((table) => sql.push(`DELETE FROM ${table};`));
}

function insertConfig(sql, rows) {
  const record = rows[0] || {};
  const id = record.id || 'system-config';
  sql.push(insertStatement('config', {
    id,
    app_name: record.app_name || 'Requisition of consumables (Eng-RD) System',
    app_logo_file_id: record.app_logo || '',
    organization_name: record.organization_name || '',
    organization_address: record.organization_address || '',
    organization_phone: record.organization_phone || '',
    organization_email: record.organization_email || '',
    telegram_bot_token: record.telegram_bot_token || '',
    telegram_chat_id: record.telegram_chat_id || '',
    telegram_enabled: boolInt(record.telegram_enabled),
    line_enabled: boolInt(record.line_enabled),
    line_token: record.line_token || '',
    notification_recipients: record.notification_recipients || '',
    notify_low_stock: boolInt(defaultTrue(record.notify_low_stock)),
    notify_pending_approval: boolInt(defaultTrue(record.notify_pending_approval)),
    bridge_url: record.bridge_url || '',
    gas_endpoint: record.gas_endpoint || '',
    low_stock_threshold: intVal(record.low_stock_threshold, 5),
    app_version: record.app_version || '',
    created_at: record.created_at || nowIso(),
    updated_at: record.updated_at || nowIso()
  }));
}

function insertUsers(sql, rows) {
  rows.forEach((row) => {
    sql.push(insertStatement('users', {
      id: row.id || cryptoLikeId('user'),
      username: row.username || '',
      password_hash: row.password || row.password_hash || DEFAULT_IMPORTED_PASSWORD_HASH,
      role: row.role || 'employee',
      full_name: row.name || row.full_name || row.username || '',
      email: row.email || '',
      phone: row.phone || '',
      avatar_file_id: row.avatar || row.avatar_file_id || '',
      telegram_chat_id: row.telegram_chat_id || '',
      is_active: boolInt(row.active !== false && row.is_active !== 0),
      last_login_at: row.last_login || row.last_login_at || '',
      created_at: row.created_at || nowIso(),
      updated_at: row.updated_at || nowIso()
    }));
  });
}

function insertSessions(sql, rows) {
  rows.forEach((row) => {
    sql.push(insertStatement('sessions', {
      id: row.id || cryptoLikeId('session'),
      token: row.token || '',
      user_id: row.user_id || '',
      expires_at: row.expires_at || nowIso(),
      created_at: row.created_at || nowIso(),
      updated_at: row.updated_at || nowIso()
    }));
  });
}

function insertItems(sql, rows) {
  rows.forEach((row) => {
    const category = row.category || row.category_name || 'อื่นๆ';
    sql.push(insertStatement('items', {
      id: row.id || cryptoLikeId('item'),
      item_code: row.item_code || '',
      item_name: row.name || row.item_name || '',
      size_label: row.size || row.size_label || '',
      unit: row.unit || '',
      category_name: category,
      item_type: inferItemType(category, row.item_type),
      part_no: row.part_no || '',
      machine_name_legacy: row.machine_name || row.machine_name_legacy || '',
      compatible_machines_text: row.compatible_machines || row.compatible_machines_text || '',
      condition_status: row.condition_status || '',
      serial_tracking: boolInt(row.serial_tracking),
      current_stock: intVal(row.current_stock, 0),
      min_stock: intVal(row.min_stock, 0),
      spare_part_units: row.spare_part_units || '',
      description: row.description || '',
      image_file_id: row.image_file_id || '',
      is_active: boolInt(row.active !== false && row.is_active !== 0),
      created_at: row.created_at || nowIso(),
      updated_at: row.updated_at || nowIso()
    }));
  });
}

function insertReceives(sql, rows) {
  rows.forEach((row) => {
    sql.push(insertStatement('receives', {
      id: row.id || cryptoLikeId('receive'),
      receive_no: row.receive_no || '',
      item_id: row.item_id || '',
      quantity: intVal(row.quantity, 0),
      unit: row.unit || '',
      receive_date: row.date || row.receive_date || '',
      note: row.note || '',
      received_by_user_id: row.received_by || row.received_by_user_id || '',
      received_by_name: row.received_by_name || '',
      created_at: row.created_at || nowIso(),
      updated_at: row.updated_at || nowIso()
    }));
  });
}

function insertWithdrawals(sql, rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const key = row.request_group || row.withdraw_no || row.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  groups.forEach((groupRows, key) => {
    const first = groupRows[0];
    const requestId = key || first.id || cryptoLikeId('wd');
    const status = normalizeWithdrawalStatus(first);
    sql.push(insertStatement('withdrawal_requests', {
      id: requestId,
      withdraw_no: first.withdraw_no || requestId,
      request_group: first.request_group || '',
      purpose: first.purpose || '',
      note: first.note || '',
      status,
      via_qr: boolInt(first.via_qr),
      requested_by_user_id: first.requested_by || first.requested_by_user_id || '',
      requested_by_name: first.requested_by_name || '',
      requested_at: first.requested_at || nowIso(),
      approved_by_user_id: first.approved_by || first.approved_by_user_id || '',
      approved_by_name: first.approved_by_name || '',
      approved_at: first.approved_at || '',
      reject_reason: first.reject_reason || '',
      created_at: first.created_at || nowIso(),
      updated_at: first.updated_at || nowIso()
    }));

    groupRows.forEach((row) => {
      sql.push(insertStatement('withdrawal_request_items', {
        id: row.id || cryptoLikeId('wd-item'),
        withdrawal_request_id: requestId,
        item_id: row.item_id || '',
        unit: row.unit || '',
        item_type: inferItemType('', row.item_type),
        quantity_requested: intVal(row.quantity_requested || row.quantity, 0),
        quantity_approved: intVal(row.quantity_approved, 0),
        created_at: row.created_at || nowIso(),
        updated_at: row.updated_at || nowIso()
      }));
    });
  });
}

function insertTransactions(sql, rows) {
  rows.forEach((row) => {
    sql.push(insertStatement('transactions', {
      id: row.id || cryptoLikeId('tx'),
      tx_type: row.type || row.tx_type || 'adjust',
      item_id: row.item_id || '',
      item_code: row.item_code || '',
      item_name: row.item_name || '',
      item_type: inferItemType('', row.item_type),
      quantity: intVal(row.quantity, 0),
      stock_before: intVal(row.stock_before, 0),
      stock_after: intVal(row.stock_after, 0),
      ref_id: row.ref_id || '',
      actor_user_id: row.actor_id || row.actor_user_id || '',
      actor_name: row.actor_name || '',
      actor_role: row.actor_role || '',
      approved_by_name: row.approved_by_name || '',
      note: row.note || '',
      tx_date: row.date || row.tx_date || '',
      created_at: row.created_at || nowIso(),
      updated_at: row.updated_at || nowIso()
    }));
  });
}

function insertAuditLogs(sql, rows) {
  rows.forEach((row) => {
    sql.push(insertStatement('audit_logs', {
      id: row.id || cryptoLikeId('audit'),
      action: row.action || '',
      module_name: row.module || row.module_name || '',
      detail: row.detail || '',
      actor_user_id: row.actor_id || row.actor_user_id || '',
      actor_name: row.actor_name || '',
      created_at: row.created_at || nowIso()
    }));
  });
}

function insertStatement(table, record) {
  const columns = Object.keys(record);
  const values = columns.map((key) => sqlValue(record[key]));
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
}

function sqlValue(value) {
  if (value === null || typeof value === 'undefined') return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '0';
  const text = String(value).replace(/'/g, "''");
  return `'${text}'`;
}

function boolInt(value) {
  return value ? 1 : 0;
}

function intVal(value, fallback) {
  const num = Number.parseInt(value, 10);
  return Number.isFinite(num) ? num : fallback;
}

function inferItemType(category, explicitType) {
  if (explicitType === 'consumable' || explicitType === 'spare_part') return explicitType;
  return String(category || '').trim().startsWith('หมวด') ? 'consumable' : 'spare_part';
}

function normalizeWithdrawalStatus(row) {
  if (String(row.reject_reason || '') === 'ยกเลิกโดยผู้ขอ') return 'cancelled';
  const status = row.status || 'pending';
  if (status === 'approved' || status === 'rejected' || status === 'cancelled' || status === 'pending') {
    return status;
  }
  return 'pending';
}

function defaultTrue(value) {
  return typeof value === 'undefined' ? true : value;
}

function nowIso() {
  return new Date().toISOString();
}

function cryptoLikeId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 12)}`;
}
