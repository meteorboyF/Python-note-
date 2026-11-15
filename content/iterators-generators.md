# Iterators & Generators

Every `for` loop in Python secretly uses the **iterator protocol**. Once you understand it, you can make your own objects loopable, and with **generators** you can produce values **lazily**, one at a time. That lets you process a 50 GB log file, or an infinite stream, using almost no memory.

:::analogy A Pez dispenser
An **iterable** is the box of candy: it can give you a dispenser. An **iterator** is the dispenser: each push (`next()`) gives the next candy, and when it's empty it says so (`StopIteration`). A **generator** is a dispenser that **makes each candy on demand** instead of pre-loading them all.
:::

**What you'll learn**: `iter()`/`next()`, `__iter__`/`__next__`, `StopIteration`, how `for` really works, writing iterator classes, generator functions and `yield`, generator state and the visualiser view of a paused frame, generator expressions, `yield from`, pipelines, `send()`, infinite generators, and the `itertools` toolkit.

## 1. The iterator protocol

```python
nums = [10, 20, 30]
it = iter(nums)          # ask the iterable for an iterator: calls nums.__iter__()
print(next(it))          # 10   calls it.__next__()
print(next(it))          # 20
print(next(it))          # 30
print(next(it, "done"))  # the default instead of StopIteration
```

A `for` loop is roughly this:

```python
nums = [10, 20, 30]
_it = iter(nums)
while True:
    try:
        x = next(_it)
    except StopIteration:
        break
    print(x)
```

| | Iterable | Iterator |
|---|---|---|
| Has | `__iter__` (returns an iterator) | `__next__` **and** `__iter__` (returns itself) |
| Examples | list, str, dict, set, range, file | `iter(list)`, generators, `map`, `zip`, file objects |
| Re-loopable? | Yes, gives a fresh iterator each time | **No**, it's exhausted after one pass |

:::trap Iterators are single-use
```python
squares = map(lambda x: x * x, [1, 2, 3])
print(list(squares))   # [1, 4, 9]
print(list(squares))   # []  <- already exhausted!
```
`map`, `filter`, `zip`, generators and file objects are iterators. If you need the data twice, store it in a `list`, or recreate the iterator.
:::

## 2. Writing an iterator class

```python
class Countdown:
    def __init__(self, start):
        self.current = start
    def __iter__(self):
        return self                 # an iterator returns itself
    def __next__(self):
        if self.current <= 0:
            raise StopIteration     # signal the end
        self.current -= 1
        return self.current + 1

for n in Countdown(3):
    print(n)
```

To make an object **re-iterable**, have `__iter__` return a *new* iterator each time. The easiest way is a generator, shown next.

## 3. Generators: `yield`

A function containing `yield` is a **generator function**. Calling it doesn't run the body. It returns a **generator object**. Each `next()` runs the body until the next `yield`, hands out that value, and **freezes the frame** (local variables and position) until the next `next()`.

```python
def countdown(n):
    print("starting")
    while n > 0:
        yield n          # pause here, hand out n
        n -= 1           # resume here on the next next()
    print("finished")

g = countdown(3)         # nothing printed yet!
print(type(g).__name__)
print(next(g))
print(next(g))
for x in g:              # continues from where it paused
    print("loop", x)
```

Press **👣 Visualise**: you'll see the `countdown` frame **appear, disappear and reappear** with its variables intact. That's a paused generator being resumed.

:::deep Generator states
A generator is in one of four states: **created** (not started), **suspended** (paused at a `yield`), **running**, or **closed** (returned or raised). When the function returns, `StopIteration` is raised automatically, and a `return value` inside a generator becomes `StopIteration.value`. Inspect the state with `inspect.getgeneratorstate(g)`.
:::

### Re-iterable class via a generator `__iter__`

```python
class Range2:
    def __init__(self, n):
        self.n = n
    def __iter__(self):            # a generator function as __iter__
        i = 0
        while i < self.n:
            yield i
            i += 1

r = Range2(3)
print(list(r), list(r))            # works twice: new generator each time
```

