# Dunder (Magic) Methods

**Dunder** = **d**ouble **under**score. Methods like `__len__`, `__add__` and `__eq__` are how your objects plug into Python's syntax and built-ins. `len(x)` calls `x.__len__()`, `a + b` calls `a.__add__(b)`, `for` calls `__iter__`, `with` calls `__enter__`/`__exit__`. Together they form Python's **data model**, and implementing them makes your classes feel built in.

:::analogy Universal plugs
Python's built-in features are sockets: `len()`, `+`, `==`, `[]`, `for`, `with`, `print`. Dunder methods are the plugs. If your class has the right plug, it fits the socket, and suddenly `len(my_deck)` or `money_a + money_b` just works.
:::

## 1. The data model map

| You write | Python calls | Category |
|---|---|---|
| `repr(x)`, `str(x)`, `f"{x:spec}"` | `__repr__`, `__str__`, `__format__` | representation |
| `x == y`, `x < y` … | `__eq__`, `__lt__`, `__le__`, `__gt__`, `__ge__`, `__ne__` | comparison |
| `hash(x)`, `{x}`, `d[x]` | `__hash__` | hashing |
| `bool(x)`, `if x:` | `__bool__`, else `__len__` | truthiness |
| `len(x)`, `x[i]`, `x[i] = v`, `del x[i]`, `v in x` | `__len__`, `__getitem__`, `__setitem__`, `__delitem__`, `__contains__` | containers |
| `iter(x)`, `next(x)`, `reversed(x)` | `__iter__`, `__next__`, `__reversed__` | iteration |
| `x + y`, `x - y`, `x * y`, `x @ y`, `x / y`, `x // y`, `x % y`, `x ** y` | `__add__`, `__sub__`, `__mul__`, `__matmul__`, `__truediv__`, `__floordiv__`, `__mod__`, `__pow__` | arithmetic |
| `y + x` when `y` can't handle it | `__radd__` etc. (reflected) | arithmetic |
| `x += y` | `__iadd__` (falls back to `__add__`) | in-place |
| `-x`, `+x`, `abs(x)`, `~x` | `__neg__`, `__pos__`, `__abs__`, `__invert__` | unary |
| `int(x)`, `float(x)`, `round(x)`, `operator.index(x)` | `__int__`, `__float__`, `__round__`, `__index__` | conversion |
| `x(...)` | `__call__` | callables |
| `with x:` | `__enter__`, `__exit__` | context managers |
| `x.attr` (missing) / any access | `__getattr__` / `__getattribute__`, `__setattr__`, `__delattr__` | attributes |
| `C(...)` | `__new__`, then `__init__` | construction |

## 2. Representation: `__repr__`, `__str__`, `__format__`

```python
class Money:
    def __init__(self, amount, currency="USD"):
        self.amount, self.currency = round(amount, 2), currency
    def __repr__(self):
        return f"Money({self.amount!r}, {self.currency!r})"
    def __str__(self):
        return f"{self.amount:,.2f} {self.currency}"
    def __format__(self, spec):
        if spec == "short":
            return f"{self.currency} {self.amount:.0f}"
        return format(str(self), spec)

m = Money(1234.5)
print(repr(m), "|", m, "|", f"{m:short}", "|", f"[{m:>20}]")
```

## 3. Equality, ordering and hashing

```python
from functools import total_ordering

@total_ordering                         # define __eq__ + ONE ordering method, get the rest
class Version:
    def __init__(self, s):
        self.parts = tuple(int(p) for p in s.split("."))
    def __repr__(self):
        return "v" + ".".join(map(str, self.parts))
    def __eq__(self, other):
        if not isinstance(other, Version):
            return NotImplemented       # let Python try the other side / fall back
        return self.parts == other.parts
    def __lt__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return self.parts < other.parts
    def __hash__(self):
        return hash(self.parts)

vs = [Version("1.10.0"), Version("1.2.3"), Version("1.2.10")]
print(sorted(vs), max(vs), Version("1.2") >= Version("1.1.9"))
print(len({Version("2.0"), Version("2.0")}), Version("1.0") == "1.0")
```

