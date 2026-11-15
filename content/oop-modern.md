# Modern OOP: dataclasses, slots, Enum, typing

Modern Python (3.7–3.14) added tools that remove most OOP boilerplate. **`@dataclass`** writes `__init__`, `__repr__` and `__eq__` for you. **`__slots__`** shrinks memory. **`Enum`** replaces magic constants. **Type hints** and **`Protocol`** let tools catch bugs before run time. This is how professional Python code looks today.

:::analogy Pre-made cookie dough
Writing `__init__`, `__repr__`, `__eq__` and `__hash__` by hand is like making dough from scratch every time. `@dataclass` is quality pre-made dough: you list the ingredients (fields), and the baking (boilerplate) is done for you, exactly the same way, every time.
:::

## 1. `@dataclass`

```python
from dataclasses import dataclass, field

@dataclass
class Point:
    x: float
    y: float = 0.0                    # default value

p = Point(3, 4)
print(p, p == Point(3, 4), Point(1))  # __repr__ and __eq__ were generated
```

What `@dataclass` generates by default: `__init__`, `__repr__` and `__eq__`. Options:

| Option | Effect |
|---|---|
| `order=True` | `__lt__`, `__le__`, `__gt__`, `__ge__` comparing fields as a tuple |
| `frozen=True` | immutable (assignment raises `FrozenInstanceError`) + `__hash__` |
| `slots=True` (3.10+) | generates `__slots__`: less memory, faster attribute access |
| `kw_only=True` (3.10+) | all fields are keyword-only in `__init__` |
| `eq=False` | keep identity equality |

### Mutable defaults: use `field(default_factory=...)`

```python
from dataclasses import dataclass, field

@dataclass
class Team:
    name: str
    members: list[str] = field(default_factory=list)   # a NEW list per instance
    meta: dict = field(default_factory=dict, repr=False, compare=False)

a, b = Team("red"), Team("blue")
a.members.append("ada")
print(a, b)
```

```python error
from dataclasses import dataclass
@dataclass
class Bad:
    items: list = []        # ValueError: mutable default <class 'list'> for field items is not allowed
```

### `__post_init__`, `frozen`, `order`

```python
from dataclasses import dataclass, field, asdict, replace, astuple

@dataclass(frozen=True, order=True)
class Version:
    major: int
    minor: int = 0
    patch: int = 0
    label: str = field(default="", compare=False)    # ignored by ==, < and hash

    def __post_init__(self):                          # validation after the generated __init__
        if min(self.major, self.minor, self.patch) < 0:
            raise ValueError("negative version part")

    @classmethod
    def parse(cls, s):
        return cls(*map(int, s.split(".")))

vs = sorted([Version.parse("1.10.0"), Version(1, 2), Version(1, 2, 3, "beta")])
print(vs)
v = Version(2, 0)
print(asdict(v), astuple(v), replace(v, minor=1), {v, Version(2, 0, 0, "x")})
try:
    v.major = 3
except Exception as e:
    print(type(e).__name__, e)
```

:::tip Computed fields with `init=False`
```python
from dataclasses import dataclass, field

@dataclass
class Rect:
    w: float
    h: float
    area: float = field(init=False)
    def __post_init__(self):
        self.area = self.w * self.h

print(Rect(3, 4))
```
For a **frozen** dataclass, set computed fields with `object.__setattr__(self, "area", …)` inside `__post_init__`. Or prefer a `@property`, so the value can't go stale.
:::

## 2. `__slots__`: memory-lean objects

By default every instance carries a `__dict__` (a hash table) for its attributes. `__slots__` replaces it with fixed slots: **less memory**, slightly **faster** access, and typos raise `AttributeError`.

```python
import sys, tracemalloc

class WithDict:
    def __init__(self, x, y): self.x, self.y = x, y

class WithSlots:
    __slots__ = ("x", "y")
    def __init__(self, x, y): self.x, self.y = x, y

def measure(cls, n=100_000):
    tracemalloc.start()
    objs = [cls(i, i) for i in range(n)]
    size = tracemalloc.get_traced_memory()[0]
    tracemalloc.stop()
    return size / n

print(f"dict:  {measure(WithDict):.0f} bytes/object")
print(f"slots: {measure(WithSlots):.0f} bytes/object")
s = WithSlots(1, 2)
try:
    s.z = 3
except AttributeError as e:
    print("AttributeError:", e)
```

:::trap `__slots__` gotchas
No `__dict__` means no ad-hoc attributes, `cached_property` doesn't work, and every class in a hierarchy must declare `__slots__` (otherwise a subclass silently gets a `__dict__` again). Use slots for **many small objects**: points, nodes, records. `@dataclass(slots=True)` sets them up for you.
:::

## 3. `Enum`: named constants

