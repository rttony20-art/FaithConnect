import React, { useState, useEffect, useRef, useCallback } from "react";
import { Heart, MessageCircle, Phone, Video, Mic, MicOff, PhoneOff, Send, User, ChevronLeft, Check, X, Camera, VideoOff, Square, SkipForward, Menu, LogOut, Info, Shield, HelpCircle, Eye, EyeOff, Home, UserPlus, Sun, Moon, Percent, ArrowRight } from "lucide-react";

/* ---------- design tokens ----------
Ink Navy #16233F (dark surfaces), Ivory #F8F4EA (light surfaces),
Muted Gold #B8935F (accent / primary action), Dusty Rose #B5616B (match %, hearts),
Sage #6E8F72 (accept / online), Charcoal #22252B (text)
Serif: "Lora" for headings. Sans: "Inter" for body & UI.
------------------------------------- */

const VALUES = ["Family-focused","Faith & prayer","Service to others","Financial stewardship","Career-driven","Community-minded","Simplicity","Adventure & travel"];
const HOBBIES = ["Hiking","Cooking","Reading","Worship music","Sports","Board games","Volunteering","Art & design","Gardening","Fitness","Movies","Traveling"];
const GOALS = ["Marriage-minded","Dating intentionally","Getting to know people","Friendship first","Open to see where it goes"];
const PERSONALITY = ["Introvert","Extrovert","Quiet","Social","Morning person","Night owl","Homebody","Adventurous","Easygoing","Organized","Spontaneous","Analytical","Empathetic","Funny & playful","Reserved","Outgoing","Family-oriented","Independent","Romantic","Practical","Optimistic","Deep thinker","Affectionate","Straightforward"];
const DENOMS = ["Non-denominational","Baptist","Catholic","Methodist","Pentecostal","Presbyterian","Lutheran","Orthodox","Anglican / Episcopal","Just Christian"];

// Experimental dark background: soft green glow blobs on black, in place of solid navy.
// To revert, change GLOW_BG back to the string "#16233F".
const LIGHT_BG = 'linear-gradient(180deg, #F7F9FC 0%, #EEF2F7 55%, #E8EDF5 100%)';
const GLOW_BG = 'radial-gradient(circle at 50% 20%, rgba(93,124,255,0.16), transparent 45%), radial-gradient(circle at 15% 45%, rgba(86,108,255,0.16), transparent 40%), radial-gradient(circle at 85% 75%, rgba(171,71,255,0.14), transparent 45%), linear-gradient(180deg, #080b17 0%, #070a14 55%, #090b16 100%)';
const ACCENT_GRADIENT = 'linear-gradient(100deg, #526cff, #8d5cff)';
// Cinematic FaithConnect hero artwork generated for this layout. Kept inline so the app works as a single file.
const FAITHCONNECT_HERO = "/images/faithconnect-night-beach.jpg";
const FAITHCONNECT_LIGHT_HERO = "/images/faithconnect-day-valley.png";


function genId() { return Math.random().toString(36).slice(2, 10); }
function convoId(a, b) { return [a, b].sort().join("-"); }

/* ---------- Supabase (real accounts + profiles) — plain HTTP, no external library ---------- */
const SUPABASE_URL = "https://vyhhyqegboenrznkjjjc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_E5w6gJK9yQKrvJNWyzhhlg_i78m_wde";

async function supaAuth(action, body, extraHeaders = {}) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, ...extraHeaders },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || data.error_code || data.error || `Auth request failed (${res.status})`);
  return data;
}
async function supaAuthGet(path, token) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || `Auth request failed (${res.status})`);
  return data;
}
async function supaAuthUpdateUser(token, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.msg || `Update failed (${res.status})`);
  return data;
}
async function supaRest(path, { method = "GET", token, body, extraHeaders = {} } = {}) {
  const headers = { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json", ...extraHeaders };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Database request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}
async function supaUpload(bucket, path, file, token) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${token}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "true" },
    body: file
  });
  if (!res.ok) { const t = await res.text().catch(() => ""); throw new Error(t || `Photo upload failed (${res.status})`); }
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
async function restoreSupaSession() {
  const sess = await sget("supabase-session", false);
  if (!sess || !sess.refresh_token) return null;
  try {
    const data = await supaAuth("token?grant_type=refresh_token", { refresh_token: sess.refresh_token });
    await saveSupaSession(data);
    return data;
  } catch { return null; }
}
async function saveSupaSession(session) {
  if (!session || !session.access_token) return;
  await sset("supabase-session", { access_token: session.access_token, refresh_token: session.refresh_token }, false);
}
function usernameToEmail(u) { return `${u}@covenant.app`; }
function profileFromDb(row) {
  if (!row) return null;
  return {
    id: row.id, username: row.username, name: row.name, age: row.age, gender: row.gender, seeking: row.seeking,
    city: row.city, denom: row.denom, faithLevel: row.faith_level, bio: row.bio,
    values: row.core_values || [], hobbies: row.hobbies || [], goals: row.goals || [],
    appearance: row.appearance || [], lookPref: row.look_pref || [],
    avatarUrl: row.avatar_url || null, photoUrls: row.photo_urls || [],
    avatarEmoji: row.avatar_emoji || null, avatarColor: row.avatar_color || null
  };
}
function profileToDb(p) {
  return {
    id: p.id, username: p.username, name: p.name, age: Number(p.age), gender: p.gender, seeking: p.seeking,
    city: p.city, denom: p.denom, faith_level: p.faithLevel, bio: p.bio,
    core_values: p.values || [], hobbies: p.hobbies || [], goals: p.goals || [],
    appearance: p.appearance || [], look_pref: p.lookPref || [],
    avatar_url: p.avatarUrl || null, photo_urls: p.photoUrls || [],
    avatar_emoji: p.avatarEmoji || null, avatar_color: p.avatarColor || null
  };
}

function AvatarCircle({ profile, size = 74, fontSize = 28 }) {
  const style = { width:size, height:size, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 };
  if (profile?.avatarUrl) {
    return <div style={{ ...style, background:`center/cover url(${profile.avatarUrl})` }} />;
  }
  if (profile?.avatarEmoji) {
    return <div style={{ ...style, background: profile.avatarColor || "#B8935F", fontSize: fontSize * 0.8 }}>{profile.avatarEmoji}</div>;
  }
  return <div style={{ ...style, background:"#B8935F", color:"#FAF7F0", fontFamily:"Lora, serif", fontSize }}>{profile?.name?.[0]?.toUpperCase() || "?"}</div>;
}

function jaccard(a = [], b = []) {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : Math.round((inter / union) * 100);
}

