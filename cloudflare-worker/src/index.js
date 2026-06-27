const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

const LOCAL_COMPAT_FUNCTIONS = new Set([
  'getConfig',
  'login',
  'validateSession',
  'logout',
  'getItems',
  'getItemById',
  'addItem',
  'updateItem',
  'deleteItem',
  'getReceives',
  'addReceive',
  'getWithdrawals',
  'addWithdrawal',
  'approveWithdrawal',
  'rejectWithdrawal',
  'cancelWithdrawal',
  'getTransactions',
  'getDashboardStats',
  'getAuditLogs',
  'getMonthlyReport',
  'getUsers',
  'addUser',
  'updateUser',
  'toggleUserActive',
  'deleteUser',
  'changePassword',
  'resetUserPassword',
  'saveConfig'
]);

export default {
  async fetch(request, env, ctx) {
    try {
      return await routeRequest(request, env, ctx);
    } catch (error) {
      ctx.waitUntil(logError(env, 'fetch', error, { url: request.url }));
      return withCors(json({ success: false, message: error.message || 'Internal error' }, 500), request);
    }
  }
};

async function routeRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (path === '/api/health') {
    return withCors(json({ success: true, service: 'cloudflare-worker', version: env.APP_VERSION || 'dev' }), request);
  }

  if (path === '/api/compat') {
    return withCors(await handleCompat(request, env, ctx), request);
  }

  if (path === '/api/config' && method === 'GET') {
    return withCors(json(await getConfigResponse(env)), request);
  }

  if (path === '/api/items' && method === 'GET') {
    return withCors(json(await getItems(env, getToken(request), readFilters(url))), request);
  }

  if (path === '/api/receives' && method === 'GET') {
    return withCors(json(await getReceives(env, getToken(request), readFilters(url))), request);
  }

  if (path === '/api/receives' && method === 'POST') {
    return withCors(json(await addReceive(env, getToken(request), await readBody(request))), request);
  }

  if (path === '/api/withdrawals' && method === 'GET') {
    return withCors(json(await getWithdrawals(env, getToken(request), readFilters(url))), request);
  }

  if (path === '/api/withdrawals' && method === 'POST') {
    return withCors(json(await addWithdrawal(env, getToken(request), await readBody(request))), request);
  }

  if (path.match(/^\/api\/withdrawals\/[^/]+\/approve$/) && method === 'POST') {
    const id = decodeURIComponent(path.split('/')[3] || '');
    return withCors(json(await approveWithdrawal(env, getToken(request), id, await readBody(request))), request);
  }

  if (path.match(/^\/api\/withdrawals\/[^/]+\/reject$/) && method === 'POST') {
    const id = decodeURIComponent(path.split('/')[3] || '');
    return withCors(json(await rejectWithdrawal(env, getToken(request), id, await readBody(request))), request);
  }

  if (path.match(/^\/api\/withdrawals\/[^/]+\/cancel$/) && method === 'POST') {
    const id = decodeURIComponent(path.split('/')[3] || '');
    return withCors(json(await cancelWithdrawal(env, getToken(request), id)), request);
  }

  if (path === '/api/transactions' && method === 'GET') {
    return withCors(json(await getTransactions(env, getToken(request), readFilters(url))), request);
  }

  if (path === '/api/reports/dashboard' && method === 'GET') {
    return withCors(json(await getDashboardStats(env, getToken(request))), request);
  }

  if (path === '/api/reports/monthly' && method === 'GET') {
    const filters = readFilters(url);
    return withCors(json(await getMonthlyReport(env, getToken(request), filters.year, filters.month)), request);
  }

  if (path === '/api/audit-logs' && method === 'GET') {
    return withCors(json(await getAuditLogs(env, getToken(request), readFilters(url))), request);
  }

  if (path === '/api/users' && method === 'GET') {
    return withCors(json(await getUsers(env, getToken(request))), request);
  }

  return withCors(json({ success: false, message: 'Route not found' }, 404), request);
}

async function handleCompat(request, env, ctx) {
  const { fn, args } = await parseCompatRequest(request);
  if (!fn) return json({ success: false, message: 'Missing fn' }, 400);

  if (!LOCAL_COMPAT_FUNCTIONS.has(fn)) {
    if (allowGasFallback(env) && env.GAS_FALLBACK_URL) {
      return proxyCompatToGas(request, env, fn, args);
    }
    return json({ success: false, message: `Compat function not implemented: ${fn}` }, 501);
  }

  const result = await dispatchCompat(fn, args, env, ctx);
  return json(result, result.success === false ? mapBusinessFailureStatus(result) : 200);
}

async function dispatchCompat(fn, args, env) {
  switch (fn) {
    case 'getConfig': return getConfigResponse(env);
    case 'login': return login(env, args[0], args[1], args[2]);
    case 'validateSession': return validateSessionCompat(env, args[0]);
    case 'logout': return logout(env, args[0]);
    case 'getItems': return getItems(env, args[0], args[1] || {});
    case 'getItemById': return getItemById(env, args[0], args[1]);
    case 'addItem': return addItem(env, args[0], args[1]);
    case 'updateItem': return updateItem(env, args[0], args[1], args[2]);
    case 'deleteItem': return deleteItem(env, args[0], args[1]);
    case 'getReceives': return getReceives(env, args[0], args[1] || {});
    case 'addReceive': return addReceive(env, args[0], args[1] || {});
    case 'getWithdrawals': return getWithdrawals(env, args[0], args[1] || {});
    case 'addWithdrawal': return addWithdrawal(env, args[0], args[1] || {});
    case 'approveWithdrawal': return approveWithdrawal(env, args[0], args[1], args[2]);
    case 'rejectWithdrawal': return rejectWithdrawal(env, args[0], args[1], { reason: args[2] });
    case 'cancelWithdrawal': return cancelWithdrawal(env, args[0], args[1]);
    case 'getTransactions': return getTransactions(env, args[0], args[1] || {});
    case 'getDashboardStats': return getDashboardStats(env, args[0]);
    case 'getAuditLogs': return getAuditLogs(env, args[0], args[1] || {});
    case 'getMonthlyReport': return getMonthlyReport(env, args[0], args[1], args[2]);
    case 'getUsers': return getUsers(env, args[0]);
    case 'addUser': return addUser(env, args[0], args[1]);
    case 'updateUser': return updateUser(env, args[0], args[1], args[2]);
    case 'toggleUserActive': return toggleUserActive(env, args[0], args[1]);
    case 'deleteUser': return deleteUser(env, args[0], args[1]);
    case 'changePassword': return changePassword(env, args[0], args[1], args[2]);
    case 'resetUserPassword': return resetUserPassword(env, args[0], args[1]);
    case 'saveConfig': return saveConfig(env, args[0], args[1]);
    default: return { success: false, message: `Compat function not implemented: ${fn}` };
  }
}

async function parseCompatRequest(request) {
  const url = new URL(request.url);
  if (request.method === 'GET') {
    return { fn: url.searchParams.get('fn') || '', args: parseArgsString(url.searchParams.get('args')) };
  }
  const body = await readBody(request);
  return {
    fn: body.fn || url.searchParams.get('fn') || '',
    args: Array.isArray(body.args) ? body.args : parseArgsString(body.args)
  };
}

