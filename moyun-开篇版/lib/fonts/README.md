# 本地化字体说明

本目录的 woff2 是按 `index.html` 当前用字裁剪的 Google Fonts 子集，页面不依赖任何外部 CDN（离线/国内访问均可正常显示毛笔字效果）。

| 文件 | 字体 | 来源 |
|------|------|------|
| `MaShanZheng-Regular-subset.woff2` | Ma Shan Zheng 400 | google/fonts `ofl/mashanzheng` |
| `NotoSerifSC-400-subset.woff2` | Noto Serif SC 400 | google/fonts `ofl/notoserifsc`（可变字体 → 静态实例） |
| `NotoSerifSC-600-subset.woff2` | Noto Serif SC 600 | 同上 |
| `IBMPlexMono-Regular-subset.woff2` | IBM Plex Mono 400 | google/fonts `ofl/ibmplexmono` |

许可：均为 SIL Open Font License 1.1，许可全文见同目录 `*-OFL.txt`。

## 何时需要重新生成

子集只包含当前页面出现过的字符。若以后给页面新增诗句/文案（出现新汉字），新字会回退到系统楷体/宋体——此时需要用下面的方法重新裁剪。

## 重新生成方法

1. 从 `google/fonts` 下载对应 TTF（Noto Serif SC 为可变字体，先用 `fontTools.varLib.instancer` 导出 400/600 静态实例）
2. 把页面里出现的全部字符（所有码点 ≥ 0x20 的字符）导出为一个文本文件
3. 裁剪：

   ```
   pyftsubset <font>.ttf --text-file=<chars.txt> --flavor=woff2 \
     --name-IDs=* --output-file=<font>-subset.woff2
   ```

   依赖：`fontTools` + `brotli`
