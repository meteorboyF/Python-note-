# Inheritance, super() & MRO

Python supports **multiple inheritance**: a class can have several parents. To make that work it computes a single, predictable search order, the **Method Resolution Order (MRO)**, and `super()` follows *that order*, **not** "the parent". Understanding this is what separates intermediate from advanced Python developers.

:::analogy Asking for advice in a queue
When a method is called, Python lines up the class and all its ancestors in one queue (the MRO) and asks each in turn: "do you have this method?" `super()` means "**ask the next person in the queue after me**", which isn't necessarily my own parent.
:::

## 1. Single inheritance and `super()`

```python
class Vehicle:
    def __init__(self, wheels):
        self.wheels = wheels
    def describe(self):
        return f"{self.wheels} wheels"

class Car(Vehicle):
    def __init__(self, brand):
        super().__init__(wheels=4)          # run the parent's initializer
        self.brand = brand
    def describe(self):
        return f"{self.brand} car with " + super().describe()   # extend

c = Car("Volvo")
print(c.describe(), vars(c))
```

:::trap Forgetting `super().__init__()`
If a subclass defines `__init__` and doesn't call `super().__init__(...)`, the parent's attributes are **never set**. You get `AttributeError` later, far from the cause.
:::

```python error
class Base:
    def __init__(self):
        self.ready = True
class Child(Base):
    def __init__(self):
        self.extra = 1          # forgot super().__init__()
print(Child().ready)            # AttributeError
```

## 2. Overriding vs extending

| Approach | Code | Effect |
|---|---|---|
| **Inherit** | (define nothing) | the parent's method is used |
| **Override** | `def m(self): …` | replaces the parent's version |
| **Extend** | `def m(self): … super().m() …` | adds to the parent's version |

## 3. Multiple inheritance and the MRO

```python
class A:
    def who(self): return "A"
class B(A):
    def who(self): return "B -> " + super().who()
class C(A):
    def who(self): return "C -> " + super().who()
class D(B, C):
    def who(self): return "D -> " + super().who()

print(D().who())
print([k.__name__ for k in D.__mro__])
```

This is the famous **diamond**: `D` inherits from `B` and `C`, which both inherit from `A`. The MRO is `D → B → C → A → object`. Look at the output: `B`'s `super()` called **`C`**, not `A`! `super()` means "next in the **instance's** MRO".

```text
        A
       / \
      B   C
       \ /
        D        MRO(D) = D, B, C, A, object
```

:::deep C3 linearisation, the rules behind the MRO
Python computes the MRO with the **C3 algorithm**. It guarantees:
1. **Children before parents**: a class always appears before its bases.
2. **Left-to-right order is preserved**: in `class D(B, C)`, `B` comes before `C`.
3. **Monotonicity**: every class's own MRO order is respected inside its subclasses' MROs.

`MRO(D) = D + merge(MRO(B), MRO(C), [B, C])`. Repeatedly take the first head that doesn't appear in the *tail* of any other list. If no valid order exists, Python raises `TypeError: Cannot create a consistent method resolution order`.
:::

```python error
class X: pass
class Y(X): pass
class Z(X, Y): pass      # X before Y, but Y is a subclass of X -> impossible
```

### Cooperative multiple inheritance

For `super()` chains to work across a diamond, every class in the chain must **cooperate**: call `super()`, and accept and forward `**kwargs` it doesn't use.

```python
class Base:
    def __init__(self, **kwargs):
        super().__init__(**kwargs)          # object.__init__ takes no extra args
class Named(Base):
    def __init__(self, name, **kwargs):
        self.name = name
        super().__init__(**kwargs)
class Aged(Base):
    def __init__(self, age, **kwargs):
        self.age = age
        super().__init__(**kwargs)
class Person(Named, Aged):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

p = Person(name="Ada", age=36)
print(vars(p), [k.__name__ for k in Person.__mro__])
```

Each `__init__` takes the arguments it understands and passes the rest along. `Base.__init__` runs **exactly once**, even though both `Named` and `Aged` inherit from it.

