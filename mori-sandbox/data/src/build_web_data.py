"""Build sandbox_data.js for the interactive 毛利元就 势力沙盘 page.
All map geometry is pre-projected into an SVG viewBox; all facts live here."""
import json, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
import sandbox as S  # reuses KEY / STATES / FAC / geometry ids

LON0, LON1, LAT0, LAT1 = 129.75, 134.9, 32.95, 36.45
W = 1000.0
KX = W / (LON1 - LON0)
KY = KX * 1.21
H = round((LAT1 - LAT0) * KY)

def P(lon, lat):
    return [round((lon - LON0) * KX, 1), round((LAT1 - lat) * KY, 1)]

def load_geom(path):
    d = json.load(open(path))
    return unary_union([shape(f["geometry"]).buffer(0) for f in d["features"]])

def to_path(g):
    g = g.simplify(0.004, preserve_topology=True)
    polys = [g] if g.geom_type == "Polygon" else list(g.geoms)
    out = []
    for p in polys:
        if p.area < 0.0004:  # drop tiny islets
            continue
        for ring in [p.exterior] + list(p.interiors):
            pts = [P(x, y) for x, y in ring.coords]
            out.append("M" + "L".join(f"{x},{y}" for x, y in pts) + "Z")
    return "".join(out)

ZH = {**S.ZH, "播磨": "播磨", "因幡": "因幡", "伯耆": "伯耆", "美作": "美作", "周防": "周防", "阿波": "阿波",
      "讃岐": "讃岐", "土佐": "土佐", "肥前": "肥前", "高田": "高田", "沼田": "沼田", "佐伯": "佐伯"}
regions = []
for name, kid in S.PROV.items():
    g = load_geom(f"{S.K}K{kid}.geojson")
    lp = S.LABEL_POS.get(name)
    c = P(*lp) if lp else P(*g.representative_point().coords[0])
    regions.append({"id": name, "name": ZH.get(name, name), "level": "province", "d": to_path(g), "label": c})
for name, i in S.AKI.items():
    g = load_geom(f"{S.K}G5400{i}.geojson")
    c = P(*g.representative_point().coords[0])
    regions.append({"id": "安艺:" + name, "name": ZH.get(name, name), "level": "district", "parent": "安艺", "d": to_path(g), "label": c})
aki_outline = to_path(unary_union([load_geom(f"{S.K}G5400{i}.geojson") for i in range(1, 9)]))

FACTIONS = {
 "MORI":    {"name": "毛利", "color": "#e8a33d", "dark": "#9a5d0c", "crest": "一文字三星"},
 "OUCHI":   {"name": "大内", "color": "#d9707f", "dark": "#8e2f3d", "crest": "大内菱"},
 "AMAGO":   {"name": "尼子", "color": "#5f86c9", "dark": "#28467d", "crest": "平四目结"},
 "OTOMO":   {"name": "大友", "color": "#9b79c4", "dark": "#563a7d", "crest": "杏叶"},
 "URAGAMI": {"name": "浦上", "color": "#8fb58a", "dark": "#4c7347"},
 "YAMANA":  {"name": "山名", "color": "#5ea8a4", "dark": "#2c6663"},
 "AKAMATSU":{"name": "赤松", "color": "#cbb37e", "dark": "#7d6a3d"},
 "KONO":    {"name": "河野", "color": "#b9ae9c", "dark": "#6f6656"},
 "MIMURA":  {"name": "三村（毛利盟友）", "color": "#c4cf7c", "dark": "#6f7a2c"},
 "TAKEDA":  {"name": "安艺武田", "color": "#a07a62", "dark": "#5c4130"},
 "MIYOSHI": {"name": "三好", "color": "#b7a6a0", "dark": "#6e5d57"},
 "HOSOKAWA":{"name": "细川（阿波·讃岐）", "color": "#c4bcae", "dark": "#7a7263"},
 "RYUZOJI": {"name": "龙造寺", "color": "#a9b3a0", "dark": "#5d6853"},
 "CHOSOKABE":{"name": "长宗我部", "color": "#b0a6b8", "dark": "#62586c"},
 "TAKEDA_I":{"name": "因幡武田（亲毛利）", "color": "#c9c08f", "dark": "#7a7140"},
 "KOKUJIN": {"name": "国人割据", "color": "#ece5d4", "dark": "#9d9380"},
 "ODA":     {"name": "织田", "color": "#3f8f6f", "dark": "#1f5a43"},
 "UKITA":   {"name": "宇喜多", "color": "#a3705c", "dark": "#5e3a2b"},
 "TOYOTOMI":{"name": "丰臣政权", "color": "#b3568c", "dark": "#6e2253"},
 "TOKUGAWA":{"name": "东军诸大名", "color": "#3e5f7a", "dark": "#1e3448"},
 "OTHER":   {"name": "其他", "color": "#d9d3c7", "dark": "#9a9284"},
}

PTS = {"吉田郡山城": (132.71, 34.67), "月山富田城": (133.20, 35.36), "山口": (131.47, 34.18),
       "严岛": (132.32, 34.28), "石见银山": (132.44, 35.11), "立花城": (130.47, 33.67),
       "镜山城": (132.74, 34.43), "佐东银山城": (132.47, 34.47), "折敷畑": (132.25, 34.36),
       "新高山城": (132.99, 34.41), "小仓山城": (132.40, 34.78), "白鹿城": (133.05, 35.49),
       "岩国": (132.18, 34.17), "且山城": (130.99, 34.02), "门司城": (130.96, 33.95),
       "府内": (131.61, 33.24), "伯耆": (133.62, 35.40), "播磨": (134.55, 34.90),
       "能岛": (133.02, 34.18), "竹原": (132.91, 34.34), "松尾城": (132.62, 34.85), "鸟坂": (132.58, 33.53), "布部山": (133.18, 35.30), "忍原": (132.36, 35.06), "备后北部": (133.00, 34.80), "须须万沼城": (131.83, 34.36), "美作": (133.95, 35.07), "隐岐": (133.25, 36.20), "丰后水道": (131.95, 33.70)}
MAJORS_ = ["MORI", "OUCHI", "AMAGO", "OTOMO", "ODA", "TOYOTOMI", "TOKUGAWA"]
PTS.update({"畿内方向": (134.80, 34.80), "鞆": (133.38, 34.38), "名护屋": (129.87, 33.53), "朝鲜方向": (129.85, 34.30)})
# 每座城都能作箭头/战役的端点（按城名引用）
from castles import CASTLES as _C0
for _c in _C0: PTS.setdefault(_c["name"], _c["lonlat"])
# 城所在国/郡：按坐标落在哪个国郡多边形里自动判定
from shapely.geometry import Point as _Pt
_RG = {n: load_geom(f"{S.K}K{k}.geojson") for n, k in S.PROV.items()}
_RG.update({"安艺:" + n: load_geom(f"{S.K}G5400{i}.geojson") for n, i in S.AKI.items()})
def region_of(lonlat):
    pt_ = _Pt(*lonlat)
    for n, g in _RG.items():
        if g.contains(pt_): return n
    return min(_RG, key=lambda n: _RG[n].distance(pt_))  # 海岸线简化导致落在海里时取最近
CASTLE_GEO = {c["id"]: region_of(c["lonlat"]) for c in _C0}
# 1600 关原：防长以外的城一律归东军系大名（转封在1600年末至1601年完成）
for _c in _C0:
    if CASTLE_GEO[_c["id"]] not in ("周防", "長門") and _c["hist"][-1][1] != "TOKUGAWA":
        _c["hist"].append((1600, "TOKUGAWA", 2, "关原战后毛利减封至周防·长门，西军诸大名改易，城归东军系大名"))
def pt(n): return P(*PTS[n])

# extra per-keyframe layers, index-aligned with S.KEY
EXTRA = [
 dict(arrows=[("MORI", "吉田郡山城", "镜山城", "attack", "元就代尼子攻镜山城")],
      battles=[("镜山城", "镜山城之战", "MORI")],
      links=[("MORI", "AMAGO", "从属")],
      people=[("毛利元就", "MORI", "继任家督"), ("尼子经久", "AMAGO", "出云霸主"), ("大内义兴", "OUCHI", "西国最大势力")]),
 dict(arrows=[("AMAGO", "月山富田城", "伯耆", "attack", "尼子压服伯耆")],
      battles=[], links=[("MORI", "OUCHI", "从属")],
      people=[("毛利元就", "MORI", "诛相合元纲，转投大内"), ("尼子经久", "AMAGO", "扶植元纲失败"), ("大内义兴", "OUCHI", "接纳毛利")]),
 dict(arrows=[("AMAGO", "月山富田城", "吉田郡山城", "attack", "尼子晴久约三万围城（军记数字）"),
              ("AMAGO", "月山富田城", "播磨", "attack", "1538年尼子兵入播磨")],
      battles=[("吉田郡山城", "吉田郡山城之战", None)], links=[("MORI", "OUCHI", "从属")],
      people=[("毛利元就", "MORI", "笼城死守"), ("尼子晴久", "AMAGO", "亲率大军"), ("大内义隆", "OUCHI", "派陶隆房驰援")]),
 dict(arrows=[("OUCHI", "山口", "吉田郡山城", "attack", "陶隆房援军"),
              ("AMAGO", "吉田郡山城", "月山富田城", "retreat", "尼子败退"),
              ("OUCHI", "吉田郡山城", "佐东银山城", "attack", "安艺武田灭亡")],
      battles=[("吉田郡山城", "郡山城解围", "MORI"), ("佐东银山城", "银山城陷落", "OUCHI")],
      links=[("MORI", "OUCHI", "从属")],
      people=[("毛利元就", "MORI", "守住吉田"), ("尼子晴久", "AMAGO", "大败撤回"), ("尼子经久", "AMAGO", "同年去世", "died"), ("大内义隆", "OUCHI", "趁势进攻出云")]),
 dict(arrows=[("OUCHI", "山口", "月山富田城", "attack", "大内义隆亲征出云"),
              ("OUCHI", "月山富田城", "吉田郡山城", "retreat", "惨败撤退，元就险死")],
      battles=[("月山富田城", "第一次月山富田城之战", "AMAGO")], links=[("MORI", "OUCHI", "从属")],
      people=[("毛利元就", "MORI", "撤退中险些战死"), ("大内义隆", "OUCHI", "此后厌战，倾心文治"), ("尼子晴久", "AMAGO", "守城成功")]),
 dict(arrows=[("MORI", "吉田郡山城", "小仓山城", "inherit", "次子元春入吉川家"),
              ("MORI", "吉田郡山城", "新高山城", "inherit", "三子隆景入小早川家")],
      battles=[("吉田郡山城", "肃清井上一族", None)], links=[("MORI", "OUCHI", "从属")],
      people=[("毛利元就", "MORI", "整肃家臣，立起请文"), ("吉川元春", "MORI", "继吉川家", "new"), ("小早川隆景", "MORI", "继小早川家", "new"), ("毛利隆元", "MORI", "名义家督")]),
 dict(arrows=[("MORI", "吉田郡山城", "佐东银山城", "attack", "以陶方名义夺安艺诸城"),
              ("MORI", "吉田郡山城", "镜山城", "attack", "")],
      battles=[("山口", "大宁寺之变", "OUCHI")], links=[("MORI", "OUCHI", "依附陶氏")],
      people=[("陶晴贤", "OUCHI", "政变掌权", "new"), ("大内义隆", "OUCHI", "自尽", "died"), ("毛利元就", "MORI", "借势扩张")]),
 dict(arrows=[("MORI", "佐东银山城", "严岛", "attack", "夺取严岛、樱尾城"),
              ("OUCHI", "岩国", "折敷畑", "attack", "陶军宫川房长来攻")],
      battles=[("折敷畑", "折敷畑之战", "MORI")], links=[],
      people=[("毛利元就", "MORI", "与陶氏决裂"), ("陶晴贤", "OUCHI", "讨伐毛利"), ("尼子晴久", "AMAGO", "肃清新宫党")]),
 dict(arrows=[("OUCHI", "岩国", "严岛", "naval", "陶晴贤渡海登岛"),
              ("MORI", "佐东银山城", "严岛", "naval", "毛利夜渡奇袭"),
              ("MORI", "能岛", "严岛", "naval", "村上水军参战")],
      battles=[("严岛", "严岛之战", "MORI")], links=[],
      people=[("毛利元就", "MORI", "奇袭成功"), ("陶晴贤", "OUCHI", "兵败自尽", "died"), ("村上武吉", "MORI", "水军加盟（参战细节多出军记）", "new")]),
 dict(arrows=[("MORI", "岩国", "山口", "attack", "防长经略"),
              ("MORI", "山口", "且山城", "attack", "围且山城"),
              ("OTOMO", "府内", "立花城", "attack", "大友接收筑前"),
              ("OTOMO", "府内", "门司城", "attack", "大友进入丰前")],
      battles=[("且山城", "大内义长自尽", "MORI")], links=[],
      people=[("毛利元就", "MORI", "写《三子教训状》"), ("大内义长", "OUCHI", "自尽，大内灭亡", "died"), ("大友义镇", "OTOMO", "坐收北九州", "new")]),
 dict(arrows=[("MORI", "吉田郡山城", "石见银山", "attack", "石见银山入手"),
              ("MORI", "石见银山", "白鹿城", "attack", "进攻出云")],
      battles=[("石见银山", "本城常光降伏", "MORI"), ("门司城", "门司城之战（1561）", "MORI")], links=[],
      people=[("毛利元就", "MORI", "转攻尼子"), ("尼子晴久", "AMAGO", "1560年末/1561年初病死", "died"), ("尼子义久", "AMAGO", "继任，力不能支", "new")]),
 dict(arrows=[("MORI", "石见银山", "白鹿城", "attack", "攻陷白鹿城"),
              ("MORI", "白鹿城", "月山富田城", "attack", "合围开始")],
      battles=[("白鹿城", "白鹿城陷落", "MORI")], links=[],
      people=[("毛利元就", "MORI", "重新辅佐辉元"), ("毛利隆元", "MORI", "暴死", "died"), ("毛利辉元", "MORI", "年幼家督", "new")]),
 dict(arrows=[("MORI", "白鹿城", "月山富田城", "siege", "长期兵粮攻")],
      battles=[("月山富田城", "月山富田城开城", "MORI")], links=[],
      people=[("毛利元就", "MORI", "统一中国地方西部"), ("尼子义久", "AMAGO", "降伏，幽禁安艺", "died"), ("吉川元春", "MORI", "主攻山阴")]),
 dict(arrows=[("AMAGO", "隐岐", "白鹿城", "naval", "尼子再兴军登陆出云"),
              ("MORI", "且山城", "立花城", "attack", "攻下立花城"),
              ("OTOMO", "丰后水道", "山口", "naval", "大友支持大内辉弘袭山口"),
              ("MORI", "立花城", "且山城", "retreat", "撤出九州回援")],
      battles=[("立花城", "立花城之战", "MORI"), ("山口", "大内辉弘之乱", "MORI")], links=[],
      people=[("毛利元就", "MORI", "两线告急"), ("山中幸盛", "AMAGO", "奉尼子胜久起兵", "new"), ("大友义镇", "OTOMO", "以攻为守")]),
 dict(arrows=[], battles=[], links=[],
      people=[("毛利元就", "MORI", "六月十四日病逝", "died"), ("毛利辉元", "MORI", "继承中国地方大半版图"), ("吉川元春", "MORI", "山阴"), ("小早川隆景", "MORI", "山阳·水军")]),
]
assert len(EXTRA) == len(S.KEY)

