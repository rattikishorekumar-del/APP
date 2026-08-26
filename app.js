/* ============================================================
   ABROAD JOBS PORTAL — frontend logic
   Talks to the Google Apps Script backend (Code.gs).
   PASTE YOUR DEPLOYED WEB APP URL BELOW before hosting this app.
   ============================================================ */
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzhDy1Wux-W91lqoX6GPqkJMcQR-n3Jv12M7EEunLypPx6SqP8WS-PKvhl5H6qV4Ihstw/exec';
 
const STATES_UT = [
  'Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi (NCT)','Goa','Gujarat','Haryana','Himachal Pradesh',
  'Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra',
  'Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu',
  'Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'
];
const ID_TYPES = ['Aadhaar Card','PAN Card','Voter ID (EPIC)','Passport','Driving License','Ration Card','Employee ID Card','Other'];
const EXPERIENCE_OPTIONS = ['0-1 Yr','2-3 Yr','4-5 Yr','6-7 Yr','8-9 Yr','10-11 Yr','12-13 Yr','14-15 Yr','16-17 Yr',
  '18-19 Yr','20-21 Yr','22-23 Yr','24-25 Yr','26-27 Yr','28-29 Yr','30-31 Yr','>32 Yrs'];
 
// ═══════════════ SESSION (in-memory only — no browser storage) ═══════════════
let session = { role: null, name: null };
let pendingRegisterRole = null;
 
// ═══════════════ CHIP DATA STORE ═══════════════
const chipData = {}; // prefix -> array of strings
const CROSS_CHECK = { 'a-phone':'a-wa', 'a-wa':'a-phone', 'c-phone':'c-wa', 'c-wa':'c-phone' };
const CHIP_TYPE = { // 'phone-in' | 'phone-any' | 'text'
  'a-branch':'text', 'a-trade':'text', 'a-phone':'phone-in', 'a-wa':'phone-any',
  'c-phone':'phone-in', 'c-wa':'phone-any', 'j-call':'phone-any', 'j-wa':'phone-any',
  'e-call':'phone-any', 'e-wa':'phone-any'
};
 
function normPhone(p){ return (p||'').toString().replace(/[^\d+]/g,'').trim(); }
function normText(t){ return (t||'').toString().trim().toLowerCase(); }
function isValidIndianMobile(num){ return /^[6-9]\d{9}$/.test(normPhone(num).replace(/^\+?91/,'')); }
function isValidAnyPhone(num){ return /^\+?\d{7,15}$/.test(normPhone(num)); }
 
function addChip(prefix){
  const input = document.getElementById(prefix + '-input');
  if (!input) return;
  const raw = input.value.trim();
  if (!raw) return;
  const type = CHIP_TYPE[prefix] || 'text';
  chipData[prefix] = chipData[prefix] || [];
 
  if (type === 'phone-in') {
    if (!isValidIndianMobile(raw)) { toast('Enter a valid 10-digit Indian mobile number', 'err'); return; }
  } else if (type === 'phone-any') {
    if (!isValidAnyPhone(raw)) { toast('Enter a valid phone number (7-15 digits, optional +country code)', 'err'); return; }
  }
 
  const key = (type === 'text') ? normText(raw) : normPhone(raw);
  const existingKeys = chipData[prefix].map(v => type === 'text' ? normText(v) : normPhone(v));
  if (existingKeys.includes(key)) { toast('This entry is already added', 'err'); return; }
 
  const crossPrefix = CROSS_CHECK[prefix];
  if (crossPrefix && chipData[crossPrefix]) {
    const crossKeys = chipData[crossPrefix].map(v => normPhone(v));
    if (crossKeys.includes(key)) { toast('This number is already used in the other field', 'err'); return; }
  }
 
  chipData[prefix].push(raw);
  input.value = '';
  renderChips(prefix);
}
 
function removeChip(prefix, idx){
  chipData[prefix].splice(idx, 1);
  renderChips(prefix);
}
 
