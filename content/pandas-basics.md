# Pandas I · Fundamentals

**Pandas** gives Python two labelled data structures, **Series** (one column) and **DataFrame** (a table), plus fast tools to load, clean, filter, group and summarise data. If NumPy is the engine, Pandas is the spreadsheet built on top of it: columns have **names**, rows have an **index**, and operations **align on labels**.

:::analogy A spreadsheet that understands code
A DataFrame is an Excel sheet where every column is a typed NumPy array and the row labels (the **index**) travel with the data. Filtering, sorting, pivot tables and VLOOKUP become one-line method calls, and they're reproducible, unlike clicking around in a spreadsheet.
:::

All examples use the same 10-row **employees** dataset from your Pandas Visual notes, so you can see exactly how each operation changes it.

```python
import pandas as pd, numpy as np
df = pd.DataFrame({
    "name": ["Alice", "Bob", "Carol", "Dan", "Eve", "Frank", "Grace", "Hank", "Iris", "Jay"],
    "dept": ["Eng", "Sales", "Eng", "HR", "Sales", "Eng", "HR", "Sales", "Eng", "HR"],
    "city": ["New York", "Los Angeles", "New York", "Chicago", "Los Angeles", "New York", "Chicago", "Houston", "New York", "Chicago"],
    "age": [28, 35, 31, 42, 26, 38, 33, 29, 45, 31],
    "salary": [95000, 72000, 105000, 60000, 68000, 115000, 63000, 70000, 125000, 58000],
    "score": [92.5, 78.0, 88.0, np.nan, 85.5, 91.0, 74.0, 81.5, np.nan, 70.0],
    "start_date": pd.to_datetime(["2021-03-15", "2019-07-01", "2020-01-20", "2017-11-05", "2022-06-10",
                                  "2018-09-30", "2021-01-08", "2023-02-14", "2015-04-22", "2022-08-19"]),
    "active": [True, True, True, False, True, True, False, True, True, False],
})
print(df)
print(df.dtypes)
```

## 1. Series vs DataFrame vs ndarray

| | `np.ndarray` | `pd.Series` | `pd.DataFrame` |
|---|---|---|---|
| Dimensions | n-D | 1-D | 2-D |
| Labels | none (positions) | an index | an index + column names |
| Types | one dtype | one dtype | one dtype **per column** |
| Alignment | by position | **by label** | by label (rows and columns) |
| Missing data | NaN for floats | NaN / NA for all types | the same |

```python
import pandas as pd
s = pd.Series([10, 20, 30], index=["a", "b", "c"], name="points")
print(s, s["b"], s.iloc[0], s.values, s.index.tolist(), sep="\n")
t = pd.Series({"b": 1, "c": 2, "d": 3})
print(s + t)          # ALIGNS on labels: a and d have no partner -> NaN
```

:::term Index alignment
Arithmetic between pandas objects matches by **label**, not by position. `s + t` pairs `"b"` with `"b"`, and labels present in only one side produce `NaN`. It's powerful (no manual joins), but surprising when you expected positional behaviour. Use `.to_numpy()` or `.reset_index(drop=True)` for positional maths.
:::

## 2. Reading and writing data

```python
import pandas as pd, io
csv_text = """id,name,joined,salary
1,Alice,2021-03-15,95000
2,Bob,2019-07-01,
3,Carol,2020-01-20,105000
"""
df = pd.read_csv(io.StringIO(csv_text), parse_dates=["joined"], index_col="id",
                 dtype={"name": "string"}, na_values=["", "NA"])
print(df, df.dtypes, sep="\n")
out = io.StringIO()
df.to_csv(out)
print(out.getvalue())
print(df.to_dict(orient="records")[0], df.to_json(orient="records", date_format="iso")[:60])
```

| Function | Notes |
|---|---|
| `pd.read_csv(path, sep, usecols, dtype, parse_dates, index_col, na_values, nrows, chunksize)` | the workhorse |
| `pd.read_excel`, `read_json`, `read_parquet`, `read_sql`, `read_html`, `read_clipboard` | other formats |
| `df.to_csv(index=False)`, `to_parquet`, `to_json`, `to_excel` | writing |

:::tip Load less, load right
`usecols=` reads only the columns you need, `dtype=` avoids slow type inference (and wrong guesses, like zip codes losing leading zeros), and `chunksize=` streams huge files in pieces. Parquet is far faster and smaller than CSV for repeated loads.
:::

## 3. Inspecting

```python
import pandas as pd, numpy as np
df = pd.DataFrame({"dept": ["Eng", "Sales", "Eng", "HR", "Sales"], "age": [28, 35, 31, 42, 26],
                   "salary": [95000, 72000, 105000, 60000, 68000], "score": [92.5, 78.0, 88.0, np.nan, 85.5]})
print(df.head(2), df.tail(1), df.shape, df.columns.tolist(), sep="\n")
df.info()
print(df.describe().round(1))
print(df["dept"].value_counts(), df["dept"].nunique(), df.isna().sum(), sep="\n")
```

