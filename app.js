// ============================================================
// app.js — Frontend Core Logic
// ============================================================

// ปรับปรุงฟังก์ชันแปลงชื่อพาร์ทในการทำเบรดครัมบ์ (Breadcrumbs Mapping)
function updateBreadcrumb(pageId) {
  var base = "Requisition of consumables (Eng-RD) System";
  var sub = "ภาพรวมระบบ";
  
  switch(pageId) {
    case 'dashboard': sub = "ภาพรวมระบบ"; break;
    case 'stock': sub = "สต็อกคงเหลือ"; break;
    case 'items': sub = "รายการวัสดุ"; break;
    case 'receive': sub = "รับวัสดุเข้าคลัง"; break;
    case 'stocktake': sub = "นับสต็อก"; break;
    case 'printqr': sub = "พิมพ์ QR สติ๊กเกอร์"; break;
    case 'withdraw': sub = "เบิกวัสดุ"; break;
    case 'approve': sub = "อนุมัติการเบิก"; break;
    case 'transactions': sub = "ประวัติเคลื่อนไหว"; break;
    case 'reports': sub = "รายงาน"; break;
    case 'assets': sub = "ทะเบียนครุภัณฑ์"; break;
    case 'assetstatus': sub = "อัปเดตสถานภาพ"; break;
    case 'assetmaintenance': sub = "ซ่อมบำรุง"; break;
    case 'assetcommittees': sub = "คณะกรรมการ"; break;
    case 'depreciation': sub = "ค่าเสื่อม/อายุใช้งาน"; break;
    case 'assetregister': sub = "ทะเบียนคุมสินทรัพย์"; break;
    case 'assetreports': sub = "รายงานครุภัณฑ์"; break;
    case 'manual': sub = "คู่มือการใช้งาน"; break;
    case 'users': sub = "ผู้ใช้งาน"; break;
    case 'settings': sub = "ตั้งค่าระบบ"; break;
    case 'profile': sub = "ข้อมูลผู้ใช้"; break;
  }
  
  var breadEl = document.getElementById('pageBreadcrumb');
  if (breadEl) {
    breadEl.textContent = base + " / " + sub;
  }
}

// อัปเดตในส่วนการตรวจสอบข้อมูล Config ตอนดึงข้อมูลแอปพลิเคชันจากฐานข้อมูล
function handleAppSettings(config) {
  var appName = config.app_name || "Requisition of consumables (Eng-RD) System";
  
  var loginTitle = document.getElementById('loginAppName');
  if (loginTitle) loginTitle.textContent = appName;
  
  var sidebarTitle = document.getElementById('sidebarAppName');
  if (sidebarTitle) sidebarTitle.textContent = appName;
}
