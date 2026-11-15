# Practice Set · OOP Classes & Methods

Sixteen "write the class" problems: attributes, instance methods, objects that work with other objects, `@staticmethod`, `@classmethod`, class attributes and `__str__`. Every test comes straight from the expected outputs, so **▶ Run tests** tells you exactly which method is off.

:::tip Checklist for every class
1. Put every method **inside** the `class X:` block, indented.
2. `__init__(self, ...)` stores the data: `self.width = width`.
3. Instance methods take **`self`** first and read `self.<attr>`.
4. `@staticmethod` gets **no** `self`. It's a plain function that lives in the class: `Rectangle.combined_area(r1, r2)`.
5. `@classmethod` gets **`cls`**. Use it for alternative constructors (`Circle.from_diameter(10)`) and for changing class attributes.
6. `__str__` must **return** a string (not print it). `print(obj)` calls it.
:::

Review [Classes & Objects](#/t/oop-classes) and [Methods & Properties](#/t/oop-methods) for the theory.

## Problems

:::program basic | Vector2D (fixing a common mistake) | Practice set
A common first attempt writes `dot`, `magnitude` and `distance` as loose functions. They need to be **inside** `class Vector2D:`, with `__init__(self, x, y)` and `self` on every method except the `@staticmethod`.

`Vector2D(3, 4).magnitude()` → `5.0`; `Vector2D(1, 2).dot(Vector2D(3, 4))` → `11`; `Vector2D.distance(Vector2D(0, 0), Vector2D(3, 4))` → `5.0`
:::starter
```python norun
import math

# Write class Vector2D here: __init__(x, y), dot(v), magnitude(), @staticmethod distance(v1, v2)


v1, v2 = Vector2D(1, 2), Vector2D(3, 4)
print(v1.dot(v2))                                       # Expected: 11
print(v2.magnitude())                                   # Expected: 5.0
print(Vector2D.distance(Vector2D(0, 0), Vector2D(3, 4)))   # Expected: 5.0
```
:::tests
```python norun
v1, v2 = Vector2D(1, 2), Vector2D(3, 4)
assert v1.x == 1 and v1.y == 2
assert v1.dot(v2) == 11
assert v2.magnitude() == 5.0
assert Vector2D.distance(Vector2D(0, 0), Vector2D(3, 4)) == 5.0
assert isinstance(Vector2D.__dict__["distance"], staticmethod)
```
:::solution
```python
import math

class Vector2D:
    def __init__(self, x, y):
        self.x = x                     # instance attributes live on self
        self.y = y

    def dot(self, v):
        return self.x * v.x + self.y * v.y

    def magnitude(self):
        return math.sqrt(self.x ** 2 + self.y ** 2)

    @staticmethod
    def distance(v1, v2):              # no self: it works on two vectors given as arguments
        return math.sqrt((v2.x - v1.x) ** 2 + (v2.y - v1.y) ** 2)

v1, v2 = Vector2D(1, 2), Vector2D(3, 4)
print(v1.dot(v2), v2.magnitude(), Vector2D.distance(Vector2D(0, 0), v2))
```
:::explain
`v1.dot(v2)` is really `Vector2D.dot(v1, v2)`: Python passes the object before the dot as **`self`**. A static method doesn't belong to one vector, so it takes both as arguments and is called on the class. The last test checks that you actually used `@staticmethod`. NumPy version of dot: `np.dot([self.x, self.y], [v.x, v.y])`.
:::complexity
O(1) per method.
:::end

:::program basic | Rectangle | Practice set
`Rectangle(width, height)` with `area()`, `perimeter()`, `is_square()` and a static `combined_area(r1, r2)`.
:::starter
```python norun
# Write class Rectangle here


r1 = Rectangle(4, 5)
r2 = Rectangle(6, 6)
print(r1.area())                        # Expected: 20
print(r1.perimeter())                   # Expected: 18
print(r1.is_square())                   # Expected: False
print(r2.is_square())                   # Expected: True
print(Rectangle.combined_area(r1, r2))  # Expected: 56
```
:::tests
```python norun
r1, r2 = Rectangle(4, 5), Rectangle(6, 6)
assert r1.area() == 20
assert r1.perimeter() == 18
assert r1.is_square() is False and r2.is_square() is True
assert Rectangle.combined_area(r1, r2) == 56
```
:::solution
```python
class Rectangle:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height

    def perimeter(self):
        return 2 * (self.width + self.height)

    def is_square(self):
        return self.width == self.height       # a comparison is already True/False

    @staticmethod
    def combined_area(r1, r2):
        return r1.area() + r2.area()           # objects using each other's methods

r1, r2 = Rectangle(4, 5), Rectangle(6, 6)
print(r1.area(), r1.perimeter(), r1.is_square(), r2.is_square(), Rectangle.combined_area(r1, r2))
```
:::explain
`return self.width == self.height` beats `if …: return True else: return False`, because a comparison **is** a boolean. `combined_area` reuses `area()` rather than repeating the formula, so if the formula ever changes it changes in one place.
:::complexity
O(1).
:::end

:::program basic | Circle with a classmethod constructor | Practice set
`Circle(radius)` with `area()` and `circumference()` (rounded to 2 decimals), `scale(factor)`, and a classmethod `from_diameter(d)`.
:::starter
```python norun
import math

# Write class Circle here


c = Circle(5)
print(c.area())            # Expected: 78.54
print(c.circumference())   # Expected: 31.42
c.scale(2)
print(c.area())            # Expected: 314.16
c2 = Circle.from_diameter(10)
print(c2.radius)           # Expected: 5.0
```
:::tests
```python norun
c = Circle(5)
assert c.area() == 78.54 and c.circumference() == 31.42
assert c.scale(2) is None and c.radius == 10 and c.area() == 314.16
c2 = Circle.from_diameter(10)
assert isinstance(c2, Circle) and c2.radius == 5.0
```
:::solution
```python
import math

class Circle:
    def __init__(self, radius):
        self.radius = radius

    def area(self):
        return round(math.pi * self.radius ** 2, 2)

    def circumference(self):
        return round(2 * math.pi * self.radius, 2)

    def scale(self, factor):
        self.radius *= factor              # changes THIS object (returns None)

    @classmethod
    def from_diameter(cls, diameter):
        return cls(diameter / 2)           # cls is Circle (or a subclass)

c = Circle(5); print(c.area(), c.circumference())
c.scale(2); print(c.area())
print(Circle.from_diameter(10).radius)
```
:::explain
`scale` **mutates** the object and returns `None`, the same convention as `list.sort()`. A **classmethod** receives the class as `cls` and calls `cls(...)` to build an instance: an *alternative constructor*. Using `cls` instead of hard-coding `Circle` means a subclass inherits a working `from_diameter`.
:::complexity
O(1).
:::end

:::program basic | BankAccount with transfers | Practice set
`BankAccount(owner, balance=0)` with `deposit`, `withdraw` (prints `Insufficient funds` when the balance is too low) and `transfer(other, amount)`.
:::starter
```python norun
# Write class BankAccount here


a1 = BankAccount("Alice", 1000)
a2 = BankAccount("Bob", 500)
a1.deposit(500)
print(a1.balance)          # Expected: 1500
a1.withdraw(2000)          # Expected: Insufficient funds
a1.transfer(a2, 300)
print(a1.balance)          # Expected: 1200
print(a2.balance)          # Expected: 800
```
:::tests
```python norun
import io, contextlib
a1, a2 = BankAccount("Alice", 1000), BankAccount("Bob", 500)
a1.deposit(500)
assert a1.balance == 1500
buf = io.StringIO()
with contextlib.redirect_stdout(buf): a1.withdraw(2000)
assert buf.getvalue().strip() == "Insufficient funds" and a1.balance == 1500
a1.transfer(a2, 300)
assert (a1.balance, a2.balance) == (1200, 800)
with contextlib.redirect_stdout(io.StringIO()): a2.transfer(a1, 10_000)
assert (a1.balance, a2.balance) == (1200, 800)
assert BankAccount("Zed").balance == 0
```
:::solution
```python
class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        self.balance += amount

    def withdraw(self, amount):
        if self.balance >= amount:
            self.balance -= amount
            return True
        print("Insufficient funds")
        return False

    def transfer(self, other, amount):
        if self.withdraw(amount):          # reuse the rule: only deposit if the withdrawal worked
            other.deposit(amount)

a1, a2 = BankAccount("Alice", 1000), BankAccount("Bob", 500)
a1.deposit(500); print(a1.balance)
a1.withdraw(2000)
a1.transfer(a2, 300); print(a1.balance, a2.balance)
```
:::explain
The key design idea: **`transfer` reuses `withdraw`**. If the money can't leave one account, it must not arrive in the other (no money created out of thin air). That's why `withdraw` returns `True`/`False`. Step through the transfer and watch **two objects** change from one method call.
:::complexity
O(1).
:::end

:::program basic | Student grades | Practice set
`Student(name, marks)` with `average()`, `highest_mark()`, `grade()` (A ≥ 80, B ≥ 70, C ≥ 60, D ≥ 50, else F) and a static `compare(s1, s2)` that returns the name with the higher average, or `"Tie"`.
:::starter
```python norun
# Write class Student here


s1 = Student("Nadia", [85, 90, 80])
s2 = Student("Rafi", [70, 75, 65])
print(s1.average())              # Expected: 85.0
print(s1.highest_mark())         # Expected: 90
print(s1.grade())                # Expected: A
print(Student.compare(s1, s2))   # Expected: Nadia
```
:::tests
```python norun
s1, s2 = Student("Nadia", [85, 90, 80]), Student("Rafi", [70, 75, 65])
assert s1.average() == 85.0 and s1.highest_mark() == 90
assert s1.grade() == "A" and s2.grade() == "B"
assert [Student("x", [m]).grade() for m in (80, 79, 60, 50, 49)] == ["A", "B", "C", "D", "F"]
assert Student.compare(s1, s2) == "Nadia" and Student.compare(s2, s1) == "Nadia"
assert Student.compare(s1, Student("Twin", [85])) == "Tie"
```
:::solution
```python
class Student:
    def __init__(self, name, marks):
        self.name = name
        self.marks = marks

    def average(self):
        return sum(self.marks) / len(self.marks)

    def highest_mark(self):
        return max(self.marks)

    def grade(self):
        avg = self.average()
        for cutoff, letter in ((80, "A"), (70, "B"), (60, "C"), (50, "D")):
            if avg >= cutoff:              # the first cutoff reached wins
                return letter
        return "F"

    @staticmethod
    def compare(s1, s2):
        a, b = s1.average(), s2.average()
        return "Tie" if a == b else (s1.name if a > b else s2.name)

s1, s2 = Student("Nadia", [85, 90, 80]), Student("Rafi", [70, 75, 65])
print(s1.average(), s1.highest_mark(), s1.grade(), Student.compare(s1, s2))
```
:::explain
A **table of cutoffs** checked from the top replaces an `if/elif` ladder, and it's easy to extend. Order matters: check the highest cutoff first. The boundary test (80 → A, 79 → B, …) is where off-by-one mistakes (`>` vs `>=`) get caught.
:::complexity
O(len(marks)).
:::end

:::program basic | Vector3D with __str__ | Practice set
`Vector3D(x, y, z)` with `dot(v)`, `magnitude()` (rounded to 2 decimals), `add(v)` returning a **new** vector, and `__str__` returning `"Vector3D(x, y, z)"`.
:::starter
```python norun
import math

# Write class Vector3D here


v1 = Vector3D(1, 2, 3)
v2 = Vector3D(4, 5, 6)
print(v1.dot(v2))       # Expected: 32
print(v1.magnitude())   # Expected: 3.74
v3 = v1.add(v2)
print(v3)               # Expected: Vector3D(5, 7, 9)
```
:::tests
```python norun
v1, v2 = Vector3D(1, 2, 3), Vector3D(4, 5, 6)
assert v1.dot(v2) == 32 and v1.magnitude() == 3.74
v3 = v1.add(v2)
assert str(v3) == "Vector3D(5, 7, 9)"
assert (v1.x, v1.y, v1.z) == (1, 2, 3) and v3 is not v1
```
:::solution
```python
import math

class Vector3D:
    def __init__(self, x, y, z):
        self.x, self.y, self.z = x, y, z

    def dot(self, v):
        return self.x * v.x + self.y * v.y + self.z * v.z

    def magnitude(self):
        return round(math.sqrt(self.dot(self)), 2)       # |v|² = v·v

    def add(self, v):
        return Vector3D(self.x + v.x, self.y + v.y, self.z + v.z)   # a NEW object

    def __str__(self):
        return f"Vector3D({self.x}, {self.y}, {self.z})"

v1, v2 = Vector3D(1, 2, 3), Vector3D(4, 5, 6)
print(v1.dot(v2), v1.magnitude(), v1.add(v2))
```
:::explain
`__str__` is what `print()` and `str()` call. It must **return** the text. `add` builds a **new** vector rather than changing `self`, so `v1` keeps its value (last test). This is the *immutable value object* style. The next step would be `__add__`, so you could write `v1 + v2` (see the Dunder chapter). Neat trick: `magnitude` reuses `dot`, since |v|² = v·v.
:::complexity
O(1).
:::end

:::program basic | Temperature conversions | Practice set
`Temperature(celsius)` with `to_fahrenheit()`, `to_kelvin()`, `is_freezing()` and a static `fahrenheit_to_celsius(f)`.
:::starter
```python norun
# Write class Temperature here


t = Temperature(25)
print(t.to_fahrenheit())                        # Expected: 77.0
print(t.to_kelvin())                            # Expected: 298.15
print(t.is_freezing())                          # Expected: False
print(Temperature.fahrenheit_to_celsius(212))   # Expected: 100.0
```
:::tests
```python norun
t = Temperature(25)
assert t.to_fahrenheit() == 77.0 and t.to_kelvin() == 298.15
assert t.is_freezing() is False and Temperature(0).is_freezing() is True
assert Temperature.fahrenheit_to_celsius(212) == 100.0
assert Temperature.fahrenheit_to_celsius(32) == 0.0
```
:::solution
```python
class Temperature:
    def __init__(self, celsius):
        self.celsius = celsius

    def to_fahrenheit(self):
        return self.celsius * 9 / 5 + 32

    def to_kelvin(self):
        return self.celsius + 273.15

    def is_freezing(self):
        return self.celsius <= 0

    @staticmethod
    def fahrenheit_to_celsius(f):
        return (f - 32) * 5 / 9

t = Temperature(25)
print(t.to_fahrenheit(), t.to_kelvin(), t.is_freezing(), Temperature.fahrenheit_to_celsius(212))
```
:::explain
`fahrenheit_to_celsius` doesn't need any particular temperature object, so it's a **static** utility on the class. `9 / 5` is true division (1.8). `9 // 5` would give 1 and silently break the formula. Freezing includes exactly 0 °C (`<=`).
:::complexity
O(1).
:::end

:::program basic | Matrix2x2 | Practice set
`Matrix2x2(a, b, c, d)` for `[[a, b], [c, d]]` with `determinant()`, `trace()`, `transpose()` and `add(other)` (both return **new** matrices), and `__str__` → `"[[a, b], [c, d]]"`.
:::starter
```python norun
# Write class Matrix2x2 here


m1 = Matrix2x2(1, 2, 3, 4)
m2 = Matrix2x2(5, 6, 7, 8)
print(m1.determinant())   # Expected: -2
print(m1.trace())         # Expected: 5
print(m1.transpose())     # Expected: [[1, 3], [2, 4]]
print(m1.add(m2))         # Expected: [[6, 8], [10, 12]]
```
:::tests
```python norun
m1, m2 = Matrix2x2(1, 2, 3, 4), Matrix2x2(5, 6, 7, 8)
assert m1.determinant() == -2 and m1.trace() == 5
assert str(m1.transpose()) == "[[1, 3], [2, 4]]"
assert str(m1.add(m2)) == "[[6, 8], [10, 12]]"
assert str(m1) == "[[1, 2], [3, 4]]"
```
:::solution
```python
class Matrix2x2:
    def __init__(self, a, b, c, d):
        self.a, self.b, self.c, self.d = a, b, c, d

    def determinant(self):
        return self.a * self.d - self.b * self.c

    def trace(self):
        return self.a + self.d                      # the main diagonal

    def transpose(self):
        return Matrix2x2(self.a, self.c, self.b, self.d)   # swap b and c

    def add(self, other):
        return Matrix2x2(self.a + other.a, self.b + other.b, self.c + other.c, self.d + other.d)

    def __str__(self):
        return f"[[{self.a}, {self.b}], [{self.c}, {self.d}]]"

m1, m2 = Matrix2x2(1, 2, 3, 4), Matrix2x2(5, 6, 7, 8)
print(m1.determinant(), m1.trace(), m1.transpose(), m1.add(m2))
```
:::explain
Transposing swaps the off-diagonal entries: `[[a, b], [c, d]]` → `[[a, c], [b, d]]`, which is `Matrix2x2(a, c, b, d)`. Check against NumPy: `np.linalg.det([[1, 2], [3, 4]])` ≈ −2.0 (a float, with rounding noise), and `np.array(...).T` transposes.
:::complexity
O(1).
:::end

:::program basic | ShoppingCart | Practice set
`ShoppingCart()` with an `items` dict (name → `[price, qty]`). Methods: `add_item(name, price, qty=1)` (adds to the qty if the item is already there), `remove_item(name)`, `item_count()` and `total_cost()`.
:::starter
```python norun
# Write class ShoppingCart here


cart = ShoppingCart()
cart.add_item("Apple", 2.5, 4)
cart.add_item("Milk", 3.0, 2)
cart.add_item("Apple", 2.5, 2)
print(cart.item_count())   # Expected: 8
print(cart.total_cost())   # Expected: 21.0
cart.remove_item("Milk")
print(cart.total_cost())   # Expected: 15.0
```
:::tests
```python norun
cart = ShoppingCart()
cart.add_item("Apple", 2.5, 4); cart.add_item("Milk", 3.0, 2); cart.add_item("Apple", 2.5, 2)
assert cart.item_count() == 8 and cart.total_cost() == 21.0
cart.remove_item("Milk")
assert cart.total_cost() == 15.0
cart.remove_item("Nothing")
other = ShoppingCart()
assert other.item_count() == 0
```
:::hint
Create the dict **inside `__init__`** (`self.items = {}`). A class-level `items = {}` would be shared by every cart (the last test checks this).
:::solution
```python
class ShoppingCart:
    def __init__(self):
        self.items = {}                     # per-cart dict: name -> [price, qty]

    def add_item(self, name, price, qty=1):
        if name in self.items:
            self.items[name][1] += qty
        else:
            self.items[name] = [price, qty]

    def remove_item(self, name):
        self.items.pop(name, None)          # no error if it's not there

    def item_count(self):
        return sum(qty for _, qty in self.items.values())

    def total_cost(self):
        return sum(price * qty for price, qty in self.items.values())

cart = ShoppingCart()
cart.add_item("Apple", 2.5, 4); cart.add_item("Milk", 3.0, 2); cart.add_item("Apple", 2.5, 2)
print(cart.item_count(), cart.total_cost())
cart.remove_item("Milk"); print(cart.total_cost())
```
:::explain
The classic OOP bug is defining `items = {}` at **class level**: every cart then shares the same dict. Always create mutable state in `__init__`. `dict.pop(key, None)` removes the key if present and does nothing otherwise. The totals unpack each `[price, qty]` pair in a generator expression.
:::complexity
O(1) to add or remove, O(n) for the totals.
:::end

:::program basic | LinearModel (ML) | Practice set
`LinearModel(slope, intercept)` for y = slope·x + intercept, with `predict(x)`, `predict_batch(xs)` and `mse(xs, y_true)`.
:::starter
```python norun
# Write class LinearModel here


model = LinearModel(2, 1)                        # y = 2x + 1
print(model.predict(5))                         # Expected: 11
print(model.predict_batch([1, 2, 3]))           # Expected: [3, 5, 7]
print(model.mse([1, 2, 3], [4, 6, 9]))          # Expected: 2.0
```
:::tests
```python norun
m = LinearModel(2, 1)
assert m.predict(5) == 11 and m.predict_batch([1, 2, 3]) == [3, 5, 7]
assert m.mse([1, 2, 3], [4, 6, 9]) == 2.0
assert m.mse([1, 2], [3, 5]) == 0.0
```
:::solution
```python
class LinearModel:
    def __init__(self, slope, intercept):
        self.slope = slope
        self.intercept = intercept

    def predict(self, x):
        return self.slope * x + self.intercept

    def predict_batch(self, xs):
        return [self.predict(x) for x in xs]            # reuse predict

    def mse(self, xs, y_true):
        preds = self.predict_batch(xs)
        return sum((t - p) ** 2 for t, p in zip(y_true, preds)) / len(y_true)

m = LinearModel(2, 1)
print(m.predict(5), m.predict_batch([1, 2, 3]), m.mse([1, 2, 3], [4, 6, 9]))
```
:::explain
Predictions [3, 5, 7] against [4, 6, 9] give errors 1, 1, 2. Squared, that's 1, 1, 4, with mean **2.0**. Each method builds on the previous one (`mse` → `predict_batch` → `predict`), which is how scikit-learn models are organised (`predict`, `score`). With NumPy: `np.mean((np.array(y) - preds) ** 2)`.
:::complexity
O(n).
:::end

:::program medium | Fraction with gcd | Practice set
`Fraction(num, den)` with `to_decimal()`, `simplify()` (returns a new, reduced fraction), `add(other)` (returns a reduced result) and `__str__` → `"num/den"`.
:::starter
```python norun
import math

# Write class Fraction here


f1 = Fraction(1, 4)
f2 = Fraction(1, 4)
print(f1.to_decimal())            # Expected: 0.25
print(f1.add(f2))                 # Expected: 1/2
print(Fraction(6, 9).simplify())  # Expected: 2/3
```
:::tests
```python norun
f1 = Fraction(1, 4)
assert f1.to_decimal() == 0.25
assert str(f1.add(Fraction(1, 4))) == "1/2"
assert str(Fraction(6, 9).simplify()) == "2/3"
assert str(Fraction(1, 3).add(Fraction(1, 6))) == "1/2"
assert str(f1) == "1/4"
```
:::hint
a/b + c/d = (a·d + c·b) / (b·d), then divide both parts by `math.gcd`.
:::solution
```python
import math

class Fraction:
    def __init__(self, num, den):
        self.num, self.den = num, den

    def to_decimal(self):
        return self.num / self.den

    def simplify(self):
        g = math.gcd(self.num, self.den)
        return Fraction(self.num // g, self.den // g)

    def add(self, other):
        return Fraction(self.num * other.den + other.num * self.den, self.den * other.den).simplify()

    def __str__(self):
        return f"{self.num}/{self.den}"

print(Fraction(1, 4).to_decimal(), Fraction(1, 4).add(Fraction(1, 4)), Fraction(6, 9).simplify())
```
:::explain
Cross-multiply to add, then reduce with the **greatest common divisor**: 6/9 has gcd 3, so it becomes 2/3. Using `//` keeps the parts as integers. The standard library's `fractions.Fraction` does all of this, plus operators and sign handling.
:::complexity
O(log min(num, den)) for gcd.
:::end

:::program basic | DataSeries statistics | Practice set
`DataSeries(data)` with `mean()`, `variance()` (population), `normalize()` (min-max) and `summary()` → `{"min", "max", "mean"}`.
:::starter
```python norun
# Write class DataSeries here


ds = DataSeries([10, 20, 30, 40, 50])
print(ds.mean())        # Expected: 30.0
print(ds.variance())    # Expected: 200.0
print(ds.normalize())   # Expected: [0.0, 0.25, 0.5, 0.75, 1.0]
print(ds.summary())     # Expected: {'min': 10, 'max': 50, 'mean': 30.0}
```
:::tests
```python norun
ds = DataSeries([10, 20, 30, 40, 50])
assert ds.mean() == 30.0 and ds.variance() == 200.0
assert ds.normalize() == [0.0, 0.25, 0.5, 0.75, 1.0]
assert ds.summary() == {"min": 10, "max": 50, "mean": 30.0}
import numpy as np
assert abs(DataSeries([1, 2, 4]).variance() - np.var([1, 2, 4])) < 1e-12
```
:::solution
```python
class DataSeries:
    def __init__(self, data):
        self.data = list(data)

    def mean(self):
        return sum(self.data) / len(self.data)

    def variance(self):
        m = self.mean()
        return sum((x - m) ** 2 for x in self.data) / len(self.data)   # population: divide by n

    def normalize(self):
        lo, hi = min(self.data), max(self.data)
        return [(x - lo) / (hi - lo) for x in self.data]

    def summary(self):
        return {"min": min(self.data), "max": max(self.data), "mean": self.mean()}

ds = DataSeries([10, 20, 30, 40, 50])
print(ds.mean(), ds.variance(), ds.normalize(), ds.summary())
```
:::explain
**Population** variance divides by n (that's `np.var`'s default), while **sample** variance divides by n−1 (`statistics.variance` and pandas `.var()`). Mixing them up is a classic data-science bug, and the NumPy test pins it down. This is a mini pandas Series: data plus methods that summarise it.
:::complexity
O(n) per method.
:::end

:::program basic | Employee with class attribute & classmethod | Practice set
Class attribute `company_name = "TechCorp"`. `Employee(name, base_salary, bonus_rate=0.10)` with `total_salary()`, `give_raise(percent)` and a classmethod `change_company(new_name)` that changes the company for **every** employee.
:::starter
```python norun
# Write class Employee here


e = Employee("Tariq", 50000)
print(e.total_salary())   # Expected: 55000.0
e.give_raise(10)
print(e.total_salary())   # Expected: 60500.0
Employee.change_company("DataLabs")
print(e.company_name)     # Expected: DataLabs
```
:::tests
```python norun
e, f = Employee("Tariq", 50000), Employee("Mina", 40000, 0.2)
assert e.total_salary() == 55000.0 and f.total_salary() == 48000.0
e.give_raise(10)
assert abs(e.total_salary() - 60500.0) < 1e-6
Employee.change_company("DataLabs")
assert e.company_name == f.company_name == Employee.company_name == "DataLabs"
assert "company_name" not in e.__dict__
Employee.company_name = "TechCorp"
```
:::solution
```python
class Employee:
    company_name = "TechCorp"                  # CLASS attribute: shared by all

    def __init__(self, name, base_salary, bonus_rate=0.10):
        self.name = name
        self.base_salary = base_salary
        self.bonus_rate = bonus_rate

    def total_salary(self):
        return self.base_salary + self.base_salary * self.bonus_rate

    def give_raise(self, percent):
        self.base_salary += self.base_salary * percent / 100   # 50000 -> 55000.0 exactly

    @classmethod
    def change_company(cls, new_name):
        cls.company_name = new_name            # changes it on the CLASS: everyone sees it

e = Employee("Tariq", 50000)
print(e.total_salary()); e.give_raise(10); print(e.total_salary())
Employee.change_company("DataLabs"); print(e.company_name)
```
:::explain
`e.company_name` first looks in the **instance**, then in the **class**. Setting `cls.company_name` changes the one shared value, so every employee sees it. Writing `self.company_name = "X"` would instead create an **instance attribute** that *shadows* the class one, for that one object only. The `__dict__` test checks you didn't do that.
:::complexity
O(1).
:::end

:::program medium | TimeDuration with overflow | Practice set
`TimeDuration(hours, minutes, seconds)` with `to_seconds()`, `add(other)` (normalising 60 s → 1 min and 60 min → 1 h) and `__str__` → `"HH:MM:SS"`, zero-padded.
:::starter
```python norun
# Write class TimeDuration here


t1 = TimeDuration(1, 45, 50)
t2 = TimeDuration(0, 20, 25)
print(t1.to_seconds())   # Expected: 6350
t3 = t1.add(t2)
print(t3)                # Expected: 02:06:15
```
:::tests
```python norun
t1, t2 = TimeDuration(1, 45, 50), TimeDuration(0, 20, 25)
assert t1.to_seconds() == 6350
t3 = t1.add(t2)
assert str(t3) == "02:06:15" and (t3.hours, t3.minutes, t3.seconds) == (2, 6, 15)
assert str(TimeDuration(0, 59, 59).add(TimeDuration(0, 0, 1))) == "01:00:00"
assert str(TimeDuration(0, 0, 5)) == "00:00:05"
```
:::hint
Convert both to seconds, add, then split back with `divmod(total, 3600)` and `divmod(rest, 60)`.
:::solution
```python
class TimeDuration:
    def __init__(self, hours, minutes, seconds):
        self.hours, self.minutes, self.seconds = hours, minutes, seconds

    def to_seconds(self):
        return self.hours * 3600 + self.minutes * 60 + self.seconds

    @classmethod
    def from_seconds(cls, total):
        h, rest = divmod(total, 3600)          # (quotient, remainder) in one call
        m, s = divmod(rest, 60)
        return cls(h, m, s)

    def add(self, other):
        return TimeDuration.from_seconds(self.to_seconds() + other.to_seconds())

    def __str__(self):
        return f"{self.hours:02d}:{self.minutes:02d}:{self.seconds:02d}"

t1, t2 = TimeDuration(1, 45, 50), TimeDuration(0, 20, 25)
print(t1.to_seconds(), t1.add(t2))
```
:::explain
Carrying digits by hand is error-prone. Convert to a **single unit** (seconds), do the maths, and convert back with **`divmod`**. That's the same trick dates and money use. The format spec `:02d` pads with zeros to width 2. `from_seconds` is another classmethod constructor.
:::complexity
O(1).
:::end

:::program medium | TextAnalyzer | Practice set
`TextAnalyzer(text)` with `word_count()`, `unique_words()` (sorted, lowercase), `most_frequent_word()` and `char_count(include_spaces=True)`.
:::starter
```python norun
# Write class TextAnalyzer here


ta = TextAnalyzer("data science is fun and data is data")
print(ta.word_count())           # Expected: 8
print(ta.unique_words())         # Expected: ['and', 'data', 'fun', 'is', 'science']
print(ta.most_frequent_word())   # Expected: data
print(ta.char_count(True))       # Expected: 36
print(ta.char_count(False))      # Expected: 29
```
:::tests
```python norun
ta = TextAnalyzer("data science is fun and data is data")
assert ta.word_count() == 8
assert ta.unique_words() == ["and", "data", "fun", "is", "science"]
assert ta.most_frequent_word() == "data"
assert ta.char_count(True) == 36 and ta.char_count(False) == 29 and ta.char_count() == 36
assert TextAnalyzer("Hi hi HI there").unique_words() == ["hi", "there"]
```
:::solution
```python
from collections import Counter

class TextAnalyzer:
    def __init__(self, text):
        self.text = text

    def words(self):
        return self.text.lower().split()

    def word_count(self):
        return len(self.words())

    def unique_words(self):
        return sorted(set(self.words()))

    def most_frequent_word(self):
        return Counter(self.words()).most_common(1)[0][0]

    def char_count(self, include_spaces=True):
        return len(self.text) if include_spaces else len(self.text.replace(" ", ""))

ta = TextAnalyzer("data science is fun and data is data")
print(ta.word_count(), ta.unique_words(), ta.most_frequent_word(), ta.char_count(), ta.char_count(False))
```
:::explain
A small **helper method** (`words`) removes repetition: every other method builds on it. `Counter.most_common(1)` returns `[('data', 3)]`, so `[0][0]` extracts the word. Lowercasing makes "Hi" and "hi" the same word (last test). The text has 29 letters plus 7 spaces, so 36 characters.
:::complexity
O(len(text)).
:::end

:::program basic | Playlist | Practice set
`Playlist(name)` holding `(title, duration_sec)` tuples, with `add_song`, `remove_song(title)`, `total_duration()` (in minutes, rounded to 2 decimals) and `longest_song()`.
:::starter
```python norun
# Write class Playlist here


pl = Playlist("Focus")
pl.add_song("Track A", 180)
pl.add_song("Track B", 240)
pl.add_song("Track C", 150)
print(pl.total_duration())   # Expected: 9.5
print(pl.longest_song())     # Expected: Track B
pl.remove_song("Track B")
print(pl.longest_song())     # Expected: Track A
```
:::tests
```python norun
pl = Playlist("Focus")
pl.add_song("Track A", 180); pl.add_song("Track B", 240); pl.add_song("Track C", 150)
assert pl.total_duration() == 9.5 and pl.longest_song() == "Track B"
pl.remove_song("Track B")
assert pl.longest_song() == "Track A" and len(pl.songs) == 2
assert Playlist("Empty").songs == [] and Playlist("Empty").total_duration() == 0.0
```
:::solution
```python
class Playlist:
    def __init__(self, name):
        self.name = name
        self.songs = []                         # a list of (title, seconds) tuples

    def add_song(self, title, duration_sec):
        self.songs.append((title, duration_sec))

    def remove_song(self, title):
        self.songs = [s for s in self.songs if s[0] != title]

    def total_duration(self):
        return round(sum(sec for _, sec in self.songs) / 60, 2)

    def longest_song(self):
        return max(self.songs, key=lambda s: s[1])[0]

pl = Playlist("Focus")
for t, s in [("Track A", 180), ("Track B", 240), ("Track C", 150)]:
    pl.add_song(t, s)
print(pl.total_duration(), pl.longest_song())
pl.remove_song("Track B"); print(pl.longest_song())
```
:::explain
This one combines everything: a list of **tuples** stored on the object, a **filtering comprehension** to remove a song (safer than calling `.remove` while you search), and **`max` with `key=`** to find the longest. 570 seconds ÷ 60 = 9.5 minutes.
:::complexity
O(n) per method.
:::end