## 4. Selecting columns and rows

```python
import pandas as pd
df = pd.DataFrame({"name": ["Alice", "Bob", "Carol", "Dan"], "age": [28, 35, 31, 42],
                   "salary": [95000, 72000, 105000, 60000]}, index=["a", "b", "c", "d"])
print(df["name"])                # one column -> Series
print(df[["name", "age"]])       # list of columns -> DataFrame
print(df.loc["b"])               # a row BY LABEL -> Series
print(df.loc["b":"c", "age":"salary"])   # label slices are INCLUSIVE of the end
print(df.iloc[1:3, 0:2])         # position slices EXCLUDE the end (like Python)
print(df.at["c", "salary"], df.iat[0, 1])   # fast scalar access
df["bonus"] = df["salary"] * 0.1            # a new computed column
print(df)
```

| Accessor | By | Slice end |
|---|---|---|
| `df[col]`, `df[[cols]]` | column labels | — |
| `df.loc[rows, cols]` | **labels** (and boolean masks) | **inclusive** |
| `df.iloc[rows, cols]` | **integer positions** | exclusive |
| `df.at[r, c]` / `df.iat[i, j]` | a single value | — |

## 5. Boolean filtering

```python
import pandas as pd
df = pd.DataFrame({"name": ["Alice", "Bob", "Carol", "Dan", "Eve"], "dept": ["Eng", "Sales", "Eng", "HR", "Sales"],
                   "age": [28, 35, 31, 42, 26], "salary": [95000, 72000, 105000, 60000, 68000]})
print(df[df["age"] > 30])
print(df[(df["dept"] == "Eng") & (df["salary"] > 100000)])        # & | ~ with PARENTHESES
print(df[df["dept"].isin(["HR", "Sales"]) & ~(df["age"] < 30)])
print(df[df["age"].between(28, 35)])
print(df.query("salary > 70000 and dept != 'HR'"))
limit = 30
print(df.query("age > @limit")[["name", "age"]])                  # @ refers to Python variables
print(df.loc[df["salary"].idxmax(), "name"], df.nlargest(2, "salary")["name"].tolist())
```

:::trap `and`/`or` don't work on Series
`df[df.age > 30 and df.dept == "Eng"]` raises *"The truth value of a Series is ambiguous"*. Use `&`, `|`, `~` and wrap each condition in parentheses, because `&` binds tighter than `>`.
:::

## 6. Missing values

```python
import pandas as pd, numpy as np
df = pd.DataFrame({"dept": ["Eng", "Eng", "HR", "HR", "Sales"], "score": [90, np.nan, 70, np.nan, 85],
                   "city": ["NY", None, "Chicago", "Chicago", None]})
print(df.isna(), df.isna().sum(), df["score"].notna().mean(), sep="\n")
print(df.dropna())                                   # drop rows with ANY missing value
print(df.dropna(subset=["score"]))                   # only consider some columns
print(df.fillna({"score": df["score"].mean(), "city": "Unknown"}))
print(df.assign(score=df.groupby("dept")["score"].transform(lambda s: s.fillna(s.mean()))))   # group-wise fill
print(pd.Series([1, np.nan, np.nan, 4]).interpolate().tolist(), pd.Series([1, None, 3]).ffill().tolist())
```

:::note NaN, None and NA
`np.nan` is a float, so an int column with a missing value becomes `float64`. Pandas' nullable dtypes (`"Int64"`, `"boolean"`, `"string"`) use `pd.NA` and keep their real type. `NaN != NaN`, so always test missing values with `.isna()`, never `== np.nan`.
:::

## 7. Cleaning: types, strings, duplicates, renaming

```python
import pandas as pd
raw = pd.DataFrame({" Name ": ["  alice ", "BOB", "Carol", "BOB"], "Salary($)": ["95,000", "72,000", "105,000", "72,000"],
                    "Joined": ["2021-03-15", "2019-07-01", "not a date", "2019-07-01"]})
df = raw.rename(columns=lambda c: c.strip().lower().replace("($)", ""))
df["name"] = df["name"].str.strip().str.title()
df["salary"] = df["salary"].str.replace(",", "").astype(int)
df["joined"] = pd.to_datetime(df["joined"], errors="coerce")       # bad values -> NaT
print(df, df.dtypes, sep="\n")
print(df.duplicated().tolist(), df.drop_duplicates().shape, df.drop_duplicates(subset=["name"], keep="last").index.tolist())
print(pd.to_numeric(pd.Series(["1", "x", "3"]), errors="coerce").tolist())
```

