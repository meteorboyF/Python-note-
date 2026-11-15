# Exceptions & Context Managers

Things go wrong: files are missing, users type letters where numbers belong, networks drop. An **exception** is Python's way of saying *"I can't continue here"*. It's an object that **travels up the call stack** until some code **handles** it, or the program crashes with a **traceback**. **Context managers** (`with`) guarantee cleanup no matter what happens.

:::analogy A fire alarm in a building
When a fire starts on floor 5 (an exception is raised), the alarm goes up floor by floor (the call stack) until someone trained for that kind of fire responds (`except`). If nobody responds, the building is evacuated (the program crashes). `finally` is the sprinkler: it runs whether or not there was a fire.
:::

**What you'll learn**: reading tracebacks, `try/except/else/finally` execution order, catching specific exceptions, the exception hierarchy, `raise`, re-raising, exception chaining (`raise … from …`), custom exception classes, EAFP vs LBYL, `assert`, exception groups (3.11+), context managers (`with`, `__enter__`/`__exit__`, `contextlib`), and `add_note`.

## 1. Reading a traceback

```python error
def parse_age(text):
    return int(text)

def register(user):
    age = parse_age(user["age"])
    return age

register({"age": "twenty"})
```

Read a traceback **from the bottom up**. The last line is the exception type and message: `ValueError: invalid literal for int() with base 10: 'twenty'`. Above it are the frames, **most recent call last**: `register` → `parse_age` → `int`.

## 2. `try` / `except` / `else` / `finally`

```python
def safe_div(a, b):
    try:
        result = a / b              # code that might fail
    except ZeroDivisionError:
        print("  can't divide by zero")
        return None
    except TypeError as e:          # bind the exception object
        print("  bad types:", e)
        return None
    else:                           # runs only if NO exception happened
        print("  success")
        return result
    finally:                        # ALWAYS runs: cleanup goes here
        print("  finally runs")

for args in [(6, 3), (1, 0), (1, "x")]:
    print(args, "->", safe_div(*args))
```

| Block | Runs when |
|---|---|
| `try` | always (until an exception) |
| `except X` | an exception matching `X` was raised in `try` |
| `else` | `try` finished **without** an exception |
| `finally` | **always**, even after `return`, `break`, or an unhandled exception |

:::tip Why `else` exists
Keep the `try` block **as small as possible**, so it only wraps the line that can fail. Put the follow-up work in `else`, so that an unrelated bug in it isn't accidentally caught by your `except`.
:::

:::trap `return` in `finally` swallows exceptions
If `finally` executes `return`, any exception in flight is **silently discarded**, and so is the `try`'s return value. Python 3.14 emits a `SyntaxWarning` for `return`/`break`/`continue` inside `finally` (PEP 765). Never do it.
:::

### Catch specific exceptions

```python
data = {"a": 1}
try:
    value = data["b"]
except KeyError:
    value = 0
print(value)

try:
    int("x")
except (ValueError, TypeError) as e:     # several types: use a tuple
    print(type(e).__name__, e)
```

:::trap Bare `except:` and `except Exception:` everywhere
`except:` also catches `KeyboardInterrupt` and `SystemExit`, so you can't even Ctrl+C out. `except Exception:` is better but still hides bugs (typos become "handled errors"). Catch the **narrowest** exception you can actually handle, and log or re-raise the rest.
:::

## 3. The exception hierarchy (the parts you need)

```text
BaseException
 ├── SystemExit, KeyboardInterrupt, GeneratorExit   ← don't catch these casually
 └── Exception
      ├── ArithmeticError → ZeroDivisionError, OverflowError
      ├── LookupError     → IndexError, KeyError
      ├── ValueError      → UnicodeDecodeError …
      ├── TypeError, NameError (→ UnboundLocalError), AttributeError
      ├── OSError         → FileNotFoundError, PermissionError, TimeoutError, ConnectionError …
      ├── ImportError     → ModuleNotFoundError
      ├── RuntimeError    → RecursionError, NotImplementedError
      ├── StopIteration, AssertionError
      └── ExceptionGroup (3.11+)
```

`except LookupError` catches both `IndexError` and `KeyError`, because `except` matches **subclasses**. Order your `except` clauses from **most specific to most general**.

## 4. Raising exceptions

