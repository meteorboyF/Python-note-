# Files, Modules & Standard Library

Real programs read and write files, split code across modules, and lean on Python's huge **standard library** (the "batteries included"). This chapter covers the parts you'll use every week: file I/O, `pathlib`, text encodings, CSV/JSON, `datetime`, `collections`, `math`/`random`/`statistics`, `os`/`sys`, and how `import` really works.

:::analogy A kitchen with labelled drawers
Your script is the cook. **Modules** are drawers of tools (`math`, `json`, `datetime`), and `import` opens a drawer. A **package** is a cabinet of drawers. **Files** are the pantry: you open the door (`open`), take or put things in (read/write), and must close it again (`with` does that for you).
:::

## 1. Reading and writing text files

```python
# write (mode "w" truncates/creates; "a" appends; "x" fails if the file exists)
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("line one\n")
    f.writelines(["line two\n", "line three\n"])
    print("a printed line", file=f)

# read everything
with open("notes.txt", encoding="utf-8") as f:
    print(repr(f.read()))

# iterate line by line: memory efficient for huge files
with open("notes.txt", encoding="utf-8") as f:
    for n, line in enumerate(f, 1):
        print(n, line.rstrip("\n"))

with open("notes.txt", encoding="utf-8") as f:
    print(f.readline(), f.readlines())      # one line, then the remaining lines as a list
```

| Mode | Meaning |
|---|---|
| `"r"` | read text (default) |
| `"w"` | write, **truncating** the file |
| `"a"` | append to the end |
| `"x"` | exclusive create (error if it exists) |
| `"b"` | binary (`"rb"`, `"wb"`): bytes, not str |
| `"+"` | read and write (`"r+"`) |

:::trap Always pass `encoding="utf-8"`
Without it, Python uses the platform default (historically cp1252 on Windows), so files that work on Linux break on Windows with `UnicodeDecodeError`. Python 3.15 makes UTF-8 the default everywhere (PEP 686), but being explicit is the safe habit. For binary data (images, pickles) use `"rb"`/`"wb"`.
:::

### Text vs bytes

```python
s = "café ☕"
b = s.encode("utf-8")          # str -> bytes
print(b, len(s), len(b))       # 6 characters, 9 bytes
print(b.decode("utf-8"))       # bytes -> str
with open("img.bin", "wb") as f:
    f.write(bytes([0x89, 0x50, 0x4E, 0x47]))
with open("img.bin", "rb") as f:
    print(f.read())
```

## 2. `pathlib`: paths as objects

```python
from pathlib import Path

base = Path("project")
data = base / "data" / "raw"            # / joins paths, OS-independent
data.mkdir(parents=True, exist_ok=True)
(data / "a.csv").write_text("x,y\n1,2\n", encoding="utf-8")
(data / "b.csv").write_text("x,y\n3,4\n", encoding="utf-8")

p = data / "a.csv"
print(p.name, p.stem, p.suffix, p.parent)
print(p.exists(), p.is_file(), p.stat().st_size, "bytes")
print(sorted(x.name for x in data.glob("*.csv")))
print(sorted(str(x) for x in base.rglob("*.csv")))
print(p.read_text(encoding="utf-8").splitlines())
print(p.with_suffix(".json").name, p.resolve().is_absolute())
```

:::tip Prefer `pathlib` over `os.path`
`Path` objects join with `/`, have `.read_text()`/`.write_text()`, `.glob()`/`.rglob()`, `.exists()` and `.mkdir(parents=True)`, and every modern API accepts them. `os.path.join(a, b)` still works, but it's string juggling.
:::

## 3. CSV and JSON

```python
import csv, json

rows = [{"name": "Ada", "score": 91}, {"name": "Linus", "score": 78}]
with open("scores.csv", "w", newline="", encoding="utf-8") as f:   # newline="" is required for csv
    w = csv.DictWriter(f, fieldnames=["name", "score"])
    w.writeheader()
    w.writerows(rows)

with open("scores.csv", newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        print(row, type(row["score"]))       # CSV values are always strings!

payload = {"users": rows, "count": 2, "ok": True, "missing": None}
text = json.dumps(payload, indent=2)
print(text[:60], "...")
back = json.loads(text)
print(back["users"][0]["score"] + 1)
with open("data.json", "w", encoding="utf-8") as f:
    json.dump(payload, f)
with open("data.json", encoding="utf-8") as f:
    print(json.load(f)["ok"])
```

