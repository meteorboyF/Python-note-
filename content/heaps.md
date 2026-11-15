# Heaps & Priority Queues

A **heap** is a tree-shaped structure, stored in a plain list, that always keeps the **smallest** (min-heap) or **largest** (max-heap) item at the top. You get the top in O(1) and push or pop in O(log n). That makes heaps the engine of **priority queues**, top-K problems, k-way merges, streaming medians, Dijkstra's shortest paths, schedulers and beam search.

:::analogy A hospital emergency room
Patients aren't seen in arrival order (that would be a queue). The most urgent patient is always seen next. A heap is the triage nurse: adding a patient or calling the next one takes only a few comparisons (O(log n)), even with thousands waiting. It never fully sorts everyone, it just guarantees the most urgent is on top.
:::

## 1. Heap fundamentals

**Heap property** (min-heap): every parent ≤ its children. The tree is **complete** (filled level by level, left to right), so it fits in a list with no gaps.

```text
            1                index: 0
         /     \
        3       2            1, 2
       / \     / \
      7   4   5   9          3, 4, 5, 6

list:  [1, 3, 2, 7, 4, 5, 9]
```

| For the node at index `i` | Index |
|---|---|
| left child | `2*i + 1` |
| right child | `2*i + 2` |
| parent | `(i - 1) // 2` |

:::note A heap is NOT sorted
`[1, 3, 2, 7, 4, 5, 9]` is a valid heap but not sorted. Only `heap[0]` is guaranteed to be the minimum. Siblings have no order between them.
:::

### Sift-up (push) and sift-down (pop)

```python
def sift_up(h, i):
    while i > 0:
        parent = (i - 1) // 2
        if h[i] < h[parent]:
            h[i], h[parent] = h[parent], h[i]     # bubble the new item up
            i = parent
        else:
            break

def sift_down(h, i):
    n = len(h)
    while True:
        smallest, l, r = i, 2 * i + 1, 2 * i + 2
        if l < n and h[l] < h[smallest]: smallest = l
        if r < n and h[r] < h[smallest]: smallest = r
        if smallest == i:
            return
        h[i], h[smallest] = h[smallest], h[i]     # sink toward the smaller child
        i = smallest

def push(h, x):
    h.append(x); sift_up(h, len(h) - 1)

def pop(h):
    h[0], h[-1] = h[-1], h[0]       # move the last item to the root
    smallest = h.pop()
    if h:
        sift_down(h, 0)
    return smallest

h = []
for x in [5, 3, 8, 1, 9, 2]:
    push(h, x)
print(h, [pop(h) for _ in range(6)])
```

Visualise `push` to watch a new value climb the tree, swapping with its parent.

### heapify in O(n)

```python
def heapify(xs):
    for i in range(len(xs) // 2 - 1, -1, -1):   # from the last parent up to the root
        sift_down(xs, i)

def sift_down(h, i):
    n = len(h)
    while True:
        s, l, r = i, 2 * i + 1, 2 * i + 2
        if l < n and h[l] < h[s]: s = l
        if r < n and h[r] < h[s]: s = r
        if s == i: return
        h[i], h[s] = h[s], h[i]; i = s

data = [9, 4, 7, 1, 8, 2, 6]
heapify(data)
print(data)
```

:::deep Why heapify is O(n), not O(n log n)
Half the nodes are leaves and need no work. A quarter sift down at most 1 level, an eighth at most 2… The sum n/4·1 + n/8·2 + n/16·3 + … converges to **at most n**. Pushing n items one by one costs O(n log n). So when you have all the data up front, `heapify` it.
:::

## 2. The `heapq` module

```python
import heapq
nums = [5, 1, 8, 3, 2]
heapq.heapify(nums)                    # in place, O(n)
heapq.heappush(nums, 0)                # O(log n)
print(nums[0], heapq.heappop(nums))    # peek O(1), pop O(log n)
print(heapq.heappushpop(nums, 4))      # push THEN pop (returns the smaller of the new item and the min)
print(heapq.heapreplace(nums, 10))     # pop THEN push (always returns the old min)
print(nums)
print(heapq.nsmallest(3, [7, 2, 9, 1, 5]), heapq.nlargest(2, ["bb", "a", "ccc"], key=len))
print(list(heapq.merge([1, 4, 9], [2, 3, 10], [0, 5])))   # lazy k-way merge of sorted inputs
```

