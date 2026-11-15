# Comprehensions & Unpacking

A **comprehension** builds a new collection from an existing iterable in one readable line: *"give me `f(x)` for every `x` in this, if it passes this test."* **Unpacking** goes the other way: it splits a collection into separate names. Together they're the backbone of idiomatic ("Pythonic") code.

:::analogy A cookie-cutter assembly line
Dough comes down a belt (`for x in data`). A quality inspector removes bad pieces (`if cond`). A cutter shapes each remaining piece (`expression`). The tray at the end is your new list. The comprehension describes the whole line in one sentence.
:::

**What you'll learn**: list/set/dict comprehensions and generator expressions, filtering vs conditional expressions, nested comprehensions (and how to read them), comprehension scope, when *not* to use them, performance, and every unpacking form: tuple, star, nested, `*` and `**` at call sites and in literals, and in `for` loops.

## 1. List comprehensions

```python
nums = [1, 2, 3, 4, 5, 6]

squares = [x * x for x in nums]                 # map
evens = [x for x in nums if x % 2 == 0]         # filter
labels = ["even" if x % 2 == 0 else "odd" for x in nums]   # if-else is part of the EXPRESSION
print(squares, evens, labels, sep="\n")
```

The equivalent loop:

```python
nums = [1, 2, 3, 4, 5, 6]
evens = []
for x in nums:
    if x % 2 == 0:
        evens.append(x)
print(evens)
```

:::trap Filter `if` vs conditional expression
- `[x for x in xs if cond]` (`if` at the **end**) → **filters** (fewer items).
- `[a if cond else b for x in xs]` (`if…else` at the **front**) → **transforms** (same number of items).
- `[x for x in xs if cond else y]` → SyntaxError. A filter has no `else`.
:::

## 2. Set and dict comprehensions, generator expressions

```python
words = ["apple", "Bob", "apple", "cat", "bob"]

unique_lower = {w.lower() for w in words}                 # set
lengths = {w: len(w) for w in words}                      # dict (duplicate keys: last wins)
inverted = {v: k for k, v in {"a": 1, "b": 2}.items()}    # swap keys/values
total_len = sum(len(w) for w in words)                    # generator expression (lazy)
print(unique_lower, lengths, inverted, total_len, sep="\n")
```

:::note There is no "tuple comprehension"
`(x for x in xs)` is a **generator expression**, not a tuple. For a tuple, write `tuple(x for x in xs)`.
:::

## 3. Nested comprehensions: read them left to right like nested loops

```python
matrix = [[1, 2, 3], [4, 5, 6]]

flat = [x for row in matrix for x in row]          # outer loop first!
print(flat)
# same as:
# for row in matrix:
#     for x in row:
#         flat.append(x)

transposed = [[row[i] for row in matrix] for i in range(3)]   # a comprehension INSIDE the expression
print(transposed)

pairs = [(a, b) for a in range(3) for b in range(3) if a < b]
print(pairs)
```

:::tip The reading rule
Write out the `for` clauses in the **same order** as nested loops, top to bottom. The expression at the front is what goes in the innermost `append(...)`. If you need more than two `for`s, or the line no longer fits, switch to a normal loop.
:::

## 4. Scope: comprehension variables don't leak

```python
x = "outer"
squares = [x * 2 for x in range(3)]
print(x)          # 'outer': the loop variable stayed inside the comprehension
```

Since Python 3.12 (PEP 709), list/dict/set comprehensions are **inlined** for speed, but they still keep their own iteration variables. One famous gotcha remains in **class bodies**: a comprehension can't see class-level names other than the outermost iterable.

```python error
class Config:
    factor = 3
    scaled = [factor * x for x in range(3)]   # NameError: name 'factor' is not defined
```

## 5. Performance and when *not* to use them

