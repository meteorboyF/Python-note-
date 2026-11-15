# Operators & Expressions

An **expression** is any piece of code that produces a value: `2 + 3`, `len(xs) > 0`, `a if ok else b`. **Operators** are the symbols that combine values. Python's operators look familiar, but several behave differently from C, Java or JavaScript, and interviewers love those differences.

:::analogy Operators are verbs
Values are nouns (`5`, `"hi"`, `[1, 2]`) and operators are verbs ("add", "compare", "check membership"). The same verb can mean different things for different nouns: `+` adds numbers but **joins** strings and lists. That's called **operator overloading**, and in Part 2 you'll teach your own classes these verbs.
:::

**What you'll learn**: arithmetic (especially `//`, `%`, `**` with negatives), comparison chaining, `and`/`or` returning values (short-circuiting), membership and identity, the walrus operator `:=`, bitwise operators, augmented assignment, and precedence.

## 1. Arithmetic operators

| Op | Meaning | `7 ? 2` | `-7 ? 2` | Notes |
|---|---|---|---|---|
| `+` | add | 9 | -5 | joins `str`/`list`/`tuple` |
| `-` | subtract | 5 | -9 | set difference for sets |
| `*` | multiply | 14 | -14 | repeats sequences: `"ab" * 3` |
| `/` | true division | 3.5 | -3.5 | **always returns float** |
| `//` | floor division | 3 | **-4** | rounds toward **−∞** |
| `%` | modulo | 1 | **1** | result has the **sign of the divisor** |
| `**` | power | 49 | 49 | right-associative: `2**3**2 == 2**9` |

```python
print(7 / 2, 7 // 2, 7 % 2)        # 3.5 3 1
print(-7 // 2, -7 % 2)             # -4 1   (NOT -3 and -1 like C/Java)
print(7 // -2, 7 % -2)             # -4 -1
print(divmod(-7, 2))               # (-4, 1)
print(2 ** 3 ** 2)                 # 512 = 2 ** 9
print(-2 ** 2)                     # -4  (** binds tighter than unary minus)
print((-2) ** 2)                   # 4
print(7.0 // 2, type(7.0 // 2))    # 3.0 <class 'float'>
```

:::deep The invariant behind `//` and `%`
Python guarantees `a == (a // b) * b + (a % b)` **and** that `a % b` has the same sign as `b`. Since `//` floors, `-7 // 2 == -4`, which forces `-7 % 2 == 1`. This makes `%` perfect for **wrapping indices**: `(i - 1) % n` is always a valid index in `0..n-1`, even when `i == 0`.
:::

```python
n = 5
for i in range(n):
    print(i, "prev:", (i - 1) % n, "next:", (i + 1) % n)   # circular neighbours
```

:::trap Truncation vs floor
`int(-3.5)` → `-3` (truncates toward zero) but `-7 // 2` → `-4` (floors). To get C-style truncating division use `int(a / b)`, or `math.trunc`, but beware float precision for huge ints.
:::

## 2. Comparison operators & chaining

`==  !=  <  <=  >  >=` compare values. Python lets you **chain** them: `a < b < c` means `a < b and b < c`, and `b` is evaluated only **once**.

```python
x = 5
print(1 < x < 10)          # True
print(1 < x > 3)           # True: 1 < 5 and 5 > 3 (legal, but confusing)
print(1 == 1.0 == True)    # True
print("apple" < "banana")  # True: strings compare lexicographically by code point
print("Zebra" < "apple")   # True! uppercase letters have smaller code points
print([1, 2, 3] < [1, 3])  # True: compares element by element
```

:::trap The chaining surprise
`False == False in [False]` is `True`. It means `(False == False) and (False in [False])`. Also `x == y == z` is **not** `(x == y) == z`. When in doubt, add parentheses.
:::

```python error
print(3 < "4")     # TypeError: '<' not supported between 'int' and 'str'
```

## 3. Logical operators return **values**, not just booleans

`and`, `or` and `not` **short-circuit**: they stop evaluating as soon as the result is known. And unlike most languages, `and`/`or` return **one of the operands**, not necessarily `True`/`False`.

| Expression | Returns |
|---|---|
| `a or b` | `a` if `a` is truthy, else `b` |
| `a and b` | `a` if `a` is falsy, else `b` |
| `not a` | always a `bool` |

