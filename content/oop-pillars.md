# The Four Pillars of OOP

Every OOP interview eventually asks: *"Explain the four pillars."* They are **Encapsulation**, **Inheritance**, **Polymorphism** and **Abstraction**. This chapter explains each in plain English, then in precise terms, then **the Python way**. Python does several of them differently from Java and C++.

:::analogy A car
- **Encapsulation**: the engine is under the hood. You use the pedals, you don't rewire spark plugs.
- **Abstraction**: "a car can `drive()`" is all a driver needs to know. Petrol, diesel or electric is hidden.
- **Inheritance**: an `ElectricCar` *is a* `Car`, with everything a car has plus a battery.
- **Polymorphism**: you press the same accelerator in any car, and each one makes it go *its own way*.
:::

## 1. Encapsulation

**Plain:** keep an object's data and the code that protects it together, and hide the internals.
**Precise:** bundling state with the methods that maintain its **invariants**, exposing a small **public interface** and hiding implementation details.

Python has **no private keyword**. It uses **conventions** and one mechanism:

| Name | Meaning | Enforced? |
|---|---|---|
| `balance` | public API | — |
| `_balance` | internal: "please don't touch" | convention only (linters warn) |
| `__balance` | **name-mangled** to `_ClassName__balance` | avoids clashes in subclasses; still reachable |

```python
class Account:
    def __init__(self, owner, balance):
        self.owner = owner            # public
        self._balance = balance       # internal by convention
        self.__pin = "1234"           # name-mangled

    @property
    def balance(self):                # read-only public view
        return self._balance

    def deposit(self, amount):        # the ONLY sanctioned way to change the balance
        if amount <= 0:
            raise ValueError("amount must be positive")
        self._balance += amount

    def check_pin(self, pin):
        return pin == self.__pin

acc = Account("Ada", 100)
acc.deposit(50)
print(acc.balance, acc.check_pin("1234"))
print(acc.__dict__)                   # see the mangled name: _Account__pin
print(acc._Account__pin)              # "private" is not secret, just namespaced
```

:::term Name mangling
Inside a class body, any identifier `__name` (two leading underscores, at most one trailing) is rewritten to `_ClassName__name`. Its purpose is to **avoid accidental overrides in subclasses**, not security. A subclass defining its own `__pin` won't clobber the parent's.
:::

:::boss "We're all consenting adults here"
Python's philosophy: signal intent with `_underscore` and trust developers. Use properties to validate, use `_` for internals, and reserve `__` for attributes in classes designed to be subclassed where clashes are likely.
:::

## 2. Inheritance

**Plain:** make a new class from an existing one, reusing its code and adding or changing bits.
**Precise:** a subclass delegates attribute lookup to its base classes, modelling an **is-a** relationship.

```python
class Animal:
    def __init__(self, name):
        self.name = name
    def speak(self):
        return "..."
    def intro(self):
        return f"I am {self.name} and I say {self.speak()}"   # calls the OVERRIDDEN version!

class Dog(Animal):                       # Dog IS-A Animal
    def speak(self):                     # method overriding
        return "woof"

class Puppy(Dog):
    def __init__(self, name, age_weeks):
        super().__init__(name)           # reuse the parent's initialiser
        self.age_weeks = age_weeks
    def speak(self):
        return super().speak() + " (squeaky)"   # extend, don't replace

for a in [Animal("generic"), Dog("Rex"), Puppy("Bit", 8)]:
    print(a.intro())
print(issubclass(Puppy, Animal), isinstance(Puppy("x", 1), Dog))
print([c.__name__ for c in Puppy.__mro__])
```

:::tip The template-method effect
`Animal.intro` calls `self.speak()`. Because lookup starts at the **instance's class**, the subclass's override runs. Base classes can define an algorithm's skeleton and let subclasses fill in the steps.
:::

`super()`, multiple inheritance and MRO have their own chapter next.

## 3. Polymorphism

**Plain:** the same operation works on different types, each doing the right thing.
**Precise:** code depends on an **interface** (a set of methods), and any object implementing it can be used. In Python that's mostly **duck typing**.

