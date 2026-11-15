# Built-ins You Must Know

Python ships about 70 **built-in functions** that are always available without imports. Knowing them well is the fastest way to write short, fast, readable code. Many interview solutions are just the right built-in with the right `key=`.

:::analogy The tools on the counter
Imported modules are tools in drawers: you have to go and get them. Built-ins are the tools already lying on the counter: `len`, `sorted`, `zip`, `sum`. A pro reaches for the counter first.
:::

## 1. The essentials at a glance

| Category | Built-ins |
|---|---|
| Size & aggregates | `len`, `sum`, `min`, `max`, `abs`, `round`, `pow`, `divmod` |
| Iteration | `range`, `enumerate`, `zip`, `reversed`, `iter`, `next` |
| Functional | `map`, `filter`, `sorted`, `any`, `all` (and `functools.reduce`) |
| Types & conversion | `int`, `float`, `str`, `bool`, `list`, `tuple`, `dict`, `set`, `frozenset`, `bytes`, `complex` |
| Introspection | `type`, `isinstance`, `issubclass`, `id`, `hash`, `dir`, `vars`, `callable`, `help` |
| Attributes | `getattr`, `setattr`, `hasattr`, `delattr` |
| Characters & numbers | `chr`, `ord`, `bin`, `oct`, `hex`, `format` |
| I/O | `print`, `input`, `open`, `repr`, `ascii` |
| Advanced | `eval`, `exec`, `compile`, `globals`, `locals`, `super`, `property`, `staticmethod`, `classmethod`, `slice`, `memoryview`, `object`, `aiter`/`anext`, `breakpoint` |

## 2. `sorted`, `min`, `max` with `key=`

`key` is a function applied to each element to decide the order. The elements themselves are unchanged.

```python
people = [("Ada", 36, "UK"), ("Linus", 28, "FI"), ("Grace", 45, "US"), ("Alan", 41, "UK")]

print(sorted(people, key=lambda p: p[1]))                      # by age
print(sorted(people, key=lambda p: (p[2], -p[1])))             # country asc, age desc
print(max(people, key=lambda p: p[1])[0], min(people, key=lambda p: len(p[0]))[0])
print(sorted(["banana", "Apple", "cherry"]))                   # uppercase first!
print(sorted(["banana", "Apple", "cherry"], key=str.lower))    # case-insensitive
print(sorted([3, 1, 2], reverse=True))
print(max([], default=None), min(3, 7, 1))
```

```python
from operator import itemgetter, attrgetter
rows = [{"n": "b", "v": 2}, {"n": "a", "v": 2}, {"n": "c", "v": 1}]
print(sorted(rows, key=itemgetter("v", "n")))   # faster than a lambda, and allows multiple keys
```

:::tip Sorting by several keys in mixed directions
Return a **tuple** from `key`: tuples compare lexicographically. Negate numbers for "descending" on that field (`-age`). For non-numeric descending fields, sort in **multiple stable passes**: sort by the secondary key first, then by the primary. **Stability** means equal items keep their earlier order.
:::

```python
data = [("bob", "B"), ("amy", "A"), ("cat", "B"), ("dan", "A")]
step1 = sorted(data, key=lambda x: x[0], reverse=True)   # secondary: name DESC
step2 = sorted(step1, key=lambda x: x[1])                # primary: group ASC (stable!)
print(step2)
```

## 3. `zip`, `enumerate`, `reversed`

```python
names = ["a", "b", "c"]
scores = [90, 80, 70]
print(list(enumerate(names, start=1)))
print(dict(zip(names, scores)))
print(list(zip(*[(1, "x"), (2, "y")])))          # "unzip"
print(list(reversed(names)), names[::-1])
try:
    list(zip([1, 2], [1], strict=True))           # 3.10+: demand equal lengths
except ValueError as e:
    print("ValueError:", e)
```

## 4. `map`, `filter`, `any`, `all`, `sum`

