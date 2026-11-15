# Functions

A **function** is a named, reusable recipe: it takes **inputs** (arguments), does work, and hands back an **output** (return value). In Python, functions are also **objects**. You can store them in variables, pass them to other functions and return them, which unlocks closures, decorators and much of Python's power.

:::analogy A vending machine
Inputs go in the slot (arguments), the machine does its job (the body), and something comes out (the return value). Each time you use it, the machine gets a fresh, empty workspace (a new **frame**), so one customer's coins don't mix with the next one's.
:::

**What you'll learn**: defining and calling functions, return values, parameters vs arguments, positional/keyword/default arguments, `*args`/`**kwargs`, keyword-only and positional-only parameters, unpacking at call sites, the mutable-default trap, scope and the **LEGB** rule, `global`/`nonlocal`, recursion and the call stack, lambdas, docstrings and type hints.

## 1. Defining, calling, returning

```python
def area(width, height):
    """Return the area of a rectangle."""     # docstring
    return width * height

print(area(3, 4))
print(area.__doc__)
result = print("hi")          # print returns None
print(result)
```

- `def` creates a **function object** and binds it to a name. The body doesn't run until the function is called.
- `return` sends a value back and **exits immediately**. A function without `return`, or with a bare `return`, returns `None`.
- Return several values by returning a **tuple**: `return lo, hi` → `lo, hi = f()`.

:::term Parameter vs argument
**Parameters** are the names in the definition (`width`, `height`). **Arguments** are the actual values at the call (`3`, `4`). "Parameters are placeholders, arguments are the real thing."
:::

## 2. How arguments are passed: by object reference

Python passes a **reference to the same object** into the function. That has two consequences:

```python
def mutate(lst):
    lst.append(99)        # changes the caller's object

def rebind(lst):
    lst = [0]             # only rebinds the LOCAL name

data = [1, 2]
mutate(data); print(data)    # [1, 2, 99]
rebind(data); print(data)    # [1, 2, 99]  unchanged
```

Visualise it: inside `mutate`, the parameter `lst` and the caller's `data` arrows point at the **same** list.

## 3. Positional, keyword and default arguments

```python
def greet(name, greeting="Hello", punct="!"):
    return f"{greeting}, {name}{punct}"

print(greet("Ada"))                         # defaults used
print(greet("Ada", "Hi"))                   # positional
print(greet("Ada", punct="?"))              # keyword: skip the middle one
print(greet(punct=".", name="Linus"))       # keywords in any order
```

Rules: positional arguments come before keyword arguments, and parameters with defaults come after those without.

### The mutable default argument trap

Default values are evaluated **once, when `def` runs**, not each call.

```python
def add_item(item, bag=[]):        # ONE list shared by every call!
    bag.append(item)
    return bag

print(add_item("a"))
print(add_item("b"))               # ['a', 'b']  <- surprise
print(add_item.__defaults__)       # the shared list lives here

def add_item_fixed(item, bag=None):
    if bag is None:
        bag = []                   # fresh list each call
    bag.append(item)
    return bag

print(add_item_fixed("a"), add_item_fixed("b"))
```

:::trap Default arguments are shared
Never use a mutable object (`[]`, `{}`, `set()`, a class instance) as a default. Use `None` and create the object inside the function. The same "evaluated once" rule means `def log(t=time.time())` stamps every call with the **definition** time.
:::

## 4. `*args` and `**kwargs`

```python
def stats(*nums, round_to=2, **meta):
    print("nums:", nums)          # tuple of extra positionals
    print("meta:", meta)          # dict of extra keywords
    return round(sum(nums) / len(nums), round_to)

print(stats(3, 4, 8, round_to=1, source="sensor", unit="C"))
```

Full parameter order:

```python norun
def f(pos_only, /, normal, *args, kw_only, **kwargs): ...
```

