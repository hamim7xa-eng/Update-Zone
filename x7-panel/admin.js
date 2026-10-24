import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBm_4h1HrePiqjWgh2YfydYFDOl3fXcniw",
    authDomain: "my-galary-project.firebaseapp.com",
    databaseURL: "https://my-galary-project-default-rtdb.firebaseio.com",
    projectId: "my-galary-project",
    storageBucket: "my-galary-project.firebasestorage.app",
    messagingSenderId: "515378723104",
    appId: "1:515378723104:web:96411584aed064dcfa3f45",
    measurementId: "G-PRWR4EG4X0"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
window.db = db;

/* =======================================================
   ADMIN SITE — alada file (main app theke notun kore ashche)
======================================================= */
let toastTimeout;
window.showToast = function(message, type = "info") {
    const toast = document.getElementById("cyberToast");
    if (!toast) return;

    // আগের টাইমার ক্লিয়ার করা (যদি পর পর নোটিফিকেশন আসে)
    clearTimeout(toastTimeout);

    // মেসেজ এবং টাইপ সেট করা
    toast.innerText = message;
    toast.className = ""; // আগের সব ক্লাস রিমুভ

    if (type === "success") toast.classList.add("toast-success");
    if (type === "error") toast.classList.add("toast-error");

    // টোস্ট উপরে ওঠানো (অ্যানিমেশন রান হবে)
    toast.style.bottom = "30px";

    // ৩ সেকেন্ড পর আবার নিচে নামিয়ে দেওয়া
    toastTimeout = setTimeout(() => {
        toast.style.bottom = "-100px";
    }, 3000);
};

const gEsc = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gId  = (t) => String(t ?? '').replace(/[^A-Za-z0-9_-]/g, '');
const $ = (id) => document.getElementById(id);
const TG = (window.Telegram && window.Telegram.WebApp) || null;
const IN_TG = !!(TG && TG.initData);

const DB_REST = firebaseConfig.databaseURL.replace(/\/$/, '');
async function dbRead(path) {
    try {
        const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
        const r = await fetch(DB_REST + '/' + path + '.json', { signal: ctl.signal, cache: 'no-store' });
        clearTimeout(tm);
        if (r.ok) return await r.json();
    } catch (_) {}
    const sn = await get(ref(db, path)); return sn.exists() ? sn.val() : null;
}

