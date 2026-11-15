# Pandas II · Merge, Reshape, Time Series

Real data never arrives in one perfect table. You **combine** tables (merge/join/concat), **reshape** them between "long" and "wide" layouts (pivot/melt/stack), use **hierarchical indexes** (MultiIndex), and work with **time** (resampling, rolling windows). This chapter covers all of it, plus categoricals, advanced string operations and performance.

:::analogy LEGO bricks and pivot tables
`merge` snaps two LEGO sets together along matching studs (keys). `concat` stacks bricks on top of each other. `pivot` turns a long receipt (one row per sale) into a wide summary grid (products × months), and `melt` turns the grid back into a receipt.
:::

## 1. `pd.merge`: SQL-style joins

```python
import pandas as pd
emp = pd.DataFrame({"emp_id": [1, 2, 3, 4], "name": ["Alice", "Bob", "Carol", "Dan"], "dept_id": [10, 20, 10, 99]})
dept = pd.DataFrame({"dept_id": [10, 20, 30], "dept": ["Eng", "Sales", "HR"]})

print(pd.merge(emp, dept, on="dept_id"))                          # inner (the default)
print(pd.merge(emp, dept, on="dept_id", how="left"))              # keep all employees
print(pd.merge(emp, dept, on="dept_id", how="outer", indicator=True))   # see where each row came from
print(pd.merge(emp, dept, on="dept_id", how="right"))
```

```text
INNER: only matching keys      LEFT: all left rows (+ NaN where no match)
emp ⋈ dept on dept_id          OUTER: everything, NaN where missing
                               RIGHT: all right rows
```

| `how=` | Keeps | SQL |
|---|---|---|
| `"inner"` | keys in **both** | INNER JOIN |
| `"left"` | all left keys | LEFT JOIN |
| `"right"` | all right keys | RIGHT JOIN |
| `"outer"` | keys in **either** | FULL OUTER JOIN |
| `"cross"` | every combination | CROSS JOIN |

```python
import pandas as pd
a = pd.DataFrame({"key": ["x", "x", "y"], "va": [1, 2, 3]})
b = pd.DataFrame({"key": ["x", "x", "z"], "vb": [10, 20, 30]})
print(pd.merge(a, b, on="key"))          # x appears 2 x 2 = 4 times: a many-to-many explosion!
try:
    pd.merge(a, b, on="key", validate="one_to_one")
except pd.errors.MergeError as e:
    print("MergeError:", e)
left = pd.DataFrame({"id": [1, 2], "name": ["A", "B"]})
right = pd.DataFrame({"user_id": [1, 2], "name": ["a@x", "b@x"]})
print(pd.merge(left, right, left_on="id", right_on="user_id", suffixes=("", "_email")))
```

:::trap Row explosion from duplicate keys
If a key appears m times on the left and n times on the right, the merge produces m×n rows for it. Check the row counts before and after a merge, and pass `validate="one_to_one"`, `"one_to_many"` or `"many_to_one"` to fail fast when your assumption is wrong.
:::

## 2. `join` and `concat`

```python
import pandas as pd
q1 = pd.DataFrame({"region": ["N", "S"], "sales": [100, 80]})
q2 = pd.DataFrame({"region": ["N", "E"], "sales": [120, 60]})
print(pd.concat([q1, q2], ignore_index=True))                      # stack rows
print(pd.concat([q1, q2], keys=["Q1", "Q2"]))                      # keep the source as an index level
print(pd.concat([q1.set_index("region"), q2.set_index("region")], axis=1, keys=["Q1", "Q2"]))   # side by side, aligned
info = pd.DataFrame({"manager": ["Ann", "Sam"]}, index=["N", "S"])
print(q1.set_index("region").join(info))                           # index-based join (left by default)
```

## 3. Reshaping: pivot, pivot_table, melt, stack/unstack

```python
import pandas as pd
sales = pd.DataFrame({
    "month": ["Jan", "Jan", "Jan", "Feb", "Feb", "Feb"],
    "region": ["N", "S", "N", "N", "S", "S"],
    "product": ["A", "A", "B", "A", "B", "B"],
    "units": [10, 7, 3, 12, 5, 6]})
print(sales.pivot_table(index="region", columns="month", values="units", aggfunc="sum", fill_value=0))
print(sales.pivot_table(index=["region", "product"], columns="month", values="units",
                        aggfunc=["sum", "count"], fill_value=0, margins=True))
wide = sales.pivot_table(index="region", columns="month", values="units", aggfunc="sum").reset_index()
long = wide.melt(id_vars="region", var_name="month", value_name="units")      # wide -> long
print(wide, long, sep="\n")
```

