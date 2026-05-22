import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const targets = [
  path.join(root, 'server/routes'),
  path.join(root, 'server/middleware'),
];

let totalFiles = 0;

for (const dir of targets) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const fp = path.join(dir, file);
    let content = fs.readFileSync(fp, 'utf8');
    const original = content;

    // 1. Add async to route handlers: router.METHOD('/path', (req, res) => {
    //    Handles optional middleware args before the handler
    content = content.replace(
      /router\.(get|post|put|patch|delete)\(([^,\n)]+(?:,\s*[^,\n)]+)*),\s*\(req,\s*res\)\s*=>/g,
      (match, method, args) => {
        // Skip if already async
        if (match.includes('async (req')) return match;
        return `router.${method}(${args}, async (req, res) =>`;
      }
    );

    // 2. Same but with next param
    content = content.replace(
      /router\.(get|post|put|patch|delete)\(([^,\n)]+(?:,\s*[^,\n)]+)*),\s*\(req,\s*res,\s*next\)\s*=>/g,
      (match, method, args) => {
        if (match.includes('async (req')) return match;
        return `router.${method}(${args}, async (req, res, next) =>`;
      }
    );

    // 3. Add await before db.prepare( not already preceded by await
    //    Match at start of line or after non-identifier chars
    content = content.replace(/^(\s*)(db\.prepare\()/gm, '$1await $2');
    content = content.replace(/([\s=({,!&|])db\.prepare\(/g, (match, prefix) => {
      return `${prefix}await db.prepare(`;
    });

    // 4. Fix accidental double await
    content = content.replace(/\bawait await\b/g, 'await');

    if (content !== original) {
      fs.writeFileSync(fp, content);
      console.log('Updated:', fp.replace(root + '/', ''));
      totalFiles++;
    } else {
      console.log('No changes:', fp.replace(root + '/', ''));
    }
  }
}
console.log('\nTotal files updated:', totalFiles);
