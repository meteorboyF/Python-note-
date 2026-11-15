# Recursion & Backtracking

**Recursion** solves a problem by solving smaller copies of itself. **Backtracking** is recursion that **explores choices**: make a choice, recurse, **undo** the choice, try the next. It systematically walks a **decision tree** and prunes branches that can't succeed. Subsets, permutations, combinations, N-Queens, Sudoku, word search and parsing all follow one template.

:::analogy Exploring a maze with a ball of string
At each junction you pick a corridor and unroll your string as you go. Hit a dead end? Wind the string back to the last junction (**backtrack**) and try the next corridor. The string is your call stack, and winding it back is the "undo" step.
:::

## 1. Recursion fundamentals

Every recursive function needs:

1. **Base case(s)**: the smallest inputs, answered directly.
2. **Recursive case**: reduce the problem toward a base case.
3. **Trust** ("the leap of faith"): assume the recursive call is correct for smaller inputs, and use its result.

```python
def sum_list(xs):
    if not xs:                      # base case
        return 0
    return xs[0] + sum_list(xs[1:]) # smaller problem

def power(x, n):                    # fast exponentiation: O(log n)
    if n == 0:
        return 1
    half = power(x, n // 2)
    return half * half * (x if n % 2 else 1)

def is_palindrome(s):
    return len(s) < 2 or (s[0] == s[-1] and is_palindrome(s[1:-1]))

print(sum_list([1, 2, 3, 4]), power(2, 30), is_palindrome("racecar"), is_palindrome("ab"))
```

:::trace
`power(2, 5)`:
| Call | half | Returns |
|---|---|---|
| power(2, 5) | power(2, 2) = 4 | 4·4·2 = **32** |
| power(2, 2) | power(2, 1) = 2 | 2·2·1 = 4 |
| power(2, 1) | power(2, 0) = 1 | 1·1·2 = 2 |
| power(2, 0) | — | 1 (base) |
:::

### Recursion trees and the call stack

```python
def fib(n, depth=0):
    print("  " * depth + f"fib({n})")
    if n < 2:
        return n
    return fib(n - 1, depth + 1) + fib(n - 2, depth + 1)

fib(4)
```

The printout **is** the recursion tree. Notice `fib(2)` is computed twice, and for larger n, exponentially many times. That's the overlap dynamic programming removes.

:::trap Slicing in recursion is O(n) per call
`sum_list(xs[1:])` copies the list each time, so the total is O(n²). Pass an index instead: `def f(xs, i=0)`. And mind the ~1000-frame recursion limit.
:::

## 2. The backtracking template

```python norun
def backtrack(state, choices):
    if is_solution(state):
        record(state)          # copy it! (state is mutated later)
        return
    for choice in choices:
        if not valid(choice, state):
            continue           # PRUNE
        make(choice, state)    # choose
        backtrack(state, next_choices)
        undo(choice, state)    # un-choose (backtrack)
```

## 3. Subsets, combinations, permutations

```python
def subsets(nums):
    out, path = [], []
    def bt(start):
        out.append(path[:])                 # every node of the tree is a subset
        for i in range(start, len(nums)):
            path.append(nums[i])
            bt(i + 1)
            path.pop()                      # undo
    bt(0)
    return out

def combinations(n, k):
    out, path = [], []
    def bt(start):
        if len(path) == k:
            out.append(path[:]); return
        for i in range(start, n + 1):
            if n - i + 1 < k - len(path):   # prune: not enough numbers left
                break
            path.append(i); bt(i + 1); path.pop()
    bt(1)
    return out

def permutations(nums):
    out, path, used = [], [], [False] * len(nums)
    def bt():
        if len(path) == len(nums):
            out.append(path[:]); return
        for i, x in enumerate(nums):
            if used[i]:
                continue
            used[i] = True; path.append(x)
            bt()
            path.pop(); used[i] = False
    bt()
    return out

print(subsets([1, 2, 3]))
print(combinations(4, 2))
print(permutations([1, 2, 3]))
```

```text
Subsets decision tree for [1,2,3]  (start index moves forward → no duplicates)
                 []
        /        |       \
      [1]       [2]      [3]
     /   \       |
  [1,2] [1,3]  [2,3]
    |
 [1,2,3]
```

| Problem | Count | Template detail |
|---|---|---|
| Subsets | 2ⁿ | record at every node; `start` index |
| Combinations C(n, k) | n!/(k!(n−k)!) | record at depth k; `start` index |
| Permutations | n! | record at depth n; a `used[]` array |

