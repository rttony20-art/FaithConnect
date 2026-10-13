import React, { useEffect, useState } from "react";
import AvatarFace from "./avatar/AvatarFace.jsx";
import { isAvatarCode } from "./avatar/code.js";

// Full-screen picture viewer (like tapping a WhatsApp profile photo).
// `src` is a photo address or a built-avatar code; tap anywhere, the X or press Esc to close.
export function ImageViewer({ src, caption, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!src) return null;
  const side = Math.min(typeof window !== "undefined" ? window.innerWidth - 32 : 360, 460);
  return (
    <div onClick={e => { e.stopPropagation(); onClose(); }} role="dialog" aria-label="Photo viewer" style={{
      position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.92)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <button type="button" aria-label="Close" onClick={e => { e.stopPropagation(); onClose(); }} style={{
        position: "absolute", top: 14, right: 14, width: 42, height: 42, borderRadius: "50%", border: "none",
        background: "rgba(255,255,255,.14)", color: "#fff", fontSize: 24, lineHeight: "42px", cursor: "pointer",
      }}>×</button>
      {isAvatarCode(src)
        ? <AvatarFace code={src} size={side} round={false} style={{ borderRadius: 18 }} />
        : <img src={src} alt={caption || "Photo"} onClick={e => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "82vh", objectFit: "contain", borderRadius: 10 }} />}
      {caption && <div style={{ color: "#F8F4EA", fontFamily: "Lora, serif", fontSize: 18, marginTop: 14 }}>{caption}</div>}
    </div>
  );
}

// A small picture that opens the viewer when tapped.
export function ZoomableImage({ src, caption, style, alt = "" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img src={src} alt={alt} onClick={e => { e.stopPropagation(); setOpen(true); }} style={{ ...style, cursor: "zoom-in" }} />
      {open && <ImageViewer src={src} caption={caption} onClose={() => setOpen(false)} />}
    </>
  );
}
