// Run from the repo root:  node scripts/check-session-restore.mjs
import assert from "node:assert";
import { createSessionRestorer, tokenIsFresh } from "../src/sessionRestore.js";

const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = exp => `h.${b64({ exp })}.s`;
const NOW = 1_000_000_000_000;
const sec = NOW / 1000;

assert(tokenIsFresh(jwt(sec + 600), NOW));
assert(!tokenIsFresh(jwt(sec + 5), NOW));   // too close to expiry
assert(!tokenIsFresh(jwt(sec - 10), NOW));  // expired
assert(!tokenIsFresh("garbage", NOW));

function make({ saved, refresh }) {
  const stored = []; let calls = 0;
  const restore = createSessionRestorer({
    load: async () => saved, save: async s => { stored.push(s); },
    refresh: async rt => { calls++; return refresh(rt); }, now: () => NOW,
  });
  return { restore, stored, calls: () => calls };
}

// 1. normal refresh
let t = make({ saved: { access_token: jwt(sec + 5), refresh_token: "r1" }, refresh: async () => ({ access_token: "new", refresh_token: "r2" }) });
assert.equal((await t.restore()).access_token, "new"); assert.equal(t.stored.length, 1);

// 2. refresh fails but saved token is still valid -> keep going
t = make({ saved: { access_token: jwt(sec + 900), refresh_token: "r1" }, refresh: async () => { throw new Error("Failed to fetch"); } });
assert.equal((await t.restore()).access_token, jwt(sec + 900));

// 3. refresh fails and token expired -> null (log in again)
t = make({ saved: { access_token: jwt(sec - 5), refresh_token: "r1" }, refresh: async () => { throw new Error("bad"); } });
assert.equal(await t.restore(), null);

// 4. nothing saved
t = make({ saved: null, refresh: async () => { throw new Error("no"); } });
assert.equal(await t.restore(), null);

// 5. concurrent callers share one refresh
t = make({ saved: { access_token: jwt(sec + 5), refresh_token: "r1" }, refresh: async () => { await new Promise(r => setTimeout(r, 20)); return { access_token: "n", refresh_token: "r2" }; } });
const [a, b, c] = await Promise.all([t.restore(), t.restore(), t.restore()]);
assert.equal(t.calls(), 1); assert(a === b && b === c);
// ...and a later call refreshes again
await t.restore(); assert.equal(t.calls(), 2);
console.log("OK - session restore behaves");