function renderChips(prefix){
  const box = document.getElementById(prefix + '-chips');
  if (!box) return;
  const list = chipData[prefix] || [];
  if (!list.length) { box.innerHTML = '<span class="chip-empty">No entries added yet</span>'; return; }
  box.innerHTML = list.map((v, i) =>
    `<span class="chip">${escapeHtml(v)}<button type="button" onclick="removeChip('${prefix}',${i})" title="Remove">✕</button></span>`
  ).join('');
}
 
function resetChips(prefixes){
  prefixes.forEach(p => { chipData[p] = []; renderChips(p); });
}
 
// ═══════════════ HELPERS ═══════════════
function escapeHtml(s){ const d = document.createElement('div'); d.textContent = String(s ?? ''); return d.innerHTML; }
function ld(m){ document.getElementById('loader').style.display='flex'; document.getElementById('loader-msg').textContent = m || 'Loading…'; }
function hd(){ document.getElementById('loader').style.display='none'; }
function toast(m, t='info'){
  const d = document.createElement('div');
  d.className = 'toast ' + t;
  d.textContent = m;
  document.getElementById('tc').appendChild(d);
  setTimeout(() => d.remove(), 3800);
}
 
async function apiGet(action, params={}){
  if (!WEB_APP_URL || WEB_APP_URL.indexOf('PASTE_YOUR') === 0) throw new Error('App is not configured yet — set WEB_APP_URL in app.js');
  const u = new URL(WEB_APP_URL);
  u.searchParams.set('action', action);
  Object.entries(params).forEach(([k,v]) => u.searchParams.set(k, v));
  const r = await fetch(u.toString());
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Server error');
  return j;
}
async function apiPost(action, payload={}){
  if (!WEB_APP_URL || WEB_APP_URL.indexOf('PASTE_YOUR') === 0) throw new Error('App is not configured yet — set WEB_APP_URL in app.js');
  const body = JSON.stringify(Object.assign({ action }, payload));
  const r = await fetch(WEB_APP_URL, { method:'POST', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, body });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Server error');
  return j;
}
 
// ═══════════════ AUTH VIEW NAVIGATION (login / register — inside the Hot Jobs pane) ═══════════════
function showAuthView(name){
  document.querySelectorAll('.authview').forEach(s => s.classList.remove('active'));
  document.getElementById('view-' + name + '-wrap').classList.add('active');
  window.scrollTo(0,0);
}
 
function selectRole(role){
  pendingRegisterRole = role;
  document.getElementById('role-opt-candidate').classList.toggle('sel', role==='candidate');
  document.getElementById('role-opt-associate').classList.toggle('sel', role==='associate');
  document.querySelector(`input[name="reg-role"][value="${role}"]`).checked = true;
  document.getElementById('role-continue-btn').disabled = false;
}
function continueRegister(){
  if (!pendingRegisterRole) return;
  showAuthView('register-' + pendingRegisterRole);
}
 