## 8. `apply`, `map` and vectorisation

```python
import pandas as pd
df = pd.DataFrame({"name": ["Alice", "Bob", "Carol"], "salary": [95000, 72000, 105000], "dept": ["Eng", "Sales", "Eng"]})
df["band"] = df["salary"].map(lambda s: "high" if s >= 90000 else "mid")       # element-wise on a Series
df["dept_full"] = df["dept"].map({"Eng": "Engineering", "Sales": "Sales"})     # mapping dict
df["tag"] = df.apply(lambda r: f"{r['name'][:2]}-{r['dept']}", axis=1)          # row-wise (slow-ish)
df["salary_k"] = df["salary"] / 1000                                            # VECTORISED: fastest
print(df)
print(df[["salary", "salary_k"]].map(lambda v: round(v, 1)).head(2))            # DataFrame.map (was applymap)
```

:::tip Prefer vectorised operations
Speed order: **vectorised column maths** (`df.a * 2`, `.str`, `.dt`, `np.where`) ≫ `Series.map(dict)` > `.apply` on a Series > `.apply(axis=1)` > `iterrows`. On a million rows, `apply(axis=1)` can be 100× slower than the vectorised equivalent.
:::

## 9. Sorting and ranking

```python
import pandas as pd
df = pd.DataFrame({"name": ["Alice", "Bob", "Carol", "Dan", "Eve"], "dept": ["Eng", "Sales", "Eng", "HR", "Sales"],
                   "salary": [95000, 72000, 105000, 60000, 72000]})
print(df.sort_values("salary", ascending=False))
print(df.sort_values(["dept", "salary"], ascending=[True, False]))
print(df.assign(rank=df["salary"].rank(ascending=False, method="min")))
print(df.sort_index(ascending=False).head(2))
```

## 10. GroupBy: split, apply, combine

```python
import pandas as pd, numpy as np
df = pd.DataFrame({"dept": ["Eng", "Sales", "Eng", "HR", "Sales", "Eng", "HR"],
                   "salary": [95000, 72000, 105000, 60000, 68000, 115000, 63000],
                   "age": [28, 35, 31, 42, 26, 38, 33]})
print(df.groupby("dept")["salary"].mean())
print(df.groupby("dept").agg(headcount=("salary", "size"), avg_salary=("salary", "mean"),
                             max_age=("age", "max"), salary_range=("salary", lambda s: s.max() - s.min())))
df["dept_avg"] = df.groupby("dept")["salary"].transform("mean")     # broadcast back to every row
df["vs_dept"] = df["salary"] - df["dept_avg"]
print(df)
print(df.groupby("dept").filter(lambda g: len(g) >= 3))               # keep only big groups
print(df.groupby("dept")["salary"].apply(lambda s: s.nlargest(1)))
```

```text
split by dept         apply mean()          combine
Eng   : 95k 105k 115k  →  105k   ┐
HR    : 60k 63k        →  61.5k  ├→  Series indexed by dept
Sales : 72k 68k        →  70k    ┘
```

| Method | Output shape | Use |
|---|---|---|
| `agg` / `mean`… | one row per group | summaries |
| `transform` | **same shape as the input** | group stats on each row (normalise, fill) |
| `filter` | a subset of the original rows | drop whole groups |
| `apply` | flexible | anything else (slowest) |

## 11. Adding and removing columns

```python
import pandas as pd
df = pd.DataFrame({"name": ["Alice", "Bob"], "salary": [95000, 72000], "tmp": [1, 2]})
df2 = (df.assign(tax=lambda d: d["salary"] * 0.3, net=lambda d: d["salary"] - d["tax"])   # chainable
         .drop(columns=["tmp"])
         .rename(columns={"salary": "gross"}))
print(df2)
print(df.drop(index=0))                     # drop a ROW by label (returns a new frame)
df.insert(1, "id", [101, 102])              # insert IN PLACE at position 1 (returns None!)
print(df)
```

## 12. Copy-on-Write (pandas 3) and the old SettingWithCopyWarning

```python
import pandas as pd
df = pd.DataFrame({"dept": ["Eng", "HR", "Eng"], "salary": [100, 60, 110]})
eng = df[df["dept"] == "Eng"]
eng["salary"] = eng["salary"] * 2      # modifies ONLY eng (a copy under Copy-on-Write)
print(df["salary"].tolist(), eng["salary"].tolist())
df.loc[df["dept"] == "Eng", "salary"] *= 2   # the correct way to modify the ORIGINAL
print(df)
print(pd.__version__)
```

