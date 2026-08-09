// Minimal client-side account storage with password-based encryption
// Uses Web Crypto API: PBKDF2 + AES-GCM

// Helpers for base64
function b64Encode(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); }
function b64Decode(str) { const s = atob(str); const arr = new Uint8Array(s.length); for (let i=0;i<s.length;i++) arr[i]=s.charCodeAt(i); return arr.buffer; }

async function deriveKey(password, salt, iterations=150000) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt','decrypt']);
}

async function encryptData(obj, password) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
  return { ct: b64Encode(ct), iv: b64Encode(iv), salt: b64Encode(salt) };
}

async function decryptData({ct, iv, salt}, password) {
  try {
    const key = await deriveKey(password, b64Decode(salt));
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64Decode(iv) }, key, b64Decode(ct));
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(plainBuf));
  } catch (e) {
    throw new Error('Unable to decrypt (wrong password or corrupted data)');
  }
}

function uid() { return 'u_' + Math.random().toString(36).slice(2,10); }

// Local storage helpers
function getUsersMap() {
  try { return JSON.parse(localStorage.getItem('muzworm_users')||'{}'); } catch(e){ return {}; }
}
function saveUsersMap(map) { localStorage.setItem('muzworm_users', JSON.stringify(map)); }

function setSession(userId) { sessionStorage.setItem('muzworm_current', userId); }
function clearSession() { sessionStorage.removeItem('muzworm_current'); }
function getSession() { return sessionStorage.getItem('muzworm_current'); }

// UI wiring
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const profileSection = document.getElementById('profileSection');
const sessionArea = document.getElementById('sessionArea');
const sessionEmail = document.getElementById('sessionEmail');
const logoutBtn = document.getElementById('logoutBtn');
const profileForm = document.getElementById('profileForm');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const viewBtn = document.getElementById('viewBtn');
const viewArea = document.getElementById('viewArea');

let currentPassword = null; // keep in-memory during session for decrypt/encrypt

async function registerHandler(e) {
  e.preventDefault();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const password = document.getElementById('regPassword').value;
  const display = document.getElementById('regDisplay').value.trim();
  const bio = document.getElementById('regBio').value.trim();
  if (!email || !password) return alert('email и password обязательны');

  const users = getUsersMap();
  for (const k in users) if (users[k].email === email) return alert('Пользователь с таким email уже существует (локально)');
  const id = uid();
  const profile = { displayName: display, bio };
  const enc = await encryptData(profile, password);
  users[id] = { id, email, profile_enc: enc, profilePublic: false, publicProfile: { displayName: display } };
  saveUsersMap(users);
  setSession(id);
  currentPassword = password;
  updateUILoggedIn(users[id]);
  alert('Регистрация выполнена (локально в браузере).');
  registerForm.reset();
}

async function loginHandler(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const users = getUsersMap();
  const entries = Object.values(users).filter(u => u.email === email);
  if (!entries.length) return alert('Пользователь не найден (локально)');
  const user = entries[0];
  try {
    const profile = await decryptData(user.profile_enc, password);
    setSession(user.id);
    currentPassword = password;
    // fill profile UI
    updateUILoggedIn(user, profile);
    alert('Вход выполнен');
    loginForm.reset();
  } catch (e) {
    alert('Неверный пароль');
  }
}

function logoutHandler() { clearSession(); currentPassword = null; profileSection.classList.add('hidden'); sessionArea.classList.add('hidden'); }

function updateUILoggedIn(user, profile) {
  sessionArea.classList.remove('hidden');
  profileSection.classList.remove('hidden');
  sessionEmail.textContent = user.email;
  // Try to decrypt profile with currentPassword
  if (currentPassword) {
    decryptData(user.profile_enc, currentPassword).then(p => {
      document.getElementById('profileDisplay').value = p.displayName || '';
      document.getElementById('profileBio').value = p.bio || '';
    }).catch(()=>{});
  }
}

async function saveProfileHandler(e) {
  e.preventDefault();
  const userId = getSession();
  if (!userId) return alert('Необходимо войти');
  const users = getUsersMap();
  const user = users[userId];
  if (!user) return alert('Пользователь не найден');
  const display = document.getElementById('profileDisplay').value.trim();
  const bio = document.getElementById('profileBio').value.trim();
  const profilePublic = document.getElementById('profilePublic').checked;
  if (!currentPassword) return alert('Ключ сессии отсутствует; перезайдите.');
  const enc = await encryptData({ displayName: display, bio }, currentPassword);
  user.profile_enc = enc;
  user.profilePublic = profilePublic;
  user.publicProfile = { displayName: display };
  users[userId] = user;
  saveUsersMap(users);
  alert('Профиль сохранён локально');
}

async function exportHandler() {
  const userId = getSession();
  if (!userId) return alert('Необходимо войти');
  const users = getUsersMap();
  const user = users[userId];
  if (!user) return alert('Пользователь не найден');
  const payload = { id: user.id, email: user.email, profile_enc: user.profile_enc, profilePublic: user.profilePublic, publicProfile: user.publicProfile };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `muzworm_profile_${user.email.replace(/[@]/g,'_')}.json`; a.click(); URL.revokeObjectURL(url);
}

function importHandler(e) {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = function() {
    try {
      const obj = JSON.parse(r.result);
      const users = getUsersMap();
      users[obj.id] = obj;
      saveUsersMap(users);
      alert('Профиль импортирован локально. Войдите с паролем чтобы расшифровать.');
    } catch (err) { alert('Ошибка при импорте файла'); }
  };
  r.readAsText(f);
}

async function viewHandler() {
  const id = document.getElementById('viewUserId').value.trim();
  const users = getUsersMap();
  let user = null;
  if (!id) {
    const sid = getSession(); if (!sid) return viewArea.textContent = 'Вы не вошли и не задали ID.';
    user = users[sid];
    if (!user) return viewArea.textContent = 'Локальный профиль не найден.';
    // owner view: decrypt
    if (!currentPassword) return viewArea.textContent = 'Ключ сессии отсутствует; перезайдите.';
    try {
      const profile = await decryptData(user.profile_enc, currentPassword);
      viewArea.textContent = JSON.stringify({ email: user.email, profile, profilePublic: user.profilePublic }, null, 2);
    } catch (e) { viewArea.textContent = 'Не удалось расшифровать профиль (возможно неверный пароль).'; }
    return;
  }
  user = users[id];
  if (!user) return viewArea.textContent = 'Пользователь не найден локально (в этом браузере).';
  if (user.profilePublic) {
    viewArea.textContent = JSON.stringify({ email: user.email, profile: user.publicProfile, profilePublic: true }, null, 2);
  } else {
    viewArea.textContent = 'Профиль приватный';
  }
}

registerForm.addEventListener('submit', registerHandler);
loginForm.addEventListener('submit', loginHandler);
logoutBtn.addEventListener('click', logoutHandler);
profileForm.addEventListener('submit', saveProfileHandler);
exportBtn.addEventListener('click', exportHandler);
importFile.addEventListener('change', importHandler);
viewBtn.addEventListener('click', viewHandler);

// On load: if session exists, try to fill email only (decrypt when possible)
(function init() {
  const sid = getSession();
  if (!sid) return;
  const users = getUsersMap();
  const user = users[sid];
  if (!user) return;
  sessionArea.classList.remove('hidden');
  profileSection.classList.remove('hidden');
  sessionEmail.textContent = user.email;
})();
