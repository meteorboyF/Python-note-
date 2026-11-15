# Pythonic Code, Typing, Testing & Concurrency

Code that *works* is the starting line. Professional Python is **readable** (idiomatic, PEP 8), **checked** (type hints + a type checker), **tested** (pytest), **reproducible** (virtual environments, pinned dependencies), **observable** (logging) and, when needed, **concurrent**. This chapter is the toolkit senior engineers expect you to know.

:::analogy From home cook to restaurant kitchen
A home cook can improvise. A restaurant kitchen needs labelled containers (type hints), recipe cards everyone follows (PEP 8), tasting before serving (tests), identical stations everywhere (virtual environments), an order log (logging), and several cooks working at once without collisions (concurrency).
:::

## 1. The Zen and idioms of Python

```python
import this
```

| Un-Pythonic | Pythonic |
|---|---|
| `for i in range(len(xs)): print(xs[i])` | `for x in xs: print(x)` |
| `for i in range(len(xs)): print(i, xs[i])` | `for i, x in enumerate(xs)` |
| `if len(xs) == 0:` | `if not xs:` |
| `if x == None:` | `if x is None:` |
| `if flag == True:` | `if flag:` |
| `tmp = a; a = b; b = tmp` | `a, b = b, a` |
| building a list with `append` in a loop | a comprehension |
| `d.has_key(k)` / `if k in d.keys()` | `if k in d` |
| `s = ""; for w in words: s += w` | `"".join(words)` |
| `open` without closing | `with open(...) as f:` |
| `try: ... except: pass` | catch specific exceptions |
| `type(x) == int` | `isinstance(x, int)` |
| manual counters/groupers | `Counter`, `defaultdict`, `itertools` |
| index juggling for pairs | `zip(xs, xs[1:])` |

```python
names = ["ada", "linus", "grace"]
ages = [36, 28, 45]
people = {n.title(): a for n, a in zip(names, ages) if a > 30}       # comprehension + zip
oldest = max(people, key=people.get)
print(people, oldest, f"{oldest!r} is {people[oldest]}")
first, *rest = sorted(people.items(), key=lambda kv: kv[1])
print(first, rest)
```

## 2. PEP 8 and tooling

**PEP 8** is Python's style guide: 4-space indents, `snake_case` functions and variables, `CapWords` classes, `UPPER_CASE` constants, at most ~79–99 characters per line, two blank lines between top-level definitions, imports at the top (standard library, then third-party, then local).

| Tool | Job |
|---|---|
| **ruff** | a very fast linter + formatter (replaces flake8, isort, pyupgrade, …) |
| **black** | an opinionated formatter ("no style debates") |
| **mypy** / **pyright** | static type checkers |
| **pytest** | testing |
| **pre-commit** | runs all of the above automatically before every git commit |

```text
pip install ruff mypy pytest
ruff check . --fix      # lint and auto-fix
ruff format .           # format
mypy src/               # type-check
pytest -q               # run the tests
```

## 3. Type hints in practice

```python
from __future__ import annotations
from typing import Iterable, Callable, TypedDict, Literal, Optional
from dataclasses import dataclass

class UserRow(TypedDict):                 # a dict with known keys and value types
    name: str
    age: int

Mode = Literal["mean", "max"]

def summarise(rows: Iterable[UserRow], mode: Mode = "mean") -> float:
    ages = [r["age"] for r in rows]
    return sum(ages) / len(ages) if mode == "mean" else float(max(ages))

def apply_twice(f: Callable[[int], int], x: int) -> int:
    return f(f(x))

def find(users: list[UserRow], name: str) -> Optional[UserRow]:   # Optional[X] == X | None
    return next((u for u in users if u["name"] == name), None)

users: list[UserRow] = [{"name": "ada", "age": 36}, {"name": "bob", "age": 41}]
print(summarise(users), summarise(users, "max"), apply_twice(lambda n: n * 3, 2), find(users, "zed"))
```

:::tip Annotate the boundaries first
You don't need hints on every local variable. Annotate **function signatures**, public class attributes and data structures. Accept the most general type (`Iterable`, `Sequence`, `Mapping`) and return the most specific one (`list[str]`). Run `mypy --strict` on new code to catch `None` bugs before they reach production.
:::

```python norun
def total(prices: list[float]) -> float:
    return sum(prices)

total(["3", "4"])   # mypy: error: List item 0 has incompatible type "str"; expected "float"
                    # Python itself would only fail at run time (TypeError inside sum)
```

## 4. Testing with pytest

