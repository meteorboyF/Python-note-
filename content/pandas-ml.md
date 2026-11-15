# Pandas III · ML Pipelines

Pandas is where most machine-learning projects actually spend their time: **loading, validating, cleaning, engineering features, splitting and exploring** the data before a single model is trained. This chapter turns the tools from Pandas I & II into a repeatable **pipeline**: the same steps, in the same order, applied identically to training and test data, without **data leakage**.

:::analogy A bakery production line
Raw ingredients (raw data) go through stations: inspection (validation), washing (cleaning), measuring and mixing (feature engineering), portioning (train/test split), then the oven (the model). Every batch must go through **the same stations with the same settings**. If you calibrate the scale using tomorrow's ingredients (the test set), your quality numbers are lies.
:::

## 1. The shape of an ML pipeline

```text
raw CSV ─► validate schema ─► clean (types, NaN, outliers) ─► split train/test
                                                               │
            fit statistics on TRAIN only (means, encodings) ◄──┘
                                    │
             transform train AND test with the same statistics ─► features ─► model
```

```python
import pandas as pd, numpy as np
rng = np.random.default_rng(0)
n = 300
df = pd.DataFrame({
    "age": rng.integers(18, 70, n).astype(float),
    "income": rng.lognormal(10.5, 0.5, n).round(0),
    "city": rng.choice(["Dhaka", "Chittagong", "Sylhet", "Khulna"], n, p=[0.5, 0.25, 0.15, 0.1]),
    "signup": pd.to_datetime("2025-01-01") + pd.to_timedelta(rng.integers(0, 600, n), unit="D"),
    "visits": rng.poisson(5, n),
})
df.loc[rng.choice(n, 20, replace=False), "age"] = np.nan          # inject missing values
df["churned"] = ((df["visits"] < 3) | (rng.random(n) < 0.1)).astype(int)
print(df.head(), df.shape, df["churned"].mean().round(3), sep="\n")
```

## 2. Train / validation / test split (without scikit-learn)

```python
import pandas as pd, numpy as np
rng = np.random.default_rng(0)
df = pd.DataFrame({"x": rng.normal(size=1000), "y": rng.integers(0, 2, 1000)})

shuffled = df.sample(frac=1, random_state=42)                 # shuffle rows reproducibly
n = len(df)
train, val, test = np.split(shuffled, [int(0.7 * n), int(0.85 * n)])
print(len(train), len(val), len(test))

# stratified split: keep the class ratio identical in each part
strat_test = df.groupby("y", group_keys=False).sample(frac=0.2, random_state=1)
strat_train = df.drop(strat_test.index)
print(df["y"].mean().round(3), strat_train["y"].mean().round(3), strat_test["y"].mean().round(3))
```

:::trap Time series must NOT be shuffled
If the data has a time order (sales, sensor readings, churn by date), split **by time**: train on the past, test on the future. A random split lets the model peek at the future, so the evaluation will be too optimistic.
:::

```python
import pandas as pd, numpy as np
d = pd.DataFrame({"date": pd.date_range("2026-01-01", periods=100), "v": np.arange(100)})
cutoff = d["date"].quantile(0.8)
train, test = d[d["date"] <= cutoff], d[d["date"] > cutoff]
print(train["date"].max().date(), "<", test["date"].min().date())
```

## 3. Data leakage: the #1 silent ML bug

:::term Data leakage
**Data leakage** happens when information that wouldn't be available at prediction time sneaks into training: test-set statistics used for scaling or imputation, a feature computed from the target, or future rows used to compute "past" features. Leaky models score brilliantly offline and fail in production.
:::

```python
import pandas as pd, numpy as np
rng = np.random.default_rng(3)
df = pd.DataFrame({"income": rng.lognormal(10, 1, 200)})
train, test = df.iloc[:150].copy(), df.iloc[150:].copy()

# WRONG: statistics computed on ALL the data (the test set leaks into training)
leaky_mean = df["income"].mean()

# RIGHT: fit on train, apply the SAME numbers to test
mu, sigma = train["income"].mean(), train["income"].std()
train["income_z"] = (train["income"] - mu) / sigma
test["income_z"] = (test["income"] - mu) / sigma
print(round(leaky_mean), round(mu), train["income_z"].mean().round(6), test["income_z"].mean().round(3))
```

The test set's mean isn't exactly 0 after scaling, and that's **correct**: it represents genuinely unseen data.

## 4. A reusable transformer: fit on train, transform anywhere

