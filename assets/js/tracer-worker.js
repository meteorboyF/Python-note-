// Module Web Worker: loads Pyodide once, then runs/traces code on request.
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v314.0.8/full/pyodide.mjs";
let py = null;
const ready = (async () => {
  postMessage({ type: "status", msg: "Downloading the Python runtime (first time only)…" });
  py = await loadPyodide();
  const src = await (await fetch(new URL("../py/tracer.py?v=5", import.meta.url))).text();
  py.runPython(src);
  postMessage({ type: "ready" });
})().catch(err => postMessage({ type: "fatal", msg: String(err) }));

onmessage = async (e) => {
  const { id, code, mode, stdin } = e.data;
  try {
    await ready;
    await py.loadPackagesFromImports(code, {
      messageCallback: m => postMessage({ type: "status", id, msg: m }),
      errorCallback: m => postMessage({ type: "status", id, msg: m }),
    });
    postMessage({ type: "running", id });
    py.globals.set("_pn_src", code);
    py.globals.set("_pn_mode", mode || "trace");
    py.globals.set("_pn_stdin", stdin || "");
    const json = py.runPython("run_user(_pn_src, _pn_mode, _pn_stdin)");
    postMessage({ type: "result", id, json });
  } catch (err) {
    postMessage({ type: "result", id, error: String(err) });
  }
};
