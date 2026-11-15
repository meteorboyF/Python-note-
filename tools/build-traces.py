"""Pre-run every runnable ```python block with the site's own tracer and save
the output + step-by-step trace, so pages can show output, breakdown and the
inline visualiser instantly (no Pyodide download needed just to read).

    python tools/build-traces.py            # all chapters
    python tools/build-traces.py strings    # just some

Writes traces/<slug>.json = {"<hash>": {steps, stdout, error, errLine, truncated, figs}}
and figure PNGs to traces/fig/<slug>-<hash>-<n>.png. <hash> is FNV-1a 32-bit of the
code text (hex), computed identically in assets/js/markdown.js.
Needs numpy/pandas/matplotlib (run it with the venv that runs tools/check.py).
"""
import base64, glob, json, os, re, sys, multiprocessing as mp

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "traces")
MAX_STEPS = 400          # inline traces are for reading; longer runs are cut


def fnv(s):
    h = 0x811C9DC5
    u = s.encode("utf-16-le")                     # JS charCodeAt semantics (UTF-16 units)
    for k in range(0, len(u), 2):
        h ^= u[k] | (u[k + 1] << 8)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return format(h, "08x")


def blocks(src):
    """Yield code text of runnable python fences (same rules as markdown.js)."""
    lines = src.replace("\r\n", "\n").split("\n")
    i = 0
    while i < len(lines):
        m = re.match(r"^\s*(```+)\s*(\S*)\s*(.*)$", lines[i])
        if not m:
            i += 1
            continue
        fence, lang, flags = m.group(1), m.group(2), m.group(3).split()
        body = []
        i += 1
        while i < len(lines) and not lines[i].strip().startswith(fence):
            body.append(lines[i])
            i += 1
        i += 1
        if lang in ("python", "py") and "norun" not in flags and "local" not in flags:
            # marked dedents fences by the opening fence's indentation
            ind = len(m.string) - len(m.string.lstrip())
            text = "\n".join(l[ind:] if l[:ind].strip() == "" else l.lstrip() for l in body)
            yield text


def trace_one(code):
    os.environ["MPLBACKEND"] = "Agg"
    sys.path.insert(0, os.path.join(ROOT, "assets", "py"))
    import tracer
    tracer.MAX_STEPS = MAX_STEPS
    import signal
    def _timeout(*_):
        raise TimeoutError("took longer than 20s")
    signal.signal(signal.SIGALRM, _timeout)
    signal.alarm(20)
    try:
        r = json.loads(tracer.run_user(code, "trace", ""))
        if r["truncated"]:                       # trace was cut: get the complete output too
            full = json.loads(tracer.run_user(code, "run", ""))
            r["full"] = {"stdout": full["stdout"], "error": full["error"], "errLine": full["errLine"]}
            r["figures"] = full["figures"]
        return r
    finally:
        signal.alarm(0)


def delta_heaps(steps):
    """Store each step's heap as changes vs the previous step: h = new/changed
    objects, g = ids that disappeared. The browser rebuilds full heaps (undelta)."""
    prev = {}
    for st in steps:
        full = st["h"]
        st["h"] = {k: v for k, v in full.items() if prev.get(k) != v}
        gone = [k for k in prev if k not in full]
        if gone:
            st["g"] = gone
        prev = full


def delta_frames(steps):
    """Frames that existed on the previous step keep only {id, d: changed/new
    [name, value] pairs, x: removed names}; brand-new frames are stored in full."""
    prev = {}
    for st in steps:
        enc = []
        cur = {}
        for fr in st["f"]:
            cur[fr["id"]] = fr
            old = prev.get(fr["id"])
            if old is None or old["n"] != fr["n"]:
                enc.append(fr)
                continue
            ov = dict(map(tuple, ((k, json.dumps(v)) for k, v in old["v"])))
            e = {"id": fr["id"]}
            d = [[k, v] for k, v in fr["v"] if ov.get(k) != json.dumps(v)]
            names = {k for k, _ in fr["v"]}
            x = [k for k in ov if k not in names]
            if d:
                e["d"] = d
            if x:
                e["x"] = x
            enc.append(e)
        st["f"] = enc
        prev = cur


def work(args):
    slug, h, code = args
    try:
        r = trace_one(code)
    except BaseException as e:   # timeouts etc.
        return slug, h, None, f"{type(e).__name__}: {e}"
    return slug, h, r, None


def main():
    os.makedirs(os.path.join(OUT, "fig"), exist_ok=True)
    want = set(sys.argv[1:])
    jobs = []
    for path in sorted(glob.glob(os.path.join(ROOT, "content", "*.md"))):
        slug = os.path.basename(path)[:-3]
        if want and slug not in want:
            continue
        seen = set()
        for code in blocks(open(path, encoding="utf-8").read()):
            h = fnv(code)
            if h not in seen:
                seen.add(h)
                jobs.append((slug, h, code))
    results = {}
    problems = []
    done = 0
    import tempfile
    sandbox = tempfile.mkdtemp(prefix="pn-traces-")   # examples write files: keep them out of the repo
    with mp.Pool(max(2, os.cpu_count() - 1), maxtasksperchild=8, initializer=os.chdir, initargs=(sandbox,)) as pool:
        for slug, h, r, err in pool.imap_unordered(work, jobs):
            done += 1
            if done % 100 == 0:
                print(f"  {done}/{len(jobs)}", flush=True)
            if err:
                problems.append(f"{slug}:{h} {err}")
                continue
            figs = []
            for n, b64 in enumerate(r.pop("figures", [])):
                name = f"{slug}-{h}-{n}.png"
                with open(os.path.join(OUT, "fig", name), "wb") as f:
                    f.write(base64.b64decode(b64))
                figs.append(name)
            r["figs"] = figs
            delta_heaps(r["steps"])
            delta_frames(r["steps"])
            results.setdefault(slug, {})[h] = r
    for slug, d in results.items():
        with open(os.path.join(OUT, f"{slug}.json"), "w", encoding="utf-8") as f:
            json.dump(d, f, separators=(",", ":"))
    total = sum(os.path.getsize(os.path.join(OUT, f"{s}.json")) for s in results)
    print(f"traced {sum(len(d) for d in results.values())} blocks in {len(results)} chapters, {total / 1e6:.1f} MB json")
    for p in problems:
        print("  !", p)


if __name__ == "__main__":
    main()
