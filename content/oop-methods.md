# Methods & Properties

A class can hold three kinds of methods, and Python has an elegant way to make computed or validated values look like plain attributes. Choosing the right kind of method is a sign of clean design.

:::analogy Who is the method talking to?
- An **instance method** talks to *one cookie* (`self`): "how many chips does this cookie have?"
- A **class method** talks to *the cookie cutter* (`cls`): "make me a cookie from this recipe card".
- A **static method** talks to *nobody in particular*. It's a helper kept in the drawer because it belongs to the topic: "convert grams to ounces".
- A **property** is a window on the cookie's label that's really computed (or checked) behind the scenes.
:::

## 1. The three kinds of methods

```python
class Temperature:
    unit = "C"

    def __init__(self, celsius):
        self.celsius = celsius

    def to_fahrenheit(self):                # instance method: needs the instance
        return self.celsius * 9 / 5 + 32

    @classmethod
    def from_fahrenheit(cls, f):            # class method: receives the class
        return cls((f - 32) * 5 / 9)        # alternative constructor

    @staticmethod
    def is_valid(celsius):                  # static method: no self, no cls
        return celsius >= -273.15

t = Temperature.from_fahrenheit(212)
print(t.celsius, t.to_fahrenheit(), Temperature.is_valid(-300), t.is_valid(20))
```

| | First parameter | Can access | Typical use |
|---|---|---|---|
| Instance method | `self` (the instance) | instance + class data | behaviour of one object |
| `@classmethod` | `cls` (the class) | class data, and can create instances | **alternative constructors**, factories, class-level counters |
| `@staticmethod` | none | only its arguments | utility logic related to the class |

### Why `cls` instead of hard-coding the class name?

```python
from datetime import date

class Person:
    def __init__(self, name, age):
        self.name, self.age = name, age

    @classmethod
    def from_birth_year(cls, name, year, today=date(2026, 11, 15)):
        return cls(name, today.year - year)      # cls -> works for subclasses too

    def __repr__(self):
        return f"{type(self).__name__}({self.name!r}, {self.age})"

class Student(Person):
    pass

print(Person.from_birth_year("Ada", 1990))
print(Student.from_birth_year("Bob", 2004))   # a Student, not a Person!
```

:::tip Alternative constructors
Python has no constructor overloading. Instead, write several `@classmethod`s named `from_…`: `dict.fromkeys`, `datetime.fromisoformat`, `int.from_bytes`, `pd.DataFrame.from_records`. Each parses a different input format and calls `cls(...)`.
:::

## 2. Properties: computed and validated attributes

A **property** lets you access a method like an attribute (`obj.area`, not `obj.area()`), and optionally control assignment.

```python
class Circle:
    def __init__(self, radius):
        self.radius = radius               # goes through the setter below!

    @property
    def radius(self):                      # getter
        return self._radius

    @radius.setter
    def radius(self, value):               # setter: validation lives here
        if value < 0:
            raise ValueError("radius must be >= 0")
        self._radius = value

    @property
    def area(self):                        # read-only computed property
        return 3.14159 * self._radius ** 2

c = Circle(2)
print(c.radius, round(c.area, 2))
c.radius = 3                               # calls the setter
print(round(c.area, 2))
try:
    c.radius = -1
except ValueError as e:
    print("ValueError:", e)
try:
    c.area = 10
except AttributeError as e:
    print("AttributeError:", e)
```

:::term Getter, setter, deleter
`@property` defines the **getter**, `@x.setter` the **setter**, and `@x.deleter` runs on `del obj.x`. The real value is usually stored in a "private" attribute with a leading underscore (`self._radius`) so the property and the storage don't collide.
:::

:::boss Start with plain attributes
In Java you write getters and setters "just in case". In Python, **don't**. Start with a public attribute (`self.radius = r`). If you later need validation or computation, turn it into a `@property`. The calling code (`c.radius`) doesn't change at all. That's the **uniform access principle**.
:::

