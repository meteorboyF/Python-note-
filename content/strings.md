# Strings & Regex

A Python `str` is an **immutable sequence of Unicode code points**. Text is everywhere: file paths, logs, CSV fields, user input, NLP data. This chapter covers creating and formatting strings, every important method, regular expressions, encodings and bytes, and the performance rules that matter.

:::analogy Beads on a string, glued in place
A string is a row of beads (characters). You can look at any bead (`s[0]`), cut a section (`s[2:5]`), or count beads, but the beads are **glued**: you can't swap one. "Changing" a string always means threading a **new** string.
:::

## 1. Creating strings

```python
s1 = 'single'
s2 = "double (same thing)"
s3 = """triple quotes
span lines"""
raw = r"C:\new\table"             # raw: backslashes stay literal (regex, Windows paths)
esc = "tab:\t| newline:\\n | quote:\" | unicode:\u00e9 \N{SNOWMAN}"
joined = "py" "thon"              # adjacent literals are concatenated at compile time
print(s3, raw, esc, joined, sep="\n")
print(str(42), repr("hi\n"), chr(65), "ab" * 3)
```

## 2. Immutability and the memory model

```python
s = "cookie"
try:
    s[0] = "C"
except TypeError as e:
    print("TypeError:", e)
t = "C" + s[1:]                    # build a NEW string
print(t, s, s.upper() is s)        # methods return new strings
```

### Unicode, code points and encodings

```python
word = "café"
print(len(word), [ord(c) for c in word])
print(word.encode("utf-8"), len(word.encode("utf-8")))     # é is 2 bytes in UTF-8
print("naïve" == "nai\u0308ve")                             # different code points!
import unicodedata
print(unicodedata.normalize("NFC", "nai\u0308ve") == "naïve")
print("Straße".lower(), "Straße".casefold(), "ß".upper())  # casefold for case-insensitive compare
```

:::term Code point vs byte vs encoding
A **code point** is a character's number in Unicode (`ord("é") == 233`). An **encoding** (UTF-8, UTF-16, Latin-1) is a rule for storing code points as **bytes**. `str` holds code points, `bytes` holds raw bytes, and you convert with `.encode()` and `.decode()`. **UTF-8** is the web's default: ASCII characters take 1 byte, others take 2–4.
:::

## 3. Indexing and slicing

```python
s = "Python"
print(s[0], s[-1], s[1:4], s[::-1], s[::2], s[-3:])
print("y" in s, s.find("th"), s.index("P"))
```

Slicing rules are identical to lists (see *Lists*). Slices never raise errors, and `s[::-1]` reverses.

## 4. f-strings and the format mini-language

```python
name, score, ratio, n = "Ada", 98.567, 0.4567, 1234567
print(f"{name} scored {score:.1f}")                 # fixed decimals
print(f"{ratio:.1%}  {n:,}  {n:_}  {n:e}")          # percent, thousands separators, scientific
print(f"[{name:<8}] [{name:>8}] [{name:^8}] [{name:*^8}]")   # align + fill
print(f"{42:05d}  {255:x}  {255:#x}  {255:08b}  {-3:+d}")
print(f"{score=}  {name!r}  {name.upper()=}")       # = for debugging (3.8+), !r for repr
width = 10
print(f"[{name:>{width}}]")                         # nested / dynamic format spec
from datetime import date
print(f"{date(2026, 11, 15):%d %B %Y}")             # objects can define their own specs
```

Format spec grammar: `[[fill]align][sign][#][0][width][,|_][.precision][type]`

| Spec | Meaning | Example → Output |
|---|---|---|
| `<` `>` `^` `=` | left / right / centre / pad after the sign | `f"{5:=+5}"` → `+   5` |
| `+` `-` ` ` | sign handling | `f"{3:+}"` → `+3` |
| `,` `_` | thousands separator | `f"{1e6:,.0f}"` → `1,000,000` |
| `.nf` | fixed-point | `f"{3.14159:.2f}"` → `3.14` |
| `.n%` | percentage | `f"{0.25:.0%}"` → `25%` |
| `e`, `g` | scientific / general | `f"{1234.5:.2e}"` → `1.23e+03` |
| `d`, `b`, `o`, `x`, `X` | int bases | `f"{10:b}"` → `1010` |
| `#` | add a base prefix | `f"{255:#x}"` → `0xff` |
| `0` + width | zero padding | `f"{7:03}"` → `007` |

