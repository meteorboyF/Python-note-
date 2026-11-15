# Matplotlib

**Matplotlib** is Python's foundational plotting library: Pandas' `.plot()`, Seaborn and many ML tools are built on it. It can draw almost anything, from a quick line chart to a publication figure, but its power comes from understanding one idea: a **Figure** contains **Axes**, and you draw on Axes. Learn that model and the API stops feeling random.

:::analogy A picture frame with canvases
The **Figure** is the whole picture frame (the window or the saved image). Inside it hang one or more **Axes**: individual canvases, each with its own x/y axis, title and legend. Everything you see (lines, text, ticks, rectangles) is an **Artist** painted onto a canvas. You don't paint "on the frame". You pick a canvas (`ax`) and paint there.
:::

Press **▶ Run** on any example below to draw it right in the page.

## 1. Anatomy: Figure, Axes, Artist

```python plot
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
fig, ax = plt.subplots(figsize=(7, 4))           # a Figure with ONE Axes
ax.plot(x, np.sin(x), label="sin(x)", color="#B3261E", linewidth=2)
ax.plot(x, np.cos(x), label="cos(x)", color="#C4893A", linestyle="--")
ax.set_title("Anatomy of a plot")                # Axes title
ax.set_xlabel("x (radians)")                     # axis labels
ax.set_ylabel("value")
ax.legend(loc="upper right")                     # legend
ax.grid(alpha=0.3)                               # grid lines
ax.annotate("peak", xy=(np.pi / 2, 1), xytext=(3, 1.3), arrowprops=dict(arrowstyle="->"))
ax.set_ylim(-1.5, 1.6)
fig.suptitle("Figure title (suptitle)", fontsize=10)
plt.show()
```

| Object | What it is | Common methods |
|---|---|---|
| `Figure` (`fig`) | the whole image | `fig.suptitle`, `fig.savefig`, `fig.tight_layout`, `fig.add_subplot` |
| `Axes` (`ax`) | one plot area | `ax.plot`, `ax.scatter`, `ax.bar`, `ax.set_title`, `ax.legend` |
| `Axis` (`ax.xaxis`) | the number line with ticks | `ax.set_xticks`, `ax.tick_params` |
| `Artist` | anything drawn | lines, text, patches, images |

:::term Axes vs axis
**Axes** (plural-looking, but one object) is a whole subplot. **Axis** is one number line (x or y) within it. `fig, ax = plt.subplots()` gives you one Axes. Most mistakes come from mixing these words up.
:::

## 2. Two interfaces: pyplot vs object-oriented

```python plot
import matplotlib.pyplot as plt
import numpy as np
x = np.arange(10)

# 1) pyplot (state-machine) style: quick, implicit "current axes"
plt.figure(figsize=(6, 2.5))
plt.plot(x, x ** 2, color="#B3261E")
plt.title("pyplot style")
plt.show()

# 2) object-oriented style: explicit, scales to many subplots (RECOMMENDED)
fig, ax = plt.subplots(figsize=(6, 2.5))
ax.plot(x, x ** 2, color="#5A3825")
ax.set_title("OO style")
plt.show()
```

:::boss Always use `fig, ax = plt.subplots()`
The pyplot style (`plt.plot`, `plt.title`) acts on a hidden "current axes", which becomes confusing with several subplots. The object-oriented style names every canvas explicitly. Note the method names change: `plt.title` → `ax.set_title`, `plt.xlabel` → `ax.set_xlabel`, `plt.xlim` → `ax.set_xlim`.
:::

## 3. Line plots and styling

```python plot
import matplotlib.pyplot as plt
import numpy as np
x = np.linspace(0, 2 * np.pi, 30)
fig, ax = plt.subplots(figsize=(7, 4))
ax.plot(x, np.sin(x), "o-", color="#B3261E", markersize=4, label="marker 'o', solid")
ax.plot(x, np.sin(x) + 0.5, marker="s", linestyle="--", color="#C4893A", label="square, dashed")
ax.plot(x, np.sin(x) + 1, linestyle=":", linewidth=3, color="#5A3825", label="dotted, thick")
ax.plot(x, np.sin(x) + 1.5, drawstyle="steps-mid", color="#5F7A2E", label="steps")
ax.legend(ncols=2, fontsize=8, frameon=False)
ax.set(title="Line styles & markers", xlabel="x", ylabel="y")   # ax.set sets many at once
plt.show()
```

| Parameter | Values |
|---|---|
| `color` / `c` | `"red"`, `"#B3261E"`, `(0.7, 0.15, 0.1)`, `"C0"…"C9"` (the cycle) |
| `linestyle` / `ls` | `"-"`, `"--"`, `":"`, `"-."`, `"none"` |
| `linewidth` / `lw` | a number |
| `marker` | `"o"`, `"s"`, `"^"`, `"x"`, `"+"`, `"."`, `"D"`, `"*"` |
| `alpha` | transparency 0–1 |
| `label` | the legend text |
| format string | `"ro--"` = red, circles, dashed |

## 4. The core plot types

```python plot
import matplotlib.pyplot as plt
import numpy as np
rng = np.random.default_rng(0)
fig, axes = plt.subplots(2, 3, figsize=(11, 6))

x = rng.normal(size=200); y = x * 0.7 + rng.normal(0, 0.5, 200)
axes[0, 0].scatter(x, y, c=y, cmap="copper", s=15, alpha=0.8)
axes[0, 0].set_title("scatter")

cats, vals = ["A", "B", "C", "D"], [23, 45, 12, 33]
axes[0, 1].bar(cats, vals, color="#D9A35F", edgecolor="#5A3825")
axes[0, 1].set_title("bar")

axes[0, 2].barh(cats, vals, color="#B3261E")
axes[0, 2].set_title("barh")

axes[1, 0].hist(rng.normal(size=1000), bins=30, color="#C4893A", edgecolor="white")
axes[1, 0].set_title("hist")

axes[1, 1].boxplot([rng.normal(0, 1, 100), rng.normal(1, 2, 100), rng.normal(-1, 0.5, 100)], tick_labels=["a", "b", "c"])
axes[1, 1].set_title("boxplot")

axes[1, 2].pie(vals, labels=cats, autopct="%1.0f%%", colors=["#B3261E", "#D9A35F", "#5A3825", "#F3E2C3"])
axes[1, 2].set_title("pie")

fig.tight_layout()                       # stop titles and labels overlapping
plt.show()
```

