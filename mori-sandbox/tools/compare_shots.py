# 截图回归对比：python3 tools/compare_shots.py 基线目录 新目录 [输出目录]
# 对两次 qa.js 的同名截图逐像素比较（容差 24/255，容忍 ±3px 平移），报告变化比例并输出差异图（变化处标红）
import sys, os
import numpy as np
from PIL import Image
a, b = sys.argv[1], sys.argv[2]; out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(b, "diff"); os.makedirs(out, exist_ok=True)
rows = []
for f in sorted(os.listdir(b)):
    if not f.endswith(".png") or not os.path.exists(os.path.join(a, f)): continue
    A = np.asarray(Image.open(os.path.join(a, f)).convert("RGB")).astype(int); B = np.asarray(Image.open(os.path.join(b, f)).convert("RGB")).astype(int)
    if A.shape != B.shape: rows.append((f, None)); continue
    # 容忍 ±S 像素的平移（相机缓动/亚像素渲染差异），只把"附近都找不到对应像素"的点算作变化
    S = 3; d = np.full(A.shape[:2], 999)
    Ap = np.pad(A, ((S, S), (S, S), (0, 0)), mode="edge")
    for dy in range(-S, S + 1):
        for dx in range(-S, S + 1):
            d = np.minimum(d, np.abs(Ap[S + dy:S + dy + A.shape[0], S + dx:S + dx + A.shape[1]] - B).max(axis=2))
    m = d > 24; pct = m.mean() * 100
    if pct > 0:
        v = (B * 0.35 + 165).astype(np.uint8); v[m] = [220, 30, 30]; Image.fromarray(v).save(os.path.join(out, f))
    rows.append((f, pct))
for f, p in rows: print(f"{f:28s} {'尺寸不同' if p is None else f'{p:6.2f}%'}")
