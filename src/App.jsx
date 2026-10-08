import React, { useState, useEffect, useRef, useCallback } from "react";
import { createMessagesApi, rowToMsg } from "./messagesApi.js";
import { Heart, MessageCircle, Phone, Video, Mic, MicOff, PhoneOff, Send, User, ChevronLeft, Check, X, Camera, VideoOff, Square, SkipForward, Menu, LogOut, Info, Shield, HelpCircle, Eye, EyeOff, Home, UserPlus, Sun, Moon, Percent, MoreVertical, ArrowRight } from "lucide-react";

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
// Cinematic FaithConnect hero artwork. Stored as files in public/ (never inline base64).
const FAITHCONNECT_HERO = "/hero-dark.jpg";
const FAITHCONNECT_LIGHT_HERO = "/hero-light.jpg";


function genId() { return Math.random().toString(36).slice(2, 10); }
function convoId(a, b) { return [a, b].sort().join("-"); }

/* ---------- Supabase (real accounts + profiles) — plain HTTP, no external library ---------- */
const SUPABASE_URL = "https://vyhhyqegboenrznkjjjc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_E5w6gJK9yQKrvJNWyzhhlg_i78m_wde";
// Supabase Realtime is used for cross-browser chat delivery. Broadcast keeps the
// conversation live between separate Chrome/Opera/phone clients without relying
// on browser-local storage.
let realtimeClientPromise = null;
async function getRealtimeClient() {
  if (!realtimeClientPromise) {
    realtimeClientPromise = import("https://esm.sh/@supabase/supabase-js@2.107.0")
      .then(async ({ createClient }) => {
        const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });
        try {
          const sess = await sget("supabase-session", false);
          if (sess?.access_token) client.realtime.setAuth(sess.access_token);
        } catch {}
        return client;
      });
  }
  return realtimeClientPromise;
}


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
    city: row.city, denom: row.denom, faithLevel: row.faith_level, bio: row.bio, favoriteBible: row.favorite_bible || "",
    values: row.core_values || [], hobbies: row.hobbies || [], goals: row.goals || [],
    appearance: row.appearance || [], lookPref: row.look_pref || [],
    avatarUrl: row.avatar_url || null, photoUrls: row.photo_urls || [],
    avatarEmoji: row.avatar_emoji || null, avatarColor: row.avatar_color || null
  };
}
function profileToDb(p) {
  return {
    id: p.id, username: p.username, name: p.name, age: Number(p.age), gender: p.gender, seeking: p.seeking,
    city: p.city, denom: p.denom, faith_level: p.faithLevel, bio: p.bio, favorite_bible: p.favoriteBible || "",
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

// Private messages are stored on the server (see supabase/private_messages.sql).
const msgApi = createMessagesApi({
  rest: supaRest,
  getToken: async () => (await sget("supabase-session", false))?.access_token,
  refresh: restoreSupaSession,
});

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
  // Age is displayed on profiles, but it does not affect compatibility.
  // The remaining factors now make up the full 100% match score.
  const pct = Math.round(faith*0.30 + values*0.25 + goals*0.18 + hobbies*0.17 + looks*0.10);
  return { pct, faith, values, goals, hobbies, looks };
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
// Built-in avatars are explicitly tagged so Male/Female filters never mix faces.
// The first ten are tagged from the approved avatar sheet; the remaining avatars
// are kept in balanced groups so the filter stays deterministic.
const FEMALE_AVATAR_IDS = new Set([1,4,5,6,9,10,11,14,15,18,20,22]);
const AVATAR_PRESETS = Array.from({ length: 24 }, (_, i) => {
  const n = i + 1;
  const gender = FEMALE_AVATAR_IDS.has(n) ? "Female" : "Male";
  return {
    id: `faith-avatar-${String(n).padStart(2, "0")}`,
    gender,
    url: `/avatars/avatar-${String(n).padStart(2, "0")}.png`
  };
});

function RealisticAvatarCreator({ onPick, gender }) {
  const genderBases = {
    Female: [1,4,5,6,9,10,11,14,15,18,20,22],
    Male: [2,3,7,8,12,13,16,17,19,21,23,24]
  };
  const bases = gender === "Male" ? genderBases.Male : gender === "Female" ? genderBases.Female : [...genderBases.Female, ...genderBases.Male];
  const [face, setFace] = useState(bases[0]);
  const [hair, setHair] = useState("Natural");
  const [skin, setSkin] = useState("Natural");
  const [clothes, setClothes] = useState("Original");
  const [accessory, setAccessory] = useState("None");
  const [feature, setFeature] = useState("Face");
  useEffect(() => { if (!bases.includes(face)) setFace(bases[0]); }, [gender]);

  const baseUrl = `/avatars/avatar-${String(face).padStart(2,"0")}.png`;
  const hairClass = hair !== "Natural" ? ` fc-real-hair-${hair.toLowerCase().replace(/[^a-z]/g,"")}` : "";
  const skinStyle = skin === "Natural" ? {} : { filter: skin === "Warm" ? "sepia(.12) saturate(1.08)" : skin === "Deep" ? "brightness(.82) saturate(1.08)" : "brightness(1.08) saturate(.92)" };
  const clothesStyle = clothes === "Original" ? {} : { filter: clothes === "Midnight" ? "hue-rotate(185deg) saturate(1.1)" : clothes === "Plum" ? "hue-rotate(265deg) saturate(1.15)" : "hue-rotate(80deg) saturate(.85)" };

  function useAvatar() {
    // Keep the chosen realistic base as the saved avatar. The creator's controls are
    // intentionally visual: hair/clothing/accessory changes are shown in the preview.
    // The saved image remains a normal local FaithConnect avatar URL.
    onPick(baseUrl);
  }

  const choices = {
    Face: bases.map(n => ({ value:String(n), label:`Face ${n}` })),
    Hair: ["Natural","Short","Curly","Braids","Locs","Waves"].map(x=>({value:x,label:x})),
    Skin: ["Natural","Warm","Deep","Light"].map(x=>({value:x,label:x})),
    Clothes: ["Original","Midnight","Plum","Sage"].map(x=>({value:x,label:x})),
    Accessory: ["None","Glasses","Earrings","Cross"].map(x=>({value:x,label:x}))
  };
  const current = feature === "Face" ? String(face) : feature === "Hair" ? hair : feature === "Skin" ? skin : feature === "Clothes" ? clothes : accessory;
  function choose(v) {
    if (feature === "Face") setFace(Number(v));
    if (feature === "Hair") setHair(v);
    if (feature === "Skin") setSkin(v);
    if (feature === "Clothes") setClothes(v);
    if (feature === "Accessory") setAccessory(v);
  }

  return <div className="fc-realistic-creator">
    <style>{`
      .fc-realistic-creator{margin-top:16px;padding:16px;border-radius:22px;border:1px solid rgba(141,92,255,.42);background:linear-gradient(145deg,rgba(9,14,34,.96),rgba(25,12,48,.96));color:#F8F4EA}
      .fc-real-head{display:flex;gap:15px;align-items:center}.fc-real-preview{position:relative;width:118px;height:118px;flex:0 0 118px;border-radius:50%;overflow:hidden;border:2px solid #8067FF;box-shadow:0 0 28px rgba(100,95,255,.35);background:#11182e}.fc-real-preview img{width:100%;height:100%;object-fit:cover;display:block;transition:.25s}.fc-real-title{font-family:Lora,serif;font-size:20px;font-weight:700}.fc-real-copy{margin-top:5px;color:#9FAAC1;font-size:11.5px;line-height:1.45}.fc-real-tabs{display:flex;gap:6px;overflow:auto;margin:15px 0 10px;padding-bottom:3px}.fc-real-tab{white-space:nowrap;border:1px solid rgba(141,114,255,.45);background:rgba(255,255,255,.035);color:#9FAAC1;border-radius:999px;padding:8px 12px;font-size:11px}.fc-real-tab.active{background:linear-gradient(135deg,#6378FF,#7354E8);color:#fff;border-color:#8D72FF}.fc-real-options{display:flex;gap:8px;overflow-x:auto;padding:3px 0 8px}.fc-real-option{flex:0 0 auto;border:1px solid rgba(248,244,234,.18);background:rgba(255,255,255,.035);color:#B7C0D3;border-radius:12px;padding:7px 10px;font-size:10.5px}.fc-real-option.active{border-color:#D6AE6E;background:rgba(184,147,95,.22);color:#F8F4EA}.fc-real-face-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}.fc-real-face{aspect-ratio:1;border-radius:12px;overflow:hidden;border:1px solid rgba(89,111,255,.55);background:#171c3b}.fc-real-face img{width:100%;height:100%;object-fit:cover}.fc-real-face.active{border:2px solid #9A7BFF;box-shadow:0 0 16px rgba(141,114,255,.4)}.fc-real-use{width:100%;margin-top:12px;border:0;border-radius:999px;padding:11px;background:linear-gradient(135deg,#526CFF,#8D5CFF);color:#fff;font-weight:700}.fc-real-note{margin-top:8px;text-align:center;color:#78849E;font-size:10px;line-height:1.4}
      @media(max-width:620px){.fc-real-head{align-items:flex-start}.fc-real-preview{width:96px;height:96px;flex-basis:96px}.fc-real-title{font-size:18px}.fc-real-face-grid{grid-template-columns:repeat(5,1fr);gap:5px}}
    `}</style>
    <div className="fc-real-head">
      <div className="fc-real-preview">
        <img src={baseUrl} alt="Your realistic avatar" style={{...skinStyle,...clothesStyle}} />
        {accessory !== "None" && <div style={{position:"absolute",inset:0,pointerEvents:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:accessory==="Cross"?30:22,color:"#E6D5B2",textShadow:"0 2px 10px #000"}}>{accessory==="Glasses"?"⌐◡⌐":accessory==="Earrings"?"◦  ◦":"✝"}</div>}
        {hair !== "Natural" && <div className={`fc-real-hair${hairClass}`} style={{position:"absolute",top:0,left:0,right:0,height:"35%",background:"linear-gradient(180deg,rgba(18,10,22,.78),rgba(18,10,22,0))",borderRadius:"50% 50% 20% 20%",pointerEvents:"none"}} />}
      </div>
      <div style={{flex:1}}><div className="fc-real-title">Create Your Own Avatar</div><div className="fc-real-copy">Start with a realistic FaithConnect face, then personalize the look.</div></div>
    </div>
    <div className="fc-real-tabs">{Object.keys(choices).map(k=><button type="button" key={k} className={`fc-real-tab ${feature===k?"active":""}`} onClick={()=>setFeature(k)}>{k}</button>)}</div>
    {feature === "Face" ? <div className="fc-real-face-grid">{bases.map(n=><button type="button" key={n} className={`fc-real-face ${face===n?"active":""}`} onClick={()=>choose(String(n))}><img src={`/avatars/avatar-${String(n).padStart(2,"0")}.png`} alt="" /></button>)}</div> : <div className="fc-real-options">{choices[feature].map(o=><button type="button" key={o.value} className={`fc-real-option ${current===o.value?"active":""}`} onClick={()=>choose(o.value)}>{o.label}</button>)}</div>}
    <button type="button" className="fc-real-use" onClick={useAvatar}>Use This Avatar</button>
    <div className="fc-real-note">Your selected realistic FaithConnect avatar can be changed later.</div>
  </div>;
}

function AvatarPicker({ selected, onPick, gender }) {
  const [tab, setTab] = useState(gender === "Male" || gender === "Female" ? gender : "All");
  const [avatarPage, setAvatarPage] = useState(0);
  const [showCreator, setShowCreator] = useState(false);
  const [loadedAvatarIds, setLoadedAvatarIds] = useState([]);
  const [avatarLoading, setAvatarLoading] = useState(true);
  useEffect(() => { if (gender === "Male" || gender === "Female") { setTab(gender); setAvatarPage(0); } }, [gender]);
  useEffect(() => { let cancelled=false; setAvatarLoading(true); setLoadedAvatarIds([]); Promise.all(AVATAR_PRESETS.map(a=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(a.id);img.onerror=()=>resolve(null);img.src=a.url;}))).then(ids=>{if(!cancelled){setLoadedAvatarIds(ids.filter(Boolean));setAvatarLoading(false);}}); return()=>{cancelled=true}; },[]);
  const validPresets=AVATAR_PRESETS.filter(a=>loadedAvatarIds.includes(a.id));
  const visible=tab==="All"?validPresets:validPresets.filter(a=>a.gender===tab); const pageSize=5; const pageCount=Math.max(1,Math.ceil(visible.length/pageSize)); const safePage=Math.min(avatarPage,pageCount-1); const pageAvatars=visible.slice(safePage*pageSize,safePage*pageSize+pageSize);
  function changeTab(t){setTab(t);setAvatarPage(0)} function nextAvatars(){setAvatarPage(p=>(p+1)%pageCount)} function previousAvatars(){setAvatarPage(p=>(p-1+pageCount)%pageCount)}
  return <div className="fc-avatar-picker"><style>{`.fc-avatar-picker{width:100%;margin-top:18px;color:#F8F4EA;font-family:Inter,sans-serif}.fc-avatar-shell{width:100%;max-width:760px;margin:0 auto;padding:22px 16px 20px;border:1px solid rgba(91,113,255,.42);border-radius:26px;background:linear-gradient(145deg,rgba(14,20,46,.96),rgba(22,12,42,.96));box-shadow:0 18px 45px rgba(0,0,0,.24),inset 0 1px rgba(255,255,255,.05)}.fc-avatar-title{text-align:center;font-family:Lora,serif;font-size:27px;line-height:1.15;font-weight:600;margin:0;color:#F8F4EA}.fc-avatar-title span{color:#8D72FF}.fc-avatar-sub{text-align:center;color:#9FAAC1;font-size:12.5px;line-height:1.45;margin:8px auto 18px;max-width:500px}.fc-avatar-tabs{display:flex;justify-content:center;max-width:390px;margin:0 auto 18px;border:1px solid rgba(89,111,255,.65);border-radius:999px;overflow:hidden;background:rgba(3,8,24,.48)}.fc-avatar-tab{flex:1;padding:10px 12px;border:0;background:transparent;color:#9FAAC1;font-size:13px;font-weight:600;cursor:pointer}.fc-avatar-tab.active{background:linear-gradient(135deg,#6378FF,#7354E8);color:#fff;box-shadow:0 0 22px rgba(94,111,255,.32)}.fc-avatar-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.fc-avatar-tile{position:relative;aspect-ratio:1;border-radius:17px;padding:3px;border:1px solid rgba(89,111,255,.62);background:linear-gradient(145deg,rgba(36,47,102,.8),rgba(24,19,58,.9));cursor:pointer;overflow:hidden}.fc-avatar-img{width:100%;height:100%;display:block;object-fit:cover;border-radius:13px}.fc-avatar-tile.selected{border:2px solid #8FA0FF;box-shadow:0 0 25px rgba(99,120,255,.5)}.fc-avatar-check{position:absolute;right:7px;top:7px;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#657BFF,#9A62FF);color:#fff}.fc-avatar-create{width:100%;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:9px;min-height:52px;border-radius:14px;border:1px dashed rgba(141,114,255,.9);background:linear-gradient(145deg,rgba(44,31,91,.5),rgba(17,17,48,.75));color:#B9A8FF}.fc-avatar-plus{font-size:25px;color:#9A6DFF}.fc-avatar-nav{display:flex;align-items:center;justify-content:center;gap:18px;margin-top:17px}.fc-avatar-arrow{width:40px;height:40px;border-radius:50%;border:1px solid rgba(99,120,255,.8);background:rgba(9,13,34,.8);color:#D9D5FF;font-size:22px}.fc-avatar-dots{display:flex;gap:7px}.fc-avatar-dot{width:8px;height:8px;border-radius:50%;background:#28386F}.fc-avatar-dot.active{background:#8D72FF}.fc-avatar-next{width:100%;margin-top:17px;padding:12px;border-radius:999px;border:1px solid #8067FF;background:rgba(76,91,205,.22);color:#DCD8FF;font-weight:700}.fc-avatar-count{text-align:center;color:#69748D;font-size:10.5px;margin-top:8px}@media(max-width:620px){.fc-avatar-shell{padding:18px 10px 17px;border-radius:22px}.fc-avatar-title{font-size:23px}.fc-avatar-grid{grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}}`}</style><div className="fc-avatar-shell"><h3 className="fc-avatar-title">Choose Your <span>Avatar</span></h3><div className="fc-avatar-sub">Pick an avatar that represents you. You can always change it later.</div><div className="fc-avatar-tabs">{["Male","Female","All"].map(t=><button type="button" key={t} className={`fc-avatar-tab ${tab===t?"active":""}`} onClick={()=>changeTab(t)}>{t}</button>)}</div><div className="fc-avatar-grid">{avatarLoading?<div style={{gridColumn:"1/-1",textAlign:"center",padding:"28px 0",color:"#69748D"}}>Loading avatars…</div>:pageAvatars.map(a=><button type="button" key={a.id} className={`fc-avatar-tile ${selected===a.url?"selected":""}`} onClick={()=>onPick(a.url)}><img src={a.url} alt="" className="fc-avatar-img" />{selected===a.url&&<span className="fc-avatar-check">✓</span>}</button>)}</div>{!avatarLoading&&<button type="button" className="fc-avatar-create" onClick={()=>setShowCreator(v=>!v)}><span className="fc-avatar-plus">＋</span><strong>{showCreator?"Close Creator":"Create Your Own Avatar"}</strong></button>}{!avatarLoading&&pageCount>1&&<><div className="fc-avatar-nav"><button type="button" className="fc-avatar-arrow" onClick={previousAvatars}>‹</button><div className="fc-avatar-dots">{Array.from({length:Math.min(pageCount,5)},(_,i)=><span key={i} className={`fc-avatar-dot ${i===safePage?"active":""}`} />)}</div><button type="button" className="fc-avatar-arrow" onClick={nextAvatars}>›</button></div><button type="button" className="fc-avatar-next" onClick={nextAvatars}>Next Avatars&nbsp;&nbsp;→</button><div className="fc-avatar-count">Showing {safePage*pageSize+1}–{Math.min((safePage+1)*pageSize,visible.length)} of {visible.length}</div></>}{showCreator&&<RealisticAvatarCreator gender={gender} onPick={onPick}/>}</div></div>;
}

