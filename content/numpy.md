# NumPy

**NumPy** gives Python fast, memory-efficient **n-dimensional arrays** (`ndarray`) and the maths to operate on them all at once. It's the foundation of Pandas, scikit-learn, Matplotlib, SciPy and PyTorch's tensor API. The core idea: **replace Python loops with whole-array operations** (vectorisation) that run in optimised C.

:::analogy An egg carton vs a bag of groceries
A Python list is a bag of groceries: each item is a separate object anywhere in memory, and the bag holds pointers to them. A NumPy array is an egg carton: identical slots in one contiguous block, all the same type. Because the layout is uniform, the CPU can process the whole carton in tight loops, often 10–100× faster.
:::

## 1. Why NumPy is fast

```python
import numpy as np, time
n = 1_000_000
py = list(range(n))
arr = np.arange(n)

t = time.perf_counter(); s1 = [x * 2 for x in py]; t_py = time.perf_counter() - t
t = time.perf_counter(); s2 = arr * 2; t_np = time.perf_counter() - t
print(f"python list: {t_py*1000:.1f} ms   numpy: {t_np*1000:.2f} ms   speed-up ~{t_py/t_np:.0f}x")
print(arr.itemsize, "bytes per element vs ~28+8 for a Python int + pointer")
```

1. **Contiguous, typed memory**: no per-element objects, and cache-friendly.
2. **Vectorised C loops**: the interpreter overhead is paid once per operation, not once per element.
3. **SIMD and BLAS**: modern CPUs process several numbers per instruction, and linear algebra uses tuned libraries.

## 2. ndarray anatomy

```python
import numpy as np
a = np.array([[1, 2, 3], [4, 5, 6]], dtype=np.int32)
print(a)
print("ndim:", a.ndim, "| shape:", a.shape, "| size:", a.size, "| dtype:", a.dtype)
print("itemsize:", a.itemsize, "| nbytes:", a.nbytes, "| strides:", a.strides)
```

:::term Shape, axis, strides
- **shape**: the length of each dimension, `(rows, cols)` here.
- **axis**: a dimension index. `axis=0` runs **down** the rows (an operation *collapses* rows, giving one result per column), and `axis=1` runs **across** the columns.
- **strides**: the bytes to step to reach the next element along each axis. `(12, 4)` means the next row is 12 bytes away and the next column 4. Views (transpose, slices) just change shape and strides, with **no copying**.
:::

## 3. Creating arrays

```python
import numpy as np
print(np.array([1, 2, 3]), np.zeros((2, 3)), np.ones(3, dtype=int), np.full((2, 2), 7), sep="\n")
print(np.arange(0, 10, 2.5), np.linspace(0, 1, 5), np.logspace(0, 3, 4))
print(np.eye(3, dtype=int), np.empty(2).shape, np.zeros_like(np.ones((2, 2))), sep="\n")
x, y = np.meshgrid(np.arange(3), np.arange(2))
print(x, y, sep="\n")
rng = np.random.default_rng(seed=42)          # the modern random API
print(rng.random(3), rng.integers(0, 10, size=5), rng.normal(0, 1, (2, 2)).round(2))
```

## 4. dtypes

| dtype | Meaning |
|---|---|
| `int8/16/32/64`, `uint8…` | signed / unsigned integers (fixed width, **they overflow!**) |
| `float16/32/64` | floating point (float32 is common in ML) |
| `bool` | True/False masks |
| `complex64/128` | complex numbers |
| `<U10`, `object` | fixed-width unicode / arbitrary Python objects (slow) |
| `datetime64[ns]` | timestamps |

```python
import numpy as np
a = np.array([1, 2, 3])
print(a.dtype, a.astype(np.float32).dtype, np.array([1, 2.5]).dtype, np.array([True, 2]).dtype)
small = np.array([250], dtype=np.uint8)
print(small + 10)                      # wraps around: 260 % 256 = 4
print(np.array([0.1]) + np.array([0.2]) == 0.3, np.isclose(0.1 + 0.2, 0.3))
print(np.iinfo(np.int32).max, np.finfo(np.float32).eps)
```

:::trap Silent integer overflow
NumPy integers have **fixed width**: `np.int8(127) + 1` wraps to -128, and in arrays this happens silently. Python ints never overflow, NumPy's do. Use a wider dtype (`int64`), or `float64` for big accumulations.
:::

## 5. Indexing and slicing