function hasNativeStorage() { return typeof window !== "undefined" && window.storage && typeof window.storage.get === "function"; }
async function sget(key, shared) {
  try {
    if (hasNativeStorage()) { const r = await window.storage.get(key, shared); return r ? JSON.parse(r.value) : null; }
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
async function sgetRetry(key, shared, tries = 3) {
  for (let i = 0; i < tries; i++) {
    const v = await sget(key, shared);
    if (v !== null) return v;
    await new Promise(r => setTimeout(r, 250));
  }
  return null;
}
async function sset(key, val, shared) {
  try {
    if (hasNativeStorage()) { await window.storage.set(key, JSON.stringify(val), shared); return; }
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) { console.error(e); }
}
async function sdel(key, shared) {
  try {
    if (hasNativeStorage()) { await window.storage.delete(key, shared); return; }
    localStorage.removeItem(key);
  } catch {}
}
async function storageList(prefix, shared) {
  try {
    if (hasNativeStorage()) return await window.storage.list(prefix, shared);
    return { keys: Object.keys(localStorage).filter(k => k.startsWith(prefix)) };
  } catch { return null; }
}

function scoreMatch(me, them) {
  const faithCloseness = Math.max(0, 100 - Math.abs((me.faithLevel||3) - (them.faithLevel||3)) * 20);
  const denomBonus = me.denom && me.denom === them.denom ? 10 : 0;
  const faith = Math.min(100, faithCloseness + denomBonus);
  const values = jaccard(me.values, them.values);
  const goals = jaccard(me.goals, them.goals);
  const hobbies = jaccard(me.hobbies, them.hobbies);
  const looksAB = jaccard(me.lookPref, them.appearance);
  const looksBA = jaccard(them.lookPref, me.appearance);
  const looks = Math.round((looksAB + looksBA) / 2);
  const age = Math.max(0, 100 - Math.abs((Number(me.age)||0) - (Number(them.age)||0)) * 5);
  const pct = Math.round(faith*0.25 + values*0.20 + goals*0.15 + hobbies*0.15 + looks*0.10 + age*0.15);
  return { pct, faith, values, goals, hobbies, looks, age };
}

function BibleIcon({ size = 24, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 1 4 17.5v-13Z" />
      <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" />
      <path d="M12 6v6" />
      <path d="M9.2 9h5.6" />
    </svg>
  );
}

function PasswordInput({ value, onChange, onKeyDown, placeholder, style }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        style={{ ...style, paddingRight:38, width: style?.width || "100%", boxSizing:"border-box" }}
      />
      <button type="button" onClick={() => setShow(s => !s)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", padding:2, display:"flex" }}>
        {show ? <EyeOff size={17} color="#8A8578" /> : <Eye size={17} color="#8A8578" />}
      </button>
    </div>
  );
}

function PhotoSlot({ label, preview, existingUrl, onPick, big, emoji, emojiColor }) {
  const img = preview || existingUrl;
  const size = big ? 96 : 76;
  return (
    <label style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer" }}>
      <div style={{
        width:size, height:size, borderRadius: big ? "50%" : 14,
        background: img ? `center/cover url(${img})` : (emoji ? emojiColor : "#EFE9DC"),
        border:"1.5px dashed #C9A227", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", fontSize: size * 0.45
      }}>
        {!img && (emoji || <Camera size={big ? 26 : 20} color="#B8935F" />)}
      </div>
      <span style={{ fontFamily:"Inter, sans-serif", fontSize:11.5, color:"#8A8578" }}>{label}</span>
      <input type="file" accept="image/*" onChange={onPick} style={{ display:"none" }} />
    </label>
  );
}

// FaithConnect's built-in avatar library.
// These are local files in /public/avatars, so the picker does NOT depend on
// an external avatar API and cannot show broken-image icons when offline/API access fails.
const AVATAR_PRESETS = Array.from({ length: 24 }, (_, i) => {
  const n = i + 1;
  // The generated set alternates male/female in each row: M,F,M,F.
  const gender = i % 2 === 0 ? "Male" : "Female";
  return {
    id: `faith-avatar-${String(n).padStart(2, "0")}`,
    gender,
    url: `/avatars/avatar-${String(n).padStart(2, "0")}.png`
  };
});

function makeFaithAvatarSvg({ skin, hair, eyes, mouth, shirt, accessory }) {
  const skins = { warm:"#C98B68", tan:"#A96E4D", deep:"#754733", rich:"#5A3426", golden:"#D9A071", light:"#E7B58F", cocoa:"#8B563B" };
  const hairs = {
    short:"M67 104 C62 55 83 25 128 25 C173 25 194 55 189 104 L174 92 C168 61 151 48 128 48 C104 48 87 61 82 92 Z",
    curls:"M62 104 C48 75 57 34 91 24 C107 9 139 11 157 25 C191 35 207 75 194 106 L178 92 C181 63 160 46 143 45 C116 38 89 52 82 84 Z",
    fade:"M70 98 C67 63 88 35 128 35 C168 35 189 63 186 98 L169 87 C164 61 148 51 128 51 C108 51 92 61 87 87 Z",
    long:"M63 118 C52 78 61 36 94 23 C132 8 176 31 190 69 L190 143 L170 133 L169 86 C163 57 145 46 126 46 C99 46 83 64 82 94 L81 135 Z",
    bob:"M61 116 L59 70 C62 31 91 15 128 15 C165 15 194 31 197 70 L195 116 L177 103 L173 67 C164 45 147 39 128 39 C108 39 91 45 82 67 L79 103 Z",
    locs:"M65 112 C55 72 67 28 105 22 C143 13 181 35 190 73 L180 125 L165 112 L169 73 C159 48 144 43 128 43 C106 43 90 54 85 78 L82 121 Z",
    bun:"M68 103 C62 60 86 32 128 32 C170 32 194 60 188 103 L172 90 C167 62 150 50 128 50 C106 50 89 62 84 90 Z M157 34 C160 12 179 4 193 17 C205 28 197 47 177 48 Z",
    waves:"M64 109 C55 72 65 37 98 23 C137 7 179 32 191 70 C197 89 193 113 186 130 L169 111 C172 81 160 56 137 48 C111 39 89 56 83 83 L81 122 Z"
  };
  const eyeMap = {
    soft:'<path d="M92 103 Q104 94 116 103"/><path d="M140 103 Q152 94 164 103"/>',
    bright:'<circle cx="105" cy="102" r="6"/><circle cx="151" cy="102" r="6"/>',
    wink:'<path d="M91 103 Q104 94 116 103"/><path d="M140 103 Q151 111 164 101"/>',
    bold:'<path d="M91 99 Q104 89 117 99"/><path d="M139 99 Q152 89 165 99"/><circle cx="104" cy="102" r="4"/><circle cx="152" cy="102" r="4"/>',
    happy:'<path d="M91 105 Q104 91 117 105"/><path d="M139 105 Q152 91 165 105"/>'
  };
  const mouthMap = {
    smile:'<path d="M111 130 Q128 145 145 130"/>',
    calm:'<path d="M114 133 Q128 137 142 133"/>',
    open:'<path d="M112 130 Q128 148 144 130 Q140 146 128 148 Q116 146 112 130 Z" fill="#6E3040"/>',
    small:'<path d="M121 134 Q128 138 135 134"/>',
    laugh:'<path d="M108 128 Q128 151 148 128 Q143 151 128 153 Q113 151 108 128 Z" fill="#6E3040"/><path d="M114 134 Q128 138 142 134" stroke="#F8F4EA" stroke-width="3"/>'
  };
  const shirts = { navy:"#253B72", purple:"#6242A8", rose:"#9D4D70", teal:"#277D83", gold:"#A9783F", sage:"#4F7862" };
  const accessories = {
    none:'',
    glasses:'<rect x="84" y="91" width="38" height="24" rx="10" fill="none" stroke="#E8D7B5" stroke-width="4"/><rect x="134" y="91" width="38" height="24" rx="10" fill="none" stroke="#E8D7B5" stroke-width="4"/><path d="M122 101 H134" stroke="#E8D7B5" stroke-width="4"/>',
    star:'<path d="M186 72 l4 9 10 1-8 6 3 10-9-5-9 5 3-10-8-6 10-1z" fill="#D6AE6E"/>',
    cross:'<circle cx="186" cy="88" r="13" fill="#8D5CFF"/><path d="M186 80 V96 M178 88 H194" stroke="#F8F4EA" stroke-width="3" stroke-linecap="round"/>',
    hoop:'<circle cx="82" cy="119" r="7" fill="none" stroke="#D6AE6E" stroke-width="4"/><circle cx="174" cy="119" r="7" fill="none" stroke="#D6AE6E" stroke-width="4"/>'
  };
  const skinColor = skins[skin] || skins.warm;
  const hairPath = hairs[hair] || hairs.short;
  const eye = eyeMap[eyes] || eyeMap.soft;
  const mouthSvg = mouthMap[mouth] || mouthMap.smile;
  const shirtColor = shirts[shirt] || shirts.navy;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#526CFF"/><stop offset="1" stop-color="#8D5CFF"/></linearGradient></defs>
    <circle cx="128" cy="128" r="126" fill="url(#bg)"/>
    <circle cx="128" cy="119" r="94" fill="#0B1020" opacity=".32"/>
    <path d="M61 245 C65 194 91 171 128 171 C165 171 191 194 195 245Z" fill="${shirtColor}"/>
    <path d="M105 169 Q128 185 151 169 L151 195 Q128 211 105 195Z" fill="${skinColor}"/>
    <ellipse cx="128" cy="110" rx="59" ry="70" fill="${skinColor}"/>
    <ellipse cx="70" cy="111" rx="9" ry="15" fill="${skinColor}"/><ellipse cx="186" cy="111" rx="9" ry="15" fill="${skinColor}"/>
    <path d="${hairPath}" fill="#211A22"/>
    <g fill="none" stroke="#2A2028" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${eye}</g>
    <path d="M128 106 Q121 118 128 122" fill="none" stroke="#7D4B3A" stroke-width="3" stroke-linecap="round"/>
    <g fill="none" stroke="#7A3F45" stroke-width="3" stroke-linecap="round">${mouthSvg}</g>
    <g>${accessories[accessory] || ''}</g>
    <circle cx="128" cy="128" r="122" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="3"/>
  </svg>`;
}

function faithAvatarDataUrl(options) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(makeFaithAvatarSvg(options))}`;
}

function AvatarPicker({ selected, onPick }) {
  const [tab, setTab] = useState("All");
  const [avatarPage, setAvatarPage] = useState(0);
  const [showCreator, setShowCreator] = useState(false);
  const [builder, setBuilder] = useState({ skin:"warm", hair:"short", eyes:"soft", mouth:"smile", shirt:"navy", accessory:"none" });
  const [loadedAvatarIds, setLoadedAvatarIds] = useState([]);
  const [avatarLoading, setAvatarLoading] = useState(true);
  const customUrl = faithAvatarDataUrl(builder);

  // Preload every FaithConnect avatar. If a file is missing/corrupt, it is
  // simply excluded instead of showing a broken-image icon.
  useEffect(() => {
    let cancelled = false;
    setAvatarLoading(true);
    setLoadedAvatarIds([]);

    const results = AVATAR_PRESETS.map(a => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(a.id);
      img.onerror = () => resolve(null);
      img.src = a.url;
    }));

    Promise.all(results).then(ids => {
      if (cancelled) return;
      setLoadedAvatarIds(ids.filter(Boolean));
      setAvatarLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  const loadedSet = new Set(loadedAvatarIds);
  const validPresets = AVATAR_PRESETS.filter(a => loadedSet.has(a.id));
  const visible = tab === "All" ? validPresets : validPresets.filter(a => a.gender === tab);
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(avatarPage, Math.max(0, pageCount - 1));
  const pageAvatars = visible.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function changeTab(t) { setTab(t); setAvatarPage(0); }
  function nextAvatars() { setAvatarPage(p => (p + 1) % pageCount); }
  function setPart(part, value) { setBuilder(prev => ({ ...prev, [part]: value })); }
  function randomizeBuilder() {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    setBuilder({ skin:pick(["warm","tan","deep","rich","golden","light","cocoa"]), hair:pick(["short","curls","fade","long","bob","locs","bun","waves"]), eyes:pick(["soft","bright","wink","bold","happy"]), mouth:pick(["smile","calm","open","small","laugh"]), shirt:pick(["navy","purple","rose","teal","gold","sage"]), accessory:pick(["none","glasses","star","cross","hoop"]) });
  }
  const options = {
    skin:["warm","tan","deep","rich","golden","light","cocoa"], hair:["short","curls","fade","long","bob","locs","bun","waves"],
    eyes:["soft","bright","wink","bold","happy"], mouth:["smile","calm","open","small","laugh"], shirt:["navy","purple","rose","teal","gold","sage"], accessory:["none","glasses","star","cross","hoop"]
  };
  const labels = { skin:"Skin", hair:"Hair", eyes:"Eyes", mouth:"Mouth", shirt:"Clothes", accessory:"Accessory" };

  return (
    <div style={{ width:"100%", marginTop:10 }}>
      <div style={{ textAlign:"center", color:"#B9C9BC", fontFamily:"Inter, sans-serif", fontSize:12, marginBottom:9 }}>
        Choose a FaithConnect avatar that represents you.
      </div>
      <div style={{ display:"flex", gap:7, justifyContent:"center", flexWrap:"wrap", marginBottom:10 }}>
        {["All","Male","Female"].map(t => <button key={t} type="button" onClick={() => changeTab(t)} style={{ padding:"7px 14px", borderRadius:999, cursor:"pointer", fontFamily:"Inter, sans-serif", fontSize:12, border:tab===t?"1.5px solid #D6AE6E":"1px solid rgba(248,244,234,.25)", background:tab===t?"rgba(184,147,95,.22)":"rgba(255,255,255,.03)", color:tab===t?"#F8F4EA":"#9FAAC1" }}>{t}</button>)}
        <button type="button" onClick={() => setShowCreator(v => !v)} style={{ padding:"7px 14px", borderRadius:999, cursor:"pointer", fontFamily:"Inter, sans-serif", fontSize:12, border:"1.5px solid rgba(141,92,255,.7)", background:"rgba(141,92,255,.12)", color:"#E7DDFF" }}>{showCreator ? "Close" : "Create my avatar"}</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,minmax(0,1fr))", gap:8, width:"100%", maxWidth:430, margin:"0 auto", minHeight:74 }}>
        {avatarLoading ? (
          <div style={{ gridColumn:"1 / -1", textAlign:"center", color:"#69748D", fontFamily:"Inter,sans-serif", fontSize:11, padding:"25px 0" }}>
            Loading avatars…
          </div>
        ) : pageAvatars.length ? (
          pageAvatars.map(a => <button key={a.id} type="button" onClick={() => onPick(a.url)} aria-label={`Choose ${a.gender.toLowerCase()} avatar`} style={{ width:"100%", aspectRatio:"1", borderRadius:"50%", padding:2, cursor:"pointer", overflow:"hidden", border:selected===a.url?"3px solid #F8F4EA":"2px solid rgba(248,244,234,.22)", background:selected===a.url?"linear-gradient(135deg,#526CFF,#8D5CFF)":"rgba(255,255,255,.03)", boxShadow:selected===a.url?"0 0 18px rgba(82,108,255,.45)":"none" }}>
            <img
              src={a.url}
              alt=""
              onError={() => setLoadedAvatarIds(prev => prev.filter(id => id !== a.id))}
              style={{width:"100%",height:"100%",objectFit:"cover",display:"block",borderRadius:"50%"}}
            />
          </button>)
        ) : (
          <div style={{ gridColumn:"1 / -1", textAlign:"center", color:"#9FAAC1", fontFamily:"Inter,sans-serif", fontSize:11, padding:"20px 0" }}>
            No avatar files could be loaded. Check that the files are in <b>/public/avatars/</b>.
          </div>
        )}
      </div>
      {pageCount > 1 && <div style={{display:"flex",justifyContent:"center",marginTop:10}}><button type="button" onClick={nextAvatars} style={{padding:"8px 17px",borderRadius:999,cursor:"pointer",fontFamily:"Inter,sans-serif",fontSize:12,border:"1px solid rgba(141,92,255,.55)",background:"rgba(141,92,255,.10)",color:"#E7DDFF"}}>Next avatars →</button></div>}
      {!avatarLoading && visible.length > 0 && (
        <div style={{textAlign:"center",color:"#69748D",fontFamily:"Inter,sans-serif",fontSize:10.5,marginTop:6}}>
          Showing {safePage*pageSize+1}–{Math.min((safePage+1)*pageSize,visible.length)} of {visible.length}
        </div>
      )}

      {showCreator && <div style={{margin:"14px auto 0",maxWidth:430,padding:14,borderRadius:18,border:"1px solid rgba(141,92,255,.35)",background:"rgba(12,16,32,.86)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <img src={customUrl} alt="Your custom FaithConnect avatar" style={{width:100,height:100,borderRadius:"50%",border:"2px solid #8D5CFF",boxShadow:"0 0 24px rgba(141,92,255,.25)"}} />
          <div style={{flex:1}}><div style={{color:"#F8F4EA",fontFamily:"Inter,sans-serif",fontWeight:700,fontSize:14}}>Build your own avatar</div><div style={{color:"#8F9BB8",fontFamily:"Inter,sans-serif",fontSize:11.5,marginTop:4,lineHeight:1.45}}>No AI and no external service. Mix the features to create your own FaithConnect character.</div><button type="button" onClick={randomizeBuilder} style={{marginTop:9,padding:"7px 12px",borderRadius:999,border:"1px solid rgba(248,244,234,.25)",background:"transparent",color:"#F8F4EA",cursor:"pointer",fontSize:12}}>Surprise me</button></div>
        </div>
        <div style={{marginTop:13}}>{Object.keys(options).map(part => <div key={part} style={{marginTop:10}}><div style={{color:"#9FAAC1",fontFamily:"Inter,sans-serif",fontSize:11.5,marginBottom:6}}>{labels[part]}</div><div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>{options[part].map(value => <button key={value} type="button" onClick={() => setPart(part,value)} style={{flex:"0 0 auto",padding:"7px 9px",borderRadius:999,border:builder[part]===value?"1.5px solid #D6AE6E":"1px solid rgba(248,244,234,.18)",background:builder[part]===value?"rgba(184,147,95,.22)":"rgba(255,255,255,.03)",color:builder[part]===value?"#F8F4EA":"#9FAAC1",cursor:"pointer",fontSize:10.5,textTransform:"capitalize"}}>{value}</button>)}</div></div>)}</div>
        <button type="button" onClick={() => onPick(customUrl)} style={{width:"100%",marginTop:15,padding:"11px 14px",border:0,borderRadius:999,background:"linear-gradient(135deg,#526CFF,#8D5CFF)",color:"white",fontWeight:700,cursor:"pointer"}}>Use my custom avatar</button>
      </div>}
    </div>
  );
}

function Chip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "7px 13px", borderRadius: 999, fontSize: 13.5, fontFamily: "Inter, sans-serif",
      border: active ? "1.5px solid #D6AE6E" : "1.5px solid rgba(248,244,234,0.4)",
      background: active ? "#B8935F" : "transparent", color: active ? "#2A1F0E" : "#F8F4EA",
      cursor: "pointer", margin: "3px 5px 3px 0", transition: "all .15s"
    }}>{label}</button>
  );
}

export default function App() {
  const [screen, setScreen] = useState("loading"); // loading, welcome, profile, matches, chat, messages
  const [myId, setMyId] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [form, setForm] = useState({ name:"", age:"", gender:"Female", seeking:"Male", city:"", denom: DENOMS[0], faithLevel:3, bio:"", values:[], hobbies:[], goals:[], appearance:[], lookPref:[], username:"", password:"", email:"", avatarUrl:null, photoUrls:[], avatarEmoji:null, avatarColor:null });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [photoFiles, setPhotoFiles] = useState([null, null, null]);
  const [photoPreviews, setPhotoPreviews] = useState([null, null, null]);
  const [matches, setMatches] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null); // {otherId, otherProfile}
  const [conversations, setConversations] = useState([]);
  const [err, setErr] = useState("");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(null); // null | "password" | "username"
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryMsg, setRecoveryMsg] = useState("");
  const [recoveryToken, setRecoveryToken] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordErr, setNewPasswordErr] = useState("");
  const [newPasswordBusy, setNewPasswordBusy] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const matchesScrollRef = useRef(null);
  useEffect(() => { if (screen === "matches" && matchesScrollRef.current) matchesScrollRef.current.scrollTop = 0; }, [screen]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightMode, setLightMode] = useState(() => { try { return localStorage.getItem("faithconnect-theme") === "light"; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem("faithconnect-theme", lightMode ? "light" : "dark"); } catch {} }, [lightMode]);
  useEffect(() => { document.documentElement.style.setProperty("--fc-bg", lightMode ? LIGHT_BG : GLOW_BG); }, [lightMode]);

  async function logOut() {
    try { await sdel("supabase-session", false); } catch {}
    setMyId(null);
    setMyProfile(null);
    setForm({ name:"", age:"", gender:"Female", seeking:"Male", city:"", denom: DENOMS[0], faithLevel:3, bio:"", values:[], hobbies:[], goals:[], appearance:[], lookPref:[], username:"", password:"", email:"", avatarUrl:null, photoUrls:[], avatarEmoji:null, avatarColor:null });
    setAvatarFile(null); setAvatarPreview(null); setPhotoFiles([null,null,null]); setPhotoPreviews([null,null,null]);
    setMenuOpen(false);
    setScreen("welcome");
  }

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (!myId || !myProfile) return;
    const beat = () => sset(`presence:${myId}`, { ts: Date.now(), name: myProfile.name, gender: myProfile.gender }, true);
    beat();
    const t = setInterval(beat, 15000);
    return () => clearInterval(t);
  }, [myId, myProfile]);

  async function init() {
    // if the person arrived here via a password-reset email link, Supabase appends
    // #access_token=...&type=recovery to the URL — catch that before anything else
    if (window.location.hash.includes("type=recovery")) {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = params.get("access_token");
      if (accessToken) {
        setRecoveryToken(accessToken);
        window.history.replaceState(null, "", window.location.pathname);
        setScreen("resetPassword");
        return;
      }
    }
    try {
      const session = await restoreSupaSession();
      if (session && session.access_token) {
        const user = await supaAuthGet("user", session.access_token);
        if (user && user.id) {
          const rows = await supaRest(`profiles?id=eq.${user.id}&select=*`, { token: session.access_token });
          const row = rows && rows[0];
          if (row) {
            const profile = profileFromDb(row);
            setMyId(user.id); setMyProfile(profile); setForm(profile);
            setScreen("matches");
            return;
          }
        }
      }
    } catch (e) { console.error(e); }
    setScreen("welcome");
  }

  function pickAvatar(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  }
  function pickPhoto(i, e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setPhotoFiles(arr => { const a = [...arr]; a[i] = f; return a; });
    setPhotoPreviews(arr => { const a = [...arr]; a[i] = URL.createObjectURL(f); return a; });
  }
  async function uploadSelectedPhotos(userId, token) {
    let avatarUrl = form.avatarUrl || null;
    let photoUrls = form.photoUrls || [];
    if (avatarFile) {
      avatarUrl = await supaUpload("profile-photos", `${userId}/avatar-${Date.now()}.jpg`, avatarFile, token);
    }
    const newPhotoUrls = [...photoUrls];
    for (let i = 0; i < photoFiles.length; i++) {
      if (photoFiles[i]) {
        const url = await supaUpload("profile-photos", `${userId}/photo${i}-${Date.now()}.jpg`, photoFiles[i], token);
        newPhotoUrls[i] = url;
      }
    }
    return { avatarUrl, photoUrls: newPhotoUrls.filter(Boolean) };
  }

  async function saveProfile() {
    if (!form.name || !form.age) { setErr("Please add your name and age."); return; }
    // editing an already-logged-in profile — update, don't sign up again
    if (myId && myProfile) {
      setErr("Saving changes…");
      try {
        const session = await restoreSupaSession();
        if (!session || !session.access_token) { setErr("Your session expired — please log in again."); return; }
        const { avatarUrl, photoUrls } = await uploadSelectedPhotos(myId, session.access_token);
        const updated = { ...myProfile, ...form, id: myId, age: Number(form.age), avatarUrl, photoUrls };
        await supaRest(`profiles?id=eq.${myId}`, { method: "PATCH", token: session.access_token, body: profileToDb(updated), extraHeaders: { Prefer: "return=minimal" } });
        setErr("");
        setMyProfile(updated);
        setAvatarFile(null); setPhotoFiles([null,null,null]);
        setScreen("profile");
      } catch (e) {
        setErr("Couldn't save changes: " + e.message);
      }
      return;
    }
    if (!form.username || !form.username.trim()) { setErr("Please choose a username."); return; }
    if (!form.password || form.password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email.trim())) { setErr("Please add a valid email — it's used if you ever need to reset your password."); return; }
    const uname = form.username.trim().toLowerCase().replace(/\s+/g, "");
    const email = form.email.trim().toLowerCase();
    if (!uname) { setErr("Please choose a username."); return; }
    setErr("Creating your account…");
    try {
      let data, user, token;
      try {
        data = await supaAuth("signup", { email, password: form.password });
        user = data.user || data;
        token = data.access_token;
      } catch (signupErr) {
        // account already exists — if these are YOUR credentials (e.g. a profile save got interrupted earlier), recover it instead of blocking you
        if (/registered|exists|duplicate/i.test(signupErr.message)) {
          try {
            data = await supaAuth("token?grant_type=password", { email, password: form.password });
            user = data.user; token = data.access_token;
          } catch {
            setErr("That email is already registered — try logging in instead, or use 'Forgot password?'.");
            return;
          }
        } else { throw signupErr; }
      }
      if (!token) {
        data = await supaAuth("token?grant_type=password", { email, password: form.password });
        user = data.user; token = data.access_token;
      }
      if (!user || !user.id || !token) { setErr("Something went wrong creating your account — try again."); return; }
      setErr("Uploading photos…");
      const { avatarUrl, photoUrls } = await uploadSelectedPhotos(user.id, token);
      const profile = { ...form, id: user.id, age: Number(form.age), username: uname, email, avatarUrl, photoUrls };
      await supaRest("profiles", { method: "POST", token, body: profileToDb(profile), extraHeaders: { Prefer: "return=minimal" } });
      try {
        await supaRest("usernames", { method: "POST", token, body: { username: uname, email, user_id: user.id }, extraHeaders: { Prefer: "resolution=merge-duplicates" } });
      } catch (e) {
        if (/duplicate|already exists/i.test(e.message)) { setErr("That username is taken — try another."); return; }
      }
      await saveSupaSession(data);
      setErr("");
      setMyId(user.id);
      setMyProfile(profile);
      setScreen("matches");
    } catch (e) {
      if (/registered|exists|duplicate/i.test(e.message)) setErr("That username is taken — try another.");
      else setErr("Couldn't create your account: " + e.message);
    }
  }

  async function logIn() {
    setLoginErr("");
    const uname = loginUser.trim().toLowerCase().replace(/\s+/g, "");
    if (!uname || !loginPass) { setLoginErr("Enter your username and password."); return; }
    setLoginBusy(true);
    try {
      const mapRows = await supaRest(`usernames?username=eq.${encodeURIComponent(uname)}&select=email`);
      const email = mapRows && mapRows[0] && mapRows[0].email;
      if (!email) { setLoginErr("No account found with that username."); setLoginBusy(false); return; }
      const data = await supaAuth("token?grant_type=password", { email, password: loginPass });
      const rows = await supaRest(`profiles?id=eq.${data.user.id}&select=*`, { token: data.access_token });
      const row = rows && rows[0];
      if (!row) { setLoginErr("Account found, but no profile data — try creating your profile again."); setLoginBusy(false); return; }
      await saveSupaSession(data);
      const profile = profileFromDb(row);
      setMyId(data.user.id); setMyProfile(profile); setForm(profile);
      setScreen("matches");
    } catch (e) {
      setLoginErr(/invalid|credentials/i.test(e.message) ? "Incorrect username or password." : "Couldn't log in: " + e.message);
    }
    setLoginBusy(false);
  }

  async function sendPasswordReset(email) {
    const redirectTo = encodeURIComponent(window.location.origin + window.location.pathname);
    await supaAuth(`recover?redirect_to=${redirectTo}`, { email: email.trim().toLowerCase() });
  }

  async function lookupUsernameByEmail(email) {
    const rows = await supaRest(`usernames?email=eq.${encodeURIComponent(email.trim().toLowerCase())}&select=username`);
    return rows && rows[0] ? rows[0].username : null;
  }

  const loadMatches = useCallback(async () => {
    if (!myProfile || !myId) return;
    try {
      const session = await sget("supabase-session", false);
      if (!session) return;
      const data = await supaRest(`profiles?id=neq.${myId}&select=*`, { token: session.access_token });
      const others = [];
      for (const row of (data || [])) {
        const p = profileFromDb(row);
        const iSeekThem = myProfile.seeking === "Everyone" || myProfile.seeking === p.gender;
        const theySeekMe = p.seeking === "Everyone" || p.seeking === myProfile.gender;
        if (!(iSeekThem && theySeekMe)) continue;
        others.push({ profile: p, score: scoreMatch(myProfile, p) });
      }
      others.sort((a, b) => b.score.pct - a.score.pct);
      setMatches(others);
    } catch (e) { console.error(e); }
  }, [myProfile, myId]);

  useEffect(() => { if (screen === "matches") loadMatches(); }, [screen, loadMatches]);

  const loadConversations = useCallback(async () => {
    if (!myId) return;
    const list = await storageList("chat:", true);
    if (!list) return;
    const mine = [];
    for (const k of list.keys) {
      const idpart = k.replace("chat:", "");
      const [a, b] = idpart.split("-");
      if (a !== myId && b !== myId) continue;
      const otherId = a === myId ? b : a;
      const otherProfile = await sget(`profiles:${otherId}`, true);
      const thread = await sget(k, true);
      if (!thread || !thread.length) continue;
      mine.push({ otherId, otherProfile, last: thread[thread.length - 1] });
    }
    mine.sort((x, y) => (y.last?.ts||0) - (x.last?.ts||0));
    setConversations(mine);
  }, [myId]);

  useEffect(() => { if (screen === "messages") loadConversations(); }, [screen, loadConversations]);

  function toggle(field, val) {
    setForm(f => {
      const cur = f[field] || [];
      return { ...f, [field]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] };
    });
  }

  const nav = (
    <div style={navBar(lightMode)}>
      {[["matches","Matches",Heart],["messages","Messages",MessageCircle],["matchList","Discover",Percent],["profile","Profile",User]].map(([key,label,Icon]) => (
        <button key={key} onClick={() => setScreen(key)} style={navBtn(screen===key, lightMode)}>
          <Icon size={19} strokeWidth={screen===key?2.4:1.8} />
          <span style={{ fontSize: 10, marginTop: 2, fontFamily:"Inter, sans-serif" }}>{label}</span>
        </button>
      ))}
    </div>
  );

  if (screen === "loading") return <div style={{...page, alignItems:"center", justifyContent:"center"}}><div style={{fontFamily:"Lora, serif", color:"#a0aaff"}}>Loading…</div></div>;

  if (screen === "resetPassword") {
    return (
      <div style={{ ...page, background:"var(--fc-bg)" }}>
        <FontLoader />
        <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 28px" }}>
          <h1 style={{ fontFamily:"Lora, serif", fontSize:26, color:"#F8F4EA", marginBottom:8 }}>Set a new password</h1>
          <p style={{ fontFamily:"Inter, sans-serif", fontSize:14, color:"#C9C2AF", marginBottom:20 }}>Choose a new password for your account (min. 6 characters).</p>
          <PasswordInput value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="New password" style={{ ...input, marginBottom:10 }} />
          {newPasswordErr && <div style={{ color:"#E3A6A6", fontSize:13, fontFamily:"Inter, sans-serif", marginBottom:10 }}>{newPasswordErr}</div>}
          <button disabled={newPasswordBusy} onClick={async () => {
            setNewPasswordErr("");
            if (!newPassword || newPassword.length < 6) { setNewPasswordErr("Password must be at least 6 characters."); return; }
            setNewPasswordBusy(true);
            try {
              await supaAuthUpdateUser(recoveryToken, { password: newPassword });
              const user = await supaAuthGet("user", recoveryToken);
              await saveSupaSession({ access_token: recoveryToken, refresh_token: null });
              const rows = await supaRest(`profiles?id=eq.${user.id}&select=*`, { token: recoveryToken });
              const row = rows && rows[0];
              if (row) { setMyId(user.id); setMyProfile(profileFromDb(row)); setForm(profileFromDb(row)); }
              setScreen("matches");
            } catch (e) {
              setNewPasswordErr("Couldn't update your password: " + e.message);
            }
            setNewPasswordBusy(false);
          }} style={{ ...primaryBtn, width:"100%" }}>{newPasswordBusy ? "Saving…" : "Save new password"}</button>
        </div>
      </div>
    );
  }

  if (screen === "welcome") {
    return (
      <div style={page}>
        <FontLoader />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 28px", background:"var(--fc-bg)" }}>
          <div style={{ fontFamily: "Lora, serif", fontSize: 15, letterSpacing: 1, color: "#B8935F", marginBottom: 10 }}>a faith-centered matchmaking app</div>
          <h1 style={{ fontFamily: "Lora, serif", fontSize: 40, lineHeight: 1.15, color: "#F8F4EA", fontWeight: 600, margin: "0 0 18px" }}>
            Built on shared conviction, not just chemistry.
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15.5, color: "#C9C2AF", lineHeight: 1.6, maxWidth: 340 }}>
            FaithConnect matches you by faith, values, hobbies, and what you're looking for in a relationship — not a swipe. Chat, send voice notes, or call once you match.
          </p>

          <div style={{ marginTop:30, maxWidth:340, background:"#5C4520", border:"1.5px solid #9C7A48", borderRadius:16, padding:18 }}>
            <label style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"#F0E6C8", display:"block", marginBottom:8 }}>Log in with your username</label>
            <input value={loginUser} onChange={e=>setLoginUser(e.target.value)} placeholder="Username" style={{ ...input, background:"#3E2E14", color:"#F8F4EA", border:"1.5px solid #9C7A48", marginBottom:8 }} />
            <PasswordInput value={loginPass} onChange={e=>setLoginPass(e.target.value)} onKeyDown={e => e.key === "Enter" && logIn()} placeholder="Password" style={{ ...input, background:"#3E2E14", color:"#F8F4EA", border:"1.5px solid #9C7A48", marginBottom:8 }} />
            <button onClick={logIn} disabled={loginBusy} style={{ ...primaryBtn, width:"100%" }}>{loginBusy ? "Logging in…" : "Log in"}</button>
            {loginErr && <div style={{ color:"#E3A6A6", fontSize:13, fontFamily:"Inter, sans-serif", marginTop:8 }}>{loginErr}</div>}
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:12 }}>
              <button onClick={() => { setRecoveryMode(recoveryMode === "password" ? null : "password"); setRecoveryMsg(""); setRecoveryEmail(""); }} style={{ background:"none", border:"none", color:"#F0E6C8", fontFamily:"Inter, sans-serif", fontSize:12.5, textDecoration:"underline", cursor:"pointer", padding:0 }}>Forgot password?</button>
              <button onClick={() => { setRecoveryMode(recoveryMode === "username" ? null : "username"); setRecoveryMsg(""); setRecoveryEmail(""); }} style={{ background:"none", border:"none", color:"#F0E6C8", fontFamily:"Inter, sans-serif", fontSize:12.5, textDecoration:"underline", cursor:"pointer", padding:0 }}>Forgot username?</button>
            </div>
            {recoveryMode && (
              <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #9C7A48" }}>
                <label style={{ fontFamily:"Inter, sans-serif", fontSize:12.5, color:"#F0E6C8", display:"block", marginBottom:6 }}>
                  {recoveryMode === "password" ? "Enter your email — we'll send a reset link" : "Enter your email — we'll show your username"}
                </label>
                <div style={{ display:"flex", gap:8 }}>
                  <input type="email" value={recoveryEmail} onChange={e=>setRecoveryEmail(e.target.value)} placeholder="you@example.com" style={{ ...input, flex:1, background:"#3E2E14", color:"#F8F4EA", border:"1.5px solid #9C7A48" }} />
                  <button onClick={async () => {
                    if (!recoveryEmail.trim()) return;
                    setRecoveryMsg("Working…");
                    try {
                      if (recoveryMode === "password") {
                        await sendPasswordReset(recoveryEmail);
                        setRecoveryMsg("If that email has an account, a reset link is on its way.");
                      } else {
                        const uname = await lookupUsernameByEmail(recoveryEmail);
                        setRecoveryMsg(uname ? `Your username is: ${uname}` : "No account found with that email.");
                      }
                    } catch (e) { setRecoveryMsg("Something went wrong — try again."); }
                  }} style={{ ...primaryBtn, padding:"10px 16px" }}>Send</button>
                </div>
                {recoveryMsg && <div style={{ color:"#F0E6C8", fontSize:12.5, fontFamily:"Inter, sans-serif", marginTop:8 }}>{recoveryMsg}</div>}
              </div>
            )}
          </div>

          <button onClick={() => setScreen("profile")} style={{ ...secondaryBtn, marginTop: 20, alignSelf: "flex-start", borderColor:"#B8935F", color:"#B8935F" }}>New here? Create your profile</button>
        </div>
      </div>
    );
  }

  if (screen === "profile" && !myProfile) {
    return (
      <div style={page}>
        <FontLoader />
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 22px 100px", background:"var(--fc-bg)" }}>
          <h2 style={heading}>Tell us about you</h2>
          <p style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"#8A8578", lineHeight:1.5, marginTop:-8, marginBottom:18 }}>
            What you share on this page is how we match you with someone else — other members can see it to find out if you're a good match.
          </p>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:8 }}>
            <PhotoSlot label="Profile photo" preview={avatarPreview} existingUrl={form.avatarUrl} emoji={form.avatarEmoji} emojiColor={form.avatarColor} onPick={pickAvatar} big />
            <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:"#B9C9BC", marginTop:8 }}>Or choose a FaithConnect avatar instead:</div>
            <AvatarPicker selected={form.avatarUrl} baseSeed={form.username || form.name} onPick={url => { setAvatarFile(null); setAvatarPreview(null); setForm({ ...form, avatarUrl:url, avatarEmoji:null, avatarColor:null }); }} />
          </div>
          <Field label="Add three pictures of yourself for others to view — optional">
            <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
              {[0,1,2].map(i => (
                <PhotoSlot key={i} label={`Photo ${i+1}`} preview={photoPreviews[i]} existingUrl={form.photoUrls?.[i]} onPick={e=>pickPhoto(i,e)} />
              ))}
            </div>
          </Field>
          <Field label="Username (unique — this is how you log back in)">
            <input style={input} value={form.username||""} onChange={e=>setForm({...form,username:e.target.value})} placeholder="e.g. tony_j24" />
          </Field>
          <Field label="Password (min. 6 characters)">
            <PasswordInput style={input} value={form.password||""} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Choose a password" />
          </Field>
          <Field label="Email — only used if you ever need to reset your password">
            <input type="email" style={input} value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com" />
          </Field>
          <Field label="Name"><input style={input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
          <div style={{ display:"flex", gap: 10 }}>
            <Field label="Age" style={{flex:1}}><input type="number" style={input} value={form.age} onChange={e=>setForm({...form,age:e.target.value})} /></Field>
            <Field label="City" style={{flex:2}}><input style={input} value={form.city} onChange={e=>setForm({...form,city:e.target.value})} /></Field>
          </div>
          <Field label="Gender">
            <select style={input} value={form.gender} onChange={e => { const g = e.target.value; setForm({ ...form, gender: g, seeking: g === "Male" ? "Female" : "Male" }); }}>
              <option>Male</option><option>Female</option>
            </select>
          </Field>
          <Field label="Denomination">
            <select style={input} value={form.denom} onChange={e=>setForm({...form,denom:e.target.value})}>
              {DENOMS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label={`How central is faith to your daily life? (${form.faithLevel}/5)`}>
            <input type="range" min="1" max="5" value={form.faithLevel} onChange={e=>setForm({...form,faithLevel:Number(e.target.value)})} style={{width:"100%"}} />
          </Field>
          <Field label="A bit about you">
            <textarea style={{...input, height: 80, resize:"none"}} value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} placeholder="Share your story, your walk with God, what you're hoping to find…" />
          </Field>
          <Field label="What matters most to you"><Chips list={VALUES} sel={form.values} onToggle={v=>toggle("values",v)} /></Field>
          <Field label="Hobbies & interests"><Chips list={HOBBIES} sel={form.hobbies} onToggle={v=>toggle("hobbies",v)} /></Field>
          <Field label="What are you looking for"><Chips list={GOALS} sel={form.goals} onToggle={v=>toggle("goals",v)} /></Field>
          <Field label="Your personality — pick what fits you"><Chips list={PERSONALITY} sel={form.appearance} onToggle={v=>toggle("appearance",v)} /></Field>
          <Field label="Personality you're drawn to in a partner"><Chips list={PERSONALITY} sel={form.lookPref} onToggle={v=>toggle("lookPref",v)} /></Field>
          {err && <div style={{color:"#B5616B", fontSize:13, marginTop:6}}>{err}</div>}
          <button onClick={saveProfile} style={{...primaryBtn, width:"100%", marginTop: 20}}>Save & find matches</button>
        </div>
      </div>
    );
  }

  if (screen === "chat" && activeConvo) {
    return <ChatScreen myId={myId} myProfile={myProfile} other={activeConvo} onBack={() => setScreen("messages")} />;
  }

  if (screen === "fellowship") {
    return <RandomConnectScreen myId={myId} myProfile={myProfile} onBack={() => setScreen("matches")} variant="faith" />;
  }

  if (screen === "meetSomeone") {
    return <RandomConnectScreen myId={myId} myProfile={myProfile} onBack={() => setScreen("matches")} variant="love" />;
  }

  if (screen === "matchList") {
    return <MatchListScreen matches={matches} myProfile={myProfile} onOpenChat={(id, profile) => { setActiveConvo({ otherId: id, otherProfile: profile }); setScreen("chat"); }} onBack={() => setScreen("matches")} />;
  }

  if (screen === "security") {
    return <SecurityScreen myId={myId} myProfile={myProfile} onBack={() => setScreen("profile")} onUsernameChanged={u => { const updated = { ...myProfile, username: u }; setMyProfile(updated); setForm(updated); }} />;
  }

  if (screen === "profile" && myProfile) {
    return (
      <div style={page}>
        <FontLoader />
        <TopBar onMenu={() => setMenuOpen(true)} dark={!lightMode} overlay={false} onLogo={() => setScreen("matches")} lightMode={lightMode} onToggleTheme={() => setLightMode(v => !v)} />
        <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onLogOut={logOut} onNavigate={setScreen} />
        <div style={{ flex:1, overflowY:"auto", padding:"8px 22px 100px", background:"var(--fc-bg)" }}>
          <div style={{ margin:"0 auto 14px", display:"flex", justifyContent:"center" }}><AvatarCircle profile={myProfile} size={74} fontSize={28} /></div>
          <h2 style={{...heading, textAlign:"center", color:"#F8F4EA"}}>{myProfile.name}, {myProfile.age}</h2>
          <p style={{textAlign:"center", color:"#B9C9BC", fontFamily:"Inter, sans-serif", fontSize:14, marginTop:-8}}>{myProfile.city} · {myProfile.denom}</p>
          {myProfile.photoUrls && myProfile.photoUrls.length > 0 && (
            <div style={{ display:"flex", gap:8, marginTop:16, overflowX:"auto" }}>
              {myProfile.photoUrls.map((u,i) => <img key={i} src={u} alt="" style={{ width:100, height:130, objectFit:"cover", borderRadius:12, flexShrink:0 }} />)}
            </div>
          )}
          <p style={{fontFamily:"Inter, sans-serif", fontSize:14.5, color:"#E4E7E2", lineHeight:1.6, marginTop:18}}>{myProfile.bio}</p>
          <div style={{marginTop:18}}><Tag list={myProfile.values} /></div>
          <div style={{marginTop:8}}><Tag list={myProfile.hobbies} /></div>
          <div style={{marginTop:8}}><Tag list={myProfile.goals} /></div>
          <button onClick={() => setScreen("profile-edit")} style={{...secondaryBtn, width:"100%", marginTop:24}}>Edit profile</button>
        </div>
        {nav}
      </div>
    );
  }

  if (screen === "profile-edit") {
    // reuse the create form but pre-filled, saving overwrites
    return (
      <div style={page}>
        <FontLoader />
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px 100px", background:"var(--fc-bg)" }}>
          <button onClick={()=>setScreen("profile")} style={backBtn}><ChevronLeft size={18}/> Back</button>
          <h2 style={heading}>Edit your profile</h2>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:8 }}>
            <PhotoSlot label="Profile photo" preview={avatarPreview} existingUrl={form.avatarUrl} emoji={form.avatarEmoji} emojiColor={form.avatarColor} onPick={pickAvatar} big />
            <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:"#B9C9BC", marginTop:8 }}>Or choose a FaithConnect avatar instead:</div>
            <AvatarPicker selected={form.avatarUrl} baseSeed={form.username || form.name} onPick={url => { setAvatarFile(null); setAvatarPreview(null); setForm({ ...form, avatarUrl:url, avatarEmoji:null, avatarColor:null }); }} />
          </div>
          <Field label="Add three pictures of yourself for others to view — optional">
            <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
              {[0,1,2].map(i => (
                <PhotoSlot key={i} label={`Photo ${i+1}`} preview={photoPreviews[i]} existingUrl={form.photoUrls?.[i]} onPick={e=>pickPhoto(i,e)} />
              ))}
            </div>
          </Field>
          <Field label="Name"><input style={input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></Field>
          <Field label="Bio"><textarea style={{...input, height:80, resize:"none"}} value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} /></Field>
          <Field label="What matters most to you"><Chips list={VALUES} sel={form.values} onToggle={v=>toggle("values",v)} /></Field>
          <Field label="Hobbies & interests"><Chips list={HOBBIES} sel={form.hobbies} onToggle={v=>toggle("hobbies",v)} /></Field>
          <Field label="What are you looking for"><Chips list={GOALS} sel={form.goals} onToggle={v=>toggle("goals",v)} /></Field>
          <Field label="Your personality"><Chips list={PERSONALITY} sel={form.appearance} onToggle={v=>toggle("appearance",v)} /></Field>
          <Field label="Personality you're drawn to"><Chips list={PERSONALITY} sel={form.lookPref} onToggle={v=>toggle("lookPref",v)} /></Field>
          <button onClick={saveProfile} style={{...primaryBtn, width:"100%", marginTop:20}}>Save changes</button>
        </div>
      </div>
    );
  }

  if (screen === "messages") {
    return (
      <div style={page}>
        <FontLoader />
        <TopBar onMenu={() => setMenuOpen(true)} dark={!lightMode} overlay={false} onLogo={() => setScreen("matches")} lightMode={lightMode} onToggleTheme={() => setLightMode(v => !v)} />
        <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onLogOut={logOut} onNavigate={setScreen} />
        <div style={{ padding: "10px 22px 8px", background:"var(--fc-bg)" }}>
          <button onClick={() => setScreen("matches")} style={{ ...backBtn, color:"#D6AE6E", marginBottom:8 }}><ChevronLeft size={18}/> Back</button>
          <h2 style={{...heading, color:"#F8F4EA"}}>Messages</h2>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"0 16px 100px", background:"var(--fc-bg)" }}>
          {conversations.length === 0 && <div style={{...emptyState, color:"#B9C9BC"}}>No conversations yet. Start one from your matches.</div>}
          {conversations.map(c => (
            <button key={c.otherId} onClick={() => { setActiveConvo({ otherId: c.otherId, otherProfile: c.otherProfile }); setScreen("chat"); }} style={convoRow}>
              <div style={{ marginRight:10 }}><AvatarCircle profile={c.otherProfile} size={38} fontSize={15} /></div>
              <div style={{flex:1, textAlign:"left"}}>
                <div style={{fontFamily:"Lora, serif", fontSize:15.5, color:"#22252B"}}>{c.otherProfile?.name || "Someone"}</div>
                <div style={{fontFamily:"Inter, sans-serif", fontSize:13, color:"#8A8578", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:220}}>
                  {c.last.type === "voice" ? "🎙️ Voice note" : c.last.text}
                </div>
              </div>
            </button>
          ))}
        </div>
        {nav}
      </div>
    );
  }

  // matches (default)
  return (
    <div style={page}>
      <FontLoader />
      <div ref={matchesScrollRef} style={{ flex:1, overflowY:"auto", background:"var(--fc-bg)" }}>
        <div style={{ position:"relative" }}>
          <TopBar onMenu={() => setMenuOpen(true)} dark overlay onLogo={() => setScreen("matches")} lightMode={lightMode} onToggleTheme={() => setLightMode(v => !v)} />
          <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onLogOut={logOut} onNavigate={setScreen} />
          <MatchHero count={matches.length} onMeetSomeone={() => setScreen("meetSomeone")} lightMode={lightMode} />
        </div>

        <div style={{ background:"var(--fc-bg)", padding:"0 0 110px" }}>
          <div style={{ padding:"0 16px" }}>
            <div style={{
              marginTop:18, padding:"25px 18px 18px", borderRadius:26,
              background: lightMode ? "rgba(255,255,255,.94)" : "linear-gradient(145deg, rgba(8,14,34,.92), rgba(14,10,31,.82))",
              border: lightMode ? "1px solid rgba(91,124,170,.16)" : "1px solid rgba(119,105,255,.28)", boxShadow: lightMode ? "0 18px 45px rgba(41,72,110,.12)" : "0 18px 55px rgba(0,0,0,.28)"
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:18 }}>
                <div>
                  <div style={{ fontFamily:"Inter, sans-serif", fontSize:9, letterSpacing:3, color: lightMode ? "#426B9A" : "#8792ff", marginBottom:7 }}>FAITH · CONNECTION · REAL</div>
                  <div style={{ fontFamily:"Lora, serif", fontSize:25, color: lightMode ? "#162D4B" : "#F8F4EA", letterSpacing:-.6 }}>Find Your Match</div>
                </div>
                <div style={{ fontFamily:"cursive", fontSize:18, lineHeight:1.05, color: lightMode ? "#5C70A2" : "#b8a8ff", textAlign:"right", transform:"rotate(-3deg)", paddingBottom:3 }}>
                  God brings<br/>people together
                  <div style={{ width:72, height:2, margin:"4px 0 0 auto", background:"linear-gradient(90deg, transparent, #ff55c8)" }} />
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                <FeatureCard
                  lightMode={lightMode}
                  title="Meet someone"
                  description="Ripples are going out to find your match."
                  gradient="linear-gradient(145deg, rgba(15,22,54,.98), rgba(11,14,35,.98))"
                  Icon={Heart}
                  onConnect={() => setScreen("meetSomeone")}
                />
                <IronSharpensIronCard lightMode={lightMode} onOpen={() => setScreen("fellowship")} />
              </div>
            </div>
          </div>

          <div style={{ padding:"20px 16px 0" }}>
            <TodaysWordCard />
          </div>

          <div style={{ padding:"0 16px" }}>
            {matches.map(({ profile, score }) => (
              <div key={profile.id} style={matchCard}>
                <div style={{display:"flex", gap:14}}>
                  <AvatarCircle profile={profile} size={52} fontSize={20} />
                  <div style={{flex:1}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
                      <div style={{fontFamily:"Lora, serif", fontSize:17, color:"#F8F4EA"}}>{profile.name}, {profile.age}</div>
                      <div style={{fontFamily:"Lora, serif", fontSize:17, color:"#a0aaff", fontWeight:600}}>{score.pct}%</div>
                    </div>
                    <div style={{fontFamily:"Inter, sans-serif", fontSize:13, color:"#858ca1"}}>{profile.city} · {profile.denom}</div>
                  </div>
                </div>
                <p style={{fontFamily:"Inter, sans-serif", fontSize:13.5, color:"#a4aabd", lineHeight:1.5, margin:"10px 0"}}>{profile.bio}</p>
                <Tag list={[...(profile.values||[]).slice(0,2), ...(profile.hobbies||[]).slice(0,2)]} />
                <button onClick={() => { setActiveConvo({ otherId: profile.id, otherProfile: profile }); setScreen("chat"); }} style={{...secondaryBtn, width:"100%", marginTop:12}}>Say hello</button>
              </div>
            ))}
          </div>
        </div>
      </div>
      {nav}
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      <label style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"#C9C2AF", display:"block", marginBottom:6 }}>{label}</label>
      {children}
    </div>
  );
}
function Chips({ list, sel, onToggle }) {
  return <div>{list.map(v => <Chip key={v} label={v} active={sel?.includes(v)} onClick={() => onToggle(v)} />)}</div>;
}
function Tag({ list }) {
  if (!list || !list.length) return null;
  return <div>{list.filter(Boolean).map(t => (
    <span key={t} style={{ display:"inline-block", fontSize:12, fontFamily:"Inter, sans-serif", color:"#F8F4EA", background:"rgba(96,112,255,0.18)", border:"1px solid rgba(108,124,255,0.3)", padding:"4px 10px", borderRadius:999, marginRight:6, marginBottom:6 }}>{t}</span>
  ))}</div>;
}
function FontLoader() {
  return <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');`}</style>;
}