| Function | Purpose | Cost |
|---|---|---|
| `heapify(x)` | list → heap in place | O(n) |
| `heappush(h, x)` | add | O(log n) |
| `heappop(h)` | remove the smallest | O(log n) |
| `h[0]` | peek at the smallest | O(1) |
| `heappushpop(h, x)` | push then pop (efficient) | O(log n) |
| `heapreplace(h, x)` | pop then push | O(log n) |
| `nlargest(k, it, key)` / `nsmallest` | top-k | O(n log k) |
| `merge(*sorted_its)` | lazy merged iterator | O(n log k) |

Python 3.14 added max-heap functions (`heapq.heappush_max`, `heappop_max`, `heapify_max`, …). The negation trick below works in every version.

## 3. Max-heaps: the negation trick

```python
import heapq
scores = [40, 95, 72, 88]
max_heap = [-s for s in scores]
heapq.heapify(max_heap)
print(-max_heap[0], -heapq.heappop(max_heap), -heapq.heappop(max_heap))

words = ["kiwi", "banana", "fig"]
h = [(-len(w), w) for w in words]       # negate the PRIORITY, keep the payload
heapq.heapify(h)
print(heapq.heappop(h)[1])
```

## 4. Custom objects in heaps

```python
import heapq, itertools
from dataclasses import dataclass, field

tasks = []
counter = itertools.count()             # tie-breaker -> FIFO among equal priorities
for prio, name in [(2, "write"), (1, "plan"), (2, "review"), (0, "fix prod")]:
    heapq.heappush(tasks, (prio, next(counter), {"name": name}))   # dicts aren't comparable!
print([heapq.heappop(tasks)[2]["name"] for _ in range(4)])

@dataclass(order=True)
class Job:
    priority: int
    name: str = field(compare=False)
jobs = [Job(3, "c"), Job(1, "a"), Job(2, "b")]
heapq.heapify(jobs)
print(heapq.heappop(jobs))
```

:::trap Equal priorities compare the next tuple element
`(1, {"a": 1})` vs `(1, {"b": 2})`: the priorities tie, so Python compares the dicts and raises `TypeError`. Always insert a **unique, comparable tie-breaker** (a counter) before the payload.
:::

## 5. Heap sort

```python
import heapq
def heap_sort(xs):
    h = list(xs)
    heapq.heapify(h)
    return [heapq.heappop(h) for _ in range(len(h))]
print(heap_sort([9, 4, 7, 1, 8, 2, 6, 3]))
```

O(n log n) and in-place-able, but **not stable** and cache-unfriendly. Python's built-in `sorted` (Timsort) is faster in practice. Heap sort's value is its guaranteed worst case and its O(1) extra space in the in-place version.

## 6. Top-K patterns

```python
import heapq, random
random.seed(0)
stream = [random.randint(0, 10_000) for _ in range(100_000)]
k = 5
min_heap = []                          # keep the k LARGEST seen so far in a MIN-heap of size k
for x in stream:
    if len(min_heap) < k:
        heapq.heappush(min_heap, x)
    elif x > min_heap[0]:
        heapq.heapreplace(min_heap, x)
print(sorted(min_heap, reverse=True), heapq.nlargest(k, stream))
```

:::tip "K largest" means a min-heap of size K
It sounds backwards, but it's right. The heap's top is the **smallest of the current top-K**, which is the threshold a new item must beat. That gives O(n log k) time and O(k) memory, which is ideal for streams.
:::

## 7. Two heaps: the running median