```python
import numpy as np
a = np.arange(1, 13).reshape(3, 4)
print(a)
print(a[1, 2], a[-1], a[:, 1], a[1:, ::2])    # [row, col] indexing, slices per axis
print(a[[0, 2], [1, 3]])                       # FANCY indexing: elements (0,1) and (2,3)
print(a[[0, 2]])                               # rows 0 and 2
mask = a % 2 == 0
print(mask)
print(a[mask])                                 # BOOLEAN indexing -> a 1-D array of the selected values
a[a > 9] = 0                                   # conditional assignment
print(a)
print(np.where(a > 5, "big", "small"))
```

## 6. Views vs copies: the most important concept

```python
import numpy as np
a = np.arange(6)
v = a[1:4]           # BASIC slicing -> a VIEW (shares memory)
v[0] = 99
print(a, np.shares_memory(a, v))
c = a[[1, 2, 3]]     # FANCY indexing -> a COPY
c[0] = -1
print(a, np.shares_memory(a, c))
b = a[a > 2]         # BOOLEAN indexing -> a COPY
r = a.reshape(2, 3)  # reshape -> a view when possible
r[0, 0] = 1000
print(a, a.base is None, r.base is a)
safe = a[1:4].copy() # explicit copy when you need independence
```

| Operation | View or copy? |
|---|---|
| basic slicing `a[1:4]`, `a[:, 0]` | **view** |
| `reshape`, `transpose` / `.T`, `ravel` (if contiguous) | view (usually) |
| fancy indexing `a[[1, 2]]` | copy |
| boolean indexing `a[mask]` | copy |
| `flatten()`, `.copy()`, arithmetic results | copy |

:::trap Accidental mutation through a view
Modifying a slice modifies the original array. That's the opposite of Python lists, where `xs[1:4]` is a copy. In data pipelines, call `.copy()` before editing a slice you intend to keep separate.
:::

## 7. Reshaping and combining

```python
import numpy as np
a = np.arange(12)
print(a.reshape(3, 4), a.reshape(2, -1).shape, a.reshape(3, 4).T.shape, sep="\n")
m = a.reshape(3, 4)
print(m.ravel()[:5], m[np.newaxis].shape, m[:, :, None].shape, np.expand_dims(m, 0).shape, np.squeeze(m[None]).shape)
x, y = np.array([[1, 2]]), np.array([[3, 4]])
print(np.concatenate([x, y]), np.vstack([x, y]).shape, np.hstack([x, y]), np.stack([x, y]).shape, sep="\n")
print(np.split(np.arange(9), 3), np.array_split(np.arange(7), 3))
img = np.zeros((2, 3, 32, 32))       # (batch, channels, H, W)
print(img.transpose(0, 2, 3, 1).shape, np.moveaxis(img, 1, -1).shape)   # -> (batch, H, W, channels)
```

## 8. Broadcasting

**Broadcasting** lets operations combine arrays of different shapes without copying data. Compare the shapes from the **right**: two dimensions are compatible if they're **equal, or one of them is 1**. Size-1 (or missing) dimensions are stretched virtually.

```python
import numpy as np
X = np.array([[1., 2., 3.],
              [4., 5., 6.]])              # shape (2, 3)
print(X + 10)                             # scalar: () -> (2, 3)
print(X - X.mean(axis=0))                 # (2, 3) - (3,)    -> centre each column
print(X / X.sum(axis=1, keepdims=True))   # (2, 3) / (2, 1)  -> normalise each row
col = np.array([[10], [20]])              # (2, 1)
row = np.array([1, 2, 3])                 # (3,)
print(col + row)                          # (2, 1) + (3,) -> (2, 3) "outer sum"
```

```text
X.shape          (2, 3)          col.shape (2, 1)
mean.shape          (3,)    →    row.shape    (3,)
result           (2, 3)          result    (2, 3)   (1 stretched to 3, missing dim treated as 1)
```

:::trap `keepdims` and the (n,) vs (n, 1) confusion
`X.sum(axis=1)` has shape `(2,)`. Dividing `(2, 3) / (2,)` fails, because `3 ≠ 2` when aligned from the right. `keepdims=True` keeps shape `(2, 1)`, which broadcasts correctly across the columns. Always print `.shape` when broadcasting surprises you.
:::

```python error
import numpy as np
X = np.ones((2, 3))
X / X.sum(axis=1)       # ValueError: operands could not be broadcast together with shapes (2,3) (2,)
```

## 9. ufuncs, aggregations and statistics