| Python | JSON |
|---|---|
| `dict` | object `{}` (keys become **strings**!) |
| `list`, `tuple` | array `[]` (tuples come back as lists) |
| `str` | string |
| `int`, `float` | number (`nan`/`inf` are non-standard) |
| `True`/`False`/`None` | `true`/`false`/`null` |
| `set`, `datetime`, custom objects | **not serialisable** → pass `default=` |

```python
import json, datetime
print(json.dumps({1: "a"}))       # {"1": "a"}  <- int key became a string
print(json.dumps({"when": datetime.date(2026, 11, 15)}, default=str))
```

## 4. Dates and times: `datetime`

```python
from datetime import datetime, date, timedelta, timezone

now = datetime(2026, 11, 15, 14, 30)
print(now.isoformat(), now.strftime("%d %b %Y, %H:%M"))
parsed = datetime.strptime("2026-01-31 08:00", "%Y-%m-%d %H:%M")
print(parsed + timedelta(days=1, hours=3))
print((date(2026, 12, 25) - date(2026, 11, 15)).days, "days to go")
utc = datetime(2026, 11, 15, 12, 0, tzinfo=timezone.utc)
print(utc.astimezone(timezone(timedelta(hours=6))))     # UTC+6
print(datetime.fromisoformat("2026-11-15T09:15:00+00:00").hour)
```

:::trap Naive vs aware datetimes
A **naive** datetime has no timezone, so you can't compare or subtract it with an **aware** one (`TypeError`). Store and compute in UTC (`datetime.now(timezone.utc)`), and convert to local time only for display. Use `zoneinfo.ZoneInfo("Asia/Dhaka")` for real time zones (DST-aware). `datetime.utcnow()` is deprecated.
:::

## 5. `collections`, `math`, `random`, `statistics`

```python
from collections import Counter, defaultdict, deque, namedtuple, OrderedDict, ChainMap
import math, random, statistics

print(Counter("mississippi").most_common(2))
groups = defaultdict(list)
for word in ["apple", "avocado", "banana"]:
    groups[word[0]].append(word)
print(dict(groups))
Point = namedtuple("Point", "x y")
print(Point(3, 4)._asdict(), math.hypot(*Point(3, 4)))

print(math.sqrt(16), math.isqrt(17), math.gcd(12, 18), math.lcm(4, 6), math.comb(5, 2), math.perm(5, 2))
print(math.ceil(2.1), math.floor(-2.1), math.inf > 10**100, math.prod([1, 2, 3, 4]))

random.seed(42)                           # reproducible randomness
print(random.randint(1, 6), random.choice("abc"), random.sample(range(10), 3))
xs = [1, 2, 3, 4, 5]; random.shuffle(xs); print(xs)
print(statistics.mean([2, 4, 9]), statistics.median([3, 1, 2]), round(statistics.stdev([2, 4, 4, 5]), 3))
```

## 6. `os`, `sys`, and the environment

```python
import os, sys, platform
print(sys.version_info[:2], platform.system())
print(os.getcwd() != "")
print(os.environ.get("HOME", "unknown") != "")      # env vars, with a default
print(sys.argv[:1])                                 # command-line arguments
print(len(sys.path) > 0)                            # where imports are searched
```

For command-line tools, use `argparse` (in the standard library), which gives you `--help`, types and defaults for free.

## 7. Modules, packages and `import`

```python
import math                       # import the module object
from math import pi, sqrt         # import names from it
from collections import Counter as C   # alias
import json as js
print(math.pi == pi, sqrt(9), C("aab"), js.dumps([1]))
```

What `import x` actually does:

1. Checks `sys.modules` (a cache). If `x` is already imported, it reuses it, so **a module body runs only once**.
2. Otherwise it searches `sys.path` for `x.py` or a package folder `x/`.
3. It creates a module object and **executes the file top to bottom** in that module's namespace.
4. It binds the name `x` in your namespace.

### `if __name__ == "__main__":`

```python
# mymodule.py
def helper():
    return 42

if __name__ == "__main__":          # True only when run directly: python mymodule.py
    print("running as a script:", helper())
```

