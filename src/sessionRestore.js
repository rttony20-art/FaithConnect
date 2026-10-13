// Gets a usable login session for the signed-in user.
//
//  * Concurrent callers share ONE refresh (refresh tokens are single-use, so two refreshes
//    at once can make the server revoke the login).
//  * If refreshing fails (flaky connection, or the refresh token was already used) but the
//    saved access token has not expired yet, that token is still good - use it instead of
//    telling the user their session expired.
//
// load()    -> saved { access_token, refresh_token } or null
// save(s)   -> stores a refreshed session
// refresh(refreshToken) -> new session from the server (throws on failure)

export function tokenIsFresh(accessToken, now = Date.now(), marginSec = 30) {
  try {
    const part = String(accessToken).split(".")[1];
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" && json.exp * 1000 > now + marginSec * 1000;
  } catch {
    return false;
  }
}

export function createSessionRestorer({ load, save, refresh, now = () => Date.now() }) {
  let inflight = null;

  async function run() {
    const saved = await load();
    if (!saved) return null;
    if (saved.refresh_token) {
      try {
        const data = await refresh(saved.refresh_token);
        await save(data);
        return data;
      } catch { /* fall through to the saved token */ }
    }
    if (tokenIsFresh(saved.access_token, now())) {
      return { access_token: saved.access_token, refresh_token: saved.refresh_token || null };
    }
    return null;
  }

  return () => (inflight ||= run().finally(() => { inflight = null; }));
}
