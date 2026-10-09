// Makes sure every picture the avatar builder asks for exists in public/avatar-parts.
// Run from the repo root:  node scripts/check-avatar-parts.mjs
import fs from "node:fs";
import { COUNTS, HAIR_BACK, HAIR_FRONT } from "../src/avatar/parts.js";

const dir = new URL("../public/avatar-parts/", import.meta.url);
const need = ["shade"];
const range = (n, from = 0) => Array.from({ length: n - from }, (_, i) => i + from);
for (const [k, n] of Object.entries({ face: COUNTS.face, ears: COUNTS.ears, nose: COUNTS.nose, mouth: COUNTS.mouth, brows: COUNTS.brows, cloth: COUNTS.cloth }))
  range(n).forEach(i => need.push(`${k}-${i}`));
range(COUNTS.eyes).forEach(i => need.push(`eyew-${i}`, `eyei-${i}`, `eyep-${i}`));
range(COUNTS.beard, 1).forEach(i => need.push(`beard-${i}`));
range(COUNTS.acc, 1).forEach(i => need.push(`acc-${i}`));
HAIR_BACK.forEach(i => need.push(`hairb-${i}`));
HAIR_FRONT.forEach(i => need.push(`hairf-${i}`));
const missing = need.filter(n => !fs.existsSync(new URL(n + ".svg", dir)));
if (missing.length) { console.error("Missing avatar parts:", missing.join(", ")); process.exit(1); }
console.log(`OK - all ${need.length} avatar part files exist`);