```python
class Circle:
    def __init__(self, r): self.r = r
    def area(self): return 3.14159 * self.r ** 2

class Square:
    def __init__(self, s): self.s = s
    def area(self): return self.s ** 2

class Triangle:
    def __init__(self, b, h): self.b, self.h = b, h
    def area(self): return 0.5 * self.b * self.h

shapes = [Circle(1), Square(2), Triangle(3, 4)]
print([round(s.area(), 2) for s in shapes])      # one call, three behaviours
print(round(sum(s.area() for s in shapes), 2))
```

`Circle`, `Square` and `Triangle` share **no base class**, yet they're polymorphic because they all have `.area()`. That's **duck typing**: *"if it walks like a duck and quacks like a duck…"*.

Built-in polymorphism is everywhere:

```python
print(len("abc"), len([1, 2]), len({"a": 1}))    # len works on anything with __len__
print(1 + 2, "a" + "b", [1] + [2])               # + dispatches on type (operator overloading)
for thing in ["ab", (1, 2), {3: 4}, range(2)]:   # for works on any iterable
    print(list(thing))
```

| Kind | How in Python |
|---|---|
| **Subtype** polymorphism | overriding methods in subclasses |
| **Duck typing** | any object with the right methods |
| **Operator overloading** | dunder methods (`__add__`, `__len__`, …) |
| **Ad-hoc / overloading by type** | `functools.singledispatch` (Python has no method overloading by signature) |
| **Parametric** (generics) | type hints like `list[T]` (checked by tools only) |

```python
from functools import singledispatch

@singledispatch
def describe(x):
    return f"something: {x!r}"

@describe.register
def _(x: int):
    return f"an int, doubled = {x * 2}"

@describe.register
def _(x: list):
    return f"a list of {len(x)} items"

print(describe(21), describe([1, 2, 3]), describe("hi"), sep=" | ")
```

## 4. Abstraction

**Plain:** show *what* something does and hide *how*. Define a contract that others must fulfil.
**Precise:** an **abstract base class (ABC)** declares methods subclasses **must** implement, and it can't be instantiated itself.

```python
from abc import ABC, abstractmethod

class PaymentMethod(ABC):
    @abstractmethod
    def pay(self, amount):            # the contract
        ...

    def receipt(self, amount):        # concrete shared behaviour
        return f"Paid {amount:.2f} via {type(self).__name__}: {self.pay(amount)}"

class Card(PaymentMethod):
    def __init__(self, last4): self.last4 = last4
    def pay(self, amount): return f"charged card ****{self.last4}"

class Wallet(PaymentMethod):
    def pay(self, amount): return "debited wallet"

for m in [Card("4242"), Wallet()]:
    print(m.receipt(19.99))

try:
    PaymentMethod()
except TypeError as e:
    print("TypeError:", e)

class Broken(PaymentMethod):
    pass                              # forgot pay()
try:
    Broken()
except TypeError as e:
    print("TypeError:", e)
```

:::deep ABCs vs duck typing vs Protocols
- **Duck typing**: no declaration needed. Errors appear only at call time.
- **ABC**: explicit inheritance, and an error **at instantiation** if methods are missing. You can also `register` existing classes as virtual subclasses.
- **`typing.Protocol`** (in *Modern OOP*): structural "duck typing" that **static type checkers** verify, with no inheritance needed.

The standard library's `collections.abc` (`Iterable`, `Sequence`, `Mapping`, …) are ABCs. Inherit from them to get many methods for free.
:::

```python
from collections.abc import Sequence

class Countdown(Sequence):             # implement 2 methods, get many for free
    def __init__(self, n): self.n = n
    def __len__(self): return self.n
    def __getitem__(self, i):
        if not 0 <= i < self.n:
            raise IndexError(i)
        return self.n - i

c = Countdown(5)
print(list(c), 3 in c, c.index(2), c.count(1), list(reversed(c)))
```

## 5. Composition over inheritance

Inheritance is powerful but couples classes tightly. Many designs are better as **composition** ("has-a"): an object holds other objects and delegates to them.