```python
import timeit
loop = """
out = []
for x in range(1000):
    out.append(x * x)
"""
comp = "[x * x for x in range(1000)]"
print("loop:", round(timeit.timeit(loop, number=2000), 3), "s")
print("comp:", round(timeit.timeit(comp, number=2000), 3), "s")
```

Comprehensions are usually faster than equivalent `append` loops, because there's no attribute lookup for `out.append` on every iteration. But:

- **Don't** use a comprehension just for side effects: `[print(x) for x in xs]` builds a useless list of `None`s. Use a loop.
- **Don't** nest three levels deep or squeeze complex logic in. Readability wins.
- Use a **generator expression** when the result is consumed once (`sum`, `any`, `max`, `"".join`).

## 6. Unpacking — every form

```python
point = (3, 4)
x, y = point                           # tuple unpacking
first, *middle, last = [1, 2, 3, 4, 5]   # star unpacking -> middle is a LIST
(a, b), c = (1, 2), 3                  # nested unpacking
_, second, *_ = "abcde"                # ignore parts with _
print(x, y, first, middle, last, a, b, c, second)

for i, (name, score) in enumerate([("ada", 9), ("bob", 7)]):   # in loops
    print(i, name, score)
```

### `*` and `**` in calls and literals

```python
def f(a, b, c):
    return a + b + c

args = [1, 2, 3]
kwargs = {"a": 1, "b": 2, "c": 3}
print(f(*args), f(**kwargs))

merged_list = [*range(3), *"ab", 99]           # unpack into a list literal
merged_set = {*[1, 2], *[2, 3]}
defaults = {"lr": 0.1, "epochs": 10}
override = {"epochs": 50}
config = {**defaults, **override, "seed": 42}  # later keys win
print(merged_list, merged_set, config)
print(defaults | override)                     # dict merge operator (3.9+)
```

:::trap Unpacking count mismatches
`a, b = [1, 2, 3]` → `ValueError: too many values to unpack (expected 2)`. With star unpacking the starred name absorbs the rest, but you can have only **one** starred target per level.
:::

```python error
a, b = [1, 2, 3]
```

:::quiz
What is `middle` after `first, *middle, last = "ab"`?
- [ ] `None`
- [ ] `''`
- [x] `[]`
- [ ] `ValueError`
`first = 'a'`, `last = 'b'`, and the starred target always becomes a **list**, which here is empty. Only if there were fewer than 2 items would you get a ValueError.
:::

## Tricks & tips