```python
import pandas as pd, numpy as np

class Preprocessor:
    """Learns statistics from training data, then applies them consistently."""
    def __init__(self, numeric, categorical, top_k=3):
        self.numeric, self.categorical, self.top_k = numeric, categorical, top_k

    def fit(self, df):
        self.medians_ = df[self.numeric].median()
        self.means_ = df[self.numeric].fillna(self.medians_).mean()
        self.stds_ = df[self.numeric].fillna(self.medians_).std().replace(0, 1)
        self.categories_ = {c: df[c].value_counts().index[:self.top_k].tolist() for c in self.categorical}
        return self

    def transform(self, df):
        out = pd.DataFrame(index=df.index)
        num = df[self.numeric].fillna(self.medians_)
        for c in self.numeric:
            out[f"{c}_missing"] = df[c].isna().astype(int)          # missingness can be informative
        out[self.numeric] = (num - self.means_) / self.stds_
        for c, cats in self.categories_.items():
            col = df[c].where(df[c].isin(cats), "OTHER")             # rare/unseen -> OTHER
            for cat in cats + ["OTHER"]:
                out[f"{c}={cat}"] = (col == cat).astype(int)        # fixed one-hot columns
        return out

rng = np.random.default_rng(0)
df = pd.DataFrame({"age": rng.integers(18, 70, 50).astype(float), "city": rng.choice(list("ABCDE"), 50)})
df.loc[[1, 5, 9], "age"] = np.nan
train, test = df.iloc[:40], df.iloc[40:].copy()
test.loc[test.index[0], "city"] = "Z"                                # a category never seen in training
prep = Preprocessor(["age"], ["city"]).fit(train)
Xtr, Xte = prep.transform(train), prep.transform(test)
print(Xtr.columns.tolist())
print(Xtr.shape, Xte.shape, list(Xtr.columns) == list(Xte.columns))
print(Xte.head(3))
```

:::boss Same columns, same order, every time
`pd.get_dummies` on the test set alone produces **different columns** when a category is missing or new, and the model silently misreads them. Learn the category list during `fit`, and always generate exactly those columns (plus an `OTHER` bucket). That's precisely what scikit-learn's `OneHotEncoder(handle_unknown="ignore")` does.
:::

## 5. Feature engineering

### Numeric features

```python
import pandas as pd, numpy as np
rng = np.random.default_rng(1)
df = pd.DataFrame({"income": rng.lognormal(10, 1, 8).round(), "debt": rng.integers(0, 50000, 8), "age": rng.integers(20, 65, 8)})
df["log_income"] = np.log1p(df["income"])                     # tame right-skewed money columns
df["debt_ratio"] = df["debt"] / df["income"]                   # ratios often beat raw values
df["age_bin"] = pd.cut(df["age"], [0, 30, 45, 120], labels=["young", "mid", "senior"])
df["income_rank"] = df["income"].rank(pct=True).round(2)       # robust to outliers
lo, hi = df["income"].quantile([0.05, 0.95])
df["income_clipped"] = df["income"].clip(lo, hi)              # winsorising
print(df.round(3))
```

### Categorical features

```python
import pandas as pd
df = pd.DataFrame({"city": ["Dhaka", "Sylhet", "Dhaka", "Khulna", "Dhaka", "Sylhet"],
                   "size": ["S", "L", "M", "M", "L", "S"], "bought": [1, 0, 1, 0, 1, 1]})
print(pd.get_dummies(df["city"], prefix="city", dtype=int))                    # one-hot
df["size_ord"] = df["size"].map({"S": 0, "M": 1, "L": 2})                     # ordinal (order matters)
df["city_freq"] = df["city"].map(df["city"].value_counts(normalize=True))       # frequency encoding
df["city_target"] = df.groupby("city")["bought"].transform("mean")              # target encoding (fit on TRAIN only!)
print(df)
```

| Encoding | When | Watch out |
|---|---|---|
| One-hot | few categories, no order | explodes with high cardinality |
| Ordinal | a natural order (S < M < L) | invents order if there isn't one |
| Frequency | high cardinality | different categories can collide |
| Target (mean of y) | high cardinality, strong signal | **leaks** unless fit on train / out-of-fold |
| Hashing | huge or unbounded vocabularies | collisions, not interpretable |

### Date and time features

```python
import pandas as pd
d = pd.DataFrame({"ts": pd.to_datetime(["2026-11-15 08:30", "2026-11-21 22:10", "2026-12-25 12:00"])})
d["hour"] = d["ts"].dt.hour
d["dow"] = d["ts"].dt.dayofweek
d["is_weekend"] = (d["dow"] >= 5).astype(int)
d["month"] = d["ts"].dt.month
d["days_to_xmas"] = (pd.Timestamp("2026-12-25") - d["ts"]).dt.days
import numpy as np
d["hour_sin"], d["hour_cos"] = np.sin(2 * np.pi * d["hour"] / 24), np.cos(2 * np.pi * d["hour"] / 24)   # cyclical encoding
print(d.round(3))
```

:::tip Cyclical features
Hour 23 and hour 0 are neighbours, but as plain numbers they're 23 apart. Encoding them as `sin`/`cos` of the angle puts them next to each other on a circle. Use this for hours, weekdays and months.
:::