### Older styles you'll still read

```python
print("{} + {} = {}".format(1, 2, 3), "{name} is {age}".format(name="Ada", age=36), "{0}{1}{0}".format("ab", "-"))
print("%s has %d items costing %.2f" % ("cart", 3, 9.5))
from string import Template
print(Template("Hello $who").substitute(who="world"))    # safe for user-provided templates
```

## 5. String methods by category

```python
s = "  Hello, World!  "
# case
print("abc".upper(), "ABC".lower(), "hello world".title(), "hello".capitalize(), "HeLLo".swapcase())
# strip
print(repr(s.strip()), repr(s.lstrip()), repr("xxhixx".strip("x")), repr("www.site.com".removeprefix("www.")))
# find & search
print("banana".find("an"), "banana".rfind("an"), "banana".find("zz"), "banana".count("a"))
print("report.pdf".endswith((".pdf", ".doc")), "Hello".startswith("He"))
# split & partition
print("a,b,,c".split(","), "a b   c".split(), "k=v=w".split("=", 1), "a\nb\r\nc".splitlines())
print("user@mail.com".partition("@"), "a/b/c".rpartition("/"))
# replace & translate
print("aaa".replace("a", "b", 2), "hello".translate(str.maketrans("el", "ip")))
print("h.e.l.l.o".translate(str.maketrans("", "", ".")))   # delete characters
# padding & alignment
print("7".zfill(3), "hi".center(8, "*"), "hi".ljust(5, "."), "hi".rjust(5, "."))
# testing
print("123".isdigit(), "abc".isalpha(), "ab12".isalnum(), "   ".isspace(), "Title Case".istitle(), "py_var".isidentifier())
# join
print("-".join(["2026", "11", "15"]), "".join(reversed("stressed")))
```

:::trap `split()` vs `split(" ")`
`"a  b".split()` → `['a', 'b']`: it splits on **runs** of any whitespace and drops empty strings. `"a  b".split(" ")` → `['a', '', 'b']`: it splits on **each** single space, keeping empty strings. Use no-argument `split()` for words.
:::

:::trap `strip("abc")` strips characters, not a substring
`"abcHelloacb".strip("abc")` → `"Hello"`: it removes **any** of the characters `a`, `b`, `c` from both ends. To remove an exact prefix or suffix, use `removeprefix`/`removesuffix` (3.9+).
:::

## 6. Splitting and joining patterns

```python
csv_line = "ada, 36 ,London"
fields = [f.strip() for f in csv_line.split(",")]
print(fields)
key, _, value = "timeout = 30".partition("=")
print(key.strip(), int(value))
words = ["fast", "safe", "fun"]
print(", ".join(words[:-1]) + " and " + words[-1])
print("\n".join(f"{i}. {w}" for i, w in enumerate(words, 1)))
print(" ".join(map(str, [1, 2, 3])))      # join needs STRINGS
```

## 7. Regular expressions (`re`)

A **regular expression** is a mini-language for describing text patterns.

| Pattern | Matches |
|---|---|
| `.` | any character except newline |
| `\d` `\w` `\s` | digit, word char `[A-Za-z0-9_]`, whitespace |
| `\D` `\W` `\S` | the negations |
| `[abc]` `[^abc]` `[a-z]` | character classes |
| `^` `$` | start / end of the string (or line with `re.M`) |
| `\b` | word boundary |
| `*` `+` `?` | 0+, 1+, 0 or 1 (**greedy**) |
| `*?` `+?` `??` | lazy versions |
| `{n}` `{n,m}` | repetition counts |
| `(…)` | capturing group |
| `(?P<name>…)` | named group |
| `(?:…)` | non-capturing group |
| `a\|b` | alternation |
| `(?=…)` `(?!…)` | lookahead / negative lookahead |