When a file is **imported**, `__name__` is the module's name (`"mymodule"`). When it's **run**, `__name__` is `"__main__"`. The guard keeps test or demo code from running on import.

### Packages

```text
shop/
├── __init__.py        ← runs on `import shop`; may re-export names
├── cart.py
└── payments/
    ├── __init__.py
    └── card.py        ← from shop.payments.card import charge
```

Inside a package, `from . import cart` and `from .payments.card import charge` are **relative imports**.

:::trap Circular imports & name shadowing
If `a.py` imports `b` and `b.py` imports `a`, one of them sees a **half-initialised** module, which typically shows up as an `ImportError` or `AttributeError`. Fix it by moving shared code to a third module, or by importing inside the function. Also, never name your file `random.py`, `json.py` or `math.py`: it **shadows** the standard library module for every import in that folder.
:::

```python
import sys, types
mod = types.ModuleType("demo_mod")
exec("counter = 0\ncounter += 1\nprint('module body ran')", mod.__dict__)
sys.modules["demo_mod"] = mod
import demo_mod            # cached: the body does NOT run again
import demo_mod
print(demo_mod.counter)
```

## Standard library tour (worth knowing exists)

| Module | Use it for |
|---|---|
| `itertools`, `functools`, `operator` | iteration tools, caching/partial, `itemgetter`/`attrgetter` |
| `collections`, `heapq`, `bisect`, `array` | data structures |
| `re`, `string`, `textwrap`, `difflib` | text processing |
| `pathlib`, `shutil`, `glob`, `tempfile` | files and directories |
| `json`, `csv`, `pickle`, `sqlite3`, `tomllib` | data formats and a built-in database |
| `datetime`, `zoneinfo`, `time`, `calendar` | dates and times |
| `logging`, `argparse`, `unittest`, `doctest` | app infrastructure |
| `dataclasses`, `enum`, `typing`, `abc` | modern class design |
| `concurrent.futures`, `threading`, `multiprocessing`, `asyncio`, `subprocess` | concurrency |
| `urllib`, `http`, `socket`, `email` | networking |
| `hashlib`, `secrets`, `uuid` | hashing, secure tokens, IDs |
| `decimal`, `fractions`, `statistics`, `random` | numbers |

:::trap `random` is not for secrets
`random` is predictable (Mersenne Twister). For passwords, tokens and API keys, use `secrets.token_hex()`, `secrets.choice()` and `secrets.token_urlsafe()`.
:::

## Tricks & tips

- `Path(__file__).parent / "data.csv"` finds files next to your script, whatever the current directory is.
- `json.dumps(obj, indent=2, sort_keys=True, ensure_ascii=False)` gives pretty, stable, Unicode-friendly output.
- `with open(a) as src, open(b, "w") as dst:` opens several files in one `with`.
- `print(*rows, sep="\n")` prints a list one item per line.
- `shutil.copy`, `shutil.rmtree` and `shutil.make_archive` cover copying, deleting trees and zipping.
- `sqlite3` gives you a real SQL database in one file with zero setup.
- `python -m http.server`, `python -m json.tool file.json` and `python -m timeit "expr"` are handy CLI tools.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Forgetting to close files | `with open(...)` |
| 2 | Missing `encoding` | `encoding="utf-8"` |
| 3 | Mode `"w"` wipes the file | `"a"` to append, `"x"` to protect |
| 4 | CSV blank lines on Windows | `newline=""` |
| 5 | CSV values are strings | convert types explicitly |
| 6 | JSON turns int keys into strings | convert back, or use lists of pairs |
| 7 | Naive vs aware datetimes | use UTC-aware everywhere |
| 8 | Shadowing stdlib modules with your file names | unique names |
| 9 | `random` for security | `secrets` |
| 10 | Relative paths depend on the CWD | build from `Path(__file__).parent` |

## Practice problems