```python
def withdraw(balance, amount):
    if amount <= 0:
        raise ValueError(f"amount must be positive, got {amount}")
    if amount > balance:
        raise RuntimeError("insufficient funds")
    return balance - amount

print(withdraw(100, 30))
try:
    withdraw(100, -5)
except ValueError as e:
    print("Rejected:", e)
```

### Re-raising and chaining

```python
import json

class ConfigError(Exception):
    pass

def load_config(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ConfigError("config file is not valid JSON") from e   # chain: keeps the cause

try:
    load_config("{bad json}")
except ConfigError as e:
    print("Error:", e)
    print("Caused by:", repr(e.__cause__))
```

| Form | Meaning |
|---|---|
| `raise` (bare, inside `except`) | re-raise the current exception unchanged |
| `raise New(...) from e` | explicit chaining: "The above exception was the direct cause…" |
| `raise New(...) from None` | hide the original context |
| raise inside `except` without `from` | implicit chaining: "During handling … another exception occurred" |

## 5. Custom exceptions

```python
class AppError(Exception):
    """Base class for all errors in this app."""

class ValidationError(AppError):
    def __init__(self, field, message):
        super().__init__(f"{field}: {message}")
        self.field = field

class NotFoundError(AppError):
    pass

def get_user(users, uid):
    if not isinstance(uid, int):
        raise ValidationError("uid", "must be an int")
    if uid not in users:
        raise NotFoundError(f"user {uid} not found")
    return users[uid]

users = {1: "ada"}
for uid in [1, "x", 2]:
    try:
        print(get_user(users, uid))
    except ValidationError as e:
        print("invalid ->", e, "| field:", e.field)
    except AppError as e:                 # catches every other app error
        print("app error ->", e)
```

:::boss Design an exception hierarchy
Give your library/app **one base exception** (`AppError(Exception)`) and specific subclasses. Callers can then catch everything from you with one clause, or handle particular cases precisely. Name them with an `Error` suffix and keep them lightweight.
:::

## 6. EAFP vs LBYL

- **LBYL**, *Look Before You Leap*: check first. `if key in d: v = d[key]`
- **EAFP**, *Easier to Ask Forgiveness than Permission*: try it, and handle failure. `try: v = d[key] except KeyError: …`

```python
import os
path = "missing.txt"
# LBYL: race condition! The file could vanish between the check and the open
if os.path.exists(path):
    pass
# EAFP: one atomic attempt
try:
    with open(path) as f:
        text = f.read()
except FileNotFoundError:
    text = ""
print(repr(text))
```

Python favours **EAFP**: it avoids race conditions and double lookups, and reads cleanly when failure is rare. Use LBYL when failure is common and cheap to check (e.g. `dict.get`).

## 7. `assert`: for programmer errors, not user input

```python
def mean(xs):
    assert len(xs) > 0, "mean() of empty list"   # documents an invariant
    return sum(xs) / len(xs)
print(mean([1, 2, 3]))
```

:::trap Asserts can be switched off
Running `python -O` removes all `assert` statements. Never use `assert` to validate user input or for security checks. Raise `ValueError`/`TypeError` instead.
:::

## 8. Context managers: `with`

A **context manager** sets something up on entry and **guarantees cleanup** on exit, even if the block raises.

```python
with open("demo.txt", "w") as f:       # f.close() is guaranteed
    f.write("hello\n")
print(f.closed)                         # True

class Timer:
    def __enter__(self):
        import time
        self.start = time.perf_counter()
        return self                     # bound to the name after `as`
    def __exit__(self, exc_type, exc, tb):
        import time
        self.elapsed = time.perf_counter() - self.start
        print(f"block took {self.elapsed * 1000:.2f} ms", "(with error)" if exc_type else "")
        return False                    # False/None = don't suppress exceptions

with Timer() as t:
    total = sum(range(100_000))
print(total)
```

`__exit__` receives the exception details (or three `None`s). Returning **True** suppresses the exception.

### The easy way: `contextlib.contextmanager`

```python
from contextlib import contextmanager, suppress

@contextmanager
def tag(name):
    print(f"<{name}>")
    try:
        yield name                       # the value for `as`; the with-block runs here
    finally:
        print(f"</{name}>")              # cleanup, even on error

with tag("div"):
    with tag("p"):
        print("content")

with suppress(FileNotFoundError):        # ignore a specific error
    open("nope.txt")
print("still running")
```

