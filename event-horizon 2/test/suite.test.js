// Runs the exact same validation suite the website runs in the browser.
const test = require('node:test');
const assert = require('node:assert');
const { runSuite } = require('../public/js/tests.js');

const run = runSuite();
for (const r of run.results) {
  test(`${r.id} [${r.kind}] ${r.name}`, () => {
    assert.ok(r.pass, `expected ${r.expected}, computed ${r.computed} (tolerance ${r.tol})`);
  });
}