NOTES = {  # region -> [(from_year, text)] ; shown as tooltip "实际情况"
 "安艺:高田": [(1523, "毛利本领（吉田庄）；同郡宍户氏1530年代与毛利联姻结盟"), (1529, "吞并高桥氏后，毛利领地向北延伸到石见邑智郡南部（沙盘未单独画出）")],
 "安艺:高宮": [(1523, "熊谷、宍户周边国人；熊谷原属武田，1530年代末转投毛利"), (1551, "已归毛利一门与从属国人")],
 "安艺:山縣": [(1523, "吉川氏（小仓山城一带）等国人"), (1550, "元春入嗣吉川家，实质并入毛利")],
 "安艺:豊田": [(1523, "沼田小早川氏（高山城）"), (1544, "隆景入嗣同族竹原小早川家"), (1550, "隆景统合沼田·竹原两小早川家，移居新高山城")],
 "安艺:賀茂": [(1523, "西条镜山城：本年被尼子方（元就参战）攻下；平贺氏等国人"), (1525, "毛利转投后回到大内方；平贺氏从属大内"), (1551, "毛利借陶方名义收取")],
 "安艺:安芸": [(1523, "安艺武田氏及其被官、海田白井氏等"), (1541, "武田灭亡后由大内直辖，毛利分得部分"), (1551, "毛利接管")],
 "安艺:沼田": [(1523, "安艺武田氏本据：佐东银山城（古代佐东郡，后并入沼田郡）"), (1541, "银山城陷落，大内直辖"), (1551, "毛利接管")],
 "安艺:佐伯": [(1523, "严岛神主家领与大内方樱尾城"), (1554, "毛利夺取樱尾城与严岛")],
 "備後": [(1523, "山内、宫、三吉、和智、杉原等国人，多倾向尼子"), (1540, "国人在尼子与大内之间摇摆"), (1555, "国人大多归附毛利；山内氏1550年代初降毛利")],
 "備中": [(1523, "守护细川氏权威衰落，庄、三村、上野等国人并立"), (1555, "三村家亲与毛利结盟，与尼子方庄氏相争"), (1562, "庄氏屈服，三村主导备中（毛利盟友，非直辖）"), (1566, "三村家亲遭宇喜多直家派人暗杀，子元亲继任")],
 "備前": [(1523, "浦上村宗（赤松守护代）掌握实权"), (1531, "村宗战死后浦上政宗、宗景兄弟分立"), (1566, "宇喜多直家在浦上宗景麾下崛起")],
 "美作": [(1523, "赤松名义守护，浦上与三浦、后藤等国人割据"), (1540, "1530年代末尼子势力侵入"), (1566, "浦上、三浦、毛利与残存尼子方混战")],
 "播磨": [(1523, "守护赤松氏与守护代浦上氏长期对立"), (1540, "1538年尼子晴久一度兵入播磨"), (1541, "尼子退出；赤松、浦上、别所、小寺等割据")],
 "因幡": [(1523, "因幡山名氏"), (1540, "尼子势力介入"), (1563, "武田高信夺鸟取城，与毛利联手对抗山名（1560年代，具体年份有异说）")],
 "伯耆": [(1523, "伯耆山名氏与南条、行松等国人"), (1525, "尼子侵入；通说的1524年「大永五月崩」出自军记，可疑"), (1540, "尼子支配为主"), (1562, "南条等国人倒向毛利"), (1566, "毛利（吉川元春）支配")],
 "但馬": [(1523, "但马山名氏（山名祐丰）"), (1569, "本年毛利请织田出兵，羽柴秀吉一度攻入但马")],
 "出雲": [(1523, "尼子本据月山富田城"), (1562, "毛利攻入，尼子固守"), (1566, "毛利支配"), (1569, "尼子胜久·山中幸盛再兴军一度攻占多处"), (1571, "再兴军被逐出出云")],
 "石見": [(1523, "益田、吉见、小笠原、福屋、本城等国人，多附大内；银山1526年起开发"), (1540, "尼子南下，银山屡易手"), (1554, "西部吉见氏反陶、与毛利呼应"), (1557, "毛利与吉见夺西部；银山1556年入毛利、1558年忍原之战后复失"), (1562, "本城常光降，银山归毛利；小笠原1559年已降")],
 "隠岐": [(1523, "隐岐氏，从属尼子"), (1563, "毛利水军介入"), (1566, "随尼子降伏归毛利"), (1569, "隐岐为清一度协助尼子再兴军登陆"), (1571, "毛利重新控制")],
 "周防": [(1523, "大内本据山口"), (1551, "陶晴贤拥立大内义长"), (1557, "毛利领有")],
 "長門": [(1523, "大内领国"), (1557, "毛利领有；大内义长自尽于长府")],
 "筑前": [(1523, "大内领国（博多）；少弐、秋月、宗像等国人"), (1557, "大友接收；秋月文种1557年被大友讨灭"), (1569, "毛利攻取立花城后撤回"), (1571, "大友支配，立花道雪后入立花城")],
 "豊前": [(1523, "大内领国"), (1557, "大友进占，毛利据门司城"), (1562, "1561年门司城之战毛利守住门司")],
 "豊後": [(1523, "大友本据府内")],
 "筑後": [(1523, "大友势力圈，筑后十五城国人")],
 "肥前": [(1523, "少弐氏、千叶氏、有马氏等割据"), (1562, "龙造寺隆信1559年灭少弐氏后崛起，与有马等并立")],
 "伊予": [(1523, "守护河野氏（道后），喜多郡宇都宫、宇和郡西园寺并立"), (1555, "河野与村上水军、毛利关系密切；1568年毛利出兵援河野")],
 "讃岐": [(1523, "细川京兆家领国，香西、安富、香川等守护代"), (1554, "三好系十河一存介入，西讃香川氏等仍半独立")],
 "阿波": [(1523, "阿波守护细川氏，三好氏为重臣"), (1554, "1553年三好实休杀细川持隆，三好掌握阿波")],
 "土佐": [(1523, "一条氏与本山、安艺、吉良、长宗我部等「土佐七雄」"), (1569, "长宗我部元亲灭安艺氏，统一大半；幡多郡一条氏仍在")],
}
# reliability grades: region -> [(from_year, grade, basis)]; default 通说
G1, G2, G3 = "确证", "通说", "推测"
DEFAULT_CONF = (G2, "研究通说，按国概括表示")
CONF = {
 "周防": [(1523, G1, "大内本国，多种同时代文书"), (1551, G1, "大宁寺之变有同时代记录"), (1556, G2, "防长经略过程据文书与军记综合"), (1557, G1, "大内义长自尽、毛利领有防长，文书可证")],
 "長門": [(1523, G1, "大内领国"), (1557, G1, "同上")],
 "出雲": [(1523, G1, "尼子本据"), (1542, G1, "大内出云远征有大量文书"), (1543, G1, "同上"), (1562, G2, "毛利进攻出云，前线随时变动"), (1565, G2, "围城态势"), (1566, G1, "月山富田城开城，文书可证"), (1569, G1, "尼子再兴军起兵，文书可证"), (1570, G1, "布部山之战有感状等文书")],
 "隠岐": [(1523, G2, "隐岐氏从属尼子"), (1563, G3, "毛利水军介入的时间与范围不明"), (1566, G2, "随尼子降伏归毛利"), (1569, G2, "隐岐为清协助再兴军，后又反叛")],
 "石見": [(1523, G2, "国人多附大内，诸家向背不一"), (1537, G3, "银山易手年份诸说不一"), (1541, G2, "国人随大内胜利回归"), (1543, G2, "远征失败后国人转向尼子"), (1556, G2, "银山得失年份据通说"), (1558, G2, "忍原崩主要见于军记"), (1562, G1, "本城常光降毛利，文书可证")],
 "伯耆": [(1523, G2, "山名与国人并立"), (1525, G3, "「大永五月崩」出自军记，可疑"), (1540, G2, "尼子支配为主"), (1562, G2, "南条等国人倒向毛利"), (1566, G1, "随尼子降伏归毛利")],
 "因幡": [(1523, G2, "因幡山名氏"), (1540, G3, "尼子影响程度不明"), (1563, G3, "武田高信崛起年份有异说")],
 "美作": [(1523, G3, "赤松、浦上与国人割据，格局模糊"), (1538, G2, "尼子侵入美作有记录"), (1566, G3, "多方混战，主导方难以界定")],
 "播磨": [(1523, G2, "赤松与浦上对立"), (1538, G2, "尼子兵入播磨有记录，持续时间不明"), (1541, G2, "尼子退出")],
 "備後": [(1523, G2, "国人林立，倾向尼子"), (1540, G2, "国人摇摆"), (1553, G2, "毛利击退尼子、讨灭江田氏"), (1555, G2, "国人多数归附毛利")],
 "備中": [(1523, G2, "国人并立"), (1540, G3, "尼子影响程度不明"), (1555, G2, "三村与毛利结盟时间约在1550年代"), (1562, G2, "三村主导（盟友，非直辖）")],
 "備前": [(1523, G2, "浦上实权")],
 "筑前": [(1523, G1, "大内领国（博多）"), (1557, G2, "大友接收，1559年获守护职"), (1568, G1, "立花鉴载叛大友，文书可证"), (1570, G2, "毛利撤出后归大友")],
 "豊前": [(1523, G1, "大内领国"), (1557, G2, "大友进占、毛利据门司"), (1561, G1, "门司城之战有感状等文书")],
 "豊後": [(1523, G1, "大友本国")],
 "讃岐": [(1523, G2, "细川系守护代割据"), (1554, G2, "三好系势力介入时间据通说")],
 "阿波": [(1523, G2, "细川守护、三好重臣"), (1554, G1, "1553年三好实休杀细川持隆")],
 "土佐": [(1523, G2, "诸豪族割据"), (1569, G2, "长宗我部灭安艺氏")],
 "肥前": [(1523, G2, "诸氏割据"), (1562, G2, "龙造寺1559年灭少弐")],
 "伊予": [(1523, G2, "河野与诸氏并立")],
 "安艺:高田": [(1523, G1, "毛利本领")],
 "安艺:賀茂": [(1523, G2, "镜山城之战据军记与文书综合"), (1525, G2, "平贺氏等从属大内"), (1551, G2, "毛利收取，郡级范围为推定")],
 "安艺:安芸": [(1523, G2, "武田势力范围为推定"), (1541, G1, "武田灭亡，文书可证"), (1551, G2, "毛利接管，郡级范围为推定")],
 "安艺:沼田": [(1523, G1, "武田本据银山城"), (1541, G1, "银山城陷落"), (1551, G2, "毛利接管")],
 "安艺:佐伯": [(1523, G2, "大内方据点"), (1554, G1, "毛利夺樱尾城，文书可证")],
 "安艺:山縣": [(1523, G2, "吉川等国人"), (1550, G1, "元春入主吉川家")],
 "安艺:豊田": [(1523, G2, "小早川氏"), (1550, G1, "隆景统合两小早川家")],
 "安艺:高宮": [(1523, G2, "国人并立"), (1551, G3, "归属毛利的时间为推定")],
}
def conf_for(region, year):
    c = DEFAULT_CONF
    for y, g, b in CONF.get(region, []):
        if y <= year: c = (g, b)
    return {"grade": c[0], "basis": c[1]}
