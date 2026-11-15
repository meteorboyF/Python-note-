# Greedy & Bit Manipulation

Two compact but powerful toolkits. A **greedy algorithm** makes the locally best choice at each step and never looks back. When it's correct, it's usually the simplest and fastest solution, but proving it's correct is the real skill. **Bit manipulation** treats integers as arrays of 0/1 flags, enabling O(1) tricks, compact sets (bitmasks), and elegant XOR solutions.

:::analogy Greedy: making change with coins
To give 63¢ in US coins, you grab the largest coin that fits each time: 25, 25, 10, 1, 1, 1. That greedy choice is optimal for US coins, but with coins `{1, 3, 4}` and amount 6, greedy gives 4+1+1 (3 coins) while 3+3 (2 coins) is better. Greedy works only when the problem has the **greedy-choice property**.
:::

## Part A: Greedy algorithms

### When does greedy work?

1. **Greedy-choice property**: some optimal solution starts with the greedy choice.
2. **Optimal substructure**: after making it, the rest is a smaller instance of the same problem.

Typical proof technique: the **exchange argument**. Take any optimal solution, swap in the greedy choice, and show it's no worse.

```python
def greedy_coins(coins, amount):
    out = []
    for c in sorted(coins, reverse=True):
        k, amount = divmod(amount, c)
        out += [c] * k
    return out if amount == 0 else None

print(greedy_coins([25, 10, 5, 1], 63))
print(greedy_coins([1, 3, 4], 6), "<- 3 coins, but [3, 3] uses only 2: greedy FAILS here")
```

### Interval scheduling: earliest finish time

Choose the maximum number of non-overlapping intervals.

```python
def max_non_overlapping(intervals):
    count, end = 0, float("-inf")
    for s, e in sorted(intervals, key=lambda iv: iv[1]):   # sort by END time
        if s >= end:
            count += 1
            end = e
    return count

meetings = [(1, 4), (3, 5), (0, 6), (5, 7), (3, 9), (5, 9), (6, 10), (8, 11), (8, 12), (2, 14), (12, 16)]
print(max_non_overlapping(meetings))
```

:::deep Why "earliest finish" is optimal (an exchange argument)
Let `g` be the interval that finishes first. Take any optimal schedule, and let `o` be its first interval. Since `g` finishes no later than `o`, replacing `o` with `g` keeps everything else compatible, so there's an optimal schedule that starts with `g`. Repeat on the remaining intervals. Sorting by **start** time or by **length** both have counterexamples.
:::

### More greedy classics

```python
def can_jump(nums):                          # LeetCode 55: track the farthest reachable index
    reach = 0
    for i, x in enumerate(nums):
        if i > reach:
            return False
        reach = max(reach, i + x)
    return True

def min_jumps(nums):                         # LeetCode 45: BFS-like levels, greedily
    jumps = end = far = 0
    for i in range(len(nums) - 1):
        far = max(far, i + nums[i])
        if i == end:                         # must jump now
            jumps, end = jumps + 1, far
    return jumps

def assign_cookies(greed, sizes):            # LeetCode 455: smallest cookie that satisfies each child
    greed.sort(); sizes.sort()
    child = 0
    for s in sizes:
        if child < len(greed) and s >= greed[child]:
            child += 1
    return child

def gas_station(gas, cost):                  # LeetCode 134
    if sum(gas) < sum(cost):
        return -1
    start = tank = 0
    for i in range(len(gas)):
        tank += gas[i] - cost[i]
        if tank < 0:                         # can't reach i+1 from start: none in between works either
            start, tank = i + 1, 0
    return start

print(can_jump([2, 3, 1, 1, 4]), can_jump([3, 2, 1, 0, 4]), min_jumps([2, 3, 1, 1, 4]),
      assign_cookies([1, 2, 3], [1, 1]), gas_station([1, 2, 3, 4, 5], [3, 4, 5, 1, 2]))
```

### Huffman coding: greedy with a heap

```python
import heapq
from collections import Counter

def huffman_codes(text):
    heap = [(freq, i, ch) for i, (ch, freq) in enumerate(Counter(text).items())]
    heapq.heapify(heap)
    counter = len(heap)
    while len(heap) > 1:                      # repeatedly merge the two rarest
        f1, _, a = heapq.heappop(heap)
        f2, _, b = heapq.heappop(heap)
        heapq.heappush(heap, (f1 + f2, counter, (a, b)))
        counter += 1
    codes = {}
    def walk(node, code):
        if isinstance(node, str):
            codes[node] = code or "0"
        else:
            walk(node[0], code + "0"); walk(node[1], code + "1")
    walk(heap[0][2], "")
    return codes

text = "abracadabra"
codes = huffman_codes(text)
encoded = "".join(codes[c] for c in text)
print(codes, len(encoded), "bits vs", 8 * len(text), "bits in ASCII")
```

