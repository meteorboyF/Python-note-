# Practice Set · NumPy → Pandas → Matplotlib

Sixteen mini data projects that all follow the **same three-step workflow**, the shape of real analysis scripts:

1. **NumPy**: put the raw numbers in an array and compute (totals with `axis=1`, per-column stats with `axis=0`, element-wise maths).
2. **Pandas**: put the results in a `DataFrame` named **`df`** with the requested columns.
3. **Matplotlib**: plot the requested chart.

The tests check your `df` values **and inspect your chart** (bar heights, line data, pie wedges, histogram bins), so **▶ Run tests** tells you which step is off. Use the **👣 Step by step** view in the solutions to watch the arrays, the DataFrame and the figure build up line by line.

:::trap The 4 most common mistakes (all from real attempts)
1. **`scores = [85, 90], [88, 76]`** makes a *tuple of lists*. Wrap the data: `np.array([[85, 90], [88, 76]])`.
2. **`axis`**: `axis=1` goes **across a row** (one result per row: per student or per store), and `axis=0` goes **down a column** (one result per column: per subject or per month).
3. **`pd.DataFrame`** has a capital **D** and **F**: `pd.DataFrame(arr, columns=[...])`.
4. Plot **columns**, not names: `plt.bar(df["Student"], df["Average"])`, not `["Average"]`. Finish with `plt.show()`.
:::