```python
import re
text = "Order #123 shipped on 2026-11-15 to ada@example.com; order #456 on 2026-12-01."
print(re.findall(r"#(\d+)", text))                        # every capture
m = re.search(r"(\d{4})-(\d{2})-(\d{2})", text)           # first match
print(m.group(0), m.groups(), m.start(), m.end())
print(re.match(r"Order", text) is not None, re.fullmatch(r"\d+", "123") is not None)
print(re.sub(r"\d{4}-\d{2}-\d{2}", "<date>", text))
print(re.sub(r"(\d{4})-(\d{2})-(\d{2})", r"\3/\2/\1", text))   # backreferences
print(re.split(r"[;,]\s*", "a, b;c,  d"))
for m in re.finditer(r"(?P<user>[\w.]+)@(?P<domain>[\w.]+)", text):
    print(m.group("user"), m.group("domain"), m.groupdict())
```

| Function | Returns |
|---|---|
| `re.search(p, s)` | first match **anywhere**, or `None` |
| `re.match(p, s)` | a match only at the **start** |
| `re.fullmatch(p, s)` | the whole string must match |
| `re.findall(p, s)` | a list of strings (or tuples of groups) |
| `re.finditer(p, s)` | an iterator of Match objects |
| `re.sub(p, repl, s)` | the replaced string (`repl` may be a function) |
| `re.split(p, s)` | a list |
| `re.compile(p, flags)` | a reusable Pattern object |

```python
import re
html = "<b>bold</b> and <i>italic</i>"
print(re.findall(r"<.+>", html))     # GREEDY: one giant match
print(re.findall(r"<.+?>", html))    # LAZY: each tag
pattern = re.compile(r"\b[A-Z][a-z]+\b")
print(pattern.findall("Ada met Linus in Berlin"))
print(re.sub(r"\d+", lambda m: str(int(m.group()) * 2), "3 apples and 10 pears"))
print(re.findall(r"^\w+", "one\ntwo\nthree", flags=re.M), re.search(r"PYTHON", "python", re.I).group())
```

:::trap Always use raw strings for regex
In `"\b"`, Python turns `\b` into a backspace character **before** `re` ever sees it. `r"\b"` passes a backslash plus `b`, which means "word boundary". Write every regex as `r"..."`.
:::

## 8. Strings as sequences

```python
s = "level"
print(list(s), sorted(s), set(s), s == s[::-1], max(s), "".join(sorted(s)))
for i, ch in enumerate("abc"):
    print(i, ch, end="; ")
print()
print([s[i:i + 2] for i in range(len(s) - 1)])     # bigrams
```

## 9. Performance

```python
import timeit
def concat_plus(n):
    s = ""
    for i in range(n):
        s += str(i)          # may copy the whole string each time -> O(n^2) worst case
    return s
def concat_join(n):
    return "".join(str(i) for i in range(n))   # one final allocation -> O(n)
print(round(timeit.timeit(lambda: concat_plus(20000), number=20), 3), "s with +=")
print(round(timeit.timeit(lambda: concat_join(20000), number=20), 3), "s with join")
```