```python norun
# file: stats_utils.py
def mean(xs):
    if not xs:
        raise ValueError("mean of empty sequence")
    return sum(xs) / len(xs)

# file: test_stats_utils.py   (pytest finds test_*.py files and test_* functions)
import pytest
from stats_utils import mean

def test_mean_basic():
    assert mean([1, 2, 3]) == 2

@pytest.mark.parametrize("xs, expected", [([5], 5), ([1, 2], 1.5), ([-1, 1], 0)])
def test_mean_many(xs, expected):
    assert mean(xs) == pytest.approx(expected)

def test_mean_empty_raises():
    with pytest.raises(ValueError, match="empty"):
        mean([])

@pytest.fixture
def sample_data():                # fixtures: reusable setup, injected by name
    return [2, 4, 6]

def test_with_fixture(sample_data):
    assert mean(sample_data) == 4
```

You can't run pytest inside the page, but the same ideas work with plain `assert` and the standard library's `unittest`:

```python
import unittest

def slugify(title: str) -> str:
    return "-".join(title.lower().split())

class TestSlugify(unittest.TestCase):
    def test_basic(self):
        self.assertEqual(slugify("Hello World"), "hello-world")
    def test_extra_spaces(self):
        self.assertEqual(slugify("  Python   Notes "), "python-notes")
    def test_empty(self):
        self.assertEqual(slugify(""), "")

result = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(TestSlugify))
print("all passed:", result.wasSuccessful())
```

| Test type | Checks | Speed |
|---|---|---|
| **Unit** | one function/class in isolation | milliseconds |
| **Integration** | components together (DB, files) | slower |
| **End-to-end** | the whole system like a user | slowest |
| **Property-based** (`hypothesis`) | invariants on random inputs | finds edge cases you missed |

:::boss Testing habits that pay off
Write a test that **fails first** (reproduce the bug), then fix it. Test edge cases: empty, one element, duplicates, negatives, huge inputs, unicode. Use `unittest.mock` to replace slow or external things (network, time, randomness). Several practice problems on this site used a brute-force **oracle** on random inputs, and that's property-based testing in miniature.
:::

## 5. Virtual environments and dependencies

```text
python -m venv .venv                 # create an isolated environment in .venv/
source .venv/bin/activate            # activate (Windows: .venv\Scripts\activate)
pip install pandas matplotlib        # installs go INTO .venv only
pip freeze > requirements.txt        # pin exact versions
pip install -r requirements.txt      # reproduce on another machine
deactivate
```

:::term Virtual environment
A **virtual environment** is a private folder with its own Python interpreter link and `site-packages`. Each project gets its own versions of its dependencies, so upgrading pandas for project A can't break project B. Never `pip install` into the system Python. Modern tools like **uv** (very fast), **poetry** and **pipenv** wrap venv with lock files and a `pyproject.toml`.
:::

A minimal `pyproject.toml`:

```text
[project]
name = "pynotes-tools"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["pandas>=2.2", "matplotlib>=3.8"]

[tool.ruff]
line-length = 99
```

## 6. Logging instead of print

```python
import logging, io

stream = io.StringIO()
logging.basicConfig(level=logging.INFO, stream=stream, force=True,
                    format="%(asctime)s %(levelname)-7s %(name)s: %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("pipeline")

def load(n):
    log.info("loading %d rows", n)          # lazy %-formatting: only formatted if emitted
    if n == 0:
        log.warning("empty input")
    try:
        return 10 / n
    except ZeroDivisionError:
        log.exception("division failed")     # logs the full traceback at ERROR level
        return None

load(5); load(0)
log.debug("hidden: below the INFO threshold")
print(stream.getvalue())
```

| Level | Use |
|---|---|
| `DEBUG` | detailed diagnostics |
| `INFO` | normal milestones |
| `WARNING` | something unexpected, but it continues |
| `ERROR` | an operation failed |
| `CRITICAL` | the program may not continue |

## 7. Performance: measure first

```python
import cProfile, pstats, io, timeit

def slow_unique(xs):
    out = []
    for x in xs:
        if x not in out:              # O(n) inside a loop -> O(n^2)
            out.append(x)
    return out

def fast_unique(xs):
    return list(dict.fromkeys(xs))   # O(n), keeps order

data = list(range(3000)) * 2
print("slow:", round(timeit.timeit(lambda: slow_unique(data), number=3), 3), "s")
print("fast:", round(timeit.timeit(lambda: fast_unique(data), number=3), 4), "s")

pr = cProfile.Profile()
pr.enable(); slow_unique(data); pr.disable()
s = io.StringIO()
pstats.Stats(pr, stream=s).sort_stats("cumulative").print_stats(3)
print(s.getvalue()[:600])
```