```python
class Engine:
    def start(self): return "vroom"

class ElectricMotor:
    def start(self): return "hum"

class Car:
    def __init__(self, engine):        # HAS-A engine: swappable at run time
        self.engine = engine
    def start(self):
        return f"Car starts: {self.engine.start()}"

print(Car(Engine()).start(), "|", Car(ElectricMotor()).start())
```

:::tip When to inherit vs compose
Inherit when the subclass **truly is** a specialised version and honours the parent's contract (the **Liskov Substitution Principle**: anywhere a `Base` works, a `Sub` must work too). Compose when you just want to **reuse behaviour** or swap parts. Classic smell: `class Stack(list)`, which exposes `insert`, `sort` and `__setitem__`, so it breaks the stack abstraction.
:::

## SOLID in one table

| Principle | Meaning | Python flavour |
|---|---|---|
| **S**ingle responsibility | one reason to change per class | small classes and functions |
| **O**pen/closed | extend without modifying | new subclasses, registries, strategies |
| **L**iskov substitution | subtypes are usable wherever the base is | don't strengthen preconditions in overrides |
| **I**nterface segregation | small, focused interfaces | many small Protocols/ABCs |
| **D**ependency inversion | depend on abstractions | pass collaborators in (`Car(engine)`) |

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Thinking `__x` is secure | it's only name mangling |
| 2 | Overriding without calling `super()` when the parent needs setup | `super().__init__(...)` |
| 3 | Deep inheritance trees | prefer composition |
| 4 | Subclass breaks the parent's contract (LSP violation) | keep behaviour substitutable |
| 5 | Inheriting from `list`/`dict` for a restricted structure | wrap one instead (composition) |
| 6 | Abstract methods without `ABC` as the base | inherit `ABC` (or use `ABCMeta`) |
| 7 | `isinstance` checks everywhere instead of polymorphism | move behaviour into methods |
| 8 | Java-style getters/setters | properties |
| 9 | Forgetting that a base method calling `self.x()` uses the override | design hooks deliberately |
| 10 | Overloading by signature (doesn't exist) | defaults, `*args`, `singledispatch` |

## Practice problems

:::problem basic | Employee payroll polymorphism | inheritance, overriding
Create `Employee(name, base)` with `pay()` returning `base`. Then `Manager` (pay = base + 20% bonus) and `Intern` (pay = half base). Compute total payroll for a mixed list with one loop and no `isinstance`.
:::solution
```python
class Employee:
    def __init__(self, name, base):
        self.name, self.base = name, base
    def pay(self):
        return self.base
    def __repr__(self):
        return f"{type(self).__name__}({self.name}: {self.pay():.0f})"

class Manager(Employee):
    def pay(self):
        return super().pay() * 1.2

class Intern(Employee):
    def pay(self):
        return self.base / 2

staff = [Employee("ada", 5000), Manager("bob", 7000), Intern("cy", 3000)]
print(staff, sum(e.pay() for e in staff))
```
:::explain
The loop calls `e.pay()` without knowing the concrete type: **polymorphism**. Adding a `Contractor` tomorrow needs **no change** to the loop (the open/closed principle). `super().pay()` reuses the parent's logic, so if the base calculation changes, managers follow automatically.
:::end

:::problem basic | Encapsulated thermostat | properties, invariants
Build `Thermostat` with a `target` property clamped to 10–30 °C (out-of-range values are clamped, not rejected), and methods `up()`/`down()` that change the target by 0.5. The internal value must never leave the range.
:::solution
```python
class Thermostat:
    MIN, MAX = 10.0, 30.0
    def __init__(self, target=20.0):
        self.target = target
    @property
    def target(self):
        return self._target
    @target.setter
    def target(self, value):
        self._target = max(self.MIN, min(float(value), self.MAX))
    def up(self):
        self.target += 0.5
    def down(self):
        self.target -= 0.5

t = Thermostat(29.8)
t.up(); t.up()
print(t.target)
t.target = -5
print(t.target)
```
:::explain
All writes, including `self.target += 0.5` inside `up`, go through the setter, so the **invariant** "10 ≤ target ≤ 30" can't be broken from anywhere. That's encapsulation done the Python way: a public attribute-like API with the guard rails hidden.
:::end

:::problem basic | Duck-typed file-likes | duck typing
Write `count_lines(f)` that works with **any** object having a `readline()` method returning `""` at the end: a real file, `io.StringIO`, and your own `FakeFile` class. Don't check types.
:::solution
```python
import io

class FakeFile:
    def __init__(self, lines):
        self.lines = list(lines)
    def readline(self):
        return self.lines.pop(0) + "\n" if self.lines else ""

def count_lines(f):
    n = 0
    while f.readline():
        n += 1
    return n

with open("tmp.txt", "w") as fh:
    fh.write("a\nb\nc\n")
with open("tmp.txt") as fh:
    print(count_lines(fh), count_lines(io.StringIO("x\ny\n")), count_lines(FakeFile(["1", "2", "3", "4"])))
```
:::explain
`count_lines` depends only on the **behaviour** `readline()`, not on a type. That's why mocking in Python tests is so easy: anything that quacks right will do. A type checker can express this contract with a `Protocol` (see *Modern OOP*).
:::end

:::problem medium | Shape hierarchy with an ABC | abstraction, abstractmethod
Define an abstract `Shape` with abstract `area()` and `perimeter()`, and a concrete `describe()` that uses both. Implement `Circle`, `Rectangle` and `Square(Rectangle)`. Sort a list of shapes by area and print the descriptions.
:::solution
```python
from abc import ABC, abstractmethod
import math

class Shape(ABC):
    @abstractmethod
    def area(self): ...
    @abstractmethod
    def perimeter(self): ...
    def describe(self):
        return f"{type(self).__name__}: area={self.area():.2f}, perimeter={self.perimeter():.2f}"

class Circle(Shape):
    def __init__(self, r): self.r = r
    def area(self): return math.pi * self.r ** 2
    def perimeter(self): return 2 * math.pi * self.r

class Rectangle(Shape):
    def __init__(self, w, h): self.w, self.h = w, h
    def area(self): return self.w * self.h
    def perimeter(self): return 2 * (self.w + self.h)

class Square(Rectangle):
    def __init__(self, s): super().__init__(s, s)

for s in sorted([Circle(1), Rectangle(2, 5), Square(3)], key=lambda s: s.area()):
    print(s.describe())
```
:::explain
`Shape` can't be instantiated and forces subclasses to provide the full contract. `describe()` is written **once**, against the abstract interface (a template method). `Square` reuses `Rectangle` entirely by passing `s` twice to its initialiser. Note that a *mutable* square-as-rectangle can violate Liskov (`set_width` on a Square), which is a classic discussion question.
:::end

:::problem medium | Notification system: composition vs inheritance | composition, strategy
Design `Notifier` that sends a message through a pluggable channel (`EmailChannel`, `SMSChannel`, `SlackChannel`, each with `send(to, msg)`), plus optional **decorating** channels: `RetryChannel(inner, times)` and `LoggingChannel(inner)` that wrap another channel. Show stacking them.
:::solution
```python
class EmailChannel:
    def send(self, to, msg):
        return f"email to {to}: {msg}"

class SMSChannel:
    def send(self, to, msg):
        return f"sms to {to}: {msg[:20]}"

class FlakyChannel:
    def __init__(self): self.calls = 0
    def send(self, to, msg):
        self.calls += 1
        if self.calls < 3:
            raise ConnectionError("network down")
        return f"flaky delivered to {to} on try {self.calls}"

class RetryChannel:
    def __init__(self, inner, times=3):
        self.inner, self.times = inner, times
    def send(self, to, msg):
        for attempt in range(1, self.times + 1):
            try:
                return self.inner.send(to, msg)
            except ConnectionError:
                if attempt == self.times:
                    raise

class LoggingChannel:
    def __init__(self, inner, log):
        self.inner, self.log = inner, log
    def send(self, to, msg):
        result = self.inner.send(to, msg)
        self.log.append(result)
        return result

class Notifier:
    def __init__(self, channel):
        self.channel = channel
    def notify(self, users, msg):
        return [self.channel.send(u, msg) for u in users]

log = []
n = Notifier(LoggingChannel(RetryChannel(FlakyChannel(), times=5), log))
print(n.notify(["ada"], "Your order shipped!"))
print(Notifier(SMSChannel()).notify(["bob", "cy"], "Flash sale: 50% off everything today"))
print(log)
```
:::explain
Each channel has the same tiny interface (`send`), so they're interchangeable (**polymorphism via duck typing**). Wrappers that *have* an inner channel add behaviour without subclassing, which is the **Decorator pattern** built from composition. With inheritance you'd need `RetryLoggingEmailChannel`, `RetrySMSChannel`… a combinatorial explosion. Composition lets you mix and match at run time.
:::end

:::problem medium | Name mangling in practice | __private, subclass safety
Show a bug where a subclass accidentally overwrites a parent's internal counter, `_count`, breaking it. Then fix it with name mangling (`__count`) and print both classes' `__dict__` to show the two separate attributes.
:::solution
```python
class Tracker:
    def __init__(self):
        self._count = 0
    def hit(self):
        self._count += 1
        return self._count

class BadSub(Tracker):
    def __init__(self):
        super().__init__()
        self._count = "metrics"          # clobbers the parent's counter!

try:
    BadSub().hit()
except TypeError as e:
    print("bug:", e)

class SafeTracker:
    def __init__(self):
        self.__count = 0                 # becomes _SafeTracker__count
    def hit(self):
        self.__count += 1
        return self.__count

class GoodSub(SafeTracker):
    def __init__(self):
        super().__init__()
        self.__count = "metrics"         # becomes _GoodSub__count: no clash

g = GoodSub()
print(g.hit(), g.hit(), vars(g))
```
:::explain
With one underscore, the parent and child share the attribute name, and the child silently breaks the parent's logic. Two underscores make each class's attribute name unique (`_SafeTracker__count` vs `_GoodSub__count`). That's exactly what name mangling is for: **preventing accidental clashes in inheritance hierarchies**, not hiding data.
:::end

:::problem hard | Plugin-based exporter with ABC registration | abstraction, registry, polymorphism
Create an abstract `Exporter` with an abstract `export(rows) -> str` and a class attribute `fmt`. Subclasses **auto-register** themselves by `fmt` using `__init_subclass__`. Implement CSV, JSON and Markdown-table exporters. `Exporter.for_format("md")` returns an instance, and unknown formats raise `ValueError` listing the available ones.
:::solution
```python
from abc import ABC, abstractmethod
import json

class Exporter(ABC):
    registry = {}
    fmt = None

    def __init_subclass__(cls, **kwargs):          # runs when a subclass is CREATED
        super().__init_subclass__(**kwargs)
        if cls.fmt:
            Exporter.registry[cls.fmt] = cls

    @abstractmethod
    def export(self, rows): ...

    @classmethod
    def for_format(cls, fmt):
        try:
            return cls.registry[fmt]()
        except KeyError:
            raise ValueError(f"unknown format {fmt!r}; available: {sorted(cls.registry)}") from None

class CSVExporter(Exporter):
    fmt = "csv"
    def export(self, rows):
        cols = list(rows[0])
        return "\n".join([",".join(cols)] + [",".join(str(r[c]) for c in cols) for r in rows])

class JSONExporter(Exporter):
    fmt = "json"
    def export(self, rows):
        return json.dumps(rows)

class MarkdownExporter(Exporter):
    fmt = "md"
    def export(self, rows):
        cols = list(rows[0])
        lines = ["| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)]
        lines += ["| " + " | ".join(str(r[c]) for c in cols) + " |" for r in rows]
        return "\n".join(lines)

rows = [{"name": "ada", "score": 9}, {"name": "bob", "score": 7}]
for f in ["csv", "md", "json"]:
    print(Exporter.for_format(f).export(rows), end="\n\n")
try:
    Exporter.for_format("xml")
except ValueError as e:
    print(e)
```
:::explain
`__init_subclass__` is a hook Python calls on the **parent** whenever a subclass is defined, which makes it perfect for auto-registration with no decorators or manual lists. The ABC guarantees every registered exporter really implements `export`. The client code (`for_format(...).export(rows)`) depends only on the abstraction (**dependency inversion**), and adding XML is a new class with **zero edits** elsewhere (**open/closed**).
:::end

:::problem hard | Liskov violation detector | LSP, contracts, tests
Write a reusable "contract test" `check_stack_contract(cls)` that verifies any stack implementation obeys LIFO semantics, `len`, and raising `IndexError` on popping when empty. Implement a correct `ListStack` (composition) and a buggy `QueueAsStack` (which returns FIFO), and show the contract test catching the bug.
:::solution
```python
import random

class ListStack:
    def __init__(self): self._items = []
    def push(self, x): self._items.append(x)
    def pop(self):
        if not self._items:
            raise IndexError("pop from empty stack")
        return self._items.pop()
    def __len__(self): return len(self._items)

class QueueAsStack(ListStack):
    def pop(self):                                  # violates the LIFO contract
        if not self._items:
            raise IndexError("empty")
        return self._items.pop(0)

def check_stack_contract(cls, trials=200):
    s, model = cls(), []
    for _ in range(trials):
        if model and random.random() < 0.4:
            got, want = s.pop(), model.pop()
            if got != want:
                return f"{cls.__name__}: LIFO broken (got {got}, want {want})"
        else:
            x = random.randint(0, 99)
            s.push(x); model.append(x)
        if len(s) != len(model):
            return f"{cls.__name__}: len mismatch"
    while model:
        s.pop(); model.pop()
    try:
        s.pop()
        return f"{cls.__name__}: no IndexError on empty pop"
    except IndexError:
        return f"{cls.__name__}: OK"

random.seed(1)
print(check_stack_contract(ListStack))
print(check_stack_contract(QueueAsStack))
```
:::explain
**Liskov substitution** says a subtype must keep the base type's behavioural promises, not just its method names. `QueueAsStack` *is* a subclass with the right methods, but `pop` breaks LIFO, so any code expecting a stack misbehaves. The contract test compares the implementation against a trusted **model** (a plain list) under random operations, a lightweight form of **model-based / property-based testing**. Run the same suite against every implementation of an interface.
:::end

:::problem hard | Shape-area dispatch three ways | polymorphism styles
Compute the area of `{"type": "circle", "r": 1}`-style dicts and of `Circle`/`Rect` objects using three approaches: (1) an `if/elif` chain, (2) a dispatch dict, (3) `functools.singledispatch` on classes. Discuss which one is open for extension.
:::solution
```python
import math
from functools import singledispatch

shapes_dicts = [{"type": "circle", "r": 1}, {"type": "rect", "w": 2, "h": 3}]

def area_if(s):                                        # 1: closed, must edit to extend
    if s["type"] == "circle":
        return math.pi * s["r"] ** 2
    elif s["type"] == "rect":
        return s["w"] * s["h"]
    raise ValueError(s["type"])

AREA = {                                               # 2: extend by adding an entry
    "circle": lambda s: math.pi * s["r"] ** 2,
    "rect": lambda s: s["w"] * s["h"],
}

class Circle:
    def __init__(self, r): self.r = r
class Rect:
    def __init__(self, w, h): self.w, self.h = w, h

@singledispatch                                        # 3: extend by registering a type
def area(shape):
    raise TypeError(f"no area for {type(shape).__name__}")
@area.register
def _(c: Circle): return math.pi * c.r ** 2
@area.register
def _(r: Rect): return r.w * r.h

print([round(area_if(s), 2) for s in shapes_dicts])
print([round(AREA[s["type"]](s), 2) for s in shapes_dicts])
print([round(area(s), 2) for s in [Circle(1), Rect(2, 3)]])
AREA["square"] = lambda s: s["side"] ** 2              # extension without editing old code
print(AREA["square"]({"type": "square", "side": 4}))
```
:::explain
The `if/elif` chain must be **edited** for every new shape (closed for extension). The dispatch dict and `singledispatch` are **open**: new behaviour is registered from anywhere, even another module. Methods on the classes (`shape.area()`) are the classic OOP answer. `singledispatch` is useful when you **can't** modify the classes (third-party types) or want to keep an operation's code together. Knowing these trade-offs is what "design" interviews probe.
:::end