:::trap Chained assignment never works in pandas 3
`df[df.dept == "Eng"]["salary"] = 0` modifies a temporary object and is silently thrown away (pandas 2 warned with `SettingWithCopyWarning`). With **Copy-on-Write** (the default since pandas 3.0), every derived DataFrame behaves like an independent copy. Always write `df.loc[mask, "col"] = value` to modify the original in one step.
:::

## Tricks & tips

- `df.pipe(f)` lets you chain your own functions: `df.pipe(clean).pipe(add_features)`.
- `pd.set_option("display.max_columns", 50)` shows wide frames.
- `df.sample(5, random_state=0)` gives a quick random peek.
- `df.memory_usage(deep=True)` shows the real memory, and `category` dtype shrinks repeated strings.
- `df.eval("c = a + b")` and `df.query(...)` are readable and fast for big frames.
- `value_counts(normalize=True)` gives proportions.
- `idxmax`/`idxmin` return the **label** of the max/min.

## The 10 most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Chained assignment `df[a][b] = x` | `df.loc[mask, col] = x` |
| 2 | `and`/`or` in filters | `&`, `\|`, `~` + parentheses |
| 3 | `loc` slices are inclusive, `iloc` slices exclusive | know which you're using |
| 4 | Unexpected NaNs from index alignment | `reset_index(drop=True)` / `.to_numpy()` |
| 5 | Int columns turning float after NaNs | `"Int64"` nullable dtype |
| 6 | `== np.nan` is always False | `.isna()` |
| 7 | `apply(axis=1)` on big data | vectorise |
| 8 | Forgetting that most methods return NEW objects | reassign: `df = df.dropna()` |
| 9 | Reading IDs or zip codes as ints (losing leading zeros) | `dtype={"zip": str}` |
| 10 | Mixed types in an object column | `pd.to_numeric(errors="coerce")` |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python
import pandas as pd
s = pd.Series([10, 20, 30], index=[2, 0, 1])
print(s[0], s.iloc[0], s.loc[1])
```
What prints?
- [x] `20 10 30`
- [ ] `10 10 20`
- [ ] `10 20 30`
With an integer index, `s[0]` is **label-based** (label 0 → 20). `iloc[0]` is the first position (10), and `loc[1]` is label 1 (30). Always say `loc` or `iloc` explicitly.
:::

:::quiz
```python
import pandas as pd
df = pd.DataFrame({"g": ["a", "b", "a", "b"], "x": [1, 2, 3, 4]})
print(df.groupby("g")["x"].sum().tolist(), df.groupby("g")["x"].transform("sum").tolist())
```
What prints?
- [ ] `[4, 6] [4, 6]`
- [x] `[4, 6] [4, 6, 4, 6]`
- [ ] `[4, 6, 4, 6] [4, 6]`
An aggregation returns **one row per group**. `transform` returns a result **aligned to the original rows**, which makes it perfect for "each row's share of its group" or for filling with group means.
:::

:::quiz
```python
import pandas as pd
import numpy as np
s = pd.Series([1, np.nan, 3])
print(s.sum(), s.mean(), s.count(), len(s))
```
What prints?
- [x] `4.0 2.0 2 3`
- [ ] `nan nan 2 3`
- [ ] `4.0 1.333 3 3`
Pandas reductions **skip NaN** by default (`skipna=True`): the mean is (1+3)/2. `count()` counts the non-missing values, while `len` counts every row. NumPy's `np.sum` on a raw array would give `nan`.
:::

:::tip 🏋️ More practice
16 mini data projects: **[Practice · NumPy → Pandas → Matplotlib](#/t/practice-data)**. Each one has a test judge and a step-by-step solution.
:::

## Practice problems

:::problem basic | Department report | groupby + named aggregation
From the employees data, produce one row per department with the headcount, mean salary (rounded), the mean score (ignoring NaN), and the name of the highest paid person, sorted by mean salary, descending.
:::solution
```python
import pandas as pd, numpy as np
df = pd.DataFrame({
    "name": ["Alice", "Bob", "Carol", "Dan", "Eve", "Frank", "Grace", "Hank", "Iris", "Jay"],
    "dept": ["Eng", "Sales", "Eng", "HR", "Sales", "Eng", "HR", "Sales", "Eng", "HR"],
    "salary": [95000, 72000, 105000, 60000, 68000, 115000, 63000, 70000, 125000, 58000],
    "score": [92.5, 78.0, 88.0, np.nan, 85.5, 91.0, 74.0, 81.5, np.nan, 70.0]})

report = (df.groupby("dept")
            .agg(headcount=("name", "size"),
                 mean_salary=("salary", "mean"),
                 mean_score=("score", "mean"),
                 top_earner=("salary", lambda s: df.loc[s.idxmax(), "name"]))
            .round({"mean_salary": 0, "mean_score": 1})
            .sort_values("mean_salary", ascending=False))