Need a refresher? See [NumPy](#/t/numpy), [Pandas I](#/t/pandas-basics) and [Matplotlib](#/t/matplotlib).

## Problems

:::program basic | Student averages (the worked example) | Practice set
Scores of 5 students in 3 exams. Compute each student's average with NumPy, build `df` with columns `["Exam1", "Exam2", "Exam3", "Student", "Average"]`, and plot a **bar chart** of Student vs Average.

Expected averages: `[84.33, 85.33, 86.67, 68.33, 85.0]` (rounded)
:::starter
```python norun
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

data = [[85, 90, 78], [88, 76, 92], [95, 80, 85], [70, 60, 75], [82, 85, 88]]
students = ["Alice", "Bob", "Charlie", "David", "Eva"]
# Write your code here (name your DataFrame df)

```
:::tests
```python norun
import numpy as np, matplotlib.pyplot as plt
assert list(df.columns) == ["Exam1", "Exam2", "Exam3", "Student", "Average"]
assert np.allclose(df["Average"], [84.333, 85.333, 86.667, 68.333, 85.0], atol=0.01)
ax = plt.gca()
assert len(ax.patches) == 5
assert np.allclose([p.get_height() for p in ax.patches], df["Average"])
```
:::solution
```python plot
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

scores = np.array([[85, 90, 78], [88, 76, 92], [95, 80, 85], [70, 60, 75], [82, 85, 88]])
students = ["Alice", "Bob", "Charlie", "David", "Eva"]

averages = np.mean(scores, axis=1)            # axis=1: across each row -> one value per student

df = pd.DataFrame(scores, columns=["Exam1", "Exam2", "Exam3"])
df["Student"] = students
df["Average"] = averages
print(df.round(2))

plt.bar(df["Student"], df["Average"], color="#b5462f")
plt.title("Average Student Scores")
plt.xlabel("Student")
plt.ylabel("Average Score")
plt.show()
```
:::explain
This is the template for every problem below. **`axis=1`** collapses the columns, giving one average per row (student). New DataFrame columns are added by **assignment** `df["Average"] = ...`, and the lengths must match the number of rows. `plt.bar(x, heights)` draws one bar per student.
:::end

:::program basic | Store monthly sales (bar chart) | Practice set
4 stores × 3 months of sales (in $1000s). Compute the **total per store**, build `df` with `["Jan", "Feb", "Mar", "Store", "Total"]`, and draw a bar chart of Store vs Total.

Expected totals: `[400, 600, 300, 520]`
:::starter
```python norun
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

sales = [[120, 150, 130], [200, 180, 220], [90, 110, 100], [160, 170, 190]]
stores = ["Store A", "Store B", "Store C", "Store D"]
# Write your code here

```
:::tests
```python norun
import matplotlib.pyplot as plt
assert list(df.columns) == ["Jan", "Feb", "Mar", "Store", "Total"]
assert df["Total"].tolist() == [400, 600, 300, 520]
assert [p.get_height() for p in plt.gca().patches] == [400, 600, 300, 520]
```
:::solution
```python plot
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

sales = np.array([[120, 150, 130], [200, 180, 220], [90, 110, 100], [160, 170, 190]])
stores = ["Store A", "Store B", "Store C", "Store D"]

totals = sales.sum(axis=1)                     # per store (row)

df = pd.DataFrame(sales, columns=["Jan", "Feb", "Mar"])
df["Store"] = stores
df["Total"] = totals
print(df)

plt.bar(df["Store"], df["Total"], color="#b5462f")
plt.title("Total Sales per Store (Q1)")
plt.ylabel("Sales ($1000s)")
plt.show()
```
:::explain
`sales.sum(axis=1)` adds across Jan + Feb + Mar for each store. `axis=0` would instead give monthly totals across all stores. Store B is the clear leader, and a bar chart is the right choice for comparing categories.
:::end

:::program basic | Weekly temperature tracker (line plot) | Practice set
Morning and evening temperatures for 7 days. Compute each day's **average** and **range** (evening − morning), build `df` with `["Morning", "Evening", "Day", "Average", "Range"]`, and draw a **line chart with markers** of Day vs Average.

Expected averages `[28.0, 29.5, 26.5, 30.5, 31.5, 29.0, 27.5]`, ranges `[8, 9, 7, 9, 9, 8, 7]`
:::starter
```python norun
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

temps = [[24, 32], [25, 34], [23, 30], [26, 35], [27, 36], [25, 33], [24, 31]]
days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
# Write your code here

```
:::tests
```python norun
import matplotlib.pyplot as plt
assert list(df.columns) == ["Morning", "Evening", "Day", "Average", "Range"]
assert df["Average"].tolist() == [28.0, 29.5, 26.5, 30.5, 31.5, 29.0, 27.5]
assert df["Range"].tolist() == [8, 9, 7, 9, 9, 8, 7]
line = plt.gca().lines[0]
assert list(line.get_ydata()) == df["Average"].tolist() and line.get_marker() not in (None, "None", "")
```
:::solution
```python plot
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

temps = np.array([[24, 32], [25, 34], [23, 30], [26, 35], [27, 36], [25, 33], [24, 31]])
days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

avg = temps.mean(axis=1)
rng = temps[:, 1] - temps[:, 0]                # column 1 minus column 0, element-wise

df = pd.DataFrame(temps, columns=["Morning", "Evening"])
df["Day"], df["Average"], df["Range"] = days, avg, rng
print(df)

plt.plot(df["Day"], df["Average"], marker="o", color="#b5462f")
plt.title("Average Daily Temperature")
plt.ylabel("°C")
plt.grid(alpha=0.3)
plt.show()
```
:::explain
**Column slicing** `temps[:, 1]` means "all rows, column 1" (every evening reading). Subtracting two columns is element-wise, with no loop. Use a line chart for values that change **over time**. `marker="o"` puts a dot on each day.
:::end

:::program basic | Employee sales & bonus (horizontal bars) | Practice set
5 employees × 4 quarters. Compute `Total_Sales` and a 10% `Bonus`, build `df` with `["Q1", "Q2", "Q3", "Q4", "Employee", "Total_Sales", "Bonus"]`, and draw a **horizontal** bar chart (`plt.barh`) of Employee vs Bonus.

Expected bonuses: `[10.0, 16.0, 6.0, 12.0, 20.0]`
:::starter
```python norun
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

q = [[20, 25, 30, 25], [40, 35, 45, 40], [15, 20, 10, 15], [30, 30, 35, 25], [50, 45, 55, 50]]
employees = ["Arif", "Bina", "Chandan", "Dina", "Emon"]
# Write your code here

```
:::tests
```python norun
import numpy as np, matplotlib.pyplot as plt
assert list(df.columns) == ["Q1", "Q2", "Q3", "Q4", "Employee", "Total_Sales", "Bonus"]
assert df["Total_Sales"].tolist() == [100, 160, 60, 120, 200]
assert np.allclose(df["Bonus"], [10.0, 16.0, 6.0, 12.0, 20.0])
assert np.allclose([p.get_width() for p in plt.gca().patches], [10.0, 16.0, 6.0, 12.0, 20.0])
```
:::solution
```python plot
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

q = np.array([[20, 25, 30, 25], [40, 35, 45, 40], [15, 20, 10, 15], [30, 30, 35, 25], [50, 45, 55, 50]])
employees = ["Arif", "Bina", "Chandan", "Dina", "Emon"]

total = q.sum(axis=1)
bonus = total * 0.10                            # scalar * array: broadcasting

df = pd.DataFrame(q, columns=["Q1", "Q2", "Q3", "Q4"])
df["Employee"], df["Total_Sales"], df["Bonus"] = employees, total, bonus
print(df)

plt.barh(df["Employee"], df["Bonus"], color="#c4893a")
plt.title("Bonus per Employee ($1000s)")
plt.xlabel("Bonus")
plt.show()
```
:::explain
`total * 0.10` multiplies **every** element (broadcasting a scalar). In `barh` the bar's length is its **width** (that's what the test reads), and the categories go on the y-axis. Horizontal bars are easier to read when the labels are long names.
:::end

