// ============================================================
// Mock API — localStorage backend (works offline, no GAS needed)
// ============================================================
(function() {

  // ===== Helpers =====
  var _mockRoot = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
  var _mockStorage = typeof localStorage !== 'undefined' ? localStorage : null;
  function _get(key) {
    if (!_mockStorage) return null;
    try { return JSON.parse(_mockStorage.getItem('sup_mock_' + key) || 'null'); } catch(e) { return null; }
  }
  function _set(key, val) { if (_mockStorage) _mockStorage.setItem('sup_mock_' + key, JSON.stringify(val)); }
  function _ensure(key, defaultVal) { if (_get(key) === null) _set(key, defaultVal); return _get(key); }
  var _idCounter = _get('id_counter') || 100;
  function _nextId() { _idCounter++; _set('id_counter', _idCounter); return 'id_' + _idCounter; }
  function _now() { return new Date().toISOString(); }
  function _today() { return new Date().toISOString().split('T')[0]; }
  function _auth(token) {
    var users = _get('users') || [];
    return users.find(function(u){ return u.token === token && u.token; }) || null;
  }

  // ===== Seed Data =====
  function seed() {
    if (_get('seeded')) return;

    // Users
    var users = [
      { id:'u1', username:'admin', password:'123456', name:'ผู้ดูแลระบบ', email:'admin@test.com', phone:'0811111111', role:'admin', active:true, last_login:null, avatar:'', telegram_chat_id:'', token:'tok_admin_' + Date.now() },
      { id:'u2', username:'staff', password:'123456', name:'เจ้าหน้าที่คลัง', email:'staff@test.com', phone:'0822222222', role:'staff', active:true, last_login:null, avatar:'', telegram_chat_id:'', token:'tok_staff_' + Date.now() },
      { id:'u3', username:'employee', password:'123456', name:'พนักงานตัวอย่าง', email:'emp@test.com', phone:'0833333333', role:'employee', active:true, last_login:null, avatar:'', telegram_chat_id:'', token:'tok_emp_' + Date.now() }
    ];
    _set('users', users);

    // Config
    _set('config', {
      app_name:'Requisition of consumables (Eng-RD) System',
      organization_name:'หน่วยงานตัวอย่าง',
      organization_address:'123 ถนนตัวอย่าง',
      organization_phone:'042-111-111',
      organization_email:'info@test.com',
      telegram_enabled:false,
      telegram_bot_token:'',
      telegram_chat_id:'',
      line_enabled:false,
      line_token:'',
      notification_recipients:'',
      notify_low_stock:true,
      notify_pending_approval:true,
      bridge_url:'',
      gas_endpoint:'',
      low_stock_threshold:5,
      app_logo:'',
      current_fiscal_year:2568
    });

    // Categories (consumable)
    var cats = [
      { id:'c1', name:'กระดาษ', is_active:true },
      { id:'c2', name:'ปากกา/ดินสอ', is_active:true },
      { id:'c3', name:'หมึกพิมพ์', is_active:true },
      { id:'c4', name:'อุปกรณ์สำนักงาน', is_active:true },
      { id:'c5', name:'อุปกรณ์ทำความสะอาด', is_active:true }
    ];
    _set('categories', cats);

    // Items (consumable)
    var items = [
      { id:'i1', item_code:'P001', name:'กระดาษ A4 80แกรม', category:'กระดาษ', unit:'รีม', current_stock:50, min_stock:10, description:'กระดาษถ่ายเอกสาร', image_file_id:'', active:true },
      { id:'i2', item_code:'P002', name:'กระดาษ A3 80แกรม', category:'กระดาษ', unit:'รีม', current_stock:8, min_stock:5, description:'', image_file_id:'', active:true },
      { id:'i3', item_code:'S001', name:'ปากกาลูกลื่น 0.5 มม.', category:'ปากกา/ดินสอ', unit:'โหล', current_stock:15, min_stock:5, description:'', image_file_id:'', active:true },
      { id:'i4', item_code:'S002', name:'ดินสอไม้ HB', category:'ปากกา/ดินสอ', unit:'โหล', current_stock:3, min_stock:5, description:'', image_file_id:'', active:true },
      { id:'i5', item_code:'I001', name:'หมึกพิมพ์ HP 205A Black', category:'หมึกพิมพ์', unit:'ตลับ', current_stock:6, min_stock:3, description:'', image_file_id:'', active:true },
      { id:'i6', item_code:'I002', name:'หมึกพิมพ์ Canon 745', category:'หมึกพิมพ์', unit:'ตลับ', current_stock:0, min_stock:2, description:'', image_file_id:'', active:true },
      { id:'i7', item_code:'O001', name:'เทปใส', category:'อุปกรณ์สำนักงาน', unit:'ม้วน', current_stock:20, min_stock:5, description:'', image_file_id:'', active:true },
      { id:'i8', item_code:'O002', name:'คลิปหนีบกระดาษ', category:'อุปกรณ์สำนักงาน', unit:'กล่อง', current_stock:12, min_stock:3, description:'', image_file_id:'', active:true },
      { id:'i9', item_code:'C001', name:'น้ำยาถูพื้น', category:'อุปกรณ์ทำความสะอาด', unit:'แกลลอน', current_stock:4, min_stock:2, description:'', image_file_id:'', active:true },
      { id:'i10', item_code:'C002', name:'ผ้าเช็ดมือม้วน', category:'อุปกรณ์ทำความสะอาด', unit:'ม้วน', current_stock:25, min_stock:10, description:'', image_file_id:'', active:true }
    ];
    _set('items', items);

    // Receives
    var receives = [
      { id:'r1', item_id:'i1', quantity:100, date:'2025-05-01', note:'ซื้อเพิ่ม', created_at:'2025-05-01T10:00:00Z' },
      { id:'r2', item_id:'i3', quantity:20, date:'2025-05-02', note:'', created_at:'2025-05-02T10:00:00Z' }
    ];
    _set('receives', receives);

    // Withdrawals
    var withdrawals = [
      { id:'w1', withdraw_no:'WD0001', item_id:'i1', item_name:'กระดาษ A4 80แกรม', item_code:'P001', quantity:10, quantity_requested:10, quantity_approved:0, unit:'รีม', user_id:'u3', user_name:'พนักงานตัวอย่าง', requested_by:'u3', requested_by_name:'พนักงานตัวอย่าง', requested_at:'2025-05-10T09:00:00Z', date:'2025-05-10', status:'pending', note:'', purpose:'ใช้งานทั่วไป', approved_by:'', approved_by_name:'', approved_at:'', reject_reason:'', via_qr:false, created_at:'2025-05-10T09:00:00Z' },
      { id:'w2', withdraw_no:'WD0002', item_id:'i5', item_name:'หมึกพิมพ์ HP 205A Black', item_code:'I001', quantity:2, quantity_requested:2, quantity_approved:2, unit:'ตลับ', user_id:'u3', user_name:'พนักงานตัวอย่าง', requested_by:'u3', requested_by_name:'พนักงานตัวอย่าง', requested_at:'2025-05-12T09:00:00Z', date:'2025-05-12', status:'approved', note:'อนุมัติแล้ว', purpose:'เครื่องพิมพ์ชั้น 2', approved_by:'admin', approved_by_name:'ผู้ดูแลระบบ', approved_at:'2025-05-12T10:00:00Z', reject_reason:'', via_qr:false, created_at:'2025-05-12T09:00:00Z' }
    ];
    _set('withdrawals', withdrawals);

    // Transactions
    var tx = [
      { id:'t1', type:'receive', item_id:'i1', item_name:'กระดาษ A4 80แกรม', quantity:100, date:'2025-05-01', note:'ซื้อเพิ่ม', user_name:'admin', created_at:'2025-05-01T10:00:00Z' },
      { id:'t2', type:'withdraw', item_id:'i5', item_name:'หมึกพิมพ์ HP 205A Black', quantity:2, date:'2025-05-12', note:'อนุมัติแล้ว', user_name:'พนักงานตัวอย่าง', created_at:'2025-05-12T10:00:00Z' }
    ];
    _set('transactions', tx);

    _set('seeded', true);
  }
  seed();

  // ===== Mock API =====
  _mockRoot._mockAPI = {

    // --- Auth ---
    login: function(username, password, role) {
      var users = _get('users') || [];
      var u = users.find(function(x){ return x.username === username && x.password === password; });
      if (!u) return { success:false, message:'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
      if (u.role !== role) return { success:false, message:'บทบาทไม่ตรงกับบัญชีผู้ใช้' };
      u.token = 'tok_' + u.id + '_' + Date.now();
      u.last_login = _now();
      _set('users', users);
      return { success:true, message:'เข้าสู่ระบบสำเร็จ', token:u.token, user:{ id:u.id, username:u.username, role:u.role, name:u.name } };
    },
    logout: function(token) { return { success:true }; },
    validateSession: function(token) {
      var u = _auth(token);
      if (!u) return null;
      return { user_id:u.id, username:u.username, role:u.role, name:u.name };
    },
    forgotPassword: function(email) {
      return { success:true, message:'รหัสผ่านชั่วคราว: 123456 ( Mock )' };
    },

    // --- Dashboard ---
    getDashboardStats: function(token) {
      var items = _get('items') || [];
      var withdrawals = _get('withdrawals') || [];
      var receives = _get('receives') || [];
      var today = _today();
      var lowItems = items.filter(function(i){ return i.active !== false && i.current_stock <= i.min_stock; });
      var todayTx = (receives.filter(function(r){ return r.date === today; }).length) + (withdrawals.filter(function(w){ return w.date === today && w.status==='approved'; }).length);
      var pending = withdrawals.filter(function(w){ return w.status === 'pending'; }).length;
      var typeById = {};
      var typeByName = {};
      items.forEach(function(i) {
        var type = String(i.category || '').trim().indexOf('หมวด') === 0 ? 'consumable' : 'spare_part';
        typeById[i.id] = type;
        typeByName[String(i.name || '').trim().toLowerCase()] = type;
      });

      // Monthly stats (last 6 months)
      var labels = [], received = [], withdrawn = [];
      var typeStats = {
        consumable: { labels: [], received: [], withdrawn: [], category: {} },
        spare_part: { labels: [], received: [], withdrawn: [], category: {} }
      };
      for (var i=5; i>=0; i--) {
        var d = new Date(); d.setMonth(d.getMonth()-i);
        var ym = d.toISOString().slice(0,7);
        var label = d.toLocaleDateString('th-TH', {month:'short'});
        labels.push(label);
        received.push(receives.filter(function(r){ return r.date && r.date.startsWith(ym); }).reduce(function(s,r){ return s+r.quantity; },0));
        withdrawn.push(withdrawals.filter(function(w){ return w.date && w.date.startsWith(ym) && w.status==='approved'; }).reduce(function(s,w){ return s+w.quantity; },0));
        typeStats.consumable.labels.push(label);
        typeStats.consumable.received.push(receives.filter(function(r){ return r.date && r.date.startsWith(ym) && (typeById[r.item_id] || typeByName[String(r.item_name || '').trim().toLowerCase()] || 'consumable') === 'consumable'; }).reduce(function(s,r){ return s+r.quantity; },0));
        typeStats.consumable.withdrawn.push(withdrawals.filter(function(w){ return w.date && w.date.startsWith(ym) && w.status==='approved' && (typeById[w.item_id] || typeByName[String(w.item_name || '').trim().toLowerCase()] || 'consumable') === 'consumable'; }).reduce(function(s,w){ return s+w.quantity; },0));
        typeStats.spare_part.labels.push(label);
        typeStats.spare_part.received.push(receives.filter(function(r){ return r.date && r.date.startsWith(ym) && (typeById[r.item_id] || typeByName[String(r.item_name || '').trim().toLowerCase()] || 'consumable') === 'spare_part'; }).reduce(function(s,r){ return s+r.quantity; },0));
        typeStats.spare_part.withdrawn.push(withdrawals.filter(function(w){ return w.date && w.date.startsWith(ym) && w.status==='approved' && (typeById[w.item_id] || typeByName[String(w.item_name || '').trim().toLowerCase()] || 'consumable') === 'spare_part'; }).reduce(function(s,w){ return s+w.quantity; },0));
      }

      // Category stats for items
      var catMap = {};
      var catByType = { consumable: {}, spare_part: {} };
      items.forEach(function(i){
        if(i.active!==false){
          var type = String(i.category || '').trim().indexOf('หมวด') === 0 ? 'consumable' : 'spare_part';
          var qty = i.current_stock || 0;
          catMap[i.category] = (catMap[i.category]||0)+qty;
          catByType[type][i.category] = (catByType[type][i.category]||0)+qty;
        }
      });

      return {
        success:true,
        kpi:{ total_items: items.filter(function(i){ return i.active!==false; }).length, low_stock: lowItems.length, pending: pending, today_tx: todayTx },
        low_stock_items: lowItems,
        monthly_stats: { labels:labels, received:received, withdrawn:withdrawn },
        category_stats: { labels:Object.keys(catMap), data:Object.values(catMap) },
        wd_trend: { labels:labels, data:withdrawn },
        wd_by_category: { labels:Object.keys(catMap), data:Object.values(catMap).map(function(){ return 0; }) },
        monthly: labels.map(function(l, idx){ return { label:l, receive:received[idx], withdraw:withdrawn[idx] }; }),
        type_stats: {
          consumable: {
            monthly: typeStats.consumable.labels.map(function(l, idx){ return { label:l, receive:typeStats.consumable.received[idx], withdraw:typeStats.consumable.withdrawn[idx] }; }),
            category_stock: catByType.consumable
          },
          spare_part: {
            monthly: typeStats.spare_part.labels.map(function(l, idx){ return { label:l, receive:typeStats.spare_part.received[idx], withdraw:typeStats.spare_part.withdrawn[idx] }; }),
            category_stock: catByType.spare_part
          }
        }
      };
    },

    // --- Items ---
    getItems: function(token) { return { success:true, data: _get('items') || [] }; },
    addItem: function(token, data) {
      var items = _get('items') || [];
      data.id = _nextId(); data.active = true; data.current_stock = data.current_stock || 0;
      items.push(data);
      _set('items', items);
      _addTx('receive', data.id, data.name, data.current_stock || 0, _today(), 'เพิ่มรายการใหม่', _auth(token).name);
      return { success:true, message:'เพิ่มรายการสำเร็จ' };
    },
    updateItem: function(token, id, data) {
      var items = _get('items') || [];
      var idx = items.findIndex(function(i){ return i.id === id; });
      if (idx === -1) return { success:false, message:'ไม่พบรายการ' };
      Object.keys(data).forEach(function(k){ items[idx][k] = data[k]; });
      _set('items', items);
      return { success:true, message:'บันทึกสำเร็จ' };
    },
    deleteItem: function(token, id) {
      var items = _get('items') || [];
      var idx = items.findIndex(function(i){ return i.id === id; });
      if (idx === -1) return { success:false, message:'ไม่พบรายการ' };
      items[idx].active = false;
      _set('items', items);
      return { success:true, message:'ลบรายการสำเร็จ' };
    },
    uploadFile: function(token, base64, mimeType, fileName) {
      var dataUrl = 'data:' + mimeType + ';base64,' + base64;
      return { success:true, file_id: dataUrl };
    },

    // --- Receives ---
    getReceives: function(token) { return { success:true, data: _get('receives') || [] }; },
    addReceive: function(token, data) {
      var recs = _get('receives') || [];
      var items = _get('items') || [];
      var item = items.find(function(i){ return i.id === data.item_id; });
      if (!item) return { success:false, message:'ไม่พบรายการวัสดุ' };
      data.id = _nextId();
      data.created_at = _now();
      recs.push(data);
      _set('receives', recs);
      item.current_stock = (item.current_stock || 0) + (data.quantity || 0);
      _set('items', items);
      _addTx('receive', item.id, item.name, data.quantity, data.date, data.note, _auth(token).name);
      return { success:true, message:'รับเข้าสำเร็จ' };
    },

    // --- Withdrawals ---
    getWithdrawals: function(token, filter) {
      var wd = _get('withdrawals') || [];
      if (filter && filter.status && filter.status !== 'all') {
        wd = wd.filter(function(w){ return w.status === filter.status; });
      }
      return { success:true, data: wd };
    },
    addWithdrawal: function(token, data) {
      var wd = _get('withdrawals') || [];
      var items = _get('items') || [];
      var item = items.find(function(i){ return i.id === data.item_id; });
      if (!item) return { success:false, message:'ไม่พบรายการวัสดุ' };
      if (item.current_stock < data.quantity) return { success:false, message:'สต็อกไม่เพียงพอ (คงเหลือ ' + item.current_stock + ')' };
      var no = 'WD' + String(wd.length + 1).padStart(4, '0');
      var u = _auth(token);
      var record = {
        id: _nextId(), item_id:data.item_id, user_id:u.id, user_name:u.name,
        quantity:data.quantity, date:_today(), status:'pending', note:data.note||'',
        purpose:data.purpose||'', approved_by:'', approved_at:'', withdraw_no:no,
        created_at:_now()
      };
      wd.push(record);
      _set('withdrawals', wd);
      return { success:true, message:'ยื่นคำขอสำเร็จ', withdraw_no:no };
    },
    approveWithdrawal: function(token, wdId, qty) {
      var wd = _get('withdrawals') || [];
      var items = _get('items') || [];
      var idx = wd.findIndex(function(w){ return w.id === wdId; });
      if (idx === -1) return { success:false, message:'ไม่พบคำขอ' };
      var w = wd[idx];
      var item = items.find(function(i){ return i.id === w.item_id; });
      if (!item) return { success:false, message:'ไม่พบรายการวัสดุ' };
      if (item.current_stock < w.quantity) return { success:false, message:'สต็อกไม่เพียงพอ' };
      item.current_stock -= w.quantity;
      w.status = 'approved'; w.approved_by = _auth(token).name; w.approved_at = _now();
      _set('withdrawals', wd);
      _set('items', items);
      _addTx('withdraw', item.id, item.name, w.quantity, w.date, w.note, w.user_name);
      return { success:true, message:'อนุมัติสำเร็จ' };
    },
    rejectWithdrawal: function(token, wdId, reason) {
      var wd = _get('withdrawals') || [];
      var idx = wd.findIndex(function(w){ return w.id === wdId; });
      if (idx === -1) return { success:false, message:'ไม่พบคำขอ' };
      wd[idx].status = 'rejected'; wd[idx].note = reason || ''; wd[idx].approved_at = _now();
      _set('withdrawals', wd);
      return { success:true, message:'ปฏิเสธคำขอแล้ว' };
    },

    // --- Transactions ---
    getTransactions: function(token) { return { success:true, data: _get('transactions') || [] }; },

    // --- Users ---
    getUsers: function(token) {
      return { success:true, data: (_get('users') || []).map(function(u){ return Object.assign({}, u, { password_mask:'••••••••' }); }) };
    },
    addUser: function(token, data) {
      var users = _get('users') || [];
      if (users.find(function(u){ return u.username === data.username; })) return { success:false, message:'Username นี้มีอยู่แล้ว' };
      data.id = _nextId(); data.active = true; data.last_login = null; data.avatar = ''; data.telegram_chat_id = '';
      users.push(data);
      _set('users', users);
      return { success:true, message:'เพิ่มผู้ใช้สำเร็จ' };
    },
    updateUser: function(token, id, data) {
      var users = _get('users') || [];
      var idx = users.findIndex(function(u){ return u.id === id; });
      if (idx === -1) return { success:false, message:'ไม่พบผู้ใช้' };
      Object.keys(data).forEach(function(k){ users[idx][k] = data[k]; });
      if (data.password) users[idx].password = data.password;
      _set('users', users);
      return { success:true, message:'บันทึกสำเร็จ' };
    },
    resetUserPassword: function(token, userId) {
      var users = _get('users') || [];
      var u = users.find(function(x){ return x.id === userId; });
      if (!u) return { success:false, message:'ไม่พบผู้ใช้' };
      u.password = '123456';
      _set('users', users);
      return { success:true, message:'Reset รหัสผ่านสำเร็จ (รหัสผ่านใหม่: 123456)' };
    },
    toggleUserActive: function(token, userId) {
      var users = _get('users') || [];
      var u = users.find(function(x){ return x.id === userId; });
      if (!u) return { success:false, message:'ไม่พบผู้ใช้' };
      u.active = u.active === false ? true : false;
      _set('users', users);
      return { success:true, message:'เปลี่ยนสถานะสำเร็จ' };
    },
    changePassword: function(token, oldPass, newPass) {
      var u = _auth(token);
      if (!u) return { success:false, message:'ไม่พบผู้ใช้' };
      if (u.password !== oldPass) return { success:false, message:'รหัสผ่านเดิมไม่ถูกต้อง' };
      var users = _get('users') || [];
      var idx = users.findIndex(function(x){ return x.id === u.id; });
      users[idx].password = newPass;
      _set('users', users);
      return { success:true, message:'เปลี่ยนรหัสผ่านสำเร็จ' };
    },

    // --- Config ---
    getConfig: function(token) { return { success:true, data: _get('config') || {} }; },
    saveConfig: function(token, data) {
      var current = _get('config') || {};
      var merged = {};
      Object.keys(current).forEach(function(k){ merged[k] = current[k]; });
      Object.keys(data || {}).forEach(function(k){ if (typeof data[k] !== 'undefined') merged[k] = data[k]; });
      _set('config', merged);
      return { success:true, message:'บันทึกการตั้งค่าสำเร็จ' };
    },
    testTelegram: function(token) {
      return { success:true, message:'ส่งข้อความ Test สำเร็จ (Mock)' };
    }
  };

  function _addTx(type, itemId, itemName, qty, date, note, userName) {
    var tx = _get('transactions') || [];
    tx.push({ id:_nextId(), type:type, item_id:itemId, item_name:itemName, quantity:qty, date:date, note:note||'', user_name:userName||'', created_at:_now() });
    _set('transactions', tx);
  }

  _mockRoot._mockAPI.addWithdrawal = function(token, data) {
    var wd = _get('withdrawals') || [];
    var items = _get('items') || [];
    var authUser = _auth(token);
    if (!authUser) return { success:false, message:'กรุณาเข้าสู่ระบบใหม่' };

    var requested = [];
    if (data && Array.isArray(data.items) && data.items.length > 0) {
      requested = data.items;
    } else if (data && data.item_id) {
      requested = [{ item_id: data.item_id, quantity: data.quantity }];
    }

    var merged = {};
    requested.forEach(function(req) {
      var itemId = req.item_id || '';
      var qty = parseInt(req.quantity, 10) || 0;
      if (!itemId || qty <= 0) return;
      if (!merged[itemId]) merged[itemId] = 0;
      merged[itemId] += qty;
    });

    var selected = [];
    Object.keys(merged).forEach(function(itemId) {
      var item = items.find(function(i){ return i.id === itemId; });
      if (!item) throw new Error('ไม่พบรายการวัสดุ');
      if (item.current_stock < merged[itemId]) throw new Error('สต็อกไม่เพียงพอ (' + item.current_stock + ')');
      selected.push({ item:item, quantity: merged[itemId] });
    });

    if (!selected.length) return { success:false, message:'กรุณาเลือกรายการวัสดุอย่างน้อย 1 รายการ' };

    var no = 'WD' + String(wd.length + 1).padStart(4, '0');
    var now = _now();
    selected.forEach(function(entry) {
      var item = entry.item;
      wd.push({
        id:_nextId(),
        withdraw_no:no,
        request_group:no,
        item_id:item.id,
        item_name:item.name,
        item_code:item.item_code,
        quantity:entry.quantity,
        quantity_requested:entry.quantity,
        quantity_approved:0,
        unit:item.unit,
        user_id:authUser.id,
        user_name:authUser.name,
        requested_by:authUser.id,
        requested_by_name:authUser.name,
        requested_at:now,
        date:now.slice(0,10),
        status:'pending',
        note:data.note || '',
        purpose:data.purpose || '',
        approved_by:'',
        approved_by_name:'',
        approved_at:'',
        reject_reason:'',
        via_qr:!!data.via_qr,
        created_at:now
      });
    });
    _set('withdrawals', wd);
    return { success:true, message:'ยื่นคำขอสำเร็จ', withdraw_no:no, items_count:selected.length };
  };

})();

