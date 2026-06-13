// ============================================================
// ระบบวัสดุสิ้นเปลือง (Consumable Supplies Management System)
// Version: 1.1 | แก้ไขบั๊กปรับยอดสต็อกไม่เปลี่ยน + แก้ไขสิทธิ์ CORS
// ============================================================

const CONFIG = {
  APP_NAME: 'Requisition of consumables (Eng-RD) System',
  APP_VERSION: '1.1',
  SESSION_TIMEOUT: 28800,   // 8 ชั่วโมง (วินาที)
  ITEMS_PER_PAGE: 20,
  LOW_STOCK_DEFAULT: 5,
  SALT: 'SUP_SYS_2569_SALT',
  ADMIN_USERS: {
    'admin':   { password: '123456', role: 'admin',    name: 'ผู้ดูแลระบบ' },
    'staff':    { password: '123456', role: 'staff',    name: 'เจ้าหน้าที่คลัง' },
    'employee': { password: '123456', role: 'employee', name: 'พนักงาน 01' }
  },
  USER_ROLES: {
    'admin':    { name: 'ผู้ดูแลระบบ',    permissions: ['all'] },
    'staff':    { name: 'เจ้าหน้าที่คลัง', permissions: ['view','receive','withdraw','report'] },
    'employee': { name: 'พนักงาน',        permissions: ['view_own','withdraw'] }
  }
};

// ข้อมูลเริ่มต้นรายการวัสดุสิ้นเปลือง
const SEED_ITEMS = [
  { name:'ดอกมิลลิ่ง (Nachi) ขนาด 3 MM. 50 MM. 4 ฟัน',  size:'-',  unit:'EA', category:'หมวดดอกมิลลิ่ง ( Milling )', stock:4,  min_stock:3 },
  { name:'ดอกมิลลิ่ง (Nachi) ขนาด 4 MM. 60 MM. 4 ฟัน',  size:'-',  unit:'EA', category:'หมวดดอกมิลลิ่ง ( Milling )',  stock:2,  min_stock:3 },
  { name:'ดอกมิลลิ่ง (Nachi) ขนาด 5 MM. 60 MM. 4 ฟัน',  size:'-',  unit:'EA', category:'หมวดดอกมิลลิ่ง ( Milling )',  stock:4,  min_stock:3 },
  { name:'ดอกมิลลิ่ง (Nachi) ขนาด 6 MM. 60 MM. 4 ฟัน',  size:'-',  unit:'EA', category:'หมวดดอกมิลลิ่ง ( Milling )',  stock:7,  min_stock:3 },
  { name:'ดอกมิลลิ่ง (Nachi) ขนาด 8 MM. 65 MM. 4 ฟัน',  size:'-',  unit:'EA', category:'หมวดดอกมิลลิ่ง ( Milling )',  stock:1,  min_stock:3 },
  { name:'ดอกมิลลิ่ง (Nachi) ขนาด 10 MM. 75 MM. 4 ฟัน', size:'-',  unit:'EA', category:'หมวดดอกมิลลิ่ง ( Milling )',  stock:9,  min_stock:3 },
  { name:'ดอกมิลลิ่ง (Nachi) ขนาด 12 MM. 80 MM. 4 ฟัน', size:'-',  unit:'EA', category:'หมวดดอกมิลลิ่ง ( Milling )',  stock:4,  min_stock:3 },
  { name:'ดอกมิลลิ่ง (Nachi) ขนาด 14 MM. 90 MM. 4 ฟัน', size:'-',  unit:'EA', category:'หมวดดอกมิลลิ่ง ( Milling )',  stock:6,  min_stock:3 },
  { name:'ดอกมิลลิ่ง (Nachi) ขนาด 16 MM. 95 MM. 4 ฟัน', size:'-',  unit:'EA', category:'หมวดดอกมิลลิ่ง ( Milling )',  stock:3,  min_stock:3 },
  { name:'ดอกมิลลิ่ง (Nachi) ขนาด 20 MM. 110 MM. 4 ฟัน', size:'-', unit:'EA', category:'หมวดดอกมิลลิ่ง ( Milling )',  stock:1,  min_stock:3 },
  { name:'ดอกสว่านเจาะเหล็ก HSS CO NACHI 5.4 mm',       size:'-', unit:'EA',category:'หมวดดอกเจาะ ( Drill )', stock:4,  min_stock:3 },
  { name:'ดอกเจาะ SS NACHI 7.2 x 69 x 109 mm',       size:'-', unit:'EA',category:'หมวดดอกเจาะ ( Drill )', stock:3,  min_stock:3 },
  { name:'ดอกเจาะ SS NACHI 9.0 x 89 x 124 mm',       size:'-', unit:'EA',category:'หมวดดอกเจาะ ( Drill )', stock:17,  min_stock:3 },
  { name:'ดอกเจาะ SS 9.0 X 89 X 124 mm Nachi (สำหรับงานสแตนเลส)',   size:'-', unit:'EA',category:'หมวดดอกเจาะ ( Drill )', stock:9,  min_stock:3 },
  { name:'ดอกเจาะ SS NACHI 10.9 x 103 x 140 mm',   size:'-', unit:'EA',category:'หมวดดอกเจาะ ( Drill )', stock:8,  min_stock:3 },
  { name:'ดอกเจาะ SS NACHI 14.5 x 114 x 169 mm',   size:'-', unit:'EA',category:'หมวดดอกเจาะ ( Drill )', stock:8,  min_stock:3 },
  { name:'โฮลซอว์เจาะ SS KUGEL ขนาด 40 MM',   size:'-', unit:'EA',category:'หมวดดอกเจาะ ( Drill )', stock:4,  min_stock:3 },
  { name:'โฮลซอว์เจาะ SS KUGEL ขนาด 45 MM',   size:'-', unit:'EA',category:'หมวดดอกเจาะ ( Drill )', stock:8,  min_stock:3 },
  { name:'ดอกสว่านเจาะเหล็ก KEIBA 4 mm',   size:'-', unit:'EA',category:'หมวดดอกเจาะ ( Drill )', stock:15,  min_stock:3 },
  { name:'ดอกสว่านเจาะเหล็ก KEIBA 1/2 นิ้ว หรือ 12.7 mm', size:'-', unit:'EA',category:'หมวดดอกเจาะ ( Drill )', stock:17,  min_stock:3 },
  { name:'ดอกสว่านเจาะเหล็ก KEIBA 1/4 นิ้ว หรือ 6.35 mm', size:'-', unit:'EA',category:'หมวดดอกเจาะ ( Drill )', stock:3,  min_stock:3 }
];

// ============================================================
// ENTRY POINT
// ============================================================

