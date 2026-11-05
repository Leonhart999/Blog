---
title: 庄园落成记：用 Astro 和 three.js 搭一个中世纪风格的博客
description: 这个博客是怎么搭起来的：开源模型怎么选、浮岛和瀑布怎么用代码造出来，以及部署到 GitHub Pages 时要注意的几件事。
date: 2026-11-05
category: projects
tags: [Astro, three.js, 博客, GitHub Pages]
---

首页那座浮在空中的庄园，既是装饰，也是导航：城堡通往归档，缮写室放技术笔记，工坊放项目手记，旅店放随笔，集市挂着标签，信鸦塔里是关于页。这篇记录它是怎么搭起来的。

## 站点骨架

站点用 [Astro](https://astro.build/) 生成静态页面。文章就是 `src/content/posts/` 下的 Markdown 文件，每篇开头写一段 frontmatter：

```yaml
---
title: 文章标题
description: 一句话摘要，会出现在列表和 RSS 里
date: 2026-11-05
category: tech        # tech / projects / essays 三选一
tags: [ROS2, SLAM]
draft: false          # true 时只在本地预览里出现
---
```

Astro 在构建时检查这些字段，写错分类或漏写日期会直接报错，不会悄悄生成一个坏页面。

## 庄园的模型

建筑、地块和树木来自 Kay Lousberg 的 [KayKit Medieval Hexagon Pack](https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0)，它是 CC0 协议，可以随便用。原包有 200 多个 glTF 模型，我只挑了用得上的 50 个左右，用 [glTF Transform](https://gltf-transform.dev/) 合并成一个文件，再做 meshopt 压缩，最后不到 1 MB。

原包的配色很亮，像玩具。我在着色器里加了一步调色，降低饱和度、往暖色偏一点，让它和羊皮纸背景放在一起不打架。

下面这些是用代码直接生成的，没有用现成模型：

- 浮岛下面的岩石：几圈随机扰动的多边形，逐层收窄到一个尖。
- 瀑布：一张弯曲的平面，片元着色器里用两层噪声做出往下流的水纹。
- 城堡顶上的燕尾旗：一张网格，每帧按正弦波推一下顶点，旗面上的「何」字是用 Canvas 画的贴图。
- 绕着城堡飞的渡鸦：一个圆锥身体加两片三角形翅膀。
- 关于页的火漆印：先在 Canvas 上画出印面，再把它当高度图，把圆盘中间压出浮雕。

## 白天与夜晚

右上角的按钮切换白天和夜晚。夜里光照换成冷色月光，窗户亮起暖色的灯，地面上飘着萤火虫。切换时光照参数在一秒左右里渐变过去，不是一下跳变。

## 部署到 GitHub Pages

博客放在 `Blog` 仓库里，地址是 `leonhart999.github.io/Blog/`。因为不在根路径，所有链接都要带上 `/Blog` 前缀，所以 `astro.config.mjs` 里设置了 `base: '/Blog'`，页面里的链接统一经过一个 `url()` 函数拼接。直接写死 `/archive/` 这样的绝对路径，上线后就会 404。

推送到 `main` 分支后，GitHub Actions 会自动构建并发布，不需要手动上传 `dist`。

## 还想做的

- 评论：打算用 giscus，评论存在仓库的 Discussions 里。
- 站内搜索：文章多了以后可以加 Pagefind，它在构建时生成索引，不需要服务器。
