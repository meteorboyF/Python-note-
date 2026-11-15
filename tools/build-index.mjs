// Builds assets/search-index.json from content/*.md (topics, sections, problems).
// Usage: node tools/build-index.mjs
import fs from "node:fs";
import vm from "node:vm";
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync("assets/js/topics.js", "utf8"), ctx);
const topics = ctx.window.ALL_TOPICS;
const slugify = s => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);
const clean = s => s.replace(/`([^`]*)`/g, "$1").replace(/\*\*?([^*]+)\*\*?/g, "$1").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").trim();
const out = { topics: {}, entries: [] };
for (const t of topics) {
  const f = `content/${t.slug}.md`;
  if (!fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, "utf8");
  let fence = false, pn = 0, quizzes = 0; const used = new Set();
  for (const line of src.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; continue; }
    if (fence) continue;
    let m;
    if ((m = line.match(/^(##|###)\s+(.*)$/))) {
      const text = clean(m[2]); let id = slugify(text) || "s"; while (used.has(id)) id += "-x"; used.add(id);
      out.entries.push({ k: "Section", t: text, s: t.slug, a: id, topic: t.title });
    } else if ((m = line.match(/^:::problem\s+(\w+)\s*\|\s*([^|]+)(?:\|\s*(.*))?$/))) {
      pn++;
      out.entries.push({ k: "Problem", t: clean(m[2]), x: `${m[1]} ${m[3] || ""}`, s: t.slug, a: `${t.slug}-p${pn}`, topic: `${t.title} · ${m[1]}` });
    } else if (/^:::quiz/.test(line)) quizzes++;
  }
  out.topics[t.slug] = { problems: pn, quizzes };
}
fs.writeFileSync("assets/search-index.json", JSON.stringify(out));
const tot = Object.values(out.topics).reduce((a, x) => a + x.problems, 0);
console.log(`indexed ${Object.keys(out.topics).length} topics, ${tot} problems, ${out.entries.length} entries`);
