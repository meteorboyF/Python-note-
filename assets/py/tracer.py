# PyNotes tracer — runs inside Pyodide (in a Web Worker).
# Executes user code under sys.settrace and records one "step" per event:
# the line, every user frame's variables, and a snapshot of the objects
# those variables point at (the heap), so the UI can draw names -> objects.
import sys, io, json, types, builtins, inspect, base64

MAX_STEPS = 1200
MAX_HEAP = 160
MAX_ITEMS = 40
FILENAME = "<code>"
HIDDEN = {"__name__", "__builtins__", "__doc__", "__loader__", "__spec__", "__package__", "__annotations__", "__file__", "__cached__", "__conditional_annotations__", "__annotate__"}


class _StopTrace(BaseException):
    pass


class _Out(io.TextIOBase):
    def __init__(self):
        self.parts = []
        self.size = 0

    def write(self, s):
        self.parts.append(s)
        self.size += len(s)
        return len(s)

    def text(self):
        return "".join(self.parts)


def _short(r, n=120):
    return r if len(r) <= n else r[: n - 1] + "…"


class Tracer:
    def __init__(self, out):
        self.out = out
        self.steps = []
        self.ids = {}
        self.keep = []  # keep objects alive so id() is never reused mid-run
        self.truncated = False
        self.cur = {}   # id(frame) -> index of the step of the line it is executing
        self.snaps = []         # small PNGs of the current figure, whenever it changed
        self._last_snap = None
        self.snap_figs = False
        self.ev_total = 0

    # ---------- matplotlib: how the figure looks at this step ----------
    def snap(self, step):
        plt = sys.modules.get("matplotlib.pyplot")
        if plt is None or len(self.snaps) >= MAX_SNAPS:
            return
        try:
            from matplotlib._pylab_helpers import Gcf
            mans = Gcf.get_all_fig_managers()
            if not mans:
                return
            fig = mans[-1].canvas.figure          # the newest figure, without changing plt.gcf()
            buf = io.BytesIO()
            fig.savefig(buf, format="png", dpi=SNAP_DPI)
            data = buf.getvalue()
        except Exception:
            return
        if data != self._last_snap:
            self._last_snap = data
            self.snaps.append(base64.b64encode(data).decode())
        step["fg"] = len(self.snaps) - 1

    # ---------- sub-expression values, reported by the instrumented code ----------
    def ev(self, i, v, sub=None):
        if self.ev_total >= EV_TOTAL:
            return
        k = self.cur.get(id(sys._getframe(2)))
        if k is None or k >= len(self.steps):
            return
        lst = self.steps[k].setdefault("ev", [])
        if len(lst) >= EV_PER_STEP:
            return
        old = sys.gettrace()
        sys.settrace(None)          # formatting values must not create steps (user __repr__)
        try:
            rec = [i, _brief(v)]
            if sub is not None:
                sel = _sel(*sub)
                if sel:
                    rec.append(sel)
        finally:
            sys.settrace(old)
        lst.append(rec)
        self.ev_total += 1

    # ---------- value encoding ----------
    def hid(self, v):
        k = id(v)
        if k not in self.ids:
            self.ids[k] = len(self.ids) + 1
            self.keep.append(v)
        return self.ids[k]

    def enc(self, v, heap):
        t = type(v)
        if v is None or t in (bool, int, float, complex):
            return ["P", _short(repr(v))]
        if t is str:
            return ["P", _short(repr(v), 80)]
        if isinstance(v, types.ModuleType):
            return ["P", f"<module {v.__name__}>"]
        h = self.hid(v)
        if h not in heap:
            if len(heap) >= MAX_HEAP:
                return ["P", "…"]
            heap[h] = None  # reserve (handles cycles)
            heap[h] = self.build(v, heap)
        return ["R", h]

    def build(self, v, heap):
        t = type(v)
        c = t.__name__
        mod = getattr(t, "__module__", "") or ""
        try:
            if mod.startswith("numpy") and c == "ndarray" and v.ndim in (1, 2) and v.size <= 240:
                rows = v.reshape(1, -1) if v.ndim == 1 else v
                cells = [[_short(repr(x.item()) if hasattr(x, "item") else repr(x), 12) for x in r] for r in rows]
                return {"t": "grid", "c": f"ndarray shape={tuple(v.shape)} dtype={v.dtype}", "v": cells, "d": v.ndim}
            if mod.startswith("pandas") and c in ("DataFrame", "Series") and len(v) <= 14:
                df = v.to_frame() if c == "Series" else v
                if df.shape[1] <= 8:
                    return {"t": "table", "c": f"{c} shape={tuple(v.shape)}",
                            "cols": [_short(str(x), 14) for x in df.columns],
                            "idx": [_short(str(x), 14) for x in df.index],
                            "rows": [[_short(str(x), 14) for x in row] for row in df.itertuples(index=False)]}
            if mod.startswith(("numpy", "pandas", "matplotlib")):
                head = c
                shape = getattr(v, "shape", None)
                if shape is not None:
                    head += f" shape={tuple(shape)}"
                dt = getattr(v, "dtype", None)
                if dt is not None and not mod.startswith("pandas.core.frame"):
                    head += f" dtype={dt}"
                return {"t": "repr", "c": head, "s": _short(repr(v), 1800)}
            if isinstance(v, tuple) and hasattr(t, "_fields"):
                return {"t": "obj", "c": c, "v": [[f, self.enc(getattr(v, f), heap)] for f in t._fields]}
            if isinstance(v, (list, tuple)) or c == "deque":
                items = list(v)
                kind = "tuple" if isinstance(v, tuple) else "list"
                return {"t": kind, "c": c, "v": [self.enc(x, heap) for x in items[:MAX_ITEMS]], "more": max(0, len(items) - MAX_ITEMS)}
            if isinstance(v, (set, frozenset)):
                items = list(v)
                return {"t": "set", "c": c, "v": [self.enc(x, heap) for x in items[:MAX_ITEMS]], "more": max(0, len(items) - MAX_ITEMS)}
            if isinstance(v, dict):
                items = list(v.items())
                return {"t": "dict", "c": c, "v": [[self.enc(k, heap), self.enc(x, heap)] for k, x in items[:MAX_ITEMS]], "more": max(0, len(items) - MAX_ITEMS)}
            if isinstance(v, (range, bytes, bytearray)):
                return {"t": "repr", "c": c, "s": _short(repr(v), 300)}
            if isinstance(v, (types.FunctionType, types.BuiltinFunctionType, types.MethodType)):
                name = getattr(v, "__qualname__", getattr(v, "__name__", "?"))
                try:
                    sig = str(inspect.signature(v))
                except Exception:
                    sig = "(…)"
                if name == "<lambda>":
                    name = "λ"
                return {"t": "func", "c": "function", "s": f"{name}{sig}"}
            if isinstance(v, type):
                attrs = []
                for k, x in v.__dict__.items():
                    if k.startswith("__") and k.endswith("__"):
                        continue
                    if isinstance(x, (types.FunctionType, staticmethod, classmethod, property)):
                        kind = {staticmethod: "static", classmethod: "classmethod", property: "property"}.get(type(x), "method")
                        attrs.append([k, ["P", f"ƒ {kind}"]])
                    else:
                        attrs.append([k, self.enc(x, heap)])
                bases = ", ".join(b.__name__ for b in v.__bases__ if b is not object)
                return {"t": "obj", "c": f"class {v.__name__}" + (f"({bases})" if bases else ""), "v": attrs, "cls": True}
            if isinstance(v, types.GeneratorType):
                fr = v.gi_frame
                where = f" paused at line {fr.f_lineno}" if fr is not None else " (finished)"
                return {"t": "repr", "c": "generator", "s": f"{v.__name__}(){where}"}
            if isinstance(v, BaseException):
                return {"t": "repr", "c": c, "s": _short(repr(v), 300)}
            if mod == "__main__":
                attrs = []
                d = getattr(v, "__dict__", None)
                if d is not None:
                    attrs = [[k, self.enc(x, heap)] for k, x in list(d.items())[:MAX_ITEMS]]
                else:
                    for s in getattr(t, "__slots__", ()):
                        if hasattr(v, s):
                            attrs.append([s, self.enc(getattr(v, s), heap)])
                return {"t": "obj", "c": c, "v": attrs}
            return {"t": "repr", "c": c, "s": _short(repr(v), 600)}
        except Exception as e:  # never let a weird repr break tracing
            return {"t": "repr", "c": c, "s": f"<{c}>"}

    # ---------- frames ----------
    def frame_vars(self, fr, heap, is_module):
        src = fr.f_globals if is_module else fr.f_locals
        out = []
        for k, v in list(src.items()):
            if k in HIDDEN or k.startswith(".") or k.startswith("_pn_") or (k.startswith("__") and k.endswith("__")):
                continue
            if is_module:
                if isinstance(v, types.ModuleType):
                    continue
                if isinstance(v, (type, types.FunctionType, types.BuiltinFunctionType)) and getattr(v, "__module__", "__main__") != "__main__":
                    continue
            out.append([k, self.enc(v, heap)])
        return out

    def record(self, frame, event, arg):
        if len(self.steps) >= MAX_STEPS:
            self.truncated = True
            raise _StopTrace()
        chain = []
        f = frame
        while f is not None:
            if f.f_code.co_filename == FILENAME:
                chain.append(f)
            f = f.f_back
        chain.reverse()
        heap = {}
        frames = []
        for fr in chain:
            is_mod = fr.f_code.co_name == "<module>"
            name = "Global frame" if is_mod else fr.f_code.co_qualname if hasattr(fr.f_code, "co_qualname") else fr.f_code.co_name
            fd = {"n": name, "v": self.frame_vars(fr, heap, is_mod), "id": self.hid(fr)}
            if not is_mod and not (fr.f_code.co_flags & inspect.CO_NEWLOCALS):
                fd["k"] = "class"   # a class body, not a function call
            frames.append(fd)
        step = {"l": frame.f_lineno, "e": event, "f": frames, "h": heap, "o": self.out.size}
        if event == "return" and frame.f_code.co_name != "<module>":
            step["r"] = self.enc(arg, heap)
        if event == "exception":
            et, ev, _ = arg
            step["x"] = f"{et.__name__}: {ev}"
        self.steps.append(step)
        if self.snap_figs:
            self.snap(step)
        if event == "line":
            self.cur[id(frame)] = len(self.steps) - 1

    def global_trace(self, frame, event, arg):
        if frame.f_code.co_filename != FILENAME:
            return None
        if event == "call" and frame.f_code.co_name != "<module>":
            self.record(frame, "call", arg)
        return self.local_trace

    def local_trace(self, frame, event, arg):
        if event in ("line", "return", "exception"):
            self.record(frame, event, arg)
        return self.local_trace


# =====================================================================
#  Expression-level explanations
#  The user's code is rewritten (AST) so every interesting sub-expression
#  reports its value as it is evaluated: x[i] -> _pn_sub(id, x, i),
#  f(a) -> _pn_ev(id, f(a)), a + b -> _pn_ev(id, a + b) ...
#  Each report is attached to the step of the line being executed, so the
#  UI can show "how Python evaluates this line", piece by piece, and draw
#  which cells an index/slice selected.
# =====================================================================
import ast

EV_PER_STEP = 16
MAX_SNAPS = 60
SNAP_DPI = 60
EV_TOTAL = 3000

OPS = {
    ast.Add: "+ adds numbers, or joins two sequences (str/list/tuple)",
    ast.Sub: "- subtracts (for sets: difference)",
    ast.Mult: "* multiplies, or repeats a sequence (\"ab\" * 3)",
    ast.Div: "/ true division: the result is ALWAYS a float",
    ast.FloorDiv: "// floor division: divides, then rounds DOWN (toward −∞)",
    ast.Mod: "% remainder after division (sign follows the divisor)",
    ast.Pow: "** raises to a power",
    ast.MatMult: "@ matrix multiplication",
    ast.BitAnd: "& bitwise AND; for sets: intersection; for NumPy/pandas masks: element-wise AND",
    ast.BitOr: "| bitwise OR; for sets: union; for dicts: merge; for masks: element-wise OR",
    ast.BitXor: "^ bitwise XOR; for sets: symmetric difference",
    ast.LShift: "<< shifts bits left (×2 per step)",
    ast.RShift: ">> shifts bits right (÷2 per step, rounding down)",
}
CMPS = {
    ast.Eq: "== same VALUE?", ast.NotEq: "!= different value?", ast.Lt: "< less than?", ast.LtE: "<= at most?",
    ast.Gt: "> greater than?", ast.GtE: ">= at least?", ast.Is: "is: the very SAME object? (use it for None)",
    ast.IsNot: "is not: a different object?", ast.In: "in: membership test (O(1) for set/dict, O(n) for list)",
    ast.NotIn: "not in: is it missing?",
}
KNOWN = {
    "print": "writes its arguments (converted with str()) separated by spaces, then a newline",
    "len": "number of items", "range": "a lazy sequence of integers: range(start, stop, step), stop excluded",
    "sorted": "returns a NEW sorted list (the original is untouched)", "reversed": "a reverse iterator",
    "enumerate": "pairs every item with its index: (0, a), (1, b), …", "zip": "walks several iterables in lock-step, making tuples",
    "sum": "adds up all items", "min": "smallest item", "max": "largest item", "abs": "absolute value",
    "round": "rounds (to even on .5 ties)", "int": "converts to an integer (truncates floats)", "float": "converts to a float",
    "str": "converts to a string", "repr": "the developer-facing representation", "bool": "truthiness of a value",
    "list": "builds a new list from an iterable", "tuple": "builds a tuple", "set": "builds a set (unique items, no order)",
    "dict": "builds a dictionary", "frozenset": "an immutable set", "type": "the object's class",
    "isinstance": "is the object an instance of that class (or a subclass)?", "id": "the object's identity (address-like number)",
    "map": "lazily applies a function to every item", "filter": "lazily keeps the items for which the function is truthy",
    "any": "True if at least one item is truthy (stops early)", "all": "True if every item is truthy (stops early)",
    "input": "reads a line typed by the user (always a str)", "open": "opens a file and returns a file object",
    "iter": "gets an iterator from an iterable", "next": "takes the next item from an iterator", "divmod": "(quotient, remainder) in one go",
    "pow": "power, optionally modulo", "chr": "code point → character", "ord": "character → code point", "hash": "the object's hash",
    "getattr": "reads an attribute by name", "setattr": "sets an attribute by name", "hasattr": "does the attribute exist?",
    "super": "the next class in the MRO, to call the parent's version", "callable": "can it be called?", "format": "formats a value",
    "append": "adds ONE item to the end of the list, in place (returns None)", "extend": "adds every item of an iterable, in place",
    "insert": "inserts at a position (O(n))", "pop": "removes and returns an item (last by default)", "remove": "deletes the first matching value",
    "index": "position of the first match (ValueError if missing)", "count": "how many times a value occurs", "sort": "sorts IN PLACE and returns None",
    "reverse": "reverses in place", "copy": "a shallow copy", "clear": "empties it in place",
    "split": "cuts a string into a list of pieces", "join": "glues an iterable of strings together using this string",
    "strip": "removes whitespace (or given chars) from both ends", "lstrip": "strips the left end", "rstrip": "strips the right end",
    "replace": "returns a copy with replacements", "upper": "UPPERCASE copy", "lower": "lowercase copy", "title": "Title Case copy",
    "startswith": "does it start with…?", "endswith": "does it end with…?", "find": "index of a substring, or −1",
    "isdigit": "all characters are digits?", "isalpha": "all letters?", "zfill": "pads with zeros on the left", "center": "centres in a width",
    "get": "dict lookup with a default instead of KeyError", "items": "the (key, value) pairs view", "keys": "the keys view", "values": "the values view",
    "setdefault": "get the key, inserting a default if missing", "update": "merges another mapping/iterable in place", "add": "adds an element to the set",
    "discard": "removes if present (no error)", "union": "all elements of both", "intersection": "common elements", "difference": "elements only in the first",
    "most_common": "the n most frequent (item, count) pairs", "appendleft": "adds to the left end in O(1)", "popleft": "removes from the left end in O(1)",
    "heappush": "pushes onto the heap, keeping the smallest at index 0", "heappop": "pops the smallest item",
    "bisect_left": "insertion point before equal items (binary search)", "bisect_right": "insertion point after equal items",
    "array": "creates a NumPy array from data", "arange": "evenly spaced numbers: arange(start, stop, step), stop excluded",
    "linspace": "n evenly spaced numbers between two ends (both included)", "zeros": "an array of zeros", "ones": "an array of ones",
    "reshape": "same data, new shape (a view when possible)", "where": "element-wise if/else: where(cond, a, b)",
    "mean": "average", "std": "standard deviation", "dot": "dot / matrix product", "argmax": "position of the largest value",
    "argmin": "position of the smallest value", "cumsum": "running total", "unique": "the distinct values", "transpose": "swaps the axes",
    "flatten": "a 1-D COPY", "ravel": "a 1-D view when possible", "astype": "converts the dtype (a copy)", "clip": "limits values to a range",
    "concatenate": "joins arrays along an axis", "stack": "stacks arrays along a NEW axis", "vstack": "stacks rows", "hstack": "stacks columns",
    "head": "the first n rows", "tail": "the last n rows", "groupby": "split rows into groups by key(s), to aggregate per group",
    "agg": "aggregate with one or more functions", "merge": "SQL-style join on key columns", "sort_values": "sorts rows by column values",
    "value_counts": "counts of each distinct value", "fillna": "fills missing values", "dropna": "drops rows with missing values",
    "assign": "returns a copy with new/changed columns", "apply": "calls a function on each row/column/element", "pivot_table": "summary table (rows × columns)",
    "melt": "wide → long", "pivot": "long → wide", "describe": "summary statistics", "isna": "True where values are missing",
    "plot": "draws lines", "scatter": "draws points", "bar": "draws bars", "hist": "draws a histogram", "subplots": "creates a figure and axes",
    "set_title": "sets the axes title", "set_xlabel": "labels the x-axis", "set_ylabel": "labels the y-axis", "legend": "shows the legend",
}


def _clip(s, n=60):
    s = str(s)
    return s if len(s) <= n else s[: n - 1] + "…"


def _ordinal(k):
    return {1: "", 2: "2nd", 3: "3rd"}.get(k, f"{k}th")


def _call_name(node):
    f = node.func
    if isinstance(f, ast.Name):
        return f.id, False
    if isinstance(f, ast.Attribute):
        return f.attr, True
    return None, False


def _node_doc(node, user_funcs):
    if isinstance(node, ast.BinOp):
        return OPS.get(type(node.op), "a binary operation")
    if isinstance(node, ast.Compare):
        d = "; ".join(CMPS.get(type(o), "comparison") for o in node.ops)
        return d + ("  (chained: a < b < c means a < b and b < c)" if len(node.ops) > 1 else "")
    if isinstance(node, ast.BoolOp):
        return ("and: gives the first FALSY operand (or the last one), stopping early" if isinstance(node.op, ast.And)
                else "or: gives the first TRUTHY operand (or the last one), stopping early")
    if isinstance(node, ast.UnaryOp):
        return {ast.Not: "not: flips truthiness → True/False", ast.USub: "unary minus: negates", ast.Invert: "~ bitwise NOT (−x − 1); flips a boolean mask"}.get(type(node.op), "unary operator")
    if isinstance(node, ast.IfExp):
        return "conditional expression: A if condition else B"
    if isinstance(node, ast.ListComp):
        return "list comprehension: loop (and filter), collecting results into a NEW list"
    if isinstance(node, ast.SetComp):
        return "set comprehension: like a list comprehension, but builds a set (duplicates vanish)"
    if isinstance(node, ast.DictComp):
        return "dict comprehension: builds a dict from key: value pairs"
    if isinstance(node, ast.Call):
        name, method = _call_name(node)
        if name in user_funcs:
            return f"calls your function {name}(): its body runs in a new frame"
        if name in KNOWN:
            return f"{'.' if method else ''}{name}(): {KNOWN[name]}"
        if name and name[:1].isupper():
            return f"{name}(…) creates a new object (calls the class: __new__ then __init__)"
        return f"calls {name or 'a function'}()" if not method else f".{name}(): a method call on the object before the dot"
    if isinstance(node, ast.Subscript):
        return "indexing / slicing: container[index]; in a slice start:stop:step, stop is EXCLUDED"
    return ""


class _Instrument(ast.NodeTransformer):
    WRAP = (ast.Call, ast.BinOp, ast.Compare, ast.BoolOp, ast.UnaryOp, ast.IfExp, ast.ListComp, ast.SetComp, ast.DictComp)

    def __init__(self, src):
        self.src = src
        self.table = []
        self.user_funcs = {n.name for n in ast.walk(ast.parse(src)) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))}

    def _reg(self, node, kind):
        seg = ast.get_source_segment(self.src, node) or ""
        if "\n" in seg:
            seg = seg.split("\n")[0] + " …"
        self.table.append({"l": node.lineno, "c": node.col_offset, "s": _clip(seg, 70), "k": kind, "d": _node_doc(node, self.user_funcs)})
        return len(self.table) - 1

    def _call(self, fn, args, like):
        return ast.copy_location(ast.Call(func=ast.Name(id=fn, ctx=ast.Load()), args=args, keywords=[]), like)

    # annotations and match patterns must stay untouched
    def visit_arg(self, node):
        return node

    def visit_FunctionDef(self, node):
        node.decorator_list = [self.visit(d) for d in node.decorator_list]
        node.args.defaults = [self.visit(d) for d in node.args.defaults]
        node.args.kw_defaults = [self.visit(d) if d is not None else None for d in node.args.kw_defaults]
        node.body = [self.visit(s) for s in node.body]
        return node

    visit_AsyncFunctionDef = visit_FunctionDef

    def visit_AnnAssign(self, node):
        if node.value is not None:
            node.value = self.visit(node.value)
        return node

    def visit_match_case(self, node):
        if node.guard is not None:
            node.guard = self.visit(node.guard)
        node.body = [self.visit(s) for s in node.body]
        return node

    def visit_JoinedStr(self, node):
        return self.generic_visit(node)

    def _slice(self, s):
        if isinstance(s, ast.Slice):
            parts = [self.visit(x) if x is not None else ast.Constant(None) for x in (s.lower, s.upper, s.step)]
            return ast.copy_location(ast.Call(func=ast.Name(id="_pn_slice", ctx=ast.Load()), args=parts, keywords=[]), s)
        if isinstance(s, ast.Tuple) and any(isinstance(e, ast.Slice) for e in s.elts):
            return ast.copy_location(ast.Tuple(elts=[self._slice(e) for e in s.elts], ctx=ast.Load()), s)
        return self.visit(s)

    def visit_Subscript(self, node):
        if not isinstance(node.ctx, ast.Load):
            return self.generic_visit(node)
        i = self._reg(node, "sub")
        value = self.visit(node.value)
        sl = self._slice(node.slice)
        return self._call("_pn_sub", [ast.Constant(i), value, sl], node)

    def generic_visit(self, node):
        if isinstance(node, ast.UnaryOp) and isinstance(node.operand, ast.Constant):
            return node                                   # -1 is just a literal
        if isinstance(node, self.WRAP):
            if isinstance(node, ast.Call):
                name, _ = _call_name(node)
                if name in ("print", "super", "locals", "globals", "vars"):
                    return super().generic_visit(node)
            i = self._reg(node, type(node).__name__)
            node = super().generic_visit(node)
            return self._call("_pn_ev", [ast.Constant(i), node], node)
        return super().generic_visit(node)


# ---- what did an index select? ------------------------------------------
def _axis_words(p, n, one, many):
    if isinstance(p, bool):
        return f"{one} {p}"
    if isinstance(p, int):
        return f"{one} {p}" + (f" (negative → counts from the end: {one} {p % n})" if p < 0 and n else "")
    if isinstance(p, slice):
        if p.start is None and p.stop is None and p.step in (None, 1):
            return f"ALL {many}"
        if p.start is None and p.stop is None and p.step > 1:
            return f"every {_ordinal(p.step)} of the {many} (0, {p.step}, {2 * p.step}, …)"
        st = "the start" if p.start is None else p.start
        if p.step is not None and p.step < 0:
            w = f"{many} from {'the end' if p.start is None else p.start} going BACKWARDS"
            w += "" if p.stop is None else f" down to (not including) {p.stop}"
            return w + (f", every {_ordinal(-p.step)}" if p.step < -1 else "")
        w = f"{many} from {st}" + (" to the end" if p.stop is None else f" up to (not including) {p.stop}")
        if p.step not in (None, 1):
            w += f", every {_ordinal(p.step)} one"
        return w
    try:
        lst = list(p)
        return f"{many} {lst} (a list of positions: FANCY indexing → copy)"
    except Exception:
        return f"{many} {p!r}"


def _why_numpy(idx, a, np):
    names = (("row", "rows"), ("column", "columns")) if a.ndim == 2 else (("element", "elements"),)
    if isinstance(idx, np.ndarray) and idx.dtype == bool:
        return f"boolean mask: keep the {int(idx.sum())} element(s) where the mask is True (result is a 1-D COPY)"
    parts = idx if isinstance(idx, tuple) else (idx,)
    if len(parts) == 2 and all(isinstance(p, (list, np.ndarray)) for p in parts):
        pairs = ", ".join(f"({r},{c})" for r, c in zip(np.ravel(parts[0]), np.ravel(parts[1])))
        return f"two position lists are PAIRED up: elements {pairs} (fancy indexing → copy)"
    words = [_axis_words(p, a.shape[k] if k < a.ndim else 0, *names[min(k, len(names) - 1)]) for k, p in enumerate(parts)]
    if len(parts) < a.ndim:
        words.append("all " + names[len(parts)][1])
    basic = all(isinstance(p, (int, slice)) and not isinstance(p, bool) for p in parts)
    view = all(isinstance(p, slice) for p in parts)
    ints = all(isinstance(p, int) and not isinstance(p, bool) for p in parts)
    tail = " → a single value" if ints and len(parts) == a.ndim else (" → a VIEW (shares memory with the original)" if basic else "")
    return ", ".join(words) + tail


def _sel(c, idx):
    t = type(c)
    mod = getattr(t, "__module__", "") or ""
    try:
        if mod.startswith("numpy") and t.__name__ == "ndarray" and c.ndim in (1, 2) and 0 < c.size <= 144:
            import numpy as np
            pick = np.ravel(np.arange(c.size).reshape(c.shape)[idx]).tolist()
            rows = c.reshape(1, -1) if c.ndim == 1 else c
            return {"k": "grid", "d": c.ndim, "cells": [[_clip(repr(x.item()) if hasattr(x, "item") else repr(x), 9) for x in r] for r in rows],
                    "pick": pick, "why": _why_numpy(idx, c, np)}
        if isinstance(c, (list, tuple, str, range)) and 0 < len(c) <= 40 and isinstance(idx, (int, slice)) and not isinstance(idx, bool):
            pos = list(range(len(c)))[idx]
            many = "characters" if isinstance(c, str) else "items"
            return {"k": "seq", "str": isinstance(c, str), "items": [(x if isinstance(c, str) else _clip(repr(x), 10)) for x in c],
                    "pick": pos if isinstance(pos, list) else [pos], "why": _axis_words(idx, len(c), "index", many)}
        if isinstance(c, dict) and 0 < len(c) <= 16:
            keys = list(c.keys())
            if idx in c:
                return {"k": "dict", "items": [_clip(repr(k), 14) for k in keys], "vals": [_clip(repr(c[k]), 14) for k in keys],
                        "pick": [keys.index(idx)], "why": f"looks up key {idx!r}: hashed, found directly (O(1)), no scanning"}
            return None
        if mod.startswith("pandas"):
            import numpy as np, pandas as pd
            via, obj = "[]", c
            if t.__name__ in ("_LocIndexer", "_iLocIndexer"):
                via, obj = c.name, c.obj
            if not isinstance(obj, (pd.DataFrame, pd.Series)) or len(obj) > 14:
                return None
            df = obj.to_frame() if isinstance(obj, pd.Series) else obj
            if df.shape[1] > 8:
                return None
            n, m = df.shape
            if isinstance(obj, pd.Series):
                P = pd.Series(np.arange(n), index=obj.index)
            else:
                P = pd.DataFrame(np.arange(n * m).reshape(n, m), index=df.index, columns=df.columns)
            r = (P if via == "[]" else getattr(P, via))[idx]
            pick = np.ravel(np.asarray(r)).tolist()
            if via == "iloc":
                why = "iloc selects by integer POSITION (slice stop excluded)"
            elif via == "loc":
                why = "loc selects by LABEL (a label slice INCLUDES its end)"
            elif isinstance(obj, pd.Series) and not isinstance(idx, (list, slice, pd.Series, np.ndarray)):
                why = f"on a Series, [{idx!r}] looks up the LABEL {idx!r} in the index"
            elif isinstance(idx, str):
                why = f"df['{idx}'] → the single column '{idx}' as a Series"
            elif isinstance(idx, list):
                why = f"a LIST of column names → a DataFrame with just those columns"
            elif isinstance(idx, (pd.Series, np.ndarray)) and getattr(idx, "dtype", None) == bool:
                why = f"boolean filtering: keep the {int(np.asarray(idx).sum())} row(s) where the condition is True"
            else:
                why = "selects by the [] rules"
            return {"k": "df", "cols": [_clip(str(x), 12) for x in df.columns], "idx": [_clip(str(x), 12) for x in df.index],
                    "rows": [[_clip(str(x), 12) for x in row] for row in df.itertuples(index=False)], "pick": pick, "why": why}
    except Exception:
        return None
    return None


def _brief(v):
    t = type(v)
    mod = getattr(t, "__module__", "") or ""
    try:
        if mod.startswith("numpy") and t.__name__ == "ndarray" and v.ndim in (1, 2) and 0 < v.size <= 60:
            rows = v.reshape(1, -1) if v.ndim == 1 else v
            return ["g", [[_clip(repr(x.item()) if hasattr(x, "item") else repr(x), 9) for x in r] for r in rows], v.ndim]
        if mod.startswith("numpy") and hasattr(v, "item") and getattr(v, "ndim", 1) == 0:
            return ["r", _clip(repr(v.item()), 90), t.__name__]      # np.int64(7) -> 7
        if mod.startswith("pandas"):
            return ["p", _clip(str(v), 600), t.__name__]
        if isinstance(v, (types.FunctionType, types.BuiltinFunctionType, types.MethodType)):
            return ["r", f"<function {getattr(v, '__qualname__', '?')}>", "function"]
        if isinstance(v, types.GeneratorType):
            return ["r", "<generator object>", "generator"]
        return ["r", _clip(repr(v), 90), t.__name__]
    except Exception:
        return ["r", f"<{t.__name__}>", t.__name__]


# ---- statement-level syntax notes, per line -------------------------------
def _stmt_notes(tree, src):
    notes = {}

    def add(line, text):
        notes.setdefault(line, [])
        if text not in notes[line]:
            notes[line].append(text)

    for n in ast.walk(tree):
        if not isinstance(n, ast.stmt) and not isinstance(n, (ast.Lambda, ast.NamedExpr, ast.JoinedStr, ast.GeneratorExp, ast.Starred)):
            continue
        L = n.lineno
        if isinstance(n, ast.Assign):
            if any(isinstance(t, (ast.Tuple, ast.List)) for t in n.targets):
                tgt = n.targets[0]
                if isinstance(n.value, ast.Tuple) and isinstance(tgt, ast.Tuple) and len(tgt.elts) == 2 and \
                        [ast.dump(e) for e in tgt.elts] == [ast.dump(e) for e in reversed(n.value.elts)]:
                    add(L, "Swap: the right side becomes a tuple FIRST, then it is unpacked into the names, so no temp variable is needed.")
                else:
                    add(L, "Unpacking: the right side is evaluated first, then split item by item into the names on the left.")
            elif any(isinstance(t, ast.Subscript) for t in n.targets):
                add(L, "Item assignment: container[index] = value changes the container IN PLACE (every name pointing at it sees the change).")
            elif any(isinstance(t, ast.Attribute) for t in n.targets):
                add(L, "Attribute assignment: obj.attr = value stores the value on that object (self.x creates an instance attribute).")
            else:
                add(L, "Assignment: evaluate the right side, then make the name POINT to that object. Nothing is copied.")
            if len(n.targets) > 1:
                add(L, "Chained assignment: every name on the left points to the SAME object.")
        elif isinstance(n, ast.AugAssign):
            add(L, f"Augmented assignment: x {OPS.get(type(n.op), '?').split()[0]}= y works like x = x {OPS.get(type(n.op), '?').split()[0]} y. For a list, += extends it IN PLACE.")
        elif isinstance(n, ast.AnnAssign):
            add(L, "Annotated assignment: the type hint is documentation for tools; Python does not enforce it.")
        elif isinstance(n, (ast.For, ast.AsyncFor)):
            it = n.iter
            extra = ""
            if isinstance(it, ast.Call) and isinstance(it.func, ast.Name):
                extra = {"range": " range(...) produces the integers one by one (stop excluded).",
                         "enumerate": " enumerate(...) gives (index, item) pairs, unpacked into the two names.",
                         "zip": " zip(...) walks several iterables together and stops at the shortest.",
                         "reversed": " reversed(...) walks backwards without copying."}.get(it.func.id, "")
            if isinstance(it, ast.Call) and isinstance(it.func, ast.Attribute) and it.func.attr == "items":
                extra = " .items() gives (key, value) pairs."
            add(L, f"for loop: asks the iterable for the next item, binds it to the loop variable, runs the body, repeats until it runs out.{extra}")
            if n.orelse:
                add(L, "for … else: the else block runs only if the loop was NOT stopped by break.")
        elif isinstance(n, ast.While):
            add(L, "while loop: checks the condition before EVERY pass; the body must eventually make it False (or break).")
        elif isinstance(n, ast.If):
            add(L, "if: runs the indented block only when the condition is truthy (0, '', [], None, False are falsy). elif/else are tried in order; the first match wins.")
        elif isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
            a = n.args
            bits = []
            if a.defaults or a.kw_defaults:
                bits.append("default values are evaluated ONCE, when def runs (never use a mutable default like [])")
            if a.vararg:
                bits.append(f"*{a.vararg.arg} collects extra positional arguments into a tuple")
            if a.kwarg:
                bits.append(f"**{a.kwarg.arg} collects extra keyword arguments into a dict")
            if a.kwonlyargs:
                bits.append("parameters after * are keyword-only")
            if n.decorator_list:
                bits.append("@decorator: the finished function is passed to the decorator and the NAME is rebound to its result")
            if any(isinstance(x, (ast.Yield, ast.YieldFrom)) for x in ast.walk(n)):
                bits.append("it contains yield, so calling it returns a GENERATOR instead of running the body")
            add(n.lineno, f"def creates a function object named {n.name}; the body runs only when it's called." + (" " + "; ".join(bits) + "." if bits else ""))
        elif isinstance(n, ast.ClassDef):
            bases = ", ".join(ast.get_source_segment(src, b) or "?" for b in n.bases)
            add(L, f"class {n.name}: runs the body once to collect methods and class attributes" + (f"; inherits from {bases} (looked up via the MRO)." if bases else "."))
        elif isinstance(n, ast.Return):
            add(L, "return: ends the function now and hands this value back to the caller (no return → None).")
        elif isinstance(n, (ast.Import, ast.ImportFrom)):
            add(L, "import: loads the module once (cached in sys.modules) and binds a name to it." + (" 'as' just picks a shorter name." if any(x.asname for x in n.names) else ""))
        elif isinstance(n, ast.With):
            add(L, "with: calls __enter__, runs the block, and GUARANTEES __exit__ (closing files, releasing locks) even on errors.")
        elif isinstance(n, ast.Try):
            add(L, "try: run the block; if an exception is raised, jump to the first matching except. else runs if nothing failed; finally ALWAYS runs.")
        elif isinstance(n, ast.Raise):
            add(L, "raise: throws an exception; Python unwinds frames until an except catches it.")
        elif isinstance(n, ast.Assert):
            add(L, "assert: if the condition is False, raise AssertionError. Used for checks and tests.")
        elif isinstance(n, ast.Delete):
            add(L, "del removes the NAME (or the item). The object itself survives if anything else still refers to it.")
        elif isinstance(n, (ast.Global, ast.Nonlocal)):
            add(L, f"{type(n).__name__.lower()}: assignments to these names go to the {'module' if isinstance(n, ast.Global) else 'enclosing function'} instead of creating locals.")
        elif isinstance(n, ast.Lambda):
            add(L, "lambda: a tiny anonymous function made of ONE expression.")
        elif isinstance(n, ast.NamedExpr):
            add(L, "walrus := assigns AND returns the value, inside an expression.")
        elif isinstance(n, ast.JoinedStr):
            add(L, "f-string: each {expression} is evaluated and formatted; {x:.2f} applies a format spec, {x!r} uses repr.")
        elif isinstance(n, ast.GeneratorExp):
            add(L, "generator expression: like a list comprehension in ( ), but produces items lazily, one at a time.")
        elif isinstance(n, ast.Starred):
            add(L, "* unpacking: spreads the items of an iterable (or collects 'the rest' on the left of =).")
        elif isinstance(n, (ast.Break,)):
            add(L, "break: leave the innermost loop immediately.")
        elif isinstance(n, (ast.Continue,)):
            add(L, "continue: skip the rest of this pass and go to the next iteration.")
        elif isinstance(n, ast.Expr) and isinstance(n.value, ast.Call) and isinstance(n.value.func, ast.Name) and n.value.func.id == "print":
            add(L, "print(...): first EVERY argument is evaluated, left to right; then they are converted with str() and written separated by spaces" + (", with the given sep/end." if n.value.keywords else ", ending with a newline."))
        elif isinstance(n, ast.Match):
            add(L, "match: compares the value against each case pattern in order; the first matching case runs.")
    for n in ast.walk(tree):
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Module)) and n.body and \
                isinstance(n.body[0], ast.Expr) and isinstance(getattr(n.body[0], "value", None), ast.Constant) and isinstance(n.body[0].value.value, str):
            what = "module" if isinstance(n, ast.Module) else ("class" if isinstance(n, ast.ClassDef) else "function")
            add(n.body[0].lineno, f"Docstring: a string as the FIRST statement of a {what} becomes its __doc__ (shown by help()). It's documentation, so it doesn't get a step of its own.")
    for n in ast.walk(tree):
        if isinstance(n, ast.Subscript) and isinstance(n.slice, (ast.Slice, ast.Tuple)):
            add(n.lineno, "Slicing start:stop:step: start is included, stop is EXCLUDED, a missing part means 'from the start' / 'to the end', a negative step walks backwards.")
            break
    return {str(k): v for k, v in notes.items()}


def instrument(code):
    """Return (compiled code, expression table, per-line syntax notes)."""
    tree = ast.parse(code, FILENAME)
    notes = _stmt_notes(tree, code)
    ins = _Instrument(code)
    new = ast.fix_missing_locations(ins.visit(tree))
    return compile(new, FILENAME, "exec"), ins.table, notes


def _figures():
    mpl = sys.modules.get("matplotlib.pyplot")
    if mpl is None:
        return []
    imgs = []
    for num in mpl.get_fignums():
        fig = mpl.figure(num)
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=96, bbox_inches="tight")
        imgs.append(base64.b64encode(buf.getvalue()).decode())
    mpl.close("all")
    return imgs


def _err_text(e):
    tb = e.__traceback__
    line = None
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == FILENAME:
            line = tb.tb_lineno
        tb = tb.tb_next
    return f"{type(e).__name__}: {e}", line


def run_user(code, mode="trace", stdin=""):
    out = _Out()
    inputs = iter(stdin.split("\n") if stdin else [])     # "a\n" = 'a' then an empty line

    def fake_input(prompt=""):
        out.write(str(prompt))
        try:
            val = next(inputs)
        except StopIteration:
            out.write("\n")
            raise EOFError("no more input (add more lines in the input box under ✎ Edit & run)") from None
        out.write(val + "\n")
        return val

    if "matplotlib" in code:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        plt.show = lambda *a, **k: None
        plt.close("all")

    g = {"__name__": "__main__", "__builtins__": builtins}
    old_out, old_err, old_input = sys.stdout, sys.stderr, builtins.input
    sys.stdout = sys.stderr = out
    builtins.input = fake_input
    tracer = Tracer(out)
    tracer.snap_figs = mode == "trace" and "matplotlib" in code
    error = None
    err_line = None
    table, notes = [], {}

    def _pn_ev(i, v):
        tracer.ev(i, v)
        return v

    def _pn_sub(i, c, idx):
        v = c[idx]
        tracer.ev(i, v, (c, idx))
        return v

    g.update(_pn_ev=_pn_ev, _pn_sub=_pn_sub, _pn_slice=slice)
    try:
        compiled = None
        if mode == "trace":
            try:
                compiled, table, notes = instrument(code)
            except SyntaxError:
                raise
            except Exception:
                compiled = None
        if compiled is None:
            compiled = compile(code, FILENAME, "exec")
        if mode == "trace":
            sys.settrace(tracer.global_trace)
        try:
            exec(compiled, g)
        finally:
            sys.settrace(None)
    except _StopTrace:
        pass
    except SyntaxError as e:
        error = f"SyntaxError: {e.msg}"
        err_line = e.lineno
    except BaseException as e:
        error, err_line = _err_text(e)
    finally:
        sys.stdout, sys.stderr, builtins.input = old_out, old_err, old_input
    try:
        figs = _figures()
    except Exception:
        figs = []
    return json.dumps({
        "steps": tracer.steps,
        "stdout": out.text(),
        "error": error,
        "errLine": err_line,
        "truncated": tracer.truncated,
        "figures": figs,
        "ex": table,
        "figsteps": tracer.snaps,
        "stx": notes,
    })
