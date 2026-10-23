import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getAuth, signInWithEmailAndPassword,  signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

// ⚡ গ্লোবাল স্টেট ট্র্যাকিং ভেরিয়েবলসমূহ
let canClickFreely = true;
let isSiteUnlocked = false;
let toastTimeout;

// ৩ সেকেন্ড পর ফ্রি ভিউ টাইম শেষ করার টাইমার
setTimeout(() => {
    if (!isSiteUnlocked) {
        canClickFreely = false;
        console.log("Free view time over. Next click will trigger unlock modal.");
    }
}, 3000);

/* =======================================================
   🌟 স্টাইলিশ অ্যানিমেটেড টোস্ট নোটিফিকেশন ইঞ্জিন
======================================================= */
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

/* =======================================================
   গ্যালারি লাইক ইনিশিয়ালাইজেশন ও লজিক (800-30k+ Natural Mix Up)
======================================================= */

/* =======================================================
   ✈️ TELEGRAM MINI APP CORE
======================================================= */
const TG = (window.Telegram && window.Telegram.WebApp) || null;
const IN_TG = !!(TG && TG.initData);
window.TG = TG;
(function initTelegram() {
    if (!TG) return;
    try { TG.ready(); } catch (_) {}
    try { TG.expand(); } catch (_) {}
    try { TG.setHeaderColor('#0f2027'); } catch (_) {}
    try { TG.setBackgroundColor('#0f2027'); } catch (_) {}
    try { TG.disableVerticalSwipes(); } catch (_) {}
})();

const gEsc = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gId  = (t) => String(t ?? '').replace(/[^A-Za-z0-9_-]/g, '');
const $ = (id) => document.getElementById(id);

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

/* Open external pages the Telegram way (never navigates the mini app away) */
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

/* Deep links: https://t.me/<bot>[/<app>]?startapp=c_<id>  |  s_<privateToken> */
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
window.getTgCfg();