### Text features

```python
import pandas as pd
reviews = pd.Series(["Great product!!", "terrible, broke after 2 days", "OK value", "Great value, great price"])
feat = pd.DataFrame({
    "n_chars": reviews.str.len(),
    "n_words": reviews.str.split().str.len(),
    "n_exclaim": reviews.str.count("!"),
    "has_digit": reviews.str.contains(r"\d").astype(int),
    "mentions_great": reviews.str.lower().str.count("great"),
})
print(feat)
bow = reviews.str.lower().str.replace(r"[^a-z\s]", "", regex=True).str.get_dummies(sep=" ")   # bag of words
print(bow)
```

### Aggregate (group) features

```python
import pandas as pd
tx = pd.DataFrame({"user": [1, 1, 2, 2, 2, 3], "amount": [20, 35, 5, 7, 400, 60]})
user_stats = tx.groupby("user")["amount"].agg(n_tx="count", avg_amount="mean", max_amount="max")
tx = tx.join(user_stats, on="user")
tx["amount_vs_avg"] = tx["amount"] / tx["avg_amount"]          # "is this unusual for THIS user?"
print(tx.round(2))
```

## 6. Validation and data-quality checks

```python
import pandas as pd, numpy as np

SCHEMA = {"age": ("float", 0, 120), "income": ("float", 0, None), "city": ("object", None, None)}

def validate(df):
    problems = []
    for col, (kind, lo, hi) in SCHEMA.items():
        if col not in df:
            problems.append(f"missing column {col!r}"); continue
        s = df[col]
        if kind == "float" and not pd.api.types.is_numeric_dtype(s):
            problems.append(f"{col}: expected numeric, got {s.dtype}")
            continue
        if lo is not None and (s < lo).any():
            problems.append(f"{col}: {(s < lo).sum()} values below {lo}")
        if hi is not None and (s > hi).any():
            problems.append(f"{col}: {(s > hi).sum()} values above {hi}")
        if s.isna().mean() > 0.3:
            problems.append(f"{col}: {s.isna().mean():.0%} missing")
    if df.duplicated().any():
        problems.append(f"{df.duplicated().sum()} duplicate rows")
    return problems

good = pd.DataFrame({"age": [25.0, 40.0], "income": [1e4, 2e4], "city": ["A", "B"]})
bad = pd.DataFrame({"age": [25.0, 250.0, np.nan, np.nan], "income": [-5.0, 2e4, 3e4, 3e4], "city": ["A", "B", "C", "C"]})
print(validate(good) or "OK")
for p in validate(bad):
    print(" -", p)
```

## 7. Pandas → NumPy → models

```python
import pandas as pd, numpy as np
rng = np.random.default_rng(0)
df = pd.DataFrame({"x1": rng.normal(size=200), "x2": rng.normal(size=200)})
df["y"] = (2 * df["x1"] - df["x2"] + rng.normal(0, 0.5, 200) > 0).astype(int)
features = ["x1", "x2"]
X = df[features].to_numpy(dtype=np.float32)          # models want plain numeric arrays
y = df["y"].to_numpy()
print(X.shape, X.dtype, y[:10])

# a tiny logistic regression trained on the arrays (NumPy chapter)
Xb = np.c_[np.ones(len(X)), X]
w = np.zeros(3)
for _ in range(300):
    p = 1 / (1 + np.exp(-Xb @ w))
    w -= 0.5 * Xb.T @ (p - y) / len(y)
df["pred"] = (1 / (1 + np.exp(-Xb @ w)) >= 0.5).astype(int)
print("weights:", w.round(2), "| accuracy:", (df["pred"] == df["y"]).mean())
print(pd.crosstab(df["y"], df["pred"], rownames=["actual"], colnames=["predicted"]))   # confusion matrix
```

With scikit-learn installed, the equivalent is `from sklearn.linear_model import LogisticRegression; LogisticRegression().fit(df[features], df["y"])`, and pandas DataFrames go straight in. For PyTorch, use `torch.tensor(df[features].to_numpy(dtype="float32"))`.

## 8. Exploratory data analysis (EDA) template

```python
import pandas as pd, numpy as np
rng = np.random.default_rng(5)
df = pd.DataFrame({"age": rng.integers(18, 70, 500), "income": rng.lognormal(10.5, 0.6, 500).round(),
                   "segment": rng.choice(["a", "b", "c"], 500), "churn": rng.integers(0, 2, 500)})
print("shape:", df.shape)
print(df.dtypes.value_counts().to_dict())
print(df.describe(include="all").T[["count", "mean", "std", "min", "max", "unique", "top"]].round(1))
print("skew:", df[["age", "income"]].skew().round(2).to_dict())
print(df.corr(numeric_only=True).round(2))
print(df.groupby("segment")["churn"].agg(["mean", "size"]).round(3))       # target rate per category
print(pd.qcut(df["income"], 4).value_counts().sort_index())                 # quartile bins
```

