# Lists

The `list` is Python's workhorse: an **ordered, mutable** sequence that can hold anything. Under the hood it's a **dynamic array of references**: a contiguous block of pointers that grows automatically. Knowing that one fact explains every performance rule in this chapter.

:::analogy A row of numbered lockers holding keys
A list is a row of numbered lockers (indices 0, 1, 2…). Each locker doesn't hold the object itself, only a **key (reference)** to where the object lives. Adding a locker at the **end** is quick. Inserting one at the **front** means renumbering every locker after it. When the row is full, Python builds a bigger row and moves all the keys across, over-allocating so this rarely happens.
:::

## 1. Memory model and creation

```python
import sys
a = []
sizes = []
for i in range(20):
    sizes.append(sys.getsizeof(a))
    a.append(i)
print(sizes)          # grows in jumps: over-allocation -> amortised O(1) append
```

Every way to build a list:

```python
empty = []
literal = [1, "two", 3.0, [4]]          # mixed types are fine
from_iter = list("abc")                 # ['a', 'b', 'c']
from_range = list(range(0, 10, 3))
repeated = [0] * 5
comp = [x * x for x in range(5)]
mapped = list(map(int, "1 2 3".split()))
split = "a,b,c".split(",")
copy_ = literal[:]                      # shallow copy
unpacked = [*range(3), *"xy"]
print(empty, literal, from_iter, from_range, repeated, comp, mapped, split, copy_, unpacked, sep="\n")
```

:::term Dynamic array & amortised O(1)
A **dynamic array** keeps spare capacity. Most `append`s just fill a free slot (O(1)). Occasionally it's full, and Python allocates a bigger block (about 1.125× plus a constant in CPython) and copies everything (O(n)). Averaged over many appends, the cost per append is still **O(1)**. That's what **amortised** means.
:::

## 2. Indexing: positive and negative

```python
xs = ["a", "b", "c", "d", "e"]
#      0    1    2    3    4
#     -5   -4   -3   -2   -1
print(xs[0], xs[-1], xs[-2], xs[len(xs) - 1])
xs[1] = "B"                       # lists are mutable
print(xs)
```

```python error
xs = ["a", "b", "c"]
print(xs[3])          # IndexError: valid indices are -3..2
```

## 3. Slicing: `xs[start:stop:step]`

- `start` is **inclusive**, `stop` is **exclusive**, and `step` defaults to 1.
- Omitted bounds mean "from the beginning/end" (they depend on the sign of `step`).
- Slices **never raise IndexError**: out-of-range bounds are clamped.
- A slice always creates a **new list** (a shallow copy).

```python
xs = list(range(10))          # [0..9]
print(xs[2:5], xs[:3], xs[7:], xs[-3:], xs[:-3])
print(xs[::2], xs[1::2], xs[::-1], xs[8:2:-2])
print(xs[100:200], xs[-100:2])          # clamped, no error
```

### 15 slice recipes

| Goal | Slice |
|---|---|
| first n | `xs[:n]` |
| last n | `xs[-n:]` |
| drop first n | `xs[n:]` |
| drop last n | `xs[:-n]` (careful: `xs[:-0]` is `[]`!) |
| reverse | `xs[::-1]` |
| every k-th | `xs[::k]` |
| evens / odds by position | `xs[::2]`, `xs[1::2]` |
| shallow copy | `xs[:]` |
| middle element(s) | `xs[(len(xs)-1)//2 : len(xs)//2 + 1]` |
| rotate left by k | `xs[k:] + xs[:k]` |
| rotate right by k | `xs[-k:] + xs[:-k]` |
| chunks of size n | `[xs[i:i+n] for i in range(0, len(xs), n)]` |
| pairs of neighbours | `zip(xs, xs[1:])` |
| sliding windows of size k | `[xs[i:i+k] for i in range(len(xs)-k+1)]` |
| is palindrome | `xs == xs[::-1]` |

### Slice assignment: in-place surgery

```python
xs = [0, 1, 2, 3, 4, 5]
xs[1:3] = ["a", "b", "c"]      # replace 2 items with 3 (the length can change)
print(xs)
xs[::2] = [9, 9, 9, 9]         # extended slice: lengths must match
print(xs)
xs[2:2] = ["INSERTED"]         # insert without replacing
print(xs)
xs[:] = []                     # clear in place (other references see it)
print(xs)
del_me = list(range(10)); del del_me[::3]
print(del_me)
```

