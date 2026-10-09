import React from "react";
import { HAIR_BACK, HAIR_FRONT, SKIN, HAIR, EYES, LIPS, CLOTH, BG } from "./parts.js";
import { decodeAvatar } from "./code.js";

const BASE = "/avatar-parts/";

// shade a "#rrggbb" colour darker (amount 0..1)
function darken(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = s => Math.round(((n >> s) & 255) * (1 - amt));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

function Layer({ file, color, opacity }) {
  const url = `url(${BASE}${file}.svg)`;
  return (
    <div style={{
      position: "absolute", inset: 0, backgroundColor: color, opacity,
      WebkitMaskImage: url, maskImage: url,
      WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
      WebkitMaskSize: "100% 100%", maskSize: "100% 100%",
    }} />
  );
}

// Draws an avatar from its code (or an already-decoded avatar object) at any size.
export default function AvatarFace({ code, avatar, size = 64, round = true, style }) {
  const a = avatar || decodeAvatar(code);
  const skin = SKIN[a.skin], hair = HAIR[a.hairCol];
  return (
    <div role="img" aria-label="Avatar" style={{
      position: "relative", width: size, height: size, overflow: "hidden", flexShrink: 0,
      borderRadius: round ? "50%" : 12, background: BG[a.bg], ...style,
    }}>
      {HAIR_BACK.includes(a.hair) && <Layer file={`hairb-${a.hair}`} color={hair} />}
      <Layer file={`ears-${a.ears}`} color={skin} />
      <Layer file={`face-${a.face}`} color={skin} />
      <Layer file="shade" color={darken(skin, 0.12)} />
      <Layer file={`cloth-${a.cloth}`} color={CLOTH[a.clothCol]} />
      <Layer file={`nose-${a.nose}`} color={darken(skin, 0.28)} />
      <Layer file={`eyew-${a.eyes}`} color="#fff" />
      <Layer file={`eyei-${a.eyes}`} color={EYES[a.eyeCol]} />
      <Layer file={`eyep-${a.eyes}`} color="#1a1a1a" />
      {a.beard > 0 && <Layer file={`beard-${a.beard}`} color={hair} />}
      <Layer file={`mouth-${a.mouth}`} color={LIPS[a.lipCol]} />
      <Layer file={`brows-${a.brows}`} color={hair} />
      {HAIR_FRONT.includes(a.hair) && <Layer file={`hairf-${a.hair}`} color={hair} />}
      {a.acc > 0 && <Layer file={`acc-${a.acc}`} color="#2b2b2b" />}
    </div>
  );
}