:::problem basic | Word count of a file | files, Counter
Write a text file with a few sentences, then report the line count, word count, and top 3 words (case-insensitive, punctuation stripped), streaming line by line.
:::solution
```python
import re
from collections import Counter
from pathlib import Path

Path("essay.txt").write_text("The cat sat.\nThe cat ran!\nA dog, the end.\n", encoding="utf-8")

lines = 0
counts = Counter()
with open("essay.txt", encoding="utf-8") as f:
    for line in f:
        lines += 1
        counts.update(re.findall(r"[a-z']+", line.lower()))
print(lines, sum(counts.values()), counts.most_common(3))
```
:::explain
Iterating the file object reads one line at a time, so this scales to huge files. `Counter.update` with an iterable adds 1 per word. The regex `[a-z']+` extracts words and drops punctuation.
:::end

:::problem basic | Path toolkit | pathlib
Create the folder tree `logs/2026/11` with three files (`a.log`, `b.log`, `c.txt`). Then list all `.log` files recursively, rename `.txt` files to `.log`, and print the total size.
:::solution
```python
from pathlib import Path

root = Path("logs")
day = root / "2026" / "11"
day.mkdir(parents=True, exist_ok=True)
for name, text in [("a.log", "alpha"), ("b.log", "beta!"), ("c.txt", "gamma")]:
    (day / name).write_text(text, encoding="utf-8")

for p in root.rglob("*.txt"):
    p.rename(p.with_suffix(".log"))

logs = sorted(root.rglob("*.log"))
print([str(p.relative_to(root)) for p in logs])
print(sum(p.stat().st_size for p in logs), "bytes")
```
:::explain
`mkdir(parents=True, exist_ok=True)` makes the whole tree idempotently. `rglob` searches recursively. `with_suffix` swaps the extension, and `rename` moves the file. We materialise `rglob` results into a list before renaming in other loops, because changing a directory while iterating over it can confuse the iterator.
:::end

:::problem basic | JSON round trip with dates | json, default, object_hook
Save `{"event": "launch", "when": datetime(2026, 11, 15, 9, 30)}` to JSON and load it back, so that `when` is a `datetime` again.
:::solution
```python
import json
from datetime import datetime

def encode(o):
    if isinstance(o, datetime):
        return {"__datetime__": o.isoformat()}
    raise TypeError(f"not serialisable: {type(o).__name__}")

def decode(d):
    if "__datetime__" in d:
        return datetime.fromisoformat(d["__datetime__"])
    return d

original = {"event": "launch", "when": datetime(2026, 11, 15, 9, 30)}
text = json.dumps(original, default=encode)
back = json.loads(text, object_hook=decode)
print(text)
print(back == original, type(back["when"]).__name__)
```
:::explain
`default` is called for objects JSON doesn't know. We tag them with a marker key. `object_hook` is called for **every** decoded JSON object, and it converts tagged dicts back. Raising `TypeError` for unknown types matches the `json` module's own contract.
:::end

:::problem medium | CSV report with type conversion | csv, aggregation
Given CSV text with columns `date,region,amount`, compute the total amount per region and the best day overall, and write a summary CSV sorted by total, descending.
:::solution
```python
import csv, io
from collections import defaultdict

raw = """date,region,amount
2026-11-01,north,120.50
2026-11-01,south,80
2026-11-02,north,99.5
2026-11-02,east,300
2026-11-03,south,150.25
"""
totals = defaultdict(float)
by_day = defaultdict(float)
for row in csv.DictReader(io.StringIO(raw)):
    amt = float(row["amount"])           # strings -> numbers
    totals[row["region"]] += amt
    by_day[row["date"]] += amt

best_day = max(by_day, key=by_day.get)
out = io.StringIO()
w = csv.writer(out)
w.writerow(["region", "total"])
for region, total in sorted(totals.items(), key=lambda kv: kv[1], reverse=True):
    w.writerow([region, f"{total:.2f}"])
print(out.getvalue())
print("best day:", best_day, by_day[best_day])
```
:::explain
`io.StringIO` acts as an in-memory file, which is great for tests and examples. `max(d, key=d.get)` returns the key with the largest value. Sorting `.items()` by value gives the ranking. In real life, Pandas does this in two lines (Part 5), but knowing the standard library version means you can work without dependencies.
:::end