- `dict(zip(keys, values))` or `{k: v for k, v in zip(keys, values)}` builds a dict from two lists.
- `[x for x in xs if x]` removes falsy values (`None`, `0`, `""`). Be careful if `0` is valid.
- `{x: i for i, x in enumerate(xs)}` maps value → last index. Iterate `reversed` for the first index.
- `sorted({...})` deduplicates and sorts in one go.
- `[[0] * cols for _ in range(rows)]` builds a grid safely (each row is a new list).
- `head, *tail = xs` is the functional-programming "car/cdr".
- `a, b = b, a + b` advances Fibonacci-style pairs.
- Walrus inside comprehensions avoids computing twice: `[y for x in xs if (y := f(x)) > 0]`.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | `[[0]*3]*3` aliasing | comprehension for the outer level |
| 2 | Filter-`if` vs ternary confusion | ternary at the front, filter at the end |
| 3 | Wrong loop order in nested comprehensions | write it as loops first |
| 4 | Side-effect comprehensions | use a for loop |
| 5 | Class-body comprehension NameError | compute outside, or use a loop |
| 6 | Huge list comprehensions eating memory | generator expressions |
| 7 | Duplicate keys in a dict comprehension silently overwrite | check `len` or use `defaultdict(list)` |
| 8 | Unpacking count mismatch | star target, or validate length |
| 9 | Unpacking a dict gives KEYS (`a, b = {"x": 1, "y": 2}`) | `.items()` / `.values()` |
| 10 | Generator expression consumed twice | materialise if reused |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
grid = [[0] * 2] * 2
grid[0][0] = 9
safe = [[0] * 2 for _ in range(2)]
safe[0][0] = 9
print(grid, safe)
```
What prints?
- [x] `[[9, 0], [9, 0]] [[9, 0], [0, 0]]`
- [ ] `[[9, 0], [0, 0]] [[9, 0], [0, 0]]`
- [ ] `[[9, 0], [9, 0]] [[9, 0], [9, 0]]`
`[[0] * 2] * 2` repeats a **reference** to one inner list. The comprehension evaluates `[0] * 2` **once per iteration**, creating separate rows.
:::

:::quiz
```python norun
pairs = [(a, b) for a in range(3) for b in range(a)]
print(pairs)
```
What prints?
- [ ] `[(0, 0), (1, 0), (2, 0), (2, 1)]`
- [x] `[(1, 0), (2, 0), (2, 1)]`
- [ ] `NameError: a is not defined`
The `for` clauses nest left to right, so the inner loop can use `a`. When `a == 0`, `range(0)` is empty and contributes nothing.
:::

## Practice problems

:::problem basic | Squares of odd numbers | list comprehension, filter
Given `nums = range(1, 16)`, build the list of squares of the odd numbers, and the list where odd numbers are squared and even numbers are left as they are.
:::solution
```python
nums = range(1, 16)
odd_squares = [n * n for n in nums if n % 2]
mixed = [n * n if n % 2 else n for n in nums]
print(odd_squares)
print(mixed)
```
:::explain
The first uses a **filter** (`if` at the end) and has 8 items. The second uses a **conditional expression** (at the front) and keeps all 15. `n % 2` is truthy for odd numbers.
:::end

:::problem basic | Word lengths dict & inverse index | dict comprehension
From `"the quick brown fox jumps over the lazy dog"`, build `{word: len(word)}` and then `{length: [words of that length]}` (sorted words, no duplicates).
:::solution
```python
text = "the quick brown fox jumps over the lazy dog"
words = text.split()
lengths = {w: len(w) for w in words}
by_len = {n: sorted({w for w in words if len(w) == n}) for n in sorted(set(lengths.values()))}
print(lengths)
print(by_len)
```
:::explain
The inner **set** comprehension removes duplicates ("the" appears twice), then `sorted` turns it into an ordered list. This is O(n·k) for k distinct lengths, which is fine for small text. The `defaultdict` version in the Dictionaries chapter is O(n).
:::end

:::problem basic | Flatten and transpose | nested comprehensions
Given `m = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]`, produce the flattened list, the transpose (with a comprehension *and* with `zip`), and the diagonal.
:::solution
```python
m = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flat = [x for row in m for x in row]
t1 = [[row[c] for row in m] for c in range(len(m[0]))]
t2 = [list(col) for col in zip(*m)]
diag = [m[i][i] for i in range(len(m))]
print(flat, t1, t2 == t1, diag, sep="\n")
```
:::explain
`zip(*m)` unpacks the rows as separate arguments to `zip`, which then pairs up the first elements, the second elements, and so on. That's exactly the columns. It's the most famous use of argument unpacking.
:::end

:::problem medium | Matrix multiply in one comprehension | nested comprehension, zip
Multiply two matrices `A` (n×k) and `B` (k×m) using one nested comprehension. Verify on a small example.
:::solution
```python
A = [[1, 2], [3, 4], [5, 6]]       # 3x2
B = [[7, 8, 9], [10, 11, 12]]      # 2x3
C = [[sum(a * b for a, b in zip(row, col)) for col in zip(*B)] for row in A]
for r in C:
    print(r)
