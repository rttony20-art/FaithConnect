import React, { useState, useEffect, useRef, useCallback } from "react";
import { Heart, MessageCircle, Phone, Video, Mic, MicOff, PhoneOff, Send, User, ChevronLeft, Check, X, Camera, VideoOff, Square, SkipForward, Menu, LogOut, Info, Shield, HelpCircle, Eye, EyeOff, Home, UserPlus, Sun, Percent, ArrowRight } from "lucide-react";

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
const GLOW_BG = 'radial-gradient(circle at 50% 20%, rgba(93,124,255,0.16), transparent 45%), radial-gradient(circle at 15% 45%, rgba(86,108,255,0.16), transparent 40%), radial-gradient(circle at 85% 75%, rgba(171,71,255,0.14), transparent 45%), linear-gradient(180deg, #080b17 0%, #070a14 55%, #090b16 100%)';
const ACCENT_GRADIENT = 'linear-gradient(100deg, #526cff, #8d5cff)';

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
    avatarConfig: row.avatar_config || null,
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
    avatar_config: p.avatarConfig || null,
    avatar_emoji: p.avatarEmoji || null, avatar_color: p.avatarColor || null
  };
}

const AVATAR_DEFAULT = { skin:2, hair:1, hairColor:1, eyes:1, brows:1, nose:1, mouth:1, clothes:1, clothesColor:1, accessory:0 };
const AVATAR_OPTIONS = {
  skin:["#F3D2B4","#E8B38D","#C9825B","#9E5B3D","#6F3F2D","#44261F"],
  hair:["Short","Fade","Curls","Waves","Long","Braids","Locs","Bun"],
  hairColor:["#171311","#3B2418","#6B3E22","#A66A35","#D5A15A","#EEE0C5"],
  eyes:["Natural","Bright","Round","Soft","Deep"],
  brows:["Natural","Straight","Arched","Bold","Soft"],
  nose:["Small","Classic","Wide","Defined","Rounded"],
  mouth:["Smile","Soft","Full","Neutral","Bright"],
  clothes:["Shirt","Collar","Sweater","Hoodie","Jacket"],
  clothesColor:["#243B53","#496A81","#7A3F58","#556B4F","#9A7048","#252525"],
  accessory:["None","Glasses","Cross","Earrings"]
};
function normalizeAvatarConfig(c){ return { ...AVATAR_DEFAULT, ...(c||{}) }; }
function AvatarIllustration({ config, size=74 }) {
  const c=normalizeAvatarConfig(config), skin=AVATAR_OPTIONS.skin[c.skin%AVATAR_OPTIONS.skin.length], hair=AVATAR_OPTIONS.hairColor[c.hairColor%AVATAR_OPTIONS.hairColor.length], cloth=AVATAR_OPTIONS.clothesColor[c.clothesColor%AVATAR_OPTIONS.clothesColor.length];
  const eyeY = c.eyes===2 ? 38 : 40, eyeRx = c.eyes===2 ? 3.4 : 2.5;
  const hairPaths=[
    <path d="M24 31Q25 10 50 10Q75 10 76 31L70 28Q67 18 50 18Q33 18 30 29Z"/>,
    <path d="M22 32Q24 8 50 10Q76 8 78 32L68 29Q66 20 50 19Q34 20 31 29Z"/>,
    <path d="M21 31Q21 8 30 13Q38 4 45 13Q54 3 61 13Q71 7 79 27L72 34Q67 23 50 21Q32 22 27 34Z"/>,
    <path d="M20 29Q26 6 50 10Q74 6 80 29L72 35Q67 21 50 20Q33 21 28 35Z"/>,
    <path d="M24 35V20Q27 7 50 9Q73 7 76 20V48H68V27Q63 19 50 19Q37 19 32 27V48H24Z"/>,
    <path d="M24 25Q27 8 50 10Q73 8 76 25V48H68V25Q63 19 50 19Q37 19 32 25V48Z"/><path d="M25 30L17 38L23 43L31 34Z"/>,
    <path d="M22 34Q25 8 50 10Q75 8 78 34L70 39Q67 20 50 20Q33 20 30 39Z"/><circle cx="22" cy="34" r="7"/>,
    <path d="M24 33Q27 8 50 10Q73 8 76 33L70 37Q67 20 50 20Q33 20 30 37Z"/><path d="M68 17Q80 15 79 25Q78 33 70 29Z"/>
  ];
  const eyeShape = c.eyes===1 ? <><ellipse cx="39" cy={eyeY} rx={eyeRx} ry="3" fill="#171311"/><ellipse cx="61" cy={eyeY} rx={eyeRx} ry="3" fill="#171311"/></> : c.eyes===3 ? <><path d="M35 40Q39 36 43 40" stroke="#171311" strokeWidth="2" fill="none"/><path d="M57 40Q61 36 65 40" stroke="#171311" strokeWidth="2" fill="none"/></> : <><circle cx="39" cy={eyeY} r={eyeRx+0.8} fill="#171311"/><circle cx="61" cy={eyeY} r={eyeRx+0.8} fill="#171311"/></>;
  const brows=[<><path d="M34 33Q39 30 44 33"/><path d="M56 33Q61 30 66 33"/></>,<><path d="M34 32L44 32"/><path d="M56 32L66 32"/></>,<><path d="M34 34Q39 28 44 32"/><path d="M56 32Q61 28 66 34"/></>,<><path d="M33 32Q39 27 45 32" strokeWidth="3"/><path d="M55 32Q61 27 67 32" strokeWidth="3"/></>,<><path d="M35 33Q39 31 43 33"/><path d="M57 33Q61 31 65 33"/></>][c.brows%5];
  const mouths=[<path d="M43 57Q50 63 57 57" stroke="#7D3340" strokeWidth="2" fill="none"/>,<path d="M44 58Q50 61 56 58" stroke="#8B4650" strokeWidth="2" fill="none"/>,<path d="M43 57Q50 64 57 57Q50 61 43 57Z" fill="#8B4650"/>,<path d="M45 58H55" stroke="#6B3A38" strokeWidth="2"/>,<path d="M43 56Q50 62 57 56" stroke="#9D3E55" strokeWidth="2.5" fill="none"/>][c.mouth%5];
  const clothes=[<path d="M20 96Q24 72 38 68Q50 75 62 68Q76 72 80 96Z"/>,<path d="M18 96Q23 72 38 69L50 80L62 69Q77 72 82 96Z"/>,<path d="M17 96Q22 70 38 68L50 78L62 68Q78 70 83 96Z"/>,<path d="M16 96Q20 68 37 67L50 78L63 67Q80 68 84 96Z"/>,<path d="M15 96Q20 68 38 66L50 78L62 66Q80 68 85 96Z"/>][c.clothes%5];
  return <svg viewBox="0 0 100 100" width={size} height={size} style={{display:"block"}}>
    <defs><clipPath id={`a${size}`}><circle cx="50" cy="50" r="48"/></clipPath></defs>
    <g clipPath={`url(#a${size})`}>
      <rect width="100" height="100" fill="#E9D8C2"/><path d="M0 100V76Q20 67 35 72L50 88L65 72Q80 67 100 76V100Z" fill={cloth}/>
      {clothes}
      <ellipse cx="50" cy="43" rx="24" ry="29" fill={skin}/>
      <path d="M28 43Q25 49 30 55" fill={skin}/><path d="M72 43Q75 49 70 55" fill={skin}/>
      <g fill="none" stroke="#3D261C" strokeWidth="2" strokeLinecap="round">{brows}</g>
      {eyeShape}
      <path d="M50 41Q46 48 50 52Q54 48 50 41" fill="none" stroke="#6B4031" strokeWidth="1.5"/>
      {mouths}
      <g fill={hair}>{hairPaths[c.hair%8]}</g>
      {c.accessory===1 && <g fill="none" stroke="#242424" strokeWidth="2"><rect x="32" y="34" width="14" height="10" rx="4"/><rect x="54" y="34" width="14" height="10" rx="4"/><path d="M46 38H54"/></g>}
      {c.accessory===2 && <path d="M50 68L45 61H55Z" fill="#D6AE6E"/><path d="M50 60V71" stroke="#D6AE6E" strokeWidth="2"/>}
      {c.accessory===3 && <><circle cx="27" cy="55" r="2" fill="#D6AE6E"/><circle cx="73" cy="55" r="2" fill="#D6AE6E"/></>}
    </g><circle cx="50" cy="50" r="48" fill="none" stroke="rgba(214,174,110,.55)" strokeWidth="1.5"/>
  </svg>;
}
function AvatarCircle({ profile, size = 74, fontSize = 28 }) {
  const style = { width:size, height:size, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" };
  if (profile?.avatarUrl) return <div style={{ ...style, background:`center/cover url(${profile.avatarUrl})` }} />;
  if (profile?.avatarConfig) return <div style={style}><AvatarIllustration config={profile.avatarConfig} size={size}/></div>;
  if (profile?.avatarEmoji) return <div style={{ ...style, background: profile.avatarColor || "#B8935F", fontSize: fontSize * 0.8 }}>{profile.avatarEmoji}</div>;
  return <div style={{ ...style, background:"#B8935F", color:"#FAF7F0", fontFamily:"Lora, serif", fontSize }}>{profile?.name?.[0]?.toUpperCase() || "?"}</div>;
}

function AvatarCreator({ value, onChange }) {
  const [tab,setTab]=useState("skin"); const c=normalizeAvatarConfig(value);
  const set=(key,val)=>onChange({...c,[key]:val});
  const groups=["skin","hair","hairColor","eyes","brows","nose","mouth","clothes","clothesColor","accessory"];
  const labels={skin:"Skin",hair:"Hair",hairColor:"Hair color",eyes:"Eyes",brows:"Brows",nose:"Nose",mouth:"Mouth",clothes:"Clothes",clothesColor:"Clothes color",accessory:"Extras"};
  return <div style={{width:"100%",maxWidth:430,marginTop:10,padding:14,borderRadius:18,background:"rgba(20,28,43,.72)",border:"1px solid rgba(214,174,110,.28)"}}>
    <div style={{display:"flex",justifyContent:"center",marginBottom:10}}><AvatarIllustration config={c} size={118}/></div>
    <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8}}>{groups.map(g=><button key={g} type="button" onClick={()=>setTab(g)} style={{border:"1px solid rgba(214,174,110,.3)",background:tab===g?"#D6AE6E":"transparent",color:tab===g?"#171311":"#EDE6D7",borderRadius:999,padding:"7px 10px",fontSize:11,whiteSpace:"nowrap",cursor:"pointer"}}>{labels[g]}</button>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7}}>{AVATAR_OPTIONS[tab].map((o,i)=><button key={o} type="button" onClick={()=>set(tab,i)} style={{minHeight:38,border:c[tab]===i?"2px solid #D6AE6E":"1px solid rgba(248,244,234,.18)",background:tab==="skin"?o:tab==="hairColor"||tab==="clothesColor"?o:"rgba(248,244,234,.05)",color:tab==="skin"||tab==="hairColor"||tab==="clothesColor"?"transparent":"#EDE6D7",borderRadius:10,cursor:"pointer",fontSize:10,position:"relative"}}>{(tab!=="skin"&&tab!=="hairColor"&&tab!=="clothesColor")&&o}</button>)}</div>
  </div>;
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