*"Premature optimisation is the root of all evil."* Profile, find the hot spot, fix the **algorithm** (Big-O) first, then use vectorisation (NumPy/Pandas), caching (`functools.cache`), or compiled tools (Numba, Cython) if still needed.

## 8. Concurrency: threads, processes, asyncio

| | `threading` | `multiprocessing` | `asyncio` |
|---|---|---|---|
| Runs | many threads in one process | many processes | many coroutines in one thread |
| Best for | **I/O-bound** work (network, disk) | **CPU-bound** work (number crunching) | huge numbers of I/O waits (thousands of sockets) |
| GIL limits it? | yes, for CPU work | no (separate interpreters) | n/a (one thread) |
| Data sharing | shared memory (needs locks) | pickled messages | shared, single-threaded |
| Overhead | low | high (process start, pickling) | very low |

:::term The GIL
CPython's **Global Interpreter Lock** lets only one thread execute Python bytecode at a time. Threads still speed up I/O-bound work, because waiting on the network releases the GIL, but they don't speed up pure-Python CPU work. Use processes for that, or NumPy, which releases the GIL inside C code. Python 3.13+ offers an optional **free-threaded** build without the GIL (PEP 703), still maturing in 3.14.
:::

### `concurrent.futures`: the easy, unified API

```python local
import time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

def fake_download(i):
    time.sleep(0.2)                       # I/O wait (releases the GIL)
    return f"page {i}"

def cpu_heavy(n):
    return sum(k * k for k in range(n))   # pure-Python CPU work (holds the GIL)

if __name__ == "__main__":
    t = time.perf_counter()
    pages = [fake_download(i) for i in range(8)]
    print(f"sequential I/O: {time.perf_counter() - t:.2f}s")

    t = time.perf_counter()
    with ThreadPoolExecutor(max_workers=8) as pool:
        pages = list(pool.map(fake_download, range(8)))
    print(f"threads I/O:    {time.perf_counter() - t:.2f}s", pages[:2])

    jobs = [2_000_000] * 4
    t = time.perf_counter(); [cpu_heavy(n) for n in jobs]
    print(f"sequential CPU: {time.perf_counter() - t:.2f}s")
    t = time.perf_counter()
    with ProcessPoolExecutor() as pool:
        list(pool.map(cpu_heavy, jobs))
    print(f"processes CPU:  {time.perf_counter() - t:.2f}s")
```

:::trap Race conditions
When threads update shared data (`counter += 1` is read, add, write: three steps), updates can be lost. Protect shared state with `threading.Lock()` (`with lock: counter += 1`), or avoid sharing entirely by passing messages through `queue.Queue`. With processes, always put the start-up code under `if __name__ == "__main__":`.
:::

```python local
import threading, time

counter = 0
lock = threading.Lock()

def add_many(n, use_lock):
    global counter
    for _ in range(n):
        if use_lock:
            with lock:
                counter += 1
        else:
            tmp = counter          # read
            time.sleep(0)          # give up the CPU here, as a busy real system might
            counter = tmp + 1      # write (another thread may have written in between!)

for use_lock in (False, True):
    counter = 0
    threads = [threading.Thread(target=add_many, args=(10_000, use_lock)) for _ in range(4)]
    for t in threads: t.start()
    for t in threads: t.join()
    print(f"lock={use_lock}: counter = {counter} (expected 40000)")
```

### asyncio: cooperative concurrency

```python local
import asyncio, time

async def fetch(name, delay):
    await asyncio.sleep(delay)            # yields control while "waiting on the network"
    return f"{name} done after {delay}s"

async def main():
    t = time.perf_counter()
    results = await asyncio.gather(fetch("a", 1), fetch("b", 1), fetch("c", 1))   # run concurrently
    print(results, f"total {time.perf_counter() - t:.2f}s (not 3s)")
    try:
        await asyncio.wait_for(fetch("slow", 5), timeout=0.5)
    except TimeoutError:
        print("timed out, as intended")

asyncio.run(main())
```

`async def` defines a **coroutine**, and `await` pauses it until the awaited thing finishes, letting other coroutines run meanwhile. One thread juggles thousands of waiting tasks. That's how web servers (FastAPI), scrapers (aiohttp) and chat bots scale. Never call blocking functions (`time.sleep`, `requests.get`) inside async code: use `asyncio.sleep`, an async HTTP client, or `asyncio.to_thread(blocking_fn)`.

## 9. Project structure