print(report)
```
:::explain
Named aggregation (`new_col=(source_col, func)`) produces readable column names in one call. Pandas' `mean` skips NaN by default. For the top earner, `s.idxmax()` returns the **index label** of the max salary within the group, and looking that label up in `df` gets the name. That works because the group's Series keeps the original row labels.
:::end

:::problem basic | Clean messy columns | rename, str, to_numeric
Clean this frame: strip and lowercase the headers (spaces → underscores), title-case the names, convert `"$1,200"` prices to floats (with bad values → NaN), and drop exact duplicate rows.
:::solution
```python
import pandas as pd
raw = pd.DataFrame({" Customer Name ": ["  ada lovelace", "LINUS", "LINUS", "grace hopper"],
                    "Total Price": ["$1,200", "$85.50", "$85.50", "n/a"]})
df = raw.rename(columns=lambda c: c.strip().lower().replace(" ", "_"))
df["customer_name"] = df["customer_name"].str.strip().str.title()
df["total_price"] = pd.to_numeric(df["total_price"].str.replace(r"[$,]", "", regex=True), errors="coerce")
df = df.drop_duplicates().reset_index(drop=True)
print(df, df.dtypes, sep="\n")
```
:::explain
Each step is a vectorised column operation. `str.replace` with a regex strips the `$` and `,` in one pass. `errors="coerce"` turns unparseable values like `"n/a"` into NaN instead of crashing. `reset_index(drop=True)` renumbers the rows after dropping.
:::end

:::problem basic | Filter with multiple conditions | boolean masks, query
List the **active** employees in Eng or Sales, aged 25–35 inclusive, with a non-missing score above 80, showing only `name`, `dept`, `score`. Write it with masks and with `query`.
:::solution
```python
import pandas as pd, numpy as np
df = pd.DataFrame({
    "name": ["Alice", "Bob", "Carol", "Dan", "Eve", "Frank", "Grace", "Hank", "Iris", "Jay"],
    "dept": ["Eng", "Sales", "Eng", "HR", "Sales", "Eng", "HR", "Sales", "Eng", "HR"],
    "age": [28, 35, 31, 42, 26, 38, 33, 29, 45, 31],
    "score": [92.5, 78.0, 88.0, np.nan, 85.5, 91.0, 74.0, 81.5, np.nan, 70.0],
    "active": [True, True, True, False, True, True, False, True, True, False]})

mask = df["active"] & df["dept"].isin(["Eng", "Sales"]) & df["age"].between(25, 35) & (df["score"] > 80)
print(df.loc[mask, ["name", "dept", "score"]])
print(df.query("active and dept in ['Eng', 'Sales'] and 25 <= age <= 35 and score > 80")[["name", "dept", "score"]])
```
:::explain
NaN comparisons are False, so `score > 80` automatically excludes missing scores. `between` is inclusive on both ends by default. `query` supports chained comparisons and `in`, which often reads closer to the English requirement.
:::end

:::problem medium | Fill missing scores by group | transform
Fill each employee's missing `score` with the **mean score of their department**. If a whole department is missing, fall back to the overall mean. Show the before and after for the filled rows.
:::solution
```python
import pandas as pd, numpy as np
df = pd.DataFrame({
    "name": ["Alice", "Bob", "Carol", "Dan", "Eve", "Frank", "Grace", "Hank", "Iris", "Jay"],
    "dept": ["Eng", "Sales", "Eng", "HR", "Sales", "Eng", "HR", "Sales", "Eng", "HR"],
    "score": [92.5, 78.0, 88.0, np.nan, 85.5, 91.0, 74.0, 81.5, np.nan, 70.0]})

missing = df["score"].isna()
dept_mean = df.groupby("dept")["score"].transform("mean")        # same length as df
df["score_filled"] = df["score"].fillna(dept_mean).fillna(df["score"].mean())
print(df[missing])
```
:::explain
`transform("mean")` returns a Series **aligned to the original rows**: each row gets its group's mean, which slots straight into `fillna`. The second `fillna` covers groups that are entirely NaN (their group mean is NaN). Group-wise imputation is usually better than a global mean because it respects the group structure.
:::end

:::problem medium | Tenure and salary bands | dates, cut, value_counts
Compute each employee's tenure in years as of 2026-11-15 (one decimal), bin the salaries into bands `<65k`, `65–100k`, `>100k` with `pd.cut`, and cross-tabulate band × dept.
:::solution
```python
import pandas as pd
df = pd.DataFrame({
    "name": ["Alice", "Bob", "Carol", "Dan", "Eve", "Frank", "Grace", "Hank", "Iris", "Jay"],
    "dept": ["Eng", "Sales", "Eng", "HR", "Sales", "Eng", "HR", "Sales", "Eng", "HR"],
    "salary": [95000, 72000, 105000, 60000, 68000, 115000, 63000, 70000, 125000, 58000],
    "start_date": pd.to_datetime(["2021-03-15", "2019-07-01", "2020-01-20", "2017-11-05", "2022-06-10",
                                  "2018-09-30", "2021-01-08", "2023-02-14", "2015-04-22", "2022-08-19"])})