function openExternal(url) {
    if (!/^https?:\/\//i.test(String(url || ''))) return false;
    try {
        if (TG && /^https:\/\/t\.me\//i.test(url) && TG.openTelegramLink) { TG.openTelegramLink(url); return true; }
        if (TG && IN_TG && TG.openLink) { TG.openLink(url, { try_instant_view: false }); return true; }
    } catch (_) {}
    const w = window.open(url, '_blank');
    return !!w;
}
window.openExternal = openExternal;

/* Deep link helpers (share link copy) */
let TGC = null, _tgCfgP = null;
window.getTgCfg = function (fresh) {
    if (!_tgCfgP || fresh) {
        _tgCfgP = dbRead('settings/telegram').catch(() => null).then(c => {
            c = c || {};
            TGC = { bot: String(c.bot || '').replace(/^@/, '').trim(), app: String(c.app || '').trim() };
            return TGC;
        });
    }
    return _tgCfgP;
};
function buildLinkSync(param) {
    if (TGC && TGC.bot) {
        const base = TGC.app ? `https://t.me/${TGC.bot}/${TGC.app}` : `https://t.me/${TGC.bot}`;
        return base + '?startapp=' + encodeURIComponent(param);
    }
    return location.origin + location.pathname + (param.charAt(0) === 's' ? '?share=' : '?content=') + param.slice(2);
}
async function buildLink(param) { if (!TGC) await window.getTgCfg(); return buildLinkSync(param); }

window.apiReady = async function () { return false; };
window.apiCall = async function () { throw new Error("Not available."); };

window.copyLink = function(url) {
    const tempInput = document.createElement("input"); tempInput.value = url; document.body.appendChild(tempInput); tempInput.select(); document.execCommand("copy"); document.body.removeChild(tempInput);
    let toast = document.getElementById("copyToast");
    if(toast){ 
        toast.style.display = "block"; 
        setTimeout(() => toast.style.display = "none", 2000); 
    } else { 
        window.showToast("Link Copied! ✅", "success"); 
    }
}

window.copyPublicLink = async function (id) { window.copyLink(await buildLink('c_' + gId(id))); };
window.copyShareToken = async function (tk) { window.copyLink(await buildLink('s_' + gId(tk))); };

/* ---------- Unlock config + Ad engine (same as main app; used by Ads Manager / Unlock Settings) ---------- */
const DEFAULT_ADSTERRA_LINK = "https://www.profitablecpmratenetwork.com/ik9vkq6he4?key=b77675332b05984222206472447a446c";
const ADS_SLOTS = ['login', 'content', 'bonus'];
const AD = { running: false, tap: null };
const adErr = (m) => { const e = new Error(m); e.isAd = true; return e; };

let _cfgP = null;
window.loadUnlockConfig = async function (fresh) {
    if (!_cfgP || fresh) _cfgP = dbRead('unlock_config').catch(() => null);
    const c = (await _cfgP) || {};
    return {
        photoSteps: parseInt(c.photoSteps, 10) || 3, videoSteps: parseInt(c.videoSteps, 10) || 6,
        accessHours: parseInt(c.accessHours, 10) || 24, minStepSeconds: parseInt(c.minStepSeconds, 10) || 5
    };
};

function normSlot(s) {
    s = s || {};
    const p = ['adsgram', 'monetag', 'adsterra', 'off'].includes(s.provider) ? s.provider : 'adsterra';
    return { provider: p, adsgram: String(s.adsgram || '').trim(), monetag: String(s.monetag || '').replace(/\D/g, ''),
             monetagFmt: s.monetagFmt === 'pop' ? 'pop' : 'int', adsterra: String(s.adsterra || '').trim() };
}
let _adsP = null;
window.loadAdsConfig = async function (fresh) {
    if (!_adsP || fresh) _adsP = dbRead('ads_config').catch(() => null);
    const c = (await _adsP) || {};
    const out = { monetagSdk: String(c.monetagSdk || '').trim() || 'https://libtl.com/sdk.js' };
    ADS_SLOTS.forEach(k => { out[k] = normSlot(c[k]); });
    return out;
};

const _scriptP = {};
function loadScript(key, src, attrs) {
    if (_scriptP[key]) return _scriptP[key];
    _scriptP[key] = new Promise((resolve, reject) => {
        const sc = document.createElement('script'); sc.src = src; sc.async = true;
        Object.entries(attrs || {}).forEach(([k, v]) => sc.setAttribute(k, v));
        const t = setTimeout(() => { sc.remove(); delete _scriptP[key]; reject(new Error('timeout')); }, 12000);
        sc.onload = () => { clearTimeout(t); resolve(); };
        sc.onerror = () => { clearTimeout(t); sc.remove(); delete _scriptP[key]; reject(new Error('blocked')); };
        document.head.appendChild(sc);
    });
    return _scriptP[key];
}

const ADAPTERS = {
    adsgram: async (cfg) => {
        if (!cfg.adsgram) throw adErr("Adsgram Block ID is missing. Admin → Ads Manager.");
        try { await loadScript('adsgram', 'https://sad.adsgram.ai/js/sad.min.js'); }
        catch (_) { throw adErr("The ad provider failed to load (offline or blocked). Please retry."); }
        if (!window.Adsgram) throw adErr("The ad provider is unavailable. Please retry.");
        let r;
        try { r = await window.Adsgram.init({ blockId: String(cfg.adsgram) }).show(); } catch (e) { r = e; }
        if (!r || r.done !== true) throw adErr(r && r.error ? "No advertisement is available right now. Please retry in a moment." : "The advertisement wasn't completed. Please retry.");
        return true;
    },
    monetag: async (cfg, ui, all) => {
        const zone = cfg.monetag;
        if (!zone) throw adErr("Monetag Zone ID is missing. Admin → Ads Manager.");
        const fn = 'show_' + zone;
        if (typeof window[fn] !== 'function') {
            try { await loadScript('monetag:' + zone, all.monetagSdk, { 'data-zone': zone, 'data-sdk': fn }); }
            catch (_) { throw adErr("The ad provider failed to load (offline or blocked). Please retry."); }
        }
        if (typeof window[fn] !== 'function') throw adErr("The ad provider is unavailable. Please retry.");
        try { await (cfg.monetagFmt === 'pop' ? window[fn]('pop') : window[fn]()); }
        catch (_) { throw adErr("No advertisement is available right now. Please retry in a moment."); }
        return true;
    },
    // Adsterra direct link: opened through Telegram; counts only if the visitor really stayed away for the minimum seconds.
    adsterra: (cfg, ui, all, ctx) => new Promise((resolve, reject) => {
        const secs = Math.max(1, ctx.minSeconds || 5);
        const link = cfg.adsterra || DEFAULT_ADSTERRA_LINK;
        let left = 0, done = false, ticker = null, hard = null;
        const t0 = Date.now();
        const onHide = () => { if (!left) left = Date.now(); };
        const onBack = () => {
            if (!left || done) return;
            const away = Date.now() - left; left = 0;
            if (away >= secs * 1000) finish(resolve, true);
            else finish(reject, adErr("Please stay on the ad page for " + secs + " seconds, then come back. Tap to try again."));
        };
        const onVis = () => { document.visibilityState === 'hidden' ? onHide() : onBack(); };
        function finish(fn, v) {
            if (done) return; done = true; clearInterval(ticker); clearTimeout(hard); AD.tap = null;
            document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onBack);
            try { if (TG && TG.offEvent) { TG.offEvent('activated', onBack); TG.offEvent('deactivated', onHide); } } catch (_) {}
            fn(v);
        }
        if (!openExternal(link)) return reject(adErr("The ad page was blocked. Please tap again."));
        document.addEventListener('visibilitychange', onVis); window.addEventListener('focus', onBack);
        try { if (TG && TG.onEvent) { TG.onEvent('activated', onBack); TG.onEvent('deactivated', onHide); } } catch (_) {}
        ui.setMsg("Ad opened. Stay on it for " + secs + " seconds, then come back.");
        ticker = setInterval(() => {
            const el = (Date.now() - t0) / 1000;
            if (el < secs) ui.setBtn("⏳ Stay on the ad page… " + Math.ceil(secs - el) + "s", true);
            else { ui.setBtn("✅ I viewed the ad — Continue", false); AD.tap = () => finish(resolve, true); }
        }, 250);
        hard = setTimeout(() => finish(reject, adErr("The ad page didn't open properly. Please retry.")), 180000);
    })
};

window.runAd = async function (slot, ui) {
    const [all, ucfg] = await Promise.all([window.loadAdsConfig(), window.loadUnlockConfig()]);
    const cfg = all[slot] || normSlot();
    if (cfg.provider === 'off') return 'off';
    AD.running = true;
    try { await ADAPTERS[cfg.provider](cfg, ui, all, { minSeconds: ucfg.minStepSeconds }); return cfg.provider; }
    finally { AD.running = false; AD.tap = null; }
};


/* =======================================================
   FIREBASE AUTHENTICATION SUBMIT LOGIC (TRIPLE-LOCK)
======================================================= */
window.submitAdminLogin = async function() {
    const card = document.querySelector(".luxury-card");
    const inputEmail = document.getElementById("adminEmailInput").value.trim();
    const password   = document.getElementById("adminPasswordInput").value;
    const inputUid   = document.getElementById("adminUidInput").value.trim();

    const triggerErrorAnimation = () => {
        if(card) {
            card.classList.remove("shake-error");
            void card.offsetWidth; 
            card.classList.add("shake-error");
        }
        window.showToast("⚠️ Access Denied: You are not the Admin!", "error");
    };

    if(!inputEmail || !password || !inputUid) {
        return window.showToast("All fields are required for Admin Verification! ⚠️", "error");
    }

    if (inputEmail !== "hamim7xa@gmail.com") {
        return triggerErrorAnimation();
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, inputEmail, password);
        const loggedInUser = userCredential.user;

        if (loggedInUser.uid === inputUid) {
            if(card) card.classList.add("exit-success");
            
            setTimeout(() => {
                window.showToast("Welcome Admin! Panel Unlocked 🔥", "success");
                document.getElementById("luxuryLoginModal").style.display = "none";
                if(card) card.classList.remove("exit-success");
                document.getElementById("adminPanel").style.display = "flex";
                document.getElementById("adminPanel").style.zIndex = "1";
                window.loadAdminFiles();
                window.loadPrivacyFiles();
            }, 500);
            
        } else {
            await signOut(auth);
            triggerErrorAnimation();
        }
    } catch (error) {
        triggerErrorAnimation();
    }
};