```python
import heapq

class MedianFinder:
    def __init__(self):
        self.low = []      # max-heap (negated): the smaller half
        self.high = []     # min-heap: the larger half
    def add(self, x):
        heapq.heappush(self.low, -x)
        heapq.heappush(self.high, -heapq.heappop(self.low))   # move the largest of low to high
        if len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))
    def median(self):
        if len(self.low) > len(self.high):
            return -self.low[0]
        return (-self.low[0] + self.high[0]) / 2

mf = MedianFinder()
for x in [5, 15, 1, 3, 8, 7]:
    mf.add(x)
    print(f"added {x:2} -> median {mf.median()}")
```

## 8. Dijkstra's shortest paths

```python
import heapq

def dijkstra(graph, src):
    dist = {src: 0}
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, float("inf")):
            continue                       # stale entry (lazy deletion)
        for v, w in graph[u]:
            nd = d + w
            if nd < dist.get(v, float("inf")):
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    return dist

g = {"A": [("B", 4), ("C", 1)], "B": [("D", 1)], "C": [("B", 2), ("D", 5)], "D": []}
print(dijkstra(g, "A"))
```

Each time, the heap hands us the closest unsettled node. Stale entries (old, longer distances for the same node) are skipped on pop, which is simpler than a "decrease-key" operation. O((V + E) log V). More in *Graphs*.

## 9. Performance

| Operation | Heap | Sorted list | Unsorted list |
|---|---|---|---|
| find min | O(1) | O(1) | O(n) |
| insert | O(log n) | O(n) | O(1) |
| delete min | O(log n) | O(n) (front) / O(1) if reversed | O(n) |
| build | O(n) | O(n log n) | — |
| search arbitrary | O(n) | O(log n) | O(n) |

## 10. ML use cases

```python
import heapq, math

vocab = ["the", "cat", "dog", "sat", "<eos>"]
def next_probs(seq):                       # a toy language model
    table = {"the": [0.0, .6, .3, .05, .05], "cat": [.1, 0, 0, .8, .1], "dog": [.1, 0, 0, .5, .4], "sat": [.2, 0, 0, 0, .8]}
    return table.get(seq[-1], [0, 0, 0, 0, 1])

def beam_search(start, beam=2, steps=3):
    beams = [(0.0, [start])]                 # (negative log-prob, sequence)
    for _ in range(steps):
        candidates = []
        for nlp, seq in beams:
            if seq[-1] == "<eos>":
                candidates.append((nlp, seq)); continue
            for word, p in zip(vocab, next_probs(seq)):
                if p > 0:
                    candidates.append((nlp - math.log(p), seq + [word]))
        beams = heapq.nsmallest(beam, candidates)   # keep the best `beam` hypotheses
    return [(" ".join(s), round(math.exp(-n), 3)) for n, s in beams]

print(beam_search("the"))
```

## Tricks & tips

- `heapq` is a **min**-heap. Negate the numbers for a max-heap (or use the 3.14 `_max` functions).
- Use `(priority, counter, item)` tuples to avoid comparing payloads.
- For a small `k`, `nlargest`/`nsmallest` beat sorting. For `k ≈ n`, just sort. For `k == 1`, use `min`/`max`.
- Lazy deletion: mark items as removed and skip them when popped, instead of searching the heap.
- `heapreplace` is faster than `heappop` followed by `heappush`.
- Heaps don't support efficient "decrease key". Push a new entry and skip the stale one.

