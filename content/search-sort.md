# Searching & Sorting

Searching and sorting are the two most-studied problems in computer science, and the ideas behind them (**divide and conquer**, **invariants**, **stability**, **binary search on an answer**) show up everywhere else. In real Python you'll call `sorted()` and `bisect`, but in interviews you must be able to *build* them and reason about them.

:::analogy Library shelves
Searching an unsorted pile of books means checking each one (linear search). Searching a shelf sorted by title means opening it in the middle and discarding half each time (binary search). **Sorting** is the up-front effort that makes every later search cheap.
:::

## 1. Linear search

```python
def linear_search(xs, target):
    for i, x in enumerate(xs):
        if x == target:
            return i
    return -1

print(linear_search([4, 2, 7, 1], 7), linear_search([4, 2, 7, 1], 5))
```

O(n). It's the only option for unsorted data, unless you build a set or dict first.

## 2. Binary search: the template that never fails

Binary search needs a **monotonic** condition: something that is False, False, …, True, True (or sorted values).

```python
def lower_bound(xs, target):
    """The first index i with xs[i] >= target (len(xs) if none)."""
    lo, hi = 0, len(xs)            # search space [lo, hi)
    while lo < hi:
        mid = (lo + hi) // 2
        if xs[mid] < target:
            lo = mid + 1           # the answer is to the right of mid
        else:
            hi = mid               # mid might be the answer
    return lo

xs = [1, 3, 3, 3, 7, 9]
print(lower_bound(xs, 3), lower_bound(xs, 4), lower_bound(xs, 10), lower_bound(xs, 0))
```

:::trace
`lower_bound([1, 3, 3, 3, 7, 9], 4)`:
| lo | hi | mid | xs[mid] | decision |
|---|---|---|---|---|
| 0 | 6 | 3 | 3 < 4 | lo = 4 |
| 4 | 6 | 5 | 9 ≥ 4 | hi = 5 |
| 4 | 5 | 4 | 7 ≥ 4 | hi = 4 |
| 4 | 4 | — | stop | **4** |
:::

:::boss One template, every variant
Think of binary search as "find the **first** position where a predicate becomes True". With half-open `[lo, hi)`, `lo = mid + 1` when the predicate is False and `hi = mid` when it's True, the loop always terminates and `lo` is the answer. Exact match? Check `lo < len(xs) and xs[lo] == target`. Last occurrence? Use `lower_bound(target + 1) - 1`.
:::

### The `bisect` module

```python
import bisect
xs = [1, 3, 3, 3, 7, 9]
print(bisect.bisect_left(xs, 3), bisect.bisect_right(xs, 3))   # 1 4: first and after-last positions of 3
print(bisect.bisect_right(xs, 3) - bisect.bisect_left(xs, 3))  # the count of 3s in O(log n)
bisect.insort(xs, 5)                                            # O(log n) search + O(n) insert
print(xs)
grades = "FDCBA"
print([grades[bisect.bisect([60, 70, 80, 90], s)] for s in [33, 65, 77, 90, 100]])
people = [("ada", 36), ("bob", 41), ("cy", 52)]                # sorted by age
print(people[bisect.bisect_left(people, 40, key=lambda p: p[1])])   # key= (3.10+)
```

### Binary search on the answer

When "can we do it with value X?" is monotonic in X, binary-search X itself.

```python
import math

def min_eating_speed(piles, hours):                # LeetCode 875
    def can_finish(k):
        return sum(math.ceil(p / k) for p in piles) <= hours
    lo, hi = 1, max(piles)
    while lo < hi:
        mid = (lo + hi) // 2
        if can_finish(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo

print(min_eating_speed([3, 6, 7, 11], 8), min_eating_speed([30, 11, 23, 4, 20], 5))

def isqrt(n):                                       # the largest x with x*x <= n
    lo, hi = 0, n + 1
    while lo < hi:
        mid = (lo + hi) // 2
        if mid * mid > n: hi = mid
        else: lo = mid + 1
    return lo - 1
print(isqrt(17), isqrt(10**20), math.isqrt(10**20))
```

