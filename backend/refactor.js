const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  let content = fs.readFileSync(path.join(routesDir, file), 'utf8');

  // Add async to express route handlers
  content = content.replace(
    /\(req: Request, res: Response\): void => \{/g,
    'async (req: Request, res: Response): Promise<void> => {'
  );

  // Helper to convert ? to $1, $2 inside execute/query/queryOne calls
  // Since some queries span multiple lines, we need to carefully replace ? with $1...
  
  // Actually, let's just use await first.
  content = content.replace(/([^a-zA-Z0-9_])query\(/g, '$1await query(');
  content = content.replace(/([^a-zA-Z0-9_])queryOne\(/g, '$1await queryOne(');
  content = content.replace(/([^a-zA-Z0-9_])execute\(/g, '$1await execute(');
  
  // Fix double awaits if any
  content = content.replace(/await await/g, 'await');
  // Avoid replacing import { query }...
  content = content.replace(/import \{.*?await query.*?\}/, function(match){
    return match.replace(/await /g, '');
  });

  // Replace ? with $1, $2... within strings or string templates
  // It's safer to just replace it at runtime! Let me NOT replace ? here.
  // I will update db/index.ts to convert ? to $n! This is vastly safer.

  fs.writeFileSync(path.join(routesDir, file), content, 'utf8');
});

console.log('Refactoring complete.');
