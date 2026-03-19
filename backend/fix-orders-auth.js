const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'routes', 'orders.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace('router.use(authenticate);', '// router.use(authenticate); removed to allow customer routes');
content = content.replace(/requireRoles\(/g, 'authenticate, requireRoles(');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed orders.ts authentication');