:::trap Infinite recursion in a property
```python norun
@property
def radius(self):
    return self.radius        # calls the property again... RecursionError
```
Store the value under a different name (`self._radius`).
:::

## 3. `functools.cached_property`

```python
from functools import cached_property
import time

class Dataset:
    def __init__(self, n):
        self.n = n

    @cached_property
    def stats(self):                       # computed on FIRST access, then stored
        print("  (computing stats...)")
        data = range(self.n)
        return {"sum": sum(data), "max": max(data)}

d = Dataset(1_000_000)
print(d.stats["sum"])
print(d.stats["max"])                      # no recomputation
del d.stats                                # invalidate the cache
print(d.stats["sum"])
```

`cached_property` stores the result in the instance's `__dict__` under the same name. It won't notice when `self.n` changes, so invalidate it manually (`del d.stats`) or use a normal property.

## 4. Methods that return `self`: fluent interfaces

```python
class QueryBuilder:
    def __init__(self, table):
        self.table, self.wheres, self.limit_n = table, [], None
    def where(self, cond):
        self.wheres.append(cond)
        return self                 # enables chaining
    def limit(self, n):
        self.limit_n = n
        return self
    def build(self):
        sql = f"SELECT * FROM {self.table}"
        if self.wheres:
            sql += " WHERE " + " AND ".join(self.wheres)
        if self.limit_n:
            sql += f" LIMIT {self.limit_n}"
        return sql

print(QueryBuilder("users").where("age > 18").where("active = 1").limit(10).build())
```

## 5. Under the hood: methods are descriptors

When you access `obj.method`, the function stored on the class is a **descriptor**: its `__get__` binds `obj` as the first argument and returns a **bound method**. `classmethod` binds the class instead, and `staticmethod` binds nothing. `property` is a descriptor that calls your getter. (Full details are in *Advanced OOP*.)

```python
class A:
    def inst(self): return self
    @classmethod
    def cls_m(cls): return cls
    @staticmethod
    def stat(): return "static"

a = A()
print(A.__dict__["inst"], type(A.__dict__["cls_m"]).__name__, type(A.__dict__["stat"]).__name__)
print(a.inst() is a, a.cls_m() is A, A.cls_m() is A, a.stat())
print(A.__dict__["inst"].__get__(a, A)() is a)     # manual binding
```

## Tricks & tips

- Make "read-only" attributes with a property that has no setter.
- Use `@classmethod` for factory functions and `@staticmethod` for helpers that don't need state. If a "static" method doesn't conceptually belong to the class, make it a module-level function.
- A property should be **cheap and side-effect free**. If it's slow, make it a method (`compute_stats()`) or use `cached_property`.
- `@property` combined with `__slots__` works fine, but `cached_property` needs an instance `__dict__`.
- Name the storage attribute `_name` (one underscore): "internal, please don't touch".

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Property returning `self.x` from `x` → recursion | store as `self._x` |
| 2 | Hard-coding the class name in a factory | use `cls(...)` |
| 3 | Forgetting `@classmethod` (cls receives the instance) | decorate it |
| 4 | Expensive property called in a loop | cache or make it a method |
| 5 | Setter not used in `__init__` (validation skipped) | assign `self.x = x`, not `self._x = x` |
| 6 | Stale `cached_property` after inputs change | invalidate, or don't cache |
| 7 | Calling a property with `()` | it's an attribute: `obj.area` |
| 8 | Static methods that need class data | make them classmethods |
| 9 | Java-style `get_x()`/`set_x()` everywhere | plain attributes, then properties |
| 10 | Properties with surprising side effects | keep getters pure |

## Practice problems

