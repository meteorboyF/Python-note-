# Stacks & Queues

**Stacks** (LIFO: last in, first out) and **queues** (FIFO: first in, first out) are the simplest abstract data types, and they power undo buttons, bracket matching, expression evaluation, DFS, BFS, task scheduling and the famous **monotonic stack/deque** interview patterns.

:::analogy Plates and a checkout line
A **stack** is a pile of plates: you add and take from the **top** only. The last plate washed is the first one used. A **queue** is a checkout line: people join at the **back** and are served from the **front**. A **deque** is a line where people can also join or leave at either end.
:::

## 1. Mental models

| | Stack (LIFO) | Queue (FIFO) |
|---|---|---|
| Add | `push` (top) | `enqueue` (back) |
| Remove | `pop` (top) | `dequeue` (front) |
| Peek | top | front |
| Python | `list` (`append`/`pop`) | `collections.deque` (`append`/`popleft`) |
| Used in | undo, call stack, DFS, parsing | BFS, scheduling, buffering, streaming |

```text
STACK                 QUEUE
push 1,2,3            enqueue 1,2,3
 │ 3 │ ← top           front → [1][2][3] ← back
 │ 2 │                 dequeue → 1
 │ 1 │                 
 pop → 3
```

## 2. Stack with a Python list

```python
stack = []
stack.append("a")          # push O(1)
stack.append("b")
stack.append("c")
print(stack[-1])           # peek O(1)
print(stack.pop())         # pop O(1) -> 'c'
print(stack, len(stack), bool(stack))
```

```python
class Stack:
    def __init__(self):
        self._items = []
    def push(self, x):
        self._items.append(x)
    def pop(self):
        if not self._items:
            raise IndexError("pop from empty stack")
        return self._items.pop()
    def peek(self):
        if not self._items:
            raise IndexError("peek at empty stack")
        return self._items[-1]
    def __len__(self):
        return len(self._items)
    def __bool__(self):
        return bool(self._items)
    def __repr__(self):
        return f"Stack({self._items})  <- top"

s = Stack()
for x in "abc":
    s.push(x)
print(s, s.pop(), s.peek(), len(s))
```

## 3. Classic stack algorithms

### Balanced brackets

```python
def balanced(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack            # leftovers mean unclosed brackets

for s in ["([]{})", "([)]", "((", "", "a(b)c"]:
    print(repr(s), balanced(s))
```

### Evaluate postfix (Reverse Polish Notation)

```python
def eval_rpn(tokens):
    stack = []
    ops = {"+": lambda a, b: a + b, "-": lambda a, b: a - b,
           "*": lambda a, b: a * b, "/": lambda a, b: int(a / b)}   # truncate toward 0
    for t in tokens:
        if t in ops:
            b, a = stack.pop(), stack.pop()      # order matters!
            stack.append(ops[t](a, b))
        else:
            stack.append(int(t))
    return stack[0]

print(eval_rpn("2 1 + 3 *".split()), eval_rpn("4 13 5 / +".split()))
```

### Infix → postfix (shunting-yard)

```python
def to_postfix(expr):
    prec = {"+": 1, "-": 1, "*": 2, "/": 2, "^": 3}
    right_assoc = {"^"}
    out, ops = [], []
    for tok in expr.split():
        if tok.isalnum():
            out.append(tok)
        elif tok == "(":
            ops.append(tok)
        elif tok == ")":
            while ops[-1] != "(":
                out.append(ops.pop())
            ops.pop()
        else:
            while (ops and ops[-1] != "(" and
                   (prec[ops[-1]] > prec[tok] or (prec[ops[-1]] == prec[tok] and tok not in right_assoc))):
                out.append(ops.pop())
            ops.append(tok)
    while ops:
        out.append(ops.pop())
    return " ".join(out)

print(to_postfix("a + b * c"), "|", to_postfix("( a + b ) * c"), "|", to_postfix("a ^ b ^ c"))
```

### DFS with an explicit stack

```python
graph = {"A": ["B", "C"], "B": ["D"], "C": ["D", "E"], "D": [], "E": ["A"]}
def dfs(start):
    seen, order, stack = set(), [], [start]
    while stack:
        node = stack.pop()
        if node in seen:
            continue
        seen.add(node)
        order.append(node)
        stack.extend(reversed(graph[node]))   # reversed: visit neighbours in listed order
    return order
print(dfs("A"))
```

