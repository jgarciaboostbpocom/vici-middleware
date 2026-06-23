#!/usr/bin/env node
'use strict';

const net = require('net');

const host = process.env.FASTAGI_HOST || '127.0.0.1';
const port = Number(process.env.FASTAGI_PORT || 4573);
const timeoutMs = Number(process.env.FASTAGI_TIMEOUT_MS || 800);

const agiPayload = [
  'agi_network: yes',
  'agi_network_script: route-outbound-shadow',
  'agi_request: agi://127.0.0.1/route-outbound-shadow',
  'agi_channel: SIP/test-00000001',
  'agi_uniqueid: fastagi-test-0001',
  'agi_callerid: 15551234567',
  'agi_extension: 2145551212',
  'agi_context: vici-mw-fastagi-shadow-test',
  'agi_accountcode: test-agent',
  'agi_arg_1: 2145551212',
  'agi_arg_2: TESTCAMP',
  'agi_arg_3: test-lead',
  'agi_arg_4: test-list',
  'agi_arg_5: test-agent',
  'agi_arg_6: manual',
  'agi_arg_7: TX',
  '',
  '',
].join('\n');

let response = '';
let settled = false;

const socket = net.createConnection({ host, port }, () => {
  socket.write(agiPayload);
});

const timer = setTimeout(() => {
  if (settled) return;
  settled = true;
  console.error(`No FastAGI response received within ${timeoutMs}ms`);
  socket.destroy();
  process.exit(2);
}, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 800);

socket.setEncoding('utf8');

socket.on('data', chunk => {
  response += chunk;
});

socket.on('end', () => {
  if (settled) return;
  settled = true;
  clearTimeout(timer);
  if (!response.trim()) {
    console.error('FastAGI connection closed without response');
    process.exit(2);
  }
  process.stdout.write(response);
  process.exit(0);
});

socket.on('error', err => {
  if (settled) return;
  settled = true;
  clearTimeout(timer);
  console.error(`FastAGI connection failed: ${err.message}`);
  process.exit(1);
});
