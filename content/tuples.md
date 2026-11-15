# Tuples

A **tuple** is an **ordered, immutable** sequence. Use it for fixed groups of related values: a point `(x, y)`, an RGB colour, a database row, a function returning several results. Because it can't change, a tuple is **hashable** (if its items are), which means it can be a dict key or a set member. A list can't.

:::analogy A sealed lunchbox vs a backpack
A **list** is a backpack: you can throw things in and pull things out all day. A **tuple** is a sealed lunchbox: what's packed stays packed. That makes it trustworthy to hand around, and because its contents never change, it can be catalogued (hashed) and used as a label.
:::

## 1. Creating tuples (and the comma rule)

```python
point = (3, 4)
also_tuple = 3, 4                # the COMMA makes the tuple, not the parentheses
single = (5,)                    # one-element tuple needs a trailing comma
not_a_tuple = (5)                # just the int 5 in parentheses
empty = ()
from_iter = tuple("abc")
nested = ((1, 2), (3, 4))
print(type(also_tuple).__name__, type(single).__name__, type(not_a_tuple).__name__)
print(point, single, empty, from_iter, nested)
```

:::trap The one-element tuple
`t = (5)` is an `int`. `t = (5,)` is a tuple. And `x = 1,` accidentally makes a tuple, a sneaky bug when a stray comma ends a line: `total = price * qty,` → `total` is a tuple.
:::

## 2. Immutability: exactly what it means

```python
t = (1, [2, 3], "x")
try:
    t[0] = 99
except TypeError as e:
    print("TypeError:", e)
t[1].append(4)                   # the LIST inside is still mutable
print(t)
print(hash((1, 2, "x")))         # hashable: all items hashable
try:
    hash(t)
except TypeError as e:
    print("TypeError:", e)       # contains a list -> unhashable
```

A tuple's **slots** are fixed: you can't rebind them, add or remove. The objects *in* those slots keep their own mutability. Immutability is **shallow**.

:::quiz
```python norun
t = (1, 2)
t += (3,)
```
What happened?
- [ ] `TypeError`, because tuples are immutable
- [x] `t` now names a **new** tuple `(1, 2, 3)`
- [ ] The original tuple was extended in place
Tuples have no `__iadd__`, so `t += (3,)` falls back to `t = t + (3,)`: a new tuple object is created and `t` is rebound. Any other name pointing at the old tuple still sees `(1, 2)`.
:::

## 3. Indexing, slicing and the two methods

```python
t = (10, 20, 30, 20, 40)
print(t[0], t[-1], t[1:3], t[::-1])
print(t.count(20), t.index(30))           # the only two methods
print(len(t), min(t), max(t), sum(t), 20 in t, sorted(t))
print(t + (50,), t * 2)
```

## 4. Packing and unpacking: the core skill

```python
record = ("Ada", 36, "London")            # packing
name, age, city = record                   # unpacking
print(name, age, city)

first, *rest = (1, 2, 3, 4)                # star unpacking -> rest is a LIST
*init, last = (1, 2, 3, 4)
head, *_, tail = range(10)
(a, b), c = (1, 2), 3                      # nested
print(first, rest, init, last, head, tail, a, b, c)

x, y = 1, 2
x, y = y, x                                # the swap trick
print(x, y)

def min_max(xs):
    return min(xs), max(xs)                # returns ONE tuple
lo, hi = min_max([4, 1, 9])
print(lo, hi)

for i, (name, score) in enumerate([("a", 1), ("b", 2)]):
    print(i, name, score)
```

## 5. Tuples as dictionary keys and set members

```python
distances = {("NYC", "LA"): 3936, ("LA", "SF"): 559}
print(distances[("NYC", "LA")])

grid = {}
grid[(0, 0)] = "start"
grid[2, 3] = "treasure"                     # parentheses optional
print(grid, (2, 3) in grid)

visited = {(0, 0), (0, 1)}
visited.add((1, 1))
print(sorted(visited))

memo = {}
def paths(r, c):                            # tuple keys power memoisation
    if r == 0 or c == 0:
        return 1
    if (r, c) not in memo:
        memo[(r, c)] = paths(r - 1, c) + paths(r, c - 1)
    return memo[(r, c)]
print(paths(10, 10))
```

## 6. Tuple vs list: a decision guide