:::trap Appending `path` instead of `path[:]`
`out.append(path)` stores a **reference** to the one list you keep mutating. At the end, every entry is the same (usually empty) list. Always append a copy: `path[:]` or `list(path)`.
:::

## 4. Handling duplicates

```python
def subsets_with_dup(nums):
    nums.sort()                               # put duplicates next to each other
    out, path = [], []
    def bt(start):
        out.append(path[:])
        for i in range(start, len(nums)):
            if i > start and nums[i] == nums[i - 1]:
                continue                      # skip a duplicate choice at the SAME tree level
            path.append(nums[i]); bt(i + 1); path.pop()
    bt(0)
    return out

print(subsets_with_dup([1, 2, 2]))
```

## 5. Constraint problems: N-Queens

```python
def solve_n_queens(n):
    cols, diag1, diag2 = set(), set(), set()
    board, out = [], []
    def bt(r):
        if r == n:
            out.append(["." * c + "Q" + "." * (n - c - 1) for c in board])
            return
        for c in range(n):
            if c in cols or (r - c) in diag1 or (r + c) in diag2:
                continue                      # attacked: prune
            cols.add(c); diag1.add(r - c); diag2.add(r + c); board.append(c)
            bt(r + 1)
            cols.remove(c); diag1.remove(r - c); diag2.remove(r + c); board.pop()
    bt(0)
    return out

sols = solve_n_queens(6)
print(len(sols), "solutions for 6 queens; first:")
print("\n".join(sols[0]))
print([len(solve_n_queens(n)) for n in range(1, 9)])
```

:::tip O(1) conflict checks with diagonal ids
Squares on the same ↘ diagonal share `r - c`, and squares on the same ↙ diagonal share `r + c`. Three sets make the "is this square attacked?" check O(1), turning a slow board scan into instant pruning.
:::

## 6. Grid search: word search

```python
def exist(board, word):
    R, C = len(board), len(board[0])
    def dfs(r, c, i):
        if i == len(word):
            return True
        if not (0 <= r < R and 0 <= c < C) or board[r][c] != word[i]:
            return False
        ch, board[r][c] = board[r][c], "#"        # mark as visited (choose)
        found = any(dfs(r + dr, c + dc, i + 1) for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        board[r][c] = ch                           # restore (un-choose)
        return found
    return any(dfs(r, c, 0) for r in range(R) for c in range(C))

grid = [list("ABCE"), list("SFCS"), list("ADEE")]
print(exist(grid, "ABCCED"), exist(grid, "SEE"), exist(grid, "ABCB"))
```

## 7. Divide and conquer

Recursion that **splits** the input into independent parts and **combines** the results: merge sort, quicksort, binary search, closest pair of points, Karatsuba multiplication.

```python
def max_crossing_subarray(xs):              # O(n log n) divide-and-conquer max subarray
    if len(xs) == 1:
        return xs[0]
    mid = len(xs) // 2
    left_best = max_crossing_subarray(xs[:mid])
    right_best = max_crossing_subarray(xs[mid:])
    s, best_left = 0, float("-inf")
    for x in reversed(xs[:mid]):            # the best sum ending at mid-1
        s += x; best_left = max(best_left, s)
    s, best_right = 0, float("-inf")
    for x in xs[mid:]:                      # the best sum starting at mid
        s += x; best_right = max(best_right, s)
    return max(left_best, right_best, best_left + best_right)

print(max_crossing_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]))
```

## Tricks & tips

- Write the base case **first**, and test the recursion on the smallest inputs.
- Backtracking state should be mutated and **restored**. Record **copies**.
- Prune early: sort the input to break out of loops sooner and to skip duplicates.
- `functools.cache` turns exponential recursion with repeated subproblems into DP.
- `sys.setrecursionlimit` is a last resort. Converting to an explicit stack is safer.
- `itertools.permutations/combinations/product` are fast C implementations when you don't need pruning.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Missing or unreachable base case → RecursionError | test the smallest inputs |
| 2 | `out.append(path)` instead of a copy | `path[:]` |
| 3 | Forgetting to undo the choice | symmetric choose/un-choose |
| 4 | Duplicate results with repeated input values | sort + skip `i > start and same` |
| 5 | Slicing at every level (O(n) copies) | indices |
| 6 | Mutable default arguments in recursive helpers | inner closures |
| 7 | Exponential blow-up without pruning | constraint checks before recursing |
| 8 | Visited marks not restored in grid DFS | restore after exploring |
| 9 | Using a global counter without `nonlocal` | `nonlocal` / return values |
| 10 | Deep recursion on big inputs | iterative + explicit stack |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python
def f(n):
    if n == 0:
        return ""
    return f(n - 1) + str(n) + f(n - 1)
