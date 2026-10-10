# 数据改动报告：python3 tools/diff_states.py 旧sandbox_data.js 新sandbox_data.js
# 按年份对齐（不是按帧序号）：新增帧与旧数据中该年之前最近一帧的状态比较。
# 列出帧的增删、每年国域颜色的变化和新增的城池易主；改数据后、提交前必跑。
import json, sys
def load(p):
    t = open(p, encoding="utf-8").read(); return json.loads(t[t.index("{"):t.rindex("}") + 1])
A, B = load(sys.argv[1]), load(sys.argv[2])
print("城池数", len(A.get("castles", [])), "→", len(B.get("castles", [])))
ya = [f["year"] for f in A["frames"]]; yb = [f["year"] for f in B["frames"]]
add = [y for y in yb if y not in ya]; rm = [y for y in ya if y not in yb]
print("帧数", len(ya), "→", len(yb), "| 新增帧:", add or "-", "| 删除帧:", rm or "-")
def at(F, y):  # 该年（或之前最近一帧）的状态
    best = None
    for f in F:
        if f["year"] <= y: best = f
    return best
for fb in B["frames"]:
    fa = at(A["frames"], fb["year"]); same = fa is not None and fa["year"] == fb["year"]
    sa = fa["state"] if fa else {}
    d = {k: (sa.get(k), fb["state"].get(k)) for k in fb["state"] if sa.get(k) != fb["state"].get(k)}
    nf = [c for c in fb.get("castleFlips", []) if not same or c not in fa.get("castleFlips", [])]
    tag = "" if same else "（新帧，对比旧数据当时状态）"
    if d or nf or not same: print(fb["year"], tag, "国色:", d or "-", "| 易主:", nf or "-")