function getStartParam() {
    let p = '';
    try { p = (TG && TG.initDataUnsafe && TG.initDataUnsafe.start_param) || ''; } catch (_) {}
    const q = new URLSearchParams(location.search);
    if (!p) p = q.get('tgWebAppStartParam') || '';
    if (!p) { try { p = new URLSearchParams(location.hash.replace(/^#/, '')).get('tgWebAppStartParam') || ''; } catch (_) {} }
    if (!p) { if (q.get('share')) p = 's_' + q.get('share'); else if (q.get('content')) p = 'c_' + q.get('content'); }
    return p;
}
let PENDING_OPEN = null;

/* Telegram header Back button closes any open panel */
(function backButton() {
    if (!TG || !TG.BackButton) return;
    try { TG.BackButton.onClick(() => { window.closeAllActiveModalsAndPanels(); }); } catch (_) { return; }
    const open = () => {
        const on = (id) => { const e = $(id); return !!e && e.style.display === 'flex'; };
        return on('popup') || on('contentViewer') || on('downloadModal') || on('promoModal') || on('luxuryLoginModal') || on('adminPanel') || on('shareSheet') || window.sidebarOpen || window.notifOpen;
    };
    let last = null;
    setInterval(() => {
        const o = !!open(); if (o === last) return; last = o;
        try { o ? TG.BackButton.show() : TG.BackButton.hide(); } catch (_) {}
    }, 300);
})();

/* External links inside Telegram open through Telegram (after the gallery gate allows clicks) */
document.addEventListener('click', function (e) {
    if (!IN_TG) return;
    if (!isSiteUnlocked && !canClickFreely) return;
    const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    const h = a.getAttribute('href') || '';
    if (!/^https?:\/\//i.test(h)) return;
    e.preventDefault(); openExternal(a.href);
}, true);

window.initializeLikes = async function() {
    const cards = document.querySelectorAll('.card');
    let userLikedImages = JSON.parse(localStorage.getItem('user_liked_images')) || [];

    for (let card of cards) {
        const imgId = card.getAttribute('data-id');
        if (!imgId) continue;

        const likeRef = ref(db, `likes/${imgId}`);
        let snapshot = await get(likeRef);
        let totalLikes = 0;

        if (!snapshot.exists()) {
            let seed = 0;
            for (let i = 0; i < imgId.length; i++) {
                seed += imgId.charCodeAt(i) * (i + 1);
            }
            const fakeLikes = 850 + (seed % 31500); 
            await set(likeRef, fakeLikes);
            totalLikes = fakeLikes;
        } else {
            totalLikes = snapshot.val();
        }

        const textSpan = card.querySelector('.like-text');
        const container = card.querySelector('.like-btn-container');
        if (textSpan) textSpan.innerText = totalLikes;

        if (userLikedImages.includes(imgId)) {
            if(container) container.classList.add('liked');
            if(container && container.querySelector('i')) container.querySelector('i').className = "fa-solid fa-heart";
        }
    }
    sortGalleryByLikes(userLikedImages);
};

function sortGalleryByLikes(likedIds) {
    const grid = document.getElementById('galleryGrid');
    if(!grid) return;
    const cards = Array.from(grid.children);
    cards.sort((a, b) => {
        const idA = a.getAttribute('data-id');
        const idB = b.getAttribute('data-id');
        return (likedIds.includes(idB) ? 1 : 0) - (likedIds.includes(idA) ? 1 : 0);
    });
    grid.innerHTML = "";
    cards.forEach(card => grid.appendChild(card));
}

window.toggleLike = async function(imgId, element) {
    let userLikedImages = JSON.parse(localStorage.getItem('user_liked_images')) || [];
    const likeRef = ref(db, `likes/${imgId}`);
    const isLiked = userLikedImages.includes(imgId);
    const textSpan = element.querySelector('.like-text');
    const heartIcon = element.querySelector('i');

    let baseSeed = 0;
    for (let i = 0; i < imgId.length; i++) baseSeed += imgId.charCodeAt(i) * (i + 1);
    const defaultStart = 850 + (baseSeed % 31500);

    if (isLiked) {
        userLikedImages = userLikedImages.filter(id => id !== imgId);
        element.classList.remove('liked');
        if(heartIcon) heartIcon.className = "fa-regular fa-heart";
        await runTransaction(likeRef, (current) => (current || defaultStart) - 1);
    } else {
        userLikedImages.push(imgId);
        element.classList.add('liked');
        if(heartIcon) heartIcon.className = "fa-solid fa-heart";
        await runTransaction(likeRef, (current) => (current || defaultStart) + 1);
    }
    localStorage.setItem('user_liked_images', JSON.stringify(userLikedImages));
    const freshSnap = await get(likeRef);
    if(textSpan) textSpan.innerText = freshSnap.val();
};

/* =======================================================
   STEALTH SECURITY - FIRST WALL (PROMO INPUT)
======================================================= */
window.checkPromoCode = function() {
    const input = document.getElementById("promoInput").value.trim();
    if (!input) return window.showToast("Please enter a valid code! ⚠️", "error");

    if (input === "PREMIUM2026") {
        window.showToast("Premium Access Unlocked! ✅", "success");
        closePromoModal();
        return;
    }

    if (input === "hamim7xa@gmail.com") {
        document.getElementById("promoModal").style.display = "none";
        document.getElementById("luxuryLoginModal").style.display = "flex";
        pushHistoryState('luxury-login');
    } else {
        window.showToast("Invalid Code! ❌", "error");
    }
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
                pushHistoryState('admin-panel');
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


/* =======================================================
   📢 AD SLOT (native banner)
======================================================= */
/* Ad script safe injection */
window.injectAdSlot = function(slotNum, data) {
    const container = document.getElementById(`adSlot${slotNum}Container`);
    if (!container) return;

    container.innerHTML = '';

    if (!data || !data.active) {
        container.style.minHeight = '0';
        return;
    }

    container.style.minHeight = '60px';

    if (data.script) {
        // Full script tag paste করা হলে
        const wrapper = document.createElement('div');
        wrapper.innerHTML = data.script;

        // script ট্যাগগুলো execute করতে হয় manually
        Array.from(wrapper.querySelectorAll('script')).forEach(oldScript => {
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });

        container.appendChild(wrapper);
    } else if (data.zoneId) {
        // শুধু Zone ID দেওয়া হলে — Adsterra/Monetag standard format
        if (data.network === 'adsterra') {
            const s = document.createElement('script');
            s.src = `//www.highperformanceformat.com/${data.zoneId}/invoke.js`;
            s.async = true;
            s.setAttribute('data-cfasync', 'false');
            container.appendChild(s);
        } else if (data.network === 'monetag') {
            const s = document.createElement('script');
            s.src = `https://cdn.monetag.com/zone/${data.zoneId}.js`;
            s.async = true;
            container.appendChild(s);
        }
    }
};

/* Only the native banner (slot 2, under the timer) is still loaded from Firebase */
window.loadAllAdSlots = async function() {
    try {
        const snap = await get(ref(db, 'ad_slots/slot_2'));
        if (snap.exists()) window.injectAdSlot(2, snap.val());
    } catch(e) { console.warn("Ad slot load error:", e.message); }
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

// পেজ লোডে Firebase থেকে Developer Link লোড করুন
(async function loadDevWebsite() {
    try {
        const snap = await get(ref(db, 'settings/dev_website'));
        if (snap.exists()) {
            const data = snap.val();
            const devBtn = document.getElementById("devPortfolioBtn");
            if (devBtn) {
                devBtn.href      = data.url   || '#';
                devBtn.innerText = data.label || '🌐 Developer Website';
            }
            // Admin panel input prefill
            const urlInput   = document.getElementById("devWebsiteInput");
            const labelInput = document.getElementById("devBtnLabelInput");
            if (urlInput)   urlInput.value   = data.url   || '';
            if (labelInput) labelInput.value = data.label || '';
        }
    } catch(e) { console.warn("Dev website load:", e.message); }
})();

/* =======================================================
   ৫. ইউজার-সাইড রিয়েলটাইম লিসেনার ও ইনিশিয়ালাইজেশন
======================================================= */
document.addEventListener("DOMContentLoaded", () => {
    
    // 📢 পেজ লোডে Firebase থেকে সব Ad Slot inject করা
    window.loadAllAdSlots();

    // 🌍 গ্লোবাল ক্লিক ইন্টারসেপ্টর লজিক (৩ সেকেন্ড কন্ডিশনাল লক)
    document.addEventListener("click", (event) => {
        if (isSiteUnlocked) return;

        const startPopup = document.getElementById("startPopup");
        if (startPopup && startPopup.contains(event.target)) return;
        if (event.target.closest && event.target.closest("#shareSheet")) return;

        if (!canClickFreely) {
            if (startPopup && startPopup.style.display !== "flex") {
                event.preventDefault();
                event.stopPropagation();
                startPopup.style.display = "flex";
            }
        }
    }, true);

    // ডাটাবেস থেকে রিয়েল-টাইম ছবি ওয়েবসাইটে লোড করা
    const galleryGrid = document.getElementById("galleryGrid");
    if (galleryGrid) {
        onValue(ref(db, 'admin_files'), (snapshot) => {
            galleryGrid.innerHTML = ""; 
            if (!snapshot.exists()) {
                galleryGrid.innerHTML = `<p style="color:#5c6996; text-align:center; grid-column:1/-1;">No public media available.</p>`;
                return;
            }
            snapshot.forEach((childSnapshot) => {
                const file = childSnapshot.val();
                if (file.status === "private") return; 

                const card = document.createElement("div");
                const cleanCategory = (file.category || 'general').trim();
                card.className = `card item ${cleanCategory}`;
                card.setAttribute("data-id", file.id);

                const safeId = String(file.id).replace(/[^A-Za-z0-9_-]/g, '');
                window.__galleryItems = window.__galleryItems || {}; window.__galleryItems[safeId] = file;
                const isVideo = file.type === "video";
                const isLegacy = !!file.url && file.delivery !== "protected";
                const gEscAttr = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
                const gEscName = String(file.name || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
                const gEscName2 = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
                const thumbUrl = /^https:\/\//.test(file.thumb || '') ? gEscAttr(file.thumb) : '';
                const open = `onclick="window.openContent('${safeId}')"`;
                let mediaTag;
                if (thumbUrl) {
                    mediaTag = `<div class="locked-thumb" ${open}><img src="${thumbUrl}" alt="${gEscName}" loading="lazy">${isVideo ? '<div class="play-badge"><i class="fa-solid fa-play"></i></div>' : ''}</div>`;
                } else if (isLegacy && !isVideo) {
                    mediaTag = `<div class="locked-thumb" ${open}><img src="${gEscAttr(file.url)}" alt="${gEscName}" loading="lazy"></div>`;
                } else if (isLegacy && isVideo) {
                    mediaTag = `<div class="locked-thumb" ${open}><video src="${gEscAttr(file.url)}#t=0.5" preload="metadata" muted playsinline></video><div class="play-badge"><i class="fa-solid fa-play"></i></div></div>`;
                } else {
                    mediaTag = `<div class="locked-thumb" ${open}><i class="fa-solid ${isVideo ? 'fa-circle-play' : 'fa-image'}"></i></div>`;
                }

                card.innerHTML = `
                    <div class="media-container">${mediaTag}</div>
                    <div class="card-info">
                        ${file.text ? `<div class="card-text">${gEscName2(file.text)}</div>` : ''}
                        <div class="card-meta">
                            <span class="cat-chip">${cleanCategory}</span>
                            <div class="like-btn-container" onclick="window.toggleLike('${safeId}', this)" style="cursor:pointer; color:#5c6996; display:flex; gap:6px; align-items:center; font-size:14px;">
                                <i class="fa-regular fa-heart"></i> <span class="like-text">0</span>
                            </div>
                        </div>
                        <div class="card-actions">
                            <button class="unlock-btn" onclick="window.openContent('${safeId}')" title="Unlock">
                                <i class="fa-solid fa-lock"></i><span class="unlock-label">Unlock</span>
                            </button>
                            <button class="card-icon-btn share-btn" onclick="window.shareContent('${safeId}')" title="Share">
                                <i class="fa-solid fa-share-nodes"></i>
                            </button>
                            <button class="card-icon-btn dl-btn" onclick="window.openDownloadModal(event)" title="Download">
                                <i class="fa-solid fa-download"></i>
                            </button>
                        </div>
                    </div>
                `;
                galleryGrid.appendChild(card);
            });
            window.initializeLikes();
            
            const activeFilterBtn = document.querySelector('.filter-btn.active');
            if (activeFilterBtn) {
                const currentCat = activeFilterBtn.innerText.trim();
                window.filterGallery(currentCat);
            }
        });
    } else {
        window.initializeLikes();
    }
    
    // Live Scrolling Notification লিসেনার
    onValue(ref(db, 'admin_notif'), (snapshot) => {
        const noticeElement = document.getElementById("topNoticeText");
        if (noticeElement && snapshot.exists()) {
            const data = snapshot.val();
            noticeElement.innerText = (typeof data === 'object') ? data.message : data;
        }
    });

    // লাইভ আরজিবি পপআপ রিয়েলটাইম লিসেনার
    onValue(ref(db, 'live_popup'), (snapshot) => {
        const popupModal = document.getElementById("liveCyberPopup");
        if (!popupModal) return;

        if (snapshot.exists()) {
            if (!isSiteUnlocked) {
                popupModal.style.display = "none";
                return;
            }

            const data = snapshot.val();
            document.getElementById("livePopupMessage").innerText = data.message;
            
            const linkBtn = document.getElementById("livePopupLink");
            if (data.link) {
                linkBtn.href = data.link;
                linkBtn.style.display = "block";
            } else {
                linkBtn.style.display = "none";
            }
            popupModal.style.display = "flex";
        } else {
            popupModal.style.display = "none";
        }
    });
});

onValue(ref(db, 'admin_notif'), (snapshot) => {
    const list = document.getElementById("notifList");
    if (!list) return;

    const data = snapshot.val();

    if (!data) {
        list.innerHTML = "<p>No notifications</p>";
        return;
    }

    // single message support
    const message = typeof data === "string" ? data : data.message;

    list.innerHTML = `
        <div class="notif-item">
            ${message}
        </div>
    `;
});


/* =======================================================
   📺 AD ENGINE — Adsgram / Monetag / Adsterra (switchable per slot from Admin)
   Slots: login (gallery unlock) · content (photo/video unlock) · bonus (optional)
======================================================= */
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

/* ---------- UI adapters for each place an ad is shown ---------- */
const gateUI = {
    setBtn(html, disabled) { const b = document.querySelector('#startPopup .btn'); if (!b) return; b.innerHTML = html; b.style.pointerEvents = disabled ? 'none' : ''; b.style.opacity = disabled ? '.7' : ''; if (AD.tap) b.style.pointerEvents = ''; },
    setMsg(t, err) { const m = $('gateMsg'); if (m) { m.textContent = t || ''; m.style.color = err ? '#ff6b81' : '#9fb0d0'; } }
};

/* ---------- LOGIN UNLOCK (gallery gate) ---------- */
window.unlockSite = async function () {
    if (AD.tap) return AD.tap();
    if (AD.running) return;
    gateUI.setMsg('');
    gateUI.setBtn('⏳ Loading ad…', true);
    try { await window.runAd('login', gateUI); }
    catch (e) {
        gateUI.setBtn('Unlock Now 🚀', false);
        gateUI.setMsg(e.message || 'Something went wrong. Please try again.', true);
        return;
    }
    gateUI.setBtn('Unlock Now 🚀', false); gateUI.setMsg('');
    isSiteUnlocked = true; canClickFreely = true;
    $("startPopup").style.display = "none";
    $("topUI").style.display = "block";
    window.showToast("✅ Gallery Unlocked!", "success");
    window.pushHistoryState('unlocked');
    get(ref(db, 'live_popup')).then((snapshot) => {
        const popupModal = $("liveCyberPopup");
        if (snapshot.exists() && popupModal) {
            const data = snapshot.val();
            $("livePopupMessage").innerText = data.message;
            const linkBtn = $("livePopupLink");
            if (data.link) { linkBtn.href = data.link; linkBtn.style.display = "block"; } else { linkBtn.style.display = "none"; }
            popupModal.style.display = "flex";
        }
    }).catch(() => {});
    if (PENDING_OPEN) { const o = PENDING_OPEN; PENDING_OPEN = null; openViewer(o); }
};

/* ---------- OPTIONAL BONUS AD (each watched ad = 1 free unlock step, max 3 stored) ---------- */
const getCredits = () => { try { return Math.min(3, Math.max(0, parseInt(localStorage.getItem('bonus_credits'), 10) || 0)); } catch (_) { return 0; } };
const setCredits = (n) => { try { localStorage.setItem('bonus_credits', String(Math.max(0, Math.min(3, n)))); } catch (_) {} refreshBonusBtn(); };
const useCredits = (n) => setCredits(getCredits() - n);
function refreshBonusBtn() {
    const b = $('bonusBtn'); if (!b || AD.running) return;
    const c = getCredits();
    b.innerHTML = '🎁 Watch an ad for a free unlock step' + (c ? ' <small>(' + c + ' saved)</small>' : '');
    b.disabled = false;
}
(async function initBonusBtn() {
    const b = $('bonusBtn'); if (!b) return;
    try { const a = await window.loadAdsConfig(); if (a.bonus.provider === 'off') { b.style.display = 'none'; return; } } catch (_) {}
    b.style.display = ''; refreshBonusBtn();
})();
const bonusUI = {
    setBtn(html, disabled) { const b = $('bonusBtn'); if (b) { b.innerHTML = html; b.disabled = !!disabled && !AD.tap; } },
    setMsg(t, err) { if (t) window.showToast(t, err ? 'error' : 'info'); }
};
window.claimBonus = async function () {
    if (AD.tap) return AD.tap();
    if (AD.running) return;
    if (getCredits() >= 3) return window.showToast("You already have 3 free steps saved. Use them on a photo or video 🔓", "info");
    bonusUI.setBtn('⏳ Loading ad…', true);
    try {
        await window.runAd('bonus', bonusUI);
        setCredits(getCredits() + 1);
        window.showToast("🎁 Thanks! Your next unlock needs 1 ad less.", "success");
    } catch (e) { window.showToast(e.message || 'Ad failed. Please retry.', 'error'); }
    refreshBonusBtn();
};

/* =======================================================
   ইউজার ইন্টারফেস ও গ্লোবাল উইন্ডো ফাংশনসমূহ
======================================================= */
if(false && document.getElementById("particles-js")) {
    // মোবাইলে কম particle = better performance
    const isMobile = window.innerWidth <= 768;
    particlesJS("particles-js",{
      "particles":{
        "number":{"value": isMobile ? 25 : 60},
        "color":{"value":"#00ffcc"},
        "shape":{"type":"circle"},
        "opacity":{"value":0.5},
        "size":{"value":3},
        "line_linked":{"enable": !isMobile, "distance":150, "color":"#00ffcc", "opacity":0.4, "width":1},
        "move":{"enable":true, "speed": isMobile ? 1 : 2}
      }
    });
}

let currentViewers = Math.floor(Math.random() * (160 - 90 + 1)) + 90;
const viewersSpan = document.getElementById("viewers");
if(viewersSpan) viewersSpan.innerText = currentViewers;

setInterval(() => {
    if(viewersSpan) {
        let change = Math.floor(Math.random() * 5) + 3; 
        let direction = Math.random() > 0.45 ? 1 : -1;
        currentViewers += (change * direction);
        if(currentViewers < 90) currentViewers = 95;
        if(currentViewers > 480) currentViewers = 460;
        viewersSpan.innerText = currentViewers;
    }
}, 4000);

window.sidebarOpen = false;
window.notifOpen = false;
window.backHistory = ['home'];

window.history.replaceState({page: 'home'}, "", location.href);

window.pushHistoryState = function(stateName) {
    window.backHistory.push(stateName);
    window.history.pushState({page: stateName}, "", location.href);
}

window.onpopstate = function(event) {
    if (
        document.getElementById("popup").style.display === "flex" ||
        document.getElementById("contentViewer").style.display === "flex" ||
        document.getElementById("downloadModal").style.display === "flex" ||
        document.getElementById("promoModal").style.display === "flex" ||
        document.getElementById("luxuryLoginModal").style.display === "flex" ||
        document.getElementById("adminPanel").style.display === "flex" ||
        window.sidebarOpen || window.notifOpen
    ) {
        window.closeAllActiveModalsAndPanels();
    }
    
    if (window.backHistory.length > 1) {
        window.backHistory.pop();
        window.history.pushState({page: window.backHistory[window.backHistory.length - 1]}, "");
    } else {
        window.history.pushState({page: 'home'}, "");
    }
};

window.closeAllActiveModalsAndPanels = function() {
    if (window.closeShareSheet) window.closeShareSheet();
    if (window.closeContentViewer) window.closeContentViewer(true);
    document.getElementById("popup").style.display = "none";
    document.getElementById("downloadModal").style.display = "none";
    document.getElementById("promoModal").style.display = "none";
    document.getElementById("luxuryLoginModal").style.display = "none";
    document.getElementById("adminPanel").style.display = "none";
    if(document.getElementById("sidebar")) document.getElementById("sidebar").style.left = "-300px";
    if(document.getElementById("notifPanel")) document.getElementById("notifPanel").style.right = "-300px";
    window.sidebarOpen = false;
    window.notifOpen = false;
}

window.toggleSidebar = function() {
    const sb = document.getElementById("sidebar");
    const np = document.getElementById("notifPanel");
    if (!window.sidebarOpen) {
        if(sb) sb.style.left = "0px"; 
        if(np) np.style.right = "-300px";
        window.sidebarOpen = true; window.notifOpen = false;
        window.pushHistoryState('sidebar');
    } else { window.closeAllActiveModalsAndPanels(); }
}

window.toggleNotif = function() {
    const np = document.getElementById("notifPanel");
    const sb = document.getElementById("sidebar");
    if (!window.notifOpen) {
        if(np) np.style.right = "0px"; 
        if(sb) sb.style.left = "-300px";
        window.notifOpen = true; window.sidebarOpen = false;
        window.pushHistoryState('notif');
    } else { window.closeAllActiveModalsAndPanels(); }
}

document.addEventListener("click", function(e) {
    const sb = document.getElementById("sidebar");
    const np = document.getElementById("notifPanel");
    const iconBtns = document.querySelectorAll('.icon-btn');
    const header = document.querySelector('.header');
    let clickedIcon = false;
    iconBtns.forEach(btn => { if (btn.contains(e.target)) clickedIcon = true; });
    
    if (window.sidebarOpen && sb && !sb.contains(e.target) && header && !header.contains(e.target) && !clickedIcon) {
        sb.style.left = "-300px"; window.sidebarOpen = false;
    }
    if (window.notifOpen && np && !np.contains(e.target) && header && !header.contains(e.target) && !clickedIcon) {
        np.style.right = "-300px"; window.notifOpen = false;
    }
});

const durations = [3600, 86400, 3000, 1800, 7200];
let time = durations[Math.floor(Math.random() * durations.length)];
setInterval(() => {
    let timerEl = document.getElementById("timer");
    if(timerEl) {
        let hrs = Math.floor(time / 3600); let min = Math.floor((time % 3600) / 60); let sec = time % 60;
        timerEl.innerHTML = `⏳ Offer expires in: ${hrs > 0 ? hrs + "h " : ""}${min}m ${sec < 10 ? '0' + sec : sec}s`;
    }
    if(time > 0) time--;
}, 1000);

window.filterGallery = function(category) {
    const items = document.querySelectorAll('.item');
    const btns = document.querySelectorAll('.filter-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    
    if(window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }

    const targetCat = category.trim().toLowerCase();

    items.forEach(item => {
        if (targetCat === 'all') {
            item.style.display = 'block';
        } else {
            let match = false;
            item.classList.forEach(cls => {
                if(cls.trim().toLowerCase() === targetCat) {
                    match = true;
                }
            });
            item.style.display = match ? 'block' : 'none';
        }
    });
}

window.openImg = function(src) { document.getElementById("popup").style.display = "flex"; document.getElementById("popupImg").src = src; window.pushHistoryState('image-popup'); }
window.openDownloadModal = function(e) { if(e) e.preventDefault(); document.getElementById("downloadModal").style.display = "flex"; window.pushHistoryState('download-modal'); }
window.openPromoModal = function() { document.getElementById("promoModal").style.display = "flex"; window.pushHistoryState('promo-modal'); }

window.closeImg = function() { document.getElementById("popup").style.display = "none"; }
window.closeDownload = function() { document.getElementById("downloadModal").style.display = "none"; }
window.closePromoModal = function() { document.getElementById("promoModal").style.display = "none"; }
window.closeLuxuryLogin = function() { document.getElementById("luxuryLoginModal").style.display = "none"; }
window.closeAdminPanel = function() { document.getElementById("adminPanel").style.display = "none"; }

document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { window.closeAllActiveModalsAndPanels(); } });
window.toggleTheme = function() { document.body.classList.toggle('light-mode'); }

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


/* =======================================================
   🔗 SHARING (Telegram deep links — opens the Mini App, not the website)
======================================================= */
let _shareLink = '';
window.shareContent = async function (id) {
    id = gId(id); if (!id) return;
    _shareLink = await buildLink('c_' + id);
    const sh = $('shareSheet'); if (!sh) return window.copyLink(_shareLink);
    $('shareLinkInput').value = _shareLink;
    const enc = encodeURIComponent(_shareLink), txt = encodeURIComponent('Check this out ✨');
    $('shareWa').href = 'https://wa.me/?text=' + txt + '%20' + enc;
    $('shareTg').href = 'https://t.me/share/url?url=' + enc + '&text=' + txt;
    $('shareFb').href = 'https://www.facebook.com/sharer/sharer.php?u=' + enc;
    $('shareNativeBtn').style.display = navigator.share ? '' : 'none';
    sh.style.display = 'flex';
};
window.closeShareSheet = function () { const sh = $('shareSheet'); if (sh) sh.style.display = 'none'; };
window.copyShareLink = function () {
    const link = _shareLink; if (!link) return;
    const fallback = () => window.copyLink(link);
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(link).then(() => window.showToast("Link Copied! ✅", "success"), fallback);
    else fallback();
};
window.shareNative = function () { if (navigator.share && _shareLink) navigator.share({ title: 'Aesthetic Gallery', url: _shareLink }).catch(() => {}); };
window.copyPublicLink = async function (id) { window.copyLink(await buildLink('c_' + gId(id))); };
window.copyShareToken = async function (tk) { window.copyLink(await buildLink('s_' + gId(tk))); };

/* =======================================================
   🔐 CONTENT VIEWER + UNLOCK (login ad already passed → now content ads)
======================================================= */
// Kept so older admin code paths that ask "is a secure backend online?" always take the client path.
window.apiReady = async function () { return false; };
window.apiCall = async function () { throw new Error("Not available."); };

const V = { item: null, via: 'public', token: null, link: '', url: '', preview: '', required: 0, completed: 0, credit: 0,
            state: 'locked', busy: false, msg: '', err: false, seq: 0 };

function renderViewer() {
    if (!$('contentViewer')) return;
    $('cvTitle').textContent = V.item ? V.item.name : 'Loading…';
    const main = $('cvMainBtn'), stepEl = $('cvStep'), bar = $('cvBar'), msg = $('cvMsg');
    const total = V.required || 0;
    bar.style.width = total ? Math.round((V.completed / total) * 100) + '%' : '0%';
    msg.textContent = V.msg || ''; msg.className = 'cv-msg' + (V.err ? ' err' : '');
    const isPublic = V.via === 'public';
    $('cvShareBtn').style.display = isPublic && V.item ? '' : 'none';
    $('cvCopyBtn').style.display = isPublic && V.item ? '' : 'none';
    if (V.state === 'unlocked') {
        stepEl.textContent = 'Unlocked ✅'; bar.style.width = '100%';
        if (V.link) { main.style.display = ''; main.disabled = false; main.textContent = '🔗 Open link'; } else main.style.display = 'none';
        return;
    }
    main.style.display = '';
    if (!V.item) { stepEl.textContent = ''; main.style.display = 'none'; return; }
    const cur = Math.min(V.completed + 1, total);
    const kind = V.item.type === 'video' ? 'Video' : 'Photo';
    stepEl.textContent = V.completed === 0 && V.state !== 'in_progress' ? kind + ' locked — ' + total + ' advertisement step' + (total > 1 ? 's' : '') + ' required' : 'Advertisement ' + cur + ' of ' + total;
    if (V.state === 'in_progress') return;            // the ad adapter controls the button text meanwhile
    main.disabled = V.busy;
    main.textContent = V.completed === 0 ? (V.state === 'error' ? 'Retry' : 'Start unlocking')
                                         : (V.state === 'error' ? 'Retry advertisement ' + cur + ' of ' + total : 'Watch advertisement ' + cur + ' of ' + total);
}
function setState(state, msg, isErr) { V.state = state; V.msg = msg || ''; V.err = !!isErr; renderViewer(); }

const viewerUI = {
    setBtn(html, disabled) { const b = $('cvMainBtn'); if (b) { b.textContent = html; b.disabled = !!disabled; } },
    setMsg(t, err) { V.msg = t || ''; V.err = !!err; const m = $('cvMsg'); if (m) { m.textContent = V.msg; m.className = 'cv-msg' + (err ? ' err' : ''); } }
};

function renderLockedStage(text, preview) {
    const st = $('cvStage'); if (!st) return;
    const pv = preview === undefined ? V.preview : preview;
    st.innerHTML = '';
    if (pv && /^https:\/\//.test(pv)) { const im = document.createElement('img'); im.src = pv; im.alt = ''; im.className = 'cv-prev'; st.appendChild(im); st.style.minHeight = '260px'; }
    else st.style.minHeight = '';
    const box = document.createElement('div'); box.className = 'cv-lock' + (pv ? ' over' : '');
    box.innerHTML = `<i class="fa-solid fa-lock"></i><div>${gEsc(text || 'This content is locked')}</div>`;
    st.appendChild(box);
}
function renderMedia(url, type) {
    const st = $('cvStage'); st.innerHTML = ''; st.style.minHeight = '';
    if (type === 'video') {
        const v = document.createElement('video');
        v.controls = true; v.playsInline = true; v.preload = 'metadata';
        v.setAttribute('controlsList', 'nodownload noremoteplayback'); v.setAttribute('disablePictureInPicture', '');
        v.oncontextmenu = () => false; v.src = url; st.appendChild(v);
    } else {
        const im = document.createElement('img'); im.alt = V.item ? V.item.name : ''; im.src = url; st.appendChild(im);
    }
}
function openLinkNow(link) {
    if (!/^https?:\/\//i.test(String(link))) return setState('error', 'This link is not valid.', true);
    if (!openExternal(link)) window.location.href = link;
}
function finishUnlock() {
    V.busy = false;
    if (V.credit) { useCredits(V.credit); V.credit = 0; }
    if (V.link) { setState('unlocked', 'Unlocked ✅ Opening the link…'); setTimeout(() => openLinkNow(V.link), 350); return; }
    if (!V.url) return setState('error', 'This item has no media attached.', true);
    renderMedia(V.url, V.item.type); setState('unlocked', '');
}

window.viewerMainAction = async function () {
    if (AD.tap) return AD.tap();
    if (V.state === 'unlocked' && V.link) return openLinkNow(V.link);
    if (V.busy || AD.running || !V.item || V.state === 'unlocked') return;
    const item = V.item;
    V.busy = true;
    setState('in_progress', 'Please complete the advertisement, then come back to this page…');
    viewerUI.setBtn('⏳ Loading ad…', true);
    try {
        await window.runAd('content', viewerUI);
        if (V.item !== item) return;                       // viewer was closed meanwhile
        V.completed++;
        if (V.completed >= V.required) return finishUnlock();
        V.busy = false;
        setState('locked', 'Step ' + V.completed + ' of ' + V.required + ' counted. Watch the next advertisement.');
    } catch (e) {
        if (V.item !== item) return;
        V.busy = false;
        setState('error', e.message || 'Something went wrong. Please retry.', true);
    }
};
window.viewerShare = function () { if (V.item && V.via === 'public') window.shareContent(V.item.id); };
window.viewerCopy = function () { if (V.item && V.via === 'public') window.copyPublicLink(V.item.id); };

window.closeContentViewer = function () {
    const el = $('contentViewer'); if (!el) return;
    if (el.style.display !== 'none' && el.style.display !== '') {
        el.style.display = 'none'; el.setAttribute('aria-hidden', 'true');
        const st = $('cvStage'); if (st) st.innerHTML = '';
        document.body.style.overflow = '';
        V.seq++; V.item = null; V.token = null; V.link = ''; V.url = ''; V.completed = 0; V.required = 0; V.credit = 0; V.busy = false;
        AD.tap = null;
    }
};

async function openViewer(opts) {
    const my = ++V.seq;
    Object.assign(V, { item: null, via: opts.via, token: opts.token || null, link: '', url: '', preview: '', required: 0, completed: 0, credit: 0, busy: false, state: 'locked', msg: '', err: false });
    $('contentViewer').style.display = 'flex'; $('contentViewer').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    window.backHistory.push('content-viewer');
    history.pushState({ page: 'content-viewer' }, '', location.href);
    renderLockedStage('Loading…'); $('cvTitle').textContent = 'Loading…'; renderViewer();

    const cfgP = window.loadUnlockConfig();
    let it = null;
    try {
        if (opts.via === 'share') {
            const sv = await dbRead('private_shares/' + gId(opts.token));
            if (sv && !sv.revoked && !(sv.expiresAt && sv.expiresAt < Date.now()) && (sv.url || sv.link))
                it = { id: sv.itemId, name: sv.name, type: sv.type, url: sv.url || '', link: sv.link || '' };
        } else {
            it = (window.__galleryItems || {})[opts.id] || await dbRead('admin_files/' + opts.id);
            if (it && it.status === 'private') it = null;
        }
    } catch (_) { it = null; }
    if (my !== V.seq) return;
    if (!it || !(it.url || it.link)) {
        renderLockedStage('Not available'); $('cvTitle').textContent = 'Content unavailable';
        return setState('error', opts.via === 'share' ? 'This link is invalid, revoked or expired.' : 'This content was not found.', true);
    }
    const cfg = await cfgP;
    if (my !== V.seq) return;
    V.item = { id: it.id, name: it.name || 'Content', type: it.type === 'video' ? 'video' : 'image' };
    V.url = it.url || ''; V.link = it.link || '';
    V.required = V.item.type === 'video' ? cfg.videoSteps : cfg.photoSteps;
    V.credit = Math.max(0, Math.min(getCredits(), V.required - 1));
    V.completed = V.credit;
    V.preview = opts.via === 'public' ? (it.thumb || (V.item.type === 'image' && it.url ? it.url : '')) : '';
    renderLockedStage('Complete the advertisement steps to unlock this ' + (V.item.type === 'video' ? 'video' : 'photo') + '.');
    setState('locked', V.credit ? '🎁 Bonus applied: ' + V.credit + ' step' + (V.credit > 1 ? 's' : '') + ' free.' : '');
}
window.openContent = function (id) { id = gId(id); if (id) openViewer({ via: 'public', id }); };

/* Opened from a shared Telegram link? → same flow: login unlock first, then the content unlock */
(function bootFromStart() {
    const run = async () => {
        const p = getStartParam(); if (!p) return;
        let open = null;
        const m = /^([cs])_([A-Za-z0-9_-]+)$/.exec(p);
        if (m) open = m[1] === 's' ? { via: 'share', token: m[2] } : { via: 'public', id: gId(m[2]) };
        else if (/^[A-Za-z0-9_-]+$/.test(p)) open = { via: 'public', id: p };
        if (!open) return;
        if (!IN_TG) {                                      // normal website link → jump into the Mini App when it is configured
            const c = await window.getTgCfg();
            if (c.bot) { location.replace(buildLinkSync(open.via === 'share' ? 's_' + open.token : 'c_' + open.id)); return; }
        }
        PENDING_OPEN = open; canClickFreely = false;
        $('startPopup').style.display = 'flex';
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();

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
        refreshBonusBtn();
        const b = $('bonusBtn'); if (b) b.style.display = cfg.bonus.provider === 'off' ? 'none' : '';
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

/* =======================================================
   🛡️ SECURITY — F12 / right-click, two independent ON/OFF switches (Firebase realtime)
======================================================= */
let SEC = { f12: true, rc: true };
try { const s = JSON.parse(localStorage.getItem('sec_cfg') || 'null'); if (s) SEC = { f12: s.f12 !== false, rc: s.rc !== false }; } catch (_) {}
const paintSec = () => {
    const a = $('secF12'), b = $('secRC'), ta = $('secF12Text'), tb = $('secRCText');
    if (a) a.checked = SEC.f12; if (b) b.checked = SEC.rc;
    if (ta) { ta.textContent = SEC.f12 ? 'STATUS: ON (blocked)' : 'STATUS: OFF (allowed)'; ta.style.color = SEC.f12 ? '#00ffcc' : '#ff0055'; }
    if (tb) { tb.textContent = SEC.rc ? 'STATUS: ON (blocked)' : 'STATUS: OFF (allowed)'; tb.style.color = SEC.rc ? '#00ffcc' : '#ff0055'; }
};
onValue(ref(db, 'settings/security'), (snap) => {
    const v = snap.val();
    if (v) { SEC = { f12: v.f12 !== false, rc: v.rightClick !== false }; try { localStorage.setItem('sec_cfg', JSON.stringify(SEC)); } catch (_) {} }
    paintSec();
});
window.saveSecurity = function () {
    const f12 = !!$('secF12').checked, rightClick = !!$('secRC').checked;
    SEC = { f12, rc: rightClick }; paintSec();
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

window.shareImg = function(url) { if (navigator.share) { navigator.share({ title: 'Cool Aesthetic Wallpaper', url: url }).catch(console.error); } else { window.copyLink(url); } }


/* =======================================================
   🦅 সাইবার বার্ড শো ইঞ্জিন (লেয়ার ও বাগ-ফিক্সড ভার্সন)
======================================================= */
const bird1 = document.getElementById('bird1');
const bird2 = document.getElementById('bird2');

function startBirdShow() {
    const birdX1 = window.innerWidth * 0.25; 
    const birdX2 = window.innerWidth * 0.75; 

    if(bird1) executeBirdFlyAway(bird1, birdX1);
    
    setTimeout(() => {
        if(bird2) executeBirdFlyAway(bird2, birdX2);
    }, 3500); 
}

function executeBirdFlyAway(bird, posX) {
    const startY = window.innerHeight + 100; // ফুটারের নিচে লুকানো পজিশন
    const endY = -150; // আকাশের ওপরে ভ্যানিশ পজিশন

    // ⚡ [বুলেটপ্রুফ রিসেট] ট্রানজিশন অফ করে পাখিকে নিচে পাঠানো হচ্ছে
    bird.style.transition = "none";
    bird.className = "magic-bird"; 
    bird.style.left = posX + 'px';
    bird.style.top = startY + 'px';
    
    // 🛡️ বাগ ফিক্স: পাখি যেন নোটিফিকেশন প্যানেল ও সাইডবারের পেছন দিয়ে ওড়ে
    bird.style.zIndex = "10"; 
    
    // 🔥 ট্রিক: ব্রাউজার রিফ্লো (Reflow) ফোর্স করা
    void bird.offsetWidth;

    // এবার স্মুথভাবে ওড়ার ক্লাস আর ১০ সেকেন্ডের ট্রানজিশন অ্যানিমেশন ফায়ার করা হলো
    bird.className = "magic-bird flying";
    bird.style.transition = "top 10s linear";
    bird.style.top = endY + 'px';

    // 🪶 পাখি ওড়ার সময় প্রতি ২.৫ সেকেন্ডে মাত্র ১টা করে পালক পড়বে
    let featherInterval = setInterval(() => {
        let currentTop = bird.getBoundingClientRect().top;
        if(currentTop < window.innerHeight && currentTop > 0) {
            createFeather(posX + 25, currentTop + 20);
        }
    }, 2500);

    // ১০.৫ সেকেন্ড পর পাখি যখন পুরোপুরি ওপরে ভ্যানিশ, তখন রিসেট
    setTimeout(() => {
        clearInterval(featherInterval);
        bird.className = "magic-bird";
        bird.style.transition = "none";
        bird.style.top = startY + 'px'; 
    }, 10500);
}

// 🪶 নিওন পালক জেনারেটর (লেয়ার ফিক্সড)
function createFeather(x, y) {
    const feather = document.createElement('div');
    feather.className = 'rgb-feather';
    
    const colors = ['#00ffcc', '#ff0055', '#0072ff', '#ffef00', '#ff00ff'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    feather.style.setProperty('--f-color', randomColor);
    
    feather.style.left = x + 'px';
    feather.style.top = y + 'px';
    
    // 🛡️ বাগ ফিক্স: পালকগুলোও যেন প্যানেলের পেছনে থাকে
    feather.style.zIndex = "9"; 
    feather.style.animationDuration = (9 + Math.random() * 3) + 's';
    
    feather.addEventListener('mouseenter', () => {
        createBlast(parseInt(feather.style.left), window.scrollY + feather.getBoundingClientRect().top, randomColor);
        feather.remove();
    });

    document.body.appendChild(feather);
    setTimeout(() => { if(feather.parentNode) feather.remove(); }, 12000);
}

// 💥 আরজিবি ব্লাস্ট লজিক (লেয়ার ফিক্সড)
function createBlast(x, y, color) {
    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.className = 'blast-particle';
        particle.style.background = color;
        particle.style.boxShadow = `0 0 10px ${color}`;
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        
        // 🛡️ বাগ ফিক্স: ব্লাস্ট পার্টিকেলগুলোর লেয়ার ফিক্স করা হলো
        particle.style.zIndex = "11"; 
        
        const mx = (Math.random() - 0.5) * 120 + 'px';
        const my = (Math.random() - 0.5) * 120 + 'px';
        particle.style.setProperty('--mx', mx);
        particle.style.setProperty('--my', my);
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 500);
    }
}

// পেজ লোডের ৩ সেকেন্ড পর ফার্স্ট শো শুরু হবে
// setTimeout(startBirdShow, 3000);

// প্রতি ৩০ সেকেন্ড পর পর ইনফিনিট লুপ
// setInterval(startBirdShow, 30000);

// =======================================================
// 🛡️ CYBERPUNK SECURITY ENGINE — Firebase Realtime Control
// isSecurityEnabled উপরে Firebase onValue থেকে set হয়
// ✅ Text select allow — user স্বাভাবিকভাবে text copy করতে পারবে
// =======================================================

function closeSecModal() {
    var modal = document.getElementById('securityModal');
    if (modal) modal.classList.remove('show');
}
window.closeSecModal = closeSecModal;

(function() {
    const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    function showSecModal() { const m = document.getElementById('securityModal'); if (m) m.classList.add('show'); }
    window.addEventListener('contextmenu', function(e) {
        if (!SEC.rc) return;
        e.preventDefault(); e.stopPropagation();
        if (!touch) showSecModal();
    }, true);
    window.addEventListener('keydown', function(e) {
        if (!SEC.f12) return;
        const k = String(e.key || '').toLowerCase();
        const bad = e.keyCode === 123 || k === 'f12' ||
            (e.ctrlKey && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) ||
            (e.ctrlKey && k === 'u') ||
            (e.metaKey && e.altKey && (k === 'i' || k === 'j' || k === 'c' || k === 'u'));
        if (bad) { e.preventDefault(); e.stopPropagation(); showSecModal(); return false; }
    }, true);
})();

// ✅ FIX: Header scroll hide — নিচে গেলে hide, উপরে এলে show
(function() {
    let lastScrollY = 0;
    let ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                const topUI = document.getElementById('topUI');
                if (!topUI) { ticking = false; return; }
                const currentScrollY = window.scrollY;
                if (currentScrollY > lastScrollY && currentScrollY > 60) {
                    topUI.classList.add('header-hidden');
                } else {
                    topUI.classList.remove('header-hidden');
                }
                lastScrollY = currentScrollY;
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
})();


