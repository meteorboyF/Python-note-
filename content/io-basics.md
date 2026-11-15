# Input, Output & f-strings

Almost every beginner program does three things: **read** something the user typed, **compute**, and **show** a nicely formatted result. This chapter covers all three: `print()` in depth, `input()` and converting what the user types, validating bad input, and **f-strings**, Python's modern way to build text.

:::analogy A conversation at a counter
`input()` is you asking a question and **waiting** until the customer answers. Whatever they say arrives as **words** (a string), even if they said "21". `print()` is you talking back. **f-strings** are your script with blanks: `f"Hello {name}, that's {total:.2f} taka"`, where Python fills each `{…}` blank in for you.
:::

:::term Standard input / standard output (stdin / stdout)
The text streams a program reads from and writes to. In a terminal, **stdin** is the keyboard and **stdout** is the screen. `input()` reads one line from stdin, and `print()` writes to stdout.
:::

## 1. `print()` in depth

```python
print("Hello", "world", 2026)          # several arguments: separated by ONE space
print("a", "b", "c", sep="-")          # sep = what goes BETWEEN the arguments
print("no newline", end=" | ")         # end = what goes after (default "\n")
print("same line")
print()                                # empty print = a blank line
print("Total:", 3 + 4)                 # numbers are converted with str() automatically
x = print("print returns...")
print(x)                               # ...None! It SHOWS a value, it doesn't GIVE one back
```

:::trap `print` is not `return`
`print()` shows text on the screen and gives back **`None`**. A function that prints its answer can't be used in a calculation: `total = add(2, 3)` gives `None` if `add` only prints. Functions should usually **return** values, and the caller decides whether to print them.
:::

Two more parameters you'll meet: `file=sys.stderr` writes to the error stream (for warnings and logs), and `flush=True` forces the text out immediately (useful for progress bars).

## 2. `input()`: reading what the user types

`input(prompt)` shows the prompt, **pauses the program** until the user presses Enter, and returns the line they typed **as a string** (without the Enter).

```python in:Ada
name = input("What's your name? ")
print("Nice to meet you,", name)
print(type(name))
```

The example card above shows a **sample input**: in the visualiser, the user "typed" `Ada`. Use **✎ Edit & run** to try your own answers.

### Everything arrives as a string, so convert it

```python in:21;1.75
age = input("Age? ")                  # "21": text, not a number!
print(age + "1")                      # string + string = "211" (joined, not added)
age = int(age)                        # convert: now the number 21
print(age + 1)                        # 22

height = float(input("Height in m? "))   # convert straight away: the common pattern
print(height * 100, "cm")
```

| You want | Write | Typed `"42"` gives | Typed `"4.5"` gives |
|---|---|---|---|
| text | `input()` | `'42'` | `'4.5'` |
| whole number | `int(input())` | `42` | **ValueError** |
| decimal | `float(input())` | `42.0` | `4.5` |

```python error in:twenty
age = int(input("Age? "))     # the user typed letters → ValueError
```

:::trap Two classic input errors
- `"Age: " + 21` raises **TypeError: can only concatenate str (not "int") to str**. You can't `+` text and numbers. Use an f-string (section 6) or `str(21)`.
- `int("twenty")` and `int("4.5")` raise **ValueError**. `int()` only accepts whole-number text. For "4.5", use `float()`, or `int(float("4.5"))` if you really want 4.
:::

## 3. Several values on one line

Users often type several values separated by spaces, like `3 5 7`. **`split()`** cuts the line into pieces, and **`map(int, …)`** converts every piece.

```python in:3+4
a, b = input("Two numbers: ").split()        # "3 4" → ['3', '4'] → unpacked
print(a + b)                                  # still strings: '34'
a, b = int(a), int(b)
print(a + b)
```

```python in:10+20+30+40
nums = list(map(int, input("Numbers: ").split()))    # the standard one-liner
print(nums, "sum =", sum(nums), "max =", max(nums))
```

```python in:7,+8,+9
parts = input("Comma-separated: ").split(",")       # split on a different separator
nums = [int(p.strip()) for p in parts]               # strip() removes the spaces around each piece
print(nums)
```

:::tip Read the one-liner from the inside out
`list(map(int, input().split()))`: **input()** gives `"10 20 30"`, **.split()** gives `['10', '20', '30']`, **map(int, …)** converts each piece lazily, and **list(…)** collects them into `[10, 20, 30]`. A list comprehension `[int(x) for x in input().split()]` does the same thing.
:::

