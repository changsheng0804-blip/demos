# 数据体检：python3 tools/lint_data.py [data/sandbox_data.js]
# 规则见 DESIGN.md「史实数据」。ERROR 必须修；WARN 需人工判断。
import json, sys, os, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "data", "src"))
p = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "data", "sandbox_data.js")
t = open(p, encoding="utf-8").read(); D = json.loads(t[t.index("{"):t.rindex("}") + 1])
src = open(os.path.join(os.path.dirname(__file__), "..", "data", "src", "build_web_data.py"), encoding="utf-8").read()
m = re.search(r"ALLIED = (\[.*?\])\n", src); ALLIED = eval(m.group(1)) if m else []
allied = lambda a, b, y: any({a, b} == {x, z} and y0 <= y <= y1 for x, z, y0, y1 in ALLIED)
err = warn = 0
def E(*a):
    global err; err += 1; print("ERROR", *a)
def W(*a):
    global warn; warn += 1; print("WARN ", *a)
years = [f["year"] for f in D["frames"]]
facs = set(D.get("factions", {}).keys()) if isinstance(D.get("factions"), dict) else None
for c in D["castles"]:
    h = c["hist"]; ys = [x["from"] for x in h]
    if ys != sorted(ys): E(c["id"], "hist 年份未升序", ys)
    if len(set(ys)) != len(ys): E(c["id"], "hist 同年重复", ys)
    for x in h:
        if x.get("conf") not in ("确证", "通说", "推测"): E(c["id"], x["from"], "可信度缺失")
        if not x.get("why"): E(c["id"], x["from"], "缺少原因")
        if facs and x["fac"] not in facs: E(c["id"], x["from"], "未知阵营", x["fac"])
    # 两帧之间发生又被覆盖的易主（时间轴上看不到）
    for a, b in zip(ys, ys[1:]):
        fa = next((y for y in years if y >= a), None)
        if fa is not None and fa >= b: W(c["id"], f"{a}→{b} 的变化落在同一帧间隔内，时间轴上不可见")
for f in D["frames"]:
    for r, v in f["state"].items():
        s = v.split("/")
        if len(s) == 2 and allied(s[0], s[1], f["year"]): E(f["year"], r, "同盟双方被画成争夺", v)
print(f"{err} errors, {warn} warnings")
sys.exit(1 if err else 0)
