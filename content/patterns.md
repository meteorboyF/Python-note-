# Problem-Solving Patterns

Most interview problems are variations on a dozen **patterns**. The skill isn't memorising 500 solutions. It's recognising *"oh, this is a sliding window"* within a minute. This chapter turns the 12 "Fundamental Code Blocks" from the practice workbook into reusable templates, with signals that tell you which one to reach for.

:::analogy A chef's mother sauces
French cooking has five "mother sauces", and almost every other sauce is a variation of one. Algorithms are the same. Learn the templates deeply, and new problems become "sliding window + hash map, with a twist".
:::

## Pattern recognition cheat sheet

| If the problem says… | Try |
|---|---|
| "sorted array", "pair/triplet with sum", "in place" | **Two pointers** |
| "contiguous subarray/substring", "longest/shortest with condition" | **Sliding window** |
| "sum of subarray", "range sum", "count subarrays with sum k" | **Prefix sums + hash map** |
| "frequency", "anagram", "duplicates", "first unique" | **Hash map / Counter** |
| "overlapping intervals", "meeting rooms", "merge ranges" | **Sort + sweep (intervals)** |
| "next greater", "previous smaller", "span" | **Monotonic stack** |
| "top k", "kth largest", "merge k sorted" | **Heap** |
| "minimum steps", "shortest path", "level" | **BFS** |
| "all combinations/permutations/subsets" | **Backtracking** |
| "min/max ways, count ways, optimal with overlapping choices" | **Dynamic programming** |
| "sorted + find boundary", "minimise the max" | **Binary search (on the answer)** |
| "connected groups", "union", "redundant edge" | **Union-Find** |
| "linked list cycle / middle" | **Fast & slow pointers** |

## 1. Frequency counter

```python
from collections import Counter, defaultdict

def first_unique_char(s):                     # LeetCode 387
    counts = Counter(s)
    return next((i for i, ch in enumerate(s) if counts[ch] == 1), -1)

def can_construct(note, magazine):            # LeetCode 383
    return not (Counter(note) - Counter(magazine))

print(first_unique_char("loveleetcode"), can_construct("aab", "baa"), can_construct("aa", "ab"))
```

## 2. Two pointers

**Opposite ends** (sorted input, pairs) and **same direction** (read/write, fast/slow).

```python
def two_sum_sorted(nums, target):              # LeetCode 167
    l, r = 0, len(nums) - 1
    while l < r:
        s = nums[l] + nums[r]
        if s == target:
            return [l, r]
        if s < target:
            l += 1                             # need a bigger sum
        else:
            r -= 1                             # need a smaller sum
    return []

def remove_duplicates(nums):                   # LeetCode 26, in place
    w = 0
    for r in range(len(nums)):
        if r == 0 or nums[r] != nums[r - 1]:
            nums[w] = nums[r]
            w += 1
    return w, nums[:w]

def max_area(h):                               # LeetCode 11: container with most water
    l, r, best = 0, len(h) - 1, 0
    while l < r:
        best = max(best, (r - l) * min(h[l], h[r]))
        if h[l] < h[r]:
            l += 1                             # moving the taller side can't help
        else:
            r -= 1
    return best

print(two_sum_sorted([2, 7, 11, 15], 9), remove_duplicates([1, 1, 2, 3, 3]), max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]))
```

:::tip Why two pointers work on sorted data
With the sum too small, moving `r` left only makes it smaller, so the only useful move is `l += 1`. Each step **safely discards** one candidate, giving O(n) instead of checking all n² pairs.
:::

## 3. Sliding window

```python
def max_sum_fixed(nums, k):                    # fixed size k
    window = sum(nums[:k])
    best = window
    for i in range(k, len(nums)):
        window += nums[i] - nums[i - k]        # slide: add the new, drop the old
        best = max(best, window)
    return best

def min_subarray_len(target, nums):            # variable size, LeetCode 209
    left = total = 0
    best = float("inf")
    for right, x in enumerate(nums):
        total += x
        while total >= target:                 # shrink while still valid
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return 0 if best == float("inf") else best

print(max_sum_fixed([2, 1, 5, 1, 3, 2], 3), min_subarray_len(7, [2, 3, 1, 2, 4, 3]))
```