// ═══════════════ REGISTRATION ═══════════════
function submitAssociate(){
  const err = document.getElementById('a-error'); err.style.display='none';
  const fullName = document.getElementById('a-fullname').value.trim();
  const pass = document.getElementById('a-pass').value;
  const cpass = document.getElementById('a-cpass').value;
  const office = document.getElementById('a-office').value.trim();
  const testCenter = document.getElementById('a-testcenter').value.trim();
  const state = document.getElementById('a-state').value;
  const idType = document.getElementById('a-idtype').value;
  const idNum = document.getElementById('a-idnum').value.trim();
  const email = document.getElementById('a-email').value.trim();
  const branches = chipData['a-branch'] || [];
  const trades = chipData['a-trade'] || [];
  const phones = chipData['a-phone'] || [];
  const whats = chipData['a-wa'] || [];
 
  if (!fullName || !pass || !cpass || !office || !state || !idType || !idNum) return showErr(err, 'Please fill all required (*) fields.');
  if (pass !== cpass) return showErr(err, 'Password and Confirm Password do not match.');
  if (pass.length < 4) return showErr(err, 'Password must be at least 4 characters.');
  if (!branches.length) return showErr(err, 'Add at least one Branch Office Location.');
  if (!trades.length) return showErr(err, 'Add at least one Trade.');
  if (!phones.length) return showErr(err, 'Add at least one Phone Number.');
  if (!whats.length) return showErr(err, 'Add at least one WhatsApp Number.');
 
  ld('Submitting registration…');
  apiPost('registerAssociate', {
    fullName, password: pass, confirmPassword: cpass, officeAddress: office, testingCenterAddress: testCenter,
    state, branchLocations: branches, trades, phoneNumbers: phones, whatsappNumbers: whats, email, idType, idNumber: idNum
  }).then(res => {
    hd();
    openThankYou('Thank You for Registering!', res.message || 'Your Associate registration is complete. You can now log in.');
    document.getElementById('login-id').value = fullName;
  }).catch(e => { hd(); showErr(err, e.message); });
}
 
function submitCandidate(){
  const err = document.getElementById('c-error'); err.style.display='none';
  const fullName = document.getElementById('c-fullname').value.trim();
  const pass = document.getElementById('c-pass').value;
  const cpass = document.getElementById('c-cpass').value;
  const trade = document.getElementById('c-trade').value.trim();
  const exp = document.getElementById('c-exp').value;
  const abroadEl = document.querySelector('input[name="c-abroad"]:checked');
  const abroad = abroadEl ? abroadEl.value : '';
  const age = document.getElementById('c-age').value;
  const state = document.getElementById('c-state').value;
  const passport = document.getElementById('c-passport').value.trim().toUpperCase();
  const email = document.getElementById('c-email').value.trim();
  const phones = chipData['c-phone'] || [];
  const whats = chipData['c-wa'] || [];
 
  if (!fullName || !pass || !cpass || !trade || !exp || !abroad || !age || !state) return showErr(err, 'Please fill all required (*) fields.');
  if (pass !== cpass) return showErr(err, 'Password and Confirm Password do not match.');
  if (pass.length < 4) return showErr(err, 'Password must be at least 4 characters.');
  if (age < 18 || age > 65) return showErr(err, 'Age must be between 18 and 65.');
  if (!phones.length) return showErr(err, 'Add at least one Phone Number.');
  if (passport && !/^[A-PR-WYa-pr-wy][0-9]{7}$/.test(passport)) return showErr(err, 'Invalid Indian passport number format (e.g. A1234567).');
 
  ld('Submitting registration…');
  apiPost('registerCandidate', {
    fullName, password: pass, confirmPassword: cpass, trade, experience: exp, abroadExperience: abroad, age,
    state, passport, phoneNumbers: phones, whatsappNumbers: whats, email
  }).then(res => {
    hd();
    openThankYou('Thank You for Registering!', res.message || 'Your Candidate registration is complete. You can now log in.');
    document.getElementById('login-id').value = fullName;
  }).catch(e => { hd(); showErr(err, e.message); });
}
 
function showErr(el, msg){ el.textContent = '⚠️ ' + msg; el.style.display='block'; }
 
function openThankYou(title, msg){
  document.getElementById('ty-title').textContent = title;
  document.getElementById('ty-msg').textContent = msg;
  document.getElementById('thankyou-modal').classList.add('open');
}
function closeThankYou(){
  document.getElementById('thankyou-modal').classList.remove('open');
  showAuthView('login');
}
 
// ═══════════════ LOGIN / LOGOUT ═══════════════
function doLogin(){
  const err = document.getElementById('login-error'); err.style.display='none';
  const loginId = document.getElementById('login-id').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!loginId || !pass) return showErr(err, 'Please enter your Login ID and Password.');
  ld('Logging in…');
  apiPost('login', { loginId, password: pass }).then(res => {
    hd();
    session = { role: res.role, name: res.name };
    if (res.role === 'admin') ADMIN_SESSION_PASS = pass; // kept in memory only, needed to authenticate admin-only actions
    enterApp();
  }).catch(e => { hd(); showErr(err, e.message); });
}
 