function doGet(e) {
  try {
    initializeSheets();
    var params = e ? e.parameter : {};

    // API mode: ถ้ามี ?fn=xxx ให้ส่งค่ากลับเป็น JSON
    if (params.fn) {
      var fn = params.fn;
      var args = [];
      try { args = JSON.parse(params.args || '[]'); } catch(err) { args = []; }
      var callbackName = params.callback || '';
      var result;
      switch (fn) {
        case 'login':               result = login(args[0], args[1], args[2]); break;
        case 'validateSession':     result = validateSession(args[0]); break;
        case 'logout':              result = logout(args[0]); break;
        case 'forgotPassword':      result = forgotPassword(args[0]); break;
        case 'getItems':            result = getItems(args[0]); break;
        case 'getItemById':         result = getItemById(args[0], args[1]); break;
        case 'addItem':             result = addItem(args[0], args[1]); break;
        case 'updateItem':          result = updateItem(args[0], args[1], args[2]); break;
        case 'deleteItem':          result = deleteItem(args[0], args[1]); break;
        case 'addReceive':          result = addReceive(args[0], args[1]); break;
        case 'getReceives':         result = getReceives(args[0], args[1]); break;
        case 'addWithdrawal':       result = addWithdrawal(args[0], args[1]); break;
        case 'getWithdrawals':      result = getWithdrawals(args[0], args[1]); break;
        case 'approveWithdrawal':   result = approveWithdrawal(args[0], args[1], args[2]); break;
        case 'rejectWithdrawal':    result = rejectWithdrawal(args[0], args[1], args[2]); break;
        case 'cancelWithdrawal':    result = cancelWithdrawal(args[0], args[1]); break;
        case 'getTransactions':     result = getTransactions(args[0], args[1]); break;
        case 'getDashboardStats':   result = getDashboardStats(args[0]); break;
        case 'getUsers':            result = getUsers(args[0]); break;
        case 'addUser':             result = addUser(args[0], args[1]); break;
        case 'updateUser':          result = updateUser(args[0], args[1], args[2]); break;
        case 'changePassword':      result = changePassword(args[0], args[1], args[2]); break;
        case 'resetUserPassword':   result = resetUserPassword(args[0], args[1]); break;
        case 'toggleUserActive':    result = toggleUserActive(args[0], args[1]); break;
        case 'saveConfig':          result = saveConfig(args[0], args[1]); break;
        case 'getConfig':           result = getConfig(); break; // 🟢 เรียกใช้งานตรงผ่านฟังก์ชันย่อย ไม่ซ้อนกล่อง JSON ซ้ำซ้อน
        case 'getMonthlyReport':    result = getMonthlyReport(args[0], args[1], args[2]); break;
        case 'generateExportUrl':   result = generateExportUrl(args[0], args[1], args[2]); break;
        case 'uploadFile':          result = uploadFile(args[0], args[1], args[2], args[3]); break;
        case 'testTelegram':        result = testTelegram(args[0]); break;
        default:
          result = { success: false, message: 'Unknown function: ' + fn };
      }
      if (callbackName) return jsonpResponse(result, callbackName);
      return jsonResponse(result);
    }

    var template = HtmlService.createTemplateFromFile('index');
    var cfg = getConfig();
    template.appName = cfg.app_name || CONFIG.APP_NAME;
    template.appLogo = cfg.app_logo || '';
    template.qrAction = params.action || '';
    template.qrItemId = params.item_id || '';
    return template.evaluate()
      .setTitle(template.appName)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    logError('doGet', err);
    return HtmlService.createHtmlOutput('<h2 style="font-family:sans-serif;padding:2rem">เกิดข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ</h2>');
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doOptions(e) {
  return jsonResponse({ success: true });
}

function doPost(e) {
  try {
    initializeSheets();
    var fn, args = [];
    if (e.postData && e.postData.type === 'application/json') {
      var payload = JSON.parse(e.postData.contents);
      fn = payload.fn;
      args = payload.args || [];
    } else {
      fn = e.parameter.fn;
      try { args = JSON.parse(e.parameter.args || '[]'); } catch(err) { args = []; }
    }
    
    if (!fn && e.parameter.fn) {
      fn = e.parameter.fn;
    }
    var bridgeId = e.parameter.bridgeId || '';

    var result;
    switch (fn) {
      case 'login':               result = login(args[0], args[1], args[2]); break;
      case 'getConfig':           result = getConfig(); break;
      case 'validateSession':     result = validateSession(args[0]); break;
      case 'uploadFile':          result = uploadFile(args[0], args[1], args[2], args[3]); break;
      
      // 🟢 จุดซ่อมวิกฤต: ต้องมีเคสนี้รองรับ เพื่อจับคู่กับหน้าบ้านที่สั่งยิงบันทึกปรับยอดนับจริงเข้ามา
      case 'updateItem':          result = updateItem(args[0], args[1], args[2]); break; 
      
      default: 
        result = { success: false, message: 'Function ' + fn + ' not supported via POST' };
    }
    if (bridgeId) return postMessageResponse(result, bridgeId);
    return jsonResponse(result);
  } catch(err) {
    logError('doPost', err);
    return jsonResponse({ success: false, message: err.message || String(err) });
  }
}

function jsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function jsonpResponse(data, callbackName) {
  var safeJson = JSON.stringify(data).replace(/</g, '\\u003c');
  var output = ContentService.createTextOutput(callbackName + '(' + safeJson + ');');
  output.setMimeType(ContentService.MimeType.JAVASCRIPT);
  return output;
}

function postMessageResponse(data, bridgeId) {
  var safeJson = JSON.stringify(data).replace(/</g, '\\u003c');
  var safeBridgeId = JSON.stringify(bridgeId || '');
  var html = '<!doctype html><html><body><script>' +
    '(function(){' +
    'var payload=' + safeJson + ';' +
    'window.top.postMessage({bridgeId:' + safeBridgeId + ', payload:payload}, "*");' +
    '})();' +
    '</script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
// INITIALIZE SHEETS
// ============================================================

function initializeSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetNames = ss.getSheets().map(function(s){ return s.getName(); });

  var required = {
    'Config':       'config_json',
    'Users':        'user_json',
    'Sessions':     'session_json',
    'Items':        'item_json',
    'Receives':     'receive_json',
    'Withdrawals':  'withdrawal_json',
    'Transactions': 'transaction_json',
    'Errors':       'error_json'
  };

  requiredSheetsKeys = Object.keys(required);
  for (var k = 0; k < requiredSheetsKeys.length; k++) {
    var name = requiredSheetsKeys[k];
    if (sheetNames.indexOf(name) === -1) {
      var sheet = ss.insertSheet(name);
      sheet.appendRow([required[name]]);
    }
  }

  if (getSheetData('Config').length === 0) {
    saveToSheet('Config', {
      app_name: CONFIG.APP_NAME,
      app_logo: '',
      organization_name: 'โรงเรียนอนุบาลทราย',
      organization_address: '',
      organization_phone: '',
      organization_email: '',
      telegram_bot_token: '',
      telegram_chat_id: '',
      telegram_enabled: false,
      low_stock_threshold: CONFIG.LOW_STOCK_DEFAULT,
      app_version: CONFIG.APP_VERSION
    });
  }

  if (getSheetData('Users').length === 0) {
    var adminUserKeys = Object.keys(CONFIG.ADMIN_USERS);
    for(var uIdx = 0; uIdx < adminUserKeys.length; uIdx++) {
      var username = adminUserKeys[uIdx];
      var u = CONFIG.ADMIN_USERS[username];
      saveToSheet('Users', {
        id: Utilities.getUuid(),
        username: username,
        password: hashPassword(u.password),
        role: u.role,
        name: u.name,
        email: u.email || '',
        phone: '',
        avatar: '',
        telegram_chat_id: '',
        active: true,
        last_login: ''
      });
    }
  }

  if (getSheetData('Items').length === 0) {
    for (var iIdx = 0; iIdx < SEED_ITEMS.length; iIdx++) {
      var item = SEED_ITEMS[iIdx];
      var code = 'SUP-' + String(iIdx + 1).padStart(3, '0');
      saveToSheet('Items', {
        id: Utilities.getUuid(),
        item_code: code,
        name: item.name,
        size: item.size,
        unit: item.unit,
        category: item.category,
        item_type: item.item_type || 'consumable',
        part_no: item.part_no || '',
        machine_name: item.machine_name || '',
        condition_status: item.condition_status || '',
        serial_tracking: item.serial_tracking || false,
        current_stock: item.stock,
        min_stock: item.min_stock,
        spare_part_units: item.spare_part_units || '',
        description: '',
        image_file_id: '',
        active: true
      });
    }
  }
  return { status: 'success', message: 'Sheets พร้อมใช้งาน' };
}

// ============================================================
// AUTHENTICATION
// ============================================================

function login(username, password, role) {
  try {
    var users = getSheetData('Users');
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].username === username && users[i].active) { user = users[i]; break; }
    }
    if (!user) return { success: false, message: 'ไม่พบชื่อผู้ใช้งานในระบบ หรือบัญชีถูกระงับ' };
    if (!verifyPassword(password, user.password)) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' };
    if (role && user.role !== role) return { success: false, message: 'บทบาทผู้ใช้งานระบบไม่ถูกต้อง' };

    var token = Utilities.getUuid();
    var now = new Date();
    saveToSheet('Sessions', {
      id: Utilities.getUuid(),
      token: token,
      user_id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      expires_at: new Date(now.getTime() + CONFIG.SESSION_TIMEOUT * 1000).toISOString()
    });
    updateInSheet('Users', user.id, { last_login: now.toISOString() });

    return {
      success: true,
      token: token,
      user: { id: user.id, username: user.username, role: user.role, name: user.name, avatar: user.avatar || '' }
    };
  } catch(err) {
    logError('login', err);
    return { success: false, message: 'เกิดข้อผิดพลาดในระบบล็อกอิน' };
  }
}

