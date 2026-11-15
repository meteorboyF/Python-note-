# Classes & Objects

**Object-oriented programming (OOP)** organises code around **objects**: bundles of **data** (attributes) and **behaviour** (methods) that belong together. A **class** is the blueprint and an **instance** is one thing built from it. You've used objects all along (`"hi".upper()`, `[1].append(2)`). Now you'll build your own.

:::analogy Cookie cutter and cookies
The **class** is the cookie cutter: it defines the shape. Each **instance** is a cookie cut from it. Every cookie has the same shape (methods), but each has its own toppings (attribute values). Changing one cookie's toppings doesn't change the others, but redesigning the cutter changes all future cookies.
:::

**What you'll learn**: defining classes, `__init__` and `self`, instance vs class attributes, how attribute lookup works (instance `__dict__` → class → bases), methods are just functions, `__repr__`/`__str__` basics, identity and equality of objects, and modelling real problems with classes.

## 1. Your first class

```python
class Dog:
    """A simple Dog."""

    species = "Canis familiaris"        # CLASS attribute: shared by all dogs

    def __init__(self, name, age):      # the initializer: runs on Dog(...)
        self.name = name                # INSTANCE attributes: one per dog
        self.age = age

    def bark(self):                     # a method: a function defined in a class
        return f"{self.name} says woof"

    def birthday(self):
        self.age += 1                   # methods can change the object's state
        return self.age

rex = Dog("Rex", 3)                     # instantiation: create an instance
fido = Dog("Fido", 5)
print(rex.bark(), "|", fido.bark())
rex.birthday()
print(rex.age, fido.age, rex.species, fido.species)
print(type(rex).__name__, isinstance(rex, Dog))
```

Visualise this. You'll see a `class Dog` object, two **instance** objects each with their own `name`/`age`, and arrows from `rex` and `fido` to them.

:::term self
`self` is **the instance the method was called on**. `rex.bark()` is automatically turned into `Dog.bark(rex)`, so inside `bark`, `self` *is* `rex`. The name `self` is only a convention (not a keyword), but always use it.
:::

### What happens when you call `Dog("Rex", 3)`

1. `Dog.__new__(Dog)` **creates** an empty instance (you rarely touch `__new__`).
2. `Dog.__init__(instance, "Rex", 3)` **initialises** it, setting the attributes.
3. The instance is returned. `__init__` itself must return `None`.

```python
class Dog:
    def __init__(self, name):
        self.name = name

d = Dog.__new__(Dog)       # manual step 1
Dog.__init__(d, "Rex")     # manual step 2
print(d.name)              # same result as Dog("Rex")
```

## 2. Instance vs class attributes

```python
class Counter:
    instances = 0                  # class attribute

    def __init__(self):
        Counter.instances += 1     # update via the CLASS
        self.count = 0             # instance attribute

a, b, c = Counter(), Counter(), Counter()
a.count += 5
print(Counter.instances, a.count, b.count)
print(a.__dict__, Counter.__dict__["instances"])
```

:::trap The mutable class attribute trap
```python
class Student:
    courses = []                         # ONE list shared by every student!
    def __init__(self, name):
        self.name = name
    def enroll(self, course):
        self.courses.append(course)      # mutates the shared class list

a, b = Student("A"), Student("B")
a.enroll("Math")
print(b.courses)                         # ['Math']  <- b never enrolled!
```
Put per-instance mutable data in `__init__`: `self.courses = []`. Use class attributes for constants and data that is genuinely shared.
:::

### Shadowing: assigning through an instance creates an instance attribute

```python
class Config:
    debug = False

c1, c2 = Config(), Config()
c1.debug = True               # creates c1.__dict__['debug']; the class is untouched
print(c1.debug, c2.debug, Config.debug)
print(c1.__dict__, c2.__dict__)
del c1.debug                  # remove the shadow: back to the class value
print(c1.debug)
```

## 3. How attribute lookup works

When you write `obj.attr`, Python (simplified) checks:

1. **Data descriptors** on the class (like `@property`, covered in the next chapters)
2. The instance's own `obj.__dict__`
3. The class, then its base classes in **MRO** order (`type(obj).__mro__`)
4. `__getattr__`, if defined, as a last resort
5. Otherwise it raises `AttributeError`

```python
class Animal:
    kingdom = "animalia"
    def describe(self):
        return f"{self.name} of {self.kingdom}"

class Cat(Animal):
    sound = "meow"
    def __init__(self, name):
        self.name = name

tom = Cat("Tom")
print(tom.name, tom.sound, tom.kingdom, tom.describe())
print([k.__name__ for k in Cat.__mro__])
print("name" in tom.__dict__, "sound" in tom.__dict__, "sound" in Cat.__dict__)
```

