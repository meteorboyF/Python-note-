"""Print the real output of every quiz code snippet next to the option marked correct."""
import io, contextlib, pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
for slug in sys.argv[1:]:
    src = (root / "content" / f"{slug}.md").read_text()
    for q in re.findall(r"^:::quiz\n(.*?)^:::\s*$", src, re.S | re.M):
        code = re.search(r"```python[^\n]*\n(.*?)```", q, re.S)
        right = re.findall(r"^- \[x\] (.*)$", q, re.M)
        out = io.StringIO()
        if code:
            try:
                with contextlib.redirect_stdout(out):
                    exec(code.group(1), {})
            except Exception as e:
                out.write(f"<{type(e).__name__}: {e}>")
        print(f"[{slug}] marked: {right}\n    actual: {out.getvalue().strip()!r}" if code else f"[{slug}] (no code) marked: {right}")