function TopBar({ onMenu, dark, overlay, onLogo, lightMode, onToggleTheme }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 16px 4px",
      position: overlay ? "absolute" : "static", top:0, left:0, right:0, zIndex: overlay ? 5 : "auto"
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <button onClick={onMenu} style={{ background:"none", border:"none", cursor:"pointer", padding:8, display:"flex", marginLeft:-8 }}>
          <Menu size={20} color={dark ? "#F8F4EA" : "#22252B"} />
        </button>
        <button onClick={onLogo} style={{ background:"none", border:"none", cursor:"pointer", padding:0, display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:11, background:ACCENT_GRADIENT, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 20px rgba(105,101,255,.45)" }}>
            <Heart size={17} color="#fff" fill="#fff" />
          </div>
          <div style={{ textAlign:"left" }}>
            <div style={{ fontFamily:"Inter, sans-serif", fontWeight:700, fontSize:15, color: dark ? "#F8F4EA" : "#22252B", letterSpacing:-0.3 }}>FaithConnect</div>
            <div style={{ fontFamily:"Inter, sans-serif", fontSize:7.5, letterSpacing:1.5, color: dark ? "#737b92" : "#8A8578" }}>CONNECT • GROW • BELIEVE</div>
          </div>
        </button>
      </div>
      <button type="button" onClick={onToggleTheme} aria-label={lightMode ? "Switch to dark mode" : "Switch to light mode"} title={lightMode ? "Dark mode" : "Light mode"} style={{
        width:86, height:40, padding:3, borderRadius:999,
        background: lightMode ? "rgba(255,255,255,.78)" : "rgba(12,20,45,.72)",
        border: lightMode ? "1px solid rgba(22,35,63,.14)" : "1px solid rgba(255,255,255,.14)",
        display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer",
        boxShadow: lightMode ? "0 7px 22px rgba(22,35,63,.12)" : "0 8px 24px rgba(0,0,0,.24)",
        backdropFilter:"blur(12px)"
      }}>
        <span style={{ width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background: lightMode ? "#E9F3FF" : "transparent", boxShadow: lightMode ? "0 2px 8px rgba(40,100,180,.18)" : "none" }}>
          <Sun size={18} color={lightMode ? "#246BFF" : "#F8D27A"} />
        </span>
        <span style={{ width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", background: !lightMode ? "#315DFF" : "transparent", boxShadow: !lightMode ? "0 2px 10px rgba(49,93,255,.35)" : "none" }}>
          <Moon size={18} color={!lightMode ? "#fff" : "#52617A"} />
        </span>
      </button>
    </div>
  );
}

function MenuDrawer({ open, onClose, onLogOut, onNavigate }) {
  const [inviteMsg, setInviteMsg] = useState("");
  const items = [
    { icon: Home, label: "Home", action: () => onNavigate("matches") },
    { icon: Heart, label: "Connect", action: () => onNavigate("meetSomeone") },
    { icon: Percent, label: "See who you match with", action: () => onNavigate("matchList") },
    { icon: BibleIcon, label: "Share", action: () => onNavigate("fellowship") },
    { icon: MessageCircle, label: "Messages", action: () => onNavigate("messages") },
    { icon: User, label: "Profile", action: () => onNavigate("profile") },
    { icon: Shield, label: "Security", action: () => onNavigate("security") },
    { icon: UserPlus, label: "Invite a friend", action: async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setInviteMsg("Link copied — share it with a friend!");
        } catch { setInviteMsg("Copy this page's link from your browser to invite a friend."); }
        setTimeout(() => setInviteMsg(""), 3000);
      } },
  ];
  return (
    <>
      <div onClick={onClose} style={{
        position:"fixed", inset:0, background:"rgba(15,23,46,0.5)", zIndex:20,
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition:"opacity .25s"
      }} />
      <div style={{
        position:"fixed", top:0, left:0, bottom:0, width:260, background:"var(--fc-bg)", zIndex:21,
        transform: open ? "translateX(0)" : "translateX(-100%)", transition:"transform .28s ease", padding:"22px 18px", boxShadow:"2px 0 20px rgba(0,0,0,.3)"
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <span style={{ fontFamily:"Lora, serif", fontSize:19, color:"#F8F4EA" }}>FaithConnect</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={20} color="#C9C2AF" /></button>
        </div>
        {items.map(({ icon: Icon, label, action, note }) => (
          <button key={label} onClick={() => { action(); if (!note) onClose(); }} style={{
            display:"flex", alignItems:"center", gap:12, width:"100%", background:"none", border:"none",
            padding:"12px 4px", cursor:"pointer", color:"#E8E3D6", fontFamily:"Inter, sans-serif", fontSize:14.5, textAlign:"left"
          }}>
            <Icon size={18} color="#B8935F" /> {label}
            {note && <span style={{ marginLeft:"auto", fontSize:11, color:"#6B7690" }}>{note}</span>}
          </button>
        ))}
        {inviteMsg && <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:"#8AAE8E", padding:"4px 4px 0" }}>{inviteMsg}</div>}
        <div style={{ borderTop:"1px solid #6B5327", marginTop:14, paddingTop:14 }}>
          <button onClick={onLogOut} style={{
            display:"flex", alignItems:"center", gap:12, width:"100%", background:"none", border:"none",
            padding:"12px 4px", cursor:"pointer", color:"#D9A6A6", fontFamily:"Inter, sans-serif", fontSize:14.5, textAlign:"left"
          }}>
            <LogOut size={18} color="#D9A6A6" /> Log out
          </button>
        </div>
      </div>
    </>
  );
}

function MatchHero({ count, onMeetSomeone, lightMode }) {
  return (
    <div style={{
      position:"relative", minHeight:500, overflow:"hidden", display:"flex", alignItems:"flex-end",
      padding:"0 22px 42px", boxSizing:"border-box",
      background: lightMode ? "#cfe9fb" : "#050819"
    }}>
      <img
        src={lightMode ? FAITHCONNECT_LIGHT_HERO : FAITHCONNECT_HERO}
        alt={lightMode ? "Couple overlooking a mountain valley" : "Couple watching a sunset together on the beach"}
        style={{
          position:"absolute", inset:0, width:"100%", height:"100%",
          objectFit:"cover", objectPosition:"center center", pointerEvents:"none",
          filter: lightMode ? "brightness(.92) saturate(.88) contrast(1.02)" : "saturate(1.08) contrast(1.03)"
        }}
      />
      {lightMode && <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:
        "linear-gradient(180deg, rgba(190,225,250,.12) 0%, rgba(255,255,255,.04) 35%, rgba(255,255,255,.06) 58%, rgba(7,18,39,.72) 100%)" }} />}
      {!lightMode && <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:
        "linear-gradient(90deg, rgba(4,8,22,.90) 0%, rgba(4,8,22,.58) 38%, rgba(4,8,22,.08) 72%, rgba(4,8,22,.12) 100%), linear-gradient(180deg, rgba(3,6,18,.18) 0%, rgba(3,6,18,.08) 48%, rgba(3,6,18,.88) 100%)" }} />}

      <div style={{ position:"relative", zIndex:2, width:"100%", maxWidth:360 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:15 }}>
          <span style={{ width:27, height:2, background:"linear-gradient(90deg,#526cff,#8d5cff)" }} />
          <span style={{ fontFamily:"Inter, sans-serif", fontSize:9, letterSpacing:3, color: lightMode ? "#17324b" : "#d2d4e4", textShadow: lightMode ? "0 1px 5px rgba(255,255,255,.8)" : "0 2px 8px rgba(0,0,0,.45)" }}>FAITH CONNECT</span>
        </div>
        <h1 style={{ fontFamily:"Lora, serif", fontSize:22, lineHeight:1.22, letterSpacing:0.2, fontStyle:"italic", fontWeight:600, color: lightMode ? "#102B49" : "#F8F4EA", margin:"0 0 14px", maxWidth:330, textShadow: lightMode ? "0 2px 10px rgba(255,255,255,.92)" : "0 2px 14px rgba(0,0,0,.55)" }}>
          <span>Shared Faith.</span><br/>
          <span>Meaningful Connection.</span><br/>
          <span style={{ color: lightMode ? "#2B64E8" : "#c7b1ff" }}>Growing Together.</span>
        </h1>
        <p style={{ fontFamily:"Inter, sans-serif", fontSize:14, lineHeight:1.5, color: lightMode ? "#173B5A" : "#d0d3df", margin:"0 0 18px", maxWidth:330, fontWeight:500, textShadow: lightMode ? "0 1px 7px rgba(255,255,255,.88)" : "0 2px 8px rgba(0,0,0,.45)" }}>
          Meet someone who shares your faith, values, and desire to grow.
        </p>
      </div>
    </div>
  );
}

