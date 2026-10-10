// 毛利元就 西国势力沙盘 · relations.js — 简洁模式的关系节拍
// 所有 js/*.js 按 index.html 中顺序作为普通脚本加载，共享同一全局作用域（原单一 IIFE 拆分）。
// relation beat (concise mode): new relations drawn briefly as house nodes + one styled line each
const RL = S.relations || { types: {}, houses: {}, list: [] };
const RH = RL.houses || {}, RTY = RL.types || {}, RBY = {};
(RL.list || []).forEach((r) => (RBY[r.id] = r));
const gRelB = el("g", { id: "relBeat" });
map.append(gRelB); // topmost, so battle icons, focus rings and ribbons never cover a house
const RS = {
  marriage: { c: "#b5577a", w: 2, dbl: 1 },
  adoption: { c: "#3d6b4a", w: 2.2, arrow: 1 },
  vassal: { c: "#6f665b", w: 2, arrow: 1 },
  hostage: { c: "#8a6418", w: 1.8, dash: "2 3" },
  alliance: { c: "#2f6f9f", w: 2, dash: "8 4" },
  hostile: { c: "#b0402c", w: 2.4, dash: "10 3 2 3" },
  truce: { c: "#3f8a83", w: 2.6, dash: "0.1 5", cap: "round" },
  secret: { c: "#6a4c93", w: 1.4, dash: "3 2" },
  purge: { c: "#2b2622", w: 3, bar: 1 },
};
let relBend = {};
const hname = (h) => (RH[h] ? RH[h].name : h);
const tabW = (h) => hname(h).length * 9 + 24;
let NUD = {};
const HP = (h) => { const o = RH[h]; if (!o) return [0, 0]; return o.offmap ? [W - tabW(h), o.xy[1]] : NUD[h] || o.xy; };
// houses sitting on a battle icon or a shown place label move ~14 units away, with a leader line
function relNudge(f, hs) {
  NUD = {};
  const obs = [];
  (f.battles || []).forEach((b) => obs.push({ x: b.xy[0], y: b.xy[1], hit: (x, y) => Math.hypot(x - b.xy[0], y - b.xy[1]) < 18 }));
  Object.entries(PL).forEach(([n, o]) => {
    if (concise && !o.t.classList.contains("is-on")) return;
    const [px, py] = S.places[n].xy, x0 = px + 5, x1 = x0 + n.length * 8;
    obs.push({ x: (x0 + x1) / 2, y: py, hit: (x, y) => x + 4.5 > x0 && x - 4.5 < x1 && Math.abs(y - py) < 9.5 });
  });
  hs.forEach((h) => {
    const o = RH[h]; if (!o || o.offmap) return;
    const [x, y] = o.xy, ob = obs.find((q) => q.hit(x, y)); if (!ob) return;
    let dx = x - ob.x, dy = y - ob.y, L = Math.hypot(dx, dy);
    if (L < 1) { dx = -1; dy = -1; L = Math.SQRT2; }
    NUD[h] = [r1(x + (dx / L) * 14), r1(y + (dy / L) * 14)];
  });
}
const yrs = (r) => (r.to === r.from ? `${r.from}` : r.to == null ? `${r.from}—` : `${r.from}—${r.to}`);
const relTip = (r) => `<b>${RTY[r.type] || r.type} · ${r.label}</b><span class="x-tip-f">${yrs(r)} · ${gdot(r.grade)}${r.grade}</span>`;
const frameRels = (f) => (f.rels || []).map((x) => RBY[x.id]).filter(Boolean);
const hasMori = (r) => r.a === "mori" || r.b === "mori";
const relNew = (f) => (f.rels || []).filter((x) => x.new).map((x) => RBY[x.id]).filter(Boolean)
  .map((r, i) => ({ r, i }))
  .sort((p, q) => (!hasMori(p.r) - !hasMori(q.r)) || ((p.r.grade !== "确证") - (q.r.grade !== "确证")) || p.i - q.i)
  .slice(0, 3).map((p) => p.r);
