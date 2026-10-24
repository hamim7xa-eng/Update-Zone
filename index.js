import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

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
const TG_SCREEN_MODE = 'normal';   // 'normal' | 'fullscreen'
const TG = (window.Telegram && window.Telegram.WebApp) || null;
const IN_TG = !!(TG && TG.initData);
window.TG = TG;
(function initTelegram() {
    if (!TG) return;
    try { TG.ready(); } catch (_) {}
    try { TG.expand(); } catch (_) {}
    /* Screen mode: 'normal' = bot er name er sathe normal size (button r share-link duita-i ek rokom), 'fullscreen' = full screen */
    const _applyMode = () => {
        try {
            if (TG_SCREEN_MODE === 'fullscreen') { if (!TG.isFullscreen && TG.requestFullscreen) TG.requestFullscreen(); }
            else if (TG.isFullscreen && TG.exitFullscreen) TG.exitFullscreen();
        } catch (_) {}
    };
    _applyMode();
    try { TG.onEvent('fullscreenChanged', _applyMode); } catch (_) {}
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
        return on('popup') || on('contentViewer') || on('downloadModal') || on('promoModal') || on('shareSheet') || window.sidebarOpen || window.notifOpen;
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
/* 👇 Admin website er link ekhane boshao (admin.html jekhane host korbe, jemon https://my-admin.vercel.app/admin.html) */
const ADMIN_SITE_URL = "";

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
        if (!/^https?:\/\//i.test(ADMIN_SITE_URL)) return window.showToast("Admin link set kora nai (index.js e ADMIN_SITE_URL) ⚠️", "error");
        openExternal(ADMIN_SITE_URL);
    } else {
        window.showToast("Invalid Code! ❌", "error");
    }
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
            // 🆕 Newest first: notun upload sobar upore, purono gula niche
            const _files = [];
            snapshot.forEach((childSnapshot) => { _files.push(childSnapshot.val()); });
            _files.sort((a, b) => (Number(b.timestamp) || Number(b.id) || 0) - (Number(a.timestamp) || Number(a.id) || 0));
            _files.forEach((file) => {
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
window.shareImg = function(url) { if (navigator.share) { navigator.share({ title: 'Cool Aesthetic Wallpaper', url: url }).catch(console.error); } else { window.copyLink(url); } }



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


