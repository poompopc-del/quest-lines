#!/usr/bin/env node
/* ==========================================================================
   Quest Lines — Vocabulary developer tool
   Uses the SAME validator as the game (public/js/ql2/vocab.js).
   Writes public/data/vocabulary.js (one record per line).

   node tools/vocab.mjs stats
   node tools/vocab.mjs validate
   node tools/vocab.mjs dupes
   node tools/vocab.mjs search <text>
   node tools/vocab.mjs show <word>
   node tools/vocab.mjs add <word> --th "แปล1|แปล2" [--pos noun,verb] [--difficulty 2] [--category food]
                               [--source manual] [--ref "..."] [--status approved] [--verified] [--forms a,b] [--accept a,b]
   node tools/vocab.mjs edit <word> [same options as add] [--preferred "แปล"] [--context combat=พุ่งเข้าโจมตี]
                               [--add-th "แปล"] [--remove-th "แปล"] [--target|--no-target]
   node tools/vocab.mjs verify <word> [<word> …]        mark checked: verified=true, status=approved
   node tools/vocab.mjs status <word> <pending|approved|rejected|deprecated>
   node tools/vocab.mjs delete <word> [--hard]          default = status "deprecated" (kept for old saves)
   node tools/vocab.mjs export <file.json|file.csv> [--status approved] [--unverified]
   node tools/vocab.mjs import <file.json|file.csv> [--dry-run]

   Rules: an invalid record is never written. Editing a translation bumps translationVersion
   and clears verified (it has to be checked again). api / unknown sources can't be verified.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'public/data/vocabulary.js');
const CORE = path.join(ROOT, 'public/js/ql2/vocab.js');

/* ---------- load the shared core (validator / schema) without a browser ---------- */
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(CORE, 'utf8'), sandbox, { filename: CORE });
const { SCHEMA, VocabularyValidator: V, normalize, wordLength } = sandbox.QLVocabCore;

/* ---------- data file i/o ---------- */
function readDB(){
  const txt = fs.readFileSync(DATA, 'utf8');
  const head = txt.slice(0, txt.indexOf('window.QL_VOCAB_DATA'));
  const json = txt.slice(txt.indexOf('{', txt.indexOf('window.QL_VOCAB_DATA')), txt.lastIndexOf('}') + 1);
  return { head, data: JSON.parse(json) };
}
function writeDB(db){
  const { words, ...rest } = db.data;
  words.sort((a, b) => a.word.localeCompare(b.word));
  const meta = JSON.stringify(rest);
  const body = meta.slice(0, -1) + ',"words":[\n' + words.map(r => JSON.stringify(r)).join(',\n') + '\n]}';
  fs.writeFileSync(DATA, db.head + 'window.QL_VOCAB_DATA = ' + body + ';\n');
}
const nextId = words => 'word_' + String(words.reduce((m, r) => Math.max(m, +String(r.id).slice(5) || 0), 0) + 1).padStart(6, '0');
const find = (words, w) => words.find(r => normalize(r.word) === normalize(w));
function checkAll(words, skip){
  const ws = new Set(), ids = new Set(), bad = [];
  words.forEach(r => { if(r === skip) return; const v = V.validate(r, { words: ws, ids }); if(!v.ok) bad.push({ word: r.word, errors: v.errors }); ws.add(normalize(r.word)); ids.add(r.id); });
  return bad;
}

/* ---------- args ---------- */
const argv = process.argv.slice(2), cmd = argv.shift();
const opts = {}, pos = [];
for(let i = 0; i < argv.length; i++){
  const a = argv[i];
  if(a.startsWith('--')){ const k = a.slice(2); const n = argv[i+1]; if(n === undefined || n.startsWith('--')) opts[k] = true; else { opts[k] = n; i++; } }
  else pos.push(a);
}
const list = v => String(v).split(/[,|]/).map(x => x.trim()).filter(Boolean);
const die = (msg, code) => { console.error(msg); process.exit(code || 1); };

