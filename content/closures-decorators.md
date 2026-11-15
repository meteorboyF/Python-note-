# Closures & Decorators

Functions in Python are **objects**, so you can create them inside other functions, hand them around, and return them. A **closure** is a function that *remembers* variables from the place it was created. A **decorator** uses that power to wrap a function with extra behaviour (timing, caching, logging, access checks) without touching its code.

:::analogy A backpack and a gift wrapper
A **closure** is a function carrying a backpack: when it was born inside another function, it packed the variables it needs and kept them after its parent finished. A **decorator** is gift wrapping: the present (your function) is unchanged, but whoever receives it gets the wrapping first (logging, timing…) and then the present.
:::

**What you'll learn**: first-class & higher-order functions, nested functions, closures and `__closure__` cells, the late-binding trap, `nonlocal`, decorators step by step, `functools.wraps`, decorators with arguments, stacking, class-based decorators, `functools.lru_cache`/`cache`/`partial`, and real patterns (retry, timing, memoise, registry, access control).

## 1. First-class and higher-order functions

**First-class** means functions are values. A **higher-order function** takes a function as an argument or returns one.

```python
def apply_twice(fn, x):          # higher-order: takes a function
    return fn(fn(x))

def add3(n):
    return n + 3

print(apply_twice(add3, 10))     # 16
print(list(map(str.upper, ["a", "b"])))
ops = [abs, str, lambda v: v * 2]
print([op(-4) for op in ops])
```

## 2. Closures

```python
def make_multiplier(k):
    def multiply(x):
        return x * k          # k is a FREE variable: not local, not global
    return multiply           # return the function itself (no parentheses!)

double = make_multiplier(2)
triple = make_multiplier(3)
print(double(5), triple(5))
print(double.__closure__[0].cell_contents)   # the remembered k
```

When `make_multiplier(2)` returns, its frame is gone, but `k` survives inside a **cell** that `multiply` holds on to. Step through it in the visualiser and you'll see each returned function is a separate object.

:::term Free variable & cell
A **free variable** is used in a function but defined in an enclosing function. Python stores it in a **cell** object shared between the outer and inner function, so both see the same, current value. Inspect cells with `fn.__closure__` and `fn.__code__.co_freevars`.
:::

### Closures with state: `nonlocal`

```python
def running_average():
    total = 0
    count = 0
    def add(x):
        nonlocal total, count     # we ASSIGN them, so we must declare
        total += x
        count += 1
        return total / count
    return add

avg = running_average()
print(avg(10), avg(20), avg(30))
```

### The late-binding trap

Closures look up the variable's value **when they're called**, not when they're created.

```python
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])            # [2, 2, 2]  <- all see the final i

fixed = [lambda i=i: i for i in range(3)]   # default arg captures NOW
print([f() for f in fixed])            # [0, 1, 2]

from functools import partial
also_fixed = [partial(lambda i: i, i) for i in range(3)]
print([f() for f in also_fixed])
```

:::trap Late binding in loops
Every lambda in the first list refers to the **same** variable `i`, which ends at 2. Fix it by binding the value at creation time (`i=i` as a default, `functools.partial`, or a factory function `make(i)`). This shows up with GUI callbacks, thread targets and dict-of-handlers code.
:::

:::quiz
```python norun
def outer():
    x = 1
    def inner():
        return x
    x = 2
    return inner
print(outer()())
```
What prints?
- [ ] `1`
- [x] `2`
- [ ] `NameError`
`inner` reads `x` from the cell when it's **called**. By then `outer` has set `x = 2`. This is late binding.
:::

## 3. Decorators, step by step

A decorator is just a function that takes a function and returns a (usually wrapped) function. `@decorator` is syntax sugar for reassigning the name.

