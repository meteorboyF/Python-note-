# Advanced OOP & Design Patterns

This chapter opens the hood: **descriptors** (the mechanism behind properties, methods and `classmethod`), **metaclasses** (classes that build classes), `__new__`, `__init_subclass__`, `__class_getitem__`, and the classic **design patterns** written the *Pythonic* way. Many Java-style patterns shrink to a few lines because Python has first-class functions and modules.

:::analogy The bakery's machinery
- A **descriptor** is a smart shelf label: when someone reads or writes "price", the label decides what really happens.
- A **metaclass** is the factory that builds cookie cutters. It runs when a *class* is created, not when instances are.
- **Design patterns** are proven kitchen layouts: you don't reinvent where the oven goes.
:::

## 1. Descriptors

A **descriptor** is any object with `__get__`, `__set__` or `__delete__`, stored as a **class attribute**. When you access that attribute through an instance, Python calls those methods.

```python
class Positive:
    """A reusable validated attribute."""
    def __set_name__(self, owner, name):      # called at class creation: learn our name
        self.private = "_" + name
    def __get__(self, obj, objtype=None):
        if obj is None:                       # accessed on the class itself
            return self
        return getattr(obj, self.private)
    def __set__(self, obj, value):
        if value <= 0:
            raise ValueError(f"{self.private[1:]} must be > 0, got {value}")
        setattr(obj, self.private, value)

class Product:
    price = Positive()          # one descriptor object shared by all instances
    qty = Positive()
    def __init__(self, price, qty):
        self.price = price      # -> Positive.__set__(self, price)
        self.qty = qty

p = Product(9.99, 3)
print(p.price, p.qty, vars(p))
try:
    p.qty = 0
except ValueError as e:
    print("ValueError:", e)
```

:::term Data vs non-data descriptors
- **Data descriptor**: defines `__set__` or `__delete__` (e.g. `property`, our `Positive`). It **wins** over the instance `__dict__`.
- **Non-data descriptor**: only `__get__` (e.g. plain functions → methods, `cached_property`). The instance `__dict__` **wins** over it, which is how `cached_property` caches: after the first computation, the stored value shadows the descriptor.
:::

Full attribute lookup for `obj.x`:

1. A data descriptor named `x` on `type(obj)` or its MRO → `__get__`
2. `obj.__dict__["x"]`
3. A non-data descriptor or plain class attribute `x` → `__get__`, or the value
4. `__getattr__` → otherwise `AttributeError`

```python
class Verbose:
    def __get__(self, obj, objtype=None):
        return "from descriptor"

class A:
    x = Verbose()            # non-data descriptor

a = A()
print(a.x)
a.__dict__["x"] = "from instance dict"
print(a.x)                   # the instance dict wins over a NON-data descriptor
```

### Methods are descriptors

```python
class C:
    def f(self):
        return "called"

c = C()
func = C.__dict__["f"]                     # a plain function object
bound = func.__get__(c, C)                 # what c.f does behind the scenes
print(type(func).__name__, type(bound).__name__, bound())
```

## 2. Metaclasses

Classes are objects too, and their type is `type`. A **metaclass** is a subclass of `type`. It controls **how classes are created**.

```python
print(type(int), type(type), type(object))

# class statements are sugar for calling type(name, bases, namespace)
Dog = type("Dog", (), {"sound": "woof", "speak": lambda self: self.sound})
print(Dog().speak(), Dog.__name__)
```

```python
class RegistryMeta(type):
    registry = {}
    def __new__(mcls, name, bases, ns):
        cls = super().__new__(mcls, name, bases, ns)
        if bases:                                   # skip the abstract base itself
            mcls.registry[name.lower()] = cls
        return cls

class Plugin(metaclass=RegistryMeta):
    pass

class CSVPlugin(Plugin): pass
class JSONPlugin(Plugin): pass
print(RegistryMeta.registry)
```

:::boss You probably don't need a metaclass
*"Metaclasses are deeper magic than 99% of users should ever worry about."* (Tim Peters). For most needs, use: **class decorators** (modify a class after creation), **`__init_subclass__`** (hook into subclass creation), or **descriptors with `__set_name__`**. Reach for metaclasses only when you must control class creation itself (e.g. ORMs, `enum.EnumMeta`, `abc.ABCMeta`).
:::

