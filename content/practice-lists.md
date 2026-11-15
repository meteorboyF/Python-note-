# Practice Set · Lists

Sixteen hand-picked list problems, from warm-ups to small real-world tasks. Each one has your **input** and **expected output**, an editor with a **▶ Run tests** judge, a hint, and a solution you can **👣 step through** line by line.

:::tip How to practise
1. Read the task and write a plain **loop** version first. It's the easiest to get right.
2. Press **▶ Run tests**. A failing test shows what your function returned versus what was expected.
3. Once it passes, try a **one-liner** (comprehension, `sum`, `zip`, `sorted`…) and compare it with the solution.
4. Open **👣 Visualise my code** to watch your list change step by step.
:::

Covered here: indexing, slicing, `sorted`/`set`, comprehensions, `zip`, `enumerate`, running totals and in-place vs new lists. Review the [Lists chapter](#/t/lists) if something feels new.

## Problems

:::program basic | Second largest unique number | Practice set
Return the **second largest unique** number in a list, or `None` if there isn't one.

Input `nums = [12, 45, 2, 41, 45, 10, 8]` → expected `41` (45 appears twice, but it only counts once).
:::starter
```python norun
def second_largest(nums):
    # Write your code here
    pass

print("Second Largest:", second_largest([12, 45, 2, 41, 45, 10, 8]))   # Expected: Second Largest: 41
```
:::tests
```python norun
assert second_largest([12, 45, 2, 41, 45, 10, 8]) == 41
assert second_largest([5, 5, 5]) is None
assert second_largest([3, 9]) == 3
assert second_largest([-1, -7, -3]) == -3
assert second_largest([]) is None
```
:::hint
`set(nums)` removes duplicates. Sort the unique values, or track the two largest values in a single pass.
:::solution
```python
def second_largest(nums):
    unique = sorted(set(nums))          # duplicates vanish, then ascending order
    return unique[-2] if len(unique) >= 2 else None

def second_largest_one_pass(nums):      # O(n), no sorting
    first = second = None
    for x in nums:
        if first is None or x > first:
            first, second = x, first     # the old champion becomes runner-up
        elif x != first and (second is None or x > second):
            second = x
    return second

print("Second Largest:", second_largest([12, 45, 2, 41, 45, 10, 8]))
print(second_largest_one_pass([12, 45, 2, 41, 45, 10, 8]))
```
:::explain
The trap is **duplicates**: `sorted(nums)[-2]` gives 45 here, because 45 appears twice. `set` fixes it. `unique[-2]` uses a **negative index**: −1 is the last item, −2 the one before. The one-pass version shows the interview approach: keep a "first" and "second" and update both with **tuple assignment** `first, second = x, first`.
:::complexity
`sorted(set(...))`: O(n log n). One pass: O(n) time, O(1) extra space.
:::end

:::program basic | Filter scores above average | Practice set
Return `(average rounded to 2 decimals, list of scores strictly above the average)`.

Input `scores = [72, 85, 90, 65, 88, 70]` → `Average: 78.33, Above Average: [85, 90, 88]`
:::starter
```python norun
def above_average(scores):
    # Write your code here
    pass

avg, above = above_average([72, 85, 90, 65, 88, 70])
print(f"Average: {avg}, Above Average: {above}")   # Expected: Average: 78.33, Above Average: [85, 90, 88]
```
:::tests
```python norun
assert above_average([72, 85, 90, 65, 88, 70]) == (78.33, [85, 90, 88])
assert above_average([50, 50, 50]) == (50.0, [])
assert above_average([1, 2]) == (1.5, [2])
```
:::hint
`sum(scores) / len(scores)` is the average. Compare against the **unrounded** average, and round only for display.
:::solution
```python
def above_average(scores):
    avg = sum(scores) / len(scores)
    above = [s for s in scores if s > avg]       # comprehension with a filter
    return round(avg, 2), above

avg, above = above_average([72, 85, 90, 65, 88, 70])
print(f"Average: {avg}, Above Average: {above}")
```
:::explain
A **list comprehension with an `if`** filters in one line: `[s for s in scores if s > avg]`. Keep the original order (no sorting). Round **only at the end**: comparing against a rounded average can misclassify values that are very close to it.
:::complexity
O(n).
:::end

:::program basic | Remove duplicates, preserving order | Practice set
Remove duplicates while keeping the **first occurrence order**.

Input `["apple", "banana", "apple", "orange", "banana", "grape"]` → `['apple', 'banana', 'orange', 'grape']`
:::starter
```python norun
def dedupe(items):
    # Write your code here
    pass

print(dedupe(["apple", "banana", "apple", "orange", "banana", "grape"]))
# Expected: ['apple', 'banana', 'orange', 'grape']
```
:::tests
```python norun
assert dedupe(["apple", "banana", "apple", "orange", "banana", "grape"]) == ["apple", "banana", "orange", "grape"]
assert dedupe([3, 1, 3, 2, 1]) == [3, 1, 2]
assert dedupe([]) == []
```
:::hint
`list(set(items))` loses the order. Keep a `seen` set next to the result list, or use `dict.fromkeys`.
:::solution
```python
def dedupe(items):
    seen, out = set(), []
    for x in items:
        if x not in seen:          # set membership is O(1)
            seen.add(x)
            out.append(x)
    return out

def dedupe_short(items):
    return list(dict.fromkeys(items))   # dict keys are unique AND keep insertion order

print(dedupe(["apple", "banana", "apple", "orange", "banana", "grape"]))
print(dedupe_short(["apple", "banana", "apple", "orange", "banana", "grape"]))
```
:::explain
`set` alone scrambles the order. Two classic fixes: a **seen-set** loop (`x not in seen` is O(1), while `x not in out` would be O(n) and make the whole thing O(n²)), or the trick `dict.fromkeys(items)`, because dicts keep insertion order (Python 3.7+) and their keys are unique.
:::complexity
O(n).
:::end

:::program basic | Separate even and odd numbers | Practice set
Return `(evens, odds)` as two lists, keeping the original order.

Input `[11, 24, 37, 42, 55, 68, 70]` → `Evens: [24, 42, 68, 70], Odds: [11, 37, 55]`
:::starter
```python norun
def split_even_odd(nums):
    # Write your code here
    pass

evens, odds = split_even_odd([11, 24, 37, 42, 55, 68, 70])
print("Evens:", evens, "Odds:", odds)
```
:::tests
```python norun
assert split_even_odd([11, 24, 37, 42, 55, 68, 70]) == ([24, 42, 68, 70], [11, 37, 55])
assert split_even_odd([-3, -2, 0]) == ([-2, 0], [-3])
assert split_even_odd([]) == ([], [])
```
:::solution
```python
def split_even_odd(nums):
    evens, odds = [], []
    for n in nums:
        (evens if n % 2 == 0 else odds).append(n)   # pick the list, then append
    return evens, odds

evens, odds = split_even_odd([11, 24, 37, 42, 55, 68, 70])
print("Evens:", evens, "Odds:", odds)
```
:::explain
`n % 2 == 0` tests evenness, and it works for negatives too in Python (`-3 % 2 == 1`). The neat trick is choosing the target list with a **conditional expression** and appending once. Two comprehensions (`[n for n in nums if n % 2 == 0]`, and the same for odds) are just as clear, but they loop twice.
:::complexity
O(n).
:::end

:::program basic | Sum and count of positive numbers | Practice set
Return `(sum, count)` of the values strictly greater than 0.

Input `temps = [-5, 12, -1, 8, 0, 15, -3]` → `Sum: 35, Count: 3`
:::starter
```python norun
def positive_stats(temps):
    # Write your code here
    pass

s, c = positive_stats([-5, 12, -1, 8, 0, 15, -3])
print(f"Sum: {s}, Count: {c}")
```
:::tests
```python norun
assert positive_stats([-5, 12, -1, 8, 0, 15, -3]) == (35, 3)
assert positive_stats([0, -1]) == (0, 0)
assert positive_stats([2.5, 1]) == (3.5, 2)
```
:::hint
0 is **not** positive. Filter with `t > 0`.
:::solution
```python
def positive_stats(temps):
    pos = [t for t in temps if t > 0]
    return sum(pos), len(pos)

s, c = positive_stats([-5, 12, -1, 8, 0, 15, -3])
print(f"Sum: {s}, Count: {c}")
```
:::explain
Filter once, then reuse the filtered list for both `sum` and `len`. `sum([])` is 0, so the "no positives" case needs no special handling. The edge case to watch is **0**: "strictly positive" means `> 0`, not `>= 0`.
:::complexity
O(n).
:::end

:::program basic | Element-wise multiplication (shopping cart) | Practice set
Given parallel lists `prices` and `quantities`, return `(item_totals, grand_total)`.

Input `prices = [100, 200, 150]`, `quantities = [2, 1, 4]` → `Item totals: [200, 200, 600], Grand total: 1000`
:::starter
```python norun
def cart_totals(prices, quantities):
    # Write your code here
    pass

totals, grand = cart_totals([100, 200, 150], [2, 1, 4])
print("Item totals:", totals, "Grand total:", grand)
```
:::tests
```python norun
assert cart_totals([100, 200, 150], [2, 1, 4]) == ([200, 200, 600], 1000)
assert cart_totals([], []) == ([], 0)
assert cart_totals([9.5], [2]) == ([19.0], 19.0)
```
:::hint
`zip(prices, quantities)` walks both lists together.
:::solution
```python
def cart_totals(prices, quantities):
    totals = [p * q for p, q in zip(prices, quantities)]
    return totals, sum(totals)

totals, grand = cart_totals([100, 200, 150], [2, 1, 4])
print("Item totals:", totals, "Grand total:", grand)

import numpy as np                              # the NumPy way: vectorised
t = np.array([100, 200, 150]) * np.array([2, 1, 4])
print(t.tolist(), int(t.sum()))
```
:::explain
**`zip`** pairs up items at the same position, which beats `for i in range(len(prices))`. It stops at the shorter list, so mismatched lengths fail silently. Python 3.10+ has `zip(..., strict=True)` to catch that. With NumPy, `a * b` multiplies **element-wise** with no loop at all.
:::complexity
O(n).
:::end

:::program basic | Find every index of a target | Practice set
Return every index where `target` appears.

Input `grades = ['A', 'B', 'A', 'C', 'B', 'A']`, target `'A'` → `[0, 2, 5]`
:::starter
```python norun
def find_all(items, target):
    # Write your code here
    pass

print(find_all(['A', 'B', 'A', 'C', 'B', 'A'], 'A'))   # Expected: [0, 2, 5]
```
:::tests
```python norun
assert find_all(['A', 'B', 'A', 'C', 'B', 'A'], 'A') == [0, 2, 5]
assert find_all(['A', 'B'], 'Z') == []
assert find_all([1, 1, 1], 1) == [0, 1, 2]
```
:::hint
`list.index` only finds the **first** match. Use `enumerate`.
:::solution
```python
def find_all(items, target):
    return [i for i, x in enumerate(items) if x == target]

print(find_all(['A', 'B', 'A', 'C', 'B', 'A'], 'A'))
```
:::explain
**`enumerate`** gives `(index, item)` pairs, the Pythonic replacement for `range(len(...))`. `items.index('A')` would stop at 0, and calling it in a loop with a start position works but is clumsier.
:::complexity
O(n).
:::end

:::program basic | Rotate a list left by k | Practice set
Rotate left by `k` positions (the first `k` items wrap around to the end). Don't modify the input.

Input `[10, 20, 30, 40, 50]`, `k = 2` → `[30, 40, 50, 10, 20]`
:::starter
```python norun
def rotate_left(data, k=2):
    # Write your code here
    pass

print(rotate_left([10, 20, 30, 40, 50], 2))   # Expected: [30, 40, 50, 10, 20]
```
:::tests
```python norun
d = [10, 20, 30, 40, 50]
assert rotate_left(d, 2) == [30, 40, 50, 10, 20]
assert d == [10, 20, 30, 40, 50]
assert rotate_left(d, 7) == [30, 40, 50, 10, 20]
assert rotate_left(d, 0) == d and rotate_left([], 3) == []
```
:::hint
Slicing: `data[k:] + data[:k]`. What if `k` is bigger than `len(data)`? Use `k % len(data)`.
:::solution
```python
def rotate_left(data, k=2):
    if not data:
        return []
    k %= len(data)                    # rotating by len(data) changes nothing
    return data[k:] + data[:k]        # slices make NEW lists: the input is untouched

print(rotate_left([10, 20, 30, 40, 50], 2))

from collections import deque         # alternative: deque.rotate (negative = left)
q = deque([10, 20, 30, 40, 50]); q.rotate(-2); print(list(q))
```
:::explain
`data[k:]` is "from k to the end", and `data[:k]` is "the first k". Gluing them together is a rotation. **`k %= len(data)`** handles k larger than the length (7 on 5 items is the same as 2), and the empty-list guard avoids dividing by zero. Slicing always creates a **new** list, so the input stays unchanged, as the test checks.
:::complexity
O(n).
:::end

:::program basic | Common elements between two lists | Practice set
Return the **unique** common elements, sorted ascending. (This also covers the `find_common` exercise.)

Input `[1, 2, 3, 4, 5, 6]` and `[4, 5, 6, 7, 8, 4]` → `[4, 5, 6]`; `[4, 2, 7, 2, 9]` and `[9, 1, 4, 4, 8]` → `[4, 9]`
:::starter
```python norun
def find_common(list1, list2):
    # Write your code here
    pass

print(find_common([1, 2, 3, 4, 5, 6], [4, 5, 6, 7, 8, 4]))   # Expected: [4, 5, 6]
print(find_common([4, 2, 7, 2, 9], [9, 1, 4, 4, 8]))         # Expected: [4, 9]
```
:::tests
```python norun
assert find_common([1, 2, 3, 4, 5, 6], [4, 5, 6, 7, 8, 4]) == [4, 5, 6]
assert find_common([4, 2, 7, 2, 9], [9, 1, 4, 4, 8]) == [4, 9]
assert find_common([1, 2], [3]) == []
```
:::hint
Set **intersection**: `set(a) & set(b)`, then `sorted(...)`.
:::solution
```python
def find_common(list1, list2):
    return sorted(set(list1) & set(list2))     # & on sets = intersection

print(find_common([1, 2, 3, 4, 5, 6], [4, 5, 6, 7, 8, 4]))
print(find_common([4, 2, 7, 2, 9], [9, 1, 4, 4, 8]))
```
:::explain
Converting to sets removes duplicates **and** makes membership O(1). `&` (or `.intersection`) keeps the elements found in both. `sorted` returns a list, so no extra `list(...)` is needed. The nested-loop version `[x for x in a if x in b]` is O(n·m) and keeps duplicates.
:::complexity
O(n + m) for the sets, plus O(k log k) to sort the k common items.
:::end

:::program basic | Flatten a 2-D list | Practice set
Turn a list of lists (rows can have different lengths) into one flat list.

Input `[[1, 2, 3], [4, 5], [6, 7, 8, 9]]` → `[1, 2, 3, 4, 5, 6, 7, 8, 9]`
:::starter
```python norun
def flatten(matrix):
    # Write your code here
    pass

print(flatten([[1, 2, 3], [4, 5], [6, 7, 8, 9]]))
```
:::tests
```python norun
assert flatten([[1, 2, 3], [4, 5], [6, 7, 8, 9]]) == [1, 2, 3, 4, 5, 6, 7, 8, 9]
assert flatten([[], [1], []]) == [1]
assert flatten([]) == []
```
:::hint
A comprehension with **two** `for`s reads in the same order as the nested loops: `[x for row in matrix for x in row]`.
:::solution
```python
def flatten(matrix):
    return [x for row in matrix for x in row]     # outer loop first, then inner

def flatten_loop(matrix):
    out = []
    for row in matrix:
        out.extend(row)                            # extend adds every item of row
    return out

print(flatten([[1, 2, 3], [4, 5], [6, 7, 8, 9]]))
print(flatten_loop([[1, 2, 3], [4, 5], [6, 7, 8, 9]]))
```
:::explain
In a nested comprehension the `for` clauses appear **in the same order as the equivalent loops**: outer first. `extend` vs `append`: `append(row)` would add the whole row as one item (giving a nested list again). `sum(matrix, [])` also works but is O(n²), so avoid it. `itertools.chain.from_iterable(matrix)` is the lazy standard-library version.
:::complexity
O(total items).
:::end

:::program basic | Longest and shortest word | Practice set
Return `((longest, its_length), (shortest, its_length))`. On ties, keep the first one.

Input `["python", "java", "c", "javascript", "go"]` → `Longest: javascript (10), Shortest: c (1)`
:::starter
```python norun
def longest_shortest(words):
    # Write your code here
    pass

(lw, ll), (sw, sl) = longest_shortest(["python", "java", "c", "javascript", "go"])
print(f"Longest: {lw} ({ll}), Shortest: {sw} ({sl})")
```
:::tests
```python norun
assert longest_shortest(["python", "java", "c", "javascript", "go"]) == (("javascript", 10), ("c", 1))
assert longest_shortest(["ab", "cd", "e"]) == (("ab", 2), ("e", 1))
assert longest_shortest(["solo"]) == (("solo", 4), ("solo", 4))
```
:::hint
`max(words, key=len)` compares words **by their length** and returns the word itself.
:::solution
```python
def longest_shortest(words):
    lw = max(words, key=len)           # key= says WHAT to compare
    sw = min(words, key=len)
    return (lw, len(lw)), (sw, len(sw))

(lw, ll), (sw, sl) = longest_shortest(["python", "java", "c", "javascript", "go"])
print(f"Longest: {lw} ({ll}), Shortest: {sw} ({sl})")
```
:::explain
The **`key=` argument** is one of Python's most useful tools: `max`, `min`, `sorted` and `.sort` call the key on each item and compare the results, but return the original item. On ties, `max`/`min` return the **first** one found. The print line shows **nested tuple unpacking**: `(lw, ll), (sw, sl) = ...`.
:::complexity
O(n).
:::end

:::program basic | Min-max normalisation | Practice set
Scale every value into 0.0 to 1.0 using `(x − min) / (max − min)`. If all values are equal, return all `0.0`.

Input `[10, 20, 30, 50]` → `[0.0, 0.25, 0.5, 1.0]`
:::starter
```python norun
def normalize(nums):
    # Write your code here
    pass

print(normalize([10, 20, 30, 50]))   # Expected: [0.0, 0.25, 0.5, 1.0]
```
:::tests
```python norun
assert normalize([10, 20, 30, 50]) == [0.0, 0.25, 0.5, 1.0]
assert normalize([7, 7]) == [0.0, 0.0]
assert normalize([-1, 1]) == [0.0, 1.0]
```
:::hint
Compute `lo = min(nums)` and `hi = max(nums)` **once**, outside the loop. Guard against `hi == lo`.
:::solution
```python
def normalize(nums):
    lo, hi = min(nums), max(nums)
    span = hi - lo
    if span == 0:
        return [0.0 for _ in nums]           # avoid ZeroDivisionError
    return [(x - lo) / span for x in nums]

print(normalize([10, 20, 30, 50]))

import numpy as np
a = np.array([10, 20, 30, 50])
print(((a - a.min()) / (a.max() - a.min())).tolist())   # vectorised, same formula
```
:::explain
This is the **MinMaxScaler** of machine learning, by hand. Computing `min`/`max` inside the comprehension would recompute them for every element (O(n²)). The constant-list edge case divides by zero unless you guard it. In NumPy, `a - a.min()` **broadcasts** the scalar to every element.
:::complexity
O(n).
:::end

:::program basic | Cumulative sum (running total) | Practice set
Each output element is the sum of all inputs up to and including that position.

Input `[100, 150, 200, 50]` → `[100, 250, 450, 500]`
:::starter
```python norun
def running_total(sales):
    # Write your code here
    pass

print(running_total([100, 150, 200, 50]))   # Expected: [100, 250, 450, 500]
```
:::tests
```python norun
assert running_total([100, 150, 200, 50]) == [100, 250, 450, 500]
assert running_total([]) == []
assert running_total([5, -5, 5]) == [5, 0, 5]
```
:::hint
Keep a variable `total` that grows as you loop, and append it each time.
:::solution
```python
from itertools import accumulate

def running_total(sales):
    out, total = [], 0
    for s in sales:
        total += s
        out.append(total)
    return out

print(running_total([100, 150, 200, 50]))
print(list(accumulate([100, 150, 200, 50])))     # the standard-library one-liner
```
:::explain
A **running total** (prefix sum) needs one variable carried across iterations, so it's O(n). Re-summing `sum(sales[:i+1])` each time would be O(n²). `itertools.accumulate` and NumPy's `np.cumsum` do exactly this. Prefix sums power many faster algorithms (see the Patterns chapter).
:::complexity
O(n).
:::end

:::program basic | Clean negative readings | Practice set
Return a **new** list where every negative value becomes `0.0`.

Input `[4.5, -2.1, 3.0, -0.5, 7.2]` → `[4.5, 0.0, 3.0, 0.0, 7.2]`
:::starter
```python norun
def clean(readings):
    # Write your code here
    pass

print(clean([4.5, -2.1, 3.0, -0.5, 7.2]))
```
:::tests
```python norun
r = [4.5, -2.1, 3.0, -0.5, 7.2]
assert clean(r) == [4.5, 0.0, 3.0, 0.0, 7.2]
assert r == [4.5, -2.1, 3.0, -0.5, 7.2]
assert clean([]) == []
```
:::hint
A **conditional expression** inside a comprehension: `[a if cond else b for x in xs]`.
:::solution
```python
def clean(readings):
    return [x if x >= 0 else 0.0 for x in readings]

print(clean([4.5, -2.1, 3.0, -0.5, 7.2]))
print([max(x, 0.0) for x in [4.5, -2.1, 3.0, -0.5, 7.2]])   # same thing
```
:::explain
Note where the `if` goes. **Filtering** puts it at the end (`[x for x in xs if x >= 0]` drops items). **Transforming** puts `a if cond else b` at the front and keeps every item. NumPy: `np.where(a < 0, 0.0, a)` or `np.clip(a, 0, None)`. The test also checks that the original list was not modified.
:::complexity
O(n).
:::end

:::program basic | Check if a list is sorted | Practice set
Return `True` if the list is in ascending order (equal neighbours are allowed).

Input `a = [1, 3, 5, 7]` → `True`; `b = [1, 5, 3, 7]` → `False`
:::starter
```python norun
def is_sorted(xs):
    # Write your code here
    pass

print("a:", is_sorted([1, 3, 5, 7]), "b:", is_sorted([1, 5, 3, 7]))   # Expected: a: True, b: False
```
:::tests
```python norun
assert is_sorted([1, 3, 5, 7]) is True
assert is_sorted([1, 5, 3, 7]) is False
assert is_sorted([]) is True and is_sorted([2, 2, 3]) is True
```
:::hint
Compare each neighbour pair: `zip(xs, xs[1:])` gives `(xs[0], xs[1]), (xs[1], xs[2]), …`
:::solution
```python
def is_sorted(xs):
    return all(a <= b for a, b in zip(xs, xs[1:]))

print("a:", is_sorted([1, 3, 5, 7]), "b:", is_sorted([1, 5, 3, 7]))
```
:::explain
`xs == sorted(xs)` works but costs O(n log n) plus a copy. **`all(...)` with neighbour pairs** is O(n) and **stops at the first violation**, because it short-circuits. `zip(xs, xs[1:])` is the standard "look at consecutive pairs" idiom (`itertools.pairwise` in 3.10+). `all([])` is `True`, so empty lists count as sorted.
:::complexity
O(n), and it stops early.
:::end
