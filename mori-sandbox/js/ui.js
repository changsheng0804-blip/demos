// 毛利元就 西国势力沙盘 · ui.js — 史料说明、手机图层、录屏、面板拖拽、最大化、快捷键、启动
// 所有 js/*.js 按 index.html 中顺序作为普通脚本加载，共享同一全局作用域（原单一 IIFE 拆分）。
// sources dialog
const dlg = $("srcDlg");
$("gradeList").innerHTML = Object.entries(GRADES).map(([g, d]) => `<dt>${gdot(g)}${g}</dt><dd>${d}</dd>`).join("");
$("confBtn").onclick = () => {
  confOn = !confOn;
  $("confBtn").setAttribute("aria-pressed", confOn);
  $("app").classList.toggle("x-conf", confOn);
  legend(F[cur]);
};
$("ecoBtn").onclick = () => {
  ecoOn = !ecoOn;
  $("ecoBtn").setAttribute("aria-pressed", ecoOn);
  $("app").classList.toggle("x-eco", ecoOn);
  if (!ecoOn && tipFor && tipFor._tip) hideTip();
  legend(F[cur]);
};
// phone: layer toggles live in one 「图层」 popover
const lyw = $("lyw"), lyBtn = $("lyBtn");
const lySet = (o) => { lyw.classList.toggle("is-open", o); lyBtn.setAttribute("aria-expanded", o); };
lyBtn.onclick = (e) => { e.stopPropagation(); lySet(!lyw.classList.contains("is-open")); };
document.addEventListener("click", (e) => { if (!lyw.contains(e.target)) lySet(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && lyw.classList.contains("is-open")) { lySet(false); lyBtn.focus(); } });
$("corr").innerHTML = (S.corrections || []).map((c) => `<li>${c}</li>`).join("");
$("srcNote").textContent = S.meta.note || "";
$("srcSrc").textContent = S.meta.source || "";
$("srcBtn").onclick = () => { hideTip(); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); };
$("srcX").onclick = () => (dlg.close ? dlg.close() : dlg.removeAttribute("open"));
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
const noteDlg = $("noteDlg");
$("noteBtn").onclick = () => { hideTip(); lySet(false); if (noteDlg.showModal) noteDlg.showModal(); else noteDlg.setAttribute("open", ""); };
$("noteX").onclick = () => (noteDlg.close ? noteDlg.close() : noteDlg.removeAttribute("open"));
noteDlg.addEventListener("click", (e) => { if (e.target === noteDlg) noteDlg.close(); });

