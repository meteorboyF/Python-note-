# Graphs

A **graph** is a set of **vertices** (nodes) connected by **edges**. Trees, grids, road maps, social networks, web links, dependency systems and neural-network computation graphs are all graphs. Learn to **represent** a graph, **traverse** it (BFS/DFS), and recognise the classic problems (shortest path, cycle detection, topological order, connected components, minimum spanning tree), and a huge class of problems becomes routine.

:::analogy A city map
Intersections are vertices and roads are edges. One-way streets make it **directed**. Road lengths make it **weighted**. "Can I get from A to B?" is reachability (BFS/DFS). "What's the fastest route?" is shortest path (Dijkstra). "Which roads should we pave so every intersection is connected at the minimum cost?" is a minimum spanning tree.
:::

## 1. Vocabulary

| Term | Meaning |
|---|---|
| directed / undirected | edges have a direction (`u → v`) or not |
| weighted | edges carry a cost |
| degree | the number of edges at a node (in-degree / out-degree for directed graphs) |
| path / cycle | a sequence of edges / a path that returns to its start |
| connected component | a maximal set of mutually reachable nodes |
| DAG | a Directed Acyclic Graph: directed, with no cycles |
| sparse / dense | E ≈ V vs E ≈ V² |

## 2. Representations

```python
from collections import defaultdict

edges = [("A", "B"), ("A", "C"), ("B", "D"), ("C", "D"), ("D", "E")]

adj = defaultdict(list)                 # adjacency LIST: best for sparse graphs
for u, v in edges:
    adj[u].append(v)
    adj[v].append(u)                    # undirected: add both directions
print(dict(adj))

nodes = sorted({n for e in edges for n in e})
idx = {n: i for i, n in enumerate(nodes)}
matrix = [[0] * len(nodes) for _ in nodes]   # adjacency MATRIX: O(1) edge checks, O(V^2) memory
for u, v in edges:
    matrix[idx[u]][idx[v]] = matrix[idx[v]][idx[u]] = 1
for n, row in zip(nodes, matrix):
    print(n, row)

weighted = {"A": {"B": 4, "C": 1}, "B": {"D": 1}, "C": {"B": 2, "D": 5}, "D": {}}   # dict of dicts
print(weighted["C"]["B"])
```

| | Adjacency list | Adjacency matrix | Edge list |
|---|---|---|---|
| Memory | O(V + E) | O(V²) | O(E) |
| Is (u, v) an edge? | O(deg u) (O(1) with sets) | **O(1)** | O(E) |
| Iterate neighbours | **O(deg u)** | O(V) | O(E) |
| Best for | most problems | dense graphs, Floyd–Warshall | Kruskal, Bellman–Ford |

:::tip Grids are graphs
A 2-D grid is an implicit graph: cell `(r, c)` has neighbours `(r±1, c)` and `(r, c±1)`. Don't build an adjacency list, just generate neighbours on the fly with a direction list.
:::

## 3. BFS and DFS

```python
from collections import deque

graph = {1: [2, 3], 2: [4], 3: [4, 5], 4: [6], 5: [6], 6: [], 7: [1]}

def bfs(start):
    order, seen, q = [], {start}, deque([start])
    dist = {start: 0}
    while q:
        u = q.popleft()
        order.append(u)
        for v in graph[u]:
            if v not in seen:
                seen.add(v)
                dist[v] = dist[u] + 1
                q.append(v)
    return order, dist

def dfs(u, seen=None, order=None):
    if seen is None:
        seen, order = set(), []
    seen.add(u)
    order.append(u)
    for v in graph[u]:
        if v not in seen:
            dfs(v, seen, order)
    return order

print(bfs(1))
print(dfs(1))
```

| | BFS | DFS |
|---|---|---|
| Structure | queue | stack / recursion |
| Explores | level by level | one branch to the end |
| Finds | **shortest path (unweighted)** | paths, cycles, topological order, components |
| Memory | the width of the graph | the depth of the graph |
| Cost | O(V + E) | O(V + E) |

## 4. Connected components & flood fill

```python
def count_islands(grid):
    R, C = len(grid), len(grid[0])
    seen = set()
    def sink(r, c):
        stack = [(r, c)]
        while stack:
            r, c = stack.pop()
            if (r, c) in seen or not (0 <= r < R and 0 <= c < C) or grid[r][c] != "1":
                continue
            seen.add((r, c))
            stack.extend([(r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)])
    count = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == "1" and (r, c) not in seen:
                count += 1
                sink(r, c)
    return count

print(count_islands(["11000",
                     "11000",
                     "00100",
                     "00011"]))
```

## 5. Cycle detection & topological sort

```python
from collections import deque

def topo_sort_kahn(n, prereqs):                 # edges: b -> a  ("b before a")
    graph = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in prereqs:
        graph[b].append(a)
        indeg[a] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return order if len(order) == n else None   # None => there's a cycle

print(topo_sort_kahn(4, [[1, 0], [2, 0], [3, 1], [3, 2]]))
print(topo_sort_kahn(2, [[0, 1], [1, 0]]))

def has_cycle_dfs(graph):                       # 3-colour DFS for directed graphs
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {u: WHITE for u in graph}
    def visit(u):
        color[u] = GRAY                         # on the current path
        for v in graph[u]:
            if color[v] == GRAY:                # a back edge -> cycle
                return True
            if color[v] == WHITE and visit(v):
                return True
        color[u] = BLACK                        # finished
        return False
    return any(color[u] == WHITE and visit(u) for u in graph)

print(has_cycle_dfs({"a": ["b"], "b": ["c"], "c": ["a"]}), has_cycle_dfs({"a": ["b"], "b": ["c"], "c": []}))
```

:::term Topological order
An ordering of a DAG's vertices where every edge `u → v` has `u` before `v`. Uses: build systems, course schedules, spreadsheet recalculation, task pipelines and package installs. It exists **if and only if** the graph has no directed cycle. Python ships one: `graphlib.TopologicalSorter`.
:::

## 6. Union-Find (disjoint set union)

```python
class DSU:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.components = n
    def find(self, x):
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]   # path halving
            x = self.parent[x]
        return x
    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False                                    # already connected: this edge forms a cycle
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra                                # union by rank
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        self.components -= 1
        return True

d = DSU(6)
for a, b in [(0, 1), (1, 2), (3, 4)]:
    d.union(a, b)
print(d.find(2) == d.find(0), d.find(3) == d.find(0), d.components, d.union(0, 2))
```

With **path compression** and **union by rank**, operations take O(α(n)) amortised, where α (the inverse Ackermann function) is ≤ 4 for any realistic n. Use DSU for dynamic connectivity, cycle detection in undirected graphs, Kruskal's MST, and grouping problems ("accounts merge", "number of provinces").

## 7. Shortest paths

```python
import heapq

def dijkstra(graph, src):                     # non-negative weights
    dist = {src: 0}
    prev = {}
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, w in graph[u].items():
            nd = d + w
            if nd < dist.get(v, float("inf")):
                dist[v], prev[v] = nd, u
                heapq.heappush(pq, (nd, v))
    return dist, prev

def path_to(prev, target):
    path = [target]
    while path[-1] in prev:
        path.append(prev[path[-1]])
    return path[::-1]

g = {"A": {"B": 4, "C": 1}, "B": {"D": 1}, "C": {"B": 2, "D": 5}, "D": {"E": 3}, "E": {}}
dist, prev = dijkstra(g, "A")
print(dist, path_to(prev, "E"))

def bellman_ford(n, edges, src):              # handles NEGATIVE weights, detects negative cycles
    dist = [float("inf")] * n
    dist[src] = 0
    for _ in range(n - 1):
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    if any(dist[u] + w < dist[v] for u, v, w in edges):
        raise ValueError("negative cycle")
    return dist

print(bellman_ford(4, [(0, 1, 4), (0, 2, 5), (1, 3, -3), (2, 1, -2)], 0))
```

| Algorithm | Weights | Cost | Notes |
|---|---|---|---|
| BFS | unweighted (or all equal) | O(V + E) | simplest |
| 0-1 BFS | weights 0/1 | O(V + E) | deque: 0-edges to the front |
| Dijkstra | **non-negative** | O((V + E) log V) | heap-based |
| Bellman–Ford | any, detects negative cycles | O(V·E) | |
| Floyd–Warshall | all pairs | O(V³) | DP over intermediate nodes |
| A* | non-negative + a heuristic | often much faster | Dijkstra + an admissible estimate |

## 8. Minimum spanning tree

```python
def kruskal(n, edges):
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    total, chosen = 0, []
    for w, u, v in sorted(edges):           # cheapest edges first
        ru, rv = find(u), find(v)
        if ru != rv:                        # skip edges that would form a cycle
            parent[ru] = rv
            total += w
            chosen.append((u, v, w))
    return total, chosen

edges = [(1, 0, 1), (4, 0, 2), (3, 1, 2), (2, 1, 3), (5, 2, 3)]
print(kruskal(4, edges))
```

## 9. Bipartite check (2-colouring)

```python
from collections import deque
def is_bipartite(graph):
    color = {}
    for s in graph:
        if s in color:
            continue
        color[s] = 0
        q = deque([s])
        while q:
            u = q.popleft()
            for v in graph[u]:
                if v not in color:
                    color[v] = 1 - color[u]
                    q.append(v)
                elif color[v] == color[u]:
                    return False
    return True

print(is_bipartite({0: [1, 3], 1: [0, 2], 2: [1, 3], 3: [0, 2]}), is_bipartite({0: [1, 2], 1: [0, 2], 2: [0, 1]}))
```

## 10. ML and the real world

- **Graph neural networks** aggregate neighbour features by message passing over adjacency lists. Neighbour sampling is BFS/DFS with fan-out limits.
- **Knowledge graphs** and recommendation systems ("people who bought X…") use BFS and random walks.
- **PageRank** is a power iteration over the web's link graph.
- Autograd computes gradients by walking the **computation DAG** in reverse topological order.

```python
links = {"A": ["B", "C"], "B": ["C"], "C": ["A"], "D": ["C"]}
nodes = list(links)
rank = {n: 1 / len(nodes) for n in nodes}
d = 0.85
for _ in range(50):
    new = {n: (1 - d) / len(nodes) for n in nodes}
    for u, outs in links.items():
        for v in outs:
            new[v] += d * rank[u] / len(outs)
    rank = new
print({n: round(r, 3) for n, r in sorted(rank.items(), key=lambda kv: -kv[1])})
```

## Tricks & tips

- Build an adjacency list with `defaultdict(list)` (or `defaultdict(set)` to dedupe edges).
- BFS: mark visited **when enqueuing**. DFS on huge graphs: use an explicit stack.
- Track `prev[v] = u` during BFS/Dijkstra to reconstruct paths.
- "Minimum number of steps" → BFS. "Minimum cost with weights" → Dijkstra. "Order with prerequisites" → topological sort. "Are these connected / merge groups" → DSU.
- Grid BFS: `for dr, dc in ((1,0),(-1,0),(0,1),(0,-1))`.
- `graphlib.TopologicalSorter` (stdlib) gives you topological order and cycle detection.

## The 10 most dangerous traps

| # | Trap | Fix |
|---|---|---|
| 1 | Forgetting the visited set → infinite loops | always track `seen` |
| 2 | Marking visited at pop time in BFS (duplicates) | mark at push time |
| 3 | Dijkstra with negative edges | Bellman–Ford |
| 4 | Undirected edges added in only one direction | add both |
| 5 | Recursion limit in DFS on long paths | iterative DFS |
| 6 | Undirected cycle check flagging the parent edge | skip the parent, or use DSU |
| 7 | Directed cycle detection using only a visited set | 3-colour (gray = on stack) |
| 8 | Missing isolated nodes | iterate over all nodes, not just edge endpoints |
| 9 | Processing stale heap entries in Dijkstra | `if d > dist[u]: continue` |
| 10 | Building an O(V²) matrix for sparse graphs | adjacency list |

## 🍪 Predict the output

Guess before you click. These are the exact traps interviewers use.

:::quiz
```python norun
from collections import deque
g = {"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []}
order, seen, q = [], {"A"}, deque(["A"])
while q:
    u = q.popleft(); order.append(u)
    for v in g[u]:
        if v not in seen:
            seen.add(v); q.append(v)
print(order)
```
What prints?
- [x] `['A', 'B', 'C', 'D']`
- [ ] `['A', 'B', 'D', 'C']`
- [ ] `['A', 'B', 'C', 'D', 'D']`
BFS visits level by level: A, then its neighbours B and C, then D. D appears only once because it's marked **seen when enqueued**. A DFS would give `A B D C`.
:::

:::quiz
Which algorithm fits "minimum number of moves" on an **unweighted** grid or graph?
- [x] BFS
- [ ] DFS
- [ ] Dijkstra is required
BFS explores in order of distance (in edges), so the first time it reaches the target is the shortest path. Dijkstra also works, but it's slower and needed only when the edges have **different** non-negative weights.
:::

:::quiz
```python norun
parent = list(range(5))
def find(x):
    while parent[x] != x:
        x = parent[x]
    return x
for a, b in [(0, 1), (1, 2), (3, 4)]:
    parent[find(a)] = find(b)
print(find(0) == find(2), find(0) == find(3), len({find(i) for i in range(5)}))
```
What prints?
- [x] `True False 2`
- [ ] `True True 1`
- [ ] `False False 3`
Union-Find merges sets via their roots. After the unions, {0, 1, 2} and {3, 4} are the two components: 0 and 2 share a root, 0 and 3 don't.
:::

## Practice problems

:::problem basic | Find if a path exists | BFS / DSU
Given an undirected graph with `n` nodes and an edge list, is there a path from `source` to `destination` (LeetCode 1971)? Solve it with BFS and with Union-Find.
:::solution
```python
from collections import defaultdict, deque

def valid_path_bfs(n, edges, s, t):
    adj = defaultdict(list)
    for a, b in edges:
        adj[a].append(b); adj[b].append(a)
    seen, q = {s}, deque([s])
    while q:
        u = q.popleft()
        if u == t:
            return True
        for v in adj[u]:
            if v not in seen:
                seen.add(v); q.append(v)
    return False

def valid_path_dsu(n, edges, s, t):
    parent = list(range(n))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]; x = parent[x]
        return x
    for a, b in edges:
        parent[find(a)] = find(b)
    return find(s) == find(t)

E = [[0, 1], [1, 2], [3, 4]]
print(valid_path_bfs(5, E, 0, 2), valid_path_bfs(5, E, 0, 4), valid_path_dsu(5, E, 0, 2), valid_path_dsu(5, E, 2, 3))
```
:::explain
BFS explores outward from the source. DSU merges the endpoints of every edge, so two nodes are connected exactly when they share a root. DSU shines when you have many connectivity queries on the same graph.
:::end

:::problem basic | Number of provinces | DFS on an adjacency matrix
`is_connected[i][j] == 1` means cities i and j are directly connected. Count the connected groups (LeetCode 547).
:::solution
```python
def provinces(m):
    n, seen, count = len(m), set(), 0
    def dfs(i):
        for j in range(n):
            if m[i][j] and j not in seen:
                seen.add(j); dfs(j)
    for i in range(n):
        if i not in seen:
            count += 1
            seen.add(i); dfs(i)
    return count

print(provinces([[1, 1, 0], [1, 1, 0], [0, 0, 1]]), provinces([[1, 0, 0], [0, 1, 0], [0, 0, 1]]))
```
:::explain
Each DFS started from an unvisited city floods its entire component, so the number of DFS starts equals the number of components. With a matrix, scanning neighbours costs O(n) per node, so O(n²) total, which matches the input size.
:::end

:::problem basic | Flood fill | grid DFS
Starting from `(sr, sc)`, recolour the connected region of the same colour (4-directional) to `new` (LeetCode 733).
:::solution
```python
def flood_fill(img, sr, sc, new):
    old = img[sr][sc]
    if old == new:
        return img                      # otherwise we'd loop forever
    R, C = len(img), len(img[0])
    stack = [(sr, sc)]
    while stack:
        r, c = stack.pop()
        if 0 <= r < R and 0 <= c < C and img[r][c] == old:
            img[r][c] = new             # recolouring doubles as the "visited" mark
            stack.extend([(r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)])
    return img

for row in flood_fill([[1, 1, 1], [1, 1, 0], [1, 0, 1]], 1, 1, 2):
    print(row)
```
:::explain
Changing the colour marks a cell as processed, so no separate `seen` set is needed. The `old == new` guard prevents an infinite loop, which is the classic trap in this problem.
:::end

:::problem medium | Course schedule order | topological sort
Given `n` courses and pairs `[a, b]` meaning "take b before a", return a valid order, or `[]` if impossible (LeetCode 210). Then verify the order.
:::solution
```python
from collections import deque

def find_order(n, prereqs):
    adj = [[] for _ in range(n)]
    indeg = [0] * n
    for a, b in prereqs:
        adj[b].append(a); indeg[a] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    order = []
    while q:
        u = q.popleft(); order.append(u)
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return order if len(order) == n else []

pre = [[1, 0], [2, 0], [3, 1], [3, 2], [4, 3]]
order = find_order(5, pre)
pos = {c: i for i, c in enumerate(order)}
print(order, all(pos[b] < pos[a] for a, b in pre), find_order(2, [[1, 0], [0, 1]]))
```
:::explain
**Kahn's algorithm**: repeatedly take a course with no remaining prerequisites (in-degree 0) and "complete" it, which lowers its dependents' in-degrees. If a cycle exists, its courses never reach in-degree 0, so `order` comes up short. The verification line checks every prerequisite appears earlier, which is a great habit for any algorithm with many valid answers.
:::end

:::problem medium | Clone a graph | BFS + hash map
Deep-copy a connected undirected graph given one node (LeetCode 133). Each node has `val` and `neighbors`.
:::solution
```python
from collections import deque

class Node:
    def __init__(self, val, neighbors=None):
        self.val, self.neighbors = val, neighbors or []

def clone(node):
    if node is None:
        return None
    copies = {node: Node(node.val)}
    q = deque([node])
    while q:
        u = q.popleft()
        for v in u.neighbors:
            if v not in copies:
                copies[v] = Node(v.val)
                q.append(v)
            copies[u].neighbors.append(copies[v])
    return copies[node]

a, b, c, d = Node(1), Node(2), Node(3), Node(4)
a.neighbors, b.neighbors, c.neighbors, d.neighbors = [b, d], [a, c], [b, d], [a, c]
ca = clone(a)
print(ca.val, [n.val for n in ca.neighbors], ca is not a, ca.neighbors[0].neighbors[0] is ca)
```
:::explain
The `copies` dict (original → clone) doubles as the visited set and lets cycles connect back to **already-created** clones. That's the same idea as `deepcopy`'s memo dict from Chapter 1. The last check confirms the cycle a→b→a was reproduced inside the copy.
:::end

:::problem medium | Word ladder | BFS over implicit graph
Return the length of the shortest transformation sequence from `begin` to `end`, changing one letter at a time, where every intermediate word is in the list (LeetCode 127).
:::solution
```python
from collections import deque, defaultdict

def ladder_length(begin, end, words):
    words = set(words)
    if end not in words:
        return 0
    buckets = defaultdict(list)            # "h*t" -> [hot, hit, ...]: generic patterns
    for w in words | {begin}:
        for i in range(len(w)):
            buckets[w[:i] + "*" + w[i + 1:]].append(w)
    q, seen = deque([(begin, 1)]), {begin}
    while q:
        w, d = q.popleft()
        if w == end:
            return d
        for i in range(len(w)):
            for nxt in buckets[w[:i] + "*" + w[i + 1:]]:
                if nxt not in seen:
                    seen.add(nxt); q.append((nxt, d + 1))
    return 0

print(ladder_length("hit", "cog", ["hot", "dot", "dog", "lot", "log", "cog"]),
      ladder_length("hit", "cog", ["hot", "dot", "dog", "lot", "log"]))
```
:::explain
Words are nodes, and words differing by one letter are edges. Instead of comparing all pairs (O(N²·L)), group words under **wildcard patterns** like `h*t`: any two words in the same bucket are neighbours. BFS gives the minimum number of steps, because every edge has weight 1.
:::end

:::problem hard | Network delay time | Dijkstra
Signals travel along weighted directed edges from node `k`. Return the time for all `n` nodes to receive the signal, or -1 if some can't (LeetCode 743).
:::solution
```python
import heapq
from collections import defaultdict

def network_delay(times, n, k):
    adj = defaultdict(list)
    for u, v, w in times:
        adj[u].append((v, w))
    dist = {}
    pq = [(0, k)]
    while pq:
        d, u = heapq.heappop(pq)
        if u in dist:
            continue                      # already settled with a shorter distance
        dist[u] = d
        for v, w in adj[u]:
            if v not in dist:
                heapq.heappush(pq, (d + w, v))
    return max(dist.values()) if len(dist) == n else -1

print(network_delay([[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2), network_delay([[1, 2, 1]], 2, 2))
```
:::explain
Dijkstra **settles** nodes in increasing order of distance: the first time a node is popped, its distance is final (that's why non-negative weights are required). The answer is the latest arrival time, i.e. the max over the settled distances, or -1 if some node was never reached. O(E log V).
:::end

:::problem hard | Redundant connection | Union-Find cycle detection
A tree with `n` nodes had one extra edge added. Return the edge that can be removed so the graph becomes a tree; if several qualify, return the last one in the input (LeetCode 684).
:::solution
```python
def redundant(edges):
    parent = list(range(len(edges) + 1))
    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra == rb:
            return [a, b]              # already connected: this edge closes a cycle
        parent[ra] = rb

print(redundant([[1, 2], [1, 3], [2, 3]]), redundant([[1, 2], [2, 3], [3, 4], [1, 4], [1, 5]]))
```
:::explain
Add the edges one at a time. An edge whose endpoints already share a DSU root would create a cycle, and that's the redundant edge. Processing in order automatically returns the **last** such edge in the cycle. Nearly O(E).
:::end

:::problem hard | Cheapest flights within K stops | Bellman-Ford with a limit
Find the cheapest price from `src` to `dst` using at most `k` stops (LeetCode 787). Dijkstra on cost alone fails, because a cheaper path with too many stops shouldn't block a pricier valid one.
:::solution
```python
def cheapest(n, flights, src, dst, k):
    INF = float("inf")
    cost = [INF] * n
    cost[src] = 0
    for _ in range(k + 1):                 # k stops = at most k+1 edges
        nxt = cost[:]                       # relax from LAST round's values only
        for u, v, p in flights:
            if cost[u] + p < nxt[v]:
                nxt[v] = cost[u] + p
        cost = nxt
    return cost[dst] if cost[dst] < INF else -1

flights = [[0, 1, 100], [1, 2, 100], [2, 3, 100], [0, 2, 500]]
print(cheapest(4, flights, 0, 3, 1), cheapest(4, flights, 0, 3, 2), cheapest(3, [[0, 1, 100], [1, 2, 100], [0, 2, 500]], 0, 2, 0))
```
:::explain
After round `i` of Bellman–Ford, `cost[v]` is the cheapest price using **at most i edges**, provided each round reads only the previous round's values (hence the `nxt = cost[:]` copy). Without the copy, a single round could chain several edges and break the stop limit. k+1 rounds cover k stops: O(k·E).
:::end

## ✍️ Write a program

Now write real code. Type your solution in the editor, press **▶ Run tests** (or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. Problems marked with a LeetCode number link to the original, so you can submit there too.

:::program basic | Find center of star graph | LeetCode 1791 | https://leetcode.com/problems/find-center-of-star-graph/
A star graph has one center connected to every other node. Given its edge list, return the center in O(1).
:::starter
```python norun
def find_center(edges):
    pass
```
:::tests
```python norun
assert find_center([[1, 2], [2, 3], [4, 2]]) == 2
assert find_center([[1, 2], [5, 1], [1, 3], [1, 4]]) == 1
assert find_center([[9, 7], [7, 3]]) == 7
```
:::solution
```python
def find_center(edges):
    (a, b), (c, d) = edges[0], edges[1]
    return a if a in (c, d) else b

print(find_center([[1, 2], [2, 3], [4, 2]]))
```
:::explain
The center appears in **every** edge, so it must be the node shared by the first two edges. Nested tuple unpacking reads both pairs at once. Thinking about the structure beats the generic "count degrees" approach, which would be O(n).
:::complexity
O(1).
:::end

:::program medium | Number of islands | LeetCode 200 | https://leetcode.com/problems/number-of-islands/
Count the islands (4-directionally connected groups of `"1"`s) in a grid. Use an iterative DFS or BFS, not recursion.
:::starter
```python norun
def num_islands(grid):
    pass
```
:::tests
```python norun
g1 = [list("11110"), list("11010"), list("11000"), list("00000")]
g2 = [list("11000"), list("11000"), list("00100"), list("00011")]
assert num_islands(g1) == 1 and num_islands(g2) == 3
assert num_islands([["0"]]) == 0 and num_islands([["1"]]) == 1
big = [["1"] * 200 for _ in range(200)]
assert num_islands(big) == 1
```
:::hint
Scan every cell. On an unvisited `"1"`, count a new island and **flood** it: mark every connected land cell as visited using an explicit stack.
:::solution
```python
def num_islands(grid):
    R, C = len(grid), len(grid[0])
    seen = set()
    count = 0
    for r in range(R):
        for c in range(C):
            if grid[r][c] == "1" and (r, c) not in seen:
                count += 1
                stack = [(r, c)]
                seen.add((r, c))
                while stack:
                    i, j = stack.pop()
                    for ni, nj in ((i + 1, j), (i - 1, j), (i, j + 1), (i, j - 1)):
                        if 0 <= ni < R and 0 <= nj < C and grid[ni][nj] == "1" and (ni, nj) not in seen:
                            seen.add((ni, nj))
                            stack.append((ni, nj))
    return count

print(num_islands([list("11000"), list("11000"), list("00100"), list("00011")]))
```
:::explain
A grid is an **implicit graph**: cells are nodes, and land neighbours are edges. Each flood fill explores one **connected component**, so the number of fills is the number of islands. The explicit stack avoids `RecursionError` on the 40,000-cell island in the tests, and marking cells seen when **pushed** prevents duplicates.
:::complexity
O(R·C).
:::end

:::program medium | Course schedule | LeetCode 207 | https://leetcode.com/problems/course-schedule/
`prerequisites[i] = [a, b]` means you must take `b` before `a`. Can you finish all `num_courses` courses? This is cycle detection in a directed graph.
:::starter
```python norun
def can_finish(num_courses, prerequisites):
    pass
```
:::tests
```python norun
assert can_finish(2, [[1, 0]]) is True
assert can_finish(2, [[1, 0], [0, 1]]) is False
assert can_finish(5, [[1, 0], [2, 1], [3, 2], [4, 3]]) is True
assert can_finish(3, [[0, 1], [1, 2], [2, 0]]) is False
assert can_finish(4, []) is True
```
:::solution
```python
from collections import deque

def can_finish(num_courses, prerequisites):
    adj = [[] for _ in range(num_courses)]
    indeg = [0] * num_courses
    for a, b in prerequisites:
        adj[b].append(a)
        indeg[a] += 1
    q = deque(i for i in range(num_courses) if indeg[i] == 0)
    taken = 0
    while q:
        u = q.popleft()
        taken += 1
        for v in adj[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                q.append(v)
    return taken == num_courses

print(can_finish(2, [[1, 0]]), can_finish(2, [[1, 0], [0, 1]]))
```
:::explain
**Kahn's algorithm**: repeatedly take a course with no remaining prerequisites (in-degree 0), then "complete" it by decrementing its dependents. If a cycle exists, the courses in it never reach in-degree 0, so `taken` comes up short. It's the same algorithm that produces a topological order (LeetCode 210).
:::trace
`3, [[0,1],[1,2],[2,0]]`:
| step | in-degrees | queue | taken |
|---|---|---|---|
| start | [1, 1, 1] | empty | 0 → **False** (every course waits on another) |
:::complexity
O(V + E).
:::end

:::program hard | Swim in rising water | LeetCode 778 | https://leetcode.com/problems/swim-in-rising-water/
`grid[r][c]` is an elevation. At time `t` you can swim through cells with elevation ≤ t. Return the minimum `t` needed to get from the top-left to the bottom-right corner.
:::starter
```python norun
import heapq

def swim_in_water(grid):
    pass
```
:::tests
```python norun
assert swim_in_water([[0, 2], [1, 3]]) == 3
assert swim_in_water([[0, 1, 2, 3, 4], [24, 23, 22, 21, 5], [12, 13, 14, 15, 16], [11, 17, 18, 19, 20], [10, 9, 8, 7, 6]]) == 16
assert swim_in_water([[0]]) == 0
assert swim_in_water([[3, 2], [0, 1]]) == 3
```
:::hint
The cost of a path is the **maximum** elevation on it, and we want to minimise that. Run Dijkstra where the "distance" is `max(current, grid[nr][nc])` instead of a sum.
:::solution
```python
import heapq

def swim_in_water(grid):
    n = len(grid)
    heap = [(grid[0][0], 0, 0)]               # (highest elevation so far, r, c)
    seen = {(0, 0)}
    while heap:
        t, r, c = heapq.heappop(heap)
        if (r, c) == (n - 1, n - 1):
            return t
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < n and 0 <= nc < n and (nr, nc) not in seen:
                seen.add((nr, nc))
                heapq.heappush(heap, (max(t, grid[nr][nc]), nr, nc))

print(swim_in_water([[0, 1, 2, 3, 4], [24, 23, 22, 21, 5], [12, 13, 14, 15, 16], [11, 17, 18, 19, 20], [10, 9, 8, 7, 6]]))
```
:::explain
This is Dijkstra with a different path cost: the **bottleneck** (the maximum along the path) instead of the sum. Dijkstra still works because the cost never decreases as a path extends (`max` is monotonic), so the first time we pop the target, its value is optimal. Union-Find and binary search on t are valid alternatives, and recognising the "minimise the maximum" shape is the real skill.
:::complexity
O(n² log n).
:::end
