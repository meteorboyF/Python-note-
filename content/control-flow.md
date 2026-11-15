# Control Flow

**Control flow** is the order in which lines run. Without it, a program runs top to bottom exactly once. With it, a program can **choose** (`if`), **repeat** (`for`, `while`), **skip** (`continue`), **stop early** (`break`) and **dispatch on the shape of data** (`match`).

:::analogy A recipe with decisions
A recipe says *"if the dough is sticky, add flour; knead until smooth; for each cookie on the tray, add a chocolate chip"*. Those three phrases are exactly `if`, `while` and `for`. Indentation in Python is the recipe's bullet nesting. It's **part of the syntax**, not decoration.
:::

**What you'll learn**: `if/elif/else` and truthiness, the conditional expression, `for` loops over any **iterable**, `range`, `enumerate`, `zip`, `while` loops, `break`/`continue`/`pass`, the little-known `for … else`, `match`/`case` structural pattern matching (3.10+), and loop patterns used everywhere in interviews.

## 1. `if` / `elif` / `else`

```python
score = 82
if score >= 90:
    grade = "A"
elif score >= 80:          # checked only if the first test failed
    grade = "B"
elif score >= 70:
    grade = "C"
else:
    grade = "F"
print(grade)
```

- Conditions are tested **top to bottom**. The **first** true branch runs and the rest are skipped.
- Conditions don't need to be booleans. Any object is tested for **truthiness**.
- **Indentation** (4 spaces by convention) defines the block. Mixing tabs and spaces raises `TabError`.

:::tip Guard clauses: flatten deep nesting
Instead of nesting 4 `if`s deep, **return early** for bad cases:
```python norun
def process(order):
    if order is None:
        return "no order"
    if not order.items:
        return "empty"
    if order.paid is False:
        return "unpaid"
    return ship(order)      # the happy path, un-indented
```
:::

### The conditional expression (ternary)

```python
n = -3
abs_n = n if n >= 0 else -n
parity = "even" if n % 2 == 0 else "odd"
print(abs_n, parity)
```

## 2. `for` loops iterate over **iterables**

Python's `for` isn't a counter loop like C's `for (i=0; i<n; i++)`. It's a **for-each** loop: it asks the object for an **iterator** and calls `next()` until it's exhausted. Lists, strings, tuples, dicts, sets, files, `range`, generators: all are **iterables**.

```python
for ch in "abc":
    print(ch, end=" ")
print()
for key in {"x": 1, "y": 2}:          # iterating a dict gives KEYS
    print(key, end=" ")
print()
for k, v in {"x": 1, "y": 2}.items():  # key-value pairs
    print(k, v)
```

### `range(start, stop, step)`

```python
print(list(range(5)))            # [0, 1, 2, 3, 4]     stop is EXCLUSIVE
print(list(range(2, 10, 3)))     # [2, 5, 8]
print(list(range(10, 0, -2)))    # [10, 8, 6, 4, 2]   counting down
print(range(10**12)[-1])         # range is lazy: no giant list is built
```

:::term Iterable vs iterator
An **iterable** can *produce* an iterator (`iter(obj)`): it's the box of cookies. An **iterator** hands out the next item (`next(it)`) and remembers its position: it's your hand taking one cookie at a time. A list is iterable but not an iterator, and you can loop over it many times. A generator is an iterator, so it's used up after one pass. More in *Iterators & Generators*.
:::

### `enumerate` and `zip`, the two loop superpowers

```python
fruits = ["apple", "banana", "cherry"]
for i, fruit in enumerate(fruits, start=1):   # index + value, no range(len(...))
    print(i, fruit)

prices = [1.2, 0.5, 3.0]
for fruit, price in zip(fruits, prices):      # walk lists in parallel
    print(f"{fruit}: ${price}")

print(list(zip("ab", [1, 2, 3])))            # stops at the SHORTEST: [('a', 1), ('b', 2)]
```

