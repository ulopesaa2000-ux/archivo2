const fs = require('fs');
let t = fs.readFileSync('lib/types/database.types.ts', 'utf8');
if (t.startsWith('"')) {
    try {
        t = JSON.parse(t);
        fs.writeFileSync('lib/types/database.types.ts', t, 'utf8');
        console.log("Successfully un-JSON-ified database.types.ts");
    } catch (e) {
        console.error("Failed to parse", e);
    }
} else {
    console.log("File is already raw text");
}