## The 10 most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Assuming the heap list is sorted | only `h[0]` is ordered |
| 2 | Forgetting `heapify` after building a list | `heapq.heapify(xs)` |
| 3 | Comparing non-comparable payloads on ties | add a counter |
| 4 | Max-heap without negation | negate, or use the `_max` APIs |
| 5 | Negating non-numeric keys | wrap them in a class with a reversed `__lt__` |
| 6 | `heappop` on an empty heap → IndexError | check `if h` |
| 7 | Mutating items inside the heap | remove and re-push, or lazy-delete |
| 8 | Using a heap for "is x present?" | a set alongside it |
| 9 | O(n log n) pushes instead of O(n) heapify | heapify bulk data |
| 10 | Top-K largest with a MAX-heap of all n items | a min-heap of size k |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
import heapq
h = [5, 1, 4, 2, 3]
heapq.heapify(h)
print(h[0], h == sorted(h), heapq.heappop(h), h[0])
```
What prints?
- [x] `1 False 1 2`
- [ ] `1 True 1 2`
- [ ] `5 False 5 4`
A heap guarantees only that `h[0]` is the smallest. The rest of the list is in **heap order**, not sorted order. After popping 1, the next smallest (2) bubbles up to the top.
:::

:::quiz
```python norun
import heapq
scores = [40, 95, 72]
h = [-s for s in scores]
heapq.heapify(h)
print(-heapq.heappop(h), heapq.nlargest(2, scores), heapq.nsmallest(1, scores))
```
What prints?
- [x] `95 [95, 72] [40]`
- [ ] `40 [95, 72] [40]`
- [ ] `-95 [72, 95] [40]`
`heapq` is a **min**-heap, so negating the values turns it into a max-heap (remember to negate back). `nlargest` returns its results largest first.
:::

:::quiz
```python norun
import heapq
h = []
heapq.heappush(h, (1, {"job": "a"}))
try:
    heapq.heappush(h, (1, {"job": "b"}))
    print("ok")
except TypeError:
    print("TypeError")
```
What prints?
- [ ] `ok`
- [x] `TypeError`
- [ ] nothing
On equal priorities, tuple comparison moves on to the **dicts**, and dicts aren't orderable. Insert a unique tie-breaker: `(priority, counter, payload)`.
:::

## Practice problems

:::problem basic | Kth largest element | min-heap of size k
Find the kth largest element in an unsorted list (LeetCode 215) in O(n log k).
:::solution
```python
import heapq

def kth_largest(nums, k):
    h = nums[:k]
    heapq.heapify(h)
    for x in nums[k:]:
        if x > h[0]:
            heapq.heapreplace(h, x)
    return h[0]

print(kth_largest([3, 2, 1, 5, 6, 4], 2), kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4))
```
:::explain
The heap holds the k largest items seen so far, and its root is the smallest of them, which is the current kth largest. A new value only matters if it beats the root. Quickselect gives O(n) on average (see *Searching & Sorting*).
:::end

:::problem basic | Last stone weight | max-heap simulation
Repeatedly smash the two heaviest stones. If they're equal, both are destroyed; otherwise the difference remains. Return the last stone's weight, or 0 (LeetCode 1046).
:::solution
```python
import heapq

def last_stone(stones):
    h = [-s for s in stones]
    heapq.heapify(h)
    while len(h) > 1:
        a, b = -heapq.heappop(h), -heapq.heappop(h)
        if a != b:
            heapq.heappush(h, -(a - b))
    return -h[0] if h else 0

print(last_stone([2, 7, 4, 1, 8, 1]), last_stone([3, 3]))
```
:::explain
"Repeatedly take the largest" is the signature of a max-heap problem. Negation turns `heapq`'s min-heap into a max-heap. Each round is O(log n), so the whole thing is O(n log n).
:::end

:::problem basic | Sort a nearly sorted array | sliding heap of size k+1
Each element is at most `k` positions away from its sorted position. Sort in O(n log k).
:::solution
```python
import heapq

def sort_k_sorted(nums, k):
    h = nums[:k + 1]
    heapq.heapify(h)
    out = []
    for x in nums[k + 1:]:
        out.append(heapq.heappushpop(h, x))
    while h:
        out.append(heapq.heappop(h))
    return out

print(sort_k_sorted([3, 2, 1, 5, 4, 7, 6, 5], 2))
```
:::explain
The smallest remaining element must be within the next k+1 positions, so a heap of that window always contains it. `heappushpop` adds the new element and removes the minimum in one O(log k) step.
:::end

:::problem medium | K closest points to origin | max-heap of size k
Return the `k` points closest to (0, 0) (LeetCode 973) in O(n log k).
:::solution
```python
import heapq

