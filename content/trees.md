# Trees

A **tree** is a hierarchy: one **root**, and every other node has exactly one **parent** and any number of **children**. Folders on your disk, HTML documents, decision trees, company org charts and Python's own syntax trees are all trees. **Binary trees** (at most two children) and **binary search trees** (BSTs) are the backbone of countless interview questions, and almost every one of them is solved with **recursion**.

:::analogy A family tree upside down
The root is the ancestor at the top. Branches split downward to children, and the people with no children are **leaves**. Asking "how tall is this tree?" is the same as asking "1 + the height of my tallest child's subtree", and that self-similarity is why recursion fits trees so naturally.
:::

## 1. Terminology

| Term | Meaning |
|---|---|
| root | the top node (no parent) |
| leaf | a node with no children |
| edge | a parent → child link |
| depth of a node | the number of edges from the root |
| height of a tree | the number of edges on the longest root → leaf path (an empty tree is -1, a single node is 0) |
| subtree | a node plus all its descendants |
| binary tree | each node has ≤ 2 children (left, right) |
| full / complete / perfect | every node has 0 or 2 children / filled level by level / every level full |
| balanced | the heights of the left and right subtrees differ by ≤ 1 at every node |
| BST | left subtree < node < right subtree, everywhere |

```text
          8            depth 0  (root)
        /   \
       3     10        depth 1
      / \      \
     1   6      14     depth 2
        / \    /
       4   7  13       depth 3   (leaves: 1, 4, 7, 13)   height = 3
```

## 2. Node class and building trees

```python
class TreeNode:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right
    def __repr__(self):
        return f"TreeNode({self.val})"

root = TreeNode(8,
                TreeNode(3, TreeNode(1), TreeNode(6, TreeNode(4), TreeNode(7))),
                TreeNode(10, None, TreeNode(14, TreeNode(13))))

def from_level_order(vals):             # LeetCode-style list with None for gaps
    if not vals or vals[0] is None:
        return None
    from collections import deque
    it = iter(vals)
    root = TreeNode(next(it))
    q = deque([root])
    while q:
        node = q.popleft()
        for side in ("left", "right"):
            v = next(it, None)
            if v is not None:
                child = TreeNode(v)
                setattr(node, side, child)
                q.append(child)
    return root

t = from_level_order([3, 9, 20, None, None, 15, 7])
print(t, t.left, t.right, t.right.left, t.right.right)
```

### Array representation (complete trees)

For a complete binary tree stored in a list, node `i` has children `2i+1` and `2i+2` and parent `(i-1)//2`. That's exactly how heaps are stored (see *Heaps*).

## 3. Recursive thinking: height, size, sum, balance

```python
class T:
    def __init__(self, v, l=None, r=None): self.v, self.left, self.right = v, l, r
root = T(8, T(3, T(1), T(6, T(4), T(7))), T(10, None, T(14, T(13))))

def height(n):
    return -1 if n is None else 1 + max(height(n.left), height(n.right))

def size(n):
    return 0 if n is None else 1 + size(n.left) + size(n.right)

def total(n):
    return 0 if n is None else n.v + total(n.left) + total(n.right)

def is_balanced(n):
    def check(n):                       # returns the height, or -2 meaning "unbalanced"
        if n is None:
            return -1
        lh, rh = check(n.left), check(n.right)
        if lh == -2 or rh == -2 or abs(lh - rh) > 1:
            return -2
        return 1 + max(lh, rh)
    return check(n) != -2

print(height(root), size(root), total(root), is_balanced(root))
```

:::boss The recursive tree template
1. **Base case**: what do I return for `None`?
2. **Recurse**: get the answers for `left` and `right`.
3. **Combine**: build my answer from theirs (plus my own value).

Nearly every tree problem fits this shape. Height, size, max path sum, diameter, LCA and validation all differ only in step 3.
:::

## 4. The four traversals

```python
from collections import deque
class T:
    def __init__(self, v, l=None, r=None): self.v, self.left, self.right = v, l, r
root = T(8, T(3, T(1), T(6, T(4), T(7))), T(10, None, T(14, T(13))))

def preorder(n):   return [] if not n else [n.v] + preorder(n.left) + preorder(n.right)    # root, L, R
def inorder(n):    return [] if not n else inorder(n.left) + [n.v] + inorder(n.right)     # L, root, R
def postorder(n):  return [] if not n else postorder(n.left) + postorder(n.right) + [n.v] # L, R, root

def level_order(n):
    out, q = [], deque([n] if n else [])
    while q:
        level = []
        for _ in range(len(q)):          # exactly one level per iteration
            node = q.popleft()
            level.append(node.v)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        out.append(level)
    return out

print("pre: ", preorder(root))
print("in:  ", inorder(root), "<- sorted, because this is a BST!")
print("post:", postorder(root))
print("bfs: ", level_order(root))
```

| Traversal | Order | Typical use |
|---|---|---|
| Pre-order | root, left, right | copying/serialising a tree, prefix expressions |
| In-order | left, root, right | **sorted output of a BST** |
| Post-order | left, right, root | deleting/freeing, computing sizes and heights bottom-up |
| Level-order (BFS) | level by level | shortest depth, views, per-level aggregates |

### Iterative in-order (no recursion limit)

```python
class T:
    def __init__(self, v, l=None, r=None): self.v, self.left, self.right = v, l, r
root = T(4, T(2, T(1), T(3)), T(6, T(5)))
def inorder_iter(node):
    out, stack = [], []
    while stack or node:
        while node:
            stack.append(node)
            node = node.left
        node = stack.pop()
        out.append(node.v)
        node = node.right
    return out
print(inorder_iter(root))
```

## 5. Binary search trees

```python
class BST:
    class _N:
        __slots__ = ("key", "left", "right")
        def __init__(self, key): self.key, self.left, self.right = key, None, None

    def __init__(self, keys=()):
        self.root = None
        for k in keys:
            self.insert(k)

    def insert(self, key):
        if self.root is None:
            self.root = self._N(key); return
        cur = self.root
        while True:
            if key < cur.key:
                if cur.left is None: cur.left = self._N(key); return
                cur = cur.left
            elif key > cur.key:
                if cur.right is None: cur.right = self._N(key); return
                cur = cur.right
            else:
                return                              # ignore duplicates

    def __contains__(self, key):
        cur = self.root
        while cur:
            if key == cur.key: return True
            cur = cur.left if key < cur.key else cur.right
        return False

    def delete(self, key):
        def _del(node, key):
            if node is None:
                return None
            if key < node.key:
                node.left = _del(node.left, key)
            elif key > node.key:
                node.right = _del(node.right, key)
            else:
                if node.left is None: return node.right       # 0 or 1 child
                if node.right is None: return node.left
                succ = node.right                              # 2 children: in-order successor
                while succ.left:
                    succ = succ.left
                node.key = succ.key
                node.right = _del(node.right, succ.key)
            return node
        self.root = _del(self.root, key)

    def floor(self, x):                                 # the largest key <= x
        cur, best = self.root, None
        while cur:
            if cur.key == x: return x
            if cur.key < x: best, cur = cur.key, cur.right
            else: cur = cur.left
        return best

    def inorder(self):
        out, stack, cur = [], [], self.root
        while stack or cur:
            while cur: stack.append(cur); cur = cur.left
            cur = stack.pop(); out.append(cur.key); cur = cur.right
        return out

t = BST([50, 30, 70, 20, 40, 60, 80])
print(t.inorder(), 40 in t, 45 in t, t.floor(65), t.floor(10))
t.delete(30); t.delete(50)
print(t.inorder(), t.root.key)
```

| BST operation | Average (balanced) | Worst (degenerate) |
|---|---|---|
| search / insert / delete | O(log n) | O(n) |
| min / max | O(log n) | O(n) |
| in-order traversal | O(n) | O(n) |

:::trap Sorted input makes a BST a linked list
Inserting `1, 2, 3, 4, 5` in order makes every node a right child, so the height becomes n − 1 and operations become O(n). **Self-balancing** trees (AVL, red-black) fix this with rotations. In Python, use `bisect` on a sorted list, or the `sortedcontainers` package, instead of hand-rolling a BST.
:::

## 6. AVL rotations (self-balancing)

```python
class AVL:
    class N:
        def __init__(self, k): self.k, self.l, self.r, self.h = k, None, None, 1
    @staticmethod
    def h(n): return n.h if n else 0
    def fix(self, n):
        n.h = 1 + max(self.h(n.l), self.h(n.r))
    def rot_right(self, y):            #     y          x
        x = y.l                         #    /    ->     \
        y.l, x.r = x.r, y               #   x             y
        self.fix(y); self.fix(x)
        return x
    def rot_left(self, x):
        y = x.r
        x.r, y.l = y.l, x
        self.fix(x); self.fix(y)
        return y
    def insert(self, n, k):
        if not n: return self.N(k)
        if k < n.k: n.l = self.insert(n.l, k)
        else: n.r = self.insert(n.r, k)
        self.fix(n)
        bal = self.h(n.l) - self.h(n.r)
        if bal > 1 and k < n.l.k: return self.rot_right(n)                          # LL
        if bal < -1 and k >= n.r.k: return self.rot_left(n)                         # RR
        if bal > 1: n.l = self.rot_left(n.l); return self.rot_right(n)              # LR
        if bal < -1: n.r = self.rot_right(n.r); return self.rot_left(n)             # RL
        return n

avl, root = AVL(), None
for k in range(1, 16):                  # sorted input: the worst case for a plain BST
    root = avl.insert(root, k)
print("root:", root.k, "height:", root.h, "(a plain BST would have height 15)")
```

## 7. Classic problems: LCA, path sums, construct from traversals

```python
class T:
    def __init__(self, v, l=None, r=None): self.v, self.left, self.right = v, l, r

def lca(root, p, q):                    # lowest common ancestor in ANY binary tree
    if root is None or root.v in (p, q):
        return root
    left, right = lca(root.left, p, q), lca(root.right, p, q)
    if left and right:
        return root                     # p and q are on different sides
    return left or right

def build(preorder, inorder):           # reconstruct from two traversals
    if not preorder:
        return None
    root_val = preorder[0]
    i = inorder.index(root_val)
    return T(root_val, build(preorder[1:i + 1], inorder[:i]), build(preorder[i + 1:], inorder[i + 1:]))

tree = build([3, 5, 6, 2, 7, 4, 1, 0, 8], [6, 5, 7, 2, 4, 3, 0, 1, 8])
print(lca(tree, 7, 4).v, lca(tree, 6, 4).v, lca(tree, 5, 8).v)
```

## 8. Serialisation

```python
class T:
    def __init__(self, v, l=None, r=None): self.v, self.left, self.right = v, l, r

def serialize(n):
    return "#" if n is None else f"{n.v},{serialize(n.left)},{serialize(n.right)}"

def deserialize(s):
    it = iter(s.split(","))
    def build():
        v = next(it)
        if v == "#":
            return None
        return T(int(v), build(), build())
    return build()

t = T(1, T(2), T(3, T(4), T(5)))
s = serialize(t)
print(s, serialize(deserialize(s)) == s)
```

## 9. Trie (prefix tree)

```python
class Trie:
    def __init__(self):
        self.root = {}
    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})
        node["$"] = True                    # end-of-word marker
    def search(self, word):
        node = self._walk(word)
        return node is not None and "$" in node
    def starts_with(self, prefix):
        return self._walk(prefix) is not None
    def _walk(self, s):
        node = self.root
        for ch in s:
            if ch not in node:
                return None
            node = node[ch]
        return node
    def complete(self, prefix):
        node, out = self._walk(prefix), []
        def dfs(n, path):
            for ch, child in sorted(n.items()):
                if ch == "$": out.append(prefix + path)
                else: dfs(child, path + ch)
        if node: dfs(node, "")
        return out

tr = Trie()
for w in ["car", "card", "care", "cat", "dog"]:
    tr.insert(w)
print(tr.search("car"), tr.search("ca"), tr.starts_with("ca"), tr.complete("car"))
```

## 10. Segment tree (range sum with updates)

```python
class SegTree:
    def __init__(self, nums):
        self.n = len(nums)
        self.t = [0] * (2 * self.n)
        self.t[self.n:] = nums                      # leaves
        for i in range(self.n - 1, 0, -1):          # internal nodes
            self.t[i] = self.t[2 * i] + self.t[2 * i + 1]
    def update(self, i, val):                       # O(log n)
        i += self.n
        self.t[i] = val
        while i > 1:
            i //= 2
            self.t[i] = self.t[2 * i] + self.t[2 * i + 1]
    def query(self, l, r):                          # sum of nums[l:r], O(log n)
        res, l, r = 0, l + self.n, r + self.n
        while l < r:
            if l & 1: res += self.t[l]; l += 1
            if r & 1: r -= 1; res += self.t[r]
            l //= 2; r //= 2
        return res

st = SegTree([5, 3, 8, 6, 1, 4])
print(st.query(1, 4), st.query(0, 6))
st.update(2, 10)
print(st.query(1, 4))
```

## 11. ML use cases

```python
tree = {"feature": "age", "threshold": 30,
        "left": {"label": "low risk"},
        "right": {"feature": "smoker", "threshold": 0.5,
                  "left": {"label": "medium risk"}, "right": {"label": "high risk"}}}

def predict(node, x):
    while "label" not in node:                 # walk from the root to a leaf
        node = node["left"] if x[node["feature"]] <= node["threshold"] else node["right"]
    return node["label"]

for person in [{"age": 25, "smoker": 1}, {"age": 50, "smoker": 0}, {"age": 50, "smoker": 1}]:
    print(person, "->", predict(tree, person))
```

Decision trees, random forests and gradient-boosted trees (XGBoost, LightGBM) predict exactly like this. **k-d trees** speed up nearest-neighbour search, and **Huffman trees** compress data.

## Tricks & tips

- Write the base case first: `if node is None: return …`.
- If a function must return two things (e.g. height *and* balanced), return a tuple, or use a sentinel value.
- **BST ⇒ in-order is sorted.** Many BST problems reduce to an in-order walk.
- Use BFS when the question mentions "level", "depth" or "closest". Use DFS for paths and subtree properties.
- Pass bounds down (`lo < val < hi`) to validate BSTs. Don't just compare each node with its children.
- Convert recursion to an explicit stack for very deep (skewed) trees.

## The 10 most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Validating a BST by checking only children | pass min/max bounds down |
| 2 | Missing the `None` base case | always handle the empty tree |
| 3 | Height off-by-one (counting nodes vs edges) | define the convention up front |
| 4 | Recomputing height in `is_balanced` → O(n²) | return the height and the status together |
| 5 | Recursion depth on skewed trees | iterative traversal |
| 6 | Mutating a shared default in recursive helpers | create lists inside |
| 7 | BST from sorted input degenerates | balance it, or build from the middle |
| 8 | Comparing nodes by value when duplicates exist | compare identity, or use unique ids |
| 9 | Forgetting the two-child case in BST delete | the in-order successor |
| 10 | `list.index` inside recursive tree building → O(n²) | precompute a value→index dict |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
class T:
    def __init__(self, v, l=None, r=None): self.v, self.l, self.r = v, l, r
def walk(n, out):
    if n:
        walk(n.l, out); out.append(n.v); walk(n.r, out)
    return out
root = T(4, T(2, T(1), T(3)), T(6, T(5), T(7)))
print(walk(root, []))
```
Which traversal is this, and what prints?
- [x] in-order: `[1, 2, 3, 4, 5, 6, 7]`
- [ ] pre-order: `[4, 2, 1, 3, 6, 5, 7]`
- [ ] post-order: `[1, 3, 2, 5, 7, 6, 4]`
Left, **node**, right is **in-order**. On a binary search tree, in-order always visits the values in sorted order, which is the most useful BST fact in interviews.
:::

:::quiz
```python norun
class T:
    def __init__(self, v, l=None, r=None): self.v, self.l, self.r = v, l, r
def height(n):
    return -1 if n is None else 1 + max(height(n.l), height(n.r))
print(height(None), height(T(1)), height(T(1, T(2, T(3)))))
```
What prints?
- [x] `-1 0 2`
- [ ] `0 1 3`
- [ ] `0 0 2`
With the **edges** convention, an empty tree has height −1, a single node has height 0, and a chain of 3 nodes has height 2. (Some sources count **nodes** instead, giving 0, 1, 3, so always state your convention.)
:::

:::quiz
Is this a valid BST?
```text
      5
     / \
    3   8
       / \
      4   9
```
- [ ] Yes, every node is between its own children
- [x] No, 4 is in 5's right subtree but 4 < 5
- [ ] Only if duplicates are allowed
Checking only parent-child pairs isn't enough. **Every** node in the right subtree of 5 must be greater than 5. Validate with bounds passed down: `lo < node.val < hi`.
:::

## Practice problems

:::problem basic | Maximum depth | recursion template
Return the maximum depth (counted in nodes) of a binary tree (LeetCode 104), recursively and with BFS.
:::solution
```python
from collections import deque
class T:
    def __init__(self, v, l=None, r=None): self.v, self.left, self.right = v, l, r

def max_depth(n):
    return 0 if n is None else 1 + max(max_depth(n.left), max_depth(n.right))

def max_depth_bfs(root):
    depth, q = 0, deque([root] if root else [])
    while q:
        depth += 1
        for _ in range(len(q)):
            n = q.popleft()
            q.extend(c for c in (n.left, n.right) if c)
    return depth

t = T(3, T(9), T(20, T(15), T(7)))
print(max_depth(t), max_depth_bfs(t), max_depth(None))
```
:::explain
Recursive: the depth of a tree is 1 + the deeper of its two subtrees, and an empty tree has depth 0. BFS: count the levels. Both are O(n). Step through the recursive version to watch the call stack grow down the left side first.
:::end

:::problem basic | Invert a binary tree | swap children recursively
Mirror a binary tree (LeetCode 226).
:::solution
```python
class T:
    def __init__(self, v, l=None, r=None): self.v, self.left, self.right = v, l, r
def level(n):
    from collections import deque
    out, q = [], deque([n])
    while q:
        x = q.popleft()
        if x: out.append(x.v); q.extend([x.left, x.right])
    return out

def invert(n):
    if n:
        n.left, n.right = invert(n.right), invert(n.left)
    return n

t = T(4, T(2, T(1), T(3)), T(7, T(6), T(9)))
print(level(t), "->", level(invert(t)))
```
:::explain
Swap each node's children, recursively. Tuple assignment evaluates both `invert(...)` calls before assigning, so no temporary variable is needed. O(n). (This is the problem made famous by a Homebrew author's interview story.)
:::end

:::problem basic | Same tree & symmetric tree | parallel recursion
Write `same(a, b)` (LeetCode 100) and `symmetric(root)` (LeetCode 101), reusing a mirrored comparison.
:::solution
```python
class T:
    def __init__(self, v, l=None, r=None): self.v, self.left, self.right = v, l, r

def same(a, b):
    if not a or not b:
        return a is b
    return a.v == b.v and same(a.left, b.left) and same(a.right, b.right)

def mirror(a, b):
    if not a or not b:
        return a is b
    return a.v == b.v and mirror(a.left, b.right) and mirror(a.right, b.left)

def symmetric(root):
    return mirror(root.left, root.right) if root else True

print(same(T(1, T(2)), T(1, T(2))), same(T(1, T(2)), T(1, None, T(2))))
print(symmetric(T(1, T(2, T(3), T(4)), T(2, T(4), T(3)))), symmetric(T(1, T(2, None, T(3)), T(2, None, T(3)))))
```
:::explain
Walk two trees **in lock-step**. `a is b` in the base case returns True only if both are `None`. For symmetry, compare left with right and right with left. The `and` short-circuits at the first mismatch.
:::end

:::problem medium | Validate a BST | bounds passed down
Determine whether a tree is a valid BST (LeetCode 98). Show why checking only parent–child pairs fails.
:::solution
```python
class T:
    def __init__(self, v, l=None, r=None): self.v, self.left, self.right = v, l, r

def is_bst(n, lo=float("-inf"), hi=float("inf")):
    if n is None:
        return True
    if not lo < n.v < hi:
        return False
    return is_bst(n.left, lo, n.v) and is_bst(n.right, n.v, hi)

def naive(n):                              # WRONG: only checks direct children
    if n is None:
        return True
    if n.left and n.left.v >= n.v: return False
    if n.right and n.right.v <= n.v: return False
    return naive(n.left) and naive(n.right)

tricky = T(5, T(4), T(6, T(3), T(7)))     # 3 is in 5's RIGHT subtree, but 3 < 5
print(is_bst(tricky), naive(tricky), is_bst(T(2, T(1), T(3))))
```
:::explain
Each node must lie within an **interval** determined by all its ancestors, not just its parent. Going left tightens the upper bound, and going right tightens the lower bound. In the tricky tree, `3 < 6` is fine locally, but `3` sits in `5`'s right subtree, which requires values > 5. An equivalent check: the in-order traversal must be strictly increasing.
:::end

:::problem medium | Binary tree right side view | BFS per level
Return the values visible from the right side, i.e. the last node of each level (LeetCode 199).
:::solution
```python
from collections import deque
class T:
    def __init__(self, v, l=None, r=None): self.v, self.left, self.right = v, l, r

def right_view(root):
    out, q = [], deque([root] if root else [])
    while q:
        for _ in range(len(q)):
            n = q.popleft()
            last = n                       # after the loop: the rightmost node of this level
            q.extend(c for c in (n.left, n.right) if c)
        out.append(last.v)
    return out

print(right_view(T(1, T(2, None, T(5)), T(3, None, T(4)))), right_view(T(1, T(2, T(4)), T(3))))
```
:::explain
Level-order traversal visits each level left to right, so the last node processed per level is the one seen from the right. The second example shows why "only follow right children" is wrong: node 4 hangs off the **left** side but is still visible.
:::end

:::problem medium | Diameter of a binary tree | return two values
Return the length (in edges) of the longest path between any two nodes (LeetCode 543). The path may not pass through the root.
:::solution
```python
class T:
    def __init__(self, v, l=None, r=None): self.v, self.left, self.right = v, l, r

def diameter(root):
    best = 0
    def depth(n):                          # returns the height in nodes; updates best on the side
        nonlocal best
        if n is None:
            return 0
        l, r = depth(n.left), depth(n.right)
        best = max(best, l + r)            # the longest path THROUGH n
        return 1 + max(l, r)
    depth(root)
    return best

t = T(1, T(2, T(4, T(8)), T(5, None, T(9, T(10)))), T(3))
print(diameter(t))
```
:::explain
Through each node, the longest path is `left height + right height`. The function returns the height (what its parent needs) while recording the best path seen in a `nonlocal` variable (what we need). That's the "return one thing, track another" pattern, and it runs in O(n) instead of computing heights again for every node.
:::end

:::problem hard | Binary tree maximum path sum | post-order with negative pruning
Find the maximum path sum over any path (any start and end node, following edges, each node at most once) (LeetCode 124). Values may be negative.
:::solution
```python
class T:
    def __init__(self, v, l=None, r=None): self.v, self.left, self.right = v, l, r

def max_path_sum(root):
    best = float("-inf")
    def gain(n):                             # the best downward path starting at n
        nonlocal best
        if n is None:
            return 0
        l = max(gain(n.left), 0)             # drop branches with negative contributions
        r = max(gain(n.right), 0)
        best = max(best, n.v + l + r)        # a path that bends at n
        return n.v + max(l, r)               # a parent can extend only ONE side
    gain(root)
    return best

print(max_path_sum(T(1, T(2), T(3))), max_path_sum(T(-10, T(9), T(20, T(15), T(7)))), max_path_sum(T(-3)))
```
:::explain
At each node, two different quantities matter: (1) the best path that **bends** here (left + node + right), which might be the global answer, and (2) the best **straight** path going down from here, which is what the parent can use (only one side). `max(…, 0)` prunes negative branches. The all-negative case `T(-3)` still works because `best` starts at -inf and every node is considered. O(n).
:::end

:::problem hard | Serialize and deserialize with BFS | queue-based codec
Implement a level-order codec matching LeetCode's format (`"1,2,3,null,null,4,5"`, with trailing nulls trimmed) and prove the round trip on random trees.
:::solution
```python
import random
from collections import deque

class T:
    def __init__(self, v, l=None, r=None): self.v, self.left, self.right = v, l, r

def serialize(root):
    out, q = [], deque([root])
    while q:
        n = q.popleft()
        if n:
            out.append(str(n.v)); q.append(n.left); q.append(n.right)
        else:
            out.append("null")
    while out and out[-1] == "null":
        out.pop()
    return ",".join(out)

def deserialize(s):
    if not s:
        return None
    vals = s.split(",")
    root = T(int(vals[0]))
    q, i = deque([root]), 1
    while q and i < len(vals):
        n = q.popleft()
        for side in ("left", "right"):
            if i < len(vals) and vals[i] != "null":
                child = T(int(vals[i]))
                setattr(n, side, child)
                q.append(child)
            i += 1
    return root

def random_tree(d):
    if d == 0 or random.random() < 0.3:
        return None
    return T(random.randint(-9, 9), random_tree(d - 1), random_tree(d - 1))

t = T(1, T(2), T(3, T(4), T(5)))
print(serialize(t))
for _ in range(300):
    r = random_tree(6)
    assert serialize(deserialize(serialize(r))) == serialize(r)
print("300 random round trips OK")
```
:::explain
Serialising in BFS order writes `null` for missing children, which fixes the shape unambiguously. Deserialising replays the same queue: each popped node consumes the next two tokens as its children. Trimming trailing nulls keeps the string compact, and the decoder treats missing tokens as null. Property testing on random trees catches edge cases (empty trees, skewed shapes) that hand-written tests miss.
:::end

:::problem hard | Kth smallest in a BST with order statistics | augmented nodes
Augment BST nodes with subtree **sizes** so that `kth_smallest(k)` and `rank(x)` (the count of keys < x) run in O(h), and keep the sizes correct on insert.
:::solution
```python
import random

class N:
    __slots__ = ("k", "l", "r", "size")
    def __init__(self, k): self.k, self.l, self.r, self.size = k, None, None, 1

def sz(n): return n.size if n else 0

def insert(n, k):
    if n is None:
        return N(k)
    if k < n.k: n.l = insert(n.l, k)
    elif k > n.k: n.r = insert(n.r, k)
    else: return n
    n.size = 1 + sz(n.l) + sz(n.r)
    return n

def kth(n, k):                    # 1-indexed
    while n:
        left = sz(n.l)
        if k == left + 1: return n.k
        if k <= left: n = n.l
        else: k -= left + 1; n = n.r
    raise IndexError("k out of range")

def rank(n, x):                   # the number of keys < x
    r = 0
    while n:
        if x <= n.k: n = n.l
        else: r += sz(n.l) + 1; n = n.r
    return r

keys = random.sample(range(1000), 200)
root = None
for k in keys:
    root = insert(root, k)
s = sorted(keys)
assert all(kth(root, i + 1) == s[i] for i in range(len(s)))
assert all(rank(root, x) == sum(1 for y in keys if y < x) for x in range(0, 1000, 37))
print("kth/rank verified;", kth(root, 1), kth(root, 100), kth(root, 200), rank(root, 500))
```
:::explain
Storing `size` in each node lets us navigate by **counts**: if the left subtree has `left` nodes, the current node is the `(left+1)`-th smallest, and we go left or right (subtracting) accordingly. Insert updates the sizes on the way back up the recursion. This is an **order-statistic tree**: Redis sorted sets and database indexes use similar augmentations to answer "the 100th item" or "the rank of x" in logarithmic time.
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Path sum | LeetCode 112 | https://leetcode.com/problems/path-sum/
Return True if the tree has a **root-to-leaf** path whose values sum to `target_sum`. (`TreeNode` and `build_tree`, which takes level order with `None` gaps, are provided.)
:::starter
```python norun
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def build_tree(vals):                      # LeetCode-style level order, None = missing
    if not vals or vals[0] is None:
        return None
    from collections import deque
    it = iter(vals)
    root = TreeNode(next(it))
    q = deque([root])
    while q:
        node = q.popleft()
        for side in ("left", "right"):
            v = next(it, None)
            if v is not None:
                setattr(node, side, TreeNode(v))
                q.append(getattr(node, side))
    return root
def has_path_sum(root, target_sum):
    pass
```
:::tests
```python norun
assert has_path_sum(build_tree([5, 4, 8, 11, None, 13, 4, 7, 2, None, None, None, 1]), 22) is True
assert has_path_sum(build_tree([1, 2, 3]), 5) is False
assert has_path_sum(build_tree([]), 0) is False
assert has_path_sum(build_tree([1, 2]), 1) is False
assert has_path_sum(build_tree([-2, None, -3]), -5) is True
```
:::solution
```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def build_tree(vals):                      # LeetCode-style level order, None = missing
    if not vals or vals[0] is None:
        return None
    from collections import deque
    it = iter(vals)
    root = TreeNode(next(it))
    q = deque([root])
    while q:
        node = q.popleft()
        for side in ("left", "right"):
            v = next(it, None)
            if v is not None:
                setattr(node, side, TreeNode(v))
                q.append(getattr(node, side))
    return root
def has_path_sum(root, target_sum):
    if root is None:
        return False
    if root.left is None and root.right is None:     # a leaf: is the path complete?
        return root.val == target_sum
    rest = target_sum - root.val
    return has_path_sum(root.left, rest) or has_path_sum(root.right, rest)

print(has_path_sum(build_tree([5, 4, 8, 11, None, 13, 4, 7, 2, None, None, None, 1]), 22))
```
:::explain
Each call asks the subtree for the **remaining** sum. A path only counts if it ends at a **leaf**: in `[1, 2]` with target 1, the root alone isn't a leaf, so it's False. That's the classic trap. `or` short-circuits as soon as one side finds a path.
:::complexity
O(n) time, O(h) recursion stack.
:::end

:::program basic | Inorder traversal (iterative) | LeetCode 94 | https://leetcode.com/problems/binary-tree-inorder-traversal/
Return the in-order traversal **without recursion**, using an explicit stack. It must handle a 5000-node degenerate (linked-list-shaped) tree, which would exceed the recursion limit.
:::starter
```python norun
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def build_tree(vals):                      # LeetCode-style level order, None = missing
    if not vals or vals[0] is None:
        return None
    from collections import deque
    it = iter(vals)
    root = TreeNode(next(it))
    q = deque([root])
    while q:
        node = q.popleft()
        for side in ("left", "right"):
            v = next(it, None)
            if v is not None:
                setattr(node, side, TreeNode(v))
                q.append(getattr(node, side))
    return root
def inorder_traversal(root):
    pass
```
:::tests
```python norun
assert inorder_traversal(build_tree([1, None, 2, 3])) == [1, 3, 2]
assert inorder_traversal(build_tree([])) == []
assert inorder_traversal(build_tree([4, 2, 6, 1, 3, 5, 7])) == [1, 2, 3, 4, 5, 6, 7]
deep = None
for v in range(5000): deep = TreeNode(v, deep)
assert inorder_traversal(deep) == list(range(5000))
```
:::hint
Push nodes while walking **left**. When you can't go further left, pop a node, record it, then move to its **right** child.
:::solution
```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def build_tree(vals):                      # LeetCode-style level order, None = missing
    if not vals or vals[0] is None:
        return None
    from collections import deque
    it = iter(vals)
    root = TreeNode(next(it))
    q = deque([root])
    while q:
        node = q.popleft()
        for side in ("left", "right"):
            v = next(it, None)
            if v is not None:
                setattr(node, side, TreeNode(v))
                q.append(getattr(node, side))
    return root
def inorder_traversal(root):
    out, stack, node = [], [], root
    while stack or node:
        while node:                 # dive left, remembering the path
            stack.append(node)
            node = node.left
        node = stack.pop()          # the leftmost unvisited node
        out.append(node.val)
        node = node.right           # then its right subtree
    return out

print(inorder_traversal(build_tree([4, 2, 6, 1, 3, 5, 7])))
```
:::explain
The explicit stack holds exactly what the recursion's call stack would: the ancestors still waiting for their turn. Since it's a list on the heap rather than Python frames, depth is limited only by memory, so the 5000-level tree works. Visualise it and watch the stack grow while diving left and shrink while climbing back.
:::complexity
O(n) time, O(h) stack.
:::end

:::program medium | Level order traversal | LeetCode 102 | https://leetcode.com/problems/binary-tree-level-order-traversal/
Return the node values level by level: `[[3], [9, 20], [15, 7]]`. Then return the **zigzag** version (alternating left-to-right and right-to-left) from a second function, `zigzag_level_order`.
:::starter
```python norun
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def build_tree(vals):                      # LeetCode-style level order, None = missing
    if not vals or vals[0] is None:
        return None
    from collections import deque
    it = iter(vals)
    root = TreeNode(next(it))
    q = deque([root])
    while q:
        node = q.popleft()
        for side in ("left", "right"):
            v = next(it, None)
            if v is not None:
                setattr(node, side, TreeNode(v))
                q.append(getattr(node, side))
    return root
def level_order(root):
    pass

def zigzag_level_order(root):
    pass
```
:::tests
```python norun
t = build_tree([3, 9, 20, None, None, 15, 7])
assert level_order(t) == [[3], [9, 20], [15, 7]]
assert zigzag_level_order(t) == [[3], [20, 9], [15, 7]]
assert level_order(None) == [] and zigzag_level_order(None) == []
assert zigzag_level_order(build_tree([1, 2, 3, 4, 5, 6, 7])) == [[1], [3, 2], [4, 5, 6, 7]]
```
:::solution
```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def build_tree(vals):                      # LeetCode-style level order, None = missing
    if not vals or vals[0] is None:
        return None
    from collections import deque
    it = iter(vals)
    root = TreeNode(next(it))
    q = deque([root])
    while q:
        node = q.popleft()
        for side in ("left", "right"):
            v = next(it, None)
            if v is not None:
                setattr(node, side, TreeNode(v))
                q.append(getattr(node, side))
    return root
from collections import deque

def level_order(root):
    if not root:
        return []
    out, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):            # exactly the nodes of this level
            node = q.popleft()
            level.append(node.val)
            q.extend(c for c in (node.left, node.right) if c)
        out.append(level)
    return out

def zigzag_level_order(root):
    return [lvl if i % 2 == 0 else lvl[::-1] for i, lvl in enumerate(level_order(root))]

print(level_order(build_tree([3, 9, 20, None, None, 15, 7])))
```
:::explain
`for _ in range(len(q))` freezes the queue length **before** the loop, so we process exactly one level while the children queue up behind it. That's the standard BFS-by-levels idiom. The zigzag version reuses it and reverses every odd level, building on an existing solution instead of writing a second traversal.
:::complexity
O(n).
:::end

:::program hard | Vertical order traversal | LeetCode 987 | https://leetcode.com/problems/vertical-order-traversal-of-a-binary-tree/
The root is at `(row 0, col 0)`, the left child at `(row+1, col−1)` and the right child at `(row+1, col+1)`. Return the columns from left to right. Within a column, sort by row, and break ties at the same `(row, col)` by **value**.
:::starter
```python norun
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def build_tree(vals):                      # LeetCode-style level order, None = missing
    if not vals or vals[0] is None:
        return None
    from collections import deque
    it = iter(vals)
    root = TreeNode(next(it))
    q = deque([root])
    while q:
        node = q.popleft()
        for side in ("left", "right"):
            v = next(it, None)
            if v is not None:
                setattr(node, side, TreeNode(v))
                q.append(getattr(node, side))
    return root
def vertical_traversal(root):
    pass
```
:::tests
```python norun
assert vertical_traversal(build_tree([3, 9, 20, None, None, 15, 7])) == [[9], [3, 15], [20], [7]]
assert vertical_traversal(build_tree([1, 2, 3, 4, 5, 6, 7])) == [[4], [2], [1, 5, 6], [3], [7]]
assert vertical_traversal(build_tree([1, 2, 3, 4, 6, 5, 7])) == [[4], [2], [1, 5, 6], [3], [7]]
assert vertical_traversal(build_tree([7])) == [[7]]
```
:::hint
Collect `(col, row, val)` tuples with any traversal, then **sort them once**. Tuple ordering gives column, then row, then value, which is exactly the required order. Then group by column.
:::solution
```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def build_tree(vals):                      # LeetCode-style level order, None = missing
    if not vals or vals[0] is None:
        return None
    from collections import deque
    it = iter(vals)
    root = TreeNode(next(it))
    q = deque([root])
    while q:
        node = q.popleft()
        for side in ("left", "right"):
            v = next(it, None)
            if v is not None:
                setattr(node, side, TreeNode(v))
                q.append(getattr(node, side))
    return root
from itertools import groupby

def vertical_traversal(root):
    cells = []
    stack = [(root, 0, 0)] if root else []
    while stack:
        node, row, col = stack.pop()
        cells.append((col, row, node.val))
        if node.left:
            stack.append((node.left, row + 1, col - 1))
        if node.right:
            stack.append((node.right, row + 1, col + 1))
    cells.sort()                                   # col, then row, then value
    return [[val for _, _, val in grp] for _, grp in groupby(cells, key=lambda c: c[0])]

print(vertical_traversal(build_tree([1, 2, 3, 4, 6, 5, 7])))
```
:::explain
The rules sound fiddly, but they're precisely **lexicographic order on `(col, row, val)`**, so one sort does all the work, and the traversal order no longer matters (here an iterative DFS). `groupby` then splits the sorted list into columns, since equal columns are adjacent. Turning a multi-rule ordering into a tuple key is a powerful general technique.
:::complexity
O(n log n).
:::end