```python
print(0 or "default")        # 'default'
print("set" or "default")    # 'set'
print([] and 1/0)            # []   -> 1/0 is never evaluated!
print(3 and 4)               # 4
print(None or 0 or "" or [])  # [] (last operand when all are falsy)
name = ""
display = name or "Anonymous"
print(display)
```

:::trap `x or default` swallows valid falsy values
`timeout = user_timeout or 30` replaces a legitimate `0` with `30`. When `0`/`""`/`[]` are valid, write `timeout = 30 if user_timeout is None else user_timeout`.
:::

:::quiz
What does `print(1 or 2 and 0)` print?
- [x] `1`
- [ ] `0`
- [ ] `True`
- [ ] `2`
`and` binds tighter than `or`, so it's `1 or (2 and 0)`. `1` is truthy, so `or` short-circuits and returns `1`. The right side is never evaluated.
:::

## 4. Membership & identity

```python
print(3 in [1, 2, 3], "ell" in "hello", "a" in {"a": 1})   # dict: checks KEYS
print(4 not in {1, 2, 3})
x = None
print(x is None, x is not None)
```

| Container | `in` cost | Why |
|---|---|---|
| `list`, `tuple`, `str` | O(n) | scans left to right |
| `set`, `frozenset`, `dict` keys | O(1) average | hash lookup |
| `range` | O(1) | arithmetic check (for ints) |

:::tip Membership tests on big data
If you check `x in items` inside a loop, convert `items` to a set first: `items = set(items)`. That turns O(n·m) into O(n + m).
:::

## 5. Assignment, augmented assignment & the walrus

```python
count = 0
count += 1; count *= 10; count //= 3; count **= 2; count %= 7
print(count)

# augmented assignment on mutable objects mutates IN PLACE
a = [1]; b = a
a += [2]          # same as a.extend([2]) -> b sees it
print(b)
t = (1,); u = t
t += (2,)         # tuples are immutable -> new tuple, u unchanged
print(t, u)
```

### The walrus operator `:=` (Python 3.8+)

`name := expr` **assigns and returns** the value inside an expression. It's handy when you'd otherwise compute something twice.

```python
data = [4, 8, 15, 16, 23, 42]
if (n := len(data)) > 5:
    print(f"list is long ({n} items)")

# reuse an expensive result inside a comprehension
results = [y for x in data if (y := x * x) % 2 == 0]
print(results)

# read-until-sentinel loop
lines = iter(["a", "b", "", "c"])
while (line := next(lines)) != "":
    print("got", line)
```

:::note Walrus rules
You can't use it as a top-level statement (`x := 5` is a SyntaxError, so write `x = 5`). Wrap it in parentheses in most contexts. Use it when it removes duplication, not to show off.
:::

## 6. Bitwise operators

They work on the **binary digits** of integers. You'll use them for flags, masks, and many interview tricks (see *Greedy & Bit Manipulation*).

| Op | Name | `12 ? 10` (`1100`, `1010`) | Result |
|---|---|---|---|
| `&` | AND | `1000` | 8 |
| `\|` | OR | `1110` | 14 |
| `^` | XOR | `0110` | 6 |
| `~x` | NOT | `~12` | -13 (= `-x - 1`) |
| `<<` | left shift | `3 << 2` | 12 (×4) |
| `>>` | right shift | `13 >> 1` | 6 (floor ÷2) |

```python
a, b = 12, 10
print(bin(a), bin(b))
print(a & b, a | b, a ^ b, ~a, a << 2, a >> 2)
print(5 & 1 == 1)              # True: in Python & binds TIGHTER than == -> (5 & 1) == 1
print((5 & 1) == 1)            # same thing, but clearer (and safe if you come from C)
READ, WRITE, EXEC = 1, 2, 4
perm = READ | WRITE
print(bool(perm & WRITE), bool(perm & EXEC))
```

:::trap `&` vs `and`, and the precedence of `&`
`and` is logical and short-circuits. `&` is bitwise and evaluates both sides. In Python, `&`, `^` and `|` bind **tighter than comparisons**. That's the opposite of C/Java, where `x & 1 == 1` means `x & (1 == 1)`. It helps for `x & 1 == 1`, but it hurts in NumPy/Pandas, where you **must** use `&`, `|`, `~` on boolean arrays **with parentheses**: `(df.a > 1) & (df.b < 5)`. Without them, `df.a > 1 & df.b < 5` parses as `df.a > (1 & df.b) < 5` and fails.
:::