function validateSession(token) {
  try {
    if (!token) return null;
    var sessions = getSheetData('Sessions');
    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      if (s.token === token) {
        if (new Date(s.expires_at) < new Date()) {
          deleteFromSheet('Sessions', s.id, true);
          return null;
        }
        return s;
      }
    }
    return null;
  } catch(err) { return null; }
}

function logout(token) {
  try {
    var sessions = getSheetData('Sessions');
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].token === token) { deleteFromSheet('Sessions', sessions[i].id, true); break; }
    }
    return { success: true };
  } catch(err) { return { success: false }; }
}

function forgotPassword(email) {
  try {
    var users = getSheetData('Users');
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].email === email && users[i].active) { user = users[i]; break; }
    }
    if (!user) return { success: false, message: 'ไม่พบอีเมลนี้ในระบบ' };
    var tmpPass = Math.random().toString(36).slice(-8).toUpperCase();
    updateInSheet('Users', user.id, { password: hashPassword(tmpPass) });
    var cfg = getConfig();
    MailApp.sendEmail({
      to: email,
      subject: 'รีเซ็ตรหัสผ่าน — ' + cfg.app_name,
      htmlBody: '<div style="font-family:sans-serif"><h2>รีเซ็ตรหัสผ่าน</h2>'
        + '<p>สวัสดี คุณ' + user.name + '</p>'
        + '<p>รหัสผ่านชั่วคราว: <strong style="font-size:1.2em;color:#1e3a8a">' + tmpPass + '</strong></p>'
        + '<p>กรุณาเปลี่ยนรหัสผ่านหลังจาก Login</p></div>'
    });
    return { success: true, message: 'ส่งรหัสผ่านชั่วคราวไปที่อีเมลเรียบร้อย' };
  } catch(err) {
    logError('forgotPassword', err);
    return { success: false, message: 'ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่' };
  }
}

// ============================================================
// ITEMS (รายการวัสดุ)
// ============================================================

function getItems(token) {
  try {
    if (!validateSession(token)) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var items = getSheetData('Items').filter(function(i){ return i.active !== false; }).map(function(i){ return normalizeItemRecord(i); });
    items.sort(function(a,b){ return (a.item_code||'').localeCompare(b.item_code||''); });
    return { success: true, data: items };
  } catch(err) {
    logError('getItems', err);
    return { success: false, message: err.message };
  }
}

function getItemById(token, itemId) {
  try {
    if (!validateSession(token)) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var items = getSheetData('Items');
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === itemId) return { success: true, data: normalizeItemRecord(items[i]) };
    }
    return { success: false, message: 'ไม่พบรายการวัสดุ' };
  } catch(err) { return { success: false, message: err.message }; }
}

function addItem(token, itemData) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
    var items = getSheetData('Items');
    var code = 'SUP-' + String(items.length + 1).padStart(3, '0');
    var newItem = {
      id: Utilities.getUuid(),
      item_code: code,
      name: itemData.name,
      size: itemData.size || '',
      unit: itemData.unit,
      category: itemData.category || 'อื่นๆ',
      item_type: itemData.item_type || 'consumable',
      part_no: itemData.part_no || '',
      machine_name: itemData.machine_name || '',
      compatible_machines: itemData.compatible_machines || '',
      condition_status: itemData.condition_status || '',
      serial_tracking: !!itemData.serial_tracking,
      current_stock: parseInt(itemData.current_stock) || 0,
      min_stock: parseInt(itemData.min_stock) || 5,
      spare_part_units: itemData.spare_part_units || '',
      description: itemData.description || '',
      image_file_id: itemData.image_file_id || '',
      active: true
    };
    saveToSheet('Items', newItem);
    return { success: true, data: newItem, message: 'เพิ่มรายการวัสดุเรียบร้อย' };
  } catch(err) {
    logError('addItem', err);
    return { success: false, message: err.message };
  }
}