```
:::explain
`zip(*B)` iterates B's **columns**. Each output cell is the dot product of a row of A with a column of B: `sum(a*b for a, b in zip(row, col))`. It's a nice exercise. In practice, use NumPy (`A @ B`), which is orders of magnitude faster.
:::end

:::problem medium | Pythagorean triples | multi-for comprehension, pruning
List all triples `(a, b, c)` with `a < b < c ≤ 30` and `a² + b² = c²`. Make it fast enough by starting each inner loop from the previous variable.
:::solution
```python
N = 30
triples = [(a, b, c)
           for a in range(1, N + 1)
           for b in range(a + 1, N + 1)
           for c in range(b + 1, N + 1)
           if a * a + b * b == c * c]
print(triples)

import math
faster = [(a, b, int(c)) for a in range(1, N) for b in range(a + 1, N)
          if (c := math.isqrt(a * a + b * b)) <= N and c * c == a * a + b * b]
print(faster == triples)
```
:::explain
Starting `b` at `a+1` and `c` at `b+1` removes duplicates and permutations, roughly a 6× saving. The second version drops the third loop: compute `c` directly with `math.isqrt` (exact integer square root) and check that it squares back. That's O(N²) instead of O(N³), and the walrus keeps it in one comprehension.
:::end

:::problem medium | Config merge with defaults | ** unpacking, dict merge
Write `build_config(**overrides)` returning `DEFAULTS` merged with overrides, where unknown keys raise `KeyError` listing **all** bad keys. Don't mutate `DEFAULTS`.
:::solution
```python
DEFAULTS = {"lr": 1e-3, "epochs": 10, "batch_size": 32}

def build_config(**overrides):
    unknown = overrides.keys() - DEFAULTS.keys()     # dict views support set operations
    if unknown:
        raise KeyError(f"unknown options: {sorted(unknown)}")
    return {**DEFAULTS, **overrides}

print(build_config(epochs=3))
print(DEFAULTS)
try:
    build_config(lr=0.1, epoch=5, dropout=0.2)
except KeyError as e:
    print(e)
```
:::explain
`{**a, **b}` creates a **new** dict where b's keys override a's, so the defaults stay untouched. `dict.keys()` returns a **set-like view**, so `overrides.keys() - DEFAULTS.keys()` computes unknown keys in one expression. Reporting all bad keys at once (not just the first) is a nice UX touch.
:::end

:::problem hard | Generate all valid parentheses | comprehension + recursion
Generate all combinations of `n` pairs of well-formed parentheses (LeetCode 22) using a recursive function whose body is a **single comprehension**.
:::solution
```python
def parens(open_left, close_left, prefix=""):
    if open_left == close_left == 0:
        return [prefix]
    return [s
            for ch, ok in (("(", open_left > 0), (")", close_left > open_left))
            if ok
            for s in parens(open_left - (ch == "("), close_left - (ch == ")"), prefix + ch)]

