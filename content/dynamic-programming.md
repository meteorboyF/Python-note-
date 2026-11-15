# Dynamic Programming

**Dynamic programming (DP)** solves problems by breaking them into **overlapping subproblems**, solving each **once**, and reusing the answers. If plain recursion recomputes the same calls over and over (like naive Fibonacci), DP turns exponential time into polynomial. It's the most feared interview topic, but it follows a repeatable recipe.

:::analogy Writing answers on a sticky note
Asked "what's 1+1+1+1+1+1+1+1?" you count: 8. Then someone adds "+1": you don't recount, you say 9, because you **remembered** the 8. DP is writing down subproblem answers (memoisation) so you never solve the same thing twice.
:::

## 1. The two ingredients

1. **Optimal substructure**: the best answer is built from the best answers to subproblems.
2. **Overlapping subproblems**: the same subproblems recur many times.

If only (1) holds with *independent* subproblems, that's divide and conquer (merge sort). If (1) holds and a local choice is always safe, a **greedy** algorithm may work.

## 2. Top-down (memoisation) vs bottom-up (tabulation)

```python
from functools import cache
import time

def fib_naive(n):
    return n if n < 2 else fib_naive(n - 1) + fib_naive(n - 2)

@cache                                   # top-down: recursion + a cache
def fib_memo(n):
    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)

def fib_table(n):                        # bottom-up: fill a table from the base cases
    if n < 2:
        return n
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]

def fib_o1(n):                           # space-optimised: keep only what you need
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

t = time.perf_counter(); fib_naive(27); naive_t = time.perf_counter() - t
print(f"naive fib(27): {naive_t:.2f}s")
print(fib_memo(300) == fib_table(300) == fib_o1(300), fib_o1(90))
```

| | Top-down (memo) | Bottom-up (table) |
|---|---|---|
| Style | recursion + `@cache` | loops filling an array |
| Computes | only the subproblems you reach | all subproblems |
| Easy to write? | very: the code mirrors the recurrence | requires a computation order |
| Risks | recursion depth, cache overhead | wasted work on unneeded states |
| Space optimisation | hard | easy (rolling arrays) |

## 3. The DP recipe

1. **Define the state**: what does `dp[i]` (or `dp[i][j]`) *mean*, in words?
2. **Recurrence**: how does a state follow from smaller states?
3. **Base cases**: the smallest states.
4. **Order**: compute states only after the states they depend on.
5. **Answer**: which state(s) hold the final result?
6. **Optimise space** if each row depends only on the previous row.

:::boss Say the state out loud
"`dp[i]` is the minimum number of coins to make amount `i`." If you can't state it in one sentence, you aren't ready to write the recurrence. Most DP bugs are a fuzzy state definition.
:::

## 4. 1-D DP: climbing stairs, house robber, coin change

```python
def climb_stairs(n):                         # ways to climb with 1- or 2-steps
    a, b = 1, 1                              # dp[0], dp[1]
    for _ in range(n - 1):
        a, b = b, a + b                      # dp[i] = dp[i-1] + dp[i-2]
    return b

def rob(nums):                               # no two adjacent houses
    take, skip = 0, 0                        # the best so far ending with take / skip
    for x in nums:
        take, skip = skip + x, max(take, skip)
    return max(take, skip)

def coin_change(coins, amount):              # the minimum number of coins
    INF = float("inf")
    dp = [0] + [INF] * amount                # dp[a] = min coins to make a
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and dp[a - c] + 1 < dp[a]:
                dp[a] = dp[a - c] + 1
    return dp[amount] if dp[amount] != INF else -1

print(climb_stairs(10), rob([2, 7, 9, 3, 1]), coin_change([1, 2, 5], 11), coin_change([2], 3))
```

:::trace
`coin_change([1, 2, 5], 11)`, part of the table:
| a | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dp[a] | 0 | 1 | 1 | 2 | 2 | 1 | 2 | 2 | 3 | 3 | 2 | **3** |
dp[11] = 1 + min(dp[10], dp[9], dp[6]) = 1 + min(2, 3, 2) = 3 → 5 + 5 + 1.
:::

