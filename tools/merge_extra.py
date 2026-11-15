"""Merge an extras file into a chapter.

extras file layout:
    <quiz markdown>            -> inserted as '## 🍪 Predict the output' before '## Practice problems'
    %%%PROGRAMS%%%
    <program markdown>         -> appended as '## ✍️ Write a program'
Usage: python tools/merge_extra.py slug extras.md
"""
import pathlib, sys

root = pathlib.Path(__file__).resolve().parent.parent
slug, extra = sys.argv[1], pathlib.Path(sys.argv[2]).read_text(encoding="utf-8")
quiz, progs = (extra.split("%%%PROGRAMS%%%") + [""])[:2]
p = root / "content" / f"{slug}.md"
src = p.read_text(encoding="utf-8")
for marker in ("## 🍪 Predict the output", "## ✍️ Write a program"):
    if marker in src:
        sys.exit(f"{slug}: '{marker}' already present")
if quiz.strip():
    block = "## 🍪 Predict the output\n\nGuess before you click. These are the exact traps interviewers use.\n\n" + quiz.strip() + "\n\n"
    if "## Practice problems" in src:
        src = src.replace("## Practice problems", block + "## Practice problems", 1)
    else:
        src = src.rstrip() + "\n\n" + block
if progs.strip():
    src = (src.rstrip() + "\n\n## ✍️ Write a program\n\nNow write real code. Type your solution in the editor, press **▶ Run tests** "
           "(or Ctrl+Enter) and the tests run right in your browser. Stuck? Use **👣 Visualise my code**, then open the hints. "
           "Problems marked with a LeetCode number link to the original, so you can submit there too.\n\n" + progs.strip() + "\n")
p.write_text(src, encoding="utf-8")
print(f"{slug}: merged ({src.count(':::quiz')} quizzes, {src.count(':::program')} programs total)")
