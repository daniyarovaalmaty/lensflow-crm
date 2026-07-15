const fs = require('fs');
const doc = { notes: "{\"declarationNumber\":\"\",\"declarationDate\":\"\",\"userNotes\":\"\"}" };

let decl = {};
try { 
  decl = JSON.parse(doc.notes || '{}'); 
} catch(e) {
  console.log("Error parsing:", e);
}
console.log("decl:", decl);
console.log("Object.keys(decl).length:", Object.keys(decl).length);