## 5. 2-D DP: grids and two sequences

```python
def unique_paths(m, n):                      # right/down moves on an m x n grid
    row = [1] * n
    for _ in range(1, m):
        for c in range(1, n):
            row[c] += row[c - 1]             # dp[r][c] = dp[r-1][c] + dp[r][c-1]
    return row[-1]

def lcs(a, b):                               # longest common subsequence
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    out, i, j = [], len(a), len(b)           # reconstruct the subsequence
    while i and j:
        if a[i - 1] == b[j - 1]:
            out.append(a[i - 1]); i -= 1; j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    return dp[-1][-1], "".join(reversed(out))

print(unique_paths(3, 7), lcs("ABCBDAB", "BDCABA"))
```

## 6. Knapsack: the mother of DP problems

```python
def knapsack_01(weights, values, cap):
    dp = [0] * (cap + 1)                         # dp[w] = the best value with capacity w
    for wt, val in zip(weights, values):
        for w in range(cap, wt - 1, -1):         # BACKWARDS: each item used at most once
            dp[w] = max(dp[w], dp[w - wt] + val)
    return dp[cap]

def knapsack_unbounded(weights, values, cap):
    dp = [0] * (cap + 1)
    for w in range(1, cap + 1):                  # FORWARDS: items can be reused
        for wt, val in zip(weights, values):
            if wt <= w:
                dp[w] = max(dp[w], dp[w - wt] + val)
    return dp[cap]

print(knapsack_01([1, 3, 4, 5], [1, 4, 5, 7], 7), knapsack_unbounded([1, 3, 4, 5], [1, 4, 5, 7], 7))
```

:::trap Loop direction in 1-D knapsack
With a single `dp` array, iterating capacity **downward** guarantees `dp[w - wt]` still holds the value **without** the current item (0/1 knapsack). Iterating **upward** lets the item be counted again (unbounded). One reversed range changes the meaning of the whole algorithm.
:::

## 7. Classic families

| Family | State | Examples |
|---|---|---|
| Linear | `dp[i]` = best for a prefix | climbing stairs, house robber, decode ways, LIS |
| Grid | `dp[r][c]` | unique paths, min path sum, maximal square |
| Two sequences | `dp[i][j]` over prefixes of A and B | LCS, edit distance, regex/wildcard matching |
| Knapsack / subset | `dp[w]` or `dp[i][w]` | 0/1 knapsack, partition equal subset, coin change |
| Interval | `dp[i][j]` over a substring/subarray | burst balloons, palindromic subsequence, matrix chain |
| Bitmask | `dp[mask]` | TSP, assignment, small-n subsets |
| On trees | dp computed post-order | house robber III, tree diameter |
| State machine | `dp[i][state]` | stock trading with cooldown/fees |

## 8. Longest increasing subsequence: O(n²) and O(n log n)

```python
import bisect

def lis_quadratic(nums):
    dp = [1] * len(nums)                       # dp[i] = LIS ending at i
    for i in range(len(nums)):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp, default=0)

def lis_fast(nums):
    tails = []                                 # tails[k] = smallest tail of an increasing subsequence of length k+1
    for x in nums:
        i = bisect.bisect_left(tails, x)
        if i == len(tails):
            tails.append(x)
        else:
            tails[i] = x                       # a smaller tail is never worse
    return len(tails)

nums = [10, 9, 2, 5, 3, 7, 101, 18]
print(lis_quadratic(nums), lis_fast(nums))
```

## Tricks & tips

