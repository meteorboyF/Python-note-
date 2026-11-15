# Variables & Data Types

In Python, a variable is **not a box that holds a value**. It is a **name tag** tied to an object that lives somewhere in memory. Once that one idea clicks, most "weird" Python behaviour (lists changing by themselves, `is` vs `==`, default-argument bugs) stops being weird.

:::analogy Name tags on luggage
Picture memory as an airport carousel full of suitcases (objects). A variable is a paper tag with a name written on it, tied to one suitcase. You can tie **several tags to the same suitcase**. Moving a tag to another suitcase doesn't change any suitcase. But if you open the suitcase and add a shirt, everyone holding a tag to it sees the shirt.
:::

**What you'll learn**

- Names, objects and references: Python's memory model
- The core built-in types: `int`, `float`, `complex`, `bool`, `str`, `NoneType`
- Dynamic typing vs strong typing, and type conversion (casting)
- Identity (`is`) vs equality (`==`), plus caching/interning surprises
- Mutable vs immutable objects, the single most important concept in this chapter
- Truthiness, float precision and naming conventions

## 1. Names point to objects

When Python runs `x = 42` it does three things:

1. Creates (or reuses) an **object** `42` of type `int` somewhere in memory.
2. Creates the **name** `x` in the current **namespace** (a dict of names).
3. **Binds** `x` to that object, so `x` now holds a **reference** to it.

```python
x = 42
y = x          # y is bound to the SAME object as x (no copy is made)
print(id(x), id(y))   # same identity
print(x is y)         # True

x = 100        # rebinding: x now points somewhere else
print(x, y)    # 100 42  -> y still points to the old object
```

Press **👣 Visualise** above and watch the arrows. Assignment never copies data. It only moves name tags.

:::term Object, identity, type, value
Every object has three things:
- **identity**: which object it is (`id(obj)`, in CPython its memory address). It never changes.
- **type**: what kind of object it is (`type(obj)`). It decides what operations are allowed.
- **value**: the data. It may or may not be changeable, depending on whether the type is *mutable*.
:::

### Multiple assignment and swapping

```python
a, b, c = 1, 2, 3        # tuple unpacking: right side is built first
x = y = z = 0            # three names, ONE object
a, b = b, a              # swap: the right side (b, a) is evaluated first, then unpacked
print(a, b, c, x, y, z)
```

:::tip Why the swap works
`a, b = b, a` first builds the tuple `(2, 1)` from the *current* values, then unpacks it into `a` and `b`. No temporary variable is needed because the tuple acts as one.
:::

## 2. The core data types

| Type | Example literals | Mutable? | Used for |
|---|---|---|---|
| `int` | `42`, `-7`, `1_000_000`, `0b1010`, `0xFF` | No | Counts, indices. **Unlimited size** |
| `float` | `3.14`, `-0.5`, `2e10`, `float('inf')`, `float('nan')` | No | Measurements, probabilities (IEEE-754 64-bit) |
| `complex` | `3+4j` | No | Signal processing, maths |
| `bool` | `True`, `False` | No | Flags. A subclass of `int`! |
| `str` | `'hi'`, `"hi"`, `"""multi-line"""`, `r"raw\n"` | No | Text (Unicode) |
| `NoneType` | `None` | No | "No value", default return of functions |
| `list`, `dict`, `set` | `[1]`, `{"a": 1}`, `{1}` | **Yes** | Containers (Part 3) |
| `tuple`, `frozenset` | `(1,)`, `frozenset({1})` | No | Fixed containers |

```python
big = 2 ** 200                 # Python ints never overflow
print(big)
print(type(True), True + True) # bool is a subclass of int -> 2
print(isinstance(True, int))   # True
print(0.1 + 0.2)               # 0.30000000000000004 (binary floating point)
print(7 / 2, 7 // 2, 7 % 2)    # 3.5 3 1   (/ ALWAYS gives a float)
print(type(None))
```

