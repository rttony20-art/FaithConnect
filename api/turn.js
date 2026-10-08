// Vercel serverless function: gives signed-in FaithConnect users temporary TURN relay
// credentials so voice/video calls connect across different networks (mobile data,
// strict wifi, firewalls). The provider key lives in Vercel environment variables and
// never reaches the browser.
//
// Environment variables (Vercel -> Project -> Settings -> Environment Variables):
//   METERED_APP_NAME  the part before ".metered.live" in your Metered app address
//   METERED_API_KEY   your Metered API key
//
// Without them this answers 503 and the app quietly falls back to STUN only.

// Same public values the app already ships with (they are not secrets).
const SUPABASE_URL = "https://vyhhyqegboenrznkjjjc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_E5w6gJK9yQKrvJNWyzhhlg_i78m_wde";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const app = process.env.METERED_APP_NAME;
  const key = process.env.METERED_API_KEY;
  if (!app || !key || !/^[a-z0-9-]+$/i.test(app)) {
    return res.status(503).json({ error: "TURN is not configured" });
  }

  // Only signed-in users may ask, so the free relay allowance is not open to the internet.
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Sign in required" });

  try {
    const who = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!who.ok) return res.status(401).json({ error: "Invalid session" });

    const r = await fetch(`https://${app}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(key)}`);
    if (!r.ok) return res.status(502).json({ error: "TURN provider error" });
    return res.status(200).json(await r.json());
  } catch {
    return res.status(502).json({ error: "TURN lookup failed" });
  }
}
