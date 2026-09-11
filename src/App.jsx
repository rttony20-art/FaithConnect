import React, { useState, useEffect, useRef, useCallback } from "react";
import { Heart, MessageCircle, Phone, Video, Mic, MicOff, PhoneOff, Send, User, ChevronLeft, Check, X, Camera, VideoOff, Square, SkipForward, Menu, LogOut, Info, Shield, HelpCircle, Eye, EyeOff, BookOpen, Home, UserPlus, Sun, Percent, ArrowRight } from "lucide-react";

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
    avatarUrl: row.avatar_url || null, photoUrls: row.photo_urls || []
  };
}
function profileToDb(p) {
  return {
    id: p.id, username: p.username, name: p.name, age: Number(p.age), gender: p.gender, seeking: p.seeking,
    city: p.city, denom: p.denom, faith_level: p.faithLevel, bio: p.bio,
    core_values: p.values || [], hobbies: p.hobbies || [], goals: p.goals || [],
    appearance: p.appearance || [], look_pref: p.lookPref || [],
    avatar_url: p.avatarUrl || null, photo_urls: p.photoUrls || []
  };
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

function PhotoSlot({ label, preview, existingUrl, onPick, big }) {
  const img = preview || existingUrl;
  const size = big ? 96 : 76;
  return (
    <label style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer" }}>
      <div style={{
        width:size, height:size, borderRadius: big ? "50%" : 14, background: img ? `center/cover url(${img})` : "#EFE9DC",
        border:"1.5px dashed #C9A227", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden"
      }}>
        {!img && <Camera size={big ? 26 : 20} color="#B8935F" />}
      </div>
      <span style={{ fontFamily:"Inter, sans-serif", fontSize:11.5, color:"#8A8578" }}>{label}</span>
      <input type="file" accept="image/*" onChange={onPick} style={{ display:"none" }} />
    </label>
  );
}

function Chip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "7px 13px", borderRadius: 999, fontSize: 13.5, fontFamily: "Inter, sans-serif",
      border: active ? "1.5px solid #B8935F" : "1.5px solid #DDD5C7",
      background: active ? "#B8935F" : "transparent", color: active ? "#FAF7F0" : "#4A4A45",
      cursor: "pointer", margin: "3px 5px 3px 0", transition: "all .15s"
    }}>{label}</button>
  );
}

