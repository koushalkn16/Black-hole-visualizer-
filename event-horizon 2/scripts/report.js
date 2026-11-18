// Writes VALIDATION.md from a live run of the suite: node scripts/report.js
const fs = require('fs');
const { runSuite } = require('../public/js/tests.js');
const r = runSuite();
const kinds = { exact: 'Exact analytic', rk4: 'Numerical (RK4) vs exact', approx: 'Approximate formula vs exact', obs: 'Model vs observation' };
let md = `# EVENT HORIZON — validation report\n\nGenerated ${r.at} with Node ${process.version}. ${r.passed}/${r.total} checks passed in ${r.ms.toFixed(1)} ms.\n\n`;
md += 'Every value below was computed during this run by `public/js/tests.js` — the same file the website executes in the browser.\n\n';
for (const k of Object.keys(kinds)) {
  const rows = r.results.filter(x => x.kind === k); if (!rows.length) continue;
  md += `## ${kinds[k]}\n\n| ID | Check | Expected / reference | Computed | Tolerance | Result |\n|---|---|---|---|---|---|\n`;
  rows.forEach(x => md += `| ${x.id} | ${x.name} | ${x.expected} | ${x.computed} | ${x.tol} | ${x.pass ? 'PASS' : 'FAIL'}${x.note ? ' — ' + x.note : ''} |\n`);
  md += '\n';
}
fs.writeFileSync(require('path').join(__dirname, '..', 'VALIDATION.md'), md);
console.log(`VALIDATION.md written: ${r.passed}/${r.total} passed`);
process.exit(r.passed === r.total ? 0 : 1);