```python
import numpy as np
a = np.array([[1., 4., 9.], [16., 25., 36.]])
print(np.sqrt(a), np.exp([0, 1]).round(3), np.log1p(0.0), np.clip(a, 2, 20), sep="\n")
print(a.sum(), a.sum(axis=0), a.mean(axis=1), a.max(), a.argmax(), np.unravel_index(a.argmax(), a.shape))
print(a.std(), np.median(a), np.percentile(a, [25, 75]), a.cumsum(), np.diff([1, 4, 9, 16]))
print(np.add.reduce([1, 2, 3]), np.multiply.accumulate([1, 2, 3, 4]), np.maximum.outer([1, 3], [2, 0]))
print(np.any(a > 30), np.all(a > 0), np.count_nonzero(a > 5), np.unique([3, 1, 3, 2], return_counts=True))
print(np.nanmean([1, np.nan, 3]), np.isnan([1, np.nan]).sum())
```

## 10. Linear algebra

```python
import numpy as np
A = np.array([[3., 1.], [1., 2.]])
b = np.array([9., 8.])
x = np.linalg.solve(A, b)                    # solve Ax = b (better than inv(A) @ b)
print(x, A @ x, np.allclose(A @ x, b))
print(np.linalg.det(A), np.linalg.inv(A).round(3), np.linalg.norm(b), sep="\n")
vals, vecs = np.linalg.eig(A)
print(vals.round(3))
U, S, Vt = np.linalg.svd(np.arange(6.).reshape(2, 3))
print(S.round(3))
batch = np.random.default_rng(0).random((5, 3, 4))
print((batch @ np.ones((4, 2))).shape)       # batched matmul over the leading dimension
print(np.einsum("ij,j->i", A, b), np.dot([1, 2], [3, 4]))
```

## 11. Sorting and searching

```python
import numpy as np
a = np.array([30, 10, 50, 20, 40])
print(np.sort(a), np.argsort(a), a[np.argsort(a)[::-1]])
print(np.searchsorted([10, 20, 30], [15, 30]), np.partition(a, 2)[:2], np.argpartition(a, -2)[-2:])
print(np.nonzero(a > 25), np.where(a > 25)[0], np.lexsort(([1, 2, 1], [3, 3, 1])))
```

## 12. Vectorisation recipes (replace loops)

```python
import numpy as np
rng = np.random.default_rng(1)
pts = rng.random((5, 2))
# pairwise distances WITHOUT loops: (5,1,2) - (1,5,2) -> (5,5,2)
D = np.sqrt(((pts[:, None, :] - pts[None, :, :]) ** 2).sum(-1))
print(D.round(2))
scores = rng.normal(70, 10, 8).round(1)
grades = np.select([scores >= 80, scores >= 65], ["A", "B"], default="C")
print(scores, grades)
x = np.arange(10)
print(np.convolve(x, np.ones(3) / 3, mode="valid"))      # a moving average
one_hot = np.eye(4)[[0, 2, 1, 3]]                          # one-hot encoding via fancy indexing
print(one_hot)
```

## 13. ML use cases

```python
import numpy as np
rng = np.random.default_rng(0)
X = rng.normal(5, 2, size=(100, 3))
X_std = (X - X.mean(axis=0)) / X.std(axis=0)               # standardise features
print(X_std.mean(axis=0).round(6), X_std.std(axis=0).round(6))

idx = rng.permutation(len(X))                              # shuffle + split
train, test = X[idx[:80]], X[idx[80:]]
print(train.shape, test.shape)

w_true = np.array([2.0, -1.0, 0.5])
y = X @ w_true + rng.normal(0, 0.1, 100)
w = np.zeros(3)
for _ in range(500):                                        # gradient descent for linear regression
    grad = 2 / len(X) * X.T @ (X @ w - y)
    w -= 0.01 * grad
print(w.round(3), np.linalg.lstsq(X, y, rcond=None)[0].round(3))

logits = np.array([[2.0, 1.0, 0.1], [1.0, 3.0, 0.2]])
e = np.exp(logits - logits.max(axis=1, keepdims=True))      # numerically stable softmax
print((e / e.sum(axis=1, keepdims=True)).round(3))
```

## Tricks & tips

- `arr.shape` first, always. Most bugs are shape bugs.
- `np.newaxis` / `None` adds an axis for broadcasting.
- Use the `rng = np.random.default_rng(seed)` API (not the legacy `np.random.seed`) for reproducibility.
- `np.allclose`/`np.isclose` for float comparisons.
- `a.astype(np.float32)` halves memory for ML features.
- `np.einsum` expresses complex tensor contractions in one readable line.
- Avoid `np.append` in loops (it copies each time). Collect in a list, then call `np.array` once.
- `np.save`/`np.load` (`.npy`) and `np.savez_compressed` for fast binary storage.