```python
def shout(fn):
    def wrapper(*args, **kwargs):
        result = fn(*args, **kwargs)     # call the original
        return result.upper() + "!"
    return wrapper

def greet(name):
    return f"hello {name}"

greet = shout(greet)          # manual decoration
print(greet("ada"))

@shout                        # exactly the same as: hi = shout(hi)
def hi(name):
    return f"hi {name}"
print(hi("linus"))
```

:::deep What happens at `@decorator`
When Python executes `def hi…` decorated with `@shout`, it (1) creates the function object `hi`, (2) calls `shout(hi)`, and (3) binds the **result** to the name `hi`. Decoration happens **once, at definition time**. The wrapper then runs at **every call**.
:::

### Always use `functools.wraps`

```python
import functools

def plain(fn):
    def wrapper(*a, **k):
        return fn(*a, **k)
    return wrapper

def good(fn):
    @functools.wraps(fn)          # copies __name__, __doc__, __wrapped__, ...
    def wrapper(*a, **k):
        return fn(*a, **k)
    return wrapper

@plain
def f():
    "Docs for f."
@good
def g():
    "Docs for g."
print(f.__name__, f.__doc__)      # wrapper None   <- metadata lost
print(g.__name__, g.__doc__)      # g Docs for g.
print(g.__wrapped__)              # access the original function
```

### A real decorator: timing

```python
import functools, time

def timed(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:                                   # runs even if fn raises
            ms = (time.perf_counter() - start) * 1000
            print(f"{fn.__name__} took {ms:.2f} ms")
    return wrapper

@timed
def slow_sum(n):
    return sum(range(n))

print(slow_sum(1_000_000))
```

## 4. Decorators with arguments (three layers)

`@repeat(3)` first **calls** `repeat(3)`, which must return the actual decorator.

```python
import functools

def repeat(times):                    # layer 1: takes the arguments
    def decorator(fn):                # layer 2: takes the function
        @functools.wraps(fn)
        def wrapper(*args, **kwargs): # layer 3: runs at each call
            return [fn(*args, **kwargs) for _ in range(times)]
        return wrapper
    return decorator

@repeat(3)
def roll(sides=6):
    import random
    return random.randint(1, sides)

print(len(roll()), roll.__name__)
```

### Stacking decorators

```python
def bold(fn):
    return lambda: "<b>" + fn() + "</b>"
def italic(fn):
    return lambda: "<i>" + fn() + "</i>"

@bold
@italic            # applied FIRST (closest to the function)
def text():
    return "hi"
print(text())      # <b><i>hi</i></b>   == bold(italic(text))
```

:::tip Read decorators bottom-up when applying, top-down when calling
`@A @B def f` means `f = A(B(f))`. At call time, A's wrapper runs first (outermost), then calls B's wrapper, which calls the original.
:::

## 5. Built-in decorators from `functools`

```python
import functools

@functools.lru_cache(maxsize=None)        # or @functools.cache (3.9+)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(200))
print(fib.cache_info())

square_of = functools.partial(pow, exp=2)  # pre-fill an argument
print(square_of(9))
```

| Tool | What it does |
|---|---|
| `@lru_cache(maxsize=128)` | memoise with least-recently-used eviction |
| `@cache` | unbounded memoisation (3.9+) |
| `@wraps(fn)` | copy metadata onto a wrapper |
| `partial(fn, *a, **k)` | pre-fill arguments |
| `@singledispatch` | choose an implementation by the first argument's type |
| `@cached_property` | compute an attribute once per instance (see OOP) |
| `@total_ordering` | fill in comparison methods (see OOP) |

:::trap `lru_cache` requires hashable arguments
`fib([1, 2])` → `TypeError: unhashable type: 'list'`. Also, the cache holds references to arguments and results forever (with `maxsize=None`), which can leak memory, and on methods it keeps `self` alive. Use tuples as arguments and bound sizes.
:::

## 6. Class-based decorators & decorating classes

