#!/usr/bin/env node
'use strict';

const { collectRouteDiagnostics } = require('../dist/routeEngine/diagnostics');

async function main() {
  const report = await collectRouteDiagnostics();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch(err => {
  console.error(`Route diagnostics failed: ${err.message}`);
  process.exit(1);
});