- Start with the brute-force recursion, add `@cache`, then (if needed) convert it to a table.
- When the state is `(i, j)`, `@cache` on a function of `(i, j)` is often all you need.
- Rolling arrays: if row `i` needs only row `i-1`, keep two rows, or one row with the right loop direction.
- "Count the ways" DPs add, "best value" DPs take min/max, "is it possible" DPs use `or`.
- Use `float("inf")` for "impossible" in min-DPs, and check for it at the end.
- To **reconstruct** the choice sequence, keep the full table or a parent pointer.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Fuzzy state definition | write `dp[i] = …` in words |
| 2 | Wrong base case (dp[0]) | the empty prefix / empty amount |
| 3 | Wrong iteration order (using unfilled states) | follow the dependencies |
| 4 | 1-D knapsack direction | down = 0/1, up = unbounded |
| 5 | Off-by-one between `dp` indices and string indices | `dp` has size n+1; char = `s[i-1]` |
| 6 | `@cache` on functions with list arguments | pass tuples or indices |
| 7 | Recursion depth in deep memoised recursion | bottom-up |
| 8 | Using greedy where DP is needed (coin change `[1, 3, 4]`, amount 6) | test small counterexamples |
| 9 | Exponential state spaces | choose a smaller state |
| 10 | Forgetting `-1` / impossible handling | check `inf` at the end |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python
dp = [1] + [0] * 5
for coin in [1, 2]:
    for a in range(coin, 6):
        dp[a] += dp[a - coin]
print(dp[5])
```
What prints?
- [ ] `8`
- [x] `3`
- [ ] `5`
With coins in the **outer** loop, each combination is counted once regardless of order: 5 = 1+1+1+1+1 = 1+1+1+2 = 1+2+2. Swapping the loops would count ordered sequences (8, like climbing stairs).
:::

:::quiz
```python
from functools import lru_cache
calls = 0
@lru_cache(maxsize=None)
def f(n):
    global calls
    calls += 1
    return n if n < 2 else f(n - 1) + f(n - 2)
f(20)
print(calls)
```
What prints?
- [x] `21`
- [ ] `20`
- [ ] `21891`
With memoisation, each of `f(0)…f(20)` executes its body exactly once, so 21 calls. Without the cache, the body would run 21,891 times.
:::

:::quiz
```python
a, b = "abcde", "ace"
dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
for i in range(1, len(a) + 1):
    for j in range(1, len(b) + 1):
        dp[i][j] = dp[i-1][j-1] + 1 if a[i-1] == b[j-1] else max(dp[i-1][j], dp[i][j-1])
print(dp[3][2], dp[-1][-1])
```
What prints?
- [ ] `1 3`
- [x] `2 3`
- [ ] `2 2`
`dp[i][j]` is the LCS of the prefixes `a[:i]` and `b[:j]`. LCS("abc", "ac") = 2 ("ac"), and the full LCS("abcde", "ace") = 3.
:::

## Practice problems

:::problem basic | Min cost climbing stairs | 1-D DP
`cost[i]` is the cost of stepping on stair i. You may start at stair 0 or 1, and climb 1 or 2 steps. Find the minimum cost to reach the top (LeetCode 746).
:::solution
```python
def min_cost(cost):
    a = b = 0                           # dp[i-2], dp[i-1]: min cost to STAND at those stairs
    for i in range(2, len(cost) + 1):
        a, b = b, min(b + cost[i - 1], a + cost[i - 2])
    return b

print(min_cost([10, 15, 20]), min_cost([1, 100, 1, 1, 1, 100, 1, 1, 100, 1]))
```
:::explain
State: `dp[i]` is the minimum cost to arrive at position i (the top is `len(cost)`). To reach i you came from i−1 (paying `cost[i-1]`) or from i−2 (paying `cost[i-2]`). Only the last two values matter, so it's O(1) space.
:::end

:::problem basic | Decode ways | 1-D DP with validity checks
Messages map A=1…Z=26. Count the ways to decode a digit string (LeetCode 91): `"226"` → 3.
:::solution
```python
def num_decodings(s):
    prev2, prev1 = 1, 1 if s and s[0] != "0" else 0       # dp[i-2], dp[i-1]
    for i in range(2, len(s) + 1):
        cur = 0
        if s[i - 1] != "0":
            cur += prev1                                    # single digit
        if 10 <= int(s[i - 2:i]) <= 26:
            cur += prev2                                    # two digits
        prev2, prev1 = prev1, cur
    return prev1 if s else 0

