# 毛利氏 西国势力沙盘 1523—1600

在线：https://changsheng0804-blip.github.io/demos/mori-sandbox/ · 录屏：`#rec=1550-1557`

## 结构
| 路径 | 内容 |
|---|---|
| `index.html` | 只有页面骨架与按钮；按顺序加载下列脚本 |
| `css/sandbox.css` | 全部样式 |
| `data/sandbox_data.js` | **唯一的史实数据**（由 `data/src/build_web_data.py` 生成，勿手改） |
| `data/src/` | 数据源：`sandbox.py`（关键帧）、`castles.py`（46 城）、`fetch_kuni.py`（下载 CODH 边界到 `.cache/`）、`kamon/`（家纹）、`build_web_data.py`（汇总、可信度、经济、关系） |
| `js/core.js` | 数据句柄、SVG 图层、国域、可信度、地名、提示框 |
| `js/castles.js` | 家纹城标、归属变色、标签避让 |
| `js/panel.js` | 势力消长、时间轴、走势图；全局状态 cur/playing/speed |
| `js/camera.js` | 镜头、缩放拖动、箭头、战役 |
| `js/econ.js` | 银山、港口、海路、水军 |
| `js/relations.js` | 简洁模式的关系节拍 |
| `js/playback.js` | 逐帧播放、年份、争夺、claims |
| `js/ui.js` | 史料说明、手机图层、录屏、面板、最大化、快捷键、启动 |
| `js/views.js` | 阵营 / 家族视图 |
| `vendor/` | Hark 基础样式与脚本 |
| `assets/terrain_soft.webp` | 国土地理院 DEM 地形底图 |
| `tools/qa.js` | 自动验收截图 |
| `tools/lint_data.py` | 数据体检（缺原因/可信度、年份乱序、同盟画成争夺、不可见变化） |
| `tools/diff_states.py` | 新旧数据逐年对比：国色变化、新增易主 |
| `tools/compare_shots.py` | 新旧截图回归对比（容忍 ±3px 平移），输出差异图 |
| `CHANGELOG.md` | 每轮改动、结果变化与待办 |

`js/*.js` 是普通脚本，共享同一全局作用域，**加载顺序不能改**。

## 改动流程（闭环）
依赖：Python 3 + shapely（matplotlib 可选）；Node + puppeteer-core + Chrome。
1. 首次：`python3 data/src/fetch_kuni.py`（CODH 边界，CC BY-NC，不入库）。
2. 备份旧数据：`cp data/sandbox_data.js /tmp/prev.js`；旧截图：`node tools/qa.js . /tmp/qa_base`。
3. 史实 → 改 `data/src/*.py`；`python3 data/src/build_web_data.py` 生成 `data/sandbox_data.js`。样式/交互 → 改对应 `js/` 或 `css/`。每次只改一层。
4. `python3 tools/lint_data.py`：ERROR 为 0。
5. `python3 tools/diff_states.py /tmp/prev.js data/sandbox_data.js`：每一处国色变化都要能解释。
6. `node tools/qa.js . /tmp/qa_new`：JS 报错为 0；`python3 tools/compare_shots.py /tmp/qa_base /tmp/qa_new`：变化只出现在预期位置。
7. 对照 `DESIGN.md`，在 `CHANGELOG.md` 记一笔，再提交。