EVENT_CONF = {
 1523: (G1, "毛利家文书存宿老连署推戴状"), 1525: (G2, "转投大内的时间可证；相合元纲事件细节多出军记"),
 1529: (G2, "高桥氏灭亡年份据通说"),
 1530: (G2, "小笠原夺银山据通说"), 1533: (G2, "灰吹法引入据《石见银山旧记》；熊谷与武田决裂有文书"), 1534: (G2, "宍户联姻据通说"),
 1539: (G2, "银山大内夺回年份据通说"), 1549: (G1, "神边合战有感状等文书"), 1559: (G2, "小笠原降伏 8 月据通说；降露坂之战年份有异说"), 1532: (G1, "毛利家文书存家臣连署起请文"),
 1537: (G2, "隆元赴山口可证；银山易手年份有异说"), 1538: (G2, "尼子入播磨可证，范围不明"),
 1540: (G1, "元就《郡山笼城日记》等；「三万」兵力出自军记"), 1541: (G1, "多种文书可证"),
 1542: (G1, "多种文书可证"), 1543: (G1, "多种文书可证；元就险死的细节多出军记"),
 1544: (G1, "入嗣可证"), 1547: (G2, "隆元继任年份有1546、1547等说"),
 1550: (G1, "毛利家文书存家臣连署起请文"), 1551: (G1, "同时代记录"),
 1552: (G1, "幕府任命可证；属名义头衔"), 1553: (G2, "据通说"),
 1554: (G1, "文书可证"), 1555: (G1, "战役可证；风雨夜渡、兵力对比等多出军记"),
 1556: (G2, "据通说"), 1557: (G1, "《三子教训状》原件存于毛利家文书"),
 1558: (G2, "忍原崩主要见于军记；年份有1556/1558两说"), 1561: (G1, "感状等文书可证"), 1562: (G1, "文书可证"),
 1563: (G1, "隆元死于1563年可证；死因（毒杀说）不明"), 1564: (G1, "将军调停可证"),
 1565: (G2, "据通说"), 1566: (G1, "文书可证"), 1568: (G2, "据通说"), 1569: (G1, "文书可证"),
 1570: (G1, "文书可证"), 1571: (G1, "可证"),
 1575: (G1, "备中兵乱有感状等文书"), 1576: (G1, "义昭御内书、木津川口之战有文书"), 1577: (G1, "信长朱印状等可证"),
 1578: (G1, "上月城开城有文书"), 1579: (G2, "宇喜多倒戈时间据研究推定"), 1580: (G1, "三木城开城可证"),
 1581: (G1, "吉川经家遗书等可证"), 1582: (G1, "高松城和睦、宗治切腹有文书"), 1585: (G1, "中国国分与四国征伐有朱印状"),
 1587: (G1, "九州国分有朱印状"), 1591: (G1, "1591年领知朱印状：112万石"), 1592: (G1, "可证"), 1597: (G1, "可证"),
 1598: (G1, "可证"), 1600: (G1, "关原之战与防长减封有大量文书；转封过程跨至1601年"),
}

def note_for(region, year):
    t = None
    for y, txt in NOTES.get(region, []):
        if y <= year: t = txt
    return t

CORRECTIONS = [
 "1523：安艺贺茂郡（镜山城）本年被尼子方攻下，改为尼子；1525年元就转投后改回大内",
 "1523：美作改为浦上与国人割据（原仅浦上）；伊予改为河野与宇都宫·西园寺并立",
 "1523：阿波、讃岐由「其他」改为细川氏；1554起阿波归三好、讃岐三好与本地国人分立",
 "1525：伯耆由尼子独占改为尼子/山名争夺（「大永五月崩」出自军记，可疑）；1540起尼子为主",
 "1555：备中由三村独占改为三村/尼子方庄氏争夺；1562起三村主导",
 "1557：石见改为毛利/尼子争夺（吉见氏反陶、银山得而复失）；1562起毛利",
 "1562：肥前改为龙造寺崛起（1559年灭少弐）；1563：因幡加入亲毛利的武田高信",
 "1569：隐岐改为毛利/尼子争夺（再兴军经隐岐登陆）；土佐长宗我部灭安艺氏",
 "时间轴：新增16个年份（1529、1532、1537、1538、1542、1544、1547、1552、1553、1556、1558、1561、1564、1565、1568、1570），填补1525—1540与1543—1550空白",
 "随之调整：石见银山1537年归尼子、尼子1538年东进美作播磨、备后1553年起转向毛利、周防1556年起争夺、石见1558年忍原崩后复归尼子、筑前1568年起争夺1570年归大友、出云1570年布部山之战后收复",
 "1552年新增「名义领国」虚线：尼子晴久的八国守护头衔与实际控制并不一致",
]