## 4. Queues: why not `list`?

```python
import timeit
setup = "from collections import deque; L = list(range(50000)); D = deque(L)"
print("list.pop(0):    ", round(timeit.timeit("L.pop(0); L.append(0)", setup, number=20000), 4), "s")
print("deque.popleft():", round(timeit.timeit("D.popleft(); D.append(0)", setup, number=20000), 4), "s")
```

`list.pop(0)` shifts every remaining element left: O(n). `deque` is a doubly linked list of blocks with **O(1)** operations at both ends.

```python
from collections import deque
q = deque()
q.append("first"); q.append("second"); q.append("third")   # enqueue at the back
print(q.popleft(), q.popleft(), q)                          # dequeue from the front
```

## 5. `collections.deque`, a complete guide

```python
from collections import deque
d = deque([1, 2, 3], maxlen=5)
d.append(4); d.appendleft(0)                # both ends, O(1)
print(d, d[0], d[-1])                        # indexing the ends is O(1) (the middle is O(n))
d.append(5)                                  # maxlen 5: the OLDEST item falls out the other side
print(d)
d.rotate(2); print(d)                        # rotate right by 2
d.rotate(-2); print(d)
d.extendleft([10, 11]); print(d)             # note: extendleft reverses the order
print(d.pop(), d.popleft(), d.count(3), len(d))
```

| Method | Cost |
|---|---|
| `append`, `appendleft`, `pop`, `popleft` | O(1) |
| `extend`, `extendleft` | O(k) |
| `rotate(k)` | O(k) |
| `d[i]` (middle) | O(n) |
| `maxlen=` | a bounded buffer that auto-discards the oldest items |

## 6. The `queue` module: thread-safe queues

:::note Run this one locally
The in-browser Python (Pyodide) can't start threads, so copy this example and run it on your machine.
:::

```python norun
import queue, threading
q = queue.Queue()
results = []
def worker():
    while True:
        item = q.get()
        if item is None:
            break
        results.append(item * item)
        q.task_done()
t = threading.Thread(target=worker)
t.start()
for i in range(5):
    q.put(i)
q.join()          # wait until every item is processed
q.put(None)       # sentinel: tell the worker to stop
t.join()
print(sorted(results))
pq = queue.PriorityQueue()
for p, task in [(3, "low"), (1, "urgent"), (2, "normal")]:
    pq.put((p, task))
print([pq.get()[1] for _ in range(3)])
```

Use `queue.Queue`/`LifoQueue`/`PriorityQueue` only for **producer-consumer threading**. They add locking overhead. For single-threaded algorithms, use `deque` and `heapq`.

## 7. Queue algorithms: BFS

```python
from collections import deque

def shortest_path(grid, start, goal):
    R, C = len(grid), len(grid[0])
    q = deque([(start, 0)])
    seen = {start}
    while q:
        (r, c), dist = q.popleft()
        if (r, c) == goal:
            return dist
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == "." and (nr, nc) not in seen:
                seen.add((nr, nc))             # mark when ENQUEUED, not when popped
                q.append(((nr, nc), dist + 1))
    return -1

maze = ["..#.",
        ".##.",
        "....",
        "#.#."]
print(shortest_path(maze, (0, 0), (0, 3)))
```

:::tip BFS finds shortest paths in unweighted graphs
A queue processes nodes in order of distance: everything at distance 1, then 2, and so on. So the first time you reach the goal, you've found the shortest path. Mark nodes as seen **when you enqueue them**, or the same node gets queued many times.
:::

## 8. Monotonic stack

A **monotonic stack** keeps its elements in increasing (or decreasing) order by **popping** anything that breaks the order before pushing. It solves "next greater / previous smaller element" problems in O(n).

```python
def next_greater(nums):
    res = [-1] * len(nums)
    stack = []                         # indices whose next-greater is unknown (values decreasing)
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:
            res[stack.pop()] = x       # x is the next greater for those indices
        stack.append(i)
    return res

print(next_greater([2, 1, 2, 4, 3]))   # [4, 2, 4, -1, -1]
```

:::trace
`[2, 1, 2, 4, 3]`:
| i | x | pops (resolved) | stack (values) |
|---|---|---|---|
| 0 | 2 | — | [2] |
| 1 | 1 | — | [2, 1] |
| 2 | 2 | 1 → 2 | [2, 2] |
| 3 | 4 | 2 → 4, 2 → 4 | [4] |
| 4 | 3 | — | [4, 3] → leftovers get -1 |
:::

