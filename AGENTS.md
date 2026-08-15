# AGENTS.md — 给 AI 代理的规则

本仓库 `changsheng0804-blip/demos` 是用户所有**静态演示/测试页面**的**唯一收纳地**。

## 铁律（必须遵守）

1. **任何新的静态演示页、测试页、给朋友看的页面，一律放本仓库的对应子目录下，禁止另建 GitHub 仓库。**
2. **禁止**为静态演示单独创建新仓库、开启新 GitHub Pages 站点。
3. 需要发布新演示时：在 `demos` 仓库内新建子目录，把页面文件（HTML/CSS/JS/资源）放入，更新 `index.html` 卡片墙。

## 现有子目录与对应内容

| 目录 | 内容 | 主入口 |
|------|------|--------|
| `3d-physics-playground/` | 3D 物理游戏平台 | `立体物理游戏平台.html` |
| `agent-readable-documents/` | 意图与承诺可视化文档（demo v2） | `demo-v2.html` |
| `forge-strength-local-demo/` | 锻造力量私教单文件演示 | `index.html` |
| `pascal-scene-viewer/` | Pascal 场景查看器（构建产物） | `viewer/v1/` |
| `yeyulongwu/` | 一夜鱼龙舞粒子动画（多版本） | `index.html` |

## 新增演示的步骤（代理照做）

1. `git clone` 或直接进入 `G:/Zcode 工作区/demos` 本地目录
2. 新建子目录 `新演示名/`，放入所有页面文件
3. 确保页面内资源引用是**相对路径**（`./xxx.js`），不能是绝对路径（`/xxx.js`），否则部署在子目录下会失效
4. 更新根 `index.html` 卡片墙：加一张卡片，标题 + 一句话描述 + 打开链接
5. 若该演示有多个子页面，给它建一个子导航 `index.html`
6. 提交并推送，GitHub Pages 会自动发布到 `https://changsheng0804-blip.github.io/demos/新演示名/`

## 禁止事项

- 不得把演示页塞进 `68hub`、`laas-world`、`world-kernel` 等非演示仓库
- 不得以"临时""测试"为由绕过本仓库另开仓库——测试页也是演示页，同样收纳于此
- 不得删除已有子目录（除非用户明确要求）

## 访客导航

根 `index.html` 是唯一访客入口，新增演示后必须同步更新它。AGENTS.md 本身不对访客展示。