:::trap `range(len(xs))` is a code smell
`for i in range(len(xs)): print(xs[i])` works, but it's un-Pythonic and error-prone. Use `for x in xs`, or `enumerate(xs)` if you need the index. Use `zip(a, b)` to walk two lists together, and pass `strict=True` (3.10+) to get an error when their lengths differ.
:::

## 3. `while` loops

Use `while` when you **don't know in advance** how many iterations you need.

```python
n = 27
steps = 0
while n != 1:                     # Collatz sequence
    n = n // 2 if n % 2 == 0 else 3 * n + 1
    steps += 1
print("steps:", steps)
```

:::trap Infinite loops
If nothing inside the loop moves you toward the exit condition, it never ends. Before writing a `while`, ask: *what changes each iteration, and why does it eventually make the condition false?* (The visualiser stops after 1200 steps, so try it.)
:::

## 4. `break`, `continue`, `pass`

| Keyword | Effect |
|---|---|
| `break` | Leave the **innermost** loop immediately |
| `continue` | Skip the rest of this iteration and go to the next one |
| `pass` | Do nothing (a placeholder where a statement is required) |

```python
for n in [3, -1, 7, 0, 5]:
    if n < 0:
        continue            # skip negatives
    if n == 0:
        break               # stop at the first zero
    print(n)
```

## 5. `for … else` and `while … else`

The `else` block runs **only if the loop finished without hitting `break`**. Think of it as **"no break"**.

```python
def find_divisor(n):
    for d in range(2, int(n ** 0.5) + 1):
        if n % d == 0:
            print(n, "is divisible by", d)
            break
    else:                        # runs only when no break happened
        print(n, "is prime")

find_divisor(91)
find_divisor(97)
```

:::boss When to use loop-else
It replaces the "flag variable" pattern (`found = False; … if not found:`). It's perfect for searches: *loop looking for X; break when found; else handle "not found"*. Some teams avoid it because it's unfamiliar, so add a `# no break` comment.
:::

:::quiz
```python norun
for i in range(3):
    pass
else:
    print("done", i)
```
What is printed?
- [x] `done 2`
- [ ] Nothing, because `else` belongs to `if`
- [ ] `done 3`
The loop ends normally (no `break`), so `else` runs. The loop variable **keeps its last value** after the loop, which is `2`. (Loop variables "leak" into the surrounding scope in Python.)
:::

## 6. `match` / `case`: structural pattern matching (3.10+)

`match` is far more than a C-style `switch`. It can **destructure** sequences, dicts and objects, bind names, and add guards.

```python
def describe(cmd):
    match cmd:
        case "quit" | "exit":                 # OR pattern
            return "bye"
        case ["go", direction]:               # sequence pattern + capture
            return f"moving {direction}"
        case ["take", *items] if items:       # star capture + guard
            return f"taking {', '.join(items)}"
        case {"type": "click", "x": x, "y": y}:   # mapping pattern
            return f"click at ({x}, {y})"
        case int(n) if n < 0:                 # class pattern + guard
            return "negative int"
        case _:                               # wildcard (default)
            return "unknown"

for c in ["quit", ["go", "north"], ["take", "key", "map"], {"type": "click", "x": 3, "y": 4}, -5, 3.14]:
    print(repr(c), "->", describe(c))
```

:::trap Capture vs constant
`case RED:` doesn't compare with a variable named `RED`. It **captures** anything into a new name `RED` (and matches everything!). To compare with a constant, use a dotted name: `case Color.RED:` or `case config.LIMIT:`.
:::

## 7. Common loop patterns

```python
nums = [4, 9, 1, 7, 3]

total = 0                     # accumulator
for x in nums:
    total += x

best = nums[0]                # running max
for x in nums[1:]:
    if x > best:
        best = x

count_odd = sum(1 for x in nums if x % 2)   # counting with a generator
first_big = next((x for x in nums if x > 5), None)   # first match or default

print(total, best, count_odd, first_big)
```

Nested loops & breaking out of both:

```python
grid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
target = 5

def find(grid, target):          # cleanest way to exit nested loops: return
    for r, row in enumerate(grid):
        for c, val in enumerate(row):
            if val == target:
                return r, c
    return None

print(find(grid, target))
```

:::trap Modifying a list while looping over it
`for x in xs: if bad(x): xs.remove(x)` **skips elements**, because the indices shift under the iterator. Build a new list (`xs = [x for x in xs if not bad(x)]`), or iterate over a copy (`for x in xs[:]`). For dicts, changing the size during iteration raises `RuntimeError`.
:::

```python
xs = [1, 2, 2, 3, 2, 4]
for x in xs:
    if x == 2:
        xs.remove(x)
print(xs)        # [1, 3, 2, 4]  <- one 2 survived!
```

Step through that block with the visualiser to *see* the skip.

## Tricks & tips

- `for _ in range(n):` when you don't need the counter.
- `any(cond(x) for x in xs)` and `all(...)` replace many flag loops, and they short-circuit.
- `next((x for x in xs if pred(x)), default)` finds the first match in one line.
- `zip(*matrix)` transposes a list of lists.
- `reversed(xs)` and `sorted(xs)` let you loop in another order without modifying `xs`.
- `itertools.product(a, b)` replaces nested loops over independent ranges.
- `while True: … if done: break` is the idiomatic "loop and a half".
- Use `enumerate(xs, 1)` for human-friendly numbering.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Removing items while iterating | iterate a copy, or rebuild with a comprehension |
| 2 | `range(len(x))` everywhere | `enumerate`, `zip` |
| 3 | `zip` silently truncates | `zip(a, b, strict=True)` or `itertools.zip_longest` |
| 4 | Loop variable leaks after the loop | don't rely on it (unless deliberate) |
| 5 | `else` on a loop misread as "if empty" | it means "no break" |
| 6 | `case NAME:` captures instead of comparing | use dotted constants |
| 7 | Infinite `while` | make sure the state changes |
| 8 | Using `=` instead of `==` in conditions | Python makes it a SyntaxError, so be glad |
| 9 | Deep nesting | guard clauses, early `return`/`continue` |
| 10 | Floating-point loop counters (`while x != 1.0: x += 0.1`) | use ints, or `<`/`math.isclose` |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
for n in range(2, 5):
    if n % 5 == 0:
        break
else:
    print("no break")
print(n)
```
What prints?
- [x] `no break` then `4`
- [ ] Only `4`
- [ ] `no break` then `5`
The loop never hits `break`, so the `else` runs. The loop variable keeps its **last** value, `4` (range stops before 5).
:::

:::quiz
```python norun
def label(x):
    match x:
        case [a, b]:
            return f"pair {a},{b}"
        case [a, *rest]:
            return f"starts {a}, {len(rest)} more"
        case _:
            return "other"
print(label([1, 2]), "|", label((7, 8, 9)), "|", label("hi"))
```
What prints?
- [ ] `pair 1,2 | other | other`
- [x] `pair 1,2 | starts 7, 2 more | other`
- [ ] `pair 1,2 | starts 7, 2 more | starts h, 1 more`
Sequence patterns match lists **and tuples**, so `(7, 8, 9)` hits the star pattern. They deliberately do **not** match strings, so `"hi"` falls through to `_`. That's a classic match-case surprise.
:::

## Practice problems

:::problem basic | FizzBuzz, then FizzBuzz without if-chains | if/elif, modulo
Print 1..15, replacing multiples of 3 with "Fizz", multiples of 5 with "Buzz" and both with "FizzBuzz". Then write a version that works by **building the string**, so adding "7 → Bazz" means editing one line.
:::solution
```python
for n in range(1, 16):
    if n % 15 == 0:
        print("FizzBuzz")
    elif n % 3 == 0:
        print("Fizz")
    elif n % 5 == 0:
        print("Buzz")
    else:
        print(n)

RULES = [(3, "Fizz"), (5, "Buzz"), (7, "Bazz")]
out = []
for n in range(1, 22):
    word = "".join(w for d, w in RULES if n % d == 0)
    out.append(word or str(n))
