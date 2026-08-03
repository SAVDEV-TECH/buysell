/**
 * BuySell High-Concurrency Stress Test Engine (Native Fetch Edition)
 * Runs natively on Node.js without requiring third-party CLI installation.
 * 
 * Usage:
 *   node loadtest.mjs [targetUrl] [totalRequests] [concurrency]
 */

const targetUrl = (process.argv[2] || "https://buysell-ebon.vercel.app").replace(/\/$/, "");
const totalRequests = parseInt(process.argv[3] || "200", 10);
const concurrency = parseInt(process.argv[4] || "20", 10);

console.log("=================================================");
console.log("🚀 BuySell High-Concurrency Stress Test Engine");
console.log("=================================================");
console.log(`🎯 Target Base URL : ${targetUrl}`);
console.log(`📊 Total Requests   : ${totalRequests.toLocaleString()}`);
console.log(`⚡ Concurrent Workers: ${concurrency.toLocaleString()}`);
console.log("=================================================\n");

const endpoints = [
  { name: "Home Page", path: "/" },
  { name: "Marketplace", path: "/marketplace" },
  { name: "Manufacturers", path: "/manufacturers" },
  { name: "Messages API", path: "/api/messages?conversationId=test-load-id" },
];

let completed = 0;
let successes = 0;
let failures = 0;
let totalLatency = 0;
let minLatency = Infinity;
let maxLatency = 0;
const startTime = Date.now();

async function makeRequest(url) {
  const reqStart = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "BuySell-LoadTest-Engine/1.0",
        "Accept": "*/*",
      },
    });
    clearTimeout(timeoutId);
    const latency = Date.now() - reqStart;

    // HTTP 200, 204, 401, 403 are all valid API/Page responses
    const isOk = res.status >= 200 && res.status < 500;
    return { ok: isOk, status: res.status, latency };
  } catch (err) {
    clearTimeout(timeoutId);
    const latency = Date.now() - reqStart;
    const isAbort = err.name === "AbortError";
    return { ok: false, status: isAbort ? 408 : 0, latency, error: err.message };
  }
}

async function worker(queue) {
  while (queue.length > 0) {
    const item = queue.shift();
    if (item === undefined) break;

    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const url = `${targetUrl}${endpoint.path}`;

    const res = await makeRequest(url);
    completed++;
    totalLatency += res.latency;
    minLatency = Math.min(minLatency, res.latency);
    maxLatency = Math.max(maxLatency, res.latency);

    if (res.ok) {
      successes++;
    } else {
      failures++;
    }

    if (completed % Math.max(1, Math.floor(totalRequests / 10)) === 0 || completed === totalRequests) {
      const pct = ((completed / totalRequests) * 100).toFixed(0);
      console.log(`⏳ Progress: ${completed}/${totalRequests} (${pct}%) | Success: ${successes} | Errors: ${failures}`);
    }
  }
}

async function run() {
  const queue = Array.from({ length: totalRequests }, (_, i) => i);
  const workers = [];

  for (let i = 0; i < concurrency; i++) {
    workers.push(worker(queue));
  }

  await Promise.all(workers);

  const durationSec = (Date.now() - startTime) / 1000;
  const avgLatency = (totalLatency / Math.max(1, totalRequests)).toFixed(1);
  const rps = (totalRequests / Math.max(0.1, durationSec)).toFixed(1);

  console.log("\n=================================================");
  console.log("🏁 LIVE VERCEL STRESS TEST RESULTS SUMMARY");
  console.log("=================================================");
  console.log(`🎯 Target Deployment  : ${targetUrl}`);
  console.log(`⏱️ Total Time Elapsed : ${durationSec.toFixed(2)}s`);
  console.log(`🚀 Requests / Second  : ${rps} req/sec`);
  console.log(`✅ Successful Responses: ${successes.toLocaleString()} (${((successes/totalRequests)*100).toFixed(1)}%)`);
  console.log(`❌ Failed Requests     : ${failures.toLocaleString()} (${((failures/totalRequests)*100).toFixed(1)}%)`);
  console.log(`📈 Latency (Average)  : ${avgLatency} ms`);
  console.log(`⚡ Latency (Min)      : ${minLatency === Infinity ? 0 : minLatency} ms`);
  console.log(`🐢 Latency (Max)      : ${maxLatency} ms`);
  console.log("=================================================\n");

  if (failures === 0) {
    console.log("🎉 SUCCESS: BuySell Vercel Deployment handled 100% of concurrent requests with ZERO failures!");
  } else {
    console.warn(`⚠️ NOTICE: ${failures} request(s) failed or timed out during load.`);
  }
}

run();