| Function | Shows | Use for |
|---|---|---|
| `ax.plot` | lines | trends over an ordered x (time) |
| `ax.scatter` | points (size `s`, colour `c`) | relationships between 2–4 variables |
| `ax.bar` / `barh` | bars | comparing categories |
| `ax.hist` | binned counts | one variable's distribution |
| `ax.boxplot` / `violinplot` | quartiles / density | comparing distributions |
| `ax.pie` | parts of a whole | few categories only (prefer bars) |
| `ax.fill_between` | a shaded band | confidence intervals, ranges |
| `ax.errorbar` | points with error bars | measurements with uncertainty |
| `ax.stackplot` | stacked areas | composition over time |
| `ax.imshow` / `pcolormesh` | colour grids | matrices, images, heatmaps |
| `ax.contour` / `contourf` | level curves | 2-D functions, decision boundaries |
| `ax.hexbin` | 2-D density | scatter with too many points |

### More types: grouped and stacked bars, error bars, bands, areas

```python plot
import matplotlib.pyplot as plt
import numpy as np
rng = np.random.default_rng(1)
fig, axes = plt.subplots(1, 3, figsize=(12, 3.6))

labels = ["Q1", "Q2", "Q3", "Q4"]; a = [20, 34, 30, 35]; b = [25, 32, 34, 20]
idx = np.arange(len(labels)); w = 0.38
axes[0].bar(idx - w / 2, a, w, label="2025", color="#D9A35F")
axes[0].bar(idx + w / 2, b, w, label="2026", color="#B3261E")
axes[0].set_xticks(idx, labels); axes[0].legend(); axes[0].set_title("grouped bars")

x = np.arange(10); mean = np.sin(x / 2) * 3 + 10; err = rng.uniform(0.3, 1, 10)
axes[1].errorbar(x, mean, yerr=err, fmt="o", color="#5A3825", capsize=3, label="measurement")
axes[1].fill_between(x, mean - 2 * err, mean + 2 * err, color="#B3261E", alpha=0.2, label="±2σ band")
axes[1].legend(fontsize=8); axes[1].set_title("errorbar + fill_between")

t = np.arange(12); s = rng.integers(1, 5, (3, 12)).cumsum(axis=1)
axes[2].stackplot(t, s, labels=["web", "app", "store"], colors=["#F3E2C3", "#D9A35F", "#B3261E"])
axes[2].legend(loc="upper left", fontsize=8); axes[2].set_title("stackplot")
fig.tight_layout()
plt.show()
```

## 5. Layouts: subplots, shared axes, GridSpec, mosaic

```python plot
import matplotlib.pyplot as plt
import numpy as np
x = np.linspace(0, 5, 100)

fig, axes = plt.subplots(2, 2, figsize=(8, 5), sharex=True, sharey=True)
for ax, k in zip(axes.flat, [1, 2, 3, 4]):              # axes is a 2-D array: .flat iterates it
    ax.plot(x, np.sin(k * x), color=f"C{k}")
    ax.set_title(f"sin({k}x)", fontsize=9)
fig.supxlabel("shared x"); fig.supylabel("shared y")
fig.tight_layout()
plt.show()

fig = plt.figure(figsize=(9, 5), layout="constrained")
mosaic = fig.subplot_mosaic([["main", "main", "side"],
                             ["main", "main", "side"],
                             ["bottom", "bottom", "bottom"]])   # named, flexible layouts
mosaic["main"].plot(x, np.exp(-x) * np.cos(5 * x), color="#B3261E"); mosaic["main"].set_title("main")
mosaic["side"].hist(np.random.default_rng(0).normal(size=300), orientation="horizontal", color="#D9A35F"); mosaic["side"].set_title("side")
mosaic["bottom"].bar(range(10), np.arange(10) % 4 + 1, color="#5A3825"); mosaic["bottom"].set_title("bottom")
plt.show()
```

```python plot
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.gridspec import GridSpec
rng = np.random.default_rng(3)
x, y = rng.normal(size=500), rng.normal(size=500)

fig = plt.figure(figsize=(6, 6))
gs = GridSpec(4, 4, figure=fig, hspace=0.05, wspace=0.05)
ax_main = fig.add_subplot(gs[1:, :3])
ax_top = fig.add_subplot(gs[0, :3], sharex=ax_main)
ax_right = fig.add_subplot(gs[1:, 3], sharey=ax_main)
ax_main.scatter(x, y, s=8, alpha=0.6, color="#B3261E")
ax_top.hist(x, bins=30, color="#D9A35F")
ax_right.hist(y, bins=30, orientation="horizontal", color="#D9A35F")
ax_top.tick_params(labelbottom=False); ax_right.tick_params(labelleft=False)
ax_main.set(xlabel="x", ylabel="y")
fig.suptitle("Scatter with marginal histograms (GridSpec)")
plt.show()
```

### Twin axes and insets

```python plot
import matplotlib.pyplot as plt
import numpy as np
months = np.arange(1, 13)
temp = 15 + 10 * np.sin((months - 4) / 12 * 2 * np.pi)
rain = np.array([50, 40, 60, 80, 120, 200, 260, 240, 160, 90, 40, 30])
fig, ax1 = plt.subplots(figsize=(7, 3.5))
ax1.bar(months, rain, color="#D9A35F", label="rain (mm)")
ax1.set_ylabel("rain (mm)", color="#8C6A55")
ax2 = ax1.twinx()                                     # a second y-axis sharing x
ax2.plot(months, temp, "o-", color="#B3261E", label="temp (°C)")
ax2.set_ylabel("temperature (°C)", color="#B3261E")
inset = ax1.inset_axes([0.05, 0.6, 0.3, 0.35])        # a small plot inside the plot
inset.plot(months, temp.cumsum(), color="#5A3825"); inset.set_title("cumulative", fontsize=7); inset.tick_params(labelsize=6)
ax1.set_xticks(months, ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"])
ax1.set_title("Two y-axes (twinx) + an inset")
fig.tight_layout()
plt.show()
```

