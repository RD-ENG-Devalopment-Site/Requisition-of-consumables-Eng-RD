// ============================================================
// API Client — Google Apps Script Backend
// ============================================================

// ⚠️ สำคัญมาก: ถ้าเปิดจาก GitHub Pages ต้องตั้งค่า bridge URL ใน config.js ก่อน
var APP_CONFIG = (typeof window !== 'undefined' && window.APP_CONFIG) ? window.APP_CONFIG : {};
var API_BRIDGE_URL = (APP_CONFIG.apiBaseUrl || APP_CONFIG.bridgeUrl || '').replace(/\/+$/, '');
var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwh5YLI5jXSnGyNWRa_sRQ8lrnhQqryRRtdI9J_J8xbntzDDyx1O_qaw-Hgfh8cZ0tz/exec';

function isGitHubPagesHost() {
  if (typeof window === 'undefined' || !window.location) return false;
  return /(?:^|\.)github\.io$/i.test(window.location.hostname || '');
}

function isLocalDevHost() {
  if (typeof window === 'undefined' || !window.location) return false;
  var host = window.location.hostname || '';
  return window.location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function getApiBaseUrl() {
  if (API_BRIDGE_URL) return API_BRIDGE_URL;
  if (isGitHubPagesHost()) return '';
  return APPS_SCRIPT_URL;
}

function getApiConfigError() {
  if (isGitHubPagesHost()) return 'ยังไม่ได้ตั้งค่า API bridge สำหรับ GitHub Pages';
  return 'ไม่พบ URL ของ Apps Script API';
}

function shouldUseScriptBridge() {
  if (typeof window === 'undefined' || !window.location) return false;
  var host = window.location.hostname || '';
  return !API_BRIDGE_URL && (isGitHubPagesHost() || window.location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1' || host === '::1');
}

function buildApiQuery(fnName, args, extra) {
  var query = '?fn=' + encodeURIComponent(fnName) + '&args=' + encodeURIComponent(JSON.stringify(args || []));
  if (extra) {
    Object.keys(extra).forEach(function(key) {
      if (typeof extra[key] === 'undefined' || extra[key] === null || extra[key] === '') return;
      query += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(String(extra[key]));
    });
  }
  query += '&_=' + Date.now();
  return query;
}

function callJsonp(url, fnName, args) {
  return new Promise(function(resolve, reject) {
    var callbackName = '__api_jsonp_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    var script = document.createElement('script');
    var timer = setTimeout(function() {
      cleanup();
      reject(new Error('JSONP timeout'));
    }, 30000);

    function cleanup() {
      clearTimeout(timer);
      try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = function(payload) {
      cleanup();
      resolve(payload);
    };

    script.onerror = function() {
      cleanup();
      reject(new Error('JSONP load failed'));
    };

    script.src = url + buildApiQuery(fnName, args, { callback: callbackName });
    document.head.appendChild(script);
  });
}

function callUploadViaIframe(url, fnName, args) {
  return new Promise(function(resolve, reject) {
    var bridgeId = 'bridge_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    var frameName = 'bridge_frame_' + bridgeId;
    var iframe = document.createElement('iframe');
    var form = document.createElement('form');
    var timer = setTimeout(function() {
      cleanup();
      reject(new Error('Bridge timeout'));
    }, 30000);

    iframe.name = frameName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    form.method = 'POST';
    form.action = url;
    form.target = frameName;
    form.style.display = 'none';

    function addInput(name, value) {
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    addInput('fn', fnName);
    addInput('args', JSON.stringify(args || []));
    addInput('bridgeId', bridgeId);

    function onMessage(event) {
      if (event.source !== iframe.contentWindow) return;
      if (!event.data || event.data.bridgeId !== bridgeId) return;
      cleanup();
      resolve(event.data.payload);
    }

    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      if (form.parentNode) form.parentNode.removeChild(form);
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }

    window.addEventListener('message', onMessage);
    document.body.appendChild(form);
    form.submit();
  });
}

function callAPI(fnName) {
  var args = Array.prototype.slice.call(arguments, 1);
  var baseUrl = getApiBaseUrl();
  var bridgeMode = shouldUseScriptBridge();
  if (!baseUrl && !bridgeMode) {
    return Promise.reject(new Error(getApiConfigError()));
  }
  
  // uploadFile ใช้ POST เพราะ base64 ใหญ่เกิน URL length limit
  if (fnName === 'uploadFile') {
    if (bridgeMode) return callUploadViaIframe(APPS_SCRIPT_URL, fnName, args);
    return fetch(baseUrl || APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'fn=' + encodeURIComponent(fnName) + '&args=' + encodeURIComponent(JSON.stringify(args))
    }).then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).catch(function(err) {
      console.error('API Error [' + fnName + ']:', err);
      throw err;
    });
  }
  
  // แนบเครื่องหมาย &_=[เวลาปัจจุบัน] เพื่อล้างแคช API ดึง JSON ชุดปัจจุบันจาก Sheets เสมอ
  var url = (baseUrl || APPS_SCRIPT_URL) + buildApiQuery(fnName, args);
  console.log('[API] GET', url);

  if (bridgeMode) {
    return callJsonp(APPS_SCRIPT_URL, fnName, args);
  }

  return fetch(url, { method: 'GET', mode: 'cors' }).then(function(res) {
    console.log('[API] Response', res.status);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }).then(function(data) {
    console.log('[API] Data received from server:', data);
    
    // 🟢 ตัวผ่านข้อมูลแบบบริสุทธิ์ (Pure Pass-Through)
    // ส่งข้อมูลที่ดึงมาได้จริงจาก Google Apps Script ไปให้ app.js ตรงๆ 
    // เพื่อให้ลอจิกใน app.js แกะโครงสร้างตามที่สคริปต์หน้าบ้านเซ็ตไว้แต่แรก
    return data;
    
  }).catch(function(err) {
    var canUseMock = isLocalDevHost() && typeof window !== 'undefined' && window._mockAPI && window._mockAPI[fnName];
    if (canUseMock) {
      console.warn('[API] Fallback to localStorage mock for', fnName, err);
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

