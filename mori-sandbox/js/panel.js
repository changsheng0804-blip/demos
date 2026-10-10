// 毛利元就 西国势力沙盘 · panel.js — 右侧面板：势力消长、时间轴、走势图；全局播放状态 cur/playing/speed
// 所有 js/*.js 按 index.html 中顺序作为普通脚本加载，共享同一全局作用域（原单一 IIFE 拆分）。
// power race
const RACE = MAJORS;
// 刻度不让「东军诸大名」这种合计值撑大（1600 年一家独大会把其他条压扁），超出部分封顶
const PMAX = Math.max(...F.flatMap((f) => RACE.filter((k) => k !== "TOKUGAWA").map((k) => f.power[k] || 0)));
const rows = {};
RACE.forEach((k) => {
  const d = document.createElement("div");
  d.className = "x-row";
  d.innerHTML = `<span>${fname(k)}</span><div class="x-track"><div class="x-fill" style="background:${FA[k].color}"></div></div><span class="x-val"></span>`;
  $("race").appendChild(d);
  rows[k] = d;
});

// timeline
const Y0 = 1520, Y1 = F[F.length - 1].year + 3, pos = (y) => ((y - Y0) / (Y1 - Y0)) * 100 + "%";
const tl = $("tl");
for (let y = Y0; y <= Y1; y++) { const t = document.createElement("span"); t.className = "x-yt" + (y % 10 ? "" : " is-dec"); t.style.left = pos(y); tl.appendChild(t); }
for (let y = 1520; y <= Y1; y += 10) { const t = document.createElement("span"); t.className = "x-tick"; t.style.left = pos(y); t.textContent = y; tl.appendChild(t); }
const nodes = F.map((f, i) => {
  const b = document.createElement("button");
  b.type = "button"; b.className = "x-node"; b.style.left = pos(f.year);
  b.setAttribute("aria-label", f.year + " " + f.title);
  b.innerHTML = `<span class="x-nl">${f.year}</span>`;
  b.onclick = () => go(i, true);
  tl.appendChild(b);
  return b;
});
// nodes crowd (1540–1544 are a year apart): pick the nearest year to the pointer
const nearest = (x) => {
  const r = tl.getBoundingClientRect(), y = Y0 + ((x - r.left) / r.width) * (Y1 - Y0);
  let bi = 0; F.forEach((f, i) => { if (Math.abs(f.year - y) < Math.abs(F[bi].year - y)) bi = i; });
  return bi;
};
let hovN = -1;
const setHov = (i) => { if (hovN === i) return; if (hovN >= 0) nodes[hovN].classList.remove("is-hov"); hovN = i; if (i >= 0) nodes[i].classList.add("is-hov"); };
tl.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") setHov(nearest(e.clientX)); });
tl.addEventListener("pointerleave", () => setHov(-1));
tl.addEventListener("click", (e) => { if (e.target.closest(".x-node") && e.detail === 0) return; go(nearest(e.clientX), true); });

let cur = -1, playing = false, speed = 1, timer = null;

// sparkline: x by actual year (first → last frame), y by power relative to the max
const SY0 = F[0].year, SY1 = F[F.length - 1].year;
const spX = (y) => (((y - SY0) / (SY1 - SY0 || 1)) * 480).toFixed(1), spY = (v) => (92 - (Math.min(v, PMAX) / (PMAX || 1)) * 86).toFixed(1);
$("sy0").textContent = SY0; $("sy1").textContent = SY1;
$("spark").setAttribute("aria-label", `主要势力领国数走势，${SY0}至${SY1}`);
const spNow = el("line", { y1: 0, y2: 95, stroke: "rgba(43,38,34,.3)", "stroke-width": 1, "vector-effect": "non-scaling-stroke", "stroke-dasharray": "2 3" }, $("spark"));
const sp = {};
RACE.forEach((k) => (sp[k] = el("polyline", { stroke: FA[k].color }, $("spark"))));