function parseArgsString(input) {
  if (!input) return [];
  try {
    const parsed = JSON.parse(String(input));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function proxyCompatToGas(request, env, fn, args) {
  const upstream = new URL(env.GAS_FALLBACK_URL);
  upstream.searchParams.set('fn', fn);
  upstream.searchParams.set('args', JSON.stringify(args || []));
  const callback = new URL(request.url).searchParams.get('callback');
  if (callback) upstream.searchParams.set('callback', callback);
  const response = await fetch(upstream.toString(), { method: 'GET', headers: { accept: 'application/json,text/plain,*/*' } });
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store');
  return new Response(response.body, { status: response.status, headers });
}

async function getConfigResponse(env) {
  const row = await env.DB.prepare('SELECT * FROM config ORDER BY updated_at DESC LIMIT 1').first();
  const config = row ? mapConfigRow(row) : defaultConfig(env);
  return {
    success: true,
    data: config,
    app_name: config.app_name,
    app_version: config.app_version,
    app_logo: config.app_logo || '',
    organization_name: config.organization_name || ''
  };
}

async function login(env, username, password, role) {
  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1 LIMIT 1').bind(String(username || '')).first();
  if (!user) return { success: false, message: 'ไม่พบชื่อผู้ใช้งานในระบบ หรือบัญชีถูกระงับ' };
  const valid = await verifyPassword(password || '', user.password_hash, env);
  if (!valid) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };
  if (role && user.role !== role) return { success: false, message: 'บทบาทผู้ใช้งานระบบไม่ถูกต้อง' };

  const token = crypto.randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + sessionTimeoutMs(env)).toISOString();

  await env.DB.prepare('INSERT INTO sessions (id, token, user_id, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), token, user.id, expiresAt, nowIso, nowIso).run();
  await env.DB.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?')
    .bind(nowIso, nowIso, user.id).run();

  return {
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.full_name,
      avatar: user.avatar_file_id || ''
    }
  };
}

async function validateSessionCompat(env, token) {
  return (await validateSession(env, token)) || null;
}

async function logout(env, token) {
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(String(token)).run();
  }
  return { success: true };
}

async function validateSession(env, token) {
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT s.id, s.token, s.user_id, s.expires_at, u.username, u.role, u.full_name AS name, u.is_active
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ?
     LIMIT 1`
  ).bind(String(token)).first();
  if (!row) return null;
  if (!row.is_active || new Date(row.expires_at).getTime() < Date.now()) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(String(token)).run();
    return null;
  }
  return {
    id: row.id,
    token: row.token,
    user_id: row.user_id,
    username: row.username,
    role: row.role,
    name: row.name,
    expires_at: row.expires_at
  };
}

async function getItems(env, token, filters = {}) {
  const session = await validateSession(env, token);
  if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
  let sql = 'SELECT * FROM items WHERE is_active = 1';
  const binds = [];
  if (filters.item_type && filters.item_type !== 'all') {
    sql += ' AND item_type = ?';
    binds.push(String(filters.item_type));
  }
  if (filters.category && filters.category !== 'all') {
    sql += ' AND category_name = ?';
    binds.push(String(filters.category));
  }
  if (filters.q) {
    sql += ' AND (item_code LIKE ? OR item_name LIKE ? OR machine_name_legacy LIKE ? OR compatible_machines_text LIKE ?)';
    const q = `%${filters.q}%`;
    binds.push(q, q, q, q);
  }
  sql += ' ORDER BY item_code ASC';
  const rows = await env.DB.prepare(sql).bind(...binds).all();
  let data = (rows.results || []).map(mapItemRow);
  if (filters.stock_status === 'low') {
    data = data.filter((item) => isLowStock(item, defaultThreshold(env)));
  }
  return { success: true, data };
}

async function getItemById(env, token, itemId) {
  const session = await validateSession(env, token);
  if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
  const row = await env.DB.prepare('SELECT * FROM items WHERE id = ? LIMIT 1').bind(String(itemId || '')).first();
  if (!row) return { success: false, message: 'ไม่พบรายการวัสดุ' };
  return { success: true, data: mapItemRow(row) };
}

async function addItem(env, token, itemData) {
  const session = await requireAdmin(env, token);
  if (!session) return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
  const now = new Date().toISOString();
  const category = String(itemData?.category || 'อื่นๆ');
  const itemId = crypto.randomUUID();
  const itemCode = String(itemData?.item_code || '').trim() || `ITM-${Date.now()}`;
  await env.DB.prepare(
    `INSERT INTO items (
      id, item_code, item_name, size_label, unit, category_name, item_type, part_no,
      machine_name_legacy, compatible_machines_text, condition_status, serial_tracking,
      current_stock, min_stock, spare_part_units, description, image_file_id, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).bind(
    itemId,
    itemCode,
    String(itemData?.name || ''),
    String(itemData?.size || ''),
    String(itemData?.unit || ''),
    category,
    inferItemTypeFromCategory(category, itemData?.item_type),
    String(itemData?.part_no || ''),
    String(itemData?.machine_name || ''),
    String(itemData?.compatible_machines || ''),
    String(itemData?.condition_status || ''),
    boolInt(itemData?.serial_tracking),
    intVal(itemData?.current_stock, 0),
    intVal(itemData?.min_stock, 5),
    String(itemData?.spare_part_units || ''),
    String(itemData?.description || ''),
    nullableText(itemData?.image_file_id),
    now,
    now
  ).run();
  await logAudit(env, session, 'add_item', 'items', `เพิ่มรายการ ${itemData?.name || itemCode}`);
  const row = await env.DB.prepare('SELECT * FROM items WHERE id = ? LIMIT 1').bind(itemId).first();
  return { success: true, data: mapItemRow(row), message: 'เพิ่มรายการวัสดุเรียบร้อย' };
}

async function updateItem(env, token, itemId, itemData) {
  const session = await requireAdmin(env, token);
  if (!session) return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
  const existing = await env.DB.prepare('SELECT * FROM items WHERE id = ? LIMIT 1').bind(String(itemId || '')).first();
  if (!existing) return { success: false, message: 'ไม่พบรายการที่ต้องการแก้ไขในฐานข้อมูล' };
  const category = String(itemData?.category || existing.category_name || '');
  await env.DB.prepare(
    `UPDATE items SET
      item_code = ?, item_name = ?, size_label = ?, unit = ?, category_name = ?, item_type = ?, part_no = ?,
      machine_name_legacy = ?, compatible_machines_text = ?, condition_status = ?, serial_tracking = ?,
      current_stock = ?, min_stock = ?, spare_part_units = ?, description = ?, image_file_id = ?, is_active = ?, updated_at = ?
     WHERE id = ?`
  ).bind(
    String(itemData?.item_code || existing.item_code || ''),
    String(itemData?.name || existing.item_name || ''),
    String(itemData?.size ?? existing.size_label ?? ''),
    String(itemData?.unit || existing.unit || ''),
    category,
    inferItemTypeFromCategory(category, itemData?.item_type),
    String(itemData?.part_no ?? existing.part_no ?? ''),
    String(itemData?.machine_name ?? existing.machine_name_legacy ?? ''),
    String(itemData?.compatible_machines ?? existing.compatible_machines_text ?? ''),
    String(itemData?.condition_status ?? existing.condition_status ?? ''),
    boolInt(typeof itemData?.serial_tracking === 'undefined' ? existing.serial_tracking : itemData.serial_tracking),
    intVal(typeof itemData?.current_stock === 'undefined' ? existing.current_stock : itemData.current_stock, 0),
    intVal(typeof itemData?.min_stock === 'undefined' ? existing.min_stock : itemData.min_stock, 0),
    String(itemData?.spare_part_units ?? existing.spare_part_units ?? ''),
    String(itemData?.description ?? existing.description ?? ''),
    hasOwn(itemData, 'image_file_id') ? nullableText(itemData?.image_file_id) : nullableText(existing.image_file_id),
    boolInt(typeof itemData?.active === 'undefined' ? existing.is_active : itemData.active),
    new Date().toISOString(),
    existing.id
  ).run();
  await logAudit(env, session, 'update_item', 'items', `แก้ไขรายการ ${itemData?.name || existing.item_name}`);
  return { success: true, message: 'แก้ไขข้อมูลวัสดุเรียบร้อยแล้ว' };
}

