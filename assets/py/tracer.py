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
    inputs = iter(stdin.splitlines())

    def fake_input(prompt=""):
        out.write(str(prompt))
        try:
            val = next(inputs)
        except StopIteration:
            val = ""
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
    error = None
    err_line = None
    try:
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
    })