:::problem medium | Business days between dates | datetime, timedelta
Count the business days (Mon–Fri) between two dates inclusive, excluding a given set of holidays. Do it in O(1) per full week plus O(7), not by looping over every day for long ranges.
:::solution
```python
from datetime import date, timedelta

def business_days(start, end, holidays=()):
    if end < start:
        return 0
    days = (end - start).days + 1
    full_weeks, extra = divmod(days, 7)
    count = full_weeks * 5
    for i in range(extra):                        # leftover days (< 7)
        if (start + timedelta(days=full_weeks * 7 + i)).weekday() < 5:
            count += 1
    count -= sum(1 for h in set(holidays) if start <= h <= end and h.weekday() < 5)
    return count

def brute(start, end, holidays=()):
    hs = set(holidays)
    return sum(1 for i in range((end - start).days + 1)
               if (d := start + timedelta(days=i)).weekday() < 5 and d not in hs)

s, e = date(2026, 11, 1), date(2027, 3, 31)
hol = [date(2026, 12, 25), date(2027, 1, 1), date(2026, 12, 26)]   # Dec 26 2026 is a Saturday
print(business_days(s, e, hol), brute(s, e, hol))
```
:::explain
Every 7 consecutive days contain exactly 5 weekdays, so whole weeks cost O(1), and only the remainder (< 7 days) needs checking. Holidays are subtracted only if they fall on a weekday **inside** the range, which is why the Saturday holiday doesn't count twice. The brute-force version acts as an **oracle** to verify the clever one.
:::end

:::problem medium | Config loader with layered sources | ChainMap, os.environ, json
Load configuration where **environment variables** (prefixed `APP_`) override a **JSON file**, which overrides **defaults**. Use `collections.ChainMap` so lookups check layers in order without copying. Values from the environment must be converted to the default's type.
:::solution
```python
import json, os
from collections import ChainMap
from pathlib import Path

DEFAULTS = {"debug": False, "port": 8000, "name": "app"}
Path("config.json").write_text(json.dumps({"port": 9000, "name": "shop"}), encoding="utf-8")
os.environ["APP_DEBUG"] = "true"
os.environ["APP_PORT"] = "7000"

def convert(value, like):
    if isinstance(like, bool):
        return value.lower() in ("1", "true", "yes", "on")
    return type(like)(value)

file_cfg = json.loads(Path("config.json").read_text(encoding="utf-8"))
env_cfg = {k[4:].lower(): convert(v, DEFAULTS.get(k[4:].lower(), ""))
           for k, v in os.environ.items() if k.startswith("APP_")}
config = ChainMap(env_cfg, file_cfg, DEFAULTS)
print(dict(config))
print(config.maps[1]["port"], "from file, but effective port:", config["port"])
```
:::explain
`ChainMap` searches its dicts **left to right**, so the first one containing the key wins. Nothing is copied, and changes to the layers show through. Environment values are always strings, so we coerce them using the default's type. Note that `bool("false")` would be `True`, which is why bools need special parsing.
:::end

:::problem hard | Tail -f style last N lines | files, deque, seek
Write `tail(path, n)` that returns the last `n` lines of a potentially huge file **without reading the whole file**: read fixed-size blocks backwards from the end using `seek`. Compare against a simple `deque(f, maxlen=n)` version.
:::solution
```python
import os
from collections import deque

with open("big.log", "w", encoding="utf-8") as f:
    for i in range(1, 50_001):
        f.write(f"line {i}: {'x' * (i % 30)}\n")

def tail_deque(path, n):
    with open(path, encoding="utf-8") as f:
        return [ln.rstrip("\n") for ln in deque(f, maxlen=n)]   # O(file) time, O(n) memory

def tail_seek(path, n, block=4096):
    with open(path, "rb") as f:
        f.seek(0, os.SEEK_END)
        pos = f.tell()
        data = b""
        while pos > 0 and data.count(b"\n") <= n:
            step = min(block, pos)
            pos -= step
            f.seek(pos)
            data = f.read(step) + data
    lines = data.decode("utf-8").splitlines()
    return lines[-n:]

print(tail_seek("big.log", 3))
print(tail_seek("big.log", 5) == tail_deque("big.log", 5))
```
:::explain
The deque version is simple and memory-safe, but it still **reads every byte**. The seek version jumps to the end and reads 4 KiB blocks backwards until it has seen more than `n` newlines, so the cost depends on `n`, not the file size. We open in **binary** mode because seeking to arbitrary byte offsets in text mode isn't allowed. We decode only at the end, so a multi-byte UTF-8 character split across blocks is reassembled correctly.
:::end