function normalizeItemRecord(item) {
  if (!item) return item;
  if (!item.item_type) item.item_type = 'consumable';
  if (typeof item.serial_tracking === 'undefined') item.serial_tracking = false;
  if (!item.condition_status) item.condition_status = '';
  if (typeof item.spare_part_units === 'undefined') item.spare_part_units = '';
  if (!item.part_no) item.part_no = '';
  if (!item.machine_name) item.machine_name = '';
  if (typeof item.compatible_machines === 'undefined') item.compatible_machines = '';
  return item;
}

function updateItem(token, itemId, itemData) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
    
    // สร้างก้อนอัปเดต โดยตรวจสอบโครงสร้างฟิลด์ให้ครบถ้วน เพื่อไม่ให้ฟิลด์เดิมหลุดหาย
    var updatePayload = {
      name: itemData.name,
      size: itemData.size,
      unit: itemData.unit,
      category: itemData.category,
      item_type: itemData.item_type || 'consumable',
      part_no: itemData.part_no || '',
      machine_name: itemData.machine_name || '',
      compatible_machines: itemData.compatible_machines || '',
      condition_status: itemData.condition_status || '',
      serial_tracking: !!itemData.serial_tracking,
      min_stock: parseInt(itemData.min_stock) || 0,
      spare_part_units: itemData.spare_part_units || '',
      description: itemData.description || '',
      image_file_id: itemData.image_file_id || ''
    };

    // 🟢 จุดสำคัญ: หน้าบ้านส่งฟิลด์ current_stock มาจากการนับจริง (Stocktake)
    // ระบบหลังบ้านต้องตรวจสอบและอัปเดตค่านี้ลงฐานข้อมูลด้วย ยอดนับจริงจึงจะเปลี่ยนตาม
    if (itemData.hasOwnProperty('current_stock')) {
      updatePayload.current_stock = parseInt(itemData.current_stock);
    }
    if (itemData.hasOwnProperty('active')) {
      updatePayload.active = itemData.active;
    }

    var updated = updateInSheet('Items', itemId, updatePayload);
    if (!updated) return { success: false, message: 'ไม่พบรายการที่ต้องการแก้ไขในฐานข้อมูล' };
    return { success: true, message: 'แก้ไขข้อมูลวัสดุเรียบร้อยแล้ว' };
  } catch(err) {
    logError('updateItem', err);
    return { success: false, message: err.message };
  }
}

function deleteItem(token, itemId) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
    updateInSheet('Items', itemId, { active: false });
    return { success: true, message: 'ลบรายการเรียบร้อย' };
  } catch(err) { return { success: false, message: err.message }; }
}

// ============================================================
// RECEIVES (รับวัสดุเข้าคลัง)
// ============================================================

function addReceive(token, receiveData) {
  try {
    var session = validateSession(token);
    if (!session || session.role === 'employee') return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' };
    var lock = LockService.getScriptLock();
    lock.tryLock(10000);
    try {
      var items = getSheetData('Items');
      var item = null;
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === receiveData.item_id) { item = items[i]; break; }
      }
      if (!item) return { success: false, message: 'ไม่พบรายการวัสดุ' };

      var qty = parseInt(receiveData.quantity);
      if (!qty || qty <= 0) return { success: false, message: 'จำนวนไม่ถูกต้อง' };

      var stockBefore = item.current_stock || 0;
      var stockAfter = stockBefore + qty;

      updateInSheet('Items', item.id, { current_stock: stockAfter });
      var recNo = generateRunningNumber('RCV', 'Receives');

      var rec = {
        id: Utilities.getUuid(),
        receive_no: recNo,
        item_id: item.id,
        item_name: item.name,
        item_code: item.item_code,
        item_type: item.item_type || receiveData.item_type || 'consumable',
        quantity: qty,
        unit: item.unit,
        received_by: session.user_id,
        received_by_name: session.name,
        note: receiveData.note || '',
        date: receiveData.date || new Date().toISOString().split('T')[0]
      };
      saveToSheet('Receives', rec);

      saveToSheet('Transactions', {
        id: Utilities.getUuid(),
        type: 'receive',
        item_id: item.id,
        item_name: item.name,
        item_code: item.item_code,
        item_type: item.item_type || receiveData.item_type || 'consumable',
        quantity: qty,
        stock_before: stockBefore,
        stock_after: stockAfter,
        ref_id: recNo,
        actor_id: session.user_id,
        actor_name: session.name,
        actor_role: session.role,
        note: receiveData.note || '',
        date: rec.date
      });

      var msg = '<b>รับวัสดุเข้าคลัง</b> #' + recNo
        + '\nรายการ: ' + item.name + ' (' + item.size + ')'
        + '\nจำนวน: +' + qty + ' ' + item.unit
        + '\nสต็อกคงเหลือ: ' + stockAfter + ' ' + item.unit
        + '\nโดย: ' + session.name
        + '\nวันที่: ' + rec.date;
      sendTelegram(msg);

      return { success: true, message: 'บันทึกรับเข้าเรียบร้อย', receive_no: recNo };
    } finally { lock.releaseLock(); }
  } catch(err) {
    logError('addReceive', err);
    return { success: false, message: err.message };
  }
}

function getReceives(token, filters) {
  try {
    if (!validateSession(token)) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var data = getSheetData('Receives');
    if (filters && filters.date_from) {
      data = data.filter(function(r){ return r.date >= filters.date_from; });
    }
    if (filters && filters.date_to) {
      data = data.filter(function(r){ return r.date <= filters.date_to; });
    }
    data.sort(function(a,b){ return b.created_at > a.created_at ? 1 : -1; });
    return { success: true, data: data };
  } catch(err) { return { success: false, message: err.message }; }
}

// ============================================================
// WITHDRAWALS (คำขอเบิกวัสดุ)
// ============================================================

function addWithdrawal(token, wdData) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };

    var items = getSheetData('Items');
    var item = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === wdData.item_id) { item = items[i]; break; }
    }
    if (!item) return { success: false, message: 'ไม่พบรายการวัสดุ' };

    var qty = parseInt(wdData.quantity);
    if (!qty || qty <= 0) return { success: false, message: 'กรุณาระบุจำนวนให้ถูกต้อง' };
    if (qty > item.current_stock) return { success: false, message: 'จำนวนที่ขอเกินสต็อกคงเหลือ' };

    var wdNo = generateRunningNumber('WD', 'Withdrawals');

    var wd = {
      id: Utilities.getUuid(),
      withdraw_no: wdNo,
      item_id: item.id,
      item_name: item.name,
      item_code: item.item_code,
      item_type: item.item_type || wdData.item_type || 'consumable',
      quantity_requested: qty,
      quantity_approved: 0,
      unit: item.unit,
      purpose: wdData.purpose || '',
      note: wdData.note || '',
      status: 'pending',
      requested_by: session.user_id,
      requested_by_name: session.name,
      requested_at: new Date().toISOString(),
      approved_by: '',
      approved_by_name: '',
      approved_at: '',
      reject_reason: '',
      via_qr: wdData.via_qr || false
    };
    saveToSheet('Withdrawals', wd);

    var msg = '<b>คำขอเบิกใหม่</b> #' + wdNo
      + '\nรายการ: ' + item.name
      + '\nจำนวน: ' + qty + ' ' + item.unit
      + '\nผู้ขอ: ' + session.name + ' (' + CONFIG.USER_ROLES[session.role].name + ')'
      + '\nวัตถุประสงค์: ' + (wdData.purpose || '-')
      + '\nสต็อกคงเหลือ: ' + item.current_stock + ' ' + item.unit;
    sendTelegram(msg);

    return { success: true, message: 'ยื่นคำขอเบิกเรียบร้อย รอการอนุมัติ', withdraw_no: wdNo };
  } catch(err) {
    logError('addWithdrawal', err);
    return { success: false, message: err.message };
  }
}

