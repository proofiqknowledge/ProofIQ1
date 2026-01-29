const axios = require('axios');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// CONFIG
const BASE_URL = 'http://localhost:5000/api';
const TOTAL_DURATION_SEC = 30; // 30 seconds for local validation
const RAMP_UP_SEC = 10;
const MAX_USERS = 50; // Safe local limit
const STATS = {
    requests: 0,
    errors: 0,
    latency: [],
    codes: {},
    scenarios_completed: 0
};
let ACTIVE_USERS = 0;

// UTILS
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const randomEl = (arr) => arr[Math.floor(Math.random() * arr.length)];
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

// METRICS
function recordMetric(duration, status) {
    STATS.requests++;
    STATS.latency.push(duration);
    STATS.codes[status] = (STATS.codes[status] || 0) + 1;
    if (status >= 400) STATS.errors++;
}

async function apiCall(method, endpoint, data = null, token = null) {
    const start = Date.now();
    try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios({ method, url: `${BASE_URL}${endpoint}`, data, headers });
        recordMetric(Date.now() - start, res.status);
        return res.data;
    } catch (err) {
        const status = err.response ? err.response.status : 500;
        recordMetric(Date.now() - start, status);
        // console.error(`Error on ${endpoint}: ${err.message}`); // Optional: noisy
        return null;
    }
}

// SCENARIOS
async function runTrainee() {
    const id = uuidv4().split('-')[0];
    const email = `load_trainee_${id}_${Date.now()}@test.com`;
    const name = `Trainee ${id}`;

    // 1. Register
    let res = await apiCall('post', '/auth/register', { name, email, password: 'Password123!', role: 'Trainee' });
    if (!res || !res.token) return; // Failed login
    const token = res.token;

    // Loop for duration of user life
    for (let i = 0; i < 5; i++) {
        // 2. Get Courses
        await apiCall('get', '/courses', null, token);
        await sleep(1000 + Math.random() * 2000); // Think time

        // 3. Get Exams
        await apiCall('get', '/exams/assigned/me', null, token);
        await sleep(2000);

        STATS.scenarios_completed++;
    }
}

async function runAdmin() {
    const id = uuidv4().split('-')[0];
    const email = `load_admin_${id}_${Date.now()}@test.com`;
    const name = `Admin ${id}`;

    // 1. Register
    let res = await apiCall('post', '/auth/register', { name, email, password: 'Password123!', role: 'Admin' });
    if (!res || !res.token) return;
    const token = res.token;

    for (let i = 0; i < 5; i++) {
        // 2. Get Users
        await apiCall('get', '/users', null, token);
        await sleep(1000);

        // 3. Get Exams
        await apiCall('get', '/admin/exams', null, token);
        await sleep(2000);

        STATS.scenarios_completed++;
    }
}

async function userWorker(role) {
    try {
        ACTIVE_USERS++;
        if (role === 'Admin') await runAdmin();
        else await runTrainee();
    } catch (e) {
        console.error(e);
    } finally {
        ACTIVE_USERS--;
    }
}

// MAIN LOOP
async function main() {
    log("🚀 Starting Load Test...");
    const startTime = Date.now();
    const endTime = startTime + (TOTAL_DURATION_SEC * 1000);

    const statsInterval = setInterval(() => {
        const latencies = STATS.latency.sort((a, b) => a - b);
        const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
        const avg = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(0) : 0;

        log(`Users: ${ACTIVE_USERS} | reqs: ${STATS.requests} | errs: ${STATS.errors} | p95: ${p95}ms | avg: ${avg}ms`);
    }, 5000);

    // Ramp up loop
    while (Date.now() < endTime) {
        const elapsed = (Date.now() - startTime) / 1000;

        // Calculate target users based on ramp
        let targetUsers = MAX_USERS;
        if (elapsed < RAMP_UP_SEC) {
            targetUsers = Math.floor((elapsed / RAMP_UP_SEC) * MAX_USERS);
        }

        if (ACTIVE_USERS < targetUsers) {
            // Spawn user
            const r = Math.random();
            const role = r > 0.8 ? 'Admin' : 'Trainee'; // 20% Admin, 80% Trainee
            userWorker(role); // don't await, let it run in background
        }

        await sleep(500); // Check every 500ms
    }

    // Finished
    clearInterval(statsInterval);
    log("🛑 Test Finished. Generating Report...");
    generateReport();
}

function generateReport() {
    const latencies = STATS.latency.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const avg = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(0) : 0;

    const report = `
# Load Test Report
- **Duration**: ${TOTAL_DURATION_SEC}s
- **Max Users**: ${MAX_USERS}
- **Total Requests**: ${STATS.requests}
- **Total Errors**: ${STATS.errors} (Rate: ${(STATS.errors / STATS.requests * 100).toFixed(2)}%)
- **Latency (Avg)**: ${avg}ms
- **Latency (p95)**: ${p95}ms
- **Latency (p99)**: ${p99}ms

## Status Codes
\`\`\`json
${JSON.stringify(STATS.codes, null, 2)}
\`\`\`
  `;

    fs.writeFileSync('load-test-report.md', report);
    log("✅ Report saved to load-test-report.md");
}

main();