:::trap Calling parents by name in a diamond
Writing `B.__init__(self)` and `C.__init__(self)` explicitly inside `D.__init__` makes `A.__init__` run **twice** (once via B, once via C). With cooperative `super()`, each class runs once, in MRO order.
:::

## 4. Mixins

A **mixin** is a small class that adds one capability and is meant to be combined with others. It usually has no `__init__` and no state of its own.

```python
import json

class JSONMixin:
    def to_json(self):
        return json.dumps(self.__dict__, default=str)

class ReprMixin:
    def __repr__(self):
        fields = ", ".join(f"{k}={v!r}" for k, v in vars(self).items())
        return f"{type(self).__name__}({fields})"

class EqualityMixin:
    def __eq__(self, other):
        return type(self) is type(other) and vars(self) == vars(other)

class User(ReprMixin, JSONMixin, EqualityMixin):
    def __init__(self, name, email):
        self.name, self.email = name, email

u = User("ada", "ada@example.com")
print(u, u.to_json(), u == User("ada", "ada@example.com"))
```

:::tip Mixin conventions
Name them `…Mixin`, keep them small and stateless, list them **before** the main base class (`class View(LoginRequiredMixin, TemplateView)` in Django), and use `super()` in any method they override, so they compose.
:::

## 5. Inheriting from built-ins

```python
class UpperDict(dict):
    def __setitem__(self, key, value):
        super().__setitem__(key.upper(), value)

d = UpperDict()
d["a"] = 1
d.update(b=2)               # update() does NOT call our __setitem__ (C fast path)!
print(d)

from collections import UserDict
class UpperDict2(UserDict):          # UserDict routes everything through __setitem__
    def __setitem__(self, key, value):
        super().__setitem__(key.upper(), value)

d2 = UpperDict2()
d2["a"] = 1
d2.update(b=2)
print(d2)
```

:::trap Subclassing `dict`/`list` directly
The C implementations of `dict.update`, `dict.__init__`, `list.extend` and others don't call your overridden methods. Subclass `collections.UserDict`, `UserList` or `UserString` when you override core behaviour, or wrap the object (composition).
:::

## 6. Inspecting hierarchies

```python
class A: pass
class B(A): pass
class C(B): pass
print(C.__bases__, C.__base__.__name__, [k.__name__ for k in C.mro()])
print(issubclass(C, A), isinstance(C(), A), A.__subclasses__())
print(type(C), type(type))     # classes are instances of `type`
```

## Tricks & tips

- Print `Class.__mro__` whenever multiple inheritance confuses you.
- `super()` with no arguments only works inside methods defined in a class body (it uses the hidden `__class__` cell).
- Use `__init_subclass__` to customise subclasses (validation, registration) without metaclasses.
- `abc.ABC` + mixins form a clean "interface + reusable implementation" toolkit.
- `functools.total_ordering` is a decorator, not a mixin, but it serves the same purpose for comparison methods.
- Prefer **shallow** hierarchies: 2–3 levels.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Missing `super().__init__()` | always call it when overriding `__init__` |
| 2 | Explicit `Parent.method(self)` in a diamond | cooperative `super()` |
| 3 | Mismatched `__init__` signatures in cooperative classes | keyword args + `**kwargs` |
| 4 | Assuming `super()` means "my parent" | it means "next in the MRO" |
| 5 | Inconsistent MRO TypeError | reorder the bases (subclasses first) |
| 6 | Subclassing `dict` and overriding `__setitem__` | `UserDict` |
| 7 | Mixins with `__init__` that doesn't call super | make them cooperative |
| 8 | Deep hierarchies that nobody can follow | composition |
| 9 | Shadowing parent attributes accidentally | name mangling (`__x`) |
| 10 | Base-class changes breaking subclasses (fragile base class) | small, documented hooks |

## Practice problems

