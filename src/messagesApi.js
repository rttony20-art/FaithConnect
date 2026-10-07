// Server-backed private messages. Tables are created by supabase/private_messages.sql.
//
// `rest`    - App.jsx's supaRest(path, { method, token, body, extraHeaders })
// `getToken`- async () => current access token
// `refresh` - async () => refreshes the saved session (used once if the token expired)

export function rowToMsg(r) {
  return {
    id: r.id,
    sender: r.sender_id,
    type: r.type,
    text: r.body || undefined,
    content: r.audio || undefined,
    ts: Date.parse(r.created_at) || 0,
    readAt: r.read_at || null,
  };
}

export function createMessagesApi({ rest, getToken, refresh }) {
  // Several requests often run at once. If the login has expired they must share ONE
  // refresh (refresh tokens rotate, so refreshing twice in parallel can sign the user out).
  let refreshing = null;
  const refreshOnce = () => (refreshing ||= refresh().finally(() => { refreshing = null; }));

  async function call(path, opts = {}) {
    const used = await getToken();
    try {
      return await rest(path, { ...opts, token: used });
    } catch (e) {
      if (!/JWT|expired/i.test(String(e?.message))) throw e;
      if ((await getToken()) === used) await refreshOnce(); // else someone already refreshed
      return rest(path, { ...opts, token: await getToken() });
    }
  }

  const MIN = { extraHeaders: { Prefer: "return=minimal" } };

  async function clearedAt(myId, cid) {
    const rows = await call(`conversation_clears?user_id=eq.${myId}&convo_id=eq.${encodeURIComponent(cid)}&select=cleared_at`);
    return rows?.[0] ? Date.parse(rows[0].cleared_at) : 0;
  }

  return {
    // Latest messages of one conversation, oldest first, minus anything I cleared.
    async thread(myId, cid) {
      const [rows, cleared] = await Promise.all([
        call(`private_messages?convo_id=eq.${encodeURIComponent(cid)}&order=created_at.desc&limit=200&select=*`),
        clearedAt(myId, cid),
      ]);
      return (rows || [])
        .filter(r => Date.parse(r.created_at) > cleared)
        .reverse();
    },

    send({ id, cid, from, to, type, text, audio }) {
      return call("private_messages", {
        method: "POST",
        body: { id, convo_id: cid, sender_id: from, recipient_id: to, type, body: text || null, audio: audio || null },
        ...MIN,
      });
    },

    // Unsend: removes my own message for both people.
    remove(id) {
      return call(`private_messages?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", ...MIN });
    },

    markRead(myId, cid) {
      return call(
        `private_messages?convo_id=eq.${encodeURIComponent(cid)}&recipient_id=eq.${myId}&read_at=is.null`,
        { method: "PATCH", body: { read_at: new Date().toISOString() }, ...MIN }
      );
    },

    // Hide a conversation's current messages for me only.
    clear(myId, cid) {
      return call("conversation_clears?on_conflict=user_id,convo_id", {
        method: "POST",
        body: { user_id: myId, convo_id: cid, cleared_at: new Date().toISOString() },
        extraHeaders: { Prefer: "resolution=merge-duplicates,return=minimal" },
      });
    },

    // One entry per conversation: { cid, otherId, last, unread }, newest first.
    async inbox(myId) {
      const [latest, unreadRows, clears] = await Promise.all([
        call(`private_messages?or=(sender_id.eq.${myId},recipient_id.eq.${myId})&order=created_at.desc&limit=300&select=id,convo_id,sender_id,recipient_id,type,body,created_at`),
        call(`private_messages?recipient_id=eq.${myId}&read_at=is.null&select=convo_id,created_at&limit=1000`),
        call(`conversation_clears?user_id=eq.${myId}&select=convo_id,cleared_at`),
      ]);
      return buildInbox(myId, latest || [], unreadRows || [], clears || []);
    },
  };
}

// Pure function (easy to test): groups messages into conversations with unread counts.
export function buildInbox(myId, latest, unreadRows, clears) {
  const clearedAt = new Map(clears.map(c => [c.convo_id, Date.parse(c.cleared_at)]));
  const visible = r => Date.parse(r.created_at) > (clearedAt.get(r.convo_id) || 0);

  const convos = new Map();
  for (const r of latest) { // newest first, so the first row seen is the last message
    if (!visible(r) || convos.has(r.convo_id)) continue;
    convos.set(r.convo_id, {
      cid: r.convo_id,
      otherId: r.sender_id === myId ? r.recipient_id : r.sender_id,
      last: rowToMsg(r),
      unread: 0,
    });
  }
  for (const r of unreadRows) {
    if (visible(r) && convos.has(r.convo_id)) convos.get(r.convo_id).unread += 1;
  }
  return [...convos.values()].sort((a, b) => b.last.ts - a.last.ts);
}
