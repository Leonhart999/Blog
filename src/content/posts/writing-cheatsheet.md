---
title: 博客写作速查：Markdown、代码与公式
description: 在这座庄园里写文章时能用到的全部格式：标题、列表、引用、表格、代码块和数学公式，顺带看看它们排出来是什么样子。
date: 2026-11-04
category: tech
tags: [Markdown, 写作, KaTeX]
---

这篇是写给我自己的速查表，也顺便检查一下各种格式在羊皮纸上排出来的效果。

## 文字与列表

**加粗**、*强调*、`行内代码`、[链接](https://astro.build/) 都和普通 Markdown 一样。列表可以嵌套：

- 感知：激光雷达、IMU、轮速计
- 估计：扫描匹配、位姿图优化
  - 前端负责相邻帧之间的配准
  - 后端负责回环和全局一致性
- 规划与控制

有序列表的编号会用罗马体数字的红色字形：

1. 写 frontmatter
2. 写正文
3. 本地 `npm run dev` 预览，满意了再推送

任务列表也能用：

- [x] 庄园落成
- [ ] 接入评论
- [ ] 加站内搜索

## 引用

> 机器应当能判断自身的退化程度，并且仍然把任务做完。

## 表格

| 方法 | 传感器 | 回环检测 | 适合场景 |
| --- | --- | --- | --- |
| Cartographer | 2D/3D 激光 | 子图匹配 | 室内建图 |
| LIO-SAM | 激光 + IMU | 位姿图 + ICP | 室外大场景 |
| FAST-LIO2 | 激光 + IMU | 无（纯里程计） | 高速、低算力 |

## 代码

代码块写明语言就会自动高亮，右上角有复制按钮，白天和夜晚各用一套配色：

```python
import numpy as np

class PID:
    """Discrete PID controller with simple anti-windup."""

    def __init__(self, kp: float, ki: float, kd: float, dt: float, limit: float):
        self.kp, self.ki, self.kd, self.dt, self.limit = kp, ki, kd, dt, limit
        self.integral = 0.0
        self.prev_error = 0.0

    def step(self, error: float) -> float:
        self.integral += error * self.dt
        derivative = (error - self.prev_error) / self.dt
        self.prev_error = error
        u = self.kp * error + self.ki * self.integral + self.kd * derivative
        if abs(u) > self.limit:            # stop integrating while saturated
            self.integral -= error * self.dt
        return float(np.clip(u, -self.limit, self.limit))
```

```bash
ros2 launch nav2_bringup navigation_launch.py use_sim_time:=true
```

## 数学公式

行内公式用一对美元符号，例如连续时间 PID 控制律 $u(t) = K_p e(t) + K_i \int_0^t e(\tau)\,d\tau + K_d \dot e(t)$。

独立公式用两对美元符号，例如线性系统的状态空间模型：

$$
\begin{aligned}
\dot{x}(t) &= A x(t) + B u(t) \\
y(t) &= C x(t) + D u(t)
\end{aligned}
$$

以及离散 LQR 的代价函数：

$$
J = \sum_{k=0}^{\infty} \left( x_k^\top Q x_k + u_k^\top R u_k \right)
$$

## 图片

图片放在文章旁边或 `public/` 目录里，用相对路径引用即可，会自动加上一圈画框：

```markdown
![建图结果](./images/map.png)
```

---

分隔线会变成一行小小的纹饰，就像上面那样。
