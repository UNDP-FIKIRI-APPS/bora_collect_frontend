import fs from 'fs';
import path from 'path';

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

let fixed = 0;
for (const file of walk('src')) {
  let content = fs.readFileSync(file, 'utf8');
  const updated = content.replace(/;[\r\n]*import \{ devLogger \}/g, ';\nimport { devLogger }');
  if (updated !== content) {
    fs.writeFileSync(file, updated);
    fixed += 1;
    console.log('fixed', file);
  }
}
console.log('done', fixed);