:::term Long (tidy) vs wide format
**Long / tidy**: one row per observation, with columns like `region, month, units`. Best for groupby, plotting and databases. **Wide**: one row per entity, one column per variable value (`region, Jan, Feb`). Best for human reading and some ML inputs. `pivot`/`pivot_table` goes long → wide, and `melt` goes wide → long. `pivot` fails on duplicate entries; `pivot_table` aggregates them.
:::

```python
import pandas as pd
df = pd.DataFrame({"region": ["N", "N", "S", "S"], "month": ["Jan", "Feb", "Jan", "Feb"], "units": [10, 12, 7, 11]})
s = df.set_index(["region", "month"])["units"]      # a Series with a MultiIndex
print(s)
print(s.unstack())                                  # inner index level -> columns
print(s.unstack().stack())                          # and back again
print(s.unstack(level=0))                           # move the OUTER level instead
```

## 4. MultiIndex: hierarchical indexing

```python
import pandas as pd, numpy as np
idx = pd.MultiIndex.from_product([["Eng", "Sales"], [2025, 2026]], names=["dept", "year"])
df = pd.DataFrame({"headcount": [10, 12, 6, 8], "budget": [1.0, 1.3, 0.5, 0.6]}, index=idx)
print(df)
print(df.loc["Eng"])                               # select the outer level
print(df.loc[("Sales", 2026)])                     # a full key
print(df.xs(2026, level="year"))                   # cross-section on an inner level
print(df.groupby(level="dept").sum())
print(df.reset_index().head(2))                    # flatten back into columns
print(df.sort_index(level="year").swaplevel().head(2))
```

## 5. Time series

```python
import pandas as pd, numpy as np
rng = np.random.default_rng(0)
idx = pd.date_range("2026-01-01", periods=90, freq="D")
ts = pd.Series(100 + rng.normal(0, 2, 90).cumsum(), index=idx, name="price")
print(ts.head(3))
print(ts["2026-02"].head(3))                                  # partial-string indexing
print(ts["2026-03-01":"2026-03-05"])
print(ts.resample("ME").agg(["first", "max", "min", "last"]).round(2))   # monthly OHLC
print(ts.resample("W").mean().head(3).round(2))
print(ts.index.dayofweek[:7].tolist(), ts.index.month_name()[0])
print(ts.shift(1).head(3).round(2).tolist(), ts.pct_change().head(3).round(4).tolist())
```

### Rolling and expanding windows

```python
import pandas as pd, numpy as np
s = pd.Series([10, 12, 11, 15, 14, 18, 17, 21], index=pd.date_range("2026-11-01", periods=8))
print(pd.DataFrame({"value": s,
                    "roll3_mean": s.rolling(3).mean(),
                    "roll3_min1": s.rolling(3, min_periods=1).mean(),
                    "expanding_max": s.expanding().max(),
                    "ewm": s.ewm(span=3).mean().round(2),
                    "roll_2D": s.rolling("2D").sum()}))
```

:::tip `rolling(3)` vs `rolling("3D")`
An integer window counts **rows**. A string window like `"3D"` covers a **time span** and handles missing days correctly. With irregular timestamps, use time-based windows.
:::

### The `.dt` accessor and time zones

```python
import pandas as pd
df = pd.DataFrame({"ts": pd.to_datetime(["2026-11-15 08:30", "2026-11-16 17:45", "2026-12-01 23:10"])})
df["date"] = df["ts"].dt.date
df["hour"] = df["ts"].dt.hour
df["weekday"] = df["ts"].dt.day_name()
df["is_weekend"] = df["ts"].dt.dayofweek >= 5
df["month_start"] = df["ts"].dt.to_period("M").dt.to_timestamp()
print(df)
utc = df["ts"].dt.tz_localize("UTC")
print(utc.dt.tz_convert("Asia/Dhaka").tolist()[0])
```

## 6. The `.str` accessor

```python
import pandas as pd
s = pd.Series(["Alice Smith <alice@x.com>", "bob JONES <bob@y.org>", None, "Carol Lee <carol@x.com>"])
print(s.str.lower().str.contains("x.com", regex=False))
print(s.str.extract(r"(?P<first>\w+) (?P<last>\w+) <(?P<email>[^>]+)>"))
print(s.str.split(" ", n=1, expand=True))
print(s.str.len(), s.str.replace(r"<.*>", "", regex=True).str.strip().str.title(), sep="\n")
print(s.str.extract(r"@([\w.]+)>")[0].value_counts())
```

## 7. Categorical data