print(parens(3, 3))
print([len(parens(n, n)) for n in range(1, 8)])   # Catalan numbers
```
:::explain
At each step we may add `(` if any remain, or `)` if more `)` than `(` remain (meaning there's an unmatched `(` to close). The comprehension's first `for` picks a candidate character, the `if` checks validity, and the second `for` flattens the recursive results. `ch == "("` is a bool used as `0`/`1`. The counts 1, 2, 5, 14, 42, … are the **Catalan numbers**.
:::end

:::problem hard | Group anagrams with comprehensions only | sorting keys, dict comprehension
Group words into anagram classes (LeetCode 49) using comprehensions (no explicit `for` statements), returning the groups sorted by size, largest first.
:::solution
```python
from itertools import groupby

words = ["eat", "tea", "tan", "ate", "nat", "bat", "tab", "listen", "silent", "enlist"]
key = lambda w: "".join(sorted(w))
groups = sorted(
    ([w for w in g] for _, g in groupby(sorted(words, key=key), key=key)),
    key=len, reverse=True)
print(groups)
```
:::explain
Two words are anagrams exactly when their **sorted letters** match, so that's the grouping key. `groupby` needs input sorted by the same key, which explains the inner `sorted(words, key=key)`. Cost: O(n·k log k) for sorting each word plus O(n log n) for sorting the list. The usual O(n·k log k) dict-of-lists version appears in the Dictionaries chapter. Knowing both shows depth.
:::end

:::problem hard | Run-length encode / decode | groupby, unpacking, comprehensions
Write `rle_encode("aaabccddd")` → `"a3b1c2d3"` and `rle_decode` back, each as a one-line expression. Support counts above 9 (e.g. `"x12"`).
:::solution
```python
import re
from itertools import groupby

def rle_encode(s):
    return "".join(f"{ch}{len(list(g))}" for ch, g in groupby(s))

def rle_decode(code):
    return "".join(ch * int(n) for ch, n in re.findall(r"(\D)(\d+)", code))

s = "aaabccddd" + "x" * 12
enc = rle_encode(s)
print(enc, rle_decode(enc) == s)
```
:::explain
`groupby` yields **consecutive** runs, which is exactly what RLE needs (unsorted input is correct here!). Decoding uses the regex `(\D)(\d+)`, "one non-digit followed by one or more digits", so multi-digit counts work. The `findall` tuples unpack straight into `ch, n` in the generator expression.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Transpose matrix | LeetCode 867 | https://leetcode.com/problems/transpose-matrix/
Return the transpose of a (possibly non-square) matrix: rows become columns. Write it as a **nested comprehension**, then as a one-liner with `zip`.
:::starter
```python norun
def transpose(matrix):
    pass
```
:::tests
```python norun
assert transpose([[1, 2, 3], [4, 5, 6], [7, 8, 9]]) == [[1, 4, 7], [2, 5, 8], [3, 6, 9]]
assert transpose([[1, 2, 3], [4, 5, 6]]) == [[1, 4], [2, 5], [3, 6]]
assert transpose([[5]]) == [[5]]
assert transpose([[1], [2]]) == [[1, 2]]
```
:::solution
```python
def transpose(matrix):
    return [[row[c] for row in matrix] for c in range(len(matrix[0]))]

def transpose_zip(matrix):
    return [list(col) for col in zip(*matrix)]

m = [[1, 2, 3], [4, 5, 6]]
print(transpose(m), transpose_zip(m))
```
:::explain
The outer comprehension picks a column index `c`, and the inner one collects that column from every row. `zip(*matrix)` unpacks the rows as separate arguments, and zip groups the first elements, then the second… which are exactly the columns. The result has shape cols × rows.
:::complexity
O(rows × cols).
:::end

:::program basic | Flipping an image | LeetCode 832 | https://leetcode.com/problems/flipping-an-image/
Given a binary matrix, flip each row horizontally, then invert it (0 → 1, 1 → 0). Return the new matrix in **one comprehension** without modifying the input.
:::starter
```python norun
def flip_and_invert(image):
    pass
```
:::tests
```python norun
img = [[1, 1, 0], [1, 0, 1], [0, 0, 0]]
assert flip_and_invert(img) == [[1, 0, 0], [0, 1, 0], [1, 1, 1]]
assert img == [[1, 1, 0], [1, 0, 1], [0, 0, 0]]
assert flip_and_invert([[1, 1, 0, 0], [1, 0, 0, 1], [0, 1, 1, 1], [1, 0, 1, 0]]) == [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 1], [1, 0, 1, 0]]
assert flip_and_invert([[0]]) == [[1]]
```
:::solution
```python
def flip_and_invert(image):
    return [[1 - x for x in reversed(row)] for row in image]

print(flip_and_invert([[1, 1, 0], [1, 0, 1], [0, 0, 0]]))
```
:::explain
`reversed(row)` walks the row backwards lazily (no copy), and `1 - x` inverts a bit (`x ^ 1` works too). Because the comprehension builds new lists, the input is untouched, which the second test checks.
:::complexity
O(n²).
:::end

:::program medium | Pascal's triangle | LeetCode 118 | https://leetcode.com/problems/pascals-triangle/
Return the first `num_rows` rows of Pascal's triangle. Each row is built from the previous one: every inner value is the sum of the two values above it.
:::starter
```python norun
def generate(num_rows):
    pass
```
:::tests
```python norun
assert generate(1) == [[1]]
assert generate(5) == [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1]]
assert generate(0) == []
import math
assert generate(12)[-1] == [math.comb(11, k) for k in range(12)]
```
:::hint
Pad the previous row with 0 on both sides and add the shifted copies element-wise: `[a + b for a, b in zip([0] + row, row + [0])]`.
:::solution
```python
def generate(num_rows):
    rows = []
    row = [1]
    for _ in range(num_rows):
        rows.append(row)
        row = [a + b for a, b in zip([0] + row, row + [0])]
    return rows