:::trap Infinite loops and off-by-one
Most binary search bugs come from mixing conventions (closed `[lo, hi]` vs half-open `[lo, hi)`) or writing `lo = mid` (which can loop forever when `hi = lo + 1`). Pick **one** template and always use it. Python ints don't overflow, so `(lo + hi) // 2` is safe.
:::

## 3. Elementary sorts: O(n²), but instructive

```python
def bubble_sort(xs):
    xs = xs[:]
    for end in range(len(xs) - 1, 0, -1):
        swapped = False
        for i in range(end):
            if xs[i] > xs[i + 1]:
                xs[i], xs[i + 1] = xs[i + 1], xs[i]
                swapped = True
        if not swapped:            # already sorted: O(n) best case
            break
    return xs

def selection_sort(xs):
    xs = xs[:]
    for i in range(len(xs)):
        m = min(range(i, len(xs)), key=xs.__getitem__)   # index of the min of the unsorted tail
        xs[i], xs[m] = xs[m], xs[i]
    return xs

def insertion_sort(xs):
    xs = xs[:]
    for i in range(1, len(xs)):
        cur, j = xs[i], i - 1
        while j >= 0 and xs[j] > cur:   # shift bigger items right
            xs[j + 1] = xs[j]
            j -= 1
        xs[j + 1] = cur
    return xs

data = [5, 2, 9, 1, 5, 6]
print(bubble_sort(data), selection_sort(data), insertion_sort(data))
```

Visualise `insertion_sort` and watch each new card slide left into its place, exactly like sorting a hand of cards. Insertion sort is **O(n) on nearly-sorted data**, which is why Timsort uses it for small runs.

## 4. Merge sort: divide and conquer

```python
def merge_sort(xs):
    if len(xs) <= 1:
        return xs
    mid = len(xs) // 2
    left, right = merge_sort(xs[:mid]), merge_sort(xs[mid:])
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:              # <= keeps it STABLE
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    return out + left[i:] + right[j:]

print(merge_sort([38, 27, 43, 3, 9, 82, 10]))
```

```text
[38 27 43 3 9 82 10]
   split ↓                    log n levels
[38 27 43] [3 9 82 10]
[38] [27 43]  [3 9] [82 10]
   merge ↑   each level does O(n) work  → O(n log n) total
[27 38 43]  [3 9 10 82]
[3 9 10 27 38 43 82]
```

## 5. Quicksort: partition around a pivot

```python
import random

def quicksort(xs):
    if len(xs) <= 1:
        return xs
    pivot = random.choice(xs)                    # a random pivot avoids the O(n^2) worst case
    less = [x for x in xs if x < pivot]
    equal = [x for x in xs if x == pivot]        # 3-way partition handles duplicates
    greater = [x for x in xs if x > pivot]
    return quicksort(less) + equal + quicksort(greater)

def quicksort_inplace(a, lo=0, hi=None):         # Lomuto partition, O(log n) average stack
    if hi is None:
        hi = len(a) - 1
    if lo >= hi:
        return a
    p = random.randint(lo, hi)
    a[p], a[hi] = a[hi], a[p]
    pivot, store = a[hi], lo
    for i in range(lo, hi):
        if a[i] < pivot:
            a[i], a[store] = a[store], a[i]
            store += 1
    a[store], a[hi] = a[hi], a[store]
    quicksort_inplace(a, lo, store - 1)
    quicksort_inplace(a, store + 1, hi)
    return a

print(quicksort([3, 6, 1, 8, 1, 9, 2]), quicksort_inplace([3, 6, 1, 8, 1, 9, 2]))
```

## 6. Non-comparison sorts: counting and radix

Comparison sorts can't beat O(n log n) in the worst case (a decision-tree lower bound). If the keys are **small integers**, you can do better:

```python
def counting_sort(xs, max_val):
    counts = [0] * (max_val + 1)
    for x in xs:
        counts[x] += 1
    return [v for v, c in enumerate(counts) for _ in range(c)]

def radix_sort(xs):                     # non-negative ints, LSD radix, base 10
    exp = 1
    while xs and max(xs) // exp:
        buckets = [[] for _ in range(10)]
        for x in xs:
            buckets[(x // exp) % 10].append(x)   # stable per digit
        xs = [x for b in buckets for x in b]
        exp *= 10
    return xs

print(counting_sort([3, 0, 2, 3, 1, 0], 3), radix_sort([170, 45, 75, 90, 802, 24, 2, 66]))
```

## 7. Comparison table

| Algorithm | Best | Average | Worst | Space | Stable | Notes |
|---|---|---|---|---|---|---|
| Bubble | n | n² | n² | 1 | ✓ | teaching only |
| Selection | n² | n² | n² | 1 | ✗ | the fewest swaps |
| Insertion | **n** | n² | n² | 1 | ✓ | great for small or nearly-sorted data |
| Merge | n log n | n log n | n log n | n | ✓ | linked lists, external sorting |
| Quick | n log n | n log n | n² | log n | ✗ | fast in practice (random pivot) |
| Heap | n log n | n log n | n log n | 1 | ✗ | guaranteed, in place |
| Counting | n + k | n + k | n + k | k | ✓ | small integer range k |
| Radix | d(n + b) | d(n + b) | d(n + b) | n + b | ✓ | fixed-width keys |
| **Timsort** (Python) | **n** | n log n | n log n | n | ✓ | merge + insertion, exploits runs |

## 8. Python's `sorted` in practice

```python
from operator import itemgetter, attrgetter
rows = [{"name": "bo", "age": 30}, {"name": "al", "age": 25}, {"name": "cy", "age": 30}]
print(sorted(rows, key=itemgetter("age", "name")))
print(sorted(["b10", "a2", "a10", "b1"]), sorted(["b10", "a2", "a10", "b1"], key=lambda s: (s[0], int(s[1:]))))
import functools
def cmp(a, b):                         # old-style comparator, if you must
    return (a > b) - (a < b)
print(sorted([3, 1, 2], key=functools.cmp_to_key(cmp)))
```

## Tricks & tips

- Need the k smallest? Use `heapq.nsmallest`. The median, or a kth element in O(n)? Use **quickselect** (Hard problem below).
- Sort once, then binary-search many times.
- "Natural sort" (`a2` before `a10`): split digits out in the key function.
- Searching in a rotated sorted array: decide which half is sorted at each step.
- `sorted(set(xs))` deduplicates and sorts.
- Use `list.sort()` when you don't need the original order (it saves memory).

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Binary search on unsorted data | sort first (or a set) |
| 2 | `lo = mid` → infinite loop | `lo = mid + 1` with `[lo, hi)` |
| 3 | Mixing closed and half-open intervals | pick one template |
| 4 | A quicksort pivot that's always the first element on sorted data → O(n²) | random pivot |
| 5 | Assuming quicksort or heapsort is stable | they're not; use `sorted` |
| 6 | `insort` in a loop thinking it's O(log n) | the insert is O(n) |
| 7 | `xs.sort()` returns None | `sorted(xs)` |
| 8 | Sorting strings of numbers lexicographically | `key=int` |
| 9 | Recursion depth in naive quicksort | randomise, or recurse on the smaller side |
| 10 | Re-sorting inside loops | sort once / heap / bisect |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
import bisect
xs = [1, 3, 3, 3, 7]
print(bisect.bisect_left(xs, 3), bisect.bisect_right(xs, 3), bisect.bisect_left(xs, 4), bisect.bisect_left(xs, 99))
```
What prints?
- [x] `1 4 4 5`
- [ ] `1 3 3 4`
- [ ] `0 4 4 IndexError`
`bisect_left` returns the first index where the value could be inserted (the first 3 is at 1), and `bisect_right` returns the index just after the last equal element (4). For a missing value, both give the insertion point, which can be `len(xs)`.
:::

:::quiz
```python norun
data = [("b", 2), ("a", 1), ("c", 2), ("d", 1)]
print(sorted(data, key=lambda t: t[1]))
```
What prints?
- [x] `[('a', 1), ('d', 1), ('b', 2), ('c', 2)]`
- [ ] `[('a', 1), ('d', 1), ('c', 2), ('b', 2)]`
- [ ] `[('d', 1), ('a', 1), ('b', 2), ('c', 2)]`
Python's sort is **stable**: elements with equal keys keep their original relative order (`a` before `d`, `b` before `c`). That's what makes multi-pass sorting work.
:::

:::quiz
Which sort is stable **and** guarantees O(n log n) in the worst case?
- [ ] Quicksort
- [ ] Heapsort
- [x] Merge sort
Quicksort can degrade to O(n²) and isn't stable. Heapsort is O(n log n) but not stable. Merge sort is both, which is why Python's Timsort is built on merging runs.
:::

## Practice problems

:::problem basic | Search insert position | lower bound
Return the index of `target` in a sorted array, or where it would be inserted (LeetCode 35).
:::solution
```python
def search_insert(nums, target):
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo

print([search_insert([1, 3, 5, 6], t) for t in [5, 2, 7, 0]])
```
:::explain
This is exactly `lower_bound`, the first index whose value is ≥ target, which is also the insertion point. Equivalent to `bisect.bisect_left`.
:::end

:::problem basic | First and last position | two binary searches
Find the first and last index of `target` in a sorted array, or `[-1, -1]` (LeetCode 34), in O(log n).
:::solution
```python
import bisect

def search_range(nums, target):
    lo = bisect.bisect_left(nums, target)
    if lo == len(nums) or nums[lo] != target:
        return [-1, -1]
    return [lo, bisect.bisect_right(nums, target) - 1]

print(search_range([5, 7, 7, 8, 8, 10], 8), search_range([5, 7, 7, 8, 8, 10], 6), search_range([], 0))
```
:::explain
`bisect_left` finds the first index ≥ target and `bisect_right` finds the first index > target, so the last occurrence is one before that. Two O(log n) searches. A linear scan from the first match would be O(n) when there are many duplicates.
:::end

:::problem basic | Sort colours (Dutch national flag) | 3-way partition
Sort an array of 0s, 1s and 2s in place in one pass (LeetCode 75).
:::solution
```python
def sort_colors(a):
    lo, mid, hi = 0, 0, len(a) - 1
    while mid <= hi:
        if a[mid] == 0:
            a[lo], a[mid] = a[mid], a[lo]; lo += 1; mid += 1
        elif a[mid] == 1:
            mid += 1
        else:
            a[mid], a[hi] = a[hi], a[mid]; hi -= 1      # don't advance mid: the swapped-in value is unchecked
    return a