:::deep Why `0.1 + 0.2 != 0.3`
Floats are stored in **binary** (base 2). Just as 1/3 can't be written exactly in decimal (0.333…), 0.1 can't be written exactly in binary. The tiny rounding errors show up when you add. Compare floats with `math.isclose(a, b)`, and use `decimal.Decimal` or integer cents for money.
:::

```python
import math
from decimal import Decimal
print(0.1 + 0.2 == 0.3)                          # False
print(math.isclose(0.1 + 0.2, 0.3))              # True
print(Decimal("0.1") + Decimal("0.2"))           # 0.3 exactly
print(round(2.5), round(3.5))                    # 2 4  <- "banker's rounding"!
```

:::trap `round()` uses banker's rounding
`round(2.5)` is `2`, not 3. Python rounds halves to the **nearest even** number to avoid statistical bias. If you need "always round half up", use `decimal` with `ROUND_HALF_UP`, or `math.floor(x + 0.5)` for positives.
:::

## 3. Dynamic typing vs strong typing

- **Dynamic typing**: *names* have no type. Only *objects* do. The same name can point at an `int` and then a `str`.
- **Strong typing**: Python won't silently mix incompatible types. `"3" + 3` raises `TypeError` (JavaScript would give `"33"`).

```python
x = 5
print(type(x).__name__)
x = "five"            # fine: the name is rebound to a str object
print(type(x).__name__)
print("3" + str(3))   # you must convert explicitly
print(int("3") + 3)
```

```python error
print("3" + 3)        # TypeError: can only concatenate str (not "int") to str
```

### Type conversion (casting)

| Call | Result | Notes |
|---|---|---|
| `int("42")` | `42` | Whitespace allowed: `int(" 42 ")` |
| `int("3.9")` | **ValueError** | Go via float: `int(float("3.9"))` → 3 |
| `int(3.9)`, `int(-3.9)` | `3`, `-3` | **Truncates toward zero** (not floor!) |
| `int("ff", 16)`, `int("101", 2)` | `255`, `5` | Any base 2–36 |
| `float("1e3")` | `1000.0` | Also `"inf"`, `"nan"` |
| `str(3.0)` | `'3.0'` | |
| `bool("False")` | `True` | Any non-empty string is truthy! |
| `list("abc")` | `['a', 'b', 'c']` | Any iterable → list |

```python
import math
print(int(-3.9), math.floor(-3.9))      # -3 vs -4  (truncate vs floor)
print(bool("False"), bool(""), bool("0"))                      # True False True
print(int("101", 2), int("ff", 16), bin(5), hex(255))
```

:::quiz
What does `print(bool("False"))` print?
- [ ] `False`
- [x] `True`
- [ ] It raises `ValueError`
`bool()` doesn't parse text. It only asks "is this string empty?". `"False"` has 5 characters, so it's truthy. To parse user input, compare: `s.strip().lower() == "true"`.
:::

### Checking types

```python
x = 3
print(type(x) is int)               # exact type check
print(isinstance(x, (int, float)))  # preferred: also accepts subclasses
print(isinstance(True, int))        # True  (bool subclasses int)
```

:::tip Prefer `isinstance`
`isinstance(obj, Base)` respects inheritance and accepts a tuple of types. Use `type(x) is T` only when you must reject subclasses. The classic case is excluding `bool` when you want "a real int": `isinstance(x, int) and not isinstance(x, bool)`.
:::

## 4. Identity (`is`) vs equality (`==`)

- `a == b`: do they have the **same value**? This calls `a.__eq__(b)`.
- `a is b`: are they the **same object**? This compares `id(a) == id(b)`.

```python
a = [1, 2, 3]
b = [1, 2, 3]
c = a
print(a == b, a is b)   # True False  -> equal values, different objects
print(a == c, a is c)   # True True   -> same object
```

### Caching and interning: why `is` sometimes "works"

CPython pre-creates small integers from **-5 to 256** and **interns** many identifier-like strings, so separate expressions can end up sharing one object. This is an **implementation detail**. Never rely on it.

```python
x = 256; y = 256
print(x is y)        # True: cached small int
m = int("1000"); n = int("1000")
print(m is n)        # False: two different int objects
s1 = "hello"; s2 = "hello"
print(s1 is s2)      # True (interned), but don't rely on it
```