function SecurityScreen({ myId, myProfile, onBack, onUsernameChanged }) {
  const [newUsername, setNewUsername] = useState(myProfile?.username || "");
  const [usernameMsg, setUsernameMsg] = useState("");
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [newPass, setNewPass] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [passBusy, setPassBusy] = useState(false);

  async function changeUsername() {
    setUsernameMsg("");
    const uname = newUsername.trim().toLowerCase().replace(/\s+/g, "");
    if (!uname) { setUsernameMsg("Enter a username."); return; }
    if (uname === myProfile.username) { setUsernameMsg("That's already your username."); return; }
    setUsernameBusy(true);
    try {
      const session = await restoreSupaSession();
      if (!session) { setUsernameMsg("Your session expired — please log in again."); setUsernameBusy(false); return; }
      const existing = await supaRest(`usernames?username=eq.${encodeURIComponent(uname)}&select=username`);
      if (existing && existing.length) { setUsernameMsg("That username is taken — try another."); setUsernameBusy(false); return; }
      await supaRest(`usernames?username=eq.${encodeURIComponent(myProfile.username)}`, { method: "PATCH", token: session.access_token, body: { username: uname }, extraHeaders: { Prefer: "return=minimal" } });
      await supaRest(`profiles?id=eq.${myId}`, { method: "PATCH", token: session.access_token, body: { username: uname }, extraHeaders: { Prefer: "return=minimal" } });
      onUsernameChanged(uname);
      setUsernameMsg("Username updated!");
    } catch (e) {
      setUsernameMsg("Couldn't update username: " + e.message);
    }
    setUsernameBusy(false);
  }

  async function changePassword() {
    setPassMsg("");
    if (!newPass || newPass.length < 6) { setPassMsg("Password must be at least 6 characters."); return; }
    setPassBusy(true);
    try {
      const session = await restoreSupaSession();
      if (!session) { setPassMsg("Your session expired — please log in again."); setPassBusy(false); return; }
      await supaAuthUpdateUser(session.access_token, { password: newPass });
      setNewPass("");
      setPassMsg("Password updated!");
    } catch (e) {
      setPassMsg("Couldn't update password: " + e.message);
    }
    setPassBusy(false);
  }

  return (
    <div style={page}>
      <FontLoader />
      <div style={{ padding:"18px 22px 8px", background:"var(--fc-bg)" }}>
        <button onClick={onBack} style={{ ...backBtn, color:"#D6AE6E", marginBottom:10 }}><ChevronLeft size={18}/> Back</button>
        <h2 style={{ ...heading, color:"#F8F4EA" }}>Security</h2>
        <p style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:"#C9C2AF", margin:"0 0 16px" }}>Change your username or password anytime.</p>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"0 22px 100px", background:"var(--fc-bg)" }}>
        <div style={{ background:"#5C4520", border:"1.5px solid #9C7A48", borderRadius:16, padding:18, marginBottom:16 }}>
          <label style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"#F0E6C8", display:"block", marginBottom:8 }}>Username</label>
          <input value={newUsername} onChange={e=>setNewUsername(e.target.value)} style={{ ...input, background:"#3E2E14", color:"#F8F4EA", border:"1.5px solid #9C7A48", marginBottom:10 }} />
          <button disabled={usernameBusy} onClick={changeUsername} style={{ ...primaryBtn, width:"100%" }}>{usernameBusy ? "Saving…" : "Update username"}</button>
          {usernameMsg && <div style={{ color:"#F0E6C8", fontSize:12.5, fontFamily:"Inter, sans-serif", marginTop:8 }}>{usernameMsg}</div>}
        </div>
        <div style={{ background:"#5C4520", border:"1.5px solid #9C7A48", borderRadius:16, padding:18 }}>
          <label style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"#F0E6C8", display:"block", marginBottom:8 }}>New password</label>
          <PasswordInput value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Min. 6 characters" style={{ ...input, background:"#3E2E14", color:"#F8F4EA", border:"1.5px solid #9C7A48", marginBottom:10 }} />
          <button disabled={passBusy} onClick={changePassword} style={{ ...primaryBtn, width:"100%" }}>{passBusy ? "Saving…" : "Update password"}</button>
          {passMsg && <div style={{ color:"#F0E6C8", fontSize:12.5, fontFamily:"Inter, sans-serif", marginTop:8 }}>{passMsg}</div>}
        </div>
      </div>
    </div>
  );
}

