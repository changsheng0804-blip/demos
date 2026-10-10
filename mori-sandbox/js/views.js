// views.js — 阵营 / 家族 视图（自带 IIFE）
      (() => {
const S = window.SANDBOX, F = S.frames, FA = S.factions, R = S.relations || {}, CAMPS = R.camps || [], HS = R.houses || {};
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);
const map = document.querySelector(".x-map"), cv = $("campView"), cols = $("cvCols");
const LEAD = { otomo: "OTOMO", ouchi: "OUCHI", mori: "MORI", amago: "AMAGO" };
const GREY = "#8a8073";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const hname = (h) => (HS[h] && HS[h].name) || h;
const hcol = (h) => ((FA[HS[h] && HS[h].faction] || FA.OTHER || {}).color) || GREY;
const cname = (id) => (HS[id] && HS[id].name) || ((CAMPS.find((c) => c.id === id) || {}).name || id).replace(/阵营$/, "");
const SYM = { hostile: "⚔", truce: "≈", alliance: "＋" };
let on = false, shown = -1, cur = 0;

function draw(i, animate) {
  const f = F[i] || {}, camps = f.camps || {}, ties = f.ties || {};
  const prev = shown >= 0 ? (F[shown] || {}).camps || {} : {};
  animate = animate && !RM && shown >= 0 && shown !== i;
  const before = {};
  if (animate) cols.querySelectorAll(".x-cv-chip").forEach((c) => (before[c.dataset.h] = c.getBoundingClientRect()));
  const box = cv.getBoundingClientRect();
  const ghosts = animate ? [...cols.querySelectorAll(".x-cv-chip")].filter((c) => !camps[c.dataset.h] && prev[c.dataset.h]).map((c) => {
    const r = before[c.dataset.h], g = c.cloneNode(true);
    g.className += " x-cv-ghost";
    Object.assign(g.style, { left: r.left - box.left + cv.scrollLeft + "px", top: r.top - box.top + cv.scrollTop + "px", width: r.width + "px", height: r.height + "px" });
    return g;
  }) : [];
  cv.querySelectorAll(".x-cv-ghost").forEach((g) => g.remove());

  $("cvYr").textContent = f.year ? `${f.year}年 · 阵营` : "阵营";
  $("cvRels").innerHTML = (f.campRels || []).map((r) =>
    `<span class="x-cv-rel ${esc(r.type)}">${esc(cname(r.a))} ${SYM[r.type] || "·"} ${esc(cname(r.b))}${r.label ? "：" + esc(r.label) : ""}</span>`).join("");

  cols.innerHTML = CAMPS.map((c) => {
    const hs = Object.keys(camps).filter((h) => camps[h].camp === c.id).sort((a, b) => (b === c.id) - (a === c.id));
    const bg = c.id === "neutral" ? GREY : ((FA[LEAD[c.id]] || {}).color || GREY);
    const chips = hs.map((h) => {
      const t = ties[h], g = camps[h].grade;
      const cls = "x-cv-chip" + (h === c.id ? " is-lead" : "") + (g === "推测" ? " is-guess" : "");
      const badge = t === "ichimon" ? '<span class="x-cv-tie ichimon">一门</span>' : t === "inlaw" ? '<span class="x-cv-tie inlaw">姻</span>' : "";
      return `<div class="${cls}" data-h="${esc(h)}" style="--bar:${hcol(h)}" title="${esc(hname(h))} · ${esc(g || "")}">${esc(hname(h))}${badge}</div>`;
    }).join("");
    return `<div class="x-cv-col${hs.length ? "" : " is-empty"}"><h3 class="x-cv-hd" style="--hc:${bg}">${esc(c.name)}</h3>${chips || '<p class="x-cv-dash">—</p>'}</div>`;
  }).join("");

  const groups = new Map();
  (f.campMoves || []).forEach((m) => { const k = m.to || ""; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(m); });
  $("cvMv").textContent = [...groups].map(([to, ms]) => {
    const head = to ? "→" + ((CAMPS.find((c) => c.id === to) || {}).name || to) : "退场";
    const body = ms.length === 1 ? hname(ms[0].house) + (ms[0].note ? `（${ms[0].note}）` : "") : ms.map((m) => hname(m.house)).join("、");
    return head + "：" + body;
  }).join(" ｜ ");

  if (animate) {
    cols.querySelectorAll(".x-cv-chip").forEach((c) => {
      const o = before[c.dataset.h];
      if (!o) { c.classList.add("is-pop"); return; }
      const n = c.getBoundingClientRect(), dx = o.left - n.left, dy = o.top - n.top;
      if (!dx && !dy) return;
      c.style.transform = `translate(${dx}px,${dy}px)`;
      c.style.zIndex = 3;
      c.getBoundingClientRect();
      requestAnimationFrame(() => {
        c.style.transition = "transform .9s cubic-bezier(.25,.8,.25,1)";
        c.style.transform = "";
        c.addEventListener("transitionend", () => { c.style.transition = ""; c.style.zIndex = ""; }, { once: true });
      });
    });
    ghosts.forEach((g) => { cv.appendChild(g); g.addEventListener("animationend", () => g.remove(), { once: true }); });
  }
  shown = i;
}

// family view: a top-down tree of Motonari's house, synced to the current frame's year
const FAM = R.family || { nodes: [], edges: [], houseLinks: [], deaths: {} };
const NS = "http://www.w3.org/2000/svg", fv = $("familyView"), fsvg = $("fvSvg"), tip = $("tip");
const sel = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
const stxt = (p, x, y, cls, s, extra) => { const t = sel("text", Object.assign({ x, y, class: cls }, extra || {}), p); t.textContent = s; return t; };
const BW = 92, BH = 48, PG = 22, CG = 18, M = 12, Y0 = 24, Y1 = 172, Y2 = 304;
const FW = M * 2 + 4 * (BW * 2 + PG) + 3 * CG;
const FH = Y2 + BH + 12;
fsvg.setAttribute("viewBox", `0 0 ${FW} ${FH}`);
const NB = {}; FAM.nodes.forEach((n) => (NB[n.id] = n));
const POS = {};
// top couple centered; children in one row with spouses beside; grandchildren under their parent
const marriedTo = (id) => (FAM.edges.find((e) => e[2] === "marriage" && (e[0] === id || e[1] === id)) || []);
const partner = (id) => { const e = marriedTo(id); return e[0] === id ? e[1] : e[0]; };
const self = FAM.nodes.find((n) => n.kind === "self");
if (self) {
  POS[self.id] = [FW / 2 - (BW + PG) / 2, Y0];
  const sp = partner(self.id); if (sp) POS[sp] = [FW / 2 + (BW + PG) / 2, Y0];
}
FAM.nodes.filter((n) => n.kind === "child").forEach((n, i) => {
  const left = M + i * (BW * 2 + PG + CG), cx = left + BW / 2;
  POS[n.id] = [cx, Y1];
  const sp = partner(n.id); if (sp) POS[sp] = [cx + BW + PG, Y1];
});
FAM.nodes.filter((n) => n.kind === "grandchild").forEach((n) => {
  const pe = FAM.edges.find((e) => e[2] === "child" && e[1] === n.id);
  POS[n.id] = [pe && POS[pe[0]] ? POS[pe[0]][0] : M + BW / 2, Y2];
});
const short = (s) => String(s || "").replace(/（.*?）/g, "");
const hName = (h) => (HS[h] && HS[h].name) || h;
let famShown = null, famOn = false;

function famTip(n, e, hold) {
  const d = (FAM.deaths || {})[n.id];
  tip.innerHTML = `<b>${esc(n.name)}</b>` + (n.house ? `<span class="x-tip-f">出身 ${esc(hName(n.house))}</span>` : "") +
    (n.note ? `<span class="x-tip-n">${esc(n.note)}</span>` : "") + (d && d <= famYear() ? `<span class="x-tip-n">†${d}</span>` : "");
  tip.hidden = false;
  const r = e && e.clientX != null && !hold ? { x: e.clientX, y: e.clientY } : (() => { const b = e.target.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.bottom }; })();
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.x + 12)) + "px";
  tip.style.top = (r.y + 14 + h > innerHeight ? r.y - h - 10 : r.y + 14) + "px";
  tip.dataset.fam = n.id;
}
const famTipOff = () => { if (tip.dataset.fam) { tip.hidden = true; delete tip.dataset.fam; } };
document.addEventListener("click", (e) => { if (!e.target.closest || !e.target.closest(".x-fn")) famTipOff(); });
const famYear = () => (F[cur] || {}).year || 0;

