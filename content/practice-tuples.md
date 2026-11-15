# Practice Set · Tuples

Fifteen tuple problems: unpacking, sorting records, `zip`, immutability and aggregate checks. Each has your input and expected output, a test judge, a hint and a step-through solution.

:::tip The tuple mindset
A tuple is a **fixed record**: `("Rahim", 21, 88.5, "CS")`. You **unpack** it into names, **sort** lists of them with `key=`, and **build new ones** instead of changing them, because tuples are immutable.
:::

Review the [Tuples chapter](#/t/tuples) for the details behind each trick.

## Problems

:::program basic | Min, max and average of a tuple | Practice set
Return `(min, max, average)` of a tuple of floats.

Input `(78.5, 89.0, 92.5, 64.0, 81.0)` → `Min: 64.0, Max: 92.5, Avg: 81.0`
:::starter
```python norun
def stats(scores):
    # Write your code here
    pass

lo, hi, avg = stats((78.5, 89.0, 92.5, 64.0, 81.0))
print(f"Min: {lo}, Max: {hi}, Avg: {avg}")
```
:::tests
```python norun
assert stats((78.5, 89.0, 92.5, 64.0, 81.0)) == (64.0, 92.5, 81.0)
assert stats((5.0,)) == (5.0, 5.0, 5.0)
```
:::solution
```python
def stats(scores):
    return min(scores), max(scores), sum(scores) / len(scores)   # returning a tuple

lo, hi, avg = stats((78.5, 89.0, 92.5, 64.0, 81.0))
print(f"Min: {lo}, Max: {hi}, Avg: {avg}")
```
:::explain
`min`, `max`, `sum` and `len` work on **any iterable**, tuples included. `return a, b, c` returns **one tuple**, which the caller unpacks into three names. Note the test's `(5.0,)`: a one-element tuple needs the **trailing comma**, because `(5.0)` is just a number in parentheses.
:::complexity
O(n).
:::end

:::program basic | Unpack a record into a sentence | Practice set
Unpack `(name, age, gpa, dept)` and return the sentence.

Input `("Rahim", 21, 88.5, "CS")` → `Rahim (Age: 21) from CS scored 88.5`
:::starter
```python norun
def describe(student):
    # Write your code here
    pass

print(describe(("Rahim", 21, 88.5, "CS")))
```
:::tests
```python norun
assert describe(("Rahim", 21, 88.5, "CS")) == "Rahim (Age: 21) from CS scored 88.5"
assert describe(("Ana", 19, 90, "EEE")) == "Ana (Age: 19) from EEE scored 90"
assert raises(ValueError, describe, ("too", "short"))
```
:::hint
`name, age, gpa, dept = student`, then an **f-string**.
:::solution
```python
def describe(student):
    name, age, gpa, dept = student           # the counts must match exactly
    return f"{name} (Age: {age}) from {dept} scored {gpa}"

print(describe(("Rahim", 21, 88.5, "CS")))
```
:::explain
**Unpacking** assigns by position. If the counts differ, Python raises `ValueError: not enough values to unpack`, which the last test checks. For records with many fields, `collections.namedtuple` or a `dataclass` lets you write `s.name` instead of remembering positions.
:::complexity
O(1).
:::end

:::program basic | Sort tuples by their second value | Practice set
Sort `(product, price)` pairs from the **highest** price to the lowest.

Input `[("Laptop", 850), ("Mouse", 25), ("Monitor", 300), ("Keyboard", 60)]` → `[('Laptop', 850), ('Monitor', 300), ('Keyboard', 60), ('Mouse', 25)]`
:::starter
```python norun
def by_price_desc(products):
    # Write your code here
    pass

print(by_price_desc([("Laptop", 850), ("Mouse", 25), ("Monitor", 300), ("Keyboard", 60)]))
```
:::tests
```python norun
p = [("Laptop", 850), ("Mouse", 25), ("Monitor", 300), ("Keyboard", 60)]
assert by_price_desc(p) == [("Laptop", 850), ("Monitor", 300), ("Keyboard", 60), ("Mouse", 25)]
assert p[0] == ("Laptop", 850) and p[1] == ("Mouse", 25)
assert by_price_desc([("a", 1), ("b", 1)]) == [("a", 1), ("b", 1)]
```
:::hint
`sorted(products, key=lambda item: item[1], reverse=True)`
:::solution
```python
from operator import itemgetter

def by_price_desc(products):
    return sorted(products, key=lambda item: item[1], reverse=True)

print(by_price_desc([("Laptop", 850), ("Mouse", 25), ("Monitor", 300), ("Keyboard", 60)]))
print(sorted([("Laptop", 850), ("Mouse", 25)], key=itemgetter(1)))   # itemgetter = faster lambda
```
:::explain
`key=` tells `sorted` **what to compare**: here the price at index 1. `reverse=True` flips the order while keeping the sort **stable**, so equal prices stay in their original order (the last test). `sorted` returns a **new** list, while `.sort()` would change the caller's list. The second test checks that the input was left alone.
:::complexity
O(n log n).
:::end

:::program basic | Find the most expensive item | Practice set
Return the `(name, price)` tuple with the highest price.

Input `[("Book", 12.5), ("Pen", 2.0), ("Bag", 45.0), ("Lamp", 30.0)]` → `Most Expensive: Bag ($45.0)`
:::starter
```python norun
def most_expensive(items):
    # Write your code here
    pass

name, price = most_expensive([("Book", 12.5), ("Pen", 2.0), ("Bag", 45.0), ("Lamp", 30.0)])
print(f"Most Expensive: {name} (${price})")
```
:::tests
```python norun
assert most_expensive([("Book", 12.5), ("Pen", 2.0), ("Bag", 45.0), ("Lamp", 30.0)]) == ("Bag", 45.0)
assert most_expensive([("x", 1)]) == ("x", 1)
```
:::solution
```python
def most_expensive(items):
    return max(items, key=lambda it: it[1])

name, price = most_expensive([("Book", 12.5), ("Pen", 2.0), ("Bag", 45.0), ("Lamp", 30.0)])
print(f"Most Expensive: {name} (${price})")
```
:::explain
`max(..., key=...)` is a one-pass O(n) search. Sorting the whole list just to take the first item would be O(n log n). Without `key`, `max` would compare the tuples **element by element**, which means by *name* first, so `"Pen"` would win alphabetically.
:::complexity
O(n).
:::end

:::program basic | Count and locate the first occurrence | Practice set
Return `(count of target, index of its first occurrence or -1)`.

Input `(4, 7, 2, 7, 9, 7, 1)`, target `7` → `Count: 3, First Index: 1`
:::starter
```python norun
def count_and_index(nums, target):
    # Write your code here
    pass

c, i = count_and_index((4, 7, 2, 7, 9, 7, 1), 7)
print(f"Count: {c}, First Index: {i}")
```
:::tests
```python norun
assert count_and_index((4, 7, 2, 7, 9, 7, 1), 7) == (3, 1)
assert count_and_index((1, 2), 5) == (0, -1)
```
:::hint
Tuples have exactly two methods, `.count()` and `.index()`. `.index` raises `ValueError` if the item is missing.
:::solution
```python
def count_and_index(nums, target):
    c = nums.count(target)
    return c, (nums.index(target) if c else -1)    # only search if it exists

c, i = count_and_index((4, 7, 2, 7, 9, 7, 1), 7)
print(f"Count: {c}, First Index: {i}")
```
:::explain
Because tuples are immutable, they only have the two **read-only** methods `count` and `index`. Guard `index` with the count, or use `try/except ValueError`, so a missing target doesn't crash the program.
:::complexity
O(n).
:::end

:::program basic | Replace an element in a tuple | Practice set
Tuples can't be changed. Return a **new** tuple with `old` replaced by `new`.

Input `("red", "green", "blue", "yellow")` → `('red', 'emerald', 'blue', 'yellow')`
:::starter
```python norun
def replace(t, old, new):
    # Write your code here
    pass

print(replace(("red", "green", "blue", "yellow"), "green", "emerald"))
```
:::tests
```python norun
colors = ("red", "green", "blue", "yellow")
assert replace(colors, "green", "emerald") == ("red", "emerald", "blue", "yellow")
assert colors[1] == "green"
assert replace(("a", "a"), "a", "b") == ("b", "b")
import operator
assert raises(TypeError, operator.setitem, colors, 1, "x")
```
:::hint
Build a generator of replaced items and pass it to `tuple(...)`, or convert to a list, change it, and convert back.
:::solution
```python
def replace(t, old, new):
    return tuple(new if x == old else x for x in t)

colors = ("red", "green", "blue", "yellow")
print(replace(colors, "green", "emerald"))
lst = list(colors); lst[1] = "emerald"; print(tuple(lst))     # the list round-trip way
```
:::explain
`colors[1] = "emerald"` raises **`TypeError: 'tuple' object does not support item assignment`**. That's immutability, as the last test shows. You always **build a new tuple** instead: either a generator passed to `tuple()`, or `t[:i] + (new,) + t[i+1:]` with slicing and concatenation.
:::complexity
O(n).
:::end

:::program basic | Swap two variables without a temp | Practice set
Return `(b, a)`, swapping with tuple unpacking in one line.

Input `a = 15, b = 42` → `a: 42, b: 15`
:::starter
```python norun
def swap(a, b):
    # Write your code here (one line!)
    pass

a, b = swap(15, 42)
print(f"a: {a}, b: {b}")
```
:::tests
```python norun
assert swap(15, 42) == (42, 15)
assert swap("x", [1]) == ([1], "x")
```
:::solution
```python
a, b = 15, 42
a, b = b, a          # right side becomes the tuple (42, 15) FIRST, then it's unpacked
print(f"a: {a}, b: {b}")

def swap(a, b):
    return b, a
```
:::explain
`a, b = b, a` works because Python **evaluates the whole right side first**, building the tuple `(42, 15)`, and only then assigns. No temporary variable is needed. Step through the solution and watch both names change on the same step.
:::complexity
O(1).
:::end

:::program basic | Euclidean distance between two points | Practice set
Unpack two `(x, y)` points and return the distance √((x₂−x₁)² + (y₂−y₁)²).

Input `p1 = (2, 3)`, `p2 = (5, 7)` → `Distance: 5.0`
:::starter
```python norun
import math

def distance(p1, p2):
    # Write your code here
    pass

print("Distance:", distance((2, 3), (5, 7)))
```
:::tests
```python norun
assert distance((2, 3), (5, 7)) == 5.0
assert distance((0, 0), (0, 0)) == 0.0
assert abs(distance((1, 1), (2, 2)) - 2 ** 0.5) < 1e-12
```
:::solution
```python
import math

def distance(p1, p2):
    x1, y1 = p1
    x2, y2 = p2
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

print("Distance:", distance((2, 3), (5, 7)))
print(math.dist((2, 3), (5, 7)))        # the built-in (Python 3.8+), any dimension
```
:::explain
Unpack each point into named coordinates and the formula reads like the maths. `math.hypot(dx, dy)` and `math.dist(p, q)` are the built-in, numerically careful versions. The 3-4-5 right triangle gives exactly `5.0`.
:::complexity
O(1).
:::end

:::program basic | Names above a salary threshold | Practice set
Return the names of employees earning **strictly** more than `threshold`.

Input `[("Alice", 4500), ("Bob", 6200), ("Charlie", 3800), ("Diana", 7100)]`, `5000` → `['Bob', 'Diana']`
:::starter
```python norun
def high_earners(employees, threshold=5000):
    # Write your code here
    pass

print(high_earners([("Alice", 4500), ("Bob", 6200), ("Charlie", 3800), ("Diana", 7100)]))
```
:::tests
```python norun
assert high_earners([("Alice", 4500), ("Bob", 6200), ("Charlie", 3800), ("Diana", 7100)]) == ["Bob", "Diana"]
assert high_earners([("Eve", 5000)]) == []
assert high_earners([("Eve", 5000)], 4999) == ["Eve"]
```
:::hint
Unpack inside the comprehension: `[name for name, salary in employees if ...]`.
:::solution
```python
def high_earners(employees, threshold=5000):
    return [name for name, salary in employees if salary > threshold]

print(high_earners([("Alice", 4500), ("Bob", 6200), ("Charlie", 3800), ("Diana", 7100)]))
```
:::explain
**Unpacking in the `for` clause** (`for name, salary in employees`) is much clearer than `e[0]` and `e[1]`. "Strictly more" means `>`, so exactly 5000 is excluded. `threshold=5000` is a **default argument**, which the third test overrides.
:::complexity
O(n).
:::end

:::program basic | Unzip a list of pairs | Practice set
Split pairs into two tuples: the first items and the second items.

Input `[("a", 1), ("b", 2), ("c", 3)]` → `letters: ('a', 'b', 'c'), numbers: (1, 2, 3)`
:::starter
```python norun
def unzip(pairs):
    # Write your code here
    pass

letters, numbers = unzip([("a", 1), ("b", 2), ("c", 3)])
print("letters:", letters, "numbers:", numbers)
```
:::tests
```python norun
assert unzip([("a", 1), ("b", 2), ("c", 3)]) == (("a", "b", "c"), (1, 2, 3))
assert unzip([("x", 9)]) == (("x",), (9,))
```
:::hint
`zip(*pairs)`: the `*` **spreads** the list so each pair becomes a separate argument to `zip`.
:::solution
```python
def unzip(pairs):
    letters, numbers = zip(*pairs)       # zip(("a",1), ("b",2), ("c",3))
    return letters, numbers

letters, numbers = unzip([("a", 1), ("b", 2), ("c", 3)])
print("letters:", letters, "numbers:", numbers)
```
:::explain
**`zip(*pairs)` is its own inverse.** `*pairs` unpacks the list into three arguments, and `zip` regroups them by position: all first items together, then all second items. That turns rows into columns (a transpose). It returns tuples, which is exactly what this task wants. With an empty list, the unpacking into two names would fail, so watch for that edge case in real code.
:::complexity
O(n).
:::end

:::program basic | all() and any() checks | Practice set
Return `(all ages >= 18, at least one age > 28)`.

Input `(22, 19, 25, 30, 18)` → `All adults: True, Any over 28: True`
:::starter
```python norun
def age_checks(ages):
    # Write your code here
    pass

adults, over28 = age_checks((22, 19, 25, 30, 18))
print(f"All adults: {adults}, Any over 28: {over28}")
```
:::tests
```python norun
assert age_checks((22, 19, 25, 30, 18)) == (True, True)
assert age_checks((17, 40)) == (False, True)
assert age_checks((20, 21)) == (True, False)
```
:::solution
```python
def age_checks(ages):
    return all(a >= 18 for a in ages), any(a > 28 for a in ages)

adults, over28 = age_checks((22, 19, 25, 30, 18))
print(f"All adults: {adults}, Any over 28: {over28}")
```
:::explain
`all` is True when **every** item passes, and `any` is True when **at least one** passes. Both **short-circuit**: `all` stops at the first False, and `any` stops at the first True. Pass them a **generator expression** (no brackets) so no temporary list is built.
:::complexity
O(n), and they stop early.
:::end

:::program basic | Merge and deduplicate two tuples | Practice set
Return a **sorted tuple** of the unique values from both tuples.

Input `(1, 2, 3, 4)` and `(3, 4, 5, 6)` → `(1, 2, 3, 4, 5, 6)`
:::starter
```python norun
def merge_unique(t1, t2):
    # Write your code here
    pass

print(merge_unique((1, 2, 3, 4), (3, 4, 5, 6)))
```
:::tests
```python norun
assert merge_unique((1, 2, 3, 4), (3, 4, 5, 6)) == (1, 2, 3, 4, 5, 6)
assert merge_unique((), (2, 1, 2)) == (1, 2)
assert type(merge_unique((1,), (2,))) is tuple
```
:::solution
```python
def merge_unique(t1, t2):
    return tuple(sorted(set(t1) | set(t2)))     # | on sets = union

print(merge_unique((1, 2, 3, 4), (3, 4, 5, 6)))
```
:::explain
Three tools chained: a **set union** `|` removes duplicates, `sorted` orders the values (and returns a *list*), and `tuple(...)` converts the result to the requested type. `set(t1 + t2)` also works, since `+` concatenates tuples. The last test checks the return type, because `sorted` alone would return a list.
:::complexity
O((n + m) log(n + m)).
:::end

:::program basic | Slicing and reversing a tuple | Practice set
Return `(the middle 3 elements, the whole tuple reversed)`.

Input `(10, 20, 30, 40, 50, 60, 70)` → `Middle: (30, 40, 50), Reversed: (70, 60, 50, 40, 30, 20, 10)`
:::starter
```python norun
def middle_and_reversed(t):
    # Write your code here
    pass

mid, rev = middle_and_reversed((10, 20, 30, 40, 50, 60, 70))
print("Middle:", mid, "Reversed:", rev)
```
:::tests
```python norun
assert middle_and_reversed((10, 20, 30, 40, 50, 60, 70)) == ((30, 40, 50), (70, 60, 50, 40, 30, 20, 10))
assert middle_and_reversed((1, 2, 3)) == ((1, 2, 3), (3, 2, 1))
assert middle_and_reversed((1, 2, 3, 4, 5)) == ((2, 3, 4), (5, 4, 3, 2, 1))
```
:::hint
The middle starts at `len(t) // 2 - 1`. `t[::-1]` reverses.
:::solution
```python
def middle_and_reversed(t):
    start = len(t) // 2 - 1          # the centre index minus one
    return t[start:start + 3], t[::-1]

mid, rev = middle_and_reversed((10, 20, 30, 40, 50, 60, 70))
print("Middle:", mid, "Reversed:", rev)
```
:::explain
Slicing `t[a:b]` takes positions a up to (not including) b, and returns a **tuple** when sliced from a tuple. For length 7 the centre is index 3, so the middle three are indexes 2, 3, 4, which is `t[2:5]`. **`[::-1]`** means "whole sequence, step −1": a reversed copy. Step through the solution to see the selected cells highlighted.
:::complexity
O(n).
:::end

:::program basic | Sum of each inner tuple | Practice set
Return a list with the sum of each inner tuple.

Input `[(10, 20, 30), (5, 15), (100, 200)]` → `[60, 20, 300]`
:::starter
```python norun
def inner_sums(records):
    # Write your code here
    pass

print(inner_sums([(10, 20, 30), (5, 15), (100, 200)]))
```
:::tests
```python norun
assert inner_sums([(10, 20, 30), (5, 15), (100, 200)]) == [60, 20, 300]
assert inner_sums([(), (1,)]) == [0, 1]
```
:::solution
```python
def inner_sums(records):
    return [sum(r) for r in records]

print(inner_sums([(10, 20, 30), (5, 15), (100, 200)]))
print(list(map(sum, [(10, 20, 30), (5, 15), (100, 200)])))   # map applies sum to each
```
:::explain
Inner tuples of **different lengths** are no problem: `sum` handles each one separately, and `sum(())` is 0. `map(sum, records)` is the functional version, and wrapping it in `list()` makes it concrete.
:::complexity
O(total items).
:::end

:::program medium | Team with the highest average | Practice set
Return `(team, average rounded to 2 decimals)` for the team with the best average.

Input `[("Team A", (80, 90, 85)), ("Team B", (95, 88, 92)), ("Team C", (70, 75, 80))]` → `Top Team: Team B (91.67)`
:::starter
```python norun
def top_team(class_scores):
    # Write your code here
    pass

team, avg = top_team([("Team A", (80, 90, 85)), ("Team B", (95, 88, 92)), ("Team C", (70, 75, 80))])
print(f"Top Team: {team} ({avg})")
```
:::tests
```python norun
assert top_team([("Team A", (80, 90, 85)), ("Team B", (95, 88, 92)), ("Team C", (70, 75, 80))]) == ("Team B", 91.67)
assert top_team([("Solo", (50,))]) == ("Solo", 50.0)
```
:::hint
Compute `(name, average)` pairs with a comprehension, then `max(..., key=lambda p: p[1])`.
:::solution
```python
def top_team(class_scores):
    averages = [(name, sum(s) / len(s)) for name, s in class_scores]
    name, avg = max(averages, key=lambda p: p[1])
    return name, round(avg, 2)

team, avg = top_team([("Team A", (80, 90, 85)), ("Team B", (95, 88, 92)), ("Team C", (70, 75, 80))])
print(f"Top Team: {team} ({avg})")
```
:::explain
This combines three skills: **unpacking nested records** (`for name, s in ...`), **computing a derived value** per record, and **`max` with `key=`**. Round **after** choosing the winner, because rounding first could create false ties.
:::complexity
O(total scores).
:::end
