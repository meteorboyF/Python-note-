"""Verify every LeetCode link in write-a-program headers.

Header format: :::program level | Title | LeetCode 123 | https://leetcode.com/problems/<slug>/
Checks that the slug exists and that its problem number matches the label.
"""
import json, pathlib, re, sys, time, urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
pat = re.compile(r"^:::program[^|]*\|[^|]*\|\s*([^|]*?)\s*\|\s*(https://leetcode\.com/problems/([\w-]+)/?)\s*$", re.M)
Q = "query q($s:String!){question(titleSlug:$s){questionFrontendId title difficulty}}"

def lookup(slug):
    req = urllib.request.Request("https://leetcode.com/graphql",
        data=json.dumps({"query": Q, "variables": {"s": slug}}).encode(),
        headers={"Content-Type": "application/json", "Referer": "https://leetcode.com", "User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)["data"]["question"]

bad = total = 0
for f in sorted((root / "content").glob("*.md")):
    for label, url, slug in pat.findall(f.read_text()):
        total += 1
        q = lookup(slug)
        time.sleep(0.3)
        num = re.search(r"(\d+)", label)
        if q is None:
            bad += 1; print(f"MISSING  {f.name}: {slug}")
        elif num and num.group(1) != q["questionFrontendId"]:
            bad += 1; print(f"NUMBER   {f.name}: {slug} is #{q['questionFrontendId']} '{q['title']}', label says {label}")
print(f"{total - bad}/{total} LeetCode links verified")
sys.exit(1 if bad else 0)