## 4. Methods are just functions

```python
class Greeter:
    def __init__(self, greeting):
        self.greeting = greeting
    def greet(self, name):
        return f"{self.greeting}, {name}!"

g = Greeter("Hi")
print(g.greet("Ada"))
print(Greeter.greet(g, "Ada"))        # the same call, written explicitly
bound = g.greet                        # a bound method remembers its instance
print(bound("Linus"), bound.__self__ is g, type(bound).__name__)
```

You can even add methods and attributes at run time, because classes are objects too:

```python
class Robot:
    pass

def speak(self):
    return f"beep, I am {self.model}"

Robot.speak = speak                  # attach a function to the class
r = Robot()
r.model = "R2"                        # attach data to the instance
print(r.speak())
```

## 5. Printing objects: `__repr__` and `__str__`

```python
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y
    def __repr__(self):                       # for developers: unambiguous
        return f"Point(x={self.x!r}, y={self.y!r})"
    def __str__(self):                        # for users: pretty
        return f"({self.x}, {self.y})"

p = Point(1, 2)
print(p)              # uses __str__
print(repr(p))        # uses __repr__
print([p, p])         # containers use __repr__ for their items
```

:::tip Always write `__repr__`
Without it you get `<__main__.Point object at 0x7f…>`, which is useless when debugging. A good `__repr__` looks like the code that would recreate the object. If you only write one, write `__repr__`: `print` falls back to it.
:::

## 6. Equality and identity of objects

```python
class Card:
    def __init__(self, rank, suit):
        self.rank, self.suit = rank, suit

a, b = Card("A", "♠"), Card("A", "♠")
print(a == b, a is b)     # False False: the default == compares IDENTITY

class Card2(Card):
    def __eq__(self, other):
        if not isinstance(other, Card2):
            return NotImplemented
        return (self.rank, self.suit) == (other.rank, other.suit)
    def __hash__(self):
        return hash((self.rank, self.suit))

print(Card2("A", "♠") == Card2("A", "♠"), len({Card2("A", "♠"), Card2("A", "♠")}))
```

Full details on `__eq__`/`__hash__` are in the *Dunder Methods* chapter. `@dataclass` (in *Modern OOP*) writes them for you.

## 7. Designing with classes: when and why

Use a class when you have **state + behaviour** that belong together and **several instances**: bank accounts, shapes, game characters, ML models, API clients. Don't use a class for one function and no state: a function is simpler.

| Concept | Meaning | In code |
|---|---|---|
| Class | blueprint / type | `class Account:` |
| Instance / object | one concrete thing | `acc = Account()` |
| Attribute | data on an object | `acc.balance` |
| Method | function on a class | `acc.deposit(10)` |
| Constructor / initializer | sets up a new object | `__init__` |
| State | the current attribute values | `{"balance": 50}` |
| Interface | the public methods | `deposit`, `withdraw` |

## Tricks & tips

- `vars(obj)` or `obj.__dict__` shows an instance's attributes, which is great for debugging.
- `type(obj).__name__` gives the class name for messages and `__repr__`.
- Use `self.__class__.__name__` inside `__repr__` so subclasses print correctly.
- Default arguments in `__init__` follow function rules: **no mutable defaults**.
- Keep `__init__` light: assign attributes and validate. Expensive work goes in methods or class methods.
- Class attributes are perfect for constants (`MAX_SPEED = 120`) and counters.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Forgetting `self` in the method signature | `def m(self, …)` |
| 2 | Forgetting `self.` when assigning (it creates a local) | `self.x = x` |
| 3 | Mutable class attribute shared across instances | initialise in `__init__` |
| 4 | Assigning via the instance shadows the class attribute | assign via `ClassName.attr` |
| 5 | Returning a value from `__init__` | `__init__` must return None |
| 6 | No `__repr__` | always add one |
| 7 | Default `==` is identity | define `__eq__` (and `__hash__`) or use `@dataclass` |
| 8 | Calling `Dog.bark()` without an instance | call on an instance |
| 9 | Typos create new attributes silently (`self.nmae = …`) | `__slots__` or linters |
| 10 | Huge "God classes" | split responsibilities |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
class Cart:
    items = []
    def add(self, x):
        self.items.append(x)