print(sort_colors([2, 0, 2, 1, 1, 0]), sort_colors([2, 0, 1]))
```
:::explain
The invariant: `a[:lo]` holds 0s, `a[lo:mid]` 1s, `a[mid:hi+1]` is unknown, and `a[hi+1:]` holds 2s. Each step shrinks the unknown region by one. This is the 3-way partition at the heart of quicksort with many duplicates.
:::end

:::problem medium | Search in a rotated sorted array | modified binary search
A sorted array of distinct values was rotated (`[4,5,6,7,0,1,2]`). Find `target`'s index in O(log n) (LeetCode 33).
:::solution
```python
def search_rotated(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:                    # the left half is sorted
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:                                        # the right half is sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1

nums = [4, 5, 6, 7, 0, 1, 2]
print([search_rotated(nums, t) for t in [0, 3, 4, 2, 7]])
```
:::explain
At every step, at least one half is properly sorted, and we can tell which by comparing the endpoints. If the target lies within that sorted half's range, search there, otherwise search the other half. It's still O(log n) because we discard half each time.
:::end

:::problem medium | Kth smallest with quickselect | partitioning, O(n) average
Find the kth smallest element in O(n) average time with randomised quickselect. Verify against `sorted`.
:::solution
```python
import random

def quickselect(xs, k):                 # k is 0-indexed
    a = list(xs)
    lo, hi = 0, len(a) - 1
    while True:
        p = random.randint(lo, hi)
        a[p], a[hi] = a[hi], a[p]
        store = lo
        for i in range(lo, hi):
            if a[i] < a[hi]:
                a[i], a[store] = a[store], a[i]
                store += 1
        a[store], a[hi] = a[hi], a[store]      # the pivot is now in its final sorted position
        if store == k:
            return a[store]
        if store < k:
            lo = store + 1
        else:
            hi = store - 1

for _ in range(300):
    data = [random.randint(0, 50) for _ in range(random.randint(1, 40))]
    k = random.randrange(len(data))
    assert quickselect(data, k) == sorted(data)[k]
print(quickselect([7, 10, 4, 3, 20, 15], 2), "verified on 300 random cases")
```
:::explain
After partitioning, the pivot sits at its **final sorted index**. If that's k, we're done. Otherwise recurse (here: loop) into **only one side**. The expected work is n + n/2 + n/4 + … = O(n). The worst case is O(n²), but a random pivot makes that astronomically unlikely. NumPy's `np.partition` uses introselect, a guarded variant.
:::end

:::problem medium | Count inversions with merge sort | divide and conquer
Count the pairs `i < j` with `a[i] > a[j]` in O(n log n). (The inversion count measures how unsorted a list is, and it's used for ranking similarity like Kendall tau.)
:::solution
```python
import random

def count_inversions(a):
    if len(a) <= 1:
        return a, 0
    mid = len(a) // 2
    left, inv_l = count_inversions(a[:mid])
    right, inv_r = count_inversions(a[mid:])
    merged, i, j, inv = [], 0, 0, inv_l + inv_r
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i]); i += 1
        else:
            merged.append(right[j]); j += 1
            inv += len(left) - i          # right[j] is smaller than ALL remaining left items
    merged += left[i:] + right[j:]
    return merged, inv

def brute(a):
    return sum(a[i] > a[j] for i in range(len(a)) for j in range(i + 1, len(a)))

for _ in range(200):
    a = [random.randint(0, 20) for _ in range(random.randint(0, 30))]
    assert count_inversions(a)[1] == brute(a)
print(count_inversions([2, 4, 1, 3, 5])[1], count_inversions([5, 4, 3, 2, 1])[1])
```
:::explain
During a merge, when an element from the **right** half is taken before the remaining elements of the left half, it's smaller than all of them. That's `len(left) - i` inversions counted in O(1). Sorting halves doesn't change cross-half inversion counts, so the total is the left count, plus the right count, plus the cross count. O(n log n) versus the O(n²) brute force used as the oracle.
:::end

:::problem hard | Median of two sorted arrays | binary search on partition
Find the median of two sorted arrays in O(log(min(m, n))) (LeetCode 4).
:::solution
```python
import random, statistics

def find_median(a, b):
    if len(a) > len(b):
        a, b = b, a                               # binary-search the shorter array
    m, n = len(a), len(b)
    half = (m + n + 1) // 2
    lo, hi = 0, m
    while lo <= hi:
        i = (lo + hi) // 2                        # take i from a
        j = half - i                              # and j from b
        a_left = a[i - 1] if i > 0 else float("-inf")
        a_right = a[i] if i < m else float("inf")
        b_left = b[j - 1] if j > 0 else float("-inf")
        b_right = b[j] if j < n else float("inf")
        if a_left <= b_right and b_left <= a_right:          # a valid partition
            if (m + n) % 2:
                return max(a_left, b_left)
            return (max(a_left, b_left) + min(a_right, b_right)) / 2
        if a_left > b_right:
            hi = i - 1
        else:
            lo = i + 1

for _ in range(500):
    a = sorted(random.randint(0, 100) for _ in range(random.randint(0, 15)))
    b = sorted(random.randint(0, 100) for _ in range(random.randint(1, 15)))
    assert find_median(a, b) == statistics.median(a + b)