```text
my_project/
├── pyproject.toml          # metadata, dependencies, tool config
├── README.md
├── src/
│   └── my_project/
│       ├── __init__.py
│       ├── data.py         # loading/cleaning
│       ├── features.py
│       └── cli.py          # argparse entry point
├── tests/
│   ├── test_data.py
│   └── test_features.py
└── .gitignore              # .venv/, __pycache__/, *.pyc, data/
```

## Tricks & tips

- `python -m pip`, `python -m venv`, `python -m pytest` always use the interpreter you meant.
- `breakpoint()` drops into the debugger; `python -X importtime` finds slow imports.
- `functools.cache`, `itertools`, `collections` and `dataclasses` remove whole categories of hand-written code.
- Prefer composition, small functions and pure functions: easier to test, type and reuse.
- Write a docstring for every public function, saying what it takes, returns and raises.
- Pin dependencies for applications, and use version ranges for libraries.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Installing into the system Python | one venv per project |
| 2 | Unpinned dependencies ("works on my machine") | lock files / `requirements.txt` |
| 3 | `print` debugging left in production | `logging` with levels |
| 4 | Threads for CPU-bound work | processes / NumPy |
| 5 | Shared mutable state between threads without locks | `Lock`, `Queue`, or immutability |
| 6 | Blocking calls inside `async` code | async libraries / `to_thread` |
| 7 | Optimising without profiling | `cProfile`, `timeit` first |
| 8 | Tests that depend on order, time or randomness | fixtures, seeds, mocks |
| 9 | Type hints that lie (never checked) | run mypy in CI |
| 10 | Bare `except` swallowing errors | specific exceptions + logging |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python
def add(item, bucket=[]):
    bucket.append(item)
    return bucket
add(1)
print(add(2))
```
Which tool would flag this **before** you ran it?
- [ ] mypy (a type checker)
- [x] a linter such as Ruff or pylint (B006 / W0102)
- [ ] pytest
It prints `[1, 2]` because the default list is created once and shared between calls. Linters have a rule for **mutable default arguments** (Ruff's B006, pylint's W0102). mypy only checks types, and pytest only catches it if you happen to write that exact test.
:::

:::quiz
```python
import logging
log = logging.getLogger("demo")
log.debug("a")
log.info("b")
log.warning("c")
```
With no logging configuration at all, what is printed (to stderr)?
- [x] only `c`
- [ ] `a`, `b`, `c`
- [ ] nothing
An unconfigured logger falls back to the **last-resort handler** at level WARNING, so only `c` appears. Call `logging.basicConfig(level=logging.INFO)` once at program start to see `b` too.
:::

:::quiz
```python
from typing import Optional
def find(xs: list[int], t: int) -> Optional[int]:
    return xs.index(t) if t in xs else None
print(find.__annotations__["return"], find(["a"], "a"))
```
What prints?
- [x] `int | None 0`
- [ ] `TypeError: expected int`
- [ ] `int | None None`
Type hints are **not enforced at runtime**: passing strings works fine and returns 0. They're metadata (`__annotations__`) for tools like mypy and IDEs. Since Python 3.14, `Optional[int]` is literally the same object as `int | None` and prints that way (older versions print `typing.Optional[int]`).
:::

## Practice problems

:::problem basic | Refactor to idiomatic Python | idioms
Rewrite this function in idiomatic Python without changing its behaviour, then verify both versions agree on random inputs.
```python norun
def report(names, scores):
    result = []
    for i in range(len(names)):
        if scores[i] != None and scores[i] >= 50:
            result.append(names[i].upper() + ": " + str(scores[i]))
    if len(result) == 0:
        return "nobody passed"
    out = ""
    for r in result:
        out = out + r + "; "
    return out[:-2]
```
:::solution
```python
import random

def report_old(names, scores):
    result = []
    for i in range(len(names)):
        if scores[i] != None and scores[i] >= 50:
            result.append(names[i].upper() + ": " + str(scores[i]))
    if len(result) == 0:
        return "nobody passed"
    out = ""
    for r in result:
        out = out + r + "; "
    return out[:-2]

def report(names, scores):
    passed = [f"{name.upper()}: {score}" for name, score in zip(names, scores)
              if score is not None and score >= 50]
    return "; ".join(passed) or "nobody passed"

for _ in range(500):
    n = random.randint(0, 6)
    names = [random.choice(["ada", "bo", "cy"]) for _ in range(n)]
    scores = [random.choice([None, 10, 50, 77, 99]) for _ in range(n)]
    assert report(names, scores) == report_old(names, scores)