a, b = Cart(), Cart()
a.add("pen")
print(b.items, "items" in vars(a))
```
What prints?
- [ ] `[] True`
- [x] `['pen'] False`
- [ ] `['pen'] True`
`items` is a **class attribute**: one list shared by every Cart. `self.items.append` *mutates* it without ever creating an instance attribute, so `vars(a)` (the instance `__dict__`) is empty.
:::

:::quiz
```python norun
class Counter:
    count = 0
    def __init__(self):
        self.count += 1
c1, c2 = Counter(), Counter()
print(Counter.count, c1.count, c2.count)
```
What prints?
- [ ] `2 2 2`
- [x] `0 1 1`
- [ ] `2 1 2`
`self.count += 1` **reads** the class attribute (0), adds 1, and **assigns** to the instance, creating a new instance attribute each time. The class attribute stays 0. To count instances, write `Counter.count += 1`.
:::

:::quiz
```python norun
class P:
    def __init__(self, x):
        self.x = x
a, b = P(1), P(1)
print(a == b, a is b, len({a, b}))
```
What prints?
- [x] `False False 2`
- [ ] `True False 1`
- [ ] `True False 2`
Without `__eq__`, objects compare by **identity**, so two separately created objects are unequal even with the same data. They also hash by identity, so the set keeps both. Define `__eq__` + `__hash__` (or use `@dataclass(frozen=True)`) for value semantics.
:::

:::tip 🏋️ More practice
16 write-the-class problems (Rectangle, BankAccount, Fraction, …): **[Practice · OOP Classes](#/t/practice-oop)**. Each one has a test judge and a step-by-step solution.
:::

## Practice problems

:::problem basic | Bank account | __init__, methods, validation
Create `BankAccount(owner, balance=0)` with `deposit(amount)` and `withdraw(amount)` (raise `ValueError` for non-positive amounts or insufficient funds), plus a `__repr__`. Track every transaction in a per-account history list.
:::solution
```python
class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance
        self.history = []                      # per-instance list (not a class attribute!)

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("deposit must be positive")
        self.balance += amount
        self.history.append(("deposit", amount))
        return self.balance

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("withdrawal must be positive")
        if amount > self.balance:
            raise ValueError(f"insufficient funds: balance {self.balance}")
        self.balance -= amount
        self.history.append(("withdraw", amount))
        return self.balance

    def __repr__(self):
        return f"BankAccount(owner={self.owner!r}, balance={self.balance})"

a = BankAccount("Ada", 100)
b = BankAccount("Bob")
a.deposit(50); a.withdraw(30); b.deposit(10)
print(a, a.history)
print(b, b.history)
try:
    b.withdraw(99)
except ValueError as e:
    print("Error:", e)
```
:::explain
State (`balance`, `history`) and the rules that protect it (`deposit`, `withdraw`) live together, which is the core idea of OOP. Validation inside methods means no caller can push the balance negative. Each account gets its **own** `history` because it's created in `__init__`. Step through it with the visualiser to see two separate instance boxes.
:::end

:::problem basic | Count instances | class attributes
Create a `Product` class whose class attribute `count` tracks how many products have been created, and that assigns each instance a unique, increasing `id` starting at 1.
:::solution
```python
class Product:
    count = 0

    def __init__(self, name):
        Product.count += 1
        self.id = Product.count
        self.name = name

    def __repr__(self):
        return f"Product#{self.id}({self.name})"

items = [Product(n) for n in ["pen", "cup", "lamp"]]
print(items, Product.count)
```
:::explain
`Product.count += 1` updates the **class** attribute. Writing `self.count += 1` instead would read the class value, add 1, and store a **new instance attribute**, so the class counter would stay at 0. That's the shadowing trap. In concurrent programs, use `itertools.count()` plus a lock for ID generation.
:::end

:::problem basic | Rectangle with derived values | methods vs stored data
Write `Rectangle(w, h)` with `area()`, `perimeter()`, `is_square()`, and `scale(k)` that returns a **new** rectangle (without modifying the original). Explain why `area` should be computed rather than stored.
:::solution
```python
class Rectangle:
    def __init__(self, w, h):
        if w <= 0 or h <= 0:
            raise ValueError("sides must be positive")
        self.w, self.h = w, h
    def area(self):
        return self.w * self.h
    def perimeter(self):
        return 2 * (self.w + self.h)
    def is_square(self):
        return self.w == self.h
    def scale(self, k):
        return Rectangle(self.w * k, self.h * k)
    def __repr__(self):
        return f"Rectangle({self.w}, {self.h})"

