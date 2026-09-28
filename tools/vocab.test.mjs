#!/usr/bin/env node
/* Quest Lines — vocabulary tests (no browser needed):  node tools/vocab.test.mjs
   Runs the game's own public/js/ql2/vocab.js against the real public/data/vocabulary.js. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
const sandbox = { console, setTimeout, clearTimeout, AbortController, window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/data/vocabulary.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/js/ql2/vocab.js'), 'utf8'), sandbox);
const Core = sandbox.QLVocabCore;
const DATA = sandbox.window.QL_VOCAB_DATA;

function manager(fetchImpl, online = true){
  const M = Core.makeManager({ storage: mem() }); M.load(DATA);
  M.setLexicon(new Set(DATA.words.map(r => r.word).concat(['xyzabc-not', 'running', 'ran', 'runs'])));
  M.provider.online = () => online; M.provider.minGapMs = 0;
  M.provider.fetchImpl = fetchImpl || (async () => { throw new Error('network disabled in tests'); });
  return M;
}
let pass = 0, fail = 0;
async function t(name, fn){ try{ await fn(); pass++; console.log('✓', name); }catch(e){ fail++; console.log('✗', name, '—', e.message); } }
const ok = (c, m) => { if(!c) throw new Error(m || 'assertion failed'); };

const M = manager();
await t('1  apple is in the database', () => { const g = M.getWord('apple'); ok(g && g.base === 'apple' && g.thai, JSON.stringify(g)); });
await t('2  Apple finds apple', () => ok(M.getWord('Apple').record === M.getWord('apple').record));
await t('3  APPLE (with spaces) finds apple', () => ok(M.getWord('  APPLE ').record === M.getWord('apple').record));
await t('4  unknown word xyzabc → null, no crash', async () => { ok(M.getWord('xyzabc') === null); ok(M.lookup('xyzabc') === null); ok(await M.translate('xyzabc') === null); ok(M.isPlayable('xyzabc') === false); });
await t('5  several meanings are kept (bat, fan, fly)', () => { ['bat','fan','fly'].forEach(w => { const r = M.getWord(w).record; ok(r.translations.length >= 2, w + ' has ' + r.translations.length); ok(M.getWord(w).thai.includes(' / '), 'no context → all meanings shown'); }); });
await t('5b context-aware translation picks the context meaning', () => {
  const r = Object.assign({}, M.getWord('bat').record, { contextTranslations: { combat: 'ไม้ตี' } });
  ok(Core.translationText(r, 'combat') === 'ไม้ตี'); ok(Core.translationText(r, 'school') === 'ค้างคาว / ไม้ตี'); ok(Core.translationText(Object.assign({}, r, { preferredTranslation: 'ค้างคาว' })) === 'ค้างคาว'); });
await t('6  run / running / ran are not the same answer', () => {
  ok(M.validateAnswer('run', 'run')); ok(M.validateAnswer(' RUN ', 'run'), 'case + spaces');
  ok(!M.validateAnswer('running', 'run'), 'running ≠ run'); ok(!M.validateAnswer('ran', 'run'), 'ran ≠ run'); ok(!M.validateAnswer('apples', 'apple'), 'apples ≠ apple');
  const g = M.getWord('running'); ok(!g || g.match !== 'exact' || g.base === 'running', 'running is not silently the record for run'); });
await t('6b a form only counts when listed in acceptedAnswers', () => {
  const D = Core.makeDatabase(); D.load({ words: [{ id:'word_000001', word:'run', baseWord:'run', translations:['วิ่ง'], partOfSpeech:['verb'], difficulty:1, category:['sports'], length:3, forms:['run','runs','running','ran'], acceptedAnswers:['run','running'], verified:false, source:'manual', status:'approved' }] }, { quiet:true });
  const r = D.get('run'); ok(Core.AnswerMatcher.matches('Running', 'run', r)); ok(!Core.AnswerMatcher.matches('ran', 'run', r)); ok(D.getForm('ran') === r, 'ran is indexed as a form of run'); });
await t('7  offline: words in the database work, nothing is fetched', async () => {
  let calls = 0; const off = manager(async () => { calls++; throw new Error('x'); }, false);
  ok(off.lookup('journey').thai === 'การเดินทาง'); ok(off.isTargetWord('journey')); ok(off.isPlayable('journey'));
  ok(await off.translate('journey') !== null); ok(await off.translate('qwertyuiop') === null); ok(calls === 0, 'fetch was called offline'); });
await t('8  API error: translate() resolves null, never throws, then cools down', async () => {
  let calls = 0; const bad = manager(async () => { calls++; throw new Error('503'); });
  for(const w of ['zzzaa','zzzab','zzzac','zzzad']) ok(await bad.translate(w) === null);
  ok(bad.provider.coolUntil > Date.now(), 'cool-down after repeated failures'); const before = calls; await bad.translate('zzzae'); ok(calls === before, 'no request during cool-down'); });
await t('8b same word in flight = one request; result is a pending draft, never a target word', async () => {
  let calls = 0; const good = manager(async () => { calls++; await new Promise(r => setTimeout(r, 30)); return { ok:true, json: async () => [[['ทดสอบ']], null] }; });
  const [a, b] = await Promise.all([good.translate('qqtest'), good.translate('QQTEST')]);
  ok(calls === 1, 'requests: ' + calls); ok(a && a.pending && a.thai === 'ทดสอบ' && b.thai === 'ทดสอบ');
  const g = good.getWord('qqtest'); ok(g.status === 'pending' && g.source === 'api' && !g.official && !g.target);
  ok(!good.isTargetWord('qqtest')); ok(!good.isPlayable('qqtest'), 'an API result never makes a word playable'); await good.translate('qqtest'); ok(calls === 1, 'cached'); });
await t('9  duplicate words are detected (apple / Apple / APPLE)', () => {
  const d = Core.VocabularyValidator.findDuplicates([{ id:'a', word:'apple' }, { id:'b', word:'Apple' }, { id:'c', word:' APPLE ' }]); ok(d.length === 2, JSON.stringify(d));
  ok(Core.VocabularyValidator.findDuplicates(DATA.words).length === 0, 'database has duplicates'); });
await t('10 invalid records are kept out of the official database', () => {
  const base = { id:'word_000001', word:'apple', baseWord:'apple', translations:['แอปเปิล'], partOfSpeech:['noun'], difficulty:1, category:['food'], length:5, forms:['apple','apples'], acceptedAnswers:['apple'], verified:true, source:'dictionary', status:'approved' };
  ok(Core.VocabularyValidator.validate(base).ok, Core.VocabularyValidator.validate(base).errors.join());
  const bads = [ { word:'' }, { translations:[] }, { difficulty:9 }, { category:['cars'] }, { acceptedAnswers:'apple' }, { status:'ok' }, { partOfSpeech:['thing'] }, { source:'api' }, { verified:true, status:'pending' }, { length:4 } ];
  bads.forEach(b => ok(!Core.VocabularyValidator.validate(Object.assign({}, base, b)).ok, 'accepted: ' + JSON.stringify(b)));
  const D = Core.makeDatabase(); D.load({ words: [base, Object.assign({}, base, { id:'word_000002', word:'APPLE' }), Object.assign({}, base, { id:'word_000003', word:'pear', translations:[] })] }, { quiet:true });
  ok(D.size() === 1 && D.rejectedOnLoad.length === 2, `size ${D.size()} rejected ${D.rejectedOnLoad.length}`); });
await t('11 whole database passes validation', () => { const D = Core.makeDatabase(); D.load(DATA, { quiet:true }); ok(D.rejectedOnLoad.length === 0, JSON.stringify(D.rejectedOnLoad.slice(0,3))); ok(D.size() === DATA.words.length); });
await t('12 word length uses the normalised word', () => { ok(Core.wordLength('  Apple ') === 5); ok(M.getWord('apple').record.length === 5); });
await t('13 rejected / deprecated records are not used for new content', () => {
  const D = Core.makeManager({ storage: mem() }); D.load({ words: [
    { id:'word_000001', word:'aaa', baseWord:'aaa', translations:['ก'], partOfSpeech:[], difficulty:1, category:['general'], length:3, acceptedAnswers:['aaa'], verified:false, source:'manual', status:'rejected', target:true },
    { id:'word_000002', word:'bbb', baseWord:'bbb', translations:['ข'], partOfSpeech:[], difficulty:1, category:['general'], length:3, acceptedAnswers:['bbb'], verified:false, source:'manual', status:'deprecated', target:true } ] });
  ok(D.lookup('aaa') === null, 'rejected must not be shown'); ok(!D.isTargetWord('aaa')); ok(D.isTargetWord('bbb'), 'deprecated keeps working for old content'); ok(D.pool().length === 0, 'pool excludes rejected + deprecated'); });

console.log(`\n${pass} passed · ${fail} failed`);
process.exit(fail ? 1 : 0);