:::trap Two y-axes can mislead
Twin axes let you choose two scales freely, so you can make any two series look correlated. Label both axes clearly in matching colours, and consider two stacked subplots with `sharex=True` instead.
:::

## 6. Ticks, limits, scales and annotations

```python plot
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.ticker import FuncFormatter, MultipleLocator

fig, axes = plt.subplots(1, 2, figsize=(11, 3.8))
x = np.logspace(0, 5, 50)
axes[0].plot(x, x ** 2, color="#B3261E", label="x²")
axes[0].plot(x, x * np.log(x), color="#C4893A", label="x log x")
axes[0].set_xscale("log"); axes[0].set_yscale("log")         # log-log: power laws become straight lines
axes[0].legend(); axes[0].set_title("log scales"); axes[0].grid(which="both", alpha=0.2)

revenue = np.array([1.2e6, 1.8e6, 2.4e6, 2.1e6, 3.3e6])
axes[1].plot(range(2022, 2027), revenue, "o-", color="#5A3825")
axes[1].yaxis.set_major_formatter(FuncFormatter(lambda v, _: f"${v / 1e6:.1f}M"))
axes[1].xaxis.set_major_locator(MultipleLocator(1))
axes[1].set_ylim(0, 4e6)
best = revenue.argmax()
axes[1].annotate(f"record: ${revenue[best]/1e6:.1f}M", xy=(2022 + best, revenue[best]), xytext=(2022.3, 3.6e6),
                 arrowprops=dict(arrowstyle="->", color="#B3261E"), color="#B3261E")
axes[1].axhline(revenue.mean(), ls="--", color="gray", lw=1); axes[1].text(2022, revenue.mean() * 1.05, "mean", fontsize=8)
axes[1].axvspan(2024.5, 2025.5, color="#F3E2C3", alpha=0.7)
axes[1].set_title("formatters, annotate, axhline, axvspan")
fig.tight_layout()
plt.show()
```

Maths text works with LaTeX-style syntax inside `$…$`: `ax.set_title(r"$\sigma = \sqrt{\frac{1}{n}\sum (x_i-\mu)^2}$")`.

## 7. Colour and colormaps

```python plot
import matplotlib.pyplot as plt
import numpy as np
x = np.linspace(-3, 3, 200)
X, Y = np.meshgrid(x, x)
Z = np.exp(-(X ** 2 + Y ** 2) / 2) * np.cos(2 * X)

fig, axes = plt.subplots(1, 3, figsize=(12, 3.6))
im = axes[0].imshow(Z, cmap="viridis", origin="lower", extent=[-3, 3, -3, 3])
fig.colorbar(im, ax=axes[0]); axes[0].set_title("imshow + viridis (sequential)")
cs = axes[1].contourf(X, Y, Z, levels=15, cmap="RdBu_r")
axes[1].contour(X, Y, Z, levels=[0], colors="black", linewidths=1)
fig.colorbar(cs, ax=axes[1]); axes[1].set_title("contourf + RdBu_r (diverging)")
corr = np.corrcoef(np.random.default_rng(0).normal(size=(5, 50)))
im2 = axes[2].imshow(corr, cmap="copper", vmin=-1, vmax=1)
for i in range(5):
    for j in range(5):
        axes[2].text(j, i, f"{corr[i, j]:.1f}", ha="center", va="center", fontsize=7, color="white")
fig.colorbar(im2, ax=axes[2]); axes[2].set_title("annotated heatmap")
fig.tight_layout()
plt.show()
```

| Colormap type | Use for | Examples |
|---|---|---|
| **Sequential** | low → high magnitudes | `viridis`, `magma`, `copper`, `Blues` |
| **Diverging** | deviation from a midpoint (0) | `RdBu_r`, `coolwarm`, `BrBG` |
| **Qualitative** | unordered categories | `tab10`, `Set2`, `Pastel1` |
| **Cyclic** | angles, hours | `twilight`, `hsv` |

:::trap Avoid `jet` and rainbow colormaps
Rainbow maps have uneven perceived brightness, which creates fake edges, and they're unreadable for colour-blind viewers. **Perceptually uniform** maps like `viridis`, `cividis` and `magma` are the defaults for good reason. Use a diverging map only when your data has a meaningful centre.
:::

## 8. Styles and themes

```python plot
import matplotlib.pyplot as plt
import numpy as np
x = np.linspace(0, 10, 50)
print(plt.style.available[:8], "...")
for style in ["ggplot", "seaborn-v0_8-whitegrid", "dark_background"]:
    with plt.style.context(style):                 # temporarily apply a style
        fig, ax = plt.subplots(figsize=(6, 2.2))
        ax.plot(x, np.sin(x)); ax.plot(x, np.cos(x)); ax.set_title(style, fontsize=9)
        plt.show()

plt.rcParams.update({"axes.spines.top": False, "axes.spines.right": False,
                     "axes.prop_cycle": plt.cycler(color=["#B3261E", "#D9A35F", "#5A3825"])})
fig, ax = plt.subplots(figsize=(6, 2.5))
for k in range(3):
    ax.plot(x, np.sin(x + k), label=f"phase {k}")
ax.legend(); ax.set_title("custom rcParams: cookie palette, no top/right spines")
plt.show()
plt.rcdefaults()                                    # reset global settings
```

## 9. Saving figures

```python norun
fig.savefig("chart.png", dpi=200, bbox_inches="tight")     # raster: slides and web
fig.savefig("chart.svg")                                    # vector: crisp at any size, editable
fig.savefig("chart.pdf")                                    # vector: papers
fig.savefig("chart.png", transparent=True, facecolor="none")
plt.close(fig)                                              # free memory in loops/scripts!
```

:::tip Memory in loops
Every `plt.subplots()` creates a figure that stays in memory until closed. When generating hundreds of plots in a loop, call `plt.close(fig)` after saving, or you'll see "More than 20 figures have been opened" warnings and growing memory.
:::

## 10. Pandas, 3-D and animation