The variable-window template:

```python norun
left = 0
for right, x in enumerate(seq):
    add x to the window state
    while the window is invalid (or: while it's valid, for "shortest"):
        update the answer (for "shortest")
        remove seq[left] from the state; left += 1
    update the answer (for "longest")
```

## 4. Prefix sums

```python
from itertools import accumulate

nums = [3, 1, 4, 1, 5, 9, 2, 6]
P = [0] + list(accumulate(nums))               # P[i] = sum(nums[:i])
def range_sum(l, r):                           # sum(nums[l:r+1]) in O(1)
    return P[r + 1] - P[l]
print(P, range_sum(2, 5), sum(nums[2:6]))

grid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]       # 2-D prefix sums
R, C = len(grid), len(grid[0])
S = [[0] * (C + 1) for _ in range(R + 1)]
for r in range(R):
    for c in range(C):
        S[r + 1][c + 1] = grid[r][c] + S[r][c + 1] + S[r + 1][c] - S[r][c]
def rect(r1, c1, r2, c2):
    return S[r2 + 1][c2 + 1] - S[r1][c2 + 1] - S[r2 + 1][c1] + S[r1][c1]
print(rect(1, 1, 2, 2), 5 + 6 + 8 + 9)
```

## 5. Hash map + prefix: counting subarrays

```python
from collections import defaultdict
def count_subarrays_sum_k(nums, k):           # LeetCode 560
    seen = defaultdict(int, {0: 1})
    prefix = count = 0
    for x in nums:
        prefix += x
        count += seen[prefix - k]
        seen[prefix] += 1
    return count

def longest_balanced(binary):                  # LeetCode 525: equal 0s and 1s
    first = {0: -1}
    bal = best = 0
    for i, b in enumerate(binary):
        bal += 1 if b else -1
        if bal in first:
            best = max(best, i - first[bal])
        else:
            first[bal] = i                     # store the FIRST occurrence for the longest span
    return best

print(count_subarrays_sum_k([1, 2, 1, 2, 1], 3), longest_balanced([0, 1, 0, 0, 1, 1, 0]))
```

## 6. Intervals

```python
def merge(intervals):
    out = []
    for s, e in sorted(intervals):
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out

def min_meeting_rooms(meetings):               # sweep line over start/end events
    events = sorted([(s, 1) for s, _ in meetings] + [(e, -1) for _, e in meetings])
    cur = best = 0
    for _, delta in events:                    # ends (-1) sort before starts (+1) at equal times
        cur += delta
        best = max(best, cur)
    return best

print(merge([[1, 3], [2, 6], [8, 10], [15, 18]]), min_meeting_rooms([(0, 30), (5, 10), (15, 20)]))
```

## 7. Fast & slow pointers

Middle of a list, cycle detection, and "happy number" style sequences, covered in *Linked Lists*. The same trick works on **functions**: find a duplicate in an array of 1..n by treating `i → nums[i]` as a linked list (LeetCode 287).

```python
def find_duplicate(nums):
    slow = fast = nums[0]
    while True:
        slow, fast = nums[slow], nums[nums[fast]]
        if slow == fast:
            break
    slow = nums[0]
    while slow != fast:
        slow, fast = nums[slow], nums[fast]
    return slow

print(find_duplicate([1, 3, 4, 2, 2]), find_duplicate([3, 1, 3, 4, 2]))
```

## 8. Sorting as a pattern

Sorting first unlocks two pointers, greedy choices, deduplication and binary search. It's often the right first move when the order of the input doesn't matter.