today = pd.Timestamp("2026-11-15")
df["tenure_yrs"] = ((today - df["start_date"]).dt.days / 365.25).round(1)
df["band"] = pd.cut(df["salary"], bins=[0, 65000, 100000, float("inf")], labels=["<65k", "65-100k", ">100k"], right=False)
print(df[["name", "tenure_yrs", "band"]])
print(pd.crosstab(df["band"], df["dept"], margins=True))
```
:::explain
Subtracting timestamps gives `Timedelta`s, and `.dt.days` extracts whole days. `pd.cut` bins continuous values into labelled **categoricals** (`right=False` makes the intervals `[a, b)`). `crosstab` counts the combinations, and `margins=True` adds totals. These are typical feature-engineering steps.
:::end

:::problem medium | Top-N per group | sort + groupby.head / nlargest
For each department, list the 2 highest-paid employees with their salary and their rank within the department.
:::solution
```python
import pandas as pd
df = pd.DataFrame({
    "name": ["Alice", "Bob", "Carol", "Dan", "Eve", "Frank", "Grace", "Hank", "Iris", "Jay"],
    "dept": ["Eng", "Sales", "Eng", "HR", "Sales", "Eng", "HR", "Sales", "Eng", "HR"],
    "salary": [95000, 72000, 105000, 60000, 68000, 115000, 63000, 70000, 125000, 58000]})
df["rank_in_dept"] = df.groupby("dept")["salary"].rank(ascending=False, method="first").astype(int)
top2 = df[df["rank_in_dept"] <= 2].sort_values(["dept", "rank_in_dept"])
print(top2)
print(df.sort_values("salary", ascending=False).groupby("dept").head(2).sort_values("dept")["name"].tolist())
```
:::explain
`groupby(...).rank()` is a **transform**: it ranks within each group and returns one value per row, which is perfect for "top N per group" filters. The alternative, sorting globally and then taking `groupby().head(2)`, keeps the first two rows of each group in the sorted order. That's SQL's `ROW_NUMBER() OVER (PARTITION BY …)` in pandas.
:::end

:::problem hard | Data quality report function | introspection over columns
Write `quality_report(df)` returning one row per column with: the dtype, the number and % of missing values, the number of unique values, the top value and its frequency, and (for numerics) min, max and the number of IQR outliers. Run it on the employees data with an injected outlier.
:::solution
```python
import pandas as pd, numpy as np

def quality_report(df):
    rows = []
    for col in df.columns:
        s = df[col]
        vc = s.value_counts(dropna=True)
        row = {"column": col, "dtype": str(s.dtype), "missing": int(s.isna().sum()),
               "missing_%": round(100 * s.isna().mean(), 1), "unique": s.nunique(),
               "top": vc.index[0] if len(vc) else None, "top_freq": int(vc.iloc[0]) if len(vc) else 0}
        if pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_bool_dtype(s):
            q1, q3 = s.quantile([0.25, 0.75])
            iqr = q3 - q1
            row.update(min=s.min(), max=s.max(),
                       outliers=int(((s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)).sum()))
        rows.append(row)
    return pd.DataFrame(rows).set_index("column")

df = pd.DataFrame({
    "dept": ["Eng", "Sales", "Eng", "HR", "Sales", "Eng", "HR", "Sales", "Eng", "HR"],
    "age": [28, 35, 31, 42, 26, 38, 33, 29, 45, 310],                 # 310: a data entry error
    "salary": [95000, 72000, 105000, 60000, 68000, 115000, 63000, 70000, 125000, 58000],
    "score": [92.5, 78.0, 88.0, np.nan, 85.5, 91.0, 74.0, 81.5, np.nan, 70.0],
    "active": [True, True, True, False, True, True, False, True, True, False]})
print(quality_report(df))
```
:::explain
A generic loop over columns with dtype checks (`pd.api.types.is_numeric_dtype`) builds a reusable **data profiling** tool. The IQR rule (values outside [Q1 − 1.5·IQR, Q3 + 1.5·IQR]) flags the age 310 entry. Booleans are excluded from the numeric stats on purpose: `bool` counts as numeric in pandas. Running a report like this first, on every new dataset, saves hours of debugging later.
:::end

:::problem hard | Sessionise user events | sort, diff, cumsum per group
Given click events `(user, timestamp)`, assign a **session id**: a new session starts when the gap since that user's previous event is more than 30 minutes. Then compute each session's start, end, duration and event count. Vectorised, no loops.
:::solution
```python
import pandas as pd
events = pd.DataFrame({
    "user": ["a", "a", "a", "b", "a", "b", "b", "a"],
    "ts": pd.to_datetime(["2026-11-15 09:00", "2026-11-15 09:10", "2026-11-15 09:55", "2026-11-15 10:00",
                          "2026-11-15 10:05", "2026-11-15 10:20", "2026-11-15 11:30", "2026-11-15 10:20"])})
