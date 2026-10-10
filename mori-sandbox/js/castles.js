// 毛利元就 西国势力沙盘 · castles.js — 城池层：家纹城标、归属变色、标签避让
// 所有 js/*.js 按 index.html 中顺序作为普通脚本加载，共享同一全局作用域（原单一 IIFE 拆分）。
// castle layer: small notched squares coloured by the lord's allegiance
const CS = S.castles || [], CR = S.crests || {};
const FX = (k) => FA[k] || FA.OTHER;
const fnm = (k) => (FA[k] ? FA[k].name : k);
const house = (s) => s.replace(/（[^）]*）/g, "");
const r2 = (v) => +v.toFixed(2);
const glyph = (s) => { const h = s / 2, n = s * 0.24, w = s * 0.3; return `M${r2(-h)},${r2(h)}V${r2(-h)}H${r2(-w / 2)}V${r2(-h + n)}H${r2(w / 2)}V${r2(-h)}H${r2(h)}V${r2(h)}Z`; };
const csSw = (k) => `<span class="x-sw" style="background:${FX(k).color}"></span>`;
function csTip(c) {
  const f = F[cur], st = (f.castles || {})[c.id];
  if (!st) return "";
  const [fac, conf] = st, H = c.hist || [];
  const ci = H.reduce((a, h, i) => (h.from <= f.year ? i : a), 0), why = H[ci] ? H[ci].why : "";
  const cr = c.crest && CR[c.crest];
  return `<b class="x-cs-tt">${cr ? `<img class="x-cs-ci" src="${cr.uri}" alt="">` : ""}<span>${c.name} · ${house(c.lord)}${cr ? `<br><span class="x-cs-cn">家纹：${cr.name}</span>` : ""}</span></b><span class="x-tip-f">${csSw(fac)}${fnm(fac)}</span>` +
    `<span class="x-tip-c">${gdot(conf)} 可信度：${conf}</span>${why ? `<span class="x-tip-n">${why}</span>` : ""}` +
    `<ul class="x-cs-h">${H.map((h, i) => `<li${i === ci ? ' class="is-cur"' : ""}><b>${h.from}</b>${fnm(h.fac)}</li>`).join("")}</ul>`;
}
CS.forEach((c) => {
  // sizes in on-screen px at default zoom; .x-cs-m scales by --u × --cm, labels by --u × --cl
  const t = c.tier === 1 ? 1 : c.tier === 2 ? 2 : 3, s = t === 1 ? 26 : t === 2 ? 20 : 9, h = s / 2;
  const cr = c.crest && CR[c.crest];
  const g = (c.g = el("g", { class: `x-cs x-cs-t${t}`, transform: `translate(${c.xy[0]},${c.xy[1]})`, role: "img", "aria-label": c.name, style: "display:none" }, gCas));
  const m = (c.m = el("g", { class: "x-cs-m" }, g));
  el("circle", { r: h + 3, class: "x-cs-hit" }, m);
  if (t === 3) {
    c.mk = el("rect", { x: -h, y: -h, width: s, height: s, class: "x-cs-f" }, m);
  } else {
    // tier 1: paper disc, faction ring, thin dark outer ring; tier 2: paper disc and faction ring
    const rw = t === 1 ? 3 : 2.5, rr = t === 1 ? h - 0.45 - 0.35 - rw / 2 - 0.45 : h - rw / 2;
    el("circle", { r: h, class: "x-cs-disc" }, m);
    if (t === 1) el("circle", { r: h - 0.45, class: "x-cs-edge" }, m);
    c.mk = el("circle", { r: r2(rr), class: "x-cs-f" }, m);
    if (cr) {
      const iw = r2(s * 0.7 * (t === 1 ? 0.95 : 1));
      el("image", { href: cr.uri, x: -iw / 2, y: -iw / 2, width: iw, height: iw, preserveAspectRatio: "xMidYMid meet", "pointer-events": "none" }, m);
    } else if (c.mono) {
      el("text", { x: 0, y: 0.5, class: "x-cs-mono" }, m).textContent = c.mono;
    }
  }
  c.s = s;
  const lb = el("text", { x: 0, y: 0, class: `x-cs-l${t}`, style: `--r:${h}` }, g);
  lb.textContent = t === 2 ? house(c.lord) : c.name;
  g._tip = () => csTip(c);
  g.addEventListener("pointerenter", () => g.classList.add("is-hov"));
  g.addEventListener("pointerleave", (e) => { g.classList.remove("is-hov"); if (e.pointerType === "mouse" && tipFor === g) hideTip(); });
  g.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") showTip(csTip(c), e.clientX, e.clientY, g); });
  g.addEventListener("click", (e) => {
    if (lastPT === "mouse") return;
    e.stopPropagation();
    if (tipFor === g) { hideTip(); g.classList.remove("is-hov"); } else { showTip(csTip(c), e.clientX, e.clientY, g); g.classList.add("is-hov"); }
  });
});
// filt picks which castles to update; ring adds one soft ring to castles that flipped this frame
function castPaint(f, filt, ring) {
  const C = f.castles || {}, FL = new Set(f.castleFlips || []);
  CS.forEach((c) => {
    if (filt && !filt(c)) return;
    const st = C[c.id];
    c.g.style.display = st ? "" : "none";
    if (!st) { if (tipFor === c.g) hideTip(); return; }
    const [fac, conf] = st, a = FX(fac);
    if (c.tier === 1 || c.tier === 2) c.mk.style.stroke = a.color;
    else c.mk.style.fill = a.color;
    c.mk.classList.toggle("is-spec", conf === "推测");
    c.g.setAttribute("aria-label", `${c.name} · ${fnm(fac)} · ${conf}`);
    if (ring && FL.has(c.id) && !RM && c.g.animate) {
      const o = el("circle", { r: c.s * 0.55, class: "x-cs-ring", stroke: a.color }, null);
      c.m.insertBefore(o, c.m.firstChild);
      o.animate([{ transform: "scale(1)", opacity: 0.8 }, { transform: "scale(3)", opacity: 0 }], { duration: 800, easing: "ease-out", fill: "forwards" }).onfinish = () => o.remove();
    }
  });
  colSched();
}
// label collisions: region, place and house-node names and tier-1 castle names win; a tier-2 house label that overlaps one (or an earlier tier-2 label) hides until hovered
let colT = 0;
function colSched() { clearTimeout(colT); colT = setTimeout(colRun, 160); }
function colRun() {
  const box = (e) => { const b = e.getBoundingClientRect(); return b.width && b.height ? [b.left - 1, b.top - 1, b.right + 1, b.bottom + 1] : null; };
  const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  const top = [];
  const add = (e) => { const b = box(e); if (b) top.push(b); };
  map.querySelectorAll("#labels .x-lb-p, #labels .x-lb-d, #labels .x-lb-pl").forEach((e) => { if (!concise || e.classList.contains("is-on")) add(e); });
  map.querySelectorAll(".x-rnl").forEach(add);
  const t2 = [];
  CS.forEach((c) => {
    if (c.g.style.display === "none") return;
    const lb = c.g.lastChild;
    if (c.tier === 1) add(lb);
    else if (c.tier === 2) t2.push(lb);
  });
  t2.forEach((lb) => {
    const b = box(lb), off = !!b && top.some((o) => hit(b, o));
    lb.classList.toggle("is-cl", off);
    if (b && !off) top.push(b);
  });
}