:::program basic | Product revenue & profit | Practice set
Given `units`, `price` and `cost` arrays, compute `Revenue = units × price` and `Profit = units × (price − cost)`. Build `df` with `["Product", "Units", "Revenue", "Profit"]` and draw a bar chart of Product vs Profit.

Expected revenue `[500, 750, 640, 800, 900]`, profit `[200, 300, 240, 360, 360]`
:::starter
```python norun
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

units = [50, 30, 80, 20, 60]
price = [10, 25, 8, 40, 15]
cost = [6, 15, 5, 22, 9]
products = ["Pen", "Notebook", "Eraser", "Bag", "Bottle"]
# Write your code here

```
:::tests
```python norun
import matplotlib.pyplot as plt
assert list(df.columns) == ["Product", "Units", "Revenue", "Profit"]
assert df["Revenue"].tolist() == [500, 750, 640, 800, 900]
assert df["Profit"].tolist() == [200, 300, 240, 360, 360]
assert [p.get_height() for p in plt.gca().patches] == [200, 300, 240, 360, 360]
```
:::solution
```python plot
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

units, price, cost = np.array([50, 30, 80, 20, 60]), np.array([10, 25, 8, 40, 15]), np.array([6, 15, 5, 22, 9])
products = ["Pen", "Notebook", "Eraser", "Bag", "Bottle"]

revenue = units * price                       # element-wise, no loop
profit = units * (price - cost)

df = pd.DataFrame({"Product": products, "Units": units, "Revenue": revenue, "Profit": profit})
print(df)

plt.bar(df["Product"], df["Profit"], color="#b5462f")
plt.title("Profit per Product")
plt.show()
```
:::explain
With plain lists, `units * price` would be an error (you can't multiply a list by a list). NumPy arrays multiply **element-wise**. Building the DataFrame from a **dict of columns** `{"Product": ..., ...}` sets the column order in one step.
:::end

:::program basic | Subject difficulty (axis=0) | Practice set
5 students × 4 subjects. Use `axis=0` to compute each subject's **Mean** and **Std** (population). Build a summary `df` with `["Subject", "Mean", "Std"]` and draw a bar chart of Subject vs Mean.

Expected means: `[77.0, 75.0, 78.0, 85.0]`
:::starter
```python norun
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

marks = [[80, 70, 90, 85], [60, 65, 70, 75], [90, 85, 80, 95], [70, 75, 65, 80], [85, 80, 85, 90]]
subjects = ["Math", "Physics", "Chem", "Bio"]
# Write your code here

```
:::tests
```python norun
import numpy as np, matplotlib.pyplot as plt
assert list(df.columns) == ["Subject", "Mean", "Std"]
assert df["Mean"].tolist() == [77.0, 75.0, 78.0, 85.0]
assert np.allclose(df["Std"], np.std(np.array(marks), axis=0), atol=0.01)
assert [p.get_height() for p in plt.gca().patches] == [77.0, 75.0, 78.0, 85.0]
```
:::solution
```python plot
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

marks = np.array([[80, 70, 90, 85], [60, 65, 70, 75], [90, 85, 80, 95], [70, 75, 65, 80], [85, 80, 85, 90]])
subjects = ["Math", "Physics", "Chem", "Bio"]

means = marks.mean(axis=0)                    # axis=0: down each column -> one value per subject
stds = marks.std(axis=0)                      # population std (ddof=0)

df = pd.DataFrame({"Subject": subjects, "Mean": means, "Std": stds.round(2)})
print(df)

plt.bar(df["Subject"], df["Mean"], yerr=df["Std"], capsize=4, color="#c4893a")
plt.title("Mean score per subject (± std)")
plt.show()
```
:::explain
Here the result is **per column**, so it's **`axis=0`**. A larger **std** means scores are more spread out (less consistent). `yerr=` adds error bars, a nice touch. Note that pandas' `df.std()` defaults to the *sample* std (ddof=1), while NumPy defaults to population (ddof=0). The test uses NumPy's.
:::end

:::program basic | Study hours vs score (scatter) | Practice set
Compute the **mean score** and the **correlation coefficient** (`np.corrcoef`). Build `df` with `["Hours", "Score", "Passed"]` (Passed means Score ≥ 60) and draw a **scatter plot**. Store the mean in `mean_score` and the correlation in `corr`.

Expected mean score: `72.5`
:::starter
```python norun
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

hours = [1.5, 2.0, 3.5, 4.0, 5.5, 6.0, 7.5, 8.0]
scores = [52, 50, 68, 66, 82, 78, 94, 90]
# Write your code here

```
:::tests
```python norun
import numpy as np, matplotlib.pyplot as plt
assert mean_score == 72.5
assert abs(corr - np.corrcoef(hours, scores)[0, 1]) < 1e-12 and corr > 0.95
assert list(df.columns) == ["Hours", "Score", "Passed"]
assert df["Passed"].tolist() == [False, False, True, True, True, True, True, True]
assert len(plt.gca().collections) >= 1 and len(plt.gca().collections[0].get_offsets()) == 8
```
:::solution
```python plot
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

hours = np.array([1.5, 2.0, 3.5, 4.0, 5.5, 6.0, 7.5, 8.0])
scores = np.array([52, 50, 68, 66, 82, 78, 94, 90])

mean_score = scores.mean()
corr = np.corrcoef(hours, scores)[0, 1]       # a 2x2 matrix; [0, 1] is hours-vs-scores
print("Mean:", mean_score, "Correlation:", round(corr, 3))

df = pd.DataFrame({"Hours": hours, "Score": scores, "Passed": scores >= 60})
print(df)

plt.scatter(df["Hours"], df["Score"], c=df["Passed"].map({True: "#3f7d4e", False: "#b5462f"}))
plt.title(f"Hours vs Score (r = {corr:.2f})")
plt.xlabel("Study hours"); plt.ylabel("Score")
plt.show()
```
:::explain
`np.corrcoef(a, b)` returns a **2×2 correlation matrix**: the diagonal is 1 (each variable with itself), and `[0, 1]` is the value you want. An r near +1 means more hours go with higher scores. `scores >= 60` produces a **boolean array** in one go, which becomes the `Passed` column. Scatter points are stored in `ax.collections`, and that's what the test inspects.
:::end

:::program basic | Cricket batting statistics | Practice set
4 players × 5 matches. Compute each player's `Total`, `Average` and `Best` (`axis=1`), build `df` with `["M1", "M2", "M3", "M4", "M5", "Player", "Total", "Average", "Best"]`, and draw a bar chart of Player vs Total.

Expected totals `[240, 100, 320, 200]`, best `[85, 30, 90, 80]`
:::starter
```python norun
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

runs = [[45, 60, 12, 85, 38], [10, 25, 30, 15, 20], [70, 55, 90, 40, 65], [30, 0, 50, 40, 80]]
players = ["Tamim", "Shakib", "Mushfiq", "Litton"]
# Write your code here

```
:::tests
```python norun
import matplotlib.pyplot as plt
assert list(df.columns) == ["M1", "M2", "M3", "M4", "M5", "Player", "Total", "Average", "Best"]
assert df["Total"].tolist() == [240, 100, 320, 200]
assert df["Average"].tolist() == [48.0, 20.0, 64.0, 40.0]
assert df["Best"].tolist() == [85, 30, 90, 80]
assert [p.get_height() for p in plt.gca().patches] == [240, 100, 320, 200]
```
:::solution
```python plot
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

runs = np.array([[45, 60, 12, 85, 38], [10, 25, 30, 15, 20], [70, 55, 90, 40, 65], [30, 0, 50, 40, 80]])
players = ["Tamim", "Shakib", "Mushfiq", "Litton"]

df = pd.DataFrame(runs, columns=[f"M{i}" for i in range(1, 6)])   # M1..M5 without typing them
df["Player"] = players
df["Total"] = runs.sum(axis=1)
df["Average"] = runs.mean(axis=1)
df["Best"] = runs.max(axis=1)
print(df)

plt.bar(df["Player"], df["Total"], color="#b5462f")
plt.title("Total runs (5 matches)")
plt.show()
```
:::explain
`sum`, `mean` and `max` all take the same `axis=1`, giving one value per player. Generating column names with a comprehension (`f"M{i}"`) avoids typos. Mushfiq has the highest total, and the bar chart makes that obvious at a glance.
:::end

:::program basic | Factory defect rate (pie chart) | Practice set
Compute `Defect_Rate_%` = defective / produced × 100. Build `df` with `["Shift", "Produced", "Defective", "Defect_Rate_%"]` and draw a **pie chart** of each shift's share of the total defective units, with percentages (`autopct`).

Expected defect rates: `[3.0, 5.0, 3.0, 5.0]`
:::starter
```python norun
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

produced = [500, 600, 400, 500]
defective = [15, 30, 12, 25]
shifts = ["Morning", "Afternoon", "Evening", "Night"]
# Write your code here

```
:::tests
```python norun
import matplotlib.pyplot as plt
assert list(df.columns) == ["Shift", "Produced", "Defective", "Defect_Rate_%"]
assert df["Defect_Rate_%"].tolist() == [3.0, 5.0, 3.0, 5.0]
ax = plt.gca()
assert len(ax.patches) == 4
assert sum("%" in t.get_text() for t in ax.texts) == 4
```
:::solution
```python plot
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

produced, defective = np.array([500, 600, 400, 500]), np.array([15, 30, 12, 25])
shifts = ["Morning", "Afternoon", "Evening", "Night"]

rate = defective / produced * 100

df = pd.DataFrame({"Shift": shifts, "Produced": produced, "Defective": defective, "Defect_Rate_%": rate})
print(df)

plt.pie(df["Defective"], labels=df["Shift"], autopct="%1.1f%%", startangle=90,
        colors=["#b5462f", "#c4893a", "#e0b484", "#7a3b2e"])
plt.title("Share of defective units by shift")
plt.axis("equal")                              # a round pie, not an oval
plt.show()
```
:::explain
`autopct="%1.1f%%"` writes each slice's percentage. The doubled `%%` prints a literal % sign. A pie shows **parts of a whole**: here, the total defective units. The **rate** (3% vs 5%) is a different question, and comparing rates needs a bar chart. Choosing the chart that answers *your* question is the real skill.
:::end

:::program basic | Fitness step tracker (line + goal line) | Practice set
Compute the weekly `total`, the daily `avg` (2 decimals), and a `Status` column ("Goal Met" if steps ≥ 8000, else "Below Goal") using **`np.where`**. Build `df` with `["Day", "Steps", "Status"]`, then draw a line chart plus a dashed **goal line** at 8000 (`plt.axhline`).

Expected: `total = 59900`, `avg = 8557.14`
:::starter
```python norun
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

steps = [6500, 8200, 10500, 7400, 12000, 9500, 5800]
days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
# Write your code here

```
:::tests
```python norun
import matplotlib.pyplot as plt
assert total == 59900 and avg == 8557.14
assert list(df.columns) == ["Day", "Steps", "Status"]
assert df["Status"].tolist() == ["Below Goal", "Goal Met", "Goal Met", "Below Goal", "Goal Met", "Goal Met", "Below Goal"]
ys = [list(l.get_ydata()) for l in plt.gca().lines]
assert steps in ys or [int(v) for v in ys[0]] == steps
assert any(len(set(y)) == 1 and y[0] == 8000 for y in ys)
```
:::solution
```python plot
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

steps = [6500, 8200, 10500, 7400, 12000, 9500, 5800]
days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
arr = np.array(steps)

total = int(arr.sum())
avg = round(float(arr.mean()), 2)
status = np.where(arr >= 8000, "Goal Met", "Below Goal")    # vectorised if/else

df = pd.DataFrame({"Day": days, "Steps": arr, "Status": status})
print(df, "\nTotal:", total, "Avg:", avg)

plt.plot(df["Day"], df["Steps"], marker="o", color="#b5462f", label="steps")
plt.axhline(8000, linestyle="--", color="#3f7d4e", label="goal")
plt.legend()
plt.title("Daily steps")
plt.show()
```
:::explain
**`np.where(condition, a, b)`** is an if/else applied to every element at once, the vectorised replacement for a loop. `plt.axhline(y)` draws a horizontal line across the whole axes, a reference line that makes "above or below goal" readable instantly. The tests find it as a line whose y-values are all 8000.
:::end

:::program basic | Monthly expense breakdown (pie) | Practice set
4 months × 3 categories (Rent, Food, Transport). Compute `monthly_total` (`axis=1`) and `category_total` (`axis=0`). Build `df` with `["Rent", "Food", "Transport", "Month", "Monthly_Total"]` and draw a pie of the 3 category totals.

Expected monthly `[19000, 20000, 20200, 19300]`, category `[48000, 21700, 8800]`
:::starter
```python norun
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

expenses = [[12000, 5000, 2000], [12000, 5500, 2500], [12000, 6000, 2200], [12000, 5200, 2100]]
months = ["Jan", "Feb", "Mar", "Apr"]
# Write your code here

```
:::tests
```python norun
import matplotlib.pyplot as plt
assert list(monthly_total) == [19000, 20000, 20200, 19300]
assert list(category_total) == [48000, 21700, 8800]
assert list(df.columns) == ["Rent", "Food", "Transport", "Month", "Monthly_Total"]
assert len(plt.gca().patches) == 3
```
:::solution
```python plot
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

expenses = np.array([[12000, 5000, 2000], [12000, 5500, 2500], [12000, 6000, 2200], [12000, 5200, 2100]])
months = ["Jan", "Feb", "Mar", "Apr"]

monthly_total = expenses.sum(axis=1)          # one total per month (row)
category_total = expenses.sum(axis=0)         # one total per category (column)

df = pd.DataFrame(expenses, columns=["Rent", "Food", "Transport"])
df["Month"], df["Monthly_Total"] = months, monthly_total
print(df, "\n", category_total)

plt.pie(category_total, labels=["Rent", "Food", "Transport"], autopct="%1.1f%%",
        colors=["#7a3b2e", "#c4893a", "#e0b484"])
plt.title("Where the money went (4 months)")
plt.axis("equal")
plt.show()
```
:::explain
This is the clearest illustration of **axis**: on the same array, `axis=1` gives per-month (row) totals and `axis=0` gives per-category (column) totals. Rent alone is over 60% of spending, which is exactly the kind of insight a pie chart is good at.
:::end

:::program basic | Website conversion rate (line) | Practice set
Compute `Conversion_Rate` = purchases / visitors × 100. Build `df` with `["Day", "Visitors", "Purchases", "Conversion_Rate"]` and draw a line chart of Day vs Conversion_Rate.

Expected rates: `[5.0, 6.0, 6.0, 5.0, 6.0, 7.0]`
:::starter
```python norun
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

visitors = [1000, 1200, 1500, 1300, 1800, 2000]
purchases = [50, 72, 90, 65, 108, 140]
days = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6"]
# Write your code here

```
:::tests
```python norun
import numpy as np, matplotlib.pyplot as plt
assert list(df.columns) == ["Day", "Visitors", "Purchases", "Conversion_Rate"]
assert np.allclose(df["Conversion_Rate"], [5.0, 6.0, 6.0, 5.0, 6.0, 7.0])
assert np.allclose(plt.gca().lines[0].get_ydata(), [5.0, 6.0, 6.0, 5.0, 6.0, 7.0])
```
:::solution
```python plot
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

visitors, purchases = np.array([1000, 1200, 1500, 1300, 1800, 2000]), np.array([50, 72, 90, 65, 108, 140])
days = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6"]

rate = purchases / visitors * 100

df = pd.DataFrame({"Day": days, "Visitors": visitors, "Purchases": purchases, "Conversion_Rate": rate})
print(df)

plt.plot(df["Day"], df["Conversion_Rate"], marker="o", color="#b5462f")
plt.ylabel("Conversion rate (%)")
plt.title("Daily conversion rate")
plt.ylim(0, 8)
plt.show()
```
:::explain
Element-wise division turns two arrays into a **rate** in one line. Visitors keep growing, but the rate shows whether the site is actually getting *better* at selling (day 6: 7%). `np.allclose` is used in the tests because floating-point division can leave tiny rounding differences.
:::end

:::program medium | Sensor readings distribution (histogram) | Practice set
`np.random.seed(42)`, then generate 100 normal readings (mean 50, std 5). Compute `mean`, `median`, `std` and `count_above` (readings > 55). Put the readings in `df` (column `"Reading"`), print the rows above 55, and draw a **histogram** with 10 bins.
:::starter
```python norun
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Write your code here

```
:::tests
```python norun
import numpy as np, matplotlib.pyplot as plt
assert list(df.columns) == ["Reading"] and len(df) == 100
np.random.seed(42); ref = np.random.normal(50, 5, 100)
assert np.allclose(df["Reading"], ref)
assert abs(mean - ref.mean()) < 1e-9 and abs(median - np.median(ref)) < 1e-9 and abs(std - ref.std()) < 1e-9
assert count_above == int((ref > 55).sum())
assert len(plt.gca().patches) == 10
```
:::solution
```python plot
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

np.random.seed(42)                             # same "random" numbers every run
readings = np.random.normal(50, 5, 100)

mean, median, std = readings.mean(), np.median(readings), readings.std()
count_above = int((readings > 55).sum())       # True counts as 1
print(f"mean={mean:.2f} median={median:.2f} std={std:.2f} above55={count_above}")

df = pd.DataFrame({"Reading": readings})
print(df[df["Reading"] > 55].round(2))         # boolean filtering

plt.hist(df["Reading"], bins=10, color="#c4893a", edgecolor="#2b1a10")
plt.axvline(55, color="#b5462f", linestyle="--", label="> 55")
plt.legend(); plt.title("Sensor readings")
plt.show()
```
:::explain
A **seed** makes random numbers reproducible, which is essential for debugging and for tests. `(readings > 55).sum()` counts the matches because True is 1, and the same mask filters the DataFrame. A histogram shows the **shape** of a distribution, and here you should see the bell curve around 50. Mean ≈ median is the hint that it's symmetric.
:::end

:::program basic | Car fuel efficiency (sorted bars) | Practice set
Compute `Mileage_kmL` = distance / fuel. Build `df` with `["Car", "Distance_km", "Fuel_L", "Mileage_kmL"]` **sorted by mileage, highest first**, and draw a bar chart from the sorted frame.

Expected mileages (unsorted order): `[15.0, 13.0, 15.0, 12.0]`
:::starter
```python norun
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

distance_km = [450, 520, 390, 600]
fuel_liters = [30, 40, 26, 50]
cars = ["Sedan", "SUV", "Hatchback", "Van"]
# Write your code here

```
:::tests
```python norun
import matplotlib.pyplot as plt
assert list(df.columns) == ["Car", "Distance_km", "Fuel_L", "Mileage_kmL"]
assert df["Mileage_kmL"].tolist() == [15.0, 15.0, 13.0, 12.0]
assert set(df["Car"][:2]) == {"Sedan", "Hatchback"} and list(df["Car"][2:]) == ["SUV", "Van"]
assert [p.get_height() for p in plt.gca().patches] == [15.0, 15.0, 13.0, 12.0]
```
:::solution
```python plot
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

distance_km, fuel_liters = np.array([450, 520, 390, 600]), np.array([30, 40, 26, 50])
cars = ["Sedan", "SUV", "Hatchback", "Van"]

df = pd.DataFrame({"Car": cars, "Distance_km": distance_km, "Fuel_L": fuel_liters,
                   "Mileage_kmL": distance_km / fuel_liters})
df = df.sort_values("Mileage_kmL", ascending=False, kind="stable").reset_index(drop=True)
print(df)

plt.bar(df["Car"], df["Mileage_kmL"], color="#3f7d4e")
plt.title("Fuel efficiency (km per litre)")
plt.show()
```
:::explain
`sort_values` returns a **new** sorted frame, so assign it back. `kind="stable"` keeps tied cars (Sedan and Hatchback are both 15.0) in their original order. `reset_index(drop=True)` renumbers the rows 0..n−1. Plotting the **sorted** frame gives a ranked bar chart, which is much easier to read.
:::end

:::program basic | Stock price daily change (bars around zero) | Practice set
Use `np.diff` (with a 0 for the first day) to compute `Daily_Change`. Build `df` with `["Day", "Price", "Daily_Change"]` and draw a bar chart with a horizontal line at 0 (`plt.axhline(0)`).

Expected changes: `[0, 4, -2, 6, 7, -3]`
:::starter
```python norun
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

prices = [100, 104, 102, 108, 115, 112]
days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
# Write your code here

```
:::tests
```python norun
import matplotlib.pyplot as plt
assert list(df.columns) == ["Day", "Price", "Daily_Change"]
assert df["Daily_Change"].tolist() == [0, 4, -2, 6, 7, -3]
ax = plt.gca()
assert [p.get_height() for p in ax.patches] == [0, 4, -2, 6, 7, -3]
assert any(len(set(l.get_ydata())) == 1 and l.get_ydata()[0] == 0 for l in ax.lines)
```
:::solution
```python plot
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

prices = np.array([100, 104, 102, 108, 115, 112])
days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

change = np.diff(prices, prepend=prices[0])    # first day: compared to itself -> 0
df = pd.DataFrame({"Day": days, "Price": prices, "Daily_Change": change})
print(df)

colors = ["#3f7d4e" if c >= 0 else "#b5462f" for c in change]   # green up, red down
plt.bar(df["Day"], df["Daily_Change"], color=colors)
plt.axhline(0, color="black", linewidth=0.8)
plt.title("Daily price change")
plt.show()
```
:::explain
`np.diff(a)` returns `a[1:] - a[:-1]`, which is **one element shorter**. `prepend=prices[0]` adds a first difference of 0, so the lengths match the DataFrame (the alternative is `np.insert(np.diff(prices), 0, 0)`). Bars can be negative, and the zero line plus green/red colouring make the ups and downs obvious.
:::end

:::program basic | Smart home energy bill | Practice set
4 rooms × [AC, Lights, TV] in kWh. Compute `Total_kWh` (`axis=1`) and `Bill_BDT` = Total × 8. Build `df` with `["AC", "Lights", "TV", "Room", "Total_kWh", "Bill_BDT"]` and draw a bar chart of Room vs Bill.

Expected totals `[155, 115, 55, 90]`, bills `[1240, 920, 440, 720]`
:::starter
```python norun
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

usage = [[120, 20, 15], [90, 15, 10], [0, 25, 30], [60, 18, 12]]
rooms = ["Master Bed", "Guest Room", "Living Room", "Study"]
# Write your code here

```
:::tests
```python norun
import matplotlib.pyplot as plt
assert list(df.columns) == ["AC", "Lights", "TV", "Room", "Total_kWh", "Bill_BDT"]
assert df["Total_kWh"].tolist() == [155, 115, 55, 90]
assert df["Bill_BDT"].tolist() == [1240, 920, 440, 720]
assert [p.get_height() for p in plt.gca().patches] == [1240, 920, 440, 720]
```
:::solution
```python plot
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

usage = np.array([[120, 20, 15], [90, 15, 10], [0, 25, 30], [60, 18, 12]])
rooms = ["Master Bed", "Guest Room", "Living Room", "Study"]

total = usage.sum(axis=1)
bill = total * 8                               # 8 BDT per kWh

df = pd.DataFrame(usage, columns=["AC", "Lights", "TV"])
df["Room"], df["Total_kWh"], df["Bill_BDT"] = rooms, total, bill
print(df)

bars = plt.bar(df["Room"], df["Bill_BDT"], color="#b5462f")
plt.bar_label(bars, fmt="%d BDT")              # numbers on top of the bars
plt.title("Electricity bill per room")
plt.show()
```
:::explain
The same per-row pattern once more: `axis=1`, then scale by a tariff. `plt.bar_label` writes each bar's value on the chart, a small touch that makes a chart presentation-ready. The AC dominates: the Living Room has no AC, so it has the lowest bill.
:::end
