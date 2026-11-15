// PyNotes app: hash router, pages, search, progress.
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const app = $("#app");
  const slugify = s => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);

  // ---------- storage (per-viewer conveniences; page works without it) ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  let solved = new Set(store.get("pn-solved", []));
  let visited = new Set(store.get("pn-visited", []));
  const saveSolved = () => store.set("pn-solved", [...solved]);

  // ---------- index (problem counts + search) ----------
  let INDEX = null;
  const indexP = fetch("assets/search-index.json").then(r => r.ok ? r.json() : { topics: {}, entries: [] }).then(j => (INDEX = j)).catch(() => (INDEX = { topics: {}, entries: [] }));

  // ---------- theme ----------
  $("#themeBtn").onclick = () => {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next; store.set("pn-theme", next);
    try { localStorage.setItem("pn-theme", next); } catch (e) {}
  };

  // ---------- sidebar ----------
  function renderSidebar(active) {
    $("#sidebar").innerHTML = `<a href="#/" class="${active === "home" ? "active" : ""}"><span class="num">⌂</span>Home</a>
      <a href="#/playground" class="${active === "playground" ? "active" : ""}"><span class="num">▶</span>Visualiser playground</a>
      <a href="#/glossary" class="${active === "glossary" ? "active" : ""}"><span class="num">Aa</span>Glossary of terms</a>
      <div style="height:10px"></div>` +
      PARTS.map(p => `<div class="part"><div class="part-title">${esc(p.title)}</div>${p.topics.map(t => {
        const at = ALL_TOPICS.find(x => x.slug === t.slug);
        return `<a href="#/t/${t.slug}" class="${active === t.slug ? "active" : ""}"><span class="num">${String(at.n).padStart(2, "0")}</span>${esc(t.title)}${visited.has(t.slug) ? `<span class="done-dot" title="Visited"></span>` : ""}</a>`;
      }).join("")}</div>`).join("");
  }
  const sidebar = $("#sidebar"), scrim = $("#scrim");
  const closeMenu = () => { sidebar.classList.remove("open"); scrim.hidden = true; };
  $("#menuBtn").onclick = () => { sidebar.classList.add("open"); scrim.hidden = false; };
  scrim.onclick = closeMenu;
  sidebar.addEventListener("click", e => { if (e.target.closest("a")) closeMenu(); });

  // ---------- pages ----------
  function topicProgress(slug) {
    const t = INDEX && INDEX.topics[slug];
    const total = t ? t.problems + (t.programs || 0) : 0;
    const done = [...solved].filter(p => p.startsWith(slug + "-p") || p.startsWith(slug + "-w")).length;
    return { total, done };
  }

  async function pageHome() {
    renderSidebar("home");
    await indexP;
    const totalProblems = Object.values(INDEX.topics).reduce((a, t) => a + t.problems, 0);
    const totalQuizzes = Object.values(INDEX.topics).reduce((a, t) => a + (t.quizzes || 0), 0);
    const totalPrograms = Object.values(INDEX.topics).reduce((a, t) => a + (t.programs || 0), 0);
    app.innerHTML = `<div class="page wide"><div class="content" style="max-width:none">
      <section class="hero">
        <h1>Python, baked fresh. <em>From zero to boss.</em></h1>
        <p>Plain-English concepts, the tricks and traps interviewers test, ${totalProblems || "hundreds of"} practice problems from Basic to Hard, and a visualiser that steps through code one line at a time.</p>
        <div class="actions"><a class="btn" href="#/t/variables">Start at Chapter 1 →</a><a class="btn ghost" href="#/playground">Open the visualiser</a><a class="btn ghost" href="#/glossary">Learn the terms</a></div>
        <div class="stats"><div><b>${ALL_TOPICS.length}</b>topics</div><div><b>${totalProblems}</b>problems</div><div><b>${totalPrograms}</b>write-a-program tasks</div><div><b>${totalQuizzes}</b>quick checks</div><div><b>${GLOSSARY.length}</b>terms explained</div><div><b>${solved.size}</b>solved by you</div></div>
      </section>
      <h2 style="border:0;margin-top:0">How to use these notes</h2>
      <div class="howto">
        <div><b>1 · Read the concept</b><p>Every chapter starts in plain English, then adds the precise technical words. <span class="gl" data-term="Mutable">Dotted words</span> show a definition when you hover or tap.</p></div>
        <div><b>2 · Step through code</b><p>Every example has a card under it: <b>▸ Output</b> (what it prints), <b>🔍 Breakdown</b> (each line, how often it ran, what it did) and <b>👣 Visualise</b>, which runs right there in the page with frames, objects and a plain-English note for every step. Use <kbd>←</kbd> <kbd>→</kbd> to step. <b>✎ Edit &amp; run</b> lets you change the code.</p></div>
        <div><b>3 · Predict, then check</b><p>The 🍪 quick checks ask "what does this print?". Guess first. That's where real learning happens.</p></div>
        <div><b>4 · Solve problems</b><p>Basic → Medium → Hard. Try before opening the hint. Tick <b>Solved</b> to track progress (saved in this browser).</p></div>
        <div><b>5 · Trace by hand</b><p>In the visualiser, open <b>📋 Trace table</b> for the step-by-step table you'd write on paper, or switch on <b>🎯 Predict mode</b> to guess every variable before it changes.</p></div>
        <div><b>6 · Write programs</b><p>Each chapter ends with <b>✍️ Write a program</b>: an editor plus <b>▶ Run tests</b>, a mini LeetCode judge in your browser. Pass every test and it's marked solved.</p></div>
      </div>
      ${PARTS.map(p => `<section class="part-block"><h2>${esc(p.title)}</h2><p>${esc(p.blurb)}</p><div class="cards">${p.topics.map(t => {
        const at = ALL_TOPICS.find(x => x.slug === t.slug); const pr = topicProgress(t.slug);
        return `<a class="card" href="#/t/${t.slug}"><span class="k">CHAPTER ${String(at.n).padStart(2, "0")}${pr.total ? ` · ${pr.done}/${pr.total} solved` : ""}</span><h3>${esc(t.title)}</h3><p>${esc(t.desc)}</p>${t.isNew ? `<span class="tag-new">NEW: not in original notes</span>` : ""}${pr.total ? `<div class="progress"><span style="width:${(100 * pr.done / pr.total).toFixed(0)}%"></span></div>` : ""}</a>`;
      }).join("")}</div></section>`).join("")}
    </div></div>`;
    wireGlossary(app);
  }

  const contentCache = new Map();
  async function pageTopic(slug, anchor) {
    const t = ALL_TOPICS.find(x => x.slug === slug);
    if (!t) return pageNotFound();
    renderSidebar(slug);
    const i = ALL_TOPICS.indexOf(t); const prev = ALL_TOPICS[i - 1], next = ALL_TOPICS[i + 1];
    app.innerHTML = `<div class="page"><div class="content"><p class="muted">Loading…</p></div></div>`;
    let src = contentCache.get(slug);
    if (!src) {
      try { const r = await fetch(`content/${slug}.md`, { cache: "no-cache" }); if (!r.ok) throw 0; src = await r.text(); contentCache.set(slug, src); }
      catch (e) { src = null; }
    }
    if (location.hash.split("?")[0] !== `#/t/${slug}`) return; // navigated away meanwhile
    const pager = `<nav class="pager">${prev ? `<a href="#/t/${prev.slug}"><small>← Previous</small>${esc(prev.title)}</a>` : "<span></span>"}${next ? `<a class="next" href="#/t/${next.slug}"><small>Next →</small>${esc(next.title)}</a>` : "<span></span>"}</nav>`;
    if (!src) {
      app.innerHTML = `<div class="page wide"><div class="content"><p class="crumbs"><a href="#/">Home</a> / ${esc(t.part.title)}</p><h1>${esc(t.title)}</h1><div class="callout note"><div class="ct"><span class="ic">Note</span>Still in the oven</div><p>This chapter hasn't been published yet. Check back soon.</p></div>${pager}</div></div>`;
      return;
    }
    const html = renderContent(src, slug);
    const nProb = countProblems(src);
    app.innerHTML = `<div class="page"><article class="content">
      <p class="crumbs"><a href="#/">Home</a> / ${esc(t.part.title)} / Chapter ${t.n}</p>
      <div class="topic-body">${html}</div>${pager}</article><aside class="toc" id="toc"></aside></div>`;
    const body = $(".topic-body", app);
    // meta pills under the H1
    const h1 = $("h1", body);
    if (h1) h1.insertAdjacentHTML("afterend", `<div class="topic-meta"><span class="pill red">Chapter ${t.n}</span>${t.isNew ? `<span class="pill">New chapter, researched beyond the original notes</span>` : `<span class="pill">From your notes, expanded</span>`}${nProb ? `<span class="pill">${nProb} practice problems</span>` : ""}</div>`);
    // heading ids + toc
    const used = new Set();
    $$("h2, h3", body).forEach(h => { let id = slugify(h.textContent) || "s"; while (used.has(id)) id += "-x"; used.add(id); h.id = id; });
    $("#toc").innerHTML = `<strong>On this page</strong>` + $$("h2, h3", body).map(h => `<a href="#" data-go="${h.id}" class="${h.tagName === "H3" ? "sub" : ""}">${esc(h.textContent)}</a>`).join("");
    // problem filter bar
    const firstProb = $(".problem", body);
    if (firstProb) {
      firstProb.insertAdjacentHTML("beforebegin", `<div class="problems-head"><b>Show:</b>${["all", "basic", "medium", "hard", "unsolved"].map(f => `<button class="filter-btn${f === "all" ? " on" : ""}" data-filter="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join("")}<span class="muted" id="solvedCount"></span></div>`);
    }
    $$(".problem input[type=checkbox], .program input[type=checkbox]", body).forEach(cb => { cb.checked = solved.has(cb.dataset.pid); cb.closest(".problem, .program").classList.toggle("solved", cb.checked); });
    $$(".program textarea", body).forEach(ta => {
      const entry = PROGRAM_REGISTRY[+ta.closest(".program").dataset.prog];
      const saved = store.get("pn-code-" + entry.pid, null);
      if (saved) ta.value = saved;
    });
    updateSolvedCount(slug);
    wireGlossary(body);
    mountCards(slug, body);
    visited.add(slug); store.set("pn-visited", [...visited]);
    renderSidebar(slug);
    if (anchor) { const el = document.getElementById(anchor); if (el) { el.scrollIntoView(); if (el.tagName === "DETAILS") el.open = true; el.closest("details") && (el.closest("details").open = true); return; } }
    window.scrollTo(0, 0);
    tocSpy();
  }
  // ---------- code cards: Output · Breakdown · Visualise (precomputed traces) ----------
  const TRACE_V = "8";
  const traceCache = new Map();
  const loadTraces = slug => {
    if (!traceCache.has(slug)) traceCache.set(slug, fetch(`traces/${slug}.json?v=${TRACE_V}`).then(r => (r.ok ? r.json() : {})).catch(() => ({})));
    return traceCache.get(slug);
  };
  const cardViz = new WeakMap();
  let cardObserver = null;
  function outputHTML(r) {
    const full = r.full || r;
    let html = esc(full.stdout || "");
    if (full.error) html += `<span class="err">${html && !html.endsWith("\n") ? "\n" : ""}Traceback (most recent call last) … ${esc(full.error)}${full.errLine ? `  ← line ${full.errLine}` : ""}</span>`;
    html += (r.figs || []).map(f => `<img alt="figure produced by this code" loading="lazy" src="traces/fig/${esc(f)}?v=${TRACE_V}">`).join("");
    return html || `<span class="muted">(This code prints nothing. Open 👣 Visualise to watch the variables change.)</span>`;
  }
  function showTab(card, tab, remember) {
    const cx = card.querySelector(".cx"); if (!cx) return;
    cx.querySelectorAll("[data-cx]").forEach(b => b.classList.toggle("on", b.dataset.cx === tab));
    cx.querySelectorAll(".cx-pane").forEach(p => (p.hidden = p.dataset.pane !== tab));
    card.classList.toggle("viz-open", tab === "viz");
    if (tab === "bd") {
      const pane = cx.querySelector('[data-pane="bd"]');
      if (!pane.dataset.done) { pane.innerHTML = Viz.breakdown(card._code, card._result); pane.dataset.done = "1"; }
    }
    if (tab === "viz") {
      let viz = cardViz.get(card);
      const pane = cx.querySelector('[data-pane="viz"]');
      if (!viz) {
        viz = new Viz.Visualiser(pane, { inline: true, stack: true, onResult: (r, code) => refreshCard(card, r, code) });
        cardViz.set(card, viz);
        viz.loadResult(card._code, card._result);
      } else viz.go(viz.i);
    }
    if (remember && tab !== "bd") store.set("pn-cx-tab", tab);
  }
  function refreshCard(card, r, code) {      // after "Edit & run": show the new run's output/breakdown
    card._result = r; card._code = code;
    const eb = card.querySelector('[data-act="edit"]'); if (eb) eb.textContent = "✎ Edit & run";
    const cx = card.querySelector(".cx");
    cx.querySelector('[data-pane="out"]').innerHTML = `<pre class="cx-out">${outputHTML({ ...r, figs: [] })}${(r.figures || []).map(b => `<img alt="figure" src="data:image/png;base64,${b}">`).join("")}</pre>`;
    const bd = cx.querySelector('[data-pane="bd"]'); bd.dataset.done = ""; if (!bd.hidden) showTab(card, "bd");
    cx.querySelector("[data-cx=viz] small").textContent = `${r.steps.length} steps`;
  }
  async function mountCards(slug, body) {
    const cards = $$(".code.traced", body); if (!cards.length) return;
    const data = await loadTraces(slug);
    if (!document.body.contains(cards[0])) return;          // navigated away meanwhile
    if (cardObserver) cardObserver.disconnect();
    cardObserver = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      cardObserver.unobserve(en.target);
      const card = en.target;
      showTab(card, card._want, false);
    }), { rootMargin: "300px 0px" });
    const pref = store.get("pn-cx-tab", null);
    cards.forEach(card => {
      const r = data[card.dataset.h];
      if (!r) { card.classList.remove("traced"); return; }   // keep live ▶ Run / 👣 Visualise
      card._result = r; card._code = CODE_REGISTRY[+card.dataset.idx].code;
      const n = r.steps.length;
      card.querySelector('[data-act="run"]')?.remove();
      const vb = card.querySelector('[data-act="viz"]');
      if (vb) { vb.outerHTML = `<button data-act="edit" title="Change the code and run it in your browser">✎ Edit &amp; run</button><button data-act="full" title="Open the visualiser full screen">⤢ Full screen</button>`; }
      card.insertAdjacentHTML("beforeend", `<div class="cx">
        <div class="cx-tabs" role="tablist">
          <button data-cx="viz" role="tab">👣 Step by step <small>${n} steps</small></button>
          <button data-cx="out" role="tab">▸ Output</button>
          <button data-cx="bd" role="tab">🔍 Line by line</button>
        </div>
        <div class="cx-pane" data-pane="out"><pre class="cx-out">${outputHTML(r)}</pre></div>
        <div class="cx-pane" data-pane="bd" hidden></div>
        <div class="cx-pane" data-pane="viz" hidden tabindex="0"></div></div>`);
      card._want = pref === "out" || pref === "bd" ? pref : (n >= 4 ? "viz" : "out");
      if (card._want === "out") showTab(card, "out", false);
      else cardObserver.observe(card);
    });
  }
  app.addEventListener("click", e => {
    const tb = e.target.closest(".cx [data-cx]");
    if (tb) showTab(tb.closest(".code"), tb.dataset.cx, true);
  });
  app.addEventListener("keydown", e => {
    const pane = e.target.closest && e.target.closest('.cx-pane[data-pane="viz"]');
    if (!pane || /TEXTAREA|INPUT|SELECT/.test(e.target.tagName)) return;
    const viz = cardViz.get(pane.closest(".code"));
    if (viz && viz.key(e)) e.preventDefault();
  });

  function updateSolvedCount(slug) {
    const el = $("#solvedCount"); if (!el) return;
    const total = $$(".problem, .program").length; const done = $$(".problem.solved, .program.solved").length;
    el.textContent = `${done}/${total} solved`;
  }
  function tocSpy() {
    const links = $$("#toc a"); if (!links.length) return;
    const heads = links.map(a => document.getElementById(a.dataset.go));
    const onScroll = () => {
      let cur = 0; heads.forEach((h, i) => { if (h && h.getBoundingClientRect().top < 120) cur = i; });
      links.forEach((a, i) => a.classList.toggle("active", i === cur));
    };
    window.onscroll = onScroll; onScroll();
  }

  function pageGlossary() {
    renderSidebar("glossary"); window.onscroll = null;
    const sorted = [...GLOSSARY].sort((a, b) => a[0].localeCompare(b[0], "en", { sensitivity: "base" }));
    const draw = (q = "") => {
      const ql = q.toLowerCase(); let letter = "";
      const items = sorted.filter(g => !ql || (g[0] + " " + g[1].join(" ") + " " + g[2] + " " + g[3]).toLowerCase().includes(ql));
      $("#glossList").innerHTML = items.map(g => {
        const L = g[0][0].toUpperCase(); const head = /[A-Z]/.test(L) ? L : "#";
        const sep = head !== letter ? `<div class="gloss-letter">${(letter = head)}</div>` : "";
        const topic = ALL_TOPICS.find(t => t.slug === g[4]);
        return `${sep}<div class="gloss-item" id="g-${slugify(g[0])}"><h3>${esc(g[0])}${g[1].length ? ` <span class="muted" style="font:500 .8rem var(--font-body)">also: ${esc(g[1].join(", "))}</span>` : ""}</h3><p>${esc(g[2])}</p><p class="tech"><b>Technically:</b> ${esc(g[3])}${topic ? ` · <a href="#/t/${topic.slug}">${esc(topic.title)} →</a>` : ""}</p></div>`;
      }).join("") || `<p class="muted">No terms match.</p>`;
    };
    app.innerHTML = `<div class="page wide"><div class="content"><h1>Glossary of terms</h1><p class="lead">Every technical word used on this site, first in plain English and then in precise terms. Interviewers expect the precise version, so learn both.</p>
      <input class="gloss-filter" id="glossQ" placeholder="Filter ${GLOSSARY.length} terms…" autocomplete="off"><div class="gloss-list" id="glossList"></div></div></div>`;
    draw(); $("#glossQ").oninput = e => draw(e.target.value);
    window.scrollTo(0, 0);
  }

  const SAMPLES = {
    "Names & references (aliasing)": `a = [1, 2, 3]\nb = a          # b is another name for the SAME list\nb.append(4)\nprint(a)       # a sees the change!\nc = a[:]       # a copy: a NEW list\nc.append(99)\nprint(a, c)\nx = 10\ny = x\ny += 1         # ints are immutable: y now names a new object\nprint(x, y)\n`,
    "Recursion: factorial": `def fact(n):\n    if n <= 1:          # base case\n        return 1\n    return n * fact(n - 1)\n\nprint(fact(4))\n`,
    "Linked list reversal": `class Node:\n    def __init__(self, val, next=None):\n        self.val = val\n        self.next = next\n\nhead = Node(1, Node(2, Node(3)))\n\nprev, cur = None, head\nwhile cur:\n    nxt = cur.next\n    cur.next = prev\n    prev = cur\n    cur = nxt\nhead = prev\nprint(head.val, head.next.val, head.next.next.val)\n`,
    "Two-sum with a dict": `def two_sum(nums, target):\n    seen = {}                 # value -> index\n    for i, x in enumerate(nums):\n        need = target - x\n        if need in seen:\n            return [seen[need], i]\n        seen[x] = i\n    return []\n\nprint(two_sum([2, 7, 11, 15], 9))\n`,
    "Classes & objects": `class Account:\n    bank = "PyBank"              # class attribute (shared)\n    def __init__(self, owner, balance=0):\n        self.owner = owner       # instance attributes\n        self.balance = balance\n    def deposit(self, amount):\n        self.balance += amount\n        return self.balance\n\na = Account("Ada")\nb = Account("Linus", 50)\na.deposit(30)\nprint(a.balance, b.balance, a.bank)\n`,
    "Generators pause & resume": `def countdown(n):\n    while n > 0:\n        yield n\n        n -= 1\n\ng = countdown(3)\nprint(next(g))\nprint(next(g))\nfor x in g:\n    print("loop got", x)\n`,
    "Matplotlib: first plot": `import matplotlib.pyplot as plt\nxs = list(range(10))\nys = [x * x for x in xs]\nfig, ax = plt.subplots(figsize=(5, 3))\nax.plot(xs, ys, marker="o", color="#B3261E", label="x²")\nax.set_title("My first plot")\nax.set_xlabel("x"); ax.set_ylabel("y")\nax.legend()\nplt.show()\n`,
  };
  let pgViz = null;
  function pagePlayground() {
    renderSidebar("playground"); window.onscroll = null;
    app.innerHTML = `<div class="page wide playground"><div class="content" style="max-width:none">
      <h1>Visualiser playground</h1>
      <p class="lead">Write any Python and step through it line by line. On the left, the red arrow is the line about to run. On the right, <b>frames</b> hold your variable names and <b>objects</b> show the values they point to.</p>
      <p><label>Load an example: <select id="pgSample" style="font:inherit;padding:4px 8px;border-radius:8px;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink)">${Object.keys(SAMPLES).map(k => `<option>${esc(k)}</option>`).join("")}</select></label>
      <button class="btn small ghost" id="pgEdit">✎ Edit code</button></p>
      <div class="viz-body-inline" id="pgHost"></div>
      <div class="callout tip"><div class="ct"><span class="ic">Tip</span>Keyboard</div><p>Click inside the visualiser, then use <code>←</code> / <code>→</code> to step and <code>Space</code> to play or pause. In edit mode, <code>Ctrl</code>+<code>Enter</code> re-runs your code.</p></div>
    </div></div>`;
    if (pgViz) pgViz.destroy();
    pgViz = new Viz.Visualiser($("#pgHost"), { inline: true });
    pgViz.load(SAMPLES[Object.keys(SAMPLES)[0]]);
    $("#pgSample").onchange = e => { pgViz.editing = false; $("#pgEdit").textContent = "✎ Edit code"; pgViz.load(SAMPLES[e.target.value]); };
    $("#pgEdit").onclick = e => { e.target.textContent = pgViz.toggleEdit() ? "👣 Back to steps" : "✎ Edit code"; };
    $("#pgHost").tabIndex = 0;
    $("#pgHost").addEventListener("keydown", e => { if (!/TEXTAREA|SELECT|INPUT/.test(e.target.tagName) && pgViz.key(e)) e.preventDefault(); });
    window.scrollTo(0, 0);
  }

  function pageNotFound() {
    renderSidebar("");
    app.innerHTML = `<div class="page wide"><div class="content"><h1>Crumbs! Page not found.</h1><p><a href="#/">Back to home</a></p></div></div>`;
  }

  // ---------- glossary auto-linking + tooltip ----------
  const termMap = new Map();
  GLOSSARY.forEach(g => [g[0], ...g[1]].forEach(a => { if (a.length > 2 || /[A-Z]{2}/.test(a)) termMap.set(a.toLowerCase(), g); }));
  const termRe = new RegExp("(?<![\\w@*_.])(" + [...termMap.keys()].sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")(?![\\w(])", "i");
  function wireGlossary(root) {
    const seen = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.parentElement.closest("pre, code, a, h1, h2, h3, h4, .gl, button, summary, .quiz .opts, .lvl, .tags, th, .crumbs, .pill") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      let text = node.nodeValue; if (text.trim().length < 3) continue;
      const frag = document.createDocumentFragment(); let changed = false; let guard = 0;
      while (text && guard++ < 20) {
        const m = text.match(termRe); if (!m) break;
        const g = termMap.get(m[1].toLowerCase());
        if (!g || seen.has(g[0])) {
          frag.append(text.slice(0, m.index + m[0].length)); text = text.slice(m.index + m[0].length); continue;
        }
        seen.add(g[0]); changed = true;
        frag.append(text.slice(0, m.index));
        const span = document.createElement("span"); span.className = "gl"; span.dataset.term = g[0]; span.textContent = m[1]; span.tabIndex = 0;
        frag.append(span); text = text.slice(m.index + m[0].length);
      }
      if (changed) { frag.append(text); node.replaceWith(frag); }
    }
  }
  const tip = $("#tooltip");
  function showTip(el) {
    const g = GLOSSARY.find(x => x[0] === el.dataset.term); if (!g) return;
    tip.innerHTML = `<b>${esc(g[0])}</b>${esc(g[2])}<i>Technically: ${esc(g[3])}</i>`; tip.hidden = false;
    const r = el.getBoundingClientRect(); const tw = Math.min(320, innerWidth - 24);
    tip.style.left = Math.max(12, Math.min(r.left, innerWidth - tw - 12)) + "px";
    const below = r.bottom + 8; tip.style.top = (below + tip.offsetHeight > innerHeight ? r.top - tip.offsetHeight - 8 : below) + "px";
  }
  document.addEventListener("mouseover", e => { const el = e.target.closest(".gl"); if (el) showTip(el); });
  document.addEventListener("mouseout", e => { if (e.target.closest(".gl")) tip.hidden = true; });
  document.addEventListener("focusin", e => { const el = e.target.closest && e.target.closest(".gl"); if (el) showTip(el); });
  document.addEventListener("focusout", () => (tip.hidden = true));
  window.addEventListener("scroll", () => (tip.hidden = true), { passive: true });

  // ---------- delegated clicks in content ----------
  app.addEventListener("click", e => {
    const go = e.target.closest("[data-go]");
    if (go) { e.preventDefault(); document.getElementById(go.dataset.go)?.scrollIntoView({ behavior: "smooth" }); return; }
    const gl = e.target.closest(".gl"); if (gl) { tip.hidden ? showTip(gl) : (tip.hidden = true); return; }
    const btn = e.target.closest(".code button");
    if (btn) {
      const box = btn.closest(".code"); const entry = CODE_REGISTRY[+box.dataset.idx];
      if (btn.dataset.act === "copy") {
        navigator.clipboard?.writeText(entry.code).then(() => { btn.textContent = "Copied ✓"; setTimeout(() => (btn.textContent = "Copy"), 1200); });
      } else if (btn.dataset.act === "viz") {
        Viz.open(entry.code);
      } else if (btn.dataset.act === "full") {
        Viz.open(box._code, box._result);
      } else if (btn.dataset.act === "edit") {
        showTab(box, "viz", false);
        const viz = cardViz.get(box);
        if (viz && !viz.editing) { viz.toggleEdit(); btn.textContent = "👣 Back to steps"; }
        else if (viz) { viz.toggleEdit(); btn.textContent = "✎ Edit & run"; }
      } else if (btn.dataset.act === "run") {
        let out = box.querySelector(".run-out");
        if (!out) { out = document.createElement("div"); out.className = "run-out"; box.append(out); }
        Viz.runInline(entry.code, out);
      }
      return;
    }
    const opt = e.target.closest(".quiz button.opt");
    if (opt) {
      const quiz = opt.closest(".quiz"); if (quiz.classList.contains("answered")) return;
      quiz.classList.add("answered");
      $$("button.opt", quiz).forEach(b => { if (b.dataset.right === "true") b.classList.add("right"); });
      if (opt.dataset.right !== "true") opt.classList.add("wrong");
      return;
    }
    const f = e.target.closest(".filter-btn");
    if (f) {
      $$(".filter-btn").forEach(b => b.classList.toggle("on", b === f));
      const v = f.dataset.filter;
      $$(".problem").forEach(p => { p.hidden = !(v === "all" || (v === "unsolved" ? !p.classList.contains("solved") : p.dataset.level === v)); });
    }
  });
  app.addEventListener("change", e => {
    const cb = e.target.closest(".problem input[type=checkbox], .program input[type=checkbox]"); if (!cb) return;
    cb.checked ? solved.add(cb.dataset.pid) : solved.delete(cb.dataset.pid); saveSolved();
    cb.closest(".problem, .program").classList.toggle("solved", cb.checked); updateSolvedCount();
  });

  // ---------- write-a-program cards: editor, tests, visualise ----------
  const pyStr = s => JSON.stringify(s);                 // JSON string literals are valid Python strings
  const HARNESS = "import ast as _pn_ast\ndef raises(_exc, _fn, *_a, **_k):\n    try:\n        _fn(*_a, **_k)\n    except _exc as _e:\n        return str(_e) or True\n    return False\n_pn_pass = _pn_total = 0\n_pn_failed = []\nfor _pn_node in _pn_ast.parse(_pn_src).body:\n    _pn_text = _pn_ast.get_source_segment(_pn_src, _pn_node)\n    _pn_code = compile(_pn_ast.Module([_pn_node], []), \"<tests>\", \"exec\")\n    if not isinstance(_pn_node, _pn_ast.Assert):\n        try:\n            exec(_pn_code, globals())\n        except Exception as _pn_e:\n            _pn_failed.append(_pn_text)\n            print(\"ERROR \" + _pn_text.splitlines()[0] + \"\\n      \" + type(_pn_e).__name__ + \": \" + str(_pn_e))\n        continue\n    _pn_total += 1\n    try:\n        exec(_pn_code, globals())\n        print(\"PASS  \" + _pn_text); _pn_pass += 1\n    except AssertionError:\n        _pn_got = \"\"\n        _pn_t = _pn_node.test\n        if isinstance(_pn_t, _pn_ast.Compare) and len(_pn_t.ops) == 1 and isinstance(_pn_t.ops[0], _pn_ast.Eq):\n            try:\n                _pn_got = \"\\n      got: \" + repr(eval(_pn_ast.get_source_segment(_pn_src, _pn_t.left), globals()))\n            except Exception:\n                pass\n        _pn_failed.append(_pn_text)\n        print(\"FAIL  \" + _pn_text + _pn_got)\n    except Exception as _pn_e:\n        _pn_failed.append(_pn_text)\n        print(\"ERROR \" + _pn_text + \"\\n      \" + type(_pn_e).__name__ + \": \" + str(_pn_e))\nprint(f\"SUMMARY {_pn_pass}/{_pn_total}\")\n";
  const testHarness = (src) => "_pn_src = " + JSON.stringify(src) + "\n" + HARNESS;

  app.addEventListener("click", async e => {
    const b = e.target.closest(".program [data-pa]"); if (!b) return;
    const card = b.closest(".program"); const entry = PROGRAM_REGISTRY[+card.dataset.prog];
    const ta = card.querySelector("textarea"); const out = card.querySelector(".test-out");
    if (b.dataset.pa === "reset") { ta.value = entry.starter; store.set("pn-code-" + entry.pid, null); out.hidden = true; return; }
    if (b.dataset.pa === "viz") {
      const helper = entry.testsSrc.includes("raises(") ? "def raises(_exc, _fn, *_a, **_k):\n    try:\n        _fn(*_a, **_k)\n    except _exc as _e:\n        return str(_e) or True\n    return False\n\n" : "";
      Viz.open(helper + ta.value.replace(/\s+$/, "") + "\n\n# --- the tests (a failing assert stops the program) ---\n" + entry.testsSrc + "\n");
      return;
    }
    out.hidden = false;
    out.innerHTML = `<span class="muted">Running tests…</span>`;
    store.set("pn-code-" + entry.pid, ta.value);
    try {
      const r = await Viz.execute(ta.value + "\n" + testHarness(entry.testsSrc), "run");
      const lines = r.stdout.split("\n");
      const sum = lines.find(l => l.startsWith("SUMMARY ")) || "";
      let html = lines.filter(l => !l.startsWith("SUMMARY ")).map(l =>
        l.startsWith("PASS") ? `<span class="pass">✔ ${esc(l.slice(6))}</span>` :
        l.startsWith("FAIL") || l.startsWith("ERROR") ? `<span class="fail">✘ ${esc(l.slice(6))}</span>` : esc(l)).join("\n");
      if (r.error) html += `\n<span class="fail">${esc(r.error)}${r.errLine ? ` (line ${r.errLine})` : ""}</span>`;
      const [pass, total] = (sum.match(/(\d+)\/(\d+)/) || [0, 0, 0]).slice(1).map(Number);
      const all = total > 0 && pass === total && !r.error;
      html += `<span class="sum">${all ? "🎉 All tests passed! Marked as solved." : total ? `${pass}/${total} tests passed. Keep going!` : "Your code didn't finish running. Check the error above."}</span>`;
      if (r.figures && r.figures.length) html += `<div class="test-figs"><b>📊 Your chart</b>${r.figures.map(b => `<img alt="your chart" src="data:image/png;base64,${b}">`).join("")}</div>`;
      out.innerHTML = html;
      if (all) {
        const cb = card.querySelector("input[type=checkbox]");
        cb.checked = true; solved.add(entry.pid); saveSolved(); card.classList.add("solved"); updateSolvedCount();
      }
    } catch (err) { out.innerHTML = `<span class="fail">${esc(err.message)}</span>`; }
  });
  app.addEventListener("keydown", e => {
    const ta = e.target.closest(".program textarea"); if (!ta) return;
    if (e.key === "Tab") { e.preventDefault(); ta.setRangeText("    ", ta.selectionStart, ta.selectionEnd, "end"); }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ta.closest(".program").querySelector("[data-pa=test]").click(); }
  });

  // ---------- search ----------
  const sInput = $("#searchInput"), sRes = $("#searchResults"); let sActive = -1;
  function doSearch(q) {
    q = q.trim().toLowerCase();
    if (!q) { sRes.hidden = true; return; }
    const words = q.split(/\s+/);
    const pool = [
      ...ALL_TOPICS.map(t => ({ kind: "Chapter", title: t.title, sub: t.desc, href: `#/t/${t.slug}`, text: t.title + " " + t.desc })),
      ...GLOSSARY.map(g => ({ kind: "Term", title: g[0], sub: g[2], href: `#/glossary`, text: g[0] + " " + g[1].join(" ") + " " + g[2] })),
      ...((INDEX && INDEX.entries) || []).map(en => ({ kind: en.k, title: en.t, sub: en.topic, href: `#/t/${en.s}?s=${en.a}`, text: en.t + " " + (en.x || "") + " " + en.topic })),
    ];
    const scored = pool.map(it => {
      const T = it.title.toLowerCase(), X = it.text.toLowerCase();
      if (!words.every(w => X.includes(w))) return null;
      let sc = 0; if (T === q) sc += 100; if (T.startsWith(q)) sc += 40; if (T.includes(q)) sc += 20;
      sc += { Chapter: 15, Term: 6, Section: 8, Problem: 5 }[it.kind] || 0; sc -= T.length / 40;
      return { it, sc };
    }).filter(Boolean).sort((a, b) => b.sc - a.sc).slice(0, 14);
    sActive = -1;
    sRes.innerHTML = scored.length ? scored.map(({ it }) => `<a href="${it.href}">${esc(it.title)}<small>${esc(it.kind)} · ${esc((it.sub || "").slice(0, 90))}</small></a>`).join("") : `<div class="empty">No matches for “${esc(q)}”.</div>`;
    sRes.hidden = false;
  }
  sInput.addEventListener("input", () => doSearch(sInput.value));
  sInput.addEventListener("focus", () => sInput.value && doSearch(sInput.value));
  sInput.addEventListener("keydown", e => {
    const links = $$("a", sRes);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); sActive = (sActive + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
      links.forEach((a, i) => a.classList.toggle("active", i === sActive));
    } else if (e.key === "Enter") { const a = links[sActive] || links[0]; if (a) { location.hash = a.getAttribute("href"); sRes.hidden = true; sInput.blur(); } }
    else if (e.key === "Escape") { sRes.hidden = true; sInput.blur(); }
  });
  sRes.addEventListener("click", e => { if (e.target.closest("a")) { sRes.hidden = true; sInput.value = ""; } });
  document.addEventListener("click", e => { if (!e.target.closest(".search")) sRes.hidden = true; });
  document.addEventListener("keydown", e => {
    if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && $("#viz").hidden) { e.preventDefault(); sInput.focus(); }
  });

  // ---------- router ----------
  function route() {
    const h = location.hash || "#/";
    const [path, qs] = h.slice(1).split("?");
    const params = new URLSearchParams(qs || "");
    tip.hidden = true;
    if (pgViz && !path.startsWith("/playground")) { pgViz.destroy(); pgViz = null; }
    const parts = path.split("/").filter(Boolean);
    if (!parts.length) { window.onscroll = null; return pageHome(); }
    if (parts[0] === "t" && parts[1]) return pageTopic(parts[1], params.get("s"));
    if (parts[0] === "glossary") return pageGlossary();
    if (parts[0] === "playground") return pagePlayground();
    return pageNotFound();
  }
  window.addEventListener("hashchange", route);
  route();
})();