function doLogout(){
  session = { role: null, name: null };
  ADMIN_SESSION_PASS = null;
  document.getElementById('login-id').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('header-user-actions').style.display = 'none';
  document.getElementById('jobsview').style.display = 'none';
  document.getElementById('authviews').style.display = 'block';
  showAuthView('login');
  switchTab('hotjobs'); // Know Status tab stays reachable to logged-out visitors too; this just resets the default view
}
 
function enterApp(){
  const roleLabel = session.role === 'admin' ? 'Admin' : session.role === 'associate' ? 'Associate' : 'Candidate';
  document.getElementById('user-badge').textContent = `${session.name} · ${roleLabel}`;
  document.getElementById('header-user-actions').style.display = 'flex';
  document.getElementById('admin-panel').style.display = session.role === 'admin' ? 'block' : 'none';
  document.getElementById('authviews').style.display = 'none';
  document.getElementById('jobsview').style.display = 'block';
  switchTab('hotjobs');
  loadJobs();
}
 
// ═══════════════ TABS ═══════════════
function switchTab(name){
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-btn-' + name).classList.add('active');
  document.getElementById('pane-' + name).classList.add('active');
}
 
// ═══════════════ HOT JOBS: ADMIN POST FORM ═══════════════
let currentImageData = null, currentImageMime = null;
let editImageData = null, editImageMime = null;
let editingJobId = null;
let jobsCache = [];
 
function toggleAdminForm(){
  const f = document.getElementById('admin-form');
  const open = f.style.display === 'none';
  f.style.display = open ? 'block' : 'none';
  document.getElementById('admin-toggle-btn').textContent = open ? '✕ Close' : '+ New';
}
function cancelJobForm(){
  ['j-desc','j-country','j-hours','j-food','j-accom','j-benefits','j-exp','j-img-input'].forEach(id => { const el = document.getElementById(id); if (el) el.value=''; });
  currentImageData = null; currentImageMime = null;
  document.getElementById('j-img-preview-area').innerHTML = '<div style="font-size:28px;margin-bottom:6px;">📷</div><div style="font-size:13px;color:var(--muted);">Click to upload requirement image</div><div style="font-size:11px;color:var(--muted);margin-top:4px;">JPEG, PNG · Max 5MB</div>';
  resetChips(['j-call','j-wa']);
  document.getElementById('j-error').style.display = 'none';
  document.getElementById('admin-form').style.display = 'none';
  document.getElementById('admin-toggle-btn').textContent = '+ New';
}
function previewJobImage(input){ readImageFile(input, (dataUrl, mime) => {
  currentImageData = dataUrl; currentImageMime = mime;
  document.getElementById('j-img-preview-area').innerHTML = `<img src="${dataUrl}" style="max-height:110px;border-radius:8px;margin-bottom:6px;box-shadow:0 2px 8px rgba(0,0,0,.1);"/><div style="font-size:11px;color:#00875A;font-weight:600;">✅ Image ready</div>`;
});}
function readImageFile(input, cb){
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5*1024*1024) { toast('Image too large (max 5MB)', 'err'); return; }
  if (!['image/jpeg','image/jpg','image/png'].includes(file.type)) { toast('Only JPEG/PNG allowed', 'err'); return; }
  const reader = new FileReader();
  reader.onload = ev => cb(ev.target.result, file.type);
  reader.readAsDataURL(file);
}
 
