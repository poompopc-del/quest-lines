// Make a new developer-mode code for LETTERⁿ.
//   node tools/dev-pass.mjs "my new code"
// Paste the printed value into DEV_PASS_HASH in public/js/ql2/dev.js.
// (Codes are case-insensitive and trimmed. Devices that already entered the old code must enter the new one.)
function hash(str, seed){
  let h1 = 0xdeadbeef ^ (seed||0), h2 = 0x41c6ce57 ^ (seed||0);
  for(let i=0, ch; i<str.length; i++){ ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1>>>16), 2246822507); h1 ^= Math.imul(h2 ^ (h2>>>13), 3266489909);
  h2 = Math.imul(h2 ^ (h2>>>16), 2246822507); h2 ^= Math.imul(h1 ^ (h1>>>13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1>>>0)).toString(36);
}
const code = String(process.argv[2]||'').trim().toLowerCase();
if(!code){ console.error('usage: node tools/dev-pass.mjs "your code"'); process.exit(1); }
console.log(hash(code));