| | `tuple` | `list` |
|---|---|---|
| Mutable | No | Yes |
| Hashable | Yes (if its items are) | No |
| Typical meaning | a **record**: positions have meaning (heterogeneous) | a **collection** of similar items (homogeneous) |
| Memory | smaller | larger (over-allocation) |
| Creation speed | faster (literals are constants) | slower |
| Methods | `count`, `index` | 11 |
| Use for | return values, dict keys, fixed configs, coordinates | growing data, sorting in place |

```python
import sys, timeit
print(sys.getsizeof((1, 2, 3)), "vs", sys.getsizeof([1, 2, 3]), "bytes")
print("tuple:", round(timeit.timeit("(1, 2, 3, 4, 5)", number=1_000_000), 3), "s")
print("list: ", round(timeit.timeit("[1, 2, 3, 4, 5]", number=1_000_000), 3), "s")
```

The tuple literal is so fast because CPython **constant-folds** it: the tuple is created once at compile time and reused.

## 7. Named tuples: readable records

```python
from collections import namedtuple
from typing import NamedTuple

Point = namedtuple("Point", ["x", "y"])
p = Point(3, 4)
print(p.x, p[1], p, p._asdict(), p._replace(x=10))

class Employee(NamedTuple):                 # modern, typed style
    name: str
    dept: str
    salary: float = 50_000.0

e = Employee("Ada", "R&D")
print(e, e.salary, isinstance(e, tuple))
name, dept, salary = e                      # still unpackable
```

## 8. Sorting with tuples: lexicographic comparison

Tuples compare **element by element**: the first unequal pair decides.

```python
print((1, 2, 3) < (1, 2, 4), (1, 9) < (2, 0), (1, 2) < (1, 2, 0))
students = [("bob", 85), ("ada", 92), ("cy", 85)]
print(sorted(students, key=lambda s: (-s[1], s[0])))     # score desc, name asc
import heapq
tasks = [(2, "write"), (1, "plan"), (3, "ship"), (1, "coffee")]
heapq.heapify(tasks)
print([heapq.heappop(tasks) for _ in range(4)])           # priority, then name
```

## 9. Functional patterns: `zip`, `enumerate`, `itertools`

```python
from itertools import product, combinations, permutations
names, scores = ("a", "b", "c"), (3, 1, 2)
pairs = tuple(zip(names, scores))
print(pairs, tuple(zip(*pairs)))                 # unzip back
print(list(product((0, 1), repeat=2)))
print(list(combinations("abc", 2)), list(permutations((1, 2, 3), 2))[:3])
grid = {"lr": (0.1, 0.01), "layers": (1, 2)}
for lr, layers in product(*grid.values()):       # hyper-parameter grid search
    print(f"lr={lr} layers={layers}")
```

## 10. ML use cases

```python
import numpy as np
x = np.zeros((32, 3, 224, 224))          # tensor shape is a tuple: (batch, channels, H, W)
batch, channels, h, w = x.shape
print(batch, channels, h, w, x.shape[1:])
dataset = [((0.5, 1.2), 0), ((0.1, 0.4), 1)]     # (features, label) records
for features, label in dataset:
    print(features, "->", label)
def train_step():
    return 0.42, 0.91                    # (loss, accuracy)
loss, acc = train_step()
print(loss, acc)
```

## Tricks & tips

- Return several values as a tuple. For more than about 3, return a `NamedTuple`/dataclass for readability.
- `tuple(sorted(d.items()))` makes a dict hashable for use as a cache key.
- `divmod`, `enumerate`, `zip`, `dict.items()` and `str.partition` all produce tuples.
- Unpack in `for` loops directly: `for k, v in d.items()`.
- Use `_` for values you don't need: `_, ext = os.path.splitext(path)`.
- `a, b = b, a + b` advances two variables at once.

## The 10 most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | `(5)` is not a tuple | `(5,)` |
| 2 | A stray trailing comma creates a tuple | look for `x = expr,` |
| 3 | Assuming deep immutability | items can still be mutable |
| 4 | Tuple with a list inside used as a key | `TypeError: unhashable` |
| 5 | `t += (x,)` in a loop is O(n²) | build a list, then `tuple(...)` |
| 6 | Unpacking count mismatch | star target or check the length |
| 7 | Comparing tuples with incomparable items (`(1, "a") < (1, 2)`) | consistent types per position |
| 8 | Using tuples where a list is needed (no `.append`) | choose by mutability needs |
| 9 | `namedtuple` field names must be valid identifiers | `rename=True` |
| 10 | JSON turns tuples into lists | convert back after loading |

