# Sets & Frozensets

A **set** is an **unordered** collection of **unique**, hashable items with average **O(1)** membership tests. It's a dict with keys but no values. Its superpowers are lightning-fast `x in s`, automatic de-duplication, and mathematical **set algebra** (union, intersection, difference). A **frozenset** is the immutable, hashable version.

:::analogy A guest list at the door
The bouncer doesn't scan a long queue to check whether you're invited. They look you up in a hashed guest list, instantly. And nobody can be on the list twice. Two parties' lists can be combined (union), compared for shared guests (intersection), or subtracted (difference).
:::

## 1. Creating sets

```python
a = {1, 2, 3, 2, 1}               # duplicates vanish
b = set([3, 4, 5])
c = set("mississippi")            # unique characters
d = {x % 3 for x in range(10)}    # set comprehension
empty = set()                     # NOT {} — that's an empty dict!
print(a, b, c, d, type({}).__name__, type(empty).__name__)
```

:::trap `{}` is a dict
An empty set must be written `set()`. Also, `set("hello")` gives characters, `{'h', 'e', 'l', 'o'}`, not `{"hello"}`.
:::

## 2. The four core operations

```python
A = {1, 2, 3, 4}
B = {3, 4, 5, 6}
print(A | B, A.union(B))                     # union: in either
print(A & B, A.intersection(B))              # intersection: in both
print(A - B, A.difference(B))                # difference: in A, not B
print(A ^ B, A.symmetric_difference(B))      # symmetric difference: in exactly one
print(A.union([9, 9], range(2)))             # METHODS accept any iterable; operators need sets
```

```text
   A          B
 ┌─────┬───┬─────┐
 │ 1 2 │3 4│ 5 6 │      A | B = {1..6}   A & B = {3,4}
 └─────┴───┴─────┘      A - B = {1,2}    A ^ B = {1,2,5,6}
```

## 3. All the set methods

| Method | Operator | In-place version |
|---|---|---|
| `union(*its)` | `\|` | `update` / `\|=` |
| `intersection(*its)` | `&` | `intersection_update` / `&=` |
| `difference(*its)` | `-` | `difference_update` / `-=` |
| `symmetric_difference(it)` | `^` | `symmetric_difference_update` / `^=` |
| `issubset(it)` | `<=` (`<` proper) | |
| `issuperset(it)` | `>=` (`>` proper) | |
| `isdisjoint(it)` | | |
| `add(x)` | | |
| `remove(x)` | | KeyError if missing |
| `discard(x)` | | no error if missing |
| `pop()` | | removes an arbitrary element |
| `clear()`, `copy()` | | |

```python
s = {1, 2}
s.add(3); s.update([4, 5], {6})
s.discard(99)                 # silent
s.remove(1)                   # KeyError if absent
print(s, s.pop() in {2, 3, 4, 5, 6}, len(s))
print({1, 2} <= {1, 2, 3}, {1, 2} < {1, 2}, {1, 2}.isdisjoint({3}))
```

## 4. Membership: the core superpower

```python
import timeit
data_list = list(range(100_000))
data_set = set(data_list)
print("list:", round(timeit.timeit(lambda: 99_999 in data_list, number=200), 4), "s")
print("set: ", round(timeit.timeit(lambda: 99_999 in data_set, number=200), 4), "s")
```

`x in list` scans every element (O(n)). `x in set` hashes `x` and jumps straight to a slot (O(1) on average). In a loop, that's the difference between O(n²) and O(n).

## 5. Unordered: what that really means

```python
s = {"banana", "apple", "cherry"}
print(s)                       # some order, but not insertion order and not sorted
print(sorted(s))               # sort explicitly when the order matters
nums = {5, 1, 3}
print(nums)                    # small ints often LOOK sorted: an implementation detail
```

Don't rely on set iteration order. String hashing is randomised per process (`PYTHONHASHSEED`), so the order can change between runs. To dedupe **while preserving order**, use `list(dict.fromkeys(items))`.

## 6. Frozenset: the immutable set

```python
fs = frozenset([1, 2, 3])
print(fs | {4}, hash(fs) == hash(frozenset([3, 2, 1])))
groups = {frozenset({"ada", "bob"}): "team red"}        # a set as a dict KEY
print(groups[frozenset({"bob", "ada"})])                 # order doesn't matter
set_of_sets = {frozenset({1, 2}), frozenset({2, 1}), frozenset({3})}
print(set_of_sets)                                       # sets of sets need frozensets
try:
    fs.add(4)
except AttributeError as e:
    print("AttributeError:", e)
```

## 7. Set vs list vs dict vs tuple

| | list | tuple | set | dict |
|---|---|---|---|---|
| Ordered | ✓ | ✓ | ✗ | ✓ (insertion) |
| Duplicates | ✓ | ✓ | ✗ | unique keys |
| Mutable | ✓ | ✗ | ✓ (frozenset ✗) | ✓ |
| `in` | O(n) | O(n) | **O(1)** | **O(1)** keys |
| Indexing | ✓ | ✓ | ✗ | by key |
| Hashable | ✗ | ✓* | frozenset ✓ | ✗ |

## 8. Advanced patterns

```python
emails = ["A@x.com", "b@y.com", "a@x.com", "c@z.com", "B@y.com"]
print(list(dict.fromkeys(e.lower() for e in emails)))     # dedupe preserving order

def has_duplicates(xs):
    return len(xs) != len(set(xs))
print(has_duplicates([1, 2, 3]), has_duplicates([1, 2, 1]))

graph = {"A": {"B", "C"}, "B": {"D"}, "C": {"D"}, "D": set(), "E": {"A"}}
def reachable(start):
    seen, stack = set(), [start]
    while stack:
        node = stack.pop()
        if node not in seen:
            seen.add(node)
            stack.extend(graph[node] - seen)
    return seen
print(sorted(reachable("A")), sorted(reachable("E")))

followers = {"ada": {"bob", "cy"}, "bob": {"cy", "dee"}}
print(followers["ada"] & followers["bob"])       # mutual connections
```

## 9. ML use cases

```python
train_text = "the cat sat on the mat"
test_text = "the dog sat on a log"
train_vocab, test_vocab = set(train_text.split()), set(test_text.split())
print("OOV words:", test_vocab - train_vocab)                 # out-of-vocabulary
print("coverage:", len(test_vocab & train_vocab) / len(test_vocab))

def jaccard(a, b):
    return len(a & b) / len(a | b) if a | b else 1.0
print(round(jaccard(train_vocab, test_vocab), 3))

train_ids, test_ids = {1, 2, 3, 4}, {4, 5, 6}
assert train_ids.isdisjoint(test_ids) is False   # LEAKAGE check: id 4 is in both!
print("leaked ids:", train_ids & test_ids)

features_a = {"age", "income", "zip"}
features_b = {"age", "income", "score"}
print("common:", sorted(features_a & features_b), "only in A:", features_a - features_b)
```

## Tricks & tips

- `set(a) & set(b)` finds common elements in O(n + m).
- `len(set(xs)) == len(xs)` tests "all unique".
- `seen = set()` with `if x in seen: …; seen.add(x)` is the universal "have I seen this?" pattern.
- `s1 <= s2` tests subset; `s1.isdisjoint(s2)` tests for no overlap without building the intersection.
- Use `frozenset` for dict keys that are unordered groups (pairs of friends, sets of features).
- `set.intersection(*list_of_sets)` intersects many sets at once.
- `{c for c in s if c.isalpha()}` keeps unique letters.

## The 10 most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | `{}` is a dict | `set()` |
| 2 | Relying on set order | `sorted()` |
| 3 | Unhashable members (`{[1, 2]}`) | tuples / frozensets |
| 4 | `remove` on a missing item → KeyError | `discard` |
| 5 | Operators with non-sets (`{1} \| [2]`) → TypeError | use methods (`union`) |
| 6 | `set("word")` splits characters | `{"word"}` |
| 7 | Modifying a set while iterating → RuntimeError | iterate a copy |
| 8 | Dedupe with `set()` loses order | `dict.fromkeys` |
| 9 | `1`, `1.0` and `True` collapse into one element | consistent types |
| 10 | Mutable objects with custom `__hash__` that changes | hash immutable state |

## Practice problems

:::problem basic | Contains duplicate | set size
Return True if any value appears at least twice (LeetCode 217). Write a one-liner and an early-exit version.
:::solution
```python
def has_dup_oneliner(nums):
    return len(set(nums)) < len(nums)

def has_dup_early(nums):
    seen = set()
    for x in nums:
        if x in seen:
            return True       # stop at the FIRST duplicate
        seen.add(x)
    return False

for case in [[1, 2, 3, 1], [1, 2, 3, 4], []]:
    print(case, has_dup_oneliner(case), has_dup_early(case))
```
:::explain
The one-liner always builds the whole set. The early-exit version stops at the first repeat, which is much faster when a duplicate appears early in a huge input. Both are O(n) in the worst case.
:::end

:::problem basic | Intersection of two arrays | set &
Return the unique elements common to both lists (LeetCode 349), and then the version **with multiplicity**: `[1,2,2,1]` and `[2,2]` → `[2,2]` (LeetCode 350).
:::solution
```python
from collections import Counter

def intersection(a, b):
    return sorted(set(a) & set(b))

def intersect_with_counts(a, b):
    return sorted((Counter(a) & Counter(b)).elements())

print(intersection([4, 9, 5], [9, 4, 9, 8, 4]), intersect_with_counts([1, 2, 2, 1], [2, 2]))
```
:::explain
A set intersection drops duplicates. When counts matter, `Counter & Counter` takes the **minimum** count of each element (a **multiset** intersection), and `.elements()` expands it back out.
:::end

:::problem basic | Pangram check | set subset
A pangram uses every letter a–z at least once. Check it with a set subset test, and list the missing letters.
:::solution
```python
import string

def missing_letters(sentence):
    return set(string.ascii_lowercase) - set(sentence.lower())

for s in ["The quick brown fox jumps over the lazy dog", "Hello world"]:
    miss = missing_letters(s)
    print(not miss, "".join(sorted(miss)))
print(set(string.ascii_lowercase) <= set("The quick brown fox jumps over the lazy dog".lower()))
```
:::explain
"Every letter appears" is exactly "the alphabet is a **subset** of the sentence's characters" (`<=`). The difference gives the missing letters for free.
:::end

:::problem medium | Happy number | cycle detection with a set
A number is happy if repeatedly replacing it with the sum of the squares of its digits eventually reaches 1 (LeetCode 202). Detect the non-happy cycle with a set.
:::solution
```python
def is_happy(n):
    seen = set()
    while n != 1 and n not in seen:
        seen.add(n)
        n = sum(int(d) ** 2 for d in str(n))
    return n == 1

print([n for n in range(1, 30) if is_happy(n)])
```
:::explain
If we ever revisit a number, we're in a loop that will never reach 1. The `seen` set detects that in O(1) per step. (An O(1)-space alternative is Floyd's cycle detection, which you'll meet in *Linked Lists*.)
:::end

:::problem medium | Find the town judge | set algebra on relations
In a town of `n` people (1..n), `trust` pairs `[a, b]` mean a trusts b. The judge trusts nobody and is trusted by everyone else (LeetCode 997). Solve it with sets.
:::solution
```python
from collections import defaultdict

def find_judge(n, trust):
    trusts_someone = {a for a, _ in trust}
    trusted_by = defaultdict(set)
    for a, b in trust:
        trusted_by[b].add(a)
    candidates = set(range(1, n + 1)) - trusts_someone
    for c in candidates:
        if trusted_by[c] == set(range(1, n + 1)) - {c}:
            return c
    return -1

print(find_judge(3, [[1, 3], [2, 3]]), find_judge(3, [[1, 3], [2, 3], [3, 1]]), find_judge(1, []))
```
:::explain
The judge must be in "people who trust nobody" (a set difference), and their trusters must equal "everyone except them" (set equality). Reading the conditions as set algebra makes the solution almost a direct translation of the statement. An O(n) counting version uses `indegree - outdegree == n - 1`.
:::end

:::problem medium | Word ladder neighbours | sets for fast lookup
Given a word list, generate all words that differ from `word` by exactly one letter **and** are in the list, in O(L·26) per word instead of comparing against every word.
:::solution
```python
import string

def neighbors(word, wordset):
    out = []
    for i in range(len(word)):
        for ch in string.ascii_lowercase:
            if ch != word[i]:
                cand = word[:i] + ch + word[i + 1:]
                if cand in wordset:
                    out.append(cand)
    return out

words = {"hot", "dot", "dog", "lot", "log", "cog", "hit"}
print(neighbors("hot", words), neighbors("dog", words))
```
:::explain
Comparing against every word is O(N·L). Generating the 25·L possible one-letter edits and checking each in an O(1) **set** is O(26·L), independent of the dictionary size. That's the inner loop of the BFS solution to Word Ladder (LeetCode 127), covered in *Graphs*.
:::end