```python
import functools

class CountCalls:
    def __init__(self, fn):
        functools.update_wrapper(self, fn)
        self.fn = fn
        self.calls = 0
    def __call__(self, *args, **kwargs):      # instances are callable
        self.calls += 1
        return self.fn(*args, **kwargs)

@CountCalls
def ping():
    return "pong"

ping(); ping()
print(ping.calls, ping.__name__)

REGISTRY = {}
def register(cls):                # decorators work on classes too
    REGISTRY[cls.__name__.lower()] = cls
    return cls

@register
class Circle: pass
@register
class Square: pass
print(REGISTRY)
```

## Tricks & tips

- Write every wrapper as `def wrapper(*args, **kwargs)` so it works for any signature.
- Put cleanup in `try/finally` inside wrappers so it runs even on exceptions.
- `fn.__wrapped__` (added by `wraps`) lets tests reach the undecorated function.
- A decorator that returns the function **unchanged** but records it (a registry) is a powerful plugin pattern.
- Use `inspect.signature(fn)` inside decorators to validate or bind arguments.
- Decorator factories can make their arguments optional: `def deco(fn=None, *, opt=1): if fn is None: return partial(deco, opt=opt)`.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Forgetting `return wrapper` → the name becomes `None` | always return |
| 2 | Wrapper doesn't return `fn(...)`'s result | `return fn(*a, **k)` |
| 3 | Lost `__name__`/docstring | `@functools.wraps(fn)` |
| 4 | Late binding in loops | default args / `partial` |
| 5 | `@repeat` without `()` when it expects args | know which kind you wrote |
| 6 | Mutable state in decorator shared across ALL decorated functions | create state inside the decorator call |
| 7 | `lru_cache` on unhashable args | use tuples / frozensets |
| 8 | `UnboundLocalError` assigning a closed-over var | `nonlocal` |
| 9 | Decorator order mistakes | `A(B(f))` |
| 10 | Heavy work at decoration time slows imports | do work in the wrapper, lazily |

## Practice problems

:::problem basic | Make an adder factory | closures
Write `make_adder(n)` returning a function that adds `n`. Build a list of adders for 1..5 and apply each to 10. Make sure they **don't** all add 5.
:::solution
```python
def make_adder(n):
    def add(x):
        return x + n
    return add

adders = [make_adder(n) for n in range(1, 6)]
print([f(10) for f in adders])   # [11, 12, 13, 14, 15]
```
:::explain
Each call to `make_adder` creates a **new frame**, so each closure captures its own `n`. Compare `[lambda x: x + n for n in range(1, 6)]`, where every lambda shares the single comprehension variable `n` (late binding) and they'd all add 5.
:::end

:::problem basic | A logging decorator | decorators, wraps
Write `@log_calls` that prints `name(args) -> result` for every call and preserves the function's name and docstring.
:::solution
```python
import functools

def log_calls(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        parts = [repr(a) for a in args] + [f"{k}={v!r}" for k, v in kwargs.items()]
        result = fn(*args, **kwargs)
        print(f"{fn.__name__}({', '.join(parts)}) -> {result!r}")
        return result
    return wrapper

@log_calls
def power(base, exp=2):
    "Raise base to exp."
    return base ** exp

power(3); power(2, exp=10)
print(power.__name__, power.__doc__)
```
:::explain
The wrapper accepts anything with `*args, **kwargs`, forwards it unchanged, and **returns** the original result. Forgetting that return is the most common decorator bug: it silently turns every result into `None`.
:::end

:::problem basic | Fix the late-binding callbacks | late binding
The buttons below should print their own number, but they all print 4. Fix it in two different ways.
```python norun
handlers = []
for n in range(5):
    handlers.append(lambda: print("button", n))
```
:::solution
```python
handlers = []
for n in range(5):
    handlers.append(lambda n=n: print("button", n))   # fix 1: default arg
for h in handlers:
    h()

def make_handler(n):                                   # fix 2: factory function
    return lambda: print("button", n)
handlers2 = [make_handler(n) for n in range(5)]
handlers2[3]()
```
:::explain
Default values are evaluated **when the lambda is created**, which freezes the current `n`. A factory function gives each closure its own frame and therefore its own `n`.
:::end