def k_closest(points, k):
    h = []                                   # max-heap via negated distance
    for x, y in points:
        d = -(x * x + y * y)                 # no sqrt needed for comparisons
        if len(h) < k:
            heapq.heappush(h, (d, x, y))
        elif d > h[0][0]:                    # closer than the farthest kept point
            heapq.heapreplace(h, (d, x, y))
    return sorted([(x, y) for _, x, y in h], key=lambda p: p[0] ** 2 + p[1] ** 2)

print(k_closest([[1, 3], [-2, 2], [5, 8], [0, 1]], 2))
```
:::explain
Keep the k closest points. The heap's top is the **farthest** of those, so a new point replaces it only if it's closer. Comparing squared distances avoids the expensive and imprecise `sqrt`. One-liner alternative: `heapq.nsmallest(k, points, key=lambda p: p[0]**2 + p[1]**2)`.
:::end

:::problem medium | Task scheduler | greedy with a heap and a cooldown queue
Given tasks (letters) and a cooldown `n` between identical tasks, return the minimum number of time units needed (LeetCode 621), by simulating with a max-heap of remaining counts and a queue of tasks cooling down.
:::solution
```python
import heapq
from collections import Counter, deque

def least_interval(tasks, n):
    h = [-c for c in Counter(tasks).values()]
    heapq.heapify(h)
    cooling = deque()                    # (ready_time, negative remaining count)
    time = 0
    while h or cooling:
        time += 1
        if h:
            cnt = heapq.heappop(h) + 1   # run the most frequent available task
            if cnt:
                cooling.append((time + n, cnt))
        if cooling and cooling[0][0] == time:
            heapq.heappush(h, cooling.popleft()[1])
    return time

print(least_interval(list("AAABBB"), 2), least_interval(list("AAABBB"), 0), least_interval(list("AAAAAABCDEFG"), 2))
```
:::explain
Greedy: always run the task with the **most remaining copies** (the max-heap), because it's the hardest to fit in later. A task that just ran waits in a FIFO queue until its cooldown expires. Idle slots happen when the heap is empty but tasks are still cooling. The closed-form answer is `max(len(tasks), (maxCount-1)*(n+1) + numMax)`, but the simulation is easier to explain and reuse.
:::end

:::problem medium | Merge k sorted lists | heap of heads
Merge `k` sorted lists into one sorted list in O(N log k) (LeetCode 23), using a heap of `(value, list_index, element_index)`.
:::solution
```python
import heapq

def merge_k(lists):
    h = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
    heapq.heapify(h)
    out = []
    while h:
        val, i, j = heapq.heappop(h)
        out.append(val)
        if j + 1 < len(lists[i]):
            heapq.heappush(h, (lists[i][j + 1], i, j + 1))
    return out

print(merge_k([[1, 4, 5], [1, 3, 4], [2, 6], []]))
```
:::explain
The heap always holds one candidate per list: its current head. The overall minimum must be one of these heads. After taking it, push that list's next element. N pops and pushes on a heap of size ≤ k gives O(N log k). The list index `i` doubles as a tie-breaker.
:::end

:::problem hard | Find median from a data stream | two heaps
Implement `MedianFinder` with `add(num)` in O(log n) and `median()` in O(1), and verify it against `statistics.median` on random data.
:::solution
```python
import heapq, random, statistics

class MedianFinder:
    def __init__(self):
        self.lo, self.hi = [], []          # lo: max-heap (negated), hi: min-heap
    def add(self, x):
        if not self.lo or x <= -self.lo[0]:
            heapq.heappush(self.lo, -x)
        else:
            heapq.heappush(self.hi, x)
        if len(self.lo) > len(self.hi) + 1:        # rebalance sizes
            heapq.heappush(self.hi, -heapq.heappop(self.lo))
        elif len(self.hi) > len(self.lo):
            heapq.heappush(self.lo, -heapq.heappop(self.hi))
    def median(self):
        if len(self.lo) > len(self.hi):
            return -self.lo[0]
        return (-self.lo[0] + self.hi[0]) / 2

