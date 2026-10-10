"""毛利元就时代 西国势力沙盘：按关键年份渲染关键帧，再用 ffmpeg 合成视频。
数据为示意：每国按主导势力着色，"A/B" 表示两方争夺（底色A、斜线B）；安艺按郡细分。"""
import json, copy, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
import matplotlib.patheffects as pe
from matplotlib.patches import Polygon, Rectangle, FancyBboxPatch, Circle
F = "/workspace/work/fonts/"
for f in ["NotoSansCJKsc-Regular.otf", "NotoSansCJKsc-Bold.otf", "NotoSerifCJKsc-Bold.otf"]:
    fm.fontManager.addfont(F + f)
SANS = fm.FontProperties(fname=F + "NotoSansCJKsc-Regular.otf")
BOLD = fm.FontProperties(fname=F + "NotoSansCJKsc-Bold.otf")
SERIF = fm.FontProperties(fname=F + "NotoSerifCJKsc-Bold.otf")
plt.rcParams["hatch.linewidth"] = 2.2
PAPER = "#f3ede1"; INK = "#2b2622"; RED = "#b0402c"; MUTE = "#8a8073"; SEA = "#d9e2e0"
K = "/workspace/work/kuni/"; OUT = "/workspace/work/sengoku/frames/"

FAC = {  # key: (name, color)
    "MORI": ("毛利", "#e3a23b"), "OUCHI": ("大内", "#c98f97"), "AMAGO": ("尼子", "#8ea3c9"),
    "OTOMO": ("大友", "#a58fbf"), "URAGAMI": ("浦上", "#9fb89a"), "YAMANA": ("山名", "#7fa9a8"),
    "AKAMATSU": ("赤松", "#cdb98d"), "KONO": ("河野", "#bcb2a2"), "MIYOSHI": ("三好", "#b7a6a0"), "HOSOKAWA": ("细川", "#c4bcae"), "RYUZOJI": ("龙造寺", "#a9b3a0"), "CHOSOKABE": ("长宗我部", "#b0a6b8"), "TAKEDA_I": ("因幡武田（亲毛利）", "#c9c08f"), "MIMURA": ("三村（毛利盟友）", "#c7cf8e"),
    "TAKEDA": ("安艺武田", "#a88672"), "KOKUJIN": ("国人割据", "#e7e0d0"), "OTHER": ("其他", "#d6d0c4")}

PROV = {"但馬": 43, "因幡": 44, "伯耆": 45, "出雲": 46, "石見": 47, "隠岐": 48, "播磨": 49, "美作": 50,
        "備前": 51, "備中": 52, "備後": 53, "周防": 55, "長門": 56, "阿波": 59, "讃岐": 60, "伊予": 61,
        "土佐": 62, "筑前": 63, "筑後": 64, "豊前": 65, "豊後": 66, "肥前": 67}
AKI = {"豊田": 1, "安芸": 2, "高宮": 3, "沼田": 4, "佐伯": 5, "高田": 6, "賀茂": 7, "山縣": 8}
ZH = {"但馬": "但马", "出雲": "出云", "石見": "石见", "隠岐": "隐岐", "備前": "备前", "備中": "备中", "備後": "备后",
      "長門": "长门", "伊予": "伊予", "筑前": "筑前", "筑後": "筑后", "豊前": "丰前", "豊後": "丰后",
      "高宮": "高宫", "山縣": "山县", "賀茂": "贺茂", "豊田": "丰田", "安芸": "安艺郡"}
LABEL_POS = {"隠岐": (133.25, 36.32), "周防": (131.85, 34.15), "長門": (131.10, 34.30), "伊予": (132.85, 33.55),
             "肥前": (130.05, 33.30), "筑前": (130.62, 33.42), "伯耆": (133.72, 35.22), "讃岐": (134.0, 34.22), "土佐": (133.4, 33.3)}