## 3. `__new__`, singletons and caching instances

```python
class Color:
    _cache = {}
    def __new__(cls, name):
        name = name.lower()
        if name not in cls._cache:                 # flyweight: reuse identical instances
            inst = super().__new__(cls)
            inst.name = name
            cls._cache[name] = inst
        return cls._cache[name]

print(Color("Red") is Color("RED"), len(Color._cache))
```

## 4. Design patterns, the Pythonic way

| Pattern | Problem | Pythonic form |
|---|---|---|
| **Singleton** | exactly one instance | a **module** (modules are singletons), or a module-level instance |
| **Factory** | create objects without naming the class | a function, a `@classmethod`, or a dict of classes |
| **Strategy** | swap algorithms at run time | pass a **function** |
| **Observer** | notify subscribers of changes | a list of callbacks |
| **Decorator** | add behaviour by wrapping | `@decorator` functions, or wrapper classes |
| **Adapter** | make an interface fit another | a small wrapper class |
| **Command** | encapsulate an action (undo/redo) | objects with `execute`/`undo`, or closures |
| **Iterator** | sequential access | generators |
| **Template method** | skeleton algorithm, steps in subclasses | a base method calling overridable hooks |
| **Builder** | complex step-by-step construction | fluent methods or keyword arguments |
| **Dependency injection** | pass collaborators in | constructor parameters with defaults |

### Strategy: just pass a function

```python
def by_price(p): return p["price"]
def by_rating(p): return -p["rating"]

def recommend(products, strategy, k=2):
    return [p["name"] for p in sorted(products, key=strategy)[:k]]

products = [{"name": "A", "price": 30, "rating": 4.1},
            {"name": "B", "price": 10, "rating": 3.2},
            {"name": "C", "price": 20, "rating": 4.8}]
print(recommend(products, by_price), recommend(products, by_rating))
```

### Factory: a registry dict

```python
class Circle:
    def __init__(self, r): self.r = r
    def area(self): return 3.14159 * self.r ** 2
class Square:
    def __init__(self, s): self.s = s
    def area(self): return self.s ** 2

SHAPES = {"circle": Circle, "square": Square}
def make_shape(spec):
    kind = spec.pop("kind")
    return SHAPES[kind](**spec)

print([round(make_shape(s).area(), 2) for s in [{"kind": "circle", "r": 1}, {"kind": "square", "s": 3}]])
```

### Singleton: three ways (the module way is best)

```python
class Config:                                  # 1. classic __new__ singleton
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.settings = {}
        return cls._instance

a, b = Config(), Config()
a.settings["debug"] = True
print(a is b, b.settings)

from functools import cache
@cache                                         # 2. a cached factory function
def get_db():
    return object()
print(get_db() is get_db())
# 3. Pythonic: put `settings = Settings()` in settings.py and import it everywhere.
```

### Observer

```python
class Subject:
    def __init__(self):
        self._observers = []
    def subscribe(self, fn):
        self._observers.append(fn)
        return lambda: self._observers.remove(fn)     # return an "unsubscribe" handle
    def notify(self, *args):
        for fn in list(self._observers):
            fn(*args)

prices = Subject()
unsub = prices.subscribe(lambda p: print("logger saw", p))
prices.subscribe(lambda p: p > 100 and print("ALERT: price", p))
prices.notify(90); prices.notify(120)
unsub()
prices.notify(130)
```

### Adapter

```python
class LegacyPrinter:
    def print_text(self, text, uppercase):
        return (text.upper() if uppercase else text) + " [legacy]"

class PrinterAdapter:                     # gives the legacy class the interface we want
    def __init__(self, legacy):
        self.legacy = legacy
    def write(self, text):
        return self.legacy.print_text(text, uppercase=False)

def report(writer):
    return writer.write("quarterly numbers")

print(report(PrinterAdapter(LegacyPrinter())))
```

## Tricks & tips