mf, seen = MedianFinder(), []
for _ in range(2000):
    x = random.randint(-1000, 1000)
    mf.add(x); seen.append(x)
    assert mf.median() == statistics.median(seen)
print("2000 random checks passed; current median:", mf.median())
```
:::explain
Split the numbers into a lower half (a max-heap) and an upper half (a min-heap), with `len(lo)` equal to `len(hi)` or one more. Then the median is either `lo`'s top or the average of both tops. Each insert does a constant number of heap operations: O(log n). The random comparison against `statistics.median` (which sorts each time) gives strong evidence of correctness.
:::trace
Stream `5, 15, 1, 3`:
| add | lo (max) | hi (min) | median |
|---|---|---|---|
| 5 | [5] | [] | 5 |
| 15 | [5] | [15] | 10.0 |
| 1 | [5, 1] | [15] | 5 |
| 3 | [3, 1] | [5, 15] | 4.0 |
:::end

:::problem hard | IPO / maximise capital | two heaps, greedy
You have capital `w` and can complete at most `k` projects. Project `i` needs `capital[i]` to start and yields `profits[i]`. Maximise the final capital (LeetCode 502).
:::solution
```python
import heapq

def find_max_capital(k, w, profits, capital):
    projects = sorted(zip(capital, profits))   # by required capital
    available = []                              # max-heap of profits we can afford
    i = 0
    for _ in range(k):
        while i < len(projects) and projects[i][0] <= w:
            heapq.heappush(available, -projects[i][1])
            i += 1
        if not available:
            break
        w += -heapq.heappop(available)          # do the most profitable affordable project
    return w

print(find_max_capital(2, 0, [1, 2, 3], [0, 1, 1]), find_max_capital(3, 0, [1, 2, 3], [0, 1, 2]))
```
:::explain
Greedy is optimal here: profits only ever **increase** capital, so taking the most profitable affordable project now never hurts later choices. Sorting by required capital lets us "unlock" projects with one pointer as `w` grows, and a max-heap picks the best unlocked one. O(n log n).
:::end

:::problem hard | Smallest range covering k lists | heap + sliding max
Given k sorted lists, find the smallest range `[a, b]` that includes at least one number from each list (LeetCode 632).
:::solution
```python
import heapq

def smallest_range(lists):
    h = [(lst[0], i, 0) for i, lst in enumerate(lists)]
    heapq.heapify(h)
    cur_max = max(lst[0] for lst in lists)
    best = (-10**9, 10**9)
    while True:
        cur_min, i, j = heapq.heappop(h)
        if cur_max - cur_min < best[1] - best[0]:
            best = (cur_min, cur_max)
        if j + 1 == len(lists[i]):
            return list(best)                   # one list is exhausted: can't cover it any more
        nxt = lists[i][j + 1]
        cur_max = max(cur_max, nxt)
        heapq.heappush(h, (nxt, i, j + 1))

print(smallest_range([[4, 10, 15, 24, 26], [0, 9, 12, 20], [5, 18, 22, 30]]))
```
:::explain
Keep exactly one pointer per list. The current range is `[min of the pointed values, max of the pointed values]`. To try to shrink it, advance the list holding the **minimum** (the heap gives it to us in O(log k)) and update the running max. When any list runs out, no range can include all lists any more. O(N log k).
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Kth largest element in a stream | LeetCode 703 | https://leetcode.com/problems/kth-largest-element-in-a-stream/
Design `KthLargest(k, nums)` whose `add(val)` returns the current k-th largest element of the stream.
:::starter
```python norun
import heapq

class KthLargest:
    def __init__(self, k, nums):
        pass
    def add(self, val):
        pass