ev = events.sort_values(["user", "ts"]).reset_index(drop=True)
gap = ev.groupby("user")["ts"].diff()                       # NaT for each user's first event
new_session = gap.isna() | (gap > pd.Timedelta(minutes=30))
ev["session"] = new_session.groupby(ev["user"]).cumsum()     # running count of starts per user
summary = (ev.groupby(["user", "session"])
             .agg(start=("ts", "min"), end=("ts", "max"), events=("ts", "size"))
             .assign(minutes=lambda d: (d["end"] - d["start"]).dt.total_seconds() / 60))
print(ev)
print(summary)
```
:::explain
Classic **sessionisation**: sort by user and time, compute the gap to the previous event **within each user** (`groupby().diff()`), mark the session starts with a boolean, and turn those flags into ids with a **cumulative sum** per user (True counts as 1). Every step is vectorised, so the same code processes millions of events. Analytics pipelines (and SQL window functions) use exactly this trick.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Recyclable and low fat products | LeetCode 1757 | https://leetcode.com/problems/recyclable-and-low-fat-products/
`products` has columns `product_id`, `low_fats`, `recyclable` ('Y' or 'N'). Return a DataFrame with just `product_id` for the products that are both low fat and recyclable.
:::starter
```python norun
import pandas as pd

def find_products(products):
    pass
```
:::tests
```python norun
import pandas as pd
df = pd.DataFrame({"product_id": [0, 1, 2, 3, 4], "low_fats": list("YYNYN"), "recyclable": list("NYYYN")})
out = find_products(df)
assert list(out.columns) == ["product_id"]
assert out["product_id"].tolist() == [1, 3]
assert df.shape == (5, 3)
```
:::solution
```python
import pandas as pd

def find_products(products):
    mask = (products["low_fats"] == "Y") & (products["recyclable"] == "Y")   # parentheses!
    return products.loc[mask, ["product_id"]]          # a list keeps it a DataFrame

df = pd.DataFrame({"product_id": [0, 1, 2], "low_fats": list("YYN"), "recyclable": list("NYY")})
print(find_products(df))
```
:::explain
Combine boolean masks with `&`, `|` and `~`, never `and`/`or` (those try to turn a whole Series into one bool and raise). Each comparison needs **parentheses**, because `&` binds tighter than `==`. Selecting `["product_id"]` (a list) returns a DataFrame, while `"product_id"` would return a Series.
:::complexity
O(n).
:::end

:::program basic | Calculate special bonus | LeetCode 1873 | https://leetcode.com/problems/calculate-special-bonus/
An employee gets a bonus equal to 100% of their salary if their `employee_id` is odd **and** their name doesn't start with 'M'; otherwise the bonus is 0. Return `employee_id, bonus` sorted by `employee_id`.
:::starter
```python norun
import pandas as pd

def calculate_special_bonus(employees):
    pass
```
:::tests
```python norun
import pandas as pd
df = pd.DataFrame({"employee_id": [2, 3, 7, 8, 9], "name": ["Meir", "Michael", "Addilyn", "Juan", "Kannon"],
                   "salary": [3000, 3800, 7400, 6100, 7700]})
out = calculate_special_bonus(df.sample(frac=1, random_state=1))
assert list(out.columns) == ["employee_id", "bonus"]
assert out["employee_id"].tolist() == [2, 3, 7, 8, 9]
assert out["bonus"].tolist() == [0, 0, 7400, 0, 7700]
```
:::solution
```python
import numpy as np
import pandas as pd

def calculate_special_bonus(employees):
    ok = (employees["employee_id"] % 2 == 1) & ~employees["name"].str.startswith("M")
    out = employees.assign(bonus=np.where(ok, employees["salary"], 0))
    return out[["employee_id", "bonus"]].sort_values("employee_id")

df = pd.DataFrame({"employee_id": [2, 3, 7], "name": ["Meir", "Michael", "Addilyn"], "salary": [3000, 3800, 7400]})
print(calculate_special_bonus(df))
```
:::explain
`np.where(cond, a, b)` is the vectorised if/else: it picks `salary` where the condition is True and 0 elsewhere, with no `apply` or loop. `.str.startswith` is the vectorised string method, and `~` negates the mask. `assign` returns a new frame, so the input isn't modified. The test shuffles the input to make sure you sort.
:::complexity
O(n log n) for the sort.
:::end

:::program medium | Second highest salary | LeetCode 176 | https://leetcode.com/problems/second-highest-salary/
Return a one-row DataFrame with column `SecondHighestSalary` holding the second highest **distinct** salary, or null (NaN/None) if there isn't one.
:::starter
```python norun
import pandas as pd

