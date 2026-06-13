// ============================================================
// app.js — Frontend (Static Site - วัสดุสิ้นเปลืองเท่านั้น)
// ============================================================

// callAPI ถูก define ใน api.js แล้ว

// ===== CONSTANTS =====
var ITEMS_PER_PAGE = 20;
var ROLE_LABELS = { admin: 'ผู้ดูแลระบบ', staff: 'เจ้าหน้าที่คลัง', employee: 'พนักงาน' };

// ===== URL PARAMS (for QR / Public) =====
var _QR_ACTION = '';
var _QR_ITEM_ID = '';

// ===== AUTH =====
var _hasBrowserWindow = typeof window !== 'undefined';
var _browserLocalStorage = _hasBrowserWindow && typeof localStorage !== 'undefined' ? localStorage : null;
var AUTH = {
  token: _browserLocalStorage ? (_browserLocalStorage.getItem('sup_token') || '') : '',
  user: _browserLocalStorage ? JSON.parse(_browserLocalStorage.getItem('sup_user') || 'null') : null,
  set: function(token, user) {
    AUTH.token = token; AUTH.user = user;
    if (_browserLocalStorage) {
      _browserLocalStorage.setItem('sup_token', token);
      _browserLocalStorage.setItem('sup_user', JSON.stringify(user));
    }
  },
  clear: function() {
    AUTH.token = ''; AUTH.user = null;
    if (_browserLocalStorage) {
      _browserLocalStorage.removeItem('sup_token');
      _browserLocalStorage.removeItem('sup_user');
    }
  },
  hasRole: function(roles) {
    if (!AUTH.user) return false;
    if (!Array.isArray(roles)) roles = [roles];
    return roles.indexOf(AUTH.user.role) !== -1;
  }
};

// ===== LOADING =====
function showLoading(text) {
  var el = document.getElementById('loadingText');
  var overlay = document.getElementById('loadingOverlay');
  if (el) el.textContent = text || 'กำลังโหลด...';
  if (overlay) overlay.classList.remove('hidden');
}
function hideLoading() {
  var overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.add('hidden');
}

// ===== ALERTS =====
function showSuccess(msg) { Swal.fire({ icon: 'success', title: 'สำเร็จ', text: msg, timer: 2000, showConfirmButton: false, customClass: { popup: 'swal2-popup' } }); }
function showError(msg)   { Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: msg, customClass: { popup: 'swal2-popup' } }); }
function showConfirm(title, text, cb, confirmText) {
  Swal.fire({
    title: title, text: text, icon: 'warning', showCancelButton: true,
    confirmButtonText: confirmText || 'ยืนยัน', cancelButtonText: 'ยกเลิก',
    reverseButtons: true, customClass: { popup: 'swal2-popup' }
  }).then(function(r) { if (r.isConfirmed) cb(); });
}

// ===== MODAL =====
function openModal(title, bodyHtml, footerHtml) {
  var titleEl = document.getElementById('modalTitle');
  var bodyEl = document.getElementById('modalBody');
  var footerEl = document.getElementById('modalFooter');
  var overlay = document.getElementById('modalOverlay');
  
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;
  if (footerEl) footerEl.innerHTML = footerHtml || '';
  if (overlay) overlay.classList.remove('hidden');
}
function closeModal() {
  var overlay = document.getElementById('modalOverlay');
  var bodyEl = document.getElementById('modalBody');
  var footerEl = document.getElementById('modalFooter');
  
  if (overlay) overlay.classList.add('hidden');
  if (bodyEl) bodyEl.innerHTML = '';
  if (footerEl) footerEl.innerHTML = '';
}

// ===== UTILITIES =====
function formatDate(iso) {
  if (!iso) return '-';
  var d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}
function formatDateTime(iso) {
  if (!iso) return '-';
  var d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function togglePass(inputId, btn) {
  var inp = document.getElementById(inputId);
  if (!inp) return;
  var isPass = inp.type === 'password';
  inp.type = isPass ? 'text' : 'password';
  var icon = btn.querySelector('i');
  if (icon) {
    icon.className = isPass ? 'fi fi-rr-eye-crossed text-sm' : 'fi fi-rr-eye text-sm';
  }
}
function getStockClass(stock, min) {
  if (stock <= 0) return 'stock-critical';
  if (stock <= min) return 'stock-low';
  return 'stock-ok';
}
function getStockLabel(stock, min) {
  if (stock <= 0) return 'หมด';
  if (stock <= min) return 'ใกล้หมด';
  return 'ปกติ';
}
function imgUrl(fileId, size) {
  if (!fileId) return '';
  return getFileDataUrl(fileId) || '';
}

// ===== PAGINATION =====
function renderPagination(containerId, total, currentPage, onPageClick) {
  var container = document.getElementById(containerId);
  if (!container) return;
  
  var totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  var html = '<div class="flex items-center justify-between mt-4">';
  html += '<p class="text-xs text-gray-500">ทั้งหมด ' + total + ' รายการ</p>';
  html += '<div class="flex gap-1">';
  if (currentPage > 1) html += '<button class="page-btn" onclick="(' + onPageClick + ')(' + (currentPage - 1) + ')"><i class="fi fi-rr-angle-left"></i></button>';
  var start = Math.max(1, currentPage - 2), end = Math.min(totalPages, currentPage + 2);
  for (var p = start; p <= end; p++) {
    html += '<button class="page-btn ' + (p === currentPage ? 'active' : '') + '" onclick="(' + onPageClick + ')(' + p + ')">' + p + '</button>';
  }
  if (currentPage < totalPages) html += '<button class="page-btn" onclick="(' + onPageClick + ')(' + (currentPage + 1) + ')"><i class="fi fi-rr-angle-right"></i></button>';
  html += '</div></div>';
  container.innerHTML = html;
}

// ===== LOGIN =====
function setLoginRole(role) {
  var roleInput = document.getElementById('loginRole');
  if (roleInput) roleInput.value = role || '';
}

function doLogin() {
  var usernameEl = document.getElementById('loginUsername');
  var passwordEl = document.getElementById('loginPassword');
  
  var username = usernameEl ? usernameEl.value.trim() : '';
  var password = passwordEl ? passwordEl.value : '';
  
  if (!username || !password) { showError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'); return; }
  var btn = document.getElementById('btnLogin');
  if (btn) {
    btn.disabled = true; btn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> กำลังเข้าสู่ระบบ...';
  }
  
  // ส่งค่า role เป็นค่าว่าง เพื่อให้ Backend ตรวจสอบสิทธิ์ที่แท้จริงจากฐานข้อมูลเอง
  callAPI('login', username, password, '').then(function(res) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fi fi-rr-sign-in"></i> เข้าสู่ระบบ'; }
    if (res.success) {
      AUTH.set(res.token, res.user);
      initApp(); // เมื่อรันฟังก์ชันนี้ showMainShell() จะจัดการเปิด/ปิดเมนูตามสิทธิ์ที่ได้มาทันที
    } else { showError(res.message); }
  }).catch(function(err) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fi fi-rr-sign-in"></i> เข้าสู่ระบบ'; }
    showError('ไม่สามารถเชื่อมต่อระบบได้');
  });
} // 🟢 เพิ่มปีกกาปิดตัวนี้ เพื่อจบฟังก์ชัน doLogin อย่างถูกต้อง

function doLogout() {
  showConfirm('ออกจากระบบ', 'ต้องการออกจากระบบใช่หรือไม่?', function() {
    showLoading('กำลังออกจากระบบ...');
    callAPI('logout', AUTH.token).then(function() {
      AUTH.clear(); 
      location.reload(); // บังคับล้างสถานะและส่งกลับหน้า Login ทันที
    }).catch(function() {
      // กรณีเน็ตหลุดหรือติดต่อเซิร์ฟเวอร์ไม่ได้ ก็ต้องบังคับล้างในเครื่องทิ้ง
      AUTH.clear();
      location.reload();
    });
  }, 'ออกจากระบบ');
}

function showForgotModal()  { var el = document.getElementById('forgotModal'); if (el) el.classList.remove('hidden'); }
function closeForgotModal() { var el = document.getElementById('forgotModal'); if (el) el.classList.add('hidden'); }
function submitForgotPassword() {
  var emailEl = document.getElementById('forgotEmail');
  var email = emailEl ? emailEl.value.trim() : '';
  if (!email) { showError('กรุณากรอกอีเมล'); return; }
  showLoading('กำลังส่งรหัสผ่านชั่วคราว...');
  callAPI('forgotPassword', email).then(function(res) {
    hideLoading(); closeForgotModal();
    if (res.success) showSuccess(res.message);
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

// ===== APP INIT =====
function initApp() {
  showLoading('กำลังตรวจสอบสิทธิ์...');
  callAPI('validateSession', AUTH.token).then(function(session) {
    hideLoading();
    if (!session) { AUTH.clear(); showLoginPage(); return; }
    AUTH.user = { id: session.user_id, username: session.username, role: session.role, name: session.name };
    localStorage.setItem('sup_user', JSON.stringify(AUTH.user));
    showMainShell();
    loadPage('dashboard');
    
    // QR action จาก URL ของวัสดุสิ้นเปลือง
    if (_QR_ACTION === 'withdraw' && _QR_ITEM_ID) {
      setTimeout(function() { openWithdrawFromQR(_QR_ITEM_ID); }, 800);
    }
  }).catch(function() { hideLoading(); showLoginPage(); });
}

function showLoginPage() {
  var lp = document.getElementById('loginPage');
  var ms = document.getElementById('mainShell');
  if (lp) lp.classList.remove('hidden');
  if (ms) ms.classList.add('hidden');
}

function _setElementDisplay(id, displayStyle) {
  var el = document.getElementById(id);
  if (el) el.style.display = displayStyle;
}

function showMainShell() {
  var lp = document.getElementById('loginPage');
  var ms = document.getElementById('mainShell');
  var sbName = document.getElementById('sidebarName');
  var sbRole = document.getElementById('sidebarRole');
  
  if (lp) lp.classList.add('hidden');
  if (ms) ms.classList.remove('hidden');
  if (sbName) sbName.textContent = AUTH.user.name || AUTH.user.username;
  if (sbRole) sbRole.textContent = ROLE_LABELS[AUTH.user.role] || AUTH.user.role;
  
  var isAdmin = AUTH.user.role === 'admin';
  var notEmp  = AUTH.user.role !== 'employee';
  
  // จัดการการแสดงผลเมนู ฝั่งวัสดุสิ้นเปลืองและผู้ใช้เท่านั้น (ถอด Asset ทั้งหมด)
  _setElementDisplay('menuItems', isAdmin ? '' : 'none');
  _setElementDisplay('menuReceive', notEmp ? '' : 'none');
  _setElementDisplay('menuStocktake', notEmp ? '' : 'none');
  _setElementDisplay('menuPrintQR', notEmp ? '' : 'none');
  _setElementDisplay('menuInventorySection', notEmp ? '' : 'none');
  _setElementDisplay('menuApprove', isAdmin ? '' : 'none');
  _setElementDisplay('menuAdminSection', isAdmin ? '' : 'none');
  _setElementDisplay('menuReportLabel', notEmp ? '' : 'none');
  _setElementDisplay('menuReportSection', notEmp ? '' : 'none');
  
  initMenuSections();
  updateClock();
  setInterval(updateClock, 60000);
}

function updateClock() {
  var el = document.getElementById('topDateTime');
  if (el) el.textContent = new Date().toLocaleString('th-TH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ===== NAVIGATION =====
var _currentPage = '';

function loadPage(page) {
  _currentPage = page;
  document.querySelectorAll('.menu-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.getAttribute('data-page') === page);
  });
  expandActiveMenuSection(page);
  
  var titles = {
    dashboard: 'ภาพรายงานระบบ', stock: 'สต็อกคงเหลือ', items: 'รายการวัสดุ',
    receive: 'รับวัสดุเข้าคลัง', stocktake: 'นับสต็อก', printqr: 'พิมพ์ QR สติ๊กเกอร์', withdraw: 'เบิกวัสดุ', approve: 'อนุมัติการเบิก',
    transactions: 'ประวัติเคลื่อนไหว', reports: 'รายงาน',
    users: 'จัดการผู้ใช้งาน', profile: 'โปรไฟล์',
  };
  
  var pageTitleEl = document.getElementById('pageTitle');
  if (pageTitleEl) pageTitleEl.textContent = titles[page] || page;
  
  // ตัดโครงสร้าง Breadcrumbs คอนฟิกออก ป้องกันปัญหาการพยายามเข้าถึง Element ที่ไม่มีอยู่จริง
  
  var sidebar = document.getElementById('sidebar');
  var sidebarOverlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (sidebarOverlay) sidebarOverlay.classList.add('hidden');
  
  var content = document.getElementById('mainContent');
  if (content) {
    content.innerHTML = '<div class="flex items-center justify-center py-16"><div class="w-8 h-8 border-4 border-navy-600 border-t-transparent rounded-full animate-spin"></div></div>';
  }
  
  if (page === 'dashboard')      renderDashboard();
  else if (page === 'stock')     renderStock();
  else if (page === 'items')     renderItems();
  else if (page === 'receive')   renderReceive();
  else if (page === 'stocktake') renderStocktake();
  else if (page === 'printqr')   renderPrintQRLabels();
  else if (page === 'withdraw')  renderWithdraw();
  else if (page === 'approve')   renderApprove();
  else if (page === 'transactions') renderTransactions();
  else if (page === 'reports')   renderReports();
  else if (page === 'users')     renderUsers();
  else if (page === 'profile')   renderProfile();
}

function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  var sidebarOverlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (sidebarOverlay) sidebarOverlay.classList.toggle('hidden');
}

function toggleMenuSection(section) {
  var group = document.querySelector('.menu-group[data-section="' + section + '"]');
  if (!group) return;
  var collapsed = group.classList.toggle('collapsed');
  var state = JSON.parse(localStorage.getItem('menu_collapsed') || '{}');
  state[section] = collapsed;
  localStorage.setItem('menu_collapsed', JSON.stringify(state));
}

function initMenuSections() {
  var state = JSON.parse(localStorage.getItem('menu_collapsed') || '{}');
  document.querySelectorAll('.menu-group').forEach(function(group) {
    var section = group.getAttribute('data-section');
    if (state[section]) group.classList.add('collapsed');
    else group.classList.remove('collapsed');
  });
}

function expandActiveMenuSection(page) {
  var map = {
    dashboard: 'main', stock: 'main',
    items: 'inventory', receive: 'inventory', stocktake: 'inventory', printqr: 'inventory',
    withdraw: 'withdraw', approve: 'withdraw', transactions: 'withdraw',
    reports: 'report', users: 'admin', profile: 'main'
  };
  var section = map[page];
  if (!section) return;
  var group = document.querySelector('.menu-group[data-section="' + section + '"]');
  if (group) group.classList.remove('collapsed');
}
// จบฟังก์ชันเพียงเท่านี้ ไม่ต้องมี var sections...

// ===== GLOBAL SEARCH (วัสดุสิ้นเปลืองเท่านั้น) =====
var _globalSearchTimer;
function debounceGlobalSearch() {
  clearTimeout(_globalSearchTimer);
  _globalSearchTimer = setTimeout(performGlobalSearch, 300);
}
function performGlobalSearch() {
  var searchInput = document.getElementById('globalSearch');
  var resultsDiv = document.getElementById('globalSearchResults');
  if (!searchInput || !resultsDiv) return;
  
  var q = searchInput.value || '';
  if (!q || q.length < 2) { resultsDiv.classList.add('hidden'); return; }
  var term = q.toLowerCase();
  var matches = [];
  
  (_itemsData || []).forEach(function(i) {
    if (i.active === false) return;
    if ((i.name || '').toLowerCase().includes(term) || (i.item_code || '').toLowerCase().includes(term) || (i.category || '').toLowerCase().includes(term)) {
      matches.push({ type: 'item', id: i.id, name: i.name, code: i.item_code, sub: 'คงเหลือ ' + (i.current_stock || 0) + ' ' + (i.unit || ''), image: i.image_file_id });
    }
  });
  
  matches = matches.slice(0, 10);
  if (matches.length === 0) { resultsDiv.classList.add('hidden'); return; }
  var html = '';
  matches.forEach(function(m) {
    var iconClass = 'fi fi-rr-box-open-full';
    var label = 'วัสดุ';
    var imgHtml = m.image ? '<img src="' + imgUrl(m.image) + '" class="w-8 h-8 object-cover rounded-lg border border-gray-200" loading="lazy">' : '<div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center"><i class="' + iconClass + ' text-gray-400 text-xs"></i></div>';
    html += '<div class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0" onclick="globalSearchGoTo(\'' + m.id + '\',\'' + m.type + '\')">';
    html += imgHtml;
    html += '<div class="flex-1 min-w-0"><p class="text-sm font-medium text-gray-800 truncate">' + escHtml(m.name) + '</p>';
    html += '<p class="text-xs text-gray-500">' + escHtml(m.code || '') + ' • ' + escHtml(m.sub) + ' <span class="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">' + label + '</span></p></div>';
    html += '<i class="fi fi-rr-angle-right text-gray-400 text-xs"></i></div>';
  });
  resultsDiv.innerHTML = html;
  resultsDiv.classList.remove('hidden');
}
function globalSearchGoTo(id, type) {
  var searchInput = document.getElementById('globalSearch');
  var resultsDiv = document.getElementById('globalSearchResults');
  if (searchInput) searchInput.value = '';
  if (resultsDiv) resultsDiv.classList.add('hidden');
  showItemDetailModal(id);
}
if (_hasBrowserWindow) {
  window.addEventListener('click', function(e) {
    var gs = document.getElementById('globalSearch');
    var gr = document.getElementById('globalSearchResults');
    if (gs && gr && !gs.contains(e.target) && !gr.contains(e.target)) {
      gr.classList.add('hidden');
    }
  });
}

// ===== DASHBOARD =====
var _charts = {};

function renderDashboard() {
  showLoading('โหลดข้อมูล Dashboard...');
  Promise.all([
    callAPI('getDashboardStats', AUTH.token),
    callAPI('getWithdrawals', AUTH.token, { status: 'approved' })
  ]).then(function(results) {
    hideLoading();
    var res = results[0];
    var wdRes = results[1];
    if (!res.success) { showError(res.message); return; }
    var d = res;
    var kpi = res.kpi;
    var withdrawals = (wdRes.data || []).filter(function(w) { return w.status === 'approved'; });

    var badge = document.getElementById('pendingBadge');
    if (badge) {
      if (kpi.pending > 0) { badge.textContent = kpi.pending; badge.classList.remove('hidden'); }
      else { badge.classList.add('hidden'); }
    }

    var lowBadge = document.getElementById('lowStockBadge');
    if (lowBadge) {
      if (kpi.low_stock > 0) { lowBadge.textContent = kpi.low_stock; lowBadge.classList.remove('hidden'); }
      else { lowBadge.classList.add('hidden'); }
    }

    var html = '<div class="fade-in space-y-5">';

    if (d.low_stock_items && d.low_stock_items.length > 0) {
      html += '<div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">';
      html += '<i class="fi fi-rr-triangle-warning text-amber-500 text-lg mt-0.5 flex-shrink-0"></i>';
      html += '<div class="flex-1">';
      html += '<p class="font-semibold text-amber-800 text-sm">วัสดุใกล้หมด/หมดสต็อก</p>';
      html += '<p class="text-xs text-amber-700 mt-1">' + d.low_stock_items.map(function(i) { return i.name + ' (เหลือ ' + i.current_stock + ' ' + i.unit + ')'; }).join(' • ') + '</p>';
      html += '</div></div>';
    }

    // KPI สรุปสถานะวัสดุสิ้นเปลือง
    html += '<div class="flex items-center justify-between mb-2">';
    html += '<p class="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><i class="fi fi-rr-box-open-full text-blue-500"></i> วัสดุสิ้นเปลือง</p>';
    html += '<button onclick="loadPage(\'stock\')" class="text-xs text-navy-600 hover:underline">ดูสต็อก →</button></div>';
    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">';
    
    var kpis = [
      { label: 'รายการวัสดุ', value: kpi.total_items, icon: 'fi-rr-box-open-full', color: 'bg-blue-100', iconColor: 'text-blue-600', danger: false },
      { label: 'สต็อกต่ำ/หมด', value: kpi.low_stock, icon: 'fi-rr-triangle-warning', color: 'bg-amber-100', iconColor: 'text-amber-600', danger: kpi.low_stock > 0 },
      { label: 'รออนุมัติ', value: kpi.pending, icon: 'fi-rr-time-forward', color: 'bg-purple-100', iconColor: 'text-purple-600', danger: kpi.pending > 0 },
      { label: 'เคลื่อนไหววันนี้', value: kpi.today_tx, icon: 'fi-rr-activity', color: 'bg-green-100', iconColor: 'text-green-600', danger: false }
    ];
    
    kpis.forEach(function(k) {
      html += '<div class="card kpi-card p-4">';
      html += '<div class="flex items-center justify-between mb-3">';
      html += '<div class="w-11 h-11 ' + k.color + ' rounded-xl flex items-center justify-center"><i class="fi ' + k.icon + ' ' + k.iconColor + ' text-xl"></i></div>';
      if (k.danger && k.value > 0) html += '<span class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">!</span>';
      html += '</div>';
      html += '<p class="text-2xl font-bold text-gray-800">' + k.value + '</p>';
      html += '<p class="text-xs text-gray-500 mt-0.5">' + k.label + '</p>';
      html += '</div>';
    });
    html += '</div>';

    // Workflow การทำงาน
    html += '<div class="card">';
    html += '<div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-arrow-right text-navy-600"></i> Workflow การเบิกวัสดุ</h3></div>';
    html += '<div class="card-body"><div class="flex items-center justify-center gap-2 flex-wrap">';
    var wfSteps = [
      { label: 'ยื่นขอ', color: 'bg-blue-500', icon: 'fi-rr-inbox-out' },
      { label: 'รออนุมัติ', color: 'bg-amber-500', icon: 'fi-rr-time-forward' },
      { label: 'อนุมัติ', color: 'bg-green-500', icon: 'fi-rr-check-circle' },
      { label: 'จ่ายวัสดุ', color: 'bg-purple-500', icon: 'fi-rr-hand-holding-box' },
      { label: 'เสร็จสิ้น', color: 'bg-teal-500', icon: 'fi-rr-badge-check' }
    ];
    var wfCounts = [kpi.pending + (kpi.today_tx || 0), kpi.pending, 0, kpi.today_tx, 0];
    wfSteps.forEach(function(s, i) {
      html += '<div class="text-center"><div class="wf-bubble ' + s.color + ' mx-auto"><i class="fi ' + s.icon + ' text-base"></i></div>';
      html += '<p class="text-xs text-gray-600 mt-1">' + s.label + '</p>';
      html += '<p class="text-sm font-bold text-navy-700">' + (wfCounts[i] || 0) + '</p></div>';
      if (i < wfSteps.length - 1) html += '<i class="fi fi-rr-angle-right wf-arrow mt-3"></i>';
    });
    html += '</div></div></div>';

    // ส่วนของกราฟสรุปสถิติ
    html += '<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">';
    html += '<div class="card lg:col-span-2"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-chart-histogram text-navy-600"></i> สถิติรับ-เบิก 6 เดือนล่าสุด</h3></div>';
    html += '<div class="card-body"><div style="position:relative;height:220px"><canvas id="chartMonthly"></canvas></div></div></div>';
    html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-chart-pie text-navy-600"></i> สัดส่วนวัสดุ</h3></div>';
    html += '<div class="card-body"><div style="position:relative;height:220px"><canvas id="chartCategory"></canvas></div></div></div>';
    html += '</div>';

    // ส่วนประวัติล่าสุดและการอนุมัติ
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">';
    html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm">รายการเคลื่อนไหวล่าสุด</h3><button onclick="loadPage(\'transactions\')" class="text-xs text-navy-600 hover:underline">ดูทั้งหมด</button></div>';
    html += '<div class="card-body p-0"><div class="divide-y">';
    if (d.recent_transactions && d.recent_transactions.length > 0) {
      d.recent_transactions.slice(0, 6).forEach(function(t) {
        var isR = t.type === 'receive';
        html += '<div class="flex items-center gap-3 px-4 py-3">';
        html += '<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ' + (isR ? 'bg-blue-100' : 'bg-purple-100') + '">';
        html += '<i class="fi ' + (isR ? 'fi-rr-inbox-in text-blue-600' : 'fi-rr-inbox-out text-purple-600') + ' text-sm"></i></div>';
        html += '<div class="flex-1 min-w-0"><p class="text-xs font-medium text-gray-700 truncate">' + escHtml(t.item_name) + '</p>';
        html += '<p class="text-xs text-gray-400">' + (isR ? '+' : '-') + t.quantity + ' ' + t.unit + ' • ' + (t.actor_name || '-') + '</p></div>';
        html += '<span class="text-xs text-gray-400 flex-shrink-0">' + formatDate(t.date) + '</span></div>';
      });
    } else { html += '<p class="text-center text-xs text-gray-400 py-6">ยังไม่มีรายการ</p>'; }
    html += '</div></div></div>';

    html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm">คำขอเบิกรออนุมัติ</h3>';
    if (AUTH.user.role === 'admin') html += '<button onclick="loadPage(\'approve\')" class="text-xs text-navy-600 hover:underline">จัดการ</button>';
    html += '</div><div class="card-body p-0"><div class="divide-y">';
    if (d.recent_pending && d.recent_pending.length > 0) {
      d.recent_pending.forEach(function(w) {
        html += '<div class="flex items-center gap-3 px-4 py-3">';
        html += '<div class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0"><i class="fi fi-rr-time-forward text-amber-600 text-sm"></i></div>';
        html += '<div class="flex-1 min-w-0"><p class="text-xs font-medium text-gray-700 truncate">' + escHtml(w.item_name) + '</p>';
        html += '<p class="text-xs text-gray-400">' + w.quantity_requested + ' ' + w.unit + ' • ' + escHtml(w.requested_by_name) + '</p></div>';
        if (AUTH.user.role === 'admin') {
          html += '<div class="flex gap-1 flex-shrink-0">';
          html += '<button onclick="quickApprove(\'' + w.id + '\',' + w.quantity_requested + ')" class="btn-success btn-sm text-xs px-2 py-1 rounded-lg"><i class="fi fi-rr-check"></i></button>';
          html += '<button onclick="quickReject(\'' + w.id + '\')" class="btn-danger btn-sm text-xs px-2 py-1 rounded-lg"><i class="fi fi-rr-cross"></i></button></div>';
        }
        html += '</div>';
      });
    } else { html += '<p class="text-center text-xs text-gray-400 py-6">ไม่มีคำขอรออนุมัติ</p>'; }
    html += '</div></div></div>';
    html += '</div>';

    // Top 5 Item วัสดุเบิกสูงสุด
    if (d.top_items && d.top_items.length > 0) {
      html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-star text-amber-500"></i> Top 5 วัสดุที่เบิกมากสุด</h3></div>';
      html += '<div class="card-body space-y-3">';
      var maxQty = d.top_items[0].qty || 1;
      d.top_items.forEach(function(item, idx) {
        var pct = Math.round(item.qty / maxQty * 100);
        html += '<div class="flex items-center gap-3">';
        html += '<span class="text-xs font-bold text-gray-400 w-4 text-right">' + (idx + 1) + '</span>';
        html += '<div class="flex-1"><p class="text-xs font-medium text-gray-700 mb-1 truncate">' + escHtml(item.name) + '</p>';
        html += '<div class="progress-bar"><div class="progress-fill bg-navy-600" style="width:' + pct + '%"></div></div></div>';
        html += '<span class="text-xs font-bold text-navy-700 w-8 text-right">' + item.qty + '</span></div>';
      });
      html += '</div></div>';
    }

    html += '</div>';
    
    var contentEl = document.getElementById('mainContent');
    if (contentEl) contentEl.innerHTML = html;

    // Render ชาร์ตสถิติ
    setTimeout(function() {
      if (_charts.monthly) _charts.monthly.destroy();
      var ctxM = document.getElementById('chartMonthly');
      if (ctxM) {
        _charts.monthly = new Chart(ctxM, {
          type: 'bar',
          data: {
            labels: d.monthly.map(function(m) { return m.label; }),
            datasets: [
              { label: 'รับเข้า', data: d.monthly.map(function(m) { return m.receive; }), backgroundColor: '#3b82f6', borderRadius: 6, barPercentage: 0.6 },
              { label: 'เบิกออก', data: d.monthly.map(function(m) { return m.withdraw; }), backgroundColor: '#8b5cf6', borderRadius: 6, barPercentage: 0.6 }
            ]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font: { family: 'Sarabun', size: 11 }, boxWidth: 12 } } }, scales: { y: { ticks: { font: { family: 'Sarabun', size: 11 } }, grid: { color: '#f3f4f6' } }, x: { ticks: { font: { family: 'Sarabun', size: 11 } }, grid: { display: false } } } }
        });
      }
      
      if (_charts.category) _charts.category.destroy();
      var ctxC = document.getElementById('chartCategory');
      if (ctxC && d.category_stock) {
        var cats = Object.keys(d.category_stock);
        var vals = cats.map(function(k) { return d.category_stock[k]; });
        var colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];
        _charts.category = new Chart(ctxC, {
          type: 'doughnut',
          data: { labels: cats, datasets: [ { data: vals, backgroundColor: colors.slice(0, cats.length), borderWidth: 0, hoverOffset: 6 } ] },
          options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { font: { family: 'Sarabun', size: 10 }, boxWidth: 10, padding: 8 } } } }
        });
      }
    }, 100);

  }).catch(function(err) { hideLoading(); showError('โหลด Dashboard ไม่สำเร็จ'); });
}