function getWithdrawals(token, filters) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var data = getSheetData('Withdrawals');
    if (session.role === 'employee') {
      data = data.filter(function(w){ return w.requested_by === session.user_id; });
    }
    if (filters && filters.status && filters.status !== 'all') {
      data = data.filter(function(w){ return w.status === filters.status; });
    }
    data.sort(function(a,b){ return b.requested_at > a.requested_at ? 1 : -1; });
    return { success: true, data: data };
  } catch(err) { return { success: false, message: err.message }; }
}

function approveWithdrawal(token, wdId, qtyApproved) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์อนุมัติ' };
    var lock = LockService.getScriptLock();
    lock.tryLock(10000);
    try {
      var wds = getSheetData('Withdrawals');
      var wd = null;
      for (var i = 0; i < wds.length; i++) {
        if (wds[i].id === wdId) { wd = wds[i]; break; }
      }
      if (!wd) return { success: false, message: 'ไม่พบคำขอเบิก' };
      if (wd.status !== 'pending') return { success: false, message: 'คำขอนี้ดำเนินการแล้ว' };

      var qty = parseInt(qtyApproved) || wd.quantity_requested;

      var items = getSheetData('Items');
      var item = null;
      for (var j = 0; j < items.length; j++) {
        if (items[j].id === wd.item_id) { item = items[j]; break; }
      }
      if (!item) return { success: false, message: 'ไม่พบรายการวัสดุ' };
      if (qty > item.current_stock) return { success: false, message: 'สต็อกไม่พอ (' + item.current_stock + ' ' + item.unit + ')' };

      var stockBefore = item.current_stock;
      var stockAfter = stockBefore - qty;
      updateInSheet('Items', item.id, { current_stock: stockAfter });

      var now = new Date().toISOString();
      updateInSheet('Withdrawals', wdId, {
        status: 'approved',
        quantity_approved: qty,
        approved_by: session.user_id,
        approved_by_name: session.name,
        approved_at: now
      });

      saveToSheet('Transactions', {
        id: Utilities.getUuid(),
        type: 'withdraw',
        item_id: item.id,
        item_name: item.name,
        item_code: item.item_code,
        item_type: wd.item_type || item.item_type || 'consumable',
        quantity: qty,
        stock_before: stockBefore,
        stock_after: stockAfter,
        ref_id: wd.withdraw_no,
        actor_id: wd.requested_by,
        actor_name: wd.requested_by_name,
        actor_role: session.role, 
        approved_by_name: session.name,
        note: wd.note || '',
        date: now.split('T')[0]
      });

      var cfg = getConfig();
      var threshold = cfg.low_stock_threshold || CONFIG.LOW_STOCK_DEFAULT;
      var lowMsg = '';
      if (stockAfter <= (item.min_stock || threshold)) {
        lowMsg = '\n<b>คำเตือน: สต็อกต่ำกว่าขั้นต่ำ</b> เหลือ ' + stockAfter + ' ' + item.unit + ' (ขั้นต่ำ: ' + item.min_stock + ')';
      }

      var msg = '<b>อนุมัติการเบิก</b> #' + wd.withdraw_no
        + '\nรายการ: ' + item.name
        + '\nอนุมัติ: ' + qty + ' ' + item.unit
        + '\nผู้เบิก: ' + wd.requested_by_name
        + '\nสต็อกคงเหลือ: ' + stockAfter + ' ' + item.unit
        + '\nอนุมัติโดย: ' + session.name
        + lowMsg;
      sendTelegram(msg);

      return { success: true, message: 'อนุมัติการเบิกเรียบร้อย' };
    } finally { lock.releaseLock(); }
  } catch(err) {
    logError('approveWithdrawal', err);
    return { success: false, message: err.message };
  }
}

function rejectWithdrawal(token, wdId, reason) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    var wds = getSheetData('Withdrawals');
    var wd = null;
    for (var i = 0; i < wds.length; i++) {
      if (wds[i].id === wdId) { wd = wds[i]; break; }
    }
    if (!wd || wd.status !== 'pending') return { success: false, message: 'ไม่พบคำขอหรือดำเนินการแล้ว' };
    updateInSheet('Withdrawals', wdId, {
      status: 'rejected',
      approved_by: session.user_id,
      approved_by_name: session.name,
      approved_at: new Date().toISOString(),
      reject_reason: reason || ''
    });
    sendTelegram('<b>ปฏิเสธการเบิก</b> #' + wd.withdraw_no
      + '\nรายการ: ' + (wd.item_name || wd.item_code || '-')
      + '\nผู้ขอ: ' + wd.requested_by_name
      + '\nเหตุผล: ' + (reason || '-')
      + '\nโดย: ' + session.name);
    return { success: true, message: 'ปฏิเสธคำขอเรียบร้อย' };
  } catch(err) {
    logError('rejectWithdrawal', err);
    return { success: false, message: err.message };
  }
}

function cancelWithdrawal(token, wdId) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var wds = getSheetData('Withdrawals');
    var wd = null;
    for (var i = 0; i < wds.length; i++) {
      if (wds[i].id === wdId) { wd = wds[i]; break; }
    }
    if (!wd) return { success: false, message: 'ไม่พบคำขอ' };
    if (wd.requested_by !== session.user_id) return { success: false, message: 'ไม่มีสิทธิ์ยกเลิก' };
    if (wd.status !== 'pending') return { success: false, message: 'คำขอนี้ดำเนินการแล้ว' };
    updateInSheet('Withdrawals', wdId, {
      status: 'rejected',
      reject_reason: 'ยกเลิกโดยผู้ขอ',
      approved_by: session.user_id,
      approved_by_name: session.name,
      approved_at: new Date().toISOString()
    });
    sendTelegram('<b>ยกเลิกการเบิก</b> #' + wd.withdraw_no
      + '\nรายการ: ' + (wd.item_name || wd.item_code || '-')
      + '\nผู้ขอ: ' + wd.requested_by_name
      + '\nโดย: ' + session.name);
    return { success: true, message: 'ยกเลิกคำขอเรียบร้อย' };
  } catch(err) {
    logError('cancelWithdrawal', err);
    return { success: false, message: err.message };
  }
}