async function deleteItem(env, token, itemId) {
  const session = await requireAdmin(env, token);
  if (!session) return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
  await env.DB.prepare('UPDATE items SET is_active = 0, updated_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), String(itemId || '')).run();
  await logAudit(env, session, 'delete_item', 'items', `ลบ/ปิดใช้งานรายการ ${itemId}`);
  return { success: true, message: 'ลบรายการเรียบร้อย' };
}

async function getReceives(env, token, filters = {}) {
  const session = await validateSession(env, token);
  if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
  let sql = `SELECT r.*, i.item_code, i.item_name, i.item_type
             FROM receives r
             JOIN items i ON i.id = r.item_id
             WHERE 1 = 1`;
  const binds = [];
  if (filters.item_id) {
    sql += ' AND r.item_id = ?';
    binds.push(String(filters.item_id));
  }
  if (filters.date_from) {
    sql += ' AND r.receive_date >= ?';
    binds.push(String(filters.date_from));
  }
  if (filters.date_to) {
    sql += ' AND r.receive_date <= ?';
    binds.push(String(filters.date_to));
  }
  if (filters.item_type && filters.item_type !== 'all') {
    sql += ' AND i.item_type = ?';
    binds.push(String(filters.item_type));
  }
  sql += ' ORDER BY r.receive_date DESC, r.created_at DESC';
  const rows = await env.DB.prepare(sql).bind(...binds).all();
  return {
    success: true,
    data: (rows.results || []).map((row) => ({
      id: row.id,
      receive_no: row.receive_no,
      item_id: row.item_id,
      item_code: row.item_code,
      item_name: row.item_name,
      item_type: row.item_type,
      quantity: toNumber(row.quantity),
      unit: row.unit,
      date: row.receive_date,
      note: row.note || '',
      received_by: row.received_by_user_id || '',
      received_by_name: row.received_by_name || ''
    }))
  };
}

async function addReceive(env, token, data) {
  const session = await requireAdminOrStaff(env, token);
  if (!session) return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
  const item = await env.DB.prepare('SELECT * FROM items WHERE id = ? AND is_active = 1 LIMIT 1').bind(String(data?.item_id || '')).first();
  if (!item) return { success: false, message: 'ไม่พบรายการวัสดุ' };
  const qty = intVal(data?.quantity, 0);
  if (qty <= 0) return { success: false, message: 'กรุณาระบุจำนวนให้ถูกต้อง' };

  const now = new Date().toISOString();
  const receiveNo = await generateRunningNumber(env, 'RCV', 'receives', 'receive_no');
  const stockBefore = toNumber(item.current_stock);
  const stockAfter = stockBefore + qty;

  await env.DB.batch([
    env.DB.prepare('UPDATE items SET current_stock = ?, updated_at = ? WHERE id = ?').bind(stockAfter, now, item.id),
    env.DB.prepare(
      `INSERT INTO receives (
        id, receive_no, item_id, quantity, unit, receive_date, note, received_by_user_id, received_by_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      receiveNo,
      item.id,
      qty,
      item.unit,
      String(data?.date || now.slice(0, 10)),
      String(data?.note || ''),
      session.user_id,
      session.name,
      now,
      now
    ),
    env.DB.prepare(
      `INSERT INTO transactions (
        id, tx_type, item_id, item_code, item_name, item_type, quantity, stock_before, stock_after,
        ref_id, actor_user_id, actor_name, actor_role, approved_by_name, note, tx_date, created_at, updated_at
      ) VALUES (?, 'receive', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      item.id,
      item.item_code,
      item.item_name,
      item.item_type,
      qty,
      stockBefore,
      stockAfter,
      receiveNo,
      session.user_id,
      session.name,
      session.role,
      String(data?.note || ''),
      String(data?.date || now.slice(0, 10)),
      now,
      now
    )
  ]);

  await logAudit(env, session, 'add_receive', 'receives', `รับเข้า ${item.item_name} ${qty} ${item.unit}`);
  return { success: true, message: 'บันทึกรับเข้าเรียบร้อย', receive_no: receiveNo };
}

async function getWithdrawals(env, token, filters = {}) {
  const session = await validateSession(env, token);
  if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
  let sql = `SELECT wr.*, wri.id AS line_id, wri.item_id, wri.unit, wri.item_type, wri.quantity_requested, wri.quantity_approved,
                    i.item_code, i.item_name
             FROM withdrawal_requests wr
             JOIN withdrawal_request_items wri ON wri.withdrawal_request_id = wr.id
             JOIN items i ON i.id = wri.item_id
             WHERE 1 = 1`;
  const binds = [];
  if (session.role === 'employee') {
    sql += ' AND wr.requested_by_user_id = ?';
    binds.push(session.user_id);
  }
  if (filters.status && filters.status !== 'all') {
    sql += ' AND wr.status = ?';
    binds.push(String(filters.status));
  }
  sql += ' ORDER BY wr.requested_at DESC, wr.withdraw_no DESC';
  const rows = await env.DB.prepare(sql).bind(...binds).all();
  const data = (rows.results || []).map((row) => ({
    id: row.line_id,
    request_id: row.id,
    request_group: row.request_group || '',
    withdraw_no: row.withdraw_no,
    item_id: row.item_id,
    item_name: row.item_name,
    item_code: row.item_code,
    item_type: row.item_type,
    quantity: toNumber(row.quantity_requested),
    quantity_requested: toNumber(row.quantity_requested),
    quantity_approved: toNumber(row.quantity_approved),
    unit: row.unit,
    purpose: row.purpose || '',
    note: row.note || '',
    status: row.status,
    requested_by: row.requested_by_user_id,
    requested_by_name: row.requested_by_name || '',
    requested_at: row.requested_at,
    approved_by: row.approved_by_user_id || '',
    approved_by_name: row.approved_by_name || '',
    approved_at: row.approved_at || '',
    reject_reason: row.reject_reason || '',
    via_qr: !!row.via_qr
  }));
  return { success: true, data };
}

async function addWithdrawal(env, token, wdData) {
  const session = await validateSession(env, token);
  if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };

  const normalized = normalizeRequestedItems(wdData);
  if (!normalized.length) return { success: false, message: 'กรุณาเลือกรายการวัสดุอย่างน้อย 1 รายการ' };

  const selected = [];
  for (const req of normalized) {
    const item = await env.DB.prepare('SELECT * FROM items WHERE id = ? AND is_active = 1 LIMIT 1').bind(req.item_id).first();
    if (!item) return { success: false, message: 'ไม่พบรายการวัสดุบางรายการ' };
    if (req.quantity > toNumber(item.current_stock)) {
      return { success: false, message: `จำนวนที่ขอเกินสต็อกคงเหลือสำหรับ "${item.item_name}"` };
    }
    selected.push({ item, quantity: req.quantity });
  }

  const now = new Date().toISOString();
  const requestId = crypto.randomUUID();
  const requestGroup = crypto.randomUUID();
  const withdrawNo = await generateRunningNumber(env, 'WD', 'withdrawal_requests', 'withdraw_no');

  const statements = [
    env.DB.prepare(
      `INSERT INTO withdrawal_requests (
        id, withdraw_no, request_group, purpose, note, status, via_qr, requested_by_user_id, requested_by_name,
        requested_at, approved_by_user_id, approved_by_name, approved_at, reject_reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)`
    ).bind(
      requestId,
      withdrawNo,
      requestGroup,
      String(wdData?.purpose || ''),
      String(wdData?.note || ''),
      boolInt(wdData?.via_qr),
      session.user_id,
      session.name,
      now,
      now,
      now
    )
  ];

  for (const entry of selected) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO withdrawal_request_items (
          id, withdrawal_request_id, item_id, unit, item_type, quantity_requested, quantity_approved, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
      ).bind(
        crypto.randomUUID(),
        requestId,
        entry.item.id,
        entry.item.unit,
        entry.item.item_type,
        entry.quantity,
        now,
        now
      )
    );
  }

  await env.DB.batch(statements);
  await logAudit(env, session, 'add_withdrawal', 'withdrawals', `ยื่นคำขอเบิก ${withdrawNo} (${selected.length} รายการ)`);
  return { success: true, message: 'ยื่นคำขอเบิกเรียบร้อย รอการอนุมัติ', withdraw_no: withdrawNo, items_count: selected.length };
}