Other useful tools: `contextlib.ExitStack` (a dynamic number of context managers), `contextlib.redirect_stdout`, `tempfile.TemporaryDirectory()`, `threading.Lock()`, and `decimal.localcontext()`.

## 9. Exception groups (3.11+) and notes

```python
def validate(row):
    errors = []
    if not row.get("name"):
        errors.append(ValueError("name is required"))
    if not isinstance(row.get("age"), int):
        errors.append(TypeError("age must be int"))
    if errors:
        raise ExceptionGroup("invalid row", errors)

try:
    validate({"name": "", "age": "x"})
except* ValueError as eg:
    print("value problems:", [str(e) for e in eg.exceptions])
except* TypeError as eg:
    print("type problems:", [str(e) for e in eg.exceptions])

try:
    int("abc")
except ValueError as e:
    e.add_note("while parsing row 17 of users.csv")    # extra context (3.11+)
    print(e.__notes__)
```

## Tricks & tips

- Keep `try` blocks tiny. Put follow-up code in `else`.
- `logging.exception("msg")` inside `except` logs the full traceback.
- `traceback.format_exc()` gives the traceback as a string.
- `raise NotImplementedError` in abstract methods; `NotImplemented` (no "Error") is a value returned by `__eq__` & co.
- `dict.get`, `getattr(obj, name, default)` and `next(it, default)` avoid exceptions for "missing" cases.
- Use `with` for anything that must be released: files, locks, DB connections, temporary changes.
- `contextlib.closing(obj)` turns any object with `.close()` into a context manager.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Bare `except:` | catch specific exceptions |
| 2 | Swallowing errors (`except: pass`) | log, re-raise, or handle meaningfully |
| 3 | Huge `try` blocks | wrap only the risky line |
| 4 | `return` in `finally` | never |
| 5 | Using `assert` for validation | raise real exceptions |
| 6 | Losing the cause when wrapping | `raise New(...) from e` |
| 7 | Broad clause before a specific one | specific first |
| 8 | `except Exception, e:` (Python 2 syntax) | `except Exception as e:` |
| 9 | The `e` name is deleted after the `except` block | copy it if you need it later |
| 10 | Not closing files on error | `with open(...)` |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
def f():
    try:
        return "try"
    finally:
        print("cleanup")
print(f())
```
What prints?
- [ ] `try`
- [x] `cleanup` then `try`
- [ ] `try` then `cleanup`
`finally` runs **before** the function actually returns. The return value is computed first, `finally` prints, and then the caller receives `"try"` and prints it.
:::

:::quiz
```python norun
try:
    {}["k"]
except LookupError:
    print("lookup")
except KeyError:
    print("key")
```
What prints?
- [x] `lookup`
- [ ] `key`
- [ ] both lines
`KeyError` is a **subclass** of `LookupError`, so the first matching clause wins and only one handler runs. Put specific exceptions **before** general ones, or the specific handler is unreachable.
:::

:::quiz
```python norun
try:
    int("x")
except ValueError as e:
    msg = str(e)
print(msg[:7], "e" in dir())
```
What prints?
- [x] `invalid False`
- [ ] `invalid True`
- [ ] `NameError`
Python **deletes** the `as e` name at the end of the `except` block (to avoid reference cycles with the traceback). Copying what you need into another variable (`msg`) keeps it.
:::

## Practice problems

:::problem basic | Robust integer input | try/except, loops
Write `read_int(responses)` that simulates asking a user repeatedly (each item of `responses` is one "answer") until a valid integer is entered, and returns it along with the number of attempts. Return `None` if the responses run out.
:::solution
```python
def read_int(responses):
    for attempt, text in enumerate(responses, start=1):
        try:
            return int(text), attempt
        except ValueError:
            print(f"  {text!r} is not a whole number, try again")
    return None

print(read_int(["abc", "4.5", " 42 "]))
print(read_int(["x"]))
```
:::explain
`int()` raises `ValueError` for bad input. We catch it **specifically**, report it, and continue the loop. A successful parse returns immediately. With a real user, replace `responses` with `iter(input, None)`, or loop with `input()`.
:::end

:::problem basic | Execution order puzzle | else, finally, return
Predict the full output, then run it.
```python norun
def f(x):
    try:
        print("try")
        if x == 0:
            raise ValueError("zero")
        return "returned from try"
    except ValueError:
        print("except")
        return "returned from except"
    else:
        print("else")
    finally:
        print("finally")