```python plot
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
rng = np.random.default_rng(2)
df = pd.DataFrame({"month": pd.date_range("2026-01-01", periods=12, freq="MS"),
                   "north": rng.integers(80, 140, 12), "south": rng.integers(60, 120, 12)}).set_index("month")
fig, axes = plt.subplots(1, 3, figsize=(13, 3.6))
df.plot(ax=axes[0], color=["#B3261E", "#D9A35F"], title="df.plot() -> line")
df.sum().plot.bar(ax=axes[1], color=["#B3261E", "#D9A35F"], rot=0, title="Series.plot.bar")
df.plot.scatter(x="north", y="south", ax=axes[2], color="#5A3825", title="df.plot.scatter")
fig.tight_layout()
plt.show()

fig = plt.figure(figsize=(6, 4.5))
ax3 = fig.add_subplot(projection="3d")
g = np.linspace(-3, 3, 40)
X, Y = np.meshgrid(g, g)
ax3.plot_surface(X, Y, np.sin(np.sqrt(X ** 2 + Y ** 2)), cmap="copper", linewidth=0)
ax3.set_title("3-D surface")
plt.show()
```

Animations use `matplotlib.animation.FuncAnimation(fig, update, frames=…)`, saved with `anim.save("out.gif", writer="pillow")`. In notebooks, `IPython.display.HTML(anim.to_jshtml())` plays them inline.

## 11. Seaborn in one minute

Seaborn wraps Matplotlib with statistical plots and nicer defaults: `sns.histplot`, `sns.boxplot`, `sns.scatterplot(hue=…)`, `sns.heatmap(annot=True)`, `sns.pairplot(df)`, `sns.lineplot` (with confidence bands). Every Seaborn function accepts `ax=`, so it slots straight into your Matplotlib layouts, and all the styling in this chapter still applies.

## 12. ML plots you'll make constantly

```python plot
import matplotlib.pyplot as plt
import numpy as np
rng = np.random.default_rng(0)
fig, axes = plt.subplots(2, 2, figsize=(10, 8))

epochs = np.arange(1, 51)
train_loss = 1.5 * np.exp(-epochs / 10) + 0.1 + rng.normal(0, 0.02, 50)
val_loss = 1.5 * np.exp(-epochs / 12) + 0.25 + 0.004 * np.maximum(0, epochs - 25) ** 1.3 + rng.normal(0, 0.03, 50)
ax = axes[0, 0]
ax.plot(epochs, train_loss, label="train", color="#D9A35F")
ax.plot(epochs, val_loss, label="validation", color="#B3261E")
best = val_loss.argmin()
ax.axvline(epochs[best], ls="--", color="gray"); ax.text(epochs[best] + 1, 1.2, f"best epoch {epochs[best]}", fontsize=8)
ax.set(title="Learning curves (overfitting after the best epoch)", xlabel="epoch", ylabel="loss"); ax.legend()

cm = np.array([[50, 4, 1], [6, 40, 9], [2, 7, 45]])
ax = axes[0, 1]
im = ax.imshow(cm, cmap="copper_r")
labels = ["cat", "dog", "bird"]
ax.set_xticks(range(3), labels); ax.set_yticks(range(3), labels)
for i in range(3):
    for j in range(3):
        ax.text(j, i, cm[i, j], ha="center", va="center", color="white" if cm[i, j] > 25 else "black")
ax.set(title="Confusion matrix", xlabel="predicted", ylabel="actual"); fig.colorbar(im, ax=ax)

X = np.vstack([rng.normal([-1, -1], 0.8, (80, 2)), rng.normal([1.2, 1], 0.8, (80, 2))]); y = np.r_[np.zeros(80), np.ones(80)]
Xb = np.c_[np.ones(160), X]; w = np.zeros(3)
for _ in range(500):
    w -= 0.5 * Xb.T @ (1 / (1 + np.exp(-Xb @ w)) - y) / 160
gx, gy = np.meshgrid(np.linspace(-4, 4, 200), np.linspace(-4, 4, 200))
prob = 1 / (1 + np.exp(-(w[0] + w[1] * gx + w[2] * gy)))
ax = axes[1, 0]
ax.contourf(gx, gy, prob, levels=20, cmap="RdBu_r", alpha=0.6)
ax.contour(gx, gy, prob, levels=[0.5], colors="black")
ax.scatter(X[:, 0], X[:, 1], c=y, cmap="RdBu_r", edgecolor="k", s=18)
ax.set_title("Decision boundary (logistic regression)")

features = ["visits", "age", "plan", "tenure", "region", "device"]
importance = np.array([0.31, 0.22, 0.18, 0.15, 0.09, 0.05])
order = np.argsort(importance)
ax = axes[1, 1]
ax.barh(np.array(features)[order], importance[order], color="#B3261E")
for i, v in enumerate(importance[order]):
    ax.text(v + 0.005, i, f"{v:.2f}", va="center", fontsize=8)
ax.set(title="Feature importance", xlabel="importance")
fig.tight_layout()
plt.show()
```

## Choosing the right chart

| Question | Chart |
|---|---|
| How does it change over time? | line |
| How do categories compare? | bar (sorted), horizontal for long labels |
| What's the distribution? | histogram, box/violin, KDE |
| How do two numbers relate? | scatter (+ hexbin for big data) |
| What's the composition? | stacked bar/area (pie only for 2–4 parts) |
| A matrix or correlations? | heatmap with a diverging map |
| Many variables at once? | small multiples (a subplot grid) |

## Tricks & tips