## 4. All 11 list methods

| Method | Does | Returns | Cost |
|---|---|---|---|
| `append(x)` | add to the end | `None` | O(1)* |
| `extend(it)` | add all items | `None` | O(k) |
| `insert(i, x)` | insert before index i | `None` | O(n) |
| `remove(x)` | delete the **first** occurrence (ValueError if missing) | `None` | O(n) |
| `pop(i=-1)` | remove and return the item at i | the item | O(1) at the end, O(n) elsewhere |
| `clear()` | remove all | `None` | O(n) |
| `index(x[, s, e])` | first index of x (ValueError if missing) | int | O(n) |
| `count(x)` | occurrences | int | O(n) |
| `sort(key=, reverse=)` | sort in place (stable) | `None` | O(n log n) |
| `reverse()` | reverse in place | `None` | O(n) |
| `copy()` | shallow copy | new list | O(n) |

```python
xs = [3, 1, 4]
xs.append(1); xs.extend([5, 9]); xs.insert(0, 2)
print(xs, xs.count(1), xs.index(4))
print(xs.pop(), xs.pop(0), xs)
xs.remove(1)            # removes only the FIRST 1
xs.sort(); print(xs)
xs.reverse(); print(xs)
```

:::trap Methods that return `None`
`append`, `extend`, `insert`, `remove`, `sort`, `reverse` and `clear` mutate **in place** and return `None`. `xs = xs.sort()` sets `xs` to `None`! Use `sorted(xs)` / `reversed(xs)` for new results. Also, `xs.append([4, 5])` adds **one** element (a list), while `extend` adds two.
:::

## 5. Iteration patterns

```python
names = ["ada", "bob", "cy"]
ages = [36, 41, 29]
for n in names: pass                                  # 1. values
for i, n in enumerate(names): pass                    # 2. index + value
for n, a in zip(names, ages): pass                    # 3. parallel
for n in reversed(names): pass                        # 4. backwards (no copy)
for n in sorted(names, key=len): pass                 # 5. sorted view
for i in range(0, len(names), 2): pass                # 6. stepping
for a, b in zip(names, names[1:]): print(a, "->", b)  # 7. neighbours
```

Removing while iterating, done safely:

```python
nums = [1, 2, 3, 4, 5, 6]
nums = [x for x in nums if x % 2]          # rebuild (new list)
print(nums)
nums2 = [1, 2, 3, 4, 5, 6]
for i in range(len(nums2) - 1, -1, -1):    # iterate BACKWARDS when deleting by index
    if nums2[i] % 2 == 0:
        del nums2[i]
print(nums2)
```

## 6. Sorting in depth

```python
words = ["banana", "Apple", "cherry", "date", "Elder"]
print(sorted(words))                               # code-point order: uppercase first
print(sorted(words, key=str.lower))
print(sorted(words, key=len))                      # stable: ties keep input order
print(sorted(words, key=lambda w: (-len(w), w.lower())))
records = [("ada", 90), ("bob", 85), ("cy", 90)]
records.sort(key=lambda r: r[1], reverse=True)     # stable even with reverse=True
print(records)
```

- `sort()` and `sorted()` use **Timsort**: stable, O(n log n) worst case, and O(n) on already-sorted data.
- **Schwartzian transform** (decorate-sort-undecorate) is what `key=` does internally: each key is computed **once per element**.

## 7. Copying: shallow vs deep

```python
import copy
a = [[1, 2], [3, 4]]
shallow = a.copy()          # also a[:], list(a), copy.copy(a)
deep = copy.deepcopy(a)
a[0].append(99)             # mutate an INNER list
a.append([5])               # mutate the OUTER list
print(shallow)              # [[1, 2, 99], [3, 4]]  <- shares inner lists
print(deep)                 # [[1, 2], [3, 4]]      <- fully independent
```

Visualise it: `shallow` gets its own outer box, but its arrows point at the same inner lists.

## 8. Lists as stacks and queues

```python
stack = []
stack.append(1); stack.append(2); stack.append(3)
print(stack.pop(), stack)              # LIFO: pop from the end is O(1)

from collections import deque
queue = deque([1, 2, 3])
queue.append(4)
print(queue.popleft(), queue)          # FIFO: O(1) at both ends
```

:::trap `list.pop(0)` is O(n)
Removing from the front shifts every element left. A queue built on `list.pop(0)` makes BFS O(n²). Use `collections.deque`.
:::

