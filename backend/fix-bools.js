const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  let content = fs.readFileSync(path.join(routesDir, file), 'utf8');

  // Fix inline SQL queries
  content = content.replace(/is_active = 1/g, "is_active = true");
  content = content.replace(/is_active = 0/g, "is_active = false");
  content = content.replace(/is_available = 1/g, "is_available = true");
  content = content.replace(/is_available = 0/g, "is_available = false");
  content = content.replace(/is_veg = 1/g, "is_veg = true");
  content = content.replace(/is_veg = 0/g, "is_veg = false");

  // Fix parameter values
  content = content.replace(/\? 1 : 0/g, "? true : false");
  
  fs.writeFileSync(path.join(routesDir, file), content, 'utf8');
});

console.log('Boolean refactoring complete.');