/* =======================================================
   VIP DASHBOARD TAB NAVIGATOR SYSTEM
======================================================= */
window.switchTab = function(tabId, buttonElement) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active'));

    const buttons = document.querySelectorAll('.menu-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    buttonElement.classList.add('active');
    
    if(tabId === 'fileManagementTab') window.loadAdminFiles();
    if(tabId === 'privacyTab') window.loadPrivacyFiles();
};

/* =======================================================
   ১. কাস্টম ক্যাটাগরি ক্লাউডিনারি আপলোড লজিক
======================================================= */
window.handleAdminUploadLegacy = async function() {
    const fileInput = document.getElementById("adminFileInput");
    const category = document.getElementById("adminCategorySelect").value;
    const file = fileInput.files[0];

    if (!file) return window.showToast("Please select a file first! ❌", "error");

    const cloudName = "sabbir-img-upload";
    const uploadPreset = "sabbir-host";
    const type = file.type.startsWith("image") ? "image" : "video";
    const _thumb = window.__pendingThumb || "";
    const _priv = !!window.__pendingPrivate;
    const _text = window.__pendingText || "";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/${type}/upload`);

    xhr.upload.onprogress = (e) => {
        let percent = (e.loaded / e.total) * 100;
        const progressBar = document.getElementById("adminUploadProgress");
        if (progressBar) progressBar.style.width = percent + "%";
    };

    xhr.onload = async () => {
        const data = JSON.parse(xhr.responseText);
        if (data.secure_url) {
            const fileId = Date.now().toString();

            await set(ref(db, `${_priv ? 'private_files' : 'admin_files'}/${fileId}`), {
                id: fileId,
                url: data.secure_url,
                name: file.name,
                type: type,
                category: category,
                status: _priv ? "private" : "public",
                thumb: _priv ? "" : _thumb,
                text: _text,
                timestamp: Date.now()
            });

            window.showToast(_priv ? "🔒 Uploaded as PRIVATE (hidden from gallery)." : "⚡ VIP File Injected & Synced Successfully!", "success");
            if (window.loadPrivateFiles) window.loadPrivateFiles();
            document.getElementById("adminUploadProgress").style.width = "0%";
            fileInput.value = "";
            document.getElementById('adminFileLabel').innerText = "Click to Select Admin Files";
            window.loadAdminFiles();
        } else {
            window.showToast("Upload Failed! ❌", "error");
        }
    };
    xhr.send(formData);
};

/* =======================================================
   ২. ফাইল ম্যানেজমেন্ট (লিস্ট এবং ডিলিট)
======================================================= */
window.loadAdminFiles = async function() {
    const snapshot = await get(ref(db, 'admin_files'));
    const tbody = document.getElementById("adminFileList");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!snapshot.exists()) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; opacity:0.5;">No active files found on server.</td></tr>`;
        return;
    }

    snapshot.forEach((childSnapshot) => {
        const file = childSnapshot.val();
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
        tr.innerHTML = `
            <td style="padding:12px; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><span style="color:#00f0ff;">🔗 ${String(file.name).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}</span></td>
            <td style="padding:12px;">${file.category}</td>
            <td style="padding:12px;"><span class="badge">${file.type.toUpperCase()}</span></td>
            <td style="padding:12px;"><button class="cyber-btn" style="padding:5px 10px; margin:0; font-size:12px; background:#00f0ff; color:#000;" onclick="window.adminViewItem('${file.id}', '${file.url ? String(file.url).replace(/'/g,'') : ''}', '${file.link ? String(file.link).replace(/'/g,'') : ''}')">👁️ View</button> <button class="cyber-btn" style="padding:5px 10px; margin:0; font-size:12px; background:#a78bfa; color:#000;" onclick="window.copyPublicLink('${file.id}')">🔗 Copy Link</button></td>
            <td style="padding:12px;"><button class="cyber-btn btn-red" style="padding:5px 10px; margin:0; font-size:12px;" onclick="window.deleteAdminFile('${file.id}')">Wipe</button></td>
        `;
        tbody.appendChild(tr);
    });
};

window.deleteAdminFile = async function(fileId) {
    if (!confirm("Are you absolute sure to wipe this file from database?")) return;
    await remove(ref(db, `admin_files/${fileId}`));
    window.showToast("File Wiped Out! 🗑️", "success");
    window.loadAdminFiles();
};