```python
def three_sum(nums):                           # LeetCode 15
    nums.sort()
    out = []
    for i in range(len(nums) - 2):
        if i and nums[i] == nums[i - 1]:
            continue                           # skip duplicate anchors
        l, r = i + 1, len(nums) - 1
        while l < r:
            s = nums[i] + nums[l] + nums[r]
            if s < 0: l += 1
            elif s > 0: r -= 1
            else:
                out.append([nums[i], nums[l], nums[r]])
                while l < r and nums[l] == nums[l + 1]: l += 1
                while l < r and nums[r] == nums[r - 1]: r -= 1
                l, r = l + 1, r - 1
    return out

print(three_sum([-1, 0, 1, 2, -1, -4]))
```

## 9. I/O and parsing patterns

```python
import io, sys
fake_stdin = io.StringIO("3\n1 2 3\n4 5 6\n7 8 9\n")
n = int(fake_stdin.readline())
grid = [list(map(int, fake_stdin.readline().split())) for _ in range(n)]
print(grid)
data = "5 10\n1 2 3 4 5".split()               # read EVERYTHING, then walk a pointer (fast for contests)
it = iter(data)
count, limit = int(next(it)), int(next(it))
values = [int(next(it)) for _ in range(count)]
print(count, limit, values)
```

## 10. Comprehension, error-handling, generator and math utilities

```python
import math
from functools import reduce
print(math.gcd(84, 36), math.lcm(4, 6), reduce(math.gcd, [12, 18, 24]))
def is_prime(n): return n > 1 and all(n % d for d in range(2, math.isqrt(n) + 1))
def sieve(n):
    is_p = [True] * (n + 1); is_p[0:2] = [False, False]
    for i in range(2, math.isqrt(n) + 1):
        if is_p[i]:
            is_p[i * i::i] = [False] * len(is_p[i * i::i])
    return [i for i, p in enumerate(is_p) if p]
print([x for x in range(30) if is_prime(x)] == sieve(29), sieve(50))
print(pow(2, 100, 10**9 + 7), math.comb(10, 3), math.factorial(10))
```

## Problem → pattern index (from the workbook)

| Problem | Pattern |
|---|---|
| Two Sum | hash map |
| Reverse String / Palindrome | two pointers |
| Max Consecutive Ones | sliding window / counter |
| Longest Substring Without Repeating | sliding window + dict |
| Group Anagrams | hash map with canonical keys |
| Valid Parentheses | stack |
| Product Except Self | prefix/suffix products |
| Top K Frequent | Counter + heap / buckets |
| Decode String | stack |
| Minimum Window Substring | sliding window + Counter |
| Longest Consecutive Sequence | hash set |
| Trapping Rain Water | two pointers / prefix max |
| Longest Palindromic Substring | expand around centre |

## Practice problems

:::problem basic | Valid palindrome II | two pointers + one skip
Can the string become a palindrome by deleting **at most one** character (LeetCode 680)?
:::solution
```python
def valid_palindrome(s):
    def is_pal(i, j):
        while i < j:
            if s[i] != s[j]:
                return False
            i, j = i + 1, j - 1
        return True
    i, j = 0, len(s) - 1
    while i < j:
        if s[i] != s[j]:
            return is_pal(i + 1, j) or is_pal(i, j - 1)   # try skipping either side
        i, j = i + 1, j - 1
    return True

print([valid_palindrome(s) for s in ["aba", "abca", "abc", "deeee"]])
```
:::explain
Walk inward until the first mismatch. Then the only possible fixes are deleting the left character or the right one, so check both remaining substrings once. O(n).
:::end

:::problem basic | Maximum average subarray | fixed sliding window
Return the maximum average of any contiguous subarray of length `k` (LeetCode 643).
:::solution
```python
def find_max_average(nums, k):
    window = best = sum(nums[:k])
    for i in range(k, len(nums)):
        window += nums[i] - nums[i - k]
        best = max(best, window)
    return best / k

print(find_max_average([1, 12, -5, -6, 50, 3], 4))
```
:::explain
Re-summing each window costs O(k), giving O(n·k) overall. Sliding adds the entering element and subtracts the leaving one, so each window costs O(1) and the total is O(n). Divide only once at the end.
:::end