- Start every figure with `fig, ax = plt.subplots(figsize=(w, h))`.
- `layout="constrained"` (or `fig.tight_layout()`) fixes overlapping labels.
- `ax.set(title=…, xlabel=…, ylabel=…, xlim=…)` sets many properties in one call.
- Sort bar charts by value, and start bar axes at **zero**.
- Use `alpha` and small marker sizes for dense scatter plots, or `hexbin`.
- Label lines directly at their end (`ax.text`) instead of using a legend when there are few lines.
- `plt.close("all")` in scripts and loops.
- Colour-blind-safe palettes: `tab10`, `cividis`, `viridis`, or the Okabe–Ito colours.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Mixing `plt.*` and `ax.*` with several subplots | the OO API everywhere |
| 2 | `plt.title` vs `ax.set_title` naming confusion | `ax.set_*` methods |
| 3 | Overlapping labels and titles | `tight_layout()` / `layout="constrained"` |
| 4 | Figures never closed → memory leak | `plt.close(fig)` |
| 5 | Bar charts not starting at 0 exaggerate differences | `ax.set_ylim(0, …)` |
| 6 | Rainbow/jet colormaps | `viridis`/`cividis` |
| 7 | `axes[i]` on a 2-D grid → wrong object | `axes[r, c]` or `axes.flat` |
| 8 | Saving after `plt.show()` produces a blank file in some backends | `savefig` **before** `show` |
| 9 | Too many pie slices | a bar chart |
| 10 | Unlabelled axes and units | always set the labels with units |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
fig, axes = plt.subplots(2, 3)
print(type(axes).__name__, axes.shape, len(fig.axes))
```
What prints?
- [x] `ndarray (2, 3) 6`
- [ ] `list (2, 3) 6`
- [ ] `Axes (6,) 1`
`plt.subplots(nrows, ncols)` returns a **NumPy array** of Axes with shape `(2, 3)`. Use `axes.flat` to loop over them. With `(1, 1)` you get a single Axes object instead, unless you pass `squeeze=False`.
:::

:::quiz
```python
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
fig, ax = plt.subplots()
ax.plot([1, 2, 3], label="a")
ax.plot([3, 2, 1])
ax.bar([0, 1], [5, 6])
print(len(ax.lines), len(ax.patches), ax.get_legend())
```
What prints?
- [ ] `2 2 Legend`
- [x] `2 2 None`
- [ ] `3 2 None`
Each `plot` call adds one `Line2D` to `ax.lines`, and each bar is a `Rectangle` in `ax.patches`. Labels don't create a legend until you call `ax.legend()`, so `get_legend()` is `None`.
:::

:::quiz
```python
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
fig, ax = plt.subplots()
ax.set_xlim(0, 10)
ax.invert_yaxis()
ax.plot([0, 5], [1, 2])
print(tuple(map(float, ax.get_xlim())), ax.yaxis_inverted())
```
What prints?
- [x] `(0.0, 10.0) True`
- [ ] `(0.0, 5.0) True`
- [ ] `(-0.25, 5.25) False`
Setting limits explicitly **turns off autoscaling** for that axis, so plotting later doesn't change the x-range. The inverted y-axis stays inverted when autoscaling adds data.
:::

## Practice problems

:::problem basic | Your first complete chart | line, labels, legend, grid
Plot y = x², y = x³ and y = 2ˣ for x in [0, 5] on one Axes, with a title, axis labels, a legend, a light grid, and the y-axis limited to [0, 40].
:::solution
```python plot
import matplotlib.pyplot as plt
import numpy as np
x = np.linspace(0, 5, 100)
fig, ax = plt.subplots(figsize=(7, 4))
ax.plot(x, x ** 2, label="$x^2$", color="#D9A35F", lw=2)
ax.plot(x, x ** 3, label="$x^3$", color="#B3261E", lw=2)
ax.plot(x, 2 ** x, label="$2^x$", color="#5A3825", lw=2, ls="--")
ax.set(title="Polynomial vs exponential growth", xlabel="x", ylabel="y", ylim=(0, 40))
ax.legend()
ax.grid(alpha=0.3)
plt.show()
```
:::explain
One Axes, three `plot` calls, each with a `label` so the legend can find it. `ax.set(...)` sets the title, labels and limits together. `$...$` renders maths-style labels. Notice how x³ overtakes 2ˣ in this window, but 2ˣ wins eventually (try x up to 12).
:::end

:::problem basic | Sorted horizontal bar chart | barh, sorting, value labels
Given a dict of programming-language popularity scores, draw a horizontal bar chart sorted with the largest on top, with the value printed at the end of each bar and the top/right spines removed.
:::solution
```python plot
import matplotlib.pyplot as plt
scores = {"Python": 29.9, "JavaScript": 18.2, "Java": 12.1, "C++": 9.8, "Go": 6.1, "Rust": 4.9}
items = sorted(scores.items(), key=lambda kv: kv[1])          # ascending: barh draws bottom-up
names, vals = zip(*items)
fig, ax = plt.subplots(figsize=(7, 3.5))
bars = ax.barh(names, vals, color=["#B3261E" if n == "Python" else "#D9A35F" for n in names])
ax.bar_label(bars, fmt="%.1f", padding=3)
ax.spines[["top", "right"]].set_visible(False)
ax.set(title="Language popularity (%)", xlabel="share")
plt.show()
```
:::explain
`barh` draws the first item at the bottom, so sorting **ascending** puts the biggest bar on top. `bar_label` (Matplotlib 3.4+) prints the values. Highlighting one bar in red tells the reader what to focus on.
:::end

:::problem basic | Histogram comparison | hist, alpha, density
Compare two normal distributions (μ=0, σ=1 and μ=1.5, σ=0.7, 2000 samples each) as overlapping **density** histograms with 40 shared bins, and mark each mean with a vertical line.
:::solution
```python plot
import matplotlib.pyplot as plt
import numpy as np
rng = np.random.default_rng(0)
a, b = rng.normal(0, 1, 2000), rng.normal(1.5, 0.7, 2000)
bins = np.linspace(-4, 5, 41)                       # SHARED bin edges -> comparable bars
fig, ax = plt.subplots(figsize=(7, 3.8))
for data, color, name in [(a, "#D9A35F", "A"), (b, "#B3261E", "B")]:
    ax.hist(data, bins=bins, density=True, alpha=0.55, color=color, label=f"{name} (mean {data.mean():.2f})")
    ax.axvline(data.mean(), color=color, ls="--")
ax.set(title="Overlapping density histograms", xlabel="value", ylabel="density")
ax.legend()
plt.show()
```
:::explain
`density=True` normalises each histogram so its area is 1, which makes groups of different sizes comparable. Using the **same bin edges** for both is essential: otherwise the bars have different widths and can't be compared. Transparency (`alpha`) shows the overlap.
:::end

:::problem medium | Small multiples dashboard | subplots grid, sharey, axes.flat
Simulate monthly sales for 6 regions and draw a 2×3 grid of line charts with a **shared y-axis**, each titled by region, highlighting the best month with a red dot, and one overall title.
:::solution
```python plot
import matplotlib.pyplot as plt
import numpy as np
rng = np.random.default_rng(4)
regions = ["North", "South", "East", "West", "Central", "Coast"]
months = np.arange(1, 13)
fig, axes = plt.subplots(2, 3, figsize=(11, 5.5), sharex=True, sharey=True, layout="constrained")
for ax, region in zip(axes.flat, regions):
    sales = 100 + rng.normal(0, 8, 12).cumsum() + 15 * np.sin(months / 2)
    ax.plot(months, sales, color="#5A3825")
    best = sales.argmax()
    ax.scatter(months[best], sales[best], color="#B3261E", zorder=3)
    ax.set_title(region, fontsize=10)
    ax.grid(alpha=0.25)
