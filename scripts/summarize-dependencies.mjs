import { readFile } from 'node:fs/promises';

const report = JSON.parse(await readFile('npm-audit.json', 'utf8'));
console.log(JSON.stringify({ totals: report.metadata?.vulnerabilities, error: report.error }));
for (const [name, entry] of Object.entries(report.vulnerabilities ?? {})) {
  const advisories = entry.via.filter(value => value && typeof value === 'object').map(value => ({
    name: value.name, title: value.title, severity: value.severity, range: value.range, url: value.url
  }));
  console.log(JSON.stringify({ name, severity: entry.severity, isDirect: entry.isDirect, range: entry.range, fixAvailable: entry.fixAvailable, advisories }));
}