/* =======================================================
   ৩. এক্সেস ও প্রাইভেসি (প্রাইভেট/পাবলিক স্ট্যাটাস টগল)
======================================================= */
window.adminViewImg = function(url) {
    const popup = document.getElementById("popup");
    const popupImg = document.getElementById("popupImg");
    if(popup && popupImg){
        // admin panel (z-index 999999) এর উপরে দেখানোর জন্য 1000001
        popup.style.display = "flex";
        popup.style.zIndex = "1000001";
        popupImg.src = url;
        // ক্লোজ বাটনটাও উপরে রাখা
        const closeBtn = popup.querySelector('.close-popup-btn');
        if(closeBtn) closeBtn.style.zIndex = "1000002";
    }
}

/* =======================================================
   ৪. লাইভ নোটিশ এবং আরজিবি পপআপ ব্রডকাস্টার লজিক
======================================================= */
window.broadcastNotice = async function() {
    const text = document.getElementById("adminNoticeInput").value.trim();
    if (!text) return window.showToast("Notice text cannot be empty! ⚠️", "error");
    await set(ref(db, 'admin_notif'), { message: text });
    window.showToast("📡 Scrolling Notice Dispatched Successfully!", "success");
};

window.broadcastPopup = async function() {
    const text = document.getElementById("adminPopupTextInput").value.trim();
    const link = document.getElementById("adminPopupLinkInput").value.trim();
    if (!text) return window.showToast("Popup text is required! ⚠️", "error");

    await set(ref(db, 'live_popup'), {
        message: text,
        link: link || "",
        timestamp: Date.now()
    });
    window.showToast("💥 Instant RGB Center Popup Deployed Live!", "success");
};

window.deletePopup = async function() {
    await remove(ref(db, 'live_popup'));
    window.showToast("🗑️ Live Popup Nuked From Server!", "success");
};



/* Developer Website Link Save & Load */
window.saveDevWebsite = async function() {
    const url   = document.getElementById("devWebsiteInput")?.value.trim() || '';
    const label = document.getElementById("devBtnLabelInput")?.value.trim() || '🌐 Developer Website';

    if (!url) return window.showToast("⚠️ Please enter a valid URL!", "error");

    try {
        await set(ref(db, 'settings/dev_website'), { url, label, updatedAt: Date.now() });

        // Sidebar button আপডেট করুন
        const devBtn = document.getElementById("devPortfolioBtn");
        if (devBtn) {
            devBtn.href  = url;
            devBtn.innerText = label;
        }
        window.showToast("✅ Developer Link Saved!", "success");
    } catch(e) {
        window.showToast("Firebase Error: " + e.message, "error");
    }
};