## 9. Monotonic deque: sliding window maximum

```python
from collections import deque
def window_max(nums, k):
    dq, out = deque(), []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] == i - k:
            dq.popleft()
        if i >= k - 1:
            out.append(nums[dq[0]])
    return out
print(window_max([1, 3, -1, -3, 5, 3, 6, 7], 3))
```

## 10. Performance and choices

| Structure | push/append | pop end | pop front | peek | Thread-safe |
|---|---|---|---|---|---|
| `list` | O(1)* | O(1) | **O(n)** | O(1) | no |
| `deque` | O(1) | O(1) | O(1) | O(1) ends | append/pop are atomic |
| `queue.Queue` | O(1) + lock | — | O(1) + lock | — | yes |
| `heapq` | O(log n) | — | min O(log n) | O(1) | no |

## 11. ML use cases

```python
from collections import deque
losses = [2.1, 1.7, 1.5, 1.6, 1.2, 1.25, 1.1, 1.15, 1.12]
window = deque(maxlen=3)
smoothed = []
for l in losses:
    window.append(l)
    smoothed.append(round(sum(window) / len(window), 3))   # moving-average loss curve
print(smoothed)

best, patience, bad = float("inf"), 2, 0
for epoch, l in enumerate(losses):
    if l < best - 1e-3:
        best, bad = l, 0
    else:
        bad += 1
        if bad >= patience:
            print("early stopping at epoch", epoch)
            break
```

## Tricks & tips

- A plain `list` is the right stack. `deque` is the right queue.
- `deque(maxlen=n)` gives you the last n items of any stream: `deque(open(f), maxlen=10)` is `tail`.
- In BFS, mark nodes as visited when enqueuing them.
- Process level by level in BFS with `for _ in range(len(q)):`.
- Monotonic stack: "next greater" means pop while the top < the current value, and keep **indices**, not values.
- Recursion is an implicit stack. Convert deep recursion to an explicit stack to avoid `RecursionError`.

## The 10 most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | `list.pop(0)` / `insert(0, x)` as a queue | `deque` |
| 2 | Popping an empty stack | check `if stack` |
| 3 | Operand order in RPN (`b, a = pop(), pop()`) | the second pop is the left operand |
| 4 | BFS marking visited at pop time | mark at push time |
| 5 | Forgetting the leftover check in bracket matching | `return not stack` |
| 6 | `extendleft` reverses its input | reverse first if needed |
| 7 | `deque[i]` in the middle is O(n) | use a list for random access |
| 8 | `queue.Queue` in single-threaded code (slow) | `deque` |
| 9 | Storing values instead of indices in a monotonic stack | store indices |
| 10 | Thread consumers never stopping | sentinel `None` + `join` |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
from collections import deque
d = deque([1, 2, 3], maxlen=3)
d.append(4)
d.appendleft(0)
print(list(d))
```
What prints?
- [ ] `[0, 1, 2, 3, 4]`
- [x] `[0, 2, 3]`
- [ ] `[1, 2, 3]`
With `maxlen`, adding to one end silently drops from the **other**. `append(4)` drops 1, giving `[2, 3, 4]`, then `appendleft(0)` drops 4, giving `[0, 2, 3]`.
:::

:::quiz
```python norun
stack = [1, 2, 3]
queue = [1, 2, 3]
print(stack.pop(), queue.pop(0), stack, queue)
```
What prints?
- [x] `3 1 [1, 2] [2, 3]`
- [ ] `1 3 [2, 3] [1, 2]`
- [ ] `3 3 [1, 2] [1, 2]`
`pop()` removes from the end (stack, LIFO), and `pop(0)` from the front (queue, FIFO). But `pop(0)` is **O(n)** because every element shifts, so use `deque.popleft()` for real queues.
:::

:::quiz
```python norun
def f(s):
    st = []
    for ch in s:
        if st and st[-1] == ch:
            st.pop()
        else:
            st.append(ch)
    return "".join(st)