:::boss The only correct uses of `is`
Use `is` for **singletons**: `x is None`, `x is not None`, and sentinel objects you created (`MISSING = object()`). For everything else, including numbers and strings, use `==`. Linters flag `x == None` (`E711`) for this reason, and `x is 1000` raises a `SyntaxWarning` in modern Python.
:::

## 5. Mutable vs immutable — the big one

- **Immutable** objects can't change after creation: `int`, `float`, `bool`, `str`, `tuple`, `frozenset`, `bytes`, `None`. "Changing" one actually **creates a new object** and rebinds the name.
- **Mutable** objects can be changed **in place**: `list`, `dict`, `set`, `bytearray`, and most class instances. Every name pointing at the object sees the change.

```python
# immutable: += makes a NEW object
s = "hi"
t = s
s += "!"
print(s, t)          # hi! hi    -> t still points to the old string

# mutable: += changes the SAME object
a = [1, 2]
b = a
a += [3]             # list += is in-place (calls a.__iadd__)
print(a, b)          # [1, 2, 3] [1, 2, 3]   -> b sees it too!
print(a is b)
```

Step through that block with the visualiser. You'll see `s` get a *new* arrow while `a` and `b` keep pointing at the *same* list, which grows.

:::trap Aliasing, a very common Python bug
`b = a` does **not** copy a list. It creates an **alias** (a second name for the same object). To get an independent copy use `a.copy()`, `a[:]`, `list(a)`, or `copy.deepcopy(a)` for nested data. The Lists chapter covers shallow vs deep copies in depth.
:::

```python
grid = [[0] * 3] * 3       # 3 references to ONE inner list!
grid[0][0] = 9
print(grid)                # [[9, 0, 0], [9, 0, 0], [9, 0, 0]]
good = [[0] * 3 for _ in range(3)]   # 3 separate inner lists
good[0][0] = 9
print(good)
```

:::quiz
```python norun
t = (1, [2, 3])
t[1].append(4)
print(t)
```
What happens?
- [ ] `TypeError`: tuples are immutable
- [x] It prints `(1, [2, 3, 4])`
- [ ] It prints `(1, [2, 3])`
The tuple is immutable: you can't replace its slots. But slot 1 holds a reference to a **mutable list**, and mutating that list is allowed. Immutability is shallow. This also makes the tuple **unhashable** (`hash(t)` fails).
:::

### Hashability in one sentence

An object is **hashable** (usable as a dict key or set member) if its hash never changes. That's why immutable built-ins are hashable and lists/dicts/sets are not. The Dictionaries chapter shows exactly why.

## 6. Truthiness

Every object has a truth value, used by `if`, `while`, `and`, `or` and `not`.

| Falsy | Truthy |
|---|---|
| `None`, `False` | everything else |
| `0`, `0.0`, `0j`, `Decimal(0)` | any non-zero number (including `-1`, `float('nan')`!) |
| `''`, `[]`, `()`, `{}`, `set()`, `range(0)` | any non-empty container or string (`" "`, `"0"`, `[0]`) |

```python
for v in [0, 1, -1, "", " ", "0", [], [0], None, float("nan")]:
    print(repr(v).ljust(6), bool(v))
```

:::tip Idiomatic emptiness checks
Write `if items:` instead of `if len(items) > 0:`, and `if not name:` instead of `if name == "":`. But use `if x is None:` when `0` or `""` are **valid** values. `if not x` would wrongly treat `0` as missing.
:::

## 7. Naming rules and conventions (PEP 8)

- Names may contain letters, digits and `_`, but can't **start** with a digit. They're **case-sensitive** (`Score` ≠ `score`).
- You can't use keywords (`class`, `for`, `lambda`, …). You *can* accidentally shadow built-ins (`list = [1]` breaks `list()` later!).

