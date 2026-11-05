---
title: 两个还没做完的游戏：《铬债》和《逾期》
description: 一个回合制赛博朋克 RPG 做到第一章暂停了，素材拿去做了一个只有 Boss 战的俯视角 roguelite。记录一下两个游戏现在的样子和为什么这么改。
date: 2026-11-06
category: projects
tags: [游戏, Phaser, TypeScript]
draft: true
---

<!-- Draft: both games are unreleased. Publish only if you want them public. -->

## 《铬债》CHROME DEBT

回合制赛博朋克 RPG。主角 Echo 的义体是贷款买的，21 天后公司就要来收回。要在期限内打倒四个街区的 Boss，最后进入 Halcyon 塔。

用 TypeScript + Phaser 3 写，分辨率 640×360，像素画全部用代码在运行时生成，没有用外部美术素材。第一章（Rustport 街区）已经能从头玩到第一个 Boss Gearjaw：有体力、昼夜时间、装备、天赋和同伴。

试玩下来，剧情台词读着太像套话，所以先停在第一章。以后如果继续做，台词要重写，写短、写具体。

## 《逾期》OVERDUE

用《铬债》的素材做的第二个游戏，干脆不要剧情，只有 Boss 战。

- 实时俯视角双摇杆：WASD 移动，鼠标瞄准。
- 4 把武器：钉枪、电弧枪、霰弹枪、单分子刀。每把有 2 个改装件，装上后改变的是打法，不是数值。
- 4 个义体槽，每个替换一种动作，比如腿部义体换掉空格键的闪避。
- Boss 有韧性条，打空后硬直 3 秒；场景里的起重机、油桶和柱子是削韧性的主要手段。
- 每局 Boss 顺序随机，越往后越强。可以签贷款合同换强力加成，代价是更高的风险。

第一个 Boss Gearjaw 和他的废料场已经能打。另外两个 Boss（夜店里的 Madame Lux、被淹的机房里的八头蛇）正在做。每个 Boss 搭配每把武器，都有无头的机器人对战测试自动跑，用来检查平衡。
