// 毛利元就 西国势力沙盘 · camera.js — 镜头与缩放拖动、箭头、战役标记
// 所有 js/*.js 按 index.html 中顺序作为普通脚本加载，共享同一全局作用域（原单一 IIFE 拆分）。
// fx layer
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches, PAPER = "#f3ede1";
const VB0 = S.meta.viewBox.slice(), W = VB0[2], H = VB0[3];
let vb = VB0.slice(), camRaf = 0, camTo = VB0, fxG = null, fxT = 0, zoomT = 0, uid = 0;
// user: manual zoom/pan active, which suspends the playback camera
let user = false;
const ZMAX = 6, ZB = [-165, -105, 1213, 951], zInB = $("zIn"), zOutB = $("zOut");
const setVB = (v) => {
  vb = v; map.setAttribute("viewBox", v.join(" "));
  const k = Math.max(1, W / v[2]);
  map.style.setProperty("--k", k.toFixed(4));
  map.style.setProperty("--cm", Math.min(Math.sqrt(k), 2.2).toFixed(4));
  map.style.setProperty("--cl", Math.min(Math.pow(k, 0.3), 1.5).toFixed(4));
  const mr = map.getBoundingClientRect(), px = Math.min(mr.width / v[2], mr.height / v[3]);
  if (px > 0) map.style.setProperty("--u", (1 / px).toFixed(4));
  map.classList.toggle("x-zin", k >= 1.8);
  colSched();
  zInB.disabled = k >= ZMAX - 0.001; zOutB.disabled = k <= 1.001;
};
// --u depends on the map's on-screen size, so refresh it when the map resizes
window.addEventListener("x-refit", () => setVB(vb));
window.addEventListener("resize", () => setVB(vb));
setVB(vb);
function cam(to, dur, force) {
  if (user && !force) return;
  cancelAnimationFrame(camRaf); camRaf = 0; camTo = to;
  if (!dur || RM) return setVB(to);
  const from = vb.slice(), t0 = performance.now();
  const step = (n) => {
    let k = Math.min(1, (n - t0) / dur);
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    setVB(from.map((a, j) => a + (to[j] - a) * e));
    camRaf = k < 1 ? requestAnimationFrame(step) : 0;
  };
  camRaf = requestAnimationFrame(step);
}
// manual zoom & pan, all through the viewBox
const zK = (v) => W / v[2];
const zKc = (k) => Math.max(1, Math.min(ZMAX, k));
const zCl = (a, lo, hi) => (hi < lo ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, a)));
const zClamp = (v) => [zCl(v[0], ZB[0], ZB[2] - v[2]), zCl(v[1], ZB[1], ZB[3] - v[3]), v[2], v[3]];
const zFit = (r, w, h) => Math.min(r.width / w, r.height / h);
// the map point under a screen point, for view v
const zPt = (v, cx, cy) => {
  const r = map.getBoundingClientRect(), s = zFit(r, v[2], v[3]);
  return [v[0] + (cx - r.left - (r.width - v[2] * s) / 2) / s, v[1] + (cy - r.top - (r.height - v[3] * s) / 2) / s];
};
// the view at zoom k that puts map point P under screen point (cx, cy)
const zPlace = (P, cx, cy, k) => {
  const r = map.getBoundingClientRect(), w = W / k, h = H / k, s = zFit(r, w, h);
  return zClamp([P[0] - (cx - r.left - (r.width - w * s) / 2) / s, P[1] - (cy - r.top - (r.height - h * s) / 2) / s, w, h]);
};
const zSet = (to, dur) => { user = true; $("overlay").hidden = true; cam(to, dur, true); };
function zoomBy(f, cx, cy, dur) {
  const base = camRaf && user ? camTo : vb;
  if (cx == null) { const r = map.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
  zSet(zPlace(zPt(base, cx, cy), cx, cy, zKc(zK(base) * f)), dur);
}
function zReset(dur) { user = false; $("overlay").hidden = true; cam(VB0, dur); }
const zLive = () => !$("app").classList.contains("x-rec");
map.addEventListener("wheel", (e) => {
  if (!zLive()) return;
  e.preventDefault();
  hideTip();
  const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
  zoomBy(Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX, e.clientY, 0);
}, { passive: false });
map.addEventListener("dblclick", (e) => { if (!zLive()) return; e.preventDefault(); zoomBy(2, e.clientX, e.clientY, 260); });
const zP = new Map();
let zG = null, zMoved = false;
function zBegin() {
  const p = [...zP.values()];
  if (p.length === 1) zG = { P: zPt(vb, p[0][0], p[0][1]), s: p[0], k: zK(vb) };
  else if (p.length >= 2) {
    const [a, b] = p, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    zG = { P: zPt(vb, mx, my), d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, k: zK(vb), pinch: true };
  } else zG = null;
}
const zGrab = (on) => map.parentNode.classList.toggle("x-grabbing", on);
map.addEventListener("pointerdown", (e) => {
  if (!zLive() || (e.pointerType === "mouse" && e.button !== 0)) return;
  if (e.pointerType === "mouse") zP.clear();
  if (!zP.size) zMoved = false;
  zP.set(e.pointerId, [e.clientX, e.clientY]);
  zBegin();
});
map.addEventListener("pointermove", (e) => {
  if (!zG || !zP.has(e.pointerId)) return;
  zP.set(e.pointerId, [e.clientX, e.clientY]);
  const p = [...zP.values()];
  if (zG.pinch && p.length >= 2) {
    const [a, b] = p, d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
    if (!zMoved) { zMoved = true; hideTip(); }
    zSet(zPlace(zG.P, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, zKc((zG.k * d) / zG.d)), 0);
  } else if (!zG.pinch) {
    if (!zMoved) {
      if (Math.hypot(e.clientX - zG.s[0], e.clientY - zG.s[1]) < 4) return;
      zMoved = true; hideTip(); zGrab(true);
      try { map.setPointerCapture(e.pointerId); } catch (_) {}
    }
    zSet(zPlace(zG.P, e.clientX, e.clientY, zG.k), 0);
  }
});
const zUp = (e) => {
  if (!zP.delete(e.pointerId)) return;
  zBegin();
  if (!zP.size) zGrab(false);
};
window.addEventListener("pointerup", zUp);
window.addEventListener("pointercancel", zUp);
// a drag ends in a click; keep it from opening tooltips
map.addEventListener("click", (e) => { if (zMoved) { e.stopPropagation(); e.preventDefault(); zMoved = false; } }, true);
zInB.onclick = () => zoomBy(1.6, null, null, 260);
zOutB.onclick = () => zoomBy(1 / 1.6, null, null, 260);
$("zRe").onclick = () => zReset(450);
function frameBox(P, zmax) {
  const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]), pad = 70;
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const w = Math.min(W, Math.max(x1 - x0 + 2 * pad, ((y1 - y0 + 2 * pad) * W) / H, W / zmax, W * 0.45)), h = (w * H) / W;
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  return [cl((x0 + x1) / 2 - w / 2, VB0[0], VB0[0] + W - w), cl((y0 + y1) / 2 - h / 2, VB0[1], VB0[1] + H - h), w, h];
}
const target = (f) => frameBox([f.focusXY, ...(f.arrows || []).flatMap((a) => [a.from, a.to]), ...(f.battles || []).map((b) => b.xy)], 1.6);
function head(fk) {
  const id = "ah-" + (concise ? "c-" : "") + fk;
  if (!document.getElementById(id)) {
    const m = el("marker", { id, viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 3.2, markerHeight: 3.2, orient: "auto" }, defs);
    el("path", { d: "M0,0L10,5L0,10Z", fill: dk(fk) }, m);
  }
  return `url(#${id})`;
}
const nsw = (e, w) => (e.style.strokeWidth = `calc(${w}px / var(--k, 1))`);
const mkA = (anim) => (e, kf, o) => anim && e.animate(kf, { fill: "both", easing: "ease-in-out", ...o });
const txt = (p, x, y, cls, s, fill) => { const t = el("text", { x, y, class: cls }, p); t.textContent = s; if (fill) t.style.fill = fill; return t; };
function drawFx(f, anim, k = 1) {
  const g = (fxG = el("g", {}, gFx)), md = el("defs", {}, g), gA = el("g", { class: "x-ar" }, g), gB = el("g", { class: "x-bt" }, g);
  (f.arrows || []).forEach((a, i) => drawArrow(gA, md, a, anim, k, i * 250 * k));
  (f.battles || []).forEach((b, j) => drawBattle(gB, b, anim, k, (400 + j * 250) * k));
  return { md, gA, gB };
}
function drawArrow(gA0, md, a, anim, k, delay) {
  const A = mkA(anim), fadeIn = (e, d) => A(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 * k, delay: d });
  const gA = el("g", {}, gA0);
  {
    const c = dk(a.faction), [x1, y1] = a.from, [x2, y2] = a.to;
    const L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
    const cx = (x1 + x2) / 2 + nx * 0.36 * L, cy = (y1 + y2) / 2 + ny * 0.36 * L;
    const q = (t) => [(1 - t) ** 2 * x1 + 2 * t * (1 - t) * cx + t * t * x2, (1 - t) ** 2 * y1 + 2 * t * (1 - t) * cy + t * t * y2];
    const [mx, my] = q(0.5);
    if (a.type === "siege") {
      const sz = el("g", { class: "x-cz" }, el("g", { transform: `translate(${x2},${y2})` }, gA));
      const s = el("g", concise ? { transform: "scale(.6)" } : {}, sz), rot = el("g", {}, s);
      el("circle", { r: 28, fill: "none", stroke: c, "stroke-width": 3, "stroke-dasharray": "5 6" }, rot);
      for (let j = 0; j < 8; j++) {
        const an = (j * Math.PI) / 4, co = Math.cos(an), si = Math.sin(an);
        el("line", { x1: co * 40, y1: si * 40, x2: co * 33, y2: si * 33, stroke: c, "stroke-width": 2.5, "stroke-linecap": "round" }, s);
      }
      if (!RM) rot.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], { duration: 9000, iterations: Infinity });
      fadeIn(s, delay);
      if (a.label) fadeIn(txt(sz, 0, 52, "x-fxl", a.label, c), delay);
      return gA;
    }
    const wrap = el("g", {}, gA);
    let d = `M${x1},${y1}Q${cx},${cy} ${x2},${y2}`;
    if (a.type === "naval") {
      const pts = [];
      for (let j = 0; j <= 60; j++) { const t = j / 60, [px, py] = q(t), w = 3 * Math.sin((t * L) / 9); pts.push(`${(px + nx * w).toFixed(1)},${(py + ny * w).toFixed(1)}`); }
      d = "M" + pts.join("L");
    }
    const line = el("path", { d, fill: "none", stroke: c }, wrap);
    const S2 = (o) => { for (const n in o) line.setAttribute(n, o[n]); };
    if (a.type === "attack") S2({ "stroke-width": 4, "marker-end": head(a.faction) });
    else if (a.type === "retreat") S2({ "stroke-width": 2.5, "stroke-dasharray": "7 5", opacity: 0.6, "marker-end": head(a.faction) });
    else if (a.type === "naval") S2({ "stroke-width": 3, "stroke-dasharray": "2 6", "stroke-linecap": "round" });
    else if (a.type === "inherit") {
      S2({ "stroke-width": 5 });
      nsw(el("path", { d, fill: "none", stroke: PAPER }, wrap), 1.8);
      const bz = el("g", { class: "x-cz" }, el("g", { transform: `translate(${mx},${my})` }, wrap));
      el("circle", { r: 9, fill: c, stroke: PAPER, "stroke-width": 1.5 }, bz);
      txt(bz, 0, 0.5, "x-badge", "继");
    }
    // keep the on-screen thickness at any zoom; the marker scales with the stroke, so heads stay in proportion
    nsw(line, line.getAttribute("stroke-width"));
    if (anim) {
      const m = el("mask", { id: "fxm" + ++uid, maskUnits: "userSpaceOnUse", x: -3000, y: -3000, width: 7000, height: 7000 }, md);
      const mp = el("path", { d, fill: "none", stroke: "#fff", "stroke-width": 30 }, m), l = mp.getTotalLength();
      mp.style.strokeDasharray = l;
      A(mp, [{ strokeDashoffset: l }, { strokeDashoffset: 0 }], { duration: 1000 * k, delay });
      wrap.setAttribute("mask", `url(#${m.id})`);
    }
    if (a.type === "naval") {
      const boat = el("g", {}, gA), len = line.getTotalLength(), sx = x2 < x1 ? -1 : 1;
      const bz = el("g", { class: "x-cz" }, boat);
      el("path", { d: "M-8,0H8L5,4H-5Z", fill: c }, bz);
      el("path", { d: "M0,-1V-12L7,-3Z", fill: PAPER, stroke: c, "stroke-width": 1 }, bz);
      const put = (t) => { const p = line.getPointAtLength(t * len); boat.setAttribute("transform", `translate(${p.x},${p.y - 2}) scale(${sx},1)`); };
      put(anim ? 0 : 1);
      if (anim) {
        boat.style.opacity = 0;
        const t0 = performance.now() + delay, dur = 2000 * k;
        const st = (n) => { if (!boat.isConnected) return; const e = (n - t0) / dur; if (e >= 0) boat.style.opacity = 1; put(Math.max(0, Math.min(1, e))); if (e < 1) requestAnimationFrame(st); };
        requestAnimationFrame(st);
      }
    }
    if (a.label) {
      const off = a.type === "inherit" ? 18 : 12;
      fadeIn(txt(gA, mx + nx * off, my + ny * off, "x-fxl", a.label, c), delay + 600 * k);
    }
  }
  return gA;
}
function drawBattle(gB, b, anim, k, delay) {
  const A = mkA(anim), fadeIn = (e, d) => A(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 * k, delay: d });
  {
    const o0 = el("g", { transform: `translate(${b.xy[0]},${b.xy[1]})` }, gB), o = el("g", { class: "x-cz" }, o0);
    [0, 1].forEach((r) => {
      const c = el("circle", { r: 10, fill: "none", stroke: "#b0402c", "stroke-width": 2, "vector-effect": "non-scaling-stroke", opacity: 0 }, o);
      const an = A(c, [{ transform: "scale(1)", opacity: 0.85 }, { transform: "scale(3.6)", opacity: 0 }], { duration: 1400 * k, delay: delay + r * 450 * k, easing: "ease-out", fill: "none" });
      if (concise && an) an.onfinish = () => c.remove();
      else if (concise) c.remove();
    });
    const p = el("g", {}, o), sw = { stroke: "#2b2622", "stroke-width": 3, "stroke-linecap": "round" };
    el("circle", { r: 15, fill: PAPER, "fill-opacity": 0.9, stroke: "#2b2622", "stroke-opacity": 0.3 }, p);
    el("line", { x1: -9, y1: 9, x2: 9, y2: -9, ...sw }, p);
    el("line", { x1: 9, y1: 9, x2: -9, y2: -9, ...sw }, p);
    el("line", { x1: -9, y1: 3, x2: -3, y2: 9, ...sw, "stroke-width": 2.5 }, p);
    el("line", { x1: 9, y1: 3, x2: 3, y2: 9, ...sw, "stroke-width": 2.5 }, p);
    A(p, [{ transform: "scale(0)" }, { transform: "scale(1.2)", offset: 0.6 }, { transform: "scale(1)" }], { duration: 600 * k, delay, easing: "ease-out" });
    const t = txt(o, 0, 26, "x-fxb", b.name);
    fadeIn(t, delay + 300 * k);
    if (b.winner && FA[b.winner]) {
      const fl = el("g", {}, o);
      el("line", { x1: 19, y1: 8, x2: 19, y2: -16, stroke: "#2b2622", "stroke-width": 1.5 }, fl);
      el("path", { d: "M19.5,-16L33,-11.5L19.5,-7Z", fill: col(b.winner), stroke: dk(b.winner), "stroke-width": 0.8 }, fl);
      fadeIn(fl, delay + 450 * k);
    }
    return o0;
  }
}
function fx(f, anim) {
  clearTimeout(fxT); clearTimeout(zoomT);
  if (fxG) { const o = fxG; fxG = null; if (anim && !RM) o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" }).onfinish = () => o.remove(); else o.remove(); }
  if (!anim || RM) { drawFx(f, false); return cam(target(f), 0); }
  const k = speed > 1 ? 1 / speed : 1;
  cam(VB0, 600 * k);
  fxT = setTimeout(() => { drawFx(f, true, k); cam(target(f), 1200 * k); }, 850);
}