r = Rectangle(3, 4)
big = r.scale(2)
print(r, r.area(), r.perimeter(), r.is_square())
print(big, big.area())
r.w = 10
print(r.area())          # still correct after a change
```
:::explain
If `area` were stored in `__init__`, it would go **stale** as soon as `w` changed. Computing it on demand keeps a single **source of truth**. `scale` returning a new object (instead of mutating) makes rectangles safer to share. (The next chapter turns `area` into a `@property`.)
:::end

:::problem medium | Inventory system | composition of objects
Create `Item(name, price, qty)` and `Inventory` holding items in a dict by name. Support `add` (merging quantities for an existing name), `remove(name, qty)`, `total_value()`, `low_stock(threshold)`, and `most_valuable()`.
:::solution
```python
class Item:
    def __init__(self, name, price, qty=0):
        self.name, self.price, self.qty = name, price, qty
    def value(self):
        return self.price * self.qty
    def __repr__(self):
        return f"Item({self.name!r}, {self.price}, qty={self.qty})"

class Inventory:
    def __init__(self):
        self.items = {}
    def add(self, name, price, qty):
        if name in self.items:
            self.items[name].qty += qty
            self.items[name].price = price
        else:
            self.items[name] = Item(name, price, qty)
    def remove(self, name, qty):
        item = self.items.get(name)
        if item is None or item.qty < qty:
            raise ValueError(f"cannot remove {qty} x {name}")
        item.qty -= qty
        if item.qty == 0:
            del self.items[name]
    def total_value(self):
        return sum(i.value() for i in self.items.values())
    def low_stock(self, threshold=5):
        return sorted(n for n, i in self.items.items() if i.qty < threshold)
    def most_valuable(self):
        return max(self.items.values(), key=Item.value, default=None)

inv = Inventory()
inv.add("pen", 1.5, 100); inv.add("lamp", 25, 3); inv.add("mug", 8, 10); inv.add("pen", 1.5, 20)
inv.remove("mug", 10)
print(inv.items)
print(inv.total_value(), inv.low_stock(), inv.most_valuable())
```
:::explain
`Inventory` **has** items (composition) and delegates value calculations to each `Item`. `key=Item.value` passes the *unbound* method as a function: `Item.value(item)` works because methods are just functions taking `self`. Keeping the dict private to `Inventory` and changing it only through methods keeps the invariants (no zero-quantity entries, no negative stock).
:::end

:::problem medium | Matrix class | multiple instances, validation, methods
Implement `Matrix(rows)` that validates rectangularity, with `shape`, `transpose()`, `add(other)` (same shapes) and `mul(other)` (matrix product, checking inner dimensions), plus a readable `__repr__`.
:::solution
```python
class Matrix:
    def __init__(self, rows):
        if not rows or any(len(r) != len(rows[0]) for r in rows):
            raise ValueError("rows must be non-empty and equal length")
        self.rows = [list(r) for r in rows]          # defensive copy
    @property
    def shape(self):
        return len(self.rows), len(self.rows[0])
    def transpose(self):
        return Matrix(list(zip(*self.rows)))
    def add(self, other):
        if self.shape != other.shape:
            raise ValueError(f"shape mismatch {self.shape} vs {other.shape}")
        return Matrix([[a + b for a, b in zip(r1, r2)] for r1, r2 in zip(self.rows, other.rows)])
    def mul(self, other):
        if self.shape[1] != other.shape[0]:
            raise ValueError("inner dimensions differ")
        cols = list(zip(*other.rows))
        return Matrix([[sum(a * b for a, b in zip(r, c)) for c in cols] for r in self.rows])
    def __repr__(self):
        return "Matrix(" + repr(self.rows) + ")"

A = Matrix([[1, 2], [3, 4]])
B = Matrix([[0, 1], [1, 0]])
print(A.shape, A.transpose(), A.add(B), A.mul(B), sep="\n")
```
:::explain
The **defensive copy** in `__init__` means a caller can't later mutate the rows they passed in and corrupt our matrix. Validation happens once, at construction, so every method can assume a valid shape (a **class invariant**). `@property` (next chapter) lets `shape` be read like an attribute while it's computed live. In *Dunder Methods* we'll turn `add`/`mul` into `+` and `@`.
:::end

:::problem medium | Spot the bug: shared state | class vs instance attributes
The code below gives every player the same inventory. Explain why using the visualiser, then fix it.
```python norun
class Player:
    inventory = []
    def __init__(self, name):
        self.name = name
    def pick(self, item):
        self.inventory.append(item)
```
:::solution
```python
class Player:
    def __init__(self, name):
        self.name = name
        self.inventory = []          # one list per player

    def pick(self, item):
        self.inventory.append(item)

