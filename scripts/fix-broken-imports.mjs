import fs from 'fs';

const files = [
  'src/pages/ControllerCampaignForms.tsx',
  'src/pages/PublicFormPage.tsx',
];

const brokenRe =
  /import \{\s*import \{ devLogger \} from '([^']+)';\s*\n\s*([\s\S]*?)\n\} from '([^']+)';/g;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const updated = content.replace(
    brokenRe,
    (_match, loggerPath, imports, fromPath) =>
      `import {\n${imports}\n} from '${fromPath}';\nimport { devLogger } from '${loggerPath}';`,
  );
  if (updated !== content) {
    fs.writeFileSync(file, updated);
    console.log('fixed', file);
  } else {
    console.log('no match', file);
  }
}