/* ---------- admin: upload (protected delivery) ---------- */
window.adminThumbChosen = function(input) {
    const f = input.files && input.files[0]; const l = $('adminThumbLabel');
    if (l) l.textContent = f ? f.name : 'Thumbnail (optional) — tap to choose';
};
async function uploadThumbIfAny() {
    const ti = $('adminThumbInput'); const f = ti && ti.files && ti.files[0];
    if (!f) return '';
    const fd = new FormData(); fd.append('file', f); fd.append('upload_preset', 'sabbir-host');
    try {
        const r = await fetch('https://api.cloudinary.com/v1_1/sabbir-img-upload/image/upload', { method: 'POST', body: fd });
        const d = await r.json(); return d.secure_url || '';
    } catch (_) { window.showToast('Thumbnail upload failed — continuing without it.', 'error'); return ''; }
}
window.adminFileChosen = function(input) {
    const f = input.files && input.files[0];
    const lab = $('adminFileLabel'); if (lab && f) lab.innerText = f.name;
    const t = $('adminDetectedType');
    if (t) t.textContent = f ? 'Content type: ' + (f.type.startsWith('image') ? 'Photo' : 'Video') + ' (detected)' : 'Content type: select a file (Photo / Video is detected automatically)';
};
window.handleAdminUpload = async function() {
    const fileInput = $("adminFileInput"); const file = fileInput.files[0];
    const text = ($('adminTextInput') ? $('adminTextInput').value.trim() : '').slice(0, 140);
    const link = $('adminLinkInput') ? $('adminLinkInput').value.trim() : '';
    const visibility = $("adminVisibilitySelect") && $("adminVisibilitySelect").value === 'private' ? 'private' : 'public';
    const category = $("adminCategorySelect").value;
    if (!file && link) return window.addLinkItem({ link, text, visibility, category });
    if (!file) return window.showToast("Please select a file first (or paste a video link)! ❌", "error");
    const clearExtras = () => { if ($('adminTextInput')) $('adminTextInput').value = ''; if ($('adminLinkInput')) $('adminLinkInput').value = ''; };
    if (!(await window.apiReady())) {
        const priv = visibility === 'private';
        window.showToast(priv ? "🔒 Private upload (client mode): hidden from the gallery, link-only." : "⏳ Uploading…", "success");
        window.__pendingThumb = priv ? '' : await uploadThumbIfAny(); window.__pendingPrivate = priv; window.__pendingText = text;
        await window.handleAdminUploadLegacy(); window.__pendingThumb = ''; window.__pendingPrivate = false; window.__pendingText = ''; clearExtras();
        const ti = $('adminThumbInput'); if (ti) { ti.value = ''; window.adminThumbChosen(ti); }
        return;
    }
    const type = file.type.startsWith("image") ? "image" : "video";
    try {
        const sig = await window.apiCall('signUpload', {}, { admin: true });
        const fd = new FormData();
        fd.append("file", file); fd.append("api_key", sig.apiKey); fd.append("timestamp", sig.timestamp);
        fd.append("signature", sig.signature); fd.append("type", sig.type); fd.append("folder", sig.folder);
        const up = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/${type}/upload`);
            xhr.upload.onprogress = (e) => { const b = $("adminUploadProgress"); if (b && e.total) b.style.width = (e.loaded / e.total * 100) + "%"; };
            xhr.onload = () => { try { const d = JSON.parse(xhr.responseText); d.public_id ? resolve(d) : reject(new Error((d.error && d.error.message) || "Upload failed")); } catch (_) { reject(new Error("Upload failed")); } };
            xhr.onerror = () => reject(new Error("Network error during upload."));
            xhr.send(fd);
        });
        const thumb = visibility === 'public' ? await uploadThumbIfAny() : '';   // private items never get a public thumbnail
        await window.apiCall('registerUpload', { publicId: up.public_id, resourceType: up.resource_type, format: up.format, name: file.name, category, visibility, thumb, text }, { admin: true });
        clearExtras();
        const ti = $('adminThumbInput'); if (ti) { ti.value = ''; window.adminThumbChosen(ti); }
        window.showToast(visibility === 'private' ? "🔒 Uploaded as PRIVATE." : "⚡ Uploaded (protected) & synced!", "success");
        $("adminUploadProgress").style.width = "0%"; fileInput.value = "";
        $('adminFileLabel').innerText = "Click to Select Admin Files"; window.adminFileChosen(fileInput);
        window.loadAdminFiles(); window.loadPrivateFiles();
    } catch (e) {
        $("adminUploadProgress").style.width = "0%";
        window.showToast("Upload failed: " + e.message, "error");
    }
};

/* ---------- admin: view / copy ---------- */
window.addLinkItem = async function({ link, text, visibility, category }) {
    if (!/^https?:\/\//i.test(link)) return window.showToast("Link must start with http:// or https:// ❌", "error");
    const lt = $('adminLinkType') && $('adminLinkType').value === 'image' ? 'image' : 'video';
    try {
        const thumb = visibility === 'public' ? await uploadThumbIfAny() : '';
        const id = String(Date.now());
        const name = (text || (lt === 'video' ? 'Video' : 'Photo')).slice(0, 60);
        const rec = { id, name, type: lt, category, status: visibility, link, thumb, text, delivery: 'link', timestamp: Date.now() };
        await set(ref(db, (visibility === 'private' ? 'private_files/' : 'admin_files/') + id), rec);
        window.showToast(visibility === 'private' ? "🔒 Link added as PRIVATE." : "🔗 Link item added to gallery!", "success");
        $('adminLinkInput').value = ''; if ($('adminTextInput')) $('adminTextInput').value = '';
        const ti = $('adminThumbInput'); if (ti) { ti.value = ''; window.adminThumbChosen(ti); }
        window.loadAdminFiles(); window.loadPrivateFiles();
    } catch (e) { window.showToast("Failed: " + e.message, "error"); }
};

window.adminViewItem = async function(id, url, link) {
    if (link) return window.open(link, '_blank', 'noopener');
    if (url) return window.adminViewImg(url);
    try {
        const r = await window.apiCall('adminMedia', { id }, { admin: true });
        if (r.type === 'video') window.open(r.url, '_blank'); else window.adminViewImg(r.url);
    } catch (e) { window.showToast(e.message, "error"); }
};

/* ---------- admin: Access & Privacy (public + private together, moves are server-side) ---------- */
window.loadPrivacyFiles = async function() {
    const tbody = $("adminPrivacyList"); if (!tbody) return;
    tbody.innerHTML = "";
    let rows = [];
    try {
        const pub = await get(ref(db, 'admin_files')); pub.forEach(c => { rows.push(c.val()); });
        const prv = await get(ref(db, 'private_files')); prv.forEach(c => { const v = c.val(); v.status = 'private'; rows.push(v); });
    } catch (e) { tbody.innerHTML = `<tr><td colspan="5" style="padding:20px; color:#ff6b81;">${gEsc(e.message)}</td></tr>`; return; }
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; opacity:0.5;">No active files found.</td></tr>`; return; }
    rows.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).forEach(file => {
        const isPrivate = file.status === "private";
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
        tr.innerHTML = `
            <td style="padding:12px; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${gEsc(file.name)}</td>
            <td style="padding:12px;">${gEsc(file.category)}</td>
            <td style="padding:12px; color:${isPrivate ? '#ff0055' : '#00ffcc'}; font-weight:bold; text-transform:uppercase;">${isPrivate ? 'private' : 'public'}</td>
            <td style="padding:12px;"><button class="cyber-btn" style="padding:5px 10px; margin:0; font-size:12px; background:#00f0ff; color:#000;" onclick="window.adminViewItem('${gId(file.id)}', '${gEsc(file.url || '')}', '${gEsc(String(file.link || '').replace(/'/g, ''))}')">👁️ View</button></td>
            <td style="padding:12px;"><button class="cyber-btn" style="padding:5px 10px; margin:0; font-size:12px; background:${isPrivate ? 'linear-gradient(45deg, #00f0ff, #0072ff)' : 'linear-gradient(45deg, #ff0055, #9b0033)'}; color:#fff;" onclick="window.togglePrivacy('${gId(file.id)}', '${isPrivate ? 'private' : 'public'}')">${isPrivate ? '🔓 Set Public' : '🔒 Set Private'}</button></td>`;
        tbody.appendChild(tr);
    });
};
async function clientMove(id, target) {
    const src = target === 'private' ? ['admin_files'] : ['private_files', 'admin_files'];
    let rec = null;
    for (const node of src) { const sn = await get(ref(db, node + '/' + id)); if (sn.exists()) { rec = sn.val(); break; } }
    if (!rec) throw new Error('Item not found.');
    rec.status = target; if (target === 'private') rec.thumb = '';
    await set(ref(db, (target === 'private' ? 'private_files/' : 'admin_files/') + id), rec);   // write first, then remove: never lose the item
    await remove(ref(db, (target === 'private' ? 'admin_files/' : 'private_files/') + id));
    if (target === 'private') { try { await remove(ref(db, 'admin_files/' + id)); } catch (_) {} }
}
window.togglePrivacy = async function(fileId, currentStatus) {
    const newStatus = currentStatus === "public" ? "private" : "public";
    try {
        if (await window.apiReady()) await window.apiCall('setVisibility', { id: fileId, visibility: newStatus }, { admin: true });
        else await clientMove(fileId, newStatus);
        window.showToast(`Access updated to ${newStatus.toUpperCase()} 🔒`, "success");
    } catch (e) { window.showToast(e.message, "error"); }
    window.loadPrivacyFiles(); window.loadPrivateFiles(); window.loadAdminFiles();
};