function famDraw(i, animate) {
  const y = (F[i] || {}).year || 0, dead = FAM.deaths || {};
  const vis = new Set(FAM.nodes.filter((n) => n.from <= y && POS[n.id]).map((n) => n.id));
  const links = (FAM.houseLinks || []).filter((l) => l.year <= y && vis.has(l.person));
  const prev = famShown || new Set();
  const isNew = (k) => animate && !RM && famShown && !prev.has(k);
  famTipOff();
  fsvg.innerHTML = "";
  const gE = sel("g", {}, fsvg), gH = sel("g", {}, fsvg), gN = sel("g", {}, fsvg);
  const keys = new Set();
  const mark = (g, k) => { keys.add(k); if (isNew(k)) g.classList.add("x-fv-new"); return g; };
  const cy = (id) => POS[id][1] + BH / 2;
  // marriages first, so child lines can start from the couple's midpoint
  const coupleMid = {};
  FAM.edges.forEach(([a, b, t, yr]) => {
    if (t !== "marriage" || yr > y || !vis.has(a) || !vis.has(b)) return;
    const [l, r] = [a, b].sort((p, q) => POS[p][0] - POS[q][0]);
    const x1 = POS[l][0] + BW / 2, x2 = POS[r][0] - BW / 2, yy = cy(a);
    const g = mark(sel("g", {}, gE), "m:" + a + b);
    sel("line", { x1, y1: yy, x2, y2: yy, class: "x-fe-m" }, g);
    sel("line", { x1, y1: yy, x2, y2: yy, class: "x-fe-m2" }, g);
    coupleMid[a] = coupleMid[b] = [(x1 + x2) / 2, yy];
  });
  FAM.edges.forEach(([a, b, t, yr]) => {
    if (t !== "child" || yr > y || !vis.has(a) || !vis.has(b)) return;
    const [sx, sy] = coupleMid[a] || [POS[a][0], POS[a][1] + BH];
    const ex = POS[b][0], ey = POS[b][1], my = Math.round((POS[a][1] + BH + ey) / 2);
    mark(sel("path", { d: `M${sx},${sy}V${my}H${ex}V${ey}`, class: "x-fe-c" }, gE), "c:" + b);
  });
  // house links: gold arrow to a house badge (the 两川 system)
  const byP = {};
  links.forEach((l) => (byP[l.person] = byP[l.person] || []).push(l));
  const gold = new Set();
  Object.entries(byP).forEach(([p, ls]) => {
    gold.add(p);
    const all = (FAM.houseLinks || []).filter((l) => l.person === p);
    ls.forEach((l) => {
      const j = all.indexOf(l), n = all.length, px = POS[p][0], py = POS[p][1] + BH;
      const bx = px + (j - (n - 1) / 2) * 160, by = Y2 + 6, nm = hName(l.house), w = nm.length * 13 + 30;
      const g = mark(sel("g", { class: "x-fh" }, gH), "h:" + p + l.house);
      const L = Math.hypot(bx - px, by - py), ux = (bx - px) / L, uy = (by - py) / L, tx = bx - ux * 7, ty = by - uy * 7;
      sel("line", { x1: px, y1: py + 2, x2: tx, y2: ty, class: "x-fh-a" }, g);
      sel("path", { d: `M${bx},${by}L${tx - uy * 5},${ty + ux * 5}L${tx + uy * 5},${ty - ux * 5}Z`, class: "x-fh-h" }, g);
      const mx = (px + bx) / 2, mY = (py + by) / 2, left = bx <= px;
      stxt(g, mx + (left ? -8 : 8), mY, "x-fh-l", `${l.year} ${l.label}`, { "text-anchor": left ? "end" : "start" });
      const b = sel("g", { class: "x-fh-b" }, g);
      sel("rect", { x: bx - w / 2, y: by, width: w, height: 30, rx: 15 }, b);
      const fc = (FA[HS[l.house] && HS[l.house].faction] || FA.OTHER || {}).color || GREY;
      sel("rect", { x: bx - w / 2 + 12, y: by + 8, width: 5, height: 14, rx: 2, fill: fc, stroke: "none" }, b);
      stxt(b, bx + 4, by + 15.5, "", nm);
    });
  });
  // people
  FAM.nodes.forEach((n) => {
    if (!vis.has(n.id)) return;
    const [x, top] = POS[n.id], d = dead[n.id], isDead = d && d <= y;
    const cls = "x-fn is-" + n.kind + (gold.has(n.id) ? " is-gold" : "") + (isDead ? " is-dead" : "");
    const g = mark(sel("g", { class: cls, tabindex: 0, role: "img", "aria-label": `${n.name}${n.house ? "，出身" + hName(n.house) : ""}${isDead ? "，†" + d : ""}${n.note ? "。" + n.note : ""}` }, gN), "n:" + n.id);
    sel("rect", { x: x - BW / 2, y: top, width: BW, height: BH, rx: 10, class: "x-fn-box" }, g);
    const two = n.house || isDead;
    stxt(g, x, top + (two ? 17 : BH / 2 + 1), "x-fn-nm", short(n.name));
    if (two) {
      const parts = [];
      if (n.house) { const hn = hName(n.house); parts.push({ w: hn.length * 11 + 12, hn }); }
      if (isDead) parts.push({ w: 42, d });
      let cx = x - (parts.reduce((s, p) => s + p.w, 0) + (parts.length - 1) * 4) / 2;
      parts.forEach((p) => {
        if (p.hn) {
          const fc = (FA[HS[n.house] && HS[n.house].faction] || FA.OTHER || {}).color || GREY, tg = sel("g", { class: "x-fn-tag" }, g);
          sel("rect", { x: cx, y: top + 28, width: p.w, height: 15, rx: 7.5, fill: fc }, tg);
          stxt(tg, cx + p.w / 2, top + 36, "x-fn-tg", p.hn);
        } else stxt(g, cx + p.w / 2, top + 36, "x-fn-d", "†" + p.d);
        cx += p.w + 4;
      });
    }
    g.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") famTip(n, e); });
    g.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse" && tip.dataset.fam === n.id) famTip(n, e); });
    g.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") famTipOff(); });
    g.addEventListener("click", (e) => { e.stopPropagation(); if (tip.dataset.fam === n.id) famTipOff(); else famTip(n, e); });
    g.addEventListener("focus", (e) => famTip(n, e, true));
    g.addEventListener("blur", famTipOff);
  });
  $("fvYr").textContent = y ? `${y}年 · 家族` : "家族";
  fsvg.setAttribute("aria-label", `${y}年 毛利家族图：` + FAM.nodes.filter((n) => vis.has(n.id)).map((n) => short(n.name)).join("、"));
  famShown = keys;
}
$("fvNote").textContent = FAM.note || "";

function setView(v) {
  on = v === "camp"; famOn = v === "fam";
  map.classList.toggle("x-camp-on", on);
  map.classList.toggle("x-fam-on", famOn);
  cv.setAttribute("aria-hidden", !on);
  fv.setAttribute("aria-hidden", !famOn);
  $("map").setAttribute("aria-hidden", v !== "map");
  $("vMap").setAttribute("aria-pressed", v === "map");
  $("vCamp").setAttribute("aria-pressed", on);
  $("vFam").setAttribute("aria-pressed", famOn);
  if (!famOn) famTipOff();
  if (on && shown !== cur) draw(cur, false);
  if (famOn) famDraw(cur, false);
}
$("vMap").onclick = () => setView("map");
$("vCamp").onclick = () => setView("camp");
$("vFam").onclick = () => setView("fam");
window.addEventListener("x-frame", (e) => {
  cur = e.detail;
  if (on) draw(cur, true);
  if (famOn) famDraw(cur, true);
});
window.addEventListener("x-frame-still", (e) => {
  cur = e.detail;
  if (on) draw(cur, false);
  if (famOn) famDraw(cur, false);
});
draw(0, false);
      })();