# Practice Set · Dictionaries

Fifteen dictionary problems: averages over values, sorting items, counting, merging, comprehensions, inverting, safe lookups and grouping. Each has your input and expected output, a test judge, a hint and a step-through solution.

:::tip Three dict superpowers
1. **`.items()`** gives `(key, value)` pairs, so unpack them in loops and comprehensions.
2. **`.get(key, default)`** never raises `KeyError`.
3. **Dict comprehensions** `{k: v for k, v in d.items() if ...}` build filtered or transformed copies in one line.
:::

Review the [Dictionaries chapter](#/t/dicts) for hashing, ordering and `Counter`/`defaultdict`.

## Problems

:::program basic | Above-average scorers | Practice set
Return `(average rounded to 2 decimals, names scoring above the average)`, in dictionary order.

Input `{"Alice": 88.5, "Bob": 92.2, "Charlie": 85.3, "David": 78.9, "Eva": 98.3}` → `Average: 88.64, Above Average: ['Bob', 'Eva']`
:::starter
```python norun
def above_average(scores):
    # Write your code here
    pass

avg, names = above_average({"Alice": 88.5, "Bob": 92.2, "Charlie": 85.3, "David": 78.9, "Eva": 98.3})
print(f"Average: {avg}, Above Average: {names}")
```
:::tests
```python norun
assert above_average({"Alice": 88.5, "Bob": 92.2, "Charlie": 85.3, "David": 78.9, "Eva": 98.3}) == (88.64, ["Bob", "Eva"])
assert above_average({"x": 1, "y": 1}) == (1.0, [])
```
:::solution
```python
def above_average(scores):
    avg = sum(scores.values()) / len(scores)          # .values() = just the numbers
    return round(avg, 2), [name for name, s in scores.items() if s > avg]

avg, names = above_average({"Alice": 88.5, "Bob": 92.2, "Charlie": 85.3, "David": 78.9, "Eva": 98.3})
print(f"Average: {avg}, Above Average: {names}")
```
:::explain
`scores.values()` feeds `sum` directly, and `len(scores)` counts the keys. `.items()` with unpacking gives you both the name and the score in the comprehension. Dicts remember **insertion order**, so the result follows the order the keys were added. Alice (88.5) is just under the unrounded average 88.64, a nice boundary check.
:::complexity
O(n).
:::end

:::program basic | Sort a dictionary by value (descending) | Practice set
Return the `(key, value)` pairs sorted from the highest value to the lowest.

Input `{"Math": 78, "Physics": 92, "Chemistry": 85, "English": 88}` → `[('Physics', 92), ('English', 88), ('Chemistry', 85), ('Math', 78)]`
:::starter
```python norun
def sort_by_value(marks):
    # Write your code here
    pass

print(sort_by_value({"Math": 78, "Physics": 92, "Chemistry": 85, "English": 88}))
```
:::tests
```python norun
assert sort_by_value({"Math": 78, "Physics": 92, "Chemistry": 85, "English": 88}) == [("Physics", 92), ("English", 88), ("Chemistry", 85), ("Math", 78)]
assert sort_by_value({}) == []
```
:::solution
```python
def sort_by_value(marks):
    return sorted(marks.items(), key=lambda kv: kv[1], reverse=True)

ranked = sort_by_value({"Math": 78, "Physics": 92, "Chemistry": 85, "English": 88})
print(ranked)
print(dict(ranked))        # back to a dict, now in sorted order
```
:::explain
A dict itself isn't "sorted", but you can sort its **items**: `sorted(d.items(), key=…)` returns a list of tuples. Sorting `d` directly would give only the keys, in alphabetical order. `dict(ranked)` rebuilds a dict that keeps this order, because dicts preserve insertion order.
:::complexity
O(n log n).
:::end

:::program basic | Word frequency counter | Practice set
Count each word, keeping first-appearance order.

Input `"data science is fun and data is powerful"` → `{'data': 2, 'science': 1, 'is': 2, 'fun': 1, 'and': 1, 'powerful': 1}`
:::starter
```python norun
def word_freq(sentence):
    # Write your code here
    pass

print(word_freq("data science is fun and data is powerful"))
```
:::tests
```python norun
assert word_freq("data science is fun and data is powerful") == {"data": 2, "science": 1, "is": 2, "fun": 1, "and": 1, "powerful": 1}
assert list(word_freq("b a b")) == ["b", "a"]
assert word_freq("") == {}
```
:::hint
`counts[w] = counts.get(w, 0) + 1`, or `collections.Counter`.
:::solution
```python
from collections import Counter

def word_freq(sentence):
    counts = {}
    for w in sentence.split():            # split() with no argument splits on any whitespace
        counts[w] = counts.get(w, 0) + 1  # missing -> 0, so no KeyError
    return counts

print(word_freq("data science is fun and data is powerful"))
print(Counter("data science is fun and data is powerful".split()).most_common(2))
```
:::explain
The **`get(key, 0) + 1`** idiom is the hand-written counter. `Counter` does the same and adds `.most_common(k)`. `sentence.split()` (no argument) also handles repeated spaces, and `"".split()` returns `[]`, so the empty string gives `{}`.
:::complexity
O(number of words).
:::end

:::program basic | Merge two dictionaries, summing shared keys | Practice set
Return a new dict: keys from both, and quantities added where a key is in both.

Input `{"apple": 10, "banana": 5, "orange": 8}` + `{"banana": 7, "orange": 2, "mango": 12}` → `{'apple': 10, 'banana': 12, 'orange': 10, 'mango': 12}`
:::starter
```python norun
def merge_inventory(store1, store2):
    # Write your code here
    pass

print(merge_inventory({"apple": 10, "banana": 5, "orange": 8}, {"banana": 7, "orange": 2, "mango": 12}))
```
:::tests
```python norun
s1 = {"apple": 10, "banana": 5, "orange": 8}
assert merge_inventory(s1, {"banana": 7, "orange": 2, "mango": 12}) == {"apple": 10, "banana": 12, "orange": 10, "mango": 12}
assert s1 == {"apple": 10, "banana": 5, "orange": 8}
assert merge_inventory({}, {"x": 1}) == {"x": 1}
```
:::hint
Copy the first dict (`dict(store1)`), then add each item of the second with `.get(k, 0)`.
:::solution
```python
from collections import Counter

def merge_inventory(store1, store2):
    merged = dict(store1)                         # a copy: don't change the caller's dict
    for item, qty in store2.items():
        merged[item] = merged.get(item, 0) + qty
    return merged

print(merge_inventory({"apple": 10, "banana": 5, "orange": 8}, {"banana": 7, "orange": 2, "mango": 12}))
print(dict(Counter({"apple": 10, "banana": 5}) + Counter({"banana": 7})))   # Counter adds counts
```
:::explain
`store1 | store2` (Python 3.9+) merges, but on a shared key **the right side wins**: it replaces, it doesn't add. To sum, loop with `.get`. Copying first matters because `merged = store1` would be an **alias**, and you'd change the caller's dict, which the second test checks. `Counter + Counter` adds counts directly, but it drops zero or negative results.
:::complexity
O(n + m).
:::end

:::program basic | Build a dictionary from two lists | Practice set
Pair `keys` with `vals` into a dict.

Input `["id", "name", "role"]`, `[101, "Nadia", "Analyst"]` → `{'id': 101, 'name': 'Nadia', 'role': 'Analyst'}`
:::starter
```python norun
def build(keys, vals):
    # Write your code here
    pass

print(build(["id", "name", "role"], [101, "Nadia", "Analyst"]))
```
:::tests
```python norun
assert build(["id", "name", "role"], [101, "Nadia", "Analyst"]) == {"id": 101, "name": "Nadia", "role": "Analyst"}
assert build([], []) == {}
```
:::solution
```python
def build(keys, vals):
    return dict(zip(keys, vals))

print(build(["id", "name", "role"], [101, "Nadia", "Analyst"]))
```
:::explain
`zip` makes `(key, value)` pairs, and `dict()` accepts any iterable of pairs. That's the whole trick. If the lists have different lengths, `zip` silently stops at the shorter one (use `strict=True` in Python 3.10+ to catch it).
:::complexity
O(n).
:::end

:::program basic | Apply a 10% discount to every price | Practice set
Return a **new** dict with every price reduced by 10%.

Input `{"shirt": 500, "jeans": 1200, "shoes": 2000}` → `{'shirt': 450.0, 'jeans': 1080.0, 'shoes': 1800.0}`
:::starter
```python norun
def discount(prices, pct=10):
    # Write your code here
    pass

print(discount({"shirt": 500, "jeans": 1200, "shoes": 2000}))
```
:::tests
```python norun
p = {"shirt": 500, "jeans": 1200, "shoes": 2000}
assert discount(p) == {"shirt": 450.0, "jeans": 1080.0, "shoes": 1800.0}
assert p["shirt"] == 500
assert discount({"x": 100}, 25) == {"x": 75.0}
```
:::solution
```python
def discount(prices, pct=10):
    factor = 1 - pct / 100
    return {item: round(price * factor, 2) for item, price in prices.items()}

print(discount({"shirt": 500, "jeans": 1200, "shoes": 2000}))
```
:::explain
A **dict comprehension** transforms the values and keeps the keys. `500 * 0.9` is `450.0`, a float. Rounding to 2 decimals guards against binary-float artefacts like `1080.0000000000002`, which would break an equality check. Building a new dict leaves the original prices untouched.
:::complexity
O(n).
:::end

:::program basic | Filter low-stock items | Practice set
Keep only the items with quantity less than `limit` (default 10).

Input `{"pen": 50, "notebook": 4, "eraser": 25, "marker": 2, "ruler": 15}` → `{'notebook': 4, 'marker': 2}`
:::starter
```python norun
def low_stock(stock, limit=10):
    # Write your code here
    pass

print(low_stock({"pen": 50, "notebook": 4, "eraser": 25, "marker": 2, "ruler": 15}))
```
:::tests
```python norun
assert low_stock({"pen": 50, "notebook": 4, "eraser": 25, "marker": 2, "ruler": 15}) == {"notebook": 4, "marker": 2}
assert low_stock({"a": 10}) == {}
```
:::solution
```python
def low_stock(stock, limit=10):
    return {item: qty for item, qty in stock.items() if qty < limit}

print(low_stock({"pen": 50, "notebook": 4, "eraser": 25, "marker": 2, "ruler": 15}))
```
:::explain
A **filtering dict comprehension**: the `if` at the end decides which pairs survive. Never delete keys while looping over the same dict (`RuntimeError: dictionary changed size during iteration`). Building a new dict avoids that problem entirely.
:::complexity
O(n).
:::end

:::program basic | Invert keys and values | Practice set
Swap the keys and values (the values are unique).

Input `{"BD": "Bangladesh", "JP": "Japan", "FR": "France"}` → `{'Bangladesh': 'BD', 'Japan': 'JP', 'France': 'FR'}`
:::starter
```python norun
def invert(codes):
    # Write your code here
    pass

print(invert({"BD": "Bangladesh", "JP": "Japan", "FR": "France"}))
```
:::tests
```python norun
assert invert({"BD": "Bangladesh", "JP": "Japan", "FR": "France"}) == {"Bangladesh": "BD", "Japan": "JP", "France": "FR"}
assert invert({"a": 1, "b": 1}) == {1: "b"}
```
:::solution
```python
def invert(codes):
    return {v: k for k, v in codes.items()}

print(invert({"BD": "Bangladesh", "JP": "Japan", "FR": "France"}))
```
:::explain
Just swap the roles of the two names in the comprehension. Watch out: if two keys share a value, the inverted dict keeps only the **last** one (second test), because keys must be unique. Values must also be **hashable** (no lists) to become keys.
:::complexity
O(n).
:::end

:::program basic | Calculate the total bill | Practice set
Use the `prices` dict and the `order` (item → quantity) to compute the total.

Input `prices = {"tea": 20, "coffee": 50, "cake": 120}`, `order = {"tea": 2, "cake": 1}` → `Total Bill: 160`
:::starter
```python norun
def total_bill(prices, order):
    # Write your code here
    pass

print("Total Bill:", total_bill({"tea": 20, "coffee": 50, "cake": 120}, {"tea": 2, "cake": 1}))
```
:::tests
```python norun
assert total_bill({"tea": 20, "coffee": 50, "cake": 120}, {"tea": 2, "cake": 1}) == 160
assert total_bill({"tea": 20}, {}) == 0
assert raises(KeyError, total_bill, {"tea": 20}, {"pizza": 1})
```
:::solution
```python
def total_bill(prices, order):
    return sum(prices[item] * qty for item, qty in order.items())

print("Total Bill:", total_bill({"tea": 20, "coffee": 50, "cake": 120}, {"tea": 2, "cake": 1}))
```
:::explain
Loop over the **order** (the smaller dict) and look up each price. `sum` of a generator expression does the totalling. Ordering something that isn't on the menu raises `KeyError`, and here that's **good**: failing loudly beats silently charging 0 (the last test).
:::complexity
O(items ordered).
:::end

:::program basic | Averages from a nested dictionary | Practice set
Each student maps to a dict of subject scores. Return `{student: average}`.

Input `{"Amina": {"math": 90, "eng": 80}, "Tariq": {"math": 75, "eng": 85}}` → `{'Amina': 85.0, 'Tariq': 80.0}`
:::starter
```python norun
def averages(students):
    # Write your code here
    pass

print(averages({"Amina": {"math": 90, "eng": 80}, "Tariq": {"math": 75, "eng": 85}}))
```
:::tests
```python norun
assert averages({"Amina": {"math": 90, "eng": 80}, "Tariq": {"math": 75, "eng": 85}}) == {"Amina": 85.0, "Tariq": 80.0}
assert averages({"Solo": {"x": 7}}) == {"Solo": 7.0}
```
:::solution
```python
def averages(students):
    return {name: sum(subj.values()) / len(subj) for name, subj in students.items()}

print(averages({"Amina": {"math": 90, "eng": 80}, "Tariq": {"math": 75, "eng": 85}}))
```
:::explain
With nested dicts, the outer `.items()` gives `(name, inner_dict)`, and the inner dict's `.values()` are the scores. One comprehension flattens the structure into `name → average`. Step through the solution to see each inner dict being read.
:::complexity
O(total scores).
:::end

:::program basic | Reverse lookup: find the key for a value | Practice set
Return the key whose value equals `target`, or `None`.

Input `{"Bangladesh": "Dhaka", "India": "New Delhi", "Japan": "Tokyo"}`, `"Tokyo"` → `Country: Japan`
:::starter
```python norun
def key_for(d, target):
    # Write your code here
    pass

print("Country:", key_for({"Bangladesh": "Dhaka", "India": "New Delhi", "Japan": "Tokyo"}, "Tokyo"))
```
:::tests
```python norun
caps = {"Bangladesh": "Dhaka", "India": "New Delhi", "Japan": "Tokyo"}
assert key_for(caps, "Tokyo") == "Japan"
assert key_for(caps, "Paris") is None
```
:::solution
```python
def key_for(d, target):
    return next((k for k, v in d.items() if v == target), None)

print("Country:", key_for({"Bangladesh": "Dhaka", "India": "New Delhi", "Japan": "Tokyo"}, "Tokyo"))
```
:::explain
Dicts are fast **key → value**, but **value → key** needs a scan (O(n)). `next(generator, default)` returns the **first** match and stops, with `None` if nothing matches. If you do many reverse lookups, invert the dict once (the earlier problem) and get O(1) lookups.
:::complexity
O(n).
:::end

:::program basic | Safe lookup without KeyError | Practice set
Return the counts for the requested keys, using `0` for missing ones.

Input `{"apples": 10, "bananas": 6}`, keys `["apples", "grapes"]` → `apples: 10, grapes: 0`
:::starter
```python norun
def safe_counts(inventory, keys):
    # Write your code here
    pass

print(safe_counts({"apples": 10, "bananas": 6}, ["apples", "grapes"]))   # Expected: {'apples': 10, 'grapes': 0}
```
:::tests
```python norun
inv = {"apples": 10, "bananas": 6}
assert safe_counts(inv, ["apples", "grapes"]) == {"apples": 10, "grapes": 0}
assert "grapes" not in inv
```
:::solution
```python
def safe_counts(inventory, keys):
    return {k: inventory.get(k, 0) for k in keys}

result = safe_counts({"apples": 10, "bananas": 6}, ["apples", "grapes"])
print(", ".join(f"{k}: {v}" for k, v in result.items()))
```
:::explain
`d[k]` raises `KeyError` for a missing key, and `d.get(k, default)` returns the default instead. Unlike `setdefault` or a `defaultdict`, **`get` doesn't insert anything**, so the inventory stays clean (second test).
:::complexity
O(len(keys)).
:::end

:::program basic | Remove empty or None entries | Practice set
Drop keys whose value is `None` or an empty string `""`. Keep `0` and `False`!

Input `{"name": "Sam", "email": None, "city": "Dhaka", "phone": ""}` → `{'name': 'Sam', 'city': 'Dhaka'}`
:::starter
```python norun
def clean_profile(profile):
    # Write your code here
    pass

print(clean_profile({"name": "Sam", "email": None, "city": "Dhaka", "phone": ""}))
```
:::tests
```python norun
assert clean_profile({"name": "Sam", "email": None, "city": "Dhaka", "phone": ""}) == {"name": "Sam", "city": "Dhaka"}
assert clean_profile({"age": 0, "verified": False}) == {"age": 0, "verified": False}
```
:::hint
`if v` would also drop `0` and `False`. Test for exactly the unwanted values.
:::solution
```python
def clean_profile(profile):
    return {k: v for k, v in profile.items() if v is not None and v != ""}

print(clean_profile({"name": "Sam", "email": None, "city": "Dhaka", "phone": ""}))
```
:::explain
The tempting `{k: v for k, v in d.items() if v}` removes every **falsy** value: `None` and `""`, but also `0`, `False` and `[]`. An age of 0 or a `False` flag is real data! Be explicit: `v is not None` (use `is` for `None`) and `v != ""`. The second test catches the truthiness bug.
:::complexity
O(n).
:::end

:::program medium | Group words by their first letter | Practice set
Return `{letter: [words…]}`, keeping the words' original order.

Input `["apple", "ant", "banana", "bat", "cat"]` → `{'a': ['apple', 'ant'], 'b': ['banana', 'bat'], 'c': ['cat']}`
:::starter
```python norun
def group_by_letter(words):
    # Write your code here
    pass

print(group_by_letter(["apple", "ant", "banana", "bat", "cat"]))
```
:::tests
```python norun
assert group_by_letter(["apple", "ant", "banana", "bat", "cat"]) == {"a": ["apple", "ant"], "b": ["banana", "bat"], "c": ["cat"]}
assert group_by_letter([]) == {}
assert type(group_by_letter(["x"])) is dict
```
:::hint
`groups.setdefault(w[0], []).append(w)`, or a `defaultdict(list)`.
:::solution
```python
from collections import defaultdict

def group_by_letter(words):
    groups = {}
    for w in words:
        groups.setdefault(w[0], []).append(w)   # create the list the first time, then reuse it
    return groups

def group_by_letter_dd(words):
    groups = defaultdict(list)                 # missing keys start as []
    for w in words:
        groups[w[0]].append(w)
    return dict(groups)

print(group_by_letter(["apple", "ant", "banana", "bat", "cat"]))
print(group_by_letter_dd(["apple", "ant", "banana", "bat", "cat"]))
```
:::explain
**Grouping** is one of the most common dict jobs. `setdefault(key, [])` returns the existing list, or inserts and returns a new empty one, so `.append` always has a list to work on. `defaultdict(list)` does the same automatically. Convert back with `dict(...)` so a lookup on a missing key can't silently create one.
:::complexity
O(n).
:::end

:::program basic | Top 2 highest-paid employees | Practice set
Return the top `k` `(name, salary)` pairs, highest first.

Input `{"Zara": 55000, "Kabir": 72000, "Mina": 64000, "Rafi": 48000, "Sadia": 81000}` → `[('Sadia', 81000), ('Kabir', 72000)]`
:::starter
```python norun
def top_paid(salaries, k=2):
    # Write your code here
    pass

print(top_paid({"Zara": 55000, "Kabir": 72000, "Mina": 64000, "Rafi": 48000, "Sadia": 81000}))
```
:::tests
```python norun
s = {"Zara": 55000, "Kabir": 72000, "Mina": 64000, "Rafi": 48000, "Sadia": 81000}
assert top_paid(s) == [("Sadia", 81000), ("Kabir", 72000)]
assert top_paid(s, 1) == [("Sadia", 81000)]
assert top_paid({}, 2) == []
```
:::solution
```python
import heapq

def top_paid(salaries, k=2):
    return sorted(salaries.items(), key=lambda kv: kv[1], reverse=True)[:k]

print(top_paid({"Zara": 55000, "Kabir": 72000, "Mina": 64000, "Rafi": 48000, "Sadia": 81000}))
print(heapq.nlargest(2, {"Zara": 55000, "Sadia": 81000, "Kabir": 72000}.items(), key=lambda kv: kv[1]))
```
:::explain
Sort the items by value in descending order, then **slice `[:k]`** to take the first k. For a small k from a big dict, `heapq.nlargest(k, items, key=...)` is O(n log k) instead of O(n log n). Slicing beyond the end is safe: `[][:2]` is `[]`.
:::complexity
O(n log n), or O(n log k) with heapq.
:::end