function quickApprove(wdId, qty) {
  showConfirm('อนุมัติการเบิก', 'ยืนยันอนุมัติ ' + qty + ' รายการ?', function() {
    showLoading('กำลังอนุมัติ...');
    callAPI('approveWithdrawal', AUTH.token, wdId, qty).then(function(res) {
      hideLoading();
      if (res.success) { showSuccess('อนุมัติสำเร็จ'); renderDashboard(); }
      else showError(res.message);
    }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
  }, 'อนุมัติ');
}

function quickReject(wdId) {
  Swal.fire({
    title: 'เหตุผลที่ปฏิเสธ', input: 'text', inputPlaceholder: 'ระบุเหตุผล...',
    showCancelButton: true, confirmButtonText: 'ปฏิเสธ', cancelButtonText: 'ยกเลิก',
    inputValidator: function(v) { if (!v) return 'กรุณาระบุเหตุผล'; },
    customClass: { popup: 'swal2-popup' }
  }).then(function(r) {
    if (!r.isConfirmed) return;
    showLoading('กำลังดำเนินการ...');
    callAPI('rejectWithdrawal', AUTH.token, wdId, r.value).then(function(res) {
      hideLoading();
      if (res.success) { showSuccess('ปฏิเสธคำขอแล้ว'); renderDashboard(); }
      else showError(res.message);
    }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
  });
}

// ===== ITEMS =====
var _itemsData = [];
var _itemsPage = 1;
var _itemsFilter = { search: '', category: 'all', stock: 'all', type: 'all' };
var _itemImageFileId = null;
var _itemsCacheTime = 0;
var ITEMS_CACHE_TTL = 30000;
var ITEM_TYPE_LABELS = { consumable: 'วัสดุสิ้นเปลือง', spare_part: 'อะไหล่เครื่องจักร' };
function getItemTypeLabel(type) {
  return ITEM_TYPE_LABELS[type || 'consumable'] || type || 'consumable';
}
function inferItemTypeFromCategory(category) {
  return String(category || '').trim().indexOf('หมวด') === 0 ? 'consumable' : 'spare_part';
}
function getResolvedItemType(item) {
  if (!item) return 'consumable';
  var category = String(item.category || '').trim();
  if (category) return inferItemTypeFromCategory(category);
  return item.item_type || 'consumable';
}
function getMachineCatalog() {
  var map = {};
  (_itemsData || []).forEach(function(item) {
    splitMachineList(item.machine_name).forEach(function(name) { map[name] = 1; });
    splitMachineList(item.compatible_machines).forEach(function(name) { map[name] = 1; });
  });
  return Object.keys(map).sort();
}
function buildMachineOptions(selected) {
  var current = String(selected || '').trim();
  var options = '<option value="">- เลือกเครื่องจักร -</option>';
  getMachineCatalog().forEach(function(name) {
    options += '<option value="' + escHtml(name) + '"' + (current === name ? ' selected' : '') + '>' + escHtml(name) + '</option>';
  });
  options += '<option value="__custom__"' + (current && getMachineCatalog().indexOf(current) === -1 ? ' selected' : '') + '>กำหนดเอง...</option>';
  return options;
}
function buildMachineFilterOptions(selected) {
  var current = String(selected || 'all').trim() || 'all';
  var machines = getMachineCatalog();
  var options = '<option value="all"' + (current === 'all' ? ' selected' : '') + '>ทุกเครื่องจักร</option>';
  machines.forEach(function(name) {
    options += '<option value="' + escHtml(name) + '"' + (current === name ? ' selected' : '') + '>' + escHtml(name) + '</option>';
  });
  return options;
}
function splitMachineList(value) {
  var text = Array.isArray(value) ? value.join('\n') : String(value || '');
  return text.split(/[\n,;]+/).map(function(s) { return String(s || '').trim(); }).filter(function(s, idx, arr) {
    return s && arr.indexOf(s) === idx;
  });
}
function getMachineUsageText(item) {
  if (!item) return '-';
  var primary = String(item.machine_name || '').trim();
  var compatibles = splitMachineList(item.compatible_machines);
  if (primary) {
    compatibles = compatibles.filter(function(name) { return name !== primary; });
  }
  var parts = [];
  if (primary) parts.push('สำหรับ ' + primary);
  if (compatibles.length) parts.push('ใช้ได้กับ ' + compatibles.join(', '));
  return parts.length ? parts.join(' • ') : '-';
}
function itemMatchesMachineFilter(item, machineName) {
  var target = String(machineName || 'all').trim();
  if (!target || target === 'all') return true;
  if (!item) return false;
  var primary = String(item.machine_name || '').trim();
  if (primary === target) return true;
  return splitMachineList(item.compatible_machines).indexOf(target) !== -1;
}
function itemSearchHaystack(item) {
  return [
    item.name || '',
    item.item_code || '',
    item.category || '',
    item.machine_name || '',
    String(item.compatible_machines || ''),
    getMachineUsageText(item),
    getItemTypeLabel(getResolvedItemType(item))
  ].join(' ').toLowerCase();
}
var ITEM_CONDITION_LABELS = { new: 'ใหม่', good: 'พร้อมใช้', standby: 'สำรอง', used: 'ใช้งานแล้ว', damaged: 'ชำรุด', repair: 'รอซ่อม' };

function renderItems() {
  if (AUTH.user.role !== 'admin') { loadPage('stock'); return; }
  showLoading('โหลดรายการวัสดุ...');
  if (_itemsData.length > 0 && (Date.now() - _itemsCacheTime) < ITEMS_CACHE_TTL) {
    hideLoading();
    updateLowStockBadge(_itemsData);
    _itemsPage = 1;
    buildItemsPage();
    return;
  }
  callAPI('getItems', AUTH.token).then(function(res) {
    hideLoading();
    if (!res.success) { showError(res.message); return; }
    _itemsData = res.data;
    _itemsCacheTime = Date.now();
    updateLowStockBadge(_itemsData);
    _itemsPage = 1;
    buildItemsPage();
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildItemsPage() {
  var filtered = filterItems(_itemsData, _itemsFilter);
  var paged    = paginate(filtered, _itemsPage);
  var cats     = getCategoryList(_itemsData);

  var html = '<div class="fade-in space-y-4">';
  html += '<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">';
  html += '<div class="flex gap-2 flex-wrap">';
  html += '<div class="relative"><i class="fi fi-rr-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>';
  html += '<input type="text" id="itemSearch" placeholder="ค้นหาวัสดุ..." value="' + escHtml(_itemsFilter.search) + '"';
  html += ' onkeyup="debounceItemFilter()" class="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 w-48"></div>';
  html += '<select id="itemTypeFilter" onchange="applyItemFilter()" class="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500">';
  html += '<option value="all">ทุกประเภท</option>';
  html += '<option value="consumable" ' + (_itemsFilter.type === 'consumable' ? 'selected' : '') + '>วัสดุสิ้นเปลือง</option>';
  html += '<option value="spare_part" ' + (_itemsFilter.type === 'spare_part' ? 'selected' : '') + '>อะไหล่เครื่องจักร</option>';
  html += '</select>';
  html += '<select id="itemCatFilter" onchange="applyItemFilter()" class="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500">';
  html += '<option value="all">ทุกหมวดหมู่</option>';
  cats.forEach(function(c) { html += '<option value="' + escHtml(c) + '" ' + (_itemsFilter.category === c ? 'selected' : '') + '>' + escHtml(c) + '</option>'; });
  html += '</select>';
  html += '<select id="itemStockFilter" onchange="applyItemFilter()" class="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500">';
  html += '<option value="all">สต็อกทั้งหมด</option><option value="low" ' + (_itemsFilter.stock === 'low' ? 'selected' : '') + '>ใกล้หมด</option><option value="ok" ' + (_itemsFilter.stock === 'ok' ? 'selected' : '') + '>ปกติ</option>';
  html += '</select></div>';
  html += '<div class="flex gap-2">';
  html += '<button onclick="downloadCSVSample()" class="btn-secondary flex items-center gap-2 whitespace-nowrap btn-sm"><i class="fi fi-rr-download"></i> ไฟล์ตัวอย่าง</button>';
  html += '<button onclick="openImportCSVModal()" class="btn-success flex items-center gap-2 whitespace-nowrap btn-sm"><i class="fi fi-rr-upload"></i> นำเข้า CSV</button>';
  html += '<button onclick="openAddItemModal()" class="btn-primary flex items-center gap-2 whitespace-nowrap"><i class="fi fi-rr-plus"></i> เพิ่มวัสดุใหม่</button></div></div>';

  html += '<div class="flex gap-2 flex-wrap text-xs">';
  html += '<span class="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full font-medium"><i class="fi fi-rr-box-open-full mr-1"></i>ทั้งหมด: ' + _itemsData.length + '</span>';
  var lowCount = _itemsData.filter(function(i) { return i.current_stock <= i.min_stock; }).length;
  if (lowCount > 0) html += '<span class="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full font-medium"><i class="fi fi-rr-triangle-warning mr-1"></i>ใกล้หมด: ' + lowCount + '</span>';
  html += '</div>';

  html += '<div class="card overflow-hidden">';
  html += '<div class="hidden md:block overflow-x-auto">';
  html += '<table class="w-full text-sm"><thead class="bg-gray-50 text-gray-600 text-xs">';
  html += '<tr><th class="px-4 py-3 text-left w-10">#</th><th class="px-4 py-3 text-left w-14">รูป</th><th class="px-4 py-3 text-left">รหัส</th><th class="px-4 py-3 text-left">ชื่อวัสดุ</th><th class="px-4 py-3 text-left">ประเภท</th><th class="px-4 py-3 text-left">เครื่องจักร</th><th class="px-4 py-3 text-left">ขนาด</th><th class="px-4 py-3 text-left">หน่วย</th><th class="px-4 py-3 text-left">หมวดหมู่</th><th class="px-4 py-3 text-center">สต็อก</th><th class="px-4 py-3 text-center">ขั้นต่ำ</th><th class="px-4 py-3 text-center">สถานะ</th><th class="px-4 py-3 text-center">จัดการ</th></tr></thead>';
  html += '<tbody class="divide-y divide-gray-100">';
  if (paged.length === 0) {
    html += '<tr><td colspan="13" class="text-center py-10 text-gray-400">ไม่พบรายการ</td></tr>';
  }
  paged.forEach(function(item, idx) {
    var sClass = getStockClass(item.current_stock, item.min_stock);
    var sLabel = getStockLabel(item.current_stock, item.min_stock);
    var imgUrlSrc = imgUrl(item.image_file_id);
    var imgHtml = imgUrlSrc ? '<img src="' + imgUrlSrc + '" class="w-10 h-10 object-cover rounded-lg border border-gray-200" loading="lazy">' : '<div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400"><i class="fi fi-rr-box-open-full text-sm"></i></div>';
    html += '<tr>';
    html += '<td class="px-4 py-3 text-gray-400 text-xs">' + ((_itemsPage -1) * ITEMS_PER_PAGE + idx + 1) + '</td>';
    html += '<td class="px-4 py-3">' + imgHtml + '</td>';
    html += '<td class="px-4 py-3 font-mono text-xs text-navy-700">' + escHtml(item.item_code) + '</td>';
    html += '<td class="px-4 py-3 font-medium text-gray-800">' + escHtml(item.name) + '</td>';
    var itemTypeLabel = getResolvedItemType(item);
    html += '<td class="px-4 py-3 text-xs"><span class="px-2 py-0.5 rounded-full font-medium ' + (itemTypeLabel === 'spare_part' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700') + '">' + escHtml(getItemTypeLabel(itemTypeLabel)) + '</span></td>';
    html += '<td class="px-4 py-3 text-xs text-gray-600">' + escHtml(getMachineUsageText(item)) + '</td>';
    html += '<td class="px-4 py-3 text-gray-500 text-xs">' + escHtml(item.size || '-') + '</td>';
    html += '<td class="px-4 py-3 text-gray-600 text-xs">' + escHtml(item.unit) + '</td>';
    html += '<td class="px-4 py-3 text-xs text-gray-500">' + escHtml(item.category || '-') + '</td>';
    html += '<td class="px-4 py-3 text-center font-bold text-gray-800">' + item.current_stock + '</td>';
    html += '<td class="px-4 py-3 text-center text-gray-500 text-xs">' + item.min_stock + '</td>';
    html += '<td class="px-4 py-3 text-center"><span class="px-2 py-1 rounded-full text-xs font-medium ' + sClass + '">' + sLabel + '</span></td>';
    html += '<td class="px-4 py-3 text-center"><div class="flex items-center justify-center gap-1">';
    html += '<button title="ดูรายละเอียด" onclick="showItemDetailModal(\'' + item.id + '\')" class="w-7 h-7 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-200"><i class="fi fi-rr-eye text-xs"></i></button>';
    html += '<button title="QR Code" onclick="showQRModal(\'' + item.id + '\')" class="w-7 h-7 bg-teal-100 text-teal-700 rounded-lg flex items-center justify-center hover:bg-teal-200"><i class="fi fi-rr-qr-scan text-xs"></i></button>';
    html += '<button title="แก้ไข" onclick="openEditItemModal(\'' + item.id + '\')" class="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center hover:bg-blue-200"><i class="fi fi-rr-edit text-xs"></i></button>';
    html += '<button title="ลบ" onclick="deleteItemConfirm(\'' + item.id + '\',\'' + escHtml(item.name) + '\')" class="w-7 h-7 bg-red-100 text-red-700 rounded-lg flex items-center justify-center hover:bg-red-200"><i class="fi fi-rr-trash text-xs"></i></button>';
    html += '</div></td></tr>';
  });
  html += '</tbody></table></div>';

  html += '<div class="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">';
  if (paged.length === 0) html += '<p class="col-span-full text-center text-sm text-gray-400 py-8">ไม่พบรายการ</p>';
  paged.forEach(function(item) {
    var sClass = getStockClass(item.current_stock, item.min_stock);
    var sLabel = getStockLabel(item.current_stock, item.min_stock);
    var imgUrlSrc = imgUrl(item.image_file_id);
    var imgHtml = imgUrlSrc ? '<img src="' + imgUrlSrc + '" class="w-14 h-14 object-cover rounded-xl border border-gray-200" loading="lazy">' : '<div class="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center"><i class="fi fi-rr-box-open-full text-gray-400 text-xl"></i></div>';
    html += '<div class="card p-4 flex flex-col gap-3">';
    html += '<div class="flex items-start justify-between">';
    html += '<div>' + imgHtml + '</div>';
    html += '<span class="px-2 py-0.5 rounded-full text-xs font-medium ' + sClass + '">' + sLabel + '</span></div>';
    html += '<div><p class="font-semibold text-gray-800 text-sm leading-snug">' + escHtml(item.name) + '</p>';
    html += '<p class="text-xs text-gray-400 mt-0.5">' + escHtml(item.item_code) + ' • ' + escHtml(getItemTypeLabel(getResolvedItemType(item))) + '</p>';
    html += '<p class="text-xs text-gray-500 mt-0.5">' + escHtml(getMachineUsageText(item)) + '</p>';
    html += '<p class="text-xs text-gray-500 mt-0.5">' + escHtml(getItemTypeLabel(getResolvedItemType(item))) + ' • ' + escHtml(item.category || '') + '</p></div>';
    html += '<div class="flex justify-between text-xs text-gray-500"><span>คงเหลือ</span><span class="font-bold text-gray-800">' + item.current_stock + ' ' + escHtml(item.unit) + '</span></div>';
    html += '<div class="flex gap-2 pt-1">';
    html += '<button onclick="showItemDetailModal(\'' + item.id + '\')" class="flex-1 btn-secondary btn-sm text-xs"><i class="fi fi-rr-eye mr-1"></i>ดู</button>';
    html += '<button onclick="showQRModal(\'' + item.id + '\')" class="flex-1 btn-success btn-sm text-xs" style="background:#e0f2f1;color:#00695c;border-color:#b2dfdb"><i class="fi fi-rr-qr-scan mr-1"></i>QR</button>';
    html += '<button onclick="openEditItemModal(\'' + item.id + '\')" class="flex-1 btn-primary btn-sm text-xs"><i class="fi fi-rr-edit mr-1"></i>แก้ไข</button>';
    html += '</div></div>';
  });
  html += '</div></div>';

  html += '<div id="itemsPagination"></div>';
  html += '</div>';
  
  var contentEl = document.getElementById('mainContent');
  if (contentEl) contentEl.innerHTML = html;
  renderPagination('itemsPagination', filtered.length, _itemsPage, function(p) { _itemsPage = p; buildItemsPage(); });
}

function filterItems(data, f) {
  return data.filter(function(i) {
    if (f.search && itemSearchHaystack(i).indexOf(f.search.toLowerCase()) === -1) return false;
    if (f.type !== 'all' && getResolvedItemType(i) !== f.type) return false;
    if (f.category !== 'all' && i.category !== f.category) return false;
    if (f.stock === 'low' && i.current_stock > i.min_stock) return false;
    if (f.stock === 'ok'  && i.current_stock <= i.min_stock) return false;
    return true;
  });
}
function getCategoryList(data) {
  var cats = {};
  data.forEach(function(i) { if (i.category) cats[i.category] = 1; });
  return Object.keys(cats).sort();
}
function paginate(data, page) {
  return data.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
}

var _filterTimer;
function debounceItemFilter() { clearTimeout(_filterTimer); _filterTimer = setTimeout(applyItemFilter, 400); }
function applyItemFilter() {
  var searchEl = document.getElementById('itemSearch');
  var typeEl = document.getElementById('itemTypeFilter');
  var catEl = document.getElementById('itemCatFilter');
  var stockEl = document.getElementById('itemStockFilter');
  
  _itemsFilter.search   = searchEl ? searchEl.value : '';
  _itemsFilter.type     = typeEl ? typeEl.value : 'all';
  _itemsFilter.category = catEl ? catEl.value : 'all';
  _itemsFilter.stock    = stockEl ? stockEl.value : 'all';
  _itemsPage = 1;
  buildItemsPage();
}

function downloadCSVSample() {
  var csv = 'รหัส,ชื่อวัสดุ,ประเภท,ขนาด,หน่วย,หมวดหมู่,สำหรับเครื่องอะไร,ใช้ได้กับเครื่องจักรไหนบ้าง,สถานะสภาพ,ติดตามSerial,Serials,สต็อกเริ่มต้น,สต็อกขั้นต่ำ,รายละเอียด\n';
  csv += 'SUP-001,ถุงมือยาง (ไม่มีแป้ง) สีฟ้า,consumable,size S,กล่อง,อุปกรณ์ป้องกัน,,เครื่องซีล,เครื่องแพ็ค,,,,20,5,ถุงมือยางไม่มีแป้งสำหรับงานทั่วไป\n';
  csv += 'SP-001,สายพานมอเตอร์,spare_part,,เส้น,อะไหล่เครื่องจักร,เครื่องบรรจุ,เครื่องบรรจุ;เครื่องแพ็ค,good,true,SP-001-A;SP-001-B,2,1,สายพานอะไหล่เครื่องจักร\n';
  csv += 'SUP-003,สำลี,consumable,200 g.,ถุง,วัสถุดิบทางการแพทย์,,เครื่องแพ็ค, ,,,,50,10,สำลีสะอาดบริสุทธิ์ 200 กรัม\n';
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'ตัวอย่าง_รายการวัสดุ.csv';
  link.click();
}

var _csvImportRows = [];
function openImportCSVModal() {
  _csvImportRows = [];
  var body = '<div class="space-y-4">';
  body += '<p class="text-sm text-gray-600">อัปโหลดไฟล์ CSV ตามรูปแบบตัวอย่าง ระบบจะแสดงตัวอย่างข้อมูลก่อนนำเข้า</p>';
  body += '<input type="file" id="csvImportFile" accept=".csv" onchange="previewCSVImport()" class="form-input py-1.5">';
  body += '<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">';
  body += '<p class="font-semibold mb-1">หมายเหตุ</p>';
  body += '<ul class="list-disc list-inside space-y-0.5">';
  body += '<li>รองรับไฟล์ .csv เท่านั้น (UTF-8)</li>';
  body += '<li>คอลัมน์หลัก: รหัส,ชื่อวัสดุ,ประเภท,ขนาด,หน่วย,หมวดหมู่,สำหรับเครื่องอะไร,ใช้ได้กับเครื่องจักรไหนบ้าง,สถานะสภาพ,ติดตามSerial,Serials,สต็อกเริ่มต้น,สต็อกขั้นต่ำ,รายละเอียด</li>';
  body += '<li>หากไม่มีรหัส ระบบจะสร้างรหัสอัตโนมัติ</li>';
  body += '</ul></div>';
  body += '<div id="csvImportPreview"></div>';
  body += '</div>';
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="handleCSVImport()" class="btn-success"><i class="fi fi-rr-upload mr-1"></i>นำเข้า</button>';
  openModal('นำเข้ารายการวัสดุจาก CSV', body, footer);
}

function previewCSVImport() {
  var input = document.getElementById('csvImportFile');
  var previewDiv = document.getElementById('csvImportPreview');
  if (!input || !input.files[0] || !previewDiv) { if (previewDiv) previewDiv.innerHTML = ''; return; }
  var file = input.files[0];
  var reader = new FileReader();
  reader.onload = function(e) {
    _csvImportRows = parseCSV(e.target.result);
    if (_csvImportRows.length === 0) { previewDiv.innerHTML = '<p class="text-sm text-red-500">ไม่พบข้อมูลในไฟล์</p>'; return; }
    var html = '<p class="text-sm font-medium text-gray-700 mb-2">ตัวอย่างข้อมูล (' + _csvImportRows.length + ' รายการ)</p>';
    html += '<div class="max-h-64 overflow-y-auto border border-gray-200 rounded-xl">';
    html += '<table class="w-full text-xs"><thead class="bg-gray-50 text-gray-600 sticky top-0">';
    html += '<tr><th class="px-2 py-1.5 text-left">รหัส</th><th class="px-2 py-1.5 text-left">ชื่อ</th><th class="px-2 py-1.5 text-left">ประเภท</th><th class="px-2 py-1.5 text-left">เครื่องจักร</th><th class="px-2 py-1.5 text-left">หน่วย</th><th class="px-2 py-1.5 text-center">สต็อก</th><th class="px-2 py-1.5 text-center">ขั้นต่ำ</th></tr></thead><tbody class="divide-y divide-gray-100">';
    _csvImportRows.forEach(function(row) {
      html += '<tr><td class="px-2 py-1.5">' + escHtml(row['รหัส'] || '-') + '</td>';
      html += '<td class="px-2 py-1.5">' + escHtml(row['ชื่อวัสดุ'] || '') + '</td>';
      html += '<td class="px-2 py-1.5">' + escHtml(getItemTypeLabel(inferItemTypeFromCategory(row['หมวดหมู่'] || ''))) + '</td>';
      html += '<td class="px-2 py-1.5">' + escHtml((row['สำหรับเครื่องอะไร'] || '') + (row['ใช้ได้กับเครื่องจักรไหนบ้าง'] ? ' • ' + row['ใช้ได้กับเครื่องจักรไหนบ้าง'] : '')) + '</td>';
      html += '<td class="px-2 py-1.5">' + escHtml(row['หน่วย'] || '') + '</td>';
      html += '<td class="px-2 py-1.5 text-center">' + escHtml(row['สต็อกเริ่มต้น'] || '0') + '</td>';
      html += '<td class="px-2 py-1.5 text-center">' + escHtml(row['สต็อกขั้นต่ำ'] || '5') + '</td></tr>';
    });
    html += '</tbody></table></div>';
    previewDiv.innerHTML = html;
  };
  reader.readAsText(file, 'UTF-8');
}

function parseCSV(text) {
  var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(function(l) { return l.trim() !== ''; });
  if (lines.length < 2) return [];
  var headers = lines[0].split(',').map(function(h) { return h.trim(); });
  var rows = [];
  for (var i = 1; i < lines.length; i++) {
    var cols = lines[i].split(',');
    if (cols.length < 2) continue;
    var row = {};
    headers.forEach(function(h, idx) { row[h] = (cols[idx] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

function handleCSVImport() {
  var rows = _csvImportRows;
  if (!rows || rows.length === 0) { showError('กรุณาเลือกไฟล์ CSV ก่อน'); return; }
  showConfirm('ยืนยันนำเข้า', 'พบ ' + rows.length + ' รายการ ยืนยันนำเข้า?', function() {
    showLoading('กำลังนำเข้า ' + rows.length + ' รายการ...');
    var promises = rows.map(function(row) {
      var itemCode = row['รหัส'] || '';
      var name = row['ชื่อวัสดุ'] || '';
      if (!name) return Promise.resolve({ success: false, message: 'ขาดชื่อวัสดุ' });
    var data = {
      item_code: itemCode,
      name: name,
      item_type: inferItemTypeFromCategory(row['หมวดหมู่'] || ''),
      size: row['ขนาด'] || '',
      unit: row['หน่วย'] || 'ชิ้น',
      category: row['หมวดหมู่'] || '',
      machine_name: row['สำหรับเครื่องอะไร'] || '',
      compatible_machines: row['ใช้ได้กับเครื่องจักรไหนบ้าง'] || '',
      condition_status: row['สถานะสภาพ'] || '',
      serial_tracking: String(row['ติดตามSerial'] || '').toLowerCase() === 'true',
      spare_part_units: row['Serials'] || '',
      current_stock: parseInt(row['สต็อกเริ่มต้น'] || 0),
      min_stock: parseInt(row['สต็อกขั้นต่ำ'] || 5),
      description: row['รายละเอียด'] || ''
      };
      return callAPI('addItem', AUTH.token, data);
    });
 // ... โค้ดด้านบนของซับมิตสต็อกเทค ...
Promise.all(promises).then(function() {
      hideLoading();
      showSuccess('ปรับยอดเรียบร้อย ' + adjustments.length + ' รายการ');
      _itemsCacheTime = 0; // ล้างแคชเพื่อบังคับให้หน้าเว็บโหลดข้อมูลล่าสุดจาก Sheets
      renderStocktake();
    }).catch(function() { 
      hideLoading(); 
      showError('เกิดข้อผิดพลาดบางรายการ'); 
    });
  }); // 🟢 บรรทัด 576: ปิดคำสั่ง showConfirm
} // 🟢 บรรทัด 577: ปิดฟังก์ชันใหญ่ submitStocktake() 

// ===== PRINT QR LABELS =====
var _printQRFilter = { search: '', category: 'all' };

function openAddItemModal() {
  _itemImageFileId = null;
  var body = itemFormHTML({});
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="submitAddItem()" class="btn-primary"><i class="fi fi-rr-plus mr-1"></i>เพิ่มวัสดุ</button>';
  openModal('เพิ่มรายการวัสดุใหม่', body, footer);
  toggleItemFormTypeFields();
}
function openEditItemModal(id) {
  var item = _itemsData.find(function(i) { return i.id === id; });
  if (!item) return;
  _itemImageFileId = item.image_file_id || null;
  var body = itemFormHTML(item);
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="submitEditItem(\'' + id + '\')" class="btn-primary"><i class="fi fi-rr-disk mr-1"></i>บันทึก</button>';
  openModal('แก้ไขรายการวัสดุ', body, footer);
  toggleItemFormTypeFields();
}
function itemFormHTML(item) {
  var fid = _itemImageFileId || item.image_file_id || '';
  var imgSection = '';
  if (fid) {
    var imgSrc = imgUrl(fid);
    imgSection = '<div class="sm:col-span-2"><label class="form-label">รูปภาพวัสดุ</label><div class="flex items-center gap-3"><img id="itemImgPreview" src="' + (imgSrc || '') + '" class="w-24 h-24 object-cover rounded-xl border border-gray-200"><button onclick="removeItemImage()" type="button" class="text-red-500 text-sm hover:underline">ลบรูป</button></div><input type="hidden" id="itemImageFileId" value="' + fid + '"></div>';
  } else {
    imgSection = '<div class="sm:col-span-2"><label class="form-label">รูปภาพวัสดุ</label><input type="file" id="itemImageFile" accept="image/*" onchange="handleItemImageUpload(this)" class="form-input py-1.5"><p class="text-xs text-gray-400 mt-1">รองรับ JPG, PNG (สูงสุด 5MB)</p><div id="itemImagePreview"></div></div>';
  }
  var type = getResolvedItemType(item);
  var condition = item.condition_status || '';
  var serials = item.spare_part_units || '';
  var machineName = item.machine_name || '';
  var compatibleMachines = Array.isArray(item.compatible_machines) ? item.compatible_machines.join('\n') : (item.compatible_machines || '');
  return '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">'
    + fieldHTML('ชื่อวัสดุ *', 'itemName', 'text', item.name || '', 'sm:col-span-2')
    + '<div><label class="form-label">ประเภท *</label><select id="itemType" onchange="toggleItemFormTypeFields()" class="form-input"><option value="consumable"' + (type === 'consumable' ? ' selected' : '') + '>วัสดุสิ้นเปลือง</option><option value="spare_part"' + (type === 'spare_part' ? ' selected' : '') + '>อะไหล่เครื่องจักร</option></select></div>'
    + fieldHTML('ขนาดบรรจุ', 'itemSize', 'text', item.size || '')
    + fieldHTML('หน่วย *', 'itemUnit', 'text', item.unit || '')
    + fieldHTML('หมวดหมู่', 'itemCategory', 'text', item.category || 'วัสดุทำความสะอาด')
    + '<div class="item-spare-field sm:col-span-2">'
    + '<button type="button" onclick="toggleMachinePicker()" class="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">'
    + '<span>สำหรับเครื่องจักร</span><i class="fi fi-rr-angle-down text-xs"></i></button>'
    + '<div id="machinePickerPanel" class="mt-3 hidden space-y-3">'
    + '<div><label class="form-label">เลือกเครื่องจักร *</label><select id="itemMachineSelect" onchange="syncMachinePicker()" class="form-input">' + buildMachineOptions(machineName) + '</select></div>'
    + '<div id="itemMachineCustomWrap" class="hidden"><label class="form-label">ระบุชื่อเครื่องเอง</label><input type="text" id="itemMachineCustom" class="form-input" value="' + escHtml(machineName) + '" placeholder="เช่น เครื่องตัด, เครื่อง Milling, เครื่องบรรจุ"></div>'
    + '</div></div>'
    + '<div class="sm:col-span-2"><label class="form-label">ใช้ได้กับเครื่องจักรไหนบ้าง</label><textarea id="itemCompatibleMachines" rows="3" class="form-input" placeholder="พิมพ์ชื่อเครื่องจักรได้หลายบรรทัด หรือคั่นด้วยจุลภาค">' + escHtml(compatibleMachines) + '</textarea><p class="text-xs text-gray-400 mt-1">ช่วยค้นหาและแสดงผลเวลาเลือกวัสดุที่ใช้ได้หลายเครื่อง</p></div>'
    + '<div class="item-consumable-field">' + fieldHTML('สต็อกเริ่มต้น', 'itemStock', 'number', item.current_stock || 0) + '</div>'
    + fieldHTML('สต็อกขั้นต่ำ', 'itemMinStock', 'number', item.min_stock || 5)
    + '<div class="item-spare-field sm:col-span-2"><div class="rounded-xl border border-violet-100 bg-violet-50/60 p-4 space-y-4"><div><label class="form-label">สถานะสภาพ *</label><select id="itemCondition" class="form-input"><option value="">- เลือกสถานะ -</option><option value="new"' + (condition === 'new' ? ' selected' : '') + '>ใหม่</option><option value="good"' + (condition === 'good' ? ' selected' : '') + '>พร้อมใช้</option><option value="standby"' + (condition === 'standby' ? ' selected' : '') + '>สำรอง</option><option value="used"' + (condition === 'used' ? ' selected' : '') + '>ใช้งานแล้ว</option><option value="damaged"' + (condition === 'damaged' ? ' selected' : '') + '>ชำรุด</option><option value="repair"' + (condition === 'repair' ? ' selected' : '') + '>รอซ่อม</option></select></div><label class="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" id="itemSerialTracking" onchange="toggleItemSerialFields()" class="accent-navy-600"' + (item.serial_tracking ? ' checked' : '') + '>ติดตาม Serial / Item-level</label><div class="item-serial-field"><label class="form-label">Serial No. / รหัสแต่ละชิ้น</label><textarea id="itemSerials" rows="4" class="form-input" placeholder="ใส่ 1 บรรทัดต่อ 1 ชิ้น">' + escHtml(serials) + '</textarea><p class="text-xs text-gray-400 mt-1">รายการนี้จะเก็บแยกจากสต็อก รวมไว้เพื่อดูประวัติแต่ละชิ้น</p></div></div></div>'
    + imgSection
    + '</div>';
}
function fieldHTML(label, id, type, value, extra) {
  return '<div class="' + (extra || '') + '">'
    + '<label class="form-label">' + escHtml(label) + '</label>'
    + '<input type="' + type + '" id="' + id + '" value="' + escHtml(String(value)) + '" class="form-input"></div>';
}

function toggleItemFormTypeFields() {
  var typeEl = document.getElementById('itemType');
  var type = typeEl ? typeEl.value : 'consumable';
  document.querySelectorAll('.item-spare-field').forEach(function(el) {
    el.style.display = type === 'spare_part' ? '' : 'none';
  });
  document.querySelectorAll('.item-consumable-field').forEach(function(el) {
    el.style.display = type === 'consumable' ? '' : 'none';
  });
  toggleItemSerialFields();
  if (type === 'spare_part') syncMachinePicker(true);
  else {
    var panel = document.getElementById('machinePickerPanel');
    if (panel) panel.classList.add('hidden');
  }
}

function toggleItemSerialFields() {
  var typeEl = document.getElementById('itemType');
  var serialEl = document.getElementById('itemSerialTracking');
  var show = typeEl && typeEl.value === 'spare_part' && serialEl && serialEl.checked;
  document.querySelectorAll('.item-serial-field').forEach(function(el) {
    el.style.display = show ? '' : 'none';
  });
}

function toggleMachinePicker(forceOpen) {
  var panel = document.getElementById('machinePickerPanel');
  if (!panel) return;
  var shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : panel.classList.contains('hidden');
  if (shouldOpen) panel.classList.remove('hidden');
  else panel.classList.add('hidden');
  syncMachinePicker();
}

function syncMachinePicker(forceOpen) {
  var typeEl = document.getElementById('itemType');
  var panel = document.getElementById('machinePickerPanel');
  var selectEl = document.getElementById('itemMachineSelect');
  var customWrap = document.getElementById('itemMachineCustomWrap');
  var customEl = document.getElementById('itemMachineCustom');
  if (!typeEl || typeEl.value !== 'spare_part') return;
  if (forceOpen && panel) panel.classList.remove('hidden');
  if (!selectEl || !customWrap || !customEl) return;
  var showCustom = selectEl.value === '__custom__';
  customWrap.classList.toggle('hidden', !showCustom);
  if (!showCustom && selectEl.value) customEl.value = selectEl.value;
  if (showCustom && !customEl.value) customEl.focus();
}

function submitAddItem() {
  var data = readItemForm();
  if (!data) return;
  showLoading('กำลังบันทึก...');
  callAPI('addItem', AUTH.token, data).then(function(res) {
    hideLoading(); closeModal();
    if (res.success) { showSuccess(res.message); renderItems(); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}
function submitEditItem(id) {
  var data = readItemForm();
  if (!data) return;
  showLoading('กำลังบันทึก...');
  callAPI('updateItem', AUTH.token, id, data).then(function(res) {
    hideLoading(); closeModal();
    if (res.success) { showSuccess(res.message); renderItems(); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}
function readItemForm() {
  var nameEl = document.getElementById('itemName');
  var unitEl = document.getElementById('itemUnit');
  var sizeEl = document.getElementById('itemSize');
  var catEl = document.getElementById('itemCategory');
  var typeEl = document.getElementById('itemType');
  var machineEl = document.getElementById('itemMachineSelect');
  var machineCustomEl = document.getElementById('itemMachineCustom');
  var compatEl = document.getElementById('itemCompatibleMachines');
  var stockEl = document.getElementById('itemStock');
  var minEl = document.getElementById('itemMinStock');
  var conditionEl = document.getElementById('itemCondition');
  var serialTrackEl = document.getElementById('itemSerialTracking');
  var serialsEl = document.getElementById('itemSerials');
  var imgIdEl = document.getElementById('itemImageFileId');
  
  var name = nameEl ? nameEl.value : '';
  var unit = unitEl ? unitEl.value : '';
  var itemType = typeEl ? typeEl.value : 'consumable';
  var category = catEl ? catEl.value.trim() : '';
  var resolvedType = inferItemTypeFromCategory(category);
  var machineName = machineEl ? machineEl.value.trim() : '';
  if (machineName === '__custom__') machineName = machineCustomEl ? machineCustomEl.value.trim() : '';
  var compatibleMachines = compatEl ? compatEl.value.trim() : '';
  var condition = conditionEl ? conditionEl.value : '';
  var serialTracking = serialTrackEl ? serialTrackEl.checked : false;
  var serials = serialsEl ? (serialsEl.value || '') : '';
  if (!name.trim()) { showError('กรุณากรอกชื่อวัสดุ'); return null; }
  if (!unit.trim()) { showError('กรุณากรอกหน่วย'); return null; }
  if (!category) { showError('กรุณากรอกหมวดหมู่'); return null; }
  if (itemType !== resolvedType) { showError('ประเภทกับหมวดหมู่ไม่ตรงกัน: หมวดที่ขึ้นต้นด้วย "หมวด" ต้องเป็นวัสดุสิ้นเปลือง และหมวดอื่นเป็นอะไหล่เครื่องจักร'); return null; }
  if (resolvedType === 'spare_part' && !machineName) { showError('กรุณาระบุสำหรับเครื่องอะไร'); return null; }
  if (resolvedType === 'spare_part' && !condition) { showError('กรุณาเลือกสถานะสภาพของอะไหล่'); return null; }
  if (resolvedType === 'spare_part' && serialTracking && !serials.trim()) { showError('กรุณาระบุ Serial อย่างน้อย 1 รายการ'); return null; }
  
  return {
    name: name, size: sizeEl ? sizeEl.value : '',
    unit: unit, category: category,
    item_type: resolvedType,
    machine_name: machineName,
    compatible_machines: splitMachineList(compatibleMachines).join('\n'),
    current_stock: stockEl ? parseInt(stockEl.value) || 0 : 0,
    min_stock: minEl ? parseInt(minEl.value) || 5 : 5,
    condition_status: condition,
    serial_tracking: serialTracking,
    spare_part_units: serialTracking ? JSON.stringify(serials.split(/\r?\n/).map(function(s){ return s.trim(); }).filter(Boolean)) : '',
    image_file_id: imgIdEl ? imgIdEl.value : _itemImageFileId || ''
  };
}
function handleItemImageUpload(input) {
  var file = input.files[0];
  if (!file) return;
  if (!file.type.match('image.*')) { showError('กรุณาเลือกไฟล์รูปภาพ'); input.value = ''; return; }
  if (file.size > 5 * 1024 * 1024) { showError('ไฟล์ใหญ่เกิน 5MB'); input.value = ''; return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var base64 = e.target.result.split(',')[1];
    showLoading('กำลังอัปโหลดรูป...');
    callAPI('uploadFile', AUTH.token, base64, file.type, file.name).then(function(res) {
      hideLoading();
      if (res.success) {
        _itemImageFileId = res.file_id;
        var preview = document.getElementById('itemImagePreview');
        var imgSrc = imgUrl(res.file_id);
        if (preview) preview.innerHTML = '<img src="' + (imgSrc || '') + '" class="w-24 h-24 object-cover rounded-xl border border-gray-200 mt-2">';
        showSuccess('อัปโหลดรูปเรียบร้อย');
      } else {
        showError(res.message || 'อัปโหลดไม่สำเร็จ');
      }
    }).catch(function() { hideLoading(); showError('อัปโหลดไม่สำเร็จ'); });
  };
  reader.readAsDataURL(file);
}
function removeItemImage() {
  _itemImageFileId = null;
  var name = document.getElementById('itemName') ? document.getElementById('itemName').value : '';
  var size = document.getElementById('itemSize') ? document.getElementById('itemSize').value : '';
  var unit = document.getElementById('itemUnit') ? document.getElementById('itemUnit').value : '';
  var cat  = document.getElementById('itemCategory') ? document.getElementById('itemCategory').value : '';
  var stock = document.getElementById('itemStock') ? document.getElementById('itemStock').value : 0;
  var min   = document.getElementById('itemMinStock') ? document.getElementById('itemMinStock').value : 5;
  var typeEl = document.getElementById('itemType');
  var conditionEl = document.getElementById('itemCondition');
  var serialTrackEl = document.getElementById('itemSerialTracking');
  var serialsEl = document.getElementById('itemSerials');
  var fakeItem = {
    name: name, size: size, unit: unit, category: cat,
    item_type: inferItemTypeFromCategory(cat),
    condition_status: conditionEl ? conditionEl.value : '',
    serial_tracking: serialTrackEl ? serialTrackEl.checked : false,
    spare_part_units: serialsEl ? serialsEl.value : '',
    current_stock: stock, min_stock: min, image_file_id: ''
  };
  var body = itemFormHTML(fakeItem);
  var bodyEl = document.getElementById('modalBody');
  if (bodyEl) bodyEl.innerHTML = body;
  toggleItemFormTypeFields();
}

function deleteItemConfirm(id, name) {
  showConfirm('ลบรายการวัสดุ', 'ต้องการลบ "' + name + '" ใช่หรือไม่?', function() {
    showLoading('กำลังลบ...');
    callAPI('deleteItem', AUTH.token, id).then(function(res) {
      hideLoading();
      if (res.success) { showSuccess(res.message); renderItems(); }
      else showError(res.message);
    }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
  }, 'ลบ');
}

function showItemDetailModal(itemId) {
  var item = _itemsData.find(function(i) { return i.id === itemId; });
  if (!item) return;
  var sClass = getStockClass(item.current_stock, item.min_stock);
  var sLabel = getStockLabel(item.current_stock, item.min_stock);
  var pct = item.min_stock > 0 ? Math.min(100, Math.round(item.current_stock / (item.min_stock * 3) * 100)) : 50;
  var barColor = item.current_stock <= 0 ? 'bg-red-500' : item.current_stock <= item.min_stock ? 'bg-amber-400' : 'bg-green-500';

  var imgUrlSrc = imgUrl(item.image_file_id);
  var imgSection = '';
  if (imgUrlSrc) {
    imgSection = '<div class="flex justify-center mb-4"><img src="' + imgUrlSrc + '" class="w-40 h-40 object-cover rounded-2xl border border-gray-200 shadow-sm" loading="lazy"></div>';
  } else {
    imgSection = '<div class="flex justify-center mb-4"><div class="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center"><i class="fi fi-rr-box-open-full text-gray-300 text-4xl"></i></div></div>';
  }

  var body = '<div class="text-center mb-5">'
    + imgSection
    + '<p class="font-mono text-xs text-navy-600 mb-1">' + escHtml(item.item_code) + '</p>'
    + '<h2 class="text-lg font-bold text-gray-800">' + escHtml(item.name) + '</h2>'
    + (item.size ? '<p class="text-sm text-gray-500 mt-1">' + escHtml(item.size) + '</p>' : '')
    + '</div>';

  body += '<div class="space-y-3">';
  body += '<div class="grid grid-cols-2 gap-3">'
    + '<div class="bg-gray-50 rounded-xl p-3 text-center"><p class="text-xs text-gray-400 mb-1">หมวดหมู่</p><p class="text-sm font-semibold text-gray-700">' + escHtml(item.category || '-') + '</p></div>'
    + '<div class="bg-gray-50 rounded-xl p-3 text-center"><p class="text-xs text-gray-400 mb-1">ประเภท</p><p class="text-sm font-semibold text-gray-700">' + escHtml(getItemTypeLabel(getResolvedItemType(item))) + '</p></div>'
    + '<div class="bg-gray-50 rounded-xl p-3 text-center"><p class="text-xs text-gray-400 mb-1">หน่วย</p><p class="text-sm font-semibold text-gray-700">' + escHtml(item.unit) + '</p></div>'
    + '</div>';

  if (getResolvedItemType(item) === 'spare_part') {
    body += '<div class="grid grid-cols-2 gap-3">'
      + '<div class="bg-violet-50 rounded-xl p-3 text-center border border-violet-100"><p class="text-xs text-violet-500 mb-1">สถานะสภาพ</p><p class="text-sm font-semibold text-violet-700">' + escHtml(ITEM_CONDITION_LABELS[item.condition_status || ''] || '-') + '</p></div>'
      + '<div class="bg-violet-50 rounded-xl p-3 text-center border border-violet-100"><p class="text-xs text-violet-500 mb-1">ติดตาม Serial</p><p class="text-sm font-semibold text-violet-700">' + (item.serial_tracking ? 'เปิดใช้งาน' : 'ไม่ติดตาม') + '</p></div>'
      + '</div>';
    if (item.spare_part_units) {
      var serialList = [];
      try { serialList = JSON.parse(item.spare_part_units); } catch(e) { serialList = String(item.spare_part_units).split(/\r?\n/); }
      serialList = (serialList || []).filter(function(s) { return String(s || '').trim(); });
      if (serialList.length) {
        body += '<div class="bg-white border border-gray-200 rounded-xl p-4">'
          + '<p class="text-xs font-semibold text-gray-500 mb-2">รายการ Serial / Item-level</p>'
          + '<div class="flex flex-wrap gap-2">';
        serialList.forEach(function(serial) {
          body += '<span class="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">' + escHtml(serial) + '</span>';
        });
        body += '</div></div>';
      }
    }
  }

  if (getMachineUsageText(item) !== '-') {
    body += '<div class="bg-gray-50 rounded-xl p-3"><p class="text-xs text-gray-400 mb-1">เครื่องจักรที่เกี่ยวข้อง</p><p class="text-sm text-gray-700">' + escHtml(getMachineUsageText(item)) + '</p></div>';
  }

  body += '<div class="bg-white border border-gray-200 rounded-xl p-4">'
    + '<div class="flex items-center justify-between mb-2">'
    + '<span class="text-sm text-gray-500">คงเหลือในระบบ</span>'
    + '<span class="text-xl font-bold text-gray-800">' + item.current_stock + ' <span class="text-sm font-normal text-gray-500">' + item.unit + '</span></span>'
    + '</div>'
    + '<div class="progress-bar mb-2"><div class="progress-fill ' + barColor + '" style="width:' + pct + '%"></div></div>'
    + '<div class="flex items-center justify-between">'
    + '<span class="text-xs text-gray-400">ขั้นต่ำ: ' + item.min_stock + ' ' + item.unit + '</span>'
    + '<span class="px-2 py-0.5 rounded-full text-xs font-medium ' + sClass + '">' + sLabel + '</span>'
    + '</div></div>';

  if (item.description) {
    body += '<div class="bg-gray-50 rounded-xl p-3"><p class="text-xs text-gray-400 mb-1">หมายเหตุ / รายละเอียด</p><p class="text-sm text-gray-700">' + escHtml(item.description) + '</p></div>';
  }

  if (item.created_at || item.updated_at) {
    body += '<div class="text-xs text-gray-400 text-center pt-1">'
      + (item.created_at ? '<span>เพิ่มเมื่อ: ' + formatDate(item.created_at) + '</span>' : '')
      + (item.updated_at ? ' <span class="mx-1">|</span> <span>อัปเดตล่าสุด: ' + formatDate(item.updated_at) + '</span>' : '')
      + '</div>';
  }
  body += '</div>';

  var footer = '<button onclick="closeModal()" class="btn-secondary">ปิด</button>'
    + '<button onclick="openWithdrawModal(\'' + item.id + '\')" class="btn-primary"><i class="fi fi-rr-inbox-out mr-1"></i>เบิกวัสดุ</button>';
  openModal('รายละเอียดวัสดุ', body, footer);
}

// ===== QR CODE =====
function showQRModal(itemId) {
  var item = _itemsData.find(function(i) { return i.id === itemId; });
  if (!item) return;
  var baseUrl = window.location.origin + window.location.pathname;
  var qrUrl  = baseUrl + '?action=withdraw&item_id=' + itemId;
  var body = '<div class="text-center">'
    + '<p class="font-semibold text-gray-700 mb-1">' + escHtml(item.name) + '</p>'
    + '<p class="text-xs text-gray-500 mb-4">' + escHtml(item.item_code) + ' • ' + escHtml(item.size || '') + ' • ' + item.unit + '</p>'
    + '<div id="qrCanvas" class="flex justify-center mb-4"></div>'
    + '<p class="text-xs text-gray-400 break-all border rounded-lg px-3 py-2 bg-gray-50">' + escHtml(qrUrl) + '</p>'
    + '<p class="text-xs text-gray-400 mt-3">พนักงานสแกน QR นี้ด้วยกล้องมือถือเพื่อเบิกวัสดุ</p></div>';
  var footer = '<button onclick="closeModal()" class="btn-secondary">ปิด</button>'
    + '<button onclick="printQRLabel(\'' + escHtml(JSON.stringify(item).replace(/'/g, '&#39;')) + '\')" class="btn-primary"><i class="fi fi-rr-print mr-1"></i>พิมพ์</button>';
  openModal('QR Code — ' + item.name, body, footer);
  setTimeout(function() {
    var canvasContainer = document.getElementById('qrCanvas');
    if (canvasContainer) {
      new QRCode(canvasContainer, {
        text: qrUrl, width: 180, height: 180,
        colorDark: '#1a2566', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M
      });
    }
  }, 100);
}

function printQRLabel(itemJson) {
  var item = JSON.parse(itemJson);
  var baseUrl = window.location.origin + window.location.pathname;
  var qrUrl  = baseUrl + '?action=withdraw&item_id=' + item.id;
  var win = window.open('', '_blank');
  var css = 'body{font-family:sarabun,sans-serif;margin:0;padding:0;background:#fff}' +
    '.label{width:58mm;height:40mm;border:1.5px dashed #ccc;padding:3mm;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;margin:4mm auto}' +
    '.name{font-size:11px;font-weight:700;color:#1a2566;margin:0 0 1mm;line-height:1.2;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.meta{font-size:8px;color:#666;margin:0 0 1mm}' +
    '.qr-wrap{width:22mm;height:22mm;margin:0 auto}' +
    '@media print{.label{border-style:solid!important;border-color:#333!important;page-break-inside:avoid;margin:2mm}}';
  win.document.write('<html><head><title>ป้าย ' + item.name + '</title><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">'
    + '<style>' + css + '</style></head><body>'
    + '<div class="label">'
    + '<p class="name">' + escHtml(item.name) + '</p>'
    + '<p class="meta">' + escHtml(item.item_code) + (item.size ? ' • ' + escHtml(item.size) : '') + '</p>'
    + '<div class="qr-wrap" id="qr"></div>'
    + '</div>'
    + '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>'
    + '<script>new QRCode(document.getElementById("qr"),{text:"' + qrUrl + '",width:80,height:80,colorDark:"#1a2566",correctLevel:QRCode.CorrectLevel.M});'
    + 'setTimeout(function(){window.print();window.close();},700);<\/script>'
    + '</body></html>');
  win.document.close();
}

// ===== STOCK =====
var _stockData = [];
var _stockView = 'card';
var _stockFilter = { search: '', category: '', type: 'all', machine: 'all' };

function updateLowStockBadge(items) {
  var lowBadge = document.getElementById('lowStockBadge');
  if (!lowBadge) return;
  var count = (items || []).filter(function(i) { return i.active !== false && i.current_stock <= i.min_stock; }).length;
  if (count > 0) { lowBadge.textContent = count; lowBadge.classList.remove('hidden'); }
  else { lowBadge.classList.add('hidden'); }
}

function renderStock() {
  showLoading('โหลดสต็อก...');
  if (_itemsData.length > 0 && (Date.now() - _itemsCacheTime) < ITEMS_CACHE_TTL) {
    hideLoading();
    _stockData = _itemsData;
    updateLowStockBadge(_itemsData);
    buildStockPage();
    return;
  }
  callAPI('getItems', AUTH.token).then(function(res) {
    hideLoading();
    if (!res.success) { showError(res.message); return; }
    _itemsData = res.data;
    _itemsCacheTime = Date.now();
    _stockData = res.data;
    updateLowStockBadge(_itemsData);
    buildStockPage();
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildStockPage() {
  var filtered = applyStockFilters(_stockData, _stockFilter);
 var html = '<div class="fade-in space-y-4">';
 html += '<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">';
 html += '<div class="flex gap-2 flex-wrap">';
 html += '<div class="relative"><i class="fi fi-rr-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>'
    + '<input type="text" id="stockSearch" placeholder="ค้นหา..." value="' + escHtml(_stockFilter.search) + '" oninput="debounceStockFilter()" class="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 w-44"></div>';
  html += '<select id="stockTypeFilter" onchange="applyStockFilter()" class="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none">';
  html += '<option value="all">ทุกประเภท</option>';
  html += '<option value="consumable"' + (_stockFilter.type === 'consumable' ? ' selected' : '') + '>วัสดุสิ้นเปลือง</option>';
  html += '<option value="spare_part"' + (_stockFilter.type === 'spare_part' ? ' selected' : '') + '>อะไหล่เครื่องจักร</option>';
  html += '</select>';
  html += '<select id="stockCatFilter" onchange="applyStockFilter()" class="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none">';
  html += '<option value="">ทุกหมวด</option>';
  getCategoryList(_stockData).forEach(function(c) { html += '<option value="' + escHtml(c) + '"' + (_stockFilter.category === c ? ' selected' : '') + '>' + escHtml(c) + '</option>'; });
  html += '</select>';
  html += '<select id="stockMachineFilter" onchange="applyStockFilter()" class="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none">';
  html += buildMachineFilterOptions(_stockFilter.machine);
  html += '</select></div>';
  html += '<div class="flex gap-2">';
  html += '<button onclick="setStockView(\'card\')" id="btnCardView" class="px-3 py-2 border rounded-xl text-sm ' + (_stockView === 'card' ? 'bg-navy-700 text-white border-navy-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50') + '"><i class="fi fi-rr-grid"></i></button>';
  html += '<button onclick="setStockView(\'table\')" id="btnTableView" class="px-3 py-2 border rounded-xl text-sm ' + (_stockView === 'table' ? 'bg-navy-700 text-white border-navy-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50') + '"><i class="fi fi-rr-list"></i></button>';
  html += '</div></div>';

  html += '<div id="stockContent">' + buildStockContent(filtered) + '</div>';
  html += '</div>';
  
  var contentEl = document.getElementById('mainContent');
  if (contentEl) contentEl.innerHTML = html;
}

function buildStockContent(data) {
  if (_stockView === 'card') {
    var html = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">';
    if (data.length === 0) html += '<p class="col-span-4 text-center text-gray-400 py-10">ไม่พบรายการ</p>';
    data.forEach(function(item) {
      var sClass = getStockClass(item.current_stock, item.min_stock);
      var sLabel = getStockLabel(item.current_stock, item.min_stock);
      var pct = item.min_stock > 0 ? Math.min(100, Math.round(item.current_stock / (item.min_stock * 3) * 100)) : 50;
      var barColor = item.current_stock <= 0 ? 'bg-red-500' : item.current_stock <= item.min_stock ? 'bg-amber-400' : 'bg-green-500';
      html += '<div class="card p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">';
      html += '<div class="flex items-start justify-between">';
      var imgUrlSrc = imgUrl(item.image_file_id);
      var cardImg = imgUrlSrc ? '<img src="' + imgUrlSrc + '" class="w-10 h-10 object-cover rounded-xl border border-gray-200" loading="lazy">' : '<div class="w-10 h-10 bg-navy-100 rounded-xl flex items-center justify-center"><i class="fi fi-rr-box-open-full text-navy-700 text-lg"></i></div>';
      html += '<div>' + cardImg + '</div>';
      html += '<span class="px-2 py-0.5 rounded-full text-xs font-medium ' + sClass + '">' + sLabel + '</span></div>';
      html += '<div><p class="font-semibold text-gray-800 text-sm leading-snug">' + escHtml(item.name) + '</p>';
      html += '<p class="text-xs text-gray-400 mt-0.5">' + escHtml(item.size || '') + ' • ' + escHtml(item.category || '') + '</p>';
      html += '<p class="text-xs text-gray-500 mt-0.5">' + escHtml(getItemTypeLabel(getResolvedItemType(item))) + ' • ' + escHtml(getMachineUsageText(item)) + '</p></div>';
      html += '<div><div class="flex justify-between text-xs text-gray-500 mb-1"><span>คงเหลือ</span><span class="font-bold text-gray-800">' + item.current_stock + ' ' + item.unit + '</span></div>';
      html += '<div class="progress-bar"><div class="progress-fill ' + barColor + '" style="width:' + pct + '%"></div></div>';
      html += '<p class="text-xs text-gray-400 mt-1">ขั้นต่ำ: ' + item.min_stock + ' ' + item.unit + '</p></div>';
      html += '<div class="flex gap-2 pt-1">';
      html += '<button onclick="showItemDetailModal(\'' + item.id + '\')" class="flex-1 btn-secondary btn-sm text-xs" title="ดูรายละเอียด"><i class="fi fi-rr-eye mr-1"></i>ดู</button>';
      if (AUTH.user.role !== 'employee') {
        html += '<button onclick="openReceiveModal(\'' + item.id + '\')" class="flex-1 btn-success btn-sm text-xs"><i class="fi fi-rr-inbox-in mr-1"></i>รับเข้า</button>';
      }
      html += '<button onclick="openWithdrawModal(\'' + item.id + '\')" class="flex-1 btn-primary btn-sm text-xs"><i class="fi fi-rr-inbox-out mr-1"></i>เบิก</button>';
      html += '</div></div>';
    });
    return html + '</div>';
  } else {
    var html = '<div class="card overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-600">';
    html += '<tr><th class="px-4 py-3 text-left">รหัส</th><th class="px-4 py-3 text-left">ชื่อวัสดุ</th><th class="px-4 py-3 text-left">ประเภท</th><th class="px-4 py-3 text-left">เครื่องจักร</th><th class="px-4 py-3 text-left">หน่วย</th>';
    html += '<th class="px-4 py-3 text-center">สต็อก</th><th class="px-4 py-3 text-center">ขั้นต่ำ</th><th class="px-4 py-3 text-center">สถานะ</th><th class="px-4 py-3 text-center">การดำเนินการ</th></tr>';
    html += '</thead><tbody class="divide-y divide-gray-100">';
    if (data.length === 0) html += '<tr><td colspan="9" class="text-center py-8 text-gray-400">ไม่พบรายการ</td></tr>';
    data.forEach(function(item) {
      var sClass = getStockClass(item.current_stock, item.min_stock);
      var resolvedType = getResolvedItemType(item);
      html += '<tr><td class="px-4 py-2.5 font-mono text-xs text-navy-700">' + escHtml(item.item_code) + '</td>';
      html += '<td class="px-4 py-2.5 font-medium text-gray-700">' + escHtml(item.name) + '</td>';
      html += '<td class="px-4 py-2.5 text-xs"><span class="px-2 py-0.5 rounded-full font-medium ' + (resolvedType === 'spare_part' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700') + '">' + escHtml(getItemTypeLabel(resolvedType)) + '</span></td>';
      html += '<td class="px-4 py-2.5 text-xs text-gray-600">' + escHtml(getMachineUsageText(item)) + '</td>';
      html += '<td class="px-4 py-2.5 text-xs text-gray-500">' + escHtml(item.unit) + '</td>';
      html += '<td class="px-4 py-2.5 text-center font-bold">' + item.current_stock + '</td>';
      html += '<td class="px-4 py-2.5 text-center text-gray-400">' + item.min_stock + '</td>';
      html += '<td class="px-4 py-2.5 text-center"><span class="px-2 py-0.5 rounded-full text-xs ' + sClass + '">' + getStockLabel(item.current_stock, item.min_stock) + '</span></td>';
      html += '<td class="px-4 py-2.5 text-center"><div class="flex gap-1 justify-center">';
      html += '<button onclick="showItemDetailModal(\'' + item.id + '\')" class="btn-secondary btn-sm text-xs" title="ดูรายละเอียด"><i class="fi fi-rr-eye"></i></button>';
      if (AUTH.user.role !== 'employee') html += '<button onclick="openReceiveModal(\'' + item.id + '\')" class="btn-success btn-sm text-xs"><i class="fi fi-rr-inbox-in mr-1"></i>รับเข้า</button>';
      html += '<button onclick="openWithdrawModal(\'' + item.id + '\')" class="btn-primary btn-sm text-xs"><i class="fi fi-rr-inbox-out mr-1"></i>เบิก</button>';
      html += '</div></td></tr>';
    });
    html += '</tbody></table></div></div>';
    return html;
  }
}

function setStockView(view) {
  _stockView = view;
  buildStockPage();
}
var _stockFilterTimer;
function debounceStockFilter() {
  clearTimeout(_stockFilterTimer);
  _stockFilterTimer = setTimeout(applyStockFilter, 250);
}
function applyStockFilters(data, f) {
  var search = String(f.search || '').trim().toLowerCase();
  var category = f.category || '';
  var type = f.type || 'all';
  var machine = f.machine || 'all';
  return (data || []).filter(function(i) {
    if (search && itemSearchHaystack(i).indexOf(search) === -1) return false;
    if (type !== 'all' && getResolvedItemType(i) !== type) return false;
    if (category && i.category !== category) return false;
    if (machine !== 'all' && !itemMatchesMachineFilter(i, machine)) return false;
    return true;
  });
}
function filterStock() {
  applyStockFilter();
}
function applyStockFilter() {
  var searchEl = document.getElementById('stockSearch');
  var typeEl = document.getElementById('stockTypeFilter');
  var catEl = document.getElementById('stockCatFilter');
  var machineEl = document.getElementById('stockMachineFilter');
  _stockFilter.search = searchEl ? searchEl.value : '';
  _stockFilter.type = typeEl ? typeEl.value : 'all';
  _stockFilter.category = catEl ? catEl.value : '';
  _stockFilter.machine = machineEl ? machineEl.value : 'all';
  var filtered = applyStockFilters(_stockData, _stockFilter);
  var contentContainer = document.getElementById('stockContent');
  if (contentContainer) contentContainer.innerHTML = buildStockContent(filtered);
}

// ===== RECEIVE =====
var _receiveData = [];
var _receivePage = 1;
var _receiveModalType = 'all';
var _receiveModalItemId = '';

function renderReceive() {
  showLoading('โหลดข้อมูลรับเข้า...');
  var itemsPromise = (_itemsData.length > 0 && (Date.now() - _itemsCacheTime) < ITEMS_CACHE_TTL)
    ? Promise.resolve({ success: true, data: _itemsData })
    : callAPI('getItems', AUTH.token).then(function(res) { _itemsData = res.data || []; _itemsCacheTime = Date.now(); return res; });
  Promise.all([ itemsPromise, callAPI('getReceives', AUTH.token, {}) ]).then(function(results) {
    hideLoading();
    _itemsData   = results[0].data || [];
    _receiveData = results[1].data || [];
    _receivePage = 1;
    buildReceivePage();
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildReceivePage() {
  var paged = paginate(_receiveData, _receivePage);
  var html = '<div class="fade-in space-y-4">';
  html += '<div class="flex items-center justify-between">';
  html += '<h3 class="font-semibold text-gray-700">ประวัติรับวัสดุเข้าคลัง</h3>';
  html += '<button onclick="openReceiveModal(null)" class="btn-primary flex items-center gap-2"><i class="fi fi-rr-plus"></i> บันทึกรับเข้า</button></div>';

  html += '<div class="card overflow-hidden"><div class="overflow-x-auto">';
  html += '<table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-600">';
  html += '<tr><th class="px-4 py-3 text-left">เลขที่รับ</th><th class="px-4 py-3 text-left">วันที่</th>';
  html += '<th class="px-4 py-3 text-left">รายการ</th><th class="px-4 py-3 text-center">จำนวน</th>';
  html += '<th class="px-4 py-3 text-left">ผู้รับ</th><th class="px-4 py-3 text-left">หมายเหตุ</th></tr></thead>';
  html += '<tbody class="divide-y divide-gray-100">';
  if (paged.length === 0) html += '<tr><td colspan="6" class="text-center py-10 text-gray-400">ยังไม่มีรายการรับเข้า</td></tr>';
  rannedRows(paged);
  
  function rannedRows(rows) {
    rows.forEach(function(r) {
      html += '<tr><td class="px-4 py-2.5 font-mono text-xs text-navy-700">' + escHtml(r.receive_no) + '</td>';
      html += '<td class="px-4 py-2.5 text-xs text-gray-600">' + formatDate(r.date) + '</td>';
      html += '<td class="px-4 py-2.5 font-medium text-gray-700">' + escHtml(r.item_name || '-') + '</td>';
      html += '<td class="px-4 py-2.5 text-center font-bold text-blue-700">+' + r.quantity + ' ' + escHtml(r.unit || '') + '</td>';
      html += '<td class="px-4 py-2.5 text-xs text-gray-500">' + escHtml(r.received_by_name || '-') + '</td>';
      html += '<td class="px-4 py-2.5 text-xs text-gray-400">' + escHtml(r.note || '-') + '</td></tr>';
    });
  }
  
  html += '</tbody></table></div></div>';
  html += '<div id="receivePagination"></div></div>';
  
  var contentEl = document.getElementById('mainContent');
  if (contentEl) contentEl.innerHTML = html;
  renderPagination('receivePagination', _receiveData.length, _receivePage, function(p) { _receivePage = p; buildReceivePage(); });
}

function refreshReceiveItemOptions() {
  var typeEl = document.getElementById('recType');
  var itemEl = document.getElementById('recItemId');
  if (!typeEl || !itemEl) return;
  var type = typeEl.value || 'all';
  var current = itemEl.value || _receiveModalItemId || '';
  var items = _itemsData.filter(function(i) {
    if (i.active === false) return false;
    return type === 'all' || getResolvedItemType(i) === type;
  });
  if (items.length === 0) {
    itemEl.innerHTML = '<option value="">- ไม่พบรายการ -</option>';
    return;
  }
  itemEl.innerHTML = items.map(function(i) {
    return '<option value="' + i.id + '">' + escHtml(i.name) + ' (' + getItemTypeLabel(getResolvedItemType(i)) + ' • คงเหลือ ' + (i.current_stock || 0) + ' ' + escHtml(i.unit || '') + ')</option>';
  }).join('');
  if (current && items.some(function(i) { return i.id === current; })) {
    itemEl.value = current;
  } else {
    itemEl.value = items[0].id;
  }
}

function openReceiveModal(itemId) {
  var item = itemId ? _itemsData.find(function(i) { return i.id === itemId; }) : null;
  _receiveModalItemId = itemId || '';
  _receiveModalType = item ? getResolvedItemType(item) : 'all';
  var body = '<div class="space-y-4">';
  body += '<div><label class="form-label">ประเภทวัสดุ *</label><select id="recType" onchange="refreshReceiveItemOptions()" class="form-input"><option value="all"' + (_receiveModalType === 'all' ? ' selected' : '') + '>ทุกประเภท</option><option value="consumable"' + (_receiveModalType === 'consumable' ? ' selected' : '') + '>วัสดุสิ้นเปลือง</option><option value="spare_part"' + (_receiveModalType === 'spare_part' ? ' selected' : '') + '>อะไหล่เครื่องจักร</option></select></div>';
  body += '<div><label class="form-label">เลือกวัสดุ *</label><select id="recItemId" class="form-input"></select></div>';
  if (item) {
    body += '<p class="text-xs text-gray-500">รายการที่เลือกไว้: <span class="font-medium text-gray-700">' + escHtml(item.name) + '</span> • ' + getItemTypeLabel(getResolvedItemType(item)) + '</p>';
  }
  body += fieldHTML('จำนวนที่รับ *', 'recQty', 'number', 1);
  body += fieldHTML('วันที่', 'recDate', 'date', new Date().toISOString().split('T')[0]);
  body += '<div class="sm:col-span-2"><label class="form-label">หมายเหตุ</label><textarea id="recNote" class="form-input" rows="2"></textarea></div>';
  body += '</div>';
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="submitReceive()" class="btn-success"><i class="fi fi-rr-inbox-in mr-1"></i>บันทึกรับเข้า</button>';
  openModal('รับวัสดุเข้าคลัง', body, footer);
  refreshReceiveItemOptions();
  var recItemEl = document.getElementById('recItemId');
  if (recItemEl && _receiveModalItemId) recItemEl.value = _receiveModalItemId;
}

function submitReceive() {
  var itemEl = document.getElementById('recItemId');
  var typeEl = document.getElementById('recType');
  var qtyEl = document.getElementById('recQty');
  var dateEl = document.getElementById('recDate');
  var noteEl = document.getElementById('recNote');
  
  var itemId = itemEl ? itemEl.value : '';
  var itemType = typeEl ? typeEl.value : 'all';
  var qty    = qtyEl ? parseInt(qtyEl.value) || 0 : 0;
  var date   = dateEl ? dateEl.value : '';
  var note   = noteEl ? noteEl.value : '';
  
  if (!itemId) { showError('กรุณาเลือกวัสดุ'); return; }
  if (!qty || qty <= 0) { showError('จำนวนไม่ถูกต้อง'); return; }
  showLoading('กำลังบันทึก...');
  callAPI('addReceive', AUTH.token, { item_id: itemId, item_type: itemType, quantity: qty, date: date, note: note }).then(function(res) {
    hideLoading(); closeModal();
    if (res.success) { showSuccess(res.message); renderReceive(); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

// ===== STOCKTAKE =====
function renderStocktake() {
  showLoading('โหลดข้อมูล...');
  var itemsPromise = (_itemsData.length > 0 && (Date.now() - _itemsCacheTime) < ITEMS_CACHE_TTL)
    ? Promise.resolve({ success: true, data: _itemsData })
    : callAPI('getItems', AUTH.token).then(function(res) { _itemsData = res.data || []; _itemsCacheTime = Date.now(); return res; });
  itemsPromise.then(function(res) {
    hideLoading();
    _itemsData = res.data || [];
    buildStocktakePage();
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildStocktakePage() {
  var html = '<div class="fade-in space-y-4">';
  html += '<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">';
  html += '<h3 class="font-semibold text-gray-700"><i class="fi fi-rr-clipboard-list text-navy-600 mr-2"></i>นับสต็อก</h3>';
  html += '<button onclick="submitStocktake()" class="btn-primary"><i class="fi fi-rr-disk mr-1"></i>บันทึกการปรับยอด</button></div>';
  html += '<p class="text-xs text-gray-500">กรอกจำนวนที่นับได้จริงในช่อง "นับจริง" แล้วกดบันทึก ระบบจะปรับยอดให้อัตโนมัติ</p>';
  html += '<div class="card overflow-hidden"><div class="overflow-x-auto">';
  html += '<table class="w-full text-sm"><thead class="bg-gray-50 text-gray-600 text-xs">';
  html += '<tr><th class="px-4 py-3 text-left">รหัส/ชื่อ</th><th class="px-4 py-3 text-center">ระบบ</th><th class="px-4 py-3 text-center">นับจริง</th><th class="px-4 py-3 text-center">ผลต่าง</th></tr></thead>';
  html += '<tbody class="divide-y divide-gray-100">';
  _itemsData.forEach(function(item) {
    html += '<tr data-st-id="' + item.id + '"><td class="px-4 py-3"><p class="font-medium text-gray-800">' + escHtml(item.name) + '</p><p class="text-xs text-gray-500">' + escHtml(item.item_code) + ' • ' + escHtml(item.unit) + '</p></td>';
    html += '<td class="px-4 py-3 text-center font-bold text-gray-800">' + item.current_stock + '</td>';
    // 🟢 ซ่อม UI: เพิ่ม data-sys มารองรับที่ช่อง input โดยตรงเพื่อให้ลอจิกหยิบไปประมวลผลคำนวณผลต่างได้แม่นยำ
    html += '<td class="px-4 py-3 text-center"><input type="number" class="st-count w-20 border border-gray-300 rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" data-id="' + item.id + '" data-sys="' + item.current_stock + '" value="' + item.current_stock + '"></td>';
    html += '<td class="px-4 py-3 text-center"><span class="st-diff text-xs font-medium">-</span></td></tr>';
  });
  html += '</tbody></table></div></div></div>';
  
  var contentEl = document.getElementById('mainContent');
  if (contentEl) contentEl.innerHTML = html;
  
  // ฟังก์ชั่นคำนวณผลต่างแบบเรียลไทม์ (Real-time Calculator)
  function calculateRowDiff(inp) {
    var row = inp.closest('tr');
    if (!row) return;
    var diffEl = row.querySelector('.st-diff');
    if (!diffEl) return;
    
    var sys = parseInt(inp.getAttribute('data-sys')) || 0;
    var act = parseInt(inp.value) || 0;
    var diff = act - sys;
    
    if (diff === 0) { diffEl.textContent = '-'; diffEl.className = 'st-diff text-xs font-medium text-gray-400'; }
    else if (diff > 0) { diffEl.textContent = '+' + diff; diffEl.className = 'st-diff text-xs font-medium text-green-600'; }
    else { diffEl.textContent = '' + diff; diffEl.className = 'st-diff text-xs font-medium text-red-600'; }
  }

  document.querySelectorAll('.st-count').forEach(function(inp) {
    // 🟢 ซ่อม UI: สั่งให้ผูก Event คอยคำนวณค่าเมื่อมีการเปลี่ยนแปลงตัวเลขในช่องนับจริง
    inp.addEventListener('input', function() { calculateRowDiff(inp); });
    // 🟢 ซ่อม UI: กระตุ้นการคำนวณผลลัพธ์รอบแรกสุดทันทีตั้งแต่เปิดหน้าแอปพลิเคชัน
    calculateRowDiff(inp); 
  });
} 

function submitStocktake() {
  var inputs = document.querySelectorAll('.st-count');
  var adjustments = [];
  
  inputs.forEach(function(inp) {
    var sys = parseInt(inp.getAttribute('data-sys')) || 0;
    var act = parseInt(inp.value) || 0;
    
    // หากยอดนับจริงไม่ตรงกับระบบ ให้เตรียมข้อมูลปรับยอด
    if (act !== sys) {
      var itemId = inp.getAttribute('data-id');
      var originalItem = _itemsData.find(function(i) { return i.id === itemId; });
      
      if (originalItem) {
        var updatedData = Object.assign({}, originalItem, {
          current_stock: act,
          updated_at: new Date().toISOString()
        });
        
        delete updatedData.id; 
        
        adjustments.push({ 
          item_id: itemId, 
          payload: updatedData 
        });
      }
    }
  });

  if (adjustments.length === 0) { 
    showError('ไม่มีรายการที่ต้องปรับยอด'); 
    return; 
  }
  
  // เรียกใช้กล่องข้อความยืนยันดีไซน์โมเดิร์นของระบบคุณ
  showConfirm('ยืนยันปรับยอด', 'มี ' + adjustments.length + ' รายการที่ต้องปรับยอด ยืนยัน?', function() {
    showLoading('กำลังปรับยอดสต็อกนับจริง...');
    
    var promiseChain = Promise.resolve();
    
    adjustments.forEach(function(adj) {
      promiseChain = promiseChain.then(function() {
        return callAPI('updateItem', AUTH.token, adj.item_id, adj.payload);
      });
    });
    
    promiseChain.then(function() {
      hideLoading();
      showSuccess('ปรับยอดเรียบร้อย ' + adjustments.length + ' รายการ');
      _itemsCacheTime = 0; // ล้างแคชเพื่อบังคับหน้าเว็บดึงยอดดิบล่าสุดจาก Sheets จริงๆ
      renderStocktake();  // รีเฟรชหน้านับสต็อกเพื่อแสดงตัวเลขใหม่
    }).catch(function(err) { 
      hideLoading(); 
      console.error('Stocktake save error:', err);
      showError('เกิดข้อผิดพลาดในการบันทึกข้อมูลบางรายการ'); 
    });
  });
}
// ===== PRINT QR LABELS =====
var _printQRFilter = { search: '', category: 'all' };
function renderPrintQRLabels() {
  showLoading('โหลดข้อมูล...');
  var itemsPromise = (_itemsData.length > 0 && (Date.now() - _itemsCacheTime) < ITEMS_CACHE_TTL)
    ? Promise.resolve({ success: true, data: _itemsData })
    : callAPI('getItems', AUTH.token).then(function(res) { _itemsData = res.data || []; _itemsCacheTime = Date.now(); return res; });
  itemsPromise.then(function(results) {
    hideLoading();
    _itemsData = results.data || [];
    buildPrintQRPage();
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildPrintQRPage() {
  var source = _itemsData || [];
  var filtered = source.filter(function(i) {
    if (i.active === false) return false;
    if (_printQRFilter.search) {
      var term = _printQRFilter.search.toLowerCase();
      var name = (i.name || '').toLowerCase();
      var code = (i.item_code || '').toLowerCase();
      if (!name.includes(term) && !code.includes(term)) return false;
    }
    if (_printQRFilter.category !== 'all' && i.category !== _printQRFilter.category) return false;
    return true;
  });
  var cats = getCategoryList(_itemsData);

  var html = '<div class="fade-in space-y-4">';
  html += '<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">';
  html += '<div class="flex gap-2 flex-wrap">';
  html += '<div class="relative"><i class="fi fi-rr-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>';
  html += '<input type="text" id="printQRSearch" placeholder="ค้นหาวัสดุ..." value="' + escHtml(_printQRFilter.search) + '" onkeyup="debouncePrintQRFilter()" class="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 w-48"></div>';
  html += '<select id="printQRCat" onchange="applyPrintQRFilter()" class="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none">';
  html += '<option value="all">ทุกหมวด</option>';
  cats.forEach(function(c) { html += '<option value="' + escHtml(c) + '" ' + (_printQRFilter.category === c ? 'selected' : '') + '>' + escHtml(c) + '</option>'; });
  html += '</select></div>';
  html += '<div class="flex gap-2">';
  html += '<button onclick="toggleSelectAllQR()" class="btn-secondary btn-sm"><i class="fi fi-rr-check mr-1"></i>เลือกทั้งหมด/ยกเลิก</button>';
  html += '<button onclick="printSelectedQRLabels()" class="btn-primary btn-sm"><i class="fi fi-rr-print mr-1"></i>พิมพ์ที่เลือก</button></div></div>';
  html += '<p class="text-xs text-gray-500">เลือกรายการที่ต้องการพิมพ์แล้วกดปุ่ม พิมพ์ที่เลือก (เลือกได้สูงสุด 20 รายการ/หน้า)</p>';

  html += '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">';
  if (filtered.length === 0) html += '<p class="col-span-full text-center text-gray-400 py-10">ไม่พบรายการ</p>';
  filtered.forEach(function(item) {
    var img = imgUrl(item.image_file_id);
    var iconClass = 'fi fi-rr-box-open-full';
    var imgHtml = img ? '<img src="' + img + '" class="w-10 h-10 object-cover rounded-lg border border-gray-200">' : '<div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center"><i class="' + iconClass + ' text-gray-400 text-sm"></i></div>';
    var name = item.name;
    var code = item.item_code;
    html += '<label class="card p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow" onclick="event.stopPropagation()">';
    html += '<input type="checkbox" class="qr-print-check w-4 h-4 accent-navy-600 flex-shrink-0" data-id="' + item.id + '" data-type="item">';
    html += imgHtml;
    html += '<div class="min-w-0"><p class="text-sm font-medium text-gray-800 truncate">' + escHtml(name) + '</p>';
    html += '<p class="text-xs text-gray-500">' + escHtml(code || '') + '</p></div>';
    html += '</label>';
  });
  html += '</div></div>';
  
  var contentEl = document.getElementById('mainContent');
  if (contentEl) contentEl.innerHTML = html;
}

var _printQRFilterTimer;
function debouncePrintQRFilter() { clearTimeout(_printQRFilterTimer); _printQRFilterTimer = setTimeout(applyPrintQRFilter, 300); }
function applyPrintQRFilter() {
  var searchEl = document.getElementById('printQRSearch');
  var catEl = document.getElementById('printQRCat');
  _printQRFilter.search   = searchEl ? searchEl.value : '';
  _printQRFilter.category = catEl ? catEl.value : 'all';
  buildPrintQRPage();
}
function toggleSelectAllQR() {
  var checks = document.querySelectorAll('.qr-print-check');
  var allChecked = Array.prototype.every.call(checks, function(c) { return c.checked; });
  checks.forEach(function(c) { c.checked = !allChecked; });
}

function printSelectedQRLabels() {
  var selected = [];
  document.querySelectorAll('.qr-print-check:checked').forEach(function(c) {
    var id = c.getAttribute('data-id');
    var item = _itemsData.find(function(i) { return i.id === id; });
    if (item) selected.push({ data: item, type: 'item' });
  });
  if (selected.length === 0) { showError('กรุณาเลือกอย่างน้อย 1 รายการ'); return; }

  var baseUrl = window.location.origin + window.location.pathname;
  var win = window.open('', '_blank');
  var css = 'body{font-family:sarabun,sans-serif;margin:0;padding:8mm;background:#fff}' +
    '@media print{@page{size:A4;margin:8mm}}' +
    '.sheet{display:flex;flex-wrap:wrap;gap:5mm;justify-content:flex-start}' +
    '.label{width:50mm;height:40mm;border:1px solid #ccc;padding:3mm;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;page-break-inside:avoid}' +
    '.name{font-size:10px;font-weight:700;color:#1a2566;margin:0 0 1mm;line-height:1.2;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.meta{font-size:8px;color:#666;margin:0 0 1.5mm}' +
    '.qr-wrap{width:22mm;height:22mm}';

  var bodyHtml = '<div class="sheet">';
  selected.forEach(function(s) {
    var item = s.data;
    var qrUrl = baseUrl + '?action=withdraw&item_id=' + item.id;
    var name = item.name;
    var code = item.item_code;
    var extra = item.size || '';
    var uid = s.type + '_' + item.id;
    bodyHtml += '<div class="label">';
    bodyHtml += '<p class="name">' + escHtml(name) + '</p>';
    bodyHtml += '<p class="meta">' + escHtml(code) + (extra ? ' • ' + escHtml(extra) : '') + '</p>';
    bodyHtml += '<div class="qr-wrap" id="qr_' + uid + '"></div>';
    bodyHtml += '</div>';
  });
  bodyHtml += '</div>';

  var scriptHtml = '';
  selected.forEach(function(s) {
    var item = s.data;
    var qrUrl = baseUrl + '?action=withdraw&item_id=' + item.id;
    var uid = s.type + '_' + item.id;
    scriptHtml += 'new QRCode(document.getElementById("qr_' + uid + '"),{text:"' + qrUrl + '",width:80,height:80,colorDark:"#1a2566",correctLevel:QRCode.CorrectLevel.M});';
  });

  win.document.write('<html><head><title>พิมพ์ QR สติ๊กเกอร์</title><link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">'
    + '<style>' + css + '</style></head><body>' + bodyHtml
    + '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>'
    + '<script>' + scriptHtml + 'setTimeout(function(){window.print();},' + (selected.length * 150 + 300) + ');<\/script>'
    + '</body></html>');
  win.document.close();
}

// ===== WITHDRAW =====
var _wdData    = [];
var _wdPage    = 1;
var _wdFilter = 'all';
var _wdSearch = '';
var _wdTypeFilter = 'all';
var _wdMachineFilter = 'all';

function renderWithdraw() {
  showLoading('โหลดข้อมูล...');
  var itemsPromise = (_itemsData.length > 0 && (Date.now() - _itemsCacheTime) < ITEMS_CACHE_TTL)
    ? Promise.resolve({ success: true, data: _itemsData })
    : callAPI('getItems', AUTH.token).then(function(res) { _itemsData = res.data || []; _itemsCacheTime = Date.now(); return res; });
  Promise.all([ itemsPromise, callAPI('getWithdrawals', AUTH.token, { status: 'all' }) ]).then(function(results) {
    hideLoading();
    _itemsData = results[0].data || [];
    _wdData    = results[1].data || [];
    _wdPage    = 1;
    buildWithdrawPage();
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildWithdrawPage() {
  var filtered = applyWithdrawPageFilters(_wdData);
  var paged    = paginate(filtered, _wdPage);

  var html = '<div class="fade-in space-y-4">';
  html += '<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">';
  html += '<h3 class="font-semibold text-gray-700 flex items-center gap-2"><i class="fi fi-rr-inbox-out text-navy-600"></i> รายการคำขอเบิกวัสดุ</h3>';
  html += '<button onclick="openWithdrawSelectModal()" class="btn-primary flex items-center gap-2"><i class="fi fi-rr-plus"></i> ยื่นคำขอเบิก</button></div>';

  html += '<div class="flex gap-2 flex-wrap">';
  html += '<div class="relative"><i class="fi fi-rr-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>';
  html += '<input type="text" id="wdSearch" placeholder="ค้นหาเลขที่ / รายการ..." value="' + escHtml(_wdSearch) + '" oninput="debounceWdPageFilter()" class="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 w-56"></div>';
  html += '<select id="wdTypeFilter" onchange="applyWdPageFilter()" class="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none">';
  html += '<option value="all">ทุกประเภท</option><option value="consumable"' + (_wdTypeFilter === 'consumable' ? ' selected' : '') + '>วัสดุสิ้นเปลือง</option><option value="spare_part"' + (_wdTypeFilter === 'spare_part' ? ' selected' : '') + '>อะไหล่เครื่องจักร</option></select>';
  html += '<select id="wdMachineFilter" onchange="applyWdPageFilter()" class="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none">';
  html += buildMachineFilterOptions(_wdMachineFilter);
  html += '</select></div>';

  html += '<div class="flex gap-2 border-b">';
  ['all', 'pending', 'approved', 'rejected'].forEach(function(s) {
    var labels = { all: 'ทั้งหมด', pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธ' };
    var count  = s === 'all' ? _wdData.length : _wdData.filter(function(w) { return w.status === s; }).length;
    html += '<button onclick="setWdFilter(\'' + s + '\')" class="pb-2.5 px-3 text-sm font-medium border-b-2 transition '
      + (_wdFilter === s ? 'border-navy-700 text-navy-700' : 'border-transparent text-gray-500 hover:text-gray-700') + '">'
      + labels[s] + ' <span class="ml-1 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">' + count + '</span></button>';
  });
  html += '</div>';

  html += '<div class="card overflow-hidden"><div class="overflow-x-auto">';
  html += '<table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-600">';
  html += '<tr><th class="px-4 py-3 text-left">เลขที่เบิก</th><th class="px-4 py-3 text-left">วันที่</th>';
  html += '<th class="px-4 py-3 text-left">รายการ</th><th class="px-4 py-3 text-center">ขอ/อนุมัติ</th>';
  html += '<th class="px-4 py-3 text-left">วัตถุประสงค์</th><th class="px-4 py-3 text-left">ผู้ขอ</th>';
  html += '<th class="px-4 py-3 text-center">สถานะ</th><th class="px-4 py-3 text-center">จัดการ</th></tr></thead>';
  html += '<tbody class="divide-y divide-gray-100">';

  if (paged.length === 0) {
    html += '<tr><td colspan="8" class="text-center py-10 text-gray-400">ไม่พบรายการ</td></tr>';
  }
  paged.forEach(function(w) {
    var badgeClass = w.status === 'approved' ? 'badge-approved' : w.status === 'rejected' ? 'badge-rejected' : 'badge-pending';
    var statusLabel = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธ' }[w.status] || w.status;
    var item = _itemsData.find(function(i) { return i.id === w.item_id; });
    var itemType = getResolvedItemType(item || w);
    html += '<tr>';
    html += '<td class="px-4 py-2.5 font-mono text-xs text-navy-700">' + escHtml(w.withdraw_no) + (w.via_qr ? '<span class="ml-1 text-teal-600 text-xs" title="สแกน QR"><i class="fi fi-rr-qr-scan"></i></span>' : '') + '</td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-500">' + formatDate(w.requested_at) + '</td>';
    html += '<td class="px-4 py-2.5 font-medium text-gray-700 max-w-xs">';
    html += '<p class="truncate">' + escHtml(w.item_name) + '</p>';
    html += '<p class="text-xs text-gray-400 truncate">' + escHtml(getItemTypeLabel(itemType)) + ' • ' + escHtml(getMachineUsageText(item)) + '</p>';
    html += '</td>';
    html += '<td class="px-4 py-2.5 text-center text-xs"><span class="text-gray-800 font-bold">' + w.quantity_requested + '</span>';
    if (w.status === 'approved') html += '<span class="text-green-600 ml-1">/' + w.quantity_approved + '</span>';
    html += ' <span class="text-gray-400">' + escHtml(w.unit) + '</span></td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-500 max-w-xs truncate">' + escHtml(getWithdrawReasonLabel(w.purpose)) + '</td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-600">' + escHtml(w.requested_by_name || '-') + '</td>';
    html += '<td class="px-4 py-2.5 text-center"><span class="px-2 py-0.5 rounded-full text-xs font-medium ' + badgeClass + '">' + statusLabel + '</span></td>';
    html += '<td class="px-4 py-2.5 text-center"><div class="flex gap-1 justify-center">';
    if (w.status === 'pending') {
      if (AUTH.user.role === 'admin') {
        html += '<button onclick="openApproveModal(\'' + w.id + '\',' + w.quantity_requested + ')" class="btn-success btn-sm text-xs"><i class="fi fi-rr-check mr-1"></i>อนุมัติ</button>';
        html += '<button onclick="openRejectModal(\'' + w.id + '\')" class="btn-danger btn-sm text-xs"><i class="fi fi-rr-cross mr-1"></i>ปฏิเสธ</button>';
      }
      if (w.requested_by === AUTH.user.id) {
        html += '<button onclick="doCancelWithdrawal(\'' + w.id + '\')" class="btn-secondary btn-sm text-xs"><i class="fi fi-rr-cross mr-1"></i>ยกเลิก</button>';
      }
    } else {
      html += '<span class="text-xs text-gray-400">—</span>';
    }
    html += '</div></td></tr>';
  });
  html += '</tbody></table></div></div>';

  html += '<div id="wdPagination"></div></div>';
  
  var contentEl = document.getElementById('mainContent');
  if (contentEl) contentEl.innerHTML = html;
  renderPagination('wdPagination', filtered.length, _wdPage, function(p) { _wdPage = p; buildWithdrawPage(); });
}

function setWdFilter(f) { _wdFilter = f; _wdPage = 1; buildWithdrawPage(); }
var _wdFilterTimer;
function debounceWdPageFilter() {
  clearTimeout(_wdFilterTimer);
  _wdFilterTimer = setTimeout(applyWdPageFilter, 250);
}
function getWithdrawRecordItem(w) {
  if (!w) return null;
  return _itemsData.find(function(i) { return i.id === w.item_id; }) || null;
}
function applyWithdrawPageFilters(data) {
  var search = String(_wdSearch || '').trim().toLowerCase();
  var type = _wdTypeFilter || 'all';
  var machine = _wdMachineFilter || 'all';
  return (data || []).filter(function(w) {
    if (_wdFilter !== 'all' && w.status !== _wdFilter) return false;
    var item = getWithdrawRecordItem(w);
    var itemType = getResolvedItemType(item || w);
    if (type !== 'all' && itemType !== type) return false;
    if (machine !== 'all' && !itemMatchesMachineFilter(item || w, machine)) return false;
    if (search) {
      var hay = [
        w.withdraw_no || '',
        w.item_name || '',
        w.item_code || '',
        w.purpose || '',
        w.requested_by_name || '',
        item ? item.name : '',
        item ? item.category : '',
        item ? item.machine_name : '',
        item ? item.compatible_machines : ''
      ].join(' ').toLowerCase();
      if (hay.indexOf(search) === -1) return false;
    }
    return true;
  });
}
function applyWdPageFilter() {
  var searchEl = document.getElementById('wdSearch');
  var typeEl = document.getElementById('wdTypeFilter');
  var machineEl = document.getElementById('wdMachineFilter');
  _wdSearch = searchEl ? searchEl.value : '';
  _wdTypeFilter = typeEl ? typeEl.value : 'all';
  _wdMachineFilter = machineEl ? machineEl.value : 'all';
  _wdPage = 1;
  buildWithdrawPage();
}

function openWithdrawSelectModal() {
  if (_itemsData.length === 0) {
    showLoading('โหลด...');
    callAPI('getItems', AUTH.token).then(function(res) { hideLoading(); _itemsData = res.data || []; _openWdSelect(); });
  } else _openWdSelect();
}
function _openWdSelect() {
  var body = '<div class="space-y-3">'
    + '<div class="flex gap-2">'
    + '<div class="relative flex-1"><i class="fi fi-rr-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>'
    + '<input type="text" id="wdItemSearch" placeholder="ค้นหาวัสดุ..." onkeyup="filterWdItemList()" class="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"></div>'
    + '<button onclick="startWdQRScanner()" class="btn-primary px-3 py-2.5 rounded-xl" title="สแกน QR"><i class="fi fi-rr-qr-scan text-lg"></i></button></div>'
    + '<div id="wdItemList" class="max-h-72 overflow-y-auto space-y-1">' + buildWdItemList(_itemsData) + '</div>'
    + '<div id="wdQRReader" class="hidden"></div></div>';
  openModal('เลือกรายการวัสดุที่ต้องการเบิก', body, '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>');
}
function startWdQRScanner() {
  var searchWrap = document.getElementById('wdItemSearch');
  var listWrap = document.getElementById('wdItemList');
  var qrDiv = document.getElementById('wdQRReader');
  
  if (searchWrap) searchWrap.parentNode.parentNode.classList.add('hidden');
  if (listWrap) listWrap.classList.add('hidden');
  if (qrDiv) {
    qrDiv.classList.remove('hidden');
    qrDiv.innerHTML = '<div class="text-center py-4"><div id="wd-qr-reader" class="mx-auto" style="width:280px"></div><button onclick="stopWdQRScanner()" class="btn-secondary btn-sm mt-3"><i class="fi fi-rr-cross mr-1"></i>ปิดกล้อง</button></div>';
  }
  
  setTimeout(function() {
    try {
      _qrScanner = new Html5Qrcode('wd-qr-reader');
      _qrScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        function(decodedText) {
          stopWdQRScanner();
          try {
            var url = new URL(decodedText);
            var action = url.searchParams.get('action');
            var itemId = url.searchParams.get('item_id');
            if (action === 'withdraw' && itemId) {
              closeModal();
              openWithdrawFromQR(itemId);
            } else {
              showError('QR Code ไม่ถูกต้อง');
              stopWdQRScanner();
            }
          } catch(e) {
            showError('QR Code ไม่ถูกต้อง');
            stopWdQRScanner();
          }
        },
        function(errorMessage) {}
      ).catch(function(err) {
        showError('ไม่สามารถเปิดกล้องได้');
      });
    } catch(e) {
      showError('เบราว์เซอร์นี้ไม่รองรับการใช้งานกล้อง');
    }
  }, 200);
}
function stopWdQRScanner() {
  var searchWrap = document.getElementById('wdItemSearch');
  var listWrap = document.getElementById('wdItemList');
  var qrDiv = document.getElementById('wdQRReader');
  
  var resetUI = function() {
    if (searchWrap) searchWrap.parentNode.parentNode.classList.remove('hidden');
    if (listWrap) listWrap.classList.remove('hidden');
    if (qrDiv) qrDiv.classList.add('hidden');
  };

  if (_qrScanner) {
    _qrScanner.stop().then(function() {
      _qrScanner = null; resetUI();
    }).catch(function() {
      _qrScanner = null; resetUI();
    });
  } else {
    resetUI();
  }
}
function buildWdItemList(data) {
  if (data.length === 0) return '<p class="text-center text-sm text-gray-400 py-4">ไม่พบรายการ</p>';
  return data.map(function(i) {
    var sClass = getStockClass(i.current_stock, i.min_stock);
    var imgUrlSrc = imgUrl(i.image_file_id);
    var imgHtml = imgUrlSrc ? '<img src="' + imgUrlSrc + '" class="w-9 h-9 object-cover rounded-xl border border-gray-200 flex-shrink-0" loading="lazy">' : '<div class="w-9 h-9 bg-navy-100 rounded-xl flex items-center justify-center flex-shrink-0"><i class="fi fi-rr-box-open-full text-navy-700 text-sm"></i></div>';
    return '<div onclick="selectWdItem(\'' + i.id + '\')" class="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-navy-50 border border-transparent hover:border-navy-200 transition">'
      + imgHtml
      + '<div class="flex-1 min-w-0"><p class="text-sm font-medium text-gray-700 truncate">' + escHtml(i.name) + '</p>'
      + '<p class="text-xs text-gray-400">' + escHtml(i.item_code) + ' • ' + escHtml(i.size || '') + ' • ' + i.current_stock + ' ' + i.unit + '</p></div>'
      + '<span class="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ' + sClass + '">' + getStockLabel(i.current_stock, i.min_stock) + '</span></div>';
  }).join('');
}
function filterWdItemList() {
  var searchEl = document.getElementById('wdItemSearch');
  var q = searchEl ? searchEl.value : '';
  var filtered = _itemsData.filter(function(i) { return !q || i.name.toLowerCase().includes(q.toLowerCase()) || (i.item_code || '').includes(q); });
  var listEl = document.getElementById('wdItemList');
  if (listEl) listEl.innerHTML = buildWdItemList(filtered);
}
function selectWdItem(id) {
  closeModal();
  openWithdrawModal(id);
}

function openWithdrawModal(itemId) {
  var item = _itemsData.find(function(i) { return i.id === itemId; });
  if (!item) return;
  var body = '<div class="space-y-4">';
  body += '<input type="hidden" id="wdItemId" value="' + itemId + '">';
  body += '<input type="hidden" id="wdViaQr" value="false">';
  body += '<p class="text-sm text-gray-600">รายการ: <b>' + escHtml(item.name) + '</b> (คงเหลือ ' + item.current_stock + ' ' + item.unit + ')</p>';
  body += fieldHTML('จำนวนที่ต้องการเบิก *', 'wdQty', 'number', 1);
  body += '<div class="sm:col-span-2"><label class="form-label">วัตถุประสงค์ *</label><input type="text" id="wdPurpose" class="form-input" placeholder="ระบุวัตถุประสงค์..."></div>';
  body += '<div class="sm:col-span-2"><label class="form-label">หมายเหตุ</label><textarea id="wdNote" class="form-input" rows="2"></textarea></div>';
  body += '</div>';
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="submitWithdraw()" class="btn-primary"><i class="fi fi-rr-inbox-out mr-1"></i>ยื่นคำขอเบิก</button>';
  openModal('เบิกวัสดุ', body, footer);
}

function openWithdrawFromQR(itemId) {
  showLoading('โหลดข้อมูล...');
  function _build(item) {
    hideLoading();
    var img = imgUrl(item.image_file_id);
    var body = '<div class="space-y-4">';
    body += '<input type="hidden" id="wdItemId" value="' + itemId + '">';
    body += '<input type="hidden" id="wdViaQr" value="true">';
    if (img) body += '<div class="flex justify-center"><img src="' + img + '" class="w-24 h-24 object-cover rounded-xl border border-gray-200 shadow-sm"></div>';
    body += '<p class="text-sm text-gray-600 text-center">รายการ: <b>' + escHtml(item.name) + '</b> (คงเหลือ ' + item.current_stock + ' ' + item.unit + ')</p>';
    body += fieldHTML('จำนวนที่ต้องการเบิก *', 'wdQty', 'number', 1);
    body += '<div class="sm:col-span-2"><label class="form-label">วัตถุประสงค์ *</label><input type="text" id="wdPurpose" class="form-input" placeholder="ระบุวัตถุประสงค์..."></div>';
    body += '<div class="sm:col-span-2"><label class="form-label">หมายเหตุ</label><textarea id="wdNote" class="form-input" rows="2"></textarea></div>';
    body += '</div>';
    var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
      + '<button onclick="submitWithdraw()" class="btn-primary"><i class="fi fi-rr-inbox-out mr-1"></i>ยื่นคำขอเบิก</button>';
    openModal('เบิกวัสดุ (QR)', body, footer);
  }
  if (_itemsData.length > 0 && (Date.now() - _itemsCacheTime) < ITEMS_CACHE_TTL) {
    var item = _itemsData.find(function(i) { return i.id == itemId || i.item_code === itemId; });
    if (item) { _build(item); return; }
  }
  callAPI('getItems', AUTH.token).then(function(res) {
    _itemsData = res.data || [];
    _itemsCacheTime = Date.now();
    var item = _itemsData.find(function(i) { return i.id == itemId || i.item_code === itemId; });
    if (!item) { hideLoading(); showError('ไม่พบรายการวัสดุจาก QR (ID: ' + itemId + ')'); return; }
    _build(item);
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function submitWithdraw() {
  var itemEl = document.getElementById('wdItemId');
  var qtyEl = document.getElementById('wdQty');
  var purposeEl = document.getElementById('wdPurpose');
  var noteEl = document.getElementById('wdNote');
  var qrEl = document.getElementById('wdViaQr');
  
  var itemId  = itemEl ? itemEl.value : '';
  var qty     = qtyEl ? parseInt(qtyEl.value) || 0 : 0;
  var purpose = purposeEl ? purposeEl.value : '';
  var note    = noteEl ? noteEl.value : '';
  var viaQr   = qrEl ? qrEl.value === 'true' : false;
  
  if (!itemId) { showError('ไม่พบรายการวัสดุ'); return; }
  if (!qty || qty <= 0) { showError('กรุณาระบุจำนวนที่ถูกต้อง'); return; }
  if (!purpose) { showError('กรุณาระบุวัตถุประสงค์'); return; }
  showLoading('กำลังยื่นคำขอ...');
  callAPI('addWithdrawal', AUTH.token, { item_id: itemId, quantity: qty, purpose: purpose, note: note, via_qr: viaQr }).then(function(res) {
    hideLoading(); closeModal();
    if (res.success) {
      showSuccess('ยื่นคำขอ ' + res.withdraw_no + ' เรียบร้อย รอการอนุมัติ');
      if (_currentPage === 'withdraw') renderWithdraw();
      else if (_currentPage === 'dashboard') renderDashboard();
    } else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

// ===== APPROVE =====
var _approveData = [];
var _approvePage = 1;

function renderApprove() {
  if (AUTH.user.role !== 'admin') { loadPage('dashboard'); return; }
  showLoading('โหลดคำขอเบิก...');
  callAPI('getWithdrawals', AUTH.token, { status: 'all' }).then(function(res) {
    hideLoading();
    _approveData = res.data || [];
    _approvePage = 1;
    buildApprovePage('pending');
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildApprovePage(filterStatus) {
  filterStatus = filterStatus || 'pending';
  var data    = _approveData.filter(function(w) { return filterStatus === 'all' ? true : w.status === filterStatus; });
  var paged   = paginate(data, _approvePage);
  var pendingCount = _approveData.filter(function(w) { return w.status === 'pending'; }).length;

  var html = '<div class="fade-in space-y-4">';
  html += '<div class="flex items-center justify-between">';
  html += '<h3 class="font-semibold text-gray-700 flex items-center gap-2"><i class="fi fi-rr-check-circle text-navy-600"></i> อนุมัติการเบิกวัสดุ';
  if (pendingCount > 0) html += ' <span class="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">' + pendingCount + '</span>';
  html += '</h3>';
  html += '<div class="flex gap-2">';
  ['pending', 'approved', 'rejected', 'all'].forEach(function(s) {
    var labels = { pending: 'รอดำเนินการ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธแล้ว', all: 'ทั้งหมด' };
    html += '<button onclick="buildApprovePage(\'' + s + '\')" class="px-3 py-1.5 rounded-xl text-xs font-medium border transition '
      + (filterStatus === s ? 'bg-navy-700 text-white border-navy-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50') + '">' + labels[s] + '</button>';
  });
  html += '</div></div>';

  if (paged.length === 0) {
    html += '<div class="card p-12 text-center"><i class="fi fi-rr-check-circle text-5xl text-green-400 block mb-3"></i><p class="text-gray-500">ไม่มีรายการ' + (filterStatus === 'pending' ? ' รออนุมัติ' : '') + '</p></div>';
  } else {
    paged.forEach(function(w) {
      var badgeClass = w.status === 'approved' ? 'badge-approved' : w.status === 'rejected' ? 'badge-rejected' : 'badge-pending';
      var statusLabel = { pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธ' }[w.status] || w.status;
      html += '<div class="card p-4 flex flex-col sm:flex-row sm:items-center gap-4">';
      html += '<div class="w-12 h-12 bg-' + (w.status === 'pending' ? 'amber' : 'gray') + '-100 rounded-xl flex items-center justify-center flex-shrink-0">';
      html += '<i class="fi fi-rr-inbox-out text-' + (w.status === 'pending' ? 'amber' : 'gray') + '-600 text-xl"></i></div>';
      html += '<div class="flex-1 min-w-0"><div class="flex flex-wrap items-center gap-2 mb-1">';
      html += '<span class="font-bold text-gray-800 text-sm">' + escHtml(w.item_name) + '</span>';
      html += '<span class="font-mono text-xs text-navy-600">#' + escHtml(w.withdraw_no) + '</span>';
      html += '<span class="px-2 py-0.5 rounded-full text-xs font-medium ' + badgeClass + '">' + statusLabel + '</span>';
      if (w.via_qr) html += '<span class="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full"><i class="fi fi-rr-qr-scan mr-0.5"></i>QR</span>';
      html += '</div>';
      html += '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500">';
      html += '<span><i class="fi fi-rr-user mr-1"></i>' + escHtml(w.requested_by_name || '-') + '</span>';
      html += '<span><i class="fi fi-rr-layers mr-1"></i>' + w.quantity_requested + ' ' + escHtml(w.unit) + '</span>';
      html += '<span><i class="fi fi-rr-target mr-1"></i>' + escHtml(getWithdrawReasonLabel(w.purpose)) + '</span>';
      html += '<span><i class="fi fi-rr-calendar-day mr-1"></i>' + formatDate(w.requested_at) + '</span>';
      html += '</div>';
      if (w.status === 'approved') {
        html += '<p class="text-xs text-green-700 mt-1"><i class="fi fi-rr-check mr-1"></i>อนุมัติ ' + w.quantity_approved + ' ' + w.unit + ' โดย ' + escHtml(w.approved_by_name || '-') + ' เมื่อ ' + formatDate(w.approved_at) + '</p>';
      }
      if (w.status === 'rejected' && w.reject_reason) {
        html += '<p class="text-xs text-red-700 mt-1"><i class="fi fi-rr-cross mr-1"></i>เหตุผล: ' + escHtml(w.reject_reason) + '</p>';
      }
      html += '</div>';
      if (w.status === 'pending') {
        html += '<div class="flex gap-2 flex-shrink-0">';
        html += '<button onclick="openApproveModal(\'' + w.id + '\',' + w.quantity_requested + ')" class="btn-success flex items-center gap-1.5"><i class="fi fi-rr-check"></i> อนุมัติ</button>';
        html += '<button onclick="openRejectModal(\'' + w.id + '\')" class="btn-danger flex items-center gap-1.5"><i class="fi fi-rr-cross"></i> ปฏิเสธ</button>';
        html += '</div>';
      }
      html += '</div>';
    });
  }
  html += '<div id="approvePagination"></div></div>';
  
  var contentEl = document.getElementById('mainContent');
  if (contentEl) contentEl.innerHTML = html;
  renderPagination('approvePagination', data.length, _approvePage, function(p) { _approvePage = p; buildApprovePage(filterStatus); });
}

function openApproveModal(wdId, qty) {
  var wd = _approveData.find(function(w) { return w.id === wdId; });
  var item = wd && _itemsData.find(function(i) { return i.id === wd.item_id; });
  var img = item ? imgUrl(item.image_file_id) : '';
  var imgHtml = img ? '<div class="flex justify-center"><img src="' + img + '" class="w-24 h-24 object-cover rounded-xl border border-gray-200 shadow-sm"></div>' : '';
  var body = '<div class="space-y-4">';
  body += imgHtml;
  body += '<div class="text-center"><p class="font-semibold text-gray-800">' + escHtml((wd && wd.item_name) || '-') + '</p>';
  body += '<p class="text-xs text-gray-500">ผู้ขอเบิก: <b>' + escHtml((wd && wd.requested_by_name) || '-') + '</b> • เหตุผล: ' + escHtml(getWithdrawReasonLabel((wd && wd.purpose) || '-')) + '</p></div>';
  body += '<div><label class="form-label">จำนวนที่อนุมัติ *</label>';
  body += '<input type="number" id="approveQty" value="' + qty + '" min="1" max="' + qty + '" class="form-input">';
  body += '<p class="text-xs text-gray-400 mt-1">จำนวนที่ขอ: ' + qty + ' ' + escHtml((wd && wd.unit) || '') + '</p></div></div>';
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="doApprove(\'' + wdId + '\')" class="btn-success"><i class="fi fi-rr-check mr-1"></i>ยืนยันอนุมัติ</button>';
  openModal('อนุมัติการเบิก', body, footer);
}

function doApprove(wdId) {
  var qtyEl = document.getElementById('approveQty');
  var qty = qtyEl ? parseInt(qtyEl.value) || 0 : 0;
  if (!qty || qty <= 0) { showError('กรุณาระบุจำนวน'); return; }
  closeModal();
  showLoading('กำลังอนุมัติ...');
  callAPI('approveWithdrawal', AUTH.token, wdId, qty).then(function(res) {
    hideLoading();
    if (res.success) { showSuccess(res.message); renderApprove(); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

function openRejectModal(wdId) {
  var body = '<div class="space-y-3">'
    + '<p class="text-sm text-gray-600">กรุณาระบุเหตุผลที่ปฏิเสธคำขอเบิกนี้</p>'
    + '<div><label class="form-label">เหตุผล *</label>'
    + '<input type="text" id="rejectReason" placeholder="ระบุเหตุผล..." class="form-input"></div></div>';
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="doReject(\'' + wdId + '\')" class="btn-danger"><i class="fi fi-rr-cross mr-1"></i>ยืนยันปฏิเสธ</button>';
  openModal('ปฏิเสธคำขอเบิก', body, footer);
}

function doReject(wdId) {
  var reasonEl = document.getElementById('rejectReason');
  var reason = reasonEl ? reasonEl.value : '';
  if (!reason.trim()) { showError('กรุณาระบุเหตุผล'); return; }
  closeModal();
  showLoading('กำลังดำเนินการ...');
  callAPI('rejectWithdrawal', AUTH.token, wdId, reason).then(function(res) {
    hideLoading();
    if (res.success) { showSuccess(res.message); renderApprove(); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

function doCancelWithdrawal(wdId) {
  showConfirm('ยืนยันยกเลิก', 'ยกเลิกคำขอเบิกนี้?', function() {
    showLoading('กำลังยกเลิก...');
    callAPI('cancelWithdrawal', AUTH.token, wdId).then(function(res) {
      hideLoading();
      if (res.success) { showSuccess(res.message); renderWithdraw(); }
      else showError(res.message);
    }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
  });
}

// ===== TRANSACTIONS =====
var _txData    = [];
var _txPage    = 1;
var _txFilter = { type: 'all', date_from: '', date_to: '' };

function renderTransactions() {
  showLoading('โหลดประวัติ...');
  callAPI('getTransactions', AUTH.token, {}).then(function(res) {
    hideLoading();
    _txData = res.data || [];
    _txPage = 1;
    buildTransactionsPage();
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildTransactionsPage() {
  var filtered = applyTxFilter(_txData);
  var paged    = paginate(filtered, _txPage);

  var html = '<div class="fade-in space-y-4">';
  html += '<div class="card p-4"><div class="flex flex-wrap gap-3 items-end">';
  html += '<div><label class="form-label">ประเภท</label><select id="txTypeFilter" onchange="applyTxFilterUI()" class="form-input w-36">';
  ['all', 'receive', 'withdraw'].forEach(function(t) {
    var labels = { all: 'ทั้งหมด', receive: 'รับเข้า', withdraw: 'เบิกออก' };
    html += '<option value="' + t + '" ' + (_txFilter.type === t ? 'selected' : '') + '>' + labels[t] + '</option>';
  });
  html += '</select></div>';
  html += '<div><label class="form-label">จากวันที่</label><input type="date" id="txDateFrom" value="' + _txFilter.date_from + '" onchange="applyTxFilterUI()" class="form-input w-40"></div>';
  html += '<div><label class="form-label">ถึงวันที่</label><input type="date" id="txDateTo" value="' + _txFilter.date_to + '" onchange="applyTxFilterUI()" class="form-input w-40"></div>';
  html += '<button onclick="clearTxFilter()" class="btn-secondary btn-sm"><i class="fi fi-rr-refresh mr-1"></i>ล้างตัวกรอง</button>';
  html += '</div></div>';

  var totalR = filtered.filter(function(t) { return t.type === 'receive'; }).length;
  var totalW = filtered.filter(function(t) { return t.type === 'withdraw'; }).length;
  html += '<div class="flex gap-2 text-xs">';
  html += '<span class="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full"><i class="fi fi-rr-inbox-in mr-1"></i>รับเข้า: ' + totalR + '</span>';
  html += '<span class="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full"><i class="fi fi-rr-inbox-out mr-1"></i>เบิกออก: ' + totalW + '</span>';
  html += '<span class="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">ทั้งหมด: ' + filtered.length + '</span></div>';

  html += '<div class="card overflow-hidden"><div class="overflow-x-auto">';
  html += '<table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-600">';
  html += '<tr><th class="px-4 py-3 text-left">วันที่</th><th class="px-4 py-3 text-center">ประเภท</th>';
  html += '<th class="px-4 py-3 text-left">เลขที่อ้างอิง</th><th class="px-4 py-3 text-left">รายการ</th>';
  html += '<th class="px-4 py-3 text-center">จำนวน</th><th class="px-4 py-3 text-center">ก่อน</th>';
  html += '<th class="px-4 py-3 text-center">หลัง</th><th class="px-4 py-3 text-left">ผู้ดำเนินการ</th></tr></thead>';
  html += '<tbody class="divide-y divide-gray-100">';
  if (paged.length === 0) html += '<tr><td colspan="8" class="text-center py-10 text-gray-400">ไม่พบรายการ</td></tr>';
  paged.forEach(function(t) {
    var isR = t.type === 'receive';
    html += '<tr>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">' + formatDate(t.date) + '</td>';
    html += '<td class="px-4 py-2.5 text-center"><span class="px-2 py-0.5 rounded-full text-xs font-medium ' + (isR ? 'badge-receive' : 'badge-withdraw') + '">' + (isR ? 'รับเข้า' : 'เบิกออก') + '</span></td>';
    html += '<td class="px-4 py-2.5 font-mono text-xs text-navy-700">' + escHtml(t.ref_id || '-') + '</td>';
    html += '<td class="px-4 py-2.5 font-medium text-gray-700 max-w-xs">' + escHtml(t.item_name || '-') + '</td>';
    html += '<td class="px-4 py-2.5 text-center font-bold ' + (isR ? 'text-blue-700' : 'text-purple-700') + '">' + (isR ? '+' : '-') + t.quantity + '</td>';
    html += '<td class="px-4 py-2.5 text-center text-xs text-gray-500">' + (t.stock_before || 0) + '</td>';
    html += '<td class="px-4 py-2.5 text-center text-xs font-bold text-gray-700">' + (t.stock_after || 0) + '</td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-500">' + escHtml(t.actor_name || '-') + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div></div>';
  html += '<div id="txPagination"></div></div>';
  
  var contentEl = document.getElementById('mainContent');
  if (contentEl) contentEl.innerHTML = html;
  renderPagination('txPagination', filtered.length, _txPage, function(p) { _txPage = p; buildTransactionsPage(); });
}

function applyTxFilter(data) {
  return data.filter(function(t) {
    if (_txFilter.type !== 'all' && t.type !== _txFilter.type) return false;
    if (_txFilter.date_from && (t.date || '') < _txFilter.date_from) return false;
    if (_txFilter.date_to   && (t.date || '') > _txFilter.date_to)   return false;
    return true;
  });
}
function applyTxFilterUI() {
  var typeEl = document.getElementById('txTypeFilter');
  var fromEl = document.getElementById('txDateFrom');
  var toEl = document.getElementById('txDateTo');
  
  _txFilter.type      = typeEl ? typeEl.value : 'all';
  _txFilter.date_from = fromEl ? fromEl.value : '';
  _txFilter.date_to    = toEl ? toEl.value : '';
  _txPage = 1;
  buildTransactionsPage();
}
function clearTxFilter() {
  _txFilter = { type: 'all', date_from: '', date_to: '' };
  _txPage   = 1;
  buildTransactionsPage();
}

// ===== REPORTS =====
var _reportCharts = {};

function renderReports() {
  var now = new Date();
  var html = '<div class="fade-in space-y-4">';
  html += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">';

  html += '<div class="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">';
  html += '<div class="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center"><i class="fi fi-rr-inbox-in text-blue-600 text-xl"></i></div>';
  html += '<div><p class="font-semibold text-gray-800">รายงานรับวัสดุเข้า</p><p class="text-xs text-gray-400 mt-0.5">ประวัติการรับวัสดุทั้งหมด</p></div>';
  html += '<button onclick="loadReceiveReport()" class="btn-primary btn-sm mt-auto"><i class="fi fi-rr-eye mr-1"></i>ดูรายงาน</button></div>';

  html += '<div class="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">';
  html += '<div class="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center"><i class="fi fi-rr-inbox-out text-purple-600 text-xl"></i></div>';
  html += '<div><p class="font-semibold text-gray-800">รายงานเบิกวัสดุออก</p><p class="text-xs text-gray-400 mt-0.5">ประวัติการเบิกและอนุมัติ</p></div>';
  html += '<button onclick="loadWithdrawReport()" class="btn-primary btn-sm mt-auto"><i class="fi fi-rr-eye mr-1"></i>ดูรายงาน</button></div>';

  html += '<div class="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">';
  html += '<div class="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center"><i class="fi fi-rr-calendar text-green-600 text-xl"></i></div>';
  html += '<div><p class="font-semibold text-gray-800">สรุปรายเดือน</p><p class="text-xs text-gray-400 mt-0.5">ยอดรับ-เบิกตาราง Matrix</p></div>';
  html += '<div class="flex gap-2 mt-auto">';
  html += '<select id="rptYear" class="form-input flex-1 text-xs">';
  for (var y = now.getFullYear(); y >= now.getFullYear() - 2; y--) {
    html += '<option value="' + y + '">' + (y + 543) + '</option>';
  }
  html += '</select>';
  html += '<select id="rptMonth" class="form-input flex-1 text-xs">';
  var mNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  for (var m = 1; m <= 12; m++) {
    html += '<option value="' + m + '" ' + (m === now.getMonth() + 1 ? 'selected' : '') + '>' + mNames[m - 1] + '</option>';
  }
  html += '</select></div>';
  html += '<button onclick="loadMonthlyReport()" class="btn-success btn-sm"><i class="fi fi-rr-chart-histogram mr-1"></i>ดูรายงาน</button></div>';
  html += '</div>';

  html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-triangle-warning text-amber-500"></i> รายการวัสดุที่ต้องเติมสต็อก</h3>';
  html += '<button onclick="exportLowStock()" class="btn-warning btn-sm flex items-center gap-1"><i class="fi fi-rr-file-spreadsheet"></i> Export</button></div>';
  html += '<div class="card-body" id="lowStockReport"><div class="flex justify-center py-4"><div class="w-6 h-6 border-2 border-navy-600 border-t-transparent rounded-full animate-spin"></div></div></div></div>';

  html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">';
  html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-chart-histogram text-navy-600"></i> ยอดเบิกรายเดือน (6 เดือนล่าสุด)</h3></div>';
  html += '<div class="card-body"><div style="position:relative;height:220px"><canvas id="rptChartMonthly"></canvas></div></div></div>';
  html += '<div class="card"><div class="card-header"><h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2"><i class="fi fi-rr-star text-amber-500"></i> Top 10 วัสดุที่เบิกมากสุด</h3></div>';
  html += '<div class="card-body" id="rptTopItems"><div class="flex justify-center py-4"><div class="w-6 h-6 border-2 border-navy-600 border-t-transparent rounded-full animate-spin"></div></div></div></div>';
  html += '</div>';

  html += '<div id="reportDataSection"></div></div>';
  
  var contentEl = document.getElementById('mainContent');
  if (contentEl) contentEl.innerHTML = html;

  Promise.all([
    callAPI('getDashboardStats', AUTH.token),
    callAPI('getItems', AUTH.token)
  ]).then(function(results) {
    var stats = results[0];
    var items = results[1].data || [];
    var lowItems = items.filter(function(i) { return i.current_stock <= (i.min_stock || 5); });

    var lsHtml = '';
    if (lowItems.length === 0) {
      lsHtml = '<p class="text-center text-sm text-gray-400 py-4">ไม่มีรายการวัสดุที่ต้องเติม</p>';
    } else {
      lsHtml = '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-600">';
      lsHtml += '<tr><th class="px-4 py-2 text-left">รหัส</th><th class="px-4 py-2 text-left">ชื่อวัสดุ</th><th class="px-4 py-2 text-center">คงเหลือ</th><th class="px-4 py-2 text-center">ขั้นต่ำ</th><th class="px-4 py-2 text-center">สถานะ</th></tr>';
      lsHtml += '</thead><tbody class="divide-y divide-gray-100">';
      lowItems.forEach(function(i) {
        var sc = getStockClass(i.current_stock, i.min_stock);
        lsHtml += '<tr><td class="px-4 py-2 font-mono text-xs text-navy-700">' + escHtml(i.item_code) + '</td>';
        lsHtml += '<td class="px-4 py-2 font-medium text-gray-700">' + escHtml(i.name) + '</td>';
        lsHtml += '<td class="px-4 py-2 text-center font-bold">' + i.current_stock + ' ' + escHtml(i.unit) + '</td>';
        lsHtml += '<td class="px-4 py-2 text-center text-gray-400">' + i.min_stock + '</td>';
        lsHtml += '<td class="px-4 py-2 text-center"><span class="px-2 py-0.5 rounded-full text-xs ' + sc + '">' + getStockLabel(i.current_stock, i.min_stock) + '</span></td></tr>';
      });
      lsHtml += '</tbody></table></div>';
    }
    var lsReport = document.getElementById('lowStockReport');
    if (lsReport) lsReport.innerHTML = lsHtml;

    var rptTop = document.getElementById('rptTopItems');
    if (rptTop) {
      if (stats.top_items && stats.top_items.length > 0) {
        var tiHtml = '<div class="space-y-2">';
        var maxQ = stats.top_items[0].qty || 1;
        stats.top_items.forEach(function(item, idx) {
          var pct = Math.round(item.qty / maxQ * 100);
          tiHtml += '<div class="flex items-center gap-2">';
          tiHtml += '<span class="text-xs font-bold text-gray-400 w-5 text-right">' + (idx + 1) + '</span>';
          tiHtml += '<div class="flex-1"><p class="text-xs font-medium text-gray-700 mb-0.5 truncate">' + escHtml(item.name) + '</p>';
          tiHtml += '<div class="progress-bar"><div class="progress-fill bg-navy-600" style="width:' + pct + '%"></div></div></div>';
          tiHtml += '<span class="text-xs font-bold text-navy-700 w-8 text-right">' + item.qty + '</span></div>';
        });
        tiHtml += '</div>';
        rptTop.innerHTML = tiHtml;
      } else {
        rptTop.innerHTML = '<p class="text-center text-sm text-gray-400 py-4">ยังไม่มีข้อมูลการเบิก</p>';
      }
    }

    var rptChartEl = document.getElementById('rptChartMonthly');
    if (stats.monthly && rptChartEl) {
      if (_reportCharts.monthly) _reportCharts.monthly.destroy();
      _reportCharts.monthly = new Chart(rptChartEl, {
        type: 'bar',
        data: {
          labels: stats.monthly.map(function(m) { return m.label; }),
          datasets: [
            { label: 'รับเข้า', data: stats.monthly.map(function(m) { return m.receive; }), backgroundColor: '#3b82f6', borderRadius: 5, barPercentage: 0.6 },
            { label: 'เบิกออก', data: stats.monthly.map(function(m) { return m.withdraw; }), backgroundColor: '#8b5cf6', borderRadius: 5, barPercentage: 0.6 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { font: { family: 'Sarabun', size: 11 }, boxWidth: 12 } } }, scales: { y: { ticks: { font: { family: 'Sarabun', size: 11 } }, grid: { color: '#f3f4f6' } }, x: { ticks: { font: { family: 'Sarabun', size: 11 } }, grid: { display: false } } } }
      });
    }
  }).catch(function(err) { console.error(err); });
}

function loadReceiveReport() {
  showLoading('โหลดรายงาน...');
  callAPI('getReceives', AUTH.token, {}).then(function(res) {
    hideLoading();
    var data = res.data || [];
    var html = '<div class="card mt-4"><div class="card-header">';
    html += '<h3 class="font-semibold text-gray-700 text-sm">รายงานรับวัสดุเข้าคลัง (' + data.length + ' รายการ)</h3>';
    html += '<button onclick="exportReport(\'receives\')" class="btn-success btn-sm flex items-center gap-1"><i class="fi fi-rr-file-spreadsheet"></i> Export CSV</button></div>';
    html += '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-600">';
    html += '<tr><th class="px-4 py-2 text-left">เลขที่</th><th class="px-4 py-2 text-left">วันที่</th><th class="px-4 py-2 text-left">รายการ</th><th class="px-4 py-2 text-center">จำนวน</th><th class="px-4 py-2 text-left">ผู้รับ</th><th class="px-4 py-2 text-left">หมายเหตุ</th></tr>';
    html += '</thead><tbody class="divide-y">';
    if (!data.length) html += '<tr><td colspan="6" class="text-center py-8 text-gray-400">ไม่มีรายการ</td></tr>';
    data.slice(0, 50).forEach(function(r) {
      html += '<tr><td class="px-4 py-2 font-mono text-xs text-navy-700">' + escHtml(r.receive_no) + '</td>';
      html += '<td class="px-4 py-2 text-xs text-gray-500">' + formatDate(r.date) + '</td>';
      html += '<td class="px-4 py-2 text-gray-700">' + escHtml(r.item_name || '-') + '</td>';
      html += '<td class="px-4 py-2 text-center font-bold text-blue-700">+' + r.quantity + ' ' + escHtml(r.unit || '') + '</td>';
      html += '<td class="px-4 py-2 text-xs text-gray-500">' + escHtml(r.received_by_name || '-') + '</td>';
      html += '<td class="px-4 py-2 text-xs text-gray-400">' + escHtml(r.note || '-') + '</td></tr>';
    });
    if (data.length > 50) html += '<tr><td colspan="6" class="text-center py-3 text-xs text-gray-400">แสดง 50 รายการแรก Export เพื่อดูทั้งหมด</td></tr>';
    html += '</tbody></table></div></div>';
    
    var dataSec = document.getElementById('reportDataSection');
    if (dataSec) {
      dataSec.innerHTML = html;
      dataSec.scrollIntoView({ behavior: 'smooth' });
    }
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function loadWithdrawReport() {
  showLoading('โหลดรายงาน...');
  callAPI('getWithdrawals', AUTH.token, { status: 'all' }).then(function(res) {
    hideLoading();
    var data = res.data || [];
    var html = '<div class="card mt-4"><div class="card-header">';
    html += '<h3 class="font-semibold text-gray-700 text-sm">รายงานเบิกวัสดุออก (' + data.length + ' รายการ)</h3>';
    html += '<button onclick="exportReport(\'withdrawals\')" class="btn-success btn-sm flex items-center gap-1"><i class="fi fi-rr-file-spreadsheet"></i> Export CSV</button></div>';
    html += '<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-600">';
    html += '<tr><th class="px-4 py-2 text-left">เลขที่</th><th class="px-4 py-2 text-left">วันที่</th><th class="px-4 py-2 text-left">รายการ</th><th class="px-4 py-2 text-center">ขอ/อนุมัติ</th><th class="px-4 py-2 text-left">ผู้เบิก</th><th class="px-4 py-2 text-left">วัตถุประสงค์</th><th class="px-4 py-2 text-center">สถานะ</th></tr>';
    html += '</thead><tbody class="divide-y">';
    if (!data.length) html += '<tr><td colspan="7" class="text-center py-8 text-gray-400">ไม่มีรายการ</td></tr>';
    data.slice(0, 50).forEach(function(w) {
      var bc = w.status === 'approved' ? 'badge-approved' : w.status === 'rejected' ? 'badge-rejected' : 'badge-pending';
      var sl = { pending: 'รออนุมัติ', approved: 'อนุมัติ', rejected: 'ปฏิเสธ' }[w.status] || w.status;
      html += '<tr><td class="px-4 py-2 font-mono text-xs text-navy-700">' + escHtml(w.withdraw_no) + '</td>';
      html += '<td class="px-4 py-2 text-xs text-gray-500">' + formatDate(w.requested_at) + '</td>';
      html += '<td class="px-4 py-2 text-gray-700">' + escHtml(w.item_name || '-') + '</td>';
      html += '<td class="px-4 py-2 text-center text-xs">' + w.quantity_requested + (w.quantity_approved ? '/' + w.quantity_approved : '') + ' ' + escHtml(w.unit || '') + '</td>';
      html += '<td class="px-4 py-2 text-xs text-gray-500">' + escHtml(w.requested_by_name || '-') + '</td>';
      html += '<td class="px-4 py-2 text-xs text-gray-400">' + escHtml(getWithdrawReasonLabel(w.purpose)) + '</td>';
      html += '<td class="px-4 py-2 text-center"><span class="px-2 py-0.5 rounded-full text-xs ' + bc + '">' + sl + '</span></td></tr>';
    });
    if (data.length > 50) html += '<tr><td colspan="7" class="text-center py-3 text-xs text-gray-400">แสดง 50 รายการแรก Export เพื่อดูทั้งหมด</td></tr>';
    html += '</tbody></table></div></div>';
    
    var dataSec = document.getElementById('reportDataSection');
    if (dataSec) {
      dataSec.innerHTML = html;
      dataSec.scrollIntoView({ behavior: 'smooth' });
    }
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function loadMonthlyReport() {
  var yearEl = document.getElementById('rptYear');
  var monthEl = document.getElementById('rptMonth');
  var year  = yearEl ? parseInt(yearEl.value) || new Date().getFullYear() : new Date().getFullYear();
  var month = monthEl ? parseInt(monthEl.value) || new Date().getMonth() + 1 : new Date().getMonth() + 1;
  
  showLoading('โหลดรายงานรายเดือน...');
  callAPI('getMonthlyReport', AUTH.token, year, month).then(function(res) {
    hideLoading();
    if (!res.success) { showError(res.message); return; }
    var data = res.data || [];
    var mNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    var daysInMonth = new Date(year, month, 0).getDate();

    var html = '<div class="card mt-4"><div class="card-header">';
    html += '<h3 class="font-semibold text-gray-700 text-sm">สรุปการเบิกวัสดุ ' + mNames[month - 1] + ' ' + (year + 543) + '</h3>';
    html += '<button onclick="exportMonthlyExcel(' + year + ',' + month + ')" class="btn-success btn-sm flex items-center gap-1"><i class="fi fi-rr-file-spreadsheet"></i> Export CSV</button></div>';
    html += '<div class="overflow-x-auto"><table class="w-full text-xs border-collapse">';
    html += '<thead class="bg-navy-700 text-white sticky top-0">';
    html += '<tr><th class="px-2 py-2 text-left min-w-[160px] border border-navy-600">ชื่อวัสดุ</th>';
    html += '<th class="px-2 py-2 text-center border border-navy-600 w-12">หน่วย</th>';
    html += '<th class="px-2 py-2 text-center border border-navy-600 w-14">รับเข้า</th>';
    for (var d = 1; d <= daysInMonth; d++) {
      html += '<th class="px-1 py-2 text-center border border-navy-600 w-8">' + d + '</th>';
    }
    html += '<th class="px-2 py-2 text-center border border-navy-600 w-14">รวมเบิก</th>';
    html += '<th class="px-2 py-2 text-center border border-navy-600 w-14">คงเหลือ</th></tr></thead>';
    html += '<tbody>';
    if (!data.length) {
      html += '<tr><td colspan="' + (daysInMonth + 5) + '" class="text-center py-6 text-gray-400">ไม่มีข้อมูล</td></tr>';
    }
    data.forEach(function(row, idx) {
      html += '<tr class="' + (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50') + ' hover:bg-blue-50">';
      html += '<td class="px-2 py-1.5 border border-gray-200 font-medium text-gray-700">' + escHtml(row.name) + (row.size ? ' <span class="text-gray-400">(' + escHtml(row.size) + ')</span>' : '') + '</td>';
      html += '<td class="px-2 py-1.5 border border-gray-200 text-center text-gray-500">' + escHtml(row.unit) + '</td>';
      html += '<td class="px-2 py-1.5 border border-gray-200 text-center font-bold text-blue-700">' + (row.received || 0) + '</td>';
      for (var day = 1; day <= daysInMonth; day++) {
        var dayVal = row.daily[day] || 0;
        html += '<td class="px-1 py-1.5 border border-gray-200 text-center ' + (dayVal > 0 ? 'bg-purple-50 font-bold text-purple-700' : 'text-gray-300') + '">' + (dayVal > 0 ? dayVal : '') + '</td>';
      }
      html += '<td class="px-2 py-1.5 border border-gray-200 text-center font-bold text-purple-700">' + (row.total_withdraw || 0) + '</td>';
      html += '<td class="px-2 py-1.5 border border-gray-200 text-center font-bold ' + (row.current_stock <= row.min_stock ? 'text-red-600' : 'text-green-700') + '">' + row.current_stock + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    html += '<p class="text-xs text-gray-400 px-4 py-2">* ค่าในตารางแสดงจำนวนที่เบิกออกแต่ละวัน</p></div>';
    
    var dataSec = document.getElementById('reportDataSection');
    if (dataSec) {
      dataSec.innerHTML = html;
      dataSec.scrollIntoView({ behavior: 'smooth' });
    }
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function downloadXlsx(rows, headers, filename) {
  if (!window.XLSX) { showError('ไม่พบ library XLSX'); return; }
  var data = rows.map(function(r) {
    var obj = {};
    headers.forEach(function(h) { obj[h.title] = r[h.key] !== undefined ? r[h.key] : ''; });
    return obj;
  });
  var ws = XLSX.utils.json_to_sheet(data);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filename + '.xlsx');
}

function exportReport(type) {
  showLoading('กำลัง Export...');
  var apiFn = type === 'receives' ? 'getReceives' : 'getWithdrawals';
  callAPI(apiFn, AUTH.token, {}).then(function(res) {
    hideLoading();
    if (!res.success) { showError(res.message); return; }
    var data = res.data || [];
    var rows, headers;
    if (type === 'receives') {
      headers = [{ key: 'receive_no', title: 'เลขที่' }, { key: 'date', title: 'วันที่' }, { key: 'item_name', title: 'รายการ' }, { key: 'quantity', title: 'จำนวน' }, { key: 'created_by_name', title: 'ผู้รับ' }, { key: 'note', title: 'หมายเหตุ' }];
      rows = data.map(function(r) { var item = _itemsData.find(function(i) { return i.id === r.item_id; }) || {}; return { receive_no: r.receive_no || '', date: (r.date || '').split('T')[0], item_name: item.name || r.item_id, quantity: r.quantity || 0, created_by_name: r.created_by_name || '', note: r.note || '' }; });
    } else {
      headers = [{ key: 'withdraw_no', title: 'เลขที่' }, { key: 'date', title: 'วันที่' }, { key: 'item_name', title: 'รายการ' }, { key: 'quantity', title: 'จำนวน' }, { key: 'requester_name', title: 'ผู้เบิก' }, { key: 'status', title: 'สถานะ' }, { key: 'purpose', title: 'วัตถุประสงค์' }];
      rows = data.map(function(w) { var item = _itemsData.find(function(i) { return i.id === w.item_id; }) || {}; return { withdraw_no: w.withdraw_no || '', date: (w.date || '').split('T')[0], item_name: item.name || w.item_id, quantity: w.quantity || 0, requester_name: w.requester_name || '', status: w.status === 'approved' ? 'อนุมัติ' : w.status === 'rejected' ? 'ปฏิเสธ' : 'รออนุมัติ', purpose: getWithdrawReasonLabel(w.purpose) }; });
    }
    downloadXlsx(rows, headers, 'รายงาน_' + type);
  }).catch(function() { hideLoading(); showError('Export ไม่สำเร็จ'); });
}

function exportMonthlyExcel(year, month) {
  showLoading('กำลัง Export...');
  callAPI('getMonthlyReport', AUTH.token, year, month).then(function(res) {
    hideLoading();
    if (!res.success) { showError(res.message); return; }
    var data = res.data || [];
    var headers = [{ key: 'item_name', title: 'ชื่อวัสดุ' }, { key: 'total_requested', title: 'จำนวนขอเบิก' }, { key: 'total_approved', title: 'จำนวนอนุมัติ' }];
    var rows = data.map(function(d) { return { item_name: d.item_name || '', total_requested: d.total_requested || 0, total_approved: d.total_approved || 0 }; });
    downloadXlsx(rows, headers, 'รายงานเบิก_' + month + '_' + (year + 543));
  }).catch(function() { hideLoading(); showError('Export ไม่สำเร็จ'); });
}

function exportLowStock() {
  showLoading('กำลัง Export...');
  callAPI('getItems', AUTH.token).then(function(res) {
    hideLoading();
    if (!res.success) { showError(res.message); return; }
    var items = (res.data || []).filter(function(i) { return i.active !== false && i.current_stock <= i.min_stock; });
    var headers = [{ key: 'item_code', title: 'รหัส' }, { key: 'name', title: 'ชื่อวัสดุ' }, { key: 'category', title: 'หมวดหมู่' }, { key: 'current_stock', title: 'คงเหลือ' }, { key: 'min_stock', title: 'ขั้นต่ำ' }, { key: 'unit', title: 'หน่วย' }];
    var rows = items.map(function(i) { return { item_code: i.item_code || '', name: i.name || '', category: i.category || '', current_stock: i.current_stock || 0, min_stock: i.min_stock || 0, unit: i.unit || '' }; });
    downloadXlsx(rows, headers, 'รายงานสต็อกต่ำ');
  }).catch(function() { hideLoading(); showError('Export ไม่สำเร็จ'); });
}

// ===== PROFILE =====
function renderProfile() {
  showLoading('โหลดโปรไฟล์...');
  callAPI('getUsers', AUTH.token).then(function(res) {
    hideLoading();
    var users = res.data || [];
    var user  = users.find(function(u) { return u.id === AUTH.user.id; }) || AUTH.user;
    buildProfilePage(user);
  }).catch(function() {
    hideLoading();
    buildProfilePage(AUTH.user);
  });
}

function buildProfilePage(user) {
  var html = '<div class="fade-in w-full space-y-4">';

  html += '<div class="card p-6">';
  html += '<div class="flex items-center gap-5 mb-6">';
  html += '<div class="relative">';
  html += '<div class="w-20 h-20 rounded-2xl bg-navy-100 flex items-center justify-center overflow-hidden shadow">';
  html += '<i class="fi fi-rr-user text-navy-600 text-3xl"></i>';
  html += '</div>';
  html += '<label class="absolute -bottom-1 -right-1 w-6 h-6 bg-navy-700 rounded-lg flex items-center justify-center cursor-pointer hover:bg-navy-800 transition">';
  html += '<i class="fi fi-rr-camera text-white text-xs"></i>';
  html += '<input type="file" accept="image/*" class="hidden" onchange="uploadAvatar(event)"></label></div>';
  html += '<div>';
  html += '<h2 class="text-xl font-bold text-gray-800">' + escHtml(user.name || user.username) + '</h2>';
  html += '<p class="text-sm text-gray-500">@' + escHtml(user.username || '-') + '</p>';
  html += '<span class="mt-1 inline-block px-3 py-0.5 bg-navy-100 text-navy-700 rounded-full text-xs font-semibold">' + (ROLE_LABELS[user.role] || user.role) + '</span>';
  html += '</div></div>';
  html += '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">';
  html += '<div><label class="form-label">ชื่อ-นามสกุล</label><input type="text" id="profName" value="' + escHtml(user.name || '') + '" class="form-input"></div>';
  html += '<div><label class="form-label">อีเมล</label><input type="email" id="profEmail" value="' + escHtml(user.email || '') + '" class="form-input"></div>';
  html += '<div><label class="form-label">เบอร์โทรศัพท์</label><input type="text" id="profPhone" value="' + escHtml(user.phone || '') + '" class="form-input"></div>';
  html += '<div><label class="form-label">Telegram Chat ID <span class="text-gray-400 text-xs">(สำหรับรับแจ้งเตือนส่วนตัว)</span></label>';
  html += '<input type="text" id="profTgId" value="' + escHtml(user.telegram_chat_id || '') + '" placeholder="เช่น 123456789" class="form-input"></div>';
  html += '</div>';
  html += '<div class="flex justify-end mt-4">';
  html += '<button onclick="saveProfile(\'' + user.id + '\')" class="btn-primary"><i class="fi fi-rr-disk mr-1"></i>บันทึกข้อมูล</button></div>';
  html += '</div>';

  html += '<div class="card p-6"><h3 class="font-semibold text-gray-700 mb-4 flex items-center gap-2"><i class="fi fi-rr-lock text-navy-600"></i> เปลี่ยนรหัสผ่าน</h3>';
  html += '<div class="space-y-3">';
  html += passFieldHTML('รหัสผ่านเดิม *', 'profOldPass');
  html += passFieldHTML('รหัสผ่านใหม่ *', 'profNewPass');
  html += passFieldHTML('ยืนยันรหัสผ่านใหม่ *', 'profConfPass');
  html += '</div>';
  html += '<div class="flex justify-end mt-4"><button onclick="doChangePassword()" class="btn-primary"><i class="fi fi-rr-lock mr-1"></i>เปลี่ยนรหัสผ่าน</button></div></div>';

  html += '<div class="card p-4 flex items-center gap-4">';
  html += '<div class="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"><i class="fi fi-rr-shield-check text-green-600 text-lg"></i></div>';
  html += '<div><p class="font-semibold text-gray-700 text-sm">สถานะบัญชี</p>';
  html += '<p class="text-xs text-gray-400">บทบาท: ' + (ROLE_LABELS[user.role] || user.role) + ' | เข้าสู่ระบบล่าสุด: ' + formatDateTime(user.last_login || '-') + '</p></div></div>';

  html += '</div>';
  
  var contentEl = document.getElementById('mainContent');
  if (contentEl) contentEl.innerHTML = html;
}

function passFieldHTML(label, id) {
  return '<div><label class="form-label">' + escHtml(label) + '</label>'
    + '<div class="relative"><input type="password" id="' + id + '" class="form-input pr-10" placeholder="••••••••">'
    + '<button type="button" onclick="togglePass(\'' + id + '\',this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">'
    + '<i class="fi fi-rr-eye text-sm"></i></button></div></div>';
}

function saveProfile(userId) {
  var nameEl = document.getElementById('profName');
  var emailEl = document.getElementById('profEmail');
  var phoneEl = document.getElementById('profPhone');
  var tgEl = document.getElementById('profTgId');

  var data = {
    name:  nameEl ? nameEl.value : '',
    email: emailEl ? emailEl.value : '',
    phone: phoneEl ? phoneEl.value : '',
    telegram_chat_id: tgEl ? tgEl.value : ''
  };
  if (!data.name.trim()) { showError('กรุณากรอกชื่อ'); return; }
  showLoading('กำลังบันทึก...');
  callAPI('updateUser', AUTH.token, userId, data).then(function(res) {
    hideLoading();
    if (res.success) {
      AUTH.user.name = data.name;
      localStorage.setItem('sup_user', JSON.stringify(AUTH.user));
      var sbName = document.getElementById('sidebarName');
      if (sbName) sbName.textContent = data.name;
      showSuccess(res.message);
    } else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

function doChangePassword() {
  var oldPassEl = document.getElementById('profOldPass');
  var newPassEl = document.getElementById('profNewPass');
  var confPassEl = document.getElementById('profConfPass');

  var oldPass  = oldPassEl ? oldPassEl.value : '';
  var newPass  = newPassEl ? newPassEl.value : '';
  var confPass = confPassEl ? confPassEl.value : '';
  
  if (!oldPass || !newPass || !confPass) { showError('กรุณากรอกข้อมูลให้ครบ'); return; }
  if (newPass !== confPass) { showError('รหัสผ่านใหม่ไม่ตรงกัน'); return; }
  if (newPass.length < 6) { showError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
  showLoading('กำลังเปลี่ยนรหัสผ่าน...');
  callAPI('changePassword', AUTH.token, oldPass, newPass).then(function(res) {
    hideLoading();
    if (res.success) {
      showSuccess(res.message);
      ['profOldPass', 'profNewPass', 'profConfPass'].forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
    } else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

function uploadAvatar(event) {
  var file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showError('ไฟล์ต้องไม่เกิน 2 MB'); return; }
  showLoading('กำลังอัปโหลดรูป...');
  var reader = new FileReader();
  reader.onload = function(e) {
    var base64 = e.target.result.split(',')[1];
    callAPI('uploadFile', AUTH.token, base64, file.type, file.name).then(function(res) {
      hideLoading();
      if (res.success) {
        callAPI('updateUser', AUTH.token, AUTH.user.id, { avatar: res.file_id }).then(function() {
          showSuccess('อัปโหลดรูปโปรไฟล์สำเร็จ');
          renderProfile();
        });
      } else showError(res.message);
    }).catch(function() { hideLoading(); showError('อัปโหลดไม่สำเร็จ'); });
  };
  reader.readAsDataURL(file);
}

// ===== USERS =====
var _usersData = [];
var _usersPage = 1;

function renderUsers() {
  if (AUTH.user.role !== 'admin') { loadPage('dashboard'); return; }
  showLoading('โหลดรายชื่อผู้ใช้...');
  callAPI('getUsers', AUTH.token).then(function(res) {
    hideLoading();
    _usersData = res.data || [];
    _usersPage = 1;
    buildUsersPage();
  }).catch(function() { hideLoading(); showError('โหลดข้อมูลไม่สำเร็จ'); });
}

function buildUsersPage() {
  var paged = paginate(_usersData, _usersPage);
  var html = '<div class="fade-in space-y-4">';
  html += '<div class="flex items-center justify-between">';
  html += '<h3 class="font-semibold text-gray-700 flex items-center gap-2"><i class="fi fi-rr-users text-navy-600"></i> ผู้ใช้งานทั้งหมด (' + _usersData.length + ')</h3>';
  html += '<button onclick="openAddUserModal()" class="btn-primary flex items-center gap-2"><i class="fi fi-rr-user-add"></i> เพิ่มผู้ใช้</button></div>';

  html += '<div class="card overflow-hidden"><div class="hidden md:block overflow-x-auto">';
  html += '<table class="w-full text-sm"><thead class="bg-gray-50 text-xs text-gray-600">';
  html += '<tr><th class="px-4 py-3 text-left">ชื่อ-นามสกุล</th><th class="px-4 py-3 text-left">Username</th>';
  html += '<th class="px-4 py-3 text-left">บทบาท</th><th class="px-4 py-3 text-left">อีเมล</th>';
  html += '<th class="px-4 py-3 text-left">เข้าสู่ระบบล่าสุด</th><th class="px-4 py-3 text-center">สถานะ</th>';
  html += '<th class="px-4 py-3 text-center">จัดการ</th></tr></thead><tbody class="divide-y divide-gray-100">';
  if (!paged.length) html += '<tr><td colspan="7" class="text-center py-10 text-gray-400">ไม่มีผู้ใช้งาน</td></tr>';
  paged.forEach(function(u) {
    var roleColor = u.role === 'admin' ? 'bg-navy-100 text-navy-700' : u.role === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
    html += '<tr>';
    html += '<td class="px-4 py-2.5"><div class="flex items-center gap-2">';
    html += '<div class="w-8 h-8 rounded-xl bg-navy-100 flex items-center justify-center flex-shrink-0"><i class="fi fi-rr-user text-navy-600 text-sm"></i></div>';
    html += '<span class="font-medium text-gray-700">' + escHtml(u.name || '-') + '</span></div></td>';
    html += '<td class="px-4 py-2.5 font-mono text-xs text-gray-500">' + escHtml(u.username) + '</td>';
    html += '<td class="px-4 py-2.5"><span class="px-2 py-0.5 rounded-full text-xs font-medium ' + roleColor + '">' + (ROLE_LABELS[u.role] || u.role) + '</span></td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-500">' + escHtml(u.email || '-') + '</td>';
    html += '<td class="px-4 py-2.5 text-xs text-gray-400">' + formatDateTime(u.last_login) + '</td>';
    html += '<td class="px-4 py-2.5 text-center"><span class="px-2 py-0.5 rounded-full text-xs font-medium ' + (u.active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') + '">' + (u.active !== false ? 'ใช้งาน' : 'ระงับ') + '</span></td>';
    html += '<td class="px-4 py-2.5 text-center"><div class="flex gap-1 justify-center">';
    html += '<button onclick="openEditUserModal(\'' + u.id + '\')" title="แก้ไข" class="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center hover:bg-blue-200"><i class="fi fi-rr-edit text-xs"></i></button>';
    html += '<button onclick="doResetPassword(\'' + u.id + '\')" title="Reset Password" class="w-7 h-7 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center hover:bg-amber-200"><i class="fi fi-rr-lock text-xs"></i></button>';
    if (u.id !== AUTH.user.id) {
      html += '<button onclick="doToggleUser(\'' + u.id + '\',\'' + escHtml(u.name || u.username) + '\')" title="' + (u.active !== false ? 'ระงับ' : 'เปิด') + 'บัญชี" class="w-7 h-7 ' + (u.active !== false ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200') + ' rounded-lg flex items-center justify-center"><i class="fi fi-rr-' + (u.active !== false ? 'ban' : 'check-circle') + ' text-xs"></i></button>';
    }
    html += '</div></td></tr>';
  });
  html += '</tbody></table></div>';

  html += '<div class="md:hidden divide-y">';
  paged.forEach(function(u) {
    var roleColor = u.role === 'admin' ? 'bg-navy-100 text-navy-700' : u.role === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
    html += '<div class="p-4 flex items-center gap-3">';
    html += '<div class="w-10 h-10 rounded-xl bg-navy-100 flex items-center justify-center flex-shrink-0"><i class="fi fi-rr-user text-navy-600"></i></div>';
    html += '<div class="flex-1 min-w-0"><p class="font-semibold text-gray-800 text-sm">' + escHtml(u.name || '-') + '</p>';
    html += '<p class="text-xs text-gray-400">@' + escHtml(u.username) + '</p>';
    html += '<div class="flex gap-1.5 mt-1"><span class="px-2 py-0.5 rounded-full text-xs ' + roleColor + '">' + (ROLE_LABELS[u.role] || u.role) + '</span>';
    html += '<span class="px-2 py-0.5 rounded-full text-xs ' + (u.active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') + '">' + (u.active !== false ? 'ใช้งาน' : 'ระงับ') + '</span></div></div>';
    html += '<div class="flex gap-1">';
    html += '<button onclick="openEditUserModal(\'' + u.id + '\')" class="w-8 h-8 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center"><i class="fi fi-rr-edit text-sm"></i></button>';
    html += '<button onclick="doResetPassword(\'' + u.id + '\')" class="w-8 h-8 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center"><i class="fi fi-rr-lock text-sm"></i></button>';
    html += '</div></div>';
  });
  html += '</div></div>';
  html += '<div id="usersPagination"></div></div>';
  
  var contentEl = document.getElementById('mainContent');
  if (contentEl) contentEl.innerHTML = html;
  renderPagination('usersPagination', _usersData.length, _usersPage, function(p) { _usersPage = p; buildUsersPage(); });
}

function userFormHTML(user) {
  user = user || {};
  var roleOpts = ['admin', 'staff', 'employee'].map(function(r) { return '<option value="' + r + '"' + (user.role === r ? ' selected' : '') + '>' + (ROLE_LABELS[r] || r) + '</option>'; }).join('');
  return '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">'
    + fieldHTML('ชื่อ-นามสกุล *', 'uName', 'text', user.name || '', 'sm:col-span-2')
    + fieldHTML('Username *', 'uUsername', 'text', user.username || '')
    + (!user.id ? '<div><label class="form-label">Password *</label><div class="relative"><input type="password" id="uPassword" class="form-input pr-10" placeholder="รหัสผ่าน"><button type="button" onclick="togglePass(\'uPassword\',this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><i class="fi fi-rr-eye text-sm"></i></button></div></div>' : '')
    + fieldHTML('อีเมล', 'uEmail', 'email', user.email || '')
    + fieldHTML('เบอร์โทร', 'uPhone', 'text', user.phone || '')
    + '<div><label class="form-label">บทบาท *</label><select id="uRole" class="form-input">' + roleOpts + '</select></div>'
    + '</div>';
}

function openAddUserModal() {
  var body   = userFormHTML({});
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="submitAddUser()" class="btn-primary"><i class="fi fi-rr-user-add mr-1"></i>เพิ่มผู้ใช้</button>';
  openModal('เพิ่มผู้ใช้งานใหม่', body, footer);
}

function openEditUserModal(id) {
  var u = _usersData.find(function(x) { return x.id === id; });
  if (!u) return;
  var body   = userFormHTML(u);
  var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
    + '<button onclick="submitEditUser(\'' + id + '\')" class="btn-primary"><i class="fi fi-rr-disk mr-1"></i>บันทึก</button>';
  openModal('แก้ไขผู้ใช้งาน: ' + u.name, body, footer);
}

function submitAddUser() {
  var nameEl = document.getElementById('uName');
  var userEl = document.getElementById('uUsername');
  var passEl = document.getElementById('uPassword');
  var emailEl = document.getElementById('uEmail');
  var phoneEl = document.getElementById('uPhone');
  var roleEl = document.getElementById('uRole');

  var data = { 
    name: nameEl ? nameEl.value : '', 
    username: userEl ? userEl.value : '', 
    password: passEl ? passEl.value : '', 
    email: emailEl ? emailEl.value : '', 
    phone: phoneEl ? phoneEl.value : '', 
    role: roleEl ? roleEl.value : 'employee' 
  };
  
  if (!data.name.trim() || !data.username.trim() || !data.password) { showError('กรุณากรอกข้อมูลที่จำเป็น'); return; }
  showLoading('กำลังบันทึก...');
  callAPI('addUser', AUTH.token, data).then(function(res) {
    hideLoading(); closeModal();
    if (res.success) { showSuccess(res.message); renderUsers(); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

function submitEditUser(id) {
  var nameEl = document.getElementById('uName');
  var emailEl = document.getElementById('uEmail');
  var phoneEl = document.getElementById('uPhone');
  var roleEl = document.getElementById('uRole');

  var data = { 
    name: nameEl ? nameEl.value : '', 
    email: emailEl ? emailEl.value : '', 
    phone: phoneEl ? phoneEl.value : '', 
    role: roleEl ? roleEl.value : 'employee', 
    active: true 
  };
  
  if (!data.name.trim()) { showError('กรุณากรอกชื่อ'); return; }
  showLoading('กำลังบันทึก...');
  callAPI('updateUser', AUTH.token, id, data).then(function(res) {
    hideLoading(); closeModal();
    if (res.success) { showSuccess(res.message); renderUsers(); }
    else showError(res.message);
  }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
}

function doResetPassword(userId) {
  showConfirm('Reset รหัสผ่าน', 'ระบบจะสร้างรหัสผ่านชั่วคราวใหม่', function() {
    showLoading('กำลัง Reset...');
    callAPI('resetUserPassword', AUTH.token, userId).then(function(res) {
      hideLoading();
      if (res.success) showSuccess(res.message);
      else showError(res.message);
    }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
  }, 'Reset Password');
}

function doToggleUser(userId, name) {
  var user = _usersData.find(function(u) { return u.id === userId; });
  var action = user && user.active !== false ? 'ระงับ' : 'เปิด';
  showConfirm(action + 'บัญชีผู้ใช้', action + 'บัญชีของ "' + name + '" ใช่หรือไม่?', function() {
    showLoading('กำลังดำเนินการ...');
    callAPI('toggleUserActive', AUTH.token, userId).then(function(res) {
      hideLoading();
      if (res.success) { showSuccess(res.message); renderUsers(); }
      else showError(res.message);
    }).catch(function() { hideLoading(); showError('เกิดข้อผิดพลาด'); });
  }, action + 'บัญชี');
}

// ===== ON LOAD =====
if (_hasBrowserWindow) {
window.onload = function() {
  var urlParams = new URLSearchParams(window.location.search);
  _QR_ACTION = urlParams.get('action') || '';
  _QR_ITEM_ID = urlParams.get('item_id') || '';

  // ตรวจสอบเซสชันผู้ใช้และเริ่มต้นแอปตามปกติ (ตัดส่วน Public Asset ออก)
callAPI('getConfig').then(function(res) {
    if (res && res.success && res.data) {
      var cfg = res.data;
      var loginApp = document.getElementById('loginAppName');
      var sideApp = document.getElementById('sidebarAppName');
      if (loginApp && cfg.app_name) loginApp.textContent = cfg.app_name;
      if (sideApp && cfg.app_name) sideApp.textContent = cfg.app_name;
    }
  }).catch(function(err) {
    console.warn('โหลด config ไม่สำเร็จ:', err);
  }).finally(function() {
    if (AUTH.token) { 
      initApp(); 
    } else { 
      hideLoading(); 
      showLoginPage(); 
    }
  });
}; // 🟢 บรรทัดนี้ปิด window.onload ตัวใหญ่สุด
}

// ===== WITHDRAW BATCH BUILDER (multi-item requisition) =====
var _wdDraftItems = [];
var _wdDraftViaQr = false;
var _wdDraftSearch = '';
var _wdDraftTypeFilter = 'all';
var _wdDraftMachineFilter = 'all';

function getWithdrawReasonLabel(value) {
  var map = {
    use_general: 'ใช้ทั่วไป',
    machine_repair: 'ซ่อมเครื่องจักร',
    pm_replace: 'เปลี่ยนตามรอบ PM',
    urgent: 'ฉุกเฉิน',
    'ใช้งานทั่วไป': 'ใช้ทั่วไป',
    'ซ่อมเครื่องจักร': 'ซ่อมเครื่องจักร',
    'เปลี่ยนตามรอบ PM': 'เปลี่ยนตามรอบ PM',
    'ฉุกเฉิน': 'ฉุกเฉิน'
  };
  return map[value] || value || '-';
}

function openWithdrawSelectModal() {
  openWithdrawBatchModal('', false);
}

function openWithdrawModal(itemId) {
  openWithdrawBatchModal(itemId, false);
}

function openWithdrawFromQR(itemId) {
  openWithdrawBatchModal(itemId, true);
}

function openWithdrawBatchModal(itemId, viaQr) {
  _wdDraftViaQr = !!viaQr;
  _wdDraftItems = [];
  _wdDraftTypeFilter = 'all';
  _wdDraftMachineFilter = 'all';

  function renderBuilder() {
    if (itemId) {
      var seededItem = _itemsData.find(function(i) { return i.id === itemId; });
      if (seededItem) {
        _wdDraftTypeFilter = getResolvedItemType(seededItem);
        if (seededItem.machine_name) _wdDraftMachineFilter = seededItem.machine_name;
      }
      _wdDraftAddItem(itemId);
    }
    var reasonOptions = ''
      + '<option value="use_general">ใช้ทั่วไป</option>'
      + '<option value="machine_repair">ซ่อมเครื่องจักร</option>'
      + '<option value="pm_replace">เปลี่ยนตามรอบ PM</option>'
      + '<option value="urgent">ฉุกเฉิน</option>';
    var body = '';
    body += '<div class="space-y-4">';
    body += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">';
    body += '<div><label class="form-label">ประเภทวัสดุ</label><select id="wdDraftTypeFilter" onchange="wdDraftRenderCatalog()" class="form-input"><option value="all"' + (_wdDraftTypeFilter === 'all' ? ' selected' : '') + '>ทุกประเภท</option><option value="consumable"' + (_wdDraftTypeFilter === 'consumable' ? ' selected' : '') + '>วัสดุสิ้นเปลือง</option><option value="spare_part"' + (_wdDraftTypeFilter === 'spare_part' ? ' selected' : '') + '>อะไหล่เครื่องจักร</option></select></div>';
    body += '<div><label class="form-label">สำหรับเครื่องจักร</label><select id="wdDraftMachineFilter" onchange="wdDraftRenderCatalog()" class="form-input">' + buildMachineFilterOptions(_wdDraftMachineFilter) + '</select></div>';
    body += '<div class="space-y-2">';
    body += '<label class="form-label">ค้นหารายการวัสดุ</label>';
    body += '<div class="relative">';
    body += '<i class="fi fi-rr-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>';
    body += '<input type="text" id="wdDraftSearch" oninput="wdDraftRenderCatalog()" placeholder="พิมพ์ชื่อวัสดุหรือรหัส..." class="form-input pl-9">';
    body += '</div>';
    body += '</div>';
    body += '</div>';
    body += '<div>';
    body += '<div class="flex items-center justify-between mb-2">';
    body += '<p class="form-label mb-0">รายการที่เลือก</p>';
    body += '<span id="wdDraftCount" class="text-xs text-gray-400"></span>';
    body += '</div>';
    body += '<div id="wdDraftSelected" class="space-y-2"></div>';
    body += '</div>';
    body += '<div class="space-y-2">';
    body += '<div class="flex items-center justify-between">';
    body += '<p class="form-label mb-0">รายการวัสดุทั้งหมด</p>';
    body += '<span class="text-xs text-gray-400">กด <i class="fi fi-rr-plus"></i> เพื่อเพิ่มเข้ารายการเบิก</span>';
    body += '</div>';
    body += '<div id="wdDraftCatalog" class="max-h-56 overflow-y-auto space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-2"></div>';
    body += '</div>';
    body += '<div class="grid grid-cols-1 gap-4">';
    body += '<div><label class="form-label">เหตุผลการเบิก *</label><select id="wdReason" class="form-input"><option value="">- เลือกเหตุผล -</option>' + reasonOptions + '</select></div>';
    body += '<div><label class="form-label">หมายเหตุ</label><textarea id="wdNote" class="form-input" rows="2" placeholder="หมายเหตุเพิ่มเติม..."></textarea></div>';
    body += '</div>';
    body += '</div>';

    var footer = '<button onclick="closeModal()" class="btn-secondary">ยกเลิก</button>'
      + '<button onclick="submitWithdraw()" class="btn-primary"><i class="fi fi-rr-inbox-out mr-1"></i>ยื่นคำขอเบิก</button>';
    openModal('เบิกวัสดุ', body, footer);
    wdDraftRenderAll();
    var searchEl = document.getElementById('wdDraftSearch');
    if (searchEl) searchEl.focus();
  }

  if (_itemsData.length > 0 && (Date.now() - _itemsCacheTime) < ITEMS_CACHE_TTL) {
    renderBuilder();
    return;
  }

  showLoading('โหลดข้อมูล...');
  callAPI('getItems', AUTH.token).then(function(res) {
    hideLoading();
    _itemsData = res.data || [];
    _itemsCacheTime = Date.now();
    renderBuilder();
  }).catch(function() {
    hideLoading();
    showError('โหลดข้อมูลไม่สำเร็จ');
  });
}

function wdDraftAddItem(itemId) {
  var item = _itemsData.find(function(i) { return i.id === itemId; });
  if (!item) return;
  if (_wdDraftItems.find(function(x) { return x.item_id === itemId; })) return;
  _wdDraftItems.push({
    item_id: item.id,
    item_name: item.name,
    item_code: item.item_code,
    item_type: getResolvedItemType(item),
    machine_name: item.machine_name || '',
    unit: item.unit,
    current_stock: item.current_stock || 0,
    quantity: 1
  });
  wdDraftRenderAll();
}

function wdDraftRemoveItem(itemId) {
  _wdDraftItems = _wdDraftItems.filter(function(x) { return x.item_id !== itemId; });
  wdDraftRenderAll();
}

function wdDraftUpdateQty(itemId, value) {
  var qty = parseInt(value, 10);
  if (!qty || qty < 1) qty = 1;
  _wdDraftItems = _wdDraftItems.map(function(x) {
    if (x.item_id !== itemId) return x;
    return Object.assign({}, x, { quantity: qty });
  });
  wdDraftRenderSelected();
}

function wdDraftRenderAll() {
  wdDraftRenderCatalog();
  wdDraftRenderSelected();
}

function wdDraftRenderCatalog() {
  var searchEl = document.getElementById('wdDraftSearch');
  _wdDraftSearch = searchEl ? searchEl.value.trim().toLowerCase() : '';
  var typeEl = document.getElementById('wdDraftTypeFilter');
  var machineEl = document.getElementById('wdDraftMachineFilter');
  if (typeEl) _wdDraftTypeFilter = typeEl.value || 'all';
  if (machineEl) _wdDraftMachineFilter = machineEl.value || 'all';
  var wrap = document.getElementById('wdDraftCatalog');
  if (!wrap) return;

  var data = _itemsData.filter(function(i) {
    if (i.active === false) return false;
    if (_wdDraftTypeFilter !== 'all' && getResolvedItemType(i) !== _wdDraftTypeFilter) return false;
    if (_wdDraftMachineFilter !== 'all' && !itemMatchesMachineFilter(i, _wdDraftMachineFilter)) return false;
    if (!_wdDraftSearch) return true;
    return (i.name || '').toLowerCase().indexOf(_wdDraftSearch) !== -1
      || (i.item_code || '').toLowerCase().indexOf(_wdDraftSearch) !== -1
      || (i.category || '').toLowerCase().indexOf(_wdDraftSearch) !== -1
      || getMachineUsageText(i).toLowerCase().indexOf(_wdDraftSearch) !== -1;
  });

  if (data.length === 0) {
    wrap.innerHTML = '<p class="text-center text-sm text-gray-400 py-4">ไม่พบรายการ</p>';
    return;
  }

  wrap.innerHTML = data.map(function(i) {
    var selected = _wdDraftItems.some(function(x) { return x.item_id === i.id; });
    var stockClass = getStockClass(i.current_stock, i.min_stock);
    return '<div class="flex items-center gap-3 rounded-xl bg-white border border-gray-200 px-3 py-2 shadow-sm">'
      + '<div class="flex-1 min-w-0">'
      + '<p class="text-sm font-medium text-gray-800 truncate">' + escHtml(i.name) + '</p>'
      + '<p class="text-xs text-gray-400">' + escHtml(i.item_code || '-') + ' • คงเหลือ ' + (i.current_stock || 0) + ' ' + escHtml(i.unit || '') + ' • ' + escHtml(getItemTypeLabel(getResolvedItemType(i))) + ' • ' + escHtml(getMachineUsageText(i)) + '</p>'
      + '</div>'
      + '<span class="px-2 py-0.5 rounded-full text-xs font-medium ' + stockClass + '">' + getStockLabel(i.current_stock, i.min_stock) + '</span>'
      + '<button type="button" onclick="wdDraftAddItem(\'' + i.id + '\')" class="btn-primary btn-sm text-xs ' + (selected ? 'opacity-60 pointer-events-none' : '') + '">'
      + '<i class="fi fi-rr-plus mr-1"></i>' + (selected ? 'เพิ่มแล้ว' : 'เพิ่ม')
      + '</button>'
      + '</div>';
  }).join('');
}

function wdDraftRenderSelected() {
  var wrap = document.getElementById('wdDraftSelected');
  var countEl = document.getElementById('wdDraftCount');
  if (countEl) countEl.textContent = _wdDraftItems.length ? (_wdDraftItems.length + ' รายการ') : 'ยังไม่ได้เพิ่มรายการ';
  if (!wrap) return;

  if (_wdDraftItems.length === 0) {
    wrap.innerHTML = '<div class="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">กดเพิ่มรายการเบิกจากรายการวัสดุด้านล่าง</div>';
    return;
  }

  wrap.innerHTML = _wdDraftItems.map(function(x) {
    var item = _itemsData.find(function(i) { return i.id === x.item_id; }) || x;
    var overStock = x.quantity > (item.current_stock || 0);
    return '<div class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">'
      + '<div class="flex items-start gap-3">'
      + '<div class="flex-1 min-w-0">'
      + '<p class="text-sm font-medium text-gray-800 truncate">' + escHtml(item.name || x.item_name || '-') + '</p>'
      + '<p class="text-xs text-gray-400">' + escHtml(item.item_code || x.item_code || '-') + ' • คงเหลือ ' + (item.current_stock || 0) + ' ' + escHtml(item.unit || x.unit || '') + ' • ' + escHtml(getItemTypeLabel(getResolvedItemType(item || x))) + ' • ' + escHtml(getMachineUsageText(item || x)) + '</p>'
      + '</div>'
      + '<button type="button" onclick="wdDraftRemoveItem(\'' + x.item_id + '\')" class="text-red-500 hover:text-red-700" title="ลบรายการ"><i class="fi fi-rr-trash"></i></button>'
      + '</div>'
      + '<div class="mt-3 grid grid-cols-[1fr_110px] gap-3 items-end">'
      + '<div class="min-w-0">'
      + '<label class="form-label">จำนวนที่ต้องการเบิก</label>'
      + '<input type="number" min="1" value="' + x.quantity + '" oninput="wdDraftUpdateQty(\'' + x.item_id + '\', this.value)" class="form-input ' + (overStock ? 'border-red-300 focus:ring-red-500' : '') + '">'
      + '</div>'
      + '<div class="text-right text-xs ' + (overStock ? 'text-red-600' : 'text-gray-400') + '">' + (overStock ? 'เกินสต็อก' : 'พร้อมเบิก') + '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}

function submitWithdraw() {
  var reasonEl = document.getElementById('wdReason');
  var noteEl = document.getElementById('wdNote');
  var purpose = reasonEl ? reasonEl.value.trim() : '';
  var note = noteEl ? noteEl.value.trim() : '';

  if (!purpose) { showError('กรุณาระบุวัตถุประสงค์'); return; }
  if (_wdDraftItems.length === 0) { showError('กรุณาเพิ่มรายการวัสดุอย่างน้อย 1 รายการ'); return; }

  for (var i = 0; i < _wdDraftItems.length; i++) {
    var row = _wdDraftItems[i];
    var item = _itemsData.find(function(x) { return x.id === row.item_id; });
    if (!item) { showError('ไม่พบรายการวัสดุบางรายการ'); return; }
    if (!row.quantity || row.quantity <= 0) { showError('จำนวนต้องมากกว่า 0'); return; }
    if (row.quantity > (item.current_stock || 0)) {
      showError('จำนวนเบิกของ "' + item.name + '" เกินสต็อกคงเหลือ');
      return;
    }
  }

  showLoading('กำลังยื่นคำขอ...');
  var payload = {
    items: _wdDraftItems.map(function(x) {
      var item = _itemsData.find(function(y) { return y.id === x.item_id; }) || x;
      return { item_id: x.item_id, item_type: getResolvedItemType(item), quantity: x.quantity };
    }),
    purpose: purpose,
    note: note,
    via_qr: _wdDraftViaQr
  };

  callAPI('addWithdrawal', AUTH.token, payload).then(function(res) {
    hideLoading();
    closeModal();
    if (res.success) {
      var msg = 'ยื่นคำขอเบิกเรียบร้อย';
      if (res.withdraw_no) msg += ' #' + res.withdraw_no;
      if (res.items_count) msg += ' (' + res.items_count + ' รายการ)';
      showSuccess(msg);
      _wdDraftItems = [];
      if (_currentPage === 'withdraw') renderWithdraw();
      else if (_currentPage === 'dashboard') renderDashboard();
    } else {
      showError(res.message);
    }
  }).catch(function() {
    hideLoading();
    showError('เกิดข้อผิดพลาด');
  });
}