print(find_median([1, 3], [2]), find_median([1, 2], [3, 4]))
```
:::explain
Split both arrays so that the left parts together hold half of all elements and every left element ≤ every right element. Then the median comes from the four boundary values. Choosing how many to take from `a` (`i`) determines `j`, and the validity condition is **monotonic in i**, so we can binary-search it. Infinities handle empty sides. The randomised check against `statistics.median` covers the edge cases.
:::end

:::problem hard | Split array largest sum | binary search on the answer
Split `nums` into `k` non-empty contiguous parts, minimising the largest part's sum (LeetCode 410).
:::solution
```python
def split_array(nums, k):
    def parts_needed(cap):                       # greedy: how many parts if no part may exceed cap?
        parts, cur = 1, 0
        for x in nums:
            if cur + x > cap:
                parts, cur = parts + 1, x
            else:
                cur += x
        return parts

    lo, hi = max(nums), sum(nums)                # the answer lies in [max, sum]
    while lo < hi:
        mid = (lo + hi) // 2
        if parts_needed(mid) <= k:
            hi = mid                             # feasible: try smaller
        else:
            lo = mid + 1
    return lo

print(split_array([7, 2, 5, 10, 8], 2), split_array([1, 2, 3, 4, 5], 2), split_array([1, 4, 4], 3))
```
:::explain
"Is a maximum part-sum of `cap` achievable with ≤ k parts?" is **monotonic**: if `cap` works, any larger cap works too. A greedy check (fill each part until it would overflow) answers it in O(n), and binary search over `cap` gives O(n log(sum)). This "binary search the answer + greedy feasibility check" template solves ship-capacity, painters-partition and many scheduling problems.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Binary search | LeetCode 704 | https://leetcode.com/problems/binary-search/
Return the index of `target` in a sorted list, or −1 if it isn't there. Write the loop yourself: no `bisect`, no `.index`.
:::starter
```python norun
def search(nums, target):
    pass
```
:::tests
```python norun
assert search([-1, 0, 3, 5, 9, 12], 9) == 4
assert search([-1, 0, 3, 5, 9, 12], 2) == -1
assert search([5], 5) == 0 and search([5], 4) == -1 and search([], 1) == -1
xs = list(range(0, 2_000_000, 2))
assert search(xs, 1_999_998) == 999_999 and search(xs, 7) == -1
```
:::solution
```python
def search(nums, target):
    lo, hi = 0, len(nums) - 1              # closed interval [lo, hi]
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

print(search([-1, 0, 3, 5, 9, 12], 9), search([-1, 0, 3, 5, 9, 12], 2))
```
:::explain
Each comparison halves the remaining interval, so a million elements need at most about 20 steps. The **closed-interval** template (`lo <= hi`, `mid ± 1`) always shrinks the range, so it can't loop forever. Python ints never overflow, so `(lo + hi) // 2` is safe (in C/Java you'd write `lo + (hi - lo) / 2`).
:::trace
`[-1, 0, 3, 5, 9, 12]`, target 9:
| lo | hi | mid | nums[mid] | action |
|---|---|---|---|---|
| 0 | 5 | 2 | 3 | lo = 3 |
| 3 | 5 | 4 | 9 | **found → 4** |
:::complexity
O(log n).
:::end

:::program basic | Sqrt(x) | LeetCode 69 | https://leetcode.com/problems/sqrtx/
Return ⌊√x⌋ for a non-negative int **without** `**`, `math.sqrt` or `isqrt`. Use binary search on the answer.
:::starter
```python norun
def my_sqrt(x):
    pass
```
:::tests
```python norun
assert my_sqrt(4) == 2 and my_sqrt(8) == 2 and my_sqrt(0) == 0 and my_sqrt(1) == 1
assert my_sqrt(2147395599) == 46339
import math
assert all(my_sqrt(n) == math.isqrt(n) for n in range(2000))
assert my_sqrt(10**30) == 10**15
```
:::solution
```python
def my_sqrt(x):
    lo, hi = 0, x + 1                   # find the first m with m*m > x, in [lo, hi)
    while lo < hi:
        mid = (lo + hi) // 2
        if mid * mid > x:
            hi = mid
        else:
            lo = mid + 1
    return lo - 1

print(my_sqrt(8), my_sqrt(10**30))
```
:::explain
"Is m² > x?" is False, False, …, True, True as m grows: a **monotonic predicate**, so binary search finds the first True. The answer is the number just before it. This "binary search on the answer" template works whenever feasibility is monotonic. Python's big ints handle `10**30` exactly, where a float-based `int(x ** 0.5)` could be off by one.
:::complexity
O(log x).
:::end