function submitJob(){
  const err = document.getElementById('j-error'); err.style.display='none';
  const desc = document.getElementById('j-desc').value.trim();
  const country = document.getElementById('j-country').value.trim();
  const hours = document.getElementById('j-hours').value.trim();
  const food = document.getElementById('j-food').value;
  const accom = document.getElementById('j-accom').value;
  const benefits = document.getElementById('j-benefits').value.trim();
  const expDetails = document.getElementById('j-exp').value.trim();
  const calls = chipData['j-call'] || [];
  const whats = chipData['j-wa'] || [];
 
  if (!desc || !country) return showErr(err, 'Description and Country are required.');
  if (!currentImageData) return showErr(err, 'Please upload a requirement image.');
 
  ld('Posting requirement…');
  apiPost('postJob', {
    adminUser: session.name, adminPass: ADMIN_SESSION_PASS,
    description: desc, country, workingHours: hours, freeFood: food, freeAccommodation: accom,
    otherBenefits: benefits, experienceDetails: expDetails,
    imageBase64: currentImageData, imageMimeType: currentImageMime,
    callNumbers: calls, whatsappNumbers: whats
  }).then(() => { hd(); toast('Requirement posted!', 'ok'); cancelJobForm(); loadJobs(); })
    .catch(e => { hd(); showErr(err, e.message); });
}
 
// ═══════════════ ADMIN SESSION PASSWORD (kept in memory only, captured at login) ═══════════════
let ADMIN_SESSION_PASS = null;
 
// ═══════════════ LOAD & RENDER JOBS ═══════════════
function loadJobs(){
  document.getElementById('jobs-count').textContent = 'Loading…';
  apiGet('getJobs').then(res => { jobsCache = res.data || []; renderJobs(); })
    .catch(e => { document.getElementById('jobs-count').textContent = 'Could not load jobs'; toast(e.message, 'err'); });
}
 
function makeBtn(nums, isWA){
  if (!nums || !nums.length) return '';
  return nums.map((num, i) => {
    const clean = normPhone(num);
    const icon = isWA ? '📲' : '📞';
    const cls = isWA ? 'btn-wa' : 'btn-call';
    const lbl = isWA ? ('WhatsApp' + (nums.length>1 ? ' '+(i+1) : '')) : ('Call' + (nums.length>1 ? ' '+(i+1) : ''));
    const href = isWA ? `https://wa.me/${clean.replace('+','')}` : `tel:${clean}`;
    return `<a href="${escapeHtml(href)}" class="btn btnsm ${cls}">${icon} ${escapeHtml(lbl)}</a>`;
  }).join('');
}
 
function renderJobs(){
  const grid = document.getElementById('jobs-grid');
  document.getElementById('jobs-count').textContent = jobsCache.length ? `Showing ${jobsCache.length} latest requirement${jobsCache.length>1?'s':''}` : 'No requirements posted yet';
  if (!jobsCache.length) {
    grid.innerHTML = `<div class="no-jobs"><div style="font-size:40px;margin-bottom:12px;">📋</div><p style="font-weight:700;font-size:15px;margin-bottom:6px;">No requirements posted yet</p><p style="color:var(--muted);">Please check back soon for the latest Abroad Job openings.</p></div>`;
    return;
  }
  grid.innerHTML = jobsCache.map(job => {
    const isAdmin = session.role === 'admin';
    const adminBtns = isAdmin ? `<div class="job-admin-actions"><button class="job-icon-btn edit" onclick="openEditModal('${job.jobId}')" title="Edit">✏️</button><button class="job-icon-btn del" onclick="deleteJobConfirm('${job.jobId}')" title="Delete">✕</button></div>` : '';
    return `<div class="job-card">
      <div class="job-img-wrap">
        <img src="${escapeHtml(job.imageUrl)}" alt="${escapeHtml(job.country)}" loading="lazy" onclick="openLightbox(this.src)"/>
        <span class="job-country-badge">🌍 ${escapeHtml(job.country||'-')}</span>
        ${adminBtns}
      </div>
      <div class="job-body">
        <div class="job-desc">${escapeHtml(job.description)}</div>
        <div class="job-facts">
          ${job.freeFood ? `<div class="job-fact"><b>Free Food</b>${escapeHtml(job.freeFood)}</div>` : ''}
          ${job.freeAccommodation ? `<div class="job-fact"><b>Accommodation</b>${escapeHtml(job.freeAccommodation)}</div>` : ''}
          ${job.workingHours ? `<div class="job-fact"><b>Working Hours</b>${escapeHtml(job.workingHours)}</div>` : ''}
          ${job.experienceDetails ? `<div class="job-fact"><b>Experience</b>${escapeHtml(job.experienceDetails)}</div>` : ''}
        </div>
        ${job.otherBenefits ? `<div class="job-fact" style="margin-bottom:12px;"><b>Other Benefits</b>${escapeHtml(job.otherBenefits)}</div>` : ''}
        <div class="job-actions">${makeBtn(job.callNumbers,false)}${makeBtn(job.whatsappNumbers,true)}</div>
      </div>
    </div>`;
  }).join('');
}
 