```
:::solution
```python
def f(x):
    try:
        print("try")
        if x == 0:
            raise ValueError("zero")
        return "returned from try"
    except ValueError:
        print("except")
        return "returned from except"
    else:
        print("else")
    finally:
        print("finally")

print(f(1))
print("---")
print(f(0))
```
:::explain
For `f(1)`, the `try` executes `return`. `else` **doesn't run**: it only runs if `try` completes without an exception *and without returning*. `finally` runs, and then the return value is delivered. For `f(0)`: try → except → finally → return. Many people expect "else" for `f(1)`.
:::end

:::problem basic | Safe dictionary path | EAFP, LookupError
Write `get_path(data, "user.address.city", default=None)` that walks nested dicts and lists (numeric segments index lists) and returns `default` if any step is missing.
:::solution
```python
def get_path(data, path, default=None):
    cur = data
    for key in path.split("."):
        try:
            cur = cur[int(key)] if isinstance(cur, list) else cur[key]
        except (KeyError, IndexError, ValueError, TypeError):
            return default
    return cur

data = {"user": {"address": {"city": "Dhaka"}, "phones": ["111", "222"]}}
print(get_path(data, "user.address.city"))
print(get_path(data, "user.phones.1"))
print(get_path(data, "user.phones.9", "n/a"))
print(get_path(data, "user.name.first", "n/a"))
```
:::explain
EAFP: just try each lookup. `KeyError` (missing key), `IndexError` (list too short), `ValueError` (`int("abc")` on a list) and `TypeError` (indexing a string or None the wrong way) all mean "path doesn't exist". Catching a **tuple of specific** exceptions, rather than `Exception`, keeps real bugs visible.
:::end

:::problem medium | Custom exception hierarchy for a bank | custom exceptions, raise from
Create `BankError` → `InsufficientFunds(needed, available)` and `AccountLocked`. Implement `transfer(src, dst, amount)` on dict-based accounts that raises them appropriately, plus a wrapper that converts a `KeyError` for a missing account into `BankError(...) from e`.
:::solution
```python
class BankError(Exception):
    pass

class InsufficientFunds(BankError):
    def __init__(self, needed, available):
        super().__init__(f"need {needed}, have {available}")
        self.needed, self.available = needed, available

class AccountLocked(BankError):
    pass

accounts = {"ada": {"balance": 100, "locked": False}, "bob": {"balance": 5, "locked": True}}

def transfer(src, dst, amount):
    try:
        a, b = accounts[src], accounts[dst]
    except KeyError as e:
        raise BankError(f"no such account: {e.args[0]}") from e
    if a["locked"] or b["locked"]:
        raise AccountLocked(f"{src if a['locked'] else dst} is locked")
    if a["balance"] < amount:
        raise InsufficientFunds(amount, a["balance"])
    a["balance"] -= amount
    b["balance"] += amount

for args in [("ada", "zed", 10), ("ada", "bob", 10), ("ada", "ada", 500)]:
    try:
        transfer(*args)
    except InsufficientFunds as e:
        print("short by", e.needed - e.available)
    except BankError as e:
        print(type(e).__name__, "-", e, "| cause:", repr(e.__cause__))
```
:::explain
Callers can catch the precise problem (`InsufficientFunds` carries data they can act on) or the whole family (`BankError`). `raise … from e` preserves the original `KeyError` as `__cause__` for debugging, while giving a domain-meaningful message. Note the `except` order: the specific class comes before its base.
:::end

:::problem medium | Write a context manager two ways | __enter__/__exit__, @contextmanager
Write a context manager `temp_attr(obj, name, value)` that temporarily sets an attribute and **restores** the original (or deletes it if it didn't exist) on exit, even if the block raises. Implement it as a class and with `@contextmanager`.
:::solution
```python
from contextlib import contextmanager

_MISSING = object()

class TempAttr:
    def __init__(self, obj, name, value):
        self.obj, self.name, self.value = obj, name, value
    def __enter__(self):
        self.old = getattr(self.obj, self.name, _MISSING)
        setattr(self.obj, self.name, self.value)
        return self.obj
    def __exit__(self, *exc):
        if self.old is _MISSING:
            delattr(self.obj, self.name)
        else:
            setattr(self.obj, self.name, self.old)
        return False