:::term The `__eq__` / `__hash__` contract
If `a == b`, then **`hash(a) == hash(b)` must hold**. Defining `__eq__` **without** `__hash__` sets `__hash__ = None`, which makes instances unhashable (they can't go in sets or be dict keys). Only hash **immutable** state: if the hashed fields change while the object sits in a set, it gets "lost" in the wrong bucket.
:::

:::tip Return `NotImplemented`, don't raise
When `__eq__`/`__lt__`/`__add__` receive a type they don't understand, `return NotImplemented` (a special singleton, **not** `NotImplementedError`). Python then tries the **reflected** operation on the other object, and for `==` finally falls back to identity. Raising would break comparisons with unrelated types.
:::

## 4. Arithmetic operators

```python
import math

class Vec:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __repr__(self):
        return f"Vec({self.x}, {self.y})"
    def __add__(self, o):
        if not isinstance(o, Vec):
            return NotImplemented
        return Vec(self.x + o.x, self.y + o.y)
    def __sub__(self, o):
        return Vec(self.x - o.x, self.y - o.y) if isinstance(o, Vec) else NotImplemented
    def __mul__(self, k):                 # Vec * number
        if isinstance(k, (int, float)):
            return Vec(self.x * k, self.y * k)
        if isinstance(k, Vec):            # dot product
            return self.x * k.x + self.y * k.y
        return NotImplemented
    __rmul__ = __mul__                    # number * Vec -> reflected
    def __neg__(self):
        return Vec(-self.x, -self.y)
    def __abs__(self):
        return math.hypot(self.x, self.y)
    def __bool__(self):
        return bool(self.x or self.y)
    def __eq__(self, o):
        return isinstance(o, Vec) and (self.x, self.y) == (o.x, o.y)
    __hash__ = None                       # mutable -> deliberately unhashable

a, b = Vec(3, 4), Vec(1, 2)
print(a + b, a - b, a * 2, 2 * a, a * b, -a, abs(a), bool(Vec(0, 0)))
```

### How `a + b` is resolved

1. Call `a.__add__(b)`. If it returns a value, done.
2. If it returns `NotImplemented` (or doesn't exist), call `b.__radd__(a)`.
3. If that's also `NotImplemented`, raise `TypeError`.

(Special case: if `b`'s type is a **subclass** of `a`'s type and overrides `__radd__`, the reflected method is tried **first**.)

### In-place operators and mutability

```python
class Bag:
    def __init__(self, items=()):
        self.items = list(items)
    def __iadd__(self, other):            # mutate in place, return self
        self.items.extend(other)
        return self
    def __add__(self, other):             # return a NEW object
        return Bag(self.items + list(other))
    def __repr__(self):
        return f"Bag({self.items})"

b = Bag([1]); alias = b
b += [2]                                  # __iadd__: alias sees it
print(b, alias, b is alias)
c = b + [3]                               # __add__: new object
print(c, b)
```

## 5. Container protocol

```python
class Deck:
    ranks = [str(n) for n in range(2, 11)] + list("JQKA")
    suits = "♠♥♦♣"

    def __init__(self):
        self._cards = [r + s for s in self.suits for r in self.ranks]
    def __len__(self):
        return len(self._cards)
    def __getitem__(self, i):             # enables indexing, slicing, iteration, `in`, reversed
        return self._cards[i]
    def __setitem__(self, i, v):          # enables random.shuffle
        self._cards[i] = v

import random
d = Deck()
print(len(d), d[0], d[-1], d[:3], "A♥" in d)
random.seed(7); random.shuffle(d)
print(d[:5], sorted(d[:5]))
```

With only `__len__` and `__getitem__`, `Deck` gets iteration, `in`, `reversed()` and slicing for free. Python falls back to calling `__getitem__(0), (1), …` until `IndexError`. Implementing `__contains__` and `__iter__` explicitly is faster, and needed for non-sequence containers.

### Slicing objects

```python
class Seq:
    def __getitem__(self, key):
        if isinstance(key, slice):
            return f"slice(start={key.start}, stop={key.stop}, step={key.step}) -> {key.indices(10)}"
        return f"index {key}"
s = Seq()
print(s[3]); print(s[1:8:2]); print(s[::-1])
```

## 6. `__call__`, `__bool__`, `__len__`

```python
class Polynomial:
    def __init__(self, *coeffs):                 # coeffs[i] -> x**i
        self.coeffs = coeffs
    def __call__(self, x):                       # instances are callable
        return sum(c * x ** i for i, c in enumerate(self.coeffs))
    def __len__(self):
        return len(self.coeffs)

p = Polynomial(1, 0, 2)                          # 1 + 2x^2
print(p(3), callable(p), len(p), bool(Polynomial()))
```

## 7. Attribute hooks: `__getattr__`, `__setattr__`

```python
class Record:
    def __init__(self, **data):
        object.__setattr__(self, "_data", dict(data))   # bypass our own __setattr__
    def __getattr__(self, name):                         # ONLY called when normal lookup fails
        try:
            return self._data[name]
        except KeyError:
            raise AttributeError(name) from None
    def __setattr__(self, name, value):                  # called for EVERY assignment
        if name.startswith("_"):
            raise AttributeError("private names not allowed")
        self._data[name] = value

r = Record(name="Ada", lang="Python")
r.year = 1843
print(r.name, r.year, r._data)
print(getattr(r, "missing", "default"))
```

:::trap `__getattr__` vs `__getattribute__`
`__getattr__` runs only for **missing** attributes, so it's safe and common. `__getattribute__` runs for **every** access, and any `self.x` inside it recurses forever. Call `object.__getattribute__(self, name)` instead. You almost never need it.
:::

## 8. `__new__`: controlling creation

```python
class Celsius(float):                         # immutable built-in: customise in __new__
    def __new__(cls, value):
        if value < -273.15:
            raise ValueError("below absolute zero")
        return super().__new__(cls, value)
    def __repr__(self):
        return f"{float(self)}°C"

print(Celsius(21.5), Celsius(21.5) + 1)
```

Use `__new__` when subclassing immutable types (`int`, `str`, `tuple`, `float`), for caching and interning instances, or for singletons. `__init__` would be too late, because the immutable value already exists by then.

## Tricks & tips

- Implement `__repr__` first, always.
- `@functools.total_ordering` with `__eq__` + `__lt__` gives all six comparisons.
- `__slots__` + `__eq__` + `__hash__` give you small, hashable value objects. `@dataclass(frozen=True)` does all of that for you.
- Inheriting from `collections.abc.Sequence`/`Mapping`/`Set` gives mixin methods when you implement the core dunders.
- `operator.index(x)` uses `__index__`. Implement it to let your int-like objects work as list indices and in `bin()`.
- `__bool__` should be cheap. Containers usually rely on `__len__`.
- `__format__` lets your objects understand custom format specs in f-strings.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | `__eq__` without `__hash__` → unhashable | add `__hash__` (immutable fields), or accept it |
| 2 | Hash based on mutable fields | hash only immutable state |
| 3 | Raising instead of returning `NotImplemented` | `return NotImplemented` |
| 4 | `__add__` mutating `self` | return a new object; mutate only in `__iadd__` |
| 5 | Forgetting `__radd__` → `sum([Vec…])` fails (`0 + Vec`) | implement `__radd__` handling `0`, or pass `start=` |
| 6 | Recursion in `__getattribute__`/`__setattr__` | use `object.__…__` |
| 7 | `__len__` returning a non-int or negative | must be an int ≥ 0 |
| 8 | `__init__` returning a value | return None |
| 9 | Inconsistent `__eq__` and `__lt__` (breaks sorting) | derive both from the same key tuple |
| 10 | `__del__` for cleanup | use context managers; `__del__` timing isn't guaranteed |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
class V:
    def __init__(self, x): self.x = x
    def __add__(self, o): return V(self.x + o.x)
    def __repr__(self): return f"V({self.x})"
print(V(1) + V(2))
try:
    print(sum([V(1), V(2)]))
except TypeError:
    print("TypeError")
```
What prints?
- [ ] `V(3)` then `V(3)`
- [x] `V(3)` then `TypeError`
- [ ] `TypeError` twice
`sum` starts from `0`, so it first computes `0 + V(1)`. `int.__add__` doesn't know V and returns NotImplemented, then Python tries `V(1).__radd__(0)`, which doesn't exist, so it raises TypeError. Add `__radd__`, or call `sum(vs, start=V(0))`.
:::

:::quiz
```python norun
class Box:
    def __init__(self, items): self.items = items
    def __len__(self): return len(self.items)
print(bool(Box([])), bool(Box([0])), "yes" if Box([]) else "no")
```
What prints?
- [x] `False True no`
- [ ] `True True yes`
- [ ] `False False no`
Without `__bool__`, Python falls back to `__len__`: a length of zero is falsy. `Box([0])` has length 1, so it's truthy, even though its only item is falsy.
:::

:::quiz
```python norun
class P:
    def __init__(self, x): self.x = x
    def __eq__(self, o): return isinstance(o, P) and self.x == o.x
try:
    print({P(1)})
except TypeError as e:
    print("TypeError")
```
What prints?
- [ ] `{<__main__.P object …>}`
- [x] `TypeError`
- [ ] `set()`
Defining `__eq__` without `__hash__` sets `__hash__ = None`, which makes instances **unhashable**. That's deliberate: equal objects must have equal hashes, and Python can't guess yours.
:::

## Practice problems

:::problem basic | Fraction with operators | __add__, __mul__, __eq__, __repr__
Implement `Frac(n, d)` that is always reduced (with gcd) and keeps the sign on the numerator, supporting `+`, `-`, `*`, `/`, `==`, `<`, `float()`, and a `repr` like `3/4`. Verify `Frac(1, 2) + Frac(1, 3) == Frac(5, 6)`.
:::solution
```python
from math import gcd
from functools import total_ordering

@total_ordering
class Frac:
    def __init__(self, n, d=1):
        if d == 0:
            raise ZeroDivisionError("denominator is zero")
        if d < 0:
            n, d = -n, -d
        g = gcd(n, d)
        self.n, self.d = n // g, d // g
    def __repr__(self):
        return f"{self.n}/{self.d}"
    def _coerce(self, o):
        return o if isinstance(o, Frac) else Frac(o) if isinstance(o, int) else None
    def __add__(self, o):
        o = self._coerce(o)
        return NotImplemented if o is None else Frac(self.n * o.d + o.n * self.d, self.d * o.d)
    __radd__ = __add__
    def __sub__(self, o):
        o = self._coerce(o)
        return NotImplemented if o is None else Frac(self.n * o.d - o.n * self.d, self.d * o.d)
    def __mul__(self, o):
        o = self._coerce(o)
        return NotImplemented if o is None else Frac(self.n * o.n, self.d * o.d)
    __rmul__ = __mul__
    def __truediv__(self, o):
        o = self._coerce(o)
        return NotImplemented if o is None else Frac(self.n * o.d, self.d * o.n)
    def __eq__(self, o):
        o = self._coerce(o)
        return NotImplemented if o is None else (self.n, self.d) == (o.n, o.d)
    def __lt__(self, o):
        o = self._coerce(o)
        return NotImplemented if o is None else self.n * o.d < o.n * self.d
    def __hash__(self):
        return hash((self.n, self.d))
    def __float__(self):
        return self.n / self.d

print(Frac(1, 2) + Frac(1, 3) == Frac(5, 6), Frac(2, -4), Frac(3, 4) * 2, 1 + Frac(1, 2))
print(sorted([Frac(2, 3), Frac(1, 2), Frac(3, 4)]), float(Frac(1, 3)), sum([Frac(1, 4)] * 4))
```
:::explain
Normalising in `__init__` (gcd reduction, sign on the numerator) makes equality and hashing trivial: two equal fractions always have identical `(n, d)`. `__radd__` makes `1 + Frac(1, 2)` and `sum(...)` work (`sum` starts from `0`). Comparisons cross-multiply to stay exact. Python's own `fractions.Fraction` follows the same design.
:::end

:::problem basic | Make a class sortable and hashable | total_ordering, __hash__
Create `Student(name, gpa)` that sorts by GPA descending, then name ascending, can be stored in a set (two students with the same name and GPA are equal), and prints nicely.
:::solution
```python
from functools import total_ordering

@total_ordering
class Student:
    def __init__(self, name, gpa):
        self.name, self.gpa = name, gpa
    def _key(self):
        return (-self.gpa, self.name)
    def __eq__(self, o):
        return isinstance(o, Student) and self._key() == o._key()
    def __lt__(self, o):
        if not isinstance(o, Student):
            return NotImplemented
        return self._key() < o._key()
    def __hash__(self):
        return hash(self._key())
    def __repr__(self):
        return f"{self.name}({self.gpa})"

ss = [Student("cy", 3.5), Student("ada", 3.9), Student("bob", 3.5), Student("ada", 3.9)]
print(sorted(ss), len(set(ss)))
```
:::explain
Deriving `__eq__`, `__lt__` and `__hash__` from **one** `_key()` guarantees they agree, which is the contract that `sorted`, sets and dicts rely on. Negating the GPA gives a descending order on that field inside an otherwise ascending tuple comparison.
:::end

:::problem basic | Truthiness and length | __len__, __bool__
Write `Playlist` (a list of song names) supporting `len()`, `in`, iteration, indexing, and `+` to concatenate playlists. An empty playlist must be falsy. Don't inherit from `list`.
:::solution
```python
class Playlist:
    def __init__(self, songs=()):
        self._songs = list(songs)
    def __len__(self):
        return len(self._songs)
    def __getitem__(self, i):
        result = self._songs[i]
        return Playlist(result) if isinstance(i, slice) else result
    def __contains__(self, song):
        return song in self._songs
    def __iter__(self):
        return iter(self._songs)
    def __add__(self, other):
        if not isinstance(other, Playlist):
            return NotImplemented
        return Playlist(self._songs + other._songs)
    def __repr__(self):
        return f"Playlist({self._songs})"

p = Playlist(["intro", "song A"]) + Playlist(["song B"])
print(p, len(p), "song B" in p, p[0], p[1:], [s.upper() for s in p])
print(bool(Playlist()), bool(p))
```
:::explain
There's no `__bool__`, so Python uses `__len__`: zero means falsy. Slicing returns a `Playlist` (not a raw list) so the type is preserved, which is what built-ins do (`"abc"[1:]` is a str). **Wrapping** a list (composition) exposes only the operations we choose.
:::end

:::problem medium | Matrix with @, indexing and equality | __matmul__, __getitem__ with tuples
Implement `Matrix` supporting `m[i, j]` reads and writes, `m @ n` (matrix product), `m * k` and `k * m` (scalar), `==`, `.T` (transpose property), and `Matrix.identity(n)`.
:::solution
```python
class Matrix:
    def __init__(self, rows):
        self.rows = [list(map(float, r)) for r in rows]
        self.n, self.m = len(self.rows), len(self.rows[0])
    @classmethod
    def identity(cls, n):
        return cls([[1 if i == j else 0 for j in range(n)] for i in range(n)])
    def __getitem__(self, ij):
        i, j = ij
        return self.rows[i][j]
    def __setitem__(self, ij, v):
        i, j = ij
        self.rows[i][j] = float(v)
    @property
    def T(self):
        return Matrix(zip(*self.rows))
    def __matmul__(self, o):
        if not isinstance(o, Matrix):
            return NotImplemented
        if self.m != o.n:
            raise ValueError(f"shape mismatch {self.n}x{self.m} @ {o.n}x{o.m}")
        cols = list(zip(*o.rows))
        return Matrix([[sum(a * b for a, b in zip(r, c)) for c in cols] for r in self.rows])
    def __mul__(self, k):
        if not isinstance(k, (int, float)):
            return NotImplemented
        return Matrix([[v * k for v in r] for r in self.rows])
    __rmul__ = __mul__
    def __eq__(self, o):
        return isinstance(o, Matrix) and self.rows == o.rows
    __hash__ = None
    def __repr__(self):
        return "Matrix(" + ", ".join(str([round(v, 3) for v in r]) for r in self.rows) + ")"

A = Matrix([[1, 2], [3, 4]])
I = Matrix.identity(2)
print(A @ I == A, A @ A, 2 * A, A.T)
A[0, 1] = 9
print(A[0, 1], A)
```
:::explain
`m[i, j]` passes the **tuple** `(i, j)` to `__getitem__`. That's exactly how NumPy implements multi-dimensional indexing. `@` maps to `__matmul__` (added to Python for NumPy's benefit). `__hash__ = None` declares the mutable matrix unhashable on purpose, so it can't be put in a set and then mutated.
:::end

:::problem medium | Range-like lazy sequence | Sequence ABC, slicing math
Implement `ArithSeq(start, step, length)`, a **lazy** arithmetic sequence that stores no elements, supporting `len`, negative indices, slicing (returning another `ArithSeq`), `in` in O(1), and `reversed`. Inherit from `collections.abc.Sequence`.
:::solution
```python
from collections.abc import Sequence

class ArithSeq(Sequence):
    def __init__(self, start, step, length):
        self.start, self.step, self.length = start, step, max(0, length)
    def __len__(self):
        return self.length
    def __getitem__(self, idx):
        if isinstance(idx, slice):
            start, stop, step = idx.indices(self.length)
            count = len(range(start, stop, step))
            return ArithSeq(self.start + start * self.step, self.step * step, count)
        if idx < 0:
            idx += self.length
        if not 0 <= idx < self.length:
            raise IndexError("ArithSeq index out of range")
        return self.start + idx * self.step
    def __contains__(self, x):                   # O(1) instead of a scan
        if self.length == 0:
            return False
        if self.step == 0:
            return x == self.start
        k, r = divmod(x - self.start, self.step)
        return r == 0 and 0 <= k < self.length
    def __repr__(self):
        return f"ArithSeq({list(self)[:6]}{'...' if self.length > 6 else ''})"

s = ArithSeq(5, 3, 10**12)                       # a trillion elements, O(1) memory
print(s[0], s[-1], len(s), 3_000_000_002 in s, 3_000_000_003 in s)
print(s[2:20:5], list(s[2:20:5]))
small = ArithSeq(1, 2, 5)
print(list(small), list(reversed(small)), small.index(7), small[::-1])
```
:::explain
`slice.indices(len)` normalises negative and omitted bounds into concrete `(start, stop, step)`, and a slice of an arithmetic sequence is another arithmetic sequence, which we can compute exactly. `Sequence` supplies `__iter__`, `__reversed__`, `index` and `count` from our `__getitem__`/`__len__`. We override `__contains__` for O(1) maths instead of the inherited O(n) scan. Python's `range` works the same way.
:::end

:::problem medium | Attribute access logger proxy | __getattr__, delegation
Write `Proxy(target)` that forwards **all** attribute reads and method calls to `target`, while recording the names of attributes accessed in `proxy._log`. Wrap a list and a string and show the log.
:::solution
```python
class Proxy:
    def __init__(self, target):
        object.__setattr__(self, "_target", target)
        object.__setattr__(self, "_log", [])
    def __getattr__(self, name):              # only for names Proxy itself doesn't have
        self._log.append(name)
        return getattr(self._target, name)
    def __setattr__(self, name, value):
        self._log.append(f"set {name}")
        setattr(self._target, name, value)
    def __len__(self):                        # dunders are looked up on the TYPE, so forward explicitly
        self._log.append("__len__")
        return len(self._target)
    def __repr__(self):
        return f"Proxy({self._target!r})"

p = Proxy([3, 1, 2])
p.append(0)
p.sort()
print(p, len(p), p._log)
s = Proxy("hello")
print(s.upper(), s.count("l"), s._log)
```
:::explain
`__getattr__` catches every attribute **not** found on `Proxy`, so we delegate it. But **special methods are looked up on the type, not the instance**: `len(p)` never goes through `__getattr__`. That's why proxies must define the dunders they need explicitly (`__len__`, `__iter__`, …). `object.__setattr__` in `__init__` avoids triggering our own logging `__setattr__`. Mocks, lazy loaders and RPC stubs are built this way.
:::end

:::problem hard | Units-aware Quantity | arithmetic dunders, reflected ops, error handling
Implement `Q(value, unit)` supporting units `m`, `s`, `kg` and their products and powers (represent a unit as a dict of exponents, e.g. `{"m": 1, "s": -2}`). `+`/`-` require identical units (else `TypeError`), `*`/`/` combine units, `**` with an int, scalars on either side, `==` with unit check, and a repr like `9.81 m·s^-2`.
:::solution
```python
from collections import Counter

class Q:
    def __init__(self, value, unit=None):
        self.value = value
        self.unit = {k: v for k, v in (unit or {}).items() if v}
    @classmethod
    def of(cls, value, symbol):
        return cls(value, {symbol: 1})
    def _same(self, o):
        if not isinstance(o, Q):
            o = Q(o)
        if self.unit != o.unit:
            raise TypeError(f"unit mismatch: {self._u()} vs {o._u()}")
        return o
    def __add__(self, o):
        o = self._same(o); return Q(self.value + o.value, self.unit)
    __radd__ = __add__
    def __sub__(self, o):
        o = self._same(o); return Q(self.value - o.value, self.unit)
    def __mul__(self, o):
        if isinstance(o, Q):
            u = Counter(self.unit); u.update(o.unit)
            return Q(self.value * o.value, dict(u))
        if isinstance(o, (int, float)):
            return Q(self.value * o, self.unit)
        return NotImplemented
    __rmul__ = __mul__
    def __truediv__(self, o):
        if isinstance(o, (int, float)):
            o = Q(o)
        if not isinstance(o, Q):
            return NotImplemented
        u = Counter(self.unit); u.subtract(o.unit)
        return Q(self.value / o.value, dict(u))
    def __rtruediv__(self, o):
        return Q(o) / self
    def __pow__(self, n):
        if not isinstance(n, int):
            return NotImplemented
        return Q(self.value ** n, {k: v * n for k, v in self.unit.items()})
    def __eq__(self, o):
        return isinstance(o, Q) and self.unit == o.unit and abs(self.value - o.value) < 1e-12
    __hash__ = None
    def _u(self):
        parts = [k if v == 1 else f"{k}^{v}" for k, v in sorted(self.unit.items())]
        return "·".join(parts) or "(dimensionless)"
    def __repr__(self):
        return f"{self.value:g} {self._u()}"

m, s, kg = Q.of(1, "m"), Q.of(1, "s"), Q.of(1, "kg")
g = 9.81 * m / s ** 2
force = 70 * kg * g
print(g, "|", force, "|", force / (kg * m / s ** 2))
print(3 * m + 2 * m, (10 * m) / (2 * s), 1 / s)
try:
    m + s
except TypeError as e:
    print("TypeError:", e)
```
:::explain
Representing units as exponent dicts turns unit algebra into **adding exponents** (multiply) and **subtracting** them (divide), and `Counter` handles the bookkeeping. Zero exponents are dropped, so `(kg·m·s⁻²)/(kg·m·s⁻²)` becomes dimensionless. Reflected methods (`__rmul__`, `__rtruediv__`) make `9.81 * m` and `1 / s` work. Mismatched addition raises loudly, the kind of check that would have saved NASA's Mars Climate Orbiter. (The `pint` library does this in production.)
:::end

:::problem hard | LRU cache as a mapping | MutableMapping, dunders, OrderedDict
Implement `LRUCache(capacity)` as a `collections.abc.MutableMapping`: `cache[k]` marks `k` as recently used, setting a new key evicts the **least recently used** key when over capacity, and it supports `len`, iteration (oldest → newest), `in` (which must **not** count as a use), `del`, `get`, `pop` and `update`. Track hits and misses.
:::solution
```python
from collections import OrderedDict
from collections.abc import MutableMapping

class LRUCache(MutableMapping):
    def __init__(self, capacity):
        self.capacity = capacity
        self._d = OrderedDict()
        self.hits = self.misses = 0
    def __getitem__(self, key):
        if key not in self._d:
            self.misses += 1
            raise KeyError(key)
        self.hits += 1
        self._d.move_to_end(key)            # now most recently used
        return self._d[key]
    def __setitem__(self, key, value):
        if key in self._d:
            self._d.move_to_end(key)
        self._d[key] = value
        if len(self._d) > self.capacity:
            self._d.popitem(last=False)     # evict the least recently used
    def __delitem__(self, key):
        del self._d[key]
    def __iter__(self):
        return iter(self._d)
    def __len__(self):
        return len(self._d)
    def __contains__(self, key):            # override: a peek must not count as a use
        return key in self._d
    def __repr__(self):
        return f"LRUCache({list(self._d.items())})"

c = LRUCache(3)
c.update(a=1, b=2, c=3)        # update/get/pop come free from MutableMapping
c["a"]                          # touch a -> order is now b, c, a
c["d"] = 4                      # evicts b
print(c, "b" in c, c.get("b", "gone"), c.hits, c.misses)
print(c.pop("c"), list(c), len(c))
```
:::explain
`MutableMapping` requires five methods (`__getitem__`, `__setitem__`, `__delitem__`, `__iter__`, `__len__`) and then provides `get`, `pop`, `update`, `setdefault`, `keys`/`items`/`values`, `==` and more. `OrderedDict.move_to_end` and `popitem(last=False)` are O(1), so every operation is O(1). We override `__contains__` because the inherited version calls `__getitem__`, which would count a hit and reorder the cache. `.get` *does* go through `__getitem__`, which is why the missing `"b"` counted as a miss. The Linked Lists chapter builds the same cache from scratch with a hash map plus a doubly linked list.
:::end

:::problem hard | Lazy expression trees with operator overloading | dunders build ASTs
Create `Var("x")` and `Const(3)` such that Python expressions like `(x + 2) * y - x ** 2` build an **expression tree** instead of computing. Support `.eval(**env)`, `str()` with minimal parentheses, and `.diff("x")` (symbolic derivative) for `+ - * **` (constant integer exponent).
:::solution
```python
class Expr:
    prec = 99
    def __add__(self, o): return Add(self, wrap(o))
    def __radd__(self, o): return Add(wrap(o), self)
    def __sub__(self, o): return Sub(self, wrap(o))
    def __rsub__(self, o): return Sub(wrap(o), self)
    def __mul__(self, o): return Mul(self, wrap(o))
    def __rmul__(self, o): return Mul(wrap(o), self)
    def __pow__(self, n): return Pow(self, n)

def wrap(v):
    return v if isinstance(v, Expr) else Const(v)

class Const(Expr):
    def __init__(self, v): self.v = v
    def eval(self, **env): return self.v
    def diff(self, var): return Const(0)
    def __str__(self): return str(self.v)

class Var(Expr):
    def __init__(self, name): self.name = name
    def eval(self, **env): return env[self.name]
    def diff(self, var): return Const(1 if var == self.name else 0)
    def __str__(self): return self.name

class BinOp(Expr):
    def __init__(self, a, b): self.a, self.b = a, b
    def __str__(self):
        def par(e, right=False):
            s = str(e)
            need = e.prec < self.prec or (right and e.prec == self.prec and self.sym in "-")
            return f"({s})" if need else s
        return f"{par(self.a)} {self.sym} {par(self.b, True)}"

class Add(BinOp):
    sym, prec = "+", 1
    def eval(self, **e): return self.a.eval(**e) + self.b.eval(**e)
    def diff(self, v): return self.a.diff(v) + self.b.diff(v)

class Sub(BinOp):
    sym, prec = "-", 1
    def eval(self, **e): return self.a.eval(**e) - self.b.eval(**e)
    def diff(self, v): return self.a.diff(v) - self.b.diff(v)

class Mul(BinOp):
    sym, prec = "*", 2
    def eval(self, **e): return self.a.eval(**e) * self.b.eval(**e)
    def diff(self, v): return self.a.diff(v) * self.b + self.a * self.b.diff(v)   # product rule

class Pow(Expr):
    prec = 3
    def __init__(self, base, n): self.base, self.n = base, n
    def eval(self, **e): return self.base.eval(**e) ** self.n
    def diff(self, v): return Const(self.n) * Pow(self.base, self.n - 1) * self.base.diff(v)  # power + chain rule
    def __str__(self):
        b = str(self.base)
        return f"({b})^{self.n}" if self.base.prec < 3 else f"{b}^{self.n}"

x, y = Var("x"), Var("y")
f = (x + 2) * y - x ** 2
print("f      =", f)
print("f(3,4) =", f.eval(x=3, y=4))
df = f.diff("x")
print("df/dx at (3,4) =", df.eval(x=3, y=4), "(expected y - 2x = -2)")
```
:::explain
Each operator dunder **returns a node** instead of a number, so Python's own parser builds the tree for us, with the correct precedence and associativity. The reflected versions (`__radd__`, `__rmul__`) let plain numbers appear on the left. `eval` and `diff` are recursive, polymorphic methods, with each node class knowing its own rule (sum, product and chain rules). This is the core trick behind SymPy, SQLAlchemy's `User.age > 18`, PyTorch's autograd graph and Pandas query builders.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | 2-D vector class | Real-world task
Implement `Vec(x, y)` with `+`, `-`, unary `-`, scalar `*` on **both** sides (`v * 3` and `3 * v`), `abs(v)` (the length), `==`, `bool` (False only for the zero vector), and `__repr__` like `Vec(1, 2)`. Make `sum(list_of_vecs)` work by handling `0 + v`.
:::starter
```python norun
import math

class Vec:
    def __init__(self, x, y):
        self.x, self.y = x, y
```
:::tests
```python norun
a, b = Vec(1, 2), Vec(3, 4)
assert a + b == Vec(4, 6) and b - a == Vec(2, 2) and -a == Vec(-1, -2)
assert a * 3 == Vec(3, 6) and 3 * a == Vec(3, 6)
assert abs(Vec(3, 4)) == 5.0
assert repr(a) == "Vec(1, 2)"
assert not Vec(0, 0) and Vec(0, 1)
assert sum([a, b, Vec(1, 1)]) == Vec(5, 7)
assert (a == "nope") is False
```
:::solution
```python
import math

class Vec:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __repr__(self):
        return f"Vec({self.x}, {self.y})"
    def __add__(self, o):
        if isinstance(o, Vec):
            return Vec(self.x + o.x, self.y + o.y)
        return NotImplemented
    def __radd__(self, o):                    # handles 0 + Vec inside sum()
        return self if o == 0 else NotImplemented
    def __sub__(self, o):
        return Vec(self.x - o.x, self.y - o.y) if isinstance(o, Vec) else NotImplemented
    def __neg__(self):
        return Vec(-self.x, -self.y)
    def __mul__(self, k):
        return Vec(self.x * k, self.y * k) if isinstance(k, (int, float)) else NotImplemented
    __rmul__ = __mul__                        # 3 * v
    def __abs__(self):
        return math.hypot(self.x, self.y)
    def __bool__(self):
        return bool(self.x or self.y)
    def __eq__(self, o):
        return isinstance(o, Vec) and (self.x, self.y) == (o.x, o.y)
    __hash__ = None                           # mutable: keep it unhashable

print(Vec(1, 2) + Vec(3, 4), 3 * Vec(1, 2), abs(Vec(3, 4)), sum([Vec(1, 1), Vec(2, 2)]))
```
:::explain
`3 * v` first tries `int.__mul__(3, v)`, which returns NotImplemented, so Python calls the **reflected** `v.__rmul__(3)`. The same mechanism with `__radd__` makes `sum()` work, since sum starts at `0`. Returning `NotImplemented` (never raising) for foreign types lets Python try the other operand and produce a proper `TypeError` otherwise, and it makes `a == "nope"` simply False.
:::complexity
O(1) per operation.
:::end

:::program medium | Sortable, hashable version numbers | Real-world task
Implement `Version("1.10.2")` supporting all six comparisons (numeric, not lexicographic: `1.10 > 1.9`), equality where missing parts count as 0 (`Version("1.2") == Version("1.2.0")`), **consistent** hashing (so equal versions dedupe in sets), `str()` returning the original text and `repr()` like `Version('1.2')`. Use `functools.total_ordering`.
:::starter
```python norun
from functools import total_ordering

class Version:
    def __init__(self, text):
        pass
```
:::tests
```python norun
vs = [Version(s) for s in ["1.10", "1.9.3", "1.2", "2.0", "1.2.0"]]
assert [str(v) for v in sorted(vs)] == ["1.2", "1.2.0", "1.9.3", "1.10", "2.0"]
assert Version("1.2") == Version("1.2.0") and hash(Version("1.2")) == hash(Version("1.2.0.0"))
assert len({Version("1.2"), Version("1.2.0"), Version("1.3")}) == 2
assert Version("1.10") > Version("1.9") and Version("1.0") <= Version("1")
assert raises(TypeError, lambda: Version("0.9") < "1.0")
assert max(vs) == Version("2") and repr(Version("1.2")) == "Version('1.2')"
assert (Version("1.0") == "1.0") is False
```
:::hint
Normalise once: split on `.`, convert to ints, and strip **trailing zeros** into a tuple `key`. Then `__eq__`, `__lt__` and `__hash__` all use that same key, which keeps them consistent.
:::solution
```python
from functools import total_ordering

@total_ordering
class Version:
    def __init__(self, text):
        self.text = text
        parts = [int(p) for p in text.split(".")]
        while len(parts) > 1 and parts[-1] == 0:
            parts.pop()                          # 1.2.0 -> 1.2 (canonical form)
        self.key = tuple(parts)
    def __eq__(self, other):
        return isinstance(other, Version) and self.key == other.key
    def __lt__(self, other):
        if not isinstance(other, Version):
            return NotImplemented
        return self.key < other.key
    def __hash__(self):
        return hash(self.key)                    # equal objects -> equal hashes
    def __str__(self):
        return self.text
    def __repr__(self):
        return f"Version({self.text!r})"

vs = sorted(Version(s) for s in ["1.10", "1.9.3", "1.2", "2.0"])
print(vs, Version("1.2") == Version("1.2.0"), len({Version("1"), Version("1.0.0")}))
```
:::explain
Everything flows from **one canonical key**: an int tuple with trailing zeros removed. Tuples compare element by element numerically, so `(1, 10) > (1, 9)`, while plain string sorting would put "1.10" before "1.9". Deriving `__eq__`, `__lt__` and `__hash__` from the same key upholds the contract that equal objects hash equally, and `@total_ordering` fills in `<=`, `>` and `>=`. Since `sorted` is stable, equal versions keep their input order.
:::complexity
O(parts) per comparison.
:::end

:::program medium | Polynomial arithmetic | Real-world task
Implement `Poly(coeffs)` (`coeffs[i]` is the coefficient of xⁱ, with trailing zeros trimmed) supporting `+`, `*` (with polys and numbers on both sides), `==`, calling `p(x)` (Horner's method), `len(p)` = degree + 1, indexing `p[i]` (0 beyond the degree) and `str` like `3x^2 - x + 5`.
:::starter
```python norun
class Poly:
    def __init__(self, coeffs):
        pass
```
:::tests
```python norun
p = Poly([5, -1, 3])
assert str(p) == "3x^2 - x + 5" and p(2) == 15 and len(p) == 3 and p[1] == -1 and p[9] == 0
q = Poly([0, 1])
assert p + q == Poly([5, 0, 3]) and str(p * q) == "3x^3 - x^2 + 5x"
assert 2 * p == Poly([10, -2, 6]) and p + 1 == Poly([6, -1, 3]) and 1 + p == p + 1
assert Poly([1, 2, 0, 0]) == Poly([1, 2]) and str(Poly([0])) == "0"
assert str(Poly([-1, 0, -1])) == "-x^2 - 1"
```
:::solution
```python
class Poly:
    def __init__(self, coeffs):
        c = list(coeffs) or [0]
        while len(c) > 1 and c[-1] == 0:
            c.pop()
        self.c = c
    @staticmethod
    def _wrap(o):
        return o if isinstance(o, Poly) else Poly([o]) if isinstance(o, (int, float)) else None
    def __add__(self, o):
        o = self._wrap(o)
        if o is None:
            return NotImplemented
        n = max(len(self.c), len(o.c))
        return Poly([self[i] + o[i] for i in range(n)])
    __radd__ = __add__
    def __mul__(self, o):
        o = self._wrap(o)
        if o is None:
            return NotImplemented
        out = [0] * (len(self.c) + len(o.c) - 1)
        for i, a in enumerate(self.c):
            for j, b in enumerate(o.c):
                out[i + j] += a * b
        return Poly(out)
    __rmul__ = __mul__
    def __eq__(self, o):
        o = self._wrap(o)
        return o is not None and self.c == o.c
    __hash__ = None
    def __call__(self, x):
        result = 0
        for a in reversed(self.c):
            result = result * x + a              # Horner's method
        return result
    def __len__(self):
        return len(self.c)
    def __getitem__(self, i):
        return self.c[i] if 0 <= i < len(self.c) else 0
    def __str__(self):
        terms = []
        for i in range(len(self.c) - 1, -1, -1):
            a = self.c[i]
            if a == 0:
                continue
            mag = abs(a)
            coef = "" if mag == 1 and i else str(mag)
            var = "" if i == 0 else "x" if i == 1 else f"x^{i}"
            terms.append(("-" if a < 0 else "+", coef + var))
        if not terms:
            return "0"
        s = ("-" if terms[0][0] == "-" else "") + terms[0][1]
        return s + "".join(f" {sg} {t}" for sg, t in terms[1:])
    def __repr__(self):
        return f"Poly({self.c})"

p = Poly([5, -1, 3])
print(p, "|", p * Poly([0, 1]), "|", p(2), "|", 2 * p + 1)
```
:::explain
Each dunder plugs the class into one piece of Python syntax: `+`/`*` (plus their reflected versions for `1 + p`), `==`, calls (`__call__`), `len` and indexing. `__getitem__` returning 0 beyond the degree makes addition trivial, with no padding logic. `_wrap` promotes numbers to constant polynomials so every operator handles mixed types in one place. Normalising in `__init__` keeps `==` honest.
:::complexity
`+` O(n), `*` O(n·m), evaluation O(n).
:::end

:::program hard | Range set with operators | Real-world task
Implement `RangeSet` storing a set of integers as **sorted, merged half-open intervals** `[start, end)`. Support:
- `add(start, end)` (merging overlapping or adjacent ranges) and `remove(start, end)` (splitting ranges);
- `x in rs` in **O(log n)** via `bisect`;
- `len(rs)` = the number of integers covered;
- `rs1 | rs2` (union) returning a new RangeSet;
- iteration over the intervals, `==`, and `repr` like `RangeSet([(1, 5), (10, 12)])`.
:::starter
```python norun
import bisect

class RangeSet:
    def __init__(self, ranges=()):
        pass
```
:::tests
```python norun
r = RangeSet([(1, 5), (10, 12)])
r.add(5, 7)
assert list(r) == [(1, 7), (10, 12)]
assert 6 in r and 7 not in r and 11 in r and 0 not in r
r.remove(2, 4)
assert list(r) == [(1, 2), (4, 7), (10, 12)] and len(r) == 1 + 3 + 2
u = r | RangeSet([(0, 1), (7, 10)])
assert list(u) == [(0, 2), (4, 12)] and list(r) == [(1, 2), (4, 7), (10, 12)]
assert RangeSet([(3, 4), (1, 2), (2, 3)]) == RangeSet([(1, 4)])
assert repr(RangeSet([(1, 5)])) == "RangeSet([(1, 5)])"
r.remove(0, 100); assert list(r) == [] and len(r) == 0 and 5 not in r
```
:::hint
Keep `self.iv` as a sorted list of non-overlapping tuples. For `add`, collect every interval that touches `[s, e)`, replace them with a single merged interval, and keep the list sorted. For `in`, use `bisect_right` on the start values and check the interval just before.
:::solution
```python
import bisect

class RangeSet:
    def __init__(self, ranges=()):
        self.iv = []
        for s, e in ranges:
            self.add(s, e)

    def add(self, s, e):
        if s >= e:
            return
        keep, new_s, new_e = [], s, e
        for a, b in self.iv:
            if b < new_s or a > new_e:           # disjoint and not adjacent
                keep.append((a, b))
            else:                                # overlapping or touching: absorb
                new_s, new_e = min(new_s, a), max(new_e, b)
        bisect.insort(keep, (new_s, new_e))
        self.iv = keep

    def remove(self, s, e):
        out = []
        for a, b in self.iv:
            if b <= s or a >= e:
                out.append((a, b))
                continue
            if a < s:
                out.append((a, s))               # left piece survives
            if b > e:
                out.append((e, b))               # right piece survives
        self.iv = out

    def __contains__(self, x):
        i = bisect.bisect_right(self.iv, (x, float("inf"))) - 1
        return i >= 0 and self.iv[i][0] <= x < self.iv[i][1]

    def __len__(self):
        return sum(b - a for a, b in self.iv)

    def __iter__(self):
        return iter(self.iv)

    def __or__(self, other):
        return RangeSet(self.iv + other.iv)

    def __eq__(self, other):
        return isinstance(other, RangeSet) and self.iv == other.iv

    def __repr__(self):
        return f"RangeSet({self.iv})"

r = RangeSet([(1, 5), (10, 12)])
r.add(5, 7); r.remove(2, 4)
print(r, 4 in r, 3 in r, len(r), r | RangeSet([(7, 10)]))
```
:::explain
The **class invariant** (intervals sorted, non-overlapping and non-adjacent) is restored after every mutation, so `__contains__` can binary-search: `bisect_right` with the probe `(x, inf)` lands just after the last interval starting at or before x. `remove` splits an interval into up to two pieces. The dunders make the object feel built in: `in`, `len`, iteration, `|` and `==`. Interval sets like this power calendars, memory allocators and IP-range firewalls.
:::trace
`add(5, 7)` on [(1, 5), (10, 12)]:
| interval | touches [5, 7)? | merged so far |
|---|---|---|
| (1, 5) | yes (adjacent at 5) | (1, 7) |
| (10, 12) | no | keep |
| result | | [(1, 7), (10, 12)] |
:::complexity
`in`: O(log n). add/remove: O(n).
:::end