```
:::tests
```python norun
kl = KthLargest(3, [4, 5, 8, 2])
assert [kl.add(x) for x in [3, 5, 10, 9, 4]] == [4, 5, 5, 8, 8]
k1 = KthLargest(1, [])
assert [k1.add(x) for x in [-3, -2, -4, 0, 4]] == [-3, -2, -2, 0, 4]
k2 = KthLargest(2, [0])
assert [k2.add(x) for x in [-1, 1, -2, -4, 3]] == [-1, 0, 0, 0, 1]
```
:::hint
Keep a **min-heap of size k** holding the k largest values seen so far. Its root is the k-th largest.
:::solution
```python
import heapq

class KthLargest:
    def __init__(self, k, nums):
        self.k = k
        self.heap = []
        for x in nums:
            self.add(x)
    def add(self, val):
        if len(self.heap) < self.k:
            heapq.heappush(self.heap, val)
        elif val > self.heap[0]:
            heapq.heapreplace(self.heap, val)     # pop the smallest + push, in one step
        return self.heap[0]

kl = KthLargest(3, [4, 5, 8, 2])
print([kl.add(x) for x in [3, 5, 10, 9, 4]], kl.heap)
```
:::explain
Only the top k values matter. Anything smaller than the heap's root can never become the k-th largest, so it's ignored. `heapreplace` swaps out the root in one O(log k) operation. Memory stays O(k) no matter how long the stream runs.
:::complexity
O(log k) per add, O(k) space.
:::end

:::program basic | Relative ranks | LeetCode 506 | https://leetcode.com/problems/relative-ranks/
Given unique scores, return each athlete's rank: `"Gold Medal"`, `"Silver Medal"`, `"Bronze Medal"` for the top 3, and the placement number as a string otherwise. Use a heap.
:::starter
```python norun
import heapq

def find_relative_ranks(score):
    pass
```
:::tests
```python norun
assert find_relative_ranks([5, 4, 3, 2, 1]) == ["Gold Medal", "Silver Medal", "Bronze Medal", "4", "5"]
assert find_relative_ranks([10, 3, 8, 9, 4]) == ["Gold Medal", "5", "Bronze Medal", "Silver Medal", "4"]
assert find_relative_ranks([1]) == ["Gold Medal"]
```
:::solution
```python
import heapq

def find_relative_ranks(score):
    heap = [(-s, i) for i, s in enumerate(score)]      # max-heap via negation, remembering the index
    heapq.heapify(heap)
    medals = ["Gold Medal", "Silver Medal", "Bronze Medal"]
    result = [""] * len(score)
    place = 1
    while heap:
        _, i = heapq.heappop(heap)
        result[i] = medals[place - 1] if place <= 3 else str(place)
        place += 1
    return result

print(find_relative_ranks([10, 3, 8, 9, 4]))
```
:::explain
Each heap entry carries the athlete's **original index**, so after popping in rank order we can write the answer back to the right slot. Negating the score makes `heapq`'s min-heap behave as a max-heap. `heapify` is O(n), and n pops cost O(n log n).
:::complexity
O(n log n).
:::end

:::program medium | Reorganize string | LeetCode 767 | https://leetcode.com/problems/reorganize-string/
Rearrange the letters so that no two adjacent characters are the same, or return `""` if that's impossible. (Any valid answer is accepted, so the tests check validity.)
:::starter
```python norun
import heapq
from collections import Counter

def reorganize_string(s):
    pass
```
:::tests
```python norun
from collections import Counter
def ok(src, out):
    return Counter(src) == Counter(out) and all(a != b for a, b in zip(out, out[1:]))
assert ok("aab", reorganize_string("aab"))
assert reorganize_string("aaab") == ""
assert ok("vvvlo", reorganize_string("vvvlo"))
assert ok("aaabbbcc", reorganize_string("aaabbbcc"))
assert reorganize_string("a") == "a" and reorganize_string("aa") == ""
```
:::hint
Greedily place the **most frequent** remaining character that isn't the one you just placed. Use a max-heap of counts, and hold the just-used character out of the heap for one round.
:::solution
```python
import heapq
from collections import Counter