## Part B: Bit manipulation

### The operators, revisited

| Op | Meaning | Trick |
|---|---|---|
| `x & 1` | lowest bit | odd/even |
| `x >> k & 1` | the k-th bit | test a bit |
| `x \| (1 << k)` | set bit k | add to a set |
| `x & ~(1 << k)` | clear bit k | remove from a set |
| `x ^ (1 << k)` | toggle bit k | flip |
| `x & (x - 1)` | clears the lowest set bit | count bits, power-of-two test |
| `x & -x` | isolates the lowest set bit | Fenwick trees |
| `a ^ a == 0`, `a ^ 0 == a` | XOR self-inverse | find the unique element, swaps |
| `x << k`, `x >> k` | ×2ᵏ, ÷2ᵏ (floor) | fast scaling |

```python
x = 0b10110
print(bin(x), x >> 2 & 1, bin(x | 1 << 0), bin(x & ~(1 << 1)), bin(x ^ 0b11111))
print(bin(x & (x - 1)), bin(x & -x), x.bit_count(), x.bit_length())
print(-1 >> 5, bin(5 ^ 3), 5 ^ 3 ^ 3)    # Python ints are infinitely sign-extended
```

:::note Python ints are arbitrary precision
There's no 32-bit overflow, and negative numbers behave as if they had infinitely many leading 1s (two's complement). To emulate a fixed width, mask with `x & 0xFFFFFFFF`, and convert back with `x - (1 << 32) if x >> 31 else x`.
:::

### XOR tricks

```python
from functools import reduce
from operator import xor

def single_number(nums):                     # every element appears twice except one
    return reduce(xor, nums)

def missing_number(nums):                    # 0..n with one missing
    return reduce(xor, nums) ^ reduce(xor, range(len(nums) + 1))

def two_singles(nums):                       # two elements appear once, the rest twice
    x = reduce(xor, nums)                    # = a ^ b
    low = x & -x                             # a bit where a and b differ
    a = reduce(xor, (n for n in nums if n & low), 0)
    return sorted((a, x ^ a))

print(single_number([4, 1, 2, 1, 2]), missing_number([3, 0, 1]), two_singles([1, 2, 1, 3, 2, 5]))
```

### Bitmasks as sets: enumerate all subsets

```python
items = ["a", "b", "c"]
for mask in range(1 << len(items)):          # 0..7
    subset = [items[i] for i in range(len(items)) if mask >> i & 1]
    print(f"{mask:03b} {subset}")

mask = 0b1011
sub = mask
subs = []
while sub:                                   # enumerate all non-empty SUBMASKS of mask
    subs.append(bin(sub))
    sub = (sub - 1) & mask
print(subs)
```

### Gray code and other tricks

```python
print([i ^ (i >> 1) for i in range(8)])                 # Gray code: neighbours differ in 1 bit
print([bin(i ^ (i >> 1))[2:].zfill(3) for i in range(8)])
def reverse_bits32(n):
    return int(f"{n:032b}"[::-1], 2)
print(reverse_bits32(0b1011), bin(reverse_bits32(0b1011)))
```

## Tricks & tips

- Greedy candidates: sort by **end time**, by ratio (value/weight in fractional knapsack), by deadline, or use a heap for "repeatedly take the best".
- Always try to find a **counterexample** to your greedy idea with small inputs before trusting it. Or compare it with a brute-force / DP version on random tests.
- XOR cancels pairs: perfect for "find the odd one out".
- `n & (n - 1) == 0` (for n > 0) means a power of two. `int.bit_count()` is popcount.
- Masks give O(1) set operations on up to ~60 items, and they're natural DP states.

## The most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Assuming greedy is correct | prove it, or test against brute force |
| 2 | Sorting by the wrong key (start vs end) | think through an exchange argument |
| 3 | Operator precedence: `1 << k - 1` is `1 << (k-1)` | parenthesise |
| 4 | Negative numbers with `>>` (floor, sign-extended) | mask for fixed widths |
| 5 | `~x` is `-x-1`, not "flip 32 bits" | `x ^ 0xFFFFFFFF` |
| 6 | `bin()` includes `-0b` for negatives | format with a mask |
| 7 | Using `and`/`or` instead of `&`/`\|` | bitwise operators |
| 8 | Greedy coin change for arbitrary coin systems | DP |
| 9 | Bitmask DP with n too large (2ⁿ) | n ≤ ~20 |
| 10 | Off-by-one in bit positions (0-indexed from the right) | write out the binary |