for r in generate(6):
    print(" ".join(map(str, r)).center(30))
```
:::explain
Shifting the row right (`[0] + row`) and left (`row + [0]`) lines up each pair of neighbours, so a single zip-comprehension builds the next row, edges included. The values are binomial coefficients C(n, k), which the last test checks with `math.comb`. Each new row is a fresh list, so `rows` never contains aliased references.
:::trace
| row | [0]+row | row+[0] | next row |
|---|---|---|---|
| [1] | [0, 1] | [1, 0] | [1, 1] |
| [1, 1] | [0, 1, 1] | [1, 1, 0] | [1, 2, 1] |
| [1, 2, 1] | [0, 1, 2, 1] | [1, 2, 1, 0] | [1, 3, 3, 1] |
:::complexity
O(n²) time and space.
:::end

:::program hard | Diagonal traverse | LeetCode 498 | https://leetcode.com/problems/diagonal-traverse/
Return all elements of an m × n matrix in "zig-zag diagonal" order: up-right along the first diagonal, then down-left along the next, alternating.

```text
[[1, 2, 3],
 [4, 5, 6],      ->  [1, 2, 4, 7, 5, 3, 6, 8, 9]
 [7, 8, 9]]
```
:::starter
```python norun
def find_diagonal_order(mat):
    pass
```
:::tests
```python norun
assert find_diagonal_order([[1, 2, 3], [4, 5, 6], [7, 8, 9]]) == [1, 2, 4, 7, 5, 3, 6, 8, 9]
assert find_diagonal_order([[1, 2], [3, 4]]) == [1, 2, 3, 4]
assert find_diagonal_order([[1, 2, 3, 4]]) == [1, 2, 3, 4]
assert find_diagonal_order([[1], [2], [3]]) == [1, 2, 3]
assert find_diagonal_order([[1, 2, 3], [4, 5, 6]]) == [1, 2, 4, 5, 3, 6]
```
:::hint
All cells on one anti-diagonal share `r + c = d`. Collect each diagonal top-down (increasing `r`), then reverse every **even** `d` so it reads bottom-up.
:::solution
```python
def find_diagonal_order(mat):
    m, n = len(mat), len(mat[0])
    out = []
    for d in range(m + n - 1):
        diag = [mat[r][d - r] for r in range(max(0, d - n + 1), min(m, d + 1))]
        out.extend(diag[::-1] if d % 2 == 0 else diag)
    return out

print(find_diagonal_order([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))
```
:::explain
Instead of simulating the bouncing walk (lots of edge cases), group cells by their **diagonal index** `d = r + c`. For a fixed `d`, `r` ranges over `max(0, d−n+1) … min(m−1, d)`, so the comprehension only touches valid cells. Even diagonals travel upward, so we reverse them. Turning the geometry into an index formula is a classic simplification trick.
:::trace
3×3 example:
| d | cells top-down | emitted |
|---|---|---|
| 0 | [1] | 1 |
| 1 | [2, 4] | 2, 4 |
| 2 | [3, 5, 7] | 7, 5, 3 (reversed) |
| 3 | [6, 8] | 6, 8 |
| 4 | [9] | 9 |
:::complexity
O(m·n).
:::end
