"""Run every ```python block in content/*.md and report failures.

Each block must be self-contained. Flags after the language:
  norun  - skipped (pseudo-code, fragments)
  error  - must raise an exception
  plot   - matplotlib figure (run headless)
  in:A;B - sample input typed by the user: lines separated by ';', '+' stands for a space
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
        stdin = next((x[3:].replace(";", "\n").replace("+", " ") + "\n" for x in flags if x.startswith("in:")), "")
        line = src[: m.start()].count("\n") + 1
        total += 1
        with tempfile.TemporaryDirectory() as d:
            script = pathlib.Path(d) / "snippet.py"
            script.write_text(code, encoding="utf-8")
            try:
                r = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, timeout=30, cwd=d, env=env, input=stdin)
                rc, err = r.returncode, r.stderr
            except subprocess.TimeoutExpired:
                rc, err = 99, "TIMEOUT"
        want_err = "error" in flags
        if (rc != 0) != want_err:
            bad += 1
            last = err.strip().splitlines()[-1] if err.strip() else "(no exception raised)"
            print(f"FAIL {f.name}:{line} {'expected an error' if want_err else last}")
# ---- write-a-program blocks: the reference solution must pass every test ----
prog_re = re.compile(r"^:::program([^\n]*)\n(.*?)^:::end", re.S | re.M)
sec_code = lambda body, name: (re.search(r"^:::" + name + r"\s*\n```[^\n]*\n(.*?)^```", body, re.S | re.M) or [None, None])[1]
HARNESS = (root / "tools" / "test_harness.py").read_text() + "\nif _pn_failed:\n    raise SystemExit(\"TESTS FAILED:\\n\" + \"\\n\".join(_pn_failed))\n"
ptotal = pbad = 0
for f in files:
    src = f.read_text()
    for m in prog_re.finditer(src):
        ptotal += 1
        line = src[: m.start()].count("\n") + 1
        body = m.group(2)
        sol, tests, starter = sec_code(body, "solution"), sec_code(body, "tests"), sec_code(body, "starter")
        fl = re.search(r"^:::solution\s*\n```python([^\n]*)", body, re.M)
        sol_in = next((x[3:].replace(";", "\n").replace("+", " ") + "\n" for x in (fl.group(1).split() if fl else []) if x.startswith("in:")), "")
        problems = []
        if not sol or not tests:
            problems.append("missing :::solution or :::tests code")
        if starter:
            try:
                compile(starter, "starter", "exec")
            except SyntaxError as e:
                problems.append(f"starter SyntaxError: {e}")
        if not problems:
            code = sol + "\n_pn_src = " + repr(tests) + "\n" + HARNESS
            with tempfile.TemporaryDirectory() as d:
                script = pathlib.Path(d) / "prog.py"
                script.write_text(code, encoding="utf-8")
                try:
                    r = subprocess.run([sys.executable, str(script)], capture_output=True, text=True, timeout=60, cwd=d, env=env, input=sol_in)
                    if r.returncode != 0:
                        problems.append((r.stderr.strip() or r.stdout.strip())[-600:])
                except subprocess.TimeoutExpired:
                    problems.append("TIMEOUT")
        if problems:
            pbad += 1
            print(f"PROGRAM FAIL {f.name}:{line} " + " | ".join(problems))
bad += pbad
print(f"{total - (bad - pbad)}/{total} blocks OK, {ptotal - pbad}/{ptotal} programs OK")
sys.exit(1 if bad else 0)