## 9. Pipelines as method chains with `pipe`

```python
import pandas as pd, numpy as np

def drop_dupes(df):
    return df.drop_duplicates()

def fix_types(df):
    return df.assign(age=pd.to_numeric(df["age"], errors="coerce"))

def add_features(df, ref_year=2026):
    return df.assign(birth_year=ref_year - df["age"], is_senior=(df["age"] >= 60).astype(int))

raw = pd.DataFrame({"name": ["a", "b", "b", "c"], "age": ["30", "65", "65", "oops"]})
clean = raw.pipe(drop_dupes).pipe(fix_types).pipe(add_features, ref_year=2026)
print(clean)
```

Each step is a small, testable pure function, and `.pipe` chains them into a readable top-to-bottom pipeline.

## 10. Experiment tracking with a DataFrame

```python
import pandas as pd, itertools
results = []
for lr, depth in itertools.product([0.1, 0.01], [3, 5]):
    score = round(0.8 + 0.05 * (lr == 0.1) + 0.02 * depth / 5, 3)     # pretend training
    results.append({"lr": lr, "depth": depth, "val_acc": score})
log = pd.DataFrame(results).sort_values("val_acc", ascending=False)
print(log)
print(log.pivot_table(index="lr", columns="depth", values="val_acc"))
```

## Mastery checklist