// ============================================================
// TRANSACTIONS + DASHBOARD
// ============================================================

function getTransactions(token, filters) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var data = getSheetData('Transactions');
    if (session.role === 'employee') {
      data = data.filter(function(t){ return t.actor_id === session.user_id; });
    }
    if (filters) {
      if (filters.type && filters.type !== 'all') data = data.filter(function(t){ return t.type === filters.type; });
      if (filters.date_from) data = data.filter(function(t){ return (t.date||'') >= filters.date_from; });
      if (filters.date_to)   data = data.filter(function(t){ return (t.date||'') <= filters.date_to; });
    }
    data.sort(function(a,b){ return b.created_at > a.created_at ? 1 : -1; });
    return { success: true, data: data };
  } catch(err) { return { success: false, message: err.message }; }
}

function getDashboardStats(token) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };

    var items = getSheetData('Items').filter(function(i){ return i.active !== false; });
    var wds   = getSheetData('Withdrawals');
    var txs   = getSheetData('Transactions');
    var today = new Date().toISOString().split('T')[0];
    var cfg   = getConfig();
    var threshold = cfg.low_stock_threshold || CONFIG.LOW_STOCK_DEFAULT;

    var totalItems = items.length;
    var lowStockItems = items.filter(function(i){ return (i.current_stock||0) <= (i.min_stock || threshold); });
    var pendingWds = wds.filter(function(w){ return w.status === 'pending'; });
    var todayTxs  = txs.filter(function(t){ return t.date === today; });

    var monthlyData = {};
    var now = new Date();
    for (var m = 5; m >= 0; m--) {
      var d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0');
      monthlyData[key] = { receive: 0, withdraw: 0, label: (d.getMonth() + 1) + '/' + (d.getFullYear() + 543) };
    }
    txs.forEach(function(t) {
      var key = (t.date || '').substring(0, 7);
      if (monthlyData[key]) {
        if (t.type === 'receive')  monthlyData[key].receive  += t.quantity || 0;
        if (t.type === 'withdraw') monthlyData[key].withdraw += t.quantity || 0;
      }
    });

    var withdrawByItem = {};
    wds.filter(function(w){ return w.status === 'approved'; }).forEach(function(w) {
      withdrawByItem[w.item_name] = (withdrawByItem[w.item_name] || 0) + (w.quantity_approved || 0);
    });
    var topItems = Object.keys(withdrawByItem)
      .map(function(k){ return { name: k, qty: withdrawByItem[k] }; })
      .sort(function(a,b){ return b.qty - a.qty; })
      .slice(0, 5);

    var categoryStock = {};
    items.forEach(function(i) {
      var cat = i.category || 'อื่นๆ';
      categoryStock[cat] = (categoryStock[cat] || 0) + 1;
    });

    var recentTxs = txs.slice().sort(function(a,b){ return b.created_at > a.created_at ? 1 : -1; }).slice(0, 10);
    var recentPending = wds.filter(function(w){ return w.status === 'pending'; })
      .sort(function(a,b){ return b.requested_at > a.requested_at ? 1 : -1; }).slice(0, 5);

    return {
      success: true,
      kpi: {
        total_items: totalItems,
        low_stock: lowStockItems.length,
        pending: pendingWds.length,
        today_tx: todayTxs.length
      },
      monthly: Object.values(monthlyData),
      top_items: topItems,
      category_stock: categoryStock,
      low_stock_items: lowStockItems.slice(0, 5),
      recent_transactions: recentTxs,
      recent_pending: recentPending
    };
  } catch(err) {
    logError('getDashboardStats', err);
    return { success: false, message: err.message };
  }
}

// ============================================================
// USERS (จัดการผู้ใช้ — Admin)
// ============================================================

function getUsers(token) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    var users = getSheetData('Users').map(function(u) {
      return { id:u.id, username:u.username, name:u.name, role:u.role, email:u.email, phone:u.phone||'', active:u.active, last_login:u.last_login||'', avatar:u.avatar||'' };
    });
    return { success: true, data: users };
  } catch(err) { return { success: false, message: err.message }; }
}

function addUser(token, userData) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    var existing = getSheetData('Users');
    for (var i = 0; i < existing.length; i++) {
      if (existing[i].username === userData.username) return { success: false, message: 'Username นี้มีในระบบแล้ว' };
    }
    saveToSheet('Users', {
      id: Utilities.getUuid(),
      username: userData.username,
      password: hashPassword(userData.password),
      role: userData.role,
      name: userData.name,
      email: userData.email || '',
      phone: userData.phone || '',
      avatar: '',
      telegram_chat_id: '',
      active: true,
      last_login: ''
    });
    return { success: true, message: 'เพิ่มผู้ใช้สำเร็จ' };
  } catch(err) { return { success: false, message: err.message }; }
}

function updateUser(token, userId, userData) {
  try {
    var session = validateSession(token);
    if (!session || (session.role !== 'admin' && session.user_id !== userId)) {
      return { success: false, message: 'ไม่มีสิทธิ์' };
    }
    var update = { name: userData.name, email: userData.email, phone: userData.phone };
    if (session.role === 'admin') { update.role = userData.role; update.active = userData.active; }
    if (userData.avatar) update.avatar = userData.avatar;
    updateInSheet('Users', userId, update);
    return { success: true, message: 'แก้ไขข้อมูลเรียบร้อย' };
  } catch(err) { return { success: false, message: err.message }; }
}

function changePassword(token, oldPass, newPass) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var users = getSheetData('Users');
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === session.user_id) { user = users[i]; break; }
    }
    if (!user || !verifyPassword(oldPass, user.password)) {
      return { success: false, message: 'รหัสผ่านเดิมไม่ถูกต้อง' };
    }
    updateInSheet('Users', user.id, { password: hashPassword(newPass) });
    return { success: true, message: 'เปลี่ยนรหัสผ่านเรียบร้อย' };
  } catch(err) { return { success: false, message: err.message }; }
}

function resetUserPassword(token, userId) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    var users = getSheetData('Users');
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === userId) { user = users[i]; break; }
    }
    if (!user) return { success: false, message: 'ไม่พบผู้ใช้' };
    var tmpPass = Math.random().toString(36).slice(-8).toUpperCase();
    updateInSheet('Users', userId, { password: hashPassword(tmpPass) });
    if (user.email) {
      var cfg = getConfig();
      MailApp.sendEmail({ to: user.email, subject: 'Reset รหัสผ่าน — ' + cfg.app_name,
        htmlBody: '<p>รหัสผ่านชั่วคราว: <b>' + tmpPass + '</b></p><p>กรุณาเปลี่ยนรหัสผ่านหลัง Login</p>' });
    }
    return { success: true, message: 'Reset password เรียบร้อย' + (user.email ? ' ส่งทางอีเมลแล้ว' : ': ' + tmpPass) };
  } catch(err) { return { success: false, message: err.message }; }
}