@contextmanager
def temp_attr(obj, name, value):
    old = getattr(obj, name, _MISSING)
    setattr(obj, name, value)
    try:
        yield obj
    finally:
        if old is _MISSING:
            delattr(obj, name)
        else:
            setattr(obj, name, old)

class Settings: debug = False
s = Settings()
with TempAttr(s, "debug", True):
    print("inside:", s.debug)
print("after:", s.debug)
try:
    with temp_attr(s, "level", 3):
        print("inside:", s.level)
        raise RuntimeError("boom")
except RuntimeError:
    pass
print("level exists after?", hasattr(s, "level"))
```
:::explain
Both versions save the old state on entry and restore it on exit. In the generator version, the `try/finally` around `yield` is essential: without it, an exception in the `with` block would be raised at the `yield` and skip the restore. A sentinel distinguishes "attribute was missing" from "attribute was None". `unittest.mock.patch` is built on the same idea.
:::end

:::problem medium | Collect all validation errors | ExceptionGroup, except*
Validate a list of user dicts. Each user must have a non-empty `name` (str) and an `age` that's an int between 0 and 150. Raise **one** `ExceptionGroup` containing every problem, each tagged with the row number via `add_note`. Then handle `ValueError`s and `TypeError`s separately with `except*`.
:::solution
```python
def validate_users(users):
    problems = []
    for i, u in enumerate(users):
        name, age = u.get("name"), u.get("age")
        if not isinstance(name, str) or not name.strip():
            e = ValueError("name missing")
            e.add_note(f"row {i}")
            problems.append(e)
        if not isinstance(age, int) or isinstance(age, bool):
            e = TypeError(f"age is {type(age).__name__}")
            e.add_note(f"row {i}")
            problems.append(e)
        elif not 0 <= age <= 150:
            e = ValueError(f"age {age} out of range")
            e.add_note(f"row {i}")
            problems.append(e)
    if problems:
        raise ExceptionGroup("user validation failed", problems)

users = [{"name": "Ada", "age": 36}, {"name": "", "age": 200}, {"name": "Bo", "age": "7"}]
try:
    validate_users(users)
except* ValueError as eg:
    for e in eg.exceptions:
        print("ValueError:", e, e.__notes__)
except* TypeError as eg:
    for e in eg.exceptions:
        print("TypeError:", e, e.__notes__)
```
:::explain
Collecting every error (instead of stopping at the first) is much friendlier for form or CSV validation. `except*` splits the group: each clause receives a sub-group containing only matching exceptions, and **several clauses can run**, unlike a normal `except`. Notes attach context without needing a custom exception class.
:::end

:::problem hard | Transactional rollback with ExitStack | context managers, cleanup order
You must open N resources (simulated by a class whose `open()` may fail). If opening resource k fails, every already-opened resource must be closed **in reverse order**, and the original error must propagate. Use `contextlib.ExitStack`.
:::solution
```python
from contextlib import ExitStack

class Resource:
    log = []
    def __init__(self, name, fail=False):
        self.name, self.fail = name, fail
    def __enter__(self):
        if self.fail:
            raise OSError(f"cannot open {self.name}")
        Resource.log.append(f"open {self.name}")
        return self
    def __exit__(self, *exc):
        Resource.log.append(f"close {self.name}")
        return False

def use_all(specs):
    with ExitStack() as stack:
        handles = [stack.enter_context(Resource(n, f)) for n, f in specs]
        Resource.log.append("using " + ",".join(h.name for h in handles))

use_all([("db", False), ("cache", False), ("queue", False)])
try:
    use_all([("db", False), ("cache", False), ("queue", True), ("mail", False)])
except OSError as e:
    Resource.log.append(f"error: {e}")
print("\n".join(Resource.log))
```
:::explain
`ExitStack` registers each successfully entered context. On exit, normal or exceptional, it unwinds them in **LIFO** order, just like nested `with` statements, except the number is dynamic. When `queue` fails, `cache` and `db` are closed (in that order), and `mail` is never opened. This is the correct pattern for "open a variable number of files/connections" without a pyramid of `try/finally`.
:::end

:::problem hard | Retry-aware context manager with suppression rules | __exit__ return value
Write a class `Suppress(*types, max_count=None)` usable in a loop: it suppresses the listed exception types and records them in `.caught`, but once `max_count` exceptions have been suppressed, the next one propagates. Show it handling a batch where some items fail.
:::solution
```python
class Suppress:
    def __init__(self, *types, max_count=None):
        self.types, self.max_count = types, max_count
        self.caught = []
    def __enter__(self):
        return self
    def __exit__(self, exc_type, exc, tb):
        if exc_type is None or not issubclass(exc_type, self.types):
            return False                          # no error, or not ours: propagate
        if self.max_count is not None and len(self.caught) >= self.max_count:
            return False                          # budget exhausted: propagate
        self.caught.append(exc)
        return True                               # suppress

