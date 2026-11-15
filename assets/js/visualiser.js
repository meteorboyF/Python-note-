// Step-by-step visualiser: drives the Pyodide worker and draws each step.
(function () {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------------- worker pool (one worker, restarted on timeout) ----------------
  let worker = null, ready = false, nextId = 1;
  const pending = new Map();
  const statusListeners = new Set();
  const TIMEOUT_MS = 25000;

  function emitStatus(msg) { statusListeners.forEach(fn => fn(msg)); }
  function getWorker() {
    if (worker) return worker;
    worker = new Worker("assets/js/tracer-worker.js?v=6", { type: "module" });
    ready = false;
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === "ready") { ready = true; emitStatus("Python ready"); return; }
      if (m.type === "fatal") { emitStatus("Could not load Python: " + m.msg); pending.forEach(p => p.reject(new Error(m.msg))); pending.clear(); return; }
      if (m.type === "status") { emitStatus(m.msg); return; }
      const p = pending.get(m.id); if (!p) return;
      if (m.type === "running") { p.startTimer(); emitStatus("Running…"); return; }
      if (m.type === "result") {
        clearTimeout(p.timer); pending.delete(m.id);
        if (m.error) p.reject(new Error(m.error)); else p.resolve(JSON.parse(m.json));
      }
    };
    worker.onerror = (e) => emitStatus("Worker error: " + e.message);
    return worker;
  }
  function execute(code, mode = "trace", stdin = "") {
    const w = getWorker(); const id = nextId++;
    return new Promise((resolve, reject) => {
      const p = { resolve, reject, timer: null };
      p.startTimer = () => {
        p.timer = setTimeout(() => {
          pending.delete(id); worker.terminate(); worker = null; ready = false;
          pending.forEach(q => q.reject(new Error("restarted"))); pending.clear();
          reject(new Error(`Stopped: the code ran longer than ${TIMEOUT_MS / 1000}s (infinite loop?)`));
        }, TIMEOUT_MS);
      };
      pending.set(id, p);
      w.postMessage({ id, code, mode, stdin });
    });
  }

  // ---------------- value helpers ----------------
  function short(enc, heap, depth = 0) {
    if (!enc) return "";
    if (enc[0] === "P") return enc[1];
    const o = heap[enc[1]]; if (!o) return "…";
    if (depth > 2) return "…";
    const items = (o.v || []);
    switch (o.t) {
      case "list": case "tuple": case "set": {
        const inner = items.map(x => short(x, heap, depth + 1)).join(", ") + (o.more ? ", …" : "");
        if (o.t === "list") return o.c === "list" ? `[${inner}]` : `${o.c}([${inner}])`;
        if (o.t === "tuple") return items.length === 1 ? `(${inner},)` : `(${inner})`;
        return items.length ? `{${inner}}` : "set()";
      }
      case "dict": return (o.c !== "dict" ? o.c : "") + "{" + items.map(([k, v]) => `${short(k, heap, depth + 1)}: ${short(v, heap, depth + 1)}`).join(", ") + (o.more ? ", …" : "") + "}";
      case "obj": return o.cls ? o.c : `${o.c}(${items.map(([k, v]) => `${k}=${short(v, heap, depth + 1)}`).join(", ")})`;
      case "func": return `function ${o.s}`;
      case "grid": return o.d === 2 ? `[${o.v.map(r => `[${r.join(" ")}]`).join(" ")}]` : `[${(o.v[0] || []).join(" ")}]`;
      case "table": return `${o.c}`;
      default: return String(o.s || o.c || "").split("\n")[0].slice(0, 60);
    }
  }
  const clip = (s, n = 60) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

  // ---------------- precomputed traces (tools/build-traces.py) ----------------
  // Heaps and frames are stored as changes vs the previous step; rebuild full ones.
  function undelta(r) {
    if (!r || r._full) return r;
    let heap = {}, frames = new Map();
    for (const st of r.steps) {
      heap = Object.assign({}, heap, st.h);
      (st.g || []).forEach(k => delete heap[k]);
      st.h = heap; delete st.g;
      const cur = new Map();
      st.f = st.f.map(fr => {
        let full = fr;
        if (fr.n === undefined) {
          const old = frames.get(fr.id) || { n: "?", v: [] };
          const gone = new Set(fr.x || []);
          const v = old.v.filter(([k]) => !gone.has(k)).map(x => x.slice());
          (fr.d || []).forEach(([k, val]) => { const j = v.findIndex(x => x[0] === k); if (j >= 0) v[j] = [k, val]; else v.push([k, val]); });
          full = { n: old.n, id: fr.id, v };
          if (old.k) full.k = old.k;
        }
        cur.set(full.id, full);
        return full;
      });
      frames = cur;
    }
    r._full = true;
    return r;
  }

  // ---------------- reading the source ----------------
  const indentOf = l => (l.match(/^\s*/) || [""])[0].replace(/\t/g, "    ").length;
  const stripComment = l => l.replace(/\s+#.*$/, "");
  function blockEnd(lines, n) {             // last line of the indented block under header line n
    const ind = indentOf(lines[n - 1] || ""); let last = n;
    for (let j = n + 1; j <= lines.length; j++) {
      const l = lines[j - 1];
      if (!l.trim() || /^\s*#/.test(l)) continue;
      if (indentOf(l) > ind) last = j; else break;
    }
    return last;
  }
  function kindOf(code) {
    const c = stripComment(code).trim();
    const header = c.endsWith(":");
    let m;
    if ((m = c.match(/^(async\s+)?for\s+(.+?)\s+in\s+(.+):$/))) return { k: "for", target: m[2], iter: m[3] };
    if ((m = c.match(/^while\s+(.+):$/))) return { k: "while", cond: m[1] };
    if ((m = c.match(/^(if|elif)\s+(.+):$/))) return { k: m[1], cond: m[2] };
    if ((m = c.match(/^(async\s+)?def\s+(\w+)/))) return { k: "def", name: m[2] };
    if ((m = c.match(/^class\s+(\w+)/))) return { k: "class", name: m[1] };
    if (/^(import|from)\s/.test(c)) return { k: "import" };
    if (/^return\b/.test(c)) return { k: "return" };
    if (/^(yield)\b/.test(c)) return { k: "yield" };
    if (/^with\s/.test(c) && header) return { k: "with" };
    if (/^try\s*:$/.test(c)) return { k: "try" };
    if (/^except\b/.test(c)) return { k: "except" };
    if (/^raise\b/.test(c)) return { k: "raise" };
    if (/^assert\b/.test(c)) return { k: "assert" };
    if (/^(break|continue|pass)\b/.test(c)) return { k: c.split(/\W/)[0] };
    if (/^print\(/.test(c)) return { k: "print" };
    if (/^@/.test(c)) return { k: "decorator" };
    return { k: header ? "block" : "stmt" };
  }
  const topOf = st => st.f[st.f.length - 1];

  // variables of frame `id` that differ between two steps
  function frameDiff(p, s, id) {
    const pf = p.f.find(f => f.id === id), sf = s.f.find(f => f.id === id);
    if (!pf || !sf) return [];
    const before = new Map(pf.v.map(([k, v]) => [k, v]));
    const out = [];
    for (const [k, v] of sf.v) {
      const was = before.get(k);
      const now = short(v, s.h);
      if (was === undefined) { out.push({ k, now, kind: "new", ref: v[0] === "R" ? v[1] : null }); continue; }
      const old = short(was, p.h);
      if (was[0] === "R" && v[0] === "R" && was[1] === v[1]) {
        if (old !== now) out.push({ k, old, now, kind: "mutated", ref: v[1] });
      } else if (old !== now || was[0] !== v[0] || was[1] !== v[1]) {
        out.push({ k, old, now, kind: was[0] === "R" && v[0] === "R" ? "rebound" : "changed" });
      }
    }
    for (const k of before.keys()) if (!sf.v.some(([kk]) => kk === k)) out.push({ k, kind: "deleted" });
    return out;
  }
  const isCallableTxt = t => /^(function|class) /.test(t);

  // What did executing steps[i-1] do? Returns {head, fx[], kind, outcome}
  function effectOf(steps, i, lines, stdout) {
    const p = steps[i - 1], s = steps[i];
    const code = (lines[p.l - 1] || "").trim();
    const top = topOf(p);
    const fx = []; let head = "", outcome = null;
    const K = kindOf(code);
    const diffs = top ? frameDiff(p, s, top.id) : [];
    const printed = s.o > p.o ? stdout.slice(p.o, s.o) : "";
    const callsInto = s.e === "call" && s.f.length > p.f.length;
    if (top && top.k === "class" && (p.e === "call" || p.e === "return")) {
      head = p.e === "call"
        ? `🏗️ Running the body of <b>class ${esc(top.n)}</b>: each name it defines (attributes, methods) is collected into the class's namespace.`
        : `🏗️ The class body finished. Python now builds the <b>class object ${esc(top.n)}</b> from the collected names and binds it to that name.`;
      return { head, fx, kind: "classbody" };
    }
    if (p.e === "call") {
      const args = top ? top.v.filter(([, v]) => !isCallableTxt(short(v, p.h))).map(([k, v]) => `<code>${esc(k)} = ${esc(clip(short(v, p.h), 40))}</code>`) : [];
      head = `📞 Entered <b>${esc(top ? top.n : "?")}()</b>${args.length ? " with " + args.join(", ") : ""}. A new <i>frame</i> (its own box of local variables) was created${p.f.length > 2 ? `: <b>${p.f.length - 1} calls deep</b> on the call stack` : ""}.`;
      return { head, fx, kind: "call" };
    }
    if (p.e === "return") {
      const isInit = top && /(^|\.)__init__$/.test(top.n);
      head = `↩️ <b>${esc(top ? top.n : "?")}()</b> returned <code>${esc(clip(short(p.r, p.h), 60))}</code>. Its frame is thrown away and the caller continues.`
        + (isInit ? ` (<code>__init__</code> always returns None; the <i>call</i> <code>${esc(top.n.split(".")[0])}(...)</code> hands back the new object.)` : "");
      const caller = topOf(s);
      if (caller && p.f.some(f => f.id === caller.id)) {
        frameDiff(p, s, caller.id).forEach(d => {
          if (d.kind === "new") fx.push(`🆕 back in <b>${esc(caller.n === "Global frame" ? "the main program" : caller.n)}</b>: <code>${esc(d.k)}</code> → <code>${esc(clip(d.now, 50))}</code>`);
          else if (d.kind === "changed" || d.kind === "rebound") fx.push(`✏️ back in the caller: <code>${esc(d.k)}</code> → <code>${esc(clip(d.now, 50))}</code>`);
        });
      }
      if (printed) fx.push(`🖨️ printed <code>${esc(clip(printed.replace(/\n$/, "").replace(/\n/g, "⏎"), 70))}</code>`);
      return { head, fx, kind: "return" };
    }
    if (p.e === "exception") {
      head = `💥 Raised <code>${esc(p.x)}</code>. Python unwinds until an <code>except</code> catches it.`;
      return { head, fx, kind: "exception" };
    }
    const sameFrame = s.f.some(f => top && f.id === top.id) && !callsInto && topOf(s) && topOf(s).id === (top && top.id);
    const inside = sameFrame && s.l > p.l && s.l <= blockEnd(lines, p.l);
    if (callsInto && topOf(s).k === "class") {
      head = `🏗️ A <code>class</code> statement: Python is about to run the class body to collect its attributes and methods.`;
    } else if (callsInto) {
      head = `📞 This line calls <b>${esc(topOf(s).n)}()</b>, so Python pauses here and jumps into it.`;
    } else if (K.k === "for") {
      const loopVars = diffs.filter(d => d.kind !== "mutated");
      if (inside) { outcome = "item"; head = `🔁 <b>Loop:</b> took the next item from <code>${esc(clip(K.iter, 40))}</code>${loopVars.length ? ` → ${loopVars.map(d => `<code>${esc(d.k)} = ${esc(clip(d.now, 30))}</code>`).join(", ")}` : ""}, and enters the loop body.`; }
      else { outcome = "done"; head = `🏁 <b>Loop finished:</b> <code>${esc(clip(K.iter, 40))}</code> has no more items, so Python continues after the loop.`; }
    } else if (K.k === "while" || K.k === "if" || K.k === "elif") {
      outcome = inside ? "T" : "F";
      head = inside
        ? `✅ Condition <code>${esc(clip(K.cond, 50))}</code> is <b>True</b> → ${K.k === "while" ? "run the loop body (again)" : "run the indented block"}.`
        : `❌ Condition <code>${esc(clip(K.cond, 50))}</code> is <b>False</b> → ${K.k === "while" ? "the loop ends" : "skip the indented block"}.`;
    } else if (K.k === "def") {
      head = `🧩 Defined function <code>${esc(K.name)}</code>. The function object is stored under that name; its body runs only when it's <i>called</i>.`;
    } else if (K.k === "class" && top && top.k === "class" && top.n.split(".").pop() === K.name) {
      head = `🏗️ The class body starts. Python notes the class's name and module, then runs the indented lines one by one.`;
    } else if (/^[rbfu]?["'].*["']$/i.test(stripComment(code)) && !diffs.length) {
      head = `📝 A <b>docstring</b>: a string literal as the first statement becomes the <code>__doc__</code> (help text). It changes nothing else.`;
    } else if (K.k === "class") {
      head = `🏗️ Built class <code>${esc(K.name)}</code>: its body ran once and the methods/attributes were collected into a class object.`;
    } else if (K.k === "import") {
      head = `📦 Imported a module, so its names are now available.`;
    } else if (K.k === "decorator") {
      head = `🎀 A decorator line: the function defined below will be passed through it.`;
    } else if (K.k === "assert") {
      head = `✔️ The assertion held (it was True), so execution simply continues.`;
    } else if (K.k === "break") head = `⛔ <code>break</code>: jump out of the innermost loop right now.`;
    else if (K.k === "continue") head = `⏭️ <code>continue</code>: skip the rest of this iteration and go back to the loop header.`;
    else if (K.k === "pass") head = `🫥 <code>pass</code> does nothing. It's a placeholder.`;
    else if (K.k === "try") head = `🛡️ Entering a <code>try</code> block: errors raised inside can be caught below.`;
    else if (K.k === "except") head = `🧯 The exception matched this <code>except</code>, so the handler runs.`;
    else if (K.k === "with") head = `🚪 <code>with</code> called <code>__enter__</code> on the context manager. <code>__exit__</code> is guaranteed to run when the block ends.`;
    // effects
    const sf = top && s.f.find(f => f.id === top.id);
    const refOf = k => { const x = sf && sf.v.find(([kk]) => kk === k); return x && x[1][0] === "R" ? x[1][1] : null; };
    const mutatedRefs = new Set();
    for (const d of diffs) {
      if (K.k === "for" && outcome === "item" && d.kind !== "mutated") continue;
      if (d.kind === "mutated") {
        if (mutatedRefs.has(d.ref)) continue;
        mutatedRefs.add(d.ref);
        const names = sf.v.filter(([, v]) => v[0] === "R" && v[1] === d.ref).map(([k]) => `<code>${esc(k)}</code>`);
        fx.push(`🛠️ The object was changed <b>in place</b>: <code>${esc(clip(d.old, 34))}</code> → <code>${esc(clip(d.now, 34))}</code>.${names.length > 1 ? ` ${names.join(" and ")} all point to it, so they <b>all</b> see the change.` : ` (${names[0] || ""} still points to the same object.)`}`);
        continue;
      }
      if ((d.kind === "new" || d.kind === "rebound" || d.kind === "changed") && refOf(d.k) != null) {
        const others = sf.v.filter(([k, v]) => k !== d.k && v[0] === "R" && v[1] === refOf(d.k)).map(([k]) => `<code>${esc(k)}</code>`);
        if (others.length && !isCallableTxt(d.now || "")) { fx.push(`🔗 <code>${esc(d.k)}</code> now points to the <b>same object</b> as ${others.join(", ")} (no copy was made): <code>${esc(clip(d.now, 40))}</code>`); continue; }
      }
      if (isCallableTxt(d.now || "") && (K.k === "def" || K.k === "class" || K.k === "decorator")) continue;
      if (d.kind === "new") fx.push(`🆕 new name <code>${esc(d.k)}</code> → <code>${esc(clip(d.now, 50))}</code>`);
      else if (d.kind === "changed") fx.push(`✏️ <code>${esc(d.k)}</code>: <code>${esc(clip(d.old, 30))}</code> → <code>${esc(clip(d.now, 30))}</code>`);
      else if (d.kind === "rebound") fx.push(`🔀 <code>${esc(d.k)}</code> now refers to a <b>different object</b>: <code>${esc(clip(d.now, 40))}</code>`);
      else if (d.kind === "deleted") fx.push(`🗑️ <code>${esc(d.k)}</code> was deleted`);
    }
    if (printed) fx.push(`🖨️ printed <code>${esc(clip(printed.replace(/\n$/, "").replace(/\n/g, "⏎"), 70))}</code>`);
    if (!head) head = fx.length ? "" : `Ran it. Nothing visible changed (no variable or output changed).`;
    return { head, fx, kind: K.k, outcome, diffs, printed };
  }

  // ---------------- the line-by-line breakdown ----------------
  function breakdown(code, result) {
    const r = undelta(result), steps = r.steps;
    const lines = code.replace(/\s+$/, "").split("\n");
    const info = lines.map(() => ({ runs: 0, vars: new Map(), T: 0, F: 0, items: 0, done: 0, printed: [], calls: new Map(), rets: [], mut: new Map() }));
    for (let i = 1; i < steps.length; i++) {
      const p = steps[i - 1]; const L = info[p.l - 1]; if (!L) continue;
      if (p.e === "line") L.runs++;
      if (p.e === "return") { if (!(topOf(p) && topOf(p).k === "class")) L.rets.push(clip(short(p.r, p.h), 24)); continue; }
      if (p.e !== "line") continue;
      const ef = effectOf(steps, i, lines, r.stdout);
      if (ef.outcome === "T") L.T++; else if (ef.outcome === "F") L.F++; else if (ef.outcome === "item") L.items++; else if (ef.outcome === "done") L.done++;
      const s = steps[i];
      if (s.e === "call" && s.f.length > p.f.length && topOf(s).k !== "class") { const n = topOf(s).n; L.calls.set(n, (L.calls.get(n) || 0) + 1); }
      (ef.diffs || []).forEach(d => {
        if (d.kind === "deleted" || isCallableTxt(d.now || "")) return;
        const map = d.kind === "mutated" ? L.mut : L.vars;
        const seq = map.get(d.k) || []; const v = clip(d.now, 22);
        if (seq.at(-1) !== v) seq.push(v); map.set(d.k, seq);
      });
      if (ef.printed) L.printed.push(clip(ef.printed.replace(/\n$/, "").replace(/\n/g, "⏎"), 30));
    }
    const fmtSeq = seq => (seq.length > 7 ? [...seq.slice(0, 3), "…", ...seq.slice(-3)] : seq).map(v => v === "…" ? "…" : `<code>${esc(v)}</code>`).join(" → ");
    const rows = lines.map((src, j) => {
      const L = info[j]; const n = j + 1; const t = src.trim();
      if (!t || t.startsWith("#")) return "";
      const K = kindOf(t); const bits = [];
      if (K.k === "for") { if (L.items) bits.push(`🔁 looped <b>${L.items}×</b>`); if (L.done) bits.push(`then finished`); }
      if (K.k === "while" || K.k === "if" || K.k === "elif") { if (L.T) bits.push(`✅ True ×${L.T}`); if (L.F) bits.push(`❌ False ×${L.F}`); }
      if (K.k === "def" && L.runs) bits.push(`🧩 defines <code>${esc(K.name)}</code>`);
      if (K.k === "class" && L.runs) bits.push(`🏗️ builds class <code>${esc(K.name)}</code>`);
      L.calls.forEach((c, name) => bits.push(`📞 calls <b>${esc(name)}()</b>${c > 1 ? ` ×${c}` : ""}`));
      L.vars.forEach((seq, k) => bits.push(`<code>${esc(k)}</code>: ${fmtSeq(seq)}`));
      L.mut.forEach((seq, k) => bits.push(`🛠️ <code>${esc(k)}</code> changed in place: ${fmtSeq(seq)}`));
      if (L.printed.length) bits.push(`🖨️ printed ${L.printed.slice(0, 4).map(x => `<code>${esc(x)}</code>`).join(", ")}${L.printed.length > 4 ? ` +${L.printed.length - 4} more` : ""}`);
      if (L.rets.length) bits.push(`↩️ returned ${[...new Set(L.rets)].slice(0, 4).map(x => `<code>${esc(x)}</code>`).join(", ")}`);
      if (r.errLine === n && r.error) bits.push(`<span class="bd-err">💥 ${esc(r.error)}</span>`);
      const never = !L.runs && !L.rets.length && !(r.errLine === n);
      const runs = L.runs > 1 ? `<span class="runs hot">${L.runs}×</span>` : L.runs ? `<span class="runs">1×</span>` : `<span class="runs zero">0×</span>`;
      return `<tr class="${never ? "never" : ""}"><td class="ln">${n}</td><td class="src"><code>${esc(src)}</code>${(r.stx && r.stx[String(n)] || []).map(x => `<div class="bd-note">📖 ${esc(x)}</div>`).join("")}</td><td>${runs}</td><td class="what">${never ? `<span class="muted">${/^(else|finally)\b/.test(t) ? "branch marker (no step of its own)" : "never ran"}</span>` : bits.join("<br>") || `<span class="muted">ran</span>`}</td></tr>`;
    }).join("");
    return `<p class="bd-help">Every line with what its syntax means (📖), how many times it ran, and what it did: values each name took (in order), branch decisions and printed text.${r.truncated ? ` <b>Only the first ${steps.length} steps are counted.</b>` : ""}</p>
      <div class="bd-wrap"><table class="bd"><thead><tr><th>#</th><th>Code</th><th>Ran</th><th>What happened</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // ---------------- rendering ----------------
  function valCell(enc, cls = "") {
    if (!enc) return "";
    if (enc[0] === "P") return `<span class="pv ${cls}">${esc(enc[1])}</span>`;
    return `<span class="ptr ${cls}" data-to="${enc[1]}" title="reference to object #${enc[1]}"></span>`;
  }

  function renderObj(h, o, fresh, prev) {
    const head = `<div class="oh">${esc(o.c)} <span class="muted">#${h}</span></div>`;
    const cls = `vz-obj ${o.t}${o.cls ? "" : o.t === "obj" ? " instance" : ""}${fresh ? " fresh" : ""}`;
    if (o.t === "grid") {
      const pv = prev && prev.t === "grid" && prev.v.length === o.v.length ? prev.v : null;
      const rows = o.v.map((r, i) => `<tr>${o.d === 2 ? `<th>${i}</th>` : ""}${r.map((x, j) => `<td class="${pv && pv[i] && pv[i][j] !== x ? "chg" : ""}">${esc(x)}</td>`).join("")}</tr>`).join("");
      const hdr = `<tr>${o.d === 2 ? "<th></th>" : ""}${(o.v[0] || []).map((_, j) => `<th>${j}</th>`).join("")}</tr>`;
      return `<div class="${cls}" id="o-${h}">${head}<div class="box gridbox"><table>${hdr}${rows}</table></div></div>`;
    }
    if (o.t === "table") {
      const hdr = `<tr><th></th>${o.cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr>`;
      const rows = o.rows.map((r, i) => `<tr><th>${esc(o.idx[i])}</th>${r.map(x => `<td>${esc(x)}</td>`).join("")}</tr>`).join("");
      return `<div class="${cls}" id="o-${h}">${head}<div class="box gridbox df"><table>${hdr}${rows}</table></div></div>`;
    }
    if (o.t === "list" || o.t === "tuple" || o.t === "set") {
      const items = o.v || [];
      if (!items.length) return `<div class="${cls}" id="o-${h}">${head}<div class="cells empty">empty</div></div>`;
      const nums = o.t !== "set" && items.length >= 2 && items.every(x => x[0] === "P" && /^-?\d+(\.\d+)?$/.test(x[1])) ? items.map(x => +x[1]) : null;
      const maxAbs = nums ? Math.max(...nums.map(Math.abs), 1e-9) : 1;
      const bar = (i) => nums ? `<div class="barwrap"><div class="vbar${nums[i] < 0 ? " neg" : ""}" style="height:${Math.max(2, Math.round(34 * Math.abs(nums[i]) / maxAbs))}px"></div></div>` : "";
      const cells = items.map((x, i) => `<div class="cell">${bar(i)}${o.t === "set" ? "" : `<div class="i">${i}</div>`}<div class="val">${valCell(x)}</div></div>`).join("");
      return `<div class="${cls}" id="o-${h}">${head}<div class="cells">${cells}${o.more ? `<div class="cell"><div class="val">+${o.more}</div></div>` : ""}</div></div>`;
    }
    if (o.t === "dict" || o.t === "obj") {
      const rows = (o.v || []).map(([k, v]) => `<tr><td class="k">${o.t === "dict" ? valCell(k) : esc(k)}</td><td>${valCell(v)}</td></tr>`).join("");
      return `<div class="${cls}" id="o-${h}">${head}<div class="box">${rows ? `<table>${rows}</table>` : `<div class="cells empty" style="border:0">empty</div>`}</div></div>`;
    }
    return `<div class="${cls}" id="o-${h}">${head}<div class="box">${esc(o.s)}</div></div>`;
  }

  const childRef = (o, name) => {
    const a = (o.v || []).find(x => x[0] === name);
    return a && a[1][0] === "R" ? a[1][1] : null;
  };
  const isTree = (o) => o && o.t === "obj" && !o.cls && (o.v || []).some(x => x[0] === "left") && (o.v || []).some(x => x[0] === "right");

  // a binary tree is drawn as nested boxes: node on top, children side by side below
  function renderTree(h, step, prevHeap, placed) {
    placed.add(h);
    const o = step.h[h];
    const kids = ["left", "right"].map(k => {
      const r = childRef(o, k);
      if (r == null || placed.has(r) || !isTree(step.h[r])) return `<div class="vt-kid vt-empty"></div>`;
      return `<div class="vt-kid">${renderTree(r, step, prevHeap, placed)}</div>`;
    }).join("");
    const node = renderObj(h, o, !prevHeap[h] || JSON.stringify(prevHeap[h]) !== JSON.stringify(o));
    return `<div class="vt"><div class="vt-node">${node}</div>${/vt-kid">/.test(kids) ? `<div class="vt-kids">${kids}</div>` : ""}</div>`;
  }

  function layoutHeap(step) {
    const placed = new Set(); const rows = [];
    const visit = (h, row) => {
      if (placed.has(h) || !step.h[h]) return;
      const o = step.h[h];
      if (isTree(o)) { row.push({ tree: h }); return; }   // trees are rendered (and marked placed) later
      placed.add(h); row.push(h);
      const refs = [];
      (o.v || []).forEach(x => {
        if (Array.isArray(x[0])) { x.forEach(y => y[0] === "R" && refs.push(y[1])); }
        else if (x[0] === "R") refs.push(x[1]);
        else if (Array.isArray(x[1]) && x[1][0] === "R") refs.push(x[1][1]);
      });
      refs.forEach(r => visit(r, row));
    };
    step.f.forEach(f => f.v.forEach(([, v]) => { if (v[0] === "R" && !placed.has(v[1])) { const row = []; visit(v[1], row); rows.push(row); } }));
    if (step.r && step.r[0] === "R" && !placed.has(step.r[1])) { const row = []; visit(step.r[1], row); rows.push(row); }
    return rows;
  }

  function drawArrows(canvas) {
    const svg = canvas.querySelector("svg.arrows"); if (!svg) return;
    const cr = canvas.getBoundingClientRect();
    const ox = canvas.scrollLeft - cr.left, oy = canvas.scrollTop - cr.top;
    svg.setAttribute("width", canvas.scrollWidth); svg.setAttribute("height", canvas.scrollHeight);
    let paths = "";
    canvas.querySelectorAll(".ptr").forEach(p => {
      const t = canvas.querySelector(`#o-${p.dataset.to} .cells, #o-${p.dataset.to} .box`); if (!t) return;
      const a = p.getBoundingClientRect(), b = t.getBoundingClientRect();
      const x1 = a.left + a.width / 2 + ox, y1 = a.top + a.height / 2 + oy;
      let x2 = b.left + ox, y2 = b.top + Math.min(14, b.height / 2) + oy;
      if (x2 < x1 - 4) { x2 = b.left + b.width / 2 + ox; y2 = b.top + oy; }
      const dx = Math.max(30, Math.abs(x2 - x1) / 2);
      const top = p.classList.contains("top-ptr");
      paths += `<path d="M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2 - 2},${y2}" fill="none" stroke="${top ? "var(--red)" : "var(--ink-3)"}" stroke-width="${top ? 2 : 1.5}" marker-end="url(#ah${top ? "r" : "g"})" opacity=".9"/>`;
    });
    svg.innerHTML = `<defs>
      <marker id="ahr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--red)"/></marker>
      <marker id="ahg" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ink-3)"/></marker></defs>${paths}`;
  }

  // ---------------- the component ----------------
  // One step = one line being executed. The highlighted line is the one that RUNS in
  // this step; memory and output show the state right AFTER it ran; the step card
  // explains what it did, how each piece of it was evaluated, and the syntax used.
  const hlLine = l => { try { return hljs.highlight(l, { language: "python", ignoreIllegals: true }).value; } catch (e) { return esc(l); } };

  function selView(sel) {
    const pk = new Set(sel.pick || []);
    if (sel.k === "grid") {
      const cols = sel.cells[0] ? sel.cells[0].length : 0; let n = 0;
      const head = `<tr><th></th>${Array.from({ length: cols }, (_, j) => `<th>${j}</th>`).join("")}</tr>`;
      const rows = sel.cells.map((r, i) => `<tr><th>${sel.d === 2 ? i : ""}</th>${r.map(x => `<td class="${pk.has(n++) ? "pk" : ""}">${esc(x)}</td>`).join("")}</tr>`).join("");
      return `<table class="sel grid">${head}${rows}</table>`;
    }
    if (sel.k === "seq") {
      return `<div class="sel seq">${sel.items.map((x, i) => `<div class="sq${pk.has(i) ? " pk" : ""}"><span class="sv">${esc(sel.str ? (x === " " ? "␣" : x) : x)}</span><span class="si">${i}</span><span class="sn">${i - sel.items.length}</span></div>`).join("")}</div>`;
    }
    if (sel.k === "dict") {
      return `<table class="sel dict">${sel.items.map((k, i) => `<tr class="${pk.has(i) ? "pk" : ""}"><td>${esc(k)}</td><td>${esc(sel.vals[i])}</td></tr>`).join("")}</table>`;
    }
    if (sel.k === "df") {
      let n = 0;
      return `<table class="sel df"><tr><th></th>${sel.cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr>${sel.rows.map((r, i) => `<tr><th>${esc(sel.idx[i])}</th>${r.map(x => `<td class="${pk.has(n++) ? "pk" : ""}">${esc(x)}</td>`).join("")}</tr>`).join("")}</table>`;
    }
    return "";
  }
  function valView(v) {
    if (!v) return "";
    if (v[0] === "g") return `<table class="sel grid res">${v[1].map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join("")}</tr>`).join("")}</table>`;
    if (v[0] === "p") return `<pre class="ev-pre">${esc(v[1])}</pre>`;
    return `<code class="ev-val">${esc(v[1])}</code>`;
  }

  class Visualiser {
    constructor(host, { onStatus, inline, stack, onResult } = {}) {
      this.host = host; this.onStatus = onStatus || (() => {}); this.inline = inline; this.stack = stack; this.onResult = onResult || (() => {});
      this.steps = []; this.i = 0; this.code = ""; this.result = null; this.playing = null; this.editing = false; this.stdin = "";
      this.quiz = false; this.score = { right: 0, total: 0 }; this.showTable = false; this.explaining = null;
      this._onResize = () => this.canvas && drawArrows(this.canvas);
      window.addEventListener("resize", this._onResize);
    }
    destroy() { this.pause(); window.removeEventListener("resize", this._onResize); }

    async load(code) {
      this.code = code.replace(/\s+$/, "") + "\n"; this.pause(); this._traceHTML = null;
      this.host.innerHTML = `<div class="vz-loading"><div><div class="spinner"></div><b>Warming up the oven…</b><p class="muted" id="vzLoadMsg">${ready ? "Tracing your code" : "Loading Python in your browser (about 10 MB, first time only; cached afterwards)"}</p></div></div>`;
      const msgEl = this.host.querySelector("#vzLoadMsg");
      const listener = m => { if (msgEl) msgEl.textContent = m; this.onStatus(m); };
      statusListeners.add(listener);
      try {
        const r = await execute(this.code, "trace", this.stdin);
        this.onResult(r, this.code);
        this.setResult(r);
        this.onStatus(`${this.steps.length} steps${r.truncated ? " (stopped early: step limit reached)" : ""}${r.error ? " · ends with an error" : ""}`);
      } catch (err) {
        this.host.innerHTML = `<div class="vz-loading"><div><b>Couldn't run this code</b><p class="muted">${esc(err.message)}</p><button class="btn small" id="vzRetry">Try again</button></div></div>`;
        this.host.querySelector("#vzRetry").onclick = () => this.load(this.code);
      } finally { statusListeners.delete(listener); }
    }
    loadResult(code, result) { this.code = code.replace(/\s+$/, "") + "\n"; this.pause(); this.setResult(undelta(result)); }
    setResult(r) {
      this.result = r; this.ex = r.ex || []; this.stx = r.stx || {};
      this.steps = r.steps.length ? r.steps : [{ l: r.errLine || 1, e: "line", f: [], h: {}, o: r.stdout.length }];
      this._traceHTML = null; this.score = { right: 0, total: 0 }; this.explaining = null;
      this.i = 0; this.render();
    }

    render() {
      const lines = this.code.split("\n"); if (lines.at(-1) === "") lines.pop();
      this.lines = lines;
      const runs = new Map(); this.steps.forEach(s => s.e === "line" && runs.set(s.l, (runs.get(s.l) || 0) + 1));
      this.host.innerHTML = `<div class="vz${this.stack ? " stack" : ""}">
        <div class="vz-left">
          ${this.editing
            ? `<textarea class="vz-edit" spellcheck="false">${esc(this.code)}</textarea>
               <div class="vz-controls"><div class="row"><button class="primary" data-a="rerun">▶ Run &amp; visualise</button><span class="muted" style="font-size:.8rem">Tab inserts 4 spaces · Ctrl+Enter runs</span></div>
               <label style="font-size:.8rem;color:var(--ink-3)">Input lines for <code>input()</code> (one per line)</label><textarea class="vz-stdin" rows="2">${esc(this.stdin)}</textarea></div>`
            : `<div class="vz-code" title="Click a line to see what its syntax means">${lines.map((l, n) => `<div class="vz-line${runs.has(n + 1) ? "" : " dead"}" data-n="${n + 1}"><span class="ln">${n + 1}</span><span class="tx">${l ? hlLine(l) : " "}</span></div>`).join("")}</div>
               <div class="vz-controls">
                 <div class="row">
                   <button data-a="first" title="First step (Home)">⏮</button><button data-a="prev" title="Previous step (←)">◀ Prev</button>
                   <button class="primary" data-a="next" title="Next step (→)">Next ▶</button><button data-a="last" title="Last step (End)">⏭</button>
                   <button data-a="play" title="Auto-play (space)">⏵ Play</button>
                   <select data-a="speed" title="Play speed"><option value="1400">Slow</option><option value="800" selected>Normal</option><option value="350">Fast</option></select>
                   <span class="count"></span>
                 </div>
                 <input type="range" min="0" max="${this.steps.length - 1}" value="0" aria-label="Step slider">
                 <div class="row extras">
                   <button data-a="quiz" class="${this.quiz ? "on" : ""}" title="Predict values/output before each step is revealed">🎯 Quiz me${this.quiz ? ` · ${this.score.right}/${this.score.total}` : ""}</button>
                   <button data-a="table" class="${this.showTable ? "on" : ""}" title="The hand-trace table: one row per step">📋 Trace table</button>
                   <span class="muted hint">Tip: click any code line to see what it means</span>
                 </div>
               </div>
               <div class="vz-step" aria-live="polite"></div>`}
        </div>
        <div class="vz-right">
          <div class="vz-trace" ${this.showTable && !this.editing ? "" : "hidden"}></div>
          <div class="vz-memh">🧠 Memory <span class="muted">after this step · names on the left point to objects on the right</span></div>
          <div class="vz-canvas"><svg class="arrows"></svg>
            <div class="vz-col"><h4>Frames (names)</h4><div class="vz-frames"></div></div>
            <div class="vz-col"><h4>Objects</h4><div class="vz-heap"></div></div>
          </div>
          <div class="vz-out"><h4>Console output</h4><pre></pre><div class="figs"></div></div>
        </div></div>`;
      this.canvas = this.host.querySelector(".vz-canvas");
      this.host.querySelectorAll("[data-a]").forEach(b => {
        const a = b.dataset.a;
        if (a === "speed") b.onchange = () => { if (this.playing) { this.pause(); this.play(); } };
        else b.onclick = () => this.act(a);
      });
      this.host.querySelectorAll(".vz-line").forEach(el => el.onclick = () => this.explainLine(+el.dataset.n));
      const range = this.host.querySelector("input[type=range]");
      if (range) range.oninput = () => this.go(+range.value);
      const ta = this.host.querySelector(".vz-edit");
      if (ta) ta.addEventListener("keydown", e => {
        if (e.key === "Tab") { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText("    ", s, ta.selectionEnd, "end"); }
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.act("rerun"); }
      });
      this.canvas.addEventListener("scroll", () => drawArrows(this.canvas));
      if (!this.editing) this.go(this.i);
    }

    // ---- the step card ----
    evalHTML(s) {
      const evs = (s.ev || []).filter(e => this.ex[e[0]]);
      if (!evs.length) return "";
      const seen = new Set();
      const cards = evs.map(([id, val, sel]) => {
        const t = this.ex[id]; const first = t.d && !seen.has(t.d); seen.add(t.d);
        return `<div class="ev${sel ? " has-sel" : ""}"><div class="ev-h"><code class="ev-src">${hlLine(t.s)}</code><span class="ev-arrow">→</span>${valView(val)}</div>
          ${sel ? `<div class="ev-sel">${selView(sel)}<div class="ev-why">📍 ${esc(sel.why)}</div></div>` : ""}
          ${t.d && first ? `<div class="ev-doc">${esc(t.d)}</div>` : ""}</div>`;
      });
      return `<div class="sc-sec"><h5>🔍 How Python worked it out <span class="muted">(inner pieces first, in the order they ran)</span></h5><div class="evs">${cards.join("")}</div></div>`;
    }
    stepCard(i) {
      const st = this.steps, s = st[i], N = st.length, last = i === N - 1, r = this.result;
      const top = topOf(s);
      const lineCode = (this.lines[s.l - 1] || "").trim();
      const isEnd = last && (s.e === "return" && st.length > 1 && s.f.length <= 1 || !st[i + 1]);
      let title, kind = "";
      if (s.e === "call") title = top && top.k === "class" ? `🏗️ Running the body of class <b>${esc(top.n)}</b>` : `📞 Entering <b>${esc(top ? top.n : "?")}()</b>`;
      else if (s.e === "return" && s.f.length > 1) title = top && top.k === "class" ? `🏗️ Class <b>${esc(top.n)}</b> is complete` : `↩️ <b>${esc(top ? top.n : "?")}()</b> returns`;
      else if (s.e === "exception") { title = `💥 An exception is raised`; kind = " bad"; }
      else if (isEnd) title = "🏁 End of the program";
      else title = `Line ${s.l}`;
      let html = `<div class="sc-top${kind}"><span class="sc-n">Step ${i + 1} / ${N}</span><span class="sc-title">${title}</span></div>`;
      if (s.e === "line" && !isEnd) html += `<div class="sc-code"><span class="ln">${s.l}</span><code>${hlLine(lineCode)}</code></div>`;
      if (isEnd) {
        const full = r.full || r;
        html += full.error
          ? `<div class="sc-what bad"><p>🛑 The program stopped with <b>${esc(full.error)}</b>${full.errLine ? ` on line ${full.errLine}` : ""}. Everything after that line never ran.</p></div>`
          : r.truncated ? `<div class="sc-what"><p>⏸️ The trace stops after ${N} steps to stay readable. The <b>Output</b> tab has the complete result.</p></div>`
          : `<div class="sc-what"><p>✅ Every line has run. The console below shows everything that was printed${r.stdout ? "" : " (nothing, in this case)"}.</p></div>`;
        return html;
      }
      if (!last) {
        const ef = effectOf(st, i + 1, this.lines, r.stdout);
        if (ef.head || ef.fx.length) html += `<div class="sc-what">${ef.head ? `<p>${ef.head}</p>` : ""}${ef.fx.length ? `<ul>${ef.fx.slice(0, 8).map(x => `<li>${x}</li>`).join("")}${ef.fx.length > 8 ? `<li>…and ${ef.fx.length - 8} more</li>` : ""}</ul>` : ""}</div>`;
      } else if (r.error) {
        html += `<div class="sc-what bad"><p>🛑 This line raised <b>${esc(r.error)}</b>, and nothing caught it, so the program stopped here.</p></div>`;
      }
      if (s.e === "line") {
        html += this.evalHTML(s);
        const notes = this.stx[String(s.l)] || [];
        if (notes.length) html += `<details class="sc-sec sc-syn"${this.synClosed ? "" : " open"}><summary>📖 Syntax used on this line</summary><ul>${notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul></details>`;
      }
      return html;
    }
    explainLine(n) {
      if (this.editing) return;
      this.pause();
      const code = (this.lines[n - 1] || "").trim();
      const notes = this.stx[String(n)] || [];
      const parts = this.ex.filter(t => t.l === n && t.d);
      const when = this.steps.map((s, j) => (s.e === "line" && s.l === n ? j : -1)).filter(j => j >= 0);
      const box = this.host.querySelector(".vz-step");
      box.innerHTML = `<div class="sc-top"><span class="sc-n">Line ${n}</span><span class="sc-title">📖 What this line means</span><button class="sc-x" data-x>✕ back to step ${this.i + 1}</button></div>
        <div class="sc-code"><span class="ln">${n}</span><code>${hlLine(code)}</code></div>
        ${notes.length ? `<div class="sc-sec"><ul>${notes.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
        ${parts.length ? `<div class="sc-sec"><h5>The pieces</h5><ul class="pieces">${parts.map(t => `<li><code>${hlLine(t.s)}</code> ${esc(t.d)}</li>`).join("")}</ul></div>` : ""}
        ${!notes.length && !parts.length ? `<p class="muted">${code ? "A plain line with no special syntax." : "An empty line."}</p>` : ""}
        <div class="sc-sec">${when.length ? `This line runs <b>${when.length}×</b>. Jump to: ${when.slice(0, 12).map((j, k) => `<button class="chip" data-j="${j}">${k + 1}${k === 0 ? "st" : k === 1 ? "nd" : k === 2 ? "rd" : "th"} time</button>`).join(" ")}${when.length > 12 ? " …" : ""}` : `<span class="muted">This line never runs in this program${code.startsWith("else") || code.startsWith("finally") ? " (else/finally are markers; their indented lines run)" : ""}.</span>`}</div>`;
      this.host.querySelectorAll(".vz-line").forEach(el => el.classList.toggle("explain", +el.dataset.n === n));
      box.querySelector("[data-x]").onclick = () => this.go(this.i);
      box.querySelectorAll("[data-j]").forEach(b => b.onclick = () => this.go(+b.dataset.j));
    }

    // ---- quiz me: predict before the step is revealed ----
    questionFor(j) {
      const st = this.steps, s = st[j];
      if (!s || !st[j + 1] || s.e !== "line") return [];
      const top = topOf(s); if (!top) return [];
      // the line is finished at the next step that is back in this same frame (calls inside it included)
      let m = j + 1;
      while (m < st.length - 1 && !(topOf(st[m]) && topOf(st[m]).id === top.id && st[m].e === "line") && st[m].f.some(f => f.id === top.id)) m++;
      const n = st[m];
      const qs = frameDiff(s, n, top.id).filter(d => d.kind !== "deleted" && !isCallableTxt(d.now || ""))
        .map(d => ({ k: d.k, now: d.now, was: d.old })).slice(0, 2);
      const printed = n.o > s.o ? this.result.stdout.slice(s.o, n.o).replace(/\n$/, "") : "";
      if (printed && printed.length < 80) qs.unshift({ k: "printed output", now: printed, print: true });
      if (qs.length < 2) {                       // ask for the value of the biggest evaluated piece
        const ev = (s.ev || []).filter(e => e[1][0] === "r" && this.ex[e[0]] && !/^<function/.test(e[1][1])).at(-1);
        if (ev && ev[1][1].length < 60) qs.push({ k: this.ex[ev[0]].s, now: ev[1][1], expr: true });
      }
      return qs.slice(0, 3);
    }
    askQuiz(j, qs) {
      this.awaiting = true;
      const s = this.steps[j];
      this.host.querySelectorAll(".vz-line").forEach(el => el.classList.toggle("cur", +el.dataset.n === s.l));
      const box = this.host.querySelector(".vz-step");
      box.innerHTML = `<div class="sc-top quiz"><span class="sc-n">Step ${j + 1} / ${this.steps.length}</span><span class="sc-title">🎯 Your turn: predict before it runs</span></div>
        <div class="sc-code"><span class="ln">${s.l}</span><code>${hlLine((this.lines[s.l - 1] || "").trim())}</code></div>
        <div class="quizq">${qs.map((q, k) => `<label>${q.print ? "🖨️ What will it <b>print</b>?" : q.expr ? `What does <code>${esc(q.k)}</code> evaluate to?` : `<code>${esc(q.k)}</code> ${q.was === undefined ? "(new name)" : `is now <code>${esc(clip(q.was, 24))}</code>`} → becomes`}<input data-q="${k}" spellcheck="false" autocomplete="off" placeholder="${q.print ? "exact output" : "value"}"></label>`).join("")}</div>
        <div class="row"><button class="primary" data-p="check">Check ↵</button><button data-p="skip">Just show me</button></div>`;
      const inputs = [...box.querySelectorAll("input")];
      inputs[0]?.focus();
      const norm = x => String(x).trim().replace(/\s+/g, " ").replace(/^['"](.*)['"]$/, "$1").toLowerCase();
      const same = (a, b) => norm(a) === norm(b) || norm(a).replace(/ /g, "") === norm(b).replace(/ /g, "") || (!isNaN(parseFloat(a)) && /^[-\d.e+]+$/i.test(a.trim()) && Math.abs(parseFloat(a) - parseFloat(b)) < 1e-9);
      const finish = checked => {
        this.awaiting = false;
        let res = "";
        if (checked) qs.forEach((q, k) => {
          const ok = same(inputs[k].value, q.now); this.score.total++; if (ok) this.score.right++;
          res += `<div>${ok ? "✅" : "❌"} ${q.print ? "printed" : q.expr ? `<code>${esc(q.k)}</code> →` : `<code>${esc(q.k)}</code> =`} <code>${esc(clip(q.now, 60))}</code>${ok ? "" : ` <span class="muted">(you said <code>${esc(inputs[k].value || "nothing")}</code>)</span>`}</div>`;
        });
        const qb = this.host.querySelector("[data-a=quiz]"); if (qb) qb.textContent = `🎯 Quiz me · ${this.score.right}/${this.score.total}`;
        this.go(j, res ? `<div class="quizres">${res}</div>` : "");
      };
      box.querySelector("[data-p=check]").onclick = () => finish(true);
      box.querySelector("[data-p=skip]").onclick = () => finish(false);
      inputs.forEach(inp => inp.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); finish(true); } e.stopPropagation(); }));
    }

    // ---- the hand-trace table (state after each step) ----
    renderTrace() {
      const box = this.host.querySelector(".vz-trace"); if (!box) return;
      if (!this._traceHTML) {
        const cols = []; const st = this.steps;
        const rows = st.slice(0, 500).map((s, i) => {
          const a = st[i + 1] || s; const top = topOf(a); const vals = {};
          if (top) top.v.forEach(([k, v]) => { const t = short(v, a.h); if (!isCallableTxt(t)) { vals[k] = t; if (!cols.includes(k)) cols.push(k); } });
          return { i, s, a, id: top ? top.id : null, frame: top ? top.n : "", vals };
        });
        const shown = cols.slice(0, 10); let prev = null;
        const body = rows.map(r => {
          const tds = shown.map(k => { const v = r.vals[k]; const ch = v !== undefined && (!prev || prev.id !== r.id || prev.vals[k] !== v); return `<td class="${ch ? "chg" : ""}">${v === undefined ? "" : esc(clip(v, 20))}</td>`; }).join("");
          const out = r.a.o > r.s.o ? esc(clip(this.result.stdout.slice(r.s.o, r.a.o).trim(), 22)) : "";
          prev = r;
          const ev = r.s.e === "call" ? "📞 " : r.s.e === "return" ? "↩️ " : "";
          return `<tr data-step="${r.i}"><td>${r.i + 1}</td><td>${r.s.l}</td><td class="code">${ev}${esc(clip((this.lines[r.s.l - 1] || "").trim(), 30))}</td><td>${esc(r.frame)}</td>${tds}<td class="out">${out}</td></tr>`;
        }).join("");
        this._traceHTML = `<p class="muted tt-help">The table you'd draw on paper: one row per step, values <i>after</i> the line ran. Highlighted = changed. Click a row to jump.</p>
          <div class="tt-wrap"><table class="tt"><thead><tr><th>#</th><th>Line</th><th>Code</th><th>Frame</th>${shown.map(k => `<th>${esc(k)}</th>`).join("")}<th>Printed</th></tr></thead><tbody>${body}</tbody></table></div>`;
        box.innerHTML = this._traceHTML;
        box.querySelectorAll("tr[data-step]").forEach(tr => tr.onclick = () => this.go(+tr.dataset.step));
      }
      box.querySelectorAll("tr.cur").forEach(tr => tr.classList.remove("cur"));
      const cur = box.querySelector(`tr[data-step="${this.i}"]`);
      if (cur) { cur.classList.add("cur"); const w = box.querySelector(".tt-wrap"); if (cur.offsetTop < w.scrollTop + 30 || cur.offsetTop > w.scrollTop + w.clientHeight - 30) w.scrollTop = cur.offsetTop - w.clientHeight / 2; }
    }

    act(a) {
      if (this.awaiting && a !== "quiz") return;
      if (a === "quiz") {
        this.quiz = !this.quiz; this.awaiting = false;
        const b = this.host.querySelector("[data-a=quiz]");
        if (b) { b.classList.toggle("on", this.quiz); b.textContent = this.quiz ? `🎯 Quiz me · ${this.score.right}/${this.score.total}` : "🎯 Quiz me"; }
        if (this.quiz) this.pause();
        this.go(this.i); return;
      }
      if (a === "table") {
        this.showTable = !this.showTable;
        this.host.querySelector("[data-a=table]")?.classList.toggle("on", this.showTable);
        const t = this.host.querySelector(".vz-trace"); if (t) t.hidden = !this.showTable;
        if (this.showTable) this.renderTrace();
        return;
      }
      if (a === "next" && this.quiz && this.i < this.steps.length - 1) {
        const qs = this.questionFor(this.i + 1);
        if (qs.length) { this.pause(); this.askQuiz(this.i + 1, qs); return; }
      }
      if (a === "first") this.go(0);
      if (a === "prev") this.go(this.i - 1);
      if (a === "next") this.go(this.i + 1);
      if (a === "last") this.go(this.steps.length - 1);
      if (a === "play") this.playing ? this.pause() : this.play();
      if (a === "rerun") {
        const ta = this.host.querySelector(".vz-edit"); const si = this.host.querySelector(".vz-stdin");
        if (si) this.stdin = si.value;
        this.editing = false; this.load(ta ? ta.value : this.code);
      }
    }
    toggleEdit() { this.pause(); this.editing = !this.editing; this.render(); return this.editing; }
    play() {
      if (this.i >= this.steps.length - 1) this.go(0);
      const sp = +(this.host.querySelector("[data-a=speed]")?.value || 800);
      this.playing = setInterval(() => { if (this.i >= this.steps.length - 1) this.pause(); else this.go(this.i + 1); }, sp);
      const b = this.host.querySelector("[data-a=play]"); if (b) b.textContent = "⏸ Pause";
    }
    pause() {
      clearInterval(this.playing); this.playing = null;
      const b = this.host.querySelector("[data-a=play]"); if (b) b.textContent = "⏵ Play";
    }
    key(e) {
      if (this.editing || this.awaiting) return false;
      if (e.key === "ArrowRight") { this.act("next"); return true; }
      if (e.key === "ArrowLeft") { this.act("prev"); return true; }
      if (e.key === "Home") { this.act("first"); return true; }
      if (e.key === "End") { this.act("last"); return true; }
      if (e.key === " ") { this.act("play"); return true; }
      return false;
    }

    go(i, banner = "") {
      if (!this.steps.length || this.editing) return;
      this.i = Math.max(0, Math.min(this.steps.length - 1, i));
      const s = this.steps[this.i], a = this.steps[this.i + 1] || s, last = this.i === this.steps.length - 1;
      const H = this.host;
      H.querySelectorAll(".vz-line").forEach(el => el.classList.remove("cur", "explain"));
      const cur = H.querySelector(`.vz-line[data-n="${s.l}"]`);
      if (cur && !(last && s.e === "return" && s.f.length <= 1)) {
        cur.classList.add("cur");
        const box = H.querySelector(".vz-code"); const t = cur.offsetTop - box.clientHeight / 2;
        if (cur.offsetTop < box.scrollTop + 10 || cur.offsetTop > box.scrollTop + box.clientHeight - 30) box.scrollTop = t;
      }
      const count = H.querySelector(".count"); if (count) count.textContent = `Step ${this.i + 1} / ${this.steps.length}`;
      const range = H.querySelector("input[type=range]"); if (range) range.value = this.i;
      const pb = H.querySelector("[data-a=prev]"); if (pb) pb.disabled = this.i === 0;
      const nb = H.querySelector("[data-a=next]"); if (nb) nb.disabled = last;
      const card = H.querySelector(".vz-step");
      if (card) {
        try { card.innerHTML = banner + this.stepCard(this.i); }
        catch (err) { card.innerHTML = `<div class="sc-top"><span class="sc-n">Step ${this.i + 1}</span><span class="sc-title">Line ${s.l}</span></div><p class="muted">(Couldn't describe this step: ${esc(err.message)})</p>`; console.error(err); }
        const syn = card.querySelector(".sc-syn"); if (syn) syn.ontoggle = () => (this.synClosed = !syn.open);
      }
      // memory after this step
      try {
        const prevTop = new Map(s.f.map(f => [f.id, new Map(f.v.map(([k, v]) => [k, short(v, s.h)]))]));
        H.querySelector(".vz-frames").innerHTML = a.f.map((f, fi) => {
          const isTop = fi === a.f.length - 1; const pv = prevTop.get(f.id);
          const rows = f.v.map(([k, v]) => {
            const changed = !pv || pv.get(k) !== short(v, a.h);
            return `<tr class="${changed && this.i > 0 ? "changed" : ""}"><td class="k">${esc(k)}</td><td class="v">${valCell(v, isTop ? "top-ptr" : "")}</td></tr>`;
          }).join("");
          const ret = s.e === "return" && s.r && fi === a.f.length - 1 && s.f.length > a.f.length ? "" : "";
          return `<div class="vz-frame${isTop ? " top" : ""}"><div class="fh">${esc(f.n === "Global frame" ? "Global frame (main program)" : f.n + "()")}</div>${rows ? `<table>${rows}${ret}</table>` : `<div class="none">no names yet</div>`}</div>`;
        }).join("") || `<div class="muted" style="font-size:.85rem">(nothing yet)</div>`;
        const treePlaced = new Set();
        H.querySelector(".vz-heap").innerHTML = layoutHeap(a).map(row => {
          const html = row.map(item => {
            if (typeof item === "object") return treePlaced.has(item.tree) ? "" : renderTree(item.tree, a, s.h, treePlaced);
            return renderObj(item, a.h[item], !s.h[item] || JSON.stringify(s.h[item]) !== JSON.stringify(a.h[item]), s.h[item]);
          }).join("");
          return html ? `<div class="vz-row">${html}</div>` : "";
        }).join("") || `<div class="muted" style="font-size:.85rem">No objects yet. Small values (numbers, strings, True/False, None) are shown inside the frame.</div>`;
      } catch (err) { console.error(err); }
      if (this.showTable) this.renderTrace();
      const r = this.result;
      let out = esc(r.stdout.slice(0, a.o));
      if (last) { out = esc(r.stdout); if (r.error) out += `<span class="err">${out && !out.endsWith("\n") ? "\n" : ""}${esc(r.error)}</span>`; }
      H.querySelector(".vz-out pre").innerHTML = out || `<span class="muted">(nothing printed yet)</span>`;
      H.querySelector(".vz-out .figs").innerHTML = last ? (r.figures || []).map(b => `<img alt="figure" src="data:image/png;base64,${b}">`).join("") : "";
      const outBox = H.querySelector(".vz-out"); outBox.scrollTop = outBox.scrollHeight;
      requestAnimationFrame(() => drawArrows(this.canvas));
    }
  }

  // ---------------- overlay + inline runner API ----------------
  let overlayViz = null;
  const overlay = () => document.getElementById("viz");
  window.Viz = {
    execute,
    Visualiser,
    undelta,
    breakdown,
    open(code, result) {
      const ov = overlay(); ov.hidden = false; document.body.style.overflow = "hidden";
      const status = document.getElementById("vizStatus");
      if (overlayViz) overlayViz.destroy();
      overlayViz = new Visualiser(document.getElementById("vizBody"), { onStatus: m => (status.textContent = m) });
      if (result) { overlayViz.loadResult(code, result); status.textContent = `${result.steps.length} steps${result.truncated ? " (trace limit reached)" : ""}`; }
      else overlayViz.load(code);
      document.getElementById("vizEdit").textContent = "✎ Edit code";
    },
    close() {
      overlay().hidden = true; document.body.style.overflow = "";
      if (overlayViz) { overlayViz.destroy(); overlayViz = null; }
    },
    async runInline(code, box) {
      box.innerHTML = `<span class="muted">${ready ? "Running…" : "Loading Python (first time only)…"}</span>`;
      const listener = m => { if (!ready || /Loading|Downloading/.test(m)) box.innerHTML = `<span class="muted">${esc(m)}</span>`; };
      statusListeners.add(listener);
      try {
        const r = await execute(code, "run");
        let html = esc(r.stdout);
        if (r.error) html += `<span class="err">${html && !html.endsWith("\n") ? "\n" : ""}${esc(r.error)}${r.errLine ? ` (line ${r.errLine})` : ""}</span>`;
        html += (r.figures || []).map(b => `<img alt="figure" src="data:image/png;base64,${b}">`).join("");
        box.innerHTML = html || `<span class="muted">(ran with no output)</span>`;
      } catch (err) { box.innerHTML = `<span class="err">${esc(err.message)}</span>`; }
      finally { statusListeners.delete(listener); }
    },
  };
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("vizClose").onclick = () => Viz.close();
    document.getElementById("vizEdit").onclick = (e) => { if (overlayViz) e.target.textContent = overlayViz.toggleEdit() ? "👣 Back to steps" : "✎ Edit code"; };
    overlay().addEventListener("click", e => { if (e.target === overlay()) Viz.close(); });
    document.addEventListener("keydown", e => {
      if (overlay().hidden) return;
      if (e.key === "Escape") { Viz.close(); return; }
      if (overlayViz && !/TEXTAREA|INPUT|SELECT/.test(document.activeElement.tagName) && overlayViz.key(e)) e.preventDefault();
    });
  });
})();