| Style | Used for | Example |
|---|---|---|
| `snake_case` | variables, functions, modules | `total_loss`, `load_data()` |
| `UPPER_SNAKE` | constants | `MAX_EPOCHS = 100` |
| `CapWords` | classes, exceptions | `DataLoader`, `ValueError` |
| `_single` | "internal", don't touch | `_cache` |
| `__double` | name-mangled class attribute | `self.__secret` |
| `__dunder__` | Python's special names | `__init__`, `__name__` |
| `_` | throwaway value / last REPL result | `for _ in range(3)` |
| `name_` | avoid clashing with keyword | `class_`, `type_` |

```python error
list = [3, 1, 2]       # shadows the built-in list type!
nums = list("abc")     # TypeError: 'list' object is not callable
```

## 8. Under the hood: reference counting & garbage collection

CPython keeps a **reference count** on every object. When the count drops to 0 (no names, no containers point at it), the memory is freed immediately. A separate **cyclic garbage collector** cleans up groups of objects that only point at each other.

```python
import sys
a = []
print(sys.getrefcount(a))   # 2: 'a' + the temporary argument
b = a
print(sys.getrefcount(a))   # 3
del b                       # del removes a NAME, not the object
print(sys.getrefcount(a))   # 2
```

:::note `del` deletes names, not objects
`del x` unbinds the name `x`. The object dies only if nothing else references it. `del lst[0]` is different: it removes a slot from the list.
:::

## Tricks & tips

- `1_000_000` is valid syntax. Underscores make big numbers readable.
- `a, b = b, a` swaps. `a, *rest = items` grabs the first item and the remainder.
- `x = y = []` makes **one** list with two names. For two separate lists write `x, y = [], []`.
- `divmod(17, 5)` → `(3, 2)` gives quotient and remainder in one call.
- `float('inf')` is a handy "bigger than anything" start value for minimum searches.
- `type(x).__name__` gives a clean type name for messages.
- `sys.getsizeof(obj)` shows an object's own size in bytes. (Containers don't include their items.)
- `math.isclose`, `math.isnan`, `math.isfinite` are the right way to test floats.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | `b = a` then mutating `b` changes `a` | copy: `a.copy()`, `copy.deepcopy(a)` |
| 2 | `[[0]*3]*3` shares inner lists | `[[0]*3 for _ in range(3)]` |
| 3 | `0.1 + 0.2 == 0.3` is False | `math.isclose()` |
| 4 | Using `is` to compare numbers/strings | use `==`; `is` only for `None` and sentinels |
| 5 | `bool("False")` is True | parse explicitly |
| 6 | `int(-3.9)` is `-3` (truncation) | `math.floor` if you want -4 |
| 7 | `round(2.5)` is 2 | `Decimal.quantize(..., ROUND_HALF_UP)` |
| 8 | Shadowing built-ins: `list`, `dict`, `str`, `sum`, `id`, `input` | pick other names (`items`, `total`) |
| 9 | `if x:` when `0`/`""` are valid | `if x is not None:` |
| 10 | `True == 1` and `hash(True) == hash(1)` → `{1: 'a', True: 'b'}` has ONE key | don't mix bools and ints as keys |

## Interview questions

:::quiz
What does `{1: "int", True: "bool", 1.0: "float"}` evaluate to?
- [ ] `{1: 'int', True: 'bool', 1.0: 'float'}`
- [x] `{1: 'float'}`
- [ ] `TypeError`
`1 == True == 1.0` and they all hash the same, so they're the **same key**. The first key object (`1`) is kept, and its value is overwritten twice. The final value is `'float'`.
:::

**Q: What's the difference between `==` and `is`?** `==` compares values via `__eq__`. `is` compares identity (same object). Use `is` only with singletons like `None`.

**Q: Is Python pass-by-value or pass-by-reference?** Neither. It's **pass-by-object-reference** (also called "call by sharing"). The function receives a reference to the same object. Mutating it is visible to the caller, but rebinding the parameter name isn't.

**Q: Why are strings immutable?** So they can be hashed (dict keys), safely shared and interned, and used safely across threads. The cost: building strings with `+=` in a loop can be O(n²), so use `"".join(parts)`.

**Q: What's `None`?** The single instance of `NoneType`, meaning "no value". Functions without `return` return `None`.