function TopBar({ onMenu, dark, overlay, onLogo }) {
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
      <div style={{ width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Heart size={16} color={dark ? "#F8F4EA" : "#22252B"} />
      </div>
    </div>
  );
}

function MenuDrawer({ open, onClose, onLogOut, onNavigate }) {
  const [inviteMsg, setInviteMsg] = useState("");
  const [lightMode, setLightMode] = useState(false);
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
    { icon: Sun, label: lightMode ? "Dark mode" : "Light mode", action: () => setLightMode(v => !v), note: "Coming soon" },
  ];
  return (
    <>
      <div onClick={onClose} style={{
        position:"fixed", inset:0, background:"rgba(15,23,46,0.5)", zIndex:20,
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition:"opacity .25s"
      }} />
      <div style={{
        position:"fixed", top:0, left:0, bottom:0, width:260, background:GLOW_BG, zIndex:21,
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

function MatchHero({ count, onMeetSomeone }) {
  return (
    <div style={{ padding:"18px 22px 40px", textAlign:"center", position:"relative", overflow:"hidden" }}>
      <style>{`
        @keyframes sun-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }
      `}</style>
      <div style={{ position:"relative", width:220, height:220, margin:"0 auto 14px", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{
          position:"absolute", width:200, height:200, borderRadius:"50%",
          border:"1px solid rgba(116,136,255,0.25)", boxShadow:"0 0 70px rgba(77,96,255,.15), inset 0 0 60px rgba(110,87,255,.08)"
        }} />
        <div style={{
          position:"absolute", width:100, height:100, borderRadius:"50%",
          background:"radial-gradient(circle, #fff8c7 0%, #ffe47a 20%, #ffae37 48%, rgba(255,132,43,0.15) 70%, transparent 72%)",
          boxShadow:"0 0 35px #ffce59, 0 0 100px rgba(255,174,55,.55)", animation:"sun-pulse 4s ease-in-out infinite"
        }} />
        <div style={{ position:"relative", width:220, height:180, zIndex:3 }}>
          <div style={{
            position:"absolute", width:98, height:58, top:66, left:10, borderRadius:"80% 20% 70% 30%",
            background:"linear-gradient(145deg, rgba(217,171,145,.95), rgba(108,69,70,.95))",
            filter:"drop-shadow(0 6px 10px rgba(0,0,0,.35))", transform:"rotate(38deg) skewX(-10deg)"
          }} />
          <div style={{
            position:"absolute", width:98, height:58, top:66, right:10, borderRadius:"80% 20% 70% 30%",
            background:"linear-gradient(145deg, rgba(217,171,145,.95), rgba(108,69,70,.95))",
            filter:"drop-shadow(0 6px 10px rgba(0,0,0,.35))", transform:"rotate(-38deg) scaleX(-1) skewX(-10deg)"
          }} />
        </div>
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:9, marginBottom:16 }}>
        <span style={{ width:20, height:1, background:"#647cff" }} />
        <span style={{ fontFamily:"Inter, sans-serif", fontSize:9, letterSpacing:2.5, color:"#8792b4" }}>FAITH • PURPOSE • CONNECTION</span>
        <span style={{ width:20, height:1, background:"#647cff" }} />
      </div>
      <h1 style={{ fontFamily:"Inter, sans-serif", fontSize:32, lineHeight:1.05, letterSpacing:-1, fontWeight:800, color:"#F8F4EA", margin:"0 0 14px" }}>
        Real People. <span style={{ background:"linear-gradient(90deg,#ffffff,#8192ff,#c17cff)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>Same Faith.</span> Greater Purpose.
      </h1>
      <p style={{ fontFamily:"Inter, sans-serif", fontSize:14, color:"#9399aa", margin:"0 0 22px" }}>
        {count > 0 ? `${count} people share your faith and values` : "Connect with people who share your faith, values and desire to grow together."}
      </p>
      <button onClick={onMeetSomeone} style={ctaBtn}>
        Start Matching <ArrowRight size={18} />
      </button>
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
      <div style={{ padding:"18px 22px 8px", background:GLOW_BG }}>
        <button onClick={onBack} style={{ ...backBtn, color:"#D6AE6E", marginBottom:10 }}><ChevronLeft size={18}/> Back</button>
        <h2 style={{ ...heading, color:"#F8F4EA" }}>Security</h2>
        <p style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:"#C9C2AF", margin:"0 0 16px" }}>Change your username or password anytime.</p>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"0 22px 100px", background:GLOW_BG }}>
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
      <div style={{ padding:"18px 16px 4px", background:GLOW_BG }}>
        <button onClick={onBack} style={{ ...backBtn, color:"#B8935F", marginBottom:10 }}><ChevronLeft size={18}/> Back</button>
        <h2 style={{ fontFamily:"Lora, serif", fontSize:22, color:"#F8F4EA", margin:"0 0 4px" }}>See who you match with</h2>
        <p style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:"#B9C9BC", margin:"0 0 16px" }}>Tap someone to reveal your match %</p>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 100px", background:GLOW_BG, display:"flex", flexWrap:"wrap", gap:12, alignContent:"flex-start" }}>
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
    <div style={{ position:"fixed", inset:0, background:GLOW_BG, zIndex:50, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>
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

function FeatureCard({ title, description, gradient, Icon, onConnect }) {
  return (
    <div style={{ background:"linear-gradient(145deg, rgba(22,27,48,0.95), rgba(11,15,29,0.95))", border:"1px solid rgba(255,255,255,0.07)", borderRadius:22, overflow:"hidden" }}>
      <div style={{ height:110, position:"relative", background:gradient, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ position:"absolute", top:12, right:12, width:9, height:9, borderRadius:"50%", background:"#55e8a5", boxShadow:"0 0 12px #55e8a5" }} />
        <Icon size={32} color="#fff" fill={Icon === Heart ? "#fff" : "none"} />
      </div>
      <div style={{ padding:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:"Inter, sans-serif", fontWeight:700, fontSize:14.5, color:"#F8F4EA" }}>{title}</span>
          <span style={{ color:"#8d8fff", fontSize:13 }}>✦</span>
        </div>
        <p style={{ fontFamily:"Inter, sans-serif", fontSize:11.5, color:"#858ca1", lineHeight:1.5, margin:"8px 0 14px", minHeight:32 }}>{description}</p>
        <button onClick={onConnect} style={{ width:"100%", padding:"10px 0", borderRadius:11, color:"#a0aaff", background:"rgba(96,112,255,0.12)", border:"1px solid rgba(108,124,255,0.2)", fontFamily:"Inter, sans-serif", fontWeight:600, fontSize:13, cursor:"pointer" }}>Connect</button>
      </div>
    </div>
  );
}

function TodaysWordCard() {
  return (
    <div style={{ position:"relative", background:"linear-gradient(120deg, #14182a, #080a13)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:22, padding:"28px 24px", overflow:"hidden", marginBottom:16 }}>
      <div style={{ position:"absolute", width:180, height:180, right:-40, top:-60, borderRadius:"50%", background:"radial-gradient(circle, rgba(127,107,255,0.3), transparent 65%)", filter:"blur(16px)" }} />
      <div style={{ position:"relative" }}>
        <div style={{ fontFamily:"Inter, sans-serif", fontSize:9, letterSpacing:3, color:"#7887e8", marginBottom:16 }}>TODAY'S WORD</div>
        <div style={{ fontSize:26, color:"#d4d8ff", textShadow:"0 0 20px rgba(130,135,255,.8)", marginBottom:14 }}>✝</div>
        <h3 style={{ fontFamily:"Lora, serif", fontSize:19, lineHeight:1.35, fontWeight:500, color:"#F8F4EA", margin:0 }}>
          "Iron sharpens iron, and one person sharpens another."
        </h3>
        <p style={{ fontFamily:"Inter, sans-serif", fontSize:12, color:"#757d95", marginTop:12 }}>Proverbs 27:17</p>
      </div>
    </div>
  );
}

function IronSharpensIronCard({ onOpen }) {
  return (
    <FeatureCard
      title="Iron Sharpens Iron"
      description="Grow spiritually with someone who challenges you."
      gradient="linear-gradient(145deg, #473951, #171525)"
      Icon={BibleIcon}
      onConnect={onOpen}
    />
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
      <div style={{ flex:1, overflowY:"auto", padding:"16px 14px", background:GLOW_BG, display:"flex", flexDirection:"column" }}>
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
      {callErr && <div style={{fontSize:12, color:"#B5616B", fontFamily:"Inter, sans-serif", padding:"4px 14px", background:GLOW_BG}}>{callErr}</div>}
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
        <div style={{ flex:1, overflowY:"auto", padding:"16px 14px", background:GLOW_BG, display:"flex", flexDirection:"column" }}>
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
const page = { display:"flex", flexDirection:"column", height:"100dvh", maxWidth:460, margin:"0 auto", fontFamily:"Inter, sans-serif", background:GLOW_BG, overflow:"hidden" };
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
const navBar = { display:"flex", gap:4, padding:7, margin:"0 14px 14px", background:"rgba(12,16,31,0.88)", border:"1px solid rgba(255,255,255,0.09)", borderRadius:23, boxShadow:"0 20px 60px rgba(0,0,0,.5)", position:"sticky", bottom:14 };
const navBtn = active => ({ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"10px 0", background: active ? "rgba(93,108,255,0.15)" : "none", borderRadius:17, border:"none", cursor:"pointer", color: active ? "#a0aaff" : "#626a80", gap:4 });
const matchCard = { background:"linear-gradient(145deg, rgba(22,27,48,0.95), rgba(11,15,29,0.95))", border:"1px solid rgba(255,255,255,0.07)", borderRadius:22, padding:16, marginBottom:14 };
const avatarMd = { width:52, height:52, borderRadius:"50%", background:"#EFE9DC", color:"#B8935F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Lora, serif", fontSize:20, flexShrink:0 };
const avatarSm = { width:38, height:38, borderRadius:"50%", background:"#EFE9DC", color:"#B8935F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Lora, serif", fontSize:15, flexShrink:0, marginRight:10 };
const emptyState = { textAlign:"center", color:"#9B9585", fontFamily:"Inter, sans-serif", fontSize:14, padding:"60px 20px" };
const convoRow = { display:"flex", alignItems:"center", width:"100%", background:"#fff", border:"none", borderRadius:14, padding:12, marginBottom:10, cursor:"pointer", boxShadow:"0 1px 2px rgba(20,20,15,.05)" };
const chatHeader = { display:"flex", alignItems:"center", padding:"14px 12px", background:GLOW_BG };
const iconBtn = { background:"rgba(255,255,255,.1)", border:"none", borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", marginLeft:6 };
const composer = { display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:"#fff", borderTop:"1px solid #E5DFD1" };
const iconBtnLight = { width:38, height:38, borderRadius:"50%", border:"none", background:"#EFE9DC", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 };
const callBtn = bg => ({ width:58, height:58, borderRadius:"50%", background:bg, border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" });

