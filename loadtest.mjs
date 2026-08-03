/**
 * BuySell High-Concurreny Load & Stress Testing Script
 * Runs natively on Node.js without requiring third-party CLI installation.
 * 
 * Usage:
 *   node loadtest.mjs [targetUrl] [totalRequests] [concurrency]
 * 
 * Example:
 *   node loadtest.mjs http://localhost:3000 1000 50
 */

import http from "node:http";
import https from "node:https";

const targetUrl = process.argv[2] || "http://localhost:3000";
const totalRequests = parseInt(process.argv[3] || "500", 10);
const concurrency = parseInt(process.argv[4] || "50", 10);

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
  { name: "Messages API", path: "/api/messages?conversationId=test-load-id" },
];

let completed = 0;
let successes = 0;
let failures = 0;
let totalLatency = 0;
let minLatency = Infinity;
let maxLatency = 0;
const startTime = Date.now();

function makeRequest(url) {
  return new Promise((resolve) => {
    const reqStart = Date.now();
    const isHttps = url.startsWith("https");
    const client = isHttps ? https : http;

    const req = client.get(url, { timeout: 10000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        const latency = Date.now() - reqStart;
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode, latency });
      });
    });

    req.on("error", (err) => {
      const latency = Date.now() - reqStart;
      resolve({ ok: false, status: 0, latency, error: err.message });
    });

    req.on("timeout", () => {
      req.destroy();
      const latency = Date.now() - reqStart;
      resolve({ ok: false, status: 408, latency, error: "Timeout" });
    });
  });
}

async function worker(queue) {
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;

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
  const avgLatency = (totalLatency / totalRequests).toFixed(1);
  const rps = (totalRequests / durationSec).toFixed(1);

  console.log("\n=================================================");
  console.log("🏁 STRESS TEST RESULTS SUMMARY");
  console.log("=================================================");
  console.log(`⏱️ Total Time Elapsed : ${durationSec.toFixed(2)}s`);
  console.log(`🚀 Requests / Second  : ${rps} req/sec`);
  console.log(`✅ Successful Requests : ${successes.toLocaleString()} (${((successes/totalRequests)*100).toFixed(1)}%)`);
  console.log(`❌ Failed Requests     : ${failures.toLocaleString()} (${((failures/totalRequests)*100).toFixed(1)}%)`);
  console.log(`📈 Latency (Average)  : ${avgLatency} ms`);
  console.log(`⚡ Latency (Min)      : ${minLatency === Infinity ? 0 : minLatency} ms`);
  console.log(`🐢 Latency (Max)      : ${maxLatency} ms`);
  console.log("=================================================\n");

  if (failures === 0) {
    console.log("🎉 SUCCESS: All requests completed with zero failures!");
  } else {
    console.warn(`⚠️ NOTICE: ${failures} request(s) failed or timed out during load.`);
  }
}

run();