function toggleUserActive(token, userId) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    var users = getSheetData('Users');
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].id === userId) { user = users[i]; break; }
    }
    if (!user) return { success: false, message: 'ไม่พบผู้ใช้' };
    updateInSheet('Users', userId, { active: !user.active });
    return { success: true, message: (!user.active ? 'เปิด' : 'ระงับ') + 'บัญชีเรียบร้อย' };
  } catch(err) { return { success: false, message: err.message }; }
}

// ============================================================
// CONFIG & SETTINGS
// ============================================================

function saveConfig(token, configData) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    var configs = getSheetData('Config');
    if (configs.length > 0) {
      updateInSheet('Config', configs[0].id, configData);
    } else {
      saveToSheet('Config', configData);
    }
    return { success: true, message: 'บันทึกการตั้งค่าเรียบร้อย' };
  } catch(err) { return { success: false, message: err.message }; }
}

// ============================================================
// REPORTS + EXPORT
// ============================================================

function getMonthlyReport(token, year, month) {
  try {
    var session = validateSession(token);
    if (!session || session.role === 'employee') return { success: false, message: 'ไม่มีสิทธิ์' };
    var dateStr = year + '-' + String(month).padStart(2, '0');
    var items = getSheetData('Items').filter(function(i){ return i.active !== false; });
    var txs   = getSheetData('Transactions');

    var rows = items.map(function(item) {
      var daily = {};
      for (var d = 1; d <= 31; d++) daily[d] = 0;
      txs.forEach(function(t) {
        if (t.type === 'withdraw' && t.item_id === item.id && (t.date||'').startsWith(dateStr)) {
          var day = parseInt(t.date.split('-')[2]);
          if (day) daily[day] += t.quantity || 0;
        }
      });
      var totalWithdraw = Object.values(daily).reduce(function(a,b){ return a+b; }, 0);
      var received = txs.filter(function(t){
        return t.type === 'receive' && t.item_id === item.id && (t.date||'').startsWith(dateStr);
      }).reduce(function(s,t){ return s + (t.quantity||0); }, 0);
      return {
        item_code: item.item_code, name: item.name, size: item.size, unit: item.unit,
        current_stock: item.current_stock, received: received,
        daily: daily, total_withdraw: totalWithdraw
      };
    });
    return { success: true, data: rows, month: dateStr };
  } catch(err) { return { success: false, message: err.message }; }
}

function generateExportUrl(token, reportType, filters) {
  try {
    var session = validateSession(token);
    if (!session || session.role === 'employee') return { success: false, message: 'ไม่มีสิทธิ์' };

    var ss = SpreadsheetApp.create('Export_' + reportType + '_' + new Date().getTime());
    var sheet = ss.getActiveSheet();

    if (reportType === 'receives') {
      sheet.setName('รายงานรับเข้า');
      sheet.appendRow(['เลขที่รับ','วันที่','รหัสวัสดุ','ชื่อวัสดุ','จำนวน','หน่วย','ผู้รับ','หมายเหตุ']);
      var recvs = getSheetData('Receives');
      if (filters && filters.date_from) recvs = recvs.filter(function(r){ return r.date >= filters.date_from; });
      if (filters && filters.date_to)   recvs = recvs.filter(function(r){ return r.date <= filters.date_to; });
      recvs.forEach(function(r){
        sheet.appendRow([r.receive_no, r.date, r.item_code, r.item_name, r.quantity, r.unit, r.received_by_name, r.note||'']);
      });
    } else if (reportType === 'withdrawals') {
      sheet.setName('รายงานเบิกออก');
      sheet.appendRow(['เลขที่เบิก','วันที่','รหัสวัสดุ','ชื่อวัสดุ','ขอ','อนุมัติ','หน่วย','ผู้เบิก','วัตถุประสงค์','สถานะ']);
      var wds = getSheetData('Withdrawals');
      if (filters && filters.status && filters.status !== 'all') wds = wds.filter(function(w){ return w.status === filters.status; });
      wds.forEach(function(w){
        sheet.appendRow([w.withdraw_no, w.requested_at.split('T')[0], w.item_code, w.item_name,
          w.quantity_requested, w.quantity_approved, w.unit, w.requested_by_name, w.purpose||'', w.status]);
      });
    }

    var url = ss.getUrl();
    return { success: true, url: url };
  } catch(err) {
    logError('generateExportUrl', err);
    return { success: false, message: err.message };
  }
}

// ============================================================
// FILE UPLOAD (Google Drive)
// ============================================================

function uploadFile(token, base64Data, mimeType, filename) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };
    var cfg = getConfig();
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, filename);
    var file;
    if (cfg.folder_id) {
      var folder = DriveApp.getFolderById(cfg.folder_id);
      file = folder.createFile(blob);
    } else {
      file = DriveApp.createFile(blob);
    }
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileId = file.getId();
    return { success: true, file_id: fileId, url: 'https://lh5.googleusercontent.com/d/' + fileId };
  } catch(err) {
    logError('uploadFile', err);
    return { success: false, message: err.message };
  }
}

// ============================================================
// TELEGRAM
// ============================================================

function sendTelegram(message) {
  try {
    var cfg = getConfig();
    if (!cfg.telegram_enabled || !cfg.telegram_bot_token || !cfg.telegram_chat_id) return;
    var url = 'https://api.telegram.org/bot' + cfg.telegram_bot_token + '/sendMessage';
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ chat_id: cfg.telegram_chat_id, text: message, parse_mode: 'HTML' }),
      muteHttpExceptions: true
    });
  } catch(err) { console.error('Telegram error:', err); }
}

function testTelegram(token) {
  try {
    var session = validateSession(token);
    if (!session || session.role !== 'admin') return { success: false, message: 'ไม่มีสิทธิ์' };
    sendTelegram('<b>ทดสอบการแจ้งเตือน</b>\nระบบวัสดุสิ้นเปลืองทำงานปกติ\nเวลา: ' + new Date().toLocaleString('th-TH'));
    return { success: true, message: 'ส่งข้อความทดสอบแล้ว' };
  } catch(err) { return { success: false, message: err.message }; }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getSheetData(sheetName) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet || sheet.getLastRow() < 2) return [];
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues()
      .filter(function(r){ return r[0] && r[0] !== ''; })
      .map(function(r){ try { return JSON.parse(r[0]); } catch(e){ return null; } })
      .filter(function(i){ return i !== null; });
  } catch(err) { logError('getSheetData:' + sheetName, err); return []; }
}