function relBends(f) {
  const by = {}, out = {};
  frameRels(f).forEach((r) => { const k = [r.a, r.b].sort().join("|"); (by[k] = by[k] || []).push(r); });
  Object.values(by).forEach((a) => a.forEach((r, j) => (out[r.id] = a.length === 1 ? 0.12 : (j - (a.length - 1) / 2) * 0.32 + 0.06)));
  return out;
}
function relHead(t) {
  const id = "rm-" + t;
  if (!document.getElementById(id)) {
    const m = el("marker", { id, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 3.6, markerHeight: 3.6, orient: "auto" }, defs);
    el("path", { d: "M0,0L10,5L0,10Z", fill: RS[t].c }, m);
  }
  return `url(#${id})`;
}
// one relation as a quadratic curve from p1 to p2; shared by the map and the panel diagram
function relPath(par, r, p1, p2, bend, sc, trim) {
  const s = RS[r.type] || RS.alliance;
  let [x1, y1] = p1, [x2, y2] = p2;
  const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L, t1 = Math.min(trim[0], L / 4), t2 = Math.min(trim[1], L / 4);
  x1 += ux * t1; y1 += uy * t1; x2 -= ux * t2; y2 -= uy * t2;
  const nx = -uy, ny = ux, cx = (x1 + x2) / 2 + nx * bend * L, cy = (y1 + y2) / 2 + ny * bend * L;
  const d = `M${r1(x1)},${r1(y1)}Q${r1(cx)},${r1(cy)} ${r1(x2)},${r1(y2)}`;
  const g = el("g", { class: "x-rline" + (r.grade === "推测" ? " is-spec" : ""), "data-a": r.a, "data-b": r.b, "data-id": r.id }, par);
  const wrap = el("g", {}, g);
  if (s.dbl) {
    el("path", { d, class: "x-rp", stroke: s.c, "stroke-width": (s.w + 1.6) * sc }, wrap);
    el("path", { d, class: "x-rp", stroke: PAPER, "stroke-width": 1 * sc }, wrap);
  } else {
    const p = el("path", { d, class: "x-rp", stroke: s.c, "stroke-width": s.w * sc, "stroke-linecap": s.cap || "butt" }, wrap);
    if (s.dash) p.setAttribute("stroke-dasharray", s.dash.split(" ").map((v) => v * sc).join(" "));
    if (s.arrow && sc === 1) p.setAttribute("marker-end", relHead(r.type));
  }
  if (sc === 1) wrap.querySelectorAll(".x-rp").forEach((p) => nsw(p, p.getAttribute("stroke-width")));
  const mx = 0.25 * x1 + 0.5 * cx + 0.25 * x2, my = 0.25 * y1 + 0.5 * cy + 0.25 * y2, ex = [];
  // on the map, the ✕ and ? marks keep their screen size at any zoom
  const mark = (x, y, cls, ch) => (sc === 1 ? txt(el("g", { class: "x-cz" }, el("g", { transform: `translate(${r1(x)},${r1(y)})` }, g)), 0, 0, cls, ch, s.c) : txt(g, x, y, cls, ch, s.c));
  if (s.bar) ex.push(mark(mx, my, "x-rx", "✕"));
  if (r.grade === "推测") ex.push(mark(mx + nx * 9, my + ny * 9, "x-rq", "?"));
  const hit = el("path", { d, class: "x-rhit" }, g);
  bindTip(hit, () => relTip(r));
  return { g, wrap, d, ex };
}
function relLine(par, r, anim, k = 1) {
  const o = relPath(par, r, HP(r.a), HP(r.b), relBend[r.id] ?? 0.12, 1, [RH[r.a] && RH[r.a].offmap ? 0 : 6, RH[r.b] && RH[r.b].offmap ? 0 : 6]);
  if (anim && !RM) {
    const md = el("defs", {}, o.g), m = el("mask", { id: "rlm" + ++uid, maskUnits: "userSpaceOnUse", x: -3000, y: -3000, width: 7000, height: 7000 }, md);
    const mp = el("path", { d: o.d, fill: "none", stroke: "#fff", "stroke-width": 16 }, m), l = mp.getTotalLength();
    mp.style.strokeDasharray = l;
    mp.animate([{ strokeDashoffset: l }, { strokeDashoffset: 0 }], { duration: 900 * k, easing: "ease-in-out", fill: "both" });
    o.wrap.setAttribute("mask", `url(#${m.id})`);
    o.ex.forEach((e) => e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400 * k, delay: 600 * k, fill: "both" }));
  }
  return o.g;
}
function relNode(par, h) {
  const o = RH[h]; if (!o) return null;
  const g = el("g", { class: "x-rn", "data-h": h }, par);
  if (o.offmap) {
    const w = tabW(h), y = o.xy[1];
    el("rect", { x: W - w, y: y - 10, width: w + 6, height: 20, rx: 5, class: "x-rtab" }, g);
    txt(g, W - w / 2, y + 0.5, "x-rnl", o.name + " ›");
  } else {
    const [x, y] = HP(h), nd = !!NUD[h];
    if (nd) el("line", { x1: o.xy[0], y1: o.xy[1], x2: x, y2: y, class: "x-rld" }, g);
    // marker and name keep their screen size at any zoom
    const z = el("g", { class: "x-cz" }, el("g", { transform: `translate(${x},${y})` }, g));
    el("circle", { r: 4.2, class: "x-rnd", fill: (FA[o.faction] || FA.OTHER).color }, z);
    txt(z, 0, nd && y < o.xy[1] ? -11 : 11, "x-rnl", o.name);
  }
  return g;
}
const relBeatOut = () => [...gRelB.children].forEach((o) => {
  const gone = () => { o.remove(); if (tipFor && tipFor.isConnected === false) hideTip(); };
  if (RM) return gone();
  o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" }).onfinish = gone;
});

function paint(f, anim, filt, pulseOn = anim) {
  const changed = new Set(f.changes.map((c) => c.region));
  S.regions.forEach((r) => {
    if (filt && !filt(r)) return;
    const v = f.state[r.id] || "OTHER", tok = ++r.tok, k0 = parts(v)[0];
    const grey = !FA[k0] || k0 === "OTHER" || k0 === "KOKUJIN";
    r.el.classList.toggle("is-grey", grey);
    r.el.classList.toggle("is-minor", !grey && !MAJOR.has(k0));
    const ps = parts(v);
    r.el.style.fill = col(ps[0]);
    if (ps.length > 1) {
      r.ct.style.stroke = col(ps[1]);
      if (anim && changed.has(r.id)) {
        r.ct.setAttribute("display", "none");
        setTimeout(() => { if (r.tok === tok) r.ct.removeAttribute("display"); }, 800);
      } else r.ct.removeAttribute("display");
    } else r.ct.setAttribute("display", "none");
  });
  if (!pulseOn) return;
  f.changes.forEach((c) => {
    const r = RG[c.region]; if (!r) return;
    const p = el("path", { d: r.d, class: "x-pulse" }, gPulse);
    p.addEventListener("animationend", () => p.remove());
    const ps = parts(c.to), t = el("text", { x: r.label[0], y: r.label[1] - 14, class: "x-float" }, gFloat);
    t.textContent = ps.length > 1 ? "争夺" : "+" + r.name;
    t.style.fill = dk(ps[0]);
    t.addEventListener("animationend", () => t.remove());
  });
}