a, b = Player("A"), Player("B")
a.pick("sword")
b.pick("shield")
print(a.inventory, b.inventory)
```
:::explain
In the buggy version, `self.inventory` isn't in the instance's `__dict__`, so the lookup falls back to the **class** attribute, and both players `append` to the same list. `append` mutates (it doesn't assign), so no instance attribute is ever created to shadow it. Creating the list in `__init__` gives every instance its own list. In the visualiser, the buggy version shows both players with **no** `inventory` entry, while the class box holds the single list.
:::end

:::problem hard | Library management system | multiple interacting classes
Model `Book(isbn, title, author)`, `Member(name)` and `Library` with: add a book with N copies, `checkout(isbn, member)` (max 3 loans per member, raise if no copy is available), `return_book(isbn, member)`, a waitlist queue per book (when a copy is returned and someone is waiting, it goes straight to the first person waiting), and `report()`.
:::solution
```python
from collections import deque, defaultdict

class Book:
    def __init__(self, isbn, title, author):
        self.isbn, self.title, self.author = isbn, title, author
    def __repr__(self):
        return f"<{self.title}>"

class Member:
    MAX_LOANS = 3
    def __init__(self, name):
        self.name = name
        self.loans = set()
    def __repr__(self):
        return self.name

class Library:
    def __init__(self):
        self.books = {}
        self.available = defaultdict(int)
        self.waitlist = defaultdict(deque)
        self.log = []

    def add_book(self, book, copies=1):
        self.books[book.isbn] = book
        self.available[book.isbn] += copies

    def checkout(self, isbn, member):
        if len(member.loans) >= Member.MAX_LOANS:
            raise RuntimeError(f"{member} has too many loans")
        if isbn in member.loans:
            raise RuntimeError(f"{member} already has {self.books[isbn]}")
        if self.available[isbn] == 0:
            if member not in self.waitlist[isbn]:
                self.waitlist[isbn].append(member)
            self.log.append(f"{member} waitlisted for {self.books[isbn]}")
            return False
        self.available[isbn] -= 1
        member.loans.add(isbn)
        self.log.append(f"{member} borrowed {self.books[isbn]}")
        return True

    def return_book(self, isbn, member):
        member.loans.remove(isbn)
        self.log.append(f"{member} returned {self.books[isbn]}")
        self.available[isbn] += 1
        while self.waitlist[isbn]:
            nxt = self.waitlist[isbn].popleft()
            if len(nxt.loans) < Member.MAX_LOANS:
                self.checkout(isbn, nxt)
                break

    def report(self):
        return {self.books[i].title: n for i, n in self.available.items()}

lib = Library()
lib.add_book(Book("1", "Dune", "Herbert"), copies=1)
lib.add_book(Book("2", "Emma", "Austen"), copies=2)
ada, bob, cy = Member("ada"), Member("bob"), Member("cy")
lib.checkout("1", ada)
lib.checkout("1", bob)        # waitlisted
lib.checkout("1", cy)         # waitlisted
lib.return_book("1", ada)     # goes straight to bob
print("\n".join(lib.log))
print(lib.report(), bob.loans, list(lib.waitlist["1"]))
```
:::explain
Each class has **one responsibility**: `Book` describes a title, `Member` tracks a person's loans and their limit, and `Library` coordinates availability and waitlists. A `deque` gives an O(1) fair queue, and `defaultdict` removes "does this key exist yet?" boilerplate. The return path hands the copy directly to the next eligible waiting member. A design like this is what "OOP design" interviews (LLD rounds) expect you to sketch and then code.
:::end

:::problem hard | Undo-able text editor | command history, object state
Build `Editor` with `type(text)`, `delete(n)` (remove the last n chars), `undo()` and `redo()`. Any new edit after an undo clears the redo stack. Store **operations** (not whole snapshots), so memory is proportional to the edits.
:::solution
```python
class Editor:
    def __init__(self):
        self.text = ""
        self.undo_stack = []
        self.redo_stack = []

    def _apply(self, op, record=True):
        kind, payload = op
        if kind == "insert":
            self.text += payload
        else:                                   # "remove" payload chars from the end
            self.text = self.text[: len(self.text) - len(payload)]
        if record:
            self.undo_stack.append(op)

    @staticmethod
    def _inverse(op):
        kind, payload = op
        return ("remove" if kind == "insert" else "insert", payload)

    def type(self, s):
        self._apply(("insert", s))
        self.redo_stack.clear()

    def delete(self, n):
        removed = self.text[-n:] if n else ""
        self._apply(("remove", removed))
        self.redo_stack.clear()

    def undo(self):
        if self.undo_stack:
            op = self.undo_stack.pop()
            self._apply(self._inverse(op), record=False)
            self.redo_stack.append(op)

    def redo(self):
        if self.redo_stack:
            self._apply(self.redo_stack.pop())

