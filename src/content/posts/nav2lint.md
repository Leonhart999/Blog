---
title: nav2lint：启动 Nav2 之前先检查参数文件
description: Nav2 的参数写错了，往往要等启动后才在日志里看到一条难懂的报错，或者干脆被悄悄忽略。我写了一个不依赖 ROS 的静态检查工具，几毫秒就能指出出错的那一行。
date: 2026-11-02
category: projects
tags: [Nav2, ROS2, Python, 开源]
---

调 Nav2 的时候，参数文件 `nav2_params.yaml` 写错是常事：类型写错了，启动后日志里只有一条看不懂的异常；插件名拼错了，节点起不来；参数名写错了，这个值会被悄悄忽略，根本不报错。每改一次都要重启整套导航才能发现，很浪费时间。

所以我写了 [nav2lint](https://github.com/Leonhart999/nav2lint)，在启动之前就把这些问题找出来。

## 能做什么

- 检查参数类型、插件列表和参数名，直接指出是哪一行。
- 支持 Humble、Jazzy、Kilted 和 Rolling，能自动判断配置是写给哪个发行版的。
- 迁移检查：拿一份 Humble 的配置，看看换到 Jazzy 会出哪些问题。
- `--fix` 自动修复能确定怎么改的问题，`--diff` 只预览不改文件。
- `--watch` 每次保存后自动重新检查；`--format json` 方便接进 CI。
- `--explain` 解释某条规则，`--describe` 查某个参数的类型、默认值和出处。
- 附带 VS Code 集成。

它只依赖 PyYAML，不需要装 ROS，也不会启动 Nav2，Windows、Linux 和 WSL 都能用。

```bash
pip install -e .
nav2lint --distro humble nav2_params.yaml
nav2lint --distro jazzy old_humble.yaml   # 迁移前检查
```

## 现状

11 月 1 日开始写，11 月 2 日夜里到 3 日凌晨连发了 v0.2.0 到 v0.3.1 几个版本，3 日白天又补了中文 README、五分钟上手教程和一段终端演示动图，第一阶段到这里就完成了，之后进入维护模式：接受能复现的 bug 和误报，新功能等有明确需求再说。

它不能代替实际运行验证，有些问题只有 Nav2 真正跑起来才能发现。但能在启动前少踩几次坑，对我来说已经够用了。