def second_highest_salary(employee):
    pass
```
:::tests
```python norun
import pandas as pd
mk = lambda xs: pd.DataFrame({"id": range(1, len(xs) + 1), "salary": xs})
out = second_highest_salary(mk([100, 200, 300]))
assert list(out.columns) == ["SecondHighestSalary"] and out.shape == (1, 1)
assert out.iloc[0, 0] == 200
assert pd.isna(second_highest_salary(mk([100])).iloc[0, 0])
assert pd.isna(second_highest_salary(mk([100, 100])).iloc[0, 0])
assert second_highest_salary(mk([300, 300, 200, 200])).iloc[0, 0] == 200
```
:::hint
`drop_duplicates()` (or `unique()`) first, then sort descending. Handle the "fewer than 2 distinct values" case explicitly.
:::solution
```python
import pandas as pd

def second_highest_salary(employee):
    distinct = employee["salary"].drop_duplicates().nlargest(2)
    value = distinct.iloc[1] if len(distinct) == 2 else None
    return pd.DataFrame({"SecondHighestSalary": [value]})

print(second_highest_salary(pd.DataFrame({"id": [1, 2, 3], "salary": [100, 200, 300]})))
```
:::explain
"Second highest" has two edge cases that most first attempts fail: **ties** (`[300, 300, 200]` should give 200, not 300), handled by de-duplicating first, and **missing** (only one distinct value), which must give null rather than raise `IndexError`. `nlargest(2)` is O(n), cheaper than a full sort.
:::complexity
O(n).
:::end

:::program hard | Department top three salaries | LeetCode 185 | https://leetcode.com/problems/department-top-three-salaries/
`employee(id, name, salary, departmentId)` and `department(id, name)`. Return every employee whose salary is among the **top three distinct** salaries of their department, with columns `Department, Employee, Salary`.
:::starter
```python norun
import pandas as pd

def top_three_salaries(employee, department):
    pass
```
:::tests
```python norun
import pandas as pd
emp = pd.DataFrame({"id": range(1, 8), "name": ["Joe", "Henry", "Sam", "Max", "Janet", "Randy", "Will"],
                    "salary": [85000, 80000, 60000, 90000, 69000, 85000, 70000], "departmentId": [1, 2, 2, 1, 1, 1, 1]})
dep = pd.DataFrame({"id": [1, 2], "name": ["IT", "Sales"]})
out = top_three_salaries(emp, dep)
assert list(out.columns) == ["Department", "Employee", "Salary"]
got = sorted(map(tuple, out.values.tolist()))
assert got == [("IT", "Joe", 85000), ("IT", "Max", 90000), ("IT", "Randy", 85000), ("IT", "Will", 70000),
               ("Sales", "Henry", 80000), ("Sales", "Sam", 60000)]
```
:::hint
Within each department, use `groupby("departmentId")["salary"].rank(method="dense", ascending=False)`: dense ranking gives tied salaries the same rank with no gaps. Keep ranks ≤ 3, then merge to get the department names.
:::solution
```python
import pandas as pd

def top_three_salaries(employee, department):
    e = employee.assign(rnk=employee.groupby("departmentId")["salary"]
                                    .rank(method="dense", ascending=False))
    top = e[e["rnk"] <= 3]
    merged = top.merge(department, left_on="departmentId", right_on="id",
                       suffixes=("_emp", "_dep"))
    return merged.rename(columns={"name_dep": "Department", "name_emp": "Employee",
                                  "salary": "Salary"})[["Department", "Employee", "Salary"]]

emp = pd.DataFrame({"id": [1, 2, 3, 4], "name": ["Joe", "Max", "Randy", "Will"],
                    "salary": [85000, 90000, 85000, 70000], "departmentId": [1, 1, 1, 1]})
print(top_three_salaries(emp, pd.DataFrame({"id": [1], "name": ["IT"]})))
```
:::explain
It's the SQL `DENSE_RANK() OVER (PARTITION BY …)` translated to pandas. `groupby(...).rank` is a **transform**, so it returns one rank per original row. `method="dense"` matters: with salaries 90k, 85k, 85k, 70k it gives 1, 2, 2, 3, so Will (70k) qualifies. `"min"` would give 1, 2, 2, 4 and drop him. Both tables have `id` and `name` columns, so `suffixes` keeps them apart before renaming.
:::complexity
O(n log n) for the ranking.
:::end