function Chip({ label, active, onClick, lightMode=false }) {
  const border = active ? "1.5px solid #B8935F" : (lightMode ? "1.5px solid rgba(39,61,91,.30)" : "1.5px solid rgba(248,244,234,0.4)");
  const background = active ? (lightMode ? "#D2AA69" : "#B8935F") : (lightMode ? "rgba(255,255,255,.28)" : "transparent");
  const color = active ? "#2A1F0E" : (lightMode ? "#26384F" : "#F8F4EA");
  return (
    <button type="button" onClick={onClick} style={{
      padding: "7px 13px", borderRadius: 999, fontSize: 13.5, fontFamily: "Inter, sans-serif",
      border, background, color,
      cursor: "pointer", margin: "3px 5px 3px 0", transition: "all .15s",
      boxShadow: lightMode && !active ? "0 1px 2px rgba(31,52,79,.04)" : "none"
    }}>{label}</button>
  );
}

export default function App() {
  const [screen, setScreen] = useState("loading"); // loading, welcome, profile, matches, chat, messages
  const [myId, setMyId] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [form, setForm] = useState({ name:"", age:"", gender:"Female", seeking:"Male", city:"", denom: DENOMS[0], faithLevel:3, bio:"", favoriteBible:"", values:[], hobbies:[], goals:[], appearance:[], lookPref:[], username:"", password:"", email:"", avatarUrl:null, photoUrls:[], avatarEmoji:null, avatarColor:null });
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
  const [onlinePeople, setOnlinePeople] = useState([]);
  const onlinePresenceChannelRef = useRef(null);
  const matchesScrollRef = useRef(null);
  useEffect(() => { if (screen === "matches" && matchesScrollRef.current) matchesScrollRef.current.scrollTop = 0; }, [screen]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightMode, setLightMode] = useState(() => { try { return localStorage.getItem("faithconnect-theme") === "light"; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem("faithconnect-theme", lightMode ? "light" : "dark"); } catch {} }, [lightMode]);
  useEffect(() => {
    document.documentElement.style.setProperty("--fc-bg", lightMode ? LIGHT_BG : GLOW_BG);
    document.documentElement.style.setProperty("--fc-text", lightMode ? "#1B2B43" : "#F8F4EA");
    document.documentElement.style.setProperty("--fc-muted", lightMode ? "#5C6D82" : "#B9C9BC");
    document.documentElement.style.setProperty("--fc-input-bg", lightMode ? "rgba(255,255,255,.72)" : "#151b30");
    document.documentElement.style.setProperty("--fc-input-border", lightMode ? "rgba(39,61,91,.22)" : "rgba(255,255,255,.15)");
  }, [lightMode]);

  // Real online presence: only users with an active app connection are considered online.
  // Switching to another app/tab marks this client offline until they return.
  useEffect(() => {
    if (!myId || !myProfile) {
      setOnlinePeople([]);
      return;
    }
    let cancelled = false;
    let channel = null;

    const publish = async () => {
      if (!channel || cancelled) return;
      try {
        await channel.track({
          id: myId,
          name: myProfile?.name || "Believer",
          gender: myProfile?.gender || null,
          seeking: myProfile?.seeking || null,
          avatarUrl: myProfile?.avatarUrl || null,
          ts: Date.now()
        });
      } catch (e) { console.error("FaithConnect online presence track failed:", e); }
    };

    const refresh = () => {
      if (!channel) return;
      const state = channel.presenceState();
      const people = [];
      Object.values(state || {}).forEach(entries => {
        (entries || []).forEach(entry => {
          if (entry?.id && !people.some(p => p.id === entry.id)) people.push(entry);
        });
      });
      setOnlinePeople(people.filter(p => p.id !== myId));
    };

    (async () => {
      try {
        const client = await getRealtimeClient();
        if (cancelled) return;
        channel = client.channel("faithconnect-online", {
          config: { presence: { key: myId } }
        });
        onlinePresenceChannelRef.current = channel;
        channel.on("presence", { event: "sync" }, refresh);
        channel.on("presence", { event: "join" }, refresh);
        channel.on("presence", { event: "leave" }, refresh);
        await new Promise((resolve, reject) => {
          let settled = false;
          const finish = fn => { if (!settled) { settled = true; clearTimeout(timer); fn(); } };
          const timer = setTimeout(() => finish(() => reject(new Error("Online presence timed out"))), 9000);
          channel.subscribe(async status => {
            if (status === "SUBSCRIBED") {
              await publish();
              refresh();
              finish(resolve);
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              finish(() => reject(new Error(status)));
            }
          });
        });

        const handleVisibility = async () => {
          if (document.visibilityState === "hidden") {
            try { await channel.untrack(); } catch {}
            setOnlinePeople(prev => prev.filter(p => p.id !== myId));
          } else {
            await publish();
            refresh();
          }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        channel.__faithconnectVisibilityHandler = handleVisibility;
      } catch (e) {
        console.error("FaithConnect online presence failed:", e);
        setOnlinePeople([]);
      }
    })();

    return () => {
      cancelled = true;
      const ch = onlinePresenceChannelRef.current || channel;
      try {
        if (ch?.__faithconnectVisibilityHandler) document.removeEventListener("visibilitychange", ch.__faithconnectVisibilityHandler);
        ch?.untrack?.();
        ch?.unsubscribe?.();
      } catch {}
      onlinePresenceChannelRef.current = null;
      setOnlinePeople([]);
    };
  }, [myId, myProfile]);

  async function logOut() {
    try { await onlinePresenceChannelRef.current?.untrack?.(); } catch {}
    try { await onlinePresenceChannelRef.current?.unsubscribe?.(); } catch {}
    onlinePresenceChannelRef.current = null;
    setOnlinePeople([]);
    try { await sdel("supabase-session", false); } catch {}
    setMyId(null);
    setMyProfile(null);
    setForm({ name:"", age:"", gender:"Female", seeking:"Male", city:"", denom: DENOMS[0], faithLevel:3, bio:"", favoriteBible:"", values:[], hobbies:[], goals:[], appearance:[], lookPref:[], username:"", password:"", email:"", avatarUrl:null, photoUrls:[], avatarEmoji:null, avatarColor:null });
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
      const wantedGender = myProfile.gender === "Male" ? "Female" : myProfile.gender === "Female" ? "Male" : null;
      const others = [];
      for (const row of (data || [])) {
        const p = profileFromDb(row);
        if (wantedGender && p.gender !== wantedGender) continue;
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
    try {
      const list = await msgApi.inbox(myId);
      const session = await sget("supabase-session", false);
      const mine = [];
      for (const c of list) {
        let otherProfile = await sget(`profiles:${c.otherId}`, false);
        if (!otherProfile) {
          try {
            const rows = await supaRest(`profiles?id=eq.${encodeURIComponent(c.otherId)}&select=*`, { token: session?.access_token });
            otherProfile = rows?.[0] ? profileFromDb(rows[0]) : null;
            if (otherProfile) await sset(`profiles:${c.otherId}`, otherProfile, false);
          } catch {}
        }
        mine.push({ otherId: c.otherId, otherProfile, last: c.last, unread: c.unread });
      }
      setConversations(mine);
    } catch (e) { console.error("FaithConnect load conversations failed", e); }
  }, [myId]);

  useEffect(() => { if (screen === "messages") loadConversations(); }, [screen, loadConversations]);

  // Keep unread counts fresh on every screen: instant via Realtime when it is available,
  // with a slow poll as a safety net.
  useEffect(() => {
    if (!myId) { setConversations([]); return; }
    let stopped = false, ch = null;
    const tick = () => { if (!stopped && !document.hidden) loadConversations(); };
    loadConversations();
    const timer = setInterval(tick, 20000);
    document.addEventListener("visibilitychange", tick);
    (async () => {
      try {
        const client = await getRealtimeClient();
        if (stopped) return;
        ch = client.channel(`faithconnect-inbox-${myId}`)
          .on("postgres_changes", { event:"INSERT", schema:"public", table:"private_messages", filter:`recipient_id=eq.${myId}` }, () => { if (!stopped) loadConversations(); })
          .subscribe();
      } catch (e) { console.error("FaithConnect inbox realtime failed", e); }
    })();
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      if (ch) { try { ch.unsubscribe(); } catch {} }
    };
  }, [myId, loadConversations]);

  function toggle(field, val) {
    setForm(f => {
      const cur = f[field] || [];
      return { ...f, [field]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] };
    });
  }

  const unreadTotal = conversations.reduce((n, c) => n + (c.unread || 0), 0);
  const nav = (
    <div style={navBar(lightMode)}>
      {[["matches","Matches",Heart],["messages","Messages",MessageCircle],["matchList","Discover",Percent],["profile","Profile",User]].map(([key,label,Icon]) => (
        <button key={key} onClick={() => setScreen(key)} style={{ ...navBtn(screen===key, lightMode), position:"relative" }}>
          <Icon size={19} strokeWidth={screen===key?2.4:1.8} />
          {key === "messages" && unreadTotal > 0 && <span style={unreadBadge({ position:"absolute", top:4, left:"calc(50% + 6px)" })}>{unreadTotal > 99 ? "99+" : unreadTotal}</span>}
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
          <h2 style={{...heading, color:"var(--fc-text)"}}>Tell us about you</h2>
          <p style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"#8A8578", lineHeight:1.5, marginTop:-8, marginBottom:18 }}>
            What you share on this page is how we match you with someone else — other members can see it to find out if you're a good match.
          </p>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:8 }}>
            <PhotoSlot label="Profile photo" preview={avatarPreview} existingUrl={form.avatarUrl} emoji={form.avatarEmoji} emojiColor={form.avatarColor} onPick={pickAvatar} big />
            <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:"var(--fc-muted)", marginTop:8 }}>Or choose a FaithConnect avatar instead:</div>
            <AvatarPicker selected={form.avatarUrl} gender={form.gender} onPick={url => { setAvatarFile(null); setAvatarPreview(null); setForm({ ...form, avatarUrl:url, avatarEmoji:null, avatarColor:null }); }} />
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
          <Field label="Your favorite Bible verse or book">
            <input style={input} value={form.favoriteBible||""} onChange={e=>setForm({...form,favoriteBible:e.target.value})} placeholder="e.g. Romans 8:28 or Psalms" />
          </Field>
          <div style={{ marginTop:4 }}>
            <PreferenceSection number="1" title="What matters most to you" list={VALUES} sel={form.values} onToggle={v=>toggle("values",v)} limit={5} lightMode={lightMode} />
            <PreferenceSection number="2" title="Hobbies & interests" list={HOBBIES} sel={form.hobbies} onToggle={v=>toggle("hobbies",v)} limit={5} lightMode={lightMode} />
            <PreferenceSection number="3" title="What are you looking for" list={GOALS} sel={form.goals} onToggle={v=>toggle("goals",v)} limit={3} lightMode={lightMode} />
            <PreferenceSection number="4" title="Your personality" list={PERSONALITY} sel={form.appearance} onToggle={v=>toggle("appearance",v)} limit={5} lightMode={lightMode} />
            <PreferenceSection number="5" title="Personality you're drawn to in a partner" list={PERSONALITY} sel={form.lookPref} onToggle={v=>toggle("lookPref",v)} limit={5} lightMode={lightMode} />
          </div>
          {err && <div style={{color:"#B5616B", fontSize:13, marginTop:6}}>{err}</div>}
          <button onClick={saveProfile} style={{...primaryBtn, width:"100%", marginTop: 20}}>Save & find matches</button>
        </div>
      </div>
    );
  }

  if (screen === "chat" && activeConvo) {
    return <ChatScreen myId={myId} myProfile={myProfile} other={activeConvo} onBack={() => setScreen("messages")} onRead={loadConversations} />;
  }

  if (screen === "fellowship") {
    return <RandomConnectScreen myId={myId} myProfile={myProfile} onlinePeople={onlinePeople} onBack={() => setScreen("matches")} variant="faith" />;
  }

  if (screen === "meetSomeone") {
    return <RandomConnectScreen myId={myId} myProfile={myProfile} onlinePeople={onlinePeople} onBack={() => setScreen("matches")} variant="love" />;
  }

  if (screen === "matchList") {
    return <MatchListScreen matches={matches} myProfile={myProfile} onOpenChat={(id, profile) => { setActiveConvo({ otherId: id, otherProfile: profile }); setScreen("chat"); }} onBack={() => setScreen("matches")} nav={nav} />;
  }

  if (screen === "security") {
    return <SecurityScreen myId={myId} myProfile={myProfile} onBack={() => setScreen("profile")} onUsernameChanged={u => { const updated = { ...myProfile, username: u }; setMyProfile(updated); setForm(updated); }} />;
  }

  if (screen === "profile" && myProfile) {
    return (
      <div style={page}>
        <FontLoader />
        <TopBar onMenu={() => setMenuOpen(true)} dark={!lightMode} overlay={false} onLogo={() => setScreen("matches")} lightMode={lightMode} onToggleTheme={() => setLightMode(v => !v)} />
        <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onLogOut={logOut} onNavigate={setScreen} lightMode={lightMode} />
        <div style={{ flex:1, overflowY:"auto", padding:"8px 22px 100px", background:"var(--fc-bg)" }}>
          <div style={{ margin:"0 auto 14px", display:"flex", justifyContent:"center" }}><AvatarCircle profile={myProfile} size={74} fontSize={28} /></div>
          <h2 style={{...heading, textAlign:"center", color: lightMode ? "#16233F" : "#F8F4EA"}}>{myProfile.name}, {myProfile.age}</h2>
          <p style={{textAlign:"center", color: lightMode ? "#5C6D82" : "#B9C9BC", fontFamily:"Inter, sans-serif", fontSize:14, marginTop:-8}}>{myProfile.city} · {myProfile.denom}</p>
          {myProfile.photoUrls && myProfile.photoUrls.length > 0 && (
            <div style={{ display:"flex", gap:8, marginTop:16, overflowX:"auto" }}>
              {myProfile.photoUrls.map((u,i) => <img key={i} src={u} alt="" style={{ width:100, height:130, objectFit:"cover", borderRadius:12, flexShrink:0 }} />)}
            </div>
          )}
          <p style={{fontFamily:"Inter, sans-serif", fontSize:14.5, color: lightMode ? "#34445A" : "#E4E7E2", lineHeight:1.6, marginTop:18}}>{myProfile.bio}</p>
          {myProfile.favoriteBible && <div style={{ marginTop:14, padding:"14px 16px", borderRadius:14, border: lightMode ? "1px solid #D7DEE8" : "1px solid rgba(255,255,255,.12)", background: lightMode ? "#F5F7FA" : "rgba(255,255,255,.04)" }}>
            <div style={{ fontFamily:"Inter, sans-serif", fontSize:10, letterSpacing:1.6, color: lightMode ? "#5369D9" : "#D6AE6E", marginBottom:5 }}>FAVORITE BIBLE VERSE / BOOK</div>
            <div style={{ fontFamily:"Lora, serif", fontSize:16, color: lightMode ? "#16233F" : "#F8F4EA", lineHeight:1.45 }}>{myProfile.favoriteBible}</div>
          </div>}
          <div style={{marginTop:18}}><Tag list={myProfile.values} lightMode={lightMode} /></div>
          <div style={{marginTop:8}}><Tag list={myProfile.hobbies} lightMode={lightMode} /></div>
          <div style={{marginTop:8}}><Tag list={myProfile.goals} lightMode={lightMode} /></div>
          <button onClick={() => setScreen("profile-edit")} style={{...secondaryBtn, width:"100%", marginTop:24, background: lightMode ? "rgba(61,115,255,.10)" : secondaryBtn.background, color: lightMode ? "#356AE8" : secondaryBtn.color, borderColor: lightMode ? "rgba(61,115,255,.28)" : "rgba(108,124,255,.3)"}}>Edit profile</button>
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
          <h2 style={{...heading, color:"var(--fc-text)"}}>Edit your profile</h2>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:8 }}>
            <PhotoSlot label="Profile photo" preview={avatarPreview} existingUrl={form.avatarUrl} emoji={form.avatarEmoji} emojiColor={form.avatarColor} onPick={pickAvatar} big />
            <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:"var(--fc-muted)", marginTop:8 }}>Or choose a FaithConnect avatar instead:</div>
            <AvatarPicker selected={form.avatarUrl} gender={form.gender} onPick={url => { setAvatarFile(null); setAvatarPreview(null); setForm({ ...form, avatarUrl:url, avatarEmoji:null, avatarColor:null }); }} />
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
          <Field label="Your favorite Bible verse or book">
            <input style={input} value={form.favoriteBible||""} onChange={e=>setForm({...form,favoriteBible:e.target.value})} placeholder="e.g. Romans 8:28 or Psalms" />
          </Field>
          <div style={{ marginTop:4 }}>
            <PreferenceSection number="1" title="What matters most to you" list={VALUES} sel={form.values} onToggle={v=>toggle("values",v)} limit={5} lightMode={lightMode} />
            <PreferenceSection number="2" title="Hobbies & interests" list={HOBBIES} sel={form.hobbies} onToggle={v=>toggle("hobbies",v)} limit={5} lightMode={lightMode} />
            <PreferenceSection number="3" title="What are you looking for" list={GOALS} sel={form.goals} onToggle={v=>toggle("goals",v)} limit={3} lightMode={lightMode} />
            <PreferenceSection number="4" title="Your personality" list={PERSONALITY} sel={form.appearance} onToggle={v=>toggle("appearance",v)} limit={5} lightMode={lightMode} />
            <PreferenceSection number="5" title="Personality you're drawn to" list={PERSONALITY} sel={form.lookPref} onToggle={v=>toggle("lookPref",v)} limit={5} lightMode={lightMode} />
          </div>
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
        <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onLogOut={logOut} onNavigate={setScreen} lightMode={lightMode} />
        <div style={{ padding: "10px 22px 8px", background:"var(--fc-bg)" }}>
          <button onClick={() => setScreen("matches")} style={{ ...backBtn, color:"#D6AE6E", marginBottom:8 }}><ChevronLeft size={18}/> Back</button>
          <h2 style={{...heading, color:"#F8F4EA"}}>Messages</h2>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"0 16px 100px", background:"var(--fc-bg)" }}>
          {conversations.length === 0 && <div style={{...emptyState, color:"#B9C9BC"}}>No conversations yet. Start one from your matches.</div>}
          {conversations.map(c => (
            <button key={c.otherId} onClick={() => { setActiveConvo({ otherId: c.otherId, otherProfile: c.otherProfile }); setScreen("chat"); }} style={convoRow}>
              <div style={{ marginRight:10 }}><AvatarCircle profile={c.otherProfile} size={38} fontSize={15} /></div>
              <div style={{flex:1, minWidth:0, textAlign:"left"}}>
                <div style={{fontFamily:"Lora, serif", fontSize:15.5, color:"#22252B", fontWeight:c.unread ? 700 : 400}}>{c.otherProfile?.name || "Someone"}</div>
                <div style={{fontFamily:"Inter, sans-serif", fontSize:13, color:c.unread ? "#22252B" : "#8A8578", fontWeight:c.unread ? 600 : 400, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:220}}>
                  {c.last ? `${c.last.sender === myId ? "You: " : ""}${c.last.type === "voice" ? "🎙️ Voice note" : c.last.text}` : "No messages"}
                </div>
              </div>
              {c.unread > 0 && <span style={unreadBadge({ marginLeft:8, flexShrink:0 })}>{c.unread > 99 ? "99+" : c.unread}</span>}
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
          <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onLogOut={logOut} onNavigate={setScreen} lightMode={lightMode} />
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

        </div>
      </div>
      {nav}
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      <label style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"var(--fc-muted, #C9C2AF)", display:"block", marginBottom:6 }}>{label}</label>
      {children}
    </div>
  );
}
function Chips({ list, sel, onToggle }) {
  return <div>{list.map(v => <Chip key={v} label={v} active={sel?.includes(v)} onClick={() => onToggle(v)} />)}</div>;
}