## 4. Validating input: ask again until it's right

Real users type nonsense. The standard pattern is a `while True` loop, a `try/except` around the conversion, and a `break` when the value is good.

```python in:abc;-5;7
while True:
    text = input("Enter a positive whole number: ")
    try:
        n = int(text)
    except ValueError:
        print("  That's not a whole number, try again.")
        continue                      # back to the top of the loop
    if n <= 0:
        print("  It must be positive.")
        continue
    break                             # valid: leave the loop
print("Thanks! You entered", n)
```

Step through it in the visualiser: the first answer (`abc`) jumps to `except`, the second (`-5`) fails the range check, and the third (`7`) reaches `break`.

```python in:+YES+
answer = input("Continue? (yes/no) ").strip().lower()    # normalise first: "  YES " → "yes"
print("continuing" if answer in ("y", "yes") else "stopping")
```

:::tip Normalise before you compare
`.strip()` removes accidental spaces and `.lower()` ignores capitalisation, so `" YES"`, `"Yes"` and `"yes"` all match. `str.isdigit()` checks "only digits" without a try/except, but it rejects `-5` and `4.5`. `try: int(...)` is the more reliable test.
:::

## 5. Reading many lines

Loop until the user types a **sentinel** (a special stop value) such as an empty line or `done`.

```python in:12;7;30;done
total = 0
count = 0
while (line := input("Score (or 'done'): ")) != "done":   # := assigns AND tests (walrus)
    total += int(line)
    count += 1
print(f"{count} scores, average {total / count:.1f}")
```

```python norun
import sys
data = sys.stdin.read().split()      # competitive programming: read EVERYTHING at once (fast)
n = int(data[0])
nums = list(map(int, data[1:1 + n]))
```

:::note Where does the input come from?
In a terminal, input comes from the keyboard. You can also **redirect** a file into a program: `python app.py < input.txt`. Then `input()` reads the file's lines one by one. That's how online judges (LeetCode-style sites, Codeforces) feed test cases to your program.
:::

## 6. Building text: `+`, commas, or f-strings?

```python
name, age, gpa = "Rahim", 21, 3.756
print("Name: " + name + ", age: " + str(age))      # + needs str() for numbers. Clumsy
print("Name:", name, ", age:", age)                 # commas add spaces you may not want
print(f"Name: {name}, age: {age}, GPA: {gpa:.2f}")  # f-string: clean, and it can format
```

An **f-string** (formatted string literal) starts with `f` before the quote. Anything inside `{ }` is a Python **expression**: it's evaluated, converted to text, and inserted.

## 7. f-strings in depth

### Any expression can go inside the braces

```python
price, qty = 12.5, 3
items = ["pen", "book"]
user = {"name": "Nadia", "city": "Dhaka"}
print(f"Total: {price * qty}")                          # arithmetic
print(f"{len(items)} items, first is {items[0].upper()}")   # function and method calls, indexing
print(f"{user['name']} lives in {user['city']}")        # use the OTHER quote type inside
print(f"Status: {'adult' if 21 >= 18 else 'minor'}")   # conditional expression
x = 42
print(f"{x = }")                                        # debug: prints "x = 42" (Python 3.8+)
print(f"{'hello'!r} vs {'hello'}")                      # !r uses repr() → shows the quotes
```

### The format specification: `{value:spec}`

After a colon you can control **width, alignment, decimals, separators and type**. This mini-language is the same one `format()` uses.

```python
pi = 3.14159265
big = 1234567.891
print(f"[{pi:.2f}]")        # 2 decimal places → [3.14]
print(f"[{pi:8.3f}]")       # width 8, 3 decimals, right-aligned → [   3.142]
print(f"[{big:,.2f}]")      # thousands separator → [1,234,567.89]
print(f"[{big:_.0f}]")      # underscore separator → [1_234_568]
print(f"[{0.256:.1%}]")     # percentage (×100, then %) → [25.6%]
print(f"[{1500000:.2e}]")   # scientific notation → [1.50e+06]
print(f"[{7:03d}]")         # zero-pad to width 3 → [007]
print(f"[{5:+d}] [{-5:+d}]")   # always show the sign → [+5] [-5]
print(f"[{255:b}] [{255:x}] [{255:o}]")   # binary, hex, octal
```

