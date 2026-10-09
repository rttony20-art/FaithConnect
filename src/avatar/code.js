// An avatar is stored as a short text code in the existing avatar_url column,
// e.g. "fcav1:1.3.0.2.4.1.2.0.5.7.0.3.2.4.1.2" - no database change needed.

import { COUNTS, SKIN, HAIR, EYES, LIPS, CLOTH, BG } from "./parts.js";

export const PREFIX = "fcav1:";

// order of the numbers inside the code (never reorder; only append)
const ORDER = [
  ["face", COUNTS.face], ["ears", COUNTS.ears], ["nose", COUNTS.nose], ["mouth", COUNTS.mouth],
  ["eyes", COUNTS.eyes], ["brows", COUNTS.brows], ["hair", COUNTS.hair], ["beard", COUNTS.beard],
  ["cloth", COUNTS.cloth], ["acc", COUNTS.acc],
  ["skin", SKIN.length], ["hairCol", HAIR.length], ["eyeCol", EYES.length], ["lipCol", LIPS.length],
  ["clothCol", CLOTH.length], ["bg", BG.length],
];

export const isAvatarCode = v => typeof v === "string" && v.startsWith(PREFIX);

export function defaultAvatar() {
  return { face: 0, ears: 1, nose: 0, mouth: 0, eyes: 0, brows: 0, hair: 1, beard: 0, cloth: 0, acc: 0, skin: 2, hairCol: 1, eyeCol: 0, lipCol: 0, clothCol: 0, bg: 0 };
}

export function randomAvatar(rnd = Math.random) {
  const a = {};
  for (const [k, n] of ORDER) a[k] = Math.floor(rnd() * n);
  if (a.beard && a.hair !== 11 && rnd() < 0.5) a.beard = 0; // beards are the less common pick
  return a;
}

export function encodeAvatar(a) {
  return PREFIX + ORDER.map(([k]) => a[k] | 0).join(".");
}

// Always returns a valid avatar: bad or missing numbers fall back to the default.
export function decodeAvatar(code) {
  const base = defaultAvatar();
  if (!isAvatarCode(code)) return base;
  const nums = code.slice(PREFIX.length).split(".");
  ORDER.forEach(([k, n], i) => {
    const v = Number(nums[i]);
    if (Number.isInteger(v) && v >= 0 && v < n) base[k] = v;
  });
  return base;
}