export default function App() {
  const [screen, setScreen] = useState("loading"); // loading, welcome, profile, matches, chat, messages
  const [myId, setMyId] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [form, setForm] = useState({ name:"", age:"", gender:"Female", seeking:"Male", city:"", denom: DENOMS[0], faithLevel:3, bio:"", values:[], hobbies:[], goals:[], appearance:[], lookPref:[], username:"", password:"", avatarUrl:null, photoUrls:[] });
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
  const [loginBusy, setLoginBusy] = useState(false);
  const matchesScrollRef = useRef(null);
  useEffect(() => { if (screen === "matches" && matchesScrollRef.current) matchesScrollRef.current.scrollTop = 0; }, [screen]);
  const [menuOpen, setMenuOpen] = useState(false);

  async function logOut() {
    try { await sdel("supabase-session", false); } catch {}
    setMyId(null);
    setMyProfile(null);
    setForm({ name:"", age:"", gender:"Female", seeking:"Male", city:"", denom: DENOMS[0], faithLevel:3, bio:"", values:[], hobbies:[], goals:[], appearance:[], lookPref:[], username:"", password:"", avatarUrl:null, photoUrls:[] });
    setAvatarFile(null); setAvatarPreview(null); setPhotoFiles([null,null,null]); setPhotoPreviews([null,null,null]);
    setMenuOpen(false);
    setScreen("welcome");
  }

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (!myId || !myProfile) return;
    const beat = () => sset(`presence:${myId}`, { ts: Date.now(), name: myProfile.name }, true);
    beat();
    const t = setInterval(beat, 15000);
    return () => clearInterval(t);
  }, [myId, myProfile]);

  async function init() {
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
    const uname = form.username.trim().toLowerCase().replace(/\s+/g, "");
    if (!uname) { setErr("Please choose a username."); return; }
    setErr("Creating your account…");
    try {
      let data, user, token;
      try {
        data = await supaAuth("signup", { email: usernameToEmail(uname), password: form.password });
        user = data.user || data;
        token = data.access_token;
      } catch (signupErr) {
        // account already exists — if these are YOUR credentials (e.g. a profile save got interrupted earlier), recover it instead of blocking you
        if (/registered|exists|duplicate/i.test(signupErr.message)) {
          try {
            data = await supaAuth("token?grant_type=password", { email: usernameToEmail(uname), password: form.password });
            user = data.user; token = data.access_token;
          } catch {
            setErr("That username is taken — try another.");
            return;
          }
        } else { throw signupErr; }
      }
      if (!token) {
        data = await supaAuth("token?grant_type=password", { email: usernameToEmail(uname), password: form.password });
        user = data.user; token = data.access_token;
      }
      if (!user || !user.id || !token) { setErr("Something went wrong creating your account — try again."); return; }
      setErr("Uploading photos…");
      const { avatarUrl, photoUrls } = await uploadSelectedPhotos(user.id, token);
      const profile = { ...form, id: user.id, age: Number(form.age), username: uname, avatarUrl, photoUrls };
      await supaRest("profiles", { method: "POST", token, body: profileToDb(profile), extraHeaders: { Prefer: "return=minimal" } });
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
      const data = await supaAuth("token?grant_type=password", { email: usernameToEmail(uname), password: loginPass });
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
    <div style={navBar}>
      {[["matches","Matches",Heart],["messages","Messages",MessageCircle],["profile","Profile",User]].map(([key,label,Icon]) => (
        <button key={key} onClick={() => setScreen(key)} style={navBtn(screen===key)}>
          <Icon size={20} strokeWidth={screen===key?2.4:1.8} />
          <span style={{ fontSize: 11, marginTop: 3 }}>{label}</span>
        </button>
      ))}
    </div>
  );

  if (screen === "loading") return <div style={{...page, alignItems:"center", justifyContent:"center"}}><div style={{fontFamily:"Lora, serif", color:"#B8935F"}}>Loading…</div></div>;

  if (screen === "welcome") {
    return (
      <div style={page}>
        <FontLoader />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 28px", background: "#16233F" }}>
          <div style={{ fontFamily: "Lora, serif", fontSize: 15, letterSpacing: 1, color: "#B8935F", marginBottom: 10 }}>a faith-centered matchmaking app</div>
          <h1 style={{ fontFamily: "Lora, serif", fontSize: 40, lineHeight: 1.15, color: "#F8F4EA", fontWeight: 600, margin: "0 0 18px" }}>
            Built on shared conviction, not just chemistry.
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15.5, color: "#C9C2AF", lineHeight: 1.6, maxWidth: 340 }}>
            FaithConnect matches you by faith, values, hobbies, and what you're looking for in a relationship — not a swipe. Chat, send voice notes, or call once you match.
          </p>

          <div style={{ marginTop:30, maxWidth:340, background:"#1D2C4D", border:"1.5px solid #3A4A6E", borderRadius:16, padding:18 }}>
            <label style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"#C9C2AF", display:"block", marginBottom:8 }}>Log in with your username</label>
            <input value={loginUser} onChange={e=>setLoginUser(e.target.value)} placeholder="Username" style={{ ...input, background:"#22304F", color:"#F8F4EA", border:"1.5px solid #3A4A6E", marginBottom:8 }} />
            <PasswordInput value={loginPass} onChange={e=>setLoginPass(e.target.value)} onKeyDown={e => e.key === "Enter" && logIn()} placeholder="Password" style={{ ...input, background:"#22304F", color:"#F8F4EA", border:"1.5px solid #3A4A6E", marginBottom:8 }} />
            <button onClick={logIn} disabled={loginBusy} style={{ ...primaryBtn, width:"100%" }}>{loginBusy ? "Logging in…" : "Log in"}</button>
            {loginErr && <div style={{ color:"#E3A6A6", fontSize:13, fontFamily:"Inter, sans-serif", marginTop:8 }}>{loginErr}</div>}
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
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 22px 100px", background: "#FAF7F0" }}>
          <h2 style={heading}>Tell us about you</h2>
          <p style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"#8A8578", lineHeight:1.5, marginTop:-8, marginBottom:18 }}>
            What you share on this page is how we match you with someone else — other members can see it to find out if you're a good match.
          </p>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}>
            <PhotoSlot label="Profile photo" preview={avatarPreview} existingUrl={form.avatarUrl} onPick={pickAvatar} big />
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
    return <MatchListScreen matches={matches} onOpenChat={(id, profile) => { setActiveConvo({ otherId: id, otherProfile: profile }); setScreen("chat"); }} onBack={() => setScreen("matches")} />;
  }

  if (screen === "profile" && myProfile) {
    return (
      <div style={page}>
        <FontLoader />
        <TopBar onMenu={() => setMenuOpen(true)} dark={false} />
        <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onLogOut={logOut} onNavigate={setScreen} />
        <div style={{ flex:1, overflowY:"auto", padding:"8px 22px 100px", background:"#FAF7F0" }}>
          <div style={{ width:74, height:74, borderRadius:"50%", background: myProfile.avatarUrl ? `center/cover url(${myProfile.avatarUrl})` : "#B8935F", color:"#FAF7F0", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Lora, serif", fontSize:28, margin:"0 auto 14px" }}>
            {!myProfile.avatarUrl && myProfile.name[0]?.toUpperCase()}
          </div>
          <h2 style={{...heading, textAlign:"center"}}>{myProfile.name}, {myProfile.age}</h2>
          <p style={{textAlign:"center", color:"#7A7568", fontFamily:"Inter, sans-serif", fontSize:14, marginTop:-8}}>{myProfile.city} · {myProfile.denom}</p>
          {myProfile.photoUrls && myProfile.photoUrls.length > 0 && (
            <div style={{ display:"flex", gap:8, marginTop:16, overflowX:"auto" }}>
              {myProfile.photoUrls.map((u,i) => <img key={i} src={u} alt="" style={{ width:100, height:130, objectFit:"cover", borderRadius:12, flexShrink:0 }} />)}
            </div>
          )}
          <p style={{fontFamily:"Inter, sans-serif", fontSize:14.5, color:"#4A4A45", lineHeight:1.6, marginTop:18}}>{myProfile.bio}</p>
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
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px 100px", background: "#FAF7F0" }}>
          <button onClick={()=>setScreen("profile")} style={backBtn}><ChevronLeft size={18}/> Back</button>
          <h2 style={heading}>Edit your profile</h2>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}>
            <PhotoSlot label="Profile photo" preview={avatarPreview} existingUrl={form.avatarUrl} onPick={pickAvatar} big />
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
        <TopBar onMenu={() => setMenuOpen(true)} dark={false} />
        <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onLogOut={logOut} onNavigate={setScreen} />
        <div style={{ padding: "10px 22px 8px", background:"#FAF7F0" }}><h2 style={heading}>Messages</h2></div>
        <div style={{ flex:1, overflowY:"auto", padding:"0 16px 100px", background:"#FAF7F0" }}>
          {conversations.length === 0 && <div style={emptyState}>No conversations yet. Start one from your matches.</div>}
          {conversations.map(c => (
            <button key={c.otherId} onClick={() => { setActiveConvo({ otherId: c.otherId, otherProfile: c.otherProfile }); setScreen("chat"); }} style={convoRow}>
              <div style={avatarSm}>{c.otherProfile?.name?.[0]?.toUpperCase() || "?"}</div>
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
      <div ref={matchesScrollRef} style={{ flex:1, overflowY:"auto", background:"#FAF7F0" }}>
        <div style={{ position:"relative" }}>
          <TopBar onMenu={() => setMenuOpen(true)} dark overlay />
          <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} onLogOut={logOut} onNavigate={setScreen} />
          <MatchHero count={matches.length} onMeetSomeone={() => setScreen("meetSomeone")} />
        </div>
        <div style={{ background:"#16233F", paddingBottom:100 }}>
          <div style={{ padding: "28px 16px 0" }}>
            <IronSharpensIronCard onOpen={() => setScreen("fellowship")} />
            <button onClick={() => setScreen("fellowship")} style={{ ...ctaBtn, width:"100%", marginTop:14 }}>Share with someone <ArrowRight size={18} /></button>
          </div>
          <div style={{ padding:"24px 16px 0" }}>
          {matches.map(({ profile, score }) => (
            <div key={profile.id} style={matchCard}>
            <div style={{display:"flex", gap:14}}>
              <div style={{...avatarMd, background: profile.avatarUrl ? `center/cover url(${profile.avatarUrl})` : avatarMd.background}}>{!profile.avatarUrl && profile.name?.[0]?.toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
                  <div style={{fontFamily:"Lora, serif", fontSize:17, color:"#22252B"}}>{profile.name}, {profile.age}</div>
                  <div style={{fontFamily:"Lora, serif", fontSize:17, color:"#B5616B", fontWeight:600}}>{score.pct}%</div>
                </div>
                <div style={{fontFamily:"Inter, sans-serif", fontSize:13, color:"#8A8578"}}>{profile.city} · {profile.denom}</div>
              </div>
            </div>
            <p style={{fontFamily:"Inter, sans-serif", fontSize:13.5, color:"#4A4A45", lineHeight:1.5, margin:"10px 0"}}>{profile.bio}</p>
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
      <label style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"#6B6658", display:"block", marginBottom:6 }}>{label}</label>
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
    <span key={t} style={{ display:"inline-block", fontSize:12, fontFamily:"Inter, sans-serif", color:"#6E8F72", background:"#E9EFE7", padding:"4px 10px", borderRadius:999, marginRight:6, marginBottom:6 }}>{t}</span>
  ))}</div>;
}
function FontLoader() {
  return <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');`}</style>;
}

function TopBar({ onMenu, dark, overlay }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", padding:"14px 16px 4px",
      position: overlay ? "absolute" : "static", top:0, left:0, right:0, zIndex: overlay ? 5 : "auto"
    }}>
      <button onClick={onMenu} style={{ background:"none", border:"none", cursor:"pointer", padding:8, display:"flex" }}>
        <Menu size={22} color={dark ? "#F8F4EA" : "#22252B"} />
      </button>
      <span style={{ fontFamily:"Lora, serif", fontSize:16, color: dark ? "#F8F4EA" : "#22252B", marginLeft:4 }}>FaithConnect</span>
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
    { icon: BookOpen, label: "Share", action: () => onNavigate("fellowship") },
    { icon: MessageCircle, label: "Messages", action: () => onNavigate("messages") },
    { icon: User, label: "Profile", action: () => onNavigate("profile") },
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
        position:"fixed", top:0, left:0, bottom:0, width:260, background:"#16233F", zIndex:21,
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
        <div style={{ borderTop:"1px solid #2A3B5F", marginTop:14, paddingTop:14 }}>
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
    <div style={{ background:"#16233F", padding:"36px 22px 40px", textAlign:"center", position:"relative", overflow:"hidden" }}>
      <style>{`
        @keyframes ripple-out {
          0%   { transform: scale(0.5); opacity: 0.55; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes heart-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
      <div style={{ position:"relative", width:180, height:180, margin:"0 auto 22px", display:"flex", alignItems:"center", justifyContent:"center" }}>
        {[0, 0.9, 1.8].map(delay => (
          <span key={delay} style={{
            position:"absolute", width:110, height:110, borderRadius:"50%",
            border:"1.5px solid rgba(184,147,95,0.55)",
            animation:`ripple-out 2.7s ease-out ${delay}s infinite`
          }} />
        ))}
        <svg width="96" height="96" viewBox="0 0 100 100" style={{ position:"relative", animation:"heart-bob 3.4s ease-in-out infinite", filter:"drop-shadow(0 4px 18px rgba(181,97,107,0.55))" }}>
          <defs>
            <linearGradient id="heartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D98089" />
              <stop offset="55%" stopColor="#B5616B" />
              <stop offset="100%" stopColor="#8E4650" />
            </linearGradient>
            <radialGradient id="heartShine" cx="35%" cy="28%" r="35%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>
          <path d="M50 88 C22 66 6 48 6 29 C6 13 18 3 32 3 C41 3 48 8 50 16 C52 8 59 3 68 3 C82 3 94 13 94 29 C94 48 78 66 50 88 Z" fill="url(#heartGrad)" />
          <path d="M50 88 C22 66 6 48 6 29 C6 13 18 3 32 3 C41 3 48 8 50 16 C52 8 59 3 68 3 C82 3 94 13 94 29 C94 48 78 66 50 88 Z" fill="url(#heartShine)" />
        </svg>
      </div>
      <h1 style={{ fontFamily:"Lora, serif", fontSize:24, color:"#F8F4EA", margin:"0 0 6px", fontWeight:600 }}>Meet your match</h1>
      <p style={{ fontFamily:"Inter, sans-serif", fontSize:14, color:"#B9B2A0", margin:"0 0 20px" }}>
        {count > 0 ? `${count} people share your faith and values` : "Ripples are going out to find your match"}
      </p>
      <button onClick={onMeetSomeone} style={ctaBtn}>
        Meet someone <ArrowRight size={18} />
      </button>
    </div>
  );
}

function MatchListScreen({ matches, onOpenChat, onBack }) {
  return (
    <div style={page}>
      <FontLoader />
      <div style={{ padding:"18px 16px 4px", background:"#16233F" }}>
        <button onClick={onBack} style={{ ...backBtn, color:"#B8935F", marginBottom:10 }}><ChevronLeft size={18}/> Back</button>
        <h2 style={{ fontFamily:"Lora, serif", fontSize:22, color:"#F8F4EA", margin:"0 0 4px" }}>See who you match with</h2>
        <p style={{ fontFamily:"Inter, sans-serif", fontSize:13.5, color:"#B9C9BC", margin:"0 0 16px" }}>Ranked by shared faith, values, goals, age & interests</p>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 100px", background:"#16233F" }}>
        {matches.length === 0 && <div style={emptyState}>No matches yet — check back once more people join.</div>}
        {matches.map(({ profile, score }) => (
          <div key={profile.id} style={matchCard}>
            <div style={{display:"flex", gap:14}}>
              <div style={{...avatarMd, background: profile.avatarUrl ? `center/cover url(${profile.avatarUrl})` : avatarMd.background}}>{!profile.avatarUrl && profile.name?.[0]?.toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
                  <div style={{fontFamily:"Lora, serif", fontSize:17, color:"#22252B"}}>{profile.name}, {profile.age}</div>
                  <div style={{fontFamily:"Lora, serif", fontSize:17, color:"#B5616B", fontWeight:600}}>{score.pct}%</div>
                </div>
                <div style={{fontFamily:"Inter, sans-serif", fontSize:13, color:"#8A8578"}}>{profile.city} · {profile.denom}</div>
              </div>
            </div>
            <p style={{fontFamily:"Inter, sans-serif", fontSize:13.5, color:"#4A4A45", lineHeight:1.5, margin:"10px 0"}}>{profile.bio}</p>
            <Tag list={[...(profile.values||[]).slice(0,2), ...(profile.hobbies||[]).slice(0,2)]} />
            <button onClick={() => onOpenChat(profile.id, profile)} style={{...secondaryBtn, width:"100%", marginTop:12}}>Say hello</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function IronSharpensIronCard({ onOpen }) {
  return (
    <button onClick={onOpen} style={{
      display:"flex", alignItems:"center", gap:16, width:"100%", textAlign:"left",
      background:"#1D2C4D", border:"1.5px solid #3A4A6E", borderRadius:18, padding:16, marginBottom:14, cursor:"pointer"
    }}>
      <style>{`
        @keyframes iron-ripple { 0% { transform: scale(0.5); opacity:.5; } 100% { transform: scale(2.2); opacity:0; } }
      `}</style>
      <div style={{ position:"relative", width:64, height:64, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        {[0, 1].map(i => (
          <span key={i} style={{ position:"absolute", width:44, height:44, borderRadius:"50%", border:"1.5px solid rgba(184,147,95,.55)", animation:`iron-ripple 2.4s ease-out ${i*0.8}s infinite` }} />
        ))}
        <div style={{ position:"relative", width:40, height:40, borderRadius:"50%", background:"#B8935F", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 3px 10px rgba(184,147,95,.4)" }}>
          <BookOpen size={19} color="#16233F" />
        </div>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:"Lora, serif", fontSize:17, color:"#F8F4EA" }}>Iron Sharpens Iron</div>
        <div style={{ fontFamily:"Inter, sans-serif", fontSize:13, color:"#B9C9BC", marginTop:2 }}>Meet a random believer and share about your faith</div>
      </div>
    </button>
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
      <div style={{ ...page, background: "#0F172E" }}>
        <FontLoader />
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative" }}>
          {callMode === "video" ? (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", background:"#0F172E" }} />
              <video ref={localVideoRef} autoPlay playsInline muted style={{ position:"absolute", bottom:110, right:16, width:100, height:140, borderRadius:14, objectFit:"cover", border:"2px solid #B8935F" }} />
            </>
          ) : (
            <>
              <audio ref={remoteAudioRef} autoPlay />
              <div style={{ width:120, height:120, borderRadius:"50%", background:"#B8935F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Lora, serif", fontSize:42, color:"#0F172E" }}>
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
                <button onClick={() => { localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !micOn); setMicOn(!micOn); }} style={callBtn(micOn ? "#2A3B5F" : "#B5616B")}>
                  {micOn ? <Mic size={20} color="#fff"/> : <MicOff size={20} color="#fff"/>}
                </button>
                {callMode === "video" && (
                  <button onClick={() => { localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = !camOn); setCamOn(!camOn); }} style={callBtn(camOn ? "#2A3B5F" : "#B5616B")}>
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
      <div style={{ flex:1, overflowY:"auto", padding:"16px 14px", background:"#FAF7F0", display:"flex", flexDirection:"column" }}>
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
      {callErr && <div style={{fontSize:12, color:"#B5616B", fontFamily:"Inter, sans-serif", padding:"4px 14px", background:"#FAF7F0"}}>{callErr}</div>}
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
      if (p && now - p.ts < 45000) entries.push({ id: k.replace("presence:", ""), name: p.name });
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
    ? { bg:"#16233F", onlineText: n => `${n} people online`, emptyText: "No one's here yet — check back soon", tagline:"Looking for someone who shares your faith", findLabel:"Find my match", searchingText:"Hang tight while we find your match" }
    : { bg:"#16233F", onlineText: n => `${n} believers online`, emptyText: "Waiting for believers to join", tagline:"Iron sharpens iron — meet someone new", findLabel:"Find a believer", searchingText:"Hang tight while we find someone to share with" };

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
        <div style={{ flex:1, overflowY:"auto", padding:"16px 14px", background:"#FAF7F0", display:"flex", flexDirection:"column" }}>
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
    <div style={{ ...page, background:"#0F172E" }}>
      <FontLoader />
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative" }}>
        {mode === "video" ? (
          <>
            <video ref={remoteVideoRef} autoPlay playsInline style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", background:"#0F172E" }} />
            <video ref={localVideoRef} autoPlay playsInline muted style={{ position:"absolute", bottom:110, right:16, width:100, height:140, borderRadius:14, objectFit:"cover", border:"2px solid #B8935F" }} />
          </>
        ) : (
          <>
            <audio ref={remoteAudioRef} autoPlay />
            <div style={{ width:120, height:120, borderRadius:"50%", background:"#B8935F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Lora, serif", fontSize:42, color:"#0F172E" }}>
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
          <button onClick={() => { localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !micOn); setMicOn(!micOn); }} style={callBtn(micOn ? "#2A3B5F" : "#B5616B")}>
            {micOn ? <Mic size={20} color="#fff"/> : <MicOff size={20} color="#fff"/>}
          </button>
          {mode === "video" && (
            <button onClick={() => { localStreamRef.current?.getVideoTracks().forEach(t => t.enabled = !camOn); setCamOn(!camOn); }} style={callBtn(camOn ? "#2A3B5F" : "#B5616B")}>
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
  const gradient = isLove ? "linear-gradient(135deg,#D98089,#8E4650)" : "linear-gradient(135deg,#8AAE8E,#4E6E52)";
  const glow = isLove ? "rgba(181,97,107,.5)" : "rgba(78,110,82,.5)";
  return (
    <div style={{ position:"relative", width:220, height:220, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`
        @keyframes fr-ripple { 0% { transform: scale(0.4); opacity:.5; } 100% { transform: scale(2.4); opacity:0; } }
        @keyframes fr-pop { 0% { opacity:0; transform: scale(.4); } 60% { opacity:1; transform: scale(1.1); } 100% { opacity:1; transform: scale(1); } }
        @keyframes fr-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ position:"absolute", width:100, height:100, borderRadius:"50%", border:"1.5px solid rgba(184,147,95,.5)", animation:`fr-ripple ${active ? 1.8 : 2.6}s ease-out ${i*0.7}s infinite` }} />
      ))}
      <div style={{ width:74, height:74, borderRadius:"50%", background:gradient, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 18px ${glow}` }}>
        {isLove ? <Heart size={30} color="#FAF7F0" fill="#FAF7F0" /> : <BookOpen size={30} color="#FAF7F0" />}
      </div>
      <div style={{ position:"absolute", inset:0, animation: active ? "fr-spin 7s linear infinite" : "none" }}>
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
    </div>
  );
}

/* ---------------- styles ---------------- */
const page = { display:"flex", flexDirection:"column", height:"100vh", maxWidth:460, margin:"0 auto", fontFamily:"Inter, sans-serif", background:"#FAF7F0", overflow:"hidden" };
const heading = { fontFamily:"Lora, serif", fontSize:24, color:"#22252B", margin:"0 0 14px", fontWeight:600 };
const input = { width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #DDD5C7", fontFamily:"Inter, sans-serif", fontSize:14.5, background:"#fff", boxSizing:"border-box" };
const primaryBtn = { background:"#B8935F", color:"#FAF7F0", border:"none", padding:"13px 26px", borderRadius:12, fontFamily:"Inter, sans-serif", fontSize:15, fontWeight:600, cursor:"pointer" };
const ctaBtn = {
  background:"linear-gradient(180deg, #D6AE6E 0%, #B8935F 55%, #9C7A48 100%)",
  color:"#2A1F0E", border:"1px solid #8A6A38",
  padding:"15px 28px", borderRadius:999,
  fontFamily:"Inter, sans-serif", fontSize:15.5, fontWeight:700,
  cursor:"pointer", letterSpacing:0.2,
  boxShadow:"0 3px 0 #7C6032, 0 8px 16px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.5)",
  display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8
};
const secondaryBtn = { background:"transparent", color:"#B8935F", border:"1.5px solid #B8935F", padding:"11px 20px", borderRadius:12, fontFamily:"Inter, sans-serif", fontSize:14.5, fontWeight:600, cursor:"pointer" };
const backBtn = { display:"flex", alignItems:"center", gap:2, background:"none", border:"none", color:"#B8935F", fontFamily:"Inter, sans-serif", fontSize:14, cursor:"pointer", padding:0, marginBottom:12 };
const navBar = { display:"flex", borderTop:"1px solid #E5DFD1", background:"#FAF7F0", position:"sticky", bottom:0 };
const navBtn = active => ({ flex:1, display:"flex", flexDirection:"column", alignItems:"center", padding:"10px 0 12px", background:"none", border:"none", cursor:"pointer", color: active ? "#B8935F" : "#9B9585" });
const matchCard = { background:"#fff", borderRadius:18, padding:16, marginBottom:14, boxShadow:"0 1px 3px rgba(20,20,15,.06)" };
const avatarMd = { width:52, height:52, borderRadius:"50%", background:"#EFE9DC", color:"#B8935F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Lora, serif", fontSize:20, flexShrink:0 };
const avatarSm = { width:38, height:38, borderRadius:"50%", background:"#EFE9DC", color:"#B8935F", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Lora, serif", fontSize:15, flexShrink:0, marginRight:10 };
const emptyState = { textAlign:"center", color:"#9B9585", fontFamily:"Inter, sans-serif", fontSize:14, padding:"60px 20px" };
const convoRow = { display:"flex", alignItems:"center", width:"100%", background:"#fff", border:"none", borderRadius:14, padding:12, marginBottom:10, cursor:"pointer", boxShadow:"0 1px 2px rgba(20,20,15,.05)" };
const chatHeader = { display:"flex", alignItems:"center", padding:"14px 12px", background:"#16233F" };
const iconBtn = { background:"rgba(255,255,255,.1)", border:"none", borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", marginLeft:6 };
const composer = { display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:"#fff", borderTop:"1px solid #E5DFD1" };
const iconBtnLight = { width:38, height:38, borderRadius:"50%", border:"none", background:"#EFE9DC", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 };
const callBtn = bg => ({ width:58, height:58, borderRadius:"50%", background:bg, border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" });