```python
w = 10
print(f"[{'left':<10}]")    # < left-align within 10 characters
print(f"[{'right':>10}]")   # > right-align (the default for numbers)
print(f"[{'mid':^10}]")     # ^ centre
print(f"[{'mid':*^10}]")    # fill character before the alignment sign → ***mid****
print(f"[{'dyn':>{w}}]")    # the width itself can come from a variable (nested braces)
```

| Spec | Meaning | Example → result |
|---|---|---|
| `.2f` | 2 decimals, fixed point | `{3.14159:.2f}` → `3.14` |
| `10` | minimum width 10 | `{42:10}` → `        42` |
| `<` `>` `^` | left / right / centre | `{"a":^5}` → `  a  ` |
| `,` or `_` | thousands separator | `{1234567:,}` → `1,234,567` |
| `%` | percentage | `{0.5:.0%}` → `50%` |
| `0Nd` | zero-pad to width N | `{7:03d}` → `007` |
| `+` | show the sign | `{5:+}` → `+5` |
| `e` | scientific | `{12345:.1e}` → `1.2e+04` |
| `b` `x` `o` | binary, hex, octal | `{10:b}` → `1010` |

### Dates, braces and long f-strings

```python
from datetime import date
d = date(2026, 11, 16)
print(f"{d:%d %B %Y}")                   # date formatting codes after the colon
print(f"{{literal braces}} and {1 + 1}")  # double the braces to print { or }
name, score = "Eva", 98.256
report = (f"Student: {name}\n"            # adjacent strings are glued: a long f-string
          f"Score:   {score:.1f}")
print(report)
```

:::boss Format once, at the edge
Keep numbers as **numbers** while you compute, and format only when you **display** them. `f"{x:.2f}"` returns a **string**. Round-tripping through strings (`float(f"{x:.2f}")`) to round a number is a code smell, so use `round(x, 2)` instead.
:::

## 8. Printing aligned tables and receipts

Widths turn messy output into clean columns:

```python
items = [("Tea", 2, 20.0), ("Chocolate cake", 1, 120.0), ("Coffee", 3, 50.0)]
print(f"{'Item':<16}{'Qty':>4}{'Price':>9}{'Total':>10}")
print("-" * 39)
grand = 0
for name, qty, price in items:
    line_total = qty * price
    grand += line_total
    print(f"{name:<16}{qty:>4}{price:>9.2f}{line_total:>10.2f}")
print("-" * 39)
print(f"{'Grand total':<29}{grand:>10.2f}")
```

Step through it to watch `grand` grow and each row being formatted. Every column uses the **same width** in the header and the rows, which is what keeps them lined up.

## 9. Older formatting styles (so you can read old code)

```python
name, n = "Ada", 3.14159
print("Hi %s, pi is %.2f" % (name, n))        # printf-style % formatting (oldest)
print("Hi {}, pi is {:.2f}".format(name, n))  # str.format (Python 2.6+)
print("Hi {0}, {0}! pi={1:.1f}".format(name, n))   # numbered placeholders
print(f"Hi {name}, pi is {n:.2f}")            # f-string (3.6+): use this one
```

All three use the **same format specs** (`.2f`, `>10`, …). f-strings are the fastest and the most readable. Reach for `str.format` only when the template string is stored somewhere else (a config file, a translation table) and filled in later.

## 10. Putting it together: a tiny interactive program

```python in:Nadia;3;72;88;95
name = input("Student name: ").strip().title()
n = int(input("How many marks? "))
marks = [float(input(f"  mark {i}: ")) for i in range(1, n + 1)]   # input inside a comprehension
avg = sum(marks) / n
grade = "A" if avg >= 80 else "B" if avg >= 70 else "C"
print(f"\n{name}: average {avg:.2f} → grade {grade}")
print(f"best {max(marks):.0f}, worst {min(marks):.0f}, spread {max(marks) - min(marks):.0f}")
```

Notice the f-string **inside** the `input()` prompt: prompts can be dynamic too.

## Tricks & tips

- `print(*items)` prints every item of a list separated by spaces, and `print(*items, sep="\n")` prints one per line.
- `input().split()` with **no argument** splits on any run of whitespace and ignores leading and trailing spaces.
- `f"{value!r}"` shows quotes and escape characters, which is great for debugging stray spaces: `'Ada '` vs `'Ada'`.
- `f"{x = :.2f}"` combines the debug `=` with a format spec.
- Use `round(x, 2)` for **numbers** and `f"{x:.2f}"` for **display**.
- `print(f"{'-' * 30}")` (or just `print("-" * 30)`) draws separator lines.

## The most dangerous traps