# ---------- timeline v2: merge original 15 keyframes with yearly gap-filling frames ----------
import copy as _copy
FR = [dict(year=k[0], title=k[1], desc=k[2], focus=k[3], changes=dict(k[4]), **_copy.deepcopy(e)) for k, e in zip(S.KEY, EXTRA)]
def F(y): return next(f for f in FR if f["year"] == y)
# move changes to the frames where they actually happened
for r in ["石見", "美作", "播磨"]: F(1540)["changes"].pop(r)
F(1540)["arrows"] = [a for a in F(1540)["arrows"] if a[2] != "播磨"]
F(1540)["desc"] = "尼子晴久亲率大军越过备后，围攻吉田郡山城；尼子势力同时压向备后、备中、因幡。安艺国人大多观望。"
F(1550)["arrows"] = []
F(1550)["desc"] = "元春正式入主吉川家，隆景统合两小早川家；元就诛井上一族，家臣二百余人联署起请文服从。毛利实际吞并安艺北部与沿海。"
F(1554)["changes"].pop("備後")
F(1543)["changes"]["出雲"] = "AMAGO"
F(1557)["changes"].pop("石見")
F(1569)["changes"].pop("筑前")
F(1571)["changes"].pop("出雲"); F(1571)["changes"].pop("筑前")
F(1571)["desc"] = "六月十四日，元就病逝于吉田郡山城，享年75岁（虚岁）。毛利直辖约八国，另有备中三村等盟友。"
F(1562)["battles"] = [b for b in F(1562)["battles"] if b[0] != "门司城"]
F(1562)["people"] = [("毛利元就", "MORI", "转攻尼子"), ("尼子义久", "AMAGO", "力不能支"), ("本城常光", "AMAGO", "降毛利，旋被诛", "new")]
F(1562)["desc"] = "石见国人本城常光降毛利，石见银山落入毛利手中，财源大增。随即挥师进攻出云。"
NEW = [
 dict(year=1529, title="吞并高桥氏", desc="元就讨灭安艺北部至石见邑智郡的大国人高桥氏，夺其领地，毛利的地盘第一次明显越出吉田一带。",
      focus="松尾城", changes={}, arrows=[("MORI", "吉田郡山城", "松尾城", "attack", "讨灭高桥兴光")],
      battles=[("松尾城", "高桥氏灭亡", "MORI")], links=[("MORI", "OUCHI", "从属")],
      people=[("毛利元就", "MORI", "吞并高桥领"), ("大内义兴", "OUCHI", "1528年末病逝", "died"), ("大内义隆", "OUCHI", "继任家督", "new")]),
 dict(year=1532, title="家臣三十二人起请文", desc="毛利家臣三十二人联署起请文，约定遵守家中法度。元就借此把原本平起平坐的家臣纳入统一秩序。",
      focus="吉田郡山城", changes={}, arrows=[], battles=[("吉田郡山城", "三十二人连署起请文", None)], links=[("MORI", "OUCHI", "从属")],
      people=[("毛利元就", "MORI", "整顿家中"), ("大内义隆", "OUCHI", "与大友、少弐在北九州相争")]),
 dict(year=1537, title="晴久继任 · 银山易手", desc="尼子经久让位于孙晴久，尼子夺取石见银山。同年元就把长子隆元送往山口作人质，以示对大内的忠诚。",
      focus="石见银山", changes={"石見": "AMAGO/OUCHI"},
      arrows=[("AMAGO", "月山富田城", "石见银山", "attack", "尼子夺石见银山"), ("MORI", "吉田郡山城", "山口", "inherit", "隆元赴山口为质")],
      battles=[("石见银山", "银山争夺", "AMAGO")], links=[("MORI", "OUCHI", "从属")],
      people=[("尼子晴久", "AMAGO", "继任家督", "new"), ("尼子经久", "AMAGO", "退居幕后"), ("毛利隆元", "MORI", "赴山口为质", "new")]),
 dict(year=1538, title="尼子东进", desc="尼子晴久兵锋东指，经美作攻入播磨，赤松氏一度败走。尼子此时达到最大扩张。",
      focus="月山富田城", changes={"美作": "AMAGO", "播磨": "AKAMATSU/AMAGO"},
      arrows=[("AMAGO", "月山富田城", "美作", "attack", "压服美作"), ("AMAGO", "美作", "播磨", "attack", "攻入播磨")],
      battles=[], links=[("MORI", "OUCHI", "从属")],
      people=[("尼子晴久", "AMAGO", "东进播磨"), ("毛利元就", "MORI", "预感尼子来攻")]),
 dict(year=1542, title="大内出兵出云", desc="大内义隆以郡山城之胜为契机，率大军经石见进攻出云，元就随军。安艺、石见国人大批加入。",
      focus="月山富田城", changes={"出雲": "AMAGO/OUCHI"},
      arrows=[("OUCHI", "山口", "石见银山", "attack", "经石见北上"), ("OUCHI", "石见银山", "月山富田城", "attack", "进逼月山富田城")],
      battles=[], links=[("MORI", "OUCHI", "从属")],
      people=[("大内义隆", "OUCHI", "亲征"), ("毛利元就", "MORI", "随军"), ("尼子晴久", "AMAGO", "笼城")]),
 dict(year=1544, title="隆景入嗣竹原小早川", desc="三子德寿丸（隆景）过继竹原小早川家，毛利开始以养子入嗣的方式吞并有力国人，不战而取。",
      focus="竹原", changes={}, arrows=[("MORI", "吉田郡山城", "竹原", "inherit", "隆景入竹原小早川家")],
      battles=[], links=[("MORI", "OUCHI", "从属")],
      people=[("小早川隆景", "MORI", "入嗣竹原小早川", "new"), ("毛利元就", "MORI", "以联姻、入嗣代替征伐")]),
 dict(year=1547, title="隆元家督 · 元春入嗣吉川", desc="约1546年元就将家督让给隆元，但仍掌实权。1547年议定次子元春入嗣母家吉川氏。",
      focus="小仓山城", changes={}, arrows=[("MORI", "吉田郡山城", "小仓山城", "inherit", "元春入嗣吉川家")],
      battles=[], links=[("MORI", "OUCHI", "从属")],
      people=[("毛利隆元", "MORI", "继任家督（约1546）"), ("吉川元春", "MORI", "入嗣吉川", "new"), ("毛利元就", "MORI", "隐居而不放权")]),
 dict(year=1552, title="尼子晴久八国守护", desc="将军足利义辉任命尼子晴久为出云、隐岐、伯耆、因幡、美作、备前、备中、备后八国守护。这是名义上的头衔，实际控制远小于此。",
      focus="月山富田城", changes={}, arrows=[], battles=[], links=[("MORI", "OUCHI", "依附陶氏")],
      claims=dict(faction="AMAGO", regions=["出雲", "隠岐", "伯耆", "因幡", "美作", "備前", "備中", "備後"], label="尼子晴久名义上的八国守护"),
      people=[("尼子晴久", "AMAGO", "受封八国守护"), ("陶晴贤", "OUCHI", "拥立大内义长", "new"), ("大内义长", "OUCHI", "自大友家入继", "new")]),
 dict(year=1553, title="备后争夺", desc="尼子晴久南下备后，毛利击退之，并攻灭倒向尼子的江田氏，备后国人多数转向毛利。",
      focus="备后北部", changes={"備後": "MORI/AMAGO"},
      arrows=[("AMAGO", "月山富田城", "备后北部", "attack", "尼子南下备后"), ("MORI", "吉田郡山城", "备后北部", "attack", "毛利迎击")],
      battles=[("备后北部", "备后国人归附", "MORI")], links=[("MORI", "OUCHI", "依附陶氏")],
      people=[("毛利元就", "MORI", "取备后"), ("尼子晴久", "AMAGO", "受挫")]),
 dict(year=1556, title="防长经略", desc="严岛战后，毛利攻入周防，在须须万沼城等地遭到顽强抵抗；同年夺取石见银山。",
      focus="须须万沼城", changes={"周防": "OUCHI/MORI", "石見": "MORI/AMAGO"},
      arrows=[("MORI", "岩国", "须须万沼城", "attack", "攻周防"), ("MORI", "吉田郡山城", "石见银山", "attack", "夺银山")],
      battles=[("须须万沼城", "须须万沼城之战", "MORI")], links=[],
      people=[("毛利隆元", "MORI", "主攻周防"), ("大内义长", "OUCHI", "困守")]),
 dict(year=1558, title="忍原崩", desc="尼子晴久在忍原击败救援银山的毛利军，攻陷山吹城，守将刺贺长信自尽，石见银山归尼子。此战年份有弘治2年与永禄元年两说。",
      focus="忍原", changes={"石見": "AMAGO/MORI"},
      arrows=[("AMAGO", "月山富田城", "忍原", "attack", "尼子南下"), ("MORI", "忍原", "吉田郡山城", "retreat", "毛利败退")],
      battles=[("忍原", "忍原崩", "AMAGO")], links=[],
      people=[("尼子晴久", "AMAGO", "最后的胜利"), ("毛利元就", "MORI", "转而招降石见国人")]),
 dict(year=1561, title="门司城之战 · 晴久之死", desc="毛利在门司城击退大友军，守住关门海峡。此前尼子晴久急死，尼子由义久继承，元就开始筹划石见、出云攻略。",
      focus="门司城", changes={},
      arrows=[("OTOMO", "府内", "门司城", "attack", "大友攻门司"), ("MORI", "且山城", "门司城", "naval", "毛利渡海救援")],
      battles=[("门司城", "门司城之战", "MORI")], links=[],
      people=[("尼子晴久", "AMAGO", "1560年末/1561年初急死", "died"), ("尼子义久", "AMAGO", "继任", "new"), ("大友义镇", "OTOMO", "门司受挫"), ("小早川隆景", "MORI", "主持门司防卫")]),
 dict(year=1564, title="毛利大友和睦", desc="将军足利义辉调停，毛利与大友议和，毛利得以集中力量于出云战线。",
      focus="月山富田城", changes={}, arrows=[("MORI", "白鹿城", "月山富田城", "siege", "继续围困")],
      battles=[], links=[],
      people=[("毛利元就", "MORI", "专攻尼子"), ("大友义镇", "OTOMO", "和睦")]),
 dict(year=1565, title="月山富田城总攻", desc="毛利军总攻月山富田城失利，转为断绝粮道的长期围困。",
      focus="月山富田城", changes={"出雲": "MORI/AMAGO"},
      arrows=[("MORI", "白鹿城", "月山富田城", "attack", "总攻失败"), ("MORI", "白鹿城", "月山富田城", "siege", "转为兵粮攻")],
      battles=[("月山富田城", "第二次月山富田城之战", "AMAGO")], links=[],
      people=[("毛利辉元", "MORI", "初阵"), ("尼子义久", "AMAGO", "困守孤城"), ("吉川元春", "MORI", "围城")]),
 dict(year=1568, title="伊予出兵 · 立花反叛", desc="小早川隆景渡海援助河野氏，击败宇都宫势力；同年大友家臣立花鉴载在筑前倒向毛利。",
      focus="鸟坂", changes={"筑前": "OTOMO/MORI"},
      arrows=[("MORI", "新高山城", "鸟坂", "naval", "隆景渡海援河野"), ("MORI", "且山城", "立花城", "attack", "支援立花鉴载")],
      battles=[("鸟坂", "鸟坂之战", "MORI")], links=[],
      people=[("小早川隆景", "MORI", "伊予出兵"), ("大友义镇", "OTOMO", "讨伐立花")]),
 dict(year=1570, title="布部山之战", desc="吉川元春、毛利辉元在布部山大败尼子再兴军，出云大部收复；毛利撤出筑前后，北九州归大友。",
      focus="布部山", changes={"出雲": "MORI", "筑前": "OTOMO"},
      arrows=[("MORI", "吉田郡山城", "布部山", "attack", "辉元、元春出征"), ("AMAGO", "布部山", "白鹿城", "retreat", "再兴军败退")],
      battles=[("布部山", "布部山之战", "MORI")], links=[],
      people=[("毛利辉元", "MORI", "亲征"), ("山中幸盛", "AMAGO", "败退"), ("毛利元就", "MORI", "在吉田病重")]),

 # ---- 第三轮：补上城池易主落在两帧之间、时间轴上看不到的年份 ----
 dict(year=1530, title="小笠原夺银山", desc="石见国人小笠原长隆趁大内义隆忙于北九州，夺取石见银山。银山的价值已经让地方国人也敢出手。",
      focus="石见银山", changes={}, arrows=[("KOKUJIN", "温汤城", "石见银山", "attack", "小笠原长隆夺银山")],
      battles=[("石见银山", "银山易手", "KOKUJIN")], links=[("MORI", "OUCHI", "从属")],
      people=[("大内义隆", "OUCHI", "与大友、少弐在北九州相争")]),
 dict(year=1533, title="灰吹法 · 熊谷倒戈", desc="大内夺回银山，同年博多的宗丹、桂寿以灰吹法精炼，银产量大增。安艺的熊谷信直与安艺武田决裂，倒向大内·毛利一方。",
      focus="石见银山", changes={}, arrows=[("OUCHI", "山口", "石见银山", "attack", "大内夺回银山"), ("MORI", "高松城（可部）", "吉田郡山城", "inherit", "熊谷信直归附")],
      battles=[("石见银山", "银山回归大内", "OUCHI")], links=[("MORI", "OUCHI", "从属")],
      people=[("熊谷信直", "MORI", "与安艺武田决裂", "new")]),
 dict(year=1534, title="五龙局嫁宍户", desc="元就把长女嫁给宍户元源之孙隆家，化解与近邻宍户氏的宿怨。同年元就奉大内义隆之命出兵备后。",
      focus="五龙城", changes={}, arrows=[("MORI", "吉田郡山城", "五龙城", "inherit", "长女嫁宍户隆家")],
      battles=[], links=[("MORI", "OUCHI", "从属")],
      people=[("宍户隆家", "MORI", "娶元就长女", "new")]),
 dict(year=1539, title="大内夺回银山", desc="大内夺回石见银山。两年后尼子联合小笠原氏再次占领，银山在大内、尼子之间反复易手。",
      focus="石见银山", changes={}, arrows=[("OUCHI", "山口", "石见银山", "attack", "大内夺回银山")],
      battles=[("石见银山", "银山争夺", "OUCHI")], links=[("MORI", "OUCHI", "从属")],
      people=[("大内义隆", "OUCHI", "夺回银山")]),
 dict(year=1549, title="神边城陷落", desc="历时一年多的神边城攻防结束，山名理兴出奔，备后东部归大内。毛利、小早川等安艺国人是大内军的主力。",
      focus="神边城", changes={}, arrows=[("OUCHI", "吉田郡山城", "神边城", "siege", "大内军围神边城")],
      battles=[("神边城", "神边城开城", "OUCHI")], links=[("MORI", "OUCHI", "从属")],
      people=[("山名理兴", "AMAGO", "出奔")]),
 dict(year=1559, title="小笠原降毛利", desc="毛利围攻温汤城，小笠原长雄经小早川隆景斡旋，于8月投降。但同年降露坂之战毛利败于本城常光，银山仍在尼子手中。",
      focus="温汤城", changes={}, arrows=[("MORI", "吉田郡山城", "温汤城", "siege", "围攻温汤城"), ("AMAGO", "石见银山", "温汤城", "attack", "尼子援军")],
      battles=[("温汤城", "小笠原长雄投降", "MORI"), ("石见银山", "降露坂之战", "AMAGO")], links=[],
      people=[("小笠原长雄", "MORI", "降毛利", "new")]),

 # ---- 1572–1600：辉元时代（元就死后） ----
 dict(year=1575, title="备中兵乱", desc="三村元亲倒向织田，毛利与宇喜多直家联手，五月攻陷备中松山城，三村氏灭亡。同年宇喜多逐浦上宗景，长宗我部元亲统一土佐。",
      focus="备中松山城", changes={"備中": "MORI", "備前": "UKITA", "美作": "UKITA", "土佐": "CHOSOKABE"},
      arrows=[("MORI", "神边城", "备中松山城", "attack", "小早川隆景讨三村")],
      battles=[("备中松山城", "松山城陷落", "MORI")], links=[],
      people=[("毛利辉元", "MORI", "亲政"), ("小早川隆景", "MORI", "主持山阳方面"), ("宇喜多直家", "UKITA", "与毛利结盟", "new")]),
 dict(year=1576, title="义昭入鞆 · 毛织断交", desc="被信长逐出京都的将军足利义昭移居备后鞆，毛利接纳他并与织田断交。七月毛利水军在木津川口击破织田水军，向石山本愿寺运粮。",
      focus="鞆", changes={},
      arrows=[("MORI", "能岛城", "畿内方向", "naval", "木津川口：运粮石山本愿寺")],
      battles=[("畿内方向", "第一次木津川口之战", "MORI")], links=[],
      people=[("足利义昭", "OTHER", "移居鞆", "new"), ("织田信长", "ODA", "与毛利断交", "new")]),
 dict(year=1577, title="秀吉入播磨", desc="信长命羽柴秀吉攻略中国。黑田孝高献出姬路城，秀吉攻陷上月城，交给尼子胜久、山中幸盛驻守。",
      focus="上月城", changes={"播磨": "ODA/MORI"},
      arrows=[("ODA", "畿内方向", "姬路城", "attack", "秀吉西进"), ("ODA", "姬路城", "上月城", "attack", "攻陷上月城")],
      battles=[("上月城", "上月城陷落", "ODA")], links=[],
      people=[("羽柴秀吉", "ODA", "中国攻略总大将", "new"), ("山中幸盛", "AMAGO", "入上月城")]),
 dict(year=1578, title="上月城之战", desc="毛利大军围攻上月城，秀吉被迫放弃救援，七月开城，尼子胜久自尽，山中幸盛押送途中被杀，尼子再兴运动终结。同年别所长治在三木城反叛织田。",
      focus="上月城", changes={"播磨": "ODA/MORI"},
      arrows=[("MORI", "备中松山城", "上月城", "siege", "吉川元春、小早川隆景围城")],
      battles=[("上月城", "上月城开城", "MORI")], links=[],
      people=[("尼子胜久", "AMAGO", "自尽", "died"), ("山中幸盛", "AMAGO", "被杀", "died"), ("吉川元春", "MORI", "围上月城")]),
 dict(year=1579, title="宇喜多倒戈", desc="宇喜多直家背弃毛利，归附织田，备前、美作成为织田一方的前线。伯耆的南条元续也与毛利决裂，毛利东线全面受压。",
      focus="冈山城", changes={"美作": "UKITA/MORI", "伯耆": "MORI/ODA"},
      arrows=[("UKITA", "冈山城", "备中高松城", "attack", "宇喜多压迫备中"), ("ODA", "羽衣石城", "尾高城", "attack", "南条倒向织田")],
      battles=[], links=[],
      people=[("宇喜多直家", "UKITA", "倒向织田"), ("南条元续", "ODA", "与毛利决裂", "new")]),
 dict(year=1580, title="三木城陷落 · 但马平定", desc="秀吉以断粮战攻下三木城，别所长治自尽，播磨归织田；羽柴秀长平定但马。因幡山名丰国降织田出奔，家臣转迎毛利。九州方面，龙造寺趁大友耳川大败迅速扩张。",
      focus="姬路城", changes={"播磨": "ODA", "但馬": "ODA", "因幡": "ODA/MORI", "肥前": "RYUZOJI", "筑後": "RYUZOJI/OTOMO"},
      arrows=[("ODA", "姬路城", "鸟取城", "attack", "秀吉入因幡")],
      battles=[("姬路城", "三木城开城（城在图外东侧）", "ODA")], links=[],
      people=[("羽柴秀吉", "ODA", "平定播磨"), ("山名丰国", "YAMANA", "降织田出奔")]),
 dict(year=1581, title="鸟取城饿杀", desc="吉川经家入鸟取城固守。秀吉事先高价收购因幡粮食后断粮围城，十月城中饥馑，经家以自尽换取城兵性命，因幡归织田。",
      focus="鸟取城", changes={"因幡": "ODA"},
      arrows=[("ODA", "姬路城", "鸟取城", "siege", "断粮围城"), ("MORI", "月山富田城", "尾高城", "attack", "元春救援不及")],
      battles=[("鸟取城", "鸟取城开城", "ODA")], links=[],
      people=[("吉川经家", "MORI", "自尽开城", "died"), ("宇喜多直家", "UKITA", "病逝", "died")]),
 dict(year=1582, title="高松城水攻 · 本能寺", desc="秀吉筑堤引水围困备中高松城。六月二日信长死于本能寺，秀吉秘不发丧与毛利和睦，清水宗治切腹，秀吉回师畿内。同年毛利夺回羽衣石城；四国的长宗我部攻入阿波、讃岐。",
      focus="备中高松城", changes={"備中": "MORI/ODA", "伯耆": "MORI", "阿波": "CHOSOKABE/MIYOSHI", "讃岐": "CHOSOKABE/MIYOSHI"},
      arrows=[("ODA", "冈山城", "备中高松城", "siege", "水攻"), ("ODA", "备中高松城", "畿内方向", "retreat", "中国大返还")],
      battles=[("备中高松城", "高松城和睦", None)], links=[],
      people=[("清水宗治", "MORI", "切腹", "died"), ("织田信长", "ODA", "本能寺之变", "died"), ("安国寺惠琼", "MORI", "主持和谈", "new")]),
 dict(year=1585, title="中国国分 · 四国征伐", desc="毛利与秀吉划定边界：备中东部、美作归宇喜多，伯耆东三郡归南条，毛利保有其余八国。毛利正式臣从秀吉，小早川隆景率军攻伊予，受封伊予；长宗我部只保土佐。",
      focus="汤筑城", changes={"播磨": "TOYOTOMI", "但馬": "TOYOTOMI", "因幡": "TOYOTOMI", "備中": "MORI", "美作": "UKITA",
                              "伊予": "MORI", "阿波": "TOYOTOMI", "讃岐": "TOYOTOMI", "土佐": "CHOSOKABE"},
      arrows=[("MORI", "高山城·新高山城", "汤筑城", "naval", "隆景渡海攻伊予")],
      battles=[("汤筑城", "河野氏开城", "MORI")], links=[("MORI", "TOYOTOMI", "从属")],
      people=[("小早川隆景", "MORI", "受封伊予"), ("羽柴秀吉", "TOYOTOMI", "任关白")]),
 dict(year=1587, title="九州国分", desc="毛利作为先锋参加九州征伐，吉川元春在丰前阵中病逝。战后隆景转封筑前，伊予交给丰臣大名；丰前归黑田孝高等，大友保丰后。",
      focus="名岛城", changes={"筑前": "MORI", "筑後": "TOYOTOMI", "豊前": "TOYOTOMI", "豊後": "OTOMO", "肥前": "RYUZOJI", "伊予": "TOYOTOMI"},
      arrows=[("MORI", "门司城", "名岛城", "attack", "毛利先锋渡海"), ("TOYOTOMI", "畿内方向", "门司城", "attack", "秀吉亲征")],
      battles=[], links=[("MORI", "TOYOTOMI", "从属")],
      people=[("吉川元春", "MORI", "阵中病逝", "died"), ("小早川隆景", "MORI", "转封筑前")]),
 dict(year=1591, title="迁居广岛 · 112万石", desc="辉元离开山间的吉田郡山城，迁入太田川三角洲新筑的广岛城。秀吉发给毛利的领知朱印状确认安艺、周防、长门、石见、出云、备后、隐岐、伯耆三郡和备中一部，共112万石。",
      focus="广岛城", changes={},
      arrows=[("MORI", "吉田郡山城", "广岛城", "inherit", "迁居广岛")],
      battles=[], links=[("MORI", "TOYOTOMI", "从属")],
      people=[("毛利辉元", "MORI", "入广岛城")]),
 dict(year=1592, title="文禄之役", desc="秀吉出兵朝鲜，在肥前名护屋筑城为大本营。毛利动员三万人，是最大的军役之一，辉元、隆景都渡海作战。",
      focus="名护屋", changes={},
      arrows=[("TOYOTOMI", "名护屋", "朝鲜方向", "naval", "渡海出兵"), ("MORI", "广岛城", "名护屋", "attack", "毛利三万人")],
      battles=[], links=[("MORI", "TOYOTOMI", "从属")],
      people=[("毛利辉元", "MORI", "渡海"), ("小早川隆景", "MORI", "碧蹄馆之战")]),
 dict(year=1597, title="隆景之死", desc="小早川隆景病逝。他的养子小早川秀秋是秀吉正室的侄子，与毛利本家并无血缘，筑前从此脱离毛利一门。同年再度出兵朝鲜（庆长之役）。",
      focus="名岛城", changes={"筑前": "TOYOTOMI"},
      arrows=[("TOYOTOMI", "名护屋", "朝鲜方向", "naval", "庆长之役")],
      battles=[], links=[("MORI", "TOYOTOMI", "从属")],
      people=[("小早川隆景", "MORI", "病逝", "died"), ("小早川秀秋", "TOYOTOMI", "继承筑前", "new")]),
 dict(year=1598, title="秀吉之死 · 五大老", desc="秀吉死去，遗命德川家康、前田利家、毛利辉元、宇喜多秀家、上杉景胜五大老辅佐年幼的秀赖，朝鲜之兵撤回。",
      focus="广岛城", changes={},
      arrows=[], battles=[], links=[("MORI", "TOYOTOMI", "从属")],
      people=[("毛利辉元", "MORI", "列五大老"), ("德川家康", "TOKUGAWA", "五大老之首", "new")]),
 dict(year=1600, title="关原 · 防长减封", desc="辉元被推为西军总大将，坐镇大坂城。九月十五日关原决战，吉川广家暗通东军，毛利主力在南宫山按兵不动，小早川秀秋阵前倒戈，西军一日溃败。战后毛利由112万石削为周防、长门两国约30万石。",
      focus="广岛城", changes={**{r: "TOKUGAWA" for r in S.PROV if r not in ("周防", "長門")}, **{"安艺:" + n: "TOKUGAWA" for n in S.AKI}},
      arrows=[("MORI", "广岛城", "畿内方向", "attack", "辉元入大坂城"), ("MORI", "广岛城", "山口·大内馆", "retreat", "减封防长（1604年筑萩城）")],
      battles=[("畿内方向", "关原之战（在图外东方）", "TOKUGAWA")], links=[("MORI", "TOKUGAWA", "战败减封")],
      people=[("毛利辉元", "MORI", "西军总大将，战后减封"), ("吉川广家", "MORI", "暗通东军", "new"), ("小早川秀秋", "TOKUGAWA", "阵前倒戈"), ("德川家康", "TOKUGAWA", "东军总帅")]),
]
FR = sorted(FR + NEW, key=lambda f: f["year"])
STATES2 = []; _s = dict(S.S0)
for f in FR:
    _s = {**_s, **f["changes"]}; STATES2.append(_s)

