const fs = require('fs');

let rebuildScript = fs.readFileSync('rebuild_server.cjs', 'utf8');
rebuildScript = rebuildScript.replace(/readFileSync\('new_generate_minute',/g, "readFileSync('new_generate_minute.ts',");
rebuildScript = rebuildScript.replace(/readFileSync\('temp_gen_minute',/g, "readFileSync('temp_gen_minute.ts',");
rebuildScript = rebuildScript.replace(/writeFileSync\('server',/g, "writeFileSync('server.ts',");
fs.writeFileSync('rebuild_server.cjs', rebuildScript);