:::problem medium | Memoize from scratch | closures, dict cache
Write a `@memoize` decorator (no `functools.lru_cache`) that caches results by positional and keyword arguments and exposes `.cache` and `.cache_clear()`. Use it to make naive Fibonacci fast.
:::solution
```python
import functools

def memoize(fn):
    cache = {}
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        key = (args, tuple(sorted(kwargs.items())))
        if key not in cache:
            cache[key] = fn(*args, **kwargs)
        return cache[key]
    wrapper.cache = cache
    wrapper.cache_clear = cache.clear
    return wrapper

calls = 0
@memoize
def fib(n):
    global calls
    calls += 1
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(80), "computed with", calls, "real calls")
fib.cache_clear(); print(len(fib.cache))
```
:::explain
The cache dict lives in the closure, so each decorated function gets its own. The key combines positional args with **sorted** keyword items, so `f(a=1, b=2)` and `f(b=2, a=1)` share an entry. Because the recursive calls go through the decorated name `fib`, they hit the cache too, and naive O(φⁿ) becomes O(n): 81 real calls instead of ~10¹⁶.
:::end

:::problem medium | Retry with exponential backoff | decorator factory, exceptions
Write `@retry(times=3, exceptions=(ValueError,), delay=0.01, backoff=2)` that re-calls the function when it raises one of the given exceptions, sleeping `delay`, then `delay*backoff`, … and re-raises after the last attempt.
:::solution
```python
import functools, time

def retry(times=3, exceptions=(Exception,), delay=0.01, backoff=2):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            wait = delay
            for attempt in range(1, times + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    if attempt == times:
                        raise
                    print(f"attempt {attempt} failed ({e}); retrying in {wait:.3f}s")
                    time.sleep(wait)
                    wait *= backoff
        return wrapper
    return decorator

state = {"n": 0}
@retry(times=4, exceptions=(ConnectionError,))
def flaky():
    state["n"] += 1
    if state["n"] < 3:
        raise ConnectionError("server busy")
    return "ok on try " + str(state["n"])

print(flaky())
```
:::explain
Three layers: `retry(...)` captures the configuration, `decorator(fn)` captures the function, and `wrapper` runs per call. A bare `raise` inside `except` re-raises the **current** exception with its original traceback. Exponential backoff (`wait *= backoff`) avoids hammering a struggling service, which is a standard production pattern (libraries like `tenacity` do exactly this).
:::end

:::problem medium | Rate limiter / call throttle | closures, time
Write `@throttle(seconds)` so that the function runs **at most once per `seconds`**. Calls inside the window return the previous result without calling the function. Use `time.monotonic`.
:::solution
```python
import functools, time

def throttle(seconds):
    def decorator(fn):
        last_time = None
        last_result = None
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            nonlocal last_time, last_result
            now = time.monotonic()
            if last_time is None or now - last_time >= seconds:
                last_time = now
                last_result = fn(*args, **kwargs)
            return last_result
        return wrapper
    return decorator

count = 0
@throttle(0.05)
def fetch():
    global count
    count += 1
    return f"data v{count}"

print(fetch(), fetch(), fetch())   # only the first call really runs
time.sleep(0.06)
print(fetch())                     # window passed: runs again
```
:::explain
The state (`last_time`, `last_result`) lives in the decorator's closure, so it's **per decorated function**, and `nonlocal` lets the wrapper update it. `time.monotonic()` never goes backwards, unlike `time.time()`, which can jump when the system clock changes. That's why it's the right clock for measuring intervals.
:::end