guard = Suppress(ValueError, max_count=2)
results = []
try:
    for raw in ["1", "x", "3", "y", "z", "6"]:
        with guard:
            results.append(int(raw))
except ValueError as e:
    print("gave up on:", e)
print(results, [str(e) for e in guard.caught])
```
:::explain
`__exit__` returning **True** tells Python the exception was handled, and execution continues after the `with` block. The same `guard` object is reused for every item, so its `caught` list accumulates across the loop. After two suppressions, `"z"` propagates out of the `with` and stops the loop. Error budgets like this are common in data pipelines: tolerate a few bad rows, but stop when data is clearly corrupt.
:::end

:::problem hard | Find the real cause | exception chaining, __cause__ / __context__
Write `root_cause(exc)` that follows `__cause__` (or, if absent, `__context__`, unless `__suppress_context__` is set) to the innermost exception. Demonstrate with a three-level chain created by `raise … from …` and implicit chaining.
:::solution
```python
def root_cause(exc):
    seen = set()
    while id(exc) not in seen:
        seen.add(id(exc))
        nxt = exc.__cause__ or (None if exc.__suppress_context__ else exc.__context__)
        if nxt is None:
            return exc
        exc = nxt
    return exc

def level3():
    return {}["missing"]

def level2():
    try:
        level3()
    except KeyError:
        raise ValueError("bad config value")        # implicit chaining (__context__)

def level1():
    try:
        level2()
    except ValueError as e:
        raise RuntimeError("startup failed") from e  # explicit chaining (__cause__)

try:
    level1()
except RuntimeError as e:
    rc = root_cause(e)
    print(type(e).__name__, "->", type(rc).__name__, repr(rc))
```
:::explain
`raise X from Y` sets `X.__cause__ = Y` (and `__suppress_context__ = True`). Raising inside an `except` block sets `__context__` automatically. Following these links reaches the original failure: here the `KeyError` three levels down. The `seen` set guards against pathological cycles. Error reporters (Sentry, logging frameworks) walk exactly these attributes to print "The above exception was the direct cause of…".
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Safe averages | Real-world task
Write `safe_average(values)` that averages the items it can convert with `float()`, **skipping** the bad ones (strings like `"abc"`, `None`, empty strings). Return `(average, skipped_count)`, and return `(None, skipped_count)` when nothing was valid.
:::starter
```python norun
def safe_average(values):
    pass
```
:::tests
```python norun
assert safe_average([1, "2", 3.0]) == (2.0, 0)
assert safe_average(["4", "abc", None, "", 8]) == (6.0, 3)
assert safe_average([]) == (None, 0)
assert safe_average(["x", None]) == (None, 2)
assert safe_average([" 5 ", "1e1"]) == (7.5, 0)
```
:::hint
`float(None)` raises `TypeError`, while `float("abc")` raises `ValueError`. Catch both with a tuple.
:::solution
```python
def safe_average(values):
    total, count, skipped = 0.0, 0, 0
    for v in values:
        try:
            total += float(v)
        except (ValueError, TypeError):
            skipped += 1
        else:                       # only runs when float() succeeded
            count += 1
    return (total / count if count else None), skipped