:::problem basic | Extend, don't replace | super()
`Logger` has `log(msg)` returning `"[LOG] msg"`. Create `TimestampLogger` (prefixes a fixed timestamp `2026-11-15 10:00`) and `UpperLogger` (uppercases), each **extending** via `super()`. Then make `TimestampUpperLogger(TimestampLogger, UpperLogger)` and predict its output from the MRO.
:::solution
```python
class Logger:
    def log(self, msg):
        return f"[LOG] {msg}"

class TimestampLogger(Logger):
    def log(self, msg):
        return super().log(f"2026-11-15 10:00 {msg}")

class UpperLogger(Logger):
    def log(self, msg):
        return super().log(msg.upper())

class TimestampUpperLogger(TimestampLogger, UpperLogger):
    pass

print(TimestampLogger().log("hi"), "|", UpperLogger().log("hi"))
print(TimestampUpperLogger().log("server started"))
print([k.__name__ for k in TimestampUpperLogger.__mro__])
```
:::explain
MRO: `TimestampUpperLogger → TimestampLogger → UpperLogger → Logger`. `TimestampLogger.log` adds the timestamp, and its `super().log` goes to **UpperLogger** (next in the MRO), which uppercases everything, *including the timestamp text*, before `Logger` adds `[LOG]`. So the result is `[LOG] 2026-11-15 10:00 SERVER STARTED`. Each mixin transforms the message and passes it along: cooperative inheritance as a pipeline.
:::end

:::problem basic | Fix the missing initializer | super().__init__
The `Manager` below crashes on `m.describe()`. Find out why and fix it **without** duplicating the parent's code.
```python norun
class Employee:
    def __init__(self, name, salary):
        self.name, self.salary = name, salary
    def describe(self):
        return f"{self.name} earns {self.salary}"
class Manager(Employee):
    def __init__(self, name, salary, reports):
        self.reports = reports
```
:::solution
```python
class Employee:
    def __init__(self, name, salary):
        self.name, self.salary = name, salary
    def describe(self):
        return f"{self.name} earns {self.salary}"

class Manager(Employee):
    def __init__(self, name, salary, reports):
        super().__init__(name, salary)
        self.reports = list(reports)
    def describe(self):
        return super().describe() + f" and manages {len(self.reports)}"

m = Manager("Ada", 9000, ["bob", "cy"])
print(m.describe())
```
:::explain
`Manager.__init__` **overrides** `Employee.__init__`, so the parent's version never ran and `name`/`salary` were never set. `super().__init__(name, salary)` delegates the shared setup, and `describe` likewise extends rather than rewrites.
:::end

:::problem basic | Compute an MRO by hand | C3 linearisation
For `class O`, `class A(O)`, `class B(O)`, `class C(O)`, `class D(A, B)`, `class E(B, C)` and `class F(D, E)`, write out `F`'s MRO by hand, then verify it with `F.__mro__`.
:::solution
```python
class O: pass
class A(O): pass
class B(O): pass
class C(O): pass
class D(A, B): pass
class E(B, C): pass
class F(D, E): pass
print(" -> ".join(k.__name__ for k in F.__mro__))
```
:::explain
`MRO(D) = D A B O`, `MRO(E) = E B C O`. Then `MRO(F) = F + merge(DABO, EBCO, DE)`:
take **D** (not in any tail) → merge(ABO, EBCO, E). Take **A** → merge(BO, EBCO, E). B is in the tail of EBCO, so skip it and take **E** → merge(BO, BCO). Take **B** → merge(O, CO). O is in the tail of CO, so take **C** → then **O**.
Result: **F D A E B C O object**.
:::trace
| Step | Lists to merge | Chosen |
|---|---|---|
| 1 | DABO · EBCO · DE | D |
| 2 | ABO · EBCO · E | A |
| 3 | BO · EBCO · E | E (B blocked) |
| 4 | BO · BCO | B |
| 5 | O · CO | C (O blocked) |
| 6 | O · O | O |
:::end