## Cheat sheet

```python norun
x = 5; type(x); isinstance(x, (int, float)); id(x)
int("42"); float("3.5"); str(10); bool([]); list("ab")
int("ff", 16); bin(10); hex(255); oct(8)
a is None; a == b; math.isclose(a, b)
import copy; copy.copy(obj); copy.deepcopy(obj)
divmod(17, 5); abs(-3); round(3.14159, 2); 7 // 2; -7 // 2
```

## Practice problems

:::problem basic | Swap without a temp variable | unpacking, warm-up
Given `a = 5` and `b = 9`, swap their values **without** a third variable. Then do it a second way, using arithmetic.
:::hint
Python can pack the right-hand side into a tuple first.
:::solution
```python
a, b = 5, 9
a, b = b, a            # Pythonic swap
print(a, b)            # 9 5

# arithmetic way (works for numbers only)
a = a + b              # 14
b = a - b              # 14 - 5 = 9
a = a - b
print(a, b)            # 5 9  (swapped back)
```
:::explain
In `a, b = b, a`, Python **evaluates the whole right side first** and builds the tuple `(9, 5)`, then unpacks it left to right. The arithmetic trick works because `a + b` stores both numbers' information in one value. In Python it's only a curiosity, and it fails for non-numbers. Always use tuple swapping.
:::trace
| Step | Code | a | b | Note |
|---|---|---|---|---|
| 1 | `a, b = 5, 9` | 5 | 9 | |
| 2 | build RHS `(b, a)` | 5 | 9 | tuple `(9, 5)` created |
| 3 | unpack | 9 | 5 | swapped |
| 4 | `a = a + b` | 14 | 5 | |
| 5 | `b = a - b` | 14 | 9 | |
| 6 | `a = a - b` | 5 | 9 | swapped back |
:::end

:::problem basic | Predict the aliasing | references, mutability
Without running it, predict all three printed lines. Then verify with the visualiser.

```python
x = [1, 2]
y = x
z = x[:]
y.append(3)
z.append(4)
x = x + [5]
print(x)
print(y)
print(z)
```
:::hint
Which lines **mutate** an existing object, and which **create a new one**? `x + [5]` builds a new list, while `y.append` and `z.append` modify lists in place.
:::solution
```python
x = [1, 2]
y = x          # alias: same list
z = x[:]       # copy: new list
y.append(3)    # mutates the shared list -> x and y both see [1, 2, 3]
z.append(4)    # only the copy changes   -> [1, 2, 4]
x = x + [5]    # NEW list [1, 2, 3, 5]; x is rebound, y still old list
print(x)       # [1, 2, 3, 5]
print(y)       # [1, 2, 3]
print(z)       # [1, 2, 4]
```
:::explain
`x + [5]` creates a brand-new list and **rebinds** `x`. `y` keeps pointing at the original list. If the line had been `x += [5]`, it would have mutated the original in place, and `y` would also show `[1, 2, 3, 5]`. That difference between `+` and `+=` is a classic interview question.
:::pitfalls
- Thinking `x = x + [5]` and `x += [5]` are identical for lists. They aren't.
- Thinking `z = x[:]` is a deep copy. It's shallow (fine here, because the items are ints).
:::end

:::problem basic | Safe string-to-number parser | casting, exceptions
Write `to_number(s)` that converts a string to `int` if it's a whole number (`"42"`, `" -7 "`), to `float` if it's a decimal (`"3.5"`, `"1e3"`), and returns `None` otherwise (`"abc"`, `""`).
:::hint
Try `int()` first, then `float()`, catching `ValueError` each time. This is **EAFP**: easier to ask forgiveness than permission.
:::solution
```python
def to_number(s):
    s = s.strip()
    try:
        return int(s)
    except ValueError:
        pass
    try:
        return float(s)
    except ValueError:
        return None

for s in ["42", " -7 ", "3.5", "1e3", "abc", "", "nan"]:
    print(repr(s), "->", repr(to_number(s)))
```
:::explain
`int()` rejects `"3.5"` with `ValueError`, so we fall through to `float()`. Notice that `"nan"` becomes `float('nan')`, a valid float that isn't equal to itself (`nan != nan`). If that's unwanted, add `math.isfinite()`. Pre-checking with `s.isdigit()` instead (**LBYL**) misses `"-7"`, `"1e3"` and `" 42 "`, which is why EAFP is usually more robust in Python.
:::pitfalls
- `s.isdigit()` returns False for `"-7"` and `"3.5"`.
- A bare `except:` would also swallow `KeyboardInterrupt`. Always catch the specific exception.
:::end