def load(path):
    d = json.load(open(path)); rings = []
    for ft in d["features"]:
        g = ft["geometry"]; polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        rings += [p[0] for p in polys]
    return rings

def centroid(rings):
    best = max(rings, key=lambda r: abs(area(r)))
    a = area(best); cx = cy = 0
    for (x0, y0), (x1, y1) in zip(best, best[1:] + best[:1]):
        c = x0 * y1 - x1 * y0; cx += (x0 + x1) * c; cy += (y0 + y1) * c
    return cx / (6 * a), cy / (6 * a)

def area(r):
    return sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(r, r[1:] + r[:1])) / 2

GEO = {n: load(f"{K}K{i}.geojson") for n, i in PROV.items()}
GEO.update({"安艺:" + n: load(f"{K}G5400{i}.geojson") for n, i in AKI.items()})

# ---------------- state over time ----------------
S0 = {"周防": "OUCHI", "長門": "OUCHI", "筑前": "OUCHI", "豊前": "OUCHI", "石見": "OUCHI/AMAGO",
      "出雲": "AMAGO", "隠岐": "AMAGO", "伯耆": "YAMANA/AMAGO", "因幡": "YAMANA", "但馬": "YAMANA",
      "備後": "KOKUJIN", "備中": "KOKUJIN", "美作": "URAGAMI/KOKUJIN", "備前": "URAGAMI", "播磨": "AKAMATSU/URAGAMI",
      "豊後": "OTOMO", "筑後": "OTOMO", "肥前": "OTHER", "伊予": "KONO/OTHER", "讃岐": "HOSOKAWA", "阿波": "HOSOKAWA", "土佐": "OTHER",
      "安艺:高田": "MORI", "安艺:高宮": "KOKUJIN", "安艺:山縣": "KOKUJIN", "安艺:豊田": "KOKUJIN",
      "安艺:賀茂": "AMAGO", "安艺:安芸": "TAKEDA", "安艺:沼田": "TAKEDA", "安艺:佐伯": "OUCHI"}

PT = {"吉田郡山城": (132.71, 34.67), "月山富田城": (133.20, 35.36), "山口": (131.47, 34.18),
      "严岛": (132.32, 34.28), "石见银山": (132.44, 35.11), "立花城": (130.47, 33.67)}