print([num_decodings(s) for s in ["12", "226", "06", "11106", "10", "27"]])
```
:::explain
`dp[i]` = the number of decodings of the first i characters. The last step either decodes one digit (valid if it isn't `0`) or two digits (valid if 10–26). Zeros make this problem tricky: `"06"` has 0 decodings, and `"10"` has exactly 1.
:::end

:::problem basic | Maximum subarray as DP | Kadane as DP
Express Kadane's algorithm as a DP: `dp[i]` = the best sum of a subarray **ending at i**. Then return the global best.
:::solution
```python
def max_subarray(nums):
    best = cur = nums[0]                 # cur = dp[i]
    for x in nums[1:]:
        cur = max(x, cur + x)            # extend the previous subarray, or start fresh
        best = max(best, cur)
    return best

print(max_subarray([-2, 1, -3, 4, -1, 2, 1, -5, 4]), max_subarray([-1, -2]))
```
:::explain
`dp[i] = max(nums[i], dp[i-1] + nums[i])`. The answer is `max(dp)`, not `dp[-1]`, because the best subarray can end anywhere. Seeing Kadane as DP makes its variants (max product subarray, circular subarray) much easier.
:::end

:::problem medium | Partition equal subset sum | subset-sum DP
Can the array be split into two subsets with equal sums (LeetCode 416)?
:::solution
```python
def can_partition(nums):
    total = sum(nums)
    if total % 2:
        return False
    target = total // 2
    reachable = {0}                              # sums reachable with the items so far
    for x in nums:
        reachable |= {s + x for s in reachable if s + x <= target}
        if target in reachable:
            return True
    return False