:::problem basic | Float-safe equality | floats, math.isclose
Write `almost_equal(a, b, tol=1e-9)` without `math.isclose`, then confirm it agrees with `math.isclose` for `(0.1+0.2, 0.3)`, `(1e-12, 0)` and `(1e20, 1e20+1)`.
:::hint
Use a **relative** tolerance (scaled by the size of the numbers) *and* an **absolute** one (for values near zero).
:::solution
```python
import math

def almost_equal(a, b, rel=1e-9, abs_tol=0.0):
    return abs(a - b) <= max(rel * max(abs(a), abs(b)), abs_tol)

cases = [(0.1 + 0.2, 0.3), (1e-12, 0.0), (1e20, 1e20 + 1)]
for a, b in cases:
    print(a, b, almost_equal(a, b), math.isclose(a, b))
print(almost_equal(1e-12, 0.0, abs_tol=1e-9), math.isclose(1e-12, 0.0, abs_tol=1e-9))
```
:::explain
A fixed tolerance like `abs(a-b) < 1e-9` breaks for huge numbers, where gaps between representable floats are bigger than 1e-9, and for tiny ones. A relative tolerance scales with the magnitude. But nothing is "relatively close" to `0`, so comparisons with zero need `abs_tol`. This is exactly how `math.isclose` is defined.
:::end

:::problem medium | Is it the same object? | identity, interning
For each pair, predict `==` and `is`, then check: `(256, 256)` from `int("256")`, `(257, 257)` from `int("257")`, `([], [])`, `((), ())`, `("py", "py")`, `(None, None)`.
:::hint
Small ints (-5…256), the empty tuple, `None` and short identifier-like literals are shared by CPython. Everything else built at run time is new.
:::solution
```python
pairs = {
    "int 256":  (int("256"), int("256")),
    "int 257":  (int("257"), int("257")),
    "lists":    ([], []),
    "tuples":   ((), ()),
    "strings":  ("py", "py"),
    "None":     (None, None),
}
for name, (a, b) in pairs.items():
    print(f"{name:8}  ==:{a == b!s:5}  is:{a is b}")
```
:::explain
All pairs are `==`. For `is`: 256 is cached (True), 257 isn't (False), two `[]` are always separate mutable objects (False), `()` is a singleton in CPython (True), literal `"py"` is interned (True), and `None` is a true singleton (True). Only the `None` result is **guaranteed by the language**. The rest are CPython details, which is exactly why you shouldn't use `is` for values.
:::end

:::problem medium | Deep vs shallow copy detective | copy module, nesting
Given `config = {"lr": 0.1, "layers": [64, 32]}`, make `shallow = config.copy()` and `deep = copy.deepcopy(config)`. Mutate `config["layers"].append(16)` and set `config["lr"] = 0.5`. Predict what `shallow` and `deep` contain.
:::hint
A shallow copy creates a new **outer** dict, but its values are the *same* objects.
:::solution
```python
import copy
config = {"lr": 0.1, "layers": [64, 32]}
shallow = config.copy()
deep = copy.deepcopy(config)

config["layers"].append(16)   # mutates the shared inner list
config["lr"] = 0.5            # rebinds a key in the ORIGINAL dict only

print(shallow)   # {'lr': 0.1, 'layers': [64, 32, 16]}
print(deep)      # {'lr': 0.1, 'layers': [64, 32]}
print(shallow["layers"] is config["layers"], deep["layers"] is config["layers"])
```
:::explain
`config["lr"] = 0.5` rebinds a slot **in `config`'s own dict**, so `shallow` keeps `0.1`. `append` mutates the list that both `config` and `shallow` reference. `deepcopy` recursively copied the inner list, so it's isolated. In ML code, this is how a "copied" hyper-parameter dict ends up silently modified.
:::end

