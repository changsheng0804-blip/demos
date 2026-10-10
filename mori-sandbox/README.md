# 毛利元就 西国势力沙盘 1523—1571

在线：https://changsheng0804-blip.github.io/demos/mori-sandbox/ · 录屏：`#rec=1550-1557`

## 结构
| 路径 | 内容 |
|---|---|
| `index.html` | 只有页面骨架与按钮；按顺序加载下列脚本 |
| `css/sandbox.css` | 全部样式 |
| `data/sandbox_data.js` | **唯一的史实数据**（由 `data/src/build_web_data.py` 生成，勿手改） |
| `data/src/` | 数据源：`sandbox.py`（关键帧）、`castles.py`（33 城）、`build_web_data.py`（汇总、可信度、经济、关系） |
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

`js/*.js` 是普通脚本，共享同一全局作用域，**加载顺序不能改**。

## 改动流程
1. 史实 → 改 `data/src/*.py`，重新生成 `data/sandbox_data.js`；样式/交互 → 改对应 `js/` 或 `css/`。
2. 每次只改一层。
3. `node tools/qa.js <目录> <输出>`：1523/1550/1557、1×/3×、手机、录屏、阵营/家族视图截图，且 JS 报错为 0。
4. 对照 `DESIGN.md`，再提交。
