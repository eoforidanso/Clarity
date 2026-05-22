const fs = require('fs');
const path = require('path');
const dirs = [
  '/Users/harrietappiah/Desktop/vscode/EHR1-master/server/routes',
  '/Users/harrietappiah/Desktop/vscode/EHR1-master/server/middleware'
];

for (const dir of dirs) {
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const lines = content.split('\n');
    // Simple heuristic: find lines with 'await' that are not inside any async function/arrow
    // Track async depth via a stack
    let asyncDepth = 0;
    let braceDepth = 0;
    let asyncBraceStart = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check if this line opens an async function
      const isAsyncFunc = /\basync\s+(function|\([^)]*\)\s*=>|\w+\s*=>)/.test(trimmed) ||
                          /\basync\s+\([^)]*\)\s*\{/.test(trimmed);
      
      // Count braces
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      
      if (isAsyncFunc) {
        asyncBraceStart.push(braceDepth + opens);
        asyncDepth++;
      }
      
      braceDepth += opens - closes;
      
      // Pop async contexts that have closed
      while (asyncBraceStart.length > 0 && braceDepth < asyncBraceStart[asyncBraceStart.length - 1]) {
        asyncBraceStart.pop();
        asyncDepth--;
      }
      
      // Check for await outside async context
      if (/\bawait\b/.test(line) && asyncDepth === 0) {
        console.log(`${file}:${i+1}: ${trimmed}`);
      }
    }
  }
}