## 7. Operator precedence (highest → lowest)

| Level | Operators |
|---|---|
| 1 | `()` grouping, calls, indexing `x[i]`, attribute `x.a` |
| 2 | `await` |
| 3 | `**` (right-associative) |
| 4 | unary `+x`, `-x`, `~x` |
| 5 | `*`, `/`, `//`, `%`, `@` |
| 6 | `+`, `-` |
| 7 | `<<`, `>>` |
| 8 | `&` |
| 9 | `^` |
| 10 | `\|` |
| 11 | comparisons, `in`, `not in`, `is`, `is not` |
| 12 | `not` |
| 13 | `and` |
| 14 | `or` |
| 15 | `if … else` (conditional expression) |
| 16 | `lambda` |
| 17 | `:=` |

:::boss Memory hook
**"PEMDAS, then bits, then compare, then not/and/or."** If you have to *think* about precedence, add parentheses. Readers will thank you.
:::

## 8. The conditional (ternary) expression

```python
age = 20
status = "adult" if age >= 18 else "minor"
print(status)
# nested (readable only when short)
n = 0
sign = "pos" if n > 0 else "neg" if n < 0 else "zero"
print(sign)
```

## Tricks & tips

- `divmod(a, b)` gives `(a // b, a % b)` in one call. It's great for time conversion (`divmod(seconds, 60)`).
- `x % 2 == 1` or `x & 1` tests odd. Both work for negatives in Python (`-3 % 2 == 1`).
- `-(-a // b)` is integer **ceiling division** without floats: `-(-7 // 2) == 4`.
- `max(lo, min(x, hi))` clamps a value into a range.
- `(a ^ b) < 0` is True when two ints have opposite signs (the XOR of the sign bits is negative). Python already groups `a ^ b < 0` this way because bitwise operators bind tighter than comparisons, but keep the parentheses for readers. `(a < 0) != (b < 0)` is the readable alternative.
- `n > 0 and (n & (n - 1)) == 0` tests whether `n` is a power of two.
- `@` is the **matrix multiplication** operator, used by NumPy: `A @ B`.

## The most dangerous traps