# ---- province colour derived from castles (Aki districts, Bingo, Iwami, Izumo) ----
from castles import CASTLES as _CA
CASTLE_REGION = {"koriyama": "安艺:高田", "ogurayama": "安艺:山縣", "kimura": "安艺:賀茂", "takayama": "安艺:豊田", "goryu": "安艺:高田", "takamatsu": "安艺:高宮", "ikiyama": "安艺:賀茂", "kashirazaki": "安艺:賀茂", "kagamiyama": "安艺:賀茂", "kanayama": "安艺:沼田", "sakurao": "安艺:佐伯", "miyao": "安艺:佐伯", "kannabe": "備後", "hieoyama": "備後", "kouyama": "備後", "yamabuki": "石見", "nanao": "石見", "yunoyu": "石見", "honmyo": "石見", "toda": "出雲", "shiraga": "出雲", "mitoya": "出雲", "yamaguchi": "周防", "wakayama": "周防", "suzuma": "周防", "katsuyama": "長門", "moji": "豊前", "tachibana": "筑前", "funai": "豊後", "matsuyama": "備中", "noshima": "伊予", "kurushima": "伊予", "yuzuki": "伊予", "takasugi": "備後", "sanbonmatsu": "石見", "ueshi": "伯耆", "odaka": "伯耆", "ebi": "伯耆", "utsubuki": "伯耆"}
CASTLE_REGION = {**{k: v for k, v in CASTLE_GEO.items()}, **CASTLE_REGION}
_mis = {k: (CASTLE_REGION[k], CASTLE_GEO[k]) for k in CASTLE_REGION if CASTLE_GEO.get(k) and CASTLE_REGION[k] != CASTLE_GEO[k]}
if _mis: print("WARN 城池所属国与坐标不符:", _mis)
CASTLE_DRIVEN = {r for r in CASTLE_REGION.values() if r and (r.startswith("安艺:") or r == "石見")}
# weights: 大名本城 3 / 国人本城 2 / 支城 1; strategic exceptions below (avoid one small castle swinging a whole province)
CASTLE_W = {"yamabuki": 3}
# 同盟期（含首尾年）：毛利 1523–24 从属尼子，1525–1553 从属大内（1554 防芸引分）
ALLIED = [("MORI", "AMAGO", 1523, 1524), ("MORI", "OUCHI", 1525, 1553), ("MORI", "UKITA", 1575, 1578),
          ("ODA", "UKITA", 1579, 1582), ("MORI", "TOYOTOMI", 1585, 1599), ("UKITA", "TOYOTOMI", 1583, 1599)]
