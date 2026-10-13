import React from "react";
import { ZoomableImage } from "./ImageViewer.jsx";

// The profile page body, organised like a social profile:
//   picture -> name, age -> city -> bio -> photos -> sections (Faith, Values, Interests, Looking for)
// `avatar` is the picture element (tappable to enlarge), made by the app.
export default function ProfileView({ profile, lightMode, avatar, onEdit }) {
  const c = lightMode
    ? { text: "#16233F", sub: "#5C6D82", body: "#34445A", card: "#F5F7FA", border: "#D7DEE8", label: "#5369D9", chipBg: "rgba(96,112,255,.10)", chipText: "#33445A", chipBorder: "rgba(96,112,255,.28)" }
    : { text: "#F8F4EA", sub: "#B9C9BC", body: "#E4E7E2", card: "rgba(255,255,255,.04)", border: "rgba(255,255,255,.12)", label: "#D6AE6E", chipBg: "rgba(96,112,255,.12)", chipText: "#F8F4EA", chipBorder: "rgba(108,124,255,.35)" };

  const label = { fontFamily: "Inter, sans-serif", fontSize: 10.5, letterSpacing: 1.6, color: c.label, fontWeight: 600, marginBottom: 8, textTransform: "uppercase" };
  const card = { marginTop: 14, padding: "14px 16px", borderRadius: 16, border: `1px solid ${c.border}`, background: c.card };
  const chip = { display: "inline-block", fontSize: 13, fontFamily: "Inter, sans-serif", color: c.chipText, background: c.chipBg, border: `1px solid ${c.chipBorder}`, borderRadius: 999, padding: "6px 12px", margin: "0 6px 6px 0" };
  const chips = list => (list || []).filter(Boolean).map(t => <span key={t} style={chip}>{t}</span>);
  const has = list => Array.isArray(list) && list.filter(Boolean).length > 0;
  const photos = (profile.photoUrls || []).filter(Boolean);

  return (
    <div>
      {/* identity */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 6 }}>
        {avatar}
        <h2 style={{ fontFamily: "Lora, serif", fontSize: 26, fontWeight: 600, color: c.text, margin: "14px 0 4px", textAlign: "center" }}>
          {profile.name}{profile.age ? `, ${profile.age}` : ""}
        </h2>
        {profile.city && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: c.sub }}>📍 {profile.city}</div>}
      </div>

      {/* bio, like an Instagram profile */}
      {profile.bio && <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: c.body, lineHeight: 1.6, textAlign: "center", margin: "16px 4px 0", whiteSpace: "pre-wrap" }}>{profile.bio}</p>}

      {onEdit && <button type="button" onClick={onEdit} style={{ display: "block", width: "100%", marginTop: 18, padding: "11px 20px", borderRadius: 12, border: `1.5px solid ${c.chipBorder}`, background: c.chipBg, color: lightMode ? "#356AE8" : "#a0aaff", fontFamily: "Inter, sans-serif", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}>Edit profile</button>}

      {photos.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            {photos.map((u, i) => <ZoomableImage key={i} src={u} caption={profile.name} style={{ width: 104, height: 136, objectFit: "cover", borderRadius: 12, flexShrink: 0 }} />)}
          </div>
        </div>
      )}

      {/* faith */}
      {(profile.denom || profile.favoriteBible) && (
        <div style={card}>
          <div style={label}>Faith</div>
          {profile.denom && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontFamily: "Inter, sans-serif", fontSize: 14, marginBottom: profile.favoriteBible ? 12 : 0 }}>
              <span style={{ color: c.sub }}>Denomination</span>
              <span style={{ color: c.text, fontWeight: 600, textAlign: "right" }}>{profile.denom}</span>
            </div>
          )}
          {profile.favoriteBible && (
            <div style={{ paddingTop: profile.denom ? 12 : 0, borderTop: profile.denom ? `1px solid ${c.border}` : "none" }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: c.sub, marginBottom: 4 }}>Favorite Bible verse / book</div>
              <div style={{ fontFamily: "Lora, serif", fontSize: 17, color: c.text, lineHeight: 1.45 }}>{profile.favoriteBible}</div>
            </div>
          )}
        </div>
      )}

      {has(profile.values) && <div style={card}><div style={label}>What matters to me</div><div>{chips(profile.values)}</div></div>}
      {has(profile.hobbies) && <div style={card}><div style={label}>Interests</div><div>{chips(profile.hobbies)}</div></div>}
      {has(profile.goals) && <div style={card}><div style={label}>Looking for</div><div>{chips(profile.goals)}</div></div>}
    </div>
  );
}