function saveToSheet(sheetName, data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return null;
  if (!data.id) data.id = Utilities.getUuid();
  if (!data.created_at) data.created_at = new Date().toISOString();
  data.updated_at = new Date().toISOString();
  sheet.appendRow([JSON.stringify(data)]);
  return data;
}

function updateInSheet(sheetName, id, updates) {
  // 🟢 ซ่อมแซมวิกฤต: ดึงสะพานเชื่อมชีตให้มั่นคงและรองรับคำสั่งตรวจสอบความปลอดภัยของ Google App ยุคใหม่
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return null;
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return null;
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  
  var rows = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < rows.length; i++) {
    try {
      var obj = JSON.parse(rows[i][0]);
      if (obj.id === id) {
        Object.keys(updates).forEach(function(k){ obj[k] = updates[k]; });
        obj.updated_at = new Date().toISOString();
        sheet.getRange(i + 2, 1).setValue(JSON.stringify(obj));
        return obj;
      }
    } catch(e){}
  }
  return null;
}

function deleteFromSheet(sheetName, id, hard) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return false;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  var rows = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = rows.length - 1; i >= 0; i--) {
    try {
      var obj = JSON.parse(rows[i][0]);
      if (obj.id === id) {
        if (hard) { sheet.deleteRow(i + 2); }
        else { obj.active = false; obj.updated_at = new Date().toISOString(); sheet.getRange(i + 2, 1).setValue(JSON.stringify(obj)); }
        return true;
      }
    } catch(e){}
  }
  return false;
}

function getConfig() {
  try {
    var c = getSheetData('Config');
    var configObject = {};
    
    if (c && c.length > 0) {
      configObject = c[0];
    } else {
      configObject = { 
        app_name: CONFIG.APP_NAME, 
        app_version: CONFIG.APP_VERSION,
        app_logo: '',
        organization_name: 'RD'
      };
    }
    
    return {
      success: true,
      data: configObject,              // รองรับหน้าบ้านที่เรียกผ่าน res.data.app_name
      app_name: configObject.app_name,   // รองรับหน้าบ้านที่เรียกผ่าน res.app_name โดยตรง
      app_version: configObject.app_version || CONFIG.APP_VERSION,
      app_logo: configObject.app_logo || '',
      organization_name: configObject.organization_name || ''
    };
  } catch(err) {
    return {
      success: true,
      data: { app_name: CONFIG.APP_NAME },
      app_name: CONFIG.APP_NAME
    };
  }
}

function generateRunningNumber(prefix, sheetName) {
  var count = getSheetData(sheetName).length + 1;
  var thaiYear = new Date().getFullYear() + 543;
  return prefix + '-' + thaiYear + '-' + String(count).padStart(4, '0');
}

function hashPassword(password) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + CONFIG.SALT,
    Utilities.Charset.UTF_8
  );
  return bytes.map(function(b){ return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function verifyPassword(plain, hashed) {
  return hashPassword(plain) === hashed;
}

function logError(fnName, err) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Errors');
    if (!sheet) return;
    var data = { id: Utilities.getUuid(), function_name: fnName,
      error_message: err.message || String(err), stack_trace: err.stack || '',
      created_at: new Date().toISOString() };
    sheet.appendRow([JSON.stringify(data)]);
    console.error('[' + fnName + ']', err);
  } catch(e){}
}

// ===== MULTI-ITEM WITHDRAW OVERRIDE =====
function addWithdrawal(token, wdData) {
  try {
    var session = validateSession(token);
    if (!session) return { success: false, message: 'กรุณาเข้าสู่ระบบใหม่' };

    var requestedItems = [];
    if (wdData && Array.isArray(wdData.items) && wdData.items.length > 0) {
      requestedItems = wdData.items;
    } else if (wdData && wdData.item_id) {
      requestedItems = [{ item_id: wdData.item_id, quantity: wdData.quantity }];
    }

    if (!requestedItems.length) {
      return { success: false, message: 'กรุณาเลือกรายการวัสดุอย่างน้อย 1 รายการ' };
    }

    var items = getSheetData('Items');
    var merged = {};

    requestedItems.forEach(function(req) {
      var itemId = req.item_id || '';
      var qty = parseInt(req.quantity, 10) || 0;
      if (!itemId || qty <= 0) return;
      if (!merged[itemId]) merged[itemId] = { quantity: 0 };
      merged[itemId].quantity += qty;
    });

    var selected = [];
    Object.keys(merged).forEach(function(itemId) {
      var item = null;
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === itemId) { item = items[i]; break; }
      }
      if (!item) throw new Error('ไม่พบรายการวัสดุบางรายการ');
      var qty = merged[itemId].quantity;
      if (!qty || qty <= 0) throw new Error('กรุณาระบุจำนวนให้ถูกต้อง');
      if (qty > item.current_stock) {
        throw new Error('จำนวนที่ขอเกินสต็อกคงเหลือสำหรับ "' + item.name + '"');
      }
      selected.push({ item: item, quantity: qty });
    });

    if (!selected.length) {
      return { success: false, message: 'กรุณาเลือกรายการวัสดุอย่างน้อย 1 รายการ' };
    }

    var wdNo = generateRunningNumber('WD', 'Withdrawals');
    var now = new Date().toISOString();
    var groupId = Utilities.getUuid();

    selected.forEach(function(entry) {
      var item = entry.item;
      var qty = entry.quantity;
      var wd = {
        id: Utilities.getUuid(),
        withdraw_no: wdNo,
        request_group: groupId,
        item_id: item.id,
        item_name: item.name,
        item_code: item.item_code,
        item_type: item.item_type || entry.item_type || 'consumable',
        quantity: qty,
        quantity_requested: qty,
        quantity_approved: 0,
        unit: item.unit,
        purpose: wdData.purpose || '',
        note: wdData.note || '',
        status: 'pending',
        requested_by: session.user_id,
        requested_by_name: session.name,
        requested_at: now,
        approved_by: '',
        approved_by_name: '',
        approved_at: '',
        reject_reason: '',
        via_qr: wdData.via_qr || false
      };
      saveToSheet('Withdrawals', wd);
    });

    var summary = selected.map(function(entry) {
      return entry.item.name + ' x' + entry.quantity + ' ' + entry.item.unit;
    }).join('\n');

    sendTelegram('<b>คำขอเบิกใหม่</b> #' + wdNo
      + '\nรายการ: ' + selected.length + ' รายการ'
      + '\n' + summary
      + '\nผู้ขอ: ' + session.name + ' (' + CONFIG.USER_ROLES[session.role].name + ')'
      + '\nวัตถุประสงค์: ' + (wdData.purpose || '-'));

    return {
      success: true,
      message: 'ยื่นคำขอเบิกเรียบร้อย รอการอนุมัติ',
      withdraw_no: wdNo,
      items_count: selected.length
    };
  } catch(err) {
    logError('addWithdrawal', err);
    return { success: false, message: err.message };
  }
}