:::problem hard | Decorator with optional arguments | decorator factory tricks
Write `@debug` usable **both** as `@debug` and `@debug(prefix=">>")`. It prints the prefix, function name and result.
:::hint
If the first positional argument is a callable and no other arguments were given, you were used without parentheses.
:::solution
```python
import functools

def debug(fn=None, *, prefix="DEBUG"):
    if fn is None:                        # called as @debug(...) -> return a decorator
        return functools.partial(debug, prefix=prefix)
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        result = fn(*args, **kwargs)
        print(f"{prefix} {fn.__name__} -> {result!r}")
        return result
    return wrapper

@debug
def a():
    return 1

@debug(prefix=">>")
def b():
    return 2

a(); b()
```
:::explain
With `@debug`, Python calls `debug(a)`, so `fn` is the function. With `@debug(prefix=">>")`, Python first calls `debug(prefix=">>")`: `fn` is `None`, so we return `partial(debug, prefix=">>")`, which Python then applies to `b`. Making `prefix` **keyword-only** prevents `@debug(">>")` from being mistaken for a function.
:::end

:::problem hard | Type-checking decorator from annotations | inspect, decorators
Turn the type validator idea into `@enforce_types`: on every call, bind the arguments to the signature and raise `TypeError` if an argument (or the **return value**) doesn't match a plain-class annotation.
:::solution
```python
import functools, inspect

def enforce_types(fn):
    sig = inspect.signature(fn)
    hints = {n: p.annotation for n, p in sig.parameters.items() if isinstance(p.annotation, type)}
    ret = sig.return_annotation if isinstance(sig.return_annotation, type) else None

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        bound = sig.bind(*args, **kwargs)
        bound.apply_defaults()
        for name, val in bound.arguments.items():
            if name in hints and not isinstance(val, hints[name]):
                raise TypeError(f"{name}={val!r} is not {hints[name].__name__}")
        result = fn(*args, **kwargs)
        if ret is not None and not isinstance(result, ret):
            raise TypeError(f"return {result!r} is not {ret.__name__}")
        return result
    return wrapper

@enforce_types
def scale(values: list, factor: float = 1.0) -> list:
    return [v * factor for v in values]

print(scale([1, 2], 2.5))
for bad in [lambda: scale((1, 2)), lambda: scale([1], "x")]:
    try:
        bad()
    except TypeError as e:
        print("TypeError:", e)
```
:::explain
The expensive work (reading the signature and filtering annotations) happens **once at decoration time**, and only the cheap checks run per call. `sig.bind` gives exactly Python's own argument matching. Note that `scale([1], 2)` would fail because `2` is an `int`, not a `float`. Real tools treat `int` as acceptable for `float` (PEP 484's numeric tower), which is a good extension exercise.
:::end

:::problem hard | Event system with a registration decorator | registry pattern, closures
Build `EventBus` with a decorator method `@bus.on("event")` that registers handlers, and `bus.emit("event", **data)` that calls them in registration order, returning their results. Support `once=True` handlers that unregister after their first call.
:::solution
```python
class EventBus:
    def __init__(self):
        self.handlers = {}

    def on(self, event, *, once=False):
        def decorator(fn):
            self.handlers.setdefault(event, []).append((fn, once))
            return fn                         # registry decorators return fn unchanged
        return decorator

    def emit(self, event, **data):
        results, keep = [], []
        for fn, once in self.handlers.get(event, []):
            results.append(fn(**data))
            if not once:
                keep.append((fn, once))
        self.handlers[event] = keep
        return results

bus = EventBus()

@bus.on("signup")
def send_welcome(user):
    return f"welcome mail -> {user}"

@bus.on("signup", once=True)
def first_user_bonus(user):
    return f"bonus for first user {user}"

print(bus.emit("signup", user="ada"))
print(bus.emit("signup", user="linus"))
print(send_welcome("direct call still works"))
```
:::explain
`bus.on("signup")` returns a decorator that **closes over** `event` and `once`. The decorator stores the function and returns it unchanged, so the function still works normally (this is how Flask's `@app.route` and pytest's fixtures register things). Rebuilding the list during `emit` drops the `once` handlers safely, without mutating the list while iterating over it.
:::end