- Split **before** fitting any statistic; time-ordered data is split by time.
- Learn imputation values, scaling statistics and category lists from **train only**.
- Produce **identical columns** for train, validation, test and production.
- Validate schemas and value ranges on every new batch.
- Keep each step a pure function, and chain them with `pipe`.
- Convert to `float32` NumPy arrays at the model boundary.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Scaling/imputing with full-data statistics | fit on train only |
| 2 | Random split on time series | split by time |
| 3 | `get_dummies` separately on train and test | a fixed category list (`fit`/`transform`) |
| 4 | Target encoding computed with the row's own label | out-of-fold / train-only |
| 5 | Features built from the future (rolling windows including today's label) | `shift(1)` before rolling |
| 6 | Duplicates spanning train and test | dedupe before splitting, or group-split |
| 7 | Silent dtype drift (numbers read as strings) | schema validation |
| 8 | Dropping all rows with any NaN | impute + missingness flags |
| 9 | Class imbalance ignored | stratified splits, better metrics |
| 10 | Not shuffling with a seed | `random_state=` everywhere |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python
import pandas as pd
train = pd.DataFrame({"x": [1.0, 2.0, 3.0]})
test = pd.DataFrame({"x": [10.0]})
mu, sd = train["x"].mean(), train["x"].std()
print(((test["x"] - mu) / sd).round(2).tolist())
```
What prints?
- [x] `[8.0]`
- [ ] `[0.0]`
- [ ] `[nan]`
The test set must be scaled with the **training** statistics (μ = 2, sd = 1), so 10 becomes (10 − 2)/1 = 8.0. Re-fitting the scaler on one test row would give `nan` (std of 1 value), and fitting on train+test leaks.
:::

:::quiz
```python
import pandas as pd
train = pd.get_dummies(pd.Series(["a", "b", "c"]), dtype=int)
test = pd.get_dummies(pd.Series(["b", "d"]), dtype=int)
print(test.reindex(columns=train.columns, fill_value=0).values.tolist())
```
What prints?
- [ ] `[[1, 0], [0, 1]]`
- [x] `[[0, 1, 0], [0, 0, 0]]`
- [ ] `KeyError: 'd'`
`reindex` forces the test frame onto the **training columns**: the unseen category `d` is dropped (all zeros), and the missing `a`/`c` columns are filled with 0. Without this, the model would receive a different number of features.
:::

:::quiz
A model predicts the positive class for 90 of 100 samples. 10 samples are truly positive and the model catches all of them. What are precision and recall?
- [ ] precision 1.0, recall 0.11
- [x] precision 0.11, recall 1.0
- [ ] precision 0.9, recall 1.0
Recall = TP / (actual positives) = 10/10 = 1.0. Precision = TP / (predicted positives) = 10/90 ≈ 0.11. Predicting "positive" for almost everything maximises recall and wrecks precision, which is why you report both (or F1).
:::

## Practice problems

:::problem basic | Stratified split by hand | groupby.sample
Split a dataset with a 10% positive rate into 80/20 train/test **stratified** by the label, and verify that both parts have (almost) the same positive rate.
:::solution
```python
import pandas as pd, numpy as np
rng = np.random.default_rng(0)
df = pd.DataFrame({"x": rng.normal(size=1000), "label": (rng.random(1000) < 0.1).astype(int)})
test = df.groupby("label", group_keys=False).sample(frac=0.2, random_state=7)
train = df.drop(test.index)
print(len(train), len(test))
print(df["label"].mean().round(3), train["label"].mean().round(3), test["label"].mean().round(3))
print(train.index.intersection(test.index).empty)
```
:::explain
Sampling 20% **within each label group** keeps the class ratio identical across splits, which matters a lot for rare classes, where a random split might leave the test set with almost no positives. `drop(test.index)` guarantees no row is in both sets.
:::end

:::problem basic | Missingness indicators + median imputation | fit/transform
Impute the missing numeric values with the **train** median and add a `_was_missing` flag for each numeric column, applying the same medians to the test set.
:::solution
```python
import pandas as pd, numpy as np
train = pd.DataFrame({"age": [25, np.nan, 40, 35], "income": [30e3, 45e3, np.nan, 50e3]})
test = pd.DataFrame({"age": [np.nan, 50], "income": [np.nan, 20e3]})
medians = train.median()

def impute(df):
    out = df.fillna(medians)
    for c in df.columns:
        out[f"{c}_was_missing"] = df[c].isna().astype(int)
    return out

print(impute(train), impute(test), sep="\n\n")
```
:::explain
The medians are learned once from training data and reused, so the test set never influences them. The flags preserve the information that a value was missing, which is often predictive in itself (e.g. income left blank).
:::end

:::problem medium | Leak-free lag features | groupby + shift + rolling
For daily sales per store, build the features `lag_1` (yesterday's sales) and `roll7_mean` (the mean of the **previous** 7 days, excluding today) per store, so that no feature uses the same day's target.
:::solution
```python
import pandas as pd, numpy as np
rng = np.random.default_rng(4)
days = pd.date_range("2026-11-01", periods=12)
df = pd.DataFrame([(s, d, int(rng.integers(50, 150))) for s in ["A", "B"] for d in days],
                  columns=["store", "date", "sales"]).sort_values(["store", "date"])
g = df.groupby("store")["sales"]
df["lag_1"] = g.shift(1)
df["roll7_mean"] = g.transform(lambda s: s.shift(1).rolling(7, min_periods=3).mean()).round(1)
print(df[df["store"] == "A"])
```
:::explain
`shift(1)` moves every value down one row **within each store**, so row t sees only data up to t−1. Rolling over the shifted series excludes the current day. Forgetting the shift is one of the most common leakage bugs in forecasting. `min_periods=3` avoids noisy averages from a single day.
:::end

:::problem medium | Out-of-fold target encoding | K-fold, leakage
Target-encode a high-cardinality `city` column **out-of-fold** (5 folds): each row's encoding uses only the other folds' rows, smoothed toward the global mean with weight m = 5.
:::solution
```python
import pandas as pd, numpy as np
rng = np.random.default_rng(0)
n = 400
df = pd.DataFrame({"city": rng.choice([f"c{i}" for i in range(20)], n)})
city_effect = {f"c{i}": rng.random() for i in range(20)}
df["y"] = (rng.random(n) < df["city"].map(city_effect)).astype(int)
df["fold"] = rng.integers(0, 5, n)
m, prior = 5, df["y"].mean()
df["city_te"] = np.nan
for k in range(5):
    tr = df[df["fold"] != k]
    stats = tr.groupby("city")["y"].agg(["sum", "count"])
    smooth = (stats["sum"] + m * prior) / (stats["count"] + m)        # shrink small groups toward the prior
    idx = df["fold"] == k
    df.loc[idx, "city_te"] = df.loc[idx, "city"].map(smooth).fillna(prior)
print(df.head())
print("corr with target:", df[["city_te", "y"]].corr().iloc[0, 1].round(3))
```
:::explain
A naive target mean includes each row's **own** label, so the model learns to read the answer back, especially for rare cities. Computing the encoding from the other folds removes that self-leakage. **Smoothing** blends the city mean with the global mean, weighted by the city's sample size, so a city seen twice doesn't get an extreme 0 or 1.
:::end

:::problem medium | Outlier detection report | IQR and z-score per column
For every numeric column, count the outliers by the IQR rule and by |z| > 3, and show the rows flagged by **both** methods.
:::solution
```python
import pandas as pd, numpy as np
rng = np.random.default_rng(2)
df = pd.DataFrame({"a": rng.normal(50, 5, 300), "b": rng.exponential(10, 300), "c": rng.integers(0, 10, 300)})
df.loc[[5, 77], "a"] = [120, -40]
num = df.select_dtypes("number")
q1, q3 = num.quantile(0.25), num.quantile(0.75)
iqr = q3 - q1
iqr_flag = (num < q1 - 1.5 * iqr) | (num > q3 + 1.5 * iqr)
z_flag = ((num - num.mean()) / num.std()).abs() > 3
print(pd.DataFrame({"iqr_outliers": iqr_flag.sum(), "z_outliers": z_flag.sum()}))
print(df[(iqr_flag & z_flag).any(axis=1)].round(2))
```
:::explain
Broadcasting the per-column quantiles across the whole frame gives boolean masks in one expression per method. IQR is robust to skew and the outliers themselves; the z-score assumes rough normality, so on the skewed column `b`, the two disagree. Rows flagged by both methods are the strongest candidates to investigate.
:::end

:::problem hard | End-to-end churn pipeline | everything together
Build a complete pipeline on synthetic churn data: validate, split by signup date (the last 20% of dates is the test set), fit a preprocessor on train (median imputation + scaling + top-k one-hot), train logistic regression with NumPy, and report train vs test accuracy and the confusion matrix.
:::solution
```python
import pandas as pd, numpy as np
rng = np.random.default_rng(42)
n = 800
df = pd.DataFrame({
    "signup": pd.to_datetime("2025-01-01") + pd.to_timedelta(rng.integers(0, 600, n), unit="D"),
    "age": rng.integers(18, 70, n).astype(float),
    "visits": rng.poisson(6, n).astype(float),
    "plan": rng.choice(["free", "basic", "pro"], n, p=[0.5, 0.3, 0.2]),
})
logit = -0.4 * df["visits"] + 0.03 * df["age"] + df["plan"].map({"free": 1.0, "basic": 0.0, "pro": -1.0}) + 1.0
df["churn"] = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)
df.loc[rng.choice(n, 40, replace=False), "age"] = np.nan