print(" ".join(out))
```
:::explain
In the first version, **order matters**: check 15 first, otherwise 15 would print "Fizz" and stop. The second version is **data-driven**: rules live in a list, and `word or str(n)` uses `or` returning its first truthy operand. Interviewers often follow up with "now add 7", which tests whether your design scales.
:::pitfalls
- Checking `% 3` before `% 15` in an if/elif chain.
- `range(1, 15)` stops at 14. The stop value is exclusive.
:::end

:::problem basic | Count vowels & consonants | for over string, membership
Given a sentence, count vowels and consonants (ignore non-letters).
:::solution
```python
def count_vc(s):
    vowels = set("aeiou")
    v = c = 0
    for ch in s.lower():
        if not ch.isalpha():
            continue
        if ch in vowels:
            v += 1
        else:
            c += 1
    return v, c

print(count_vc("Hello, World! 123"))   # (3, 7)
```
:::explain
`continue` skips non-letters early (a **guard**). A set makes `ch in vowels` O(1), although for 5 letters a string would be just as fast. It's the habit that matters.
:::end

:::problem basic | Prime check with loop-else | for-else, sqrt bound
Write `is_prime(n)` with a `for … else`, testing divisors only up to √n.
:::solution
```python
def is_prime(n):
    if n < 2:
        return False
    for d in range(2, int(n ** 0.5) + 1):
        if n % d == 0:
            break
    else:
        return True
    return False

print([n for n in range(30) if is_prime(n)])
```
:::explain
If `n = a·b` with `a ≤ b`, then `a ≤ √n`. So if there's no divisor up to √n, there's none at all, which gives O(√n) instead of O(n). The `else` runs only if no `break` occurred, meaning no divisor was found. `int(n ** 0.5) + 1` makes the range inclusive of √n. `math.isqrt(n)` is exact even for huge ints.
:::end

:::problem basic | Sum of digits & digital root | while, //, %
Write `digit_sum(n)` using a `while` loop with `%` and `//`, then `digital_root(n)` (repeat until one digit). Bonus: an O(1) formula for the digital root.
:::solution
```python
def digit_sum(n):
    n = abs(n)
    s = 0
    while n:
        s += n % 10      # last digit
        n //= 10         # drop last digit
    return s

def digital_root(n):
    while n >= 10:
        n = digit_sum(n)
    return n

print(digit_sum(9875), digital_root(9875), 1 + (9875 - 1) % 9)
```
:::explain
`n % 10` peels off the last digit and `n //= 10` removes it. The digital root of a positive `n` equals `1 + (n-1) % 9`, because a number ≡ its digit sum (mod 9). That's the "casting out nines" trick.
:::trace
`digit_sum(9875)`:
| n | n % 10 | s |
|---|---|---|
| 9875 | 5 | 5 |
| 987 | 7 | 12 |
| 98 | 8 | 20 |
| 9 | 9 | 29 |
| 0 | stop | **29** |
:::end

:::problem medium | Spiral matrix traversal | nested loops, boundaries
Return the elements of an m×n matrix in clockwise spiral order (LeetCode 54).
:::hint
Keep four boundaries: `top`, `bottom`, `left`, `right`. Walk one edge, then shrink that boundary. Stop when they cross.
:::solution
```python
def spiral(m):
    out = []
    if not m:
        return out
    top, bottom, left, right = 0, len(m) - 1, 0, len(m[0]) - 1
    while top <= bottom and left <= right:
        for c in range(left, right + 1):
            out.append(m[top][c])
        top += 1
        for r in range(top, bottom + 1):
            out.append(m[r][right])
        right -= 1
        if top <= bottom:
            for c in range(right, left - 1, -1):
                out.append(m[bottom][c])
            bottom -= 1
        if left <= right:
            for r in range(bottom, top - 1, -1):
                out.append(m[r][left])
            left += 1
    return out

print(spiral([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))       # [1,2,3,6,9,8,7,4,5]
print(spiral([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]))
```
:::explain
Each pass peels one "ring". The two inner `if` checks matter for non-square matrices: after walking the top row and right column, the remaining area might be a single row or column, and without the checks you'd walk it twice. Each element is visited once, so it's O(m·n).
:::pitfalls
- Forgetting the `if top <= bottom` / `if left <= right` checks, which duplicates the middle row or column.
- Off-by-one in reversed ranges: `range(right, left - 1, -1)` includes `left`.
:::end