/* ---------- admin: Private vault + share links ---------- */
let _shareItem = null;
window.loadPrivateFiles = async function() {
    const tbody = $("adminPrivateList"); if (!tbody) return;
    const note = $("privBackendNote");
    if (note) note.textContent = '';
    tbody.innerHTML = "";
    let rows = [];
    try { const prv = await get(ref(db, 'private_files')); prv.forEach(c => { rows.push(c.val()); }); }
    catch (e) { tbody.innerHTML = `<tr><td colspan="4" style="padding:20px; color:#ff6b81;">${gEsc(e.message)}</td></tr>`; return; }
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; opacity:0.5;">No private items.</td></tr>`; return; }
    rows.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).forEach(f => {
        const id = gId(f.id), tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
        tr.innerHTML = `
            <td style="padding:12px; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><span class="priv-badge">PRIVATE</span> ${gEsc(f.name)}</td>
            <td style="padding:12px;">${gEsc(f.category)}</td>
            <td style="padding:12px;"><span class="badge">${gEsc(String(f.type || '').toUpperCase())}</span></td>
            <td style="padding:8px; white-space:nowrap;">
                <button class="adm-mini" style="background:#00f0ff;" onclick="window.adminViewItem('${id}', '${gEsc(String(f.url || '').replace(/'/g, ''))}', '${gEsc(String(f.link || '').replace(/'/g, ''))}')">👁️ View</button>
                <button class="adm-mini" style="background:#ffd166;" onclick="window.editPrivateItem('${id}')">✏️ Edit</button>
                <button class="adm-mini" style="background:#a78bfa;" onclick="window.openSharePanel('${id}', '${gEsc(f.name).replace(/'/g, '')}')">🔗 Links</button>
                <button class="adm-mini" style="background:#34d399;" onclick="window.togglePrivacy('${id}', 'private')">🌍 Make Public</button>
                <button class="adm-mini" style="background:#ff4d6d; color:#fff;" onclick="window.deletePrivateItem('${id}')">🗑️ Delete</button>
            </td>`;
        tbody.appendChild(tr);
    });
};
window.editPrivateItem = async function(id) {
    const name = prompt("New name (leave empty to keep):"); const category = prompt("New category (leave empty to keep):");
    if (!name && !category) return;
    try {
        if (await window.apiReady()) await window.apiCall('updateItem', { id, name: name || undefined, category: category || undefined }, { admin: true });
        else { const patch = {}; if (name) patch.name = name; if (category) patch.category = category; await update(ref(db, 'private_files/' + id), patch); }
        window.showToast("Updated ✅", "success"); window.loadPrivateFiles(); }
    catch (e) { window.showToast(e.message, "error"); }
};
window.deletePrivateItem = async function(id) {
    if (!confirm("Delete this private item and all of its share links?")) return;
    try {
        if (await window.apiReady()) await window.apiCall('deleteItem', { id }, { admin: true });
        else {
            await remove(ref(db, 'private_files/' + id));
            try { const sh = await get(ref(db, 'private_shares')); const jobs = []; sh.forEach(c => { if (c.val().itemId === id) jobs.push(remove(ref(db, 'private_shares/' + c.key))); }); await Promise.all(jobs); } catch (_) {}
        }
        window.showToast("Deleted 🗑️", "success"); window.loadPrivateFiles(); if ($('privSharePanel')) $('privSharePanel').style.display = 'none'; }
    catch (e) { window.showToast(e.message, "error"); }
};
window.openSharePanel = function(id, name) {
    _shareItem = id; $('privShareName').textContent = name; $('privSharePanel').style.display = 'block'; window.refreshShareList();
};
window.refreshShareList = async function() {
    const box = $('shareListBox'); if (!box || !_shareItem) return;
    try {
        let r;
        if (await window.apiReady()) r = await window.apiCall('listShares', { id: _shareItem }, { admin: true });
        else {
            const sn = await get(ref(db, 'private_shares')); const list = [];
            sn.forEach(c => { const v = c.val(); if (v.itemId === _shareItem) list.push({ hash: c.key, token: c.key, ...v }); });
            r = { shares: list.sort((a, b) => b.createdAt - a.createdAt) };
        }
        const fmt = (t) => t ? new Date(t).toLocaleString() : 'never';
        box.querySelectorAll('.share-row').forEach(n => n.remove());
        r.shares.forEach(s => {
            const expired = s.expiresAt && s.expiresAt < Date.now();
            const full = s.maxUses && (s.uses || 0) >= s.maxUses;
            const status = s.revoked ? 'REVOKED' : expired ? 'EXPIRED' : full ? 'USED UP' : 'ACTIVE';
            const d = document.createElement('div'); d.className = 'share-row';
            d.style.cssText = 'display:flex; justify-content:space-between; gap:8px; align-items:center; padding:8px 0; border-top:1px solid rgba(255,255,255,0.06);';
            d.innerHTML = `<span>${status} · created ${fmt(s.createdAt)} · expires ${fmt(s.expiresAt)} · uses ${s.uses || 0}/${s.maxUses || '∞'}</span>` +
                (status === 'ACTIVE' ? `<span>${s.token ? `<button class="adm-mini" style="background:#34d399;" onclick="window.copyShareToken('${gId(s.token)}')">Copy</button>` : ''}<button class="adm-mini" style="background:#ff4d6d; color:#fff;" onclick="window.revokeShare('${gId(s.hash)}')">Revoke</button></span>` : '');
            box.appendChild(d);
        });
        if (!r.shares.length && !box.querySelector('.share-row')) { const e = document.createElement('div'); e.className = 'share-row'; e.style.opacity = '.6'; e.textContent = 'No links yet.'; box.appendChild(e); }
    } catch (e) { box.innerHTML = `<span style="color:#ff6b81;">${gEsc(e.message)}</span>`; }
};
window.createShareLink = async function() {
    if (!_shareItem) return;
    try {
        let r;
        if (await window.apiReady()) r = await window.apiCall('createShare', { id: _shareItem, expiresInHours: $('shareExpiryInput').value, maxUses: $('shareMaxInput').value }, { admin: true });
        else {
            const sn = await get(ref(db, 'private_files/' + _shareItem));
            if (!sn.exists()) throw new Error('Private item not found.');
            const it = sn.val(); const hrs = Math.max(0, parseInt($('shareExpiryInput').value, 10) || 0);
            const bytes = new Uint8Array(24); crypto.getRandomValues(bytes);
            const tk = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
            await set(ref(db, 'private_shares/' + tk), { itemId: String(it.id), name: it.name, type: it.type, url: it.url || '', link: it.link || '', createdAt: Date.now(), expiresAt: hrs ? Date.now() + hrs * 3600e3 : 0, maxUses: 0, uses: 0, revoked: false });
            r = { token: tk };
            
        }
        const link = await buildLink('s_' + r.token);
        window.copyLink(link);
        const box = $('shareListBox');
        const old = box.querySelector('.new-link'); if (old) old.remove();
        const d = document.createElement('div'); d.className = 'new-link';
        d.innerHTML = `<div style="color:#00ffcc; margin-bottom:4px;">New link (copied — shown only once):</div><input class="adm-field" readonly value="${gEsc(link)}" onclick="this.select()">`;
        box.prepend(d); window.refreshShareList();
    } catch (e) { window.showToast(e.message, "error"); }
};
window.revokeShare = async function(hash) {
    if (!confirm("Revoke this link? It stops working immediately.")) return;
    try {
        if (await window.apiReady()) await window.apiCall('revokeShare', { hash }, { admin: true });
        else await update(ref(db, 'private_shares/' + hash), { revoked: true });
        window.showToast("Link revoked ✅", "success"); window.refreshShareList(); }
    catch (e) { window.showToast(e.message, "error"); }
};