print(report(["ada", "bo"], [91, None]), "|", report([], []))
```
:::explain
`zip` replaces index juggling, a comprehension replaces the append loop, `is not None` replaces `!= None`, `"; ".join` replaces quadratic string building and the `[:-2]` slice hack, and `or` supplies the fallback when the joined string is empty. The random equivalence test proves the refactor didn't change behaviour, which is the safe way to clean up legacy code.
:::end

:::problem basic | Write unit tests with unittest | testing, edge cases
Write `is_valid_email(s)` (exactly one `@`, non-empty local part, a domain containing a dot that isn't at either end, no spaces) and a `unittest.TestCase` covering at least 6 cases, including edge cases. Run it in the page.
:::solution
```python
import unittest

def is_valid_email(s: str) -> bool:
    if " " in s or s.count("@") != 1:
        return False
    local, domain = s.split("@")
    return bool(local) and "." in domain and not domain.startswith(".") and not domain.endswith(".")

class TestEmail(unittest.TestCase):
    def test_valid(self):
        for e in ["a@b.co", "first.last@mail.example.org"]:
            self.assertTrue(is_valid_email(e), e)
    def test_missing_at(self):
        self.assertFalse(is_valid_email("ab.co"))
    def test_two_ats(self):
        self.assertFalse(is_valid_email("a@b@c.com"))
    def test_empty_local(self):
        self.assertFalse(is_valid_email("@b.com"))
    def test_dot_edges(self):
        self.assertFalse(is_valid_email("a@.com"))
        self.assertFalse(is_valid_email("a@com."))
    def test_spaces(self):
        self.assertFalse(is_valid_email("a b@c.com"))

r = unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(TestEmail))
print("passed:", r.wasSuccessful())
```
:::explain
Good tests target the **boundaries** of each rule: zero, one and two `@`s, an empty local part, dots at the edges, whitespace. Each test checks one idea, and its name says which, so a failure explains itself. Real email validation is far more complex (see RFC 5322), which is why production code usually just sends a confirmation email.
:::end

:::problem medium | Mock time and randomness | unittest.mock, determinism
`greet()` returns "Good morning"/"Good afternoon"/"Good evening" based on the current hour, plus a random emoji from a list. Make it **testable** by injecting the clock and the random choice, and test all three greetings deterministically using `unittest.mock.patch`.
:::solution
```python
import random, datetime
from unittest import mock

EMOJIS = ["🍪", "☕", "🐍"]

def greet(now=None, choose=random.choice):
    now = now or datetime.datetime.now()
    part = "morning" if now.hour < 12 else "afternoon" if now.hour < 18 else "evening"
    return f"Good {part} {choose(EMOJIS)}"

# 1) dependency injection: pass fakes in directly
for hour, expected in [(9, "morning"), (14, "afternoon"), (21, "evening")]:
    out = greet(now=datetime.datetime(2026, 11, 15, hour), choose=lambda xs: xs[0])
    assert out == f"Good {expected} 🍪", out

# 2) patching: replace a module attribute temporarily
with mock.patch("random.choice", return_value="🐍") as fake:
    print(greet(now=datetime.datetime(2026, 11, 15, 8), choose=random.choice), "| called:", fake.call_count)
print("all deterministic checks passed")
```
:::explain
Code that reads the clock or randomness directly is untestable, because each run differs. **Dependency injection** (parameters with real defaults) lets tests pass fakes, which is the cleanest fix. `mock.patch` swaps an attribute during a `with` block and records how it was called, which is useful when you can't change the signature. The patched name must be the one the code **looks up** at call time.
:::end

:::problem medium | Structured logging for a pipeline | logging, levels, handlers
Configure a logger that writes INFO+ messages to one in-memory stream and WARNING+ to another (as if to a separate alert file), then run a small pipeline that logs progress, a skipped bad record (a warning) and a failure with its traceback.
:::solution
```python
import io, logging

info_stream, alert_stream = io.StringIO(), io.StringIO()
log = logging.getLogger("etl")
log.setLevel(logging.DEBUG)
log.handlers.clear()
fmt = logging.Formatter("%(levelname)s %(name)s: %(message)s")
for stream, level in [(info_stream, logging.INFO), (alert_stream, logging.WARNING)]:
    h = logging.StreamHandler(stream); h.setLevel(level); h.setFormatter(fmt); log.addHandler(h)

rows = ["10", "20", "oops", "40"]
total = 0
log.info("starting with %d rows", len(rows))
for i, r in enumerate(rows):
    try:
        total += int(r)
    except ValueError:
        log.warning("row %d skipped: %r is not a number", i, r)
try:
    avg = total / (len(rows) - 4)
except ZeroDivisionError:
    log.exception("could not compute the average")