```python
from enum import Enum, IntEnum, Flag, auto, StrEnum

class Color(Enum):
    RED = 1
    GREEN = 2
    BLUE = 3

print(Color.RED, Color.RED.name, Color.RED.value, Color(2), Color["BLUE"])
print([c.name for c in Color], Color.RED is Color(1), Color.RED == 1)

class Status(StrEnum):            # members ARE strings (3.11+)
    ACTIVE = auto()               # value "active"
    BANNED = auto()
print(Status.ACTIVE == "active", f"user is {Status.BANNED}")

class Perm(Flag):                  # combinable bit flags
    READ = auto()
    WRITE = auto()
    EXEC = auto()
rw = Perm.READ | Perm.WRITE
print(rw, Perm.WRITE in rw, Perm.EXEC in rw)
```

Enums work beautifully with `match`:

```python
from enum import Enum

class Light(Enum):
    RED = "stop"
    YELLOW = "slow"
    GREEN = "go"

def next_light(l):
    match l:
        case Light.RED: return Light.GREEN
        case Light.GREEN: return Light.YELLOW
        case Light.YELLOW: return Light.RED

l = Light.RED
for _ in range(4):
    print(l.name, "->", l.value)
    l = next_light(l)
```

:::tip Why enums beat strings and ints
`status == "actve"` (a typo) silently returns False forever. `Status.ACTVE` raises `AttributeError` immediately. Enums are also iterable, self-documenting, type-checkable, and stop invalid values (`Color(7)` raises `ValueError`).
:::

## 4. Type hints for classes

```python
from __future__ import annotations
from dataclasses import dataclass
from typing import ClassVar, Self

@dataclass
class Node:
    value: int
    next: Node | None = None              # forward reference to its own class
    count: ClassVar[int] = 0              # class attribute, NOT a dataclass field

    def append(self, value: int) -> Self: # Self (3.11+): "an instance of this class"
        tail = self
        while tail.next is not None:
            tail = tail.next
        tail.next = Node(value)
        return self

head = Node(1).append(2).append(3)
print(head)
```

| Hint | Meaning |
|---|---|
| `int`, `str`, `list[int]`, `dict[str, float]` | concrete types (lowercase generics since 3.9) |
| `X \| None` | optional (3.10+; older code uses `Optional[X]`) |
| `A \| B` | union |
| `Callable[[int, str], bool]` | function type |
| `Iterable[T]`, `Sequence[T]`, `Mapping[K, V]` | accept the *abstract* types in parameters |
| `Literal["r", "w"]` | specific values |
| `TypeVar` / `class Box[T]:` (3.12 syntax) | generics |
| `Self`, `ClassVar`, `Final` | class-specific hints |
| `TypedDict` | dict with known keys |

Hints are **not enforced** at run time. Tools like **mypy** and **pyright** (in VS Code) check them statically.

## 5. `Protocol`: static duck typing

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Drawable(Protocol):
    def draw(self) -> str: ...

class Circle:                          # no inheritance from Drawable!
    def draw(self) -> str:
        return "○"

class Text:
    def __init__(self, s): self.s = s
    def draw(self) -> str:
        return self.s

def render(items: list[Drawable]) -> str:
    return " ".join(i.draw() for i in items)

print(render([Circle(), Text("hi"), Circle()]))
print(isinstance(Circle(), Drawable), isinstance(42, Drawable))
```

A `Protocol` describes **what methods something must have**. Any class with those methods matches **structurally**, without inheriting. Type checkers verify it at analysis time, and `@runtime_checkable` allows `isinstance` checks (method names only, not signatures).

## 6. Generics (3.12 syntax)

```python
class Stack[T]:                         # PEP 695 generic class syntax (3.12+)
    def __init__(self) -> None:
        self._items: list[T] = []
    def push(self, item: T) -> None:
        self._items.append(item)
    def pop(self) -> T:
        return self._items.pop()
    def __len__(self) -> int:
        return len(self._items)

def first[T](xs: list[T]) -> T:          # generic function
    return xs[0]

s = Stack[int]()
s.push(1); s.push(2)
print(s.pop(), len(s), first(["a", "b"]))
```

## 7. Composition and `namedtuple`/`NamedTuple`

```python
from typing import NamedTuple

class Pixel(NamedTuple):              # an immutable, tuple-compatible record
    x: int
    y: int
    color: str = "black"