## 9. Performance & Big-O

| Operation | Cost | Note |
|---|---|---|
| `xs[i]`, `xs[i] = v`, `len(xs)` | O(1) | direct pointer arithmetic |
| `append`, `pop()` | O(1) amortised | end of the array |
| `insert(0, x)`, `pop(0)`, `del xs[0]` | O(n) | shifts elements |
| `x in xs`, `index`, `count`, `remove` | O(n) | linear scan |
| `xs[a:b]` | O(b − a) | copies the slice |
| `xs + ys` | O(n + m) | new list |
| `xs.extend(ys)` | O(m) | |
| `sort` | O(n log n) | |
| `min`, `max`, `sum` | O(n) | |

**When NOT to use a list**: frequent membership tests (use a `set`), queues (use a `deque`), key → value lookups (use a `dict`), large numeric arrays (use a NumPy array), and immutable records (use a `tuple`/dataclass).

## 10. ML bridge

```python
import numpy as np
features = [[1.0, 2.0], [3.0, 4.0], [5.0, 6.0]]
X = np.array(features)                     # list of lists -> 2-D array
print(X.shape, X.mean(axis=0))
batches = [features[i:i + 2] for i in range(0, len(features), 2)]   # mini-batches
print(batches)
losses = []
for epoch in range(3):
    losses.append(round(1 / (epoch + 1), 3))   # typical training-loop logging
print(losses, X.tolist() == features)
```

## Pro tricks compendium

```python
from collections import Counter
from itertools import chain
lst = [3, 1, 4, 1, 5, 9, 2, 6]
print(list(chain.from_iterable([[1, 2], [3], [4, 5]])))   # flatten one level
print(Counter(lst).most_common(1)[0][0])                  # most frequent
from itertools import accumulate
print(list(accumulate(lst, max)))                          # running max in O(n)
print(len(set([7, 7, 7])) == 1)                            # all equal
seen = set()
print([x for x in lst if not (x in seen or seen.add(x))])  # dedupe, keep order
print(list(dict.fromkeys(lst)))                            # same, clearer
print(all(a <= b for a, b in zip(lst, lst[1:])))           # is sorted?
print([x for pair in zip([1, 3, 5], [2, 4, 6]) for x in pair])   # interleave
print(lst.index(min(lst)), max(range(len(lst)), key=lst.__getitem__))   # argmin, argmax
print(list(filter(None, [0, 1, None, 2, "", 3, False])))   # drop falsy
print([x for x in [1, 2] for _ in range(3)])               # repeat each
```

## The 10 most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Mutable default `def f(lst=[])` | `lst=None` |
| 2 | `[[]] * 3` shares the inner list | `[[] for _ in range(3)]` |
| 3 | Modifying while iterating | rebuild, iterate a copy, or go backwards |
| 4 | `xs = xs.sort()` → `None` | `xs.sort()` or `xs = sorted(xs)` |
| 5 | Shallow copy of nested lists | `copy.deepcopy` |
| 6 | Off-by-one indices (`xs[len(xs)]`) | the last index is `len - 1` (or `-1`) |
| 7 | `x in big_list` inside loops | convert to a set |
| 8 | `a += [3]` mutates the shared object, `a = a + [3]` doesn't | know which you need |
| 9 | Loop variable leaks after the loop | don't rely on it |
| 10 | `list("hello")` splits characters | `["hello"]` for one element |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
a = [1, 2, 3]
b = a
a += [4]
c = a
a = a + [5]
print(b, c, a)
```
What prints?
- [ ] `[1, 2, 3] [1, 2, 3, 4] [1, 2, 3, 4, 5]`
- [x] `[1, 2, 3, 4] [1, 2, 3, 4] [1, 2, 3, 4, 5]`
- [ ] `[1, 2, 3, 4, 5] [1, 2, 3, 4, 5] [1, 2, 3, 4, 5]`
`+=` on a list **mutates in place** (`b` sees the 4). `a = a + [5]` builds a **new** list and rebinds only `a`, so `b` and `c` still point at the old one.
:::

:::quiz
```python norun
xs = [0, 1, 2, 3, 4, 5]
print(xs[1:-1:2], xs[::-2], xs[10:], xs[-100:2])
```
What prints?
- [x] `[1, 3] [5, 3, 1] [] [0, 1]`
- [ ] `[1, 3, 5] [5, 3, 1] [] [0, 1]`
- [ ] `IndexError`
`stop` is exclusive (`-1` means stop before the last item). A negative step walks backwards from the end. Out-of-range slice bounds are **clamped**, never errors.
:::

:::quiz
```python norun
nums = [1, 2, 2, 3]
for x in nums:
    if x == 2:
        nums.remove(x)