function MatchListScreen({ matches, myProfile, onOpenChat, onBack }) {
  const [reveal, setReveal] = useState(null); // { profile, score } | null
  return (
    <div style={page}>
      <FontLoader />
      <div style={{ padding:"18px 16px 4px", background:"var(--fc-bg)" }}>
        <button onClick={onBack} style={{ ...backBtn, color:"#B8935F", marginBottom:10 }}><ChevronLeft size={18}/> Back</button>
        <h2 style={{ fontFamily:"Lora, serif", fontSize:22, color:"#F8F4EA", margin:"0 0 4px" }}>See who you match with</h2>
        <p style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:"#B9C9BC", margin:"0 0 16px" }}>Tap someone to reveal your match %</p>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 100px", background:"var(--fc-bg)", display:"flex", flexWrap:"wrap", gap:12, alignContent:"flex-start" }}>
        {matches.length === 0 && <div style={emptyState}>No matches yet — check back once more people join.</div>}
        {matches.map(({ profile, score }) => (
          <button key={profile.id} onClick={() => setReveal({ profile, score })} style={{
            width:"calc(50% - 6px)", borderRadius:16, overflow:"hidden", border:"1.5px solid #9C7A48",
            background:"#3E2E14", cursor:"pointer", padding:0, textAlign:"left"
          }}>
            <div style={{ width:"100%", aspectRatio:"1", background: profile.avatarUrl ? `center/cover url(${profile.avatarUrl})` : (profile.avatarEmoji ? profile.avatarColor : "#5C4520"), display:"flex", alignItems:"center", justifyContent:"center", fontSize:34 }}>
              {!profile.avatarUrl && (profile.avatarEmoji || <span style={{ fontFamily:"Lora, serif", fontSize:34, color:"#D6AE6E" }}>{profile.name?.[0]?.toUpperCase()}</span>)}
            </div>
            <div style={{ padding:"8px 10px" }}>
              <div style={{ fontFamily:"Lora, serif", fontSize:15, color:"#F8F4EA" }}>{profile.name}, {profile.age}</div>
              <div style={{ fontFamily:"Inter, sans-serif", fontSize:11.5, color:"#C9C2AF" }}>{profile.city}</div>
            </div>
          </button>
        ))}
      </div>
      {reveal && (
        <MatchRevealOverlay
          myProfile={myProfile}
          other={reveal.profile}
          score={reveal.score}
          onClose={() => setReveal(null)}
          onSayHello={() => { onOpenChat(reveal.profile.id, reveal.profile); setReveal(null); }}
        />
      )}
    </div>
  );
}

