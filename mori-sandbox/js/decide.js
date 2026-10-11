// decide.js — 「抉择」模式：站在元就的位置上，只看当时能知道的信息，先选再揭晓
// 依赖全局：S, F, $, go, setPlay, playing, nodes, gdot, hideTip。入口：「抉择」按钮 / URL #decide 或 #decide=N（1 起）
(() => {
const D = S.decisions || [];
if (!D.length) return;
const app = $("app"), box = $("dec"), btn = $("decBtn");
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fi = (y) => F.findIndex((f) => f.year === y);
let k = -1, picked = null;

// 时间轴：抉择年份加一个小菱形
D.forEach((d) => { const i = fi(d.year); if (i >= 0 && nodes[i]) nodes[i].classList.add("is-choice"); });

function head(d) {
  return `<div class="x-dec-hd"><span>抉择 ${k + 1}/${D.length} · ${d.year}年 · 元就 ${d.age} 岁</span>` +
    `<button type="button" class="x-dec-x" data-a="exit" aria-label="退出抉择">✕</button></div>` +
    `<h2 class="x-dec-t">${esc(d.title)}</h2>`;
}
function nav() {
  return `<div class="x-dec-nav"><button type="button" data-a="prev"${k ? "" : " disabled"}>← 上一个</button>` +
    `<button type="button" data-a="next"${k < D.length - 1 ? "" : " disabled"}>下一个 →</button></div>`;
}
function ask() {
  const d = D[k];
  box.innerHTML = head(d) +
    `<p class="x-dec-s">${esc(d.situ)}</p>` +
    `<h3 class="x-h">你此刻知道的</h3><ul class="x-dec-k">${d.know.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` +
    `<p class="x-dec-u">你不知道：${esc(d.unknown.replace(/^你不知道/, ""))}</p>` +
    `<h3 class="x-h">如果你是元就</h3><div class="x-dec-o">` +
    d.options.map((o) => `<button type="button" data-o="${o.key}"><b>${o.key}</b><span>${esc(o.text)}<small>风险：${esc(o.risk)}</small></span></button>`).join("") +
    `</div>` + nav();
}
function reveal() {
  const d = D[k], o = d.options.find((x) => x.key === picked), same = picked === d.chose, c = d.options.find((x) => x.key === d.chose);
  box.innerHTML = head(d) +
    `<div class="x-dec-me"><p class="x-dec-lb">你选了 ${o.key} · ${esc(o.text)}</p><p>${esc(o.sim)}</p><p class="x-dec-sim">推演，非史实</p></div>` +
    `<div class="x-dec-his${same ? " is-same" : ""}"><p class="x-dec-lb">${same ? "和元就一样" : `元就选了 ${c.key} · ${esc(c.text)}`}</p>` +
    `<p>${esc(d.what)}</p><p><b>后来：</b>${esc(d.then)}</p>` +
    `<p class="x-dec-src">${gdot(d.grade)}${esc(d.grade)} · ${esc(d.basis)}</p>` +
    (d.legend ? `<p class="x-dec-lg">传说与记录：${esc(d.legend)}</p>` : "") + `</div>` +
    `<button type="button" class="x-dec-go" data-a="after">在地图上看 ${d.after} 年 ▶</button>` + nav();
}
function open(i) {
  k = Math.max(0, Math.min(D.length - 1, i)); picked = null;
  hideTip();
  if (playing) setPlay(false);
  app.classList.add("x-decide", "x-dec-ask");
  $("overlay").hidden = true;
  btn.setAttribute("aria-pressed", true);
  box.hidden = false;
  go(fi(D[k].ask), true);
  ask();
  box.scrollTop = 0; box.parentNode.scrollTop = 0;
}
function exit() {
  app.classList.remove("x-decide", "x-dec-ask");
  btn.setAttribute("aria-pressed", false);
  box.hidden = true; k = -1;
  if (/^#decide/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
}
box.addEventListener("click", (e) => {
  const o = e.target.closest("[data-o]"), a = e.target.closest("[data-a]");
  if (o) { picked = o.dataset.o; reveal(); return; }
  if (!a) return;
  const act = a.dataset.a;
  if (act === "exit") exit();
  else if (act === "prev") open(k - 1);
  else if (act === "next") open(k + 1);
  else if (act === "after") { app.classList.remove("x-dec-ask"); go(fi(D[k].after), true); }
});
btn.onclick = () => (k >= 0 ? exit() : open(0));
// 抉择中手动换年份，就不再隐藏剧透
window.addEventListener("x-frame", () => { if (k >= 0 && F[cur].year !== D[k].ask) app.classList.remove("x-dec-ask"); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && k >= 0 && !document.querySelector("dialog[open]")) exit(); });
const hash = () => { const m = location.hash.match(/^#decide(?:=(\d+))?$/); if (m) open((+m[1] || 1) - 1); };
window.addEventListener("hashchange", hash);
hash();
})();