p = Pixel(3, 4)
x, y, c = p                            # still a tuple: unpackable
print(p, p.x, p._replace(color="red"), p._asdict())
```

| Need | Choose |
|---|---|
| A simple mutable record with methods | `@dataclass` |
| Immutable, hashable value object | `@dataclass(frozen=True)` or `NamedTuple` |
| Must behave like a tuple (unpack, index) | `NamedTuple` |
| Many millions of small objects | `@dataclass(slots=True)` |
| Just passing JSON-like data around | `dict` / `TypedDict` |
| Validation and parsing of external data | `pydantic` (third-party) |

## Tricks & tips

- `dataclasses.fields(obj)` lists the fields, which is handy for generic serialisers.
- `replace(obj, **changes)` is the idiomatic "copy with modifications" for frozen dataclasses.
- `@dataclass(eq=True, frozen=True)` makes instances usable as dict keys.
- Put `from __future__ import annotations` at the top of a module to use any hint without quotes (forward refs). 3.14 makes annotations lazy by default (PEP 649).
- `enum.auto()` assigns values automatically. `@enum.unique` forbids duplicate values.
- Prefer `Protocol` over ABC when you don't control the classes that should satisfy the interface.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Mutable default in a dataclass | `field(default_factory=list)` |
| 2 | Field without a default after one with a default | reorder, or `kw_only=True` |
| 3 | `frozen=True` but mutable field contents (a list) | use tuples/frozensets |
| 4 | Missing annotation → not a field | every field needs a type hint |
| 5 | `ClassVar` forgotten → becomes an instance field | annotate `ClassVar[...]` |
| 6 | Expecting type hints to be enforced | use mypy/pyright, or validate |
| 7 | `__slots__` in the child but not the base | slots on every class |
| 8 | Comparing an Enum to raw values (`Color.RED == 1` is False) | compare members, or use IntEnum/StrEnum |
| 9 | `order=True` comparing fields you didn't intend | `field(compare=False)` |
| 10 | Overusing dataclasses for behaviour-heavy classes | regular classes are fine |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
from dataclasses import dataclass, field
@dataclass
class Team:
    name: str
    members: list = field(default_factory=list)
a, b = Team("a"), Team("b")
a.members.append("x")
print(b.members, a == Team("a", ["x"]))
```
What prints?
- [x] `[] True`
- [ ] `['x'] True`
- [ ] `[] False`
`default_factory=list` calls `list()` **per instance**, so the two teams don't share a list. The generated `__eq__` compares the fields, so a new `Team` with the same values is equal.
:::

:::quiz
```python norun
from enum import Enum
class Color(Enum):
    RED = 1
    CRIMSON = 1
    BLUE = 2
print(Color.CRIMSON is Color.RED, len(Color), Color(1).name)
```
What prints?
- [x] `True 2 RED`
- [ ] `False 3 CRIMSON`
- [ ] `ValueError`
A second name with the same value becomes an **alias** of the first member, not a new member. Iteration and `len` skip aliases. Use `@enum.unique` to forbid them.
:::

:::quiz
```python norun
from dataclasses import dataclass
@dataclass(frozen=True)
class P:
    x: int
    y: int
s = {P(1, 2), P(1, 2)}
try:
    next(iter(s)).x = 5
except Exception as e:
    print(len(s), type(e).__name__)
```
What prints?
- [ ] `2 AttributeError`
- [x] `1 FrozenInstanceError`
- [ ] `1 TypeError`
`frozen=True` generates `__hash__` from the fields, so equal points collapse to one set element. Assignment raises `dataclasses.FrozenInstanceError`, which keeps hashed objects safe from mutation.
:::

## Practice problems

:::problem basic | Inventory item dataclass | @dataclass, default_factory, methods
Create a dataclass `Item(name, price, qty=0, tags=[])` done **correctly**, with a `total` property and validation in `__post_init__` (price ≥ 0, qty ≥ 0). Show that two items' tag lists are independent.
:::solution
```python
from dataclasses import dataclass, field

@dataclass
class Item:
    name: str
    price: float
    qty: int = 0
    tags: list[str] = field(default_factory=list)

    def __post_init__(self):
        if self.price < 0 or self.qty < 0:
            raise ValueError("price and qty must be non-negative")

    @property
    def total(self) -> float:
        return self.price * self.qty

a, b = Item("pen", 1.5, 10), Item("cup", 4.0)
a.tags.append("office")
print(a, b, a.total, sep="\n")
try:
    Item("bad", -1)
except ValueError as e:
    print("ValueError:", e)
```
:::explain
`default_factory=list` calls `list()` **per instance**, which is the dataclass answer to the mutable-default trap. `__post_init__` runs right after the generated `__init__`, so validation happens at creation. The property isn't a field, so it's excluded from `__init__`/`__repr__` and always up to date.
:::end