## 4. Generator expressions

Like a list comprehension, but with `()`, which makes it **lazy**.

```python
import sys
squares_list = [x * x for x in range(1_000_000)]
squares_gen = (x * x for x in range(1_000_000))
print(sys.getsizeof(squares_list), "bytes vs", sys.getsizeof(squares_gen), "bytes")
print(sum(x * x for x in range(1_000_000)))   # parentheses can be dropped as the sole argument
```

:::tip When to choose a generator
Use a generator when you **iterate once** and either the data is large, or you may stop early (`any`, `next`, `break`). Use a list when you need `len()`, indexing, multiple passes, or to print/debug it.
:::

## 5. `yield from` and pipelines

`yield from iterable` yields every item of another iterable (and properly delegates `send`/`throw` to sub-generators).

```python
def flatten(nested):
    for item in nested:
        if isinstance(item, list):
            yield from flatten(item)    # delegate to the recursive generator
        else:
            yield item

print(list(flatten([1, [2, [3, 4]], 5])))
```

Generators **compose into pipelines**, where each stage pulls from the previous one. Only one item is in flight at a time.

```python
log = """INFO start
ERROR disk full
INFO retry
ERROR disk full
WARN slow
ERROR timeout"""

def read_lines(text):
    for line in text.splitlines():
        yield line

def only(level, lines):
    return (ln for ln in lines if ln.startswith(level))

def message(lines):
    return (ln.split(" ", 1)[1] for ln in lines)

from collections import Counter
errors = message(only("ERROR", read_lines(log)))
print(Counter(errors).most_common())
```

With a real file, `read_lines` becomes `open(path)`. File objects are already lazy line iterators, so the same pipeline handles gigabytes.

## 6. Infinite generators and `itertools`

```python
import itertools as it

def naturals():
    n = 0
    while True:            # infinite, and fine, because it's lazy
        yield n
        n += 1

print(list(it.islice(naturals(), 5)))                 # take the first 5
print(list(it.takewhile(lambda x: x < 20, (n * n for n in naturals()))))
```

| `itertools` function | Example | Result |
|---|---|---|
| `count(start, step)` | `count(10, 5)` | 10, 15, 20, … |
| `cycle(it)` | `cycle("AB")` | A, B, A, B, … |
| `repeat(x, n)` | `repeat(0, 3)` | 0, 0, 0 |
| `islice(it, start, stop, step)` | `islice("abcdef", 1, 5, 2)` | b, d |
| `chain(a, b)` / `chain.from_iterable` | `chain([1], [2, 3])` | 1, 2, 3 |
| `accumulate(it, func)` | `accumulate([1, 2, 3])` | 1, 3, 6 |
| `groupby(it, key)` | consecutive groups | needs **sorted** input to group all equal keys |
| `product(a, b)` | `product("ab", [0, 1])` | a0 a1 b0 b1 |
| `permutations(it, r)` | `permutations("abc", 2)` | ab ac ba bc ca cb |
| `combinations(it, r)` | `combinations("abc", 2)` | ab ac bc |
| `pairwise(it)` (3.10+) | `pairwise([1, 2, 3])` | (1,2), (2,3) |
| `batched(it, n)` (3.12+) | `batched("abcde", 2)` | ab, cd, e |
| `zip_longest(a, b, fillvalue=)` | | pads the shorter one |
| `tee(it, n)` | | n independent copies of one iterator |

```python
import itertools as it
print(list(it.accumulate([3, 1, 4, 1, 5], max)))          # running max
print([(k, len(list(g))) for k, g in it.groupby("aaabccdd")])
print(list(it.batched(range(7), 3)))
print(list(it.pairwise("abcd")))
```

:::trap `groupby` only groups **consecutive** items
`groupby("abab")` yields 4 groups, not 2. Sort by the same key first: `groupby(sorted(data, key=f), key=f)`. Also, each group is an iterator that becomes invalid once you advance to the next group, so convert it to a list immediately if you need it.
:::

## 7. Two-way generators: `send()`