:::problem medium | Cooperative mixins for a web view | mixins, super chains
Build a tiny request-handling chain: `View.handle(request)` returns a response dict. Write `AuthMixin` (rejects if `request["user"]` is None), `CacheMixin` (caches responses per path) and `TimingMixin` (adds `"ms"` to the response). Combine them so that auth runs first, then the cache, then timing around the real view. Show cache hits and rejections.
:::solution
```python
import time

class View:
    def handle(self, request):
        return {"status": 200, "body": f"Hello {request['user']} at {request['path']}"}

class AuthMixin:
    def handle(self, request):
        if request.get("user") is None:
            return {"status": 401, "body": "login required"}
        return super().handle(request)

class CacheMixin:
    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        self._cache = {}
        self.hits = 0
    def handle(self, request):
        key = (request["path"], request["user"])
        if key in self._cache:
            self.hits += 1
            return self._cache[key]
        resp = super().handle(request)
        self._cache[key] = resp
        return resp

class TimingMixin:
    def handle(self, request):
        t = time.perf_counter()
        resp = dict(super().handle(request))
        resp["ms"] = round((time.perf_counter() - t) * 1000, 3)
        return resp

class ProfileView(AuthMixin, CacheMixin, TimingMixin, View):
    pass

v = ProfileView()
print([k.__name__ for k in ProfileView.__mro__][:5])
print(v.handle({"user": None, "path": "/me"}))
print(v.handle({"user": "ada", "path": "/me"})["body"])
print(v.handle({"user": "ada", "path": "/me"})["body"], "| cache hits:", v.hits)
```
:::explain
The order of the bases **is** the order of execution: `AuthMixin → CacheMixin → TimingMixin → View`. Each `handle` does its job and calls `super().handle`, which goes to the next class in the MRO. Auth short-circuits before the cache (so anonymous users never pollute it), and cache hits skip timing and the view entirely. `CacheMixin.__init__` cooperates by calling `super().__init__`. This is exactly how Django class-based views and middleware stacks are composed.
:::end

:::problem medium | Safe dict subclass | UserDict, overriding
Create `ValidatedDict` that only accepts `str` keys and `int` values. It must enforce this for `d[k] = v`, `update()`, the constructor, and `setdefault()`. Show that a naive `dict` subclass fails at least one of these.
:::solution
```python
from collections import UserDict

class NaiveDict(dict):
    def __setitem__(self, k, v):
        if not isinstance(k, str) or not isinstance(v, int):
            raise TypeError(f"bad item {k!r}: {v!r}")
        super().__setitem__(k, v)

class ValidatedDict(UserDict):
    def __setitem__(self, k, v):
        if not isinstance(k, str) or not isinstance(v, int):
            raise TypeError(f"bad item {k!r}: {v!r}")
        super().__setitem__(k, v)

n = NaiveDict()
n.update({"x": "not an int"})          # slips through!
print("naive accepted:", dict(n))

for action in [lambda: ValidatedDict({"a": 1, "b": "2"}),
               lambda: ValidatedDict().update(c=3.5),
               lambda: ValidatedDict().setdefault(5, 1)]:
    try:
        action()
    except TypeError as e:
        print("rejected:", e)
v = ValidatedDict(a=1)
v["b"] = 2
print(v)
```
:::explain
`dict.update` (like `dict.__init__` and `setdefault`) is implemented in C and writes directly to the hash table, **bypassing** your Python `__setitem__`. `UserDict` stores the data in `self.data` and implements every mutating method in Python on top of `__setitem__`, so one override covers them all.
:::end

:::problem medium | __init_subclass__ validation | class creation hooks
Write a base class `Model` that, using `__init_subclass__`, requires every subclass to define a class attribute `table` (a non-empty string) and automatically collects the subclass's annotated fields into `cls.fields`. Subclasses missing `table` must fail **at class-definition time**.
:::solution
```python
class Model:
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        table = cls.__dict__.get("table")
        if not isinstance(table, str) or not table:
            raise TypeError(f"{cls.__name__} must define a non-empty 'table'")
        cls.fields = list(cls.__annotations__)

class User(Model):
    table = "users"
    id: int
    name: str

print(User.table, User.fields)
try:
    class Broken(Model):
        name: str
except TypeError as e:
    print("TypeError:", e)
```
:::explain
`__init_subclass__` runs on the parent every time a subclass is **created**, so errors surface at import time rather than deep in production. Reading `cls.__dict__` (not `getattr`) ensures each subclass declares its *own* table instead of inheriting one. ORMs (SQLAlchemy, Django models) and frameworks use this or metaclasses to turn class declarations into schemas.
:::end