function MatchRevealOverlay({ myProfile, other, score, onClose, onSayHello }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const duration = 1600;
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 2);
      setCount(Math.round(eased * score.pct));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score.pct]);

  function Avatar({ p }) {
    return (
      <div style={{ border:"3px solid #D6AE6E", borderRadius:"50%", boxShadow:"0 4px 16px rgba(0,0,0,.4)" }}>
        <AvatarCircle profile={p} size={82} fontSize={32} />
      </div>
    );
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"var(--fc-bg)", zIndex:50, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
      <FontLoader />
      <button onClick={onClose} style={{ position:"absolute", top:20, left:16, background:"none", border:"none", cursor:"pointer" }}><X size={24} color="#F8F4EA" /></button>
      <div style={{ display:"flex", alignItems:"center", gap:20 }}>
        <div style={{ textAlign:"center" }}>
          <Avatar p={myProfile} />
          <div style={{ color:"#F8F4EA", marginTop:8, fontFamily:"Lora, serif", fontSize:14 }}>{myProfile.name}</div>
        </div>
        <Heart size={28} color="#D6AE6E" fill="#D6AE6E" />
        <div style={{ textAlign:"center" }}>
          <Avatar p={other} />
          <div style={{ color:"#F8F4EA", marginTop:8, fontFamily:"Lora, serif", fontSize:14 }}>{other.name}</div>
        </div>
      </div>
      <div style={{ fontFamily:"Lora, serif", fontSize:64, color:"#D6AE6E", marginTop:32, fontWeight:700 }}>{count}%</div>
      <div style={{ fontFamily:"Inter, sans-serif", fontSize:14, color:"#C9C2AF", marginTop:-6 }}>match</div>
      <button onClick={onSayHello} style={{ ...ctaBtn, marginTop:32 }}>Say hello <ArrowRight size={18} /></button>
    </div>
  );
}

function FeatureCard({ title, description, gradient, Icon, onConnect, lightMode }) {
  return (
    <div style={{
      position:"relative", minHeight:174, borderRadius:22, overflow:"hidden",
      background: lightMode ? "linear-gradient(145deg,#ffffff,#eef5ff)" : gradient,
      border: lightMode ? "1px solid rgba(66,104,158,.14)" : "1px solid rgba(111,124,255,.25)",
      boxShadow: lightMode ? "0 12px 28px rgba(41,72,110,.12)" : "inset 0 0 35px rgba(86,76,255,.08), 0 12px 30px rgba(0,0,0,.22)"
    }}>
      <style>{`@keyframes fc-ripple { 0% { transform: translateX(-30%) scaleX(.7); opacity:.1 } 50% { opacity:.8 } 100% { transform: translateX(18%) scaleX(1.12); opacity:.08 } } @keyframes fc-pulse { 0%,100% { transform:scale(.96); box-shadow:0 0 16px rgba(255,85,201,.35) } 50% { transform:scale(1.04); box-shadow:0 0 32px rgba(255,85,201,.75) } }`}</style>
      <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            position:"absolute", right:-80+i*18, top:30+i*22, width:390, height:55,
            borderTop:`1px solid rgba(${i===3?255:150},${i===3?75:110},${i===3?205:255},${.38-i*.05})`,
            borderRadius:"50%", transform:"rotate(-5deg)", filter:"blur(.2px)", animation:`fc-ripple ${4.8+i*.45}s ease-in-out ${i*.25}s infinite alternate`
          }} />
        ))}
      </div>
      <div style={{ position:"relative", zIndex:2, display:"flex", alignItems:"center", height:"100%", padding:"24px 20px", gap:18 }}>
        <div style={{ width:76, height:76, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid rgba(255,91,209,.9)", background:"rgba(10,12,35,.72)", animation:"fc-pulse 3.2s ease-in-out infinite", position:"relative" }}>
          <div style={{ position:"absolute", inset:-9, borderRadius:"50%", border:"1px solid rgba(124,90,255,.38)" }} />
          <Icon size={34} color="#ff72c8" fill={Icon === Heart ? "#ff72c8" : "none"} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"Lora, serif", fontWeight:600, fontSize:20, color: lightMode ? "#162D4B" : "#F8F4EA", marginBottom:7 }}>{title}</div>
          <p style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color: lightMode ? "#526B86" : "#bfc4d8", lineHeight:1.45, margin:"0 0 14px", maxWidth:250 }}>{description}</p>
          <button onClick={onConnect} style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8, padding:"9px 16px", borderRadius:999, border: lightMode ? "1px solid #4A72E8" : "1px solid #ff5cb0", color:"#fff", background: lightMode ? "linear-gradient(100deg,#3D73FF,#6758FF)" : "rgba(15,10,30,.42)", boxShadow:"0 0 14px rgba(255,92,176,.16)", fontFamily:"Inter, sans-serif", fontSize:12.5, fontWeight:600, cursor:"pointer" }}>
            Meet someone <ArrowRight size={15}/>
          </button>
        </div>
      </div>
    </div>
  );
}

const DAILY_BIBLE_VERSES = [
  { text:"I can do all things through Christ which strengtheneth me.", ref:"Philippians 4:13" },
  { text:"Trust in the LORD with all thine heart; and lean not unto thine own understanding.", ref:"Proverbs 3:5" },
  { text:"The LORD is my shepherd; I shall not want.", ref:"Psalm 23:1" },
  { text:"Be strong and of a good courage; fear not, nor be afraid.", ref:"Deuteronomy 31:6" },
  { text:"This is the day which the LORD hath made; we will rejoice and be glad in it.", ref:"Psalm 118:24" },
  { text:"Let all your things be done with charity.", ref:"1 Corinthians 16:14" },
  { text:"The LORD is my light and my salvation; whom shall I fear?", ref:"Psalm 27:1" },
  { text:"Cast thy burden upon the LORD, and he shall sustain thee.", ref:"Psalm 55:22" },
  { text:"And above all things have fervent charity among yourselves.", ref:"1 Peter 4:8" },
  { text:"Rejoice in the Lord alway: and again I say, Rejoice.", ref:"Philippians 4:4" },
  { text:"For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.", ref:"2 Timothy 1:7" },
  { text:"Commit thy works unto the LORD, and thy thoughts shall be established.", ref:"Proverbs 16:3" },
  { text:"The LORD is nigh unto all them that call upon him.", ref:"Psalm 145:18" },
  { text:"Let your light so shine before men, that they may see your good works.", ref:"Matthew 5:16" },
  { text:"My grace is sufficient for thee: for my strength is made perfect in weakness.", ref:"2 Corinthians 12:9" },
  { text:"Wait on the LORD: be of good courage, and he shall strengthen thine heart.", ref:"Psalm 27:14" },
  { text:"A friend loveth at all times.", ref:"Proverbs 17:17" },
  { text:"Iron sharpeneth iron; so a man sharpeneth the countenance of his friend.", ref:"Proverbs 27:17" }
];

function getDailyVerse() {
  const now = new Date();
  const dayKey = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000;
  const index = Math.floor(dayKey) % DAILY_BIBLE_VERSES.length;
  return DAILY_BIBLE_VERSES[index];
}

function TodaysWordCard() {
  const verse = getDailyVerse();
  return (
    <div style={{ position:"relative", background:"linear-gradient(120deg,#15182b,#080a15)", border:"1px solid rgba(255,255,255,.08)", borderRadius:22, padding:"24px", overflow:"hidden", marginBottom:16 }}>
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at 80% 20%, rgba(130,103,255,.2), transparent 35%)", pointerEvents:"none" }} />
      <div style={{ position:"relative" }}>
        <div style={{ fontFamily:"Inter, sans-serif", fontSize:9, letterSpacing:3, color:"#7887e8", marginBottom:13 }}>TODAY'S WORD</div>
        <div style={{ fontSize:24, color:"#ff72c8", textShadow:"0 0 20px rgba(255,114,200,.55)", marginBottom:12 }}>♡</div>
        <h3 style={{ fontFamily:"Lora, serif", fontSize:19, lineHeight:1.35, fontWeight:500, color:"#F8F4EA", margin:0 }}>
          “{verse.text}”
        </h3>
        <p style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:"#757d95", marginTop:11 }}>{verse.ref}</p>
      </div>
    </div>
  );
}