:::trap The input-and-output trap list
1. **Forgetting to convert** input: `input() + 1` raises TypeError, and `"2" * 3` is `"222"`, not 6.
2. **`int("3.5")` crashes**. Use `float()`, or validate first.
3. **Using `print` instead of `return`** in functions: the result is `None`.
4. **Quotes inside f-strings**: before Python 3.12, `f"{d["key"]}"` is a SyntaxError. Use the other quote type: `f"{d['key']}"`.
5. **Forgetting the `f`**: `"Hello {name}"` prints the braces literally.
6. **Comparing raw input**: `"Yes " == "yes"` is False. Use `.strip().lower()` first.
7. **`eval(input())`** to "convert" input runs any code the user types, which is a security hole. Use `int()`, `float()` or `ast.literal_eval`.
:::

## 🍪 Predict the output

:::quiz
```python
x = 7
print(f"{x:03d}|{x:<3}|{x:>3}|{x/2:.1f}")
```
What prints?
- [x] `007|7  |  7|3.5`
- [ ] `007|  7|7  |3.5`
- [ ] `7|7|7|3.50`
`03d` zero-pads to width 3. `<3` left-aligns, so the padding goes on the right, and `>3` right-aligns. `.1f` gives one decimal.
:::

:::quiz
```python
a = "5"
b = 2
print(a * b, int(a) * b, a + str(b))
```
What prints?
- [ ] `10 10 7`
- [x] `55 10 52`
- [ ] TypeError
A string times an int **repeats** it (`"55"`). Converting first gives real arithmetic (10). `+` on two strings **joins** them (`"52"`). Only `a + b` (str + int) would raise TypeError.
:::

:::quiz
```python
r = print("hi", end="")
print(r, "!", sep="")
```
What prints?
- [x] `hiNone!`
- [ ] `hi\nNone !`
- [ ] `hi!`
The first `print` writes `hi` with **no newline** (`end=""`) and returns `None`. The second prints `None` and `!` with no separator (`sep=""`), right after `hi` on the same line.
:::

## Practice problems

:::problem basic | Personal greeting | input, f-string
Ask for a name and a birth year, then print `Hello <Name>! You turn <age> in 2026.`, with the name capitalised even if the user typed it in lowercase.
:::hint
`.strip().title()` cleans the name, and `int(...)` converts the year.
:::solution
```python in:+rahim;2005
name = input("Name: ").strip().title()
year = int(input("Birth year: "))
print(f"Hello {name}! You turn {2026 - year} in 2026.")
```
:::explain
Clean the text input (`strip`, `title`) and convert the number input (`int`) **immediately**, then do everything with proper types. The arithmetic goes right inside the braces.
:::end

:::problem basic | Sum and average of a line of numbers | split, map, format spec
The user types numbers separated by spaces. Print the count, the sum and the average to 2 decimals.
:::solution
```python in:4+8+15+16+23+42
nums = list(map(float, input("Numbers: ").split()))
print(f"count={len(nums)}  sum={sum(nums):g}  average={sum(nums) / len(nums):.2f}")
```
:::explain
`map(float, …)` accepts both `3` and `3.5`. The `:g` spec ("general") drops a pointless `.0`, while `.2f` always shows exactly two decimals. Pick the spec that suits each value.
:::end

:::problem basic | Temperature converter with a menu | input, if/elif, f-string
Ask for a temperature and a unit (`C` or `F`), convert it to the other unit, and print it with one decimal.
:::solution
```python in:100;c
t = float(input("Temperature: "))
unit = input("Unit (C/F): ").strip().upper()
if unit == "C":
    print(f"{t:.1f}°C = {t * 9 / 5 + 32:.1f}°F")
elif unit == "F":
    print(f"{t:.1f}°F = {(t - 32) * 5 / 9:.1f}°C")
else:
    print(f"Unknown unit {unit!r}")
```
:::explain
`.upper()` makes `c` and `C` both work. The `!r` in the error message shows exactly what was typed, quotes included, so stray spaces become visible.
:::end

