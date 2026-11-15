# Big-O & Complexity

**Big-O notation** describes how an algorithm's running time (or memory) **grows** as the input size `n` grows. It ignores constants and small details and focuses on the **shape** of growth. That's what lets you predict, before running anything, whether code will finish in a millisecond or a century on large inputs. Every interview asks for it.

:::analogy Delivering party invitations
- **O(1)**: post one notice on the town board. Same effort for 10 or 10,000 guests.
- **O(log n)**: find a name in a phone book by opening it in the middle, then the middle of the half, and so on.
- **O(n)**: walk to every guest's house once.
- **O(n log n)**: sort all the invitations by street first (a good sort).
- **O(n²)**: every guest personally introduces themselves to every other guest.
- **O(2ⁿ)**: try every possible guest list.
:::

## 1. The common classes

| Big-O | Name | n = 10 | n = 1,000 | n = 1,000,000 | Example |
|---|---|---|---|---|---|
| O(1) | constant | 1 | 1 | 1 | dict lookup, `xs[i]` |
| O(log n) | logarithmic | 3 | 10 | 20 | binary search |
| O(n) | linear | 10 | 1,000 | 10⁶ | one loop, `sum`, `max` |
| O(n log n) | linearithmic | 33 | 10⁴ | 2·10⁷ | `sorted`, merge sort |
| O(n²) | quadratic | 100 | 10⁶ | 10¹² ⚠️ | nested loops over the input |
| O(n³) | cubic | 1,000 | 10⁹ ⚠️ | — | naive matrix multiplication |
| O(2ⁿ) | exponential | 1,024 | 10³⁰¹ ⚠️ | — | all subsets |
| O(n!) | factorial | 3.6·10⁶ | — | — | all permutations |

:::tip The 10⁸ rule of thumb
Python performs very roughly **10⁷–10⁸ simple operations per second**. Plug your n into the complexity: n = 10⁵ with O(n²) gives 10¹⁰ operations, so minutes or worse. O(n log n) gives about 2·10⁶, so instant. Use this to choose an approach before you write any code.
:::

```python
import math
for n in [10, 100, 1000, 10**5]:
    print(f"n={n:>6}: log n={math.log2(n):6.1f}  n log n={n*math.log2(n):12.0f}  n^2={n**2:14,}")
```

## 2. The formal definition

`f(n) = O(g(n))` means: there are constants `c > 0` and `n₀` such that `f(n) ≤ c·g(n)` for all `n ≥ n₀`. Big-O is an **upper bound**.

| Symbol | Meaning |
|---|---|
| **O** (Big-O) | upper bound: "grows no faster than" |
| **Ω** (Omega) | lower bound: "grows at least as fast as" |
| **Θ** (Theta) | tight bound: both O and Ω |

In everyday interview language, "O(n)" usually means the tight bound.

### Simplification rules

1. **Drop constants**: O(3n + 5) → O(n).
2. **Keep the dominant term**: O(n² + n log n + 1000) → O(n²).
3. **Different inputs get different variables**: two loops over `a` and `b` give O(a + b), and nested loops give O(a·b), **not** O(n²).
4. **Sequential steps add; nested steps multiply.**

## 3. Analysing code

```python
def first(xs):                 # O(1)
    return xs[0]

def total(xs):                 # O(n)
    s = 0
    for x in xs:
        s += x
    return s

def has_pair_sum(xs, t):       # O(n^2): nested loops
    for i in range(len(xs)):
        for j in range(i + 1, len(xs)):
            if xs[i] + xs[j] == t:
                return True
    return False

def has_pair_sum_fast(xs, t):  # O(n): a set lookup is O(1)
    seen = set()
    for x in xs:
        if t - x in seen:
            return True
        seen.add(x)
    return False

def halving(n):                # O(log n): n halves each step
    steps = 0
    while n > 1:
        n //= 2
        steps += 1
    return steps

print(total([1, 2, 3]), has_pair_sum([1, 4, 6], 10), has_pair_sum_fast([1, 4, 6], 10), halving(1_000_000))
```