def can_partition_bits(nums):                    # the same DP, packed into a big int bitset
    total = sum(nums)
    if total % 2:
        return False
    bits = 1
    for x in nums:
        bits |= bits << x                        # bit s set => sum s reachable
    return bool((bits >> (total // 2)) & 1)

print(can_partition([1, 5, 11, 5]), can_partition([1, 2, 3, 5]), can_partition_bits([1, 5, 11, 5]))
```
:::explain
It reduces to "is there a subset summing to total/2?", which is 0/1 knapsack with a boolean value. The set version is clear. The bitset version uses Python's arbitrary-precision ints: shifting left by `x` adds `x` to **every** reachable sum at once. It's a neat trick, and very fast.
:::end

:::problem medium | Longest palindromic subsequence | interval DP
Find the length of the longest palindromic **subsequence** (not substring) (LeetCode 516).
:::solution
```python
from functools import cache

def lps(s):
    @cache
    def dp(i, j):                       # LPS length within s[i..j]
        if i > j:
            return 0
        if i == j:
            return 1
        if s[i] == s[j]:
            return 2 + dp(i + 1, j - 1)
        return max(dp(i + 1, j), dp(i, j - 1))
    return dp(0, len(s) - 1)

print(lps("bbbab"), lps("cbbd"), lps("agbdba"))
```
:::explain
An **interval** state `(i, j)`: if the ends match, they wrap a palindrome of the inside. Otherwise drop one end. There are O(n²) states, each O(1), so the total is O(n²). The `@cache`-on-a-nested-function style is often the fastest way to a correct DP in an interview. Equivalent fact: LPS(s) = LCS(s, reversed(s)).
:::end

:::problem medium | Best time to buy and sell stock with cooldown | state-machine DP
You may complete many transactions, but after selling you must cool down for one day (LeetCode 309). Maximise profit.
:::solution
```python
def max_profit_cooldown(prices):
    hold, sold, rest = float("-inf"), 0, 0       # the best profit while in each state
    for p in prices:
        hold, sold, rest = max(hold, rest - p), hold + p, max(rest, sold)
    return max(sold, rest)

print(max_profit_cooldown([1, 2, 3, 0, 2]), max_profit_cooldown([1]))
```
:::explain
Model each day as being in one of three **states**: holding a stock, just sold (so a forced cooldown follows), or resting. Each transition is a max over where you could have come from. The simultaneous assignment uses all of the previous day's values. This state-machine view solves every stock-trading variant (fees, k transactions).
:::end

:::problem hard | Edit distance with operation counts | 2-D DP + reconstruction
Compute the edit distance between two words (LeetCode 72) and also return how many inserts, deletes and replaces an optimal solution uses.
:::solution
```python
def edit_ops(a, b):
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1): dp[i][0] = i
    for j in range(m + 1): dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if a[i - 1] == b[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    ops = {"insert": 0, "delete": 0, "replace": 0}
    i, j = n, m
    while i or j:
        if i and j and a[i - 1] == b[j - 1]:
            i, j = i - 1, j - 1
        elif i and j and dp[i][j] == dp[i - 1][j - 1] + 1:
            ops["replace"] += 1; i, j = i - 1, j - 1
        elif i and dp[i][j] == dp[i - 1][j] + 1:
            ops["delete"] += 1; i -= 1
        else:
            ops["insert"] += 1; j -= 1
    return dp[n][m], ops

print(edit_ops("horse", "ros"), edit_ops("intention", "execution"))
```
:::explain
`dp[i][j]` = the cost to turn `a[:i]` into `b[:j]`. A match costs nothing (diagonal). Otherwise take 1 + the best of delete (up), insert (left) or replace (diagonal). Walking back from `dp[n][m]` and re-checking which neighbour produced each value reconstructs one optimal script, and the counts always sum to the distance.
:::end

:::problem hard | Burst balloons | interval DP, think about the LAST action
Burst balloons `nums` for coins `left * x * right` (neighbours at the time of bursting; out-of-range counts as 1). Maximise the coins (LeetCode 312).
:::solution
```python
from functools import cache

def max_coins(nums):
    vals = [1] + [x for x in nums if x] + [1]       # 0-balloons give nothing: drop them
    @cache
    def dp(lo, hi):                                  # the best for bursting everything strictly between lo and hi
        best = 0
        for k in range(lo + 1, hi):                  # k = the LAST balloon burst in (lo, hi)
            best = max(best, vals[lo] * vals[k] * vals[hi] + dp(lo, k) + dp(k, hi))
        return best
    return dp(0, len(vals) - 1)

print(max_coins([3, 1, 5, 8]), max_coins([1, 5]))
```
:::explain
Choosing the **first** balloon to burst leaves dependent, messy neighbours. Choosing the **last** one, `k`, in the interval makes its neighbours at that moment exactly the fixed boundaries `lo` and `hi`, and the two sides become independent subproblems. That reframing is the key insight of interval DP. O(n³) time, O(n²) states.
:::end

:::problem hard | Travelling salesman with bitmask DP | dp[mask][last]
Find the shortest tour visiting all n ≤ 15 cities and returning to the start, using Held–Karp bitmask DP in O(n²·2ⁿ). Compare it with brute-force permutations for n = 8.
:::solution
```python
import itertools, math, random

def tsp_bitmask(D):
    n = len(D)
    INF = float("inf")
    dp = [[INF] * n for _ in range(1 << n)]       # dp[mask][j]: the best path from 0 visiting mask, ending at j
    dp[1][0] = 0
    for mask in range(1 << n):
        if not mask & 1:
            continue
        for j in range(n):
            cur = dp[mask][j]
            if cur == INF or not (mask >> j) & 1:
                continue
            for k in range(n):
                if not (mask >> k) & 1:
                    nm = mask | (1 << k)
                    if cur + D[j][k] < dp[nm][k]:
                        dp[nm][k] = cur + D[j][k]
    full = (1 << n) - 1
    return min(dp[full][j] + D[j][0] for j in range(1, n))

def tsp_brute(D):
    n = len(D)
    return min(sum(D[a][b] for a, b in zip((0,) + p, p + (0,))) for p in itertools.permutations(range(1, n)))

random.seed(5)
pts = [(random.random(), random.random()) for _ in range(8)]
D = [[math.dist(p, q) for q in pts] for p in pts]
print(round(tsp_bitmask(D), 6) == round(tsp_brute(D), 6), round(tsp_bitmask(D), 4))
```
:::explain
The state is **which cities are visited** (a bitmask) plus **where we are now**. The order in which earlier cities were visited doesn't matter for the future, and that's the DP insight that collapses n! permutations into n·2ⁿ states. For n = 15 that's about 500K states versus 87 billion permutations. Bit tricks: `mask >> j & 1` tests membership, and `mask | 1 << k` adds a city.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Climbing stairs | LeetCode 70 | https://leetcode.com/problems/climbing-stairs/
You can climb 1 or 2 steps at a time. How many distinct ways are there to reach step `n`? Make it O(n) time and O(1) space.
:::starter
```python norun
def climb_stairs(n):
    pass
```
:::tests
```python norun
assert [climb_stairs(n) for n in range(1, 8)] == [1, 2, 3, 5, 8, 13, 21]
assert climb_stairs(45) == 1836311903
assert climb_stairs(200) > 10**41
```
:::solution
```python
def climb_stairs(n):
    a, b = 1, 1                 # ways(0), ways(1)
    for _ in range(n - 1):
        a, b = b, a + b         # ways(i) = ways(i-1) + ways(i-2)
    return b

print([climb_stairs(n) for n in range(1, 8)])
```
:::explain
**Define the state**: `ways(i)` is the number of ways to reach step i. **Recurrence**: the last move was a 1-step (from i−1) or a 2-step (from i−2), so `ways(i) = ways(i−1) + ways(i−2)`. **Base cases**: `ways(0) = ways(1) = 1`. Because each state depends only on the previous two, two variables replace the table: the **rolling-array** optimisation.
:::complexity
O(n) time, O(1) space.
:::end

:::program medium | Longest common subsequence | LeetCode 1143 | https://leetcode.com/problems/longest-common-subsequence/
Return the length of the LCS of two strings **and** one actual LCS string. Use the space-efficient version for the length.
:::starter
```python norun
def lcs_length(a, b):
    pass

def lcs_string(a, b):
    pass
```
:::tests
```python norun
assert lcs_length("abcde", "ace") == 3 and lcs_length("abc", "def") == 0
assert lcs_length("abc", "abc") == 3 and lcs_length("", "abc") == 0
assert lcs_string("abcde", "ace") == "ace"
s = lcs_string("AGGTAB", "GXTXAYB")
assert len(s) == 4 == lcs_length("AGGTAB", "GXTXAYB")
it1, it2 = iter("AGGTAB"), iter("GXTXAYB")
assert all(c in it1 for c in s) and all(c in it2 for c in s)
assert lcs_length("a" * 800, "a" * 800) == 800
```
:::hint
`dp[i][j]` is the LCS of `a[:i]` and `b[:j]`. If the last characters match, it's `1 + dp[i-1][j-1]`; otherwise `max(dp[i-1][j], dp[i][j-1])`. To rebuild the string, walk back from `dp[m][n]`.
:::solution
```python
def lcs_length(a, b):
    if len(b) > len(a):
        a, b = b, a                           # keep the row short
    prev = [0] * (len(b) + 1)
    for ch in a:
        cur = [0]
        for j, ch2 in enumerate(b, 1):
            cur.append(prev[j - 1] + 1 if ch == ch2 else max(prev[j], cur[j - 1]))
        prev = cur
    return prev[-1]

def lcs_string(a, b):
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            dp[i][j] = dp[i-1][j-1] + 1 if a[i-1] == b[j-1] else max(dp[i-1][j], dp[i][j-1])
    out, i, j = [], m, n
    while i and j:                            # walk back through the decisions
        if a[i-1] == b[j-1]:
            out.append(a[i-1]); i -= 1; j -= 1
        elif dp[i-1][j] >= dp[i][j-1]:
            i -= 1
        else:
            j -= 1
    return "".join(reversed(out))

print(lcs_length("abcde", "ace"), lcs_string("AGGTAB", "GXTXAYB"))
```
:::explain
This is the textbook **2-D DP**: each cell depends on the cell to its left, the one above and the diagonal, so only one previous row is needed for the length (O(min(m, n)) space). **Reconstruction** needs the full table: start at the bottom-right, and when the characters match that character is in the LCS (go diagonal); otherwise follow the larger neighbour. The tests check that your string really is a common subsequence, because several LCSs can be valid.
:::complexity
O(m·n) time; O(min(m, n)) space for the length, O(m·n) to reconstruct.
:::end

:::program medium | Coin change II | LeetCode 518 | https://leetcode.com/problems/coin-change-ii/
Count the **combinations** (order doesn't matter) of coins that sum to `amount`, with unlimited coins of each type.
:::starter
```python norun
def change(amount, coins):
    pass
```
:::tests
```python norun
assert change(5, [1, 2, 5]) == 4
assert change(3, [2]) == 0
assert change(10, [10]) == 1
assert change(0, [7]) == 1
assert change(500, [3, 5, 7, 8, 9, 10, 11]) == 35502874
```
:::hint
1-D DP: `dp[a]` is the number of ways to make `a`. Put the **coins in the outer loop** so each combination is built in one fixed coin order.
:::solution
```python
def change(amount, coins):
    dp = [1] + [0] * amount         # one way to make 0: take nothing
    for coin in coins:              # coins outer => combinations, not permutations
        for a in range(coin, amount + 1):
            dp[a] += dp[a - coin]   # ways without this coin + ways using it again
    return dp[amount]

print(change(5, [1, 2, 5]))
```
:::explain
After processing the first k coins, `dp[a]` counts the combinations using only those coins. Adding coin c: each way to make `a` either uses no c (the old `dp[a]`) or uses at least one (`dp[a - c]`, already updated this round, which allows unlimited reuse). Looping amounts in the **outer** loop instead would count `1+2` and `2+1` separately: that's Combination Sum IV (LC 377). Knowing which loop order to use is the key idea here.
:::complexity
O(amount · len(coins)) time, O(amount) space.
:::end

:::program hard | Regular expression matching | LeetCode 10 | https://leetcode.com/problems/regular-expression-matching/
Implement full-string matching with `.` (any single character) and `*` (zero or more of the previous element). No `re` module.
:::starter
```python norun
def is_match(s, p):
    pass
```
:::tests
```python norun
assert is_match("aa", "a") is False
assert is_match("aa", "a*") is True
assert is_match("ab", ".*") is True
assert is_match("aab", "c*a*b") is True
assert is_match("mississippi", "mis*is*p*.") is False
assert is_match("", "a*b*") is True
assert is_match("a" * 30 + "b", "a*a*a*a*a*a*c") is False
import re, random
for _ in range(300):
    s = "".join(random.choice("ab") for _ in range(random.randint(0, 6)))
    p = "".join(random.choice(["a", "b", ".", "a*", "b*", ".*"]) for _ in range(random.randint(0, 4)))
    assert is_match(s, p) == (re.fullmatch(p, s) is not None), (s, p)
```
:::hint
Let `dp(i, j)` mean "does `s[i:]` match `p[j:]`?". If `p[j+1] == '*'`, either skip `x*` entirely (`dp(i, j+2)`) or, if `s[i]` matches `x`, consume one character and stay (`dp(i+1, j)`). Memoise it.
:::solution
```python
from functools import lru_cache

def is_match(s, p):
    @lru_cache(maxsize=None)
    def dp(i, j):
        if j == len(p):
            return i == len(s)
        first = i < len(s) and p[j] in (s[i], ".")
        if j + 1 < len(p) and p[j + 1] == "*":
            return dp(i, j + 2) or (first and dp(i + 1, j))   # zero uses, or one more
        return first and dp(i + 1, j + 1)
    return dp(0, 0)

print(is_match("aab", "c*a*b"), is_match("mississippi", "mis*is*p*."))
```
:::explain
Plain recursion is exponential on patterns like `a*a*a*a*c` (try the 7th test without the cache). There are only (len(s)+1)·(len(p)+1) distinct `(i, j)` states, so memoisation makes it polynomial. The `*` case is a **choice**: use the starred element zero times, or match one character and keep the star available. The last test cross-checks 300 random cases against Python's own `re.fullmatch`.
:::complexity
O(m·n) time and space.
:::end