// ═══════════════ IMAGE LIGHTBOX (tap a requirement image to enlarge) ═══════════════
function openLightbox(url){
  if (!url) return;
  document.getElementById('lightbox-img').src = url;
  document.getElementById('image-lightbox').classList.add('open');
}
function closeLightbox(){
  document.getElementById('image-lightbox').classList.remove('open');
  document.getElementById('lightbox-img').src = '';
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('image-lightbox').classList.contains('open')) closeLightbox();
});
 
// ═══════════════ ADMIN: EDIT / DELETE ═══════════════
function openEditModal(jobId){
  const job = jobsCache.find(j => j.jobId === jobId);
  if (!job) return;
  editingJobId = jobId;
  editImageData = null; editImageMime = null;
  document.getElementById('e-desc').value = job.description || '';
  document.getElementById('e-country').value = job.country || '';
  document.getElementById('e-hours').value = job.workingHours || '';
  document.getElementById('e-food').value = job.freeFood || '';
  document.getElementById('e-accom').value = job.freeAccommodation || '';
  document.getElementById('e-benefits').value = job.otherBenefits || '';
  document.getElementById('e-exp').value = job.experienceDetails || '';
  document.getElementById('e-img-preview-area').innerHTML = '<div style="font-size:12px;color:var(--muted);">Click to replace image (leave empty to keep current)</div>';
  document.getElementById('e-img-input').value = '';
  chipData['e-call'] = (job.callNumbers || []).slice();
  chipData['e-wa'] = (job.whatsappNumbers || []).slice();
  renderChips('e-call'); renderChips('e-wa');
  document.getElementById('e-error').style.display = 'none';
  document.getElementById('edit-modal').classList.add('open');
}
function closeEditModal(){ document.getElementById('edit-modal').classList.remove('open'); editingJobId = null; }
function previewEditImage(input){ readImageFile(input, (dataUrl, mime) => {
  editImageData = dataUrl; editImageMime = mime;
  document.getElementById('e-img-preview-area').innerHTML = `<img src="${dataUrl}" style="max-height:90px;border-radius:8px;"/>`;
});}
 
function saveEditJob(){
  if (!editingJobId) return;
  const err = document.getElementById('e-error'); err.style.display='none';
  const payload = {
    adminUser: session.name, adminPass: ADMIN_SESSION_PASS, jobId: editingJobId,
    description: document.getElementById('e-desc').value.trim(),
    country: document.getElementById('e-country').value.trim(),
    workingHours: document.getElementById('e-hours').value.trim(),
    freeFood: document.getElementById('e-food').value,
    freeAccommodation: document.getElementById('e-accom').value,
    otherBenefits: document.getElementById('e-benefits').value.trim(),
    experienceDetails: document.getElementById('e-exp').value.trim(),
    callNumbers: chipData['e-call'] || [],
    whatsappNumbers: chipData['e-wa'] || []
  };
  if (!payload.description || !payload.country) return showErr(err, 'Description and Country are required.');
  if (editImageData) { payload.imageBase64 = editImageData; payload.imageMimeType = editImageMime; }
 
  ld('Saving changes…');
  apiPost('updateJob', payload).then(() => { hd(); toast('Requirement updated', 'ok'); closeEditModal(); loadJobs(); })
    .catch(e => { hd(); showErr(err, e.message); });
}
 