KEY = [
 (1523, "元就继任家督", "侄子幸松丸夭折，宿老联署起请文推举元就。\n此时毛利只握有安艺高田郡吉田一带，\n并从属于北方的尼子。", "吉田郡山城", {}),
 (1525, "转投大内", "尼子扶植其异母弟相合元纲夺位，元就诛杀\n元纲一派，与尼子决裂，转投大内义兴。\n尼子则控制了伯耆。", "吉田郡山城", {"安艺:賀茂": "OUCHI", "伯耆": "AMAGO/YAMANA"}),
 (1540, "尼子的巅峰", "尼子晴久势力伸入石见、美作、备后、备中，\n兵锋直抵播磨，并亲率大军围攻吉田郡山城。\n安艺国人大多观望。", "吉田郡山城",
  {"石見": "AMAGO/OUCHI", "伯耆": "AMAGO", "美作": "AMAGO", "備後": "AMAGO/OUCHI", "備中": "AMAGO/KOKUJIN", "因幡": "AMAGO/YAMANA", "播磨": "AKAMATSU/AMAGO"}),
 (1541, "郡山城之战 · 武田灭亡", "元就笼城数月，大内援军陶隆房赶到，\n尼子大败撤回。安艺武田氏随之灭亡，\n其领地归入大内。", "吉田郡山城",
  {"安艺:安芸": "OUCHI", "安艺:沼田": "OUCHI", "備後": "OUCHI/AMAGO", "石見": "OUCHI/AMAGO", "播磨": "AKAMATSU/URAGAMI"}),
 (1543, "大内远征出云惨败", "大内义隆亲征月山富田城失败，\n元就在撤退途中险些战死。\n尼子重新压回石见、备后。", "月山富田城",
  {"石見": "AMAGO/OUCHI", "備後": "AMAGO/OUCHI"}),
 (1550, "毛利两川 · 肃清井上", "三子隆景继小早川家、次子元春继吉川家；\n诛井上一族，家臣二百余人联署立誓服从。\n毛利实际吞并安艺北部与沿海。", "吉田郡山城",
  {"安艺:山縣": "MORI", "安艺:豊田": "MORI"}),
 (1551, "大宁寺之变", "陶晴贤发动政变，大内义隆自尽。\n元就暂时依附陶氏，借机攻取安艺诸城，\n几乎统一安艺。", "山口",
  {"安艺:賀茂": "MORI", "安艺:安芸": "MORI", "安艺:沼田": "MORI", "安艺:高宮": "MORI"}),
 (1554, "防芸引分", "陶氏要求直接支配安艺国人，元就决裂，\n夺取佐伯郡与严岛。同年尼子晴久肃清\n新宫党，自损实力。", "严岛",
  {"安艺:佐伯": "MORI", "備後": "MORI/AMAGO", "阿波": "MIYOSHI", "讃岐": "MIYOSHI/OTHER"}),
 (1555, "严岛之战", "毛利风雨夜渡海奇袭宫岛，村上水军参战，\n陶晴贤自尽。西国力量对比由此翻转。", "严岛",
  {"備後": "MORI", "備中": "MIMURA/AMAGO"}),
 (1557, "大内灭亡 · 取周防长门", "大内义长自尽，大内氏灭亡；毛利领有周防、\n长门。北九州的筑前、丰前转入大友手中。\n同年元就写下《三子教训状》。", "山口",
  {"周防": "MORI", "長門": "MORI", "筑前": "OTOMO", "豊前": "OTOMO/MORI", "石見": "MORI/AMAGO"}),
 (1562, "夺取石见 · 银山入手", "尼子晴久死后，石见国人本城常光降毛利，\n石见银山落入毛利手中，财源大增。\n随即挥师进攻出云。", "石见银山",
  {"石見": "MORI", "出雲": "AMAGO/MORI", "伯耆": "AMAGO/MORI", "備中": "MIMURA", "肥前": "RYUZOJI/OTHER"}),
 (1563, "隆元暴死", "长子隆元突然去世，年近七旬的元就重新\n辅佐孙子辉元。月山富田城外围诸城\n相继陷落，围城开始。", "月山富田城",
  {"伯耆": "MORI/AMAGO", "隠岐": "AMAGO/MORI", "因幡": "YAMANA/TAKEDA_I"}),
 (1566, "尼子降伏", "围困数年后月山富田城开城，尼子义久投降。\n毛利领有出云、隐岐、伯耆，\n成为中国地方的霸主。", "月山富田城",
  {"出雲": "MORI", "隠岐": "MORI", "伯耆": "MORI", "美作": "URAGAMI/MORI"}),
 (1569, "两线危机", "毛利攻下筑前立花城，但尼子再兴军攻入出云、\n大内辉弘在山口起兵，毛利被迫撤出九州\n回师平乱。", "立花城",
  {"出雲": "MORI/AMAGO", "隠岐": "MORI/AMAGO", "筑前": "OTOMO/MORI", "土佐": "CHOSOKABE/OTHER"}),
 (1571, "元就病逝", "尼子再兴军基本被平定，筑前归于大友。\n六月元就病逝于吉田郡山城，享年75岁，\n毛利直辖约八国，另有备中三村等盟友。", "吉田郡山城",
  {"出雲": "MORI", "隠岐": "MORI", "筑前": "OTOMO"}),
]
STATES = []; s = copy.deepcopy(S0)
for k in KEY:
    s = {**s, **k[4]}; STATES.append(s)

def power(st):
    w = {}
    for reg, v in st.items():
        unit = 1 / 8 if reg.startswith("安艺:") else 1
        parts = v.split("/")
        for p in parts:
            w[p] = w.get(p, 0) + unit / len(parts)
    return w