async function approveWithdrawal(env, token, requestId, payload) {
  const session = await requireAdmin(env, token);
  if (!session) return { success: false, message: 'ไม่มีสิทธิ์อนุมัติ' };
  const resolved = await resolveWithdrawalRequest(env, String(requestId || ''));
  const requestRow = resolved.request;
  if (!requestRow) return { success: false, message: 'ไม่พบคำขอเบิก' };
  if (requestRow.status !== 'pending') return { success: false, message: 'คำขอนี้ดำเนินการแล้ว' };

  const lineRowsResult = await env.DB.prepare(
    `SELECT wri.*, i.item_code, i.item_name, i.current_stock
     FROM withdrawal_request_items wri
     JOIN items i ON i.id = wri.item_id
     WHERE wri.withdrawal_request_id = ?`
  ).bind(requestRow.id).all();
  const lineRows = lineRowsResult.results || [];
  if (!lineRows.length) return { success: false, message: 'ไม่พบรายการเบิก' };

  const approvals = new Map();
  if (Array.isArray(payload?.items) && payload.items.length) {
    payload.items.forEach((item) => approvals.set(String(item.withdrawal_item_id || ''), intVal(item.quantity_approved, 0)));
  }

  const now = new Date().toISOString();
  const txDate = now.slice(0, 10);
  const statements = [];
  for (const line of lineRows) {
    const approvedQty = approvals.has(line.id) ? approvals.get(line.id) : intVal(payload?.quantity_approved, intVal(line.quantity_requested, 0)) || intVal(line.quantity_requested, 0);
    const currentStock = toNumber(line.current_stock);
    if (approvedQty > currentStock) {
      return { success: false, message: `สต็อกไม่พอ (${currentStock} ${line.unit})` };
    }
    const nextStock = currentStock - approvedQty;
    statements.push(env.DB.prepare('UPDATE items SET current_stock = ?, updated_at = ? WHERE id = ?').bind(nextStock, now, line.item_id));
    statements.push(env.DB.prepare('UPDATE withdrawal_request_items SET quantity_approved = ?, updated_at = ? WHERE id = ?').bind(approvedQty, now, line.id));
    statements.push(
      env.DB.prepare(
        `INSERT INTO transactions (
          id, tx_type, item_id, item_code, item_name, item_type, quantity, stock_before, stock_after,
          ref_id, actor_user_id, actor_name, actor_role, approved_by_name, note, tx_date, created_at, updated_at
        ) VALUES (?, 'withdraw', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        crypto.randomUUID(),
        line.item_id,
        line.item_code,
        line.item_name,
        line.item_type,
        approvedQty,
        currentStock,
        nextStock,
        requestRow.withdraw_no,
        requestRow.requested_by_user_id,
        requestRow.requested_by_name,
        session.role,
        session.name,
        requestRow.note || '',
        txDate,
        now,
        now
      )
    );
  }

  statements.unshift(
    env.DB.prepare(
      'UPDATE withdrawal_requests SET status = ?, approved_by_user_id = ?, approved_by_name = ?, approved_at = ?, updated_at = ? WHERE id = ?'
    ).bind('approved', session.user_id, session.name, now, now, requestRow.id)
  );

  await env.DB.batch(statements);
  await logAudit(env, session, 'approve_withdrawal', 'withdrawals', `อนุมัติ ${requestRow.withdraw_no}`);
  return { success: true, message: 'อนุมัติการเบิกเรียบร้อย' };
}

async function rejectWithdrawal(env, token, requestId, payload) {
  const session = await requireAdmin(env, token);
  if (!session) return { success: false, message: 'ไม่มีสิทธิ์' };
  const resolved = await resolveWithdrawalRequest(env, String(requestId || ''));
  const requestRow = resolved.request;
  if (!requestRow || requestRow.status !== 'pending') return { success: false, message: 'ไม่พบคำขอหรือดำเนินการแล้ว' };
  await env.DB.prepare(
    'UPDATE withdrawal_requests SET status = ?, approved_by_user_id = ?, approved_by_name = ?, approved_at = ?, reject_reason = ?, updated_at = ? WHERE id = ?'
  ).bind('rejected', session.user_id, session.name, new Date().toISOString(), String(payload?.reason || ''), new Date().toISOString(), requestRow.id).run();
  await logAudit(env, session, 'reject_withdrawal', 'withdrawals', `ปฏิเสธ ${requestRow.withdraw_no}`);
  return { success: true, message: 'ปฏิเสธคำขอเรียบร้อย' };
}

async function cancelWithdrawal(env, token, requestId) {
  const session = await validateSession(env, token);
  if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
  const resolved = await resolveWithdrawalRequest(env, String(requestId || ''));
  const requestRow = resolved.request;
  if (!requestRow) return { success: false, message: 'ไม่พบคำขอ' };
  if (requestRow.requested_by_user_id !== session.user_id) return { success: false, message: 'ไม่มีสิทธิ์ยกเลิก' };
  if (requestRow.status !== 'pending') return { success: false, message: 'คำขอนี้ดำเนินการแล้ว' };
  await env.DB.prepare(
    'UPDATE withdrawal_requests SET status = ?, reject_reason = ?, approved_by_user_id = ?, approved_by_name = ?, approved_at = ?, updated_at = ? WHERE id = ?'
  ).bind('cancelled', 'ยกเลิกโดยผู้ขอ', session.user_id, session.name, new Date().toISOString(), new Date().toISOString(), requestRow.id).run();
  await logAudit(env, session, 'cancel_withdrawal', 'withdrawals', `ยกเลิก ${requestRow.withdraw_no}`);
  return { success: true, message: 'ยกเลิกคำขอเรียบร้อย' };
}

async function getTransactions(env, token, filters = {}) {
  const session = await validateSession(env, token);
  if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
  let sql = 'SELECT * FROM transactions WHERE 1 = 1';
  const binds = [];
  if (session.role === 'employee') {
    sql += ' AND actor_user_id = ?';
    binds.push(session.user_id);
  }
  if (filters.type && filters.type !== 'all') {
    sql += ' AND tx_type = ?';
    binds.push(String(filters.type));
  }
  if (filters.item_type && filters.item_type !== 'all') {
    sql += ' AND item_type = ?';
    binds.push(String(filters.item_type));
  }
  if (filters.date_from) {
    sql += ' AND tx_date >= ?';
    binds.push(String(filters.date_from));
  }
  if (filters.date_to) {
    sql += ' AND tx_date <= ?';
    binds.push(String(filters.date_to));
  }
  sql += ' ORDER BY tx_date DESC, created_at DESC';
  const rows = await env.DB.prepare(sql).bind(...binds).all();
  return {
    success: true,
    data: (rows.results || []).map((row) => ({
      id: row.id,
      type: row.tx_type,
      item_id: row.item_id,
      item_code: row.item_code || '',
      item_name: row.item_name || '',
      item_type: row.item_type,
      quantity: toNumber(row.quantity),
      stock_before: toNumber(row.stock_before),
      stock_after: toNumber(row.stock_after),
      ref_id: row.ref_id || '',
      actor_id: row.actor_user_id || '',
      actor_name: row.actor_name || '',
      actor_role: row.actor_role || '',
      approved_by_name: row.approved_by_name || '',
      note: row.note || '',
      date: row.tx_date
    }))
  };
}

async function getDashboardStats(env, token) {
  const session = await validateSession(env, token);
  if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
  const itemsResult = await env.DB.prepare('SELECT * FROM items WHERE is_active = 1').all();
  const withdrawalResult = await env.DB.prepare('SELECT * FROM withdrawal_requests').all();
  const withdrawalLineResult = await env.DB.prepare(
    `SELECT wr.id AS request_id, wr.withdraw_no, wr.request_group, wr.purpose, wr.note, wr.status,
            wr.requested_by_user_id, wr.requested_by_name, wr.requested_at, wr.approved_by_user_id,
            wr.approved_by_name, wr.approved_at, wr.reject_reason, wr.via_qr,
            wri.id AS line_id, wri.item_id, wri.unit, wri.item_type, wri.quantity_requested, wri.quantity_approved,
            i.item_code, i.item_name
     FROM withdrawal_requests wr
     JOIN withdrawal_request_items wri ON wri.withdrawal_request_id = wr.id
     JOIN items i ON i.id = wri.item_id`
  ).all();
  const transactionResult = await env.DB.prepare('SELECT * FROM transactions').all();
  const items = (itemsResult.results || []).map(mapItemRow);
  const withdrawals = withdrawalResult.results || [];
  const withdrawalLines = withdrawalLineResult.results || [];
  const transactions = transactionResult.results || [];
  const today = new Date().toISOString().slice(0, 10);
  const threshold = await resolveThreshold(env);

  const lowStockItems = items.filter((item) => isLowStock(item, threshold));
  const pending = withdrawals.filter((row) => row.status === 'pending');
  const todayTransactions = transactions.filter((row) => row.tx_date === today);

  const topMap = new Map();
  transactions.filter((row) => row.tx_type === 'withdraw').forEach((row) => {
    const key = row.item_id;
    const prev = topMap.get(key) || { item_id: key, item_name: row.item_name, item_code: row.item_code, qty: 0, name: row.item_name };
    prev.qty += toNumber(row.quantity);
    topMap.set(key, prev);
  });
  const topItems = [...topMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  const typeStats = {
    consumable: { monthly: [], category_stock: {} },
    spare_part: { monthly: [], category_stock: {} }
  };
  const monthMapByType = {
    consumable: new Map(),
    spare_part: new Map()
  };
  transactions.forEach((row) => {
    const itemType = row.item_type === 'spare_part' ? 'spare_part' : 'consumable';
    const monthKey = String(row.tx_date || '').slice(0, 7);
    if (!monthKey) return;
    const current = monthMapByType[itemType].get(monthKey) || { month: monthKey, label: monthKey, receive: 0, withdraw: 0 };
    if (row.tx_type === 'receive') current.receive += toNumber(row.quantity);
    if (row.tx_type === 'withdraw') current.withdraw += toNumber(row.quantity);
    monthMapByType[itemType].set(monthKey, current);
  });
  Object.keys(typeStats).forEach((typeKey) => {
    typeStats[typeKey].monthly = [...monthMapByType[typeKey].values()]
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
      .map((entry) => ({
        label: formatMonthLabel(entry.month),
        receive: entry.receive,
        withdraw: entry.withdraw
      }));
  });
  items.forEach((item) => {
    var typeKey = item.item_type === 'spare_part' ? 'spare_part' : 'consumable';
    var categoryKey = item.category || '-';
    typeStats[typeKey].category_stock[categoryKey] = (typeStats[typeKey].category_stock[categoryKey] || 0) + toNumber(item.current_stock);
  });

  const recentTransactions = transactions
    .slice()
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
    .slice(0, 6)
    .map((row) => ({
      id: row.id,
      type: row.tx_type,
      item_name: row.item_name || '',
      quantity: toNumber(row.quantity),
      unit: findUnitForItem(items, row.item_id),
      actor_name: row.actor_name || '',
      date: row.tx_date
    }));

  const recentPending = withdrawalLines
    .filter((row) => row.status === 'pending')
    .sort((a, b) => String(b.requested_at || '').localeCompare(String(a.requested_at || '')))
    .slice(0, 6)
    .map((row) => ({
      id: row.line_id,
      request_id: row.request_id,
      withdraw_no: row.withdraw_no,
      item_name: row.item_name || '',
      item_code: row.item_code || '',
      quantity_requested: toNumber(row.quantity_requested),
      unit: row.unit || '',
      requested_by_name: row.requested_by_name || '',
      requested_at: row.requested_at
    }));

  return {
    success: true,
    kpi: {
      total_items: items.length,
      low_stock: lowStockItems.length,
      pending: pending.length,
      today_tx: todayTransactions.length
    },
    total_items: items.length,
    low_stock: lowStockItems.length,
    pending_wds: pending.length,
    today_txs: todayTransactions.length,
    low_stock_items: lowStockItems.slice(0, 10),
    top_items: topItems,
    recent_transactions: recentTransactions,
    recent_pending: recentPending,
    type_stats: typeStats
  };
}

async function getAuditLogs(env, token, filters = {}) {
  const session = await requireAdmin(env, token);
  if (!session) return { success: false, message: 'ไม่มีสิทธิ์' };
  let sql = 'SELECT * FROM audit_logs WHERE 1 = 1';
  const binds = [];
  if (filters.module) {
    sql += ' AND module_name = ?';
    binds.push(String(filters.module));
  }
  sql += ' ORDER BY created_at DESC';
  const rows = await env.DB.prepare(sql).bind(...binds).all();
  return {
    success: true,
    data: (rows.results || []).map((row) => ({
      id: row.id,
      action: row.action,
      module: row.module_name,
      detail: row.detail || '',
      actor_id: row.actor_user_id || '',
      actor_name: row.actor_name || '',
      created_at: row.created_at
    }))
  };
}

async function getMonthlyReport(env, token, year, month) {
  const session = await validateSession(env, token);
  if (!session || session.role === 'employee') return { success: false, message: 'ไม่มีสิทธิ์' };
  const dateStr = `${year}-${String(month).padStart(2, '0')}`;
  const itemsResult = await env.DB.prepare('SELECT * FROM items WHERE is_active = 1 ORDER BY item_code ASC').all();
  const txResult = await env.DB.prepare('SELECT * FROM transactions WHERE tx_date LIKE ?').bind(`${dateStr}%`).all();
  const items = itemsResult.results || [];
  const txs = txResult.results || [];
  const rows = items.map((item) => {
    const daily = {};
    for (let day = 1; day <= 31; day += 1) daily[day] = 0;
    let received = 0;
    let totalWithdraw = 0;
    txs.forEach((tx) => {
      if (tx.item_id !== item.id) return;
      const day = Number.parseInt(String(tx.tx_date || '').split('-')[2], 10);
      if (tx.tx_type === 'withdraw') {
        daily[day] = (daily[day] || 0) + toNumber(tx.quantity);
        totalWithdraw += toNumber(tx.quantity);
      } else if (tx.tx_type === 'receive') {
        received += toNumber(tx.quantity);
      }
    });
    return {
      item_code: item.item_code,
      name: item.item_name,
      size: item.size_label || '',
      unit: item.unit,
      current_stock: toNumber(item.current_stock),
      received,
      daily,
      total_withdraw: totalWithdraw
    };
  });
  return { success: true, data: rows, month: dateStr };
}

async function getUsers(env, token) {
  const session = await requireAdmin(env, token);
  if (!session) return { success: false, message: 'ไม่มีสิทธิ์' };
  const rows = await env.DB.prepare(
    'SELECT id, username, role, full_name, email, phone, avatar_file_id, telegram_chat_id, is_active, last_login_at, created_at, updated_at FROM users ORDER BY created_at ASC'
  ).all();
  return {
    success: true,
    data: (rows.results || []).map((row) => ({
      id: row.id,
      username: row.username,
      role: row.role,
      name: row.full_name,
      email: row.email || '',
      phone: row.phone || '',
      avatar: row.avatar_file_id || '',
      telegram_chat_id: row.telegram_chat_id || '',
      active: !!row.is_active,
      last_login: row.last_login_at || ''
    }))
  };
}

async function addUser(env, token, userData) {
  const session = await requireAdmin(env, token);
  if (!session) return { success: false, message: 'ไม่มีสิทธิ์' };
  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ? LIMIT 1').bind(String(userData?.username || '')).first();
  if (existing) return { success: false, message: 'ชื่อผู้ใช้งานนี้มีอยู่แล้ว' };
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO users (
      id, username, password_hash, role, full_name, email, phone, avatar_file_id, telegram_chat_id,
      is_active, last_login_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, '', ?, ?)`
  ).bind(
    crypto.randomUUID(),
    String(userData?.username || ''),
    await hashPassword(String(userData?.password || '123456'), env),
    String(userData?.role || 'employee'),
    String(userData?.name || ''),
    String(userData?.email || ''),
    String(userData?.phone || ''),
    String(userData?.avatar || ''),
    String(userData?.telegram_chat_id || ''),
    now,
    now
  ).run();
  await logAudit(env, session, 'add_user', 'users', `เพิ่มผู้ใช้ ${userData?.username || ''}`);
  return { success: true, message: 'เพิ่มผู้ใช้งานเรียบร้อย' };
}

async function updateUser(env, token, userId, data) {
  const session = await validateSession(env, token);
  if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
  const isSelf = session.user_id === userId;
  if (session.role !== 'admin' && !isSelf) return { success: false, message: 'ไม่มีสิทธิ์' };
  const existing = await env.DB.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(String(userId || '')).first();
  if (!existing) return { success: false, message: 'ไม่พบผู้ใช้' };
  const nextRole = session.role === 'admin' ? String(data?.role || existing.role) : existing.role;
  const nextUsername = session.role === 'admin' ? String(data?.username || existing.username) : existing.username;
  const nextPasswordHash = data?.password ? await hashPassword(String(data.password), env) : existing.password_hash;
  await env.DB.prepare(
    `UPDATE users SET
      username = ?, password_hash = ?, role = ?, full_name = ?, email = ?, phone = ?, avatar_file_id = ?, telegram_chat_id = ?, is_active = ?, updated_at = ?
     WHERE id = ?`
  ).bind(
    nextUsername,
    nextPasswordHash,
    nextRole,
    String(data?.name ?? existing.full_name ?? ''),
    String(data?.email ?? existing.email ?? ''),
    String(data?.phone ?? existing.phone ?? ''),
    String(data?.avatar ?? existing.avatar_file_id ?? ''),
    String(data?.telegram_chat_id ?? existing.telegram_chat_id ?? ''),
    boolInt(session.role === 'admin' ? (typeof data?.active === 'undefined' ? existing.is_active : data.active) : existing.is_active),
    new Date().toISOString(),
    existing.id
  ).run();
  await logAudit(env, session, 'update_user', 'users', `แก้ไขผู้ใช้ ${existing.username}`);
  return { success: true, message: 'บันทึกข้อมูลผู้ใช้เรียบร้อย' };
}

async function toggleUserActive(env, token, userId) {
  const session = await requireAdmin(env, token);
  if (!session) return { success: false, message: 'ไม่มีสิทธิ์' };
  const existing = await env.DB.prepare('SELECT id, username, is_active FROM users WHERE id = ? LIMIT 1').bind(String(userId || '')).first();
  if (!existing) return { success: false, message: 'ไม่พบผู้ใช้' };
  const next = existing.is_active ? 0 : 1;
  await env.DB.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?')
    .bind(next, new Date().toISOString(), existing.id).run();
  await logAudit(env, session, 'toggle_user_active', 'users', `สลับสถานะผู้ใช้ ${existing.username}`);
  return { success: true, message: 'อัปเดตสถานะผู้ใช้เรียบร้อย' };
}

async function deleteUser(env, token, userId) {
  const session = await requireAdmin(env, token);
  if (!session) return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
  const existing = await env.DB.prepare('SELECT id, username, role FROM users WHERE id = ? LIMIT 1').bind(String(userId || '')).first();
  if (!existing) return { success: false, message: 'ไม่พบผู้ใช้งาน' };
  if (existing.id === session.user_id) return { success: false, message: 'ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้' };

  if (existing.role === 'admin') {
    const adminCountRow = await env.DB.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'").first();
    if (toNumber(adminCountRow?.total) <= 1) {
      return { success: false, message: 'ต้องมีผู้ดูแลระบบอย่างน้อย 1 บัญชี' };
    }
  }

  const linkedWithdrawalRow = await env.DB.prepare(
    'SELECT withdraw_no FROM withdrawal_requests WHERE requested_by_user_id = ? LIMIT 1'
  ).bind(existing.id).first();
  if (linkedWithdrawalRow) {
    return { success: false, message: 'ไม่สามารถลบผู้ใช้นี้ได้ เนื่องจากมีประวัติคำขอเบิกที่ผูกอยู่ในระบบ' };
  }

  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(existing.id).run();
  await logAudit(env, session, 'delete_user', 'users', `ลบผู้ใช้ ${existing.username}`);
  return { success: true, message: 'ลบผู้ใช้งานเรียบร้อย' };
}

async function changePassword(env, token, oldPass, newPass) {
  const session = await validateSession(env, token);
  if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
  const user = await env.DB.prepare('SELECT id, password_hash FROM users WHERE id = ? LIMIT 1').bind(session.user_id).first();
  if (!user) return { success: false, message: 'ไม่พบผู้ใช้' };
  const valid = await verifyPassword(String(oldPass || ''), user.password_hash, env);
  if (!valid) return { success: false, message: 'รหัสผ่านเดิมไม่ถูกต้อง' };
  await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(await hashPassword(String(newPass || ''), env), new Date().toISOString(), user.id).run();
  await logAudit(env, session, 'change_password', 'users', 'เปลี่ยนรหัสผ่าน');
  return { success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อย' };
}

async function resetUserPassword(env, token, userId) {
  const session = await requireAdmin(env, token);
  if (!session) return { success: false, message: 'ไม่มีสิทธิ์' };
  const existing = await env.DB.prepare('SELECT id, username FROM users WHERE id = ? LIMIT 1').bind(String(userId || '')).first();
  if (!existing) return { success: false, message: 'ไม่พบผู้ใช้' };
  const tempPass = randomPassword();
  await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(await hashPassword(tempPass, env), new Date().toISOString(), existing.id).run();
  await logAudit(env, session, 'reset_password', 'users', `รีเซ็ตรหัสผ่าน ${existing.username}`);
  return { success: true, message: 'รีเซ็ตรหัสผ่านเรียบร้อย', temp_password: tempPass };
}

async function saveConfig(env, token, configData) {
  const session = await requireAdmin(env, token);
  if (!session) return { success: false, message: 'ไม่มีสิทธิ์' };
  const existing = await env.DB.prepare('SELECT * FROM config ORDER BY updated_at DESC LIMIT 1').first();
  const merged = { ...(existing ? mapConfigRow(existing) : defaultConfig(env)), ...(configData || {}) };
  const rowId = existing?.id || 'system-config';
  const now = new Date().toISOString();

  if (existing) {
    await env.DB.prepare(
      `UPDATE config SET
        app_name = ?, app_logo_file_id = ?, organization_name = ?, organization_address = ?, organization_phone = ?,
        organization_email = ?, telegram_bot_token = ?, telegram_chat_id = ?, telegram_enabled = ?, line_enabled = ?,
        line_token = ?, notification_recipients = ?, notify_low_stock = ?, notify_pending_approval = ?, bridge_url = ?,
        gas_endpoint = ?, low_stock_threshold = ?, app_version = ?, updated_at = ?
       WHERE id = ?`
    ).bind(
      merged.app_name || env.APP_NAME || '',
      merged.app_logo || merged.app_logo_file_id || '',
      merged.organization_name || '',
      merged.organization_address || '',
      merged.organization_phone || '',
      merged.organization_email || '',
      merged.telegram_bot_token || '',
      merged.telegram_chat_id || '',
      boolInt(merged.telegram_enabled),
      boolInt(merged.line_enabled),
      merged.line_token || '',
      merged.notification_recipients || '',
      boolInt(defaultTrue(merged.notify_low_stock)),
      boolInt(defaultTrue(merged.notify_pending_approval)),
      merged.bridge_url || '',
      merged.gas_endpoint || '',
      intVal(merged.low_stock_threshold, defaultThreshold(env)),
      merged.app_version || env.APP_VERSION || '',
      now,
      rowId
    ).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO config (
        id, app_name, app_logo_file_id, organization_name, organization_address, organization_phone, organization_email,
        telegram_bot_token, telegram_chat_id, telegram_enabled, line_enabled, line_token, notification_recipients,
        notify_low_stock, notify_pending_approval, bridge_url, gas_endpoint, low_stock_threshold, app_version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      rowId,
      merged.app_name || env.APP_NAME || '',
      merged.app_logo || merged.app_logo_file_id || '',
      merged.organization_name || '',
      merged.organization_address || '',
      merged.organization_phone || '',
      merged.organization_email || '',
      merged.telegram_bot_token || '',
      merged.telegram_chat_id || '',
      boolInt(merged.telegram_enabled),
      boolInt(merged.line_enabled),
      merged.line_token || '',
      merged.notification_recipients || '',
      boolInt(defaultTrue(merged.notify_low_stock)),
      boolInt(defaultTrue(merged.notify_pending_approval)),
      merged.bridge_url || '',
      merged.gas_endpoint || '',
      intVal(merged.low_stock_threshold, defaultThreshold(env)),
      merged.app_version || env.APP_VERSION || '',
      now,
      now
    ).run();
  }

  await logAudit(env, session, 'save_config', 'config', 'บันทึกการตั้งค่าระบบ');
  return { success: true, message: 'บันทึกการตั้งค่าเรียบร้อย' };
}

async function requireAdmin(env, token) {
  const session = await validateSession(env, token);
  return session && session.role === 'admin' ? session : null;
}

async function requireAdminOrStaff(env, token) {
  const session = await validateSession(env, token);
  return session && (session.role === 'admin' || session.role === 'staff') ? session : null;
}

function normalizeRequestedItems(wdData) {
  const requested = Array.isArray(wdData?.items) && wdData.items.length
    ? wdData.items
    : (wdData?.item_id ? [{ item_id: wdData.item_id, quantity: wdData.quantity }] : []);
  const merged = new Map();
  requested.forEach((entry) => {
    const itemId = String(entry?.item_id || '');
    const quantity = intVal(entry?.quantity, 0);
    if (!itemId || quantity <= 0) return;
    merged.set(itemId, (merged.get(itemId) || 0) + quantity);
  });
  return [...merged.entries()].map(([item_id, quantity]) => ({ item_id, quantity }));
}

async function generateRunningNumber(env, prefix, tableName, fieldName) {
  const year = new Date().getFullYear() + 543;
  const pattern = `${prefix}-${year}-%`;
  const result = await env.DB.prepare(
    `SELECT ${fieldName} AS code FROM ${tableName} WHERE ${fieldName} LIKE ? ORDER BY ${fieldName} DESC LIMIT 1`
  ).bind(pattern).first();
  let next = 1;
  if (result?.code) {
    const match = String(result.code).match(/(\d+)\s*$/);
    if (match) next = Number.parseInt(match[1], 10) + 1;
  }
  return `${prefix}-${year}-${String(next).padStart(4, '0')}`;
}

async function resolveThreshold(env) {
  const row = await env.DB.prepare('SELECT low_stock_threshold FROM config ORDER BY updated_at DESC LIMIT 1').first();
  return row ? intVal(row.low_stock_threshold, defaultThreshold(env)) : defaultThreshold(env);
}

function defaultThreshold(env) {
  return intVal(env.LOW_STOCK_DEFAULT, 5);
}

function isLowStock(item, threshold) {
  return toNumber(item.current_stock) <= intVal(item.min_stock, threshold);
}

function mapItemRow(row) {
  return {
    id: row.id,
    item_code: row.item_code,
    name: row.item_name,
    size: row.size_label || '',
    unit: row.unit,
    category: row.category_name,
    item_type: row.item_type,
    part_no: row.part_no || '',
    machine_name: row.machine_name_legacy || '',
    compatible_machines: row.compatible_machines_text || '',
    condition_status: row.condition_status || '',
    serial_tracking: !!row.serial_tracking,
    current_stock: toNumber(row.current_stock),
    min_stock: toNumber(row.min_stock),
    spare_part_units: row.spare_part_units || '',
    description: row.description || '',
    image_file_id: row.image_file_id || '',
    active: !!row.is_active
  };
}

function mapConfigRow(row) {
  return {
    app_name: row.app_name,
    app_version: row.app_version || '',
    app_logo: row.app_logo_file_id || '',
    organization_name: row.organization_name || '',
    organization_address: row.organization_address || '',
    organization_phone: row.organization_phone || '',
    organization_email: row.organization_email || '',
    telegram_enabled: !!row.telegram_enabled,
    telegram_bot_token: row.telegram_bot_token || '',
    telegram_chat_id: row.telegram_chat_id || '',
    line_enabled: !!row.line_enabled,
    line_token: row.line_token || '',
    notification_recipients: row.notification_recipients || '',
    notify_low_stock: !!row.notify_low_stock,
    notify_pending_approval: !!row.notify_pending_approval,
    bridge_url: row.bridge_url || '',
    gas_endpoint: row.gas_endpoint || '',
    low_stock_threshold: toNumber(row.low_stock_threshold),
    app_logo_file_id: row.app_logo_file_id || ''
  };
}

function defaultConfig(env) {
  return {
    app_name: env.APP_NAME || 'Requisition of consumables (Eng-RD) System',
    app_version: env.APP_VERSION || '3.09',
    app_logo: '',
    organization_name: 'RD',
    organization_address: '',
    organization_phone: '',
    organization_email: '',
    telegram_enabled: false,
    telegram_bot_token: '',
    telegram_chat_id: '',
    line_enabled: false,
    line_token: '',
    notification_recipients: '',
    notify_low_stock: true,
    notify_pending_approval: true,
    bridge_url: '',
    gas_endpoint: '',
    low_stock_threshold: defaultThreshold(env)
  };
}

async function hashPassword(password, env) {
  const data = new TextEncoder().encode(`${password}${env.APP_SALT || 'SUP_SYS_2569_SALT'}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(plain, hashed, env) {
  return (await hashPassword(String(plain || ''), env)) === String(hashed || '');
}

async function logAudit(env, session, action, moduleName, detail) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    'INSERT INTO audit_logs (id, action, module_name, detail, actor_user_id, actor_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), action, moduleName || '', detail || '', session?.user_id || '', session?.name || 'system', now).run();
}

async function logError(env, sourceName, error, payload) {
  if (!env?.DB) return;
  try {
    await env.DB.prepare(
      'INSERT INTO error_logs (id, source_name, error_message, stack_trace, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      crypto.randomUUID(),
      sourceName,
      String(error?.message || error || 'Unknown error'),
      String(error?.stack || ''),
      JSON.stringify(payload || {}),
      new Date().toISOString()
    ).run();
  } catch {
    // Ignore nested logging failures.
  }
}

async function readBody(request) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return request.json().catch(() => ({}));
  }
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const body = {};
    for (const [key, value] of form.entries()) {
      body[key] = value;
    }
    return body;
  }
  return {};
}

function readFilters(url) {
  const filters = {};
  for (const [key, value] of url.searchParams.entries()) {
    filters[key] = value;
  }
  return filters;
}

function corsHeaders(request) {
  const origin = request.headers.get('origin') || '*';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
    'access-control-max-age': '86400'
  };
}

function withCors(response, request) {
  const headers = new Headers(response.headers);
  const extra = corsHeaders(request);
  Object.keys(extra).forEach((key) => headers.set(key, extra[key]));
  return new Response(response.body, { status: response.status, headers });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function getToken(request) {
  const auth = request.headers.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  const url = new URL(request.url);
  return url.searchParams.get('token') || '';
}

function inferItemTypeFromCategory(category, explicitType) {
  if (explicitType === 'consumable' || explicitType === 'spare_part') return explicitType;
  return String(category || '').trim().startsWith('หมวด') ? 'consumable' : 'spare_part';
}

function allowGasFallback(env) {
  return String(env.ALLOW_GAS_FALLBACK || '').toLowerCase() === 'true';
}

function sessionTimeoutMs(env) {
  return intVal(env.SESSION_TIMEOUT_SEC, 28800) * 1000;
}

function randomPassword() {
  return Math.random().toString(36).slice(-8).toUpperCase();
}

function boolInt(value) {
  return value ? 1 : 0;
}

function intVal(value, fallback) {
  const num = Number.parseInt(value, 10);
  return Number.isFinite(num) ? num : fallback;
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function defaultTrue(value) {
  return typeof value === 'undefined' ? true : value;
}

function nullableText(value) {
  if (typeof value === 'undefined' || value === null) return null;
  var text = String(value).trim();
  return text ? text : null;
}

function hasOwn(obj, key) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function mapBusinessFailureStatus(result) {
  if ((result.message || '').includes('กรุณาเข้าสู่ระบบใหม่')) return 401;
  if ((result.message || '').includes('ไม่มีสิทธิ์')) return 403;
  if ((result.message || '').includes('ไม่พบ')) return 404;
  return 200;
}

async function resolveWithdrawalRequest(env, idOrLineId) {
  var request = await env.DB.prepare('SELECT * FROM withdrawal_requests WHERE id = ? LIMIT 1').bind(String(idOrLineId || '')).first();
  if (request) return { request };
  var line = await env.DB.prepare('SELECT withdrawal_request_id FROM withdrawal_request_items WHERE id = ? LIMIT 1').bind(String(idOrLineId || '')).first();
  if (!line) return { request: null };
  request = await env.DB.prepare('SELECT * FROM withdrawal_requests WHERE id = ? LIMIT 1').bind(line.withdrawal_request_id).first();
  return { request };
}

function formatMonthLabel(monthKey) {
  if (!monthKey || monthKey.indexOf('-') === -1) return monthKey || '';
  var parts = monthKey.split('-');
  return parts[1] + '/' + (Number(parts[0]) + 543);
}

function findUnitForItem(items, itemId) {
  var found = (items || []).find(function(item) { return item.id === itemId; });
  return found ? found.unit : '';
}