```python
import pandas as pd, numpy as np
rng = np.random.default_rng(0)
s = pd.Series(rng.choice(["low", "medium", "high"], 100_000))
cat = s.astype(pd.CategoricalDtype(["low", "medium", "high"], ordered=True))
print(f"object: {s.memory_usage(deep=True)/1e6:.2f} MB  category: {cat.memory_usage(deep=True)/1e6:.2f} MB")
print(cat.cat.codes[:5].tolist(), cat.cat.categories.tolist())
print((cat > "low").mean().round(3), cat.sort_values().iloc[[0, -1]].tolist())   # ordered comparisons
```

## 8. Performance

```python
import pandas as pd, numpy as np, time
rng = np.random.default_rng(0)
df = pd.DataFrame({"a": rng.random(200_000), "b": rng.random(200_000)})

t = time.perf_counter(); r1 = df.apply(lambda r: r["a"] * 2 + r["b"], axis=1); t_apply = time.perf_counter() - t
t = time.perf_counter(); r2 = df["a"] * 2 + df["b"]; t_vec = time.perf_counter() - t
print(f"apply(axis=1): {t_apply:.2f}s   vectorised: {t_vec*1000:.1f}ms   same: {np.allclose(r1, r2)}")
print(np.where(df["a"] > 0.5, "hi", "lo")[:3], np.select([df["a"] < 0.3, df["a"] < 0.7], ["L", "M"], "H")[:3])
small = df.astype({"a": "float32", "b": "float32"})
print(df.memory_usage(deep=True).sum() // 1024, "KB ->", small.memory_usage(deep=True).sum() // 1024, "KB")
```

| Slow | Fast |
|---|---|
| `iterrows`, `apply(axis=1)` | vectorised column maths, `np.where`, `np.select` |
| growing a DataFrame row by row | collect dicts in a list → `pd.DataFrame(list)` |
| `object` strings with few distinct values | `category` |
| float64/int64 for small ranges | `float32`, `int32`, `pd.to_numeric(downcast=…)` |
| CSV for repeated loads | Parquet |
| chained boolean filters on huge data | `query` / `eval` |

## 9. Built-in plotting (preview)

`df.plot(kind="line" | "bar" | "hist" | "box" | "scatter" | "area" | "pie")` wraps Matplotlib. Full coverage is in the *Matplotlib* chapter.

```python plot
import pandas as pd, numpy as np
import matplotlib.pyplot as plt
idx = pd.date_range("2026-01-01", periods=60)
df = pd.DataFrame({"sales": 100 + np.random.default_rng(1).normal(0, 5, 60).cumsum()}, index=idx)
df["7d avg"] = df["sales"].rolling(7).mean()
ax = df.plot(figsize=(7, 3), title="Sales with 7-day rolling mean", color=["#D9A35F", "#B3261E"])
ax.set_ylabel("units")
plt.tight_layout()
plt.show()
```

## Tricks & tips

- After every merge: `print(len(left), len(right), len(merged))` and check for NaNs in the new columns.
- `indicator=True` shows exactly which rows matched (`both`, `left_only`, `right_only`), which is perfect for reconciliation.
- `pivot_table(..., margins=True)` adds totals; `aggfunc` takes a list or dict.
- Use `pd.Grouper(freq="ME")` to group by month inside a groupby with other keys.
- `df.resample("W", on="date")` works when the dates are a column rather than the index.
- `merge_asof` joins on the **nearest** key (time-series alignment of trades and quotes).

## The 10 most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Many-to-many merge explosion | `validate=`, dedupe the keys |
| 2 | Key dtype mismatch (`"1"` vs `1`) → no matches | `astype` before merging |
| 3 | Keys with stray whitespace or case differences | `.str.strip().str.lower()` |
| 4 | `pivot` with duplicate entries → ValueError | `pivot_table` with an `aggfunc` |
| 5 | `concat` without `ignore_index` → duplicate index labels | `ignore_index=True` |
| 6 | Unsorted DatetimeIndex → slicing errors and warnings | `sort_index()` |
| 7 | Using `"M"` frequency (removed) | `"ME"` (month end), `"MS"` (month start) |
| 8 | Rolling over unsorted or irregular data | sort, use time-based windows |
| 9 | Mixing naive and tz-aware timestamps | localise everything |
| 10 | `apply` with Python loops on big frames | vectorise |

## Practice problems

