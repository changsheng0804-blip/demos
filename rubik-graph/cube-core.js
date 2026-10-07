/* 二阶魔方的图模型：状态 = 节点，转动 = 边。纯 JS，无依赖。 */
(function (root) {
  "use strict";
  // 面颜色编号：0 U白 1 D黄 2 F绿 3 B蓝 4 R红 5 L橙
  function faceColor(n) {
    if (n[1] === 1) return 0; if (n[1] === -1) return 1;
    if (n[2] === 1) return 2; if (n[2] === -1) return 3;
    if (n[0] === 1) return 4; return 5;
  }
  function det(a, b, c) {
    return a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  }
  // 8 个角块位置，左下后角 DBL(-1,-1,-1) 放最后并固定不动
  var CORNERS = [];
  [1, -1].forEach(function (x) { [1, -1].forEach(function (y) { [1, -1].forEach(function (z) {
    if (!(x === -1 && y === -1 && z === -1)) CORNERS.push([x, y, z]);
  }); }); });
  CORNERS.push([-1, -1, -1]);

  // 每个角 3 张贴纸，按统一手性排序，第 0 张在 U/D 面上
  var STICKERS = [];
  CORNERS.forEach(function (p, c) {
    var n0 = [0, p[1], 0], a = [p[0], 0, 0], b = [0, 0, p[2]];
    var order = det(n0, a, b) > 0 ? [n0, a, b] : [n0, b, a];
    order.forEach(function (n) { STICKERS.push({ c: c, p: p, n: n }); });
  });
  var SOLVED = STICKERS.map(function (s) { return faceColor(s.n); });
  var HOME = CORNERS.map(function (_, c) { return [SOLVED[3 * c], SOLVED[3 * c + 1], SOLVED[3 * c + 2]]; });

  function rot90(v, ax) {
    var x = v[0], y = v[1], z = v[2];
    if (ax === 0) return [x, -z, y];
    if (ax === 1) return [z, y, -x];
    return [-y, x, z];
  }
  function rotq(v, ax, q) { q = ((q % 4) + 4) % 4; for (var i = 0; i < q; i++) v = rot90(v, ax); return v; }
  function eq(a, b) { return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; }

  // 9 种转动（顺时针 = 绕正轴 -90°）
  var MOVE_NAMES = ["U", "U2", "U'", "R", "R2", "R'", "F", "F2", "F'"];
  var MOVE_AXIS = [1, 1, 1, 0, 0, 0, 2, 2, 2];
  var MOVE_Q = [-1, -2, 1, -1, -2, 1, -1, -2, 1];
  function inverse(m) { return ((m / 3) | 0) * 3 + (2 - (m % 3)); }

  var MOVE_PERM = MOVE_NAMES.map(function (_, m) {
    var ax = MOVE_AXIS[m], q = MOVE_Q[m];
    return STICKERS.map(function (s, i) {
      if (s.p[ax] <= 0) return i;
      var p2 = rotq(s.p, ax, q), n2 = rotq(s.n, ax, q);
      for (var j = 0; j < 24; j++) if (eq(STICKERS[j].p, p2) && eq(STICKERS[j].n, n2)) return j;
      throw new Error("bad move");
    });
  });
  function applyMove(s, m) {
    var P = MOVE_PERM[m], r = new Array(24);
    for (var i = 0; i < 24; i++) r[P[i]] = s[i];
    return r;
  }
  function readCubies(s) {
    var perm = [], tw = [];
    for (var j = 0; j < 8; j++) {
      var cols = [s[3 * j], s[3 * j + 1], s[3 * j + 2]];
      var t = cols[0] <= 1 ? 0 : cols[1] <= 1 ? 1 : 2;
      var c = -1;
      for (var k = 0; k < 8; k++) if (HOME[k][0] === cols[t] && HOME[k][1] === cols[(t + 1) % 3]) { c = k; break; }
      perm.push(c); tw.push(t);
    }
    return { perm: perm, tw: tw };
  }
  function fromCubies(perm, tw) {
    var s = new Array(24);
    for (var j = 0; j < 8; j++) { var h = HOME[perm[j]]; for (var i = 0; i < 3; i++) s[3 * j + (i + tw[j]) % 3] = h[i]; }
    return s;
  }
  var FACT = [1, 1, 2, 6, 24, 120, 720, 5040];
  function permRank(a) {
    var r = 0;
    for (var i = 0; i < 7; i++) { var c = 0; for (var j = i + 1; j < 7; j++) if (a[j] < a[i]) c++; r += c * FACT[6 - i]; }
    return r;
  }
  function permUnrank(r) {
    var items = [0, 1, 2, 3, 4, 5, 6], a = [];
    for (var i = 0; i < 7; i++) { var f = FACT[6 - i], k = Math.floor(r / f); r %= f; a.push(items.splice(k, 1)[0]); }
    return a;
  }
  function oriRank(tw) { var r = 0; for (var i = 5; i >= 0; i--) r = r * 3 + tw[i]; return r; }
  function oriUnrank(r) {
    var tw = [], s = 0;
    for (var i = 0; i < 6; i++) { tw.push(r % 3); s += r % 3; r = Math.floor(r / 3); }
    tw.push((3 - (s % 3)) % 3); tw.push(0);
    return tw;
  }
  var N_P = 5040, N_O = 729, N = N_P * N_O;
  function stateIndex(s) { var cu = readCubies(s); return permRank(cu.perm.slice(0, 7)) * N_O + oriRank(cu.tw); }
  function stateFromIndex(idx) {
    var p = Math.floor(idx / N_O), o = idx % N_O;
    return fromCubies(permUnrank(p).concat([7]), oriUnrank(o));
  }
  // 转动表：图的边在“坐标”上的作用
  var PM = new Uint16Array(N_P * 9), OM = new Uint16Array(N_O * 9);
  (function () {
    var p, o, m, s, zero = [0, 0, 0, 0, 0, 0, 0, 0], id = [0, 1, 2, 3, 4, 5, 6, 7];
    for (p = 0; p < N_P; p++) { s = fromCubies(permUnrank(p).concat([7]), zero); for (m = 0; m < 9; m++) PM[p * 9 + m] = permRank(readCubies(applyMove(s, m)).perm.slice(0, 7)); }
    for (o = 0; o < N_O; o++) { s = fromCubies(id, oriUnrank(o)); for (m = 0; m < 9; m++) OM[o * 9 + m] = oriRank(readCubies(applyMove(s, m)).tw); }
  })();
  function neighbor(idx, m) { var p = (idx / 729) | 0, o = idx - p * 729; return PM[p * 9 + m] * 729 + OM[o * 9 + m]; }

  // 从复原状态出发的广度优先搜索，可分批执行（便于动画展示）
  function createBFS() {
    var dist = new Uint8Array(N); dist.fill(255);
    var q = new Int32Array(N), head = 0, tail = 0;
    var solved = stateIndex(SOLVED);
    dist[solved] = 0; q[tail++] = solved;
    var counts = [1];
    return {
      dist: dist, counts: counts, solved: solved,
      visited: function () { return tail; },
      depth: function () { return counts.length - 1; },
      step: function (budget) {
        var end = Math.min(tail, head + budget);
        while (head < end) {
          var x = q[head++], d = dist[x] + 1, p = (x / 729) | 0, o = x - p * 729, pb = p * 9, ob = o * 9;
          for (var m = 0; m < 9; m++) {
            var y = PM[pb + m] * 729 + OM[ob + m];
            if (dist[y] === 255) { dist[y] = d; q[tail++] = y; counts[d] = (counts[d] || 0) + 1; }
          }
        }
        return head >= tail;
      }
    };
  }
  // 沿“下坡边”走回复原：每一步选距离减 1 的邻居，即最短路
  function shortestPath(dist, idx) {
    var path = [], cur = idx;
    while (dist[cur] > 0 && dist[cur] !== 255) {
      var d = dist[cur], found = -1;
      for (var m = 0; m < 9; m++) { if (dist[neighbor(cur, m)] === d - 1) { found = m; break; } }
      if (found < 0) break;
      path.push(found); cur = neighbor(cur, found);
    }
    return path;
  }

  var api = {
    STICKERS: STICKERS, CORNERS: CORNERS, SOLVED: SOLVED, MOVE_NAMES: MOVE_NAMES, MOVE_AXIS: MOVE_AXIS, MOVE_Q: MOVE_Q,
    N: N, applyMove: applyMove, stateIndex: stateIndex, stateFromIndex: stateFromIndex, neighbor: neighbor,
    inverse: inverse, createBFS: createBFS, shortestPath: shortestPath, readCubies: readCubies
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Cube2 = api;
})(this);