print(f("abbaca"), f("aabb"), f("abc"))
```
What prints?
- [x] `ca  abc` (an empty string in the middle)
- [ ] `aca ab abc`
- [ ] `ca ab abc`
Each character either cancels the matching top of the stack or is pushed. `"abbaca"` → `bb` cancels, then `aa` cancels, leaving `"ca"`. `"aabb"` cancels completely, so the middle value is an empty string.
:::

## Practice problems

:::problem basic | Min stack in O(1) | auxiliary stack
Design a stack supporting `push`, `pop`, `top` and `get_min`, all O(1) (LeetCode 155).
:::solution
```python
class MinStack:
    def __init__(self):
        self.stack = []            # (value, current min) pairs
    def push(self, x):
        cur_min = min(x, self.stack[-1][1]) if self.stack else x
        self.stack.append((x, cur_min))
    def pop(self):
        return self.stack.pop()[0]
    def top(self):
        return self.stack[-1][0]
    def get_min(self):
        return self.stack[-1][1]

s = MinStack()
for x in [5, 3, 7, 3, 1]:
    s.push(x)
print(s.get_min(), s.pop(), s.get_min(), s.pop(), s.pop(), s.get_min())
```
:::explain
Each entry remembers the minimum **at the moment it was pushed**. Popping restores the previous minimum automatically, with no searching. The cost is extra memory: one extra number per element.
:::end

:::problem basic | Implement a queue with two stacks | amortised analysis
Build `MyQueue` using only two lists used as stacks, with amortised O(1) `push`, `pop` and `peek` (LeetCode 232).
:::solution
```python
class MyQueue:
    def __init__(self):
        self.inbox, self.outbox = [], []
    def push(self, x):
        self.inbox.append(x)
    def _shift(self):
        if not self.outbox:
            while self.inbox:
                self.outbox.append(self.inbox.pop())   # reverse the order once
    def pop(self):
        self._shift()
        return self.outbox.pop()
    def peek(self):
        self._shift()
        return self.outbox[-1]
    def empty(self):
        return not self.inbox and not self.outbox

q = MyQueue()
for x in [1, 2, 3]:
    q.push(x)
print(q.pop(), q.peek())
q.push(4)
print(q.pop(), q.pop(), q.pop(), q.empty())
```
:::explain
Pushing goes to `inbox`. When we need the front, we pour `inbox` into `outbox`, which reverses it so the oldest item is on top. Each element moves at most **twice** in its lifetime, so the operations are amortised O(1), even though a single `pop` can be O(n).
:::end

:::problem basic | Remove adjacent duplicates | stack as a string builder
Repeatedly remove adjacent equal pairs: `"abbaca"` → `"ca"` (LeetCode 1047).
:::solution
```python
def remove_dups(s):
    stack = []
    for ch in s:
        if stack and stack[-1] == ch:
            stack.pop()           # cancels with the previous character
        else:
            stack.append(ch)
    return "".join(stack)

print(remove_dups("abbaca"), remove_dups("azxxzy"))
```
:::explain
The stack's top is always the last surviving character. A match cancels both, which can expose a new pair (`a bb a` → `aa` → gone), and that's handled naturally. O(n), compared with repeated `str.replace` scans in O(n²).
:::end

:::problem medium | Daily temperatures | monotonic stack
For each day, how many days until a warmer temperature (0 if none)? (LeetCode 739)
:::solution
```python
def daily_temperatures(t):
    ans = [0] * len(t)
    stack = []                       # indices with decreasing temperatures
    for i, temp in enumerate(t):
        while stack and t[stack[-1]] < temp:
            j = stack.pop()
            ans[j] = i - j
        stack.append(i)
    return ans

print(daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]))
```
:::explain
This is "next greater element", but we store the **distance**. Each index is pushed and popped at most once: O(n). Step through it with the visualiser to watch the stack grow on cooling days and collapse when a warm day arrives.
:::end

:::problem medium | Rotting oranges | multi-source BFS
In a grid, 2 = rotten, 1 = fresh, 0 = empty. Each minute, rot spreads to 4-neighbours. Return the minutes until no fresh orange remains, or -1 (LeetCode 994).
:::solution
```python
from collections import deque

def oranges(grid):
    R, C = len(grid), len(grid[0])
    q = deque((r, c) for r in range(R) for c in range(C) if grid[r][c] == 2)
    fresh = sum(row.count(1) for row in grid)
    minutes = 0
    while q and fresh:
        for _ in range(len(q)):                     # process one "minute" (level)
            r, c = q.popleft()
            for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
                if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 1:
                    grid[nr][nc] = 2
                    fresh -= 1
                    q.append((nr, nc))
        minutes += 1
    return minutes if fresh == 0 else -1