## The 10 most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Views mutate the original | `.copy()` |
| 2 | Integer overflow in small dtypes | wider dtypes |
| 3 | `(n,)` vs `(n, 1)` broadcasting | `keepdims=True`, reshape |
| 4 | `and`/`or` on arrays → ValueError | `&`, `\|`, `~` with parentheses |
| 5 | `if array:` → ambiguous truth value | `.any()` / `.all()` |
| 6 | `==` on floats | `np.isclose` |
| 7 | `np.append`/`np.concatenate` in a loop (O(n²)) | build a list, convert once |
| 8 | Python loops over elements | vectorise |
| 9 | `np.empty` assumed to be zeros | it's uninitialised: use `zeros` |
| 10 | `A * B` vs `A @ B` | `*` is element-wise, `@` is a matrix product |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python
import numpy as np
a = np.arange(6)
b = a[1:4]
b[0] = 99
c = a[[1, 2]]
c[0] = -1
print(a)
```
What prints?
- [x] `[ 0 99  2  3  4  5]`
- [ ] `[ 0 -1  2  3  4  5]`
- [ ] `[0 1 2 3 4 5]`
A **slice** is a view, so writing through `b` changes `a`. **Fancy indexing** with a list always makes a copy, so writing to `c` leaves `a` alone.
:::

:::quiz
```python
import numpy as np
x = np.ones((3, 1))
y = np.arange(4)
print((x + y).shape, (x * y).sum())
```
What prints?
- [ ] `(3, 4) 6.0`
- [x] `(3, 4) 18.0`
- [ ] `ValueError: operands could not be broadcast`
Shapes `(3, 1)` and `(4,)` align from the right: `(3, 1)` vs `(1, 4)` broadcasts to `(3, 4)`. Each row of `x * y` is `[0, 1, 2, 3]` (sum 6), and there are 3 rows, so 18.0 (a float, because `ones` is float).
:::

:::quiz
```python
import numpy as np
a = np.array([200, 100], dtype=np.uint8)
print(a + a, a.sum(), a.mean())
```
What prints?
- [x] `[144 200] 300 150.0`
- [ ] `[400 200] 300 150.0`
- [ ] `[144 200] 44 150.0`
Element-wise `uint8` arithmetic **wraps around** silently (400 mod 256 = 144). But `sum()` promotes small integer types to the platform integer, so 300 is correct, and `mean()` uses float64. Overflow traps hit only the element-wise operations.
:::

## Practice problems

:::problem basic | Normalise each row to sum 1 | broadcasting, keepdims
Given a 2-D array of non-negative numbers, normalise each row to sum to 1 (rows of all zeros stay zero). Vectorised, no loops.
:::solution
```python
import numpy as np
X = np.array([[1., 3., 4.], [0., 0., 0.], [2., 2., 0.]])
sums = X.sum(axis=1, keepdims=True)                       # (3, 1)
P = np.divide(X, sums, out=np.zeros_like(X), where=sums != 0)
print(P, P.sum(axis=1))
```
:::explain
`keepdims=True` gives shape `(3, 1)`, which broadcasts across the columns. `np.divide(..., where=…, out=…)` skips zero rows instead of producing NaNs with a warning. This is the row-normalisation step in softmax, TF-IDF and probability tables.
:::end

:::problem basic | Replace negatives and count | boolean masks
In a random integer array (-10..10, size 20, seed 0), count the negatives, replace them with 0, and report the indices that changed.
:::solution
```python
import numpy as np
rng = np.random.default_rng(0)
a = rng.integers(-10, 11, size=20)
neg = a < 0
print(a)
print("negatives:", neg.sum(), "at", np.flatnonzero(neg))
a[neg] = 0
print(a)
```
:::explain
A boolean mask is an array of True/False. `sum()` counts the Trues, `flatnonzero` gives their positions, and `a[mask] = 0` assigns in place. No loops, and it reads exactly like the English description.
:::end

:::problem basic | Chessboard and identity tricks | creation, slicing with steps
Build an 8×8 checkerboard of 0/1 (top-left 0) using slicing, then a 5×5 matrix with 1s on the border and 0s inside.
:::solution
```python
import numpy as np
board = np.zeros((8, 8), dtype=int)
board[1::2, ::2] = 1                 # odd rows, even cols
board[::2, 1::2] = 1                 # even rows, odd cols
print(board)
frame = np.ones((5, 5), dtype=int)
frame[1:-1, 1:-1] = 0
print(frame)
print(np.indices((4, 4)).sum(axis=0) % 2)    # another checkerboard: (row + col) % 2
```
:::explain
Step slicing (`::2`) selects every other row or column, and assigning through a slice writes into the original array (it's a view). The `np.indices` version computes `(r + c) % 2` for every cell at once.
:::end

:::problem medium | Pairwise Euclidean distances | broadcasting to 3-D
Compute the distance matrix between `m` points `A` (m×d) and `n` points `B` (n×d) without loops, then find each A-point's nearest B-point. Compare with a loop version.
:::solution
```python
import numpy as np
rng = np.random.default_rng(3)
A, B = rng.random((4, 2)), rng.random((6, 2))