fig.suptitle("Monthly sales by region (shared y-axis)")
fig.supxlabel("month"); fig.supylabel("units")
plt.show()
```
:::explain
**Small multiples** (the same chart repeated per group) are often clearer than one crowded chart with six lines. `sharey=True` puts every panel on the same scale, so heights are comparable at a glance. `axes.flat` iterates a 2-D grid of Axes in reading order, and `zorder=3` draws the dot above the line.
:::end

:::problem medium | Correlation heatmap from pandas | imshow, annotations, diverging colormap
Create a DataFrame with 5 correlated features, compute its correlation matrix, and plot an annotated heatmap with a diverging colormap centred on 0 (vmin=-1, vmax=1), feature names on both axes and a colorbar.
:::solution
```python plot
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
rng = np.random.default_rng(1)
base = rng.normal(size=300)
df = pd.DataFrame({"study_hrs": base, "score": base * 0.8 + rng.normal(0, 0.5, 300),
                   "sleep": rng.normal(size=300), "screen_time": -base * 0.6 + rng.normal(0, 0.8, 300),
                   "coffee": rng.normal(size=300) * 0.3 + base * 0.2})
corr = df.corr()
fig, ax = plt.subplots(figsize=(6.5, 5.5))
im = ax.imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1)
ax.set_xticks(range(len(corr)), corr.columns, rotation=40, ha="right")
ax.set_yticks(range(len(corr)), corr.columns)
for i in range(len(corr)):
    for j in range(len(corr)):
        v = corr.iloc[i, j]
        ax.text(j, i, f"{v:.2f}", ha="center", va="center", color="white" if abs(v) > 0.5 else "black", fontsize=9)
fig.colorbar(im, ax=ax, label="Pearson r")
ax.set_title("Correlation matrix")
fig.tight_layout()
plt.show()
```
:::explain
Correlations live in [-1, 1] with a meaningful centre at 0, so a **diverging** colormap with symmetric limits is the honest choice (red = positive, blue = negative). Switching the text colour based on |value| keeps the numbers readable on dark cells. `ha="right"` with rotation stops long labels colliding.
:::end

:::problem medium | Time series with rolling mean and annotated events | dates on the x-axis
Plot 365 days of a noisy random-walk metric with its 30-day rolling mean, shade a "campaign" period, annotate the maximum, and format the x-axis as abbreviated month names.
:::solution
```python plot
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np
import pandas as pd
rng = np.random.default_rng(9)
s = pd.Series(1000 + rng.normal(0, 15, 365).cumsum(), index=pd.date_range("2026-01-01", periods=365))
fig, ax = plt.subplots(figsize=(10, 4))
ax.plot(s.index, s, color="#D9A35F", lw=1, label="daily")
ax.plot(s.index, s.rolling(30).mean(), color="#B3261E", lw=2.5, label="30-day mean")
ax.axvspan(pd.Timestamp("2026-06-01"), pd.Timestamp("2026-07-15"), color="#F3E2C3", alpha=0.8, label="campaign")
peak = s.idxmax()
ax.annotate(f"peak {s.max():.0f}", xy=(peak, s.max()), xytext=(peak - pd.Timedelta(days=80), s.max() + 20),
            arrowprops=dict(arrowstyle="->"))
ax.xaxis.set_major_locator(mdates.MonthLocator())
ax.xaxis.set_major_formatter(mdates.DateFormatter("%b"))
ax.set(title="Daily metric, 2026", ylabel="value")
ax.legend(loc="lower left")
plt.show()
```
:::explain
Matplotlib understands datetime x-values directly. `matplotlib.dates` locators and formatters control where the ticks go (`MonthLocator`) and how they read (`%b` → Jan, Feb…). The rolling mean reveals the trend under the noise, and `axvspan` shades a time range to give context.
:::end

:::problem hard | Model diagnostics panel | GridSpec, residual analysis
Fit a straight line (with `np.polyfit`) to noisy data that's actually slightly quadratic. Build a 2×2 diagnostics panel: data + fit, residuals vs fitted (with a zero line), a residual histogram, and a Q-Q plot of the residuals against the normal distribution, all built with NumPy only.
:::solution
```python plot
import matplotlib.pyplot as plt
import numpy as np
from statistics import NormalDist
rng = np.random.default_rng(0)
x = np.linspace(0, 10, 120)
y = 2 + 1.5 * x + 0.12 * x ** 2 + rng.normal(0, 1.2, x.size)     # true relationship is curved
slope, intercept = np.polyfit(x, y, 1)
fitted = intercept + slope * x
resid = y - fitted

fig, axes = plt.subplots(2, 2, figsize=(10, 7.5), layout="constrained")
axes[0, 0].scatter(x, y, s=10, color="#5A3825", alpha=0.7)
axes[0, 0].plot(x, fitted, color="#B3261E", lw=2, label=f"y = {intercept:.2f} + {slope:.2f}x")
axes[0, 0].set_title("data + linear fit"); axes[0, 0].legend()

axes[0, 1].scatter(fitted, resid, s=10, color="#C4893A")
axes[0, 1].axhline(0, color="black", lw=1)
axes[0, 1].set(title="residuals vs fitted (a U-shape = missed curvature!)", xlabel="fitted", ylabel="residual")

axes[1, 0].hist(resid, bins=20, color="#D9A35F", edgecolor="white")
axes[1, 0].set_title("residual distribution")

