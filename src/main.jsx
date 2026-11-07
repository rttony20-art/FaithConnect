import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Phones often keep an old copy of the app open for days. This checks quietly whether a newer
// version has been published and, if so, shows a small bar so the person can update in one tap.
function UpdateBar() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const mine = document.querySelector('script[type="module"][src*="/assets/"]')?.getAttribute("src");
    if (!mine) return; // running locally, nothing to compare
    let stopped = false;
    async function check() {
      try {
        const html = await (await fetch("/?v=" + Date.now(), { cache:"no-store" })).text();
        const latest = html.match(/\/assets\/[^"']+\.js/)?.[0];
        if (!stopped && latest && !mine.endsWith(latest.replace(/^.*\//, "")) ) setReady(true);
      } catch {}
    }
    const onVisible = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVisible);
    const t = setInterval(check, 5 * 60 * 1000);
    check();
    return () => { stopped = true; clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, []);
  if (!ready) return null;
  return (
    <button onClick={() => window.location.reload()} style={{ position:"fixed", top:0, left:0, right:0, zIndex:9999, border:"none", padding:"10px 14px", background:"#9A7430", color:"#FFF8E6", fontFamily:"Inter, sans-serif", fontSize:14, fontWeight:600, cursor:"pointer", textAlign:"center" }}>
      A new version is ready — tap here to update
    </button>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><UpdateBar /><App /></React.StrictMode>);