/* =======================================================
   📺 ADMIN — Ads Manager (3 slots × 3 networks) + Telegram setup
======================================================= */
window.adsProviderChanged = function (slot) {
    const p = $(`ads_${slot}_provider`).value;
    ['adsgram', 'monetag', 'adsterra'].forEach(n => { const r = $(`ads_${slot}_row_${n}`); if (r) r.style.display = (p === n) ? '' : 'none'; });
};
window.loadAdsSettings = async function () {
    try {
        const c = await window.loadAdsConfig(true);
        ADS_SLOTS.forEach(s => {
            const d = c[s];
            $(`ads_${s}_provider`).value = d.provider;
            $(`ads_${s}_adsgram`).value = d.adsgram;
            $(`ads_${s}_monetag`).value = d.monetag;
            $(`ads_${s}_fmt`).value = d.monetagFmt;
            $(`ads_${s}_adsterra`).value = d.adsterra;
            window.adsProviderChanged(s);
        });
        $('ads_monetag_sdk').value = c.monetagSdk;
        const t = await window.getTgCfg(true);
        $('tgBotUser').value = t.bot; $('tgAppName').value = t.app;
        window.refreshTgPreview();
        try { const sn = await get(ref(db, 'admin_private/bot_token')); $('tgBotToken').value = sn.exists() ? sn.val() : ''; } catch (_) { $('tgBotToken').placeholder = 'Token (could not be read — check Firebase rules)'; }
    } catch (e) { window.showToast('Load error: ' + e.message, 'error'); }
};
window.saveAdsSettings = async function () {
    const cfg = { monetagSdk: $('ads_monetag_sdk').value.trim() || 'https://libtl.com/sdk.js', updatedAt: Date.now() };
    for (const s of ADS_SLOTS) {
        const d = normSlot({
            provider: $(`ads_${s}_provider`).value, adsgram: $(`ads_${s}_adsgram`).value, monetag: $(`ads_${s}_monetag`).value,
            monetagFmt: $(`ads_${s}_fmt`).value, adsterra: $(`ads_${s}_adsterra`).value
        });
        if (d.provider === 'adsgram' && !d.adsgram) return window.showToast(`Slot "${s}": Adsgram Block ID required ❌`, 'error');
        if (d.provider === 'monetag' && !d.monetag) return window.showToast(`Slot "${s}": Monetag Zone ID required ❌`, 'error');
        if (d.provider === 'adsterra' && d.adsterra && !/^https:\/\//.test(d.adsterra)) return window.showToast(`Slot "${s}": Adsterra link must start with https:// ❌`, 'error');
        cfg[s] = d;
    }
    if (!/^https:\/\//.test(cfg.monetagSdk)) return window.showToast('Monetag SDK URL must start with https:// ❌', 'error');
    try {
        await set(ref(db, 'ads_config'), cfg); _adsP = null;
        window.showToast('✅ Ads settings saved — live on all devices', 'success');
    } catch (e) { window.showToast('Firebase Error: ' + e.message, 'error'); }
};
window.testAdSlot = async function (slot) {
    if (AD.tap) return AD.tap();
    if (AD.running) return;
    const btn = $(`ads_${slot}_test`);
    const ui = { setBtn(h, dis) { if (btn) { btn.textContent = h; btn.disabled = !!dis && !AD.tap; } }, setMsg(t, err) { if (t) window.showToast(t, err ? 'error' : 'info'); } };
    try {
        await window.loadAdsConfig(true);
        ui.setBtn('⏳ Loading ad…', true);
        const r = await window.runAd(slot, ui);
        window.showToast(r === 'off' ? 'This slot is OFF (no ad).' : '✅ Test OK (' + r + ')', 'success');
    } catch (e) { window.showToast(e.message || 'Test failed', 'error'); }
    if (btn) { btn.textContent = '▶ Test'; btn.disabled = false; }
};
window.refreshTgPreview = function () {
    const bot = $('tgBotUser').value.trim().replace(/^@/, ''), app = $('tgAppName').value.trim();
    $('tgLinkPreview').textContent = bot ? ('Share link example: https://t.me/' + bot + (app ? '/' + app : '') + '?startapp=c_123456') : 'Enter your bot username to enable Telegram share links.';
};
window.saveTelegramSettings = async function () {
    const token = $('tgBotToken').value.trim();
    let bot = $('tgBotUser').value.trim().replace(/^@/, '');
    const app = $('tgAppName').value.trim().replace(/[^A-Za-z0-9_]/g, '');
    if (token) {
        if (!/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(token)) return window.showToast('Bot token format looks wrong ❌', 'error');
        try {
            const r = await fetch('https://api.telegram.org/bot' + token + '/getMe'); const d = await r.json();
            if (d && d.ok && d.result && d.result.username) { bot = d.result.username; $('tgBotUser').value = bot; }
            else return window.showToast('Telegram rejected this token ❌', 'error');
        } catch (_) { window.showToast('Could not reach Telegram to verify the token — saving anyway.', 'error'); }
    }
    if (!bot) return window.showToast('Bot username is required (or paste a valid bot token) ❌', 'error');
    try {
        await set(ref(db, 'settings/telegram'), { bot, app, updatedAt: Date.now() });
        if (token) await set(ref(db, 'admin_private/bot_token'), token);
        await window.getTgCfg(true); window.refreshTgPreview();
        window.showToast('✅ Telegram settings saved — share links now open the Mini App', 'success');
    } catch (e) { window.showToast('Firebase Error: ' + e.message, 'error'); }
};


window.saveSecurity = function () {
    const f12 = !!$('secF12').checked, rightClick = !!$('secRC').checked;
    if (window.__paintSec) window.__paintSec(f12, rightClick);
    set(ref(db, 'settings/security'), { f12, rightClick, updatedAt: Date.now() })
        .then(() => window.showToast('🛡️ Security updated on all devices', 'success'))
        .catch(e => window.showToast('Firebase Error: ' + e.message, 'error'));
};


/* =======================================================
   🔓 ADMIN — Unlock settings (steps only; ad networks live in Ads Manager)
======================================================= */
window.loadUnlockSettings = async function () {
    const c = await window.loadUnlockConfig(true);
    $('cfgPhotoSteps').value = c.photoSteps; $('cfgVideoSteps').value = c.videoSteps;
    $('cfgAccessHours').value = c.accessHours; $('cfgMinStep').value = c.minStepSeconds;
};
window.saveUnlockSettings = async function () {
    const n = (id, lo, hi, d) => { const v = parseInt($(id).value, 10); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
    const cfg = { photoSteps: n('cfgPhotoSteps', 1, 20, 3), videoSteps: n('cfgVideoSteps', 1, 30, 6), accessHours: n('cfgAccessHours', 1, 720, 24),
                  minStepSeconds: n('cfgMinStep', 1, 120, 5), updatedAt: Date.now() };
    try { await set(ref(db, 'unlock_config'), cfg); _cfgP = null; window.showToast("✅ Unlock settings saved", "success"); }
    catch (e) { window.showToast("Firebase Error: " + e.message, "error"); }
};


/* ---------- admin extras (main app theke alada hoyar por ei file e dorkar) ---------- */
window.closeImg = function() { const p = $("popup"); if (p) p.style.display = "none"; };
window.adminLogout = async function() { try { await signOut(auth); } catch (_) {} location.reload(); };

// Security switches (F12 / right-click) — current state load
(function () {
    const paint = (f12, rc) => {
        const a = $('secF12'), b = $('secRC'), ta = $('secF12Text'), tb = $('secRCText');
        if (a) a.checked = f12; if (b) b.checked = rc;
        if (ta) { ta.textContent = f12 ? 'STATUS: ON (blocked)' : 'STATUS: OFF (allowed)'; ta.style.color = f12 ? '#00ffcc' : '#ff0055'; }
        if (tb) { tb.textContent = rc ? 'STATUS: ON (blocked)' : 'STATUS: OFF (allowed)'; tb.style.color = rc ? '#00ffcc' : '#ff0055'; }
    };
    window.__paintSec = paint;
    onValue(ref(db, 'settings/security'), (snap) => { const v = snap.val() || {}; paint(v.f12 !== false, v.rightClick !== false); });
})();

// Developer website link — current value prefill
(async function () {
    try {
        const snap = await get(ref(db, 'settings/dev_website'));
        if (snap.exists()) { const d = snap.val(); if ($('devWebsiteInput')) $('devWebsiteInput').value = d.url || ''; if ($('devBtnLabelInput')) $('devBtnLabelInput').value = d.label || ''; }
    } catch (_) {}
})();