assert {"signup", "age", "visits", "plan", "churn"} <= set(df.columns)
cut = df["signup"].quantile(0.8)
train, test = df[df["signup"] <= cut], df[df["signup"] > cut]

num, cat = ["age", "visits"], ["plan"]
med = train[num].median()
mu = train[num].fillna(med).mean(); sd = train[num].fillna(med).std()
cats = {c: sorted(train[c].unique()) for c in cat}

def transform(d):
    X = ((d[num].fillna(med) - mu) / sd)
    for c, vals in cats.items():
        for v in vals:
            X[f"{c}={v}"] = (d[c] == v).astype(float)
    return np.c_[np.ones(len(X)), X.to_numpy(dtype=float)]

Xtr, Xte = transform(train), transform(test)
ytr, yte = train["churn"].to_numpy(), test["churn"].to_numpy()
w = np.zeros(Xtr.shape[1])
for _ in range(2000):
    p = 1 / (1 + np.exp(-Xtr @ w))
    w -= 0.3 * Xtr.T @ (p - ytr) / len(ytr)
pred = lambda X: (1 / (1 + np.exp(-X @ w)) >= 0.5).astype(int)
print(f"train acc {np.mean(pred(Xtr) == ytr):.3f} | test acc {np.mean(pred(Xte) == yte):.3f} | baseline {max(yte.mean(), 1 - yte.mean()):.3f}")
print(pd.crosstab(pd.Series(yte, name="actual"), pd.Series(pred(Xte), name="predicted")))
```
:::explain
Every statistic (medians, means, standard deviations, category lists) comes from `train`, and `transform` applies the exact same recipe to both splits, so the column count and order are identical. The time-based split mimics deployment: predict future signups from past ones. Always compare against the **majority-class baseline**. An accuracy that barely beats it means the model has learned little. The confusion matrix shows *which* errors it makes.
:::end

:::problem hard | Detect leakage automatically | suspicious feature scan
Write `leakage_scan(df, target)` that flags features which (a) predict the target almost perfectly on their own (single-feature AUC ≥ 0.98), or (b) are identical to the target or its negation. Test it on data with a planted leaky column.
:::solution
```python
import pandas as pd, numpy as np

def auc(score, y):                                   # rank-based AUC (Mann–Whitney U)
    r = pd.Series(score).rank().to_numpy()
    pos = y == 1
    n1, n0 = pos.sum(), (~pos).sum()
    return (r[pos].sum() - n1 * (n1 + 1) / 2) / (n1 * n0)

def leakage_scan(df, target):
    y = df[target].to_numpy()
    report = []
    for c in df.columns.drop(target):
        s = df[c]
        if not pd.api.types.is_numeric_dtype(s):
            s = s.astype("category").cat.codes
        a = auc(s.fillna(s.median()).to_numpy(), y)
        a = max(a, 1 - a)                            # direction doesn't matter
        same = (s.to_numpy() == y).all() or (s.to_numpy() == 1 - y).all()
        if a >= 0.98 or same:
            report.append((c, round(float(a), 3), "identical to target" if same else "near-perfect predictor"))
    return report

