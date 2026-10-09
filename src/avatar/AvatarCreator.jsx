import React, { useState } from "react";
import AvatarFace from "./AvatarFace.jsx";
import { COUNTS, SKIN, HAIR, EYES, LIPS, CLOTH, BG } from "./parts.js";
import { decodeAvatar, encodeAvatar, randomAvatar } from "./code.js";

// Each tab changes one field. "parts" tabs show little previews, "colours" tabs show swatches.
const TABS = [
  { label: "Skin", key: "skin", colors: SKIN },
  { label: "Face", key: "face", count: COUNTS.face },
  { label: "Hair", key: "hair", count: COUNTS.hair },
  { label: "Hair colour", key: "hairCol", colors: HAIR },
  { label: "Eyes", key: "eyes", count: COUNTS.eyes },
  { label: "Eye colour", key: "eyeCol", colors: EYES },
  { label: "Eyebrows", key: "brows", count: COUNTS.brows },
  { label: "Nose", key: "nose", count: COUNTS.nose },
  { label: "Mouth", key: "mouth", count: COUNTS.mouth },
  { label: "Lip colour", key: "lipCol", colors: LIPS },
  { label: "Facial hair", key: "beard", count: COUNTS.beard },
  { label: "Ears", key: "ears", count: COUNTS.ears },
  { label: "Clothes", key: "cloth", count: COUNTS.cloth },
  { label: "Clothes colour", key: "clothCol", colors: CLOTH },
  { label: "Extras", key: "acc", count: COUNTS.acc },
  { label: "Background", key: "bg", colors: BG },
];

// A full-screen sheet where someone builds their own avatar.
// `value` is the current avatar code (or empty); onSave(code) / onClose() are called by the buttons.
export default function AvatarCreator({ value, onSave, onClose }) {
  const [avatar, setAvatar] = useState(() => (value ? decodeAvatar(value) : randomAvatar()));
  const [tab, setTab] = useState(0);
  const t = TABS[tab];
  const set = (key, v) => setAvatar(a => ({ ...a, [key]: v }));

  const btn = { border: "none", borderRadius: 999, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" };
  const opts = t.colors ? t.colors.map((_, i) => i) : Array.from({ length: t.count }, (_, i) => i);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 520, maxHeight: "94vh", overflowY: "auto", background: "#FAF7F0", color: "#2A1F0E", borderRadius: "22px 22px 0 0", padding: "16px 16px 20px", fontFamily: "Inter, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <strong style={{ fontSize: 17 }}>Create your avatar</strong>
          <button type="button" onClick={onClose} style={{ ...btn, background: "transparent", color: "#8A8578", padding: "6px 10px" }}>Cancel</button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", margin: "6px 0 10px" }}>
          <AvatarFace avatar={avatar} size={150} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <button type="button" onClick={() => setAvatar(randomAvatar())} style={{ ...btn, background: "#EFE9DC", color: "#2A1F0E" }}>🎲 Surprise me</button>
        </div>

        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 8 }}>
          {TABS.map((x, i) => (
            <button key={x.key} type="button" onClick={() => setTab(i)} style={{
              ...btn, padding: "7px 12px", fontSize: 12.5, whiteSpace: "nowrap", flexShrink: 0,
              background: i === tab ? "#B8935F" : "#EFE9DC", color: i === tab ? "#fff" : "#2A1F0E",
            }}>{x.label}</button>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", minHeight: 64, marginBottom: 14 }}>
          {opts.map(i => {
            const on = avatar[t.key] === i;
            const ring = on ? "3px solid #B8935F" : "3px solid transparent";
            return t.colors ? (
              <button key={i} type="button" aria-label={`${t.label} ${i + 1}`} onClick={() => set(t.key, i)}
                style={{ width: 38, height: 38, borderRadius: "50%", background: t.colors[i], border: ring, boxShadow: "0 0 0 1px rgba(0,0,0,.2)", cursor: "pointer", padding: 0 }} />
            ) : (
              <button key={i} type="button" aria-label={`${t.label} ${i + 1}`} onClick={() => set(t.key, i)}
                style={{ border: ring, borderRadius: "50%", padding: 0, background: "none", cursor: "pointer", lineHeight: 0 }}>
                <AvatarFace avatar={{ ...avatar, [t.key]: i }} size={56} />
              </button>
            );
          })}
        </div>

        <button type="button" onClick={() => onSave(encodeAvatar(avatar))} style={{ ...btn, width: "100%", background: "#B8935F", color: "#fff", fontSize: 15, padding: "13px 18px" }}>Use this avatar</button>
      </div>
    </div>
  );
}