:::problem basic | Alternative constructors | @classmethod
Create `Date(year, month, day)` with class methods `from_string("2026-11-15")` and `today()` (return a fixed `Date(2026, 11, 15)` for testability), and an instance method `is_leap_year()`.
:::solution
```python
class Date:
    def __init__(self, year, month, day):
        self.year, self.month, self.day = year, month, day
    @classmethod
    def from_string(cls, s):
        y, m, d = map(int, s.split("-"))
        return cls(y, m, d)
    @classmethod
    def today(cls):
        return cls(2026, 11, 15)
    def is_leap_year(self):
        y = self.year
        return y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)
    def __repr__(self):
        return f"Date({self.year}, {self.month}, {self.day})"

print(Date.from_string("2024-02-29"), Date.from_string("2024-02-29").is_leap_year())
print(Date.today(), Date(1900, 1, 1).is_leap_year(), Date(2000, 1, 1).is_leap_year())
```
:::explain
Both factories end in `cls(...)`, so a `class MyDate(Date)` gets `MyDate` instances for free. The leap-year rule: divisible by 4, except centuries, unless divisible by 400. So 1900 isn't a leap year and 2000 is.
:::end

:::problem basic | Validated property | @property, setter
Write `Person` with a `name` that's stripped and must be non-empty, and an `age` that must be an int from 0 to 150. Assigning bad values raises `ValueError`, **including during `__init__`**.
:::solution
```python
class Person:
    def __init__(self, name, age):
        self.name = name          # routes through the setters
        self.age = age

    @property
    def name(self):
        return self._name
    @name.setter
    def name(self, value):
        value = str(value).strip()
        if not value:
            raise ValueError("name cannot be empty")
        self._name = value

    @property
    def age(self):
        return self._age
    @age.setter
    def age(self, value):
        if not isinstance(value, int) or not 0 <= value <= 150:
            raise ValueError(f"invalid age: {value!r}")
        self._age = value

p = Person("  Ada  ", 36)
print(repr(p.name), p.age)
for bad in [lambda: Person("", 3), lambda: setattr(p, "age", 200)]:
    try:
        bad()
    except ValueError as e:
        print("ValueError:", e)
```
:::explain
Assigning `self.name = name` in `__init__` (rather than `self._name`) means construction goes through the **same validation** as later updates, so there's only one rule to maintain. Invalid objects can never exist.
:::end

:::problem basic | Static helper vs module function | @staticmethod design
Write `Password` with a static method `strength(pw)` returning a score 0–4 (length ≥ 8, a digit, upper and lower case, a symbol), and an instance method `is_strong()` that uses it. Explain when a static method is the right choice.
:::solution
```python
import string

class Password:
    def __init__(self, raw):
        self.raw = raw
    @staticmethod
    def strength(pw):
        return sum([
            len(pw) >= 8,
            any(c.isdigit() for c in pw),
            any(c.isupper() for c in pw) and any(c.islower() for c in pw),
            any(c in string.punctuation for c in pw),
        ])
    def is_strong(self):
        return self.strength(self.raw) >= 3

print(Password.strength("abc"), Password.strength("Abcdef12!"), Password("hunter2").is_strong())
```
:::explain
`strength` needs neither the instance nor the class, only its argument, so it's static. It lives in `Password` because it's about passwords, and callers can use it without creating an object. `sum` of booleans counts the `True`s. If the helper were generic (say, `count_digits`), it would belong at module level.
:::end