def reorganize_string(s):
    heap = [(-n, ch) for ch, n in Counter(s).items()]
    heapq.heapify(heap)
    out = []
    held = None                                  # (neg_count, ch) used last turn, cooling down
    while heap:
        n, ch = heapq.heappop(heap)
        out.append(ch)
        if held:
            heapq.heappush(heap, held)           # the previous char may be used again
        held = (n + 1, ch) if n + 1 < 0 else None
    return "".join(out) if not held else ""

print(reorganize_string("aaabbbcc"), repr(reorganize_string("aaab")))
```
:::explain
Always using the most common available letter is the safest move, because it's the hardest to fit later. The one just used is **held back** for one turn so it can't repeat immediately. If we run out of other letters while one is still held, it can't be placed, so the answer is impossible. (It's impossible exactly when some letter appears more than ⌈n/2⌉ times.)
:::complexity
O(n log k) for k distinct letters.
:::end

:::program hard | Sliding window median | LeetCode 480 | https://leetcode.com/problems/sliding-window-median/
Return the median of every window of size `k` as it slides across `nums`. (For an even k, the median is the mean of the two middle values.)
:::starter
```python norun
def median_sliding_window(nums, k):
    pass
```
:::tests
```python norun
assert median_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3) == [1, -1, -1, 3, 5, 6]
assert median_sliding_window([1, 2, 3, 4, 2, 3, 1, 4, 2], 3) == [2, 3, 3, 3, 2, 3, 2]
assert median_sliding_window([1, 4, 2, 3], 4) == [2.5]
assert median_sliding_window([5, 5, 5], 2) == [5.0, 5.0]
import random, statistics
xs = [random.randint(-50, 50) for _ in range(300)]
assert median_sliding_window(xs, 7) == [statistics.median(xs[i:i + 7]) for i in range(294)]
```
:::hint
Use two heaps (`lo` = a max-heap of the smaller half, `hi` = a min-heap of the larger half) plus **lazy deletion**: count outgoing values in a dict and discard them only when they reach a heap's top. Track the "valid" sizes yourself.
:::solution
```python
import heapq
from collections import defaultdict

def median_sliding_window(nums, k):
    lo, hi = [], []                      # lo: max-heap (negated), hi: min-heap
    delayed = defaultdict(int)           # value -> pending deletions
    lo_size = hi_size = 0

    def prune(heap, sign):
        while heap and delayed[sign * heap[0]]:
            delayed[sign * heap[0]] -= 1
            heapq.heappop(heap)

    def rebalance():
        nonlocal lo_size, hi_size
        if lo_size > hi_size + 1:
            heapq.heappush(hi, -heapq.heappop(lo)); lo_size -= 1; hi_size += 1; prune(lo, -1)
        elif lo_size < hi_size:
            heapq.heappush(lo, -heapq.heappop(hi)); hi_size -= 1; lo_size += 1; prune(hi, 1)

    def add(x):
        nonlocal lo_size, hi_size
        if not lo or x <= -lo[0]:
            heapq.heappush(lo, -x); lo_size += 1
        else:
            heapq.heappush(hi, x); hi_size += 1
        rebalance()

    def remove(x):
        nonlocal lo_size, hi_size
        delayed[x] += 1
        if x <= -lo[0]:
            lo_size -= 1
            if x == -lo[0]: prune(lo, -1)
        else:
            hi_size -= 1
            if hi and x == hi[0]: prune(hi, 1)
        rebalance()

    def median():
        return -lo[0] if k % 2 else (-lo[0] + hi[0]) / 2

    out = []
    for i, x in enumerate(nums):
        add(x)
        if i >= k:
            remove(nums[i - k])
        if i >= k - 1:
            out.append(median())
    return out

print(median_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3))
```
:::explain
This combines three heap ideas. **Two heaps** keep the median at the tops, as in the Median Finder problem. **Lazy deletion** handles values leaving the window: we only *mark* them in `delayed`, and physically remove them when they surface at a heap top (`prune`). Since heaps may contain stale entries, we track the **logical** sizes (`lo_size`, `hi_size`) for rebalancing. The random test compares every window against `statistics.median`.
:::complexity
O(n log k) amortised.
:::end