log.info("finished, total=%d", total)
print("--- info log ---\n" + info_stream.getvalue())
print("--- alerts ---\n" + alert_stream.getvalue())
```
:::explain
A logger can have several **handlers**, each with its own level and destination: everything goes to the main log, and only problems reach the alert channel. `log.exception` inside `except` attaches the traceback automatically. `%`-style arguments are formatted lazily, only if the message is actually emitted. In production, the handlers write to files, stdout (for containers) or log services.
:::end

:::problem hard | Concurrent downloader with a thread pool | concurrent.futures, as_completed, errors
Simulate fetching 12 URLs where each takes 0.1–0.4 s and ~20% fail. Use a `ThreadPoolExecutor` with 4 workers, process results **as they complete**, retry failures once, and report the total time vs the sequential estimate.
:::solution
```python local
import random, time
from concurrent.futures import ThreadPoolExecutor, as_completed

random.seed(3)
DELAYS = {f"https://site/{i}": random.uniform(0.1, 0.4) for i in range(12)}
FAILS = {u for u in DELAYS if random.random() < 0.2}

def fetch(url, attempt=1):
    time.sleep(DELAYS[url])
    if url in FAILS and attempt == 1:
        raise ConnectionError(f"{url} failed")
    return url, len(url) * 100

if __name__ == "__main__":
    t0 = time.perf_counter()
    results, retried = {}, []
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(fetch, u): u for u in DELAYS}
        for fut in as_completed(futures):                  # in completion order, not submission order
            url = futures[fut]
            try:
                u, size = fut.result()
                results[u] = size
            except ConnectionError:
                retried.append(url)
                u, size = pool.submit(fetch, url, 2).result()
                results[u] = size
    elapsed = time.perf_counter() - t0
    print(f"{len(results)} pages, retried {len(retried)}; {elapsed:.2f}s vs ~{sum(DELAYS.values()):.2f}s sequential")
```
:::explain
`submit` returns a **Future** (a placeholder for a result that isn't ready yet). `as_completed` yields futures as soon as each finishes, so fast pages are processed without waiting for slow ones. Exceptions raised in a worker re-raise when you call `.result()`, which is where we catch them and retry. With 4 workers and I/O-bound tasks (sleep releases the GIL), the total time drops to roughly a quarter of the sequential sum.
:::end

:::problem hard | Async rate-limited crawler | asyncio, Semaphore, gather
Simulate crawling 20 pages with `asyncio`, allowing at most 5 requests in flight at once (`asyncio.Semaphore`), a 0.5 s timeout per request (some "pages" are slow), and collect successes and timeouts. Report the peak concurrency actually reached.
:::solution
```python local
import asyncio, random, time

random.seed(7)
LATENCY = {i: random.choice([0.1, 0.2, 0.3, 0.9]) for i in range(20)}   # 0.9 s pages will time out

async def fetch(i, sem, stats):
    async with sem:                              # at most 5 inside this block at once
        stats["active"] += 1
        stats["peak"] = max(stats["peak"], stats["active"])
        try:
            await asyncio.wait_for(asyncio.sleep(LATENCY[i]), timeout=0.5)
            return i, "ok"
        except TimeoutError:
            return i, "timeout"
        finally:
            stats["active"] -= 1

async def crawl():
    sem, stats = asyncio.Semaphore(5), {"active": 0, "peak": 0}
    t0 = time.perf_counter()
    results = await asyncio.gather(*(fetch(i, sem, stats) for i in range(20)))
    ok = [i for i, s in results if s == "ok"]
    slow = [i for i, s in results if s == "timeout"]
    print(f"{len(ok)} ok, {len(slow)} timeouts {slow}; peak concurrency {stats['peak']}; {time.perf_counter() - t0:.2f}s")

asyncio.run(crawl())
```
:::explain
`gather` starts all 20 coroutines, but the `Semaphore(5)` acts as a turnstile: only five may be inside `async with sem` at a time, which is how polite crawlers and API clients respect rate limits. `wait_for` cancels anything slower than 0.5 s. Updating the shared `stats` dict is safe without locks because asyncio runs everything in **one thread**, so switches only happen at `await` points. Total time ≈ (20 pages ÷ 5 slots) × the typical latency, far less than running them one by one.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | A timing context manager | Real-world task
Write a context manager `timer(label, sink=print, clock=time.perf_counter)` that measures the block and calls `sink(f"{label}: {ms:.1f} ms")`, **even if the block raises** (the exception must still propagate). Inject `clock` so it can be tested deterministically.
:::starter
```python norun
import time
from contextlib import contextmanager

@contextmanager
def timer(label, sink=print, clock=time.perf_counter):
    pass