print(oranges([[2, 1, 1], [1, 1, 0], [0, 1, 1]]), oranges([[2, 1, 1], [0, 1, 1], [1, 0, 1]]), oranges([[0, 2]]))
```
:::explain
**Multi-source BFS**: start with *all* rotten oranges in the queue at once. `for _ in range(len(q))` processes exactly one level, which is one minute. Counting the fresh oranges lets us stop early and detect unreachable ones. O(R·C).
:::end

:::problem medium | Simplify a Unix path | stack of path parts
Simplify an absolute path: `"/a/./b/../../c/"` → `"/c"` (LeetCode 71).
:::solution
```python
def simplify(path):
    stack = []
    for part in path.split("/"):
        if part == "..":
            if stack:
                stack.pop()
        elif part and part != ".":
            stack.append(part)
    return "/" + "/".join(stack)

for p in ["/a/./b/../../c/", "/../", "/home//foo/", "/a/../../b/../c//.//"]:
    print(p, "->", simplify(p))
```
:::explain
Splitting on `/` produces empty strings for `//` and for leading/trailing slashes, and those are skipped, as is `.`. `..` pops a directory (if any). The stack holds the current path from the root.
:::end

:::problem hard | Largest rectangle in a histogram | monotonic stack
Find the area of the largest rectangle in a histogram (LeetCode 84) in O(n).
:::solution
```python
def largest_rectangle(heights):
    stack = []                       # indices with increasing heights
    best = 0
    for i, h in enumerate(heights + [0]):        # the sentinel 0 flushes the stack at the end
        while stack and heights[stack[-1]] > h:
            height = heights[stack.pop()]
            left = stack[-1] + 1 if stack else 0  # the first bar taller-or-equal on the left
            best = max(best, height * (i - left))
        stack.append(i)
    return best

print(largest_rectangle([2, 1, 5, 6, 2, 3]), largest_rectangle([2, 4]), largest_rectangle([6, 2, 5, 4, 5, 1, 6]))
```
:::explain
For each bar, the widest rectangle using its full height extends left to the previous **shorter** bar and right to the next **shorter** bar. An increasing stack gives both at once: when bar `i` is shorter than the top, the top's right boundary is `i`, and its left boundary is the new top after popping. The trailing `0` forces every remaining bar to be evaluated. O(n).
:::trace
`[2, 1, 5, 6, 2, 3]`, key pops:
| i (h) | popped (height) | width | area |
|---|---|---|---|
| 1 (1) | 2 | 1 | 2 |
| 4 (2) | 6 | 1 | 6 |
| 4 (2) | 5 | 2 | **10** |
| 6 (0) | 3, 2, 1 | 1, 4, 6 | 3, 8, 6 |
:::end

:::problem hard | Basic calculator with parentheses and unary minus | stack of contexts
Evaluate a string with `+`, `-`, parentheses, spaces and unary minus, like `"-(2 + 3) - (4 - (1 + 1))"` (LeetCode 224), in O(n) without `eval`.
:::solution
```python
def calculate(s):
    result, sign, num = 0, 1, 0
    stack = []                                  # saves (result, sign) at each '('
    for ch in s:
        if ch.isdigit():
            num = num * 10 + int(ch)
        elif ch in "+-":
            result += sign * num
            num, sign = 0, (1 if ch == "+" else -1)
        elif ch == "(":
            stack.append((result, sign))
            result, sign = 0, 1
        elif ch == ")":
            result += sign * num
            num = 0
            prev_result, prev_sign = stack.pop()
            result = prev_result + prev_sign * result
    return result + sign * num

for e in ["1 + 1", " 2-1 + 2 ", "(1+(4+5+2)-3)+(6+8)", "-(2 + 3) - (4 - (1 + 1))"]:
    print(f"{e!r:30} = {calculate(e)}")
```
:::explain
With only `+` and `-`, every number is just added with a sign. Parentheses create a sub-expression whose result must be multiplied by the sign in front of it and added to the outer result, so on `(` we **save** the outer state and start fresh. On `)` we combine. Unary minus works naturally: a leading `-` sets `sign = -1` for whatever follows. (Like LeetCode 224, this assumes two operators never appear in a row. Supporting `- -1` would need `sign *= -1` handling.) This is the same context-saving idea as recursion, made explicit.
:::end