:::problem medium | Read-only and derived properties | property design
Implement `Order(items)` where `items` is a list of `(name, unit_price, qty)`. Expose read-only properties `subtotal`, `tax` (8%), `total`, and `item_count`. The items list must not be modifiable from outside (expose a tuple copy).
:::solution
```python
class Order:
    TAX_RATE = 0.08

    def __init__(self, items):
        self._items = [tuple(i) for i in items]
    @property
    def items(self):
        return tuple(self._items)              # outsiders get an immutable snapshot
    def add(self, name, price, qty=1):
        self._items.append((name, price, qty))
    @property
    def subtotal(self):
        return sum(p * q for _, p, q in self._items)
    @property
    def tax(self):
        return round(self.subtotal * self.TAX_RATE, 2)
    @property
    def total(self):
        return round(self.subtotal + self.tax, 2)
    @property
    def item_count(self):
        return sum(q for *_, q in self._items)

o = Order([("pen", 1.5, 4), ("book", 12.0, 1)])
o.add("mug", 7.25)
print(o.subtotal, o.tax, o.total, o.item_count)
print(o.items)
try:
    o.items.append(("hack", 0, 1))
except AttributeError as e:
    print("AttributeError:", e)
```
:::explain
Derived values are **computed** from the single source of truth (`_items`), so they're never out of sync. Returning a **tuple copy** prevents callers from bypassing `add` and corrupting state (encapsulation). `*_, q` in the unpacking keeps only the last field.
:::end

:::problem medium | Unit-converting properties | property pairs
Create `Distance` that stores metres internally, with read-write properties `km`, `miles` and `feet`. Setting any of them updates the stored metres, and all the others reflect it.
:::solution
```python
class Distance:
    FACTORS = {"km": 1000, "miles": 1609.344, "feet": 0.3048}

    def __init__(self, meters=0.0):
        self.meters = meters

    def _make(factor, unit):                      # helper used while the class body runs
        def getter(self):
            return self.meters / factor
        def setter(self, value):
            self.meters = value * factor
        return property(getter, setter, doc=f"distance in {unit}")

    km = _make(FACTORS["km"], "km")              # class-level names ARE visible here...
    miles = _make(FACTORS["miles"], "miles")
    feet = _make(FACTORS["feet"], "feet")
    del _make

d = Distance()
d.km = 5
print(round(d.miles, 3), round(d.feet, 1))
d.miles = 26.2188
print(round(d.km, 3), round(d.meters))
```
:::explain
`property(fget, fset)` is the function form of the decorator. Generating the three properties with a small factory avoids writing six near-identical methods. A subtle rule: code written directly in the class body can see `FACTORS`, but functions defined in a class body **can't** see class-level names. A class body is not an enclosing scope (the same reason for the comprehension NameError in an earlier chapter). That's why we pass `factor` in as an argument. `del _make` keeps the helper from becoming a method. Each property is a **descriptor** stored on the class.
:::end

:::problem medium | Lazy, invalidating cache | properties + manual cache
A `Polygon(points)` should compute its `area` (shoelace formula) lazily and cache it. Because `points` can change via `add_point`, the cache must be **invalidated** on change. Implement it without `cached_property`.
:::solution
```python
class Polygon:
    def __init__(self, points):
        self._points = list(points)
        self._area = None
        self.computations = 0

    def add_point(self, p):
        self._points.append(p)
        self._area = None                       # invalidate

    @property
    def area(self):
        if self._area is None:
            self.computations += 1
            pts = self._points
            s = sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]))
            self._area = abs(s) / 2
        return self._area

sq = Polygon([(0, 0), (4, 0), (4, 4)])
print(sq.area, sq.area, sq.computations)       # computed once
sq.add_point((0, 4))
print(sq.area, sq.computations)                # recomputed after the change
```
:::explain
The **shoelace formula** sums the cross products of consecutive vertices: `zip(pts, pts[1:] + pts[:1])` pairs each point with the next, wrapping around. The cache is a private attribute, reset by any mutating method. That's exactly what `cached_property` can't do on its own. "Cache + invalidate on write" is a fundamental pattern (and famously one of the hard problems in computer science).
:::end