:::problem medium | Robust integer reader | while, try/except, validation
Write `read_int(prompt, lo, hi)`, which keeps asking until the user enters a whole number in `[lo, hi]`, and returns it. Show a helpful message for each kind of mistake.
:::solution
```python in:ten;0;99;7
def read_int(prompt, lo, hi):
    while True:
        text = input(prompt).strip()
        try:
            value = int(text)
        except ValueError:
            print(f"  {text!r} isn't a whole number.")
            continue
        if not lo <= value <= hi:                  # chained comparison
            print(f"  Please enter a number from {lo} to {hi}.")
            continue
        return value                               # return also ends the loop

month = read_int("Month (1-12): ", 1, 12)
print("You chose month", month)
```
:::explain
Wrapping the validation loop in a **function** makes it reusable for any range. `return` inside the loop both gives back the value and exits. `lo <= value <= hi` is a **chained comparison**, Python's readable version of `lo <= value and value <= hi`.
:::end

:::problem medium | Bill splitter | float input, rounding, alignment
Read a bill amount, a tip percentage and the number of people. Print an aligned summary: subtotal, tip, total and each person's share.
:::solution
```python in:1850;10;4
bill = float(input("Bill amount: "))
tip_pct = float(input("Tip %: "))
people = int(input("People: "))
tip = bill * tip_pct / 100
total = bill + tip
share = total / people
for label, value in [("Subtotal", bill), ("Tip", tip), ("Total", total), ("Each pays", share)]:
    print(f"{label:<10}{value:>10,.2f}")
```
:::explain
A list of `(label, value)` pairs plus **one** f-string with fixed widths prints a clean table, with no copy-pasted print lines. `,.2f` adds thousands separators *and* two decimals.
:::end

:::problem hard | Mark sheet from free-form input | parsing, validation, table output
The user enters `name mark` pairs, one per line, until an empty line. Skip invalid lines with a warning. Then print a table sorted by mark (highest first) with rank, name, mark and grade, plus the class average.
:::solution
```python in:Ada+91;Linus+78;oops;Grace+85;Alan+abc;
records = []
while (line := input("name mark: ").strip()):          # an empty line ends input
    parts = line.split()
    if len(parts) != 2:
        print(f"  skipped {line!r}: need 'name mark'")
        continue
    name, mark = parts
    try:
        records.append((name, float(mark)))
    except ValueError:
        print(f"  skipped {line!r}: mark must be a number")

records.sort(key=lambda r: r[1], reverse=True)
print(f"\n{'#':>2}  {'Name':<8}{'Mark':>6}  Grade")
for rank, (name, mark) in enumerate(records, start=1):
    grade = "A" if mark >= 80 else "B" if mark >= 70 else "C"
    print(f"{rank:>2}  {name:<8}{mark:>6.1f}  {grade}")
avg = sum(m for _, m in records) / len(records)
print(f"Class average: {avg:.2f}")
```
:::explain
This combines everything in the chapter: a **sentinel loop** with the walrus operator (an empty string is falsy, so the loop stops), **split and validate**, **try/except** for bad numbers, **sorting** records, **enumerate(start=1)** for ranks and **aligned f-string columns**. Step through it to see how each bad line is skipped.
:::end

## ✍️ Write a program

Each task is a **function**, so it can be tested. The last one shows how to test code that calls `input()`: the test temporarily replaces `input` with fake answers.

:::program basic | Format a greeting | f-strings
Return `"Hello, <Name>! Next year you'll be <age + 1>."` with the name stripped and title-cased.

`greet("  ada lovelace ", 36)` → `"Hello, Ada Lovelace! Next year you'll be 37."`
:::starter
```python norun
def greet(name, age):
    # Write your code here
    pass

print(greet("  ada lovelace ", 36))
```
:::tests
```python norun
assert greet("  ada lovelace ", 36) == "Hello, Ada Lovelace! Next year you'll be 37."
assert greet("RAHIM", 20) == "Hello, Rahim! Next year you'll be 21."
```
:::solution
```python
def greet(name, age):
    return f"Hello, {name.strip().title()}! Next year you'll be {age + 1}."

print(greet("  ada lovelace ", 36))
```
:::explain
Method calls and arithmetic go straight into the braces. Using double quotes on the outside lets you write `you'll` without escaping the apostrophe.
:::end