function deleteJobConfirm(jobId){
  if (!confirm('Delete this requirement? This cannot be undone.')) return;
  ld('Deleting…');
  apiPost('deleteJob', { adminUser: session.name, adminPass: ADMIN_SESSION_PASS, jobId })
    .then(() => { hd(); toast('Requirement deleted', 'ok'); loadJobs(); })
    .catch(e => { hd(); toast(e.message, 'err'); });
}
 
// ═══════════════ KNOW YOUR STATUS ═══════════════
async function searchStatus(){
  const raw = document.getElementById('passport-search').value.trim().toUpperCase();
  if (!raw) { showStatusErr('Please enter your passport number.'); return; }
  hideStatusErr();
  document.getElementById('status-result').innerHTML = '';
  ld('Searching…');
  try {
    const r = await apiGet('getAll', { sheet: 'Selections' });
    hd();
    const candidate = (r.data || []).find(x => (x.Passport || '').toString().toUpperCase().trim() === raw);
    if (!candidate) { showStatusErr('No record found for passport "' + raw + '". Please check and try again.'); return; }
    renderStatus(candidate);
  } catch (err) { hd(); showStatusErr('Could not connect. Please try again. (' + err.message + ')'); }
}
function showStatusErr(m){ const el = document.getElementById('search-error'); el.style.display='block'; el.textContent = '⚠️ ' + m; }
function hideStatusErr(){ document.getElementById('search-error').style.display = 'none'; }
function badgeCls(v){
  const s = (v||'').toString().toLowerCase();
  if (s.includes('select')||s.includes('accept')||s.includes('fit')||s.includes('cleared')||s.includes('onboard')||s.includes('received')||s.includes('ok')) return 'b-ok';
  if (s.includes('reject')||s.includes('unfit')||s.includes('decline')) return 'b-rej';
  if (s.includes('hold')||s.includes('await')||s.includes('pending')||s.includes('submitt')) return 'b-warn';
  if (s.includes('under')||s.includes('raised')||s.includes('request')) return 'b-info';
  return 'b-pend';
}
function fld(label, val, badge){
  const empty = !val || val.toString().trim() === '';
  const display = empty ? `<span class="sc-val empty">Not updated</span>`
    : badge ? `<span class="sc-val"><span class="badge ${badgeCls(val)}">${escapeHtml(val)}</span></span>`
    : `<span class="sc-val">${escapeHtml(val)}</span>`;
  return `<div class="sc-field"><span class="sc-label">${label}</span>${display}</div>`;
}
function renderStatus(c){
  const initials = (c.Name || '?').toString().split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('status-result').innerHTML = `
    <div class="status-card">
      <div class="sc-header">
        <div class="sc-avatar">${escapeHtml(initials)}</div>
        <div><div class="sc-name">${escapeHtml(c.Name||'—')}</div><div class="sc-sub">Passport: ${escapeHtml(c.Passport||'—')} · ${escapeHtml(c.Designation||'—')}</div></div>
      </div>
      <div class="sc-body">
        <div class="ss-title">👤 Personal Information</div>
        <div class="sc-grid">${fld('Full Name',c.Name)}${fld('Passport Number',c.Passport)}${fld('Date of Birth',c.DOB)}${fld('Phone Number',c.Phone)}${fld('State',c.State)}${fld('Qualification',c.Qualifications)}</div>
        <div class="ss-title">🤝 Associate &amp; Company</div>
        <div class="sc-grid">${fld('Associate Name',c.AssociateName)}${fld('Associate Code',c.AssociateCode)}${fld('Company Name',c.CompanyName)}${fld('Designation',c.Designation)}${fld('Interview Date',c.InterviewDate)}</div>
        <div class="ss-title">💰 Salary Details</div>
        <div class="sc-grid">${fld('Basic Salary',c.BasicSalary)}${fld('Allowance 1',c.Allowance1)}${fld('Allowance 2',c.Allowance2)}${fld('Allowance 3',c.Allowance3)}${fld('Total Salary',c.TotalSalary)}${fld('Acceptance',c.Acceptance,true)}</div>
        <div class="ss-title">🏥 Medical</div>
        <div class="sc-grid">${fld('Medical Type',c.MedicalType)}${fld('Medical Ref',c.MedicalRef)}${fld('Medical Status',c.MedicalStatus,true)}</div>
        <div class="ss-title">🛂 Visa &amp; Documents</div>
        <div class="sc-grid">${fld('Visa Documents Status',c.VisaDocuments,true)}${fld('Visa Status',c.VisaStatus,true)}${fld('Visa Issue Date',c.VisaIssueDate)}${fld('Visa Verification',c.VisaVerification,true)}${fld('Visa Correction Type',c.VcorrType)}</div>
        <div class="ss-title">✈️ Emigration &amp; Travel</div>
        <div class="sc-grid">${fld('Emigration',c.Emigration,true)}${fld('Ticket Status',c.TicketStatus,true)}${fld('Travel Date',c.TravelDate)}${fld('Travel Sector',c.TravelSector)}${fld('Onboard Status',c.OnboardStatus,true)}</div>
      </div>
    </div>`;
}
 