print(f(3))
```
What prints?
- [x] `1213121`
- [ ] `123`
- [ ] `3212123`
`f(1) = "1"`, `f(2) = "1"+"2"+"1" = "121"`, and `f(3) = "121"+"3"+"121"`. The call tree has 2ⁿ − 1 nodes: this is the shape of the Tower of Hanoi solution.
:::

:::quiz
```python
res = []
def go(path, rest):
    if not rest:
        res.append(path)
        return
    for i in range(len(rest)):
        go(path + rest[i], rest[:i] + rest[i + 1:])
go("", "abc")
print(len(res), res[3])
```
What prints?
- [ ] `6 cab`
- [x] `6 bca`
- [ ] `9 bca`
There are 3! = 6 permutations, generated in order `abc, acb, bac, bca, cab, cba`, so index 3 is `bca`. Passing new strings (`path + …`) means nothing needs undoing on the way back.
:::

:::quiz
```python
import sys
def depth(n):
    return 0 if n == 0 else 1 + depth(n - 1)
print(sys.getrecursionlimit() >= 1000, depth(500))
```
What prints?
- [x] `True 500`
- [ ] `False 500`
- [ ] `RecursionError`
The default recursion limit is 1000 frames, so depth 500 is fine. `depth(5000)` would raise `RecursionError`, which is why deep recursions in Python are often rewritten with an explicit stack.
:::

## Practice problems

:::problem basic | Letter combinations of a phone number | backtracking over mapping
Return every letter combination a digit string could represent on a phone keypad (LeetCode 17).
:::solution
```python
KEYS = {"2": "abc", "3": "def", "4": "ghi", "5": "jkl", "6": "mno", "7": "pqrs", "8": "tuv", "9": "wxyz"}

def letter_combinations(digits):
    if not digits:
        return []
    out = []
    def bt(i, path):
        if i == len(digits):
            out.append(path); return
        for ch in KEYS[digits[i]]:
            bt(i + 1, path + ch)          # strings are immutable: no undo needed
    bt(0, "")
    return out

print(letter_combinations("23"), len(letter_combinations("79")))
```
:::explain
Each digit is one level of the decision tree, and its letters are the branches. Passing `path + ch` creates a new string per call, so there's nothing to undo. The trade-off is O(n) copying per call, which is fine for short inputs. `itertools.product(*[KEYS[d] for d in digits])` is the one-liner equivalent.
:::end

:::problem basic | Generate binary strings without consecutive 1s | pruned recursion
List all binary strings of length n with no two adjacent `1`s. Count them for n = 1..10 and notice the pattern.
:::solution
```python
def no_adjacent_ones(n):
    out = []
    def bt(s):
        if len(s) == n:
            out.append(s); return
        bt(s + "0")
        if not s.endswith("1"):          # prune: can't place 1 after 1
            bt(s + "1")
    bt("")
    return out

print(no_adjacent_ones(3))
print([len(no_adjacent_ones(n)) for n in range(1, 11)])
```
:::explain
The pruning rule stops invalid prefixes immediately instead of generating all 2ⁿ strings and filtering. The counts 2, 3, 5, 8, 13, … are **Fibonacci numbers**: a string of length n ends in 0 (any valid string of length n−1, then 0) or in 01 (any valid string of length n−2, then 01).
:::end

:::problem medium | Combination sum | reuse allowed, pruning by sorting
Find all unique combinations of `candidates` (distinct positives) that sum to `target`, where each number may be reused unlimited times (LeetCode 39).
:::solution
```python
def combination_sum(candidates, target):
    candidates.sort()
    out, path = [], []
    def bt(start, remaining):
        if remaining == 0:
            out.append(path[:]); return
        for i in range(start, len(candidates)):
            c = candidates[i]
            if c > remaining:
                break                     # sorted: every later c is too big too
            path.append(c)
            bt(i, remaining - c)          # i, not i+1: reuse allowed
            path.pop()
    bt(0, target)
    return out

print(combination_sum([2, 3, 6, 7], 7), combination_sum([2, 3, 5], 8))
```
:::explain
Passing `i` (not `i + 1`) allows reusing the same number, and the `start` index forbids going backwards, which prevents permutations of the same combination (`[2,2,3]` vs `[3,2,2]`). Sorting enables the `break`: once a candidate exceeds the remainder, all later ones do too.
:::end

:::problem medium | Palindrome partitioning | backtracking with a precomputed table
Partition a string so that every part is a palindrome, and return all such partitions (LeetCode 131).
:::solution
```python
def partition(s):
    n = len(s)
    is_pal = [[False] * n for _ in range(n)]
    for i in range(n - 1, -1, -1):            # DP table: is_pal[i][j] for s[i..j]
        for j in range(i, n):
            is_pal[i][j] = s[i] == s[j] and (j - i < 2 or is_pal[i + 1][j - 1])
    out, path = [], []
    def bt(start):
        if start == n:
            out.append(path[:]); return
        for end in range(start, n):
            if is_pal[start][end]:
                path.append(s[start:end + 1])
                bt(end + 1)
                path.pop()
    bt(0)
    return out

print(partition("aab"), len(partition("aaaa")))
```
:::explain
Backtracking chooses where the next piece ends. Precomputing `is_pal` with DP makes each validity check O(1) instead of O(n): a nice combination of the two techniques. Every string has 2ⁿ⁻¹ ways to cut it, so the output can be exponential, which is unavoidable.
:::end

:::problem medium | Permutations of a string with duplicates | counter-based backtracking
Return all **unique** permutations of `"aabc"` without generating duplicates in the first place (no `set` at the end).
:::solution
```python
from collections import Counter

def unique_perms(s):
    counts = Counter(s)
    out, path = [], []
    def bt():
        if len(path) == len(s):
            out.append("".join(path)); return
        for ch in counts:                   # each DISTINCT char once per level
            if counts[ch]:
                counts[ch] -= 1; path.append(ch)
                bt()
                path.pop(); counts[ch] += 1
    bt()
    return out