print(nums)
```
What prints?
- [ ] `[1, 3]`
- [x] `[1, 2, 3]`
- [ ] `RuntimeError`
After removing the first 2, everything shifts left, and the iterator's next index skips the second 2. Never mutate a list while iterating over it: rebuild it with a comprehension, or loop over a copy.
:::

:::tip 🏋️ More practice
16 extra list problems with your inputs and expected outputs: **[Practice · Lists](#/t/practice-lists)**. Each one has a test judge and a step-by-step solution.
:::

## Practice problems

:::problem basic | Second largest distinct | single pass, edge cases
Return the second-largest **distinct** value in a list, or `None` if it doesn't exist. One pass, no sorting.
:::solution
```python
def second_largest(nums):
    first = second = None
    for x in nums:
        if first is None or x > first:
            first, second = x, first
        elif x != first and (second is None or x > second):
            second = x
    return second

for case in [[3, 1, 4, 4, 2], [5, 5, 5], [7], [], [-1, -5, -3]]:
    print(case, "->", second_largest(case))
```
:::explain
Keep the top two distinct values. A new maximum pushes the old one down to `second`. A value equal to `first` is skipped, which is what makes the result *distinct*. Using `None` instead of `-inf` keeps the "doesn't exist" case explicit. O(n) time, O(1) space.
:::trace
`[3, 1, 4, 4, 2]`:
| x | first | second |
|---|---|---|
| 3 | 3 | None |
| 1 | 3 | 1 |
| 4 | 4 | 3 |
| 4 | 4 (skip, equal) | 3 |
| 2 | 4 | 3 → answer **3** |
:::end

:::problem basic | Rotate an array by k | slicing, modulo, in-place reversal
Rotate a list to the right by `k` steps (LeetCode 189): `[1,2,3,4,5,6,7], k=3` → `[5,6,7,1,2,3,4]`. Do it once with slicing and once **in place** with O(1) extra space.
:::solution
```python
def rotate_slice(nums, k):
    k %= len(nums)
    nums[:] = nums[-k:] + nums[:-k] if k else nums
    return nums

def rotate_inplace(nums, k):
    n = len(nums)
    k %= n
    def rev(i, j):
        while i < j:
            nums[i], nums[j] = nums[j], nums[i]
            i, j = i + 1, j - 1
    rev(0, n - 1)        # reverse everything
    rev(0, k - 1)        # reverse the first k
    rev(k, n - 1)        # reverse the rest
    return nums

print(rotate_slice([1, 2, 3, 4, 5, 6, 7], 3), rotate_inplace([1, 2, 3, 4, 5, 6, 7], 10))
```
:::explain
`k %= n` handles k larger than the length. Note the `if k` guard: `nums[-0:]` is the whole list, so `k = 0` would double it. The triple-reversal trick: reversing the whole list puts the last k items first (but backwards), and reversing each part fixes their internal order. O(n) time, O(1) space.
:::trace
`[1..7], k=3`:
| Step | List |
|---|---|
| reverse all | 7 6 5 4 3 2 1 |
| reverse first 3 | **5 6 7** 4 3 2 1 |
| reverse rest | 5 6 7 **1 2 3 4** |
:::end

:::problem basic | Move zeros to the end | two pointers, stable
Move all `0`s to the end **in place** while keeping the relative order of non-zero elements (LeetCode 283).
:::solution
```python
def move_zeros(nums):
    write = 0
    for read in range(len(nums)):
        if nums[read] != 0:
            nums[write], nums[read] = nums[read], nums[write]
            write += 1
    return nums

print(move_zeros([0, 1, 0, 3, 12]), move_zeros([0, 0, 1]), move_zeros([1, 2]))
```
:::explain
`write` marks where the next non-zero belongs. Swapping (instead of overwriting) leaves the zeros behind automatically. Each element is visited once, O(n). Step through it in the visualiser and watch the two indices chase each other.
:::end

:::problem basic | Merge two sorted lists | two pointers
Merge two sorted lists into one sorted list in O(n + m) without calling `sorted`.
:::solution
```python
def merge(a, b):
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:          # <= keeps it stable (a's items first on ties)
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    out.extend(a[i:]); out.extend(b[j:])
    return out

