# 数据改动报告：python3 tools/diff_states.py 旧sandbox_data.js 新sandbox_data.js
# 列出每年国域颜色的变化和新增的城池易主，改数据后、提交前必跑
import json, sys
def load(p):
    t = open(p, encoding="utf-8").read(); return json.loads(t[t.index("{"):t.rindex("}") + 1])
A, B = load(sys.argv[1]), load(sys.argv[2])
print("城池数", len(A.get("castles", [])), "→", len(B.get("castles", [])))
for fa, fb in zip(A["frames"], B["frames"]):
    d = {k: (fa["state"].get(k), fb["state"].get(k)) for k in fb["state"] if fa["state"].get(k) != fb["state"].get(k)}
    nf = [c for c in fb.get("castleFlips", []) if c not in fa.get("castleFlips", [])]
    if d or nf: print(fb["year"], "国色:", d or "-", "| 新易主:", nf or "-")
