// ICE servers for voice/video calls.
//
// STUN alone only works when the two phones can reach each other directly. Phones on
// different mobile networks usually cannot, so we also fetch TURN relay credentials from
// /api/turn (a server-side function that keeps the provider key secret). If anything goes
// wrong we fall back to STUN only, which is what the app used before.

const STUN_ONLY = [{ urls: "stun:stun.l.google.com:19302" }];
const CACHE_MS = 10 * 60 * 1000;

let cache = null;    // { servers, at }
let inflight = null; // shared by calls that start at the same time

function timeoutSignal(ms) {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

// auth = { getToken: async () => accessToken, refresh: async () => refreshes the saved session }
async function fetchServers({ getToken, refresh }) {
  const ask = async () => fetch("/api/turn", {
    headers: { Authorization: `Bearer ${await getToken()}` },
    signal: timeoutSignal(4000),
  });
  let res = await ask();
  if (res.status === 401) { await refresh(); res = await ask(); } // login may have expired
  if (!res.ok) throw new Error(`TURN credentials unavailable (${res.status})`);
  const turn = await res.json();
  if (!Array.isArray(turn) || !turn.length) throw new Error("TURN credentials were empty");
  return [...STUN_ONLY, ...turn];
}

export async function getIceServers(auth) {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.servers;
  inflight ||= fetchServers(auth)
    .then(servers => { cache = { servers, at: Date.now() }; return servers; })
    .catch(e => { console.warn("FaithConnect calls: using STUN only.", e); return STUN_ONLY; })
    .finally(() => { inflight = null; });
  return inflight;
}