z = np.sort((resid - resid.mean()) / resid.std())
theory = np.array([NormalDist().inv_cdf((i + 0.5) / len(z)) for i in range(len(z))])
axes[1, 1].scatter(theory, z, s=10, color="#B3261E")
axes[1, 1].plot([-3, 3], [-3, 3], color="black", lw=1)
axes[1, 1].set(title="normal Q-Q plot", xlabel="theoretical quantile", ylabel="sample quantile")
fig.suptitle(f"Regression diagnostics  (R² = {1 - resid.var() / y.var():.3f})")
plt.show()
```
:::explain
A high R² alone can hide a wrong model. The **residuals vs fitted** plot shows a clear U-shape, which means the line systematically misses the curvature, so you should add an x² term. The **Q-Q plot** compares sorted standardised residuals with normal quantiles (computed with the standard library's `NormalDist`), and points on the diagonal mean "roughly normal". This four-panel layout is the standard regression check.
:::end

:::problem hard | Visualise gradient descent on a loss surface | contour + path
Plot the contours of f(w₁, w₂) = (w₁ − 3)² + 10(w₂ + 1)² and overlay the paths taken by gradient descent with learning rates 0.02, 0.09 and 0.105, starting from (−4, 3). Show which one converges smoothly, which zig-zags, and which diverges.
:::solution
```python plot
import matplotlib.pyplot as plt
import numpy as np

def f(w1, w2): return (w1 - 3) ** 2 + 10 * (w2 + 1) ** 2
def grad(w): return np.array([2 * (w[0] - 3), 20 * (w[1] + 1)])

g1, g2 = np.meshgrid(np.linspace(-6, 8, 300), np.linspace(-5, 4, 300))
fig, ax = plt.subplots(figsize=(8, 5.5))
cs = ax.contour(g1, g2, f(g1, g2), levels=np.logspace(-0.5, 2.7, 15), cmap="copper")
ax.clabel(cs, fontsize=6, fmt="%.0f")
for lr, color in [(0.02, "#5F7A2E"), (0.09, "#C4893A"), (0.105, "#B3261E")]:
    w = np.array([-4.0, 3.0]); path = [w.copy()]
    for _ in range(40):
        w = w - lr * grad(w); path.append(w.copy())
        if np.abs(w).max() > 50: break
    p = np.array(path)
    final = f(*p[-1])
    ax.plot(p[:, 0], p[:, 1], "o-", ms=3, lw=1.2, color=color, label=f"lr={lr}: final loss {final:.2g}")
ax.plot(3, -1, "*", ms=15, color="black", label="minimum (3, -1)")
ax.set(xlim=(-6, 8), ylim=(-5, 4), xlabel="$w_1$", ylabel="$w_2$", title="Gradient descent on an elongated bowl")
ax.legend(fontsize=8, loc="upper right")
plt.show()
```
:::explain
The bowl is 10× steeper along w₂, so the safe learning rate is limited by that direction: the w₂ update multiplies the error by (1 − 20·lr) each step. At lr = 0.02 that factor is 0.6 (smooth but slow along w₁). At 0.09 it's −0.8 (it overshoots and zig-zags across the valley). At 0.105 it's −1.1, so |factor| > 1 and it **diverges**. Seeing the contours makes the classic "ill-conditioning" lesson obvious. It's why optimisers like Adam rescale each direction.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Multi-line chart with legend | Real-world task
Write `line_chart(x, series, title)`, where `series` is a dict mapping names to y-lists. Draw one line per series with markers, a title, x/y labels (`"x"` and `"value"`), a grid and a legend. Return `(fig, ax)`.
:::starter
```python norun
import matplotlib.pyplot as plt

def line_chart(x, series, title):
    pass
```
:::tests
```python norun
fig, ax = line_chart([1, 2, 3], {"train": [0.9, 0.5, 0.3], "val": [1.0, 0.7, 0.6]}, "Loss")
assert ax.get_title() == "Loss" and ax.get_xlabel() == "x" and ax.get_ylabel() == "value"
assert len(ax.lines) == 2
assert [t.get_text() for t in ax.get_legend().get_texts()] == ["train", "val"]
assert ax.lines[1].get_ydata().tolist() == [1.0, 0.7, 0.6]
assert all(l.get_marker() not in (None, "None", "") for l in ax.lines)
assert any(g.get_visible() for g in ax.get_xgridlines())
```
:::solution
```python plot
import matplotlib.pyplot as plt

def line_chart(x, series, title):
    fig, ax = plt.subplots(figsize=(6, 3.5))
    for name, ys in series.items():
        ax.plot(x, ys, marker="o", label=name)       # label= feeds the legend
    ax.set(title=title, xlabel="x", ylabel="value")
    ax.grid(alpha=0.3)
    ax.legend()
    fig.tight_layout()
    return fig, ax

fig, ax = line_chart([1, 2, 3, 4], {"train": [0.9, 0.5, 0.3, 0.2], "val": [1.0, 0.7, 0.6, 0.58]}, "Loss")
plt.show()
```
:::explain
This is the **object-oriented** API: create `fig, ax`, call methods on `ax`, and return both so the caller (or a test) can inspect or save them. Artists are introspectable: `ax.lines`, `ax.get_title()`, `legend.get_texts()`. That's how plotting code is unit-tested in real projects. `ax.set(...)` sets several properties in one call.
:::complexity
O(total points).
:::end

:::program basic | Sorted bar chart with value labels | Real-world task
Write `ranked_bars(data)`, where `data` maps a category to a value. Draw horizontal bars sorted with the **largest at the top**, label each bar with its value, and remove the top and right spines. Return `(fig, ax)`.
:::starter
```python norun
import matplotlib.pyplot as plt

def ranked_bars(data):
    pass
```
:::tests
```python norun
fig, ax = ranked_bars({"pandas": 42, "numpy": 57, "polars": 18, "duckdb": 25})
assert len(ax.patches) == 4
labels = [t.get_text() for t in ax.get_yticklabels()]
widths = [p.get_width() for p in ax.patches]
order = sorted(zip([p.get_y() for p in ax.patches], widths))      # bottom -> top
assert [w for _, w in order] == [18, 25, 42, 57]
assert sorted(t.get_text() for t in ax.texts) == ["18", "25", "42", "57"]
assert not ax.spines["top"].get_visible() and not ax.spines["right"].get_visible()
```
:::hint
Sort the items **ascending**, because `barh` draws the first bar at the bottom. `ax.bar_label(bars)` adds the value labels.
:::solution
```python plot
import matplotlib.pyplot as plt

