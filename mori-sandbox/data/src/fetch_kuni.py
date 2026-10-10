# 下载 CODH 旧国・旧郡境界 GeoJSON 到 data/src/.cache/kuni/（CC BY-NC，不入库）
# 来源：https://geoshape.ex.nii.ac.jp/kg/  用法：python3 data/src/fetch_kuni.py
import os, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); D = os.path.join(HERE, ".cache", "kuni"); os.makedirs(D, exist_ok=True)
# 从 sandbox.py 读取 PROV / AKI 编号（不 import，因为 sandbox.py 导入时就要读这些文件）
import ast
_t = ast.parse(open(os.path.join(HERE, "sandbox.py"), encoding="utf-8").read())
_v = {n.targets[0].id: ast.literal_eval(n.value) for n in _t.body if isinstance(n, ast.Assign) and isinstance(n.targets[0], ast.Name) and n.targets[0].id in ("PROV", "AKI")}
ids = [f"K{v}" for v in _v["PROV"].values()] + [f"G5400{i}" for i in _v["AKI"].values()]
for i in ids:
    p = os.path.join(D, i + ".geojson")
    if os.path.exists(p): continue
    req = urllib.request.Request(f"https://geoshape.ex.nii.ac.jp/kg/geojson/{i}.geojson", headers={"User-Agent": "mori-sandbox build"})
    open(p, "wb").write(urllib.request.urlopen(req, timeout=60).read()); print("got", i)
print(len(ids), "files in", D)