:::problem medium | Command interpreter with match-case | pattern matching
Write `run(commands)` for a robot starting at (0, 0). Commands are tuples: `("move", dx, dy)`, `("teleport", (x, y))`, `("reset",)`, `("repeat", n, cmd)` (recursive). Unknown commands raise `ValueError`.
:::solution
```python
def run(commands, pos=(0, 0)):
    x, y = pos
    for cmd in commands:
        match cmd:
            case ("move", int(dx), int(dy)):
                x, y = x + dx, y + dy
            case ("teleport", (int(nx), int(ny))):
                x, y = nx, ny
            case ("reset",):
                x, y = 0, 0
            case ("repeat", int(n), inner) if n >= 0:
                for _ in range(n):
                    x, y = run([inner], (x, y))
            case _:
                raise ValueError(f"bad command: {cmd!r}")
    return x, y

prog = [("move", 1, 2), ("repeat", 3, ("move", 1, 0)), ("teleport", (10, 10)), ("move", -1, -1)]
print(run(prog))                                    # (9, 9)
print(run([("move", 1, 1), ("reset",), ("move", 2, 0)]))  # (2, 0)
```
:::explain
`case ("move", int(dx), int(dy))` checks three things at once: the length is 3, the first item equals `"move"`, and the next two are ints, which are **captured** into `dx` and `dy`. `("reset",)` matches only a 1-tuple. Nested patterns like `(int(nx), int(ny))` destructure inside. The guard `if n >= 0` adds a condition. The same thing with `if/elif` would need many `len()`/`isinstance()` checks.
:::end

:::problem medium | Remove items while iterating — correctly | mutation during iteration
Given `xs = [1, 2, 2, 3, 2, 4]`, remove all `2`s **in place** (the same list object must be modified, so other references see it) in O(n) time.
:::hint
Slice assignment `xs[:] = …` replaces the contents of the same object. Or use a two-pointer "write index".
:::solution
```python
xs = [1, 2, 2, 3, 2, 4]
alias = xs
xs[:] = [x for x in xs if x != 2]     # in place: same object
print(xs, alias is xs)

ys = [1, 2, 2, 3, 2, 4]
w = 0                                  # two-pointer compaction, O(1) extra space
for r in range(len(ys)):
    if ys[r] != 2:
        ys[w] = ys[r]
        w += 1
del ys[w:]
print(ys)
```
:::explain
`xs = [...]` would **rebind** the name to a new list, so `alias` would still see the old one. `xs[:] = ...` **mutates** the existing object. The two-pointer version is how LeetCode 27 (Remove Element) wants it: `r` reads every element and `w` marks where the next kept element goes. Calling `.remove()` in a loop is both buggy (it skips elements) and O(n²).
:::end