:::problem basic | Customers without orders | left merge + indicator
Given `customers` and `orders`, list the customers who have **never** ordered, using a left merge with `indicator=True`.
:::solution
```python
import pandas as pd
customers = pd.DataFrame({"cust_id": [1, 2, 3, 4], "name": ["Ada", "Bob", "Cy", "Dee"]})
orders = pd.DataFrame({"order_id": [100, 101, 102], "cust_id": [1, 3, 1], "amount": [50, 20, 70]})
m = customers.merge(orders, on="cust_id", how="left", indicator=True)
print(m)
print(m.loc[m["_merge"] == "left_only", "name"].tolist())
print(customers[~customers["cust_id"].isin(orders["cust_id"])]["name"].tolist())   # the same answer
```
:::explain
A left join keeps every customer, and those without matches get `left_only` in the `_merge` column (plus NaNs). That's the pandas version of SQL's `LEFT JOIN … WHERE o.id IS NULL`, an **anti-join**. The `isin` version is shorter when you only need the filter.
:::end

:::problem basic | Monthly totals from daily data | resample
Generate 120 days of daily revenue (seed 0), then report the monthly total and mean, and the best day of each month.
:::solution
```python
import pandas as pd, numpy as np
rng = np.random.default_rng(0)
rev = pd.Series(rng.integers(500, 1500, 120), index=pd.date_range("2026-01-01", periods=120, freq="D"), name="revenue")
monthly = rev.resample("MS").agg(["sum", "mean"]).round(1)
monthly["best_day"] = rev.resample("MS").apply(lambda s: s.idxmax().date())
print(monthly)
```
:::explain
`resample("MS")` groups by calendar month (labelled by the month **start**). It's a time-aware `groupby`. `agg` with a list builds several columns at once, and `idxmax` inside `apply` returns the timestamp of the best day.
:::end

:::problem basic | Wide to long | melt
Convert a wide gradebook (`student, math, physics, chem`) into long format (`student, subject, score`), then compute each subject's average and each student's best subject.
:::solution
```python
import pandas as pd
wide = pd.DataFrame({"student": ["Ada", "Bob", "Cy"], "math": [95, 70, 82], "physics": [88, 75, 91], "chem": [90, 65, 79]})
long = wide.melt(id_vars="student", var_name="subject", value_name="score")
print(long)
print(long.groupby("subject")["score"].mean().round(1))
print(long.loc[long.groupby("student")["score"].idxmax(), ["student", "subject", "score"]])
```
:::explain
`melt` turns the column headers into values of a `subject` column. Once the data is **tidy** (long), every question becomes a simple `groupby`. `groupby().idxmax()` returns the row label of each student's best score, and `.loc` fetches those rows.
:::end

:::problem medium | Year-over-year growth table | pivot_table + pct_change
From long sales data `(year, region, revenue)`, build a region × year table and a second table of year-over-year % growth, rounded to one decimal.
:::solution
```python
import pandas as pd
sales = pd.DataFrame({"year": [2024, 2024, 2025, 2025, 2026, 2026, 2024, 2025, 2026],
                      "region": ["N", "S", "N", "S", "N", "S", "E", "E", "E"],
                      "revenue": [100, 80, 120, 76, 150, 95, 50, 65, 60]})
table = sales.pivot_table(index="region", columns="year", values="revenue", aggfunc="sum")
growth = table.pct_change(axis=1).mul(100).round(1)
print(table, growth, sep="\n\n")
```
:::explain
`pivot_table` reshapes and aggregates in one step. `pct_change(axis=1)` compares each year with the previous one **across the columns**, and the first year is NaN because it has no predecessor. `.mul(100)` is the method version of `* 100`, which keeps a method chain readable.
:::end

:::problem medium | Rolling 7-day active users | time windows, nunique
Given login events `(user, date)`, compute for each day the number of **distinct** users who logged in within the last 7 days (a rolling distinct count).
:::solution
```python
import pandas as pd, numpy as np
rng = np.random.default_rng(2)
events = pd.DataFrame({"user": rng.integers(1, 15, 80),
                       "date": pd.to_datetime("2026-11-01") + pd.to_timedelta(rng.integers(0, 20, 80), unit="D")})
daily_users = events.groupby("date")["user"].apply(set).sort_index()
days = pd.date_range(daily_users.index.min(), daily_users.index.max(), freq="D")
daily_users = daily_users.reindex(days, fill_value=set())
wau = [len(set().union(*daily_users.iloc[max(0, i - 6):i + 1])) for i in range(len(days))]
result = pd.DataFrame({"daily_active": daily_users.map(len), "7d_active": wau}, index=days)
print(result.head(10))
```
:::explain
`rolling(...).nunique()` doesn't exist, because distinct counts can't be updated incrementally like sums. So we keep a **set of users per day**, reindex to fill missing days with empty sets, and union the last 7 sets per day. That's correct for any data, and the per-day sets keep it far cheaper than rescanning raw events. (At scale, approximate counters like HyperLogLog are used.)
:::end