| # | Trap | Example | Correct |
|---|---|---|---|
| 1 | `//` floors toward −∞ | `-7 // 2 == -4` | `int(-7 / 2)` for truncation |
| 2 | `%` takes divisor's sign | `-7 % 3 == 2` | `math.fmod(-7, 3) == -1.0` for C-style |
| 3 | `-2 ** 2` | `-4` | `(-2) ** 2` |
| 4 | `or` for defaults eats `0` | `0 or 30 → 30` | `30 if x is None else x` |
| 5 | `&` precedence in pandas | `df.a > 1 & df.b < 5` | `(df.a > 1) & (df.b < 5)` |
| 6 | `and`/`or` in NumPy | ValueError: truth value ambiguous | `&`, `\|`, `~` with parentheses |
| 7 | `is` for numbers | `1000 is 1000` | `==` |
| 8 | Comparing str with int | `TypeError` | convert first |
| 9 | `/` always float | `4 / 2 == 2.0` | `//` for int results |
| 10 | `a += b` vs `a = a + b` on lists | aliases differ | know mutability |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
print(-7 // 2, -7 % 2, 7 // -2)
```
What prints?
- [ ] `-3 -1 -3`
- [x] `-4 1 -4`
- [ ] `-4 -1 -3`
`//` rounds toward −∞ (floor), so `-7 // 2` is `-4` and `7 // -2` is `-4`. The remainder takes the **divisor's** sign, so `-7 % 2` is `1`, which keeps `(-4) * 2 + 1 == -7` true.
:::

:::quiz
```python norun
x = 0
y = x or "default"
z = x and 1/0
print(y, z)
```
What happens?
- [ ] `ZeroDivisionError`
- [ ] `default False`
- [x] `default 0`
`x or "default"` returns the first truthy operand, `"default"`. `x and 1/0` stops at the first falsy operand and **returns it**, which is `0`. The division never runs: that's short-circuiting.
:::

## Practice problems

:::problem basic | Seconds to H:M:S | divmod, floor division
Write `hms(seconds)` returning a string like `"02:05:09"` for `7509`. Use `divmod`.
:::solution
```python
def hms(seconds):
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"

print(hms(7509))   # 02:05:09
print(hms(59), hms(3600), hms(86399))
```
:::explain
`divmod(7509, 60)` → `(125, 9)`: 125 minutes, 9 seconds. Then `divmod(125, 60)` → `(2, 5)`. The format spec `02d` pads with zeros to width 2.
:::trace
| Step | Call | Result |
|---|---|---|
| 1 | `divmod(7509, 60)` | m=125, s=9 |
| 2 | `divmod(125, 60)` | h=2, m=5 |
| 3 | format | `"02:05:09"` |
:::end

:::problem basic | Ceiling division without floats | //, negatives
Compute `ceil(a / b)` for positive ints using only `//` and unary minus. Check it against `math.ceil` for `a` in 1..50 and `b` in 1..10, and explain why `(a + b - 1) // b` also works.
:::solution
```python
import math

def ceil_div(a, b):
    return -(-a // b)

ok = all(ceil_div(a, b) == math.ceil(a / b) for a in range(1, 51) for b in range(1, 11))
print(ok, ceil_div(7, 2), (7 + 2 - 1) // 2)
```
:::explain
Floor division rounds toward −∞. Negating, flooring, then negating again turns "floor" into "ceiling": `-(-7 // 2) = -(-4) = 4`. The `(a + b - 1) // b` form adds just enough to push any non-zero remainder over the next multiple. Both avoid floats, which lose precision for very large integers (try `10**30 + 1`).
:::end

:::problem basic | Default values done right | or vs is None
`get_timeout(cfg)` should return `cfg["timeout"]` when present (even if it's `0`), otherwise `30`. Show why `cfg.get("timeout") or 30` is buggy.
:::solution
```python
def get_timeout_buggy(cfg):
    return cfg.get("timeout") or 30

def get_timeout(cfg):
    t = cfg.get("timeout")
    return 30 if t is None else t

for cfg in [{}, {"timeout": 5}, {"timeout": 0}]:
    print(cfg, get_timeout_buggy(cfg), get_timeout(cfg))
```
:::explain
With `{"timeout": 0}`, `0 or 30` evaluates to `30` because `0` is falsy. Explicitly testing `is None` separates "missing" from "present but falsy". An even simpler version here is `cfg.get("timeout", 30)`, since `.get` only uses the default when the key is truly absent.
:::end

:::problem basic | Circular array neighbours | modulo wrap-around
Given a list `xs`, return a list where each element is the sum of its left and right neighbours, treating the list as **circular**.
:::solution
```python
def neighbour_sums(xs):
    n = len(xs)
    return [xs[(i - 1) % n] + xs[(i + 1) % n] for i in range(n)]

print(neighbour_sums([1, 2, 3, 4]))   # [6, 4, 6, 4]
```
:::explain
`(i - 1) % n` wraps `-1` to `n - 1` because Python's `%` returns a non-negative result for a positive divisor. Strictly, `xs[-1]` already works in Python thanks to negative indexing, but `(i + 1) % n` is what saves you from an `IndexError` at the end. The modulo pattern also carries over to languages without negative indexing.
:::end

:::problem medium | Evaluate like the interpreter | precedence, short-circuit
Predict each value, then run to verify:
`2 + 3 * 4 ** 2`, `not 1 == 2`, `1 < 2 == 2`, `[] or {} or 0`, `3 & 5 | 2`, `-3 ** 2`, `10 - 4 - 3`, `2 ** -1`.
:::solution
```python
exprs = ["2 + 3 * 4 ** 2", "not 1 == 2", "1 < 2 == 2", "[] or {} or 0",
         "3 & 5 | 2", "-3 ** 2", "10 - 4 - 3", "2 ** -1"]
for e in exprs:
    print(f"{e:18} -> {eval(e)!r}")
```
:::explain
- `2 + 3 * 16 = 50` (`**` first, then `*`, then `+`).
- `not (1 == 2)` → `True` (`not` is lower than `==`).
- `1 < 2 == 2` is a **chain**: `1 < 2 and 2 == 2` → `True`.
- `[] or {} or 0` → `0`. All are falsy, so the last operand is returned.
- `(3 & 5) | 2 = 1 | 2 = 3`.
- `-(3 ** 2) = -9`.
- `(10 - 4) - 3 = 3`, because subtraction is left-associative.
- `2 ** -1 = 0.5`. A negative exponent gives a float.
:::end

:::problem medium | Safe division chain | short-circuit evaluation
Write `safe_ratio(a, b)` in a **single expression** that returns `a / b`, or `None` if `b` is 0 or `None`, without `if` statements or try/except.
:::solution
```python
def safe_ratio(a, b):
    return (b or None) and a / b

for a, b in [(6, 3), (6, 0), (6, None), (0, 5)]:
    print(a, b, safe_ratio(a, b))
```
:::explain
If `b` is falsy (`0` or `None`), `b or None` gives `None`, and `None and …` short-circuits to `None`, so `a / b` never runs and there's no ZeroDivisionError. Otherwise `b or None` is `b` (truthy), and `and` evaluates and returns `a / b`. Note `(0, 5)` correctly returns `0.0`. Use tricks like this sparingly: a plain `if` is often clearer, but you **must** be able to read them.
:::end

:::problem medium | Walrus-powered chunk reader | :=, iteration
Using `:=`, read a string in chunks of 4 characters from an `io.StringIO` until it's exhausted, collecting the chunks into a list.
:::solution
```python
import io
stream = io.StringIO("abcdefghij")
chunks = []
while chunk := stream.read(4):
    chunks.append(chunk)
print(chunks)   # ['abcd', 'efgh', 'ij']
```
:::explain
`stream.read(4)` returns `""` at the end, and `""` is falsy, so the loop stops. Without the walrus you'd write the `read` call twice (once before the loop, once at the bottom) or use `while True: … break`. This is the canonical use case cited in PEP 572.
:::end

:::problem medium | Power of two & bit tricks | bitwise
Write `is_power_of_two(n)`, `lowest_set_bit(n)` and `count_bits(n)` using bit operations only (no loops over digits for the first two).
:::solution
```python
def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0

def lowest_set_bit(n):
    return n & -n

def count_bits(n):
    c = 0
    while n:
        n &= n - 1        # clears the lowest set bit
        c += 1
    return c

print([x for x in range(1, 70) if is_power_of_two(x)])
print(lowest_set_bit(12), lowest_set_bit(40))  # 4 8
print(count_bits(255), count_bits(12), (255).bit_count())
```
:::explain
Subtracting 1 flips the lowest set bit and every 0 below it: `1000 - 1 = 0111`. For a power of two (exactly one set bit), `n & (n-1)` is 0. `n & -n` isolates the lowest set bit thanks to two's-complement negation (`-n = ~n + 1`). Brian Kernighan's loop runs once per **set** bit, not per bit. Python 3.10+ also has `int.bit_count()`.
:::trace
`count_bits(12)` (12 = `1100`):
| n (binary) | n - 1 | n & (n-1) | c |
|---|---|---|---|
| 1100 | 1011 | 1000 | 1 |
| 1000 | 0111 | 0000 | 2 |
| 0 | stop | | **2** |
:::end

:::problem hard | Implement integer division yourself | //, %, signs, bit shifts
Implement `py_divmod(a, b)` that matches Python's `divmod` for **all** integer signs (b ≠ 0), using only `+`, `-`, comparisons and bit shifts (no `/`, `//`, `%`, `*`). It must be O(log² n) or better, not repeated subtraction.
:::hint
Divide absolute values with "shift-subtract" long division in binary. Then fix up the signs so that the remainder takes the sign of `b` and `a == q*b + r`.
:::solution
```python
import random

def udiv(a, b):                     # a >= 0, b > 0
    q = 0
    for shift in range(a.bit_length(), -1, -1):
        if (b << shift) <= a:
            a -= b << shift
            q |= 1 << shift
    return q, a                     # quotient, remainder

def py_divmod(a, b):
    if b == 0:
        raise ZeroDivisionError
    q, r = udiv(abs(a), abs(b))
    if (a < 0) != (b < 0):          # signs differ -> truncated quotient is negative
        q = -q
        if r:                       # floor: step one further toward -inf
            q -= 1
            r = abs(b) - r
    if b < 0:
        r = -r                      # remainder takes the sign of the divisor
    return q, r

for _ in range(5000):
    a, b = random.randint(-10**6, 10**6), random.choice([i for i in range(-50, 51) if i])
    assert py_divmod(a, b) == divmod(a, b), (a, b)
print("all match;", py_divmod(-7, 2), py_divmod(7, -2), py_divmod(-7, -2))
```
:::explain
**Long division in binary.** We try the biggest shift first: if `b·2^k` fits into what remains of `a`, subtract it and set bit `k` of the quotient. That's at most `bit_length` iterations, each on big ints, so it's O(log² n) overall.

**Sign fix-up.** Unsigned division truncates. When the signs differ and there's a remainder, the true floored quotient is one smaller (more negative), and the remainder becomes `|b| - r`. Finally, the remainder must have `b`'s sign. The 5000 random cases check the invariant across every sign combination. This is a classic interview question ("divide two integers"), adapted to Python's floor semantics.
:::end

:::problem hard | Expression evaluator with precedence | parsing, operators
Write `evaluate(expr)` for strings with non-negative integers, `+ - * /` (integer `//`) and parentheses, respecting precedence and left-associativity, without `eval`. Example: `"2+3*(4-1)//2"` → `6`.
:::hint
Use recursive descent with one function per precedence level: `expr := term (('+'|'-') term)*`, `term := factor (('*'|'/') factor)*`, `factor := number | '(' expr ')'`.
:::solution
```python
import re

def evaluate(s):
    tokens = re.findall(r"\d+|//|[-+*/()]", s.replace(" ", ""))
    pos = 0

    def peek():
        return tokens[pos] if pos < len(tokens) else None

    def take():
        nonlocal pos
        pos += 1
        return tokens[pos - 1]

    def factor():
        tok = take()
        if tok == "(":
            val = expr()
            take()                     # the ')'
            return val
        return int(tok)

    def term():
        val = factor()
        while peek() in ("*", "/", "//"):
            op = take()
            rhs = factor()
            val = val * rhs if op == "*" else val // rhs
        return val

    def expr():
        val = term()
        while peek() in ("+", "-"):
            op = take()
            rhs = term()
            val = val + rhs if op == "+" else val - rhs
        return val

    return expr()

for e in ["2+3*(4-1)//2", "10-4-3", "2*(3+4)*5", "100/7/2", "((7))"]:
    print(e, "=", evaluate(e), "| python:", eval(e.replace("/", "//").replace("////", "//")))
```
:::explain
Each grammar level handles one precedence tier, and lower tiers call higher ones, so `*` binds tighter than `+` automatically. The `while` loops (rather than recursion on the right) give **left-associativity**: `10-4-3` is `(10-4)-3 = 3`, not `10-(4-3) = 9`. Parentheses send the parser back to the lowest level. This is the same structure real compilers use, and it's a common "hard" interview question (LeetCode 224/227/772).
:::trace
`"2+3*4"`:
| Call stack | Token | Value |
|---|---|---|
| expr → term → factor | `2` | 2 |
| term sees `+`? no, returns | | term = 2 |
| expr sees `+`, calls term → factor | `3` | 3 |
| term sees `*`, factor | `4` | 3·4 = 12 |
| expr: 2 + 12 | | **14** |
:::end

:::problem hard | Clamp and saturating arithmetic | min/max, comparisons
Implement `sat_add(a, b, bits=8)` that adds two **signed** integers and saturates to the range of a `bits`-bit two's-complement integer (for 8 bits: -128…127). Then implement `wrap_add` that wraps around like C overflow (127 + 1 → -128) using only `%` and arithmetic.
:::solution
```python
def sat_add(a, b, bits=8):
    lo, hi = -(1 << (bits - 1)), (1 << (bits - 1)) - 1
    return max(lo, min(a + b, hi))

def wrap_add(a, b, bits=8):
    m = 1 << bits
    half = m >> 1
    return (a + b + half) % m - half

print(sat_add(100, 100), sat_add(-100, -100), sat_add(5, 6))   # 127 -128 11
print(wrap_add(127, 1), wrap_add(-128, -1), wrap_add(100, 100))  # -128 127 -56
```
:::explain
Saturation is just clamping: `max(lo, min(x, hi))`. For wrapping, shift the range up by `half` so it becomes `0..m-1`, take `% m` (always non-negative in Python for positive `m`), then shift back down. This is how NumPy `int8` arithmetic behaves. Python ints never overflow, so you have to simulate it.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Add digits | LeetCode 258 | https://leetcode.com/problems/add-digits/
Repeatedly add all the digits of a non-negative integer until a single digit remains: `38 → 3 + 8 = 11 → 1 + 1 = 2`. Solve it first with a loop, then try to find the **O(1) formula** using `%`.
:::starter
```python norun
def add_digits(num):
    pass
```
:::tests
```python norun
assert add_digits(38) == 2
assert add_digits(0) == 0
assert add_digits(9) == 9
assert add_digits(10) == 1
assert add_digits(99999) == 9
assert add_digits(123456789) == 9
assert all(add_digits(n) == (0 if n == 0 else 1 + (n - 1) % 9) for n in range(500))
```
:::hint
Loop version: while `num >= 10`, replace `num` with the sum of its digits (`num % 10` and `num //= 10`). Formula: a number and its digit sum leave the same remainder when divided by 9.
:::solution
```python
def add_digits_loop(num):
    while num >= 10:
        total = 0
        while num:
            total += num % 10      # last digit
            num //= 10             # drop the last digit
        num = total
    return num

def add_digits(num):
    return 0 if num == 0 else 1 + (num - 1) % 9      # the "digital root"

print([add_digits_loop(n) for n in [38, 0, 99999]], [add_digits(n) for n in [38, 0, 99999]])
```
:::explain
Since 10 ≡ 1 (mod 9), every power of 10 is ≡ 1 too, so `n = Σ dᵢ·10ⁱ ≡ Σ dᵢ (mod 9)`: summing digits never changes the remainder mod 9. The final single digit is therefore `n % 9`, except that multiples of 9 give 9, not 0. The `1 + (n - 1) % 9` form handles that shift neatly.
:::trace
`add_digits_loop(38)`:
| num | total (inner loop) | new num |
|---|---|---|
| 38 | 8 + 3 = 11 | 11 |
| 11 | 1 + 1 = 2 | 2 |
| 2 | stop (< 10) | **2** |
:::complexity
Loop: O(log n) per pass. Formula: O(1).
:::end

:::program basic | Power of two | LeetCode 231 | https://leetcode.com/problems/power-of-two/
Return True if `n` is a power of two (1, 2, 4, 8, …). Do it without loops or `math.log`, using a **bit trick**.
:::starter
```python norun
def is_power_of_two(n):
    pass
```
:::tests
```python norun
assert is_power_of_two(1) is True
assert is_power_of_two(16) is True
assert is_power_of_two(3) is False
assert is_power_of_two(0) is False
assert is_power_of_two(-8) is False
assert is_power_of_two(2**60) is True
assert is_power_of_two(2**60 + 1) is False
```
:::hint
A power of two has exactly one `1` bit. What does `n - 1` look like in binary?
:::solution
```python
def is_power_of_two(n):
    return n > 0 and n & (n - 1) == 0

for n in [1, 16, 3, 0, -8, 1024]:
    print(n, bin(n), is_power_of_two(n))
```
:::explain
`n = 1000₂` gives `n − 1 = 0111₂`: subtracting 1 flips the single set bit and all the zeros below it, so `n & (n − 1)` is 0. Any number with two or more set bits keeps its higher bit. `n > 0` excludes 0 and negatives. In Python, `&` binds tighter than `==`, so no extra parentheses are needed (adding them is still fine for readability).
:::complexity
O(1).
:::end

:::program medium | Divide two integers | LeetCode 29 | https://leetcode.com/problems/divide-two-integers/
Divide `dividend` by `divisor` **without** `*`, `/`, `//` or `%`, truncating toward zero (`7 / -3 → -2`). Clamp the result to the 32-bit range [−2³¹, 2³¹ − 1]. It must be fast for huge inputs, so subtracting one divisor at a time is too slow.
:::starter
```python norun
def divide(dividend, divisor):
    pass
```
:::tests
```python norun
assert divide(10, 3) == 3
assert divide(7, -3) == -2
assert divide(-7, 3) == -2
assert divide(0, 5) == 0
assert divide(1, 1) == 1
assert divide(-2147483648, -1) == 2147483647
assert divide(-2147483648, 1) == -2147483648
assert divide(2147483647, 2) == 1073741823
```
:::hint
Work with absolute values. Double the divisor with `<<` until it's about to exceed what's left, subtract that big chunk, and add the matching power of two to the quotient. Fix the sign at the end.
:::solution
```python
def divide(dividend, divisor):
    INT_MAX, INT_MIN = 2**31 - 1, -2**31
    negative = (dividend < 0) != (divisor < 0)
    a, b = abs(dividend), abs(divisor)
    q = 0
    while a >= b:
        shift = 0
        while a >= (b << (shift + 1)):     # find the biggest b * 2^k that fits
            shift += 1
        a -= b << shift
        q += 1 << shift
    q = -q if negative else q
    return max(INT_MIN, min(q, INT_MAX))

print(divide(10, 3), divide(7, -3), divide(-2147483648, -1))
```
:::explain
This is long division in **binary**: subtract the largest `b·2ᵏ` that fits, record the bit `2ᵏ`, and repeat. Each outer pass removes at least half of what's left, giving O(log² n) instead of O(n) subtractions. `(dividend < 0) != (divisor < 0)` is "signs differ", an XOR of booleans. The only overflow case, −2³¹ ÷ −1 = 2³¹, is clamped.
:::trace
`divide(10, 3)`:
| a | biggest 3·2ᵏ ≤ a | q after |
|---|---|---|
| 10 | 3·2 = 6 (k=1) | 2 |
| 4 | 3·1 = 3 (k=0) | 3 |
| 1 | stop (1 < 3) | **3** |
:::complexity
O(log² n) time, O(1) space.
:::end

:::program hard | Basic calculator II | LeetCode 227 | https://leetcode.com/problems/basic-calculator-ii/
Evaluate a string expression containing non-negative integers, `+ - * /` and spaces (no parentheses), respecting precedence. Integer division **truncates toward zero** (`-3/2 → -1` inside expressions like `1-3/2`). No `eval`.
:::starter
```python norun
def calculate(s):
    pass
```
:::tests
```python norun
assert calculate("3+2*2") == 7
assert calculate(" 3/2 ") == 1
assert calculate(" 3+5 / 2 ") == 5
assert calculate("14-3/2") == 13
assert calculate("2*3*4-10/3") == 21
assert calculate("100") == 100
assert calculate("1 - 1 + 1") == 1
assert calculate("0-7/2") == -3
```
:::hint
Keep a stack of **terms** that will be added at the end. `+n` pushes `n`, `-n` pushes `-n`, while `*` and `/` combine with the top of the stack right away (they bind tighter). Truncate with `int(a / b)`, not `//`.
:::solution
```python
def calculate(s):
    stack, num, op = [], 0, "+"
    for i, ch in enumerate(s):
        if ch.isdigit():
            num = num * 10 + int(ch)
        if (not ch.isdigit() and ch != " ") or i == len(s) - 1:
            if op == "+":
                stack.append(num)
            elif op == "-":
                stack.append(-num)
            elif op == "*":
                stack.append(stack.pop() * num)
            else:
                stack.append(int(stack.pop() / num))    # truncate toward zero
            op, num = ch, 0
    return sum(stack)

print(calculate("3+2*2"), calculate("14-3/2"), calculate("0-7/2"))
```
:::explain
Precedence without a parser: everything ends up as a sum of terms. When we finish reading a number, we apply the **previous** operator (`op`): `+`/`-` start a new term, `*`/`/` modify the last term immediately. That's why `3+2*2` becomes terms `[3, 4]`. The `i == len(s) - 1` check flushes the last number. Python's `//` floors (`-7 // 2 == -4`), but this problem wants truncation, hence `int(a / b)`, which is the Operators chapter's floor-vs-truncate trap in action.
:::trace
`"14-3/2"`:
| read | op applied | stack |
|---|---|---|
| 14, then `-` | `+` → push 14 | [14] |
| 3, then `/` | `-` → push −3 | [14, −3] |
| 2 (end) | `/` → int(−3/2) = −1 | [14, −1] → sum **13** |
:::complexity
O(n) time, O(n) space for the stack.
:::end
