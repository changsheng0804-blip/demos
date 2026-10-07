/* 三阶魔方：Thistlethwaite 四段法。每段都是一张能完整搜索的小地图（图），
   电脑对每张小地图做一次广度优先搜索，然后沿“数字变小”的路走。纯 JS，无依赖。 */
(function (root) {
  "use strict";
  // 角块 URF UFL ULB UBR DFR DLF DBL DRB；棱块 UR UF UL UB DR DF DL DB FR FL BL BR
  var BASIC = [
    { cp: [3,0,1,2,4,5,6,7], co: [0,0,0,0,0,0,0,0], ep: [3,0,1,2,4,5,6,7,8,9,10,11], eo: [0,0,0,0,0,0,0,0,0,0,0,0] }, // U
    { cp: [4,1,2,0,7,5,6,3], co: [2,0,0,1,1,0,0,2], ep: [8,1,2,3,11,5,6,7,4,9,10,0], eo: [0,0,0,0,0,0,0,0,0,0,0,0] }, // R
    { cp: [1,5,2,3,0,4,6,7], co: [1,2,0,0,2,1,0,0], ep: [0,9,2,3,4,8,6,7,1,5,10,11], eo: [0,1,0,0,0,1,0,0,1,1,0,0] }, // F
    { cp: [0,1,2,3,5,6,7,4], co: [0,0,0,0,0,0,0,0], ep: [0,1,2,3,5,6,7,4,8,9,10,11], eo: [0,0,0,0,0,0,0,0,0,0,0,0] }, // D
    { cp: [0,2,6,3,4,1,5,7], co: [0,1,2,0,0,2,1,0], ep: [0,1,10,3,4,5,9,7,8,2,6,11], eo: [0,0,0,0,0,0,0,0,0,0,0,0] }, // L
    { cp: [0,1,3,7,4,5,2,6], co: [0,0,1,2,0,0,2,1], ep: [0,1,2,11,4,5,6,10,8,9,3,7], eo: [0,0,0,1,0,0,0,1,0,0,1,1] }  // B
  ];
  var FACE_NAMES = ["U", "R", "F", "D", "L", "B"];
  function solved() { return { cp: [0,1,2,3,4,5,6,7], co: [0,0,0,0,0,0,0,0], ep: [0,1,2,3,4,5,6,7,8,9,10,11], eo: [0,0,0,0,0,0,0,0,0,0,0,0] }; }
  function mult(a, b) {
    var r = { cp: [], co: [], ep: [], eo: [] }, i;
    for (i = 0; i < 8; i++) { r.cp[i] = a.cp[b.cp[i]]; r.co[i] = (a.co[b.cp[i]] + b.co[i]) % 3; }
    for (i = 0; i < 12; i++) { r.ep[i] = a.ep[b.ep[i]]; r.eo[i] = (a.eo[b.ep[i]] + b.eo[i]) % 2; }
    return r;
  }
  // 18 种拧法：m = 面*3 + k，k=0 顺时针 90°，1 半圈，2 逆时针 90°
  var MOVES = [], MOVE_NAMES = [];
  for (var f = 0; f < 6; f++) {
    var x = BASIC[f];
    for (var k = 0; k < 3; k++) { MOVES.push(x); MOVE_NAMES.push(FACE_NAMES[f] + ["", "2", "'"][k]); x = mult(x, BASIC[f]); }
  }
  function apply(c, m) { return mult(c, MOVES[m]); }
  function isSolved(c) { var s = solved(); return c.cp.join() === s.cp.join() && c.co.join() === s.co.join() && c.ep.join() === s.ep.join() && c.eo.join() === s.eo.join(); }

  // ---- 小工具 ----
  var FACT = [1,1,2,6,24,120,720,5040,40320];
  function permRank(a) { var n = a.length, r = 0; for (var i = 0; i < n; i++) { var c = 0; for (var j = i + 1; j < n; j++) if (a[j] < a[i]) c++; r += c * FACT[n - 1 - i]; } return r; }
  function permUnrank(r, n) { var items = [], a = []; for (var i = 0; i < n; i++) items.push(i); for (i = 0; i < n; i++) { var f = FACT[n - 1 - i], k = Math.floor(r / f); r %= f; a.push(items.splice(k, 1)[0]); } return a; }
  function combos(n, k) { var out = []; (function rec(s, cur) { if (cur.length === k) { out.push(cur.slice()); return; } for (var i = s; i < n; i++) { cur.push(i); rec(i + 1, cur); cur.pop(); } })(0, []); return out; }
  function comboKey(list) { return list.join(","); }

  // ---- 每段的“路口编号” ----
  var C12_4 = combos(12, 4), C12_4_IDX = {}; C12_4.forEach(function (c, i) { C12_4_IDX[comboKey(c)] = i; });
  var C8_4 = combos(8, 4), C8_4_IDX = {}; C8_4.forEach(function (c, i) { C8_4_IDX[comboKey(c)] = i; });
  var M_EDGES = [1,3,5,7], S_EDGES = [0,2,4,6], E_EDGES = [8,9,10,11];

  function eoCoord(c) { var r = 0; for (var i = 10; i >= 0; i--) r = r * 2 + c.eo[i]; return r; }
  function coCoord(c) { var r = 0; for (var i = 6; i >= 0; i--) r = r * 3 + c.co[i]; return r; }
  function sliceCoord(c) { var pos = []; for (var i = 0; i < 12; i++) if (c.ep[i] >= 8) pos.push(i); return C12_4_IDX[comboKey(pos)]; }
  function cpCoord(c) { return permRank(c.cp); }
  function mCoord(c) { var pos = []; for (var i = 0; i < 8; i++) if (M_EDGES.indexOf(c.ep[i]) >= 0) pos.push(i); return C8_4_IDX[comboKey(pos)]; }
  function slicePerm(c, set) { return permRank(set.map(function (p) { return set.indexOf(c.ep[p]); })); }

  // ---- 每段的拧法：越往后越少 ----
  function mv(face, ks) { return ks.map(function (k) { return face * 3 + k; }); }
  var ALL = [0,1,2], HALF = [1];
  var PHASE_MOVES = [
    [].concat(mv(0,ALL), mv(1,ALL), mv(2,ALL), mv(3,ALL), mv(4,ALL), mv(5,ALL)),
    [].concat(mv(0,ALL), mv(1,ALL), mv(2,HALF), mv(3,ALL), mv(4,ALL), mv(5,HALF)),
    [].concat(mv(0,ALL), mv(1,HALF), mv(2,HALF), mv(3,ALL), mv(4,HALF), mv(5,HALF)),
    [].concat(mv(0,HALF), mv(1,HALF), mv(2,HALF), mv(3,HALF), mv(4,HALF), mv(5,HALF))
  ];

  // 第四段的角块：只拧半圈能到的 96 种排列
  var CS_LIST = [], CS_IDX = {};
  (function () {
    var seen = {}, q = [solved()]; seen[permRank(q[0].cp)] = 1;
    while (q.length) { var c = q.shift(); CS_IDX[permRank(c.cp)] = CS_LIST.length; CS_LIST.push(c.cp.slice());
      PHASE_MOVES[3].forEach(function (m) { var d = apply(c, m), r = permRank(d.cp); if (!seen[r]) { seen[r] = 1; q.push(d); } }); }
  })();

  // ---- 转动表 ----
  function table(n, nm, build) { var t = new Uint32Array(n * nm); for (var i = 0; i < n; i++) build(i, t); return t; }
  var tabs = null;
  function buildTables() {
    if (tabs) return tabs;
    var P = PHASE_MOVES;
    var t = {};
    t.eo = table(2048, 18, function (i, T) { var c = solved(); for (var j = 0; j < 11; j++) c.eo[j] = (i >> j) & 1; c.eo[11] = c.eo.slice(0, 11).reduce(function (a, b) { return a + b; }, 0) % 2;
      P[0].forEach(function (m, k) { T[i * 18 + k] = eoCoord(apply(c, m)); }); });
    t.co = table(2187, 14, function (i, T) { var c = solved(), r = i, s = 0; for (var j = 0; j < 7; j++) { c.co[j] = r % 3; s += r % 3; r = Math.floor(r / 3); } c.co[7] = (3 - s % 3) % 3;
      P[1].forEach(function (m, k) { T[i * 14 + k] = coCoord(apply(c, m)); }); });
    t.sl = table(495, 14, function (i, T) { var c = solved(), pos = C12_4[i], e = 8, o = 0; for (var j = 0; j < 12; j++) c.ep[j] = pos.indexOf(j) >= 0 ? e++ : o++;
      P[1].forEach(function (m, k) { T[i * 14 + k] = sliceCoord(apply(c, m)); }); });
    t.cp = table(40320, 10, function (i, T) { var c = solved(); c.cp = permUnrank(i, 8);
      P[2].forEach(function (m, k) { T[i * 10 + k] = cpCoord(apply(c, m)); }); });
    t.mc = table(70, 10, function (i, T) { var c = solved(), pos = C8_4[i], a = 0, b = 0; for (var j = 0; j < 8; j++) c.ep[j] = pos.indexOf(j) >= 0 ? M_EDGES[a++] : S_EDGES[b++];
      P[2].forEach(function (m, k) { T[i * 10 + k] = mCoord(apply(c, m)); }); });
    t.cs = table(96, 6, function (i, T) { var c = solved(); c.cp = CS_LIST[i].slice();
      P[3].forEach(function (m, k) { T[i * 6 + k] = CS_IDX[permRank(apply(c, m).cp)]; }); });
    [["pm", M_EDGES], ["ps", S_EDGES], ["pe", E_EDGES]].forEach(function (pair) {
      var set = pair[1];
      t[pair[0]] = table(24, 6, function (i, T) { var c = solved(), p = permUnrank(i, 4); for (var j = 0; j < 4; j++) c.ep[set[j]] = set[p[j]];
        P[3].forEach(function (m, k) { T[i * 6 + k] = slicePerm(apply(c, m), set); }); });
    });
    tabs = t; return t;
  }

  // ---- 四张小地图 ----
  var PHASES = [
    { size: 2048, nm: 18,
      coord: function (c) { return eoCoord(c); },
      nb: function (x, k) { return tabs.eo[x * 18 + k]; },
      goals: function () { return [0]; } },
    { size: 2187 * 495, nm: 14,
      coord: function (c) { return coCoord(c) * 495 + sliceCoord(c); },
      nb: function (x, k) { var a = (x / 495) | 0, b = x - a * 495; return tabs.co[a * 14 + k] * 495 + tabs.sl[b * 14 + k]; },
      goals: function () { return [C12_4_IDX["8,9,10,11"]]; } },
    { size: 40320 * 70, nm: 10,
      coord: function (c) { return cpCoord(c) * 70 + mCoord(c); },
      nb: function (x, k) { var a = (x / 70) | 0, b = x - a * 70; return tabs.cp[a * 10 + k] * 70 + tabs.mc[b * 10 + k]; },
      goals: function () { var g = C8_4_IDX["1,3,5,7"]; return CS_LIST.map(function (cp) { return permRank(cp) * 70 + g; }); } },
    { size: 96 * 13824, nm: 6,
      coord: function (c) { return ((CS_IDX[permRank(c.cp)] * 24 + slicePerm(c, M_EDGES)) * 24 + slicePerm(c, S_EDGES)) * 24 + slicePerm(c, E_EDGES); },
      nb: function (x, k) { var e = x % 24, r = (x / 24) | 0, s = r % 24; r = (r / 24) | 0; var m = r % 24, cs = (r / 24) | 0;
        return ((tabs.cs[cs * 6 + k] * 24 + tabs.pm[m * 6 + k]) * 24 + tabs.ps[s * 6 + k]) * 24 + tabs.pe[e * 6 + k]; },
      goals: function () { return [0]; } }
  ];
  function phaseBFS(p) {
    var P = PHASES[p], dist = new Uint8Array(P.size); dist.fill(255);
    var q = new Int32Array(P.size), head = 0, tail = 0, counts = [];
    P.goals().forEach(function (g) { if (dist[g] === 255) { dist[g] = 0; q[tail++] = g; } });
    counts[0] = tail;
    return { dist: dist, counts: counts, visited: function () { return tail; },
      step: function (budget) {
        var end = Math.min(tail, head + budget);
        while (head < end) { var x = q[head++], d = dist[x] + 1;
          for (var k = 0; k < P.nm; k++) { var y = P.nb(x, k); if (dist[y] === 255) { dist[y] = d; q[tail++] = y; counts[d] = (counts[d] || 0) + 1; } } }
        return head >= tail;
      } };
  }
  // 沿四张地图依次“下坡”，返回每段的拧法
  function solve(cube, bfs) {
    var c = cube, out = [];
    for (var p = 0; p < 4; p++) {
      var P = PHASES[p], x = P.coord(c), seq = [];
      while (bfs[p].dist[x] > 0) {
        var d = bfs[p].dist[x], ok = false;
        for (var k = 0; k < P.nm; k++) { var y = P.nb(x, k); if (bfs[p].dist[y] === d - 1) { seq.push(PHASE_MOVES[p][k]); c = apply(c, PHASE_MOVES[p][k]); x = y; ok = true; break; } }
        if (!ok) throw new Error("no downhill edge in phase " + p);
      }
      out.push(seq);
    }
    return out;
  }
  function phaseDist(cube, bfs, p) { return bfs[p].dist[PHASES[p].coord(cube)]; }

  // ---- 贴纸（画图用）----
  // 面顺序 U R F D L B，每面 9 格，编号同 Kociemba 展开图
  var U = 0, R = 9, F = 18, D = 27, L = 36, B = 45;
  var CF = [[U+8,R+0,F+2],[U+6,F+0,L+2],[U+0,L+0,B+2],[U+2,B+0,R+2],[D+2,F+8,R+6],[D+0,L+8,F+6],[D+6,B+8,L+6],[D+8,R+8,B+6]];
  var CC = [[0,1,2],[0,2,4],[0,4,5],[0,5,1],[3,2,1],[3,4,2],[3,5,4],[3,1,5]];
  var EF = [[U+5,R+1],[U+7,F+1],[U+3,L+1],[U+1,B+1],[D+5,R+7],[D+1,F+7],[D+3,L+7],[D+7,B+7],[F+5,R+3],[F+3,L+5],[B+5,L+3],[B+3,R+5]];
  var EC = [[0,1],[0,2],[0,4],[0,5],[3,1],[3,2],[3,4],[3,5],[2,1],[2,4],[5,4],[5,1]];
  function facelets(c) {
    var f = new Array(54), i, n;
    for (i = 0; i < 6; i++) f[9 * i + 4] = i;
    for (i = 0; i < 8; i++) for (n = 0; n < 3; n++) f[CF[i][(n + c.co[i]) % 3]] = CC[c.cp[i]][n];
    for (i = 0; i < 12; i++) for (n = 0; n < 2; n++) f[EF[i][(n + c.eo[i]) % 2]] = EC[c.ep[i]][n];
    return f;
  }
  // 每张贴纸在空间里的位置：块坐标 p（-1/0/1）和朝外的方向 n
  var FACE_GEO = [
    { n: [0,1,0],  r: [1,0,0],  d: [0,0,1]  }, // U
    { n: [1,0,0],  r: [0,0,-1], d: [0,-1,0] }, // R
    { n: [0,0,1],  r: [1,0,0],  d: [0,-1,0] }, // F
    { n: [0,-1,0], r: [1,0,0],  d: [0,0,-1] }, // D
    { n: [-1,0,0], r: [0,0,1],  d: [0,-1,0] }, // L
    { n: [0,0,-1], r: [-1,0,0], d: [0,-1,0] }  // B
  ];
  var STICKERS = [];
  FACE_GEO.forEach(function (g) { for (var rr = 0; rr < 3; rr++) for (var cc = 0; cc < 3; cc++) {
    STICKERS.push({ n: g.n, p: [0,1,2].map(function (a) { return g.n[a] + g.r[a] * (cc - 1) + g.d[a] * (rr - 1); }) }); } });

  var api = { solved: solved, apply: apply, isSolved: isSolved, MOVE_NAMES: MOVE_NAMES, PHASE_MOVES: PHASE_MOVES, FACE_GEO: FACE_GEO,
    STICKERS: STICKERS, facelets: facelets, buildTables: buildTables, phaseBFS: phaseBFS, solve: solve, phaseDist: phaseDist,
    PHASE_SIZES: PHASES.map(function (p) { return p.size; }) };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Cube3 = api;
})(this);
