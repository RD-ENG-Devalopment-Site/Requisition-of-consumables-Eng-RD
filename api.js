// ============================================================
// API Client — Google Apps Script Backend
// ============================================================

// ⚠️ สำคัญมาก: ตรวจสอบให้มั่นใจว่ารหัสภายในลิงก์นี้ตรงกับ URL Web App ปัจจุบันของคุณหลังกด Deploy
var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwh5YLI5jXSnGyNWRa_sRQ8lrnhQqryRRtdI9J_J8xbntzDDyx1O_qaw-Hgfh8cZ0tz/exec';

function callAPI(fnName) {
  var args = Array.prototype.slice.call(arguments, 1);
  
  // uploadFile ใช้ POST เพราะ base64 ใหญ่เกิน URL length limit
  if (fnName === 'uploadFile') {
    var body = 'fn=' + encodeURIComponent(fnName) + '&args=' + encodeURIComponent(JSON.stringify(args));
    return fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    }).then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).catch(function(err) {
      console.error('API Error [' + fnName + ']:', err);
      throw err;
    });
  }
  
  // แนบเครื่องหมาย &_=[เวลาปัจจุบัน] เพื่อล้างแคช API ดึง JSON ชุดปัจจุบันจาก Sheets เสมอ
  var url = APPS_SCRIPT_URL + '?fn=' + encodeURIComponent(fnName) + '&args=' + encodeURIComponent(JSON.stringify(args)) + '&_=' + Date.now();
  console.log('[API] GET', url);

  return fetch(url, { method: 'GET', mode: 'cors' }).then(function(res) {
    console.log('[API] Response', res.status);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }).then(function(data) {
    console.log('[API] Data raw:', data);
    
    // 🟢 ซ่อมแซมระบบแมตช์ข้อมูลพิเศษสำหรับฟังก์ชัน 'getConfig'
    // ดักจับเพื่อให้มั่นใจว่า app.js จะได้วัตถุที่มี app_name อยู่ชั้นบนสุดเสมอ ไม่เป็น null เด็ดขาด
    if (fnName === 'getConfig' && data && typeof data === 'object') {
      if (data.hasOwnProperty('data') && data.data && data.data.hasOwnProperty('app_name')) {
        return data.data; // ถ้าห่อ data มาข้างใน ให้แกะเอาเนื้อข้อมูลข้างในส่งไปให้ app.js
      }
      return data; // ถ้าส่งมาแบบเรียบตรงอยู่แล้ว ส่งก้อนนี้ไปได้เลย
    }
    
    // ตัวป้องกันความปลอดภัยสำหรับ API ฟังก์ชันอื่น ๆ
    if (data && typeof data === 'object' && data !== null) {
      if (!data.hasOwnProperty('data')) {
        return { success: true, data: data };
      }
    }
    
    return data;
  }).catch(function(err) {
    console.warn('[API] Fallback to localStorage mock for', fnName, err);
    if (window._mockAPI && window._mockAPI[fnName]) {
      return Promise.resolve(window._mockAPI[fnName].apply(null, args));
    }
    throw err;
  });
}

// Helper: แปลง file_id เป็น URL สำหรับแสดงรูป
function getFileDataUrl(fileId) {
  if (!fileId) return '';
  if (String(fileId).indexOf('http') === 0 || String(fileId).indexOf('data:') === 0) return fileId;
  return 'https://lh5.googleusercontent.com/d/' + fileId;
}