print(merge([1, 4, 7, 9], [2, 3, 8, 10, 11]), merge([], [1]), merge([1, 1], [1]))
```
:::explain
At each step the smallest remaining item is at the front of one of the two lists. When one list runs out, the rest of the other is already sorted, so a single `extend` finishes the job. This merge is the heart of merge sort and of `heapq.merge`.
:::end

:::problem medium | Product of array except self | prefix/suffix products
Return `out` where `out[i]` is the product of every element except `nums[i]`, **without division**, in O(n) (LeetCode 238).
:::solution
```python
def product_except_self(nums):
    n = len(nums)
    out = [1] * n
    prefix = 1
    for i in range(n):                 # out[i] = product of everything LEFT of i
        out[i] = prefix
        prefix *= nums[i]
    suffix = 1
    for i in range(n - 1, -1, -1):     # multiply in everything RIGHT of i
        out[i] *= suffix
        suffix *= nums[i]
    return out

print(product_except_self([1, 2, 3, 4]), product_except_self([-1, 1, 0, -3, 3]))
```
:::explain
Each answer is (product of the left part) × (product of the right part). The first pass stores the left products, and the second pass sweeps from the right with a running suffix. No division means zeros are handled correctly. O(n) time, O(1) extra space (besides the output).
:::trace
`[1, 2, 3, 4]`:
| i | after left pass | after right pass |
|---|---|---|
| 0 | 1 | 1·24 = **24** |
| 1 | 1 | 1·12 = **12** |
| 2 | 2 | 2·4 = **8** |
| 3 | 6 | 6·1 = **6** |
:::end

:::problem medium | Maximum subarray (Kadane) | dynamic running state
Find the largest sum of a contiguous subarray and return it along with the start and end indices (LeetCode 53).
:::solution
```python
def max_subarray(nums):
    best = cur = nums[0]
    start = best_l = best_r = 0
    for i in range(1, len(nums)):
        if cur < 0:                 # a negative running sum only hurts: restart here
            cur, start = nums[i], i
        else:
            cur += nums[i]
        if cur > best:
            best, best_l, best_r = cur, start, i
    return best, best_l, best_r

s, l, r = max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4])
print(s, l, r, [-2, 1, -3, 4, -1, 2, 1, -5, 4][l:r + 1])
print(max_subarray([-3, -1, -2]))
```
:::explain
**Kadane's algorithm**: the best subarray ending at `i` either extends the best one ending at `i-1`, or starts fresh at `i`. Start fresh exactly when the previous sum is negative. Track the global best along the way. O(n), O(1). It handles all-negative input by returning the largest single element.
:::end

:::problem medium | Merge overlapping intervals | sorting, list building
Merge overlapping intervals (LeetCode 56): `[[1,3],[2,6],[8,10],[15,18]]` → `[[1,6],[8,10],[15,18]]`. Touching intervals (`[1,4],[4,5]`) also merge.
:::solution
```python
def merge_intervals(intervals):
    out = []
    for start, end in sorted(intervals):
        if out and start <= out[-1][1]:          # overlaps the last merged interval
            out[-1][1] = max(out[-1][1], end)
        else:
            out.append([start, end])
    return out

print(merge_intervals([[1, 3], [2, 6], [8, 10], [15, 18]]))
print(merge_intervals([[1, 4], [4, 5]]), merge_intervals([[1, 10], [2, 3], [4, 5]]))
```
:::explain
After sorting by start, overlaps can only happen with the **last** merged interval. `max(...)` handles an interval fully contained in another (`[1,10]` and `[2,3]`). Sorting dominates: O(n log n). Note we append new lists (`[start, end]`) rather than the input pairs, so mutating `out[-1]` never changes the caller's data.
:::end

:::problem medium | Next permutation | in-place array manipulation
Rearrange the numbers into the lexicographically next greater permutation, in place. If there is none, wrap around to the smallest (LeetCode 31).
:::solution
```python
def next_permutation(nums):
    i = len(nums) - 2
    while i >= 0 and nums[i] >= nums[i + 1]:     # 1. find the rightmost "ascent"
        i -= 1
    if i >= 0:
        j = len(nums) - 1
        while nums[j] <= nums[i]:                 # 2. rightmost element bigger than nums[i]
            j -= 1
        nums[i], nums[j] = nums[j], nums[i]       # 3. swap
    nums[i + 1:] = reversed(nums[i + 1:])         # 4. reverse the suffix
    return nums