e = Editor()
e.type("Hello"); e.type(" World"); e.delete(5)
print(repr(e.text))
e.undo(); print(repr(e.text))
e.undo(); print(repr(e.text))
e.redo(); print(repr(e.text))
e.type("!"); e.redo(); print(repr(e.text), len(e.redo_stack))
```
:::explain
Each edit is stored as a small **operation** with an exact **inverse**: insert ↔ remove of the same text. Undo pops an op, applies its inverse, and pushes the op onto the redo stack. Redo re-applies it. A new edit clears the redo stack, because the "future" has changed. Storing the removed text in the delete op is what makes undo possible. This is the **Command pattern**, and it's used by real editors, Photoshop, and database transaction logs.
:::end

:::problem hard | Polynomial class | modelling maths objects
Implement `Polynomial(coeffs)` where `coeffs[i]` is the coefficient of xⁱ (strip trailing zeros). Methods: `degree()`, `__call__(x)` using **Horner's method**, `add`, `mul`, `derivative()`, and a `__repr__` like `3x^2 - x + 5`.
:::solution
```python
class Polynomial:
    def __init__(self, coeffs):
        c = list(coeffs)
        while len(c) > 1 and c[-1] == 0:
            c.pop()
        self.c = c or [0]
    def degree(self):
        return len(self.c) - 1 if any(self.c) else -1
    def __call__(self, x):
        result = 0
        for a in reversed(self.c):          # Horner: (((a_n)x + a_{n-1})x + ...)
            result = result * x + a
        return result
    def add(self, other):
        n = max(len(self.c), len(other.c))
        pad = lambda c: c + [0] * (n - len(c))
        return Polynomial([a + b for a, b in zip(pad(self.c), pad(other.c))])
    def mul(self, other):
        out = [0] * (len(self.c) + len(other.c) - 1)
        for i, a in enumerate(self.c):
            for j, b in enumerate(other.c):
                out[i + j] += a * b
        return Polynomial(out)
    def derivative(self):
        return Polynomial([i * a for i, a in enumerate(self.c)][1:] or [0])
    def __repr__(self):
        terms = []
        for i in range(len(self.c) - 1, -1, -1):
            a = self.c[i]
            if a == 0:
                continue
            mag = abs(a)
            coef = "" if mag == 1 and i else str(mag)
            var = "" if i == 0 else "x" if i == 1 else f"x^{i}"
            sign = "-" if a < 0 else "+"
            terms.append((sign, coef + var))
        if not terms:
            return "0"
        first_sign, first = terms[0]
        s = ("-" if first_sign == "-" else "") + first
        return s + "".join(f" {sg} {t}" for sg, t in terms[1:])

p = Polynomial([5, -1, 3])          # 3x^2 - x + 5
q = Polynomial([0, 1])              # x
print(p, "|", q, "|", p.degree())
print(p(2), p.add(q), p.mul(q), p.derivative(), sep=" | ")
```
:::explain
**Horner's method** evaluates a degree-n polynomial with n multiplications and n additions, with no powers needed. Multiplication is a **convolution** of the coefficient lists: the term `i+j` collects `aᵢ·bⱼ`. Normalising (stripping trailing zeros) in `__init__` keeps `degree()` and equality honest. `__call__` makes instances callable like functions (`p(2)`). The *Dunder Methods* chapter adds `+`, `*` and `==`.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Design parking system | LeetCode 1603 | https://leetcode.com/problems/design-parking-system/
Create `ParkingSystem(big, medium, small)` with slot counts per car type. `add_car(car_type)` (1 = big, 2 = medium, 3 = small) parks the car and returns True if a slot of that type is free, otherwise False. (LeetCode calls the method `addCar`.)
:::starter
```python norun
class ParkingSystem:
    def __init__(self, big, medium, small):
        pass
    def add_car(self, car_type):
        pass
```
:::tests
```python norun
p = ParkingSystem(1, 1, 0)
assert p.add_car(1) is True
assert p.add_car(2) is True
assert p.add_car(3) is False
assert p.add_car(1) is False
q = ParkingSystem(0, 2, 0)
assert [q.add_car(2), q.add_car(2), q.add_car(2)] == [True, True, False]
assert p.add_car(2) is False
```
:::solution
```python
class ParkingSystem:
    def __init__(self, big, medium, small):
        self.free = {1: big, 2: medium, 3: small}      # per-INSTANCE state
    def add_car(self, car_type):
        if self.free[car_type] == 0:
            return False
        self.free[car_type] -= 1
        return True