print(safe_average(["4", "abc", None, "", 8]))
```
:::explain
EAFP in action: just try the conversion. Catching **exactly** `ValueError` and `TypeError` (not a bare `except`) means a real bug, like a typo raising `NameError`, still surfaces. The `else` clause keeps the "success" bookkeeping out of the `try` block, so only the risky call is guarded.
:::complexity
O(n).
:::end

:::program medium | Validating config loader | Real-world task
Write `load_config(text)` that parses `key = value` lines and returns a dict with **int** values. Define a custom exception hierarchy: `ConfigError(Exception)` with subclasses `MissingKeyError` and `BadValueError`. Rules:
- blank lines and lines starting with `#` are ignored;
- a malformed line (no `=`) raises `ConfigError` mentioning its line number;
- a non-integer value raises `BadValueError` mentioning the key, **chained** from the original `ValueError` (`raise … from e`);
- the keys `host_port` and `workers` are required, otherwise raise `MissingKeyError` listing what's missing.
:::starter
```python norun
class ConfigError(Exception): pass
class MissingKeyError(ConfigError): pass
class BadValueError(ConfigError): pass

def load_config(text):
    pass
```
:::tests
```python norun
good = """
# server settings
host_port = 8080
workers= 4
"""
assert load_config(good) == {"host_port": 8080, "workers": 4}
assert "workers" in str(raises(MissingKeyError, load_config, "host_port = 1"))
assert raises(ConfigError, load_config, "host_port = 1")
assert "line 2" in str(raises(ConfigError, load_config, "host_port = 1\noops\nworkers = 2"))
assert "workers" in str(raises(BadValueError, load_config, "host_port = 1\nworkers = many"))
try:
    load_config("host_port = 1\nworkers = many")
except BadValueError as e:
    assert isinstance(e.__cause__, ValueError)
```
:::hint
Use `str.partition("=")` to split a line, and `enumerate(text.splitlines(), 1)` for line numbers. Wrap `int(value)` in `try/except ValueError as e:` and re-raise with `raise BadValueError(...) from e`.
:::solution
```python
class ConfigError(Exception): pass
class MissingKeyError(ConfigError): pass
class BadValueError(ConfigError): pass

REQUIRED = {"host_port", "workers"}

def load_config(text):
    config = {}
    for lineno, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        key, sep, value = line.partition("=")
        if not sep:
            raise ConfigError(f"line {lineno}: expected 'key = value', got {raw!r}")
        key, value = key.strip(), value.strip()
        try:
            config[key] = int(value)
        except ValueError as e:
            raise BadValueError(f"{key!r} must be an integer, got {value!r}") from e
    missing = sorted(REQUIRED - config.keys())
    if missing:
        raise MissingKeyError(f"missing required keys: {missing}")
    return config

print(load_config("host_port = 8080\nworkers = 4"))
try:
    load_config("host_port = 1\nworkers = many")
except ConfigError as e:
    print(type(e).__name__, "-", e, "| caused by:", repr(e.__cause__))
```
:::explain
A small **exception hierarchy** lets callers choose their level: catch `BadValueError` specifically, or any `ConfigError`. `raise … from e` keeps the original `ValueError` as `__cause__`, so debugging shows both the friendly message and the root cause. Line numbers in messages turn a confusing failure into a one-second fix, which is a mark of professional tooling.
:::complexity
O(total length of the text).
:::end

:::program medium | Retry with backoff | Real-world task
Write `retry(fn, attempts=3, exceptions=(Exception,), delays=None)` that calls `fn()` until it succeeds. On a listed exception, it records the delay it **would** sleep (start at 1, double each time, and append to `delays` if a list is given, instead of sleeping, for testability) and tries again. After the last failed attempt it re-raises the original exception. Exceptions not in `exceptions` propagate immediately.
:::starter
```python norun
def retry(fn, attempts=3, exceptions=(Exception,), delays=None):
    pass
```
:::tests
```python norun
calls = {"n": 0}
def flaky():
    calls["n"] += 1
    if calls["n"] < 3:
        raise ConnectionError("down")
    return "ok"
waits = []
assert retry(flaky, attempts=5, exceptions=(ConnectionError,), delays=waits) == "ok"
assert calls["n"] == 3 and waits == [1, 2]
def always_fails(): raise TimeoutError("slow")
waits2 = []
assert "slow" in str(raises(TimeoutError, retry, always_fails, 3, (TimeoutError,), waits2))
assert waits2 == [1, 2]
def bug(): raise KeyError("oops")
assert raises(KeyError, retry, bug, 5, (ConnectionError,))
```
:::solution
```python
def retry(fn, attempts=3, exceptions=(Exception,), delays=None):
    delay = 1
    for attempt in range(1, attempts + 1):
        try:
            return fn()
        except exceptions:
            if attempt == attempts:
                raise                      # re-raise the ORIGINAL exception, traceback intact
            if delays is not None:
                delays.append(delay)       # a real version would time.sleep(delay)
            delay *= 2

state = {"n": 0}
def sometimes():
    state["n"] += 1
    if state["n"] < 3:
        raise ConnectionError("network hiccup")
    return f"worked on attempt {state['n']}"

waits = []
print(retry(sometimes, attempts=5, exceptions=(ConnectionError,), delays=waits), waits)
```
:::explain
`except exceptions:` accepts a **tuple** of types, so callers control what counts as "transient". A bare `raise` inside `except` re-raises the current exception with its original traceback. Recording the delays instead of sleeping is **dependency injection** for testability: production code would pass in a sleep function. Exponential backoff (1, 2, 4 …) avoids hammering a struggling service.
:::complexity
O(attempts) calls.
:::end