function IronSharpensIronCard({ onOpen, lightMode }) {
  return (
    <div style={{
      position:"relative", minHeight:148, borderRadius:22, overflow:"hidden",
      border:"1px solid rgba(255,255,255,.13)", cursor:"pointer",
      background: lightMode ? "linear-gradient(135deg,#ffffff,#f0f5fb)" : "linear-gradient(90deg, rgba(17,16,35,.98) 0%, rgba(33,23,33,.82) 42%, rgba(58,36,28,.72) 100%)",
      border: lightMode ? "1px solid rgba(66,104,158,.14)" : "1px solid rgba(255,255,255,.13)",
      boxShadow: lightMode ? "0 12px 30px rgba(41,72,110,.12)" : "0 12px 30px rgba(0,0,0,.22)"
    }} onClick={onOpen}>
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(circle at 72% 45%, rgba(255,173,74,.18), transparent 32%), linear-gradient(90deg, transparent 35%, rgba(0,0,0,.12), rgba(0,0,0,.55))" }} />
      <div style={{ position:"absolute", right:-18, top:-8, width:230, height:170, opacity:.55, transform:"rotate(-8deg)", background:"linear-gradient(160deg, rgba(116,72,42,.9), rgba(35,22,20,.95))", borderRadius:"8px 40px 12px 8px", boxShadow:"inset 0 0 25px rgba(255,190,100,.2)" }} />
      <div style={{ position:"relative", zIndex:2, display:"flex", alignItems:"center", minHeight:148, padding:"20px", gap:17 }}>
        <div style={{ width:62, height:62, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(188,19,77,.34)", border:"1px solid #ff3b91", boxShadow:"0 0 24px rgba(255,46,144,.3)" }}>
          <ArrowRight size={25} color="#fff" />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"Lora, serif", fontWeight:600, fontSize:19, color:lightMode ? "#162D4B" : "#F8F4EA", marginBottom:6 }}>Iron Sharpens Iron</div>
          <p style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:lightMode ? "#526B86" : "#c8c7d4", lineHeight:1.4, margin:"0 0 14px", maxWidth:260 }}>Meet a random believer and share about your faith.</p>
          <span style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"8px 15px", borderRadius:999, border:lightMode ? "1px solid #4A72E8" : "1px solid #ff5cb0", color:"#fff", background:lightMode ? "linear-gradient(100deg,#3D73FF,#6758FF)" : "rgba(15,10,30,.4)", fontFamily:"Inter, sans-serif", fontSize:12.5, fontWeight:600 }}>Share with someone <ArrowRight size={15}/></span>
        </div>
      </div>
    </div>
  );
}
/* ---------------- CHAT + CALL SCREEN ---------------- */
function ChatScreen({ myId, myProfile, other, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [callMode, setCallMode] = useState(null); // null | 'incoming' | 'audio' | 'video'
  const [callStatus, setCallStatus] = useState("idle"); // idle, calling, ringing, active, ended
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [callErr, setCallErr] = useState("");

  const cid = convoId(myId, other.otherId);
  const chatKey = `chat:${cid}`;
  const callKey = `call:${cid}`;
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const bottomRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const iceSeen = useRef(0);
  const pollRef = useRef(null);
  const callPollRef = useRef(null);
  const inCallScreen = useRef(false);

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 2500);
    callPollRef.current = setInterval(pollCall, 1800);
    return () => { clearInterval(pollRef.current); clearInterval(callPollRef.current); teardown(); };
    // eslint-disable-next-line
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function loadMessages() {
    const thread = await sget(chatKey, true);
    setMessages(thread || []);
  }

  async function sendMessage(type, content) {
    const thread = (await sget(chatKey, true)) || [];
    thread.push({ sender: myId, type, text: type === "text" ? content : undefined, content: type === "voice" ? content : undefined, ts: Date.now() });
    await sset(chatKey, thread, true);
    setMessages(thread);
    setText("");
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = e => chunks.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => sendMessage("voice", reader.result);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorder.current = mr;
      setRecording(true);
    } catch { setCallErr("Microphone access was blocked — voice notes need mic permission."); }
  }
  function stopRecording() { mediaRecorder.current?.stop(); setRecording(false); }

  const iceCfg = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

  async function startCall(mode) {
    setCallErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" });
      localStreamRef.current = stream;
      if (mode === "video" && localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = new RTCPeerConnection(iceCfg);
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const remoteStream = new MediaStream();
      pc.ontrack = e => { remoteStream.addTrack(e.track); if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream; if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream; };
      const myIce = [];
      pc.onicecandidate = e => { if (e.candidate) { myIce.push(e.candidate); sset(callKey, { ...(cur.current||{}), iceCaller: myIce }, true); } };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      cur.current = { caller: myId, mode, offer, iceCaller: [], iceCallee: [], answer: null, status: "ringing" };
      await sset(callKey, cur.current, true);
      setCallMode(mode); setCallStatus("calling"); inCallScreen.current = true;
    } catch { setCallErr("Couldn't access camera/microphone for the call."); }
  }

  const cur = useRef(null);
  const answeredIce = useRef(new Set());

  async function pollCall() {
    const state = await sget(callKey, true);
    if (!state) return;
    cur.current = state;
    if (state.status === "ringing" && state.caller !== myId && !inCallScreen.current) {
      setCallMode(state.mode); setCallStatus("ringing"); inCallScreen.current = true;
      return;
    }
    if (state.status === "active" && callStatus !== "active" && pcRef.current) {
      // caller side: apply answer once
      if (state.answer && pcRef.current.signalingState !== "stable") {
        try { await pcRef.current.setRemoteDescription(state.answer); } catch {}
      }
      setCallStatus("active");
    }
    // apply new ICE candidates
    if (pcRef.current) {
      const remoteList = (state.caller === myId ? state.iceCallee : state.iceCaller) || [];
      for (let i = answeredIce.current.size; i < remoteList.length; i++) {
        try { await pcRef.current.addIceCandidate(remoteList[i]); } catch {}
        answeredIce.current.add(i);
      }
    }
    if (state.status === "ended" && callStatus !== "idle" && callStatus !== "ended") {
      endCallLocal();
    }
  }

  async function acceptCall() {
    setCallErr("");
    try {
      const state = cur.current || await sget(callKey, true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: state.mode === "video" });
      localStreamRef.current = stream;
      if (state.mode === "video" && localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = new RTCPeerConnection(iceCfg);
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const remoteStream = new MediaStream();
      pc.ontrack = e => { remoteStream.addTrack(e.track); if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream; if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream; };
      const myIce = [];
      pc.onicecandidate = e => { if (e.candidate) { myIce.push(e.candidate); sset(callKey, { ...cur.current, iceCallee: myIce }, true); } };
      await pc.setRemoteDescription(state.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      cur.current = { ...state, answer, iceCallee: [], status: "active" };
      await sset(callKey, cur.current, true);
      setCallStatus("active");
    } catch { setCallErr("Couldn't join the call — camera/mic may be blocked."); }
  }

  function declineCall() { setCallMode(null); setCallStatus("idle"); inCallScreen.current = false; sset(callKey, { ...(cur.current||{}), status: "ended" }, true); }

  function teardown() {
    pcRef.current?.close(); pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null;
  }
  function endCallLocal() {
    teardown(); setCallStatus("idle"); setCallMode(null); inCallScreen.current = false; answeredIce.current = new Set();
  }
  async function hangUp() {
    await sset(callKey, { ...(cur.current||{}), status: "ended" }, true);
    endCallLocal();
  }

  if (callMode && callStatus !== "idle") {
    return (
      <div style={{ ...page, background: "#0A0F0A" }}>
        <FontLoader />
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative" }}>
          {callMode === "video" ? (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", background:"#0A0F0A" }} />
              <video ref={localVideoRef} autoPlay playsInline muted style={{ position:"absolute", bottom:110, right:16, width:100, height:140, borderRadius:14, objectFit:"cover", border:"2px solid #B8935F" }} />
            </>
          ) : (
            <>
              <audio ref={remoteAudioRef} autoPlay />
              <div style={{ width:120, height:120, borderRadius:"50%", background:"#B8935F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Lora, serif", fontSize:42, color:"#2A1F0E" }}>
                {other.otherProfile?.name?.[0]?.toUpperCase()}
              </div>
            </>
          )}
          <div style={{ position:"absolute", top:40, color:"#F8F4EA", fontFamily:"Lora, serif", fontSize:19, textAlign:"center" }}>
            {other.otherProfile?.name}
            <div style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"#B8935F", marginTop:4 }}>
              {callStatus === "calling" && "Calling…"}
              {callStatus === "ringing" && "Incoming call"}
              {callStatus === "active" && "Connected"}
            </div>
          </div>
          {callErr && <div style={{position:"absolute", bottom:190, color:"#E3A6A6", fontSize:12.5, fontFamily:"Inter, sans-serif", textAlign:"center", padding:"0 30px"}}>{callErr}</div>}
          <div style={{ position:"absolute", bottom:30, display:"flex", gap:18 }}>
            {callStatus === "ringing" ? (
              <>
                <button onClick={declineCall} style={callBtn("#B5616B")}><X size={22} color="#fff" /></button>
                <button onClick={acceptCall} style={callBtn("#6E8F72")}><Check size={22} color="#fff" /></button>
              </>
            ) : (
              <>
                <button onClick={() => { localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !micOn); setMicOn(!micOn); }} style={callBtn(micOn ? "#5C4520" : "#B5616B")}>
                  {micOn ? <Mic size={20} color="#fff"/> : <MicOff size={20} color="#fff"/>}
                </button>
                {callMode === "video" && (
                  <button onClick={() => { localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = !camOn); setCamOn(!camOn); }} style={callBtn(camOn ? "#5C4520" : "#B5616B")}>
                    {camOn ? <Camera size={20} color="#fff"/> : <VideoOff size={20} color="#fff"/>}
                  </button>
                )}
                <button onClick={hangUp} style={callBtn("#B5616B")}><PhoneOff size={20} color="#fff" /></button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <FontLoader />
      <div style={chatHeader}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", padding:6, marginRight:4 }}><ChevronLeft size={22} color="#F8F4EA" /></button>
        <div style={{ ...avatarSm, background:"#B8935F" }}>{other.otherProfile?.name?.[0]?.toUpperCase() || "?"}</div>
        <div style={{ flex:1, fontFamily:"Lora, serif", fontSize:16.5, color:"#F8F4EA" }}>{other.otherProfile?.name || "Someone"}</div>
        <button onClick={() => startCall("audio")} style={iconBtn}><Phone size={19} color="#F8F4EA" /></button>
        <button onClick={() => startCall("video")} style={iconBtn}><Video size={19} color="#F8F4EA" /></button>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 14px", background:"var(--fc-bg)", display:"flex", flexDirection:"column" }}>
        {messages.length === 0 && <div style={emptyState}>Say hello — your conversation starts here.</div>}
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.sender === myId ? "flex-end" : "flex-start", maxWidth:"75%", marginBottom:10 }}>
            <div style={{ background: m.sender === myId ? "#B8935F" : "#EFE9DC", color: m.sender === myId ? "#FAF7F0" : "#22252B", padding:"9px 13px", borderRadius: 16, fontFamily:"Inter, sans-serif", fontSize:14.5 }}>
              {m.type === "voice" ? <audio controls src={m.content} style={{height:34, maxWidth:200}} /> : m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {callErr && <div style={{fontSize:12, color:"#B5616B", fontFamily:"Inter, sans-serif", padding:"4px 14px", background:"var(--fc-bg)"}}>{callErr}</div>}
      <div style={composer}>
        <button onClick={recording ? stopRecording : startRecording} style={{ ...iconBtnLight, background: recording ? "#B5616B" : "#EFE9DC" }}>
          {recording ? <Square size={17} color="#fff" /> : <Mic size={18} color="#4A4A45" />}
        </button>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && text.trim()) sendMessage("text", text.trim()); }} placeholder="Type a message…" style={{ flex:1, border:"none", outline:"none", fontFamily:"Inter, sans-serif", fontSize:14.5, background:"transparent", padding:"10px 4px" }} />
        <button onClick={() => text.trim() && sendMessage("text", text.trim())} style={iconBtnLight}><Send size={18} color="#B8935F" /></button>
      </div>
    </div>
  );
}

/* ---------------- FELLOWSHIP (random believer connect) ---------------- */
function RandomConnectScreen({ myId, myProfile, onBack, variant = "faith" }) {
  const isLove = variant === "love";
  const kp = isLove ? "m" : "f"; // key prefix keeps the two queues fully separate
  const [stage, setStage] = useState("setup"); // setup, searching, connected
  const [mode, setMode] = useState("chat");
  const [online, setOnline] = useState([]);
  const [partner, setPartner] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [callStatus, setCallStatus] = useState("connecting"); // connecting, active
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [callErr, setCallErr] = useState("");
  const revealTimer = useRef(null);
  const searchPollRef = useRef(null);
  const chatPollRef = useRef(null);
  const callPollRef = useRef(null);
  const bottomRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const answeredIce = useRef(new Set());
  const callStateRef = useRef(null);
  const myQueueEntryTs = useRef(null);

  useEffect(() => {
    loadPresence();
    const t = setInterval(loadPresence, 3000);
    return () => { clearInterval(t); clearAll(); };
    // eslint-disable-next-line
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function clearAll() {
    clearInterval(searchPollRef.current); clearInterval(chatPollRef.current); clearInterval(callPollRef.current);
    clearTimeout(revealTimer.current);
    pcRef.current?.close(); pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null;
  }

  async function loadPresence() {
    const list = await storageList("presence:", true);
    if (!list) return;
    const now = Date.now();
    const entries = [];
    for (const k of list.keys) {
      if (k === `presence:${myId}`) continue;
      const p = await sget(k, true);
      if (!p || now - p.ts >= 45000) continue;
      if (isLove && myProfile?.seeking && myProfile.seeking !== "Everyone" && p.gender && p.gender !== myProfile.seeking) continue;
      entries.push({ id: k.replace("presence:", ""), name: p.name, gender: p.gender });
    }
    setOnline(entries);
  }

  function isCompatible(entry) {
    if (!isLove) return true;
    if (!entry.gender || !entry.seeking || !myProfile?.gender || !myProfile?.seeking) return true;
    const iSeekThem = myProfile.seeking === "Everyone" || myProfile.seeking === entry.gender;
    const theySeekMe = entry.seeking === "Everyone" || entry.seeking === myProfile.gender;
    return iSeekThem && theySeekMe;
  }

  function cleanQueue(list) {
    const now = Date.now();
    return (list || []).filter(e => e.id !== myId && (e.partner || now - e.ts < 120000));
  }

  async function startSearch(m) {
    setMode(m); setStage("searching");
    const key = `${kp}queue:${m}`;
    const list = cleanQueue((await sget(key, true)) || []);
    const candidate = list.find(e => e.partner == null && isCompatible(e));
    const myEntry = { id: myId, name: myProfile?.name || "Believer", gender: myProfile?.gender, seeking: myProfile?.seeking, ts: Date.now(), partner: null };
    if (candidate) {
      candidate.partner = myId;
      myEntry.partner = candidate.id;
      await sset(key, [...list, myEntry], true);
      connectTo({ id: candidate.id, name: candidate.name }, m);
    } else {
      await sset(key, [...list, myEntry], true);
      myQueueEntryTs.current = myEntry.ts;
      searchPollRef.current = setInterval(async () => {
        const cur = (await sget(key, true)) || [];
        const mine = cur.find(e => e.id === myId && e.ts === myQueueEntryTs.current);
        if (mine && mine.partner) {
          clearInterval(searchPollRef.current);
          const partnerEntry = cur.find(e => e.id === mine.partner);
          connectTo({ id: mine.partner, name: partnerEntry?.name || "Believer" }, m);
        }
      }, 1500);
    }
  }

  function connectTo(p, m) {
    setPartner(p);
    const sid = `${kp}s-${convoId(myId, p.id)}`;
    setSessionId(sid);
    setStage("connected");
    if (m === "chat") startRandomChat(sid);
    else startRandomCall(sid, p, m);
  }

  /* --- chat mode --- */
  function startRandomChat(sid) {
    setMessages([]);
    const key = `${kp}chat:${sid}`;
    const load = async () => setMessages((await sget(key, true)) || []);
    load();
    chatPollRef.current = setInterval(load, 2000);
  }
  async function sendRandomMsg() {
    if (!text.trim()) return;
    const key = `${kp}chat:${sessionId}`;
    const thread = (await sget(key, true)) || [];
    thread.push({ sender: myId, text: text.trim(), ts: Date.now() });
    await sset(key, thread, true);
    setMessages(thread); setText("");
  }

  /* --- call mode (audio/video) --- */
  const iceCfg = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  async function startRandomCall(sid, p, m) {
    setCallErr(""); setCallStatus("connecting");
    const key = `${kp}call:${sid}`;
    const iAmCaller = myId < p.id;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: m === "video" });
      localStreamRef.current = stream;
      if (m === "video" && localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = new RTCPeerConnection(iceCfg);
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const remoteStream = new MediaStream();
      pc.ontrack = e => { remoteStream.addTrack(e.track); if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream; if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream; };
      const myIce = [];
      pc.onicecandidate = e => { if (e.candidate) { myIce.push(e.candidate); const base = callStateRef.current || {}; sset(key, { ...base, [iAmCaller ? "iceCaller" : "iceCallee"]: myIce }, true); } };

      if (iAmCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        callStateRef.current = { caller: myId, mode: m, offer, iceCaller: [], iceCallee: [], answer: null, status: "ringing" };
        await sset(key, callStateRef.current, true);
      }
      callPollRef.current = setInterval(async () => {
        const state = await sget(key, true);
        if (!state) return;
        callStateRef.current = { ...callStateRef.current, ...state };
        if (!iAmCaller && state.status === "ringing" && pc.signalingState === "stable" && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(state.offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          callStateRef.current = { ...state, answer, iceCallee: [] };
          await sset(key, callStateRef.current, true);
          setCallStatus("active");
        }
        if (iAmCaller && state.answer && pc.signalingState !== "stable" && !pc.currentRemoteDescription) {
          await pc.setRemoteDescription(state.answer);
          setCallStatus("active");
        }
        const remoteList = (iAmCaller ? state.iceCallee : state.iceCaller) || [];
        for (let i = answeredIce.current.size; i < remoteList.length; i++) {
          try { await pc.addIceCandidate(remoteList[i]); } catch {}
          answeredIce.current.add(i);
        }
      }, 1500);
    } catch { setCallErr("Camera/microphone access was blocked."); }
  }

  function skip() {
    clearAll();
    answeredIce.current = new Set();
    setPartner(null); setSessionId(null); setMessages([]); setCallStatus("connecting");
    startSearch(mode);
  }
  function leave() {
    clearAll();
    onBack();
  }

  const theme = isLove
    ? { bg:GLOW_BG, onlineText: n => `${n} people online`, emptyText: "No one's here yet — check back soon", tagline:"Choose how you'd like to connect — chat, voice, or video", findLabel:"Find my match", searchingText:"Hang tight while we find your match" }
    : { bg:GLOW_BG, onlineText: n => `${n} believers online`, emptyText: "Waiting for believers to join", tagline:"Choose how you'd like to connect — chat, voice, or video", findLabel:"Find a believer", searchingText:"Hang tight while we find someone to share with" };

  if (stage === "setup") {
    return (
      <div style={{ ...page, background: theme.bg }}>
        <FontLoader />
        <div style={{ padding: "18px 16px" }}>
          <button onClick={onBack} style={{ ...backBtn, color: "#B8935F" }}><ChevronLeft size={18}/> Back</button>
        </div>
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 26px 40px", position:"relative" }}>
          <SonarReveal online={online} variant={variant} />
          <h2 style={{ fontFamily:"Lora, serif", fontSize:22, color:"#F8F4EA", marginTop:26, marginBottom:6, textAlign:"center" }}>
            {online.length > 0 ? theme.onlineText(online.length) : theme.emptyText}
          </h2>
          <p style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:"#8A8FA8", textAlign:"center", marginBottom:26, fontStyle:"italic" }}>
            {theme.tagline}
          </p>
          <div style={{ display:"flex", gap:10, marginBottom:26 }}>
            {[["chat","Chat",MessageCircle],["voice","Voice",Phone],["video","Video",Video]].map(([key,label,Icon]) => (
              <button key={key} onClick={() => setMode(key)} style={{
                display:"flex", flexDirection:"column", alignItems:"center", gap:6, padding:"14px 18px", borderRadius:14,
                border: mode===key ? "1.5px solid #B8935F" : "1.5px solid rgba(255,255,255,.15)",
                background: mode===key ? "rgba(184,147,95,.15)" : "transparent", cursor:"pointer"
              }}>
                <Icon size={20} color={mode===key ? "#B8935F" : "#C9C2AF"} />
                <span style={{ fontFamily:"Inter, sans-serif", fontSize:12.5, color: mode===key ? "#B8935F" : "#C9C2AF" }}>{label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => startSearch(mode)} style={{ ...primaryBtn, padding:"14px 40px" }}>{theme.findLabel}</button>
        </div>
      </div>
    );
  }

  if (stage === "searching") {
    return (
      <div style={{ ...page, background: theme.bg, alignItems:"center", justifyContent:"center" }}>
        <FontLoader />
        <SonarReveal online={online} variant={variant} active />
        <h2 style={{ fontFamily:"Lora, serif", fontSize:20, color:"#F8F4EA", marginTop:26 }}>Looking for someone…</h2>
        <p style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:"#8A8FA8", marginTop:6 }}>{theme.searchingText}</p>
        <button onClick={leave} style={{ ...secondaryBtn, marginTop:26, borderColor:"#8A8FA8", color:"#C9C2AF" }}>Cancel</button>
      </div>
    );
  }

  // connected
  if (mode === "chat") {
    return (
      <div style={page}>
        <FontLoader />
        <div style={chatHeader}>
          <button onClick={leave} style={{ background:"none", border:"none", cursor:"pointer", padding:6, marginRight:4 }}><ChevronLeft size={22} color="#F8F4EA" /></button>
          <div style={{ ...avatarSm, background:"#B8935F" }}>{partner?.name?.[0]?.toUpperCase() || "?"}</div>
          <div style={{ flex:1, fontFamily:"Lora, serif", fontSize:16.5, color:"#F8F4EA" }}>{partner?.name || "Believer"}</div>
          <button onClick={skip} style={iconBtn}><SkipForward size={18} color="#F8F4EA" /></button>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 14px", background:"var(--fc-bg)", display:"flex", flexDirection:"column" }}>
          {messages.length === 0 && <div style={emptyState}>Say hello and share what's on your heart.</div>}
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.sender === myId ? "flex-end" : "flex-start", maxWidth:"75%", marginBottom:10 }}>
              <div style={{ background: m.sender === myId ? "#B8935F" : "#EFE9DC", color: m.sender === myId ? "#FAF7F0" : "#22252B", padding:"9px 13px", borderRadius:16, fontFamily:"Inter, sans-serif", fontSize:14.5 }}>{m.text}</div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div style={composer}>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendRandomMsg()} placeholder="Type a message…" style={{ flex:1, border:"none", outline:"none", fontFamily:"Inter, sans-serif", fontSize:14.5, background:"transparent", padding:"10px 4px" }} />
          <button onClick={sendRandomMsg} style={iconBtnLight}><Send size={18} color="#B8935F" /></button>
        </div>
      </div>
    );
  }

  // connected — voice/video call
  return (
    <div style={{ ...page, background:"#0A0F0A" }}>
      <FontLoader />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative" }}>
        {mode === "video" ? (
          <>
            <video ref={remoteVideoRef} autoPlay playsInline style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", background:"#0A0F0A" }} />
            <video ref={localVideoRef} autoPlay playsInline muted style={{ position:"absolute", bottom:110, right:16, width:100, height:140, borderRadius:14, objectFit:"cover", border:"2px solid #B8935F" }} />
          </>
        ) : (
          <>
            <audio ref={remoteAudioRef} autoPlay />
            <div style={{ width:120, height:120, borderRadius:"50%", background:"#B8935F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Lora, serif", fontSize:42, color:"#2A1F0E" }}>
              {partner?.name?.[0]?.toUpperCase() || "?"}
            </div>
          </>
        )}
        <div style={{ position:"absolute", top:40, color:"#F8F4EA", fontFamily:"Lora, serif", fontSize:19, textAlign:"center" }}>
          {partner?.name || "Believer"}
          <div style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"#B8935F", marginTop:4 }}>{callStatus === "connecting" ? "Connecting…" : "Connected"}</div>
        </div>
        {callErr && <div style={{position:"absolute", bottom:190, color:"#E3A6A6", fontSize:12.5, fontFamily:"Inter, sans-serif", textAlign:"center", padding:"0 30px"}}>{callErr}</div>}
        <div style={{ position:"absolute", bottom:30, display:"flex", gap:18 }}>
          <button onClick={() => { localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !micOn); setMicOn(!micOn); }} style={callBtn(micOn ? "#5C4520" : "#B5616B")}>
            {micOn ? <Mic size={20} color="#fff"/> : <MicOff size={20} color="#fff"/>}
          </button>
          {mode === "video" && (
            <button onClick={() => { localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = !camOn); setCamOn(!camOn); }} style={callBtn(camOn ? "#5C4520" : "#B5616B")}>
              {camOn ? <Camera size={20} color="#fff"/> : <VideoOff size={20} color="#fff"/>}
            </button>
          )}
          <button onClick={skip} style={callBtn("#B8935F")}><SkipForward size={20} color="#fff" /></button>
          <button onClick={leave} style={callBtn("#B5616B")}><PhoneOff size={20} color="#fff" /></button>
        </div>
      </div>
    </div>
  );
}