:::problem medium | Count the objects | memory model, visualiser
How many distinct **list objects** exist after this code? Draw the arrows on paper, then verify with 👣 Visualise.

```python
a = [1, 2]
b = [a, a]
c = b[:]
c[0] = [1, 2]
```
:::solution
```python
a = [1, 2]
b = [a, a]        # b holds two references to the SAME list a
c = b[:]          # new outer list, same inner references
c[0] = [1, 2]     # brand new list in c's slot 0
print(len({id(x) for x in [a, b, c, c[0]]}))   # 4 distinct list objects
print(b[0] is b[1], c[1] is a, c[0] is a)      # True True False
```
:::explain
Objects: `a` (#1), `b` (#2), `c` (#3), and the new `[1, 2]` (#4). `b`'s two slots both point at #1. `c` started as a copy of `b`'s references, then slot 0 was rebound to #4. Equal-looking lists aren't necessarily the same object.
:::end

:::problem medium | Exact type checking | isinstance, bool trap
Write `is_real_int(x)` that returns True for `5`, `-3` and `10**30`, but False for `True`, `5.0`, `"5"` and `None`.
:::hint
`bool` is a subclass of `int`.
:::solution
```python
def is_real_int(x):
    return isinstance(x, int) and not isinstance(x, bool)

for v in [5, -3, 10**30, True, 5.0, "5", None]:
    print(repr(v), is_real_int(v))
```
:::explain
`isinstance(True, int)` is True because `bool` inherits from `int` (`True == 1`). Excluding `bool` explicitly is the standard fix, and JSON validators and config parsers do exactly this. `type(x) is int` would also work, but it rejects legitimate int subclasses such as `IntEnum` members.
:::end

:::problem hard | Implement your own `deepcopy` | recursion, memo, cycles
Write `my_deepcopy(obj)` supporting `list`, `dict`, `tuple`, `set` and immutable scalars. It must handle **shared references** (if two slots point at one list, the copy's two slots also share one new list) and **cycles** (`a = []; a.append(a)`).
:::hint
Keep a `memo` dict mapping `id(original)` → copy. Register a container's copy in `memo` **before** recursing into its children. That's what makes cycles terminate.
:::solution
```python
def my_deepcopy(obj, memo=None):
    if memo is None:
        memo = {}
    oid = id(obj)
    if oid in memo:
        return memo[oid]
    if isinstance(obj, list):
        new = []
        memo[oid] = new                 # register BEFORE recursing (cycles!)
        new.extend(my_deepcopy(x, memo) for x in obj)
        return new
    if isinstance(obj, dict):
        new = {}
        memo[oid] = new
        for k, v in obj.items():
            new[my_deepcopy(k, memo)] = my_deepcopy(v, memo)
        return new
    if isinstance(obj, set):
        new = set()
        memo[oid] = new
        new.update(my_deepcopy(x, memo) for x in obj)
        return new
    if isinstance(obj, tuple):
        new = tuple(my_deepcopy(x, memo) for x in obj)
        memo[oid] = new
        return new
    return obj                          # int, str, float, None... are immutable

shared = [1, 2]
data = {"a": shared, "b": shared, "t": (shared, 3)}
cp = my_deepcopy(data)
print(cp, cp["a"] is cp["b"], cp["a"] is shared)    # sharing preserved, not the original

loop = [1]
loop.append(loop)
lc = my_deepcopy(loop)
print(lc[1] is lc, lc is not loop)                  # True True
```
:::explain
Three ideas make this work:
1. **Immutable scalars are returned as-is.** Copying them would be pointless, since nobody can change them.
2. **The memo maps original identity → copy.** The second time we meet the same original, we return the *same* copy, which preserves the shape of shared references.
3. **Register before recursing.** For `loop = [1, loop]`, we create the empty copy, store it, then recurse. When we reach `loop` again, the memo returns the copy we're still filling, so the recursion ends.

The real `copy.deepcopy` works the same way, plus hooks (`__deepcopy__`, `__reduce_ex__`) for arbitrary classes. (Tuples containing themselves can't be built with literals, so registering them afterwards is fine.)
:::trace
Trace for `loop = [1, loop]`:
| Call | obj | memo after | returns |
|---|---|---|---|
| 1 | `loop` (#L) | `{L: new[]}` | (still building) |
| 2 | `1` | unchanged | `1` → new = `[1]` |
| 3 | `loop` (#L) again | found in memo! | the *same* `new` → new = `[1, new]` |
| back in 1 | | | `new` |
:::end

:::problem hard | Mutable-safe default registry | sentinels, None vs falsy
Write `add_tag(tag, tags=<default>)` that appends `tag` to `tags` and returns it. Calling `add_tag("a")` twice must **not** share a list between calls. Callers must also be able to deliberately pass an empty list `[]` and have it filled. Explain why `tags=None` plus `if not tags:` is subtly wrong.
:::hint
`if not tags:` treats a caller's empty list as "missing" and replaces it. Use `is None`, or a private sentinel object.
:::solution
```python
_MISSING = object()          # unique sentinel: nobody else can pass this

def add_tag(tag, tags=_MISSING):
    if tags is _MISSING:     # identity check against the sentinel
        tags = []
    tags.append(tag)
    return tags

print(add_tag("a"))          # ['a']
print(add_tag("b"))          # ['b']   (no sharing between calls)
mine = []
add_tag("x", mine)
print(mine)                  # ['x']   (caller's empty list was used)

def buggy(tag, tags=None):
    if not tags:             # [] is falsy -> replaced with a NEW list!
        tags = []
    tags.append(tag)
    return tags
theirs = []
buggy("x", theirs)
print(theirs)                # []  <- caller's list never filled
```
:::explain
Default values are evaluated **once**, when `def` runs, and stored in `add_tag.__defaults__`. A `tags=[]` default would be one shared list that grows across calls. `None` is the usual placeholder, but the check must be `is None`, not truthiness, because an empty list is a legitimate argument. A private `object()` sentinel goes further: it even lets callers pass `None` as a real value.
:::end

:::problem hard | Integer to any base | int conversion, divmod
Write `to_base(n, base)` returning the string form of integer `n` (possibly negative) in base 2–36 using digits `0-9a-z`, without `bin`/`hex`/`format`. Verify by round-tripping with `int(s, base)` for many random values.
:::hint
Repeatedly `divmod(n, base)`. The remainders are the digits from **least** significant to most.
:::solution
```python
import random
DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"

def to_base(n, base):
    if not 2 <= base <= 36:
        raise ValueError("base must be 2..36")
    if n == 0:
        return "0"
    sign = "-" if n < 0 else ""
    n = abs(n)
    out = []
    while n:
        n, r = divmod(n, base)
        out.append(DIGITS[r])
    return sign + "".join(reversed(out))

print(to_base(255, 16), to_base(10, 2), to_base(-35, 36))
for _ in range(1000):
    n, b = random.randint(-10**12, 10**12), random.randint(2, 36)
    assert int(to_base(n, b), b) == n
print("1000 round-trips OK")
```
:::explain
`divmod(n, base)` returns the quotient and the remainder (the next digit). We collect digits in reverse order and flip them at the end, which is O(digits). We take `abs(n)` first because Python's `%` with negatives follows the divisor's sign (`-7 % 2 == 1`), which would give wrong digits. The random round-trip test is a mini **property-based test**: instead of a few hand-picked cases, check an invariant on many inputs.
:::trace
`to_base(10, 2)`:
| n | divmod(n, 2) | digit | out |
|---|---|---|---|
| 10 | (5, 0) | 0 | `['0']` |
| 5 | (2, 1) | 1 | `['0','1']` |
| 2 | (1, 0) | 0 | `['0','1','0']` |
| 1 | (0, 1) | 1 | `['0','1','0','1']` → reversed `"1010"` |
:::end