:::program hard | Transaction with rollback | Real-world task
Write a context manager class `Transaction(store)` for a dict-based key-value `store`:
- inside the `with` block, `tx.set(key, value)` and `tx.delete(key)` change the store **immediately**;
- if the block raises, **every** change is undone, restoring the exact previous state (including keys that didn't exist before), and the exception still propagates;
- on success the changes are kept, and `tx.committed` is True.
:::starter
```python norun
class Transaction:
    def __init__(self, store):
        pass
    def __enter__(self):
        pass
    def __exit__(self, exc_type, exc, tb):
        pass
    def set(self, key, value):
        pass
    def delete(self, key):
        pass
```
:::tests
```python norun
store = {"a": 1, "b": 2}
with Transaction(store) as tx:
    tx.set("a", 10); tx.set("c", 3); tx.delete("b")
assert store == {"a": 10, "c": 3} and tx.committed
store2 = {"a": 1, "b": 2}
def failing():
    with Transaction(store2) as tx:
        tx.set("a", 99); tx.set("new", 1); tx.delete("b"); tx.set("a", 100)
        raise RuntimeError("boom")
assert "boom" in str(raises(RuntimeError, failing))
assert store2 == {"a": 1, "b": 2}
store3 = {"x": 1}
def bad_delete():
    with Transaction(store3) as tx:
        tx.set("x", 2); tx.delete("missing")
assert raises(KeyError, bad_delete) and store3 == {"x": 1}
```
:::hint
Keep an **undo log**: before each change, record `(key, old_value)`, using a private sentinel for "key didn't exist". On failure, replay the log **backwards**.
:::solution
```python
_MISSING = object()

class Transaction:
    def __init__(self, store):
        self.store = store
        self.log = []                         # (key, previous value or _MISSING)
        self.committed = False
    def __enter__(self):
        return self
    def set(self, key, value):
        self.log.append((key, self.store.get(key, _MISSING)))
        self.store[key] = value
    def delete(self, key):
        old = self.store[key]                 # raises KeyError if missing (before logging)
        self.log.append((key, old))
        del self.store[key]
    def __exit__(self, exc_type, exc, tb):
        if exc_type is None:
            self.committed = True
            return False
        for key, old in reversed(self.log):   # undo in reverse order
            if old is _MISSING:
                self.store.pop(key, None)
            else:
                self.store[key] = old
        return False                          # don't swallow the exception

data = {"balance": 100}
try:
    with Transaction(data) as tx:
        tx.set("balance", 40)
        tx.set("audit", "withdrew 60")
        raise ValueError("card declined")
except ValueError as e:
    print("rolled back:", data, "| reason:", e)
```
:::explain
This is the **undo-log** technique databases use. Each mutation first records how to reverse itself. `__exit__` receives the exception details: on success it marks the commit, and on failure it replays the log in **reverse**, which correctly handles a key changed several times (`a`: 1 → 99 → 100 restores to 1). The `_MISSING` sentinel distinguishes "key didn't exist" from "key held None". Returning `False` lets the original exception keep propagating.
:::trace
Failing transaction on `{"a": 1, "b": 2}`:
| operation | log entry | store after |
|---|---|---|
| set a=99 | (a, 1) | a=99, b=2 |
| set new=1 | (new, MISSING) | a=99, b=2, new=1 |
| delete b | (b, 2) | a=99, new=1 |
| set a=100 | (a, 99) | a=100, new=1 |
| **raise** → undo backwards | a←99, b←2, new removed, a←1 | **a=1, b=2** |
:::complexity
O(1) per operation, O(k) rollback for k operations.
:::end