rng = np.random.default_rng(1)
n = 500
df = pd.DataFrame({"age": rng.integers(18, 70, n), "visits": rng.poisson(5, n)})
df["churned"] = (df["visits"] < 4).astype(int) ^ (rng.random(n) < 0.15)
df["account_closed_date_set"] = df["churned"]                         # LEAK: recorded after churn
df["refund_amount"] = df["churned"] * rng.integers(10, 50, n)         # LEAK: a consequence of churn
print(leakage_scan(df, "churned"))
```
:::explain
Leaky features are usually **consequences** of the target (a closure date, a refund), so on their own they separate the classes almost perfectly. The rank-based AUC measures each feature's standalone power without training a model, and `max(a, 1 − a)` catches negative relationships too. Legitimate features (`visits` here) score well but not perfectly. A scan like this belongs in every pipeline's validation step.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Consistent one-hot encoding | ML task
Write `fit_one_hot(train, cols)`, which returns an encoder function. The encoder must produce **the same columns in the same order** for any frame: unseen categories become all zeros, and missing categories become 0 columns.
:::starter
```python norun
import pandas as pd

def fit_one_hot(train, cols):
    pass
```
:::tests
```python norun
import pandas as pd
train = pd.DataFrame({"color": ["red", "blue", "red"], "size": ["S", "M", "L"], "price": [1.0, 2.0, 3.0]})
enc = fit_one_hot(train, ["color", "size"])
a = enc(train)
b = enc(pd.DataFrame({"color": ["green"], "size": ["M"], "price": [9.0]}))
assert list(a.columns) == list(b.columns)
assert "price" in a.columns and "color" not in a.columns
assert b.filter(like="color_").sum(axis=1).tolist() == [0]
assert b["size_M"].tolist() == [1] and a.shape[0] == 3
```
:::hint
At fit time, record the column list from `pd.get_dummies(train, columns=cols, dtype=int)`. At transform time, call `get_dummies` again and then `reindex(columns=saved, fill_value=0)`.
:::solution
```python
import pandas as pd

def fit_one_hot(train, cols):
    columns = pd.get_dummies(train, columns=cols, dtype=int).columns   # learned from train only
    def encode(df):
        return pd.get_dummies(df, columns=cols, dtype=int).reindex(columns=columns, fill_value=0)
    return encode

enc = fit_one_hot(pd.DataFrame({"c": ["x", "y"]}), ["c"])
print(enc(pd.DataFrame({"c": ["y", "z"]})))
```
:::explain
`get_dummies` on its own creates columns from whatever values happen to appear, so train and test can end up with different shapes and the model breaks (or worse, silently misaligns features). The fix is the **fit/transform** pattern: learn the vocabulary once, then **reindex** every later frame to it. A closure returning `encode` keeps the learned state, a tiny version of scikit-learn's `OneHotEncoder(handle_unknown="ignore")`.
:::complexity
O(n · categories).
:::end

:::program medium | K-fold indices by hand | ML task
Write `kfold(n, k, seed)`, which yields `(train_idx, val_idx)` NumPy arrays. Every index must appear in exactly one validation fold, the fold sizes may differ by at most 1, and the result must be shuffled but reproducible with `seed`.
:::starter
```python norun
import numpy as np

def kfold(n, k, seed=0):
    pass
```
:::tests
```python norun
import numpy as np
folds = list(kfold(10, 3, seed=42))
assert len(folds) == 3
vals = np.concatenate([v for _, v in folds])
assert sorted(vals.tolist()) == list(range(10))
assert sorted(len(v) for _, v in folds) == [3, 3, 4]
assert all(set(t).isdisjoint(v) and len(t) + len(v) == 10 for t, v in folds)
assert [v.tolist() for _, v in kfold(10, 3, seed=42)] == [v.tolist() for _, v in folds]
assert [v.tolist() for _, v in kfold(10, 3, seed=1)] != [v.tolist() for _, v in folds]
```
:::solution
```python
import numpy as np

def kfold(n, k, seed=0):
    idx = np.random.default_rng(seed).permutation(n)     # shuffle once, reproducibly
    for val in np.array_split(idx, k):                  # sizes differ by at most 1
        yield np.setdiff1d(idx, val), val

for tr, va in kfold(7, 3, seed=0):
    print(va, len(tr))
```
:::explain
`np.array_split` (unlike `np.split`) allows uneven parts: 10 into 3 gives sizes 4, 3, 3. The training set is "everything else", computed with `setdiff1d`. A local `default_rng(seed)` gives reproducible shuffles without touching global random state. Being a **generator**, it yields one fold at a time, like scikit-learn's `KFold.split`.
:::complexity
O(k · n log n) because of `setdiff1d`'s sort (a boolean mask would give O(k · n)).
:::end

:::program medium | Classification report from scratch | ML task
Given `y_true` and `y_pred` (lists of labels), return a DataFrame indexed by class with columns `precision, recall, f1, support`, plus the overall accuracy. Treat 0/0 as 0.
:::starter
```python norun
import pandas as pd