Generators can also **receive** values, which turns them into simple **coroutines**.

```python
def running_avg():
    total = count = 0
    avg = None
    while True:
        x = yield avg          # receive a value, hand out the current average
        total += x
        count += 1
        avg = total / count

g = running_avg()
next(g)                        # "prime" it: run to the first yield
print(g.send(10), g.send(20), g.send(60))
```

Modern async code uses `async def`/`await` instead (see *Pro Python*), but `send` explains how coroutines work under the hood.

## Tricks & tips

- `next(iter(d))` gets the first key of a dict; `next((x for x in xs if p(x)), None)` gets the first match.
- `any()`/`all()` with generator expressions short-circuit, so they can stop after one item.
- `itertools.islice(gen, n)` takes the first n items from anything, even infinite streams.
- `zip(*[iter(xs)] * n)` chunks a list into n-tuples (it drops the remainder). `batched` is clearer.
- `enumerate`, `zip`, `map`, `filter`, `reversed` and `dict.items()` are all lazy.
- `yield from range(n)` is a quick way to delegate to an existing iterable.
- Returning `iter(self.items)` from `__iter__` is the easiest way to make a container class iterable.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Consuming an iterator twice | store as list, or recreate |
| 2 | `len(generator)` → TypeError | `sum(1 for _ in g)` (consumes it!) |
| 3 | `groupby` without sorting | sort by the key first |
| 4 | Generator body not running at all | it only runs when iterated |
| 5 | Printing a generator shows `<generator object …>` | `list(g)` to inspect |
| 6 | Modifying the underlying list while a generator reads it | snapshot first |
| 7 | Raising `StopIteration` inside a generator → `RuntimeError` (PEP 479) | use `return` |
| 8 | Forgetting to prime a `send` coroutine | call `next(g)` first |
| 9 | `tee` caches everything if copies drift apart | use lists if you need random access |
| 10 | Lazy `map` with side effects never runs | consume it, or use a for loop |

## Practice problems

:::problem basic | Fibonacci generator | yield, infinite streams
Write an infinite generator `fib()` and use `itertools.islice` to print the first 10 Fibonacci numbers, then the first Fibonacci number above 1000 (without a list).
:::solution
```python
import itertools as it

def fib():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

print(list(it.islice(fib(), 10)))
print(next(x for x in fib() if x > 1000))
```
:::explain
The generator keeps only `a` and `b` in memory. `islice` stops pulling after 10 items, and `next(...)` stops at the first match. Even though `fib()` is infinite, nothing runs forever because consumers pull only what they need.
:::trace
| next() call | yielded | a, b after |
|---|---|---|
| 1 | 0 | 1, 1 |
| 2 | 1 | 1, 2 |
| 3 | 1 | 2, 3 |
| 4 | 2 | 3, 5 |
| 5 | 3 | 5, 8 |
:::end

:::problem basic | Implement `my_range` | iterator class
Write a class `MyRange(start, stop, step=1)` that behaves like `range` in `for` loops (including negative steps) and can be iterated **multiple times**.
:::solution
```python
class MyRange:
    def __init__(self, start, stop, step=1):
        if step == 0:
            raise ValueError("step must not be zero")
        self.start, self.stop, self.step = start, stop, step
    def __iter__(self):
        i = self.start
        while (i < self.stop) if self.step > 0 else (i > self.stop):
            yield i
            i += self.step

r = MyRange(10, 0, -3)
print(list(r), list(r))
print(list(MyRange(0, 5)), list(MyRange(5, 5)))
```
:::explain
Because `__iter__` is a generator function, every `for` loop gets a **fresh** generator, so the object is re-iterable (the iterable/iterator split). The loop condition flips direction with the sign of `step`, exactly like `range`.
:::end