:::problem hard | A tiny key-value store on SQLite | sqlite3, context managers
Implement `KVStore(path)` backed by `sqlite3` with `set`, `get(default)`, `delete`, `keys(prefix)` and `__len__`. Writes must be **transactional**: use the connection as a context manager so a failing batch is rolled back.
:::solution
```python
import sqlite3

class KVStore:
    def __init__(self, path=":memory:"):
        self.db = sqlite3.connect(path)
        with self.db:
            self.db.execute("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)")
    def set(self, k, v):
        with self.db:                                  # commit on success, rollback on error
            self.db.execute("INSERT INTO kv VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", (k, v))
    def set_many(self, pairs):
        with self.db:
            for k, v in pairs:
                if v is None:
                    raise ValueError(f"None value for {k}")
                self.db.execute("INSERT OR REPLACE INTO kv VALUES (?, ?)", (k, v))
    def get(self, k, default=None):
        row = self.db.execute("SELECT v FROM kv WHERE k = ?", (k,)).fetchone()
        return row[0] if row else default
    def delete(self, k):
        with self.db:
            self.db.execute("DELETE FROM kv WHERE k = ?", (k,))
    def keys(self, prefix=""):
        cur = self.db.execute("SELECT k FROM kv WHERE k LIKE ? ORDER BY k", (prefix + "%",))
        return [r[0] for r in cur]
    def __len__(self):
        return self.db.execute("SELECT COUNT(*) FROM kv").fetchone()[0]

s = KVStore()
s.set("user:1", "ada"); s.set("user:2", "linus"); s.set("cfg:theme", "cookie")
s.set("user:1", "ada lovelace")
print(s.get("user:1"), s.keys("user:"), len(s))
try:
    s.set_many([("user:3", "grace"), ("user:4", None)])
except ValueError as e:
    print("batch failed:", e)
print(s.keys("user:"), "<- user:3 was rolled back")
```
:::explain
`with connection:` starts a transaction that **commits** if the block succeeds and **rolls back** if it raises. So the half-finished batch (`user:3` inserted, then a failure) leaves no trace: atomicity in 2 lines. Always use `?` placeholders. Building SQL with f-strings invites **SQL injection**. `ON CONFLICT … DO UPDATE` is an *upsert*.
:::end

:::problem hard | Simple module system with importlib | import machinery
Create a package on disk (`plugins/` with `__init__.py`, `hello.py` and `shout.py`, each defining `run(text)`). Discover and import every plugin dynamically with `importlib` and `pkgutil`, call each plugin's `run`, and show that re-importing uses the `sys.modules` cache until you `importlib.reload`.
:::solution
```python
import importlib, pkgutil, sys
from pathlib import Path

pkg = Path("plugins")
pkg.mkdir(exist_ok=True)
(pkg / "__init__.py").write_text("", encoding="utf-8")
(pkg / "hello.py").write_text("LOADS = 0\nLOADS += 1\ndef run(t):\n    return 'hello ' + t\n", encoding="utf-8")
(pkg / "shout.py").write_text("def run(t):\n    return t.upper() + '!'\n", encoding="utf-8")
sys.path.insert(0, str(Path.cwd()))
importlib.invalidate_caches()

import plugins
found = [m.name for m in pkgutil.iter_modules(plugins.__path__)]
mods = {name: importlib.import_module(f"plugins.{name}") for name in found}
print(sorted(found), [mods[n].run("world") for n in sorted(mods)])

again = importlib.import_module("plugins.hello")
print(again is mods["hello"], again.LOADS)                 # cached: same object, body ran once
(pkg / "hello.py").write_text("LOADS = 99\ndef run(t):\n    return 'hi ' + t\n", encoding="utf-8")
reloaded = importlib.reload(again)
print(reloaded.run("world"), reloaded.LOADS)
```
:::explain
`pkgutil.iter_modules(package.__path__)` lists the modules in a package folder, and `importlib.import_module("pkg.name")` imports by string. That's the basis of plugin systems (pytest plugins, Django apps). The second import returns the **cached** module from `sys.modules`, so the body didn't run again. `importlib.reload` re-executes the file into the same module object. Remember that existing `from mod import x` bindings elsewhere still point at the old objects.
:::end
