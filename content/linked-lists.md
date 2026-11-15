# Linked Lists

A **linked list** is a chain of **nodes**: each node holds a value and a **reference** to the next node. Unlike a Python list (one contiguous block), nodes can live anywhere in memory. You trade O(1) indexing for O(1) insertion and removal **at a known position**. Linked lists are interview favourites because they test pointer (reference) manipulation, and the visualiser shows those arrows directly.

:::analogy A scavenger hunt
Each clue (node) tells you something (the value) and where the next clue is hidden (the `next` reference). To reach clue #50 you have to follow 49 clues, so there's no jumping (no O(1) indexing). But inserting a new clue between two others only means rewriting one note.
:::

## 1. Node structure and memory model

```python
class Node:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

# build 1 -> 2 -> 3 by hand
head = Node(1, Node(2, Node(3)))
cur = head
while cur:
    print(cur.val, end=" -> ")
    cur = cur.next
print("None")
```

**Visualise this**: every node is a separate object box, and the `next` arrows chain them together. The last node's `next` is `None`.

| | Python `list` (array) | Linked list |
|---|---|---|
| Access by index | **O(1)** | O(n) |
| Insert/delete at the front | O(n) | **O(1)** |
| Insert/delete after a known node | O(n) | **O(1)** |
| Append | O(1) amortised | O(1) with a tail pointer |
| Memory | compact, cache-friendly | extra pointer per node, scattered |
| Search | O(n) | O(n) |

**Types**: singly linked (`next` only), doubly linked (`prev` + `next`), circular (the tail points back to the head).

## 2. Helpers: build and print

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next
    def __repr__(self):
        return f"ListNode({self.val})"

def build(values):
    dummy = ListNode()
    tail = dummy
    for v in values:
        tail.next = ListNode(v)
        tail = tail.next
    return dummy.next

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

h = build([4, 8, 15, 16])
print(to_list(h), h, h.next.next)
```

:::tip The dummy (sentinel) head trick
Starting with a fake `dummy` node means the "empty list" and "insert at head" cases need no special handling. You always attach to `tail.next`, and you return `dummy.next` at the end. Use it in almost every list-building problem.
:::

## 3. A complete singly linked list class

```python
class LinkedList:
    class _Node:
        __slots__ = ("val", "next")
        def __init__(self, val, next=None):
            self.val, self.next = val, next

    def __init__(self, items=()):
        self.head = self.tail = None
        self.size = 0
        for x in items:
            self.append(x)

    def append(self, val):                 # O(1) thanks to the tail pointer
        node = self._Node(val)
        if self.tail:
            self.tail.next = node
        else:
            self.head = node
        self.tail = node
        self.size += 1

    def prepend(self, val):                # O(1)
        self.head = self._Node(val, self.head)
        if self.tail is None:
            self.tail = self.head
        self.size += 1

    def remove(self, val):                 # O(n): find, then unlink
        prev, cur = None, self.head
        while cur and cur.val != val:
            prev, cur = cur, cur.next
        if cur is None:
            raise ValueError(f"{val} not in list")
        if prev:
            prev.next = cur.next
        else:
            self.head = cur.next
        if cur is self.tail:
            self.tail = prev
        self.size -= 1

    def __iter__(self):
        cur = self.head
        while cur:
            yield cur.val
            cur = cur.next

    def __len__(self):
        return self.size

    def __repr__(self):
        return " -> ".join(map(str, self)) + " -> None"

ll = LinkedList([1, 2, 3])
ll.prepend(0); ll.append(4); ll.remove(2)
print(ll, len(ll), list(ll), 3 in ll)
```

## 4. Doubly linked list with sentinels

```python
class DNode:
    __slots__ = ("val", "prev", "next")
    def __init__(self, val=None):
        self.val, self.prev, self.next = val, None, None

class DoublyLinkedList:
    def __init__(self):
        self.head, self.tail = DNode(), DNode()    # sentinels: never removed
        self.head.next, self.tail.prev = self.tail, self.head
    def _insert_after(self, node, new):
        new.prev, new.next = node, node.next
        node.next.prev = new
        node.next = new
        return new
    def push_front(self, val): return self._insert_after(self.head, DNode(val))
    def push_back(self, val): return self._insert_after(self.tail.prev, DNode(val))
    def unlink(self, node):                        # O(1) given the node
        node.prev.next, node.next.prev = node.next, node.prev
        return node.val
    def __iter__(self):
        cur = self.head.next
        while cur is not self.tail:
            yield cur.val
            cur = cur.next

d = DoublyLinkedList()
a = d.push_back("a"); b = d.push_back("b"); d.push_front("z")
d.unlink(a)
print(list(d))
```

With sentinels, there are never `None` neighbours to check: every real node has both `prev` and `next`. This structure plus a dict gives an O(1) **LRU cache** (Hard problem below).

## 5. Two-pointer techniques

```python
class N:
    def __init__(self, v, nxt=None): self.v, self.next = v, nxt
def build(vals):
    head = None
    for v in reversed(vals): head = N(v, head)
    return head

def middle(head):                      # slow moves 1, fast moves 2
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    return slow.v

def nth_from_end(head, n):             # fast gets an n-step head start
    fast = slow = head
    for _ in range(n):
        fast = fast.next
    while fast:
        slow, fast = slow.next, fast.next
    return slow.v

print(middle(build([1, 2, 3, 4, 5])), middle(build([1, 2, 3, 4])), nth_from_end(build([1, 2, 3, 4, 5]), 2))
```

## 6. Floyd's cycle detection (tortoise and hare)

```python
class N:
    def __init__(self, v): self.v, self.next = v, None

nodes = [N(i) for i in range(6)]
for a, b in zip(nodes, nodes[1:]):
    a.next = b
nodes[-1].next = nodes[2]               # a cycle back to node 2

def cycle_start(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:                # they met inside the cycle
            slow = head                 # restart one pointer from the head
            while slow is not fast:
                slow, fast = slow.next, fast.next
            return slow                 # both now stand on the cycle's entry
    return None

start = cycle_start(nodes[0])
print("cycle starts at node", start.v if start else None)
```

:::deep Why restarting from the head finds the entry
Let `a` = the distance from the head to the cycle entry, `b` = the distance from the entry to the meeting point, and `c` = the cycle length. When they meet, slow has walked `a + b` and fast has walked `2(a + b)`, so `a + b` is a multiple of `c`. So walking `a` more steps from the meeting point lands exactly on the entry, which is also `a` steps from the head. O(n) time, **O(1) space**.
:::

## 7. Reversal patterns

```python
class N:
    def __init__(self, v, nxt=None): self.v, self.next = v, nxt
def build(vals):
    head = None
    for v in reversed(vals): head = N(v, head)
    return head
def to_list(h):
    out = []
    while h: out.append(h.v); h = h.next
    return out

def reverse(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next      # 1. save the rest
        cur.next = prev     # 2. flip the arrow
        prev = cur          # 3. advance prev
        cur = nxt           # 4. advance cur
    return prev

def reverse_rec(head):
    if head is None or head.next is None:
        return head
    new_head = reverse_rec(head.next)
    head.next.next = head   # the next node now points back at me
    head.next = None
    return new_head

print(to_list(reverse(build([1, 2, 3, 4]))), to_list(reverse_rec(build([1, 2, 3]))))
```

:::trace
Iterative reversal of `1 → 2 → 3`:
| Step | prev | cur | list state |
|---|---|---|---|
| start | None | 1 | 1→2→3 |
| 1 | 1 | 2 | None←1  2→3 |
| 2 | 2 | 3 | None←1←2  3 |
| 3 | 3 | None | None←1←2←3 → return 3 |
:::

## 8. `collections.deque`: the built-in linked list

```python
from collections import deque
d = deque([2, 3])
d.appendleft(1); d.append(4)
print(d, d.popleft(), d.pop(), list(d))
```

In real Python code, reach for `deque` (a doubly linked list of fixed-size blocks, implemented in C) instead of hand-written nodes, unless you need O(1) removal of an arbitrary **known node** (the LRU cache) or you're in an interview.

## 9. Skip lists (concept)

A **skip list** adds "express lanes": extra levels of forward pointers that skip ahead over many nodes, giving O(log n) average search, insert and delete in a sorted linked structure. It's used in Redis sorted sets and LevelDB/RocksDB memtables as a simpler alternative to balanced trees.

## 10. Big-O and ML connections

| Operation | Singly | Doubly |
|---|---|---|
| access k-th | O(k) | O(k) |
| insert/delete at the head | O(1) | O(1) |
| insert/delete at the tail | O(1) with a tail pointer / O(n) delete | O(1) |
| delete a given node | O(n) (need its predecessor) | **O(1)** |
| search | O(n) | O(n) |

ML connections: a **computation graph** (autograd) is a linked structure of operations pointing back to their inputs. **Gradient tapes** record operations in order and replay them in reverse. **LRU caches** keep embedding lookups or KV-caches bounded.

## Tricks & tips

- Draw the pointers on paper, or use 👣 Visualise, before you code.
- Save `cur.next` **before** overwriting it.
- Use a dummy head to avoid special cases.
- Fast/slow pointers give you the middle, cycles, and the nth-from-end.
- Compare nodes with `is`, not `==` (two different nodes may hold equal values).
- To delete a node given only that node (not the head), copy the next node's value into it and skip the next node (this doesn't work for the tail).

## The 10 most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Losing the rest of the list when re-pointing | save `nxt = cur.next` first |
| 2 | `None.next` → AttributeError | check `cur and cur.next` |
| 3 | Forgetting to update head/tail | dummy head, explicit tail updates |
| 4 | Infinite loops from accidental cycles | Floyd's check while debugging |
| 5 | Off-by-one in nth-from-end | give fast exactly n steps |
| 6 | Recursion depth on long lists | iterative versions |
| 7 | `==` on nodes instead of `is` | identity for node comparisons |
| 8 | Not setting `next = None` on the new tail after reversing | detach explicitly |
| 9 | Forgetting `prev` updates in doubly linked lists | update all 4 pointers |
| 10 | Using linked lists in Python for speed | lists/deques are usually faster |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
class N:
    def __init__(self, v, nxt=None): self.v, self.next = v, nxt
head = N(1, N(2, N(3)))
cur = head
cur = cur.next
cur.v = 99
print(head.v, head.next.v)
```
What prints?
- [ ] `99 2`
- [x] `1 99`
- [ ] `1 2`
`cur = cur.next` only moves the **name** `cur`. But `cur.v = 99` modifies the node object that `head.next` also points to.
:::

:::quiz
```python norun
class N:
    def __init__(self, v, nxt=None): self.v, self.next = v, nxt
def push_front(head, v):
    head = N(v, head)
h = N(1)
push_front(h, 0)
print(h.v)
```
What prints?
- [x] `1`
- [ ] `0`
- [ ] `AttributeError`
Rebinding the **parameter** `head` inside the function doesn't change the caller's `h`. Linked-list functions that change the head must **return** the new head (`h = push_front(h, 0)`).
:::

:::quiz
Floyd's cycle detection moves `slow` by 1 and `fast` by 2. In a list with a cycle, why must they meet?
- [x] Inside the cycle, the gap between them shrinks by exactly 1 node every step
- [ ] Because fast eventually becomes None
- [ ] They only meet if the cycle length is even
Once both pointers are inside the cycle, `fast` gains exactly one node on `slow` per step, so the gap decreases by 1 each time until it hits 0. It can't skip over `slow`, which guarantees O(n) detection with O(1) memory.
:::

## Practice problems

:::problem basic | Reverse a linked list | pointer manipulation
Reverse a singly linked list iteratively (LeetCode 206). Use 👣 Visualise to watch the arrows flip one by one.
:::solution
```python
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

def reverse(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next
        cur.next = prev
        prev, cur = cur, nxt
    return prev

head = Node(1, Node(2, Node(3, Node(4))))
head = reverse(head)
vals = []
while head:
    vals.append(head.val); head = head.next
print(vals)
```
:::explain
Three pointers: `prev` (the already-reversed part), `cur` (the node being flipped) and `nxt` (the saved remainder). Each node's arrow is flipped exactly once: O(n) time, O(1) space. Forgetting to save `nxt` before `cur.next = prev` would lose the rest of the list.
:::end

:::problem basic | Merge two sorted linked lists | dummy head
Merge two sorted linked lists by splicing their nodes together (LeetCode 21).
:::solution
```python
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next
def build(vals):
    head = None
    for v in reversed(vals): head = Node(v, head)
    return head
def to_list(h):
    out = []
    while h: out.append(h.val); h = h.next
    return out

def merge(a, b):
    dummy = tail = Node(0)
    while a and b:
        if a.val <= b.val:
            tail.next, a = a, a.next
        else:
            tail.next, b = b, b.next
        tail = tail.next
    tail.next = a or b              # attach whatever is left
    return dummy.next

print(to_list(merge(build([1, 2, 4]), build([1, 3, 4, 5]))))
```
:::explain
The dummy node removes the "which list provides the head?" special case. We relink existing nodes rather than creating new ones: O(n + m) time, O(1) extra space. `a or b` attaches the non-empty remainder in one step.
:::end

:::problem basic | Remove duplicates from a sorted list | one pass
Delete duplicate values from a **sorted** linked list so each value appears once (LeetCode 83).
:::solution
```python
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next
def build(vals):
    head = None
    for v in reversed(vals): head = Node(v, head)
    return head
def to_list(h):
    out = []
    while h: out.append(h.val); h = h.next
    return out

def dedupe(head):
    cur = head
    while cur and cur.next:
        if cur.next.val == cur.val:
            cur.next = cur.next.next   # skip the duplicate (don't advance)
        else:
            cur = cur.next
    return head

print(to_list(dedupe(build([1, 1, 2, 3, 3, 3, 4]))))
```
:::explain
Because the list is sorted, duplicates are adjacent. When the next node repeats the current value, bypass it **without advancing**, because the node after it might also be a duplicate.
:::end

:::problem medium | Palindrome linked list in O(1) space | middle + reverse + compare
Is a linked list a palindrome (LeetCode 234)? Use O(1) extra space: find the middle, reverse the second half, compare, then **restore** the list.
:::solution
```python
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next
def build(vals):
    head = None
    for v in reversed(vals): head = Node(v, head)
    return head
def to_list(h):
    out = []
    while h: out.append(h.val); h = h.next
    return out
def reverse(h):
    prev = None
    while h:
        h.next, prev, h = prev, h, h.next
    return prev

def is_palindrome(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    second = reverse(slow)
    a, b, ok = head, second, True
    while b:
        if a.val != b.val:
            ok = False
            break
        a, b = a.next, b.next
    reverse(second)                      # restore the original order
    return ok

for vals in [[1, 2, 2, 1], [1, 2, 3, 2, 1], [1, 2]]:
    h = build(vals)
    print(vals, is_palindrome(h), to_list(h))
```
:::explain
Fast/slow pointers find the middle. Reversing the second half lets us walk both halves forward in lock-step. Restoring the list afterwards is good manners: functions shouldn't silently corrupt their input. Note the reversal one-liner `h.next, prev, h = prev, h, h.next`: all the right-hand values are evaluated first, so it's safe.
:::end

:::problem medium | Add two numbers stored in reverse | carry propagation
Digits are stored in reverse order (`2→4→3` is 342). Add two such numbers and return the sum as a list (LeetCode 2).
:::solution
```python
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next
def build(vals):
    head = None
    for v in reversed(vals): head = Node(v, head)
    return head
def to_list(h):
    out = []
    while h: out.append(h.val); h = h.next
    return out

def add_two(a, b):
    dummy = tail = Node(0)
    carry = 0
    while a or b or carry:
        total = carry + (a.val if a else 0) + (b.val if b else 0)
        carry, digit = divmod(total, 10)
        tail.next = Node(digit)
        tail = tail.next
        a = a.next if a else None
        b = b.next if b else None
    return dummy.next

print(to_list(add_two(build([2, 4, 3]), build([5, 6, 4]))))      # 342 + 465 = 807
print(to_list(add_two(build([9, 9, 9, 9]), build([9, 9]))))       # 9999 + 99 = 10098
```
:::explain
This is exactly grade-school addition from the least significant digit: `divmod(total, 10)` gives the carry and the digit. The loop continues while **either** list or the carry remains, which handles lists of different lengths and a final carry (`999 + 1`).
:::end

:::problem medium | Reorder list L0→Ln→L1→Ln-1… | split, reverse, weave
Reorder `1→2→3→4→5` into `1→5→2→4→3` in place (LeetCode 143).
:::solution
```python
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next
def build(vals):
    head = None
    for v in reversed(vals): head = Node(v, head)
    return head
def to_list(h):
    out = []
    while h: out.append(h.val); h = h.next
    return out

def reorder(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    second, slow.next = slow.next, None        # split into two halves
    prev = None
    while second:                               # reverse the second half
        second.next, prev, second = prev, second, second.next
    first, second = head, prev
    while second:                               # weave the halves together
        n1, n2 = first.next, second.next
        first.next, second.next = second, n1
        first, second = n1, n2
    return head

print(to_list(reorder(build([1, 2, 3, 4, 5]))), to_list(reorder(build([1, 2, 3, 4]))))
```
:::explain
This problem combines three linked-list tools: **find the middle**, **reverse**, and **merge alternately**. The weave saves both `next` pointers before rewiring, the same "save before you overwrite" rule as in reversal. O(n) time, O(1) space.
:::end

:::problem hard | LRU cache with hash map + doubly linked list | O(1) design
Implement `LRUCache(capacity)` with O(1) `get` and `put` (LeetCode 146) **without** `OrderedDict`: a dict maps key → node, and a doubly linked list orders nodes by recency.
:::solution
```python
class Node:
    __slots__ = ("key", "val", "prev", "next")
    def __init__(self, key=None, val=None):
        self.key, self.val, self.prev, self.next = key, val, None, None

class LRUCache:
    def __init__(self, capacity):
        self.cap, self.map = capacity, {}
        self.head, self.tail = Node(), Node()          # sentinels: head = LRU side, tail = MRU side
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, node):
        node.prev.next, node.next.prev = node.next, node.prev

    def _push_back(self, node):                         # mark as most recently used
        node.prev, node.next = self.tail.prev, self.tail
        self.tail.prev.next = node
        self.tail.prev = node

    def get(self, key):
        node = self.map.get(key)
        if node is None:
            return -1
        self._unlink(node); self._push_back(node)
        return node.val

    def put(self, key, val):
        if key in self.map:
            node = self.map[key]
            node.val = val
            self._unlink(node)
        else:
            if len(self.map) == self.cap:
                lru = self.head.next                    # least recently used
                self._unlink(lru)
                del self.map[lru.key]                   # why nodes store their key
            node = Node(key, val)
            self.map[key] = node
        self._push_back(node)

c = LRUCache(2)
c.put(1, 1); c.put(2, 2)
print(c.get(1))        # 1   (1 becomes most recent)
c.put(3, 3)            # evicts key 2
print(c.get(2), c.get(3))
c.put(4, 4)            # evicts key 1
print(c.get(1), c.get(3), c.get(4))
```
:::explain
The dict finds a node in O(1). The doubly linked list moves it to the "recent" end, or removes the least recent one from the other end, in O(1), because each node knows both its neighbours. Each node stores its **key** so that eviction can also delete the dict entry. Sentinel nodes remove every `None` check. This is the canonical system-design data structure behind CPU caches, CDNs, and `functools.lru_cache` (which is implemented the same way in C).
:::end

:::problem hard | Reverse nodes in k-groups | segmented reversal
Reverse the nodes `k` at a time. A final group with fewer than k nodes stays as is (LeetCode 25): `1..5, k=2` → `2,1,4,3,5`.
:::solution
```python
class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next
def build(vals):
    head = None
    for v in reversed(vals): head = Node(v, head)
    return head
def to_list(h):
    out = []
    while h: out.append(h.val); h = h.next
    return out

def reverse_k_group(head, k):
    dummy = Node(0, head)
    group_prev = dummy
    while True:
        kth = group_prev
        for _ in range(k):                 # check that k nodes remain
            kth = kth.next
            if kth is None:
                return dummy.next
        group_next = kth.next
        prev, cur = group_next, group_prev.next   # reverse this group, pointing its tail at group_next
        while cur is not group_next:
            cur.next, prev, cur = prev, cur, cur.next
        first = group_prev.next            # the old first is now the group's tail
        group_prev.next = kth              # connect the previous part to the new group head
        group_prev = first

print(to_list(reverse_k_group(build([1, 2, 3, 4, 5]), 2)), to_list(reverse_k_group(build([1, 2, 3, 4, 5]), 3)))
```
:::explain
For each group: (1) check that k nodes exist, (2) reverse exactly those nodes, starting `prev` at the node **after** the group so the reversed group's tail stays connected to the rest, (3) splice the new group head after `group_prev`, and (4) move `group_prev` to the group's new tail. O(n) time, O(1) space. Visualising a small case is the best way to see the four splices.
:::end

:::problem hard | Copy a list with random pointers | interleaving, deep copy
Each node has `next` and `random` (pointing to any node or None). Deep-copy the list (LeetCode 138) in O(n) time, first with a dict, then with O(1) extra space by interleaving copies.
:::solution
```python
class Node:
    def __init__(self, val, next=None, random=None):
        self.val, self.next, self.random = val, next, random

def copy_with_dict(head):
    clone = {None: None}
    cur = head
    while cur:
        clone[cur] = Node(cur.val)
        cur = cur.next
    cur = head
    while cur:
        clone[cur].next, clone[cur].random = clone[cur.next], clone[cur.random]
        cur = cur.next
    return clone[head]

def copy_interleaved(head):
    cur = head
    while cur:                                   # A -> A' -> B -> B' ...
        cur.next = Node(cur.val, cur.next)
        cur = cur.next.next
    cur = head
    while cur:                                   # the copy's random = original's random's copy
        cur.next.random = cur.random.next if cur.random else None
        cur = cur.next.next
    dummy = copy_tail = Node(0)
    cur = head
    while cur:                                   # unweave, restoring the original list
        copy_tail.next = cur.next
        copy_tail = copy_tail.next
        cur.next = cur.next.next
        cur = cur.next
    return dummy.next

def describe(h):
    nodes, out = [], []
    cur = h
    while cur: nodes.append(cur); cur = cur.next
    return [(n.val, nodes.index(n.random) if n.random else None) for n in nodes]

a, b, c = Node(7), Node(13), Node(11)
a.next, b.next = b, c
a.random, b.random, c.random = None, a, c
for fn in (copy_with_dict, copy_interleaved):
    cp = fn(a)
    print(fn.__name__, describe(cp), "independent:", cp is not a and cp.next is not b)
print("original intact:", describe(a))
```
:::explain
**Dict version**: map each original node to its clone, then wire the clones' pointers through the map: O(n) space. **Interleaved version**: insert each clone right after its original, so `original.random.next` *is* the clone of the random target, with no map needed. Then unweave the two lists. It's a classic trick for using the structure itself as a hash table. Both handle self-references and `None` randoms.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Middle of the linked list | LeetCode 876 | https://leetcode.com/problems/middle-of-the-linked-list/
Return the middle node of a linked list. If there are two middle nodes, return the **second** one. Use fast and slow pointers. (The helpers `build` and `to_list` are provided in the starter.)
:::starter
```python norun
class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def build(vals):
    head = None
    for v in reversed(vals):
        head = ListNode(v, head)
    return head

def to_list(node):
    out = []
    while node:
        out.append(node.val); node = node.next
    return out

def middle_node(head):
    pass
```
:::tests
```python norun
assert to_list(middle_node(build([1, 2, 3, 4, 5]))) == [3, 4, 5]
assert to_list(middle_node(build([1, 2, 3, 4, 5, 6]))) == [4, 5, 6]
assert to_list(middle_node(build([7]))) == [7]
```
:::solution
```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def build(vals):
    head = None
    for v in reversed(vals):
        head = ListNode(v, head)
    return head

def to_list(node):
    out = []
    while node:
        out.append(node.val); node = node.next
    return out

def middle_node(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
    return slow

print(to_list(middle_node(build([1, 2, 3, 4, 5, 6]))))
```
:::explain
`fast` moves twice as fast, so when it reaches the end, `slow` is halfway: one pass, with no need to count the length first. The loop condition `fast and fast.next` stops safely for both odd and even lengths, and the even case naturally lands on the **second** middle.
:::complexity
O(n) time, O(1) space.
:::end

:::program basic | Linked list cycle | LeetCode 141 | https://leetcode.com/problems/linked-list-cycle/
Return True if the list has a cycle, using O(1) memory (Floyd's algorithm). The test builds lists whose tail points back to the node at index `pos` (−1 means no cycle).
:::starter
```python norun
class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def has_cycle(head):
    pass
```
:::tests
```python norun
def make(vals, pos):
    nodes = [ListNode(v) for v in vals]
    for a, b in zip(nodes, nodes[1:]): a.next = b
    if nodes and pos >= 0: nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None
assert has_cycle(make([3, 2, 0, -4], 1)) is True
assert has_cycle(make([1, 2], 0)) is True
assert has_cycle(make([1], -1)) is False
assert has_cycle(make([], -1)) is False
assert has_cycle(make(list(range(10000)), 5000)) is True
```
:::solution
```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow, fast = slow.next, fast.next.next
        if slow is fast:                 # identity, not ==
            return True
    return False

a, b, c = ListNode(1), ListNode(2), ListNode(3)
a.next, b.next, c.next = b, c, a
print(has_cycle(a), has_cycle(ListNode(9)))
```
:::explain
Without a cycle, `fast` falls off the end. With one, both pointers end up circling, and `fast` closes the gap by 1 node per step, so they must meet. We compare with `is` because two *different* nodes may hold equal values. A visited set also works, but costs O(n) memory.
:::complexity
O(n) time, O(1) space.
:::end

:::program medium | Remove Nth node from end | LeetCode 19 | https://leetcode.com/problems/remove-nth-node-from-end-of-list/
Remove the `n`-th node from the **end** in one pass, and return the head (which may change).
:::starter
```python norun
class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def build(vals):
    head = None
    for v in reversed(vals):
        head = ListNode(v, head)
    return head

def to_list(node):
    out = []
    while node:
        out.append(node.val); node = node.next
    return out

def remove_nth_from_end(head, n):
    pass
```
:::tests
```python norun
assert to_list(remove_nth_from_end(build([1, 2, 3, 4, 5]), 2)) == [1, 2, 3, 5]
assert to_list(remove_nth_from_end(build([1]), 1)) == []
assert to_list(remove_nth_from_end(build([1, 2]), 1)) == [1]
assert to_list(remove_nth_from_end(build([1, 2]), 2)) == [2]
```
:::hint
Start both pointers at a **dummy** node placed before the head. Move `fast` n + 1 steps ahead, then move both until `fast` is None. `slow` then sits just **before** the node to delete.
:::solution
```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def build(vals):
    head = None
    for v in reversed(vals):
        head = ListNode(v, head)
    return head

def to_list(node):
    out = []
    while node:
        out.append(node.val); node = node.next
    return out

def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)
    slow = fast = dummy
    for _ in range(n + 1):
        fast = fast.next
    while fast:
        slow, fast = slow.next, fast.next
    slow.next = slow.next.next            # unlink the target
    return dummy.next

print(to_list(remove_nth_from_end(build([1, 2, 3, 4, 5]), 2)))
```
:::explain
The fixed gap of n + 1 nodes means that when `fast` falls off the end, `slow` is right before the target. The **dummy** node makes "remove the head" (the last test) work with no special case: `slow` simply stays at the dummy. Returning `dummy.next` gives the possibly-new head.
:::trace
`[1,2,3,4,5]`, n = 2 (gap of 3):
| slow | fast |
|---|---|
| dummy | 3 |
| 1 | 4 |
| 2 | 5 |
| 3 | None → unlink 4 → [1, 2, 3, 5] |
:::complexity
O(n) time, O(1) space.
:::end

:::program hard | Merge k sorted lists | LeetCode 23 | https://leetcode.com/problems/merge-k-sorted-lists/
Merge `k` sorted linked lists into one sorted list in O(N log k).
:::starter
```python norun
import heapq

class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def build(vals):
    head = None
    for v in reversed(vals):
        head = ListNode(v, head)
    return head

def to_list(node):
    out = []
    while node:
        out.append(node.val); node = node.next
    return out

def merge_k_lists(lists):
    pass
```
:::tests
```python norun
assert to_list(merge_k_lists([build([1, 4, 5]), build([1, 3, 4]), build([2, 6])])) == [1, 1, 2, 3, 4, 4, 5, 6]
assert to_list(merge_k_lists([])) == []
assert to_list(merge_k_lists([None, build([0])])) == [0]
import random
ls = [sorted(random.randint(0, 99) for _ in range(random.randint(0, 20))) for _ in range(30)]
assert to_list(merge_k_lists([build(l) for l in ls])) == sorted(x for l in ls for x in l)
```
:::hint
Push the head of each list into a min-heap as `(val, i, node)`. The index `i` breaks ties, because nodes aren't comparable. Pop the smallest, append it to the result, and push its `next`.
:::solution
```python
import heapq

class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next

def build(vals):
    head = None
    for v in reversed(vals):
        head = ListNode(v, head)
    return head

def to_list(node):
    out = []
    while node:
        out.append(node.val); node = node.next
    return out

def merge_k_lists(lists):
    heap = [(node.val, i, node) for i, node in enumerate(lists) if node]
    heapq.heapify(heap)
    dummy = tail = ListNode()
    while heap:
        val, i, node = heapq.heappop(heap)
        tail.next = node                      # reuse the existing node
        tail = node
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return dummy.next

print(to_list(merge_k_lists([build([1, 4, 5]), build([1, 3, 4]), build([2, 6])])))
```
:::explain
The heap always holds one candidate per list: its current head. The global minimum must be among them. Popping it and pushing its successor keeps the heap at size k or less, so each of the N nodes costs O(log k). We relink the existing nodes instead of creating new ones. The index tie-breaker avoids comparing `ListNode` objects, which would raise TypeError.
:::complexity
O(N log k) time, O(k) heap space.
:::end