lot = ParkingSystem(1, 1, 0)
print(lot.add_car(1), lot.add_car(3), lot.free)
```
:::explain
All state lives on `self`, created in `__init__`, so two parking lots never share counts (the last test checks this). A dict keyed by car type replaces three nearly identical `if` branches. **State + the methods that guard it** is exactly what a class is for.
:::complexity
O(1) per call.
:::end

:::program medium | Design browser history | LeetCode 1472 | https://leetcode.com/problems/design-browser-history/
Implement `BrowserHistory(homepage)` with:
- `visit(url)`: go to `url` and clear all forward history;
- `back(steps)`: move back up to `steps` pages and return the current URL;
- `forward(steps)`: move forward up to `steps` pages and return the current URL.
:::starter
```python norun
class BrowserHistory:
    def __init__(self, homepage):
        pass
    def visit(self, url):
        pass
    def back(self, steps):
        pass
    def forward(self, steps):
        pass
```
:::tests
```python norun
b = BrowserHistory("leetcode.com")
b.visit("google.com"); b.visit("facebook.com"); b.visit("youtube.com")
assert b.back(1) == "facebook.com"
assert b.back(1) == "google.com"
assert b.forward(1) == "facebook.com"
b.visit("linkedin.com")
assert b.forward(2) == "linkedin.com"
assert b.back(2) == "google.com"
assert b.back(7) == "leetcode.com"
assert b.forward(10) == "linkedin.com"
```
:::hint
Keep a list of pages plus a `cur` index and an `end` index (the last valid page). `visit` writes at `cur + 1` and sets `end` there, which "forgets" the forward pages in O(1). Clamp movements with `max`/`min`.
:::solution
```python
class BrowserHistory:
    def __init__(self, homepage):
        self.pages = [homepage]
        self.cur = 0
        self.end = 0                       # the last valid index (forward limit)
    def visit(self, url):
        self.cur += 1
        if self.cur == len(self.pages):
            self.pages.append(url)
        else:
            self.pages[self.cur] = url     # overwrite instead of deleting the forward pages
        self.end = self.cur
    def back(self, steps):
        self.cur = max(0, self.cur - steps)
        return self.pages[self.cur]
    def forward(self, steps):
        self.cur = min(self.end, self.cur + steps)
        return self.pages[self.cur]

h = BrowserHistory("home")
h.visit("a"); h.visit("b"); h.visit("c")
print(h.back(2), h.forward(1), end=" | ")
h.visit("x")
print(h.forward(5), h.pages, h.end)
```
:::explain
Instead of slicing off the forward history on every `visit` (O(n)), we keep an `end` marker. Pages past `end` are stale and simply get overwritten later. `max`/`min` clamping makes over-long jumps safe. This **index + bound** design gives O(1) for every operation, and it's the same trick behind undo stacks and ring buffers.
:::trace
| op | pages | cur | end | returns |
|---|---|---|---|---|
| init | [lc] | 0 | 0 | |
| visit ×3 | [lc, g, f, y] | 3 | 3 | |
| back(1) | | 2 | 3 | f |
| back(1) | | 1 | 3 | g |
| forward(1) | | 2 | 3 | f |
| visit(li) | [lc, g, f, li] | 3 | 3 | |
| back(2) | | 1 | 3 | g |
:::complexity
O(1) per operation (amortised for append).
:::end

:::program medium | Design an ATM machine | LeetCode 2241 | https://leetcode.com/problems/design-an-atm-machine/
The ATM holds banknotes of 20, 50, 100, 200 and 500. `deposit(counts)` adds `[n20, n50, n100, n200, n500]` notes. `withdraw(amount)` **greedily** uses the largest notes first. If the exact amount can't be paid this way, return `[-1]` and change **nothing**. Otherwise remove the notes and return the counts used, in the same order.
:::starter
```python norun
class ATM:
    def __init__(self):
        pass
    def deposit(self, banknotes_count):
        pass
    def withdraw(self, amount):
        pass