function applyOpts(r, o, isNew){
  let trChanged = false;
  if(o.th !== undefined){ r.translations = list(o.th); trChanged = true; }
  if(o['add-th']){ list(o['add-th']).forEach(t => { if(!r.translations.includes(t)) r.translations.push(t); }); trChanged = true; }
  if(o['remove-th']){ r.translations = r.translations.filter(t => !list(o['remove-th']).includes(t)); if(r.preferredTranslation && !r.translations.includes(r.preferredTranslation)) delete r.preferredTranslation; trChanged = true; }
  if(o.preferred !== undefined){ if(o.preferred === true || o.preferred === '') delete r.preferredTranslation; else r.preferredTranslation = o.preferred; trChanged = true; }
  if(o.context){ r.contextTranslations = r.contextTranslations || {}; String(o.context).split(';').forEach(p => { const [c, t] = p.split('='); if(c && t) r.contextTranslations[c.trim()] = t.trim(); else if(c) delete r.contextTranslations[c.trim()]; }); if(!Object.keys(r.contextTranslations).length) delete r.contextTranslations; trChanged = true; }
  if(o.pos) r.partOfSpeech = list(o.pos);
  if(o.difficulty) r.difficulty = +o.difficulty;
  if(o.category) r.category = list(o.category);
  if(o.forms) r.forms = [...new Set([normalize(r.word), ...list(o.forms).map(normalize)])];
  if(o.accept) r.acceptedAnswers = [...new Set(list(o.accept).map(normalize))];
  if(o.source) r.source = o.source;
  if(o.ref) r.sourceReference = o.ref;
  if(o.status) r.status = o.status;
  if(o.target === true) r.target = true;
  if(o['no-target']) delete r.target;
  if(o.cefr) r.cefr = o.cefr;
  if(o.pron) r.pron = o.pron;
  if(o.definition) r.definition = o.definition;
  if(trChanged && !isNew){ r.translationVersion = (r.translationVersion || 1) + 1; if(!o.verified) r.verified = false; }
  if(o.verified === true || o.verified === 'true') r.verified = true;
  if(o.verified === 'false') r.verified = false;
  r.length = wordLength(r.word);
}
function csvParse(txt){
  const rows = []; let row = [], cell = '', q = false;
  for(let i = 0; i < txt.length; i++){
    const c = txt[i];
    if(q){ if(c === '"'){ if(txt[i+1] === '"'){ cell += '"'; i++; } else q = false; } else cell += c; }
    else if(c === '"') q = true; else if(c === ','){ row.push(cell); cell = ''; }
    else if(c === '\n' || c === '\r'){ if(c === '\r' && txt[i+1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if(cell || row.length){ row.push(cell); rows.push(row); }
  const head = rows.shift().map(h => h.trim().replace(/^﻿/, ''));
  return rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}
const CSV_COLS = ['id','word','thai','partOfSpeech','difficulty','category','baseWord','forms','acceptedAnswers','preferredTranslation','target','cefr','pron','definition','source','sourceReference','status','verified','translationVersion'];
const csvCell = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function toCSVRow(r){
  return CSV_COLS.map(c => csvCell(c === 'thai' ? r.translations.join(' | ') : ['partOfSpeech','category','forms','acceptedAnswers'].includes(c) ? (r[c] || []).join(' | ') : r[c])).join(',');
}
function fromCSVRow(o){
  // only the columns present in the file are set — a partial CSV never wipes other fields of an existing record
  const has = k => Object.prototype.hasOwnProperty.call(o, k) && o[k] !== '';
  const r = { word: normalize(o.word) };
  if(has('id')) r.id = o.id;
  if(has('thai') || has('translations')) r.translations = list(o.thai || o.translations);
  if(has('baseWord')) r.baseWord = normalize(o.baseWord);
  if(has('partOfSpeech')) r.partOfSpeech = list(o.partOfSpeech);
  if(has('difficulty')) r.difficulty = Number(o.difficulty);
  if(has('category')) r.category = list(o.category);
  if(has('forms')) r.forms = list(o.forms).map(normalize);
  if(has('acceptedAnswers')) r.acceptedAnswers = list(o.acceptedAnswers).map(normalize);
  if(has('preferredTranslation')) r.preferredTranslation = o.preferredTranslation;
  if(has('target')) { if(/^(true|1|yes)$/i.test(o.target)) r.target = true; }
  ['cefr','pron','definition','source','sourceReference','status'].forEach(k => { if(has(k)) r[k] = o[k]; });
  if(has('verified')) r.verified = /^(true|1|yes)$/i.test(o.verified);
  if(has('translationVersion')) r.translationVersion = +o.translationVersion;
  return r;
}
// defaults for a brand-new record coming from CSV / JSON
const newDefaults = w => ({ baseWord: w, translations: [], partOfSpeech: [], difficulty: 1, category: ['general'], forms: [w], acceptedAnswers: [w], verified: false, source: 'unknown', status: 'pending', translationVersion: 1 });

/* ---------- commands ---------- */
const db = readDB(), words = db.data.words;
switch(cmd){
  case 'stats': {
    const c = { total: words.length, target: 0, verified: 0, official: 0, status: {}, source: {}, difficulty: {}, category: {}, multiMeaning: 0, noPartOfSpeech: 0 };
    words.forEach(r => { if(r.target) c.target++; if(r.verified) c.verified++; if(r.verified && r.status === 'approved') c.official++;
      c.status[r.status] = (c.status[r.status] || 0) + 1; c.source[r.source] = (c.source[r.source] || 0) + 1; c.difficulty[r.difficulty] = (c.difficulty[r.difficulty] || 0) + 1;
      r.category.forEach(k => c.category[k] = (c.category[k] || 0) + 1); if(r.translations.length > 1) c.multiMeaning++; if(!r.partOfSpeech.length) c.noPartOfSpeech++; });
    console.log(JSON.stringify(c, null, 1)); break;
  }
  case 'validate': {
    const bad = checkAll(words);
    if(bad.length){ bad.slice(0, 30).forEach(b => console.log('✗', b.word, '—', b.errors.join('; '))); die(`${bad.length} invalid record(s)`); }
    console.log(`✓ ${words.length} records valid`); break;
  }
  case 'dupes': {
    const d = V.findDuplicates(words); console.log(d.length ? d : 'no duplicates'); if(d.length) process.exitCode = 1; break;
  }
  case 'search': {
    const q = pos.join(' '); if(!q) die('usage: search <text>');
    const s = normalize(q);
    words.filter(r => r.word.includes(s) || r.translations.some(t => t.includes(q))).slice(0, 40)
      .forEach(r => console.log(`${r.id}  ${r.word.padEnd(14)} ${r.translations.join(' / ')}  [${r.status}${r.verified ? ', verified' : ''}${r.target ? ', ⭐' : ''}]`));
    break;
  }
  case 'show': { const r = find(words, pos[0]); if(!r) die('not found: ' + pos[0]); console.log(JSON.stringify(r, null, 1)); break; }
  case 'add': {
    const w = normalize(pos[0]); if(!w) die('usage: add <word> --th "..."');
    if(find(words, w)) die(`"${w}" already exists — use edit`);
    const r = { id: nextId(words), word: w, baseWord: normalize(opts.base || w), translations: [], partOfSpeech: [], difficulty: 1, category: ['general'], length: 0,
      forms: [w], acceptedAnswers: [w], verified: false, source: 'manual', status: 'approved', translationVersion: 1 };
    applyOpts(r, opts, true);
    const v = V.validate(r, { words: new Set(words.map(x => normalize(x.word))), ids: new Set(words.map(x => x.id)) });
    if(!v.ok) die('✗ not added — ' + v.errors.join('; '));
    words.push(r); writeDB(db); console.log('✓ added', r.id, r.word); break;
  }
  case 'edit': case 'verify': case 'status': case 'delete': {
    const targets = cmd === 'verify' ? pos : [pos[0]];
    targets.forEach(w => {
      const r = find(words, w); if(!r) die('not found: ' + w);
      const before = JSON.stringify(r);
      if(cmd === 'edit') applyOpts(r, opts, false);
      if(cmd === 'verify'){ r.verified = true; r.status = 'approved'; }
      if(cmd === 'status'){ if(!SCHEMA.statuses.includes(pos[1])) die('status must be: ' + SCHEMA.statuses.join(', ')); r.status = pos[1]; if(pos[1] !== 'approved') r.verified = false; }
      if(cmd === 'delete'){
        if(opts.hard){ words.splice(words.indexOf(r), 1); console.log('✓ removed', w, '(old saves just lose its translation)'); return; }
        r.status = 'deprecated'; r.verified = false;
      }
      const v = V.validate(r, { words: new Set(words.filter(x => x !== r).map(x => normalize(x.word))), ids: new Set(words.filter(x => x !== r).map(x => x.id)) });
      if(!v.ok){ Object.assign(r, JSON.parse(before)); die(`✗ ${w} unchanged — ` + v.errors.join('; ')); }
      console.log('✓', cmd, w, cmd === 'delete' ? '→ deprecated' : '');
    });
    writeDB(db); break;
  }
  case 'export': {
    const file = pos[0]; if(!file) die('usage: export <file.json|file.csv>');
    let out = words.filter(r => (!opts.status || r.status === opts.status) && (!opts.unverified || !r.verified));
    if(file.endsWith('.csv')) fs.writeFileSync(file, '﻿' + CSV_COLS.join(',') + '\n' + out.map(toCSVRow).join('\n') + '\n');
    else fs.writeFileSync(file, JSON.stringify({ schemaVersion: db.data.schemaVersion, translationVersion: db.data.translationVersion, words: out }, null, 1));
    console.log(`✓ exported ${out.length} record(s) → ${file}`); break;
  }
  case 'import': {
    const file = pos[0]; if(!file) die('usage: import <file.json|file.csv> [--dry-run]');
    const txt = fs.readFileSync(file, 'utf8');
    const incoming = file.endsWith('.csv') ? csvParse(txt).map(fromCSVRow) : (JSON.parse(txt).words || JSON.parse(txt));
    let added = 0, updated = 0; const rejected = [];
    const seen = new Set();
    incoming.forEach(inc => {
      const w = normalize(inc.word);
      if(seen.has(w)){ rejected.push({ word: w, errors: ['duplicate inside the import file'] }); return; } seen.add(w);
      const cur = find(words, w);
      if(cur){
        const next = Object.assign({}, cur, inc, { id: cur.id, word: cur.word }); next.length = wordLength(next.word);
        if(JSON.stringify(cur.translations) !== JSON.stringify(next.translations)){ next.translationVersion = (cur.translationVersion || 1) + 1; if(!/^(true|1|yes)$/i.test(String(inc.verified))) next.verified = false; }
        const v = V.validate(next, { words: new Set(words.filter(x => x !== cur).map(x => normalize(x.word))), ids: new Set(words.filter(x => x !== cur).map(x => x.id)) });
        if(!v.ok){ rejected.push({ word: w, errors: v.errors }); return; }
        if(JSON.stringify(cur) !== JSON.stringify(next)){ Object.assign(cur, next); updated++; }
      } else {
        const r = Object.assign(newDefaults(w), inc, { word: w, id: (inc.id && !words.some(x => x.id === inc.id)) ? inc.id : nextId(words) });
        r.length = wordLength(w);
        const v = V.validate(r, { words: new Set(words.map(x => normalize(x.word))), ids: new Set(words.map(x => x.id)) });
        if(!v.ok){ rejected.push({ word: w, errors: v.errors }); return; }
        words.push(r); added++;
      }
    });
    rejected.slice(0, 30).forEach(b => console.log('✗', b.word, '—', b.errors.join('; ')));
    console.log(`${opts['dry-run'] ? '[dry run] ' : ''}added ${added} · updated ${updated} · rejected ${rejected.length}`);
    if(!opts['dry-run']) writeDB(db);
    break;
  }
  default:
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 26).join('\n'));
}