:::problem hard | Game of Life step | nested loops, neighbours, in-place encoding
Compute the next state of Conway's Game of Life on an m×n grid of 0/1 (LeetCode 289) **in place**, using O(1) extra space.
:::hint
You need the old state while writing the new one. Encode both in the cell: bit 0 = old state, bit 1 = new state. At the end, shift right by 1.
:::solution
```python
def life_step(board):
    m, n = len(board), len(board[0])
    for r in range(m):
        for c in range(n):
            live = 0
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if (dr or dc) and 0 <= r + dr < m and 0 <= c + dc < n:
                        live += board[r + dr][c + dc] & 1      # OLD state only
            if board[r][c] & 1 and live in (2, 3):
                board[r][c] |= 2                               # stays alive
            elif not board[r][c] & 1 and live == 3:
                board[r][c] |= 2                               # born
    for r in range(m):
        for c in range(n):
            board[r][c] >>= 1

glider = [[0, 1, 0], [0, 0, 1], [1, 1, 1], [0, 0, 0]]
life_step(glider)
for row in glider:
    print(row)
```
:::explain
Writing new values directly would corrupt the neighbour counts of cells processed later. Storing the next state in **bit 1** while reading only **bit 0** (`& 1`) keeps both generations in the same int. The final pass shifts every cell right, making the new state current. `(dr or dc)` skips the cell itself, and chained comparisons `0 <= r+dr < m` keep the bounds checks readable.
:::end

:::problem hard | Valid Sudoku in one pass | nested loops, sets, box index
Determine whether a 9×9 Sudoku board (with `"."` for empty cells) is valid: no duplicate digits in any row, column, or 3×3 box (LeetCode 36). One pass over the cells.
:::solution
```python
def valid_sudoku(board):
    rows = [set() for _ in range(9)]
    cols = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]
    for r in range(9):
        for c in range(9):
            v = board[r][c]
            if v == ".":
                continue
            b = (r // 3) * 3 + c // 3          # box index 0..8
            if v in rows[r] or v in cols[c] or v in boxes[b]:
                return False
            rows[r].add(v); cols[c].add(v); boxes[b].add(v)
    return True

board = [list(row) for row in [
    "53..7....", "6..195...", ".98....6.", "8...6...3", "4..8.3..1",
    "7...2...6", ".6....28.", "...419..5", "....8..79"]]
print(valid_sudoku(board))
board[0][1] = "8"        # duplicate 8 in the top-left box
print(valid_sudoku(board))
```
:::explain
The key trick is the box index `(r // 3) * 3 + c // 3`. Floor division maps rows 0–2 → 0, 3–5 → 1, 6–8 → 2, and similarly for columns. `[set() for _ in range(9)]` creates **nine separate** sets (`[set()] * 9` would be nine references to *one* set, the aliasing trap again). Each cell is examined once, so the time is O(81), effectively O(1).
:::end

:::problem hard | Simulate a vending machine (state machine) | while, match, state
Implement a vending machine as a **state machine** with states `IDLE`, `HAS_MONEY` and `DISPENSING`. It processes a list of events (`("coin", amount)`, `("select", item)`, `("cancel",)`) and returns a log. Items cost: chips 50, soda 75. Insufficient money logs "need X more". Selecting goes through DISPENSING back to IDLE with change returned.
:::solution
```python
PRICES = {"chips": 50, "soda": 75}

def vend(events):
    state, balance, log = "IDLE", 0, []
    for ev in events:
        match (state, ev):
            case (_, ("coin", int(amt))) if amt > 0:
                balance += amt
                state = "HAS_MONEY"
                log.append(f"balance {balance}")
            case ("HAS_MONEY", ("select", item)) if item in PRICES:
                price = PRICES[item]
                if balance < price:
                    log.append(f"need {price - balance} more")
                    continue
                state = "DISPENSING"
                log.append(f"dispense {item}, change {balance - price}")
                balance, state = 0, "IDLE"
            case ("HAS_MONEY", ("cancel",)):
                log.append(f"refund {balance}")
                balance, state = 0, "IDLE"
            case (s, e):
                log.append(f"ignored {e} in {s}")
    return log

for line in vend([("select", "soda"), ("coin", 25), ("coin", 25), ("select", "soda"),
                  ("coin", 50), ("select", "soda"), ("coin", 10), ("cancel",)]):
    print(line)
```
:::explain
Matching on a **tuple of (state, event)** is a clean way to write state machines: each `case` is a transition. Guards (`if item in PRICES`) express preconditions. The final catch-all `case (s, e)` captures and logs anything invalid, so no event is silently lost. This pattern scales to parsers, protocol handlers and game logic.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Fizz Buzz | LeetCode 412 | https://leetcode.com/problems/fizz-buzz/
Return a list of strings for 1..n: `"FizzBuzz"` for multiples of 15, `"Fizz"` for multiples of 3, `"Buzz"` for multiples of 5, otherwise the number as a string.
:::starter
```python norun
def fizz_buzz(n):
    pass
```
:::tests
```python norun
assert fizz_buzz(3) == ["1", "2", "Fizz"]
assert fizz_buzz(5) == ["1", "2", "Fizz", "4", "Buzz"]
assert fizz_buzz(15)[-1] == "FizzBuzz"
assert fizz_buzz(1) == ["1"]
assert len(fizz_buzz(100)) == 100 and fizz_buzz(100).count("FizzBuzz") == 6
```
:::solution
```python
def fizz_buzz(n):
    out = []
    for i in range(1, n + 1):
        word = ("Fizz" if i % 3 == 0 else "") + ("Buzz" if i % 5 == 0 else "")
        out.append(word or str(i))
    return out

print(fizz_buzz(15))
```
:::explain
Building the word from parts avoids the classic ordering bug (checking `% 3` before `% 15`): a multiple of 15 collects both "Fizz" and "Buzz". `word or str(i)` uses `or` returning its first truthy operand, so an empty string falls back to the number.
:::complexity
O(n).
:::end