## Practice problems

:::problem basic | Min, max and mean in one return | tuple packing
Write `stats(xs)` returning `(min, max, mean)` and unpack it at the call site. Then return a `NamedTuple` instead and access the fields by name.
:::solution
```python
from typing import NamedTuple

def stats(xs):
    return min(xs), max(xs), sum(xs) / len(xs)

class Stats(NamedTuple):
    lo: float
    hi: float
    mean: float

def stats_named(xs):
    return Stats(min(xs), max(xs), sum(xs) / len(xs))

lo, hi, mean = stats([4, 8, 15, 16, 23, 42])
s = stats_named([4, 8, 15, 16, 23, 42])
print(lo, hi, mean, "|", s.hi - s.lo, s)
```
:::explain
`return a, b, c` packs a tuple, and the caller unpacks it. The `NamedTuple` version is still a tuple (it unpacks the same way) but self-documenting: `s.mean` beats `s[2]`.
:::end

:::problem basic | Count coordinate visits | tuples as dict keys
Given a path string of moves `"UURDDL…"`, starting at (0, 0), count how many times each grid point is visited and report the most visited point.
:::solution
```python
from collections import Counter

def visits(path):
    moves = {"U": (0, 1), "D": (0, -1), "L": (-1, 0), "R": (1, 0)}
    x = y = 0
    seen = Counter({(0, 0): 1})
    for m in path:
        dx, dy = moves[m]
        x, y = x + dx, y + dy
        seen[(x, y)] += 1
    return seen

c = visits("URDLURDLUU")
print(c.most_common(2), len(c), "distinct points")
```
:::explain
`(x, y)` tuples are hashable, so they make natural keys for grid positions. A list `[x, y]` couldn't be a key. Tuple unpacking (`dx, dy = moves[m]`) keeps the update readable.
:::end

:::problem basic | Sort records by several keys | lexicographic tuple keys
Sort `(name, dept, salary)` records by dept ascending, then salary descending, then name ascending.
:::solution
```python
rows = [("ada", "eng", 120), ("bob", "ops", 90), ("cy", "eng", 120), ("dee", "eng", 95), ("eve", "ops", 110)]
for r in sorted(rows, key=lambda r: (r[1], -r[2], r[0])):
    print(r)
```
:::explain
The key tuple is compared position by position: department first, then (negated) salary, then name. Negating a number flips its order without needing a second sort.
:::end

:::problem medium | Group anagrams with tuple keys | hashable signatures
Group words into anagram classes in O(n·k) using a **26-count tuple** as the key, rather than sorting each word.
:::solution
```python
from collections import defaultdict

def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        counts = [0] * 26
        for ch in w:
            counts[ord(ch) - ord("a")] += 1
        groups[tuple(counts)].append(w)       # lists can't be keys; tuples can
    return list(groups.values())

print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
```
:::explain
Two words are anagrams if and only if their letter-count vectors match. A list of counts isn't hashable, so we freeze it into a tuple. Building each key is O(k) instead of O(k log k) for sorting the letters.
:::end

:::problem medium | Grid paths with memoised tuple states | tuples as memo keys
Count the paths from the top-left to the bottom-right of a grid (moving only right or down) avoiding obstacle cells, using `@lru_cache` on `(r, c)`.
:::solution
```python
from functools import lru_cache

grid = ["....",
        ".#..",
        "...#",
        "#..."]
R, C = len(grid), len(grid[0])

@lru_cache(maxsize=None)
def paths(r, c):
    if r >= R or c >= C or grid[r][c] == "#":
        return 0
    if (r, c) == (R - 1, C - 1):
        return 1
    return paths(r + 1, c) + paths(r, c + 1)

print(paths(0, 0))
```
:::explain
`lru_cache` keys its cache on the **tuple of arguments** `(r, c)`, so each cell is computed once: O(R·C) instead of exponential. Hashable arguments are required, so this is another place where tuples, not lists, belong.
:::end