D = np.sqrt(((A[:, None, :] - B[None, :, :]) ** 2).sum(axis=-1))     # (4, 6)
D2 = np.sqrt((A ** 2).sum(1)[:, None] + (B ** 2).sum(1)[None, :] - 2 * A @ B.T)   # memory-light identity
loop = np.array([[np.linalg.norm(a - b) for b in B] for a in A])
print(np.allclose(D, loop), np.allclose(D, D2))
print("nearest B for each A:", D.argmin(axis=1), D.min(axis=1).round(3))
```
:::explain
`A[:, None, :]` has shape (4, 1, 2) and `B[None, :, :]` has (1, 6, 2), so their difference broadcasts to (4, 6, 2), and summing the last axis gives squared distances. For huge inputs, that 3-D intermediate is large. The identity ‖a−b‖² = ‖a‖² + ‖b‖² − 2a·b uses a single matrix multiply instead. That's the trick inside k-NN and k-means implementations.
:::end

:::problem medium | Moving average and z-score anomalies | convolution, vectorised stats
Generate a noisy sine signal with a few injected spikes. Compute a 5-point moving average, and flag the points whose z-score (relative to the whole signal's residual from the moving average) exceeds 3.
:::solution
```python
import numpy as np
rng = np.random.default_rng(7)
t = np.linspace(0, 4 * np.pi, 200)
signal = np.sin(t) + rng.normal(0, 0.1, t.size)
spikes = [30, 90, 160]
signal[spikes] += [2.5, -2.0, 3.0]