function PreferenceSection({ number, title, list, sel, onToggle, limit, lightMode=false }) {
  const selected = Array.isArray(sel) ? sel.length : 0;
  const sectionBorder = lightMode ? "1px solid rgba(30,55,90,.12)" : "1px solid rgba(255,255,255,.09)";
  const titleColor = lightMode ? "#1B2B43" : "#F8F4EA";
  const helperColor = lightMode ? "#5C6D82" : "#737d9f";
  const countColor = lightMode ? "#68788D" : "#8993b6";
  return (
    <section style={{ marginTop: 22, paddingTop: 18, borderTop: sectionBorder }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
          <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#526cff,#8d5cff)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontFamily:"Inter,sans-serif", fontWeight:700, fontSize:12, boxShadow:"0 0 16px rgba(112,100,255,.3)" }}>{number}</div>
          <div style={{ fontFamily:"Inter,sans-serif", fontSize:15.5, fontWeight:600, color:titleColor }}>{title}</div>
        </div>
        <div style={{ fontFamily:"Inter,sans-serif", fontSize:11, color:countColor, whiteSpace:"nowrap" }}>
          {selected}{limit ? ` / ${limit}` : " selected"}
        </div>
      </div>
      <div style={{ fontFamily:"Inter,sans-serif", fontSize:11.5, color:helperColor, marginBottom:8 }}>
        {limit ? `Select up to ${limit}` : "Choose what fits you"}
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:0 }}>
        {list.map(v => <Chip key={v} label={v} active={sel?.includes(v)} onClick={() => onToggle(v)} lightMode={lightMode} />)}
      </div>
    </section>
  );
}

