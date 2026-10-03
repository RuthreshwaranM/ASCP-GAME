/* =====================================================
   LEADERBOARD - pilot name + online scores (Supabase)
   ===================================================== */
const LB_CONFIG = {
  url: "https://fvyzlptcdzdtcwxezhau.supabase.co",
  key: "sb_publishable_lB0eXrpJhiGdhz9T6jYNEw_sUrZaOw-",
  titles: ["Commander", "Captain", "First Officer"],   // rank 1, 2, 3
  show: 10,       // how many players the list shows
  maxName: 20     // longest name allowed
};

const Leaderboard = (() => {
  const $ = (id) => document.getElementById(id);
  const online = () => !!(LB_CONFIG.url && LB_CONFIG.key);
  const titleOf = (rank) => LB_CONFIG.titles[rank - 1] || "";

  let name = "", pid = "", pendingStart = false;
  let submitted = false;   // makes sure each crash is saved only once
  try {
    name = localStorage.getItem("akasaPlayerName") || "";
    pid = localStorage.getItem("akasaPlayerId") || "";
  } catch (e) {}
  if (!pid) {
    pid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : "p-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    try { localStorage.setItem("akasaPlayerId", pid); } catch (e) {}
  }

  /* ---------- talking to Supabase ---------- */
  function headers() {
    const h = { apikey: LB_CONFIG.key, "Content-Type": "application/json" };
    if (LB_CONFIG.key.startsWith("eyJ")) h.Authorization = "Bearer " + LB_CONFIG.key;
    return h;
  }

  // returns { ok: true } or { ok: false, why: "reason" }
  async function send(score, coins) {
    if (!online()) return { ok: false, why: "no keys" };
    if (!name) return { ok: false, why: "no name" };
    try {
      const r = await fetch(LB_CONFIG.url + "/rest/v1/rpc/submit_score", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ p_id: pid, p_name: name, p_score: score, p_coins: coins })
      });
      if (r.ok) return { ok: true };
      let msg = "";
      try { msg = await r.text(); } catch (e) {}
      console.error("Leaderboard save failed:", r.status, msg);
      return { ok: false, why: "HTTP " + r.status };
    } catch (e) {
      console.error("Leaderboard save error:", e);
      return { ok: false, why: "network error" };
    }
  }

  async function fetchTop() {
    if (!online()) return null;
    try {
      const r = await fetch(
        LB_CONFIG.url + "/rest/v1/scores?select=player_id,name,best_score,coins" +
        "&order=best_score.desc,updated_at.asc&limit=50",
        { headers: headers() }
      );
      return r.ok ? await r.json() : null;
    } catch (e) { return null; }
  }

  /* ---------- leaderboard screen ---------- */
  function makeRow(rank, p, isMe) {
    const row = document.createElement("div");
    row.className = "row" + (isMe ? " me" : "") + (rank <= 3 ? " t" + rank : "");

    const rk = document.createElement("div");
    rk.className = "rk"; rk.textContent = "#" + rank;

    const nm = document.createElement("div");
    nm.className = "nm"; nm.textContent = p.name;
    const t = titleOf(rank);
    if (t) {
      const tt = document.createElement("span");
      tt.className = "tt"; tt.textContent = t;
      nm.appendChild(tt);
    }

    const sc = document.createElement("div");
    sc.className = "sc"; sc.textContent = p.best_score;

    const cn = document.createElement("div");
    cn.className = "cn"; cn.textContent = p.coins + " coins";

    row.append(rk, nm, sc, cn);
    return row;
  }

  async function showBoard() {
    const list = $("boardList");
    $("board").classList.remove("hidden");
    list.innerHTML = '<div class="note">Loading...</div>';

    const rows = await fetchTop();
    list.innerHTML = "";
    if (!rows) { list.innerHTML = '<div class="note">Leaderboard is offline right now.</div>'; return; }
    if (!rows.length) { list.innerHTML = '<div class="note">No pilots yet. Be the first!</div>'; return; }

    rows.slice(0, LB_CONFIG.show).forEach((p, i) => list.appendChild(makeRow(i + 1, p, p.player_id === pid)));

    // if you are outside the top list, show your own row at the bottom
    const me = rows.findIndex((p) => p.player_id === pid);
    if (me >= LB_CONFIG.show) {
      list.insertAdjacentHTML("beforeend", '<div class="note">...</div>');
      list.appendChild(makeRow(me + 1, rows[me], true));
    }
  }

  /* ---------- after the aircraft crashes ---------- */
  async function onGameOver(score, coins) {
    if (submitted) return;          // already saved for this crash
    submitted = true;

    const rankEl = $("rankLine"), topEl = $("topLine");
    topEl.textContent = "";
    if (!online()) { rankEl.textContent = ""; return; }
    rankEl.textContent = "Saving your score...";

    // also uploads the best score kept on this device (it can only ever go up online)
    const localBest = Number($("bestScore").textContent) || 0;
    const res = await send(Math.max(score, localBest), coins);

    const rows = await fetchTop();
    if (!rows) { rankEl.textContent = "Leaderboard offline - score not saved"; return; }

    const me = rows.findIndex((p) => p.player_id === pid);
    if (me >= 0) {
      const rank = me + 1, t = titleOf(rank);
      rankEl.textContent = t ? "#" + rank + " - You are the " + t + "!" : "Your rank: #" + rank;
    } else {
      rankEl.textContent = "Keep flying to reach the top 50!";
    }

    if (!res.ok) topEl.textContent = "Could not save score (" + res.why + ")";
    else if (rows[0]) topEl.textContent = "Top pilot: " + rows[0].name + " - " + rows[0].best_score;
  }

  // Safety net: if game.js does not call onGameOver, we notice the game over screen ourselves
  const overBox = $("gameover");
  new MutationObserver(() => {
    if (overBox.classList.contains("hidden")) { submitted = false; return; }
    if (!submitted) {
      onGameOver(Number($("finalScore").textContent) || 0, Number($("finalCoins").textContent) || 0);
    }
  }).observe(overBox, { attributes: true, attributeFilter: ["class"] });

  /* ---------- name box ---------- */
  function askName(startAfter) {
    pendingStart = !!startAfter;
    $("nameInput").value = name;
    $("nameErr").textContent = "";
    $("nameCancel").style.display = name ? "" : "none";   // cannot cancel the very first time
    $("nameBox").classList.remove("hidden");
    setTimeout(() => $("nameInput").focus(), 50);
  }

  function saveName() {
    const v = $("nameInput").value.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, LB_CONFIG.maxName);
    if (!v) { $("nameErr").textContent = "Please enter a name"; return; }
    name = v;
    try { localStorage.setItem("akasaPlayerName", name); } catch (e) {}
    $("pilotName").textContent = name;
    $("nameBox").classList.add("hidden");
    send(0, 0);   // adds the new pilot (or renames the old one) on the leaderboard
    if (pendingStart && window.startGame) { pendingStart = false; startGame(); }
  }

  /* ---------- buttons ---------- */
  $("editNameBtn").addEventListener("click", () => askName(false));
  $("boardBtn").addEventListener("click", showBoard);
  $("boardBtn2").addEventListener("click", showBoard);
  $("boardClose").addEventListener("click", () => $("board").classList.add("hidden"));
  $("nameSave").addEventListener("click", saveName);
  $("nameCancel").addEventListener("click", () => $("nameBox").classList.add("hidden"));
  $("nameInput").addEventListener("keydown", (e) => { if (e.key === "Enter") saveName(); });

  // first visit: ask for the name straight away
  $("pilotName").textContent = name || "-";
  if (!name) askName(false);

  return { hasName: () => !!name, askName, onGameOver, showBoard };
})();
