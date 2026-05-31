const path = require('path');
const fs   = require('fs');

function isCjsTest(file) {
  try {
    const src = fs.readFileSync(file, 'utf8');
    return !src.includes("from 'vitest'") && !src.includes('from "vitest"');
  } catch {
    return false;
  }
}

const testFiles = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.test.js'))
  .sort()
  .map(f => path.join(__dirname, f))
  .filter(isCjsTest);

let passed = 0;
let failed = 0;

for (const file of testFiles) {
  const tests = require(file);
  const label = path.basename(file);
  for (const [name, fn] of Object.entries(tests)) {
    try {
      fn();
      console.log(`  ✓  ${label} > ${name}`);
      passed++;
    } catch (err) {
      console.log(`  ✗  ${label} > ${name}`);
      console.log(`     ${err.message}`);
      failed++;
    }
  }
}

const total = passed + failed;
console.log(`\n${total} test${total !== 1 ? 's' : ''}: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