res = unique_perms("aabc")
print(len(res), res[:6])
```
:::explain
Iterating over **distinct** characters (the Counter's keys) at each level means two identical `a`s can never start equivalent branches. The count `4!/2! = 12` matches the unique permutations exactly, with no wasted work and no dedupe step.
:::end

:::problem hard | Sudoku solver | constraint backtracking with bitsets
Solve a 9×9 Sudoku (LeetCode 37). Use sets for row/col/box constraints and pick the **most constrained** empty cell first (MRV heuristic).
:::solution
```python
def solve_sudoku(board):
    rows = [set() for _ in range(9)]; cols = [set() for _ in range(9)]; boxes = [set() for _ in range(9)]
    empty = []
    for r in range(9):
        for c in range(9):
            v = board[r][c]
            if v == ".":
                empty.append((r, c))
            else:
                rows[r].add(v); cols[c].add(v); boxes[r // 3 * 3 + c // 3].add(v)
    digits = set("123456789")

    def options(r, c):
        return digits - rows[r] - cols[c] - boxes[r // 3 * 3 + c // 3]

    def bt():
        if not empty:
            return True
        k = min(range(len(empty)), key=lambda i: len(options(*empty[i])))   # most constrained cell
        r, c = empty.pop(k)
        b = r // 3 * 3 + c // 3
        for v in options(r, c):
            board[r][c] = v
            rows[r].add(v); cols[c].add(v); boxes[b].add(v)
            if bt():
                return True
            rows[r].remove(v); cols[c].remove(v); boxes[b].remove(v)
        board[r][c] = "."
        empty.insert(k, (r, c))
        return False

    return bt()

puzzle = ["53..7....", "6..195...", ".98....6.", "8...6...3", "4..8.3..1",
          "7...2...6", ".6....28.", "...419..5", "....8..79"]
board = [list(row) for row in puzzle]
print(solve_sudoku(board))
print("\n".join("".join(r) for r in board))
```
:::explain
Constraint sets give the legal digits for any cell instantly. The **MRV** (minimum remaining values) heuristic picks the cell with the fewest options, often just one, which shrinks the search tree enormously compared with filling cells left to right. Failed branches restore all three sets **and** the cell list. This is the same pattern used by real constraint solvers.
:::end

:::problem hard | Word search II with a trie | backtracking + trie pruning
Find all the words from a list that can be traced in a letter grid (LeetCode 212). Use a trie so that one DFS from each cell searches for **all** words at once, and prune trie branches as words are found.
:::solution
```python
def find_words(board, words):
    trie = {}
    for w in words:
        node = trie
        for ch in w:
            node = node.setdefault(ch, {})
        node["$"] = w
    R, C, found = len(board), len(board[0]), []

    def dfs(r, c, parent):
        ch = board[r][c]
        node = parent[ch]
        if "$" in node:
            found.append(node.pop("$"))          # record once
        board[r][c] = "#"
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < R and 0 <= nc < C and board[nr][nc] in node:
                dfs(nr, nc, node)
        board[r][c] = ch
        if not node:                              # prune exhausted branches
            parent.pop(ch)

    for r in range(R):
        for c in range(C):
            if board[r][c] in trie:
                dfs(r, c, trie)
    return sorted(found)

board = [list("oaan"), list("etae"), list("ihkr"), list("iflv")]
print(find_words(board, ["oath", "pea", "eat", "rain", "oat"]))
```
:::explain
Searching each word separately repeats a lot of work. The trie shares prefixes, so a single DFS explores `oa…` once for `oath` and `oat`. Moving forward only along trie edges prunes every path that can't spell a word. Removing found words and empty nodes shrinks the trie as the search proceeds, which matters greatly on large boards.
:::end

:::problem hard | Expression add operators | backtracking with running values
Insert `+`, `-` or `*` between the digits of `num` so the expression evaluates to `target` (LeetCode 282). Handle multiplication precedence **without** `eval`, and reject numbers with leading zeros.
:::solution
```python
def add_operators(num, target):
    out = []
    def bt(i, expr, value, last):
        if i == len(num):
            if value == target:
                out.append(expr)
            return
        for j in range(i + 1, len(num) + 1):
            part = num[i:j]
            if len(part) > 1 and part[0] == "0":
                break                                   # no leading zeros
            n = int(part)
            if i == 0:
                bt(j, part, n, n)
            else:
                bt(j, f"{expr}+{part}", value + n, n)
                bt(j, f"{expr}-{part}", value - n, -n)
                bt(j, f"{expr}*{part}", value - last + last * n, last * n)   # undo last, apply *
    bt(0, "", 0, 0)
    return out

print(add_operators("123", 6), add_operators("232", 8), add_operators("105", 5), add_operators("3456237490", 9191))
```
:::explain
To respect precedence without parsing, keep `last`, the value of the most recent **multiplicative term**. For `*`, remove `last` from the running total and add `last * n` instead: `2+3*4` becomes `(5 - 3) + 3*4`. This "undo the last term" trick lets backtracking evaluate as it builds. The leading-zero rule stops `05` but allows a lone `0`.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Reverse string (recursively) | LeetCode 344 | https://leetcode.com/problems/reverse-string/
Reverse a list of characters **in place** using recursion with two indices: no slicing, no `.reverse()`.
:::starter
```python norun
def reverse_string(s, lo=0, hi=None):
    pass
```
:::tests
```python norun
a = list("hello"); reverse_string(a); assert a == list("olleh")
b = list("Hannah"); reverse_string(b); assert b == list("hannaH")
c = []; reverse_string(c); assert c == []
d = ["x"]; reverse_string(d); assert d == ["x"]
e = list(range(800)); reverse_string(e); assert e == list(range(799, -1, -1))
```
:::solution
```python
def reverse_string(s, lo=0, hi=None):
    if hi is None:
        hi = len(s) - 1
    if lo >= hi:                       # base case: 0 or 1 elements left in the middle
        return
    s[lo], s[hi] = s[hi], s[lo]
    reverse_string(s, lo + 1, hi - 1)  # the same problem, two elements smaller

s = list("hello"); reverse_string(s); print(s)
```
:::explain
The recursive leap of faith: "if I swap the ends, the rest is the same problem on the inside". The base case `lo >= hi` covers both even and odd lengths. The depth is n/2, so 800 elements means 400 frames, under the 1000 limit. A 10⁵-element list would need the iterative version.
:::complexity
O(n) time, O(n) call stack.
:::end

:::program basic | Fibonacci, three ways | LeetCode 509 | https://leetcode.com/problems/fibonacci-number/
Implement `fib(n)` (F(0)=0, F(1)=1). Your version must handle `n = 300` instantly, which the naive recursion can't.
:::starter
```python norun
def fib(n):
    pass
```
:::tests
```python norun
assert [fib(i) for i in range(10)] == [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
assert fib(30) == 832040
assert fib(300) == 222232244629420445529739893461909967206666939096499764990979600
```
:::solution
```python
from functools import lru_cache

def fib_naive(n):                       # O(phi^n): recomputes the same subproblems
    return n if n < 2 else fib_naive(n - 1) + fib_naive(n - 2)

@lru_cache(maxsize=None)
def fib_memo(n):                        # O(n): each n computed once
    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)

def fib(n):                             # O(n) time, O(1) space, no recursion limit
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

print(fib_naive(15), fib_memo(80), fib(300))
```
:::explain
The naive call tree has about 1.6ⁿ nodes because `fib(n-2)` is computed inside both branches. **Memoisation** caches each answer, so the tree collapses to a chain of n calls. The **bottom-up** loop keeps only the last two values. This progression (brute recursion → memo → table → O(1) space) is the standard recipe for turning recursion into dynamic programming.
:::complexity
Naive O(φⁿ), memo O(n) time/space, loop O(n) time and O(1) space.
:::end

:::program medium | Generate parentheses | LeetCode 22 | https://leetcode.com/problems/generate-parentheses/
Return all well-formed strings of `n` pairs of parentheses, in **sorted** order.
:::starter
```python norun
def generate_parenthesis(n):
    pass
```
:::tests
```python norun
assert generate_parenthesis(1) == ["()"]
assert generate_parenthesis(2) == ["(())", "()()"]
assert generate_parenthesis(3) == ["((()))", "(()())", "(())()", "()(())", "()()()"]
assert len(generate_parenthesis(6)) == 132            # the Catalan number C6
```
:::hint
Build left to right, tracking the counts `opened` and `closed`. You may add `(` while `opened < n`, and `)` while `closed < opened`. Then every completed string is valid, with no need to check afterwards.
:::solution
```python
def generate_parenthesis(n):
    out = []
    def go(path, opened, closed):
        if len(path) == 2 * n:
            out.append("".join(path))
            return
        if opened < n:
            path.append("(")
            go(path, opened + 1, closed)
            path.pop()                    # undo: backtrack
        if closed < opened:
            path.append(")")
            go(path, opened, closed + 1)
            path.pop()
    go([], 0, 0)
    return out                            # '(' < ')' in ASCII, so this is already sorted

print(generate_parenthesis(3))
```
:::explain
This is **backtracking with pruning**: instead of generating all 2²ⁿ strings and filtering, the two rules cut off any branch that could never become valid. Exploring `(` before `)` produces the output in sorted order for free, since `'('` (40) < `')'` (41). The `append`/`pop` pair is the choose → explore → un-choose rhythm of every backtracking solution.
:::complexity
O(Cₙ · n) where Cₙ ≈ 4ⁿ / (n^1.5 √π) is the nth Catalan number.
:::end

:::program hard | N-Queens II | LeetCode 52 | https://leetcode.com/problems/n-queens-ii/
Count the ways to place `n` queens on an n×n board so that no two attack each other. Make `n = 9` run quickly.
:::starter
```python norun
def total_n_queens(n):
    pass
```
:::tests
```python norun
assert [total_n_queens(n) for n in range(1, 9)] == [1, 0, 0, 2, 10, 4, 40, 92]
assert total_n_queens(9) == 352
```
:::hint
Place one queen per **row**. A square `(r, c)` is attacked if column `c`, diagonal `r - c` or anti-diagonal `r + c` is already used. Keep three sets for O(1) checks.
:::solution
```python
def total_n_queens(n):
    cols, diag, anti = set(), set(), set()
    def place(r):
        if r == n:
            return 1                                   # all rows filled: one solution
        count = 0
        for c in range(n):
            if c in cols or r - c in diag or r + c in anti:
                continue                               # attacked: prune
            cols.add(c); diag.add(r - c); anti.add(r + c)
            count += place(r + 1)
            cols.remove(c); diag.remove(r - c); anti.remove(r + c)
        return count
    return place(0)

print([total_n_queens(n) for n in range(1, 9)])
```
:::explain
One queen per row removes row conflicts by construction. On a diagonal going down-right, `r - c` is constant; on an anti-diagonal, `r + c` is constant. That turns "is this square attacked?" into three set lookups. The search tree is huge in theory (nⁿ), but pruning keeps n = 9 to tens of thousands of nodes. A bitmask version (from the bits chapter) is the next speed-up.
:::complexity
O(n!) worst case, O(n) space.
:::end