:::problem medium | Reconcile two systems | outer merge + comparison
Two systems export `(invoice_id, amount)`. Produce a reconciliation report: rows only in A, only in B, and in both but with **different amounts** (with the difference).
:::solution
```python
import pandas as pd
a = pd.DataFrame({"invoice_id": [1, 2, 3, 4], "amount": [100.0, 250.0, 75.0, 30.0]})
b = pd.DataFrame({"invoice_id": [2, 3, 4, 5], "amount": [250.0, 80.0, 30.0, 60.0]})
m = a.merge(b, on="invoice_id", how="outer", suffixes=("_a", "_b"), indicator=True)
only_a = m[m["_merge"] == "left_only"]
only_b = m[m["_merge"] == "right_only"]
both = m[m["_merge"] == "both"]
mismatch = both[~((both["amount_a"] - both["amount_b"]).abs() < 1e-9)].assign(diff=lambda d: d["amount_b"] - d["amount_a"])
print("only in A:", only_a["invoice_id"].tolist(), "| only in B:", only_b["invoice_id"].tolist())
print(mismatch[["invoice_id", "amount_a", "amount_b", "diff"]])
```
:::explain
An **outer** merge with `indicator=True` partitions the rows into three cases at once. Suffixes keep both systems' amounts side by side. Comparing floats with a tolerance avoids false mismatches from rounding. This is the bread-and-butter of finance and data-engineering QA.
:::end

:::problem hard | As-of join: match trades to the latest quote | merge_asof
For each trade `(time, symbol, qty)`, attach the **most recent** quote `(time, symbol, price)` at or before the trade time, per symbol, within 2 minutes (otherwise NaN), then compute the notional value.
:::solution
```python
import pandas as pd
quotes = pd.DataFrame({"time": pd.to_datetime(["09:30:00", "09:30:30", "09:31:10", "09:30:05", "09:33:00"], format="%H:%M:%S"),
                       "symbol": ["PY", "PY", "PY", "NP", "NP"], "price": [10.0, 10.2, 10.1, 50.0, 51.0]})
trades = pd.DataFrame({"time": pd.to_datetime(["09:30:20", "09:31:15", "09:30:01", "09:32:40", "09:35:30"], format="%H:%M:%S"),
                       "symbol": ["PY", "PY", "PY", "NP", "NP"], "qty": [100, 50, 10, 20, 5]})
m = pd.merge_asof(trades.sort_values("time"), quotes.sort_values("time"), on="time", by="symbol",
                  direction="backward", tolerance=pd.Timedelta("2min"))
m["notional"] = m["qty"] * m["price"]
print(m.sort_values(["symbol", "time"]))
```
:::explain
`merge_asof` is a **nearest-key** join: for each left row it takes the last right row whose key is ≤ the left key (`direction="backward"`), separately per `by` group, and both inputs must be sorted on `on`. `tolerance` rejects stale matches. The 09:30:01 PY trade uses the 09:30:00 quote (1 second old), but both NP trades get NaN: their latest earlier NP quote (09:30:05) is more than 2 minutes old, and the 09:33:00 quote comes *after* the 09:32:40 trade, so a backward search can't use it. That's the standard way to align irregular time series (sensors, prices, logs).
:::end

:::problem hard | Cohort retention matrix | groupby + period arithmetic + pivot
From purchase events `(user, date)`, assign each user to a **cohort** (the month of their first purchase), compute how many users from each cohort were active N months later, and produce the retention % matrix (cohort × months since first purchase).
:::solution
```python
import pandas as pd, numpy as np
rng = np.random.default_rng(11)
n = 600
events = pd.DataFrame({"user": rng.integers(1, 120, n),
                       "date": pd.to_datetime("2026-01-01") + pd.to_timedelta(rng.integers(0, 180, n), unit="D")})
events["month"] = events["date"].dt.to_period("M")
events["cohort"] = events.groupby("user")["month"].transform("min")
events["age"] = (events["month"] - events["cohort"]).apply(lambda off: off.n)    # months since joining
active = events.groupby(["cohort", "age"])["user"].nunique().unstack(fill_value=0)
retention = active.div(active[0], axis=0).mul(100).round(1)
print(active)
print(retention)
```
:::explain
The pipeline: (1) bucket events by month (`to_period("M")`), (2) the cohort is each user's **first** month (`transform("min")` broadcasts it to all their events), (3) the month offset is the difference of two Periods (a `MonthEnd` offset, whose `.n` is the number of months), (4) count distinct users per (cohort, age) and unstack into a matrix, and (5) divide each row by its month-0 size. Cohort analysis is one of the most common product-analytics deliverables.
:::end