:::problem basic | Enum-driven state | Enum, match
Model a `TaskStatus` enum (TODO, DOING, DONE) and a `Task` dataclass with `advance()` that moves TODO→DOING→DONE and raises at DONE. Count tasks by status for a list of tasks.
:::solution
```python
from dataclasses import dataclass
from enum import Enum
from collections import Counter

class TaskStatus(Enum):
    TODO = "todo"
    DOING = "doing"
    DONE = "done"

@dataclass
class Task:
    title: str
    status: TaskStatus = TaskStatus.TODO
    def advance(self):
        match self.status:
            case TaskStatus.TODO: self.status = TaskStatus.DOING
            case TaskStatus.DOING: self.status = TaskStatus.DONE
            case TaskStatus.DONE: raise ValueError(f"{self.title!r} is already done")

tasks = [Task("write"), Task("test"), Task("ship")]
tasks[0].advance(); tasks[0].advance(); tasks[1].advance()
print(Counter(t.status.name for t in tasks))
try:
    tasks[0].advance()
except ValueError as e:
    print(e)
```
:::explain
The enum makes invalid states impossible (`status = "doen"` can't happen silently). `match` on dotted names (`TaskStatus.TODO`) compares values. Remember that a **bare** name in a `case` would *capture* instead of compare.
:::end

:::problem basic | Frozen value object as dict key | frozen dataclass, hashing
Use a frozen dataclass `Coord(row, col)` as dict keys to store a sparse grid, and write `neighbors(c)` returning the 4 adjacent coords. Count the cells in `{(0,0), (0,1), (1,1)}` that have at least 2 filled neighbours.
:::solution
```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Coord:
    row: int
    col: int
    def neighbors(self):
        return [Coord(self.row + dr, self.col + dc) for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1))]

filled = {Coord(0, 0): "A", Coord(0, 1): "B", Coord(1, 1): "C"}
crowded = [c for c in filled if sum(n in filled for n in c.neighbors()) >= 2]
print(crowded)
print(Coord(0, 1) in filled, hash(Coord(2, 3)) == hash(Coord(2, 3)))
```
:::explain
`frozen=True` + `eq=True` makes dataclass generate `__hash__` from the fields, so equal coords hash equally and can be dict keys or set members. A non-frozen dataclass sets `__hash__ = None`, because mutating a key would corrupt the dict.
:::end

:::problem medium | Slots memory benchmark | __slots__, dataclass(slots=True)
Compare the memory of 200,000 instances of: a plain class, a `@dataclass`, a `@dataclass(slots=True)`, a `NamedTuple`, and a tuple, all with 3 int fields. Print bytes per object, sorted.
:::solution
```python
import tracemalloc
from dataclasses import dataclass
from typing import NamedTuple

class Plain:
    def __init__(self, a, b, c): self.a, self.b, self.c = a, b, c

@dataclass
class DC:
    a: int; b: int; c: int

@dataclass(slots=True)
class DCSlots:
    a: int; b: int; c: int

class NT(NamedTuple):
    a: int; b: int; c: int

def per_object(factory, n=200_000):
    tracemalloc.start()
    objs = [factory(i, i + 1, i + 2) for i in range(n)]
    used = tracemalloc.get_traced_memory()[0]
    tracemalloc.stop()
    return used / n

results = {name: per_object(f) for name, f in
           [("plain class", Plain), ("dataclass", DC), ("dataclass slots", DCSlots),
            ("NamedTuple", NT), ("tuple", lambda a, b, c: (a, b, c))]}
for name, size in sorted(results.items(), key=lambda kv: kv[1]):
    print(f"{name:16} {size:6.1f} bytes/object")
```
:::explain
Plain classes and regular dataclasses carry a per-instance `__dict__`. CPython's key-sharing dicts help, but there's still overhead. Slotted classes and tuples store attribute references in a fixed array. Exact numbers vary by Python version, but slots/tuples are reliably the smallest. The measurement includes the int objects themselves, which is why no row is tiny.
:::end

:::problem medium | Protocol-based plugin check | Protocol, runtime_checkable
Define a `Serializer` protocol with `dumps(obj) -> str` and `loads(s) -> object`. Implement `JSONSerializer` and `ReprSerializer` (using `repr`/`ast.literal_eval`) **without** inheriting from it. Write `roundtrip(ser, obj)` that verifies `loads(dumps(obj)) == obj`, and reject objects that don't satisfy the protocol.
:::solution
```python
import ast, json
from typing import Protocol, runtime_checkable

@runtime_checkable
class Serializer(Protocol):
    def dumps(self, obj: object) -> str: ...
    def loads(self, s: str) -> object: ...

class JSONSerializer:
    def dumps(self, obj): return json.dumps(obj)
    def loads(self, s): return json.loads(s)

class ReprSerializer:
    def dumps(self, obj): return repr(obj)
    def loads(self, s): return ast.literal_eval(s)

class NotASerializer:
    def dumps(self, obj): return str(obj)          # no loads()

def roundtrip(ser, obj):
    if not isinstance(ser, Serializer):
        raise TypeError(f"{type(ser).__name__} does not implement Serializer")
    return ser.loads(ser.dumps(obj)) == obj

data = {"a": [1, 2], "b": None}
print(roundtrip(JSONSerializer(), data), roundtrip(ReprSerializer(), data))
print(roundtrip(JSONSerializer(), {1: (2, 3)}), roundtrip(ReprSerializer(), {1: (2, 3)}))
try:
    roundtrip(NotASerializer(), data)
except TypeError as e:
    print(e)
```
:::explain
The protocol matches **structurally**: both serialisers qualify without any inheritance. The second line shows why round-trip tests matter: JSON turns int keys into strings and tuples into lists, so `{1: (2, 3)}` doesn't survive, while `repr`/`literal_eval` does. `isinstance` with a runtime-checkable protocol checks only that the methods **exist**, not their signatures. Static type checkers check the full signatures.
:::end

:::problem medium | Flag-based permissions | Flag enum, bitwise ops
Model permissions with `Flag`: READ, WRITE, DELETE, ADMIN = READ|WRITE|DELETE. Write `can(user_perms, needed)` and show combining, removing (`&~`) and listing a user's individual permissions.
:::solution
```python
from enum import Flag, auto

class Perm(Flag):
    READ = auto()
    WRITE = auto()
    DELETE = auto()
    ADMIN = READ | WRITE | DELETE

def can(user, needed):
    return needed in user               # all needed bits present

editor = Perm.READ | Perm.WRITE
print(can(editor, Perm.WRITE), can(editor, Perm.DELETE), can(Perm.ADMIN, Perm.READ | Perm.DELETE))
limited = Perm.ADMIN & ~Perm.DELETE     # remove one permission
print(limited, [p.name for p in limited], limited == editor)
print(Perm(3), Perm.READ.value, Perm.WRITE.value, Perm.DELETE.value)
```
:::explain
`auto()` gives powers of two (1, 2, 4), so each permission is one bit. `|` combines, `&` intersects, `~` complements (within the defined flags), and `in` tests for a subset of bits. Iterating a composite flag yields its individual members (3.11+). This is the same bitmask trick as Unix file permissions, but with readable names.
:::end

:::problem hard | Mini ORM with dataclasses | fields(), introspection, SQL generation
Write a decorator `@table("users")` for dataclasses that adds class methods `create_sql()` (mapping `int` → INTEGER, `str` → TEXT, `float` → REAL, with the first field as PRIMARY KEY) and instance methods `insert_sql()` (returning a parameterised query and its values). Use them with `sqlite3` to insert and read back rows as dataclass instances.
:::solution
```python
import sqlite3
from dataclasses import dataclass, fields, astuple

SQL_TYPES = {int: "INTEGER", str: "TEXT", float: "REAL"}

def table(name):
    def decorate(cls):
        cols = fields(cls)
        def create_sql(c):
            defs = [f"{f.name} {SQL_TYPES[f.type]}" + (" PRIMARY KEY" if i == 0 else "")
                    for i, f in enumerate(cols)]
            return f"CREATE TABLE {name} ({', '.join(defs)})"
        def insert_sql(self):
            ph = ", ".join("?" * len(cols))
            return f"INSERT INTO {name} VALUES ({ph})", astuple(self)
        def select_all(c, db):
            return [c(*row) for row in db.execute(f"SELECT * FROM {name}")]
        cls.create_sql = classmethod(create_sql)
        cls.insert_sql = insert_sql
        cls.select_all = classmethod(select_all)
        return cls
    return decorate

@table("users")
@dataclass
class User:
    id: int
    name: str
    score: float = 0.0

db = sqlite3.connect(":memory:")
print(User.create_sql())
db.execute(User.create_sql())
for u in [User(1, "ada", 9.5), User(2, "bob")]:
    db.execute(*u.insert_sql())
print(User.select_all(db))
```
:::explain
`dataclasses.fields(cls)` exposes each field's name and type, which is enough metadata to generate SQL. The decorator order matters: `@dataclass` must run first (it's closest to the class) so that the fields exist when `@table` inspects them. We attach methods to the class dynamically, wrapping functions with `classmethod(...)` by hand. Values always go through `?` placeholders (never string formatting), which prevents SQL injection. This is the seed of what SQLModel/SQLAlchemy do.
:::end

