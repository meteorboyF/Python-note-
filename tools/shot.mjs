// Headless screenshot of the site (uses the installed google-chrome via DevTools protocol).
// usage: node shot.mjs <url> <out.png> <width> <height> [js-to-run-before-shot]
import { spawn } from "node:child_process";
const [url, out, w = "1280", h = "900", js = ""] = process.argv.slice(2);
const port = 9333 + Math.floor(Math.random() * 500);
const chrome = spawn("google-chrome", ["--headless=new", `--remote-debugging-port=${port}`, "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=${(await import("node:os")).tmpdir()}/pn-chrome-${port}`, `--window-size=${w},${h}`, "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;
for (let i = 0; i < 50; i++) { try { const l = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const p = l.find(x => x.type === "page"); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(200); }
await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Emulation.setDeviceMetricsOverride", { width: +w, height: +h, deviceScaleFactor: 1, mobile: +w < 700 });
await send("Page.enable");
await send("Page.navigate", { url });
await sleep(3500);
if (js) { const r = await send("Runtime.evaluate", { expression: `(async()=>{${js}})()`, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) console.log("JS error:", JSON.stringify(r.result.exceptionDetails).slice(0, 400)); else console.log("js:", JSON.stringify(r.result?.result?.value ?? null).slice(0, 300)); }
await sleep(600);
const shot = await send("Page.captureScreenshot", { format: "png" });
(await import("node:fs")).writeFileSync(out, Buffer.from(shot.result.data, "base64"));
ws.close(); chrome.kill(); process.exit(0);