def _allied(a, b, yr):
    return any({a, b} == {x, y} and y0 <= yr <= y1 for x, y, y0, y1 in ALLIED)
def _cfac(c, yr):
    v = [h for h in c["hist"] if h[0] <= yr]
    return v[-1][1] if v else None
DERIVED = {}
for f, st in zip(FR, STATES2):
    yr = f["year"]
    for r in CASTLE_DRIVEN:
        facs = [(_cfac(c, yr), CASTLE_W.get(c["id"], {1: 3, 2: 2, 3: 1}[c["tier"]])) for c in _CA if CASTLE_REGION[c["id"]] == r]
        facs = [x for x in facs if x[0]]
        if not facs: continue
        cnt = {}
        for x, w in facs: cnt[x] = cnt.get(x, 0) + w
        old = st[r].split("/")
        order = sorted(cnt, key=lambda x: (-cnt[x], old.index(x) if x in old else 9))
        # 同盟方不算"争夺"：两方当年结盟时只显示主控方
        if len(order) > 1 and _allied(order[0], order[1], yr): order = [order[0]] + [x for x in order[2:] if not _allied(order[0], x, yr)]
        new = order[0] if len(order) == 1 else order[0] + "/" + order[1]
        if new != st[r]: DERIVED.setdefault(r, []).append((yr, st[r], new))
        st[r] = new

frames = []
prev = None
for i, (f, st) in enumerate(zip(FR, STATES2)):
    yr, title, desc, focus, ex = f["year"], f["title"], f["desc"], f["focus"], f
    gains, losses = [], []
    if prev:
        for r, v in st.items():
            a, b = set(prev[r].split("/")), set(v.split("/"))
            if prev[r] != v:
                gains.append({"region": r, "from": prev[r], "to": v})
    pw = S.power(st)
    frames.append({
        "year": yr, "age": (yr - 1497 + 1) if yr <= 1571 else (yr - 1553 + 1), "ageWho": "元就" if yr <= 1571 else "辉元", "title": title, "desc": desc.replace("\n", ""),
        "focus": focus, "focusXY": pt(focus) if focus in PTS else None,
        "state": st, "changes": gains,
        "power": {k: round(pw.get(k, 0), 3) for k in MAJORS_},
        "arrows": [{"faction": f, "from": pt(a), "to": pt(b), "fromName": a, "toName": b, "type": t, "label": l} for f, a, b, t, l in ex["arrows"]],
        "battles": [{"xy": pt(p), "place": p, "name": n, "winner": w} for p, n, w in ex["battles"]],
        "links": [{"from": a, "to": b, "type": t} for a, b, t in ex["links"]],
        "notes": {r: note_for(r.replace("安艺:", "安艺:"), yr) for r in st if note_for(r, yr)},
        "claims": f.get("claims"),
        "conf": {r: conf_for(r, yr) for r in st},
        "eventConf": {"grade": EVENT_CONF.get(yr, DEFAULT_CONF)[0], "basis": EVENT_CONF.get(yr, DEFAULT_CONF)[1]},
        "people": [{"name": p[0], "faction": p[1], "note": p[2], "status": p[3] if len(p) > 3 else "active"} for p in ex["people"]],
    })
    prev = st

# ---------- economic layer ----------
def owner(region, st):
    return st[region].split("/")[0]
ECON_NODES = [
 dict(id="ginzan", name="石见银山", lonlat=(132.44, 35.11), kind="mine", region="石見", since=1526, desc="1526年博多商人神屋寿祯开发，1533年引入灰吹法后产量急增；16世纪日本白银经博多等港流向朝鲜与明"),
 dict(id="yunotsu", name="温泉津", lonlat=(132.34, 35.09), kind="port", region="石見", since=1526, desc="银山外港之一（另有鞆浦）；毛利时代成为银山的主要外港"),
 dict(id="hakata", name="博多", lonlat=(130.40, 33.59), kind="city", region="筑前", since=1523, desc="西国最大的贸易城市，对明、朝鲜贸易的门户；神屋等豪商的据点"),
 dict(id="akamaseki", name="赤间关", lonlat=(130.94, 33.96), kind="strait", region="長門", since=1523, desc="关门海峡要冲，掌握它就掌握濑户内海与九州、日本海之间的通道"),
 dict(id="yamaguchi", name="山口", lonlat=(131.47, 34.18), kind="city", region="周防", since=1523, desc="大内氏城下，号称「西之京」，聚集公家、僧侣与商人"),
 dict(id="kaminoseki", name="上关", lonlat=(132.08, 33.83), kind="port", region="周防", since=1523, desc="濑户内海西部的关口与潮待港"),
 dict(id="itsukushima", name="严岛", lonlat=(132.32, 34.28), kind="port", region="安艺:佐伯", since=1523, desc="严岛神社门前市与港口，濑户内海交通要地"),
 dict(id="onomichi", name="尾道", lonlat=(133.20, 34.41), kind="port", region="備後", since=1523, desc="备后的商港，中世以来年贡与物资的集散地"),
 dict(id="tomo", name="鞆", lonlat=(133.38, 34.38), kind="port", region="備後", since=1523, desc="濑户内海中央的潮待港，东西潮流在此交汇"),
 dict(id="mihonoseki", name="美保关", lonlat=(133.32, 35.56), kind="port", region="出雲", since=1523, desc="尼子氏掌控的日本海港口，征收关税；与出云的砂铁炼铁同为尼子财源"),
]
NAVY = [
 dict(name="能岛村上", lonlat=(133.02, 34.18), note="三家中独立性最强，向往来船只收取「帆别钱」等通行费"),
 dict(name="来岛村上", lonlat=(132.96, 34.12), note="与伊予河野氏关系密切"),
 dict(name="因岛村上", lonlat=(133.18, 34.31), note="较早与毛利、小早川结合"),
]
NAVY_ZONE = dict(center=(133.05, 34.22), rx=0.30, ry=0.14, label="村上水军海域（芸予诸岛）")
ROUTES = [
 dict(id="setonaikai", name="濑户内海航路", kind="sea", since=1523,
      pts=[(130.94, 33.96), (131.30, 33.90), (132.08, 33.83), (132.35, 34.05), (132.32, 34.25), (132.75, 34.20), (133.05, 34.22), (133.38, 34.38), (133.90, 34.55), (134.30, 34.62), (134.85, 34.68)],
      desc="连接九州与畿内的主动脉，年贡、商品与军队都走这条路"),
 dict(id="silver", name="银的外运路线", kind="silver", since=1526,
      pts=[(132.34, 35.09), (131.90, 34.85), (131.40, 34.50), (130.94, 33.96), (130.40, 33.59)],
      desc="银山→温泉津→沿日本海西行→赤间关→博多，再输往朝鲜与明（示意）"),
 dict(id="kango", name="遣明船航路（往宁波）", kind="trade", since=1523, until=1551,
      pts=[(130.40, 33.59), (130.05, 33.35), (129.80, 33.10)],
      desc="1523年宁波之乱后，遣明船由大内独占；1547年最后一次，1551年大内义隆死后断绝"),
]
ECON_EVENTS = [
 (1523, "宁波之乱：大内与细川在宁波争夺遣明贸易，此后遣明船由大内独占"),
 (1526, "博多商人神屋寿祯开发石见银山"),
 (1533, "灰吹法传入石见银山，白银产量急增"),
 (1547, "最后一次大内遣明船出发"),
 (1551, "大内义隆死后，勘合贸易断绝"),
 (1555, "严岛之战，村上水军的向背左右胜负"),
 (1560, "毛利献金资助正亲町天皇即位，借此获得朝廷官位"),
 (1562, "毛利取得石见银山，以白银支撑长期战争"),
]
for f, st in zip(frames, STATES2):
    yr = f["year"]
    f["econ"] = {
        "nodes": {n["id"]: owner(n["region"], st) for n in ECON_NODES if n["since"] <= yr},
        "routes": [r["id"] for r in ROUTES if r["since"] <= yr and yr <= r.get("until", 9999)],
        "events": [{"year": y, "text": t} for y, t in ECON_EVENTS if y <= yr][-3:],
        "newEvents": [{"year": y, "text": t} for y, t in ECON_EVENTS if (prev_y := next((g["year"] for g in reversed(frames) if g["year"] < yr), 1500)) < y <= yr],
    }
ECON = {
 "nodes": [{**{k: v for k, v in n.items() if k != "lonlat"}, "xy": P(*n["lonlat"])} for n in ECON_NODES],
 "navy": [{"name": n["name"], "note": n["note"], "xy": P(*n["lonlat"])} for n in NAVY],
 "navyZone": {"center": P(*NAVY_ZONE["center"]), "rx": round(NAVY_ZONE["rx"] * KX, 1), "ry": round(NAVY_ZONE["ry"] * KY, 1), "label": NAVY_ZONE["label"]},
 "routes": [{**{k: v for k, v in r.items() if k != "pts"}, "points": [P(*q) for q in r["pts"]]} for r in ROUTES],
}