:::program medium | Find peak element | LeetCode 162 | https://leetcode.com/problems/find-peak-element/
A peak is strictly greater than its neighbours (`nums[-1]` and `nums[n]` count as −∞). Return the index of **any** peak in O(log n). Adjacent elements are never equal.
:::starter
```python norun
def find_peak_element(nums):
    pass
```
:::tests
```python norun
def is_peak(nums, i):
    left = nums[i - 1] if i > 0 else float("-inf")
    right = nums[i + 1] if i < len(nums) - 1 else float("-inf")
    return nums[i] > left and nums[i] > right
for case in ([1, 2, 3, 1], [1, 2, 1, 3, 5, 6, 4], [1], [3, 2, 1], [1, 2, 3]):
    assert is_peak(case, find_peak_element(case)), case
```
:::hint
Compare `nums[mid]` with `nums[mid + 1]`. If the right neighbour is bigger, a peak must exist on the right (the values rise, and the far end is −∞). Otherwise there's one at `mid` or to its left.
:::solution
```python
def find_peak_element(nums):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < nums[mid + 1]:
            lo = mid + 1                # uphill to the right: a peak lies right
        else:
            hi = mid                    # downhill: mid itself may be the peak
    return lo

print(find_peak_element([1, 2, 1, 3, 5, 6, 4]))
```
:::explain
Binary search doesn't need sorted data, only a rule that **discards half the space safely**. If we're going uphill to the right, following it must reach a peak, because the sequence eventually has to come down to −∞. The tests accept any peak, which is why they check the property rather than a specific index.
:::complexity
O(log n).
:::end

:::program hard | Find minimum in rotated sorted array II | LeetCode 154 | https://leetcode.com/problems/find-minimum-in-rotated-sorted-array-ii/
A sorted array (which **may contain duplicates**) was rotated. Return its minimum. With duplicates, the worst case can't beat O(n), but it should be O(log n) when the values are distinct.
:::starter
```python norun
def find_min(nums):
    pass
```
:::tests
```python norun
assert find_min([1, 3, 5]) == 1
assert find_min([2, 2, 2, 0, 1]) == 0
assert find_min([3, 3, 1, 3]) == 1
assert find_min([1, 1, 1, 1]) == 1
assert find_min([10, 1, 10, 10, 10]) == 1
import random
for _ in range(500):
    xs = sorted(random.randint(0, 5) for _ in range(random.randint(1, 15)))
    k = random.randrange(len(xs))
    assert find_min(xs[k:] + xs[:k]) == min(xs)
```
:::hint
Compare `nums[mid]` with `nums[hi]`. If it's smaller, the minimum is at mid or to its left. If it's larger, the minimum is to the right. If they're **equal**, you can't tell which side, but `hi` can safely be discarded (`hi -= 1`) because `mid` holds the same value.
:::solution
```python
def find_min(nums):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < nums[hi]:
            hi = mid
        elif nums[mid] > nums[hi]:
            lo = mid + 1
        else:
            hi -= 1                  # a duplicate: shrink by one, safely
    return nums[lo]

print(find_min([2, 2, 2, 0, 1]), find_min([10, 1, 10, 10, 10]))
```
:::explain
Without duplicates, comparing with the right end always tells us which half is sorted, which gives O(log n). Duplicates create ambiguity (`[10, 1, 10, 10, 10]`: is the dip left or right of mid?). The safe move is dropping just `hi`: since `nums[mid] == nums[hi]`, we never lose the minimum's value. The 500-case random rotation test checks exactly this kind of edge case.
:::complexity
O(log n) average, O(n) worst case (all equal values).
:::end