:::problem hard | Minimum window containing all characters | set/Counter + sliding window
Return the smallest substring of `s` containing every character of `t` with multiplicity (LeetCode 76): `s="ADOBECODEBANC", t="ABC"` → `"BANC"`.
:::solution
```python
from collections import Counter

def min_window(s, t):
    need = Counter(t)
    missing = len(t)                  # characters still needed (with multiplicity)
    left = 0
    best = (float("inf"), 0, 0)
    for right, ch in enumerate(s):
        if need[ch] > 0:
            missing -= 1
        need[ch] -= 1                 # negative = surplus inside the window
        if missing == 0:
            while need[s[left]] < 0:  # shrink while the left char is surplus
                need[s[left]] += 1
                left += 1
            if right - left + 1 < best[0]:
                best = (right - left + 1, left, right + 1)
            need[s[left]] += 1        # give up the left char to look for a smaller window
            missing += 1
            left += 1
    return s[best[1]:best[2]] if best[0] != float("inf") else ""

print(min_window("ADOBECODEBANC", "ABC"), repr(min_window("a", "aa")), min_window("aa", "aa"))
```
:::explain
Expand `right` until the window covers `t` (`missing == 0`), then shrink `left` past characters we have in surplus (`need < 0`). Record the window, then deliberately drop one required character to search for a smaller valid window further right. Each index enters and leaves once: O(|s| + |t|). The `need` counter is a multiset that tracks surplus and deficit at once.
:::end

:::problem hard | Deduplicate unordered pairs and groups | frozenset keys
Given friendship pairs that may appear as both `(a, b)` and `(b, a)`, count the unique friendships. Then, given "chat rooms" as lists of members (in any order, with duplicates), count the distinct groups and how often each occurs.
:::solution
```python
from collections import Counter

pairs = [("ada", "bob"), ("bob", "ada"), ("cy", "dee"), ("dee", "cy"), ("ada", "cy")]
unique_pairs = {frozenset(p) for p in pairs}
print(len(unique_pairs), sorted(tuple(sorted(p)) for p in unique_pairs))

rooms = [["ada", "bob", "cy"], ["cy", "ada", "bob"], ["bob", "bob", "ada"], ["ada", "bob"]]
group_counts = Counter(frozenset(r) for r in rooms)
for group, n in group_counts.most_common():
    print(sorted(group), n)
```
:::explain
A `frozenset` is order-insensitive **and** hashable, so it's a perfect canonical key for "unordered group" data. `["bob", "bob", "ada"]` and `["ada", "bob"]` collapse to the same group. Use `tuple(sorted(...))` instead if duplicates within a group must be preserved.
:::end

:::problem hard | Connected components with set merging | sets, graph reasoning
Given edges between items, compute the connected components (groups of transitively linked items) by **merging sets**: start with each node in its own set, and for each edge, merge the two nodes' sets. Return the components sorted by size.
:::solution
```python
def components(nodes, edges):
    owner = {n: {n} for n in nodes}          # node -> the set object it belongs to
    for a, b in edges:
        sa, sb = owner[a], owner[b]
        if sa is sb:
            continue
        if len(sa) < len(sb):                 # merge the smaller into the larger
            sa, sb = sb, sa
        sa |= sb
        for n in sb:
            owner[n] = sa
    unique = {id(s): s for s in owner.values()}
    return sorted((sorted(s) for s in unique.values()), key=len, reverse=True)

nodes = "ABCDEFGH"
edges = [("A", "B"), ("B", "C"), ("D", "E"), ("F", "F"), ("C", "A"), ("G", "H"), ("E", "H")]
print(components(nodes, edges))
```
:::explain
Every node points at the **set object** of its component, and merging moves the smaller set's members into the larger one ("union by size"). Each node moves O(log n) times at most, because every move at least doubles the size of its set: O(n log n + E) total. The `is` check avoids merging a set with itself. The faster near-O(1) structure for this, **Union-Find**, is covered in *Graphs*.
:::end