# ---------- relations / diplomacy layer ----------
HOUSES = {  # id: (name, faction, lonlat or None, offmap anchor)
 "mori": ("毛利", "MORI", (132.71, 34.67)), "kikkawa": ("吉川", "MORI", (132.40, 34.78)),
 "kobaT": ("竹原小早川", "MORI", (132.91, 34.34)), "kobaN": ("沼田小早川", "KOKUJIN", (132.99, 34.41)),
 "shishido": ("宍户", "KOKUJIN", (132.80, 34.71)), "kumagai": ("熊谷", "KOKUJIN", (132.50, 34.55)),
 "takahashi": ("高桥", "KOKUJIN", (132.62, 34.85)), "inoue": ("井上（家臣）", "MORI", (132.68, 34.64)),
 "takeda": ("安艺武田", "TAKEDA", (132.47, 34.47)), "ouchi": ("大内", "OUCHI", (131.47, 34.18)),
 "sue": ("陶", "OUCHI", (131.80, 34.05)), "naito": ("内藤", "OUCHI", (131.20, 34.30)),
 "amago": ("尼子", "AMAGO", (133.20, 35.36)), "shingu": ("新宫党", "AMAGO", (133.24, 35.40)),
 "otomo": ("大友", "OTOMO", (131.61, 33.24)), "yoshimi": ("吉见", "KOKUJIN", (131.77, 34.46)),
 "honjo": ("本城", "KOKUJIN", (132.30, 35.00)), "eda": ("江田", "KOKUJIN", (132.95, 34.85)),
 "mimura": ("三村", "MIMURA", (133.62, 34.80)), "murakami": ("村上水军", "OTHER", (133.02, 34.18)),
 "kono": ("河野", "KONO", (132.78, 33.85)), "tachibana": ("立花鉴载", "OTOMO", (130.47, 33.67)),
 "yamana": ("但马山名", "YAMANA", (134.80, 35.40)), "urakami": ("浦上", "URAGAMI", (134.15, 34.80)),
 "ryuzoji": ("龙造寺", "RYUZOJI", (130.30, 33.25)), "amagoR": ("尼子再兴军", "AMAGO", (133.05, 35.49)),
 "oda": ("织田（畿内）", "ODA", (134.88, 35.05)), "bakufu": ("将军足利义昭", "OTHER", (133.38, 34.38)),
 "ukita": ("宇喜多", "UKITA", (133.94, 34.67)), "hideyoshi": ("羽柴秀吉→丰臣", "TOYOTOMI", (134.69, 34.84)),
 "tokugawa": ("德川家康", "TOKUGAWA", (134.88, 35.20)), "chosokabe": ("长宗我部", "CHOSOKABE", (133.55, 33.56)),
 "nanjo": ("南条", "KOKUJIN", (133.90, 35.44)), "kobaH": ("小早川秀秋", "TOYOTOMI", (130.43, 33.65)),
}
# (a, b, type, from, to, label, grade). to=None -> through 1571. types: marriage adoption vassal alliance hostile truce secret purge
RELS = [
 ("mori", "kikkawa", "marriage", 1523, None, "元就正室妙玖出自吉川家", G1),
 ("mori", "amago", "vassal", 1523, 1524, "毛利从属尼子", G1),
 ("mori", "ouchi", "vassal", 1525, 1550, "毛利从属大内", G1),
 ("mori", "amago", "hostile", 1525, 1566, "毛利与尼子敌对", G1),
 ("mori", "takeda", "hostile", 1523, 1541, "宿敌安艺武田（1517年有田之战以来）", G1),
 ("mori", "takahashi", "purge", 1529, 1529, "讨灭高桥氏，吞并其领", G2),
 ("mori", "shishido", "marriage", 1534, None, "元就之女嫁宍户隆家，化敌为亲", G2),
 ("mori", "ouchi", "hostage", 1537, 1540, "隆元赴山口为质", G1),
 ("mori", "kobaT", "adoption", 1544, None, "三子隆景入嗣竹原小早川", G1),
 ("kikkawa", "kumagai", "marriage", 1547, None, "元春娶熊谷信直之女（约1547）", G2),
 ("mori", "kikkawa", "adoption", 1547, None, "次子元春入嗣吉川", G1),
 ("mori", "naito", "marriage", 1549, None, "隆元娶内藤兴盛之女（以大内义隆养女身份，年份约1549）", G2),
 ("mori", "inoue", "purge", 1550, 1550, "肃清井上一族", G1),
 ("kobaT", "kobaN", "adoption", 1550, None, "隆景统合沼田小早川（娶其家之女）", G1),
 ("mori", "sue", "vassal", 1551, 1553, "依附陶晴贤", G1),
 ("otomo", "ouchi", "adoption", 1552, 1557, "大友义镇之弟入继大内（大内义长）", G1),
 ("bakufu", "amago", "vassal", 1552, 1552, "将军任晴久为八国守护", G1),
 ("mori", "sue", "hostile", 1554, 1555, "防芸引分：与陶氏决裂", G1),
 ("mori", "yoshimi", "alliance", 1554, None, "吉见氏反陶，与毛利呼应", G2),
 ("amago", "shingu", "purge", 1554, 1554, "晴久肃清新宫党（元就离间说出自军记）", G3),
 ("mori", "eda", "purge", 1553, 1553, "讨灭倒向尼子的江田氏", G2),
 ("mori", "murakami", "alliance", 1555, None, "村上水军协力（严岛之战）", G2),
 ("mori", "mimura", "alliance", 1555, None, "与备中三村家亲结盟", G2),
 ("mori", "ouchi", "hostile", 1555, 1557, "防长经略", G1),
 ("mori", "otomo", "secret", 1557, 1557, "毛利与大友瓜分大内旧领的默契（通说）", G2),
 ("mori", "otomo", "hostile", 1558, 1563, "争夺丰前、筑前", G1),
 ("bakufu", "mori", "truce", 1560, 1560, "献金资助正亲町天皇即位，获官位", G1),
 ("mori", "honjo", "purge", 1562, 1562, "本城常光降后旋即被诛", G1),
 ("bakufu", "mori", "truce", 1564, 1564, "将军调停毛利·大友和睦", G1),
 ("mori", "otomo", "truce", 1564, 1567, "毛利·大友和睦", G1),
 ("mori", "urakami", "hostile", 1566, None, "在美作、备中与浦上宗景相争", G2),
 ("mori", "kono", "alliance", 1568, None, "援助河野氏（鸟坂之战）", G2),
 ("mori", "tachibana", "alliance", 1568, 1569, "立花鉴载叛大友，与毛利呼应", G1),
 ("mori", "otomo", "hostile", 1568, None, "争夺筑前", G1),
 ("otomo", "amagoR", "alliance", 1569, None, "大友与尼子再兴军呼应，夹击毛利", G2),
 ("yamana", "amagoR", "alliance", 1569, None, "山名祐丰支援尼子再兴军", G2),
 ("mori", "oda", "alliance", 1569, None, "毛利请织田出兵但马，牵制山名", G1),
 ("oda", "yamana", "hostile", 1569, 1569, "羽柴秀吉攻入但马", G1),
 ("mori", "amagoR", "hostile", 1569, None, "镇压尼子再兴军", G1),
 ("mori", "ryuzoji", "alliance", 1569, None, "与龙造寺共同对抗大友（呼应程度有限）", G3),
]
REL_TYPES = {"marriage": "联姻", "adoption": "入嗣", "vassal": "从属", "hostage": "人质", "alliance": "同盟·呼应",
             "hostile": "敌对", "truce": "和睦·调停", "secret": "密约", "purge": "吞并·肃清"}
for f in frames:
    yr = f["year"]
    py = next((g["year"] for g in reversed(frames) if g["year"] < yr), 1500)
    act = []
    for i, (a_, b_, t, y0, y1, lab, g) in enumerate(RELS):
        y1e = 1571 if y1 is None else y1
        if y0 <= yr <= y1e or (py < y0 <= yr) or (py < y1e < yr and t == "purge"):
            act.append({"id": i, "new": py < y0 <= yr})
    f["rels"] = act
RELATIONS = {
 "types": REL_TYPES,
 "houses": {k: {"name": v[0], "faction": v[1], "xy": P(*v[2]), "offmap": v[2][0] >= 134.85} for k, v in HOUSES.items()},
 "list": [{"id": i, "a": a_, "b": b_, "type": t, "from": y0, "to": y1, "label": lab, "grade": g} for i, (a_, b_, t, y0, y1, lab, g) in enumerate(RELS)],
}

# ---------- camp view (阵营站队) ----------
CAMPS = [("otomo", "大友阵营"), ("ouchi", "大内阵营"), ("mori", "毛利阵营"), ("amago", "尼子阵营"), ("oda", "织田阵营"),
         ("toyotomi", "丰臣政权"), ("seigun", "西军"), ("tokugawa", "东军"), ("neutral", "中立·其他")]  # 页面只显示当年有成员的列
# house: list of (from, to, camp, grade, note-on-entering)   camp None = gone (灭亡/退场)
CAMPLINE = {
 "mori":     [(1523,1524,"amago",G1,"从属尼子"),(1525,1553,"ouchi",G1,"转投大内"),(1554,1584,"mori",G1,"防芸引分，自立门户"),(1585,1599,"toyotomi",G1,"中国国分后臣从丰臣"),(1600,1600,"seigun",G1,"辉元任西军总大将")],
 "kikkawa":  [(1523,1524,"amago",G2,""),(1525,1542,"ouchi",G2,"随毛利转投大内"),(1543,1546,"amago",G2,"月山撤退时倒向尼子"),(1547,1553,"ouchi",G1,"元春入嗣，成为毛利一门"),(1554,1584,"mori",G1,"随毛利自立"),(1585,1599,"toyotomi",G1,"随毛利臣从丰臣"),(1600,1600,"seigun",G1,"广家名属西军，暗通东军")],
 "kobaT":    [(1523,1543,"ouchi",G1,""),(1544,1553,"ouchi",G1,"隆景入嗣，成为毛利一门"),(1554,1584,"mori",G1,"随毛利自立"),(1585,1596,"toyotomi",G1,"隆景受封伊予、筑前，列丰臣大老"),(1597,1597,None,G1,"隆景病逝，家督归养子秀秋")],
 "kobaN":    [(1523,1549,"ouchi",G2,""),(1550,1553,"ouchi",G1,"被隆景统合"),(1554,1571,"mori",G1,"随毛利自立")],
 "shishido": [(1523,1533,"neutral",G3,"与毛利为敌"),(1534,1553,"ouchi",G2,"与毛利联姻，站到毛利一边"),(1554,1584,"mori",G1,"随毛利自立"),(1585,1599,"toyotomi",G1,"随毛利臣从丰臣"),(1600,1600,"seigun",G1,"随辉元属西军")],
 "kumagai":  [(1523,1532,"amago",G2,"随安艺武田"),(1533,1553,"ouchi",G2,"脱离武田，靠拢毛利"),(1554,1584,"mori",G1,"随毛利自立"),(1585,1599,"toyotomi",G1,"随毛利臣从丰臣"),(1600,1600,"seigun",G1,"随辉元属西军")],
 "takahashi":[(1523,1528,"amago",G3,""),(1529,1529,None,G2,"被毛利讨灭")],
 "takeda":   [(1523,1540,"amago",G1,""),(1541,1541,None,G1,"银山城陷落，安艺武田灭亡")],
 "ouchi":    [(1523,1556,"ouchi",G1,""),(1557,1557,None,G1,"大内义长自尽，大内氏灭亡")],
 "sue":      [(1523,1554,"ouchi",G1,""),(1555,1555,None,G1,"严岛战败自尽")],
 "naito":    [(1523,1556,"ouchi",G1,""),(1557,1584,"mori",G2,"大内灭亡后归属毛利"),(1585,1599,"toyotomi",G1,"随毛利臣从丰臣"),(1600,1600,"seigun",G1,"随辉元属西军")],
 "yoshimi":  [(1523,1553,"ouchi",G1,""),(1554,1584,"mori",G2,"反陶，与毛利联手"),(1585,1599,"toyotomi",G1,"随毛利臣从丰臣"),(1600,1600,"seigun",G1,"随辉元属西军")],
 "eda":      [(1523,1552,"ouchi",G2,""),(1553,1553,"amago",G2,"倒向尼子"),(1554,1554,None,G2,"被毛利讨灭")],
 "honjo":    [(1523,1561,"amago",G2,""),(1562,1562,"mori",G1,"开城降毛利"),(1563,1563,None,G1,"降后被诛")],
 "amago":    [(1523,1566,"amago",G1,""),(1567,1567,None,G1,"月山富田城开城，尼子氏降伏")],
 "amagoR":   [(1569,1575,"amago",G1,"山中幸盛等拥尼子胜久再起"),(1576,1577,"oda",G1,"投靠织田，入上月城"),(1578,1578,None,G1,"上月城开城，胜久自尽、幸盛被杀")],
 "otomo":    [(1523,1585,"otomo",G1,""),(1586,1592,"toyotomi",G1,"请秀吉援救，九州征伐后臣从"),(1593,1593,None,G1,"大友义统改易")],
 "tachibana":[(1523,1567,"otomo",G1,""),(1568,1569,"mori",G1,"叛大友，与毛利呼应"),(1570,1570,None,G1,"立花鉴载败亡")],
 "mimura":   [(1523,1554,"neutral",G3,""),(1555,1573,"mori",G2,"与毛利结盟"),(1574,1574,"oda",G1,"三村元亲倒向织田"),(1575,1575,None,G1,"备中兵乱，三村氏灭亡")],
 "murakami": [(1523,1554,"neutral",G2,"海上独立势力"),(1555,1584,"mori",G2,"严岛之战协力（各家立场不一）"),(1585,1599,"toyotomi",G1,"随毛利臣从丰臣"),(1600,1600,"seigun",G1,"随辉元属西军")],
 "kono":     [(1523,1567,"neutral",G2,""),(1568,1584,"mori",G2,"受毛利援军"),(1585,1585,None,G1,"四国征伐后河野氏改易")],
 "yamana":   [(1523,1568,"neutral",G2,""),(1569,1574,"amago",G2,"支援尼子再兴军"),(1575,1579,"mori",G2,"芸但和睦"),(1580,1580,None,G1,"羽柴秀长平定但马")],
 "urakami":  [(1523,1568,"neutral",G2,""),(1569,1573,"otomo",G3,"与大友呼应，夹击毛利"),(1574,1574,"oda",G2,"得信长认可"),(1575,1575,None,G2,"天神山城被宇喜多直家攻陷")],
 "ryuzoji":  [(1523,1586,"neutral",G2,""),(1587,1599,"toyotomi",G2,"九州国分后臣从丰臣，锅岛主政"),(1600,1600,"tokugawa",G2,"锅岛转投东军")],
 "oda":      [(1569,1575,"mori",G1,"应毛利之请出兵但马，两家友好"),(1576,1582,"oda",G1,"义昭投毛利，毛织断交"),(1583,1583,None,G1,"本能寺之变后织田政权由秀吉接手")],
 "ukita":    [(1573,1574,"neutral",G2,"浦上家臣"),(1575,1578,"mori",G1,"与毛利结盟，逐浦上"),(1579,1582,"oda",G1,"直家倒向织田"),(1583,1599,"toyotomi",G1,"秀家为秀吉养子"),(1600,1600,"seigun",G1,"宇喜多秀家为西军主力")],
 "hideyoshi":[(1577,1582,"oda",G1,"织田家中国攻略总大将"),(1583,1597,"toyotomi",G1,"统一天下"),(1598,1598,None,G1,"秀吉死去")],
 "tokugawa": [(1598,1599,"toyotomi",G1,"五大老之首"),(1600,1600,"tokugawa",G1,"东军总帅")],
 "chosokabe":[(1575,1584,"neutral",G2,"统一土佐，进出四国"),(1585,1599,"toyotomi",G1,"四国征伐后仅保土佐"),(1600,1600,"seigun",G1,"长宗我部盛亲属西军")],
 "nanjo":    [(1575,1578,"mori",G1,"吉川元春安堵"),(1579,1582,"oda",G1,"与毛利决裂，倒向织田"),(1583,1599,"toyotomi",G2,"领伯耆东三郡")],
 "kobaH":    [(1597,1599,"toyotomi",G1,"继隆景之后领有筑前"),(1600,1600,"tokugawa",G1,"关原阵前倒戈")],
 "bakufu":   [(1576,1587,"mori",G1,"足利义昭移居鞆，依附毛利")],
}
LEADER = {"otomo": "otomo", "ouchi": "ouchi", "mori": "mori", "amago": "amago", "oda": "oda", "toyotomi": "hideyoshi", "tokugawa": "tokugawa", "seigun": "mori"}
# camp-to-camp relation per year: (campA, campB, type, from, to, label)
CAMPREL = [
 ("ouchi","amago","hostile",1523,1556,"大内与尼子争霸"),
 ("ouchi","otomo","truce",1534,1551,"大内与大友和睦"),
 ("ouchi","otomo","alliance",1552,1556,"大友之弟入继大内"),
 ("mori","ouchi","hostile",1554,1556,"防长经略"),
 ("mori","amago","hostile",1554,1566,"毛利攻尼子"),
 ("mori","otomo","hostile",1557,1563,"争夺北九州"),
 ("mori","otomo","truce",1564,1567,"将军调停和睦"),
 ("mori","otomo","hostile",1568,1576,"再战筑前，后转为对峙"),
 ("mori","amago","hostile",1569,1571,"镇压尼子再兴"),
 ("otomo","amago","alliance",1569,1571,"反毛利包围"),
 ("mori","oda","hostile",1576,1581,"毛织战争：石山合战与中国攻略"),
 ("mori","oda","truce",1582,1582,"本能寺之变后与秀吉和睦"),
 ("mori","toyotomi","truce",1583,1584,"中国国分交涉"),
 ("seigun","tokugawa","hostile",1600,1600,"关原之战"),
]
def camp_at(h, yr):
    for y0, y1, c, g, n in CAMPLINE[h]:
        if y0 <= yr <= y1: return (c, g, n, y0)
    return None