```
:::tests
```python norun
ticks = iter([1.0, 1.25])
out = []
with timer("load", sink=out.append, clock=lambda: next(ticks)):
    pass
assert out == ["load: 250.0 ms"]
ticks = iter([0.0, 0.002]); out.clear()
def boom():
    with timer("boom", sink=out.append, clock=lambda: next(ticks)):
        raise KeyError("x")
assert raises(KeyError, boom)
assert out == ["boom: 2.0 ms"]
```
:::solution
```python
import time
from contextlib import contextmanager

@contextmanager
def timer(label, sink=print, clock=time.perf_counter):
    start = clock()
    try:
        yield
    finally:                                   # runs on success AND on exception
        sink(f"{label}: {(clock() - start) * 1000:.1f} ms")

with timer("sum"):
    sum(range(100_000))
```
:::explain
`@contextmanager` turns a generator into a context manager: code before `yield` is `__enter__`, and code after it is `__exit__`. Wrapping the `yield` in `try/finally` makes the report run even when the block raises, and since nothing catches the exception, it still propagates. **Dependency injection** of `clock` and `sink` (instead of hard-coding `time` and `print`) is what makes the test deterministic: a fake clock returns exact ticks.
:::complexity
O(1) overhead.
:::end

:::program medium | Log file summariser | Real-world task
Parse lines like `2024-05-01 12:00:03 ERROR db: timeout after 30s`. Return a dict containing `counts` (per level), `top_errors` (the 2 most common ERROR **sources**, as `(source, count)`), and `bad_lines` (the count of lines that don't match the format). Use a compiled regex with named groups.
:::starter
```python norun
import re
from collections import Counter

def summarise(lines):
    pass
```
:::tests
```python norun
log = """2024-05-01 12:00:03 ERROR db: timeout after 30s
2024-05-01 12:00:04 INFO api: GET /users 200
garbage line
2024-05-01 12:00:05 ERROR db: connection reset
2024-05-01 12:00:06 WARNING cache: miss rate 40%
2024-05-01 12:00:07 ERROR auth: bad token
2024-05-01 12:00:08 ERROR db: timeout after 30s

2024-05-01 12:00:09 INFO api: GET /items 200""".splitlines()
r = summarise(log)
assert r["counts"] == {"ERROR": 4, "INFO": 2, "WARNING": 1}
assert r["top_errors"] == [("db", 3), ("auth", 1)]
assert r["bad_lines"] == 1
assert summarise([]) == {"counts": {}, "top_errors": [], "bad_lines": 0}
```
:::hint
Use `re.compile(r"^(?P<date>\S+) (?P<time>\S+) (?P<level>[A-Z]+) (?P<source>\w+): (?P<msg>.*)$")`. Skip blank lines without counting them as bad.
:::solution
```python
import re
from collections import Counter

LINE = re.compile(r"^(?P<date>\d{4}-\d\d-\d\d) (?P<time>[\d:]+) (?P<level>[A-Z]+) (?P<source>\w+): (?P<msg>.*)$")

def summarise(lines):
    levels, errors, bad = Counter(), Counter(), 0
    for line in lines:
        if not line.strip():
            continue
        m = LINE.match(line)
        if m is None:
            bad += 1
            continue
        levels[m["level"]] += 1
        if m["level"] == "ERROR":
            errors[m["source"]] += 1
    return {"counts": dict(levels), "top_errors": errors.most_common(2), "bad_lines": bad}

print(summarise(["2024-05-01 12:00:03 ERROR db: timeout", "oops"]))
```
:::explain
Compile the regex **once**, at module level. **Named groups** (`m["level"]`) make it self-documenting and survive reordering. Two `Counter`s do the tallying, and `most_common(k)` gives the top-k. Real pipelines must be **robust to junk**: count and skip malformed lines instead of crashing on line 3 million. Since the function takes an iterable of lines, you can pass it an open file and it streams in O(1) memory.
:::complexity
O(total characters) time, O(distinct levels + sources) memory.
:::end

:::program medium | A tiny CLI with argparse | Real-world task
Write `parse(argv)` for a tool `resize`: a positional `paths` (1 or more), `--width/-w` (a required int > 0), an optional `--quality` (an int from 1–100, default 85), and a `--dry-run` flag. Invalid input must raise `SystemExit` (argparse's behaviour).
:::starter
```python norun
import argparse

def parse(argv):
    pass
