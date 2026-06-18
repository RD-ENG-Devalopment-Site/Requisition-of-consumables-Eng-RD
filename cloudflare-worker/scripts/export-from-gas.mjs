import fs from 'node:fs';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
const baseUrl = args['base-url'] || args.baseUrl || '';
const username = args.username || '';
const password = args.password || '';
const role = args.role || '';
const outputDir = path.resolve(process.cwd(), args.output || '../exports');

if (!baseUrl || !username || !password) {
  console.error('Usage: node scripts/export-from-gas.mjs --base-url <url> --username <user> --password <pass> [--role admin] [--output ../exports]');
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const loginRes = await callCompat(baseUrl, 'login', [username, password, role]);
if (!loginRes?.success || !loginRes?.token) {
  console.error('Login failed:', loginRes);
  process.exit(2);
}

const token = loginRes.token;
const jobs = [
  ['Config', async () => {
    const res = await callCompat(baseUrl, 'getConfig', []);
    return res?.data || {};
  }],
  ['Users', async () => {
    const res = await callCompat(baseUrl, 'getUsers', [token]);
    return ensureArray(res?.data);
  }],
  ['Items', async () => {
    const res = await callCompat(baseUrl, 'getItems', [token]);
    return ensureArray(res?.data);
  }],
  ['Receives', async () => {
    const res = await callCompat(baseUrl, 'getReceives', [token, {}]);
    return ensureArray(res?.data);
  }],
  ['Withdrawals', async () => {
    const res = await callCompat(baseUrl, 'getWithdrawals', [token, { status: 'all' }]);
    return ensureArray(res?.data);
  }],
  ['Transactions', async () => {
    const res = await callCompat(baseUrl, 'getTransactions', [token, {}]);
    return ensureArray(res?.data);
  }],
  ['AuditLogs', async () => {
    const res = await callCompat(baseUrl, 'getAuditLogs', [token, {}]);
    return ensureArray(res?.data);
  }]
];

for (const [name, run] of jobs) {
  const payload = await run();
  const filePath = path.join(outputDir, `${name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  const count = Array.isArray(payload) ? payload.length : 1;
  console.log(`Wrote ${name}.json (${count})`);
}

await callCompat(baseUrl, 'logout', [token]).catch(() => {});
console.log(`Export complete -> ${outputDir}`);

async function callCompat(url, fn, args) {
  const target = new URL(url);
  target.searchParams.set('fn', fn);
  target.searchParams.set('args', JSON.stringify(args || []));
  const response = await fetch(target, {
    headers: {
      'accept': 'application/json,text/plain,*/*'
    }
  });
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON from ${fn}: ${text.slice(0, 300)}`);
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    out[key] = value;
  }
  return out;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}