## Practice problems

:::problem basic | Best time to buy and sell stock II | greedy sum of rises
You may make any number of transactions (holding at most one share at a time). Maximise profit (LeetCode 122).
:::solution
```python
def max_profit(prices):
    return sum(max(0, b - a) for a, b in zip(prices, prices[1:]))

print(max_profit([7, 1, 5, 3, 6, 4]), max_profit([1, 2, 3, 4, 5]), max_profit([7, 6, 4, 3, 1]))
```
:::explain
Any profitable multi-day hold equals the sum of its daily rises, so collecting **every** positive day-to-day difference is optimal. That's the greedy choice: take every gain, avoid every loss. O(n).
:::end

:::problem basic | Counting bits | DP with bit tricks
Return `[popcount(i) for i in 0..n]` in O(n) total (LeetCode 338), without calling `bin` per number.
:::solution
```python
def count_bits(n):
    bits = [0] * (n + 1)
    for i in range(1, n + 1):
        bits[i] = bits[i >> 1] + (i & 1)       # = bits of i//2, plus the lowest bit
    return bits

print(count_bits(10), [i.bit_count() for i in range(11)] == count_bits(10))
```
:::explain
Shifting right drops the lowest bit: `i >> 1` has the same bits as `i` except the last one, which `i & 1` restores. Each answer is O(1) from an earlier one, a tiny DP over bits.
:::end

:::problem basic | Power of four | bit masks
Determine whether `n` is a power of 4 in O(1) without loops.
:::solution
```python
def is_power_of_four(n):
    return n > 0 and n & (n - 1) == 0 and n & 0x55555555_55555555 != 0

print([n for n in range(1, 300) if is_power_of_four(n)], is_power_of_four(4 ** 30))
```
:::explain
A power of 4 is a power of 2 (exactly one set bit, so `n & (n-1) == 0`) whose single bit sits at an **even** position (0, 2, 4, …). The mask `0x5555…` (binary `0101…`) has 1s exactly at the even positions. Notice the expression doesn't need parentheses around `n & (n - 1)` because `&` binds tighter than `==` in Python, though adding them is clearer.
:::end

:::problem medium | Non-overlapping intervals | greedy by end time
Return the minimum number of intervals to remove so that the rest don't overlap (LeetCode 435).
:::solution
```python
def erase_overlap(intervals):
    keep, end = 0, float("-inf")
    for s, e in sorted(intervals, key=lambda x: x[1]):
        if s >= end:
            keep += 1
            end = e
    return len(intervals) - keep

print(erase_overlap([[1, 2], [2, 3], [3, 4], [1, 3]]), erase_overlap([[1, 2], [1, 2], [1, 2]]), erase_overlap([[1, 2], [2, 3]]))
```
:::explain
Removing the minimum is the same as **keeping the maximum** non-overlapping set, which is the classic earliest-finish-time greedy. Touching intervals (`[1,2]`, `[2,3]`) don't overlap here, hence `s >= end`.
:::end

:::problem medium | Partition labels | greedy with last occurrence
Split a string into as many parts as possible so that each letter appears in at most one part, and return the part sizes (LeetCode 763).
:::solution
```python
def partition_labels(s):
    last = {ch: i for i, ch in enumerate(s)}      # the last index of each char
    sizes, start, end = [], 0, 0
    for i, ch in enumerate(s):
        end = max(end, last[ch])                  # this part must extend at least that far
        if i == end:                              # every char seen so far ends here
            sizes.append(end - start + 1)
            start = i + 1
    return sizes

print(partition_labels("ababcbacadefegdehijhklij"), partition_labels("eccbbbbdec"))
```
:::explain
A part can't close until it contains the last occurrence of every letter inside it, so keep extending `end` to the farthest last-occurrence seen. When `i` reaches `end`, closing the part there is always safe and gives the earliest (and so most numerous) cut. O(n).
:::end

:::problem medium | Subsets via bitmask & max AND subset | bitmask enumeration
Using bitmask enumeration, count the subsets of `nums` whose bitwise OR equals the maximum possible OR (LeetCode 2044).
:::solution
```python
def count_max_or_subsets(nums):
    target = 0
    for x in nums:
        target |= x                              # OR of everything = the max achievable
    count = 0
    for mask in range(1, 1 << len(nums)):
        acc = 0
        for i, x in enumerate(nums):
            if mask >> i & 1:
                acc |= x
        count += acc == target
    return count

print(count_max_or_subsets([3, 1]), count_max_or_subsets([2, 2, 2]), count_max_or_subsets([3, 2, 1, 5]))
```
:::explain
OR only ever adds bits, so the maximum OR is the OR of all elements. Each integer `mask` from 1 to 2ⁿ − 1 encodes one non-empty subset (bit i means "include nums[i]"). O(n·2ⁿ), fine for n ≤ 16. A DP over the masks can reuse partial ORs to make it O(2ⁿ).
:::end