```python
nums = ["3", "10", "7", "x"]
ints = list(map(int, filter(str.isdigit, nums)))
print(ints)
print(any(n > 9 for n in ints), all(n > 0 for n in ints))
print(sum(ints), sum(ints, start=100), sum([[1], [2]], start=[]))   # sum works for lists too (slowly)
print(all([]), any([]))          # vacuous truth: True False
```

:::quiz
`all([])` returns…
- [x] `True`
- [ ] `False`
- [ ] `None`
- [ ] raises `ValueError`
"All elements are truthy" holds for an empty list because there's no counter-example. That's **vacuous truth**. `any([])` is `False` because no element is truthy. This matters in validation code: `all(check(x) for x in [])` passes.
:::

:::tip Comprehension vs map/filter
`[f(x) for x in xs if p(x)]` is usually clearer than `list(map(f, filter(p, xs)))`. `map` shines when you already have a named function: `map(int, line.split())`.
:::

## 5. Numbers: `abs`, `round`, `pow`, `divmod`, `bin`/`hex`

```python
print(abs(-7), abs(3 + 4j))              # 7 5.0 (magnitude)
print(round(3.14159, 2), round(1234, -2), round(0.5), round(1.5))   # banker's rounding
print(pow(2, 10), pow(3, 4, 5))          # pow with modulus: fast modular exponentiation
print(pow(3, -1, 7))                     # modular inverse (3.8+): 3*5 % 7 == 1
print(divmod(17, 5), bin(10), hex(255), oct(8), int("0b1010", 0))
print(format(1234567.891, ",.2f"), format(0.256, ".1%"), format(42, "08b"))
```

## 6. Characters: `ord` and `chr`

```python
print(ord("A"), ord("a"), chr(97), chr(9731))
shift = lambda c, k: chr((ord(c) - ord("a") + k) % 26 + ord("a"))   # Caesar shift
print("".join(shift(c, 3) for c in "xyzabc"))
print([ord(c) - ord("a") for c in "hello"])          # letters -> 0..25 indices
```

## 7. Introspection and attributes

```python
class Dog:
    sound = "woof"
    def __init__(self, name):
        self.name = name

d = Dog("rex")
print(type(d).__name__, isinstance(d, Dog), callable(Dog), callable(d))
print(vars(d), hasattr(d, "name"), getattr(d, "age", "unknown"))
setattr(d, "age", 3)
print([a for a in dir(d) if not a.startswith("_")])
field = "name"
print(getattr(d, field))        # dynamic attribute access by string
```

## 8. `print` and `input` in depth

```python
print("a", "b", "c", sep=" | ", end=" <END>\n")
print(*[1, 2, 3], sep=", ")
print(f"{'left':<8}|{'right':>8}|{'mid':^8}|")
import sys
print("to stderr", file=sys.stderr)
print("no newline", end="")
print(" ...continued", flush=True)
```