| Part | Meaning |
|---|---|
| before `/` | **positional-only** (callers can't use the name) |
| normal | positional **or** keyword |
| `*args` | extra positionals → tuple |
| after `*` or `*args` | **keyword-only** |
| `**kwargs` | extra keywords → dict |

```python
def connect(host, /, port=80, *, timeout=10):
    return f"{host}:{port} (timeout={timeout})"

print(connect("example.com", 443, timeout=5))
print(connect("example.com", port=8080))
```

```python error
def connect(host, /, port=80, *, timeout=10):
    return host
connect(host="x")            # TypeError: positional-only argument passed as keyword
```

:::tip Why keyword-only parameters?
`def resize(img, *, keep_aspect=True)` forces callers to write `resize(img, keep_aspect=False)` rather than a mysterious `resize(img, False)`. Use it for boolean flags and rarely-used options: it's self-documenting and lets you reorder later.
:::

### Unpacking at the call site

```python
def point(x, y, z):
    return x + 10 * y + 100 * z

coords = [1, 2, 3]
opts = {"x": 1, "y": 2, "z": 3}
print(point(*coords))     # spreads list into positionals
print(point(**opts))      # spreads dict into keywords
print(*range(5), sep="-")
```

## 5. Scope and the LEGB rule

When Python looks up a name, it searches four **scopes** in order:

| | Scope | Where |
|---|---|---|
| **L** | Local | inside the current function |
| **E** | Enclosing | inside any outer (enclosing) functions |
| **G** | Global | the module (file) level |
| **B** | Built-in | `len`, `print`, `range`, … |

```python
x = "global"
def outer():
    x = "enclosing"
    def inner():
        x = "local"
        print("inner:", x)
    inner()
    print("outer:", x)
outer()
print("module:", x)
```

### The UnboundLocalError surprise

Python decides at **compile time** that a name is local if it's assigned **anywhere** in the function body.

```python error
count = 0
def increment():
    count += 1        # assignment makes `count` local -> read before assignment!
    return count
increment()           # UnboundLocalError
```

```python
count = 0
def increment():
    global count      # declare: use the module-level name
    count += 1
    return count
print(increment(), increment())

def make_counter():
    n = 0
    def step():
        nonlocal n    # declare: use the enclosing function's name
        n += 1
        return n
    return step
c = make_counter()
print(c(), c(), c())
```

:::boss `global` is a smell; `nonlocal` is a tool
Mutable global state makes code hard to test and reason about. Prefer passing values in and returning them out, or use a class. `nonlocal` is fine for small closures (counters, memo caches), and the next chapter builds on it.
:::

## 6. Recursion and the call stack

A **recursive** function calls itself on a **smaller** input until it reaches a **base case**. Each call gets its own **frame** on the **call stack**.

```python
def factorial(n):
    if n <= 1:                # base case
        return 1
    return n * factorial(n - 1)   # recursive case: smaller problem

print(factorial(5))
```

Visualise it and watch the frames stack up (`factorial(5)` → `factorial(4)` → … → `factorial(1)`), then unwind as each returns.

:::trace
| Call | Waiting on | Returns |
|---|---|---|
| factorial(5) | 5 * factorial(4) | 5 * 24 = **120** |
| factorial(4) | 4 * factorial(3) | 4 * 6 = 24 |
| factorial(3) | 3 * factorial(2) | 3 * 2 = 6 |
| factorial(2) | 2 * factorial(1) | 2 * 1 = 2 |
| factorial(1) | base case | 1 |
:::

:::trap Recursion limits
CPython's default recursion limit is about 1000 frames (`sys.getrecursionlimit()`), and Python does **not** optimise tail calls. Deep recursion (a linked list with 10⁵ nodes, DFS on a long path) raises `RecursionError`. Convert it to a loop with an explicit stack, or raise the limit with care.
:::

## 7. Lambda: tiny anonymous functions

```python
square = lambda x: x * x              # same as def square(x): return x * x
print(square(7))
people = [("Ada", 36), ("Linus", 28), ("Grace", 45)]
print(sorted(people, key=lambda p: p[1]))          # sort by age
print(max(people, key=lambda p: len(p[0])))         # longest name
```

- A lambda is a **single expression**: no statements, no annotations.
- Use it for short `key=` functions and callbacks. If you assign it to a name, write a `def` instead (PEP 8), because tracebacks then show a real name.

## 8. Functions are first-class objects

```python
def shout(s): return s.upper() + "!"
def whisper(s): return s.lower() + "..."

def speak(fn, text):            # a higher-order function
    return fn(text)

actions = {"loud": shout, "quiet": whisper}    # functions in a dict
print(speak(actions["loud"], "hello"), speak(whisper, "HELLO"))
print(shout.__name__, callable(shout))
```

## 9. Docstrings & type hints

```python
def clip(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    """Clamp x into [lo, hi].

    >>> clip(1.7)
    1.0
    """
    return max(lo, min(x, hi))

print(clip(1.7), clip.__annotations__)
```

Type hints are **not enforced** at run time. Tools like `mypy`, `pyright` and your IDE read them. Covered in depth in *Modern OOP* and *Pro Python*.

## Tricks & tips

- Return early to avoid deep nesting (guard clauses).
- `functools.partial(f, x=1)` pre-fills arguments: `int_base2 = partial(int, base=2)`.
- `functools.lru_cache` / `functools.cache` memoise pure functions in one line.
- `f.__defaults__`, `f.__code__.co_varnames`, `inspect.signature(f)` let you introspect a function.
- A function that only reads its arguments and returns a value (a **pure function**) is easy to test and cache.
- `def f(*, a, b)` with no positionals forces fully keyword calls.
- Use `_` for unused parameters: `lambda _: 0`.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Mutable default argument | `None` + create inside |
| 2 | `UnboundLocalError` when assigning a global | pass and return, or `global`/`nonlocal` |
| 3 | Forgetting `return` → `None` | always check the return path |
| 4 | `sorted(xs, key=len())` (calling instead of passing) | `key=len` |
| 5 | Mutating an argument the caller didn't expect | copy, or document it |
| 6 | Deep recursion → `RecursionError` | iterative with explicit stack |
| 7 | Late-binding lambdas in loops (next chapter) | default arg `lambda i=i: i` |
| 8 | `print` vs `return` confusion | functions should *return*; let callers print |
| 9 | Shadowing built-ins as parameter names (`list`, `id`, `input`) | rename |
| 10 | Too many positional bool flags | keyword-only parameters |

## Practice problems

:::problem basic | Multiple returns: min, max, mean | tuples, unpacking
Write `summary(nums)` returning `(min, max, mean)` in **one pass** (don't call `min`/`max`/`sum`). Handle an empty list by raising `ValueError`.
:::solution
```python
def summary(nums):
    if not nums:
        raise ValueError("empty input")
    lo = hi = total = nums[0]
    for x in nums[1:]:
        if x < lo:
            lo = x
        if x > hi:
            hi = x
        total += x
    return lo, hi, total / len(nums)

lo, hi, avg = summary([4, 9, 1, 7])
print(lo, hi, avg)
```
:::explain
`return lo, hi, mean` builds a tuple, and the caller **unpacks** it. Starting from the first element (rather than 0 or `inf`) works for any comparable type. Raising `ValueError` on empty input matches the behaviour of built-ins like `max([])`.
:::end

:::problem basic | Flexible greeting with *args/**kwargs | variadic args
Write `tag(name, *classes, **attrs)` that builds an HTML tag: `tag("div", "card", "big", id="x", data_role="m")` → `<div class="card big" id="x" data-role="m">`. Underscores in keyword names become hyphens.
:::solution
```python
def tag(name, *classes, **attrs):
    parts = [name]
    if classes:
        parts.append(f'class="{" ".join(classes)}"')
    for k, v in attrs.items():
        parts.append(f'{k.replace("_", "-")}="{v}"')
    return "<" + " ".join(parts) + ">"

print(tag("div", "card", "big", id="x", data_role="m"))
print(tag("br"))
```
:::explain
`*classes` collects extra positionals into a tuple and `**attrs` collects keywords into a dict (insertion order is preserved since 3.7). Keyword names must be valid identifiers, so `data-role` can't be written directly. The underscore→hyphen convention is the usual workaround.
:::end

:::problem basic | Fix the default argument bug | mutable defaults
This function is supposed to record each call's event separately per user, but every user's log seems to fill up together. Find and fix the bug.
```python norun
def log_event(event, history=[]):
    history.append(event)
    return history
```
:::solution
```python
def log_event(event, history=None):
    if history is None:
        history = []
    history.append(event)
    return history

alice = log_event("login")
bob = log_event("login")
log_event("click", alice)
print(alice, bob)          # ['login', 'click'] ['login']
```
:::explain
The original `history=[]` was created once and reused by every call that relied on the default, so all users shared it. With `None` as the default, a fresh list is created per call, while callers can still pass their own list to append to.
:::end

:::problem basic | Count calls with nonlocal | closures, nonlocal
Write `make_counter(start=0)` returning a function that returns `start+1`, `start+2`, … on successive calls. Two counters must be independent.
:::solution
```python
def make_counter(start=0):
    n = start
    def counter():
        nonlocal n
        n += 1
        return n
    return counter

a, b = make_counter(), make_counter(100)
print(a(), a(), b(), a(), b())     # 1 2 101 3 102
```
:::explain
Each call to `make_counter` creates a new frame with its own `n`. The inner function **closes over** that `n`, which survives after `make_counter` returns (this is a **closure**). `nonlocal n` is needed because `n += 1` assigns to `n`. Without it, Python would treat `n` as local to `counter` and raise `UnboundLocalError`.
:::end

:::problem medium | Power set via recursion | recursion, call stack
Return all subsets of a list (LeetCode 78) recursively. Explain the recursion tree.
:::solution
```python
def subsets(nums):
    if not nums:
        return [[]]                       # base case: the empty set has one subset
    rest = subsets(nums[1:])             # subsets without the first element
    return rest + [[nums[0]] + s for s in rest]   # ...plus each one WITH it

print(subsets([1, 2, 3]))
print(len(subsets(list(range(10)))))     # 1024 = 2**10
```
:::explain
Every subset either excludes or includes `nums[0]`. The subsets of the rest give all the "exclude" cases, and adding `nums[0]` to each gives the "include" cases. That doubles the count at each level, so there are 2ⁿ subsets. Time and space are O(n·2ⁿ), which is optimal because the output itself has that size.
:::trace
| Call | rest | returns |
|---|---|---|
| subsets([]) | | `[[]]` |
| subsets([3]) | `[[]]` | `[[], [3]]` |
| subsets([2,3]) | `[[], [3]]` | `[[], [3], [2], [2,3]]` |
| subsets([1,2,3]) | 4 subsets | those + `1` prefixed → 8 |
:::end

:::problem medium | Flatten arbitrarily nested lists | recursion, isinstance
`flatten([1, [2, [3, [4]], 5], [], [[6]]])` → `[1, 2, 3, 4, 5, 6]`. Write a recursive version and an **iterative** one with an explicit stack (to survive nesting depth > 1000).
:::solution
```python
def flatten(xs):
    out = []
    for x in xs:
        if isinstance(x, list):
            out.extend(flatten(x))
        else:
            out.append(x)
    return out

def flatten_iter(xs):
    out, stack = [], [iter(xs)]
    while stack:
        for x in stack[-1]:
            if isinstance(x, list):
                stack.append(iter(x))     # descend: pause the current list
                break
            out.append(x)
        else:
            stack.pop()                   # current list exhausted (no break)
    return out

data = [1, [2, [3, [4]], 5], [], [[6]]]
print(flatten(data), flatten_iter(data))

deep = [0]
for i in range(1, 5000):
    deep = [deep, i]                       # 5000 levels deep
print(len(flatten_iter(deep)))             # recursion would hit RecursionError
```
:::explain
The recursive version mirrors the data's shape. The iterative one keeps a **stack of iterators**: when it meets a sublist it pauses the current iterator (it remembers its position) and pushes a new one. The `for … else` pops a list only once it's exhausted. That's an explicit version of what the call stack did, without the ~1000-frame limit.
:::end

:::problem medium | Keyword-only API design | *, /, signatures
Design `train(model, data, /, *, epochs=10, lr=1e-3, verbose=False)`. Show three calls that work and two that raise `TypeError`, and explain why each failing call is a *good* thing.
:::solution
```python
def train(model, data, /, *, epochs=10, lr=1e-3, verbose=False):
    return f"{model} on {len(data)} rows: epochs={epochs}, lr={lr}, verbose={verbose}"

print(train("mlp", [1, 2, 3]))
print(train("mlp", [1, 2, 3], epochs=5))
print(train("cnn", range(100), lr=0.01, verbose=True))

for bad in ['train("mlp", [1], 5)', 'train(model="mlp", data=[1])']:
    try:
        eval(bad)
    except TypeError as e:
        print("TypeError:", e)
```
:::explain
`train("mlp", [1], 5)` fails: is `5` the epochs, or the learning rate? Keyword-only parameters force callers to say `epochs=5`. `train(model=..., data=...)` fails because `model` and `data` are positional-only, which leaves you free to rename those parameters later without breaking anyone. Good APIs make wrong calls impossible.
:::end

:::problem hard | Tower of Hanoi with move recording | recursion
Return the list of moves to transfer `n` disks from peg A to C using B. Prove it uses 2ⁿ − 1 moves and verify for n = 1..10. Then simulate the moves on three lists and assert no larger disk ever sits on a smaller one.
:::solution
```python
def hanoi(n, src="A", aux="B", dst="C", moves=None):
    if moves is None:
        moves = []
    if n == 0:
        return moves
    hanoi(n - 1, src, dst, aux, moves)   # park n-1 disks on aux
    moves.append((src, dst))             # move the biggest disk
    hanoi(n - 1, aux, src, dst, moves)   # bring n-1 disks on top of it
    return moves

for n in range(1, 11):
    assert len(hanoi(n)) == 2 ** n - 1

def simulate(n):
    pegs = {"A": list(range(n, 0, -1)), "B": [], "C": []}
    for s, d in hanoi(n):
        disk = pegs[s].pop()
        assert not pegs[d] or pegs[d][-1] > disk, "illegal move!"
        pegs[d].append(disk)
    return pegs

print(hanoi(3))
print(simulate(6))
```
:::explain
To move `n` disks you must first move the top `n-1` out of the way, then move the largest, then move the `n-1` back on top. So T(n) = 2·T(n−1) + 1 with T(0) = 0, which solves to 2ⁿ − 1. Note the `moves=None` pattern: the list is created once at the top level and **shared deliberately** down the recursion. The simulator acts as an **oracle** that checks the rules.
:::end

:::problem hard | Ackermann & recursion limits | recursion depth, explicit stack
The Ackermann function A(m, n) grows explosively and recurses very deeply. Implement it recursively (works for small inputs), then **iteratively with an explicit stack** so that A(2, 300) and A(3, 6) work without `RecursionError`.
:::solution
```python
import sys

def ack_rec(m, n):
    if m == 0:
        return n + 1
    if n == 0:
        return ack_rec(m - 1, 1)
    return ack_rec(m - 1, ack_rec(m, n - 1))

def ack_iter(m, n):
    stack = [m]
    while stack:
        m = stack.pop()
        if m == 0:
            n += 1
        elif n == 0:
            stack.append(m - 1)
            n = 1
        else:
            stack.append(m - 1)          # outer call, done later
            stack.append(m)              # inner call A(m, n-1), done first
            n -= 1
    return n

print(ack_rec(2, 3), ack_iter(2, 3))     # 9 9
print(ack_iter(2, 300), ack_iter(3, 6))  # 603 509
try:
    ack_rec(2, 300)
except RecursionError:
    print("recursive version: RecursionError at limit", sys.getrecursionlimit())
```
:::explain
The tricky case is `A(m−1, A(m, n−1))`: the *argument* of the outer call is itself a call. With an explicit stack, we push "remember to apply level m−1" and then "compute level m with n−1". Whatever value `n` ends up with when the inner work finishes becomes the argument for the pending outer level. The stack holds only the `m` values, and `n` flows through as the current result. This **defunctionalisation** is the general way to turn any recursion into a loop.
:::end

:::problem hard | Function introspection: build a call validator | inspect, signatures
Write a function `check_types(fn, *args, **kwargs)` that uses `inspect.signature` and the function's **type hints** to verify argument types before calling it, raising `TypeError` with a clear message on mismatch. Support simple classes (`int`, `str`, `list`…) and skip un-annotated parameters.
:::solution
```python
import inspect

def check_types(fn, *args, **kwargs):
    sig = inspect.signature(fn)
    bound = sig.bind(*args, **kwargs)         # maps arguments to parameter names
    bound.apply_defaults()
    for name, value in bound.arguments.items():
        ann = sig.parameters[name].annotation
        if ann is inspect.Parameter.empty or not isinstance(ann, type):
            continue
        if not isinstance(value, ann):
            raise TypeError(f"{fn.__name__}(): '{name}' expected {ann.__name__}, got {type(value).__name__}")
    return fn(*args, **kwargs)

def repeat(word: str, times: int = 2, sep=" ") -> str:
    return sep.join([word] * times)

print(check_types(repeat, "hi", 3))
print(check_types(repeat, "hi", sep="-"))
try:
    check_types(repeat, "hi", "3")
except TypeError as e:
    print(e)
```
:::explain
`sig.bind` performs the exact argument-to-parameter matching that Python itself does, including defaults, keywords and `*args`. It raises `TypeError` for a missing or extra argument, for free. We then compare each bound value with its annotation. This is the core idea behind run-time validators like `typeguard` and `pydantic`'s `validate_call`. Turning it into a decorator is an exercise for the next chapter.
:::end