CPython sometimes optimises `s += t` in place when `s` has no other references, but **don't rely on it**: it's not guaranteed (PyPy and other implementations don't do it). Collect the pieces in a list and `"".join` them.

| Operation | Cost |
|---|---|
| `len(s)`, `s[i]` | O(1) |
| `s[a:b]` | O(b − a) |
| `x in s`, `find`, `count`, `replace` | O(n) typical |
| `s + t` | O(len(s) + len(t)) |
| `"".join(parts)` | O(total length) |
| `==` | O(n) worst |

## 10. Bytes vs str

```python
data = "héllo".encode("utf-8")
print(data, type(data).__name__, data[0], data[1:3], list(data[:3]))
print(data.decode("utf-8"), b"abc".hex(), bytes.fromhex("616263"))
print(b"bad \xff".decode("utf-8", errors="replace"), b"bad \xff".decode("latin-1"))
ba = bytearray(b"hello"); ba[0] = ord("H"); print(ba)
```

| | `str` | `bytes` |
|---|---|---|
| Holds | Unicode code points | integers 0–255 |
| Literal | `"text"` | `b"text"` (ASCII only) |
| Index gives | a 1-character str | an **int** |
| Use for | human text | files, network, binary formats, hashing |

## 11. NLP / ML text preprocessing

```python
import re
from collections import Counter

docs = ["Python is GREAT!!", "I love python & ML :)", "ML is great, python too."]
STOP = {"is", "i", "too", "&"}

def tokenize(text):
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)      # drop punctuation
    return [t for t in text.split() if t not in STOP]

tokens = [tokenize(d) for d in docs]
vocab = {w: i for i, (w, _) in enumerate(Counter(t for doc in tokens for t in doc).most_common())}
encoded = [[vocab[t] for t in doc] for doc in tokens]
print(tokens, vocab, encoded, sep="\n")
log = "epoch=3 loss=0.4213 acc=0.87"
print({k: float(v) for k, v in re.findall(r"(\w+)=([\d.]+)", log)})
```

## Tricks & tips

- `s[::-1]` reverses; `s == s[::-1]` tests a palindrome.
- `" ".join(s.split())` collapses runs of whitespace.
- `str.maketrans` + `translate` does multi-character replacement in one pass.
- `s.casefold()` is the right way to do case-insensitive comparisons (it handles ß and friends).
- `f"{x!r}"` shows quotes and escapes, which makes debugging whitespace bugs easy.
- `textwrap.dedent`, `textwrap.fill` and `textwrap.shorten` format paragraphs.
- `str.isdigit()` accepts characters like "²". Use `str.isdecimal()` or `try: int()` to validate numbers.
- `difflib.get_close_matches(word, options)` gives quick "did you mean…?" suggestions.

## The 10 most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | `s += …` in loops | `"".join(list)` |
| 2 | Trying to mutate (`s[0] = "x"`) | build a new string |
| 3 | `split(" ")` vs `split()` | `split()` for words |
| 4 | `strip("abc")` removes characters, not a substring | `removeprefix/removesuffix` |
| 5 | Non-raw regex strings | `r"..."` |
| 6 | Greedy `.*` over-matching | `.*?` or more precise classes |
| 7 | `is` for string comparison | `==` |
| 8 | Encoding errors reading files | `encoding="utf-8"`, `errors=` |
| 9 | `"".join([1, 2])` → TypeError | `map(str, …)` |
| 10 | Case-insensitive compare with `lower()` on Unicode | `casefold()` (+ normalisation) |

## Practice problems

:::problem basic | Valid palindrome | two pointers, isalnum
Is a string a palindrome considering only alphanumeric characters, case-insensitively (LeetCode 125)? Write it with a filtered copy, then with two pointers and O(1) space.
:::solution
```python
def is_pal_copy(s):
    t = [c.lower() for c in s if c.isalnum()]
    return t == t[::-1]

def is_pal_pointers(s):
    i, j = 0, len(s) - 1
    while i < j:
        if not s[i].isalnum():
            i += 1
        elif not s[j].isalnum():
            j -= 1
        elif s[i].lower() != s[j].lower():
            return False
        else:
            i, j = i + 1, j - 1
    return True

for s in ["A man, a plan, a canal: Panama", "race a car", " "]:
    print(repr(s), is_pal_copy(s), is_pal_pointers(s))
```
:::explain
The copy version is clear but uses O(n) memory. The two-pointer version skips non-alphanumeric characters from both ends and compares as it goes, which also exits early on the first mismatch.
:::end

:::problem basic | Reverse words in a sentence | split, join
Reverse the order of the words, collapsing extra spaces (LeetCode 151): `"  the sky  is blue "` → `"blue is sky the"`.
:::solution
```python
def reverse_words(s):
    return " ".join(reversed(s.split()))

print(repr(reverse_words("  the sky  is blue ")))
```
:::explain
`split()` with no argument discards leading, trailing and repeated whitespace. `reversed` gives a lazy reverse iterator, and `join` builds the result once. O(n).
:::end

:::problem basic | Valid anagram | Counter, sorting
Are `s` and `t` anagrams (LeetCode 242)? Give the O(n) `Counter` solution and the O(n log n) sorting solution.
:::solution
```python
from collections import Counter
def anagram_counter(s, t):
    return Counter(s) == Counter(t)
def anagram_sort(s, t):
    return sorted(s) == sorted(t)
print(anagram_counter("anagram", "nagaram"), anagram_sort("rat", "car"))
```
:::explain
Anagrams have identical character multisets. Counters compare in O(n). Sorting produces a canonical form in O(n log n). An early `len(s) != len(t)` check is a cheap shortcut.
:::end

:::problem medium | Longest substring without repeating characters | sliding window + dict
Find the length of the longest substring without repeated characters (LeetCode 3).
:::solution
```python
def longest_unique(s):
    last = {}                  # char -> last index seen
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last and last[ch] >= left:
            left = last[ch] + 1          # jump past the previous occurrence
        last[ch] = right
        best = max(best, right - left + 1)
    return best

for s in ["abcabcbb", "bbbbb", "pwwkew", "abba", ""]:
    print(repr(s), longest_unique(s))
```
:::explain
The window `[left, right]` always holds unique characters. When `ch` repeats **inside** the window, jump `left` just past its previous index. The `>= left` check matters for `"abba"`: when the second `a` arrives, its old index 0 is already outside the window. O(n).
:::trace
`"abcabcbb"`:
| right | ch | left | window | best |
|---|---|---|---|---|
| 0 | a | 0 | a | 1 |
| 1 | b | 0 | ab | 2 |
| 2 | c | 0 | abc | 3 |
| 3 | a | 1 | bca | 3 |
| 4 | b | 2 | cab | 3 |
| … | | | | **3** |
:::end

:::problem medium | String compression | run-length, join
Compress `"aabcccccaaa"` → `"a2b1c5a3"`. Return the original if the compressed version isn't shorter. O(n), building with a list.
:::solution
```python
def compress(s):
    if not s:
        return s
    parts = []
    run_char, run_len = s[0], 1
    for ch in s[1:]:
        if ch == run_char:
            run_len += 1
        else:
            parts.append(f"{run_char}{run_len}")
            run_char, run_len = ch, 1
    parts.append(f"{run_char}{run_len}")
    out = "".join(parts)
    return out if len(out) < len(s) else s

print(compress("aabcccccaaa"), compress("abc"), compress("aaaaaaaaaaaa"))
```
:::explain
Track the current run, and flush it when the character changes plus once at the end (forgetting the final flush is the classic bug). Building parts in a list and joining once avoids quadratic concatenation.
:::end

:::problem medium | Parse a log file with regex | named groups, Counter
Parse lines like `2026-11-15 10:22:01 ERROR [db] connection lost (code=504)` into dicts, then report the count per level and the most common error component.
:::solution
```python
import re
from collections import Counter

LOG = """2026-11-15 10:22:01 ERROR [db] connection lost (code=504)
2026-11-15 10:22:05 INFO [api] request ok (code=200)
2026-11-15 10:23:11 ERROR [db] timeout (code=504)
2026-11-15 10:24:00 WARN [cache] miss rate high (code=299)
2026-11-15 10:25:42 ERROR [auth] bad token (code=401)
garbage line"""

PAT = re.compile(
    r"^(?P<date>\d{4}-\d{2}-\d{2}) (?P<time>[\d:]{8}) (?P<level>[A-Z]+) "
    r"\[(?P<comp>\w+)\] (?P<msg>.*?) \(code=(?P<code>\d+)\)$")

records = [m.groupdict() for line in LOG.splitlines() if (m := PAT.match(line))]
print(len(records), "parsed;", Counter(r["level"] for r in records))
print(Counter(r["comp"] for r in records if r["level"] == "ERROR").most_common(1))
print(records[0])
```
:::explain
Named groups `(?P<name>...)` make `groupdict()` return a ready-made record. `.*?` (lazy) stops the message before ` (code=`. Anchoring with `^...$` and using `match` rejects malformed lines like "garbage line", and the walrus filters them inside the comprehension. Compiling once avoids re-parsing the pattern for each line.
:::end

:::problem medium | Decode string `3[a2[c]]` | stack, string building
Decode nested repetition encodings (LeetCode 394): `"3[a2[c]]"` → `"accaccacc"`.
:::solution
```python
def decode(s):
    stack = []
    cur, num = [], 0
    for ch in s:
        if ch.isdigit():
            num = num * 10 + int(ch)           # multi-digit counts
        elif ch == "[":
            stack.append((cur, num))           # save the context
            cur, num = [], 0
        elif ch == "]":
            prev, k = stack.pop()
            cur = prev + cur * k               # repeat the inner part, append to outer
        else:
            cur.append(ch)
    return "".join(cur)

print(decode("3[a2[c]]"), decode("2[abc]3[cd]ef"), decode("10[x]"))
```
:::explain
Each `[` starts a new nesting level, so push the current partial string and repeat count, then start fresh. Each `]` finishes a level: pop the saved context and attach the repeated inner text. Characters are kept in lists so that concatenation stays cheap.
:::trace
`3[a2[c]]`:
| ch | stack | cur |
|---|---|---|
| 3 | [] | num=3 |
| [ | [([],3)] | [] |
| a | … | [a] |
| 2 | … | num=2 |
| [ | [([],3), ([a],2)] | [] |
| c | … | [c] |
| ] | [([],3)] | a + cc = [a,c,c] |
| ] | [] | 3 × acc = **accaccacc** |
:::end

:::problem hard | Implement `str.find` with KMP | prefix function, string algorithms
Implement substring search in O(n + m) using the **Knuth–Morris–Pratt** algorithm, returning every match position. Verify against `re.finditer` with a lookahead on random strings.
:::solution
```python
import random, re

def prefix_function(p):
    pi = [0] * len(p)                 # pi[i] = length of the longest proper prefix of p[:i+1] that is also a suffix
    k = 0
    for i in range(1, len(p)):
        while k and p[i] != p[k]:
            k = pi[k - 1]
        if p[i] == p[k]:
            k += 1
        pi[i] = k
    return pi

def kmp_all(text, p):
    if not p:
        return list(range(len(text) + 1))
    pi, k, out = prefix_function(p), 0, []
    for i, ch in enumerate(text):
        while k and ch != p[k]:
            k = pi[k - 1]             # fall back without re-reading text
        if ch == p[k]:
            k += 1
        if k == len(p):
            out.append(i - k + 1)
            k = pi[k - 1]             # allow overlapping matches
    return out

print(prefix_function("ababaca"), kmp_all("abababab", "abab"))
for _ in range(500):
    t = "".join(random.choice("ab") for _ in range(30))
    p = "".join(random.choice("ab") for _ in range(random.randint(1, 4)))
    assert kmp_all(t, p) == [m.start() for m in re.finditer(f"(?={p})", t)]
print("matches re for 500 random cases")
```
:::explain
Naive search re-checks characters after a mismatch, which is O(n·m) in the worst case. KMP precomputes, for each prefix of the pattern, how much of it is also a suffix (`pi`). On a mismatch, the pattern pointer jumps back to `pi[k-1]`, so the text pointer **never moves backwards**: O(n + m) total. The lookahead regex `(?=p)` finds overlapping matches and serves as our test oracle.
:::end

:::problem hard | Minimum edit distance (Levenshtein) | dynamic programming on strings
Compute the edit distance (insert/delete/replace) between two words (LeetCode 72) in O(n·m) time with O(min(n, m)) memory, and reconstruct one optimal sequence of edits for short words.
:::solution
```python
def edit_distance(a, b):
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i] + [0] * len(b)
        for j, cb in enumerate(b, 1):
            cur[j] = min(prev[j] + 1,                 # delete from a
                         cur[j - 1] + 1,              # insert into a
                         prev[j - 1] + (ca != cb))    # replace / match
        prev = cur
    return prev[-1]

def edit_script(a, b):
    n, m = len(a), len(b)
    D = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1): D[i][0] = i
    for j in range(m + 1): D[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            D[i][j] = min(D[i-1][j] + 1, D[i][j-1] + 1, D[i-1][j-1] + (a[i-1] != b[j-1]))
    ops, i, j = [], n, m
    while i or j:
        if i and j and D[i][j] == D[i-1][j-1] + (a[i-1] != b[j-1]):
            if a[i-1] != b[j-1]:
                ops.append(f"replace {a[i-1]}->{b[j-1]}")
            i, j = i - 1, j - 1
        elif i and D[i][j] == D[i-1][j] + 1:
            ops.append(f"delete {a[i-1]}"); i -= 1
        else:
            ops.append(f"insert {b[j-1]}"); j -= 1
    return ops[::-1]

print(edit_distance("horse", "ros"), edit_distance("intention", "execution"))
print(edit_script("kitten", "sitting"))
```
:::explain
`D[i][j]` is the distance between the first `i` characters of `a` and the first `j` of `b`. Each cell takes the best of delete, insert, or replace/match from its three neighbours. Since row `i` only needs row `i-1`, two rows suffice for the distance alone. The full table is kept only to **backtrack** an actual edit script. Spell-checkers, DNA alignment and `difflib` all build on this DP (see *Dynamic Programming*).
:::end