:::program basic | Parse a line of numbers | split, map, f-string
Given a line like `"4 8 15 16 23 42"` (the text `input()` would return), return `"count=6 sum=108 avg=18.00"`. For an empty line, return `"no numbers"`.
:::starter
```python norun
def summarize(line):
    # Write your code here
    pass

print(summarize("4 8 15 16 23 42"))     # Expected: count=6 sum=108 avg=18.00
```
:::tests
```python norun
assert summarize("4 8 15 16 23 42") == "count=6 sum=108 avg=18.00"
assert summarize("  7   ") == "count=1 sum=7 avg=7.00"
assert summarize("") == "no numbers" and summarize("   ") == "no numbers"
assert summarize("-1 1") == "count=2 sum=0 avg=0.00"
```
:::solution
```python
def summarize(line):
    nums = [int(x) for x in line.split()]
    if not nums:
        return "no numbers"
    return f"count={len(nums)} sum={sum(nums)} avg={sum(nums) / len(nums):.2f}"

print(summarize("4 8 15 16 23 42"))
```
:::explain
Separating **parsing** (a string in) from **reading** (`input()`) makes the logic testable. In a real program you'd write `print(summarize(input("Numbers: ")))`. `.split()` with no argument ignores extra spaces, and `"".split()` is `[]`, which handles the empty case.
:::end

:::program medium | Receipt formatter | alignment, format specs
Given `[(name, qty, price), …]`, return a receipt **string** (lines joined with `"\n"`):

```text
Item              Qty    Price
Tea                 2    40.00
Chocolate cake      1   120.00
------------------------------
TOTAL                   160.00
```
Columns: name left-aligned in 16, qty right-aligned in 5, price (qty × price, 2 decimals) right-aligned in 9. The separator is 30 dashes.
:::starter
```python norun
def receipt(items):
    # Write your code here
    pass

print(receipt([("Tea", 2, 20.0), ("Chocolate cake", 1, 120.0)]))
```
:::tests
```python norun
r = receipt([("Tea", 2, 20.0), ("Chocolate cake", 1, 120.0)])
lines = r.split("\n")
assert lines[0] == "Item              Qty    Price"
assert lines[1] == "Tea                 2    40.00"
assert lines[2] == "Chocolate cake      1   120.00"
assert lines[3] == "-" * 30 and lines[4] == "TOTAL                   160.00"
assert all(len(l) == 30 for l in lines)
assert receipt([]).split("\n")[-1] == "TOTAL                     0.00"
```
:::hint
Header: `f"{'Item':<16}{'Qty':>5}{'Price':>9}"`. The total line puts `'TOTAL'` in a width of 21 (16 + 5), then the amount in 9.
:::solution
```python
def receipt(items):
    lines = [f"{'Item':<16}{'Qty':>5}{'Price':>9}"]
    total = 0
    for name, qty, price in items:
        amount = qty * price
        total += amount
        lines.append(f"{name:<16}{qty:>5}{amount:>9.2f}")
    lines.append("-" * 30)
    lines.append(f"{'TOTAL':<21}{total:>9.2f}")
    return "\n".join(lines)

print(receipt([("Tea", 2, 20.0), ("Chocolate cake", 1, 120.0)]))
```
:::explain
Fixed widths (16 + 5 + 9 = 30) make every line exactly the same length, and that's what lines the columns up. Build a **list of lines** and `"\n".join` them at the end. That's faster and cleaner than adding strings together in a loop.
:::end

:::program medium | Ask until valid (testing code that uses input) | input, validation, testing
Write `ask_age()`, which keeps calling `input("Age: ")` until it gets a whole number from 0 to 120, printing `Invalid, try again.` after each bad answer, and returns the age.

The tests replace `input` with a fake that answers `"abc"`, then `"200"`, then `"35"`.
:::starter
```python norun
def ask_age():
    # Write your code here (use input("Age: "))
    pass

# try it in the editor: print(ask_age())
```
:::tests
```python norun
import builtins, io, contextlib
answers = iter(["abc", "200", "35"]); real_input = builtins.input; builtins.input = lambda prompt="": next(answers)
buf = io.StringIO()
with contextlib.redirect_stdout(buf): age = ask_age()
builtins.input = real_input
assert age == 35
assert buf.getvalue().count("Invalid, try again.") == 2
answers2 = iter([" 0 "]); builtins.input = lambda prompt="": next(answers2)
assert ask_age() == 0
builtins.input = real_input
```
:::solution
```python in:abc;200;35
def ask_age():
    while True:
        text = input("Age: ").strip()
        if text.isdigit() and 0 <= int(text) <= 120:   # isdigit rejects '-5' and 'abc'
            return int(text)
        print("Invalid, try again.")

print("Age is", ask_age())
```
:::explain
`input` is just a function stored in the `builtins` module, so a test can **temporarily swap it** for a fake that returns prepared answers. That's how testing frameworks (pytest's `monkeypatch`) test interactive code. Restore the real one afterwards! `isdigit()` is a quick validity check for non-negative whole numbers.
:::end
