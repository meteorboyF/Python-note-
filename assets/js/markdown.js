// Markdown + custom blocks for PyNotes content files.
//
//   :::tip|trap|note|deep|term|analogy|boss  Optional title
//   ...markdown...
//   :::
//
//   :::quiz
//   Question markdown
//   - [ ] wrong option
//   - [x] right option
//   Explanation markdown (everything after the options)
//   :::
//
//   :::problem basic|medium|hard | Title | tag, tag
//   statement markdown
//   :::hint        (any number of these sections, in any order)
//   :::solution
//   :::explain
//   :::trace       (manual trace table)
//   :::pitfalls
//   :::end
//
// Code fences: ```python (Run + Visualise), ```python norun, ```python error
// (expected to raise), ```python plot (draws a figure), ```output, ```text.
(function () {
  const CALLOUTS = {
    tip: "Tip", trap: "Trap", trace: "Manual trace", note: "Note", deep: "Deep dive", term: "Term", analogy: "Think of it like", boss: "Boss move",
  };
  const SECTIONS = {
    hint: "💡 Hint", solution: "✅ Solution", explain: "🧠 Explanation", trace: "👣 Manual trace (step by step)",
    pitfalls: "⚠️ Common mistakes", variant: "🔁 Follow-up / variant", approach: "🧭 Approach",
    starter: "Starter code", tests: "🧪 Test cases", complexity: "⏱️ Complexity",
  };
  window.PROGRAM_REGISTRY = [];
  window.CODE_REGISTRY = [];

  // FNV-1a 32-bit over UTF-16 code units; tools/build-traces.py computes the same key
  window.codeHash = function (str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, "0");
  };
  let inQuiz = false;   // quiz code must not reveal its output

  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const renderer = new marked.Renderer();
  renderer.code = function (tok) {
    const text = tok.text; const info = (tok.lang || "").trim().split(/\s+/);
    const lang = info[0] || "text"; const flags = info.slice(1);
    if (lang === "output" || lang === "text" || lang === "console") {
      return `<div class="code output"><div class="bar">${lang === "output" ? "output" : lang}</div><pre><code>${esc(text)}</code></pre></div>`;
    }
    let html;
    try {
      html = hljs.getLanguage(lang) ? hljs.highlight(text, { language: lang }).value : esc(text);
    } catch (e) { html = esc(text); }
    const inFlag = flags.find(f => f.startsWith("in:"));
    const stdin = inFlag ? inFlag.slice(3).replace(/;/g, "\n").replace(/\+/g, " ") : "";
    const idx = CODE_REGISTRY.push({ code: text, flags, stdin }) - 1;
    const isPy = lang === "python" || lang === "py";
    const runnable = isPy && !flags.includes("norun") && !flags.includes("local");
    const traced = runnable && !inQuiz;
    const label = flags.includes("error") ? "python · raises an error (on purpose)"
      : flags.includes("plot") ? "python · plot"
      : flags.includes("local") ? "python · run on your machine (threads/processes don't run in the browser)"
      : stdin ? "python · reads input()" : lang;
    return `<div class="code${flags.includes("error") ? " error" : ""}${traced ? " traced" : ""}" data-idx="${idx}"${traced ? ` data-h="${codeHash(text)}"` : ""}>
      <div class="bar"><span>${label}</span><span class="sp"></span>
        <button class="copy-btn" data-act="copy">Copy</button>
        ${runnable ? `<button data-act="run" title="Run and show output here">▶ Run</button>` : ""}
        ${runnable && !flags.includes("plot") ? `<button class="viz-btn" data-act="viz" title="Step through line by line">👣 Visualise</button>` : ""}
      </div><pre><code class="hljs">${html}</code></pre></div>`;
  };
  renderer.table = function (tok) {
    const cell = (c, tag) => `<${tag}${c.align ? ` style="text-align:${c.align}"` : ""}>${this.parser.parseInline(c.tokens)}</${tag}>`;
    const head = "<tr>" + tok.header.map(c => cell(c, "th")).join("") + "</tr>";
    const body = tok.rows.map(r => "<tr>" + r.map(c => cell(c, "td")).join("") + "</tr>").join("");
    return `<div class="table-wrap"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
  };
  marked.use({ renderer, gfm: true, breaks: false });

  const md = s => marked.parse(s);

  // split source into blocks, ignoring ::: lines inside code fences
  function tokenize(src) {
    const lines = src.replace(/\r\n/g, "\n").split("\n");
    const out = []; let buf = []; let fence = null;
    let i = 0;
    const flush = () => { if (buf.length) { out.push({ type: "md", text: buf.join("\n") }); buf = []; } };
    const isFence = l => { const m = l.match(/^\s*(```+|~~~+)/); return m ? m[1] : null; };
    while (i < lines.length) {
      const line = lines[i];
      const f = isFence(line);
      if (fence) { if (f && line.trim().startsWith(fence)) fence = null; buf.push(line); i++; continue; }
      if (f) { fence = f; buf.push(line); i++; continue; }
      const m = line.match(/^:::(\w+)\s*(.*)$/);
      if (m && (m[1] === "problem" || m[1] === "program")) {
        flush();
        const [lvl, title, tags] = m[2].split("|").map(s => s.trim());
        const sections = [{ name: "statement", lines: [] }]; let inner = null; i++;
        while (i < lines.length) {
          const l = lines[i]; const ff = isFence(l);
          if (inner) { if (ff && l.trim().startsWith(inner)) inner = null; sections.at(-1).lines.push(l); i++; continue; }
          if (ff) { inner = ff; sections.at(-1).lines.push(l); i++; continue; }
          if (/^:::end\s*$/.test(l)) { i++; break; }
          const sm = l.match(/^:::(\w+)\s*(.*)$/);
          if (sm && SECTIONS[sm[1]]) { sections.push({ name: sm[1], title: sm[2], lines: [] }); i++; continue; }
          sections.at(-1).lines.push(l); i++;
        }
        if (m[1] === "program") {
          const parts = m[2].split("|").map(s => s.trim());
          out.push({ type: "program", level: (parts[0] || "basic").toLowerCase(), title: parts[1] || "Program", source: parts[2] || "", url: parts[3] || "", sections });
          continue;
        }
        out.push({ type: "problem", level: (lvl || "basic").toLowerCase(), title: title || "Problem", tags: tags ? tags.split(",").map(s => s.trim()).filter(Boolean) : [], sections });
        continue;
      }
      if (m && (CALLOUTS[m[1]] || m[1] === "quiz")) {
        flush();
        const body = []; let inner = null; i++;
        while (i < lines.length) {
          const l = lines[i]; const ff = isFence(l);
          if (inner) { if (ff && l.trim().startsWith(inner)) inner = null; body.push(l); i++; continue; }
          if (ff) { inner = ff; body.push(l); i++; continue; }
          if (/^:::\s*$/.test(l)) { i++; break; }
          body.push(l); i++;
        }
        out.push({ type: m[1] === "quiz" ? "quiz" : "callout", kind: m[1], title: m[2], text: body.join("\n") });
        continue;
      }
      buf.push(line); i++;
    }
    flush();
    return out;
  }

  let quizN = 0;
  function renderQuiz(b) {
    const lines = b.text.split("\n"); const q = [], opts = [], why = [];
    for (const l of lines) {
      const om = l.match(/^\s*- \[( |x)\]\s+(.*)$/);
      if (om) opts.push({ right: om[1] === "x", text: om[2] });
      else (opts.length ? why : q).push(l);
    }
    const id = "q" + (++quizN);
    inQuiz = true; const qHtml = md(q.join("\n")); inQuiz = false;
    return `<div class="quiz" id="${id}"><div class="qh">🍪 Predict / Quick check</div>${qHtml}
      <div class="opts">${opts.map(o => `<button class="opt" data-right="${o.right}">${marked.parseInline(o.text)}</button>`).join("")}</div>
      <div class="why">${md(why.join("\n"))}</div></div>`;
  }

  function renderProblem(b, n, slug) {
    const pid = `${slug}-p${n}`;
    const st = b.sections[0];
    const rest = b.sections.slice(1).map(s => {
      const open = s.name === "approach" ? " open" : "";
      return `<details${open} data-sec="${s.name}"><summary>${SECTIONS[s.name]}${s.title ? ` — ${esc(s.title)}` : ""}</summary><div class="dbody">${md(s.lines.join("\n"))}</div></details>`;
    }).join("");
    const lvlName = { basic: "Basic", easy: "Basic", medium: "Medium", hard: "Hard" }[b.level] || b.level;
    const lvlCls = b.level === "easy" ? "basic" : b.level;
    return `<article class="problem" id="${pid}" data-level="${lvlCls}">
      <header><span class="lvl ${lvlCls}">${lvlName}</span><h3>${marked.parseInline(b.title)}</h3><span class="pid">#${n}</span>
        <label class="solve-toggle"><input type="checkbox" data-pid="${pid}"> Solved</label></header>
      <div class="pbody">${b.tags.length ? `<div class="tags">${b.tags.map(t => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
      ${md(st.lines.join("\n"))}${rest}</div></article>`;
  }

  const codeOf = (sec) => {
    if (!sec) return "";
    const m = sec.lines.join("\n").match(/```[^\n]*\n([\s\S]*?)```/);
    return m ? m[1].replace(/\s+$/, "") : "";
  };

  function renderProgram(b, n, slug) {
    const pid = `${slug}-w${n}`;
    const get = name => b.sections.find(s => s.name === name);
    const starter = codeOf(get("starter")) || "# write your solution here\n";
    const testsSrc = codeOf(get("tests"));
    const tests = testsSrc.split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
    const idx = PROGRAM_REGISTRY.push({ starter, tests, testsSrc, pid }) - 1;
    const lvlName = { basic: "Basic", easy: "Basic", medium: "Medium", hard: "Hard" }[b.level] || b.level;
    const lvlCls = b.level === "easy" ? "basic" : b.level;
    const src = b.source ? `<span class="src">${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.source)} ↗</a>` : esc(b.source)}</span>` : "";
    const rest = b.sections.slice(1).filter(s => s.name !== "starter").map(s => {
      const label = s.name === "tests" ? `🧪 Test cases (${tests.filter(t => t.startsWith("assert")).length})` : SECTIONS[s.name];
      return `<details data-sec="${s.name}"><summary>${label}</summary><div class="dbody">${md(s.lines.join("\n"))}</div></details>`;
    }).join("");
    return `<article class="program" id="${pid}" data-prog="${idx}">
      <header><span class="lvl ${lvlCls}">${lvlName}</span><h3>✍️ ${marked.parseInline(b.title)}</h3>${src}
        <label class="solve-toggle"><input type="checkbox" data-pid="${pid}"> Solved</label></header>
      <div class="pbody">${md(b.sections[0].lines.join("\n"))}
        <div class="editor"><div class="bar"><span>your solution</span><span class="sp"></span>
          <button class="run" data-pa="test">▶ Run tests</button><button data-pa="viz">👣 Visualise my code</button><button data-pa="reset">↺ Reset</button></div>
          <textarea spellcheck="false" aria-label="Code editor">${esc(starter)}</textarea>
          <div class="test-out" hidden></div></div>
        ${rest}</div></article>`;
  }

  window.renderContent = function (src, slug) {
    CODE_REGISTRY.length = 0; PROGRAM_REGISTRY.length = 0; quizN = 0;
    const blocks = tokenize(src); let pn = 0, wn = 0;
    return blocks.map(b => {
      if (b.type === "md") return md(b.text);
      if (b.type === "quiz") return renderQuiz(b);
      if (b.type === "callout") {
        return `<div class="callout ${b.kind}"><div class="ct"><span class="ic">${CALLOUTS[b.kind]}</span>${b.title ? marked.parseInline(b.title) : ""}</div>${md(b.text)}</div>`;
      }
      if (b.type === "problem") return renderProblem(b, ++pn, slug);
      if (b.type === "program") return renderProgram(b, ++wn, slug);
      return "";
    }).join("\n");
  };
  window.countProblems = function (src) {
    return (src.match(/^:::problem\b/gm) || []).length;
  };
})();