:::problem hard | Generic typed event queue | generics, Protocol, dataclass(order=True)
Build a generic priority queue `PQ[T]` (3.12 syntax) of dataclass `Job` entries ordered by `(priority, seq)`, where `seq` is an auto-incrementing tie-breaker so equal priorities stay FIFO, and the payload is excluded from comparison. Support `push(item, priority)`, `pop() -> T`, `peek()`, `__len__` and `__bool__`.
:::solution
```python
import heapq, itertools
from dataclasses import dataclass, field

@dataclass(order=True)
class Job[T]:
    priority: int
    seq: int
    payload: T = field(compare=False)

class PQ[T]:
    def __init__(self) -> None:
        self._heap: list[Job[T]] = []
        self._counter = itertools.count()
    def push(self, item: T, priority: int = 0) -> None:
        heapq.heappush(self._heap, Job(priority, next(self._counter), item))
    def pop(self) -> T:
        if not self._heap:
            raise IndexError("pop from empty PQ")
        return heapq.heappop(self._heap).payload
    def peek(self) -> T:
        return self._heap[0].payload
    def __len__(self) -> int:
        return len(self._heap)
    def __bool__(self) -> bool:
        return bool(self._heap)

q: PQ[dict] = PQ()
q.push({"task": "email"}, priority=2)
q.push({"task": "backup"}, priority=1)
q.push({"task": "report"}, priority=2)
q.push({"task": "alert"}, priority=0)
out = []
while q:
    out.append(q.pop()["task"])
print(out)
```
:::explain
`order=True` compares Jobs as tuples of their **compare** fields, `(priority, seq)`. The payload is marked `compare=False`, so dicts (which aren't orderable) are never compared, which would otherwise raise `TypeError` on ties. The monotonic `seq` guarantees FIFO order among equal priorities: `email` before `report`. The `[T]` syntax documents what the queue holds, and type checkers enforce `pop() -> T`. This is the pattern the `heapq` docs recommend for priority queues.
:::end

:::problem hard | Immutable config with validation and evolution | frozen dataclass, __post_init__, replace
Create a frozen `TrainConfig` (lr: float in (0, 1], batch: int a power of two, epochs: int ≥ 1, layers: tuple of ints) with a derived `steps_per_epoch(dataset_size)` method, `from_dict` that **rejects unknown keys**, and `with_overrides(**kw)` that returns a validated copy. Show that it's hashable (it can key an experiment cache).
:::solution
```python
from dataclasses import dataclass, fields, replace, asdict

@dataclass(frozen=True)
class TrainConfig:
    lr: float = 1e-3
    batch: int = 32
    epochs: int = 10
    layers: tuple[int, ...] = (64, 32)

    def __post_init__(self):
        if not 0 < self.lr <= 1:
            raise ValueError(f"lr must be in (0, 1], got {self.lr}")
        if self.batch <= 0 or self.batch & (self.batch - 1):
            raise ValueError(f"batch must be a power of two, got {self.batch}")
        if self.epochs < 1:
            raise ValueError("epochs must be >= 1")
        object.__setattr__(self, "layers", tuple(self.layers))   # normalise lists -> tuple

    @classmethod
    def from_dict(cls, d):
        allowed = {f.name for f in fields(cls)}
        unknown = set(d) - allowed
        if unknown:
            raise KeyError(f"unknown config keys: {sorted(unknown)}")
        return cls(**d)

    def with_overrides(self, **kw):
        return replace(self, **kw)            # replace() re-runs __init__ + __post_init__

    def steps_per_epoch(self, n):
        return -(-n // self.batch)            # ceiling division

base = TrainConfig.from_dict({"lr": 0.01, "layers": [128, 64, 10]})
fast = base.with_overrides(batch=128, epochs=3)
cache = {base: "run-1", fast: "run-2"}
print(fast, fast.steps_per_epoch(1000), cache[TrainConfig(0.01, 32, 10, (128, 64, 10))])
for bad in [lambda: base.with_overrides(batch=100), lambda: TrainConfig.from_dict({"lr": 0.1, "dropout": 0.5})]:
    try:
        bad()
    except (ValueError, KeyError) as e:
        print(type(e).__name__, e)
```
:::explain
Frozen dataclasses are **value objects**: immutable, hashable, and compared by value. That makes them perfect as cache keys for experiments. `__post_init__` validates every construction path, **including `replace()`**, which builds a fresh instance. Converting `layers` to a tuple keeps the object hashable even if a caller passes a list. In a frozen class, normal assignment is blocked, so `object.__setattr__` is the sanctioned escape hatch inside `__post_init__`.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Inventory with dataclasses | Real-world task
Create a dataclass `Item(name: str, price: float, qty: int = 0, tags: list = <independent per item>)` that validates `price >= 0` and `qty >= 0` in `__post_init__`, and has a `total` property. Then `Inventory` with `add(item)`, `value()` and `by_tag(tag)` returning sorted item names.
:::starter
```python norun
from dataclasses import dataclass, field

@dataclass
class Item:
    name: str
    price: float
    qty: int = 0
```
:::tests
```python norun
pen = Item("pen", 1.5, 10, ["office"])
mug = Item("mug", 8.0, 2, ["kitchen", "office"])
assert pen.total == 15.0 and Item("x", 1).tags == [] and Item("a", 1).tags is not Item("b", 1).tags
inv = Inventory()
inv.add(pen); inv.add(mug); inv.add(Item("pan", 20.0, 1, ["kitchen"]))
assert inv.value() == 51.0
assert inv.by_tag("office") == ["mug", "pen"] and inv.by_tag("garden") == []
assert raises(ValueError, Item, "bad", -1)
assert repr(Item("z", 1.0)) == "Item(name='z', price=1.0, qty=0, tags=[])"
```
:::solution
```python
from dataclasses import dataclass, field

@dataclass
class Item:
    name: str
    price: float
    qty: int = 0
    tags: list = field(default_factory=list)

    def __post_init__(self):
        if self.price < 0 or self.qty < 0:
            raise ValueError(f"invalid price/qty for {self.name!r}")

    @property
    def total(self) -> float:
        return self.price * self.qty

@dataclass
class Inventory:
    items: list = field(default_factory=list)
    def add(self, item: Item):
        self.items.append(item)
    def value(self) -> float:
        return sum(i.total for i in self.items)
    def by_tag(self, tag: str) -> list:
        return sorted(i.name for i in self.items if tag in i.tags)

inv = Inventory()
inv.add(Item("pen", 1.5, 10, ["office"])); inv.add(Item("mug", 8.0, 2, ["office"]))
print(inv.value(), inv.by_tag("office"), inv.items[0])
```
:::explain
`@dataclass` writes `__init__`, `__repr__` and `__eq__` from the annotated fields. `field(default_factory=list)` is the safe mutable default, and the third test proves every item gets its own list. `__post_init__` runs right after the generated `__init__`, so validation happens at creation. The property isn't a field, so it never goes stale.
:::complexity
O(n) for `value` and `by_tag`.
:::end

:::program medium | Order state machine with Enum | Real-world task
Model an order lifecycle with `Status(Enum)`: PENDING → PAID → SHIPPED → DELIVERED, and CANCELLED reachable from PENDING or PAID only. A dataclass `Order(id)` has `status` (starting PENDING), `history` (a list of statuses) and `advance(to: Status)`, which raises `ValueError` for illegal transitions. Use a **dict of allowed transitions**, not if-chains.
:::starter
```python norun
from enum import Enum, auto
from dataclasses import dataclass, field

class Status(Enum):
    pass
```
:::tests
```python norun
o = Order(1)
assert o.status is Status.PENDING
o.advance(Status.PAID); o.advance(Status.SHIPPED); o.advance(Status.DELIVERED)
assert o.history == [Status.PENDING, Status.PAID, Status.SHIPPED, Status.DELIVERED]
assert raises(ValueError, o.advance, Status.CANCELLED)
o2 = Order(2); o2.advance(Status.CANCELLED)
assert o2.status is Status.CANCELLED and raises(ValueError, o2.advance, Status.PAID)
assert "SHIPPED" in str(raises(ValueError, Order(3).advance, Status.SHIPPED))
assert Order(4).history == [Status.PENDING]
```
:::solution
```python
from enum import Enum, auto
from dataclasses import dataclass, field

class Status(Enum):
    PENDING = auto()
    PAID = auto()
    SHIPPED = auto()
    DELIVERED = auto()
    CANCELLED = auto()

ALLOWED = {
    Status.PENDING: {Status.PAID, Status.CANCELLED},
    Status.PAID: {Status.SHIPPED, Status.CANCELLED},
    Status.SHIPPED: {Status.DELIVERED},
    Status.DELIVERED: set(),
    Status.CANCELLED: set(),
}

@dataclass
class Order:
    id: int
    status: Status = Status.PENDING
    history: list = field(default_factory=list)

    def __post_init__(self):
        self.history.append(self.status)

    def advance(self, to: Status):
        if to not in ALLOWED[self.status]:
            raise ValueError(f"cannot go from {self.status.name} to {to.name}")
        self.status = to
        self.history.append(to)

o = Order(7)
o.advance(Status.PAID); o.advance(Status.SHIPPED)
print(o.status.name, [s.name for s in o.history])
```
:::explain
The **transition table** (a dict mapping a state to its allowed next states) is data, not code. Adding a RETURNED state is one line, and the rules are easy to audit at a glance. Enum members are unique singletons, so `is` comparisons are safe, and a typo like `Status.SHIPED` fails immediately with `AttributeError` instead of silently comparing unequal strings.
:::complexity
O(1) per transition.
:::end

:::program medium | Typed protocol plugin registry | Real-world task
Define a `runtime_checkable` `Protocol` called `Formatter` with `name: str` and `format(value) -> str`. Write `Registry` with `register(obj)`, which rejects objects not satisfying the protocol with `TypeError` (and duplicates by name with `ValueError`), and `render(value, name)`. Implement `UpperFormatter`, `MoneyFormatter` (`1234.5` → `"$1,234.50"`) and `JsonFormatter`, **without** inheriting from `Formatter`.
:::starter
```python norun
import json
from typing import Protocol, runtime_checkable

@runtime_checkable
class Formatter(Protocol):
    name: str
    def format(self, value) -> str: ...
```
:::tests
```python norun
r = Registry()
for f in (UpperFormatter(), MoneyFormatter(), JsonFormatter()): r.register(f)
assert r.render("hi", "upper") == "HI"
assert r.render(1234.5, "money") == "$1,234.50"
assert r.render({"b": 1, "a": [1, 2]}, "json") == '{"a": [1, 2], "b": 1}'
assert raises(TypeError, r.register, object())
assert raises(ValueError, r.register, UpperFormatter())
assert raises(KeyError, r.render, 1, "nope")
assert isinstance(MoneyFormatter(), Formatter) and not issubclass(MoneyFormatter, Registry)
```
:::solution
```python
import json
from typing import Protocol, runtime_checkable

@runtime_checkable
class Formatter(Protocol):
    name: str
    def format(self, value) -> str: ...

class UpperFormatter:
    name = "upper"
    def format(self, value) -> str:
        return str(value).upper()

class MoneyFormatter:
    name = "money"
    def format(self, value) -> str:
        return f"${value:,.2f}"

class JsonFormatter:
    name = "json"
    def format(self, value) -> str:
        return json.dumps(value, sort_keys=True)

class Registry:
    def __init__(self):
        self._by_name: dict[str, Formatter] = {}
    def register(self, obj: Formatter) -> None:
        if not isinstance(obj, Formatter):
            raise TypeError(f"{type(obj).__name__} does not implement Formatter")
        if obj.name in self._by_name:
            raise ValueError(f"duplicate formatter {obj.name!r}")
        self._by_name[obj.name] = obj
    def render(self, value, name: str) -> str:
        return self._by_name[name].format(value)

r = Registry()
for f in (UpperFormatter(), MoneyFormatter(), JsonFormatter()):
    r.register(f)
print(r.render(1234.5, "money"), r.render({"z": 1, "a": 2}, "json"))
```
:::explain
A `Protocol` describes a **shape** (attributes + methods). Classes satisfy it **structurally**, just by having those members, with no inheritance needed. `@runtime_checkable` enables `isinstance` checks at run time (it checks that the members exist, not their exact types), and static checkers like mypy verify signatures too. This is how plugin systems accept third-party classes they've never seen.
:::complexity
O(1) per register/render.
:::end

:::program hard | Priority job queue with dataclass ordering | Real-world task
Build `JobQueue` backed by `heapq` with jobs as `@dataclass(order=True)` objects ordered by `(priority, seq)`, where `seq` is an auto-increment tie-breaker so equal priorities are FIFO. The payload must be **excluded** from comparison (payloads may be unorderable dicts). Support `push(payload, priority)`, `pop()`, `peek()`, `__len__`, `cancel(job_id)` (lazy deletion), and `push` returning a job id.
:::starter
```python norun
import heapq, itertools
from dataclasses import dataclass, field

@dataclass(order=True)
class Job:
    pass
```
:::tests
```python norun
q = JobQueue()
a = q.push({"task": "email"}, priority=2)
b = q.push({"task": "backup"}, priority=1)
c = q.push({"task": "report"}, priority=2)
d = q.push({"task": "urgent"}, priority=0)
assert len(q) == 4 and q.peek()["task"] == "urgent"
q.cancel(b)
assert len(q) == 3
assert [q.pop()["task"] for _ in range(3)] == ["urgent", "email", "report"]
assert len(q) == 0 and raises(IndexError, q.pop)
assert raises(KeyError, q.cancel, 999)
```
:::hint
Keep a dict `job_id → Job` plus a `cancelled` flag on each Job. `cancel` only sets the flag. `pop`/`peek` discard cancelled jobs when they surface at the heap's top. Track the live count separately for `len`.
:::solution
```python
import heapq, itertools
from dataclasses import dataclass, field

@dataclass(order=True)
class Job:
    priority: int
    seq: int
    payload: object = field(compare=False)
    cancelled: bool = field(default=False, compare=False)

class JobQueue:
    def __init__(self):
        self._heap = []
        self._jobs = {}
        self._counter = itertools.count()
        self._live = 0

    def push(self, payload, priority=0):
        job = Job(priority, next(self._counter), payload)
        heapq.heappush(self._heap, job)
        self._jobs[job.seq] = job
        self._live += 1
        return job.seq

    def cancel(self, job_id):
        job = self._jobs.pop(job_id)           # KeyError for unknown/finished ids
        job.cancelled = True                   # lazy deletion: leave it in the heap
        self._live -= 1

    def _clean_top(self):
        while self._heap and self._heap[0].cancelled:
            heapq.heappop(self._heap)

    def peek(self):
        self._clean_top()
        if not self._heap:
            raise IndexError("peek at empty queue")
        return self._heap[0].payload

    def pop(self):
        self._clean_top()
        if not self._heap:
            raise IndexError("pop from empty queue")
        job = heapq.heappop(self._heap)
        del self._jobs[job.seq]
        self._live -= 1
        return job.payload

    def __len__(self):
        return self._live

q = JobQueue()
ids = [q.push({"n": n}, p) for n, p in [("a", 2), ("b", 1), ("c", 2)]]
q.cancel(ids[1])
print(len(q), q.pop(), q.pop(), len(q))
```
:::explain
`order=True` generates comparisons from the fields **in declaration order**, `(priority, seq)`, while `compare=False` keeps payloads and flags out of it, so two dicts are never compared (which would raise TypeError). The monotonic `seq` gives FIFO among equal priorities. **Lazy deletion** avoids an O(n) search-and-reheapify on `cancel`: the job is flagged and silently discarded when it reaches the top, which keeps every operation O(log n).
:::complexity
push/pop O(log n), cancel O(1), peek amortised O(log n).
:::end