:::problem hard | Builder pattern with validation | classmethods, fluent API
Create an `HTTPRequest` built via `HTTPRequest.builder("GET", "/users").header("Accept", "json").query(page=2).build()`. `build()` must validate (method in GET/POST/PUT/DELETE, the path starts with `/`, POST/PUT need a body) and return an immutable request whose `url` property assembles the query string (URL-encoded, sorted keys).
:::solution
```python
from urllib.parse import urlencode
from types import MappingProxyType

class HTTPRequest:
    METHODS = {"GET", "POST", "PUT", "DELETE"}

    def __init__(self, method, path, headers, params, body):
        self._method, self._path, self._body = method, path, body
        self._headers = MappingProxyType(dict(headers))   # read-only dict view
        self._params = MappingProxyType(dict(params))

    @property
    def method(self): return self._method
    @property
    def headers(self): return self._headers
    @property
    def url(self):
        qs = urlencode(sorted(self._params.items()))
        return self._path + ("?" + qs if qs else "")

    @classmethod
    def builder(cls, method, path):
        return _Builder(cls, method, path)

    def __repr__(self):
        return f"<{self._method} {self.url} headers={dict(self._headers)} body={self._body!r}>"

class _Builder:
    def __init__(self, cls, method, path):
        self.cls, self.method, self.path = cls, method.upper(), path
        self.headers, self.params, self.body = {}, {}, None
    def header(self, k, v):
        self.headers[k] = v; return self
    def query(self, **kw):
        self.params.update(kw); return self
    def json(self, body):
        self.body = body; return self.header("Content-Type", "application/json")
    def build(self):
        if self.method not in self.cls.METHODS:
            raise ValueError(f"bad method {self.method}")
        if not self.path.startswith("/"):
            raise ValueError("path must start with /")
        if self.method in {"POST", "PUT"} and self.body is None:
            raise ValueError(f"{self.method} requires a body")
        return self.cls(self.method, self.path, self.headers, self.params, self.body)

r = HTTPRequest.builder("get", "/users").header("Accept", "json").query(page=2, q="ada lovelace").build()
print(r, r.url)
try:
    r.headers["X"] = 1
except TypeError as e:
    print("immutable headers:", e)
try:
    HTTPRequest.builder("POST", "/users").build()
except ValueError as e:
    print("ValueError:", e)
```
:::explain
The **builder** collects optional parts step by step (fluent methods return `self`) and validates **once** in `build()`, so a half-configured request never escapes. The resulting object is effectively immutable: read-only properties, plus `MappingProxyType`, a read-only view of a dict. The `builder` class method is the entry point and passes `cls` along, so subclasses get their own type.
:::end

:::problem hard | Observable properties | property factory, callbacks
Write a function `observable(name)` that returns a property which stores the value in `_name` and, on change, calls every callback registered in the instance's `_observers[name]` list with `(old, new)`. Use it in a `Stock` class with `price` and `volume`, and register a callback that logs changes larger than 5%.
:::solution
```python
from collections import defaultdict

def observable(name):
    attr = "_" + name
    def getter(self):
        return getattr(self, attr, None)
    def setter(self, value):
        old = getattr(self, attr, None)
        setattr(self, attr, value)
        if old != value:
            for cb in self._observers[name]:
                cb(old, value)
    return property(getter, setter)

class Stock:
    price = observable("price")
    volume = observable("volume")

    def __init__(self, symbol, price, volume=0):
        self._observers = defaultdict(list)    # must exist before the setters run
        self.symbol = symbol
        self.price = price
        self.volume = volume

    def watch(self, name, callback):
        self._observers[name].append(callback)

log = []
s = Stock("PYTH", 100.0)
s.watch("price", lambda old, new: abs(new - old) / old > 0.05 and log.append(f"price jump {old} -> {new}"))
s.watch("volume", lambda old, new: log.append(f"volume {old} -> {new}"))
for p in [101, 99, 110, 110, 90]:
    s.price = p
s.volume = 5000
print(log)
```
:::explain
`observable` is a **property factory**: each call builds a fresh getter/setter pair that closes over its own `attr` name. The setter notifies observers only on a **real change**. Note the order in `__init__`: `_observers` must exist before the first `self.price = …`, because the setter uses it. This is the Observer pattern implemented with descriptors, the same mechanism reactive UI frameworks and ORMs use to track changes.
:::end
