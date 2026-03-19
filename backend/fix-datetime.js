const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  let content = fs.readFileSync(path.join(routesDir, file), 'utf8');

  // Fix datetime('now') to NOW()
  content = content.replace(/datetime\('now'\)/g, "NOW()");
  
  fs.writeFileSync(path.join(routesDir, file), content, 'utf8');
});

console.log('Datetime refactoring complete.');