def report(y_true, y_pred):
    pass        # return (df, accuracy)
```
:::tests
```python norun
import pandas as pd
yt = ["cat", "cat", "dog", "dog", "dog", "bird"]
yp = ["cat", "dog", "dog", "dog", "cat", "cat"]
df, acc = report(yt, yp)
assert list(df.columns) == ["precision", "recall", "f1", "support"]
assert abs(acc - 3 / 6) < 1e-12
assert abs(df.loc["cat", "precision"] - 1 / 3) < 1e-12 and abs(df.loc["cat", "recall"] - 1 / 2) < 1e-12
assert abs(df.loc["dog", "f1"] - 2 / 3) < 1e-12 and df.loc["dog", "support"] == 3
assert df.loc["bird", "precision"] == 0 and df.loc["bird", "f1"] == 0
```
:::hint
`pd.crosstab(true, pred)` gives the confusion matrix. Reindex it so that rows and columns share the same label set. TP is the diagonal, the column sums are the predicted counts, and the row sums are the actual counts (the support).
:::solution
```python
import numpy as np
import pandas as pd

def report(y_true, y_pred):
    labels = sorted(set(y_true) | set(y_pred))
    cm = pd.crosstab(pd.Series(y_true, name="true"), pd.Series(y_pred, name="pred"))
    cm = cm.reindex(index=labels, columns=labels, fill_value=0)
    tp = pd.Series(np.diag(cm), index=labels)
    predicted, actual = cm.sum(axis=0), cm.sum(axis=1)
    precision = (tp / predicted).fillna(0)                 # 0/0 -> NaN -> 0
    recall = (tp / actual).fillna(0)
    f1 = (2 * precision * recall / (precision + recall)).fillna(0)
    df = pd.DataFrame({"precision": precision, "recall": recall, "f1": f1, "support": actual})
    return df, tp.sum() / len(y_true)

df, acc = report(["a", "a", "b"], ["a", "b", "b"])
print(df.round(2), acc)
```
:::explain
Everything comes from the **confusion matrix**: rows are the truth, columns are the predictions. For class c, TP is `cm[c, c]`, precision divides by the column total (everything predicted as c), and recall divides by the row total (everything that really is c). `reindex` matters when a class is never predicted (`bird`), since its column would otherwise be missing. Pandas turns 0/0 into NaN, which `fillna(0)` cleans up, matching scikit-learn's `zero_division=0`.
:::complexity
O(n + C²).
:::end

:::program hard | ROC AUC from ranks | ML task
Compute ROC AUC for binary labels and scores **without** looping over pairs, using the rank-sum (Mann–Whitney U) formula with ties counted as ½. Check it against an O(P·N) brute force.
:::starter
```python norun
import numpy as np
import pandas as pd

def roc_auc(y, scores):
    pass
```
:::tests
```python norun
import numpy as np
def brute(y, s):
    pos = [b for a, b in zip(y, s) if a == 1]; neg = [b for a, b in zip(y, s) if a == 0]
    return sum((p > q) + 0.5 * (p == q) for p in pos for q in neg) / (len(pos) * len(neg))
assert roc_auc([0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8]) == 0.75
assert roc_auc([0, 1], [0.5, 0.5]) == 0.5
assert roc_auc([1, 1, 0], [3, 2, 1]) == 1.0
rng = np.random.default_rng(3)
y = rng.integers(0, 2, 400); s = rng.integers(0, 20, 400) + y * 3    # many ties
assert abs(roc_auc(y, s) - brute(y, s)) < 1e-12
```
:::hint
AUC = P(random positive scores higher than random negative). Rank all the scores with `pd.Series(scores).rank()` (average ranks for ties). Then AUC = (sum of positive ranks − P(P+1)/2) / (P · N).
:::solution
```python
import numpy as np
import pandas as pd

def roc_auc(y, scores):
    y = np.asarray(y)
    ranks = pd.Series(scores).rank(method="average").to_numpy()   # ties share the average rank
    n_pos = int(y.sum())
    n_neg = len(y) - n_pos
    u = ranks[y == 1].sum() - n_pos * (n_pos + 1) / 2              # Mann–Whitney U
    return u / (n_pos * n_neg)

print(roc_auc([0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8]))
```
:::explain
AUC is the fraction of (positive, negative) pairs ranked correctly. Summing the positives' ranks counts, for each positive, how many items sit below it, including the other positives. Subtracting `P(P+1)/2` removes those positive-positive "wins", which leaves exactly the positive-over-negative pairs. **Average ranks** give tied pairs half credit automatically. That replaces the O(P·N) pair loop with one O(n log n) sort, which is how libraries compute it.
:::complexity
O(n log n).
:::end