k = 5
smooth = np.convolve(signal, np.ones(k) / k, mode="same")
resid = signal - smooth
z = (resid - resid.mean()) / resid.std()
print("flagged:", np.flatnonzero(np.abs(z) > 3), "injected:", spikes)
```
:::explain
Convolution with a box kernel of `1/k` is a moving average. Subtracting it removes the slow trend (the sine), so spikes stand out in the residual. The z-score expresses each residual in standard deviations. Every step is a whole-array operation, the pattern behind sensor monitoring and fraud alerts.
:::end

:::problem medium | Image as an array: grayscale, flip, crop | 3-D arrays, axes
Create a random 6×8 RGB "image" (uint8, shape (H, W, 3)). Convert it to grayscale with the weights (0.299, 0.587, 0.114), flip it horizontally, crop the centre 4×4, and normalise it to [0, 1] as float32.
:::solution
```python
import numpy as np
rng = np.random.default_rng(0)
img = rng.integers(0, 256, size=(6, 8, 3), dtype=np.uint8)
gray = (img @ np.array([0.299, 0.587, 0.114])).round().astype(np.uint8)   # (6, 8, 3) @ (3,) -> (6, 8)
flipped = img[:, ::-1, :]                                                  # reverse the width axis (a view)
h, w = img.shape[:2]
crop = img[h // 2 - 2:h // 2 + 2, w // 2 - 2:w // 2 + 2]
norm = crop.astype(np.float32) / 255.0
print(gray.shape, gray.dtype, flipped.shape, crop.shape, norm.dtype, float(norm.min()) >= 0, float(norm.max()) <= 1)
print(np.shares_memory(img, flipped), np.shares_memory(img, norm))
```
:::explain
Images are just (H, W, C) arrays. Matrix-multiplying by a 3-vector contracts the channel axis into a weighted sum. `[:, ::-1]` mirrors horizontally **without copying** (a negative stride). Converting to float **before** dividing avoids integer truncation. These exact steps are what `torchvision` transforms do internally.
:::end

:::problem hard | k-means clustering from scratch | broadcasting, argmin, convergence
Implement k-means (k = 3) on synthetic 2-D blobs: initialise the centroids with **k-means++**, alternate assignment (argmin of distances) and update (cluster means) until the assignments stop changing. Report the iterations and the final inertia.
:::solution
```python
import numpy as np
rng = np.random.default_rng(42)
centers_true = np.array([[0, 0], [5, 5], [0, 6]])
X = np.vstack([c + rng.normal(0, 0.7, (60, 2)) for c in centers_true])

def kmeans_pp_init(X, k, rng):
    C = [X[rng.integers(len(X))]]
    for _ in range(1, k):
        d2 = ((X[:, None, :] - np.array(C)[None]) ** 2).sum(-1).min(axis=1)
        C.append(X[rng.choice(len(X), p=d2 / d2.sum())])   # far points are more likely
    return np.array(C)

def kmeans(X, k, rng, max_iter=100):
    C = kmeans_pp_init(X, k, rng)
    labels = None
    for it in range(1, max_iter + 1):
        D = ((X[:, None, :] - C[None]) ** 2).sum(-1)       # (n, k) squared distances
        new = D.argmin(axis=1)
        if labels is not None and np.array_equal(new, labels):
            break
        labels = new
        C = np.array([X[labels == j].mean(axis=0) if np.any(labels == j) else C[j] for j in range(k)])
    inertia = ((X - C[labels]) ** 2).sum()
    return C, labels, it, inertia

C, labels, iters, inertia = kmeans(X, 3, rng)
print("iterations:", iters, "| inertia:", round(inertia, 2))
print(np.round(C[np.argsort(C[:, 0] + C[:, 1])], 2), np.bincount(labels))
```
:::explain
Plain k-means can get stuck in a **local optimum** (for example, splitting one blob in two and merging the others) if the starting centroids are unlucky. **k-means++** picks each new initial centroid with probability proportional to its squared distance from the nearest already-chosen one, which spreads them out. It's the default in scikit-learn. Each iteration is two vectorised steps: **assign** (a broadcast distance matrix, then `argmin` over clusters) and **update** (a boolean mask per cluster, then `mean`). The loop runs at most `max_iter` times, but the inner work has no Python loops over points. The empty-cluster guard keeps the old centroid. Inertia (the within-cluster sum of squares) is what k-means minimises, and it never increases between iterations.
:::end

:::problem hard | Game of Life with array shifts | vectorised neighbourhoods
Implement one Game of Life step on a toroidal (wrap-around) grid using `np.roll` to count neighbours, without loops. Verify that a glider moves one cell diagonally every 4 steps.
:::solution
```python
import numpy as np

def life_step(G):
    neighbours = sum(np.roll(np.roll(G, dr, 0), dc, 1)
                     for dr in (-1, 0, 1) for dc in (-1, 0, 1) if (dr, dc) != (0, 0))
    return ((neighbours == 3) | ((G == 1) & (neighbours == 2))).astype(np.uint8)

G = np.zeros((8, 8), dtype=np.uint8)
G[1, 2] = G[2, 3] = G[3, 1] = G[3, 2] = G[3, 3] = 1      # a glider
start = G.copy()
for _ in range(4):
    G = life_step(G)
print(np.array_equal(G, np.roll(np.roll(start, 1, 0), 1, 1)))
print(G)
```
:::explain
`np.roll` shifts the whole grid with wrap-around, so summing the 8 shifted copies counts every cell's neighbours **simultaneously**. The rules become two boolean expressions combined with `|` and `&` (parentheses required!). Compared with the nested-loop version in *Control Flow*, this is shorter and orders of magnitude faster on large grids.
:::end

:::problem hard | Logistic regression with vectorised gradient descent | ML from scratch
Generate a linearly separable 2-class dataset, implement logistic regression (sigmoid, binary cross-entropy, gradient descent) fully vectorised, and report the training accuracy and the learned weights.
:::solution
```python
import numpy as np
rng = np.random.default_rng(0)
n = 200
X = np.vstack([rng.normal([-2, -1], 1, (n // 2, 2)), rng.normal([2, 1.5], 1, (n // 2, 2))])
y = np.r_[np.zeros(n // 2), np.ones(n // 2)]
Xb = np.c_[np.ones(n), X]                           # bias column

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

w = np.zeros(3)
lr = 0.1
for epoch in range(1, 501):
    p = sigmoid(Xb @ w)
    loss = -np.mean(y * np.log(p + 1e-12) + (1 - y) * np.log(1 - p + 1e-12))
    grad = Xb.T @ (p - y) / n                       # the gradient of BCE w.r.t. w
    w -= lr * grad
    if epoch in (1, 100, 500):
        print(f"epoch {epoch:3}: loss {loss:.4f}")
acc = ((sigmoid(Xb @ w) >= 0.5) == y).mean()
print("weights:", w.round(3), "| train accuracy:", acc)
```
:::explain
The whole dataset is processed in one matrix product per step. The binary cross-entropy gradient simplifies beautifully to `Xᵀ(p − y)/n`. `np.c_` / `np.r_` are concise column/row concatenators, and the `1e-12` guards against `log(0)`. This is exactly what `sklearn.linear_model.LogisticRegression` optimises (with better solvers and regularisation).
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Reshape the matrix | LeetCode 566 | https://leetcode.com/problems/reshape-the-matrix/
Reshape a 2-D list `mat` into `r × c` (row-major). If it's impossible, return the original. Return nested Python lists.
:::starter
```python norun
import numpy as np

def matrix_reshape(mat, r, c):
    pass
```
:::tests
```python norun
assert matrix_reshape([[1, 2], [3, 4]], 1, 4) == [[1, 2, 3, 4]]
assert matrix_reshape([[1, 2], [3, 4]], 2, 4) == [[1, 2], [3, 4]]
assert matrix_reshape([[1, 2, 3, 4]], 2, 2) == [[1, 2], [3, 4]]
assert matrix_reshape([[1], [2], [3], [4], [5], [6]], 3, 2) == [[1, 2], [3, 4], [5, 6]]
assert type(matrix_reshape([[1, 2]], 2, 1)[0][0]) is int
```
:::solution
```python
import numpy as np

def matrix_reshape(mat, r, c):
    a = np.array(mat)
    if a.size != r * c:
        return mat
    return a.reshape(r, c).tolist()     # tolist() converts to plain Python ints

print(matrix_reshape([[1, 2], [3, 4]], 1, 4))
```
:::explain
`reshape` only reinterprets the **shape** metadata over the same row-major buffer, so it is O(1) when it can return a view. The only rule is that the sizes must match (`-1` lets NumPy infer one dimension). `.tolist()` matters: it converts `np.int64` back to `int`, which is what the last test checks and what JSON serialisation needs.
:::complexity
O(r·c) for building and converting the lists. The reshape itself is O(1).
:::end

:::program basic | Matrix diagonal sum | LeetCode 1572 | https://leetcode.com/problems/matrix-diagonal-sum/
Sum the primary and secondary diagonals of a square matrix, counting the centre element only once. No Python loops.
:::starter
```python norun
import numpy as np

def diagonal_sum(mat):
    pass
```
:::tests
```python norun
assert diagonal_sum([[1, 2, 3], [4, 5, 6], [7, 8, 9]]) == 25
assert diagonal_sum([[1, 1, 1, 1]] * 4) == 8
assert diagonal_sum([[5]]) == 5
assert diagonal_sum([[1, 2], [3, 4]]) == 10
```
:::solution
```python
import numpy as np

def diagonal_sum(mat):
    a = np.asarray(mat)
    n = len(a)
    total = np.trace(a) + np.trace(np.fliplr(a))     # main + anti-diagonal
    if n % 2:
        total -= a[n // 2, n // 2]                    # the centre was counted twice
    return int(total)

print(diagonal_sum([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))
```
:::explain
`np.trace` sums the main diagonal, and `np.fliplr` mirrors left↔right, turning the anti-diagonal into the main one. `fliplr` returns a **view** (negative stride), so no data is copied. An equivalent with fancy indexing: `i = np.arange(n); a[i, i].sum() + a[i, n - 1 - i].sum()`.
:::complexity
O(n).
:::end

:::program medium | Matrix block sum (2-D prefix sums) | LeetCode 1314 | https://leetcode.com/problems/matrix-block-sum/
For each cell, sum all values within `k` rows and columns of it (clipped at the edges). Vectorise it with `np.cumsum` instead of nested loops.
:::starter
```python norun
import numpy as np

def matrix_block_sum(mat, k):
    pass
```
:::tests
```python norun
assert matrix_block_sum([[1, 2, 3], [4, 5, 6], [7, 8, 9]], 1) == [[12, 21, 16], [27, 45, 33], [24, 39, 28]]
assert matrix_block_sum([[1, 2, 3], [4, 5, 6], [7, 8, 9]], 2) == [[45] * 3] * 3
assert matrix_block_sum([[7]], 3) == [[7]]
import random
m = [[random.randint(0, 9) for _ in range(7)] for _ in range(5)]
brute = [[sum(m[a][b] for a in range(max(0, i-2), min(5, i+3)) for b in range(max(0, j-2), min(7, j+3))) for j in range(7)] for i in range(5)]
assert matrix_block_sum(m, 2) == brute
```
:::hint
Build `P` with a zero row and column padded on the top and left: `P[i, j]` is the sum of `mat[:i, :j]`. A rectangle's sum is then `P[r2, c2] - P[r1, c2] - P[r2, c1] + P[r1, c1]`, and you can compute all the corners at once with index arrays.
:::solution
```python
import numpy as np

def matrix_block_sum(mat, k):
    a = np.asarray(mat)
    m, n = a.shape
    P = np.zeros((m + 1, n + 1), dtype=a.dtype)
    P[1:, 1:] = a.cumsum(0).cumsum(1)                  # 2-D prefix sums
    r1 = np.clip(np.arange(m) - k, 0, m)[:, None]      # column vectors broadcast...
    r2 = np.clip(np.arange(m) + k + 1, 0, m)[:, None]
    c1 = np.clip(np.arange(n) - k, 0, n)[None, :]      # ...against row vectors
    c2 = np.clip(np.arange(n) + k + 1, 0, n)[None, :]
    return (P[r2, c2] - P[r1, c2] - P[r2, c1] + P[r1, c1]).tolist()

print(matrix_block_sum([[1, 2, 3], [4, 5, 6], [7, 8, 9]], 1))
```
:::explain
**Inclusion-exclusion** on a 2-D prefix table gives any rectangle's sum in O(1): take the big rectangle, remove the strip above and the strip to the left, then add back the corner that was removed twice. `np.clip` handles the edges, and broadcasting a `(m, 1)` index against a `(1, n)` index evaluates all m·n corner lookups in one fancy-indexing expression. The random test compares against a brute-force quadruple loop.
:::complexity
O(m·n) regardless of k (the brute force is O(m·n·k²)).
:::end

:::program hard | Stable softmax + cross-entropy with gradient | ML task
Implement `softmax(z)` (row-wise, numerically stable) and `cross_entropy(z, y)`, which returns `(mean loss, gradient dL/dz)` for integer labels `y`. Check your gradient against finite differences.
:::starter
```python norun
import numpy as np

def softmax(z):
    pass

def cross_entropy(z, y):
    pass
```
:::tests
```python norun
import numpy as np
z = np.array([[1.0, 2.0, 3.0], [1000.0, 1000.0, 1000.0]])
p = softmax(z)
assert np.allclose(p.sum(axis=1), 1) and np.allclose(p[1], 1 / 3)
assert not np.isnan(softmax(np.array([[1e4, -1e4]]))).any()
rng = np.random.default_rng(0)
z = rng.normal(size=(5, 4)); y = rng.integers(0, 4, size=5)
loss, g = cross_entropy(z, y)
assert abs(loss - (-np.log(softmax(z)[np.arange(5), y]).mean())) < 1e-9
num = np.zeros_like(z); eps = 1e-6
for idx in np.ndindex(z.shape):
    zp, zm = z.copy(), z.copy(); zp[idx] += eps; zm[idx] -= eps
    num[idx] = (cross_entropy(zp, y)[0] - cross_entropy(zm, y)[0]) / (2 * eps)
assert np.allclose(g, num, atol=1e-6)
```
:::hint
Subtract the row max before `exp`: softmax doesn't change, but overflow becomes impossible. For the loss, use log-softmax `z - max - log(sum(exp(z - max)))`. The gradient of the mean cross-entropy is `(softmax(z) - one_hot(y)) / N`.
:::solution
```python
import numpy as np

def softmax(z):
    z = z - z.max(axis=1, keepdims=True)         # shift: exp never overflows
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)

def cross_entropy(z, y):
    n = len(z)
    shifted = z - z.max(axis=1, keepdims=True)
    log_p = shifted - np.log(np.exp(shifted).sum(axis=1, keepdims=True))   # log-softmax
    loss = -log_p[np.arange(n), y].mean()        # pick each row's true-class log-prob
    grad = np.exp(log_p)                         # = softmax(z)
    grad[np.arange(n), y] -= 1                   # minus one-hot
    return loss, grad / n

z = np.array([[2.0, 1.0, 0.1]])
print(softmax(z).round(3), cross_entropy(z, np.array([0]))[0].round(4))
```
:::explain
`exp(1000)` is `inf` in float64, so the naive softmax returns `nan`. Since `softmax(z) = softmax(z − c)` for any constant c, subtracting the row max keeps every exponent ≤ 0. Computing **log-softmax** directly avoids `log(0)`. The gradient `p − one_hot` is a famous simplification: the derivatives of the softmax and the log cancel. The test's **gradient check** (central finite differences) is how you verify backprop code in practice.
:::complexity
O(N·C) time and memory.
:::end
