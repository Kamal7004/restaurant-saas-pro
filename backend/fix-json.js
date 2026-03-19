const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  let content = fs.readFileSync(path.join(routesDir, file), 'utf8');

  // Fix json_group_array and json_object to json_agg and json_build_object
  content = content.replace(/json_group_array/g, "json_agg");
  content = content.replace(/json_object/g, "json_build_object");
  
  fs.writeFileSync(path.join(routesDir, file), content, 'utf8');
});

console.log('JSON function refactoring complete.');