:::program basic | Steps to reduce a number to zero | LeetCode 1342 | https://leetcode.com/problems/number-of-steps-to-reduce-a-number-to-zero/
Count the steps to reach 0 if, at each step, an even number is halved and an odd number has 1 subtracted. `14 → 7 → 6 → 3 → 2 → 1 → 0` is 6 steps.
:::starter
```python norun
def number_of_steps(num):
    pass
```
:::tests
```python norun
assert number_of_steps(14) == 6
assert number_of_steps(8) == 4
assert number_of_steps(123) == 12
assert number_of_steps(0) == 0
assert number_of_steps(1) == 1
```
:::solution
```python
def number_of_steps(num):
    steps = 0
    while num:
        num = num // 2 if num % 2 == 0 else num - 1
        steps += 1
    return steps

def number_of_steps_bits(num):            # every 1-bit costs a subtract, every bit a shift
    return max(0, num.bit_length() + num.bit_count() - 1)

print(number_of_steps(14), number_of_steps_bits(14), number_of_steps(123), number_of_steps_bits(123))
```
:::explain
A `while` loop fits because we don't know the number of iterations in advance. The bonus one-liner reads the answer from the binary form: each shift (halving) consumes a bit, and each 1-bit needs an extra subtraction. That's `bit_length + bit_count − 1`, a nice link between control flow and bit manipulation.
:::trace
| num | rule | steps |
|---|---|---|
| 14 | even → 7 | 1 |
| 7 | odd → 6 | 2 |
| 6 | even → 3 | 3 |
| 3 | odd → 2 | 4 |
| 2 | even → 1 | 5 |
| 1 | odd → 0 | **6** |
:::complexity
O(log n).
:::end

:::program medium | Spiral matrix II | LeetCode 59 | https://leetcode.com/problems/spiral-matrix-ii/
Generate an `n × n` matrix filled with 1..n² in clockwise spiral order.