p = [1, 2, 3]
for _ in range(7):
    print(p[:], end=" ")
    next_permutation(p)
print()
```
:::explain
The suffix after index `i` is in descending order, meaning it's already the "largest" arrangement of those elements. To get the next permutation, bump `nums[i]` up by the smallest possible amount (swap it with the smallest larger element in the suffix), then make the suffix as small as possible by reversing it into ascending order. O(n), in place. Cycling 3! = 6 times returns to the start.
:::end

:::problem hard | Trapping rain water | two pointers, prefix maxima
Given bar heights, compute how much water is trapped after rain (LeetCode 42). Solve it with prefix/suffix max arrays (O(n) space), then with two pointers (O(1) space).
:::solution
```python
def trap_arrays(h):
    n = len(h)
    if n == 0:
        return 0
    left = [0] * n; right = [0] * n
    left[0], right[-1] = h[0], h[-1]
    for i in range(1, n):
        left[i] = max(left[i - 1], h[i])
    for i in range(n - 2, -1, -1):
        right[i] = max(right[i + 1], h[i])
    return sum(min(left[i], right[i]) - h[i] for i in range(n))

def trap_two_pointers(h):
    l, r = 0, len(h) - 1
    left_max = right_max = water = 0
    while l < r:
        if h[l] < h[r]:                 # the left side is the bottleneck
            left_max = max(left_max, h[l])
            water += left_max - h[l]
            l += 1
        else:
            right_max = max(right_max, h[r])
            water += right_max - h[r]
            r -= 1
    return water

bars = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]
print(trap_arrays(bars), trap_two_pointers(bars), trap_two_pointers([4, 2, 0, 3, 2, 5]))
```
:::explain
Water above bar `i` = `min(highest wall to the left, highest wall to the right) − h[i]`. The array version precomputes both maxima. The two-pointer version notices that if `h[l] < h[r]`, then the right side has a wall **at least** as tall as `h[r] > h[l]`, so the water at `l` is determined only by `left_max`. Move the smaller side inward. O(n) time, O(1) space.
:::end

:::problem hard | First missing positive | index-as-hash, in-place
Find the smallest missing positive integer in O(n) time and O(1) extra space (LeetCode 41): `[3,4,-1,1]` → 2, `[7,8,9]` → 1.
:::solution
```python
def first_missing_positive(nums):
    n = len(nums)
    for i in range(n):
        # keep swapping nums[i] into its "home" slot (value v belongs at index v-1)
        while 1 <= nums[i] <= n and nums[nums[i] - 1] != nums[i]:
            j = nums[i] - 1
            nums[i], nums[j] = nums[j], nums[i]
    for i in range(n):
        if nums[i] != i + 1:
            return i + 1
    return n + 1

for case in [[3, 4, -1, 1], [1, 2, 0], [7, 8, 9, 11], [1, 1], [2, 1]]:
    print(case, "->", first_missing_positive(case[:]))
```
:::explain
The answer is always in `1..n+1`, so we can use the **array itself as a hash table**: place each value `v` at index `v-1` ("cyclic sort"). Each swap puts at least one value in its final home, so the total number of swaps is ≤ n and the time is O(n), despite the nested loop. The `nums[nums[i]-1] != nums[i]` check stops infinite swaps on duplicates. Then the first index where `nums[i] != i+1` reveals the gap.
:::trace
`[3, 4, -1, 1]`:
| i | action | array |
|---|---|---|
| 0 | 3 → slot 2 | [-1, 4, 3, 1] |
| 0 | -1: out of range, stop | |
| 1 | 4 → slot 3 | [-1, 1, 3, 4] |
| 1 | 1 → slot 0 | [1, -1, 3, 4] |
| scan | index 1 holds -1 ≠ 2 | answer **2** |
:::end

:::problem hard | Sliding window maximum with a deque | monotonic deque
For each window of size `k`, return the maximum (LeetCode 239) in O(n).
:::solution
```python
from collections import deque

def max_sliding_window(nums, k):
    dq, out = deque(), []          # dq holds INDICES; their values are decreasing
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()               # smaller values can never be a max again
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()           # front index slid out of the window
        if i >= k - 1:
            out.append(nums[dq[0]])
    return out