function Tag({ list, lightMode=false }) {
  if (!list || !list.length) return null;
  return <div>{list.filter(Boolean).map(t => (
    <span key={t} style={{ display:"inline-block", fontSize:12, fontFamily:"Inter, sans-serif", color: lightMode ? "#33445A" : "#F8F4EA", background: lightMode ? "rgba(96,112,255,0.10)" : "rgba(96,112,255,0.18)", border: lightMode ? "1px solid rgba(77,105,170,0.25)" : "1px solid rgba(108,124,255,0.3)", padding:"5px 10px", borderRadius:999, marginRight:6, marginBottom:6 }}>{t}</span>
  ))}</div>;
}
function FontLoader() {
  return <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
    html, body, #root { min-height:100%; }
    @media (max-width: 700px) {
      input, textarea { font-size:16px !important; }
    }
  `}</style>;
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

function MenuDrawer({ open, onClose, onLogOut, onNavigate, lightMode }) {
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
          <span style={{ fontFamily:"Lora, serif", fontSize:19, color:lightMode ? "#16233F" : "#F8F4EA" }}>FaithConnect</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={20} color={lightMode ? "#8A8578" : "#C9C2AF"} /></button>
        </div>
        {items.map(({ icon: Icon, label, action, note }) => (
          <button key={label} onClick={() => { action(); if (!note) onClose(); }} style={{
            display:"flex", alignItems:"center", gap:12, width:"100%", background:"none", border:"none",
            padding:"12px 4px", cursor:"pointer", color:lightMode ? "#34445A" : "#E8E3D6", fontFamily:"Inter, sans-serif", fontSize:14.5, textAlign:"left"
          }}>
            <Icon size={18} color={lightMode ? "#9A6F2F" : "#B8935F"} /> {label}
            {note && <span style={{ marginLeft:"auto", fontSize:11, color:"#6B7690" }}>{note}</span>}
          </button>
        ))}
        {inviteMsg && <div style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:lightMode ? "#4D7B55" : "#8AAE8E", padding:"4px 4px 0" }}>{inviteMsg}</div>}
        <div style={{ borderTop:lightMode ? "1px solid rgba(138,133,120,.38)" : "1px solid #6B5327", marginTop:14, paddingTop:14 }}>
          <button onClick={onLogOut} style={{
            display:"flex", alignItems:"center", gap:12, width:"100%", background:"none", border:"none",
            padding:"12px 4px", cursor:"pointer", color:lightMode ? "#B45D67" : "#D9A6A6", fontFamily:"Inter, sans-serif", fontSize:14.5, textAlign:"left"
          }}>
            <LogOut size={18} color={lightMode ? "#B45D67" : "#D9A6A6"} /> Log out
          </button>
        </div>
      </div>
    </>
  );
}

function MatchHero({ count, onMeetSomeone, lightMode }) {
  return (
    <div style={{
      position:"relative", minHeight: lightMode ? 0 : 500, height: lightMode ? "auto" : 500, aspectRatio: lightMode ? "406 / 525" : undefined, overflow:"hidden", display:"flex", alignItems:"flex-start",
      padding: lightMode ? "112px 22px 24px" : "200px 22px 42px", boxSizing:"border-box",
      background: lightMode ? "#dceeff" : "#050819"
    }}>
      <img
        src={lightMode ? FAITHCONNECT_LIGHT_HERO : FAITHCONNECT_HERO}
        alt={lightMode ? "Couple sitting together overlooking a valley at sunset" : "Couple watching a sunset together on the beach"}
        style={{
          position:"absolute", inset:0, width:"100%", height:"100%",
          objectFit: lightMode ? "contain" : "cover", objectPosition:"center center", pointerEvents:"none",
          filter: lightMode ? "brightness(1) saturate(1.02) contrast(1)" : "saturate(1.08) contrast(1.03)"
        }}
      />
      {lightMode && null}
      {!lightMode && <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:
        "linear-gradient(90deg, rgba(4,8,22,.90) 0%, rgba(4,8,22,.58) 38%, rgba(4,8,22,.08) 72%, rgba(4,8,22,.12) 100%), linear-gradient(180deg, rgba(3,6,18,.18) 0%, rgba(3,6,18,.08) 48%, rgba(3,6,18,.88) 100%)" }} />}

      <div style={{ position:"relative", zIndex:2, width:"100%", maxWidth:360 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:15 }}>
          <span style={{ width:27, height:2, background:"linear-gradient(90deg,#526cff,#8d5cff)" }} />
          <span style={{ fontFamily:"Inter, sans-serif", fontSize:9, letterSpacing:3, color: lightMode ? "#FFFFFF" : "#d2d4e4", textShadow: lightMode ? "0 2px 8px rgba(0,0,0,.45)" : "0 2px 8px rgba(0,0,0,.45)" }}>FAITH CONNECT</span>
        </div>
        <h1 style={{ fontFamily:"Lora, serif", fontSize:21, lineHeight:1.2, letterSpacing:0.2, fontStyle:"italic", fontWeight:600, color: lightMode ? "#FFFFFF" : "#F8F4EA", margin:"0 0 14px", maxWidth:330, textShadow: lightMode ? "0 2px 10px rgba(0,0,0,.48)" : "0 2px 14px rgba(0,0,0,.55)" }}>
          <span>Shared Faith.</span><br/>
          <span>Meaningful Connection.</span><br/>
          <span style={{ color: lightMode ? "#9ED0FF" : "#c7b1ff" }}>Growing Together.</span>
        </h1>
        <p style={{ fontFamily:"Inter, sans-serif", fontSize:14, lineHeight:1.5, color: lightMode ? "#FFFFFF" : "#d0d3df", margin:"0 0 18px", maxWidth:345, fontWeight:500, textShadow: lightMode ? "0 2px 10px rgba(0,0,0,.42)" : "0 2px 8px rgba(0,0,0,.45)" }}>
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

function MatchListScreen({ matches, myProfile, onOpenChat, onBack, nav }) {
  return (
    <div style={page}>
      <FontLoader />
      <div style={{ padding:"18px 16px 4px", background:"var(--fc-bg)" }}>
        <button onClick={onBack} style={{ ...backBtn, color:"#B8935F", marginBottom:10 }}><ChevronLeft size={18}/> Back</button>
        <h2 style={{ fontFamily:"Lora, serif", fontSize:24, color:"#F8F4EA", margin:"0 0 4px" }}>Discover</h2>
        <p style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:"#B9C9BC", margin:"0 0 12px" }}>People who match your faith, values, and interests.</p>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"8px 16px 110px", background:"var(--fc-bg)" }}>
        {matches.length === 0 && <div style={emptyState}>No matches yet — check back once more people join.</div>}
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
            {profile.favoriteBible && <div style={{fontFamily:"Lora, serif", fontSize:13.5, color:"#D6AE6E", margin:"0 0 10px"}}>📖 {profile.favoriteBible}</div>}
            <Tag list={[...(profile.values||[]).slice(0,2), ...(profile.hobbies||[]).slice(0,2)]} />
            <button onClick={() => onOpenChat(profile.id, profile)} style={{...secondaryBtn, width:"100%", marginTop:12}}>Say hello</button>
          </div>
        ))}
      </div>
      {nav}
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
function ChatScreen({ myId, myProfile, other, onBack, onRead }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [callMode, setCallMode] = useState(null); // null | audio | video
  const [callStatus, setCallStatus] = useState("idle"); // idle, calling, ringing, active
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [callErr, setCallErr] = useState("");

  const cid = convoId(myId, other.otherId);
  const [menuOpen, setMenuOpen] = useState(false); // 3-dot menu in the chat header
  const [confirmClear, setConfirmClear] = useState(false); // confirmation sheet for Clear chat
  const refreshSeq = useRef(0);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const chatScrollRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const answeredIce = useRef(new Set());
  const chatChannelRef = useRef(null);
  const callStateRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const myIceRef = useRef([]);
  // teardown() (runs when leaving the chat or ending a call) needs these two.
  const remoteStreamRef = useRef(null);
  const pendingCallSignalsRef = useRef([]);

  // Messages live on the server, so they reach the other person even when they are
  // not looking at this chat. If refreshes overlap, only the newest one is applied.
  async function refreshThread() {
    const seq = ++refreshSeq.current;
    try {
      const rows = await msgApi.thread(myId, cid);
      if (seq !== refreshSeq.current) return;
      const server = rows.map(rowToMsg);
      setMessages(prev => {
        const ids = new Set(server.map(m => m.id));
        const pending = prev.filter(m => m.pending && !ids.has(m.id));
        return [...server, ...pending].sort((x, y) => x.ts - y.ts);
      });
      if (!document.hidden && rows.some(r => r.recipient_id === myId && !r.read_at)) {
        msgApi.markRead(myId, cid).then(() => onRead && onRead()).catch(() => {});
      }
    } catch (e) { console.error("FaithConnect load messages failed", e); }
  }

  async function ensureChannel() {
    if (chatChannelRef.current) return chatChannelRef.current;
    const client = await getRealtimeClient();
    const channel = client.channel(`faithconnect-${cid}`, {
      config: { broadcast: { self: false, ack: true } }
    });

    // A "message" broadcast is only a nudge: the message itself is already saved on the server.
    channel.on("broadcast", { event: "message" }, () => { refreshThread(); });

    channel.on("broadcast", { event: "call" }, async ({ payload }) => {
      await handleCallSignal(payload?.signal);
    });

    await new Promise((resolve, reject) => {
      let settled = false;
      const finish = fn => { if (!settled) { settled = true; clearTimeout(timer); fn(); } };
      const timer = setTimeout(() => finish(() => reject(new Error("Realtime channel timed out"))), 9000);
      channel.subscribe(status => {
        if (status === "SUBSCRIBED") finish(resolve);
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") finish(() => reject(new Error(status)));
      });
    });
    chatChannelRef.current = channel;
    return channel;
  }

  async function broadcastCall(signal) {
    const ch = await ensureChannel();
    await ch.send({ type:"broadcast", event:"call", payload:{ signal } });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshThread();
        await ensureChannel();
      } catch (e) {
        // Messages still work without the live channel (it only carries calls and instant nudges).
        console.error("FaithConnect realtime chat failed", e);
      }
    })();
    const poll = setInterval(() => { if (!document.hidden) refreshThread(); }, 4000);
    const onVisible = () => { if (!document.hidden) refreshThread(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      const ch = chatChannelRef.current;
      chatChannelRef.current = null;
      if (ch) { try { ch.unsubscribe(); } catch {} }
      teardown();
    };
    // eslint-disable-next-line
  }, [cid, myId]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior:"smooth" });
  }, [messages]);

  function nudgeOther() {
    ensureChannel().then(ch => ch.send({ type:"broadcast", event:"message", payload:{ ping:true } })).catch(() => {});
  }

  async function sendMessage(type, content) {
    const msg = {
      id:`${myId}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      sender:myId,
      type,
      text:type === "text" ? content : undefined,
      content:type === "voice" ? content : undefined,
      ts:Date.now(),
      pending:true
    };
    setMessages(prev => [...prev, msg]);
    setText(""); setCallErr("");
    try {
      await msgApi.send({ id:msg.id, cid, from:myId, to:other.otherId, type, text:msg.text, audio:msg.content });
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, pending:false } : m));
      refreshThread();
      nudgeOther();
    } catch (e) {
      console.error("Chat send failed", e);
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      if (type === "text") setText(content);
      setCallErr("Message could not be sent. Please check your connection and try again.");
    }
  }

  // Clear chat (like WhatsApp): hides the messages I have seen, for me only.
  // The other person keeps their copy. Uses server timestamps so phone clocks cannot cause trouble.
  function askClearChat() {
    setMenuOpen(false);
    if (messages.some(m => !m.pending)) setConfirmClear(true);
  }
  async function clearChat() {
    setConfirmClear(false);
    const seen = messages.filter(m => !m.pending);
    if (!seen.length) return;
    const upTo = new Date(Math.max(...seen.map(m => m.ts))).toISOString();
    try {
      await msgApi.clear(myId, cid, upTo);
      setMessages(prev => prev.filter(m => m.pending));
      refreshThread();
      onRead && onRead();
    } catch (e) {
      console.error("Clear chat failed", e);
      setCallErr("Chat could not be cleared. Please try again.");
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = e => chunks.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunks.current, { type:"audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => sendMessage("voice", reader.result);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); mediaRecorder.current = mr; setRecording(true);
    } catch { setCallErr("Microphone access was blocked — voice notes need mic permission."); }
  }
  function stopRecording() { mediaRecorder.current?.stop(); setRecording(false); }

  const iceCfg = { iceServers:[{ urls:"stun:stun.l.google.com:19302" }] };

  function setupPeer(mode) {
    const pc = new RTCPeerConnection(iceCfg);
    pcRef.current = pc;
    const remoteStream = new MediaStream();
    pc.ontrack = e => {
      remoteStream.addTrack(e.track);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
    };
    pc.onicecandidate = e => {
      if (e.candidate) {
        myIceRef.current.push(e.candidate);
        broadcastCall({ type:"ice", candidate:e.candidate }).catch(() => {});
      }
    };
    return pc;
  }

  async function startCall(mode) {
    setCallErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true, video:mode === "video" });
      localStreamRef.current = stream;
      const pc = setupPeer(mode);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      if (mode === "video" && localVideoRef.current) localVideoRef.current.srcObject = stream;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      callStateRef.current = { caller:myId, mode, offer, status:"ringing" };
      setCallMode(mode); setCallStatus("calling");
      await broadcastCall({ type:"offer", caller:myId, mode, offer });
    } catch (e) {
      console.error(e); setCallErr("Couldn't access camera/microphone for the call.");
    }
  }

  async function handleCallSignal(signal) {
    if (!signal || signal.caller === myId) return;
    if (signal.type === "offer") {
      pendingOfferRef.current = signal;
      callStateRef.current = signal;
      if (!callMode) { setCallMode(signal.mode); setCallStatus("ringing"); }
      return;
    }
    if (signal.type === "answer" && pcRef.current && callStateRef.current?.caller === myId) {
      try { await pcRef.current.setRemoteDescription(signal.answer); setCallStatus("active"); } catch (e) { console.error(e); }
      return;
    }
    if (signal.type === "ice" && pcRef.current) {
      try { await pcRef.current.addIceCandidate(signal.candidate); } catch {}
      return;
    }
    if (signal.type === "ended") endCallLocal();
  }

  async function acceptCall() {
    setCallErr("");
    try {
      const state = pendingOfferRef.current || callStateRef.current;
      if (!state?.offer) throw new Error("No incoming call offer");
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true, video:state.mode === "video" });
      localStreamRef.current = stream;
      const pc = setupPeer(state.mode);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      if (state.mode === "video" && localVideoRef.current) localVideoRef.current.srcObject = stream;
      await pc.setRemoteDescription(state.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      callStateRef.current = { ...state, status:"active" };
      setCallStatus("active");
      await broadcastCall({ type:"answer", caller:state.caller, answer });
    } catch (e) { console.error(e); setCallErr("Couldn't join the call — camera/mic may be blocked."); }
  }

  async function declineCall() {
    try { await broadcastCall({ type:"ended", caller:callStateRef.current?.caller || myId }); } catch {}
    endCallLocal();
  }

  function teardown() {
    pcRef.current?.close(); pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingCallSignalsRef.current = [];
  }
  function endCallLocal() {
    teardown(); pendingOfferRef.current = null; callStateRef.current = null;
    setCallStatus("idle"); setCallMode(null); setMicOn(true); setCamOn(true); answeredIce.current = new Set(); myIceRef.current = [];
  }
  async function hangUp() {
    try { await broadcastCall({ type:"ended", caller:callStateRef.current?.caller || myId }); } catch {}
    endCallLocal();
  }

  if (callMode && callStatus !== "idle") {
    return (
      <div style={{ ...page, background:"#0A0F0A" }}>
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
              <div style={{ width:120, height:120, borderRadius:"50%", background:"#B8935F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Lora, serif", fontSize:42, color:"#2A1F0E" }}>{other.otherProfile?.name?.[0]?.toUpperCase()}</div>
            </>
          )}
          <div style={{ position:"absolute", top:40, color:"#F8F4EA", fontFamily:"Lora, serif", fontSize:19, textAlign:"center" }}>
            {other.otherProfile?.name}
            <div style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"#B8935F", marginTop:4 }}>
              {callStatus === "calling" && "Calling…"}{callStatus === "ringing" && "Incoming call"}{callStatus === "active" && "Connected"}
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
                <button onClick={() => { localStreamRef.current?.getAudioTracks().forEach(t => t.enabled=!micOn); setMicOn(!micOn); }} style={callBtn(micOn ? "#5C4520" : "#B5616B")}>{micOn ? <Mic size={20} color="#fff"/> : <MicOff size={20} color="#fff"/>}</button>
                {callMode === "video" && <button onClick={() => { localStreamRef.current?.getVideoTracks().forEach(t => t.enabled=!camOn); setCamOn(!camOn); }} style={callBtn(camOn ? "#5C4520" : "#B5616B")}>{camOn ? <Camera size={20} color="#fff"/> : <VideoOff size={20} color="#fff"/>}</button>}
                <button onClick={hangUp} style={callBtn("#B5616B")}><PhoneOff size={20} color="#fff" /></button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const lastMineId = [...messages].reverse().find(x => x.sender === myId)?.id;
  return (
    <div style={{ ...page, height:"100dvh", minHeight:0, overflow:"hidden" }}>
      <FontLoader />
      <div style={{ ...chatHeader, position:"relative" }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", padding:6, marginRight:4 }}><ChevronLeft size={22} color="#F8F4EA" /></button>
        <div style={{ ...avatarSm, background:"#B8935F" }}>{other.otherProfile?.name?.[0]?.toUpperCase() || "?"}</div>
        <div style={{ flex:1, fontFamily:"Lora, serif", fontSize:16.5, color:"#F8F4EA" }}>{other.otherProfile?.name || "Someone"}</div>
        <button onClick={() => startCall("audio")} style={iconBtn}><Phone size={19} color="#F8F4EA" /></button>
        <button onClick={() => startCall("video")} style={iconBtn}><Video size={19} color="#F8F4EA" /></button>
        <button onClick={() => setMenuOpen(v => !v)} style={iconBtn} aria-label="More options"><MoreVertical size={19} color="#F8F4EA" /></button>
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)} style={{ position:"fixed", inset:0, zIndex:19 }} />
            <div style={{ position:"absolute", top:"calc(100% - 6px)", right:12, zIndex:20, background:"#1B2140", border:"1px solid rgba(255,255,255,.14)", borderRadius:12, boxShadow:"0 10px 30px rgba(0,0,0,.45)", minWidth:170, overflow:"hidden" }}>
              <button onClick={askClearChat} style={{ display:"block", width:"100%", textAlign:"left", background:"none", border:"none", color:"#F8F4EA", fontFamily:"Inter, sans-serif", fontSize:14.5, padding:"13px 16px", cursor:"pointer" }}>Clear chat</button>
            </div>
          </>
        )}
      </div>
      <div ref={chatScrollRef} style={{ flex:1, minHeight:0, overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain", padding:"16px 14px", background:"var(--fc-bg)", display:"flex", flexDirection:"column" }}>
        {messages.length === 0 && <div style={emptyState}>Say hello — your conversation starts here.</div>}
        {messages.map(m => {
          const mine = m.sender === myId;
          return (
            <div key={m.id || `${m.sender}-${m.ts}`} style={{ alignSelf:mine ? "flex-end" : "flex-start", maxWidth:"75%", marginBottom:10, display:"flex", flexDirection:"column", alignItems:mine ? "flex-end" : "flex-start" }}>
              <div style={{ background:mine ? "#B8935F" : "#EFE9DC", color:mine ? "#FAF7F0" : "#22252B", padding:"9px 13px", borderRadius:16, fontFamily:"Inter, sans-serif", fontSize:14.5, opacity:m.pending ? 0.6 : 1 }}>
                {m.type === "voice" ? <audio controls src={m.content} style={{height:34, maxWidth:200}} /> : m.text}
              </div>
              {mine && m.id === lastMineId && m.readAt && (
                <div style={{ fontFamily:"Inter, sans-serif", fontSize:11, color:"#858ca1", marginTop:3 }}>Seen</div>
              )}
            </div>
          );
        })}
      </div>
      {callErr && <div style={{fontSize:12, color:"#B5616B", fontFamily:"Inter, sans-serif", padding:"4px 14px", background:"var(--fc-bg)"}}>{callErr}</div>}
      <div style={{ ...composer, flexShrink:0, paddingBottom:"calc(10px + env(safe-area-inset-bottom))" }}>
        <button onClick={recording ? stopRecording : startRecording} style={{ ...iconBtnLight, background:recording ? "#B5616B" : "#EFE9DC" }}>{recording ? <Square size={17} color="#fff" /> : <Mic size={18} color="#4A4A45" />}</button>
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter" && text.trim()) sendMessage("text", text.trim()); }} placeholder="Type a message…" style={{ flex:1, border:"none", outline:"none", fontFamily:"Inter, sans-serif", fontSize:14.5, background:"transparent", padding:"10px 4px", minWidth:0 }} />
        <button onClick={() => text.trim() && sendMessage("text", text.trim())} style={iconBtnLight}><Send size={18} color="#B8935F" /></button>
      </div>
      {confirmClear && (
        <div onClick={() => setConfirmClear(false)} style={{ position:"fixed", inset:0, zIndex:40, background:"rgba(0,0,0,.55)", display:"flex", alignItems:"flex-end", justifyContent:"center", padding:"16px 16px calc(16px + env(safe-area-inset-bottom))" }}>
          <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:420, background:"#1B2140", border:"1px solid rgba(255,255,255,.14)", borderRadius:16, overflow:"hidden" }}>
            <button onClick={clearChat} style={{ display:"block", width:"100%", background:"none", border:"none", borderBottom:"1px solid rgba(255,255,255,.1)", color:"#E3A6A6", fontFamily:"Inter, sans-serif", fontSize:16, fontWeight:600, padding:16, cursor:"pointer" }}>Clear chat</button>
            <button onClick={() => setConfirmClear(false)} style={{ display:"block", width:"100%", background:"none", border:"none", color:"#F8F4EA", fontFamily:"Inter, sans-serif", fontSize:16, padding:16, cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- FELLOWSHIP (random believer connect) ---------------- */
function RandomConnectScreen({ myId, myProfile, onlinePeople = [], onBack, variant = "faith" }) {
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
  const chatScrollRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const answeredIce = useRef(new Set());
  const callStateRef = useRef(null);
  const myQueueEntryTs = useRef(null);
  const matchChannelRef = useRef(null);
  const queueChannelRef = useRef(null);
  const queueTopicRef = useRef(null);
  const matchTopicRef = useRef(null);
  const matchSessionRef = useRef(null);
  const matchPeerRef = useRef(null);
  const matchLeaderRef = useRef(false);
  const pendingCallSignalsRef = useRef([]);
  const remoteStreamRef = useRef(null);

  useEffect(() => {
    loadPresence();
    // eslint-disable-next-line
  }, [onlinePeople, myId, myProfile, isLove]);

  useEffect(() => {
    if (stage !== "searching") return;
    const ch = queueChannelRef.current;
    if (ch) tryPairFromQueue(ch);
  }, [onlinePeople, stage]);

  useEffect(() => () => { clearAll(); }, []);

  useEffect(() => {
    const handleQueueVisibility = async () => {
      const ch = queueChannelRef.current;
      if (!ch || stage !== "searching") return;
      if (document.visibilityState === "hidden") {
        try { await ch.untrack(); } catch {}
      } else {
        try {
          await ch.track({
            id: myId,
            name: myProfile?.name || "Believer",
            gender: myProfile?.gender || null,
            ts: Date.now()
          });
          tryPairFromQueue(ch);
        } catch {}
      }
    };
    document.addEventListener("visibilitychange", handleQueueVisibility);
    return () => document.removeEventListener("visibilitychange", handleQueueVisibility);
  }, [stage, myId, myProfile]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function clearAll() {
    clearInterval(searchPollRef.current); clearInterval(chatPollRef.current); clearInterval(callPollRef.current);
    clearTimeout(revealTimer.current);
    const ch = matchChannelRef.current;
    const qch = queueChannelRef.current;
    queueChannelRef.current = null;
    queueTopicRef.current = null;
    if (qch) { try { qch.untrack(); } catch {} try { qch.unsubscribe(); } catch {} }
    matchChannelRef.current = null;
    matchTopicRef.current = null;
    matchSessionRef.current = null;
    matchPeerRef.current = null;
    matchLeaderRef.current = false;
    if (ch) { try { ch.unsubscribe(); } catch {} }
    pcRef.current?.close(); pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingCallSignalsRef.current = [];
  }

  async function loadPresence() {
    // Online display comes from Realtime Presence, not from the profiles table.
    // A profile existing in the database does NOT mean its owner is online.
    try {
      const wantedGender = isLove
        ? (myProfile?.gender === "Male" ? "Female" : myProfile?.gender === "Female" ? "Male" : null)
        : null;
      const entries = (onlinePeople || [])
        .filter(p => p.id !== myId)
        .filter(p => !wantedGender || p.gender === wantedGender)
        .map(p => ({ id:p.id, name:p.name, gender:p.gender, seeking:p.seeking, avatarUrl:p.avatarUrl }));
      setOnline(entries);
      return entries;
    } catch (e) {
      console.error("FaithConnect online presence lookup failed:", e);
      setOnline([]);
      return [];
    }
  }

  function isCompatible(entry) {
    // Iron Sharpens Iron: anyone can match anyone.
    if (!isLove) return true;

    // Find Your Match: registered Male -> Female, registered Female -> Male.
    const wantedGender = myProfile?.gender === "Male" ? "Female" : myProfile?.gender === "Female" ? "Male" : null;
    return !!wantedGender && entry.gender === wantedGender;
  }

  async function ensureQueueChannel() {
    if (queueChannelRef.current) return queueChannelRef.current;
    const client = await getRealtimeClient();
    const topic = `faithconnect-queue-${kp}`;
    const channel = client.channel(topic, {
      config: { presence: { key: myId }, broadcast: { self: false, ack: true } }
    });

    channel.on("presence", { event: "sync" }, () => {
      tryPairFromQueue(channel);
    });
    channel.on("presence", { event: "join" }, () => {
      tryPairFromQueue(channel);
    });
    channel.on("broadcast", { event: "pair" }, ({ payload }) => {
      const msg = payload || {};
      if (msg.from !== myId && msg.to !== myId) return;
      if (!msg.partnerId || (msg.from !== myId && msg.to !== myId)) return;
      try { channel.untrack(); } catch {}
      try { channel.unsubscribe(); } catch {}
      if (queueChannelRef.current === channel) queueChannelRef.current = null;
      const otherId = msg.from === myId ? msg.to : msg.from;
      const other = msg.from === myId ? msg.partner : msg.fromProfile;
      clearInterval(searchPollRef.current);
      connectTo({ id: otherId, name: other?.name || "Believer" }, mode);
    });

    await new Promise((resolve, reject) => {
      let settled = false;
      const finish = fn => { if (!settled) { settled = true; clearTimeout(timer); fn(); } };
      const timer = setTimeout(() => finish(() => reject(new Error("Queue channel timed out"))), 9000);
      channel.subscribe(async status => {
        if (status === "SUBSCRIBED") {
          try {
            await channel.track({
              id: myId,
              name: myProfile?.name || "Believer",
              gender: myProfile?.gender || null,
              ts: Date.now()
            });
            finish(resolve);
          } catch (e) { finish(() => reject(e)); }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          finish(() => reject(new Error(status)));
        }
      });
    });
    queueChannelRef.current = channel;
    queueTopicRef.current = topic;
    return channel;
  }

  function queueUsers(channel) {
    const state = channel.presenceState();
    const users = [];
    Object.values(state || {}).forEach(entries => {
      (entries || []).forEach(entry => {
        if (entry?.id && !users.some(u => u.id === entry.id)) users.push(entry);
      });
    });
    return users.filter(u => u.id !== myId && isCompatible(u));
  }

  async function tryPairFromQueue(channel) {
    if (stage !== "searching" || queueChannelRef.current !== channel) return;
    const all = queueUsers(channel);
    if (!all.length) return;

    // Only the alphabetically first waiting user acts as the matcher. This prevents
    // two phones from choosing different partners at the same time.
    const everyone = [{ id: myId, name: myProfile?.name || "Believer", gender: myProfile?.gender || null }, ...all]
      .sort((a,b) => String(a.id).localeCompare(String(b.id)));
    if (everyone[0]?.id !== myId) return;

    const candidate = all[Math.floor(Math.random() * all.length)];
    if (!candidate) return;

    const payload = {
      from: myId,
      fromProfile: { name: myProfile?.name || "Believer" },
      to: candidate.id,
      partner: { name: candidate.name || "Believer" },
      partnerId: candidate.id
    };
    try {
      await channel.send({ type:"broadcast", event:"pair", payload });
      // Broadcast excludes the sender, so connect this phone explicitly too.
      try { channel.untrack(); } catch {}
      try { channel.unsubscribe(); } catch {}
      if (queueChannelRef.current === channel) queueChannelRef.current = null;
      clearInterval(searchPollRef.current);
      connectTo({ id:candidate.id, name:candidate.name || "Believer" }, mode);
    } catch (e) {
      console.error("FaithConnect queue pairing failed:", e);
    }
  }

  async function startSearch(m) {
    setMode(m); setStage("searching"); setPartner(null); setSessionId(null); setMessages([]);
    clearInterval(searchPollRef.current);
    try {
      await ensureQueueChannel();
      // Presence sync/join events perform the actual random pairing. There is no
      // second Connect action: once two people are waiting, the system pairs them.
      setTimeout(() => {
        if (queueChannelRef.current) tryPairFromQueue(queueChannelRef.current);
      }, 300);
    } catch (e) {
      console.error("FaithConnect queue setup failed:", e);
      setCallErr("Could not connect to the matching queue. Please try again.");
      setStage("setup");
    }
  }

  function connectTo(p, m) {
    setPartner(p);
    setSessionId(null);
    setStage("connected");
    matchPeerRef.current = p;
    matchLeaderRef.current = myId < p.id;
    if (m === "chat") startRandomChat(p);
    else startRandomCall(null, p, m);
  }

  // Temporary match chat: it is deliberately NOT saved to localStorage/Supabase.
  // Every new match gets a fresh session id, so meeting the same person later starts empty.
  async function ensureMatchChannel(p, m = mode) {
    if (matchChannelRef.current) return matchChannelRef.current;
    const client = await getRealtimeClient();
    const pair = convoId(myId, p.id);
    const topic = `faithconnect-match-${kp}-${pair}`;
    const channel = client.channel(topic, { config:{ broadcast:{ self:false, ack:true } } });
    channel.on("broadcast", { event:"match" }, async ({ payload }) => {
      const msg = payload || {};
      if (msg.from === myId) return;
      if (msg.type === "session_start") {
        matchSessionRef.current = msg.sessionId;
        setSessionId(msg.sessionId);
        if (msg.mode && msg.mode === "chat" && mode === "chat") setMessages([]);
        return;
      }
      if (msg.type === "session_request") {
        if (matchLeaderRef.current && matchSessionRef.current) {
          try { await channel.send({ type:"broadcast", event:"match", payload:{ type:"session_start", sessionId:matchSessionRef.current, mode, from:myId } }); } catch {}
        }
        return;
      }
      if (msg.type === "message") {
        if (!msg.sessionId || msg.sessionId !== matchSessionRef.current) return;
        setMessages(prev => [...prev, msg.message]);
        return;
      }
      if (msg.type === "call") {
        if (!msg.sessionId || msg.sessionId !== matchSessionRef.current) return;
        await handleRandomCallSignal(msg.signal);
      }
    });
    await new Promise((resolve, reject) => {
      let settled=false;
      const timer=setTimeout(()=>{ if(!settled){settled=true;reject(new Error("Match channel timed out"));}},9000);
      channel.subscribe(status=>{
        if(status==="SUBSCRIBED" && !settled){settled=true;clearTimeout(timer);resolve();}
        else if((status==="CHANNEL_ERROR"||status==="TIMED_OUT")&&!settled){settled=true;clearTimeout(timer);reject(new Error(status));}
      });
    });
    matchChannelRef.current=channel;
    matchTopicRef.current=topic;
    if (matchLeaderRef.current) {
      matchSessionRef.current = `session-${genId()}-${Date.now()}`;
      setSessionId(matchSessionRef.current);
      await channel.send({ type:"broadcast", event:"match", payload:{ type:"session_start", sessionId:matchSessionRef.current, mode:m, from:myId } });
    } else {
      await channel.send({ type:"broadcast", event:"match", payload:{ type:"session_request", from:myId } });
    }
    return channel;
  }

  async function waitForMatchSession(p, m = mode) {
    await ensureMatchChannel(p, m);
    if (matchSessionRef.current) return matchSessionRef.current;
    for (let i=0;i<20;i++) {
      if (matchSessionRef.current) return matchSessionRef.current;
      await new Promise(r=>setTimeout(r,150));
      if (matchChannelRef.current && !matchLeaderRef.current) {
        try { await matchChannelRef.current.send({ type:"broadcast", event:"match", payload:{ type:"session_request", from:myId } }); } catch {}
      }
    }
    throw new Error("Match session was not established");
  }

  async function startRandomChat(p) {
    clearInterval(chatPollRef.current);
    setMessages([]);
    setText("");
    try { await waitForMatchSession(p, "chat"); }
    catch (e) { setCallErr("Could not connect the temporary chat. Please press Next and try again."); }
  }

  async function sendRandomMsg() {
    if (!text.trim() || !matchChannelRef.current || !matchSessionRef.current) return;
    const msg={ id:`${myId}-${Date.now()}-${genId()}`, sender:myId, text:text.trim(), ts:Date.now() };
    setMessages(prev=>[...prev,msg]);
    setText("");
    try {
      await matchChannelRef.current.send({ type:"broadcast", event:"match", payload:{ type:"message", sessionId:matchSessionRef.current, message:msg, from:myId } });
    } catch { setCallErr("Message could not be delivered. Please stay connected and try again."); }
  }

  /* --- call mode (audio/video) --- */
  const iceCfg = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
  async function startRandomCall(sid, p, m) {
    setCallErr(""); setCallStatus("connecting");
    const iAmCaller = myId < p.id;
    try {
      await waitForMatchSession(p, m);
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true, video:m === "video" });
      localStreamRef.current = stream;
      if (m === "video" && localVideoRef.current) localVideoRef.current.srcObject = stream;
      const pc = new RTCPeerConnection({ iceServers:[{ urls:"stun:stun.l.google.com:19302" }] });
      pcRef.current = pc;
      stream.getTracks().forEach(t=>pc.addTrack(t,stream));
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      pc.ontrack = e => {
        if (!remoteStream.getTracks().some(t => t.id === e.track.id)) remoteStream.addTrack(e.track);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
      };
      // The call can start before React has mounted the video elements. Attach the
      // local/remote streams again whenever the call screen is rendered below.
      if (m === "video" && localVideoRef.current) localVideoRef.current.srcObject = stream;
      if (m === "video" && remoteVideoRef.current && remoteStream.getTracks().length) remoteVideoRef.current.srcObject = remoteStream;
      if (m !== "video" && remoteAudioRef.current && remoteStream.getTracks().length) remoteAudioRef.current.srcObject = remoteStream;
      pc.onicecandidate = e => {
        if(e.candidate && matchChannelRef.current && matchSessionRef.current) {
          matchChannelRef.current.send({ type:"broadcast", event:"match", payload:{ type:"call", sessionId:matchSessionRef.current, from:myId, signal:{ type:"ice", candidate:e.candidate } } }).catch(()=>{});
        }
      };
      callStateRef.current={ caller:iAmCaller ? myId : p.id, mode:m };
      await flushPendingCallSignals();
      if (iAmCaller) {
        const offer=await pc.createOffer();
        await pc.setLocalDescription(offer);
        await matchChannelRef.current.send({ type:"broadcast", event:"match", payload:{ type:"call", sessionId:matchSessionRef.current, from:myId, signal:{ type:"offer", caller:myId, mode:m, offer } } });
      }
    } catch(e) { console.error(e); setCallErr("Camera/microphone access was blocked or the match connection failed."); }
  }

  async function handleRandomCallSignal(signal) {
    if (!signal || signal.caller === myId) return;
    if (!pcRef.current) {
      pendingCallSignalsRef.current.push(signal);
      return;
    }
    try {
      if (signal.type === "offer" && signal.caller !== myId && !pcRef.current.currentRemoteDescription) {
        await pcRef.current.setRemoteDescription(signal.offer);
        const answer=await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        await matchChannelRef.current.send({ type:"broadcast", event:"match", payload:{ type:"call", sessionId:matchSessionRef.current, from:myId, signal:{ type:"answer", caller:signal.caller, answer } } });
        setCallStatus("connecting");
      } else if (signal.type === "answer" && callStateRef.current?.caller === myId && !pcRef.current.currentRemoteDescription) {
        await pcRef.current.setRemoteDescription(signal.answer);
        setCallStatus("active");
      } else if (signal.type === "ice" && signal.candidate) {
        try { await pcRef.current.addIceCandidate(signal.candidate); } catch {}
      } else if (signal.type === "ended") {
        clearAll();
        setCallStatus("connecting");
      }
    } catch(e) { console.error("Temporary call signaling failed",e); }
  }

  useEffect(() => {
    const local = localStreamRef.current;
    const remote = remoteStreamRef.current;
    if (mode === "video") {
      if (local && localVideoRef.current) localVideoRef.current.srcObject = local;
      if (remote && remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
    } else if (remote && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remote;
      remoteAudioRef.current.play?.().catch(() => {});
    }
  }, [stage, mode, callStatus]);

  async function flushPendingCallSignals() {
    const pending = pendingCallSignalsRef.current.splice(0);
    for (const signal of pending) await handleRandomCallSignal(signal);
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
    ? { bg:GLOW_BG, onlineText: n => `${n} people online`, emptyText: "No one's here yet — check back soon", tagline:"Choose how you'd like to connect — chat, voice, or video", findLabel:"Connect", searchingText:"Waiting for someone to connect" }
    : { bg:GLOW_BG, onlineText: n => `${n} believers online`, emptyText: "Waiting for believers to join", tagline:"Choose how you'd like to connect — chat, voice, or video", findLabel:"Connect", searchingText:"Waiting for someone to connect" };

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
      <div style={{ ...page, height:"100dvh", minHeight:0, overflow:"hidden" }}>
        <FontLoader />
        <div style={chatHeader}>
          <button onClick={leave} style={{ background:"none", border:"none", cursor:"pointer", padding:6, marginRight:4 }}><ChevronLeft size={22} color="#F8F4EA" /></button>
          <div style={{ ...avatarSm, background:"#B8935F" }}>{partner?.name?.[0]?.toUpperCase() || "?"}</div>
          <div style={{ flex:1, fontFamily:"Lora, serif", fontSize:16.5, color:"#F8F4EA" }}>{partner?.name || "Believer"}</div>
          <button onClick={skip} style={iconBtn}><SkipForward size={18} color="#F8F4EA" /></button>
        </div>
        <div ref={chatScrollRef} style={{ flex:1, minHeight:0, overflowY:"auto", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain", padding:"16px 14px", background:"var(--fc-bg)", display:"flex", flexDirection:"column" }}>
          {messages.length === 0 && <div style={emptyState}>Say hello and share what's on your heart.</div>}
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.sender === myId ? "flex-end" : "flex-start", maxWidth:"75%", marginBottom:10 }}>
              <div style={{ background: m.sender === myId ? "#B8935F" : "#EFE9DC", color: m.sender === myId ? "#FAF7F0" : "#22252B", padding:"9px 13px", borderRadius:16, fontFamily:"Inter, sans-serif", fontSize:14.5 }}>{m.text}</div>
            </div>
          ))}
          <div style={{ height:1, flexShrink:0 }} />
        </div>
        <div style={{ ...composer, flexShrink:0, paddingBottom:"calc(10px + env(safe-area-inset-bottom))" }}>
          <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendRandomMsg()} placeholder="Type a message…" style={{ flex:1, border:"none", outline:"none", fontFamily:"Inter, sans-serif", fontSize:14.5, background:"transparent", padding:"10px 4px", minWidth:0 }} />
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
const input = { width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid rgba(255,255,255,0.15)", fontFamily:"Inter, sans-serif", fontSize:14.5, background:"var(--fc-input-bg, #151b30)", color:"var(--fc-text, #F8F4EA)", borderColor:"var(--fc-input-border, rgba(255,255,255,0.15))", boxSizing:"border-box" };
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
const unreadBadge = extra => ({ minWidth:18, height:18, padding:"0 5px", borderRadius:9, background:"#ff3b5c", color:"#fff", fontFamily:"Inter, sans-serif", fontSize:11, fontWeight:700, display:"inline-flex", alignItems:"center", justifyContent:"center", boxSizing:"border-box", ...extra });
const convoRow = { display:"flex", alignItems:"center", width:"100%", background:"#fff", border:"none", borderRadius:14, padding:12, marginBottom:10, cursor:"pointer", boxShadow:"0 1px 2px rgba(20,20,15,.05)" };
const chatHeader = { display:"flex", alignItems:"center", padding:"14px 12px", background:"var(--fc-bg)" };
const iconBtn = { background:"rgba(255,255,255,.1)", border:"none", borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", marginLeft:6 };
const composer = { display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:"#fff", borderTop:"1px solid #E5DFD1", flexShrink:0 };
const iconBtnLight = { width:38, height:38, borderRadius:"50%", border:"none", background:"#EFE9DC", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 };
const callBtn = bg => ({ width:58, height:58, borderRadius:"50%", background:bg, border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" });