:::problem basic | Chunked reader | generators, slicing
Write `chunks(seq, n)` yielding consecutive slices of length `n` (the last may be shorter). Then write `chunks_iter(iterable, n)` that works on **any** iterable, including generators, using `itertools.islice`.
:::solution
```python
import itertools as it

def chunks(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]

def chunks_iter(iterable, n):
    it_ = iter(iterable)
    while batch := list(it.islice(it_, n)):
        yield batch

print(list(chunks("abcdefg", 3)))
print(list(chunks_iter((x * x for x in range(7)), 3)))
```
:::explain
`chunks` relies on `len` and slicing, which only sequences support. `chunks_iter` repeatedly takes up to `n` items from the **same** iterator, so each `islice` continues where the last one stopped. The walrus ends the loop when a batch comes back empty. Python 3.12's `itertools.batched` does the same thing.
:::end

:::problem medium | Lazy pipeline over a big "file" | generator pipeline
Simulate a CSV of 1,000,000 rows `id,amount` (generate them lazily). Compute the total and the max `amount` for rows where `id % 7 == 0`, **without** building any list, and show that memory stays tiny.
:::solution
```python
import tracemalloc

def rows(n):
    for i in range(n):
        yield f"{i},{(i * 37) % 1000}"

def parse(lines):
    for line in lines:
        i, amt = line.split(",")
        yield int(i), int(amt)

def total_and_max(records):
    total, best = 0, float("-inf")
    for _, amt in records:
        total += amt
        best = max(best, amt)
    return total, best

tracemalloc.start()
selected = ((i, a) for i, a in parse(rows(1_000_000)) if i % 7 == 0)
print(total_and_max(selected))
current, peak = tracemalloc.get_traced_memory()
print(f"peak memory: {peak / 1024:.1f} KiB")
```
:::explain
Every stage is lazy, so only **one row** exists at any moment. The peak memory is a few KiB, versus tens of megabytes for a list of a million strings. Notice we compute the total and the max in a **single pass**: calling `sum(...)` and `max(...)` separately would need the data twice, which an iterator can't give you.
:::end

:::problem medium | Sliding window averages | deque, generators
Write `moving_average(iterable, k)` that yields the average of each window of `k` consecutive values in O(1) per item (not O(k)).
:::solution
```python
from collections import deque

def moving_average(iterable, k):
    window = deque(maxlen=k)
    total = 0
    for x in iterable:
        if len(window) == k:
            total -= window[0]          # value about to fall out
        window.append(x)                # maxlen auto-drops the oldest
        total += x
        if len(window) == k:
            yield total / k

print(list(moving_average([1, 2, 3, 4, 5, 6], 3)))   # [2.0, 3.0, 4.0, 5.0]
```
:::explain
Keep a running sum: add the new value and subtract the one leaving the window. `deque(maxlen=k)` drops from the left automatically on `append`. Each step is O(1), compared with O(k) for `sum(window)`. This is the **sliding window** pattern, and it works on endless sensor streams.
:::end

:::problem medium | Round-robin merge of iterators | iterators, deque
Write `roundrobin(*iterables)`: `roundrobin("ABC", "D", "EF")` → `A D E B F C`. It must work with iterators of different lengths, including infinite ones (take only a prefix).
:::solution
```python
from collections import deque
import itertools as it

def roundrobin(*iterables):
    queue = deque(iter(x) for x in iterables)
    while queue:
        current = queue.popleft()
        try:
            yield next(current)
        except StopIteration:
            continue                   # exhausted: drop it
        queue.append(current)          # not done: back of the line

print("".join(roundrobin("ABC", "D", "EF")))
print(list(it.islice(roundrobin(it.count(), "xy"), 7)))
```
:::explain
A queue of iterators gives fair rotation: take one item from the front iterator, then send it to the back. Exhausted iterators simply aren't re-queued. Because everything is lazy, an infinite `count()` mixed in is fine as long as the consumer stops.
:::end

