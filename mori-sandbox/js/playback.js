// 毛利元就 西国势力沙盘 · playback.js — 逐帧播放：简洁节拍、年份、争夺、claims
// 所有 js/*.js 按 index.html 中顺序作为普通脚本加载，共享同一全局作用域（原单一 IIFE 拆分）。
// concise mode: one beat at a time
let bts = [];
const later = (fn, t) => bts.push(setTimeout(fn, t));
const subEl = $("sub");
// year labels update in place with a short crossfade
const setYr = (e, v, anim) => {
  v = String(v);
  if (e.textContent === v) return;
  e.textContent = v;
  if (anim && !RM && e.animate) e.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: "ease-out" });
};
const sub = (s) => { if (s) { subEl.textContent = s; subEl.classList.add("is-on"); } else subEl.classList.remove("is-on"); };
const arTxt = (a) => a.label || `${fname(a.faction)}：${a.fromName} → ${a.toName}`;
const btTxt = (b) => b.name + (b.winner && FA[b.winner] ? `（${fname(b.winner)}胜）` : "");
// a quiet frame has no territory changes and no arrows: caption only, shorter hold
const quiet = (f) => !(f.changes || []).length && !(f.arrows || []).length;
const newEv = (f) => (f.econ && f.econ.newEvents) || [];
const subCoin = (s) => { subEl.innerHTML = '<span class="x-coin" aria-hidden="true"></span>'; subEl.append(s); subEl.classList.add("is-on"); };
const beatLen = (f) => {
  const ne = newEv(f).length, nr = relNew(f).length;
  const b = 900 + (quiet(f) ? 0 : 1100) + (flips(f).size ? 900 : 0) + (f.claims ? 1800 : 0) + 1200 * ((f.arrows || []).length + (f.battles || []).length) + 1400 * nr + 1700 * ne + (quiet(f) && (ne || nr) ? 900 : 0);
  return quiet(f) ? Math.max(b, 2400) : b;
};
const minLen = (f) => (quiet(f) ? 3500 : 5000);
const flips = (f) => new Set((f.castleFlips || []).filter((id) => (f.castles || {})[id]));
const frameLen = (f) => (concise ? Math.max(minLen(f), beatLen(f) + (quiet(f) ? 1100 : 2600)) : minLen(f)) / speed;