def ranked_bars(data):
    items = sorted(data.items(), key=lambda kv: kv[1])     # ascending: barh draws bottom-up
    names, vals = zip(*items)
    fig, ax = plt.subplots(figsize=(6, 3))
    bars = ax.barh(names, vals, color="#b5462f")
    ax.bar_label(bars, padding=3)                          # one Text per bar
    ax.spines[["top", "right"]].set_visible(False)
    ax.set_xlabel("stars (k)")
    fig.tight_layout()
    return fig, ax

ranked_bars({"pandas": 42, "numpy": 57, "polars": 18, "duckdb": 25})
plt.show()
```
:::explain
Horizontal bars suit long category names. The classic trap is that `barh` places index 0 at the **bottom**, so sorting ascending puts the biggest bar on top (or sort descending and call `ax.invert_yaxis()`). `bar_label` (3.4+) replaces the old manual loop of `ax.text` calls. Removing chart junk (the extra spines) is a quick readability win.
:::complexity
O(n log n).
:::end

:::program medium | Small multiples from a DataFrame | Real-world task
Write `small_multiples(df, ncols=3)`: one line plot per numeric column on a grid with a **shared y-axis**, each titled with the column name, and the unused panels hidden. Return `(fig, axes)`, where axes is the 2-D array.
:::starter
```python norun
import math
import matplotlib.pyplot as plt

def small_multiples(df, ncols=3):
    pass
```
:::tests
```python norun
import numpy as np, pandas as pd
df = pd.DataFrame(np.arange(40).reshape(8, 5), columns=list("abcde"))
df["label"] = "x"
fig, axes = small_multiples(df, ncols=3)
assert axes.shape == (2, 3)
vis = [ax for ax in axes.flat if ax.get_visible()]
assert [ax.get_title() for ax in vis] == ["a", "b", "c", "d", "e"]
assert not axes.flat[5].get_visible()
assert vis[0].get_shared_y_axes().joined(vis[0], vis[4])
assert all(len(ax.lines) == 1 for ax in vis)
```
:::solution
```python plot
import math
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

def small_multiples(df, ncols=3):
    cols = df.select_dtypes("number").columns
    nrows = math.ceil(len(cols) / ncols)
    fig, axes = plt.subplots(nrows, ncols, sharey=True, squeeze=False,
                             figsize=(3 * ncols, 2.2 * nrows))
    for ax, col in zip(axes.flat, cols):
        ax.plot(df.index, df[col])
        ax.set_title(col)
    for ax in axes.flat[len(cols):]:
        ax.set_visible(False)                  # hide the leftover panels
    fig.tight_layout()
    return fig, axes

rng = np.random.default_rng(0)
small_multiples(pd.DataFrame(rng.normal(size=(30, 5)).cumsum(0), columns=list("abcde")))
plt.show()
```
:::explain
**Small multiples** (one tiny chart per series, on shared axes) are easier to compare than five overlapping lines. `squeeze=False` guarantees a 2-D array even for one row, so `axes.flat` always works. `sharey=True` makes the panels comparable at a glance. `zip` stops at the shorter sequence, and the leftover panels are hidden rather than left as empty boxes. `select_dtypes("number")` skips the text column.
:::complexity
O(cells).
:::end

:::program hard | Annotated confusion-matrix heatmap | ML task
Write `confusion_heatmap(cm, labels)`. Draw `cm` (a 2-D int array) with `imshow`, add a colorbar, put the class names on both axes, and write each count in its cell, in **white on dark cells and black on light ones** (threshold: half the maximum). Return `(fig, ax)`.
:::starter
```python norun
import numpy as np
import matplotlib.pyplot as plt

def confusion_heatmap(cm, labels):
    pass
```
:::tests
```python norun
import numpy as np
from matplotlib.colors import to_hex
cm = np.array([[50, 2, 0], [5, 40, 5], [0, 10, 30]])
fig, ax = confusion_heatmap(cm, ["cat", "dog", "bird"])
assert len(ax.images) == 1 and len(fig.axes) == 2                      # heatmap + colorbar
assert [t.get_text() for t in ax.get_xticklabels()] == ["cat", "dog", "bird"]
assert [t.get_text() for t in ax.get_yticklabels()] == ["cat", "dog", "bird"]
texts = {(round(t.get_position()[1]), round(t.get_position()[0])): t for t in ax.texts}
assert len(texts) == 9 and texts[(1, 2)].get_text() == "5"
assert to_hex(texts[(0, 0)].get_color()) == "#ffffff" and to_hex(texts[(0, 1)].get_color()) == "#000000"
assert ax.get_xlabel() == "predicted" and ax.get_ylabel() == "actual"
```
:::hint
`im = ax.imshow(cm, cmap="Reds")`, `fig.colorbar(im, ax=ax)`, then `ax.set_xticks(range(n), labels=labels)`. Loop over `np.ndindex(cm.shape)` and call `ax.text(j, i, ...)`. Note that x is the **column**.
:::solution
```python plot
import numpy as np
import matplotlib.pyplot as plt

def confusion_heatmap(cm, labels):
    cm = np.asarray(cm)
    fig, ax = plt.subplots(figsize=(4.5, 4))
    im = ax.imshow(cm, cmap="Reds")
    fig.colorbar(im, ax=ax, fraction=0.046)
    n = len(labels)
    ax.set_xticks(range(n), labels=labels)
    ax.set_yticks(range(n), labels=labels)
    ax.set(xlabel="predicted", ylabel="actual", title="Confusion matrix")
    threshold = cm.max() / 2
    for i, j in np.ndindex(cm.shape):                 # row i = y, column j = x
        ax.text(j, i, str(cm[i, j]), ha="center", va="center",
                color="white" if cm[i, j] > threshold else "black")
    fig.tight_layout()
    return fig, ax

confusion_heatmap(np.array([[50, 2, 0], [5, 40, 5], [0, 10, 30]]), ["cat", "dog", "bird"])
plt.show()
```
:::explain
`imshow` draws cell `[i, j]` centred at **x = j, y = i** with the y-axis pointing down, so annotations must use `ax.text(j, i, …)`. Swapping them is the classic bug, and the test checks the text at row 1, column 2. The colorbar is a second Axes on the figure. Choosing the text colour by a threshold keeps the numbers readable on both pale and saturated cells, and it's what `ConfusionMatrixDisplay` does internally.
:::complexity
O(n²) artists.
:::end