The full story of reading and validating input is in [Input, Output & f-strings](#/t/io-basics).

`input(prompt)` always returns a **string**, so convert it: `n = int(input("n? "))`. For many numbers on one line: `a, b = map(int, input().split())`.

## 9. `eval`/`exec`: dangerous power

```python
print(eval("2 + 3 * 4"))           # evaluates an EXPRESSION
ns = {}
exec("x = 5\ny = x * 2", ns)        # executes STATEMENTS
print(ns["x"], ns["y"])
import ast
print(ast.literal_eval("[1, {'a': (2, 3)}]"))   # SAFE: literals only
```

:::trap Never `eval` untrusted input
`eval(input())` lets a user run *any* code, including `__import__('os').system('rm -rf ~')`. To parse literal data use `ast.literal_eval`, for JSON use `json.loads`, and for maths write a parser (see the Operators chapter).
:::

## 10. `functools.reduce` and `operator`

```python
from functools import reduce
import operator
print(reduce(operator.mul, [1, 2, 3, 4, 5]))           # 120
print(reduce(lambda acc, x: acc * 10 + x, [4, 2, 7]))   # 427
print(reduce(operator.or_, [{1}, {2}, {1, 3}]))         # set union
print(list(map(operator.itemgetter(1), [(1, "a"), (2, "b")])))
```

## Tricks & tips

- `max(d, key=d.get)` → the key with the largest value.
- `sorted(d.items(), key=lambda kv: kv[1], reverse=True)[:k]` → top-k entries.
- `sum(1 for x in xs if pred(x))` counts matches, and `sum(map(pred, xs))` works when `pred` returns bools.
- `min(xs, default=0)` avoids `ValueError` on empty input.
- `list(map(list, zip(*grid)))` transposes a grid.
- `isinstance(x, (int, float))` checks several types at once.
- `id(a) == id(b)` is `a is b`. `hash(x)` tells you whether an object is usable as a key (it fails for lists).
- `print(f"{x=}")` (3.8+) prints `x=42`: a quick debugging aid.
- `breakpoint()` drops into the debugger right there.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | `list.sort()` returns `None` | use `sorted()` for a new list |
| 2 | Shadowing `sum`, `max`, `list`, `id`, `type`, `input` | different variable names |
| 3 | `max([])` → ValueError | `default=` |
| 4 | `round(2.5) == 2` | `Decimal` for half-up |
| 5 | `map`/`filter`/`zip` are single-use iterators | wrap in `list()` if reused |
| 6 | `sorted` of mixed types → TypeError | normalise with `key=` |
| 7 | Default sort is case-sensitive | `key=str.lower` / `str.casefold` |
| 8 | `sum` of strings → TypeError | `"".join(strings)` |
| 9 | `eval` on user input | `ast.literal_eval` / `json` |
| 10 | `all([])` is True | check emptiness explicitly if needed |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
nums = [3, 1, 2]
result = nums.sort()
print(result, nums, sorted("bca"))
```
What prints?
- [ ] `[1, 2, 3] [1, 2, 3] bca`
- [x] `None [1, 2, 3] ['a', 'b', 'c']`
- [ ] `None [3, 1, 2] ['a', 'b', 'c']`
`list.sort()` sorts **in place** and returns `None`. `sorted()` works on any iterable and always returns a new **list**, even for a string.
:::

:::quiz
```python norun
print(max([], default="empty"), min("banana"), sum([[1], [2]], []), any([]), all([]))
```
What prints?
- [x] `empty a [1, 2] False True`
- [ ] `ValueError`
- [ ] `empty a [1, 2] False False`
`default=` avoids the ValueError on an empty input. `min` of a string compares characters. `sum` with a `[]` start concatenates lists (slowly). `all([])` is **vacuously True** while `any([])` is False.
:::

## Practice problems

:::problem basic | Top-3 scorers | sorted, key, slicing
Given `scores = {"ada": 91, "bob": 78, "cy": 91, "dee": 85, "eve": 99}`, print the top 3 as `name: score`. Break ties by name, alphabetically.
:::solution
```python
scores = {"ada": 91, "bob": 78, "cy": 91, "dee": 85, "eve": 99}
top = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))[:3]
for name, s in top:
    print(f"{name}: {s}")
```
:::explain
The key `(-score, name)` sorts by score **descending** (negation) and then by name **ascending** for ties, so `ada` comes before `cy`. For huge dicts where k is small, `heapq.nsmallest(3, scores.items(), key=...)` is O(n log k).
:::end

:::problem basic | Validate a password policy | any, all, generator expressions
A password is valid if it has length ≥ 8, at least one digit, one uppercase, one lowercase, one symbol from `!@#$%`, and no spaces. Return the list of failed rules.
:::solution
```python
def check(pw):
    rules = {
        "length >= 8": len(pw) >= 8,
        "has digit": any(c.isdigit() for c in pw),
        "has upper": any(c.isupper() for c in pw),
        "has lower": any(c.islower() for c in pw),
        "has symbol": any(c in "!@#$%" for c in pw),
        "no spaces": all(not c.isspace() for c in pw),
    }
    return [name for name, ok in rules.items() if not ok]

for pw in ["abc", "Password1!", "pass word1A!"]:
    print(pw, "->", check(pw) or "valid")
```
:::explain
Each rule is a single `any`/`all` over a generator, and they short-circuit. Collecting the rules in a dict gives readable error messages for free. `check(pw) or "valid"` relies on an empty list being falsy.
:::end