:::problem hard | Minimum number of arrows / meeting rooms | sweep + heap greedy
Given meetings `[start, end)`, find the minimum number of rooms (LeetCode 253) using a min-heap of end times, and output which room each meeting gets.
:::solution
```python
import heapq

def assign_rooms(meetings):
    order = sorted(range(len(meetings)), key=lambda i: meetings[i][0])
    free_at = []                         # heap of (end_time, room_id)
    assignment = [None] * len(meetings)
    rooms = 0
    for i in order:
        s, e = meetings[i]
        if free_at and free_at[0][0] <= s:           # the earliest-freeing room is available
            _, room = heapq.heappop(free_at)
        else:
            room, rooms = rooms, rooms + 1           # open a new room
        assignment[i] = room
        heapq.heappush(free_at, (e, room))
    return rooms, assignment

print(assign_rooms([(0, 30), (5, 10), (15, 20), (10, 15), (30, 40)]))
```
:::explain
Process meetings by start time and reuse the room that frees up **earliest** if it's free by now, otherwise open a new one. The greedy is optimal because the number of rooms used never exceeds the maximum number of simultaneously running meetings, which is a lower bound for any schedule. The heap makes each decision O(log n).
:::end

:::problem hard | Maximum XOR of two numbers | greedy on bits with a trie
Find the max of `a ^ b` over all pairs (LeetCode 421) in O(n·B), using a binary trie and greedily choosing the opposite bit from the top bit down.
:::solution
```python
import random

def find_max_xor(nums):
    B = max(nums).bit_length() or 1
    trie, best = {}, 0
    for x in nums:
        node = trie                              # insert x
        for b in range(B - 1, -1, -1):
            node = node.setdefault(x >> b & 1, {})
        node, cur = trie, 0                      # query: best partner for x
        for b in range(B - 1, -1, -1):
            bit = x >> b & 1
            if 1 - bit in node:                  # the opposite bit gives a 1 in the XOR: take it greedily
                cur |= 1 << b
                node = node[1 - bit]
            else:
                node = node[bit]
        best = max(best, cur)
    return best

for _ in range(200):
    a = [random.randint(0, 1000) for _ in range(random.randint(1, 20))]
    assert find_max_xor(a) == max(x ^ y for x in a for y in a)
print(find_max_xor([3, 10, 5, 25, 2, 8]))
```
:::explain
A 1 in a higher bit outweighs all lower bits combined (2ᵇ > 2ᵇ−1), so maximising XOR is greedy from the most significant bit down: at each level, go to the opposite bit if any number has it. The trie stores all numbers' bit paths, so each query is O(B). Inserting before querying lets every number pair with all earlier ones (and with itself, giving 0). The randomised brute-force check confirms the greedy proof.
:::end

:::problem hard | Fractional vs 0/1 knapsack | when greedy wins and loses
Implement fractional knapsack (you may take fractions of items) greedily by value/weight ratio. Then show with an example that the same greedy fails for 0/1 knapsack, and compare it with the DP answer.
:::solution
```python
def fractional_knapsack(items, cap):              # items: (value, weight)
    total = 0.0
    for v, w in sorted(items, key=lambda it: it[0] / it[1], reverse=True):
        take = min(w, cap)
        total += v * take / w
        cap -= take
        if cap == 0:
            break
    return total

def greedy_01(items, cap):
    total = 0
    for v, w in sorted(items, key=lambda it: it[0] / it[1], reverse=True):
        if w <= cap:
            total += v; cap -= w
    return total

def dp_01(items, cap):
    dp = [0] * (cap + 1)
    for v, w in items:
        for c in range(cap, w - 1, -1):
            dp[c] = max(dp[c], dp[c - w] + v)
    return dp[cap]

items = [(60, 10), (100, 20), (120, 30)]
print(fractional_knapsack(items, 50), greedy_01(items, 50), dp_01(items, 50))
```
:::explain
With fractions allowed, the highest value-per-kg items should always be used first, and an exchange argument proves it, so greedy is optimal (240). In 0/1 knapsack, taking the best-ratio items (60 + 100 = 160) leaves 20 kg of capacity unusable, while the optimum takes the 20 kg and 30 kg items (220). Indivisibility breaks the greedy-choice property, which is the textbook illustration of when you need DP.
:::end