for f in frames:
    yr = f["year"]; py = next((g["year"] for g in reversed(frames) if g["year"] < yr), None)
    cur = {}; moves = []
    for h in CAMPLINE:
        st = camp_at(h, yr)
        prev = camp_at(h, py) if py else None
        # also catch an event entirely inside (py, yr): take latest segment that started in gap
        segs = [x for x in CAMPLINE[h] if py is not None and py < x[0] <= yr]
        if st is None and segs: st = (segs[-1][2], segs[-1][3], segs[-1][4], segs[-1][0])
        if st is None: continue
        if st[0] is not None: cur[h] = {"camp": st[0], "grade": st[1]}
        if segs:
            last = segs[-1]
            moves.append({"house": h, "from": prev[0] if prev else None, "to": last[2], "year": last[0], "note": last[4], "grade": last[3]})
    f["camps"] = cur; f["campMoves"] = moves
    f["campRels"] = [{"a": a_, "b": b_, "type": t, "label": l} for a_, b_, t, y0, y1, l in CAMPREL if y0 <= yr <= y1]

# ---------- family tree (毛利一门) ----------
FAMILY = {
 "nodes": [
  {"id": "motonari", "name": "毛利元就", "kind": "self", "from": 1523},
  {"id": "myokyu", "name": "妙玖（吉川国经之女）", "kind": "spouse", "from": 1523, "house": "kikkawa"},
  {"id": "takamoto", "name": "毛利隆元", "kind": "child", "from": 1523, "note": "嫡子，继承毛利本家"},
  {"id": "ozaki", "name": "尾崎局（内藤兴盛之女）", "kind": "spouse", "from": 1549, "house": "naito", "note": "以大内义隆养女身份出嫁，约1549"},
  {"id": "motoharu", "name": "吉川元春", "kind": "child", "from": 1530, "note": "1547 入嗣吉川"},
  {"id": "shinjo", "name": "新庄局（熊谷信直之女）", "kind": "spouse", "from": 1547, "house": "kumagai"},
  {"id": "takakage", "name": "小早川隆景", "kind": "child", "from": 1533, "note": "1544 入嗣竹原小早川，1550 统合沼田小早川"},
  {"id": "toida", "name": "问田大方（沼田小早川正平之女）", "kind": "spouse", "from": 1550, "house": "kobaN"},
  {"id": "goryu", "name": "五龙局", "kind": "child", "from": 1523, "note": "嫁宍户隆家（约1534）"},
  {"id": "takaie", "name": "宍户隆家", "kind": "spouse", "from": 1534, "house": "shishido"},
  {"id": "terumoto", "name": "毛利辉元", "kind": "grandchild", "from": 1553, "note": "1563 隆元急死后继承本家"},
 ],
 "edges": [
  ["motonari","myokyu","marriage",1523], ["motonari","takamoto","child",1523], ["motonari","motoharu","child",1530],
  ["motonari","takakage","child",1533], ["motonari","goryu","child",1523], ["takamoto","ozaki","marriage",1549],
  ["motoharu","shinjo","marriage",1547], ["takakage","toida","marriage",1550], ["goryu","takaie","marriage",1534],
  ["takamoto","terumoto","child",1553],
 ],
 "houseLinks": [  # child -> adopted house
  {"person": "motoharu", "house": "kikkawa", "label": "入嗣吉川", "year": 1547},
  {"person": "takakage", "house": "kobaT", "label": "入嗣竹原小早川", "year": 1544},
  {"person": "takakage", "house": "kobaN", "label": "统合沼田小早川", "year": 1550},
 ],
 "deaths": {"takamoto": 1563, "myokyu": 1545, "motonari": 1571},
 "note": "出生年份按通说取整；隆景实际生于1533，元春生于1530。联姻年份多为约数。",
}
TIES = {"kikkawa": [(1523,"姻"),(1547,"门")], "kobaT": [(1544,"门")], "kobaN": [(1550,"门")], "shishido": [(1534,"姻")], "kumagai": [(1547,"姻")], "naito": [(1549,"姻")]}
for f in frames:
    t = {}
    for h, lst in TIES.items():
        v = [k for y, k in lst if y <= f["year"]]
        if v: t[h] = "ichimon" if v[-1] == "门" else "inlaw"
    f["ties"] = t
RELATIONS["camps"] = [{"id": c, "name": n} for c, n in CAMPS]
RELATIONS["family"] = FAMILY

# ---- castles layer ----
from castles import CASTLES
DUP = {"吉田郡山城": "koriyama", "月山富田城": "toda", "山口": "yamaguchi", "镜山城": "kagamiyama", "佐东银山城": "kanayama",
       "新高山城": "takayama", "小仓山城": "ogurayama", "白鹿城": "shiraga", "且山城": "katsuyama", "门司城": "moji",
       "立花城": "tachibana", "须须万沼城": "suzuma", "府内": "funai", "石见银山": "yamabuki"}
for _c in CASTLES: DUP.setdefault(_c["name"], _c["id"])
GN = {1: "确证", 2: "通说", 3: "推测"}
castles = []
for c in CASTLES:
    castles.append({"id": c["id"], "name": c["name"], "lord": c["lord"], "xy": P(*c["lonlat"]), "tier": c["tier"], "crest": c.get("crest"), "mono": c.get("mono"),
                    "hist": [{"from": y, "fac": f, "conf": GN[g], "why": w} for y, f, g, w in c["hist"]]})
def cstate(c, yr):
    v = [h for h in c["hist"] if h["from"] <= yr]
    return v[-1] if v else None
prev = {}
for f in frames:
    st = {}; flips = []
    for c in castles:
        h = cstate(c, f["year"])
        if not h: continue
        st[c["id"]] = [h["fac"], h["conf"]]
        if c["id"] in prev and prev[c["id"]] != h["fac"]: flips.append(c["id"])
        elif c["id"] not in prev and f is not frames[0]: flips.append(c["id"])
    f["castles"] = st; f["castleFlips"] = flips
    prev = {k: v[0] for k, v in st.items()}

_KU = json.load(open(os.path.join(HERE, "kamon", "uris.json"))); _KM = json.load(open(os.path.join(HERE, "kamon", "meta.json")))
_KN = {"mori": "一文字三星（毛利）", "ouchi": "大内菱（大内·陶）", "amago": "平四目结（尼子）", "otomo": "抱花杏叶（大友·立花）", "takeda": "武田菱（安艺武田）",
       "kikkawa": "丸之内三引两（吉川）", "kobayakawa": "左三巴（小早川）", "masuda": "隈笹（益田，据日文维基）", "kono": "折敷三文字（河野）", "yamana": "五七桐七叶根笹（山名）"}
crests = {k: {"uri": _KU[k], "name": _KN[k], "file": _KM[k]["file"], "license": _KM[k]["license"]} for k in _KU}
data = {
  "crests": crests,
  "castles": castles,
  "relations": RELATIONS,
  "econ": ECON,
  "meta": {"title": "毛利氏 · 西国势力沙盘 1523—1600", "viewBox": [0, 0, W, H],
           "note": "示意：每国（安艺细分到郡）按主导势力着色；两色斜线＝两方争夺。领国数：完整控制计1、争夺各计0.5、安艺每郡计1/8。",
           "source": "边界：CODH 旧国·旧郡境界数据集（CC BY-NC）；势力归属为概略示意，军记数字仅供参考"},
  "grades": {"确证": "有同时代一手文书或多方史料一致", "通说": "研究中通行的看法，但边界或年份较模糊", "推测": "主要依据军记，或为沙盘按形势推定"},
  "corrections": CORRECTIONS + ["1572—1600：1585 年后毛利、宇喜多、南条等同为丰臣大名，地图按各自领国着色、不画成争夺；「丰臣政权」「东军诸大名」是多位大名的合并色", "1600 帧显示关原战后格局（防长以外的转封在 1600 年末至 1601 年完成）；毛利实际于 1604 年筑萩城", "备中东部、伯耆东三郡等边界在国郡层面无法精确表现，国色取多数一方，细节见城池", "城池汇总：安艺各郡与石见的颜色改由城池归属汇总得出（城主多数阵营；两方并存＝争夺），故个别年份与旧版不同", "家纹图像来自 Wikimedia Commons：一文字三星 CC0；平四目结、丸之内三引两 公有领域；大内菱、抱花杏叶、武田菱、隈笹 CC BY-SA 3.0（Mukai）；左三巴 CC BY-SA 3.0（BraneJ）；折敷三文字 CC BY-SA 4.0（Forewems）；五七桐七叶根笹 CC BY-SA 3.0（Houunji 1642）。无公版家纹的国人以姓氏单字代替"], "majors": MAJORS_,
  "factions": FACTIONS, "regions": regions, "akiOutline": aki_outline,
  "places": {n: {"xy": P(*v), "type": ("castle" if "城" in n else "place"), **({"castle": DUP[n]} if n in DUP else {})} for n, v in PTS.items() if n not in ("伯耆", "播磨", "丰后水道", "隐岐", "备后北部", "美作")},
  "seaLabels": [{"name": "日本海", "xy": P(131.2, 35.8)}, {"name": "濑户内海", "xy": P(131.75, 33.85)}, {"name": "周防滩", "xy": P(131.4, 33.95)}],
  "frames": frames,
}
open(os.path.join(HERE, "..", "sandbox_data.js"), "w", encoding="utf-8").write("window.SANDBOX = " + json.dumps(data, ensure_ascii=False) + ";\n")
print("frames", len(frames), "regions", len(regions), "H", H)