```
:::tests
```python norun
a = parse(["a.png", "b.png", "-w", "640"])
assert a.paths == ["a.png", "b.png"] and a.width == 640 and a.quality == 85 and a.dry_run is False
b = parse(["x.jpg", "--width", "10", "--quality", "100", "--dry-run"])
assert b.quality == 100 and b.dry_run is True
import contextlib, io
with contextlib.redirect_stderr(io.StringIO()):
    assert raises(SystemExit, parse, ["a.png"])                   # missing --width
    assert raises(SystemExit, parse, ["-w", "5"])                 # no paths
    assert raises(SystemExit, parse, ["a.png", "-w", "0"])         # not > 0
    assert raises(SystemExit, parse, ["a.png", "-w", "5", "--quality", "101"])
```
:::solution
```python
import argparse

def positive_int(text):
    value = int(text)
    if value <= 0:
        raise argparse.ArgumentTypeError(f"must be > 0, got {value}")
    return value

def parse(argv):
    p = argparse.ArgumentParser(prog="resize", description="Resize images.")
    p.add_argument("paths", nargs="+", help="image files")
    p.add_argument("-w", "--width", type=positive_int, required=True)
    p.add_argument("--quality", type=int, choices=range(1, 101), default=85, metavar="1-100")
    p.add_argument("--dry-run", action="store_true", help="show what would happen")
    return p.parse_args(argv)

print(parse(["a.png", "-w", "640", "--dry-run"]))
```
:::explain
argparse does the validation and the `--help` text for you. `nargs="+"` means one or more, `action="store_true"` makes a flag, and `--dry-run` becomes the attribute `dry_run`. **Custom `type=` functions** are the clean way to validate: raise `ArgumentTypeError` and argparse turns it into a proper usage error (exit code 2). Taking `argv` as a parameter (instead of reading `sys.argv`) is what makes a CLI testable.
:::complexity
O(len(argv)).
:::end

:::program hard | Token-bucket rate limiter | Real-world task
Implement `TokenBucket(rate, capacity, clock=time.monotonic)`. `allow(cost=1)` returns True and spends tokens if enough are available, otherwise False. Tokens refill continuously at `rate` per second, up to `capacity`. Add `retry_after(cost=1)`, which returns the seconds until `cost` tokens will be available. Use type hints and `__slots__`.
:::starter
```python norun
import time

class TokenBucket:
    def __init__(self, rate: float, capacity: float, clock=time.monotonic):
        pass
```
:::tests
```python norun
now = [0.0]
b = TokenBucket(rate=2, capacity=4, clock=lambda: now[0])
assert [b.allow() for _ in range(5)] == [True, True, True, True, False]      # starts full
assert abs(b.retry_after() - 0.5) < 1e-9
now[0] = 0.5
assert b.allow() is True and b.allow() is False
now[0] = 100.0
assert b.allow(4) is True and b.allow() is False                             # capped at capacity
assert b.allow(5) is False and b.retry_after(5) == float("inf")
assert raises(ValueError, TokenBucket, 0, 1)
assert not hasattr(b, "__dict__")
```
:::hint
Store `tokens` and `last` (the timestamp). On every call, first **refill**: `tokens = min(capacity, tokens + (now - last) * rate)`, then update `last`. A cost larger than the capacity can never succeed, so `retry_after` should return `inf`.
:::solution
```python
import time
from typing import Callable

class TokenBucket:
    __slots__ = ("rate", "capacity", "tokens", "last", "clock")

    def __init__(self, rate: float, capacity: float, clock: Callable[[], float] = time.monotonic) -> None:
        if rate <= 0 or capacity <= 0:
            raise ValueError("rate and capacity must be positive")
        self.rate, self.capacity, self.clock = rate, capacity, clock
        self.tokens: float = capacity                  # start full: allow an initial burst
        self.last: float = clock()

    def _refill(self) -> None:
        now = self.clock()
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
        self.last = now

    def allow(self, cost: float = 1) -> bool:
        self._refill()
        if cost <= self.tokens:
            self.tokens -= cost
            return True
        return False

    def retry_after(self, cost: float = 1) -> float:
        self._refill()
        if cost > self.capacity:
            return float("inf")
        return max(0.0, (cost - self.tokens) / self.rate)

b = TokenBucket(rate=5, capacity=2)
print([b.allow() for _ in range(3)], round(b.retry_after(), 2))
```
:::explain
The token bucket is how real APIs implement rate limits: it allows **bursts** up to `capacity` while enforcing an average of `rate` per second. Refilling **lazily** (computing the tokens from elapsed time when asked) avoids background threads and timers. `time.monotonic` is the correct clock because wall-clock time can jump backwards (NTP, DST). The injected clock makes the tests exact instead of `sleep`-based and flaky. `__slots__` saves memory per instance and forbids typo attributes (`b.tokns = 3` raises).
:::complexity
O(1) per call, O(1) memory.
:::end