// ═══════════════ INIT ═══════════════
function populateSelects(){
  ['a-state','c-state'].forEach(id => {
    const sel = document.getElementById(id);
    STATES_UT.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; sel.appendChild(o); });
  });
  const idSel = document.getElementById('a-idtype');
  ID_TYPES.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; idSel.appendChild(o); });
  const expSel = document.getElementById('c-exp');
  EXPERIENCE_OPTIONS.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; expSel.appendChild(o); });
}
 
document.addEventListener('DOMContentLoaded', () => {
  populateSelects();
  ['a-branch','a-trade','a-phone','a-wa','c-phone','c-wa','j-call','j-wa','e-call','e-wa'].forEach(p => { chipData[p]=[]; renderChips(p); });
  if (!WEB_APP_URL || WEB_APP_URL.indexOf('PASTE_YOUR') === 0) {
    toast('App backend not configured — set WEB_APP_URL in app.js', 'err');
  }
  setupPWA();
});
 
// ═══════════════ PWA SETUP (static manifest.json + service-worker.js + install banner) ═══════════════
// Note: these are real files (not runtime-generated blobs) so that Android packaging tools
// like PWABuilder/Bubblewrap can fetch and audit them directly — see SETUP_GUIDE.md Part 6.
// Install-banner dismissal is kept in memory only (no localStorage), so the banner may
// reappear on a fresh page load — that's an intentional trade-off, see the setup guide.
let pwaDismissed = false;
function setupPWA(){
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js', { scope: './' }).catch(()=>{});
  }
 
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (!pwaDismissed) document.getElementById('pwa-banner').classList.add('show');
  });
  document.getElementById('pwa-install-btn').addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      document.getElementById('pwa-banner').classList.remove('show');
      if (outcome === 'accepted') toast('App installed! 🎉', 'ok');
    } else {
      toast('Tap the Share button → "Add to Home Screen"', 'info');
    }
  });
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone;
  if (isIOS && !isStandalone && !pwaDismissed) {
    setTimeout(() => document.getElementById('pwa-banner').classList.add('show'), 2000);
  }
}
function dismissBanner(){
  document.getElementById('pwa-banner').classList.remove('show');
  pwaDismissed = true;
}