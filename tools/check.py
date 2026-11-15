"""Run every ```python block in content/*.md and report failures.

Each block must be self-contained. Flags after the language:
  norun  - skipped (pseudo-code, fragments)
  error  - must raise an exception
  plot   - matplotlib figure (run headless)
Usage: python tools/check.py [slug ...]
"""
import re, sys, subprocess, pathlib, os, tempfile

root = pathlib.Path(__file__).resolve().parent.parent
files = sorted((root / "content").glob("*.md"))
if len(sys.argv) > 1:
    files = [root / "content" / f"{s}.md" for s in sys.argv[1:]]
fence = re.compile(r"^```python([^\n]*)\n(.*?)^```", re.S | re.M)
env = dict(os.environ, MPLBACKEND="Agg", PYTHONWARNINGS="ignore")
total = bad = 0
for f in files:
    src = f.read_text()
    for m in fence.finditer(src):
        flags = m.group(1).split()
        if "norun" in flags:
            continue
        code = m.group(2)
        line = src[: m.start()].count("\n") + 1
        total += 1
        with tempfile.TemporaryDirectory() as d:
            try:
                r = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, timeout=30, cwd=d, env=env)
                rc, err = r.returncode, r.stderr
            except subprocess.TimeoutExpired:
                rc, err = 99, "TIMEOUT"
        want_err = "error" in flags
        if (rc != 0) != want_err:
            bad += 1
            last = err.strip().splitlines()[-1] if err.strip() else "(no exception raised)"
            print(f"FAIL {f.name}:{line} {'expected an error' if want_err else last}")
print(f"{total - bad}/{total} blocks OK")
sys.exit(1 if bad else 0)
