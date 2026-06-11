import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const srcRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) files.push(full);
  }
  return files;
}

for (const file of walk(srcRoot)) {
  if (file.endsWith(`${path.sep}utils${path.sep}logger.ts`)) continue;

  let content = fs.readFileSync(file, 'utf8');
  if (!/console\.(log|debug|info)\(/.test(content)) continue;

  content = content
    .replace(/console\.log\(/g, 'devLogger.log(')
    .replace(/console\.debug\(/g, 'devLogger.debug(')
    .replace(/console\.info\(/g, 'devLogger.info(');

  const loggerImportRe = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]*logger)['"]/;
  const match = content.match(loggerImportRe);

  if (match) {
    const names = match[1].split(',').map((n) => n.trim()).filter(Boolean);
    if (!names.includes('devLogger')) {
      names.unshift('devLogger');
      content = content.replace(
        loggerImportRe,
        `import { ${names.join(', ')} } from '${match[2]}'`,
      );
    }
  } else {
    const rel = path
      .relative(path.dirname(file), path.join(srcRoot, 'utils', 'logger'))
      .replace(/\\/g, '/');
    const importPath = rel.startsWith('.') ? rel : `./${rel}`;
    const importLine = `import { devLogger } from '${importPath}';\n`;

    const importMatches = [...content.matchAll(/^import .+$/gm)];
    if (importMatches.length > 0) {
      const last = importMatches[importMatches.length - 1];
      const insertAt = last.index + last[0].length + 1;
      content = content.slice(0, insertAt) + importLine + content.slice(insertAt);
    } else {
      content = importLine + content;
    }
  }

  fs.writeFileSync(file, content);
  console.log('updated', path.relative(srcRoot, file));
}