SERIES = ["MORI", "OUCHI", "AMAGO", "OTOMO"]
YEARS = [k[0] for k in KEY]
POW = [power(st) for st in STATES]

def draw(idx, path):
    yr, title, desc, focus, changes = KEY[idx]; st = STATES[idx]
    fig = plt.figure(figsize=(19.2, 10.8), dpi=100, facecolor=PAPER)
    # ---- map ----
    ax = fig.add_axes([0.015, 0.13, 0.60, 0.80]); ax.set_facecolor(SEA)
    for reg, rings in GEO.items():
        v = st[reg].split("/"); a = FAC[v[0]][1]
        changed = reg in changes
        for r in rings:
            if len(v) == 2:
                ax.add_patch(Polygon(r, closed=True, fc=a, ec=FAC[v[1]][1], hatch="///", lw=0))
            else:
                ax.add_patch(Polygon(r, closed=True, fc=a, lw=0))
            ax.add_patch(Polygon(r, closed=True, fill=False, ec=RED if changed else "#7d7366",
                                 lw=2.4 if changed else (0.5 if reg.startswith("安艺:") else 0.9), zorder=3))
    for reg, rings in GEO.items():
        if reg.startswith("安艺:"):
            n = reg[3:]; x, y = centroid(rings)
            ax.text(x, y, ZH.get(n, n), fontproperties=SANS, fontsize=8.5, color="#4a4238", ha="center", va="center", zorder=4)
        else:
            x, y = LABEL_POS.get(reg) or centroid(rings)
            ax.text(x, y, ZH.get(reg, reg), fontproperties=BOLD, fontsize=12.5, color=INK, ha="center", va="center", zorder=4, path_effects=[pe.withStroke(linewidth=3, foreground=PAPER)])
    for n, (x, y) in PT.items():
        hot = n == focus
        if hot:
            ax.add_patch(Circle((x, y), 0.11, fc="none", ec=RED, lw=2.5, zorder=6))
        ax.plot(x, y, marker="s" if "城" in n else "o", ms=7, color=RED if hot else INK, mec=PAPER, mew=1, zorder=7)
        dx = {"山口": -0.14, "石见银山": -0.08}.get(n, 0.08)
        dy = 0.06 if n == "月山富田城" else -0.12
        ax.text(x + dx, y + dy, n, path_effects=[pe.withStroke(linewidth=3, foreground=PAPER)], fontproperties=BOLD if hot else SANS, fontsize=10.5, color=RED if hot else INK, zorder=7,
                ha="right" if n in ("山口", "石见银山") else "left")
    ax.text(131.6, 33.80, "濑户内海", fontproperties=SERIF, fontsize=13, color="#6f8784")
    ax.text(131.2, 35.75, "日本海", fontproperties=SERIF, fontsize=13, color="#6f8784")
    ax.set_xlim(129.75, 134.9); ax.set_ylim(32.95, 36.45); ax.set_aspect(1.21)
    ax.set_xticks([]); ax.set_yticks([])
    for sp in ax.spines.values(): sp.set_color(MUTE)
    fig.text(0.02, 0.955, "毛利元就时代 · 西国势力沙盘", fontproperties=SERIF, fontsize=24, color=INK)
    fig.text(0.255, 0.958, "示意：每国按主导势力着色，斜线＝两方争夺；安艺细分到郡", fontproperties=SANS, fontsize=12, color=MUTE)
    # ---- right panel ----
    X = 0.64
    fig.text(X, 0.885, str(yr), fontproperties=SERIF, fontsize=64, color=RED)
    fig.text(X + 0.125, 0.905, title, fontproperties=BOLD, fontsize=26, color=INK)
    age = yr - 1497 + 1
    fig.text(X + 0.127, 0.875, f"元就 {age} 岁（虚岁）", fontproperties=SANS, fontsize=13, color=MUTE)
    fig.text(X, 0.845, desc, fontproperties=SANS, fontsize=15.5, color=INK, va="top", linespacing=1.65)
    # legend: factions present
    present = []
    for v in st.values():
        for p in v.split("/"):
            if p not in present: present.append(p)
    order = [k for k in FAC if k in present]
    fig.text(X, 0.655, "势力", fontproperties=BOLD, fontsize=13, color=INK)
    for i, kf in enumerate(order):
        cx = X + (i % 4) * 0.087; cy = 0.62 - (i // 4) * 0.035
        name = FAC[kf][0]
        if kf == "OUCHI" and 1551 <= yr < 1557: name = "大内（陶掌权）"
        fig.patches.append(Rectangle((cx, cy), 0.014, 0.022, transform=fig.transFigure, fc=FAC[kf][1], ec="#7d7366", lw=0.6))
        fig.text(cx + 0.018, cy + 0.003, name, fontproperties=SANS, fontsize=10.5, color=INK)
    # power chart
    cax = fig.add_axes([X + 0.03, 0.19, 0.32, 0.29]); cax.set_facecolor(PAPER)
    for kf in SERIES:
        ys = [p.get(kf, 0) for p in POW[: idx + 1]]; xs = YEARS[: idx + 1]
        lw = 3.2 if kf == "MORI" else 2
        cax.step(xs + [yr + 0.6], ys + [ys[-1]], where="post", color=FAC[kf][1] if kf != "OUCHI" else "#b56f79", lw=lw)
        if ys[-1] < 0.05: continue
        cax.text(yr + 1.2, ys[-1], f"{FAC[kf][0]} {ys[-1]:.1f}", fontproperties=BOLD if kf == "MORI" else SANS,
                 fontsize=11, color=INK, va="center")
    cax.set_xlim(1521, 1579); cax.set_ylim(0, 9.5)
    for sp in ["top", "right"]: cax.spines[sp].set_visible(False)
    for sp in ["left", "bottom"]: cax.spines[sp].set_color(MUTE)
    cax.tick_params(colors=MUTE, labelsize=10, length=0)
    cax.set_xticks([1530, 1540, 1550, 1560, 1570]); cax.set_yticks([0, 2, 4, 6, 8])
    cax.grid(axis="y", color=INK, alpha=0.07)
    fig.text(X, 0.505, "主导领国数（争夺之国各计一半，安艺每郡计1/8）", fontproperties=BOLD, fontsize=12.5, color=INK)
    # ---- bottom timeline ----
    tax = fig.add_axes([0.03, 0.035, 0.94, 0.07]); tax.axis("off"); tax.set_xlim(1519, 1575); tax.set_ylim(0, 1)
    tax.plot([1520, 1574], [0.55, 0.55], color=MUTE, lw=2)
    tax.plot([1520, yr], [0.55, 0.55], color=RED, lw=4)
    for i, (y2, t2, *_r) in enumerate(KEY):
        done = y2 <= yr; cur = y2 == yr
        tax.plot(y2, 0.55, "o", ms=12 if cur else 8, color=RED if done else PAPER, mec=RED if done else MUTE, mew=1.5, zorder=3)
        lab = str(y2)
        tax.text(y2, 0.95 if i % 2 == 0 else 0.05, lab, fontproperties=BOLD if cur else SANS, fontsize=12 if cur else 9.5,
                 color=RED if cur else (INK if done else MUTE), ha="center", va="center")
    fig.text(0.985, 0.006, "边界：CODH 旧国·旧郡境界数据集（CC BY-NC）；势力归属为概略示意", fontproperties=SANS, fontsize=9, color=MUTE, ha="right")
    fig.savefig(path, facecolor=PAPER); plt.close(fig)

if __name__ == "__main__":
    import os, sys
    os.makedirs(OUT, exist_ok=True)
    idxs = [int(a) for a in sys.argv[1:]] or range(len(KEY))
    for i in idxs:
        draw(i, f"{OUT}k{i:02d}.png")