// claims overlay: dashed outlines drawn on, plus a ribbon label near the regions' centroid
function clearClaims(anim) {
  [...gClaim.children, ...gRib.children].forEach((o) => {
    if (anim && !RM) o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" }).onfinish = () => o.remove();
    else o.remove();
  });
}
function claimRegs(cl) { return (cl.regions || []).map((id) => RG[id]).filter(Boolean); }
function claimPts(cl) {
  return claimRegs(cl).flatMap((r) => { const b = r.el.getBBox(); return [[b.x, b.y], [b.x + b.width, b.y + b.height]]; });
}
function drawClaims(cl, anim, k, delay) {
  const c = (FA[cl.faction] || FA.OTHER).dark, regs = claimRegs(cl);
  const g = el("g", {}, gClaim), md = el("defs", {}, g);
  regs.forEach((r, j) => {
    const p = el("path", { d: r.d, class: "x-claim", stroke: c }, g);
    if (!anim) return;
    const m = el("mask", { id: "clm" + ++uid, maskUnits: "userSpaceOnUse", x: -3000, y: -3000, width: 7000, height: 7000 }, md);
    const mp = el("path", { d: r.d, fill: "none", stroke: "#fff", "stroke-width": 12 }, m), l = mp.getTotalLength();
    mp.style.strokeDasharray = l;
    mp.animate([{ strokeDashoffset: l }, { strokeDashoffset: 0 }], { duration: 1400 * k, delay: delay + j * 110 * k, easing: "ease-in-out", fill: "both" });
    p.setAttribute("mask", `url(#${m.id})`);
  });
  if (cl.label && regs.length) {
    const cx = regs.reduce((s, r) => s + r.label[0], 0) / regs.length, cy = regs.reduce((s, r) => s + r.label[1], 0) / regs.length;
    const w = cl.label.length * 15 + 20, h = 15;
    // the ribbon keeps its screen size at any zoom
    const rb = el("g", { transform: `translate(${cx.toFixed(1)},${cy.toFixed(1)})` }, gRib), inner = el("g", {}, el("g", { class: "x-cz" }, rb));
    el("path", { d: `M${-w / 2 - 12},${-h}H${w / 2 + 12}L${w / 2 + 3},0L${w / 2 + 12},${h}H${-w / 2 - 12}L${-w / 2 - 3},0Z`, fill: c, stroke: PAPER, "stroke-width": 1.5, "fill-opacity": 0.94 }, inner);
    txt(inner, 0, 1, "x-rib", cl.label);
    if (anim) inner.animate([{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "scale(1)" }], { duration: 500 * k, delay: delay + 900 * k, easing: "ease-out", fill: "both" });
    return [g, rb];
  }
  return [g];
}
function claims(f, anim) {
  clearClaims(anim);
  if (!f.claims) return;
  if (concise && anim && !RM) return; // drawn as its own beat
  const a = anim && !RM;
  drawClaims(f.claims, a, speed > 1 ? 1 / speed : 1, a ? 850 : 0);
}
function resetBeats() {
  bts.forEach(clearTimeout); bts = [];
  map.classList.remove("x-dim");
  sub("");
  clearHl();
  gRelB.innerHTML = "";
}
function marks(f) {
  const ref = new Set([f.focus]);
  (f.arrows || []).forEach((a) => { ref.add(a.fromName); ref.add(a.toName); });
  (f.battles || []).forEach((b) => ref.add(b.place));
  Object.entries(PL).forEach(([n, o]) => { const on = ref.has(n); o.g.classList.toggle("is-on", on); o.t.classList.toggle("is-on", on); });
  const pts = [...(f.arrows || []).flatMap((a) => [a.from, a.to]), ...(f.battles || []).map((b) => b.xy)];
  const chg = new Set(f.changes.map((c) => c.region));
  const inside = (r, p) => { try { return r.el.isPointInFill(new DOMPoint(p[0], p[1])); } catch (e) { return false; } };
  S.regions.forEach((r) => {
    r.lb.classList.toggle("is-on", chg.has(r.id) || CORE.has(r.id) || pts.some((p) => inside(r, p)));
    r.el.classList.toggle("is-chg", chg.has(r.id));
    r.el.setAttribute("aria-label", `${r.name} · ${vname(f.state[r.id] || "OTHER")}`);
  });
}
function beats(f, anim) {
  clearTimeout(fxT); clearTimeout(zoomT);
  if (fxG) { const o = fxG; fxG = null; if (anim && !RM) o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" }).onfinish = () => o.remove(); else o.remove(); }
  if (!anim || RM) { paint(f, false); drawFx(f, false); return cam(VB0, 0); }
  const k = 1 / speed, P = f.focusXY, chg = new Set(f.changes.map((c) => c.region));
  const { md, gA, gB } = drawFx({ arrows: [], battles: [] }, false);
  paint(f, true, (r) => !chg.has(r.id), false);
  cam(frameBox([P], 1.4), 900 * k);
  let t = 900 * k;
  const q = quiet(f), drawn = [];
  if (q) later(() => sub(f.title), 300 * k);
  else {
    later(() => { if (chg.size) map.classList.add("x-dim"); paint(f, true, (r) => chg.has(r.id), true); }, t);
    t += 1100 * k;
  }
  // castle beat: flipped castles recolour with one ring, after the territory and before the arrows
  const FLP = flips(f);
  if (FLP.size) {
    later(() => castPaint(f, (c) => FLP.has(c.id), true), t);
    t += 900 * k;
  }
  if (f.claims) {
    const cl = f.claims;
    later(() => {
      drawClaims(cl, true, k, 0).forEach((e) => drawn.push(e));
      sub(cl.label || f.title);
      const pts = claimPts(cl);
      if (pts.length) cam(frameBox([P, ...pts], 1.2), 900 * k);
    }, t);
    t += 1800 * k;
  }
  const step = (draw, pts, label, layer) => {
    later(() => {
      drawn.forEach((e) => (e.style.opacity = 0.3));
      drawn.push(draw());
      if (!$("app").classList.contains(layer)) sub(label);
      cam(frameBox([P, ...pts], 1.4), 900 * k);
    }, t);
    t += 1200 * k;
  };
  (f.arrows || []).forEach((a) => step(() => drawArrow(gA, md, a, true, k, 0), [a.from, a.to], arTxt(a), "x-no-ar"));
  (f.battles || []).forEach((b) => step(() => drawBattle(gB, b, true, k, 0), [b.xy], btTxt(b), "x-no-bt"));
  // relations beat: up to three new relations, Mori's first, then the well-attested
  const NR = relNew(f);
  if (NR.length) relNudge(f, new Set(NR.flatMap((r) => [r.a, r.b])));
  if (NR.length && q) t = Math.max(t, 2100 * k);
  NR.forEach((r) => {
    later(() => {
      drawn.forEach((e) => (e.style.opacity = 0.3));
      if (!gRelB.querySelector(`.x-rline[data-id="${r.id}"]`)) {
        drawn.push(relLine(gRelB, r, true, k));
        [r.a, r.b].forEach((h) => { if (!gRelB.querySelector(`.x-rn[data-h="${h}"]`)) relNode(gRelB, h); });
      }
      sub(`${RTY[r.type] || r.type}：${r.label}`);
      cam(frameBox([P, HP(r.a), HP(r.b)], 1.4), 900 * k);
    }, t);
    t += 1400 * k;
  });
  const NE = newEv(f);
  if (NE.length && q) t = Math.max(t, 2100 * k);
  NE.forEach((ev) => {
    later(() => {
      drawn.forEach((e) => (e.style.opacity = 0.3));
      clearHl();
      subCoin(`${ev.year} ${ev.text}`);
      const o = hlNode(ev.text);
      if (o && o.owner) { o.g.classList.add("is-hl"); ping(o, o.owner, 2); cam(frameBox([P, o.n.xy], 1.4), 900 * k); }
    }, t);
    t += 1700 * k;
  });
  if (q) t = Math.max(t, 2400 * k);
  later(() => {
    map.classList.remove("x-dim");
    sub("");
    clearHl();
    drawn.forEach((e) => (e.style.opacity = ""));
    relBeatOut();
    cam(VB0, 900 * k);
  }, t);
}

function panel(f) {
  $("age").textContent = concise ? `元就 ${f.age} 岁` : `元就 ${f.age} 岁（虚岁）`;
  const m = f.desc.match(/^[^。！？]*[。！？]/), first = m ? m[0] : f.desc, more = concise && first.length < f.desc.length;
  $("desc").textContent = more && !descOpen ? first : f.desc;
  const dt = $("descTg");
  dt.hidden = !more; dt.textContent = descOpen ? "收起" : "展开"; dt.setAttribute("aria-expanded", descOpen);
  if (tipFor && tipFor.closest && tipFor.closest("#changes")) hideTip();
  const CH = f.changes.map((c) => `<li${noteOf(f, c.region) ? ` data-r="${c.region}" tabindex="0"` : ""}><b>${RG[c.region] ? RG[c.region].name : c.region}</b>${sw(c.from)}${vname(c.from)} → ${sw(c.to)}${vname(c.to)}</li>`);
  const lim = concise && !chipsOpen && CH.length > 4;
  $("changes").innerHTML = f.changes.length
    ? '<ul class="x-chips">' + (lim ? CH.slice(0, 4).join("") + `<li class="x-plus"><button type="button" id="chipsMore" aria-label="显示全部 ${CH.length} 项变化">+${CH.length - 4}</button></li>` : CH.join("")) + "</ul>"
    : '<p class="x-none">领国无变化</p>';
  if (lim) $("chipsMore").onclick = () => { chipsOpen = true; panel(F[cur]); };
  const list = !concise || allPeople ? f.people : f.people.filter((p) => p.status === "new" || p.status === "died");
  $("people").innerHTML = list.map((p) => `<li class="${p.status === "died" ? "is-died" : ""}"><span class="x-av" style="background:${FA[p.faction].color}">${p.name[0]}</span><div><b>${p.name}${p.status === "died" ? " †" : ""}</b><small>${p.note}</small></div>${p.status === "new" ? "<em>登场</em>" : concise && p.status === "died" ? '<em class="is-out">退场</em>' : ""}</li>`).join("");
  $("pnone").hidden = list.length > 0;
  const pt = $("peopleTg");
  pt.textContent = allPeople ? "收起人物" : `全部人物（${f.people.length}）`; pt.setAttribute("aria-pressed", allPeople);
  $("aff").innerHTML = f.links.length
    ? f.links.map((l) => `<span class="x-aff">${sw(l.to)}${l.type}：${fname(l.to)}</span>`).join("")
    : `<span class="x-aff">${sw("MORI")}毛利 独立</span>`;
}

function render(i, anim) {
  const f = F[i];
  resetBeats();
  if (!anim) map.classList.add("x-still");
  marks(f);
  if (concise && anim && !RM) { const FLP = flips(f); castPaint(f, (c) => !FLP.has(c.id), false); }
  else castPaint(f, null, anim);
  relBend = relBends(f);
  if (concise) beats(f, anim);
  else paint(f, anim);
  if (!anim) requestAnimationFrame(() => requestAnimationFrame(() => map.classList.remove("x-still")));
  gFocus.setAttribute("transform", `translate(${f.focusXY[0]},${f.focusXY[1]})`);
  if (!concise) fx(f, anim);
  if (!concise && anim && !RM && quiet(f)) {
    const k = 1 / speed;
    later(() => sub(f.claims ? f.claims.label || f.title : f.title), 300 * k);
    later(() => sub(""), 3000 * k);
  }
  RACE.forEach((k) => sp[k].setAttribute("points", F.slice(0, i + 1).map((g) => `${spX(g.year)},${spY(g.power[k] || 0)}`).join(" ")));
  spNow.setAttribute("x1", spX(f.year)); spNow.setAttribute("x2", spX(f.year));
  claims(f, anim);
  setYr($("yr"), f.year, anim);
  setYr($("recYr"), f.year, anim);
  $("ft").textContent = f.title;
  if (tipFor === eg) hideTip();
  confPaint(f);
  panel(f);
  RACE.slice().sort((a, b) => (f.power[b] || 0) - (f.power[a] || 0)).forEach((k, n) => {
    const v = f.power[k] || 0, d = rows[k];
    d.style.top = n * 32 + "px";
    d.querySelector(".x-fill").style.width = (v / PMAX) * 100 + "%";
    d.querySelector(".x-val").textContent = v.toFixed(1);
  });
  $("links").innerHTML = f.links.length
    ? f.links.map((l) => `${sw(l.from)}${fname(l.from)} <i>→（${l.type}）→</i> ${sw(l.to)}${fname(l.to)}`).join("<br>")
    : `${sw("MORI")}毛利 独立`;
  ecoPaint(f, anim);
  legend(f);
  if (tipFor && RG[tipFor.id] === tipFor) tip.innerHTML = regTip(tipFor);
  if (tipFor && tipFor._tip) tip.innerHTML = tipFor._tip();
  nodes.forEach((n, j) => { n.classList.toggle("is-on", j === i); n.classList.toggle("is-past", j < i); });
  $("prog").style.width = pos(f.year);
  $("prev").disabled = i === 0;
  $("next").disabled = i === F.length - 1;
  const c = $("cur"); c.style.left = pos(f.year); c.textContent = f.year;
}

function legend(f) {
  const used = new Set(Object.values(f.state).flatMap(parts));
  const ctSw = `<span class="x-sw" style="background:${col("MORI")};box-shadow:inset 0 0 0 2px ${col("AMAGO")}"></span>`;
  const csIc = `<svg class="x-cs-lg" viewBox="-6 -6 12 12" aria-hidden="true"><circle r="5.5" fill="none" stroke="currentColor" stroke-width=".8"/><circle r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
  const hasCa = !$("app").classList.contains("x-no-ca");
  const chip = (icon, t) => `<span class="x-lgc" title="${t}" role="img" aria-label="${t}">${icon}<span class="x-lgt" aria-hidden="true">${t}</span></span>`;
  const minors = Object.keys(FA).filter((k) => used.has(k) && !MAJOR.has(k));
  let pop = `<b class="x-lgh">其他势力</b>` +
    (minors.length ? minors.map((k) => `<span>${sw(k)}${fname(k)}</span>`).join("") : `<span>本年无</span>`) +
    `<b class="x-lgh">图例说明</b>` +
    `<span>${ctSw}争夺：底色＝控制方，内描边＝挑战方</span>` +
    (hasCa ? `<span>${csIc}城池：大圆＝大名本城，小圆＝国人本城（家纹，无公版家纹者以姓氏单字代替），小方块＝支城；圈色＝城主所属阵营，虚线＝推测</span>` : "");
  if (confOn) {
    const ic = { "确证": '<i class="x-cfi">✓</i>', "通说": '<i class="x-cfi is-none"></i>', "推测": '<i class="x-cfi">?</i>' };
    pop += `<div class="x-cfl">${Object.entries(GRADES).map(([g, d]) => `<span>${ic[g] || ""}<b>${g}</b>${d}</span>`).join("")}</div>`;
  }
  if (ecoOn) pop += ecoLegend();
  $("legend").innerHTML =
    RACE.map((k) => chip(sw(k), fname(k))).join("") +
    chip(ctSw, "争夺") +
    (hasCa ? chip(csIc, "城池") : "") +
    `<button class="x-lgi" id="lgi" type="button" aria-expanded="${legOpen}" aria-controls="lgp" aria-label="图例说明" title="图例说明"><span aria-hidden="true">ⓘ</span></button>` +
    `<div class="x-lgp" id="lgp" role="dialog" aria-label="图例说明"${legOpen ? "" : " hidden"}>${pop}</div>`;
  $("lgi").onclick = (e) => { e.stopPropagation(); legOpen = !legOpen; legend(F[cur]); $("lgi").focus(); };
  $("lgp").onclick = (e) => e.stopPropagation();
}
document.addEventListener("click", () => { if (legOpen) { legOpen = false; legend(F[cur]); } });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && legOpen) { legOpen = false; legend(F[cur]); $("lgi").focus(); } });