### The hidden loops in Python

| Code | Real cost | Why |
|---|---|---|
| `x in some_list` | O(n) | linear scan |
| `x in some_set` / `some_dict` | O(1) avg | hash |
| `xs.insert(0, v)`, `xs.pop(0)` | O(n) | shifts elements |
| `xs[a:b]` | O(b − a) | copies |
| `s1 + s2` (strings/lists) | O(len1 + len2) | new object |
| `sorted(xs)`, `xs.sort()` | O(n log n) | Timsort |
| `min`, `max`, `sum` | O(n) | scan everything |
| `len(xs)` | **O(1)** | the size is stored |
| `list(dict)`, `set(xs)` | O(n) | |
| `" ".join(parts)` | O(total length) | |
| `xs.index(v)`, `xs.count(v)`, `xs.remove(v)` | O(n) | |
| `heapq.heappush/pop` | O(log n) | |
| `bisect.bisect` | O(log n) search (+ O(n) for `insort`'s insert) | |

:::trap Hidden O(n²)
```python norun
result = []
for x in data:              # n iterations
    if x not in result:     # O(n) scan each time -> O(n^2) total!
        result.append(x)
```
Replace the list membership with a set (`seen = set()`), and the whole thing is O(n).
:::

## 4. Recursion: recurrences and the Master Theorem

| Recurrence | Example | Result |
|---|---|---|
| T(n) = T(n−1) + O(1) | factorial, linear recursion | O(n) |
| T(n) = T(n/2) + O(1) | binary search | O(log n) |
| T(n) = 2T(n/2) + O(n) | merge sort | O(n log n) |
| T(n) = 2T(n−1) + O(1) | naive Fibonacci, Hanoi | O(2ⁿ) |
| T(n) = T(n−1) + O(n) | selection sort, naive quicksort worst case | O(n²) |

```python
calls = 0
def fib(n):
    global calls
    calls += 1
    return n if n < 2 else fib(n - 1) + fib(n - 2)

for n in [10, 15, 20, 25]:
    calls = 0
    fib(n)
    print(f"fib({n}) made {calls:,} calls")
```

The number of calls grows by about 1.618× (the golden ratio φ) per step: exponential. Memoisation makes it O(n) (see *Dynamic Programming*).

**Master Theorem** (for T(n) = a·T(n/b) + O(nᵈ)): compare d with log_b(a).
- d > log_b a → O(nᵈ)
- d = log_b a → O(nᵈ log n)
- d < log_b a → O(n^(log_b a))

## 5. Amortised analysis

Some operations are usually cheap but occasionally expensive. **Amortised** cost averages the total over a long sequence.

```python
import sys
xs, resizes, last = [], [], sys.getsizeof([])
for i in range(1000):
    xs.append(i)
    size = sys.getsizeof(xs)
    if size != last:
        resizes.append(i)
        last = size
print(len(resizes), "resizes in 1000 appends, at sizes:", resizes[:12], "...")
```

Each resize copies everything (O(n)), but resizes become geometrically rarer, so the total cost of n appends is O(n), which is **O(1) amortised per append**. The same goes for dict/set inserts (rehashing) and the two-stack queue.

## 6. Space complexity

Count the **extra** memory you allocate, including the call stack.

```python
def reverse_copy(xs):          # O(n) extra space
    return xs[::-1]

def reverse_in_place(xs):      # O(1) extra space
    i, j = 0, len(xs) - 1
    while i < j:
        xs[i], xs[j] = xs[j], xs[i]
        i, j = i + 1, j - 1
    return xs

def depth(n):                  # O(n) space: n stacked frames!
    return 0 if n == 0 else 1 + depth(n - 1)

print(reverse_copy([1, 2, 3]), reverse_in_place([1, 2, 3]), depth(500))
```

## 7. Best, average, worst case

| Algorithm | Best | Average | Worst |
|---|---|---|---|
| Linear search | O(1) | O(n) | O(n) |
| Binary search | O(1) | O(log n) | O(log n) |
| Quicksort | O(n log n) | O(n log n) | O(n²) |
| Timsort | **O(n)** (sorted input) | O(n log n) | O(n log n) |
| Hash lookup | O(1) | O(1) | O(n) |
| Insertion sort | O(n) | O(n²) | O(n²) |

## 8. Measuring for real

```python
import timeit
for n in [1000, 2000, 4000, 8000]:
    data = list(range(n))
    t_list = timeit.timeit(lambda: (n - 1) in data, number=200)
    s = set(data)
    t_set = timeit.timeit(lambda: (n - 1) in s, number=200)
    print(f"n={n:5}  list: {t_list*1e3:7.2f} ms   set: {t_set*1e3:5.3f} ms")
```

Doubling n roughly doubles the list time (O(n)) and leaves the set time flat (O(1)). **Doubling experiments** are a quick empirical way to check a complexity class: O(n²) code takes about 4× longer when n doubles.

## Interview cheat sheet

| Constraint on n | Likely target complexity |
|---|---|
| n ≤ 10 | O(n!), O(2ⁿ·n) are fine |
| n ≤ 20 | O(2ⁿ) (bitmask DP, subsets) |
| n ≤ 500 | O(n³) |
| n ≤ 5,000 | O(n²) |
| n ≤ 10⁶ | O(n log n) or O(n) |
| n ≥ 10⁸ | O(log n) or O(1) per query (math, binary search) |

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | `in` on lists inside loops | sets/dicts |
| 2 | String `+=` in loops | `"".join` |
| 3 | `pop(0)` / `insert(0)` | `deque` |
| 4 | Slicing in recursion (`xs[1:]` copies) | pass indices |
| 5 | Calling `sorted()` inside a loop | sort once |
| 6 | Forgetting recursion's stack space | count frames |
| 7 | Saying O(n²) for two **different** inputs | O(a·b) |
| 8 | Ignoring amortisation | append is O(1) amortised |
| 9 | Exponential recursion without memoisation | `@cache` |
| 10 | Micro-optimising instead of changing the algorithm | fix the complexity class first |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
def f(n):
    total = 0
    i = 1
    while i < n:
        for j in range(n):
            total += 1
        i *= 2
    return total
```
What is the time complexity of `f(n)`?
- [ ] O(n²)
- [x] O(n log n)
- [ ] O(log n)
The outer loop doubles `i`, so it runs about log₂ n times. Each pass runs the inner loop n times. That multiplies to n · log n.
:::

:::quiz
Which of these is **O(n)**, not O(1)?
- [ ] `d[key]` for a dict
- [ ] `xs.append(x)` (amortised)
- [x] `x in xs` for a list
- [ ] `len(xs)`
Membership on a **list** scans the elements, which is O(n). Dict lookup is O(1) on average, append is O(1) amortised, and `len` is O(1) because the size is stored.
:::

:::quiz
```python norun
def g(xs):
    if len(xs) <= 1:
        return 1
    mid = len(xs) // 2
    return g(xs[:mid]) + g(xs[mid:])
```
What is the time complexity, counting the slice copies?
- [ ] O(log n)
- [ ] O(n)
- [x] O(n log n)
There are 2 recursive calls on halves, plus O(n) work per level to copy the slices: T(n) = 2T(n/2) + O(n), which is the merge-sort recurrence, so O(n log n). Without the slicing (passing indices instead), it would be O(n).
:::

## Practice problems

:::problem basic | Classify the complexity | reading code
Give the time complexity of each function, then confirm by timing doublings.
```python norun
def a(n):
    return sum(range(n))
def b(n):
    return [i * j for i in range(n) for j in range(n)]
def c(n):
    i, out = 1, 0
    while i < n:
        i *= 2; out += 1
    return out
def d(n):
    return sorted(range(n, 0, -1))
```
:::solution
```python
import time

def a(n): return sum(range(n))
def b(n): return [i * j for i in range(n) for j in range(n)]
def c(n):
    i, out = 1, 0
    while i < n:
        i *= 2; out += 1
    return out
def d(n): return sorted(range(n, 0, -1))

def ratio(f, n):
    t0 = time.perf_counter(); f(n); t1 = time.perf_counter(); f(2 * n); t2 = time.perf_counter()
    return (t2 - t1) / max(t1 - t0, 1e-9)

for f, n, guess in [(a, 200_000, "O(n) -> ~2x"), (b, 300, "O(n^2) -> ~4x"), (d, 200_000, "O(n log n) -> ~2.1x")]:
    print(f.__name__, guess, "measured", round(ratio(f, n), 1))
print("c is O(log n):", c(1_000), c(1_000_000))
```
:::explain
`a` is O(n), `b` is O(n²) (nested), `c` is O(log n) (doubling until reaching n), and `d` is O(n log n) in theory. Timsort recognises a **descending run** and reverses it in O(n), so this particular input is actually linear! Doubling ratios are noisy, so measure a few times, but they reliably separate 2× from 4× growth.
:::end

:::problem basic | Remove the hidden quadratic | sets
Rewrite `common(a, b)`, which returns the items of `a` that are also in `b` in order, from O(n·m) to O(n + m), and measure the speed-up for 20,000-element lists.
:::solution
```python
import time, random

def common_slow(a, b):
    return [x for x in a if x in b]          # `in b` scans b: O(len(b)) each time

def common_fast(a, b):
    bs = set(b)                              # O(m) once
    return [x for x in a if x in bs]         # O(1) each

a = random.sample(range(100_000), 20_000)
b = random.sample(range(100_000), 20_000)
t0 = time.perf_counter(); r1 = common_slow(a, b); t1 = time.perf_counter(); r2 = common_fast(a, b); t2 = time.perf_counter()
print(r1 == r2, f"slow {t1 - t0:.2f}s  fast {(t2 - t1)*1000:.1f}ms")
```
:::explain
Converting the lookup side to a set changes each membership test from O(m) to O(1), so the total goes from O(n·m) to O(n + m). It's the single most common performance fix in Python code.
:::end

:::problem medium | Recurrence detective | recursion trees
State and solve the recurrence for each: (1) `f(n) = f(n//2) + f(n//2)` (doing O(1) work), (2) `g(n) = g(n-1) + g(n-1)`, (3) merge sort. Then count calls empirically.
:::solution
```python
from functools import lru_cache
calls = {"f": 0, "g": 0}

def f(n):
    calls["f"] += 1
    return 1 if n <= 1 else f(n // 2) + f(n // 2)

def g(n):
    calls["g"] += 1
    return 1 if n <= 1 else g(n - 1) + g(n - 1)

for n in [16, 32, 64]:
    calls["f"] = 0; f(n)
    print(f"f({n}) calls = {calls['f']}  (~2n -> O(n))")
for n in [10, 11, 12]:
    calls["g"] = 0; g(n)
    print(f"g({n}) calls = {calls['g']}  (~2^n -> O(2^n))")
```
:::explain
(1) T(n) = 2T(n/2) + O(1): the recursion tree has log n levels and doubles each level, so the leaves total about n, giving **O(n)**. (2) T(n) = 2T(n−1) + O(1) gives **O(2ⁿ)**, because each level doubles the calls and there are n levels. (3) Merge sort, T(n) = 2T(n/2) + O(n), does O(n) work per level over log n levels: **O(n log n)**. The empirical counts match: f's calls double with n, g's double with each +1.
:::end

:::problem medium | Amortised cost of a dynamic array | amortised analysis
Implement a toy `DynArray` that doubles its capacity when full and counts every element **copy**. Show that n appends cause fewer than 2n copies in total.
:::solution
```python
class DynArray:
    def __init__(self):
        self.cap, self.n, self.data, self.copies = 1, 0, [None], 0
    def append(self, x):
        if self.n == self.cap:
            new = [None] * (self.cap * 2)
            for i in range(self.n):              # resize: copy everything
                new[i] = self.data[i]
                self.copies += 1
            self.data, self.cap = new, self.cap * 2
        self.data[self.n] = x
        self.n += 1

for n in [10, 1000, 100_000]:
    d = DynArray()
    for i in range(n):
        d.append(i)
    print(f"n={n:>7}: copies={d.copies:>7}  copies/n={d.copies / n:.2f}")
```
:::explain
Resizes copy 1 + 2 + 4 + … + n/2 elements, which is less than n in total, so the copies per append stay **below 1**, plus 1 for the write itself: O(1) amortised. If capacity grew by a **constant** (+10) instead of a factor, the copies would total O(n²). Geometric growth is the key (CPython uses about 1.125×).
:::end

:::problem hard | Choose an algorithm from constraints | estimation
For each task, choose the target complexity and approach, and implement the largest case: (a) n = 10⁶ numbers: does any pair sum to T? (b) n = 20 items: the best subset sum ≤ W. (c) n = 10⁵ queries of "how many values ≤ x" on a fixed sorted array of 10⁶ values.
:::solution
```python
import random, bisect, itertools, time

random.seed(1)
# (a) O(n) with a hash set
nums = random.sample(range(10**8), 10**6)
t0 = time.perf_counter()
target = nums[123] + nums[456789]
seen, found = set(), False
for x in nums:
    if target - x in seen:
        found = True; break
    seen.add(x)
print("(a)", found, f"{time.perf_counter() - t0:.2f}s")

# (b) O(2^n) is fine for n = 20 (about 10^6 subsets)
items = [random.randint(1, 100) for _ in range(20)]
W = 500
t0 = time.perf_counter()
best = max(s for r in range(len(items) + 1) for c in itertools.combinations(items, r) if (s := sum(c)) <= W)
print("(b)", best, f"{time.perf_counter() - t0:.2f}s")

# (c) O(log n) per query with binary search
arr = sorted(random.randint(0, 10**9) for _ in range(10**6))
queries = [random.randint(0, 10**9) for _ in range(10**5)]
t0 = time.perf_counter()
answers = [bisect.bisect_right(arr, q) for q in queries]
print("(c)", answers[:3], f"{time.perf_counter() - t0:.2f}s")
```
:::explain
(a) O(n²) on 10⁶ is 10¹² operations, which is hopeless, but a hash set makes it a single O(n) pass. (b) n = 20 means 2²⁰ ≈ 10⁶ subsets, so brute force is fine. Recognising when exponential is *acceptable* is a skill too (for bigger n, use DP). (c) Each query by linear scan would be 10⁵·10⁶ = 10¹¹ operations, but `bisect` makes each one O(log n) ≈ 20 steps. **Read the constraints first.** They usually tell you the intended complexity.
:::end

:::problem hard | Prove amortised O(1) for the two-stack queue | potential method
For the two-stack queue (*Stacks & Queues*), instrument every element move, run a random mix of 100,000 operations, and show that the total moves are ≤ 3 × (number of pushes), even though a single pop can cost O(n).
:::solution
```python
import random

class Q:
    def __init__(self):
        self.inb, self.out, self.moves, self.worst = [], [], 0, 0
    def push(self, x):
        self.inb.append(x); self.moves += 1
    def pop(self):
        cost = 0
        if not self.out:
            while self.inb:
                self.out.append(self.inb.pop()); cost += 1
        self.moves += cost + 1
        self.worst = max(self.worst, cost + 1)
        return self.out.pop()

random.seed(3)
q, pushes, size = Q(), 0, 0
for _ in range(100_000):
    if size == 0 or random.random() < 0.6:
        q.push(1); pushes += 1; size += 1
    else:
        q.pop(); size -= 1
print(f"pushes={pushes}  total moves={q.moves}  ratio={q.moves / pushes:.2f}  worst single pop={q.worst}")
```
:::explain
Each element is touched at most 3 times: pushed onto `inbox`, moved to `outbox`, popped. So the total work is ≤ 3 × the number of pushes, which is O(1) amortised per operation, even though the worst **single** pop moved thousands of elements. In the **potential method**, each push "prepays" for its future move, which is the formal version of this accounting argument.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Contains duplicate | LeetCode 217 | https://leetcode.com/problems/contains-duplicate/
Return True if any value appears at least twice. Write the O(n²) brute force **and** an O(n) version, and make sure the fast one handles 10⁵ elements instantly.
:::starter
```python norun
def contains_duplicate(nums):
    pass
```
:::tests
```python norun
assert contains_duplicate([1, 2, 3, 1]) is True
assert contains_duplicate([1, 2, 3, 4]) is False
assert contains_duplicate([]) is False
assert contains_duplicate(list(range(100000))) is False
assert contains_duplicate(list(range(100000)) + [5]) is True
```
:::solution
```python
def contains_duplicate_slow(nums):          # O(n^2): compares every pair
    return any(nums[i] == nums[j] for i in range(len(nums)) for j in range(i + 1, len(nums)))

def contains_duplicate(nums):               # O(n): set membership is O(1)
    seen = set()
    for x in nums:
        if x in seen:
            return True
        seen.add(x)
    return False

print(contains_duplicate_slow([1, 2, 3, 1]), contains_duplicate(list(range(100000))))
```
:::explain
For 10⁵ elements, the brute force does about 5·10⁹ comparisons (minutes), while the set version does 10⁵ O(1) checks (milliseconds). The trade-off is **time vs memory**: O(n) extra space for the set. Sorting first gives O(n log n) time with O(1) extra space, which is a third valid point on that curve.
:::complexity
O(n) time, O(n) space.
:::end

:::program basic | Find all numbers disappeared | LeetCode 448 | https://leetcode.com/problems/find-all-numbers-disappeared-in-an-array/
`nums` has n values, each in 1..n. Return the numbers in 1..n that are missing, in O(n) time and **O(1) extra space** (the output list doesn't count).
:::starter
```python norun
def find_disappeared_numbers(nums):
    pass
```
:::tests
```python norun
assert find_disappeared_numbers([4, 3, 2, 7, 8, 2, 3, 1]) == [5, 6]
assert find_disappeared_numbers([1, 1]) == [2]
assert find_disappeared_numbers([1, 2, 3]) == []
assert find_disappeared_numbers([2, 2, 2]) == [1, 3]
```
:::hint
Use the array itself as the "seen" table: for each value v, make `nums[abs(v) - 1]` **negative**. Afterwards, the indices still holding positive values are the missing numbers.
:::solution
```python
def find_disappeared_numbers(nums):
    for v in nums:
        i = abs(v) - 1
        nums[i] = -abs(nums[i])          # mark "i+1 was seen" with the sign bit
    return [i + 1 for i, v in enumerate(nums) if v > 0]

print(find_disappeared_numbers([4, 3, 2, 7, 8, 2, 3, 1]))
```
:::explain
The usual "seen" set would cost O(n) memory. Since the values are exactly in the range of valid indices, the **sign** of `nums[v-1]` can serve as the flag, and `abs()` recovers the original value when it's read later. Reusing the input as scratch space is a classic way to trade the reusability of the input for space.
:::complexity
O(n) time, O(1) extra space.
:::end

:::program medium | Subarray sums divisible by K | LeetCode 974 | https://leetcode.com/problems/subarray-sums-divisible-by-k/
Count the contiguous subarrays whose sum is divisible by `k`. The brute force is O(n²) (or O(n³) naively), so get to **O(n)**.
:::starter
```python norun
def subarrays_div_by_k(nums, k):
    pass
```
:::tests
```python norun
assert subarrays_div_by_k([4, 5, 0, -2, -3, 1], 5) == 7
assert subarrays_div_by_k([5], 9) == 0
assert subarrays_div_by_k([-1, 2, 9], 2) == 2
assert subarrays_div_by_k([0, 0, 0], 3) == 6
import random
xs = [random.randint(-20, 20) for _ in range(150)]
assert subarrays_div_by_k(xs, 7) == sum(sum(xs[i:j]) % 7 == 0 for i in range(150) for j in range(i + 1, 151))
```
:::hint
`sum(i..j)` is divisible by k exactly when the prefix sums `P[j+1]` and `P[i]` leave the **same remainder** mod k. Count the remainders as you go.
:::solution
```python
from collections import Counter

def subarrays_div_by_k(nums, k):
    seen = Counter({0: 1})              # the empty prefix has remainder 0
    prefix = count = 0
    for x in nums:
        prefix = (prefix + x) % k       # Python's % is non-negative for k > 0
        count += seen[prefix]           # pair with every earlier prefix with the same remainder
        seen[prefix] += 1
    return count

print(subarrays_div_by_k([4, 5, 0, -2, -3, 1], 5))
```
:::explain
Brute force checks O(n²) subarrays. The insight: two prefixes with equal remainders differ by a multiple of k, so counting **pairs of equal remainders** counts the subarrays in one pass. Python's `%` always returns a non-negative result for positive k, so negative numbers just work (in Java or C you'd have to fix negative remainders). The random test compares against brute force on 150 elements.
:::complexity
O(n) time, O(k) space.
:::end

:::program hard | Count of smaller numbers after self | LeetCode 315 | https://leetcode.com/problems/count-of-smaller-numbers-after-self/
For each `nums[i]`, count how many elements **to its right** are smaller. The brute force is O(n²), which is too slow for 10⁵ elements, so aim for O(n log n).
:::starter
```python norun
def count_smaller(nums):
    pass
```
:::tests
```python norun
assert count_smaller([5, 2, 6, 1]) == [2, 1, 1, 0]
assert count_smaller([-1]) == [0]
assert count_smaller([-1, -1]) == [0, 0]
import random
xs = [random.randint(-50, 50) for _ in range(300)]
assert count_smaller(xs) == [sum(y < x for y in xs[i + 1:]) for i, x in enumerate(xs)]
big = list(range(20000, 0, -1))
assert count_smaller(big)[:3] == [19999, 19998, 19997]
```
:::hint
Walk from **right to left**, keeping the values seen so far in a sorted list. `bisect_left` gives how many seen values are smaller. For a true O(n log n), use a **Fenwick tree** (binary indexed tree) over the value ranks instead of a list.
:::solution
```python
def count_smaller(nums):
    ranks = {v: i + 1 for i, v in enumerate(sorted(set(nums)))}   # compress values to 1..m
    m = len(ranks)
    tree = [0] * (m + 1)                       # Fenwick tree of counts per rank

    def add(i):
        while i <= m:
            tree[i] += 1
            i += i & -i                        # jump to the next responsible node

    def prefix(i):                             # how many seen values have rank <= i
        s = 0
        while i > 0:
            s += tree[i]
            i -= i & -i
        return s

    out = []
    for v in reversed(nums):
        r = ranks[v]
        out.append(prefix(r - 1))              # strictly smaller ranks
        add(r)
    return out[::-1]

print(count_smaller([5, 2, 6, 1]))
```
:::explain
**Coordinate compression** maps the values to ranks 1..m. The **Fenwick tree** stores counts so that both "add one at rank r" and "count ranks ≤ r" take O(log m), using the `i & -i` lowest-set-bit trick from the bits chapter. Scanning from the right means the tree contains exactly the elements after the current one. A `bisect.insort` version is simpler, but its inserts are O(n) each, making it O(n²) worst case: a nice illustration of how the data structure choice sets the complexity.
:::complexity
O(n log n) time, O(n) space.
:::end