:::problem basic | Running sum & pivot index | prefix sums
Return the index where the sum of the elements to the left equals the sum to the right (LeetCode 724), or -1.
:::solution
```python
def pivot_index(nums):
    total, left = sum(nums), 0
    for i, x in enumerate(nums):
        if left == total - left - x:
            return i
        left += x
    return -1

print(pivot_index([1, 7, 3, 6, 5, 6]), pivot_index([1, 2, 3]), pivot_index([2, 1, -1]))
```
:::explain
The right sum is `total - left - x`, so there's no need for a second prefix array. One pass, O(1) extra space.
:::end

:::problem medium | Longest repeating character replacement | sliding window with a max count
You may replace at most `k` characters. Return the length of the longest substring that can become all one letter (LeetCode 424).
:::solution
```python
from collections import Counter

def character_replacement(s, k):
    count = Counter()
    left = max_freq = best = 0
    for right, ch in enumerate(s):
        count[ch] += 1
        max_freq = max(max_freq, count[ch])
        while (right - left + 1) - max_freq > k:     # replacements needed > k: shrink
            count[s[left]] -= 1
            left += 1
        best = max(best, right - left + 1)
    return best

print(character_replacement("ABAB", 2), character_replacement("AABABBA", 1))
```
:::explain
A window is valid if `length - (count of its most common letter) ≤ k`, because we'd replace everything else. Grow on the right and shrink on the left when invalid. Subtle trick: `max_freq` is never decreased. A stale (too high) value can only keep the window the same size, never produce a wrong larger answer, so the result is still correct and the loop stays O(n).
:::end

:::problem medium | Insert interval | interval sweep
Insert `new` into a sorted list of non-overlapping intervals, merging where necessary (LeetCode 57), in O(n).
:::solution
```python
def insert_interval(intervals, new):
    out, i, n = [], 0, len(intervals)
    s, e = new
    while i < n and intervals[i][1] < s:            # 1. entirely before
        out.append(intervals[i]); i += 1
    while i < n and intervals[i][0] <= e:           # 2. overlapping: absorb
        s, e = min(s, intervals[i][0]), max(e, intervals[i][1]); i += 1
    out.append([s, e])
    out.extend(intervals[i:])                       # 3. entirely after
    return out

print(insert_interval([[1, 3], [6, 9]], [2, 5]), insert_interval([[1, 2], [3, 5], [6, 7], [8, 10], [12, 16]], [4, 8]))
```
:::explain
Because the input is already sorted, there are exactly three phases: intervals ending before the new one starts, intervals overlapping it (grow the new interval to cover them), and intervals after it. That's one linear pass with no sorting needed.
:::end

:::problem medium | Subarray product less than K | sliding window counting
Count the contiguous subarrays (positive integers) whose product is strictly less than `k` (LeetCode 713).
:::solution
```python
def num_subarray_product_less_than_k(nums, k):
    if k <= 1:
        return 0
    prod, left, count = 1, 0, 0
    for right, x in enumerate(nums):
        prod *= x
        while prod >= k:
            prod //= nums[left]
            left += 1
        count += right - left + 1        # every subarray ENDING at right and starting in [left, right]
    return count

print(num_subarray_product_less_than_k([10, 5, 2, 6], 100))
```
:::explain
For each `right`, once the window is valid, **every** subarray that ends at `right` and starts anywhere in the window is valid too (removing elements only shrinks a product of positive numbers). That's `right - left + 1` new subarrays. Counting this way is a sliding-window superpower: O(n) instead of enumerating O(n²) subarrays.
:::end

:::problem hard | Longest palindromic substring | expand around centre
Return the longest palindromic substring (LeetCode 5) in O(n²) time and O(1) space.
:::solution
```python
def longest_palindrome(s):
    best_l, best_r = 0, 0
    def expand(l, r):
        while l >= 0 and r < len(s) and s[l] == s[r]:
            l, r = l - 1, r + 1
        return l + 1, r - 1                     # the last valid bounds
    for i in range(len(s)):
        for l, r in (expand(i, i), expand(i, i + 1)):   # odd and even centres
            if r - l > best_r - best_l:
                best_l, best_r = l, r
    return s[best_l:best_r + 1]

print([longest_palindrome(s) for s in ["babad", "cbbd", "forgeeksskeegfor", "a"]])
```
:::explain
Every palindrome has a **centre**: one character (odd length) or a gap between two (even length). There are 2n − 1 centres, and expanding from each costs O(n), giving O(n²) with no extra memory. (Manacher's algorithm achieves O(n) by reusing mirrored information, which is worth knowing exists.)
:::end

:::problem hard | Sliding window: substring with concatenation of all words | window over word-sized steps
Given `s` and a list of equal-length `words`, return the start indices of substrings that are a concatenation of each word exactly once, in any order (LeetCode 30).
:::solution
```python
from collections import Counter

def find_substring(s, words):
    if not words:
        return []
    L, k = len(words[0]), len(words)
    need = Counter(words)
    out = []
    for offset in range(L):                      # one sliding window per alignment
        left, have, used = offset, Counter(), 0
        for right in range(offset, len(s) - L + 1, L):
            w = s[right:right + L]
            if w not in need:
                left, have, used = right + L, Counter(), 0   # reset past the bad word
                continue
            have[w] += 1; used += 1
            while have[w] > need[w]:             # too many copies of w: shrink
                have[s[left:left + L]] -= 1
                left += L; used -= 1
            if used == k:
                out.append(left)
                have[s[left:left + L]] -= 1      # slide forward by one word
                left += L; used -= 1
    return sorted(out)

print(find_substring("barfoothefoobarman", ["foo", "bar"]), find_substring("barfoofoobarthefoobarman", ["bar", "foo", "the"]))
```
:::explain
Treat each word-sized chunk as one "character" and run a sliding window over chunks, once for each of the L possible alignments. `have` vs `need` Counters track multiplicity. Seeing an unknown word resets the window, and too many copies shrink it from the left. Each chunk enters and leaves a window once per alignment: O(L · n/L · L) = O(n·L), versus O(n·k·L) for checking every start position independently.
:::end

:::problem hard | Count of range sums | prefix sums + merge sort
Count the pairs of prefix indices `i < j` with `lower ≤ P[j] − P[i] ≤ upper` (LeetCode 327), i.e. the subarrays whose sum lies in a range, in O(n log n).
:::solution
```python
import random
from itertools import accumulate

def count_range_sum(nums, lower, upper):
    P = [0] + list(accumulate(nums))
    def sort_count(lo, hi):                     # works on P[lo:hi]
        if hi - lo <= 1:
            return 0
        mid = (lo + hi) // 2
        count = sort_count(lo, mid) + sort_count(mid, hi)
        j = k = mid
        for left in P[lo:mid]:                  # both halves are sorted now
            while j < hi and P[j] - left < lower: j += 1
            while k < hi and P[k] - left <= upper: k += 1
            count += k - j
        P[lo:hi] = sorted(P[lo:hi])
        return count
    return sort_count(0, len(P))

def brute(nums, lo, hi):
    return sum(lo <= sum(nums[i:j]) <= hi for i in range(len(nums)) for j in range(i + 1, len(nums) + 1))

for _ in range(200):
    a = [random.randint(-5, 5) for _ in range(random.randint(0, 12))]
    assert count_range_sum(a, -2, 3) == brute(a, -2, 3)
print(count_range_sum([-2, 5, -1], -2, 2))
```
:::explain
Subarray sums are differences of prefix sums. During merge sort over the prefix array, for each element of the sorted left half, the valid right-half partners form a **contiguous block** (both halves are sorted), found with two monotonically advancing pointers. Counting cross-half pairs takes O(n) per level, so O(n log n) overall. This pattern ("prefix sums + divide and conquer") also solves inversion-style counting problems. (`sorted` on the merged slice keeps the code short. A manual merge would remove the extra log factor.)
:::end