print(max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3))
```
:::explain
The deque keeps candidate indices with **decreasing** values. When a new value arrives, every smaller value behind it is useless (the new one is larger *and* will stay in the window longer), so pop them. The front is always the window's maximum. Each index is pushed and popped at most once: O(n) total. This **monotonic deque** pattern is covered in depth in *Stacks & Queues*.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Merge sorted array | LeetCode 88 | https://leetcode.com/problems/merge-sorted-array/
`nums1` has length `m + n`: its first `m` items are sorted, and the last `n` are placeholder zeros. Merge the sorted `nums2` (length `n`) into `nums1` **in place**, with O(1) extra space. The function returns nothing.
:::starter
```python norun
def merge(nums1, m, nums2, n):
    pass
```
:::tests
```python norun
a = [1, 2, 3, 0, 0, 0]; merge(a, 3, [2, 5, 6], 3); assert a == [1, 2, 2, 3, 5, 6]
b = [1]; merge(b, 1, [], 0); assert b == [1]
c = [0]; merge(c, 0, [1], 1); assert c == [1]
d = [4, 5, 6, 0, 0, 0]; merge(d, 3, [1, 2, 3], 3); assert d == [1, 2, 3, 4, 5, 6]
e = [2, 0]; ref = e; merge(e, 1, [1], 1); assert ref == [1, 2] and merge([0], 0, [1], 1) is None
```
:::hint
Fill from the **back**. The largest remaining element of the two lists goes into the last free slot, so nothing in `nums1` is overwritten before it has been read.
:::solution
```python
def merge(nums1, m, nums2, n):
    i, j, k = m - 1, n - 1, m + n - 1
    while j >= 0:                         # once nums2 is empty, nums1's rest is already in place
        if i >= 0 and nums1[i] > nums2[j]:
            nums1[k] = nums1[i]
            i -= 1
        else:
            nums1[k] = nums2[j]
            j -= 1
        k -= 1

a = [1, 2, 3, 0, 0, 0]
merge(a, 3, [2, 5, 6], 3)
print(a)
```
:::explain
Merging from the front would overwrite `nums1` values we still need. From the back, the write pointer `k` is always at or after the read pointer `i`, so it's safe. When `nums2` runs out we stop: whatever remains of `nums1` is already sorted and in place. The visualiser makes the three pointers easy to watch.
:::trace
`[1,2,3,_,_,_]` + `[2,5,6]`:
| i | j | compare | write at k |
|---|---|---|---|
| 2 (3) | 2 (6) | 6 ≥ 3 | k=5 ← 6 |
| 2 (3) | 1 (5) | 5 ≥ 3 | k=4 ← 5 |
| 2 (3) | 0 (2) | 3 > 2 | k=3 ← 3 |
| 1 (2) | 0 (2) | 2 ≥ 2 | k=2 ← 2 (from nums2) |
| 1 | -1 | done | [1, 2, 2, 3, 5, 6] |
:::complexity
O(m + n) time, O(1) space.
:::end

:::program basic | Majority element | LeetCode 169 | https://leetcode.com/problems/majority-element/
Return the element that appears **more than n/2 times** (it's guaranteed to exist). Do it in O(n) time and **O(1)** space with the Boyer–Moore voting algorithm.
:::starter
```python norun
def majority_element(nums):
    pass
```
:::tests
```python norun
assert majority_element([3, 2, 3]) == 3
assert majority_element([2, 2, 1, 1, 1, 2, 2]) == 2
assert majority_element([7]) == 7
assert majority_element([1, 1, 2, 2, 2]) == 2
import random
for _ in range(100):
    xs = [9] * 51 + [random.randint(0, 5) for _ in range(50)]
    random.shuffle(xs)
    assert majority_element(xs) == 9
```
:::hint
Keep a `candidate` and a `count`. A matching element increments the count, a different one decrements it, and when the count hits 0 the next element becomes the new candidate.
:::solution
```python
def majority_element(nums):
    candidate, count = None, 0
    for x in nums:
        if count == 0:
            candidate = x
        count += 1 if x == candidate else -1
    return candidate