:::problem medium | Hyper-parameter grid with results table | product, unpacking, NamedTuple
Given `grid = {"lr": [0.1, 0.01], "batch": [16, 32], "dropout": [0.0, 0.5]}`, enumerate every combination as a NamedTuple `Trial`, "score" each with a fake function, and print the best 3.
:::solution
```python
from itertools import product
from typing import NamedTuple

grid = {"lr": [0.1, 0.01], "batch": [16, 32], "dropout": [0.0, 0.5]}
Trial = NamedTuple("Trial", [(k, float) for k in grid] + [("score", float)])

def fake_score(lr, batch, dropout):
    return round(1 - abs(lr - 0.05) - batch / 1000 - abs(dropout - 0.3) / 3, 4)

trials = [Trial(*combo, fake_score(*combo)) for combo in product(*grid.values())]
for t in sorted(trials, key=lambda t: t.score, reverse=True)[:3]:
    print(t)
print(len(trials), "trials")
```
:::explain
`product(*grid.values())` yields every combination as a tuple, and `*combo` spreads it into the constructor and the scoring function. Building the `NamedTuple` type **dynamically** from the grid's keys means adding a new hyper-parameter requires no code change. That's exactly how grid-search utilities like scikit-learn's `ParameterGrid` work.
:::end

:::problem hard | Immutable linked list with tuples | recursion, persistence
Represent an immutable linked list as nested pairs `(head, tail)` with `()` as empty. Implement `cons`, `to_list`, `reverse`, and `map_`. Show that "modifying" creates new lists that **share structure** with the old one (persistence).
:::solution
```python
EMPTY = ()

def cons(x, lst):
    return (x, lst)

def from_iter(items):
    out = EMPTY
    for x in reversed(list(items)):
        out = cons(x, out)
    return out

def to_list(lst):
    out = []
    while lst:
        head, lst = lst
        out.append(head)
    return out

def reverse(lst):
    out = EMPTY
    while lst:
        head, lst = lst
        out = cons(head, out)
    return out

def map_(f, lst):
    return from_iter(f(x) for x in to_list(lst))

base = from_iter([2, 3, 4])
a = cons(1, base)                # a = 1 -> 2 -> 3 -> 4
b = cons(99, base)               # b = 99 -> 2 -> 3 -> 4
print(to_list(a), to_list(b), to_list(reverse(a)), to_list(map_(lambda x: x * 10, a)))
print("tails shared:", a[1] is b[1] is base, "| hashable:", hash(a) != hash(b))
```
:::explain
Because pairs are immutable, two lists can safely **share** the same tail: `a` and `b` reuse `base` without copying. This is **structural sharing**, the basis of persistent data structures in functional languages and of Git's object model. And since everything is tuples, whole lists are hashable and can be dict keys. Visualise it to see `a` and `b` pointing at the same `base` chain.
:::end

:::problem hard | Sparse matrix with tuple keys | dict-of-keys format
Implement a sparse matrix as a dict mapping `(row, col)` → non-zero value, with `get`, `set` (setting 0 deletes), `add`, `matmul` (O(nnz) style, not O(n³)), and `to_dense`.
:::solution
```python
from collections import defaultdict

class Sparse:
    def __init__(self, n, m, data=None):
        self.n, self.m = n, m
        self.data = {k: v for k, v in (data or {}).items() if v}
    def get(self, r, c):
        return self.data.get((r, c), 0)
    def set(self, r, c, v):
        if v:
            self.data[(r, c)] = v
        else:
            self.data.pop((r, c), None)
    def add(self, o):
        out = dict(self.data)
        for k, v in o.data.items():
            out[k] = out.get(k, 0) + v
        return Sparse(self.n, self.m, out)
    def matmul(self, o):
        rows_of_o = defaultdict(list)                    # index B by row
        for (r, c), v in o.data.items():
            rows_of_o[r].append((c, v))
        out = defaultdict(int)
        for (i, k), a in self.data.items():              # only non-zeros of A
            for j, b in rows_of_o[k]:                    # only non-zeros of B's row k
                out[(i, j)] += a * b
        return Sparse(self.n, o.m, out)
    def to_dense(self):
        return [[self.get(r, c) for c in range(self.m)] for r in range(self.n)]

A = Sparse(3, 3, {(0, 0): 2, (1, 2): 3, (2, 1): 1})
B = Sparse(3, 2, {(0, 1): 5, (2, 0): 4, (1, 1): 7})
print(A.matmul(B).to_dense())
print(A.add(A).data, len(A.data), "non-zeros")
```
:::explain
**Dictionary-of-keys (DOK)** format stores only non-zero entries, keyed by `(row, col)` tuples. Multiplication touches only pairs where A's column index meets a non-zero row of B, so the cost is proportional to the work actually needed, not n³. SciPy offers DOK, COO (lists of `(r, c, v)` tuples) and CSR formats for huge ML feature matrices.
:::end