function SonarReveal({ online, active, variant = "faith" }) {
  const shown = online.slice(0, 10);
  const isLove = variant === "love";
  const gradient = isLove ? "linear-gradient(135deg,#D98089,#8E4650)" : "linear-gradient(135deg,#E8A4B5,#7A1330)";
  const glow = isLove ? "rgba(181,97,107,.5)" : "rgba(122,19,48,.5)";
  const [tick, setTick] = useState(0);
  const [blipName, setBlipName] = useState(null);
  const [blipPos, setBlipPos] = useState({ x: 110, y: 40 });

  useEffect(() => {
    if (!active || shown.length === 0) return;
    let i = 0;
    function next() {
      const angle = Math.random() * Math.PI * 2;
      const r = 55 + Math.random() * 45;
      setBlipPos({ x: 110 + r * Math.cos(angle), y: 110 + r * Math.sin(angle) });
      setBlipName(shown[i % shown.length].name);
      i++;
      setTick(t => t + 1);
    }
    next();
    const id = setInterval(next, 2000);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [active, online.length]);

  return (
    <div style={{ position:"relative", width:220, height:220, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`
        @keyframes fr-ripple { 0% { transform: scale(0.4); opacity:.5; } 100% { transform: scale(2.4); opacity:0; } }
        @keyframes fr-pop { 0% { opacity:0; transform: scale(.4); } 60% { opacity:1; transform: scale(1.1); } 100% { opacity:1; transform: scale(1); } }
        @keyframes fr-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes radar-blip { 0% { opacity:0; transform: scale(.7); } 18% { opacity:1; transform: scale(1); } 78% { opacity:1; } 100% { opacity:0; transform: scale(.92); } }
      `}</style>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ position:"absolute", width:100, height:100, borderRadius:"50%", border:"1.5px solid rgba(184,147,95,.5)", animation:`fr-ripple ${active ? 1.8 : 2.6}s ease-out ${i*0.7}s infinite` }} />
      ))}
      <div style={{ width:74, height:74, borderRadius:"50%", background:gradient, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 18px ${glow}` }}>
        {isLove ? <Heart size={30} color="#FAF7F0" fill="#FAF7F0" /> : <BibleIcon size={30} color="#FAF7F0" />}
      </div>
      {active && blipName && (
        <div key={tick} style={{
          position:"absolute", left:blipPos.x, top:blipPos.y, transform:"translate(-50%,-50%)",
          display:"flex", alignItems:"center", gap:5, background:"rgba(22,35,63,0.85)", padding:"4px 10px",
          borderRadius:999, animation:"radar-blip 2s ease-in-out", whiteSpace:"nowrap"
        }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:"#5FCB6E", boxShadow:"0 0 5px rgba(95,203,110,.8)", flexShrink:0 }} />
          <span style={{ fontFamily:"Inter, sans-serif", fontSize:12.5, color:"#F8F4EA" }}>{blipName}</span>
        </div>
      )}
      {active && (
        <div style={{ position:"absolute", inset:0, animation:"fr-spin 7s linear infinite" }}>
          {shown.map((p, i) => {
            const angle = (i / Math.max(shown.length,1)) * 2 * Math.PI;
            const r = 96;
            const x = 110 + r * Math.cos(angle) - 14;
            const y = 110 + r * Math.sin(angle) - 14;
            return (
              <div key={p.id} style={{
                position:"absolute", left:x, top:y, width:28, height:28, borderRadius:"50%", background:"#EFE9DC", color:"#B8935F",
                display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Lora, serif", fontSize:12, fontWeight:600,
                animation:`fr-pop .5s ease ${i*0.15}s both`, boxShadow:"0 2px 6px rgba(0,0,0,.25)"
              }}>{p.name?.[0]?.toUpperCase() || "?"}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- styles ---------------- */
const page = { display:"flex", flexDirection:"column", height:"100dvh", maxWidth:460, margin:"0 auto", fontFamily:"Inter, sans-serif", background:"var(--fc-bg, #080b17)", overflow:"hidden" };
const heading = { fontFamily:"Lora, serif", fontSize:24, color:"#F8F4EA", margin:"0 0 14px", fontWeight:600 };
const input = { width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid rgba(255,255,255,0.15)", fontFamily:"Inter, sans-serif", fontSize:14.5, background:"#151b30", color:"#F8F4EA", boxSizing:"border-box" };
const primaryBtn = { background:ACCENT_GRADIENT, color:"#FFFFFF", border:"none", padding:"13px 26px", borderRadius:12, fontFamily:"Inter, sans-serif", fontSize:15, fontWeight:600, cursor:"pointer", boxShadow:"0 8px 24px rgba(88,91,255,.3)" };
const ctaBtn = {
  background:ACCENT_GRADIENT,
  color:"#FFFFFF", border:"none",
  padding:"15px 28px", borderRadius:16,
  fontFamily:"Inter, sans-serif", fontSize:15.5, fontWeight:700,
  cursor:"pointer", letterSpacing:0.2,
  boxShadow:"0 12px 32px rgba(88,91,255,.35)",
  display:"inline-flex", alignItems:"center", justifyContent:"center", gap:10
};
const secondaryBtn = { background:"rgba(96,112,255,0.12)", color:"#a0aaff", border:"1.5px solid rgba(108,124,255,0.3)", padding:"11px 20px", borderRadius:12, fontFamily:"Inter, sans-serif", fontSize:14.5, fontWeight:600, cursor:"pointer" };
const backBtn = { display:"flex", alignItems:"center", gap:2, background:"none", border:"none", color:"#8290d9", fontFamily:"Inter, sans-serif", fontSize:14, cursor:"pointer", padding:0, marginBottom:12 };
const navBar = lightMode => ({ display:"flex", gap:4, padding:7, margin:"0 14px 14px", background: lightMode ? "rgba(255,255,255,.92)" : "rgba(8,13,31,0.9)", border: lightMode ? "1px solid rgba(66,104,158,.14)" : "1px solid rgba(78,107,255,.35)", borderRadius:23, boxShadow: lightMode ? "0 14px 38px rgba(41,72,110,.14)" : "0 20px 60px rgba(0,0,0,.55)", position:"sticky", bottom:14, backdropFilter:"blur(18px)" });
const navBtn = (active, lightMode) => ({ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"10px 0", background: active ? (lightMode ? "rgba(61,115,255,.10)" : "rgba(93,108,255,0.15)") : "none", borderRadius:17, border:"none", cursor:"pointer", color: active ? (lightMode ? "#356AE8" : "#a0aaff") : (lightMode ? "#6D7E93" : "#626a80"), gap:4 });
const matchCard = { background:"linear-gradient(145deg, rgba(14,20,42,.96), rgba(8,12,26,.96))", border:"1px solid rgba(100,116,255,.18)", borderRadius:22, padding:16, marginBottom:14, boxShadow:"0 12px 30px rgba(0,0,0,.18)" };
const avatarMd = { width:52, height:52, borderRadius:"50%", background:"#EFE9DC", color:"#B8935F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Lora, serif", fontSize:20, flexShrink:0 };
const avatarSm = { width:38, height:38, borderRadius:"50%", background:"#EFE9DC", color:"#B8935F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Lora, serif", fontSize:15, flexShrink:0, marginRight:10 };
const emptyState = { textAlign:"center", color:"#9B9585", fontFamily:"Inter, sans-serif", fontSize:14, padding:"60px 20px" };
const convoRow = { display:"flex", alignItems:"center", width:"100%", background:"#fff", border:"none", borderRadius:14, padding:12, marginBottom:10, cursor:"pointer", boxShadow:"0 1px 2px rgba(20,20,15,.05)" };
const chatHeader = { display:"flex", alignItems:"center", padding:"14px 12px", background:"var(--fc-bg)" };
const iconBtn = { background:"rgba(255,255,255,.1)", border:"none", borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", marginLeft:6 };
const composer = { display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:"#fff", borderTop:"1px solid #E5DFD1" };
const iconBtnLight = { width:38, height:38, borderRadius:"50%", border:"none", background:"#EFE9DC", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 };
const callBtn = bg => ({ width:58, height:58, borderRadius:"50%", background:bg, border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" });