```
:::tests
```python norun
atm = ATM()
atm.deposit([0, 0, 1, 2, 1])
assert atm.withdraw(600) == [0, 0, 1, 0, 1]
atm.deposit([0, 1, 0, 1, 1])
assert atm.withdraw(600) == [-1]
assert atm.withdraw(550) == [0, 1, 0, 0, 1]
a2 = ATM(); a2.deposit([1, 0, 0, 0, 0])
assert a2.withdraw(40) == [-1] and a2.withdraw(20) == [1, 0, 0, 0, 0] and a2.withdraw(20) == [-1]
```
:::hint
Compute the full plan first (largest note first: `take = min(count, amount // value)`). Only if the remaining amount reaches 0, apply the plan. That's the "validate, then commit" pattern.
:::solution
```python
class ATM:
    VALUES = (20, 50, 100, 200, 500)

    def __init__(self):
        self.counts = [0] * 5

    def deposit(self, banknotes_count):
        for i, n in enumerate(banknotes_count):
            self.counts[i] += n

    def withdraw(self, amount):
        plan = [0] * 5
        for i in range(4, -1, -1):                      # largest note first
            take = min(self.counts[i], amount // self.VALUES[i])
            plan[i] = take
            amount -= take * self.VALUES[i]
        if amount:
            return [-1]                                  # can't pay exactly: change nothing
        for i in range(5):
            self.counts[i] -= plan[i]
        return plan

atm = ATM()
atm.deposit([0, 0, 1, 2, 1])
print(atm.withdraw(600), atm.counts)
```
:::explain
The key design rule is **atomicity**: compute the whole withdrawal on a scratch `plan`, and only mutate `self.counts` once success is guaranteed, so a failed request leaves the machine untouched. `VALUES` is a class attribute because it's genuinely shared by all ATMs, while `counts` is per-instance. Greedy is what the problem specifies, and it's why `600` fails after the second deposit (it takes a 500, then can't make 100 from what remains).
:::complexity
O(1): always 5 note types.
:::end

:::program hard | Design a text editor | LeetCode 2296 | https://leetcode.com/problems/design-a-text-editor/
Implement `TextEditor` with a cursor:
- `add_text(text)`: insert at the cursor (the cursor ends after the inserted text);
- `delete_text(k)`: delete up to `k` characters left of the cursor, returning how many were deleted;
- `cursor_left(k)` / `cursor_right(k)`: move, then return the last `min(10, len)` characters **left** of the cursor.

Every operation must cost O(k), not O(length of the document).
:::starter
```python norun
class TextEditor:
    def __init__(self):
        pass
    def add_text(self, text):
        pass
    def delete_text(self, k):
        pass
    def cursor_left(self, k):
        pass
    def cursor_right(self, k):
        pass
```
:::tests
```python norun
e = TextEditor()
e.add_text("leetcode")
assert e.delete_text(4) == 4
e.add_text("practice")
assert e.cursor_right(3) == "etpractice"
assert e.cursor_left(8) == "leet"
assert e.delete_text(10) == 4
assert e.cursor_left(2) == ""
assert e.cursor_right(6) == "practi"
big = TextEditor(); big.add_text("x" * 100000)
assert big.cursor_left(5) == "x" * 10 and big.delete_text(3) == 3
```
:::hint
Use **two stacks**: `left` holds the characters before the cursor (top = the char just left of it) and `right` holds the characters after it, reversed. Moving the cursor pops from one stack and pushes onto the other.
:::solution
```python
class TextEditor:
    def __init__(self):
        self.left = []      # characters before the cursor
        self.right = []     # characters after the cursor, reversed (top = right next to the cursor)

    def add_text(self, text):
        self.left.extend(text)

    def delete_text(self, k):
        k = min(k, len(self.left))
        del self.left[len(self.left) - k:]
        return k

    def _view(self):
        return "".join(self.left[-10:])

    def cursor_left(self, k):
        for _ in range(min(k, len(self.left))):
            self.right.append(self.left.pop())
        return self._view()

    def cursor_right(self, k):
        for _ in range(min(k, len(self.right))):
            self.left.append(self.right.pop())
        return self._view()

e = TextEditor()
e.add_text("hello world")
print(e.cursor_left(5), "|", e.delete_text(1), "|", e.cursor_right(99))
```
:::explain
A Python string is immutable, so inserting in the middle copies the whole document: O(n) per keystroke. The **two-stack (gap buffer)** design keeps the cursor between two lists, so insert, delete and move all touch only the k affected characters at the **ends** of lists, which is O(1) each. Real editors use gap buffers or ropes for exactly this reason.
:::trace
| op | left | right (reversed) | returns |
|---|---|---|---|
| add "leetcode" | leetcode | | |
| delete 4 | leet | | 4 |
| add "practice" | leetpractice | | |
| right 3 | leetpractice | | "etpractice" |
| left 8 | leet | ecitcarp | "leet" |
| delete 10 | (empty) | ecitcarp | 4 |
:::complexity
O(k) per operation, O(n) memory.
:::end