:::problem hard | Merge k sorted streams lazily | heapq, generators
Given k **sorted iterators** (possibly huge), yield all their items in sorted order using O(k) memory. Don't use `heapq.merge`, implement it yourself.
:::solution
```python
import heapq

def merge_sorted(*iterables):
    heap = []
    for idx, it_ in enumerate(map(iter, iterables)):
        first = next(it_, None)
        if first is not None:
            heap.append((first, idx, it_))     # idx breaks ties (iterators aren't comparable)
    heapq.heapify(heap)
    while heap:
        val, idx, it_ = heap[0]
        yield val
        nxt = next(it_, None)
        if nxt is None:
            heapq.heappop(heap)
        else:
            heapq.heapreplace(heap, (nxt, idx, it_))

a = iter([1, 4, 9, 12])
b = (x for x in [2, 3, 10])
c = iter(range(0, 20, 5))
print(list(merge_sorted(a, b, c)))
```
:::explain
The heap always holds the **current head** of each stream: at most k entries. Pop the smallest, then push that stream's next item (`heapreplace` does both in one O(log k) step). The `idx` tie-breaker matters: when two values are equal, Python would otherwise compare the iterators and raise `TypeError`. Total cost: O(n log k). This is how external merge sort combines sorted chunks from disk. (The `None` sentinel assumes streams don't contain `None`.)
:::end

:::problem hard | Tree traversal generators | yield from, recursion vs stack
Given a binary tree (`Node(val, left, right)`), write **generator** in-order traversals: one recursive with `yield from`, one iterative with an explicit stack. Use them to check whether two different trees contain the same sorted sequence, **stopping at the first difference**.
:::solution
```python
from itertools import zip_longest

class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def inorder(node):
    if node:
        yield from inorder(node.left)
        yield node.val
        yield from inorder(node.right)

def inorder_iter(node):
    stack = []
    while stack or node:
        while node:                 # go as far left as possible
            stack.append(node)
            node = node.left
        node = stack.pop()
        yield node.val
        node = node.right

def same_sequence(t1, t2):
    sentinel = object()
    return all(a == b for a, b in zip_longest(inorder(t1), inorder_iter(t2), fillvalue=sentinel))

t1 = Node(4, Node(2, Node(1), Node(3)), Node(6, Node(5)))
t2 = Node(3, Node(1, None, Node(2)), Node(5, Node(4), Node(6)))
print(list(inorder(t1)), list(inorder_iter(t2)))
print(same_sequence(t1, t2), same_sequence(t1, Node(1)))
```
:::explain
Both traversals produce values **on demand**. `same_sequence` zips two lazy streams, and `all` stops at the first mismatch, so very different trees are rejected after a few steps without materialising either sequence. `zip_longest` with a unique sentinel catches trees of different sizes, since a plain `zip` would silently stop at the shorter one. The iterative version avoids recursion limits on degenerate (linked-list-shaped) trees.
:::end

:::problem hard | Implement `itertools.groupby` | iterator protocol, laziness
Write `my_groupby(iterable, key=None)` that yields `(key, group_iterator)` pairs for **consecutive** runs, fully lazily (don't build lists of the input). Advancing to the next group must skip any unconsumed items of the previous group.
:::solution
```python
def my_groupby(iterable, key=None):
    key = key or (lambda x: x)
    it_ = iter(iterable)
    _end = object()
    state = {"cur": next(it_, _end)}            # the item we're looking at

    def group(k):
        while state["cur"] is not _end and key(state["cur"]) == k:
            yield state["cur"]
            state["cur"] = next(it_, _end)

    while state["cur"] is not _end:
        k = key(state["cur"])
        g = group(k)
        yield k, g
        for _ in g:                             # drain whatever the caller didn't consume
            pass

print([(k, "".join(g)) for k, g in my_groupby("aaabccdaa")])
print([(k, list(g)) for k, g in my_groupby([1, 3, 2, 4, 5], key=lambda x: x % 2)])
print([k for k, _ in my_groupby("aaabccd")])   # groups never consumed: still correct
```
:::explain
The outer generator and the group generators share one underlying iterator plus a "current item" cell (the dict lets the inner generator rebind it, like `nonlocal`). Each group yields while the key matches. Before moving on, the outer loop **drains** the old group, so a caller that ignores a group (the last print) doesn't break the run boundaries. This mirrors CPython's real implementation and explains why `groupby`'s groups go invalid once you advance.
:::end