function go(i, manual) {
  i = Math.max(0, Math.min(F.length - 1, i));
  if (i === cur) return;
  const anim = cur >= 0 && i === cur + 1;
  if (manual) user = false; // a manual year change hands the view back to the playback camera
  cur = i;
  chipsOpen = false;
  render(i, anim);
  window.dispatchEvent(new CustomEvent("x-frame", { detail: i }));
  if (manual && playing) schedule();
}
function schedule() {
  clearTimeout(timer); clearTimeout(zoomT);
  if (!playing) return;
  if (!concise && cur < F.length - 1) zoomT = setTimeout(() => cam(VB0, 700 * (speed > 1 ? 1 / speed : 1)), frameLen(F[cur]) - 800 * (speed > 1 ? 1 / speed : 1));
  timer = setTimeout(() => { if (cur >= F.length - 1) setPlay(false); else { go(cur + 1); schedule(); } }, frameLen(F[cur]));
}
function setPlay(on) {
  playing = on;
  $("overlay").hidden = true;
  $("play").textContent = on ? "❚❚" : "▶";
  $("play").setAttribute("aria-label", on ? "暂停" : "播放");
  if (on && cur >= F.length - 1) { cur = -1; go(0); }
  schedule();
}
$("play").onclick = () => setPlay(!playing);
$("overlay").onclick = () => { if (concise && !RM) render(cur, true); setPlay(true); };
document.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => {
  const c = b.dataset.mode === "c";
  document.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", x === b));
  if (c === concise) return;
  concise = c;
  $("app").classList.toggle("x-concise", c);
  clearTimeout(fxT); clearTimeout(zoomT);
  render(cur, false);
  schedule();
}));
$("descTg").onclick = () => { descOpen = !descOpen; panel(F[cur]); };
$("peopleTg").onclick = () => { allPeople = !allPeople; panel(F[cur]); };
$("trendTg").onclick = () => {
  const on = !$("app").classList.contains("x-trend");
  $("app").classList.toggle("x-trend", on);
  $("trendTg").setAttribute("aria-pressed", on);
};
$("prev").onclick = () => go(cur - 1, true);
$("next").onclick = () => { $("overlay").hidden = true; go(cur + 1, true); };
document.querySelectorAll("[data-sp]").forEach((b) => (b.onclick = () => {
  speed = +b.dataset.sp;
  document.querySelectorAll("[data-sp]").forEach((x) => x.setAttribute("aria-pressed", x === b));
  schedule();
}));
document.querySelectorAll("[data-ly]").forEach((b) => (b.onclick = () => {
  const on = b.getAttribute("aria-pressed") !== "true";
  b.setAttribute("aria-pressed", on);
  $("app").classList.toggle("x-no-" + b.dataset.ly, !on);
  if (b.dataset.ly === "ca") {
    if (!on && tipFor && tipFor.classList && tipFor.classList.contains("x-cs")) hideTip();
    legend(F[cur]);
  }
}));
// recording mode: clean 16:9 stage, frames played back at a fixed length each
const app = $("app"), recDlg = $("recDlg"), recEnd = $("recEnd");
let rec = null;
$("recLg").innerHTML = MAJORS.map((k) => `<span>${sw(k)}${fname(k)}</span>`).join("");
const yOpt = F.map((f, i) => `<option value="${i}">${f.year}</option>`).join("");
$("recY0").innerHTML = yOpt; $("recY1").innerHTML = yOpt;
const yIdx = (y, d) => { const i = F.findIndex((f) => f.year === y); return i < 0 ? d : i; };
const REC0 = yIdx(1550, 0), REC1 = yIdx(1557, F.length - 1);
$("recY0").value = REC0; $("recY1").value = REC1;
const natLen = (f) => Math.max(minLen(f), beatLen(f) + (quiet(f) ? 1100 : 2600));
const pressedView = () => (["vMap", "vCamp", "vFam"].find((id) => $(id).getAttribute("aria-pressed") === "true") || "vMap");
function recStart(o) {
  if (rec) return;
  let a = Math.max(0, Math.min(F.length - 1, o.a)), b = Math.max(0, Math.min(F.length - 1, o.b));
  if (a > b) [a, b] = [b, a];
  const D = o.dur * 1000;
  rec = { T: [], concise, speed, view: pressedView() };
  if (recDlg.open) recDlg.close();
  if (dlg.open) dlg.close();
  if (noteDlg.open) noteDlg.close();
  if (playing) setPlay(false);
  lySet(false);
  if (!concise) document.querySelector('[data-mode="c"]').click();
  $(o.view === "camp" ? "vCamp" : "vMap").click();
  hideTip();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  user = false;
  app.classList.add("x-rec");
  recEnd.classList.remove("is-on");
  speed = 1; cur = a; chipsOpen = false;
  render(a, false);
  window.dispatchEvent(new CustomEvent("x-frame-still", { detail: a }));
  const at = (fn, t) => rec.T.push(setTimeout(fn, t));
  let t = 2000;
  for (let i = a; i <= b; i++) {
    at(() => {
      speed = natLen(F[i]) / D;
      if (i === a) render(a, true); else go(i);
    }, t);
    t += D;
  }
  at(() => recEnd.classList.add("is-on"), t + 4000);
}
function recStop() {
  if (!rec) return;
  const p = rec; rec = null;
  p.T.forEach(clearTimeout);
  resetBeats();
  app.classList.remove("x-rec");
  recEnd.classList.remove("is-on");
  speed = p.speed;
  if (!p.concise) document.querySelector('[data-mode="d"]').click();
  render(cur, false);
  window.dispatchEvent(new CustomEvent("x-frame-still", { detail: cur }));
  $(p.view).click();
  if (/^#rec/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
}
$("recBtn").onclick = () => { hideTip(); if (recDlg.showModal) recDlg.showModal(); else recDlg.setAttribute("open", ""); };
$("recX").onclick = () => (recDlg.close ? recDlg.close() : recDlg.removeAttribute("open"));
recDlg.addEventListener("click", (e) => { if (e.target === recDlg) recDlg.close(); });
$("recGo").onclick = () => recStart({ a: +$("recY0").value, b: +$("recY1").value, dur: +$("recDur").value, view: $("recView").value });
document.addEventListener("keydown", (e) => {
  if (!rec) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.key === "Escape") recStop();
}, true);
const recHash = () => {
  const m = location.hash.match(/^#rec(?:=(\d{4})-(\d{4}))?$/);
  if (!m) return;
  recStart({ a: m[1] ? yIdx(+m[1], REC0) : REC0, b: m[2] ? yIdx(+m[2], REC1) : REC1, dur: 8, view: "map" });
};
window.addEventListener("hashchange", recHash);
document.addEventListener("DOMContentLoaded", recHash);
document.addEventListener("keydown", (e) => {
  if (dlg.open || noteDlg.open || recDlg.open) return;
  if (e.key === "Escape") hideTip();
  else if (e.key === " ") { e.preventDefault(); setPlay(!playing); }
  else if (e.key === "ArrowLeft") go(cur - 1, true);
  else if (e.key === "ArrowRight") go(cur + 1, true);
});
// resizable panel + maximized map; state kept in memory only
const grip = $("grip"), mapBox = document.querySelector(".x-map");
let panelW = 300;
const maxW = () => Math.max(220, Math.floor(window.innerWidth * 0.45));
const setW = (w) => {
  panelW = Math.round(Math.max(220, Math.min(maxW(), w)));
  app.style.setProperty("--x-pw", panelW + "px");
  grip.setAttribute("aria-valuenow", panelW);
  grip.setAttribute("aria-valuemax", maxW());
};
setW(panelW);
grip.addEventListener("pointerdown", (e) => {
  if (e.button > 0) return;
  e.preventDefault();
  hideTip();
  grip.setPointerCapture(e.pointerId);
  grip.classList.add("is-drag"); app.classList.add("is-resizing");
  const move = (ev) => setW(window.innerWidth - ev.clientX - grip.offsetWidth / 2);
  const up = () => {
    grip.classList.remove("is-drag"); app.classList.remove("is-resizing");
    grip.removeEventListener("pointermove", move);
    grip.removeEventListener("pointerup", up);
    grip.removeEventListener("pointercancel", up);
  };
  grip.addEventListener("pointermove", move);
  grip.addEventListener("pointerup", up);
  grip.addEventListener("pointercancel", up);
});
grip.addEventListener("keydown", (e) => {
  const d = { ArrowLeft: 20, ArrowRight: -20, Home: -1e4, End: 1e4 }[e.key];
  if (d == null) return;
  e.preventDefault(); e.stopPropagation();
  setW(panelW + d);
});
window.addEventListener("resize", () => grip.setAttribute("aria-valuemax", maxW()));
if (window.ResizeObserver) {
  let rz = 0, last = "";
  new ResizeObserver(() => {
    const k = mapBox.clientWidth + "x" + mapBox.clientHeight;
    if (k === last) return;
    last = k;
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(() => window.dispatchEvent(new CustomEvent("x-refit")));
  }).observe(mapBox);
}
const maxBtn = $("maxBtn"), maxOff = $("maxOff");
const setMax = (on) => {
  if (on === app.classList.contains("x-max")) return;
  hideTip(); lySet(false);
  app.classList.toggle("x-max", on);
  maxBtn.setAttribute("aria-pressed", on);
  if (on) maxOff.focus(); else if (getComputedStyle(maxBtn).display !== "none") maxBtn.focus();
};
maxBtn.onclick = () => setMax(true);
maxOff.onclick = () => setMax(false);
document.addEventListener("keydown", (e) => {
  if (rec || dlg.open || noteDlg.open || recDlg.open || e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
  if (e.key === "f" || e.key === "F") { e.preventDefault(); setMax(!app.classList.contains("x-max")); }
  else if (e.key === "Escape" && app.classList.contains("x-max")) setMax(false);
});
go(0);