:::problem hard | Sliding window minimum and maximum together | two monotonic deques
For each window of size `k`, return `max - min`, and find the longest subarray where `max - min <= limit` (LeetCode 1438), both in O(n).
:::solution
```python
from collections import deque

def window_ranges(nums, k):
    maxq, minq, out = deque(), deque(), []
    for i, x in enumerate(nums):
        while maxq and nums[maxq[-1]] <= x: maxq.pop()
        while minq and nums[minq[-1]] >= x: minq.pop()
        maxq.append(i); minq.append(i)
        if maxq[0] <= i - k: maxq.popleft()
        if minq[0] <= i - k: minq.popleft()
        if i >= k - 1:
            out.append(nums[maxq[0]] - nums[minq[0]])
    return out

def longest_within_limit(nums, limit):
    maxq, minq = deque(), deque()
    left = best = 0
    for right, x in enumerate(nums):
        while maxq and maxq[-1] < x: maxq.pop()
        while minq and minq[-1] > x: minq.pop()
        maxq.append(x); minq.append(x)
        while maxq[0] - minq[0] > limit:          # shrink until valid
            if nums[left] == maxq[0]: maxq.popleft()
            if nums[left] == minq[0]: minq.popleft()
            left += 1
        best = max(best, right - left + 1)
    return best

print(window_ranges([1, 3, -1, -3, 5, 3, 6, 7], 3))
print(longest_within_limit([8, 2, 4, 7], 4), longest_within_limit([10, 1, 2, 4, 7, 2], 5))
```
:::explain
A decreasing deque tracks the window maximum and an increasing deque tracks the minimum, and each element is pushed and popped at most once per deque: O(n). In the variable-size version, the second solution stores **values** (not indices) and removes the front only when the value leaving the window equals it. That works because equal values are kept (`<` and `>`, not `<=`), so duplicates are popped one at a time.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Valid parentheses | LeetCode 20 | https://leetcode.com/problems/valid-parentheses/
A string of `()[]{}` is valid if every bracket is closed by the same type, in the correct order.
:::starter
```python norun
def is_valid(s):
    pass
```
:::tests
```python norun
assert is_valid("()") and is_valid("()[]{}") and is_valid("{[()]}") and is_valid("")
assert not is_valid("(]") and not is_valid("([)]") and not is_valid("((") and not is_valid("]")
```
:::solution
```python
def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)
    return not stack                 # leftovers mean unclosed brackets

print(is_valid("{[()]}"), is_valid("([)]"), is_valid("(("))
```
:::explain
The most recently opened bracket must be closed first, which is exactly **LIFO**, so a stack. The dict maps each closer to its opener. Two failure modes: a closer with an empty or mismatched stack, and openers left over at the end (`return not stack`).
:::trace
`"{[()]}"`:
| ch | action | stack |
|---|---|---|
| { | push | { |
| [ | push | {[ |
| ( | push | {[( |
| ) | pop ( ✓ | {[ |
| ] | pop [ ✓ | { |
| } | pop { ✓ | empty → **True** |
:::complexity
O(n).
:::end

:::program basic | Baseball game | LeetCode 682 | https://leetcode.com/problems/baseball-game/
Process operations: an integer records a score, `"+"` records the sum of the previous two, `"D"` records double the previous score, and `"C"` cancels the previous score. Return the total.
:::starter
```python norun
def cal_points(operations):
    pass
```
:::tests
```python norun
assert cal_points(["5", "2", "C", "D", "+"]) == 30
assert cal_points(["5", "-2", "4", "C", "D", "9", "+", "+"]) == 27
assert cal_points(["1", "C"]) == 0
```
:::solution
```python
def cal_points(operations):
    stack = []
    for op in operations:
        if op == "+":
            stack.append(stack[-1] + stack[-2])
        elif op == "D":
            stack.append(2 * stack[-1])
        elif op == "C":
            stack.pop()
        else:
            stack.append(int(op))
    return sum(stack)

print(cal_points(["5", "2", "C", "D", "+"]))
```
:::explain
Every operation looks at, or undoes, the **most recent** scores, so a stack is the natural structure. `stack[-1]` and `stack[-2]` peek without popping. Note that `int("-2")` handles negative scores, which is why the number branch goes last.
:::complexity
O(n).
:::end

:::program medium | Asteroid collision | LeetCode 735 | https://leetcode.com/problems/asteroid-collision/
Positive asteroids move right and negative ones move left. When a right-mover meets a left-mover, the smaller one explodes, and if they're the same size both explode. Return the final state.
:::starter
```python norun
def asteroid_collision(asteroids):
    pass
```
:::tests
```python norun
assert asteroid_collision([5, 10, -5]) == [5, 10]
assert asteroid_collision([8, -8]) == []
assert asteroid_collision([10, 2, -5]) == [10]
assert asteroid_collision([-2, -1, 1, 2]) == [-2, -1, 1, 2]
assert asteroid_collision([1, -2, -2, -2]) == [-2, -2, -2]
```
:::hint
Push each asteroid. A collision only happens when the stack top is **positive** and the new one is **negative**. Use a `while` loop, because one big left-mover can destroy several asteroids.
:::solution
```python
def asteroid_collision(asteroids):
    stack = []
    for a in asteroids:
        alive = True
        while alive and a < 0 and stack and stack[-1] > 0:
            if stack[-1] < -a:
                stack.pop()               # the top explodes; keep checking
            elif stack[-1] == -a:
                stack.pop()               # both explode
                alive = False
            else:
                alive = False             # the incoming asteroid explodes
        if alive:
            stack.append(a)
    return stack

print(asteroid_collision([10, 2, -5]), asteroid_collision([5, 10, -5]))
```
:::explain
The stack holds the survivors so far, in order. Only a left-mover arriving after right-movers can collide, and it fights the **nearest** right-mover first (the stack top). The inner `while` keeps resolving collisions until this asteroid dies or the threat is gone. Each asteroid is pushed and popped at most once: O(n).
:::trace
`[10, 2, -5]`:
| a | stack top | result | stack |
|---|---|---|---|
| 10 | — | push | [10] |
| 2 | 10 | push | [10, 2] |
| -5 | 2 < 5 | pop 2 | [10] |
| -5 | 10 > 5 | -5 explodes | [10] |
:::complexity
O(n).
:::end

:::program hard | Longest valid parentheses | LeetCode 32 | https://leetcode.com/problems/longest-valid-parentheses/
Return the length of the longest **well-formed** parentheses substring: `")()())"` → 4.
:::starter
```python norun
def longest_valid_parentheses(s):
    pass
```
:::tests
```python norun
assert longest_valid_parentheses("(()") == 2
assert longest_valid_parentheses(")()())") == 4
assert longest_valid_parentheses("") == 0
assert longest_valid_parentheses("()(()") == 2
assert longest_valid_parentheses("()(())") == 6
assert longest_valid_parentheses("(()())") == 6
```
:::hint
Push **indices**. Seed the stack with -1 as a "base" (the index before the current valid run). On `)`, pop. If the stack becomes empty, push the current index as the new base. Otherwise the current valid length is `i - stack[-1]`.
:::solution
```python
def longest_valid_parentheses(s):
    stack = [-1]                       # base: the index just before the current valid run
    best = 0
    for i, ch in enumerate(s):
        if ch == "(":
            stack.append(i)
        else:
            stack.pop()
            if not stack:
                stack.append(i)        # an unmatched ')' becomes the new base
            else:
                best = max(best, i - stack[-1])
    return best

print(longest_valid_parentheses(")()())"), longest_valid_parentheses("()(())"))
```
:::explain
Storing **indices** (not characters) lets us measure lengths. After popping a matched `(`, the new top is the last index that is *not* part of the current valid substring, so `i - top` is the current run length. An unmatched `)` breaks every run, so it becomes the new base. This is the stack version. A two-pass counter solution with O(1) space also exists.
:::trace
`")()())"`:
| i | ch | action | stack | best |
|---|---|---|---|---|
| 0 | ) | pop -1 → empty, push 0 | [0] | 0 |
| 1 | ( | push | [0, 1] | 0 |
| 2 | ) | pop → top 0 | [0] | 2 |
| 3 | ( | push | [0, 3] | 2 |
| 4 | ) | pop → top 0 | [0] | **4** |
| 5 | ) | pop → empty, push 5 | [5] | 4 |
:::complexity
O(n) time and space.
:::end