```text
n = 3  ->  [[1, 2, 3],
            [8, 9, 4],
            [7, 6, 5]]
```
:::starter
```python norun
def generate_matrix(n):
    pass
```
:::tests
```python norun
assert generate_matrix(1) == [[1]]
assert generate_matrix(2) == [[1, 2], [4, 3]]
assert generate_matrix(3) == [[1, 2, 3], [8, 9, 4], [7, 6, 5]]
assert generate_matrix(4) == [[1, 2, 3, 4], [12, 13, 14, 5], [11, 16, 15, 6], [10, 9, 8, 7]]
```
:::hint
Walk with a direction vector `(dr, dc)` cycling right → down → left → up. Turn when the next cell is outside the grid or already filled.
:::solution
```python
def generate_matrix(n):
    grid = [[0] * n for _ in range(n)]
    dirs = [(0, 1), (1, 0), (0, -1), (-1, 0)]       # right, down, left, up
    r = c = d = 0
    for k in range(1, n * n + 1):
        grid[r][c] = k
        dr, dc = dirs[d]
        nr, nc = r + dr, c + dc
        if not (0 <= nr < n and 0 <= nc < n) or grid[nr][nc]:
            d = (d + 1) % 4                           # turn clockwise
            dr, dc = dirs[d]
            nr, nc = r + dr, c + dc
        r, c = nr, nc
    return grid

for row in generate_matrix(4):
    print(row)
```
:::explain
Instead of four boundary variables, this version uses a **direction table** and the rule "turn right when blocked". `(d + 1) % 4` cycles through the directions, the modulo wrap-around from the Operators chapter. A filled cell (non-zero) counts as blocked, so the spiral naturally tightens inward. Note `[[0] * n for _ in range(n)]` (not `[[0] * n] * n`) to avoid aliased rows.
:::complexity
O(n²) time and space.
:::end

:::program hard | Valid number | LeetCode 65 | https://leetcode.com/problems/valid-number/
Decide whether a string is a valid number: an optional sign, then digits with an optional decimal point (at least one digit overall), then an optional exponent (`e`/`E`, an optional sign, at least one digit). **No `float()`, no regex.**

```text
valid:   "2", "0089", "-0.1", "+3.14", "4.", "-.9", "2e10", "-90E3", "3e+7", "53.5e93"
invalid: "abc", "1a", "1e", "e3", "99e2.5", "--6", "-+3", "95a54e53", ".", ""
```
:::starter
```python norun
def is_number(s):
    pass
```
:::tests
```python norun
assert all(is_number(s) for s in ["2", "0089", "-0.1", "+3.14", "4.", "-.9", "2e10", "-90E3", "3e+7", "+6e-1", "53.5e93", "-123.456e789"])
assert not any(is_number(s) for s in ["abc", "1a", "1e", "e3", "99e2.5", "--6", "-+3", "95a54e53", ".", "", "+", "1e+", ".e1", "4e+-5"])
```
:::hint
Scan once with flags: `seen_digit`, `seen_dot`, `seen_exp`. A sign is only allowed at index 0 or right after `e`. A dot is only allowed before any dot or exponent. After `e`, reset `seen_digit` so the exponent needs digits of its own.
:::solution
```python
def is_number(s):
    seen_digit = seen_dot = seen_exp = False
    for i, ch in enumerate(s):
        if ch.isdigit():
            seen_digit = True
        elif ch in "+-":
            if i > 0 and s[i - 1] not in "eE":
                return False
        elif ch == ".":
            if seen_dot or seen_exp:
                return False
            seen_dot = True
        elif ch in "eE":
            if seen_exp or not seen_digit:
                return False
            seen_exp = True
            seen_digit = False          # the exponent needs its own digits
        else:
            return False
    return seen_digit

for s in ["-0.1", "4.", "-.9", "1e", "e3", "99e2.5", "3e+7", "."]:
    print(repr(s), is_number(s))
```
:::explain
This is a hand-written **finite-state machine** compressed into three flags: each character is accepted or rejected based on what has been seen so far. The trickiest rule is resetting `seen_digit` after `e`, which rejects `"1e"` and `"1e+"` while accepting `"2e10"`. Returning `seen_digit` at the end rejects `"."`, `""` and `"+"`. Writing parsers as explicit state machines is a classic interview skill (LeetCode rates this one Hard).
:::trace
`"-.9e2"`:
| ch | rule | digit | dot | exp |
|---|---|---|---|---|
| - | sign at index 0 ok | F | F | F |
| . | first dot | F | T | F |
| 9 | digit | T | T | F |
| e | exp after digit | F | T | T |
| 2 | digit | T | T | T → **valid** |
:::complexity
O(n) time, O(1) space.
:::end