:::problem basic | Caesar cipher | ord, chr, modulo
Encrypt and decrypt with a Caesar shift `k`, preserving case and leaving non-letters untouched. Show that decrypting with `-k` restores the text.
:::solution
```python
def caesar(text, k):
    out = []
    for ch in text:
        if ch.isalpha() and ch.isascii():
            base = ord("A") if ch.isupper() else ord("a")
            out.append(chr((ord(ch) - base + k) % 26 + base))
        else:
            out.append(ch)
    return "".join(out)

secret = caesar("Hello, World! xyz", 3)
print(secret, "|", caesar(secret, -3))
```
:::explain
Map the letter to 0–25 (`ord(ch) - base`), shift, wrap with `% 26` (which also handles negative shifts thanks to Python's modulo), then map back. `isascii()` avoids shifting letters like `é` with ASCII arithmetic.
:::end

:::problem medium | Rank with ties (dense & competition) | sorted, enumerate, dict
Given scores `[50, 90, 90, 70, 50, 100]`, produce **competition ranking** (1, 2, 2, 4) and **dense ranking** (1, 2, 2, 3), with 1 for the highest score, in the original order.
:::solution
```python
scores = [50, 90, 90, 70, 50, 100]

ordered = sorted(scores, reverse=True)
competition = {}
for i, s in enumerate(ordered, start=1):
    competition.setdefault(s, i)           # first position where this score appears
dense = {s: i for i, s in enumerate(sorted(set(scores), reverse=True), start=1)}

print([competition[s] for s in scores])    # [5, 2, 2, 4, 5, 1]
print([dense[s] for s in scores])          # [4, 2, 2, 3, 4, 1]
```
:::explain
**Competition** rank = 1 + the number of strictly higher scores, which equals the first index where that score appears in the descending list. `setdefault` keeps the first one. **Dense** rank numbers the *distinct* scores consecutively. This is exactly what Pandas `rank(method="min")` and `rank(method="dense")` compute.
:::end

:::problem medium | Group-by without pandas | sorted, itertools.groupby, reduce
Given records `(dept, name, salary)`, compute per department: the head count, the average salary, and the top earner. Return them sorted by average, descending.
:::solution
```python
from itertools import groupby
from operator import itemgetter

rows = [("eng", "ada", 120), ("ops", "bob", 70), ("eng", "cy", 100),
        ("ops", "dee", 90), ("hr", "eve", 60), ("eng", "fay", 140)]

report = []
for dept, grp in groupby(sorted(rows, key=itemgetter(0)), key=itemgetter(0)):
    grp = list(grp)
    avg = sum(r[2] for r in grp) / len(grp)
    top = max(grp, key=itemgetter(2))[1]
    report.append((dept, len(grp), round(avg, 1), top))

for line in sorted(report, key=itemgetter(2), reverse=True):
    print(line)
```
:::explain
`groupby` needs input sorted by the group key. Each group is consumed once into a list so we can compute several aggregates from it. `itemgetter(2)` is a fast, readable replacement for `lambda r: r[2]`. Pandas equivalent: `df.groupby("dept").agg(...)`.
:::end

:::problem medium | Modular exponentiation from scratch | pow, bit manipulation
Implement `mod_pow(base, exp, mod)` by **square-and-multiply** (O(log exp) multiplications) and verify it against `pow(base, exp, mod)` for big numbers.
:::solution
```python
import random

def mod_pow(base, exp, mod):
    result = 1
    base %= mod
    while exp:
        if exp & 1:                     # lowest bit set: multiply it in
            result = result * base % mod
        base = base * base % mod        # square for the next bit
        exp >>= 1
    return result

for _ in range(1000):
    b, e, m = random.randint(0, 10**18), random.randint(0, 10**18), random.randint(2, 10**9)
    assert mod_pow(b, e, m) == pow(b, e, m)
print(mod_pow(7, 128, 13), pow(7, 128, 13))
```
:::explain
Write the exponent in binary: `b^13 = b^8 · b^4 · b^1`. Repeated squaring produces `b^1, b^2, b^4, b^8…`, and we multiply in those whose bit is set. Reducing `% mod` at every step keeps the numbers small. This is how RSA encryption and Fermat primality tests are implemented. Computing `b**e % m` directly would build a number with ~10¹⁹ digits.
:::trace
`mod_pow(3, 13, 7)`, 13 = `1101`:
| exp (bin) | bit | result | base |
|---|---|---|---|
| 1101 | 1 | 1·3 = 3 | 3² = 9 % 7 = 2 |
| 110 | 0 | 3 | 2² = 4 |
| 11 | 1 | 3·4 = 12 % 7 = 5 | 4² = 16 % 7 = 2 |
| 1 | 1 | 5·2 = 10 % 7 = **3** | |
:::end

:::problem hard | Implement `sorted` with key, reverse and stability | merge sort, stability
Write `my_sorted(iterable, key=None, reverse=False)` that's **stable** (including with `reverse=True`, where equal elements must keep their original order, just like the built-in). Test it against `sorted` on random data with many duplicate keys.
:::solution
```python
import random

def my_sorted(iterable, key=None, reverse=False):
    key = key or (lambda x: x)
    items = [(key(x), i, x) for i, x in enumerate(iterable)]   # decorate

    def before(a, b):                     # should a come before b?
        if reverse:
            return a[0] > b[0] or (a[0] == b[0] and a[1] < b[1])
        return a[0] < b[0] or (a[0] == b[0] and a[1] < b[1])

    def merge_sort(xs):
        if len(xs) <= 1:
            return xs
        mid = len(xs) // 2
        left, right = merge_sort(xs[:mid]), merge_sort(xs[mid:])
        out, i, j = [], 0, 0
        while i < len(left) and j < len(right):
            if before(right[j], left[i]):
                out.append(right[j]); j += 1
            else:
                out.append(left[i]); i += 1
        out.extend(left[i:]); out.extend(right[j:])
        return out

    return [x for _, _, x in merge_sort(items)]             # undecorate

for _ in range(300):
    data = [(random.randint(0, 5), random.random()) for _ in range(random.randint(0, 40))]
    for rev in (False, True):
        assert my_sorted(data, key=lambda t: t[0], reverse=rev) == sorted(data, key=lambda t: t[0], reverse=rev)
print(my_sorted(["bb", "a", "ccc", "dd"], key=len, reverse=True))
```
:::explain
**Decorate-sort-undecorate** (the Schwartzian transform): compute each key once and keep the original index. Stability comes from breaking ties by that index, *always ascending*, even when `reverse=True`. That's exactly how the built-in behaves, and why `reverse=True` isn't the same as `sorted(...)[::-1]`, which would reverse the tied elements too. Merge sort is naturally stable because, on ties, we take from the left half first.
:::end

:::problem hard | Safe arithmetic evaluator with `ast` | ast, introspection, security
Evaluate arithmetic expressions from untrusted users safely: allow numbers, `+ - * / // % **`, unary minus, parentheses, and the functions `abs`, `min`, `max`, `round`. Reject everything else (names, attributes, calls to other functions), and cap exponents to avoid DoS (`9**9**9`).
:::solution
```python
import ast, operator as op

BIN = {ast.Add: op.add, ast.Sub: op.sub, ast.Mult: op.mul, ast.Div: op.truediv,
       ast.FloorDiv: op.floordiv, ast.Mod: op.mod, ast.Pow: op.pow}
UNARY = {ast.USub: op.neg, ast.UAdd: op.pos}
FUNCS = {"abs": abs, "min": min, "max": max, "round": round}

def safe_eval(expr):
    def ev(node):
        if isinstance(node, ast.Expression):
            return ev(node.body)
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            return node.value
        if isinstance(node, ast.BinOp) and type(node.op) in BIN:
            left, right = ev(node.left), ev(node.right)
            if isinstance(node.op, ast.Pow) and abs(right) > 100:
                raise ValueError("exponent too large")
            return BIN[type(node.op)](left, right)
        if isinstance(node, ast.UnaryOp) and type(node.op) in UNARY:
            return UNARY[type(node.op)](ev(node.operand))
        if (isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
                and node.func.id in FUNCS and not node.keywords):
            return FUNCS[node.func.id](*[ev(a) for a in node.args])
        raise ValueError(f"disallowed syntax: {type(node).__name__}")
    return ev(ast.parse(expr, mode="eval"))

for e in ["2 + 3 * (4 - 1) ** 2", "max(3, -abs(-7), round(2.567, 1))", "10 // 3 % 2",
          "__import__('os').system('echo hacked')", "9 ** 9 ** 9", "x + 1"]:
    try:
        print(f"{e!r:45} -> {safe_eval(e)}")
    except (ValueError, ZeroDivisionError) as err:
        print(f"{e!r:45} -> rejected ({err})")
```
:::explain
`ast.parse(…, mode="eval")` turns the text into a syntax tree **without executing anything**. We then walk it with an **allow-list**: only specific node types and operators are handled, and everything else raises. That's the opposite of a block-list, which attackers always find a way around. The exponent cap stops resource-exhaustion attacks. This is how calculator features in web apps should be built.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Maximum product of three numbers | LeetCode 628 | https://leetcode.com/problems/maximum-product-of-three-numbers/
Return the maximum product of any three numbers in the list (which may contain negatives). Solve it with `sorted`, then in one pass with `heapq.nlargest`/`nsmallest`.
:::starter
```python norun
def maximum_product(nums):
    pass
```
:::tests
```python norun
assert maximum_product([1, 2, 3]) == 6
assert maximum_product([1, 2, 3, 4]) == 24
assert maximum_product([-1, -2, -3]) == -6
assert maximum_product([-10, -10, 5, 2]) == 500
assert maximum_product([-100, -98, -1, 2, 3, 4]) == 39200
```
:::hint
The answer is either the three largest numbers, or the two smallest (most negative: negative × negative is positive) times the largest.
:::solution
```python
import heapq

def maximum_product(nums):
    a, b, c = heapq.nlargest(3, nums)
    x, y = heapq.nsmallest(2, nums)
    return max(a * b * c, x * y * a)

def maximum_product_sorted(nums):
    s = sorted(nums)
    return max(s[-1] * s[-2] * s[-3], s[0] * s[1] * s[-1])

print(maximum_product([-100, -98, -1, 2, 3, 4]), maximum_product_sorted([-10, -10, 5, 2]))
```
:::explain
Only two candidate products can be the maximum, so we don't need every triple (that would be O(n³)). `heapq.nlargest(3, …)` finds the top 3 in O(n) for a fixed k, which beats a full O(n log n) sort. Unpacking `a, b, c = …` names the results directly.
:::complexity
O(n) with heapq, O(n log n) with sorting.
:::end

:::program medium | Sort array by increasing frequency | LeetCode 1636 | https://leetcode.com/problems/sort-array-by-increasing-frequency/
Sort the numbers by frequency, **ascending**. When frequencies tie, sort those values **descending**: `[2, 3, 1, 3, 2]` → `[1, 3, 3, 2, 2]`.
:::starter
```python norun
def frequency_sort(nums):
    pass
```
:::tests
```python norun
assert frequency_sort([1, 1, 2, 2, 2, 3]) == [3, 1, 1, 2, 2, 2]
assert frequency_sort([2, 3, 1, 3, 2]) == [1, 3, 3, 2, 2]
assert frequency_sort([-1, 1, -6, 4, 5, -6, 1, 4, 1]) == [5, -1, 4, 4, -6, -6, 1, 1, 1]
assert frequency_sort([]) == []
```
:::solution
```python
from collections import Counter

def frequency_sort(nums):
    freq = Counter(nums)
    return sorted(nums, key=lambda x: (freq[x], -x))

print(frequency_sort([2, 3, 1, 3, 2]))
```
:::explain
The tuple key `(frequency, -value)` encodes both rules: tuples compare left to right, and negating the value flips the tie-break order to descending. `Counter` builds the frequency table in O(n). This "count, then sort with a tuple key" combo shows up constantly.
:::complexity
O(n log n).
:::end

:::program medium | Reorder data in log files | LeetCode 937 | https://leetcode.com/problems/reorder-data-in-log-files/
Each log is `"<identifier> <content>"`. **Letter-logs** (content is words) come before **digit-logs**. Letter-logs are sorted by content, then by identifier. Digit-logs keep their original relative order.
:::starter
```python norun
def reorder_log_files(logs):
    pass
```
:::tests
```python norun
logs = ["dig1 8 1 5 1", "let1 art can", "dig2 3 6", "let2 own kit dig", "let3 art zero"]
assert reorder_log_files(logs) == ["let1 art can", "let3 art zero", "let2 own kit dig", "dig1 8 1 5 1", "dig2 3 6"]
logs2 = ["a1 9 2 3 1", "g1 act car", "zo4 4 7", "ab1 off key dog", "a8 act zoo"]
assert reorder_log_files(logs2) == ["g1 act car", "a8 act zoo", "ab1 off key dog", "a1 9 2 3 1", "zo4 4 7"]
assert reorder_log_files(["b1 x y", "a1 x y"]) == ["a1 x y", "b1 x y"]
```
:::hint
Use one `sorted` call with a key that returns `(0, content, identifier)` for letter-logs and `(1,)` for digit-logs. Sorting is **stable**, so the digit-logs keep their order automatically.
:::solution
```python
def reorder_log_files(logs):
    def key(log):
        ident, rest = log.split(" ", 1)
        return (0, rest, ident) if rest[0].isalpha() else (1,)
    return sorted(logs, key=key)

print(reorder_log_files(["dig1 8 1 5 1", "let1 art can", "dig2 3 6", "let2 own kit dig", "let3 art zero"]))
```
:::explain
`split(" ", 1)` separates the identifier from the rest **once**. The key's first element puts letter-logs (0) before digit-logs (1). Every digit-log gets the identical key `(1,)`, and because Timsort is **stable**, they keep their input order. Stability is what makes this one-call solution correct.
:::complexity
O(n·L·log n) for n logs of length L.
:::end

:::program hard | Largest number | LeetCode 179 | https://leetcode.com/problems/largest-number/
Arrange non-negative integers to form the **largest** possible number, returned as a string: `[3, 30, 34, 5, 9]` → `"9534330"`. Watch the all-zeros case (`[0, 0]` → `"0"`).
:::starter
```python norun
def largest_number(nums):
    pass
```
:::tests
```python norun
assert largest_number([10, 2]) == "210"
assert largest_number([3, 30, 34, 5, 9]) == "9534330"
assert largest_number([0, 0]) == "0"
assert largest_number([1]) == "1"
assert largest_number([432, 43243]) == "43243432"
assert largest_number([999999998, 999999997, 999999999]) == "999999999999999998999999997"
```
:::hint
Ordinary string sorting fails (`"3" < "30"`, but `"330" > "303"`). Compare two numbers `a`, `b` by checking which concatenation is bigger: `a + b` vs `b + a`. Use `functools.cmp_to_key`.
:::solution
```python
from functools import cmp_to_key

def largest_number(nums):
    strs = list(map(str, nums))
    def compare(a, b):
        if a + b > b + a:
            return -1            # a should come first
        if a + b < b + a:
            return 1
        return 0
    strs.sort(key=cmp_to_key(compare))
    result = "".join(strs)
    return "0" if result[0] == "0" else result

print(largest_number([3, 30, 34, 5, 9]), largest_number([0, 0]))
```
:::explain
The right order is defined by a **pairwise rule**, not a per-item key: put `a` before `b` if `ab > ba`. This relation is transitive (a neat exercise to prove), so it's a valid sort order. `cmp_to_key` adapts an old-style comparator (returning negative/zero/positive) into a key function for `sort`. If the largest piece is `"0"`, everything is zero, which explains the special case.
:::complexity
O(n log n · L) for n numbers with up to L digits.
:::end
