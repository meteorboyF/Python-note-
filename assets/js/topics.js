// Course map. Every topic has a Markdown file at content/<slug>.md
window.PARTS = [
  {
    id: "foundations", title: "Part 1 · Python Foundations",
    blurb: "How Python really thinks: names, objects, flow, functions and the tools every program uses.",
    topics: [
      { slug: "variables", title: "Variables & Data Types", desc: "Names vs objects, types, mutability, the memory model." },
      { slug: "operators", title: "Operators & Expressions", desc: "Floor division, short-circuiting, precedence, walrus, bitwise.", isNew: true },
      { slug: "control-flow", title: "Control Flow", desc: "if/elif, loops, loop-else, break/continue, match-case." },
      { slug: "functions", title: "Functions", desc: "Parameters, *args/**kwargs, defaults, lambda, LEGB scope, recursion." },
      { slug: "closures-decorators", title: "Closures & Decorators", desc: "First-class functions, closures, late binding, decorators.", isNew: true },
      { slug: "iterators-generators", title: "Iterators & Generators", desc: "The iterator protocol, yield, lazy pipelines, itertools.", isNew: true },
      { slug: "comprehensions", title: "Comprehensions & Unpacking", desc: "List/dict/set comprehensions, generator expressions, star unpacking." },
      { slug: "exceptions", title: "Exceptions & Context Managers", desc: "try/except/else/finally, custom errors, with-statements.", isNew: true },
      { slug: "files-stdlib", title: "Files, Modules & Standard Library", desc: "File I/O, pathlib, json, csv, datetime, imports, packages.", isNew: true },
      { slug: "builtins", title: "Built-ins You Must Know", desc: "map, filter, zip, enumerate, sorted, any/all, functools." },
    ],
  },
  {
    id: "oop", title: "Part 2 · Object-Oriented Python",
    blurb: "Classes from first principles to metaclasses — the way Python's own objects are built.",
    topics: [
      { slug: "oop-classes", title: "Classes & Objects", desc: "class, __init__, self, instance vs class attributes, lookup.", isNew: true },
      { slug: "oop-methods", title: "Methods & Properties", desc: "Instance, class and static methods; @property.", isNew: true },
      { slug: "oop-pillars", title: "The Four Pillars", desc: "Encapsulation, inheritance, polymorphism, abstraction (abc).", isNew: true },
      { slug: "oop-inheritance", title: "Inheritance, super() & MRO", desc: "Multiple inheritance, C3 linearisation, mixins.", isNew: true },
      { slug: "oop-dunder", title: "Dunder (Magic) Methods", desc: "__repr__, __eq__/__hash__, containers, operators, __call__.", isNew: true },
      { slug: "oop-modern", title: "Modern OOP", desc: "dataclasses, __slots__, Enum, typing & Protocol, composition.", isNew: true },
      { slug: "oop-advanced", title: "Advanced OOP & Design Patterns", desc: "Descriptors, metaclasses, Singleton, Factory, Strategy, Observer.", isNew: true },
    ],
  },
  {
    id: "ds", title: "Part 3 · Data Structures",
    blurb: "Every built-in container in depth, then the classic structures interviewers love.",
    topics: [
      { slug: "lists", title: "Lists", desc: "Dynamic arrays, slicing, methods, sorting, copies." },
      { slug: "tuples", title: "Tuples", desc: "Immutability, packing/unpacking, namedtuple, keys." },
      { slug: "dicts", title: "Dictionaries", desc: "Hash tables, defaultdict, Counter, dispatch tables." },
      { slug: "sets", title: "Sets & Frozensets", desc: "Set algebra, O(1) membership, dedupe patterns." },
      { slug: "strings", title: "Strings & Regex", desc: "Formatting, methods, regex, bytes & Unicode." },
      { slug: "stacks-queues", title: "Stacks & Queues", desc: "deque, BFS/DFS, monotonic stack & deque." },
      { slug: "heaps", title: "Heaps & Priority Queues", desc: "heapq, top-K, k-way merge, two heaps, Dijkstra." },
      { slug: "linked-lists", title: "Linked Lists", desc: "Singly/doubly, Floyd's cycle, reversal, LRU cache." },
      { slug: "trees", title: "Trees", desc: "Traversals, BST, AVL, LCA, Trie, segment tree." },
      { slug: "graphs", title: "Graphs", desc: "BFS/DFS, topological sort, union-find, shortest paths, MST.", isNew: true },
    ],
  },
  {
    id: "algo", title: "Part 4 · Algorithms & Patterns",
    blurb: "The thinking tools that turn 'I have no idea' into 'oh, this is a sliding window'.",
    topics: [
      { slug: "big-o", title: "Big-O & Complexity", desc: "Time/space, amortised cost, the cost of Python built-ins.", isNew: true },
      { slug: "search-sort", title: "Searching & Sorting", desc: "Binary search, bisect, merge/quick/counting sort.", isNew: true },
      { slug: "patterns", title: "Problem-Solving Patterns", desc: "Two pointers, sliding window, prefix sums, hashing, intervals." },
      { slug: "recursion-backtracking", title: "Recursion & Backtracking", desc: "Recursion trees, subsets, permutations, N-Queens.", isNew: true },
      { slug: "dynamic-programming", title: "Dynamic Programming", desc: "Memoisation, tabulation, knapsack, LIS, LCS, edit distance.", isNew: true },
      { slug: "greedy-bits", title: "Greedy & Bit Manipulation", desc: "Exchange arguments, intervals, XOR tricks, masks.", isNew: true },
    ],
  },
  {
    id: "data", title: "Part 5 · Data Science Stack",
    blurb: "NumPy, Pandas and Matplotlib — the trio behind nearly every ML project.",
    topics: [
      { slug: "numpy", title: "NumPy", desc: "ndarrays, views vs copies, indexing, broadcasting, vectorisation." },
      { slug: "pandas-basics", title: "Pandas I · Fundamentals", desc: "Series/DataFrame, loc/iloc, missing data, cleaning, groupby." },
      { slug: "pandas-reshape", title: "Pandas II · Merge, Reshape, Time", desc: "merge/concat, pivot/melt, MultiIndex, resample, rolling." },
      { slug: "pandas-ml", title: "Pandas III · ML Pipelines", desc: "Feature engineering, validation, EDA, performance." },
      { slug: "matplotlib", title: "Matplotlib", desc: "Figure/Axes anatomy, every plot type, styling, layouts, ML plots.", isNew: true },
    ],
  },
  {
    id: "pro", title: "Part 6 · Pro Python",
    blurb: "What separates code that works from code a senior engineer approves.",
    topics: [
      { slug: "pro-python", title: "Pythonic Code, Typing, Testing & Concurrency", desc: "Idioms, PEP 8, type hints, pytest, venv, threads/processes/asyncio.", isNew: true },
    ],
  },
];
window.ALL_TOPICS = window.PARTS.flatMap((p, pi) => p.topics.map(t => ({ ...t, part: p })));
window.ALL_TOPICS.forEach((t, i) => (t.n = i + 1));
