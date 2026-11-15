# Dictionaries

A `dict` maps **keys** to **values** with average **O(1)** lookup, insert and delete. It's implemented as a **hash table**. Python itself runs on dicts: module globals, object attributes (`__dict__`), class namespaces and keyword arguments are all dicts. Since Python 3.7, dicts also **preserve insertion order**.

:::analogy A coat check
You hand over your coat (value) and get a ticket number (the key's **hash**). The attendant doesn't search every hook. The number tells them exactly which hook to go to, so retrieval takes the same time whether there are 10 coats or 10 million. Two tickets pointing at the same hook (a **collision**) just means checking a nearby hook.
:::

## 1. How a hash table works

1. `hash(key)` turns the key into a big integer.
2. That number (masked to the table size) picks a **slot**.
3. If the slot is taken by a different key (a **collision**), CPython **probes** other slots in a pseudo-random sequence.
4. When the table gets about 2/3 full, it **resizes** (rehashes everything into a bigger table), which is amortised O(1).

```python
print(hash("apple"), hash(42), hash((1, 2)))
print(hash(1) == hash(1.0) == hash(True))   # equal values must hash equally
try:
    hash([1, 2])
except TypeError as e:
    print("TypeError:", e)                   # lists are mutable -> unhashable
```

:::term Hashable keys
A key must be **hashable**: its hash never changes, and it's comparable with `==`. Immutable built-ins (`int`, `str`, `tuple` of hashables, `frozenset`) qualify. `list`, `dict` and `set` don't. If a key's hash could change after insertion, the dict would look in the wrong slot and "lose" it.
:::

Since 3.7, CPython uses a **compact dict**: a dense array of entries in insertion order, plus a sparse index table of slots. That's why iteration order equals insertion order and dicts use less memory.

## 2. Creating dicts: 10 ways

```python
d1 = {"a": 1, "b": 2}
d2 = dict(a=1, b=2)                         # keyword-style (keys must be identifiers)
d3 = dict([("a", 1), ("b", 2)])             # from pairs
d4 = dict(zip("ab", [1, 2]))                # from two sequences
d5 = {k: v for k, v in zip("ab", [1, 2])}   # comprehension
d6 = dict.fromkeys(["a", "b"], 0)           # same default for every key
d7 = {**d1, "c": 3}                         # unpack and extend
d8 = d1 | {"c": 3}                          # merge operator (3.9+)
d9 = dict(d1)                               # shallow copy
from collections import defaultdict
d10 = defaultdict(list)                     # auto-creating values
print(d1 == d2 == d3 == d4 == d5, d6, d7, d8, d9, dict(d10))
```

:::trap `dict.fromkeys` with a mutable default
`dict.fromkeys(["a", "b"], [])` gives **every key the same list**. Use `{k: [] for k in keys}`.
:::

## 3. Access patterns

```python
stock = {"apple": 5, "pear": 0}
print(stock["apple"])                  # KeyError if missing
print(stock.get("kiwi"))               # None if missing
print(stock.get("kiwi", 0))            # a custom default
print("pear" in stock, "kiwi" not in stock)   # membership checks KEYS
try:
    stock["kiwi"]
except KeyError as e:
    print("KeyError:", e)
```

### Add, update, delete

```python
d = {"a": 1}
d["b"] = 2                    # add or overwrite
d.update({"c": 3}, d=4)       # several at once
d |= {"e": 5}                 # in-place merge (3.9+)
del d["a"]                    # KeyError if missing
print(d.pop("b"), d.pop("zzz", "default"))   # remove and return
print(d.popitem())            # removes the LAST inserted item (LIFO)
print(d)
```

### `setdefault`: the most underused method

```python
groups = {}
for word in ["apple", "avocado", "banana", "blueberry", "cherry"]:
    groups.setdefault(word[0], []).append(word)   # get, or insert [] and return it
print(groups)
```

## 4. All the dict methods

| Method | Returns / does |
|---|---|
| `d.get(k, default=None)` | value or default (never raises) |
| `d.setdefault(k, default=None)` | value; inserts the default if missing |
| `d.pop(k[, default])` | removes and returns (KeyError unless a default is given) |
| `d.popitem()` | removes and returns the last `(k, v)` |
| `d.update(other, **kw)` | merge in place |
| `d.keys()`, `d.values()`, `d.items()` | live **views** |
| `d.copy()` | shallow copy |
| `d.clear()` | empty it |
| `dict.fromkeys(iterable, value)` | new dict |

### Views are live and set-like

```python
inventory = {"apples": 3, "pears": 2}
keys = inventory.keys()
inventory["kiwis"] = 7
print(keys)                                     # the view reflects the change
print(keys & {"pears", "plums"}, keys - {"apples"})   # set operations on key views
print(list(inventory.items())[0], sum(inventory.values()))
```

## 5. Iteration and safe modification

```python
d = {"a": 1, "b": 2, "c": 3}
for k in d: print(k, end=" ")
print()
for k, v in d.items(): print(f"{k}={v}", end=" ")
print()
for k in list(d):             # iterate a COPY of the keys to delete safely
    if d[k] % 2:
        del d[k]
print(d)
d2 = {"a": 1, "b": 2, "c": 3}
d2 = {k: v for k, v in d2.items() if v != 2}    # or rebuild
print(d2)
```

```python error
d = {"a": 1, "b": 2}
for k in d:
    d[k + "!"] = 0       # RuntimeError: dictionary changed size during iteration
```

## 6. Dict comprehensions

```python
words = ["apple", "bob", "kayak", "python"]
lengths = {w: len(w) for w in words}
palins = {w for w in words if w == w[::-1]}
inverted = {v: k for k, v in lengths.items()}         # collisions: the last one wins
squares = {n: n * n for n in range(6) if n % 2 == 0}
print(lengths, palins, inverted, squares, sep="\n")
```

## 7. Merging dicts: 5 ways

```python
defaults = {"lr": 0.1, "epochs": 10}
user = {"epochs": 50}
print({**defaults, **user})           # 1. unpacking (3.5+)
print(defaults | user)                # 2. merge operator (3.9+)
m = defaults.copy(); m.update(user)   # 3. copy + update
print(m)
from collections import ChainMap
print(dict(ChainMap(user, defaults))) # 4. layered view (the FIRST mapping wins)
print(dict(defaults, **user))         # 5. dict() + kwargs (string keys only)
```

The right side wins in `|`, `{**a, **b}` and `update`. In `ChainMap`, the **first** mapping wins.

## 8. Nested dicts

```python
config = {"model": {"layers": [64, 32], "act": "relu"}, "train": {"lr": 0.01}}
print(config["model"]["layers"][0])
config.setdefault("data", {})["path"] = "/tmp/data"      # create intermediate levels

def deep_get(d, *keys, default=None):
    for k in keys:
        if not isinstance(d, dict) or k not in d:
            return default
        d = d[k]
    return d
print(deep_get(config, "model", "act"), deep_get(config, "model", "missing", default="n/a"))

def flatten(d, prefix=""):
    out = {}
    for k, v in d.items():
        key = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, key))
        else:
            out[key] = v
    return out
print(flatten(config))
```

## 9. Sorting dicts

```python
scores = {"ada": 91, "bob": 78, "cy": 91, "dee": 85}
print(sorted(scores))                                          # sorted keys
print(sorted(scores.items(), key=lambda kv: kv[1], reverse=True))
print(dict(sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))))   # a new ordered dict
print(max(scores, key=scores.get), min(scores, key=scores.get))
```

## 10. `defaultdict` and `Counter`

```python
from collections import defaultdict, Counter

graph = defaultdict(list)
for a, b in [("A", "B"), ("A", "C"), ("B", "C")]:
    graph[a].append(b)
    graph[b].append(a)
print(dict(graph))

nested = defaultdict(lambda: defaultdict(int))   # a two-level auto dict
nested["2026"]["nov"] += 5
print({k: dict(v) for k, v in nested.items()})

c = Counter("abracadabra")
print(c, c["a"], c["z"])                         # missing count -> 0, no KeyError
print(c.most_common(2), sum(c.values()), c.total())
c2 = Counter("alakazam")
print(c + c2, c - c2, c & c2, c | c2, sep="\n")   # multiset arithmetic
```

:::trap `defaultdict` creates keys on read
`d = defaultdict(int); if d["x"] == 0: …` silently **inserts** `"x"`. Use `"x" in d` or `d.get("x")` to check without creating. Also, `defaultdict` doesn't help `.get()`, which still returns `None`.
:::

## 11. `OrderedDict` and `ChainMap`

```python
from collections import OrderedDict, ChainMap
od = OrderedDict.fromkeys("abcde")
od.move_to_end("b")                 # O(1) reordering: the LRU-cache building block
od.move_to_end("e", last=False)
print(list(od), od.popitem(last=False))
print(OrderedDict(a=1, b=2) == OrderedDict(b=2, a=1), dict(a=1, b=2) == dict(b=2, a=1))

defaults = {"theme": "light", "lang": "en"}
user = {"theme": "dark"}
settings = ChainMap(user, defaults)
print(settings["theme"], settings["lang"])
settings["lang"] = "bn"             # writes go to the FIRST mapping
print(user, defaults)
```

## 12. Dicts as dispatch tables

```python
import operator
OPS = {"+": operator.add, "-": operator.sub, "*": operator.mul, "/": operator.truediv}

def calc(a, op, b):
    try:
        return OPS[op](a, b)
    except KeyError:
        raise ValueError(f"unknown operator {op!r}") from None

print(calc(6, "*", 7), calc(1, "/", 4))

def handle_start(): return "starting"
def handle_stop(): return "stopping"
commands = {"start": handle_start, "stop": handle_stop}
print(commands.get("start", lambda: "unknown")(), commands.get("fly", lambda: "unknown")())
```

## 13. Performance

| Operation | Average | Worst |
|---|---|---|
| `d[k]`, `d[k] = v`, `del d[k]`, `k in d` | O(1) | O(n) (pathological collisions) |
| `len(d)` | O(1) | |
| iteration | O(n) | |
| `d.copy()` | O(n) | |

| Need | Use |
|---|---|
| look up by key | `dict` |
| ordered sequence by position | `list` |
| unique items / membership only | `set` |
| counting | `Counter` |
| grouping | `defaultdict(list)` |

## 14. ML use cases

```python
from collections import Counter
config = {"model": "resnet", "lr": 3e-4, "epochs": 20}
corpus = "the cat sat on the mat the end".split()
vocab = {w: i for i, w in enumerate(sorted(set(corpus)), start=1)}   # 0 reserved for padding
encoded = [vocab[w] for w in corpus]
id2word = {i: w for w, i in vocab.items()}
labels = ["cat", "dog", "cat", "bird"]
label2id = {l: i for i, l in enumerate(dict.fromkeys(labels))}
history = {"loss": [], "acc": []}
for epoch in range(3):
    history["loss"].append(round(1 / (epoch + 1), 2)); history["acc"].append(0.5 + epoch / 10)
freq = Counter(corpus)
probs = {w: n / len(corpus) for w, n in freq.items()}
print(vocab, encoded, [id2word[i] for i in encoded[:3]], label2id, history, round(probs["the"], 3), sep="\n")
```

## Tricks & tips

- `d.get(k, 0) + 1` is the pre-`Counter` counting idiom.
- `{v: k for k, v in d.items()}` inverts a dict. Beware duplicate values.
- `dict(sorted(d.items()))` gives a key-sorted copy.
- `max(d, key=d.get)` → the arg-max key.
- `collections.Counter(words).most_common(k)` → the top-k frequencies.
- `dict.fromkeys(seq)` deduplicates while keeping order: `list(dict.fromkeys(xs))`.
- `{**a, **b}` and `a | b` are the shortest correct merges.
- For JSON-like nested access use `.get` chains or a `deep_get` helper.

## The 10 most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | `d[k]` on a missing key → KeyError | `.get`, `in`, `setdefault`, `defaultdict` |
| 2 | Mutable keys (lists) | tuples / frozensets |
| 3 | Changing the size while iterating | iterate `list(d)` or rebuild |
| 4 | `fromkeys` with a mutable default | comprehension |
| 5 | `defaultdict` inserts on read | `in` checks |
| 6 | `1`, `1.0` and `True` are the SAME key | don't mix numeric types as keys |
| 7 | Shallow `copy()` with nested dicts | `copy.deepcopy` |
| 8 | Inverting a dict with duplicate values loses data | invert to `defaultdict(list)` |
| 9 | Relying on order in Python < 3.7 | (modern Python guarantees it) |
| 10 | Mutating an object used as a key so its hash changes | only use immutable keys |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
d = {1: "a", 1.0: "b", True: "c"}
print(d, len(d))
```
What prints?
- [ ] `{1: 'a', 1.0: 'b', True: 'c'} 3`
- [x] `{1: 'c'} 1`
- [ ] `{True: 'c'} 1`
`1 == 1.0 == True` and they hash identically, so they're the **same key**. The first key object (`1`) is kept, and the value is overwritten twice.
:::

:::quiz
```python norun
from collections import defaultdict
d = defaultdict(int)
if d["missing"] == 0:
    pass
print(len(d), d.get("other"), len(d))
```
What prints?
- [ ] `0 0 0`
- [x] `1 None 1`
- [ ] `1 0 2`
Just **reading** `d["missing"]` inserts the key with the default value 0. `.get` does **not** trigger the default factory, so it returns None and inserts nothing.
:::

:::quiz
```python norun
d = {"b": 2, "a": 1}
d["c"] = 3
del d["b"]
d["b"] = 4
print(list(d))
```
What prints?
- [ ] `['a', 'b', 'c']`
- [x] `['a', 'c', 'b']`
- [ ] `['b', 'a', 'c']`
Dicts preserve **insertion order** (since 3.7). Deleting `b` and re-inserting it puts it at the end. Updating an *existing* key keeps its position.
:::

:::tip 🏋️ More practice
15 extra dictionary problems: **[Practice · Dictionaries](#/t/practice-dicts)**. Each one has a test judge and a step-by-step solution.
:::

## Practice problems

:::problem basic | Two Sum | hash map lookup
Return the indices of the two numbers that add up to `target` (LeetCode 1) in O(n).
:::solution
```python
def two_sum(nums, target):
    seen = {}                       # value -> index
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []

print(two_sum([2, 7, 11, 15], 9), two_sum([3, 2, 4], 6), two_sum([3, 3], 6))
```
:::explain
For each number, ask the dict "have I already seen its complement?" in O(1). Insert **after** checking, so an element can't pair with itself (`[3, 2, 4], 6` mustn't return `[0, 0]`). One pass, O(n) time and O(n) space, compared with the O(n²) brute force.
:::trace
`[2, 7, 11, 15], target 9`:
| i | x | need | seen before | action |
|---|---|---|---|---|
| 0 | 2 | 7 | {} | store 2→0 |
| 1 | 7 | 2 | {2: 0} | **found** → [0, 1] |
:::end

:::problem basic | Character frequency, three ways | dict, get, Counter
Count characters in `"mississippi"` using (1) a plain dict with `if`, (2) `dict.get`, and (3) `Counter`. Print them sorted by count, descending.
:::solution
```python
from collections import Counter
s = "mississippi"

c1 = {}
for ch in s:
    if ch in c1:
        c1[ch] += 1
    else:
        c1[ch] = 1

c2 = {}
for ch in s:
    c2[ch] = c2.get(ch, 0) + 1

c3 = Counter(s)
print(c1 == c2 == c3, sorted(c3.items(), key=lambda kv: -kv[1]), c3.most_common(1))
```
:::explain
All three are O(n). `Counter` is the idiomatic choice: it's shortest, it returns 0 for missing keys, and it has `most_common`. A `Counter` compares equal to a plain dict with the same counts, because `Counter` is a dict subclass.
:::end

:::problem basic | Invert a dict safely | duplicate values
Invert `{"a": 1, "b": 2, "c": 1}` into `{1: ["a", "c"], 2: ["b"]}`.
:::solution
```python
from collections import defaultdict
d = {"a": 1, "b": 2, "c": 1}
inv = defaultdict(list)
for k, v in d.items():
    inv[v].append(k)
print(dict(inv))
print({v: k for k, v in d.items()})      # naive inversion loses 'a'
```
:::explain
A naive `{v: k}` comprehension keeps only the **last** key for each value. Mapping each value to a *list* of keys preserves everything.
:::end

:::problem medium | Group anagrams | dict of lists, canonical keys
Group the words that are anagrams of each other (LeetCode 49).
:::solution
```python
from collections import defaultdict

def group_anagrams(words):
    groups = defaultdict(list)
    for w in words:
        groups["".join(sorted(w))].append(w)
    return list(groups.values())

print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
```
:::explain
A **canonical form** (the sorted letters) is the same for every member of an anagram class, so it works as a grouping key. O(n·k log k). The Tuples chapter shows an O(n·k) variant using letter-count tuples.
:::end

:::problem medium | Subarray sum equals k | prefix sums + hash map
Count the contiguous subarrays whose sum equals `k` (LeetCode 560). Numbers may be negative.
:::solution
```python
from collections import defaultdict

def subarray_sum(nums, k):
    count = 0
    prefix = 0
    seen = defaultdict(int)
    seen[0] = 1                         # the empty prefix
    for x in nums:
        prefix += x
        count += seen[prefix - k]       # earlier prefixes P with prefix - P == k
        seen[prefix] += 1
    return count

print(subarray_sum([1, 1, 1], 2), subarray_sum([1, 2, 3], 3), subarray_sum([1, -1, 0], 0))
```
:::explain
`sum(nums[i:j]) = prefix[j] - prefix[i]`. We want pairs with `prefix[j] - prefix[i] = k`, i.e. earlier prefixes equal to `prefix[j] - k`. Count them with a dict as we sweep. `seen[0] = 1` accounts for subarrays starting at index 0. A sliding window fails here because negative numbers break monotonicity. O(n).
:::trace
`[1, 1, 1], k = 2`:
| x | prefix | need prefix-k | seen[need] | count | seen after |
|---|---|---|---|---|---|
| 1 | 1 | -1 | 0 | 0 | {0:1, 1:1} |
| 1 | 2 | 0 | 1 | 1 | {…, 2:1} |
| 1 | 3 | 1 | 1 | **2** | {…, 3:1} |
:::end

:::problem medium | Top K frequent elements | Counter, bucket sort
Return the `k` most frequent elements (LeetCode 347) in O(n) using **bucket sort** by frequency (not a full sort).
:::solution
```python
from collections import Counter

def top_k_frequent(nums, k):
    freq = Counter(nums)
    buckets = [[] for _ in range(len(nums) + 1)]      # index = frequency
    for num, f in freq.items():
        buckets[f].append(num)
    out = []
    for f in range(len(buckets) - 1, 0, -1):
        for num in buckets[f]:
            out.append(num)
            if len(out) == k:
                return out
    return out

print(top_k_frequent([1, 1, 1, 2, 2, 3], 2), top_k_frequent([4, 4, 5, 5, 6], 1))
```
:::explain
Frequencies range from 1 to n, so we can use them as **list indices** (buckets) and read from the highest down. That's O(n), versus O(n log n) for sorting or O(n log k) for `Counter.most_common(k)`, which uses a heap.
:::end

:::problem hard | LRU cache in O(1) with a dict | OrderedDict / dict ordering
Implement `LRUCache(capacity)` with O(1) `get(key)` (returns -1 when missing) and `put(key, value)` (LeetCode 146) using a plain `dict`, relying on insertion order: re-insert a key to mark it as recent, and evict `next(iter(d))`.
:::solution
```python
class LRUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.d = {}
    def get(self, key):
        if key not in self.d:
            return -1
        val = self.d.pop(key)        # remove...
        self.d[key] = val            # ...and re-insert at the end = most recent
        return val
    def put(self, key, value):
        self.d.pop(key, None)
        self.d[key] = value
        if len(self.d) > self.cap:
            del self.d[next(iter(self.d))]   # the first key = least recently used

c = LRUCache(2)
c.put(1, 1); c.put(2, 2); print(c.get(1))   # 1
c.put(3, 3)                                  # evicts 2
print(c.get(2), c.get(3))                    # -1 3
c.put(4, 4)                                  # evicts 1
print(c.get(1), c.get(3), c.get(4), list(c.d))
```
:::explain
Modern dicts remember insertion order, so the **oldest** key is always first. Popping and re-inserting moves a key to the end in O(1), and `next(iter(d))` finds the oldest key in O(1) amortised. `OrderedDict.move_to_end` is the more explicit, interview-safe version. The "classic" answer is a hash map plus a doubly linked list, built in *Linked Lists*.
:::end

:::problem hard | Time-based key-value store | dict of lists + binary search
Implement `TimeMap` with `set(key, value, timestamp)` (timestamps strictly increase per key) and `get(key, timestamp)` returning the value with the largest timestamp ≤ the given one, or `""` (LeetCode 981). `get` must be O(log n).
:::solution
```python
from bisect import bisect_right
from collections import defaultdict

class TimeMap:
    def __init__(self):
        self.times = defaultdict(list)
        self.values = defaultdict(list)
    def set(self, key, value, ts):
        self.times[key].append(ts)            # stays sorted: timestamps increase
        self.values[key].append(value)
    def get(self, key, ts):
        i = bisect_right(self.times[key], ts)  # first index with time > ts
        return self.values[key][i - 1] if i else ""

tm = TimeMap()
tm.set("price", "100", 1); tm.set("price", "105", 4); tm.set("price", "99", 10)
print([tm.get("price", t) for t in [0, 1, 3, 4, 9, 10, 50]], tm.get("nope", 5))
```
:::explain
The dict gives O(1) access to each key's history. Because timestamps arrive in increasing order, each history list is already sorted, so `bisect_right` finds the latest version ≤ `ts` in O(log n). This "versioned value" structure underlies time-series databases and MVCC in databases.
:::end

:::problem hard | Longest consecutive sequence | hash set reasoning
Find the length of the longest run of consecutive integers in an unsorted list in O(n) (LeetCode 128): `[100, 4, 200, 1, 3, 2]` → 4.
:::solution
```python
def longest_consecutive(nums):
    s = set(nums)
    best = 0
    for x in s:
        if x - 1 not in s:              # x starts a run
            y = x
            while y + 1 in s:
                y += 1
            best = max(best, y - x + 1)
    return best

print(longest_consecutive([100, 4, 200, 1, 3, 2]), longest_consecutive([0, 3, 7, 2, 5, 8, 4, 6, 0, 1]))
```
:::explain
Only start counting from numbers that **begin** a run (`x-1` not present). Each number is then visited by the inner `while` at most once overall, so the total work is O(n) despite the nested loop. Sorting would be O(n log n). The hash set's O(1) membership is what makes it linear.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Ransom note | LeetCode 383 | https://leetcode.com/problems/ransom-note/
Can `ransom_note` be built from the letters in `magazine` (each letter used at most once)?
:::starter
```python norun
def can_construct(ransom_note, magazine):
    pass
```
:::tests
```python norun
assert can_construct("a", "b") is False
assert can_construct("aa", "ab") is False
assert can_construct("aa", "aab") is True
assert can_construct("", "xyz") is True
assert can_construct("hello", "lloeh") is True
```
:::solution
```python
from collections import Counter

def can_construct(ransom_note, magazine):
    need = Counter(ransom_note)
    have = Counter(magazine)
    return all(have[ch] >= n for ch, n in need.items())

def can_construct_short(ransom_note, magazine):
    return not (Counter(ransom_note) - Counter(magazine))   # multiset difference

print(can_construct("aa", "aab"), can_construct_short("aa", "ab"))
```
:::explain
Two frequency tables answer the question in O(n + m). `Counter` returns 0 for missing keys, so `have[ch]` never raises. The one-liner uses **multiset subtraction**: whatever is left over is what the magazine can't supply, and an empty Counter is falsy.
:::complexity
O(n + m) time, O(alphabet) space.
:::end

:::program basic | Isomorphic strings | LeetCode 205 | https://leetcode.com/problems/isomorphic-strings/
Two strings are isomorphic if the characters of `s` can be replaced to get `t`, where each character always maps to the same character, and **no two characters map to the same one**.
:::starter
```python norun
def is_isomorphic(s, t):
    pass
```
:::tests
```python norun
assert is_isomorphic("egg", "add") is True
assert is_isomorphic("foo", "bar") is False
assert is_isomorphic("paper", "title") is True
assert is_isomorphic("badc", "baba") is False
assert is_isomorphic("", "") is True
```
:::hint
One dict isn't enough (see `"badc"`/`"baba"`): you need the mapping to work in **both** directions.
:::solution
```python
def is_isomorphic(s, t):
    s_to_t, t_to_s = {}, {}
    for a, b in zip(s, t):
        if s_to_t.setdefault(a, b) != b or t_to_s.setdefault(b, a) != a:
            return False
    return len(s) == len(t)

def is_isomorphic_trick(s, t):
    return len(set(s)) == len(set(t)) == len(set(zip(s, t)))

print(is_isomorphic("paper", "title"), is_isomorphic("badc", "baba"), is_isomorphic_trick("egg", "add"))
```
:::explain
`setdefault(a, b)` returns the existing mapping for `a`, or records `b` if there isn't one yet, so one call both reads and writes. Checking both directions enforces a **bijection**. The trick version notices that a valid pairing has exactly as many distinct pairs as distinct characters on each side.
:::complexity
O(n).
:::end

:::program medium | Insert, delete, get random in O(1) | LeetCode 380 | https://leetcode.com/problems/insert-delete-getrandom-o1/
Implement `RandomizedSet` with average O(1) `insert(val)` and `remove(val)` (both return True if the set changed) and `get_random()` (each element equally likely).
:::starter
```python norun
import random

class RandomizedSet:
    def __init__(self):
        pass
    def insert(self, val):
        pass
    def remove(self, val):
        pass
    def get_random(self):
        pass
```
:::tests
```python norun
import random
random.seed(0)
r = RandomizedSet()
assert r.insert(1) and not r.remove(2) and r.insert(2) and r.get_random() in (1, 2)
assert r.remove(1) and not r.insert(2) and r.get_random() == 2
r2 = RandomizedSet()
for i in range(100): r2.insert(i)
for i in range(0, 100, 2): r2.remove(i)
seen = {r2.get_random() for _ in range(2000)}
assert seen == set(range(1, 100, 2))
```
:::hint
A list gives O(1) random access. A dict `value → index in the list` gives O(1) lookup. To remove from the middle of the list in O(1), **swap the target with the last element** and pop.
:::solution
```python
import random

class RandomizedSet:
    def __init__(self):
        self.vals = []
        self.pos = {}                      # value -> index in self.vals

    def insert(self, val):
        if val in self.pos:
            return False
        self.pos[val] = len(self.vals)
        self.vals.append(val)
        return True

    def remove(self, val):
        if val not in self.pos:
            return False
        i, last = self.pos[val], self.vals[-1]
        self.vals[i] = last                # move the last element into the hole
        self.pos[last] = i
        self.vals.pop()
        del self.pos[val]
        return True

    def get_random(self):
        return random.choice(self.vals)

r = RandomizedSet()
for x in [10, 20, 30]:
    r.insert(x)
r.remove(10)
print(r.vals, r.pos, r.get_random() in (20, 30))
```
:::explain
Neither structure alone suffices: a set can't pick a random element in O(1), and a list can't find an element in O(1). Combining them, the **dict stores positions**, which makes the swap-with-last removal possible without shifting. When removing the last element itself, the swap is harmless: it writes the value to its own slot, then deletes it.
:::trace
Remove 10 from vals [10, 20, 30]:
| step | vals | pos |
|---|---|---|
| start | [10, 20, 30] | {10: 0, 20: 1, 30: 2} |
| move 30 into slot 0 | [30, 20, 30] | 30 → 0 |
| pop | [30, 20] | {20: 1, 30: 0} (10 deleted) |
:::complexity
O(1) average per operation.
:::end

:::program hard | LFU cache | LeetCode 460 | https://leetcode.com/problems/lfu-cache/
Implement `LFUCache(capacity)` with O(1) `get(key)` (−1 if missing) and `put(key, value)`. When full, evict the **least frequently used** key, and among ties, the **least recently used** one. Both `get` and `put` on an existing key count as a use.
:::starter
```python norun
from collections import defaultdict, OrderedDict

class LFUCache:
    def __init__(self, capacity):
        pass
    def get(self, key):
        pass
    def put(self, key, value):
        pass
```
:::tests
```python norun
c = LFUCache(2)
c.put(1, 1); c.put(2, 2)
assert c.get(1) == 1
c.put(3, 3)
assert c.get(2) == -1 and c.get(3) == 3
c.put(4, 4)
assert c.get(1) == -1 and c.get(3) == 3 and c.get(4) == 4
z = LFUCache(0); z.put(1, 1); assert z.get(1) == -1
d = LFUCache(2); d.put(1, 1); d.put(1, 10); d.put(2, 2); d.put(3, 3)
assert d.get(1) == 10 and d.get(2) == -1
```
:::hint
Keep `key → (value, freq)`, and `freq → OrderedDict of keys` (insertion order = recency within that frequency). Track `min_freq`: when a key's frequency increases and its old bucket empties, and that bucket was `min_freq`, increment `min_freq`. A new key always resets `min_freq` to 1.
:::solution
```python
from collections import defaultdict, OrderedDict

class LFUCache:
    def __init__(self, capacity):
        self.cap = capacity
        self.vals = {}                                  # key -> value
        self.freq = {}                                  # key -> use count
        self.buckets = defaultdict(OrderedDict)         # count -> keys in LRU order
        self.min_freq = 0

    def _touch(self, key):
        f = self.freq[key]
        del self.buckets[f][key]
        if not self.buckets[f]:
            del self.buckets[f]
            if self.min_freq == f:
                self.min_freq += 1
        self.freq[key] = f + 1
        self.buckets[f + 1][key] = None                 # most recent within the new count

    def get(self, key):
        if key not in self.vals:
            return -1
        self._touch(key)
        return self.vals[key]

    def put(self, key, value):
        if self.cap == 0:
            return
        if key in self.vals:
            self.vals[key] = value
            self._touch(key)
            return
        if len(self.vals) == self.cap:
            evict, _ = self.buckets[self.min_freq].popitem(last=False)   # LRU among the least frequent
            if not self.buckets[self.min_freq]:
                del self.buckets[self.min_freq]
            del self.vals[evict], self.freq[evict]
        self.vals[key], self.freq[key] = value, 1
        self.buckets[1][key] = None
        self.min_freq = 1

c = LFUCache(2)
c.put("a", 1); c.put("b", 2); c.get("a"); c.put("c", 3)
print(sorted(c.vals), dict(c.freq))
```
:::explain
Three dicts cooperate: values, per-key counts, and **buckets** grouping the keys that share a count. Each bucket is an `OrderedDict` used as an ordered set, so `popitem(last=False)` removes the least recent key with that count. `min_freq` always points at the bucket to evict from. It only changes when that bucket empties during a touch (+1), or when a new key arrives (reset to 1). Everything is O(1), which is the hardest dict-design problem in common interview rotation.
:::complexity
O(1) average per operation.
:::end