:::problem hard | Implement C3 linearisation | algorithms, MRO
Write `c3_mro(cls)` that computes the MRO from `cls.__bases__` alone (recursively), and raises `TypeError` for impossible hierarchies. Verify it matches `cls.__mro__` for several hierarchies, including the diamond and the 6-class example.
:::solution
```python
def c3_mro(cls):
    if cls is object:
        return [object]
    seqs = [c3_mro(b) for b in cls.__bases__] + [list(cls.__bases__)]
    result = [cls]
    while True:
        seqs = [s for s in seqs if s]
        if not seqs:
            return result
        for seq in seqs:
            head = seq[0]
            if not any(head in s[1:] for s in seqs):   # head not in any tail
                break
        else:
            raise TypeError("inconsistent hierarchy")
        result.append(head)
        for s in seqs:
            if s[0] is head:
                del s[0]

class O: pass
class A(O): pass
class B(O): pass
class C(O): pass
class D(A, B): pass
class E(B, C): pass
class F(D, E): pass
class X: pass
class Y(X): pass
class Diamond(A, B): pass

for k in [F, E, Diamond, Y, bool, dict]:
    assert c3_mro(k) == list(k.__mro__), k
print(" -> ".join(c.__name__ for c in c3_mro(F)))

class Fake:                         # an impossible hierarchy, described manually
    __bases__ = (X, Y)
try:
    c3_mro(Fake)
except TypeError as e:
    print("TypeError:", e)
```
:::explain
The MRO is the class followed by a **merge** of its bases' MROs plus the list of bases itself. At each step, pick the first head that doesn't appear in any list's **tail** (which would mean some class still needs to come before it). Remove it from every list and repeat. If no head qualifies, the constraints contradict each other. The `Fake` class tricks the function with a hand-made `__bases__`, because Python itself refuses to create `class Z(X, Y)` when `Y` subclasses `X`.
:::end

:::problem hard | Diamond with state: diagnose double initialization | cooperative init
A `Connection` base opens a resource in `__init__` (and counts opens). `Encrypted(Connection)` and `Compressed(Connection)` each call `Connection.__init__(self)` **explicitly**, so `SecureFast(Encrypted, Compressed)` opens the connection twice. Prove it, then rewrite all classes cooperatively so it opens once, while still passing each class its own keyword options.
:::solution
```python
class Connection:
    opens = 0
    def __init__(self, host="localhost", **kwargs):
        super().__init__(**kwargs)
        Connection.opens += 1
        self.host = host

class Encrypted(Connection):
    def __init__(self, cipher="aes", **kwargs):
        super().__init__(**kwargs)
        self.cipher = cipher

class Compressed(Connection):
    def __init__(self, level=6, **kwargs):
        super().__init__(**kwargs)
        self.level = level

class SecureFast(Encrypted, Compressed):
    pass

# --- the buggy version, for comparison ---
class BadEnc(Connection):
    def __init__(self):
        Connection.__init__(self)
class BadComp(Connection):
    def __init__(self):
        Connection.__init__(self)
class BadBoth(BadEnc, BadComp):
    def __init__(self):
        BadEnc.__init__(self)
        BadComp.__init__(self)

Connection.opens = 0
BadBoth()
print("buggy opens:", Connection.opens)

Connection.opens = 0
s = SecureFast(host="db.local", cipher="chacha20", level=9)
print("cooperative opens:", Connection.opens, vars(s))
print([k.__name__ for k in SecureFast.__mro__])
```
:::explain
Explicit parent calls ignore the MRO: both branches run `Connection.__init__`, which in real code would leak a socket. Cooperative `super()` walks the single MRO `SecureFast → Encrypted → Compressed → Connection`, so each `__init__` runs **once**. Each class pops its own keyword (`cipher`, `level`, `host`) and forwards the rest. The chain ends at `object.__init__()` with no arguments left. This "consume your kwargs, forward the rest" rule is the key to making multiple inheritance safe.
:::end