print(majority_element([2, 2, 1, 1, 1, 2, 2]))
```
:::explain
Think of it as pairing off: every non-majority element can cancel at most one majority element. Since the majority has **more than half** the items, it can't be fully cancelled, so it's the last candidate standing. That's O(1) memory, compared with O(n) for `Counter`. (Without the guarantee, you'd need a second pass to verify the candidate.)
:::trace
`[2, 2, 1, 1, 1, 2, 2]`:
| x | candidate | count |
|---|---|---|
| 2 | 2 | 1 |
| 2 | 2 | 2 |
| 1 | 2 | 1 |
| 1 | 2 | 0 |
| 1 | 1 | 1 |
| 2 | 1 | 0 |
| 2 | 2 | 1 → **2** |
:::complexity
O(n) time, O(1) space.
:::end

:::program medium | Rotate image | LeetCode 48 | https://leetcode.com/problems/rotate-image/
Rotate an `n × n` matrix 90° clockwise **in place** (modify the given lists; don't create a new matrix and rebind).
:::starter
```python norun
def rotate(matrix):
    pass
```
:::tests
```python norun
m = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]; rows = [id(r) for r in m]
rotate(m)
assert m == [[7, 4, 1], [8, 5, 2], [9, 6, 3]] and [id(r) for r in m] == rows
m2 = [[5, 1, 9, 11], [2, 4, 8, 10], [13, 3, 6, 7], [15, 14, 12, 16]]
rotate(m2); assert m2 == [[15, 13, 2, 5], [14, 3, 4, 1], [12, 6, 8, 9], [16, 7, 10, 11]]
one = [[1]]; rotate(one); assert one == [[1]]
```
:::hint
Rotating 90° clockwise = **transpose** (swap `m[i][j]` with `m[j][i]`) and then **reverse each row**. Both steps can be done in place.
:::solution
```python
def rotate(matrix):
    n = len(matrix)
    for i in range(n):
        for j in range(i + 1, n):                  # transpose across the main diagonal
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]
    for row in matrix:
        row.reverse()                              # mirror each row, in place

m = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
rotate(m)
for r in m:
    print(r)
```
:::explain
Starting `j` at `i + 1` swaps each pair across the diagonal exactly once (starting at 0 would swap twice and undo it). `row.reverse()` mutates each existing row object, which is why the row ids are unchanged, and the first test checks that. `matrix[:] = [list(r) for r in zip(*matrix[::-1])]` also works, but it allocates new rows.
:::complexity
O(n²) time, O(1) extra space.
:::end

:::program hard | Candy | LeetCode 135 | https://leetcode.com/problems/candy/
Children stand in a line with `ratings`. Each child gets at least 1 candy, and a child with a **higher rating than a neighbour** must get more candy than that neighbour. Return the minimum total number of candies.
:::starter
```python norun
def candy(ratings):
    pass
```
:::tests
```python norun
assert candy([1, 0, 2]) == 5
assert candy([1, 2, 2]) == 4
assert candy([1, 3, 4, 5, 2]) == 11
assert candy([5]) == 1
assert candy([1, 2, 3, 4, 5]) == 15
assert candy([5, 4, 3, 2, 1]) == 15
assert candy([1, 3, 2, 2, 1]) == 7
```
:::hint
Two passes. Left to right: if `r[i] > r[i-1]`, then `c[i] = c[i-1] + 1`. Right to left: if `r[i] > r[i+1]`, then `c[i] = max(c[i], c[i+1] + 1)`.
:::solution
```python
def candy(ratings):
    n = len(ratings)
    c = [1] * n
    for i in range(1, n):                       # satisfy the LEFT neighbour rule
        if ratings[i] > ratings[i - 1]:
            c[i] = c[i - 1] + 1
    for i in range(n - 2, -1, -1):              # satisfy the RIGHT neighbour rule, keep the left one
        if ratings[i] > ratings[i + 1]:
            c[i] = max(c[i], c[i + 1] + 1)
    return sum(c)

print(candy([1, 3, 4, 5, 2]), candy([1, 0, 2]))
```
:::explain
Each child has two independent constraints: one from the left neighbour, one from the right. The first pass gives the minimum that satisfies the left rule only, and the second pass raises values just enough for the right rule. Taking `max` keeps the left rule satisfied, so both hold with the smallest possible numbers. This **two-pass, two-direction** trick also solves Trapping Rain Water and Product Except Self.
:::trace
`[1, 3, 4, 5, 2]`:
| pass | candies |
|---|---|
| start | [1, 1, 1, 1, 1] |
| left → | [1, 2, 3, 4, 1] |
| ← right | [1, 2, 3, 4, 1] (5 > 2: max(4, 1+1) = 4) |
| sum | **11** |
:::complexity
O(n) time, O(n) space.
:::end
