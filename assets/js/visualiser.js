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
    worker = new Worker("assets/js/tracer-worker.js", { type: "module" });
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
      default: return o.s.split("\n")[0].slice(0, 60);
    }
  }
  const clip = (s, n = 60) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

  function narrate(steps, i, lines) {
    const s = steps[i], p = steps[i - 1];
    const top = s.f[s.f.length - 1];
    const code = (lines[s.l - 1] || "").trim();
    const parts = [];
    if (s.e === "call") {
      const args = top ? top.v.map(([k, v]) => `<code>${esc(k)} = ${esc(clip(short(v, s.h), 40))}</code>`).join(", ") : "";
      parts.push(`📞 <b>Calling ${esc(top ? top.n : "?")}</b>${args ? " with " + args : ""}. A new <i>frame</i> (its own box of local variables) is created.`);
    } else if (s.e === "return") {
      parts.push(`↩️ <b>${esc(top ? top.n : "?")}</b> finishes and returns <code>${esc(clip(short(s.r, s.h), 60))}</code>. Its frame is about to be destroyed.`);
    } else if (s.e === "exception") {
      parts.push(`💥 <b>Exception:</b> <code>${esc(s.x)}</code> on line ${s.l}. Python looks for a matching <code>except</code>…`);
    } else {
      parts.push(`➡️ About to run <b>line ${s.l}</b>: <code>${esc(clip(code, 70))}</code>`);
    }
    // what changed since the previous step (in the frame still on top)
    if (p) {
      const pf = p.f.find(f => top && f.id === top.id);
      if (pf && s.e !== "call") {
        const before = new Map(pf.v.map(([k, v]) => [k, short(v, p.h)]));
        const changes = [];
        for (const [k, v] of top.v) {
          const now = short(v, s.h);
          if (!before.has(k)) changes.push(`new name <code>${esc(k)}</code> → <code>${esc(clip(now, 40))}</code>`);
          else if (before.get(k) !== now) changes.push(`<code>${esc(k)}</code>: <code>${esc(clip(before.get(k), 30))}</code> → <code>${esc(clip(now, 30))}</code>`);
        }
        for (const k of before.keys()) if (!top.v.some(([kk]) => kk === k)) changes.push(`<code>${esc(k)}</code> deleted`);
        if (changes.length) parts.push(`<br>✏️ Changed: ${changes.slice(0, 5).join(" · ")}${changes.length > 5 ? " …" : ""}`);
      }
      if (s.o > p.o) parts.push(`<br>🖨️ Printed output.`);
    }
    return parts.join(" ");
  }

  // ---------------- rendering ----------------
  function valCell(enc, cls = "") {
    if (!enc) return "";
    if (enc[0] === "P") return `<span class="pv ${cls}">${esc(enc[1])}</span>`;
    return `<span class="ptr ${cls}" data-to="${enc[1]}" title="reference to object #${enc[1]}"></span>`;
  }

  function renderObj(h, o, fresh) {
    const head = `<div class="oh">${esc(o.c)} <span class="muted">#${h}</span></div>`;
    const cls = `vz-obj ${o.t}${o.cls ? "" : o.t === "obj" ? " instance" : ""}${fresh ? " fresh" : ""}`;
    if (o.t === "list" || o.t === "tuple" || o.t === "set") {
      const items = o.v || [];
      if (!items.length) return `<div class="${cls}" id="o-${h}">${head}<div class="cells empty">empty</div></div>`;
      const cells = items.map((x, i) => `<div class="cell">${o.t === "set" ? "" : `<div class="i">${i}</div>`}<div class="val">${valCell(x)}</div></div>`).join("");
      return `<div class="${cls}" id="o-${h}">${head}<div class="cells">${cells}${o.more ? `<div class="cell"><div class="val">+${o.more}</div></div>` : ""}</div></div>`;
    }
    if (o.t === "dict" || o.t === "obj") {
      const rows = (o.v || []).map(([k, v]) => `<tr><td class="k">${o.t === "dict" ? valCell(k) : esc(k)}</td><td>${valCell(v)}</td></tr>`).join("");
      return `<div class="${cls}" id="o-${h}">${head}<div class="box">${rows ? `<table>${rows}</table>` : `<div class="cells empty" style="border:0">empty</div>`}</div></div>`;
    }
    return `<div class="${cls}" id="o-${h}">${head}<div class="box">${esc(o.s)}</div></div>`;
  }

  function layoutHeap(step) {
    const placed = new Set(); const rows = [];
    const visit = (h, row) => {
      if (placed.has(h) || !step.h[h]) return; placed.add(h); row.push(h);
      const o = step.h[h]; const refs = [];
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
  class Visualiser {
    constructor(host, { onStatus, inline } = {}) {
      this.host = host; this.onStatus = onStatus || (() => {}); this.inline = inline;
      this.steps = []; this.i = 0; this.code = ""; this.result = null; this.playing = null; this.editing = false; this.stdin = "";
      this._onResize = () => this.canvas && drawArrows(this.canvas);
      window.addEventListener("resize", this._onResize);
    }
    destroy() { this.pause(); window.removeEventListener("resize", this._onResize); }

    async load(code) {
      this.code = code.replace(/\s+$/, "") + "\n"; this.pause();
      this.host.innerHTML = `<div class="vz-loading"><div><div class="spinner"></div><b>Warming up the oven…</b><p class="muted" id="vzLoadMsg">${ready ? "Tracing your code" : "Loading Python in your browser (about 10 MB, first time only; cached afterwards)"}</p></div></div>`;
      const msgEl = this.host.querySelector("#vzLoadMsg");
      const listener = m => { if (msgEl) msgEl.textContent = m; this.onStatus(m); };
      statusListeners.add(listener);
      try {
        this.result = await execute(this.code, "trace", this.stdin);
        this.steps = this.result.steps;
        if (!this.steps.length) this.steps = [{ l: this.result.errLine || 1, e: "line", f: [], h: {}, o: this.result.stdout.length }];
        this.i = 0; this.render();
        this.onStatus(`${this.steps.length} steps${this.result.truncated ? " (stopped early: step limit reached)" : ""}${this.result.error ? " · ends with an error" : ""}`);
      } catch (err) {
        this.host.innerHTML = `<div class="vz-loading"><div><b>Couldn't run this code</b><p class="muted">${esc(err.message)}</p><button class="btn small" id="vzRetry">Try again</button></div></div>`;
        this.host.querySelector("#vzRetry").onclick = () => this.load(this.code);
      } finally { statusListeners.delete(listener); }
    }

    render() {
      const lines = this.code.split("\n"); if (lines.at(-1) === "") lines.pop();
      this.lines = lines;
      this.host.innerHTML = `<div class="vz">
        <div class="vz-left">
          ${this.editing
            ? `<textarea class="vz-edit" spellcheck="false">${esc(this.code)}</textarea>
               <div class="vz-controls"><div class="row"><button class="primary" data-a="rerun">▶ Run &amp; visualise</button><span class="muted" style="font-size:.8rem">Tab inserts 4 spaces</span></div>
               <label style="font-size:.8rem;color:var(--ink-3)">Input lines for <code>input()</code> (one per line)</label><textarea class="vz-stdin" rows="2" style="font:12px var(--font-mono);border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);padding:6px">${esc(this.stdin)}</textarea></div>`
            : `<div class="vz-code">${lines.map((l, n) => `<div class="vz-line" data-n="${n + 1}"><span class="ar">➜</span><span class="ln">${n + 1}</span><span>${l ? esc(l) : " "}</span></div>`).join("")}</div>
               <div class="vz-legend"><span><b class="r">➜</b> line about to run</span><span><b class="g">➜</b> line just ran</span><span><span class="ptr"></span> reference (points to an object)</span></div>
               <div class="vz-narr"></div>
               <div class="vz-controls">
                 <div class="row">
                   <button data-a="first" title="First step (Home)">⏮</button><button data-a="prev" title="Previous (←)">◀ Prev</button>
                   <button class="primary" data-a="next" title="Next (→)">Next ▶</button><button data-a="last" title="Last step (End)">⏭</button>
                   <button data-a="play" title="Auto-play (space)">⏵ Play</button>
                   <select data-a="speed" title="Play speed"><option value="1100">Slow</option><option value="600" selected>Normal</option><option value="250">Fast</option></select>
                   <span class="count"></span>
                 </div>
                 <input type="range" min="0" max="${this.steps.length - 1}" value="0" aria-label="Step slider">
               </div>`}
        </div>
        <div class="vz-right">
          <div class="vz-canvas"><svg class="arrows"></svg>
            <div class="vz-col"><h4>Frames (names)</h4><div class="vz-frames"></div></div>
            <div class="vz-col"><h4>Objects (values in memory)</h4><div class="vz-heap"></div></div>
          </div>
          <div class="vz-out"><h4>Output</h4><pre></pre><div class="figs"></div></div>
        </div></div>`;
      this.canvas = this.host.querySelector(".vz-canvas");
      this.host.querySelectorAll("[data-a]").forEach(b => {
        const a = b.dataset.a;
        if (a === "speed") b.onchange = () => { if (this.playing) { this.pause(); this.play(); } };
        else b.onclick = () => this.act(a);
      });
      const range = this.host.querySelector("input[type=range]");
      if (range) range.oninput = () => this.go(+range.value);
      const ta = this.host.querySelector(".vz-edit");
      if (ta) ta.addEventListener("keydown", e => {
        if (e.key === "Tab") { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText("    ", s, ta.selectionEnd, "end"); }
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.act("rerun"); }
      });
      this.canvas.addEventListener("scroll", () => drawArrows(this.canvas));
      this.go(this.i);
    }

    act(a) {
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
      const sp = +(this.host.querySelector("[data-a=speed]")?.value || 600);
      this.playing = setInterval(() => { if (this.i >= this.steps.length - 1) this.pause(); else this.go(this.i + 1); }, sp);
      const b = this.host.querySelector("[data-a=play]"); if (b) b.textContent = "⏸ Pause";
    }
    pause() {
      clearInterval(this.playing); this.playing = null;
      const b = this.host.querySelector("[data-a=play]"); if (b) b.textContent = "⏵ Play";
    }
    key(e) {
      if (this.editing) return false;
      if (e.key === "ArrowRight") { this.act("next"); return true; }
      if (e.key === "ArrowLeft") { this.act("prev"); return true; }
      if (e.key === "Home") { this.act("first"); return true; }
      if (e.key === "End") { this.act("last"); return true; }
      if (e.key === " ") { this.act("play"); return true; }
      return false;
    }

    go(i) {
      if (!this.steps.length) return;
      this.i = Math.max(0, Math.min(this.steps.length - 1, i));
      const s = this.steps[this.i], p = this.steps[this.i - 1], last = this.i === this.steps.length - 1;
      const H = this.host;
      // code arrows
      H.querySelectorAll(".vz-line").forEach(el => el.classList.remove("cur", "prev"));
      if (p && p.l !== s.l) H.querySelector(`.vz-line[data-n="${p.l}"]`)?.classList.add("prev");
      const cur = H.querySelector(`.vz-line[data-n="${s.l}"]`);
      if (cur) { cur.classList.add("cur"); const box = H.querySelector(".vz-code"); const r = cur.offsetTop - box.clientHeight / 2; if (Math.abs(box.scrollTop - r) > box.clientHeight / 3) box.scrollTop = r; }
      const count = H.querySelector(".count"); if (count) count.textContent = `Step ${this.i + 1} / ${this.steps.length}`;
      const range = H.querySelector("input[type=range]"); if (range) range.value = this.i;
      H.querySelector("[data-a=prev]") && (H.querySelector("[data-a=prev]").disabled = this.i === 0);
      H.querySelector("[data-a=next]") && (H.querySelector("[data-a=next]").disabled = last);
      // narration
      const narr = H.querySelector(".vz-narr");
      if (narr && this.lines) {
        let t = narrate(this.steps, this.i, this.lines);
        if (last) t += this.result.error ? `<br>🛑 Program stopped with <b>${esc(this.result.error)}</b>${this.result.errLine ? ` (line ${this.result.errLine})` : ""}.` : this.result.truncated ? `<br>⏸️ Stopped after ${this.steps.length} steps (limit). Probably a long or infinite loop.` : `<br>🏁 This is the last step. The program finished.`;
        narr.innerHTML = t;
      }
      // frames
      const prevTop = p ? new Map(p.f.map(f => [f.id, new Map(f.v.map(([k, v]) => [k, short(v, p.h)]))])) : new Map();
      H.querySelector(".vz-frames").innerHTML = s.f.map((f, fi) => {
        const isTop = fi === s.f.length - 1; const pv = prevTop.get(f.id);
        const rows = f.v.map(([k, v]) => {
          const changed = pv && pv.get(k) !== short(v, s.h);
          return `<tr class="${changed ? "changed" : ""}"><td class="k">${esc(k)}</td><td class="v">${valCell(v, isTop ? "top-ptr" : "")}</td></tr>`;
        }).join("");
        const ret = isTop && s.e === "return" && s.r ? `<tr class="ret"><td class="k">return</td><td class="v">${valCell(s.r, "top-ptr")}</td></tr>` : "";
        return `<div class="vz-frame${isTop ? " top" : ""}"><div class="fh">${esc(f.n)}</div>${rows || ret ? `<table>${rows}${ret}</table>` : `<div class="none">no variables yet</div>`}</div>`;
      }).join("") || `<div class="muted" style="font-size:.85rem">(nothing yet)</div>`;
      // heap
      const prevHeap = p ? p.h : {};
      H.querySelector(".vz-heap").innerHTML = layoutHeap(s).map(row => `<div class="vz-row">${row.map(h => renderObj(h, s.h[h], !prevHeap[h] || JSON.stringify(prevHeap[h]) !== JSON.stringify(s.h[h]))).join("")}</div>`).join("") || `<div class="muted" style="font-size:.85rem">No objects yet. Plain numbers, strings, booleans and None are shown right inside the frame.</div>`;
      // output
      let out = esc(this.result.stdout.slice(0, s.o));
      if (last) out = esc(this.result.stdout);
      if (last && this.result.error) out += `<span class="err">${out && !out.endsWith("\n") ? "\n" : ""}Traceback → ${esc(this.result.error)}</span>`;
      H.querySelector(".vz-out pre").innerHTML = out || `<span class="muted">(no output yet)</span>`;
      H.querySelector(".vz-out .figs").innerHTML = last ? (this.result.figures || []).map(b => `<img alt="figure" src="data:image/png;base64,${b}">`).join("") : "";
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
    open(code) {
      const ov = overlay(); ov.hidden = false; document.body.style.overflow = "hidden";
      const status = document.getElementById("vizStatus");
      if (overlayViz) overlayViz.destroy();
      overlayViz = new Visualiser(document.getElementById("vizBody"), { onStatus: m => (status.textContent = m) });
      overlayViz.load(code);
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