- `__set_name__` (3.6+) lets descriptors know their attribute name, so you never repeat it.
- Store descriptor data on the **instance** (`obj.__dict__`), never on the descriptor itself, which is shared by all instances.
- `__init_subclass__` + a class attribute replaces most registry metaclasses.
- `__class_getitem__` makes `MyClass[int]` work (that's how generics are implemented).
- `types.SimpleNamespace(a=1)` is a quick attribute bag for tests and configs.
- Patterns are a vocabulary, not a checklist. Use the simplest structure that works.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Storing per-instance data on the descriptor | store on the instance |
| 2 | Descriptor defined as an instance attribute (does nothing) | must be a class attribute |
| 3 | Forgetting the `obj is None` case in `__get__` | return `self` for class access |
| 4 | Metaclass conflicts when combining bases with different metaclasses | derive a combined metaclass, or avoid metaclasses |
| 5 | Singletons hiding global state (testing pain) | dependency injection |
| 6 | Over-engineering patterns (AbstractFactoryFactory) | functions and modules first |
| 7 | `__new__` returning a non-instance → `__init__` not called | return an instance of `cls` |
| 8 | Mutating the observer list while notifying | iterate over a copy |
| 9 | Memory leaks from caches/registries holding objects | `weakref.WeakValueDictionary` |
| 10 | Strategy via subclasses when a function would do | pass callables |

## Practice problems

:::problem basic | Typed attribute descriptor | descriptors, __set_name__
Write a descriptor `Typed(expected_type)` that enforces the attribute's type on assignment, and use it in `Person` for `name: str` and `age: int`. Print a clear error for `p.age = "old"`.
:::solution
```python
class Typed:
    def __init__(self, expected):
        self.expected = expected
    def __set_name__(self, owner, name):
        self.name = name
    def __get__(self, obj, objtype=None):
        return self if obj is None else obj.__dict__[self.name]
    def __set__(self, obj, value):
        if not isinstance(value, self.expected):
            raise TypeError(f"{self.name} must be {self.expected.__name__}, got {type(value).__name__}")
        obj.__dict__[self.name] = value

class Person:
    name = Typed(str)
    age = Typed(int)
    def __init__(self, name, age):
        self.name, self.age = name, age

p = Person("Ada", 36)
print(p.name, p.age, Person.age)
try:
    p.age = "old"
except TypeError as e:
    print("TypeError:", e)
```
:::explain
Because `Typed` defines `__set__`, it's a **data descriptor** and wins over the instance dict on lookup, so we can safely store the value in `obj.__dict__` under the *same* name. `__set_name__` tells the descriptor which attribute it's managing, so you never repeat yourself. Accessing `Person.age` on the class returns the descriptor itself (the `obj is None` branch).
:::end

:::problem basic | Strategy pattern with functions | first-class functions
Write `checkout(cart, discount)` where `discount` is any function `(total) -> new_total`. Provide `no_discount`, `percent(p)` (a factory returning a function) and `bulk(threshold, off)`. Apply each to a cart.
:::solution
```python
def no_discount(total):
    return total

def percent(p):
    return lambda total: total * (1 - p / 100)

def bulk(threshold, off):
    def apply(total):
        return total - off if total >= threshold else total
    return apply

def checkout(cart, discount=no_discount):
    total = sum(price * qty for price, qty in cart)
    return round(discount(total), 2)

cart = [(19.99, 2), (5.0, 4)]
for name, strat in [("none", no_discount), ("10%", percent(10)), ("bulk", bulk(50, 7.5))]:
    print(name, checkout(cart, strat))
```
:::explain
In Java, Strategy needs an interface and a class per algorithm. In Python, **a function is already a strategy object**. Factories like `percent(10)` use closures to configure them. Adding a new discount is a new function, and `checkout` never changes (open/closed).
:::end

:::problem basic | Make a class a singleton via decorator | class decorators
Write `@singleton`, a class decorator that makes every call to the class return the same instance (the first one created), and test it with a `Logger` class.
:::solution
```python
import functools

def singleton(cls):
    instance = None
    @functools.wraps(cls, updated=())
    def get(*args, **kwargs):
        nonlocal instance
        if instance is None:
            instance = cls(*args, **kwargs)
        return instance
    return get

@singleton
class Logger:
    def __init__(self, name="app"):
        self.name = name
        self.lines = []
    def log(self, msg):
        self.lines.append(f"[{self.name}] {msg}")

a = Logger("main")
b = Logger("ignored")          # returns the existing instance
a.log("hello")
print(a is b, b.name, b.lines)
```
:::explain
The decorator replaces the class name with a function that creates the instance on first use (**lazy initialisation**) and then returns it forever. Downside: `Logger` is no longer a class, so `isinstance(x, Logger)` breaks. That's one reason Pythonistas prefer a plain module-level instance.
:::end

:::problem medium | Lazy property descriptor | non-data descriptor, caching
Implement your own `lazy_property` (like `functools.cached_property`) as a **non-data descriptor** that computes on first access and then caches in the instance `__dict__`, so later accesses don't call the descriptor at all. Prove it by counting calls.
:::solution
```python
class lazy_property:
    def __init__(self, func):
        self.func = func
        self.__doc__ = func.__doc__
    def __set_name__(self, owner, name):
        self.name = name
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        value = self.func(obj)
        obj.__dict__[self.name] = value        # shadows the descriptor from now on
        return value

class Report:
    calls = 0
    def __init__(self, data):
        self.data = data
    @lazy_property
    def summary(self):
        Report.calls += 1
        return {"n": len(self.data), "total": sum(self.data)}

r = Report(list(range(1000)))
print(r.summary, r.summary, r.summary["total"], "computed", Report.calls, "time(s)")
del r.summary                                   # removes the cached value
print(r.summary["n"], "computed", Report.calls, "time(s)")
```
:::explain
A **non-data** descriptor (only `__get__`) has *lower* priority than the instance dict. On first access the dict has no `summary`, so `__get__` runs, computes the value, and stores it in `obj.__dict__["summary"]`. Every later access finds it in the instance dict first, so the descriptor isn't even called. That's a zero-overhead cache, and exactly how `functools.cached_property` works.
:::end

:::problem medium | Command pattern with undo | objects encapsulating actions
Implement a calculator with commands `Add(n)`, `Mul(n)` and `SetTo(n)`, each having `execute(calc)` and `undo(calc)`. `Calculator.run(cmd)` executes and records; `undo()` reverses the last command. `SetTo` must remember the previous value to undo correctly.
:::solution
```python
class Add:
    def __init__(self, n): self.n = n
    def execute(self, c): c.value += self.n
    def undo(self, c): c.value -= self.n

class Mul:
    def __init__(self, n): self.n = n
    def execute(self, c):
        self.prev = c.value                    # multiplication by 0 isn't invertible
        c.value *= self.n
    def undo(self, c): c.value = self.prev

class SetTo:
    def __init__(self, n): self.n = n
    def execute(self, c):
        self.prev = c.value
        c.value = self.n
    def undo(self, c): c.value = self.prev

class Calculator:
    def __init__(self):
        self.value = 0
        self.history = []
    def run(self, cmd):
        cmd.execute(self)
        self.history.append(cmd)
        return self
    def undo(self):
        if self.history:
            self.history.pop().undo(self)
        return self

c = Calculator()
c.run(Add(5)).run(Mul(0)).run(Add(3)).run(SetTo(100))
print(c.value)
for _ in range(3):
    c.undo(); print(c.value)
```
:::explain
Each command object stores what it needs to reverse itself. `Mul` saves the previous value instead of dividing, because multiplying by 0 destroys information. Commands make actions **first-class**: they can be queued, logged, replayed, or undone. Text editors, games and transactional systems all use this pattern.
:::end

:::problem medium | Observer with weak references | weakref, memory safety
Implement `EventSource` whose `subscribe(obj.method)` stores **weak** references to bound methods (`weakref.WeakMethod`), so deleted subscribers are dropped automatically instead of being kept alive forever. Demonstrate that a deleted subscriber stops receiving events.
:::solution
```python
import gc, weakref

class EventSource:
    def __init__(self):
        self._subs = []
    def subscribe(self, bound_method):
        self._subs.append(weakref.WeakMethod(bound_method))
    def emit(self, event):
        alive = []
        for ref in self._subs:
            method = ref()                   # None if the object was garbage-collected
            if method is not None:
                method(event)
                alive.append(ref)
        self._subs = alive

class Widget:
    def __init__(self, name): self.name = name
    def on_event(self, e): print(f"{self.name} got {e}")

src = EventSource()
a, b = Widget("A"), Widget("B")
src.subscribe(a.on_event); src.subscribe(b.on_event)
src.emit("click")
del b
gc.collect()
src.emit("scroll")
print("subscribers left:", len(src._subs))
```
:::explain
A normal list of bound methods holds **strong** references to each subscriber, so a closed UI widget could never be garbage-collected: a classic **memory leak** in observer systems. `WeakMethod` refers to the object without keeping it alive, and once the object dies, calling the ref returns `None` and we prune it. (A plain `weakref.ref(bound_method)` would die immediately, because bound methods are temporary objects. That's why `WeakMethod` exists.)
:::end

:::problem hard | Mini ORM fields via descriptors + metaclass | descriptors, metaclass, __set_name__
Create `Field` descriptors (`IntField`, `StrField(max_len)`) and a metaclass `ModelMeta` that collects all fields of a class (including inherited ones) into `cls._fields` in definition order. `Model.__init__(**kwargs)` sets the fields, rejecting unknown or missing ones, and `to_dict()` serialises. Validation happens in the descriptors.
:::solution
```python
class Field:
    def __set_name__(self, owner, name):
        self.name = name
    def __get__(self, obj, objtype=None):
        return self if obj is None else obj.__dict__.get(self.name)
    def __set__(self, obj, value):
        self.validate(value)
        obj.__dict__[self.name] = value
    def validate(self, value):
        pass

class IntField(Field):
    def validate(self, v):
        if not isinstance(v, int) or isinstance(v, bool):
            raise TypeError(f"{self.name}: expected int, got {v!r}")

class StrField(Field):
    def __init__(self, max_len=255):
        self.max_len = max_len
    def validate(self, v):
        if not isinstance(v, str):
            raise TypeError(f"{self.name}: expected str, got {v!r}")
        if len(v) > self.max_len:
            raise ValueError(f"{self.name}: longer than {self.max_len}")

class ModelMeta(type):
    def __new__(mcls, name, bases, ns):
        cls = super().__new__(mcls, name, bases, ns)
        fields = {}
        for base in reversed(cls.__mro__[1:]):          # inherited fields first
            fields.update(getattr(base, "_fields", {}))
        fields.update({k: v for k, v in ns.items() if isinstance(v, Field)})
        cls._fields = fields
        return cls

class Model(metaclass=ModelMeta):
    def __init__(self, **kwargs):
        unknown = kwargs.keys() - self._fields.keys()
        missing = self._fields.keys() - kwargs.keys()
        if unknown or missing:
            raise TypeError(f"unknown={sorted(unknown)} missing={sorted(missing)}")
        for k, v in kwargs.items():
            setattr(self, k, v)
    def to_dict(self):
        return {k: getattr(self, k) for k in self._fields}
    def __repr__(self):
        return f"{type(self).__name__}({self.to_dict()})"

class Entity(Model):
    id = IntField()

class User(Entity):
    name = StrField(max_len=10)
    age = IntField()

print(list(User._fields), User(id=1, name="Ada", age=36))
for bad in [dict(id=1, name="A" * 20, age=3), dict(id=1, name="Bo", age="3"), dict(id=1, name="Cy")]:
    try:
        User(**bad)
    except (TypeError, ValueError) as e:
        print(type(e).__name__, e)
```
:::explain
Descriptors own **per-field validation**, the metaclass owns **class-level bookkeeping** (collecting fields across the inheritance chain, in order), and `Model` owns the **instance protocol**. Walking `reversed(__mro__)` merges base fields first, so `id` comes before `name`. This mirrors the architecture of Django's ORM and early SQLAlchemy. Today, `__init_subclass__` could replace the metaclass. Try it as an exercise.
:::end

:::problem hard | Plugin pipeline with Template Method + hooks | template method, abstract hooks
Design `DataPipeline` with a final `run(raw)` method that calls hooks in a fixed order: `validate` → `clean` → `transform` → `summarize`. `validate` and `transform` are abstract, while `clean` and `summarize` have defaults. Implement `SalesPipeline` (parses `"region:amount"` strings, upper-cases regions, and summarises totals per region) and show that `run` can't be broken by a subclass reordering steps.
:::solution
```python
from abc import ABC, abstractmethod
from collections import defaultdict

class DataPipeline(ABC):
    def run(self, raw):                         # the template: a fixed skeleton
        self.validate(raw)
        rows = self.clean(raw)
        rows = [self.transform(r) for r in rows]
        return self.summarize(rows)

    def __init_subclass__(cls, **kw):           # protect the skeleton from overriding
        super().__init_subclass__(**kw)
        if "run" in cls.__dict__:
            raise TypeError(f"{cls.__name__} must not override run()")

    @abstractmethod
    def validate(self, raw): ...
    @abstractmethod
    def transform(self, row): ...
    def clean(self, raw):                       # default hook
        return [r.strip() for r in raw if r and r.strip()]
    def summarize(self, rows):                  # default hook
        return rows

class SalesPipeline(DataPipeline):
    def validate(self, raw):
        bad = [r for r in raw if r.strip() and ":" not in r]
        if bad:
            raise ValueError(f"malformed rows: {bad}")
    def transform(self, row):
        region, amount = row.split(":")
        return region.strip().upper(), float(amount)
    def summarize(self, rows):
        totals = defaultdict(float)
        for region, amount in rows:
            totals[region] += amount
        return dict(sorted(totals.items(), key=lambda kv: -kv[1]))

print(SalesPipeline().run(["north:10", " south:5.5 ", "", "north:2.5", "east:30"]))
try:
    class Rogue(SalesPipeline):
        def run(self, raw):
            return "skipped validation!"
except TypeError as e:
    print("TypeError:", e)
```
:::explain
**Template Method**: the base class owns the *order* of the algorithm, and subclasses fill in steps through **hooks**. Abstract hooks force implementation, and default hooks are optional overrides. Python has no `final` keyword at run time (`typing.final` is only for type checkers), so `__init_subclass__` enforces the rule when the class is defined. Frameworks like scikit-learn's `fit`/`transform` and unittest's `setUp`/`tearDown` follow this shape.
:::end

:::problem hard | Generic container with __class_getitem__ and runtime type checks | __class_getitem__, generics
Write `TypedList` such that `TypedList[int]` produces a **specialised subclass** (cached, so `TypedList[int] is TypedList[int]`) whose instances reject items of the wrong type on `append`, `extend`, `insert`, `__setitem__` and construction. `TypedList[int]` and `TypedList[str]` must be different classes with readable names.
:::solution
```python
from collections import UserList

class TypedList(UserList):
    item_type = object
    _cache = {}

    def __class_getitem__(cls, item_type):
        if item_type not in cls._cache:
            name = f"{cls.__name__}[{item_type.__name__}]"
            cls._cache[item_type] = type(name, (cls,), {"item_type": item_type})
        return cls._cache[item_type]

    def _check(self, x):
        if not isinstance(x, self.item_type):
            raise TypeError(f"{type(self).__name__} got {type(x).__name__}: {x!r}")
        return x

    def __init__(self, items=()):
        super().__init__(self._check(x) for x in items)
    def append(self, x):
        super().append(self._check(x))
    def extend(self, xs):
        super().extend(self._check(x) for x in xs)
    def insert(self, i, x):
        super().insert(i, self._check(x))
    def __setitem__(self, i, x):
        if isinstance(i, slice):
            x = [self._check(v) for v in x]
        else:
            self._check(x)
        super().__setitem__(i, x)

Ints = TypedList[int]
nums = Ints([1, 2])
nums.append(3); nums.extend([4, 5]); nums[0] = 10
print(nums, type(nums).__name__, TypedList[int] is Ints, TypedList[int] is TypedList[str])
for bad in [lambda: nums.append("6"), lambda: nums.insert(0, 1.5), lambda: TypedList[str](["a", 1])]:
    try:
        bad()
    except TypeError as e:
        print("TypeError:", e)
```
:::explain
`Class[X]` calls `__class_getitem__(X)`. Here we build a real subclass with `type(name, bases, ns)`, the same thing a `class` statement does, and store it in a cache so the same parameter always yields the same class. Instances can then check `self.item_type` at run time. Typing generics (`list[int]`) only annotate, while this one **enforces**. We subclass `UserList` so that every mutation path is a Python method we can intercept.
:::end
