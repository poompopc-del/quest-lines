/* ==========================================================================
   QUEST LINES v45 — VOCABULARY SYSTEM
   --------------------------------------------------------------------------
   Vocabulary data is kept apart from combat logic:

     data/vocabulary.js   the Vocabulary Database (records, one per line)
     data/lexicon.js      the spelling lexicon (every word a player may spell)
     js/ql2/vocab.js      this file:
        VocabularyValidator  — schema checks, normalisation, duplicate detection
        VocabularyDatabase   — Map indexes (word → record, form → record, id → record)
        AnswerMatcher        — case / whitespace-insensitive answer checks
        DictionaryProvider   — the ONLY place that talks to an online translator
        VocabCache           — on-device cache of online results (always "pending")
        VocabularyManager    — the one API the game calls

   Combat never reaches the network: it asks VocabularyManager
   (isPlayable · lookup · isTargetWord · wordLength · validateAnswer).
   Online results are drafts (status "pending", source "api"): they are shown
   with a "รอตรวจ" label and never become target words or official data.
   Official vocabulary = status "approved" AND verified === true.

   Loaded before the main game script. Also loadable in Node (tools/vocab.mjs)
   through globalThis.QLVocabCore — no DOM access at load time.
   ========================================================================== */
(function(G){
  'use strict';
  /* ------------------------------ schema ------------------------------ */
  const SCHEMA = {
    version: 1,
    statuses: ['pending','approved','rejected','deprecated'],
    partsOfSpeech: ['noun','verb','adjective','adverb','pronoun','preposition','conjunction','interjection','determiner'],
    categories: ['general','animals','food','nature','technology','science','body','people','places','school','travel','sports','weapons','fantasy','combat','daily_life'],
    sources: ['dictionary','manual','curated','api','unknown'],
    difficulty: { 1:'Beginner', 2:'Easy', 3:'Intermediate', 4:'Advanced', 5:'Expert' },
    difficultyTh: { 1:'เริ่มต้น', 2:'ง่าย', 3:'ปานกลาง', 4:'ยาก', 5:'ยากมาก' },
    posTh: { noun:'คำนาม', verb:'คำกริยา', adjective:'คำคุณศัพท์', adverb:'คำกริยาวิเศษณ์', pronoun:'คำสรรพนาม', preposition:'คำบุพบท', conjunction:'คำสันธาน', interjection:'คำอุทาน', determiner:'คำนำหน้านาม' },
    categoryTh: { general:'ทั่วไป', animals:'สัตว์', food:'อาหาร', nature:'ธรรมชาติ', technology:'เทคโนโลยี', science:'วิทยาศาสตร์', body:'ร่างกาย', people:'ผู้คน', places:'สถานที่', school:'โรงเรียน', travel:'การเดินทาง', sports:'กีฬา', weapons:'อาวุธ', fantasy:'แฟนตาซี', combat:'การต่อสู้', daily_life:'ชีวิตประจำวัน' },
    required: ['id','word','baseWord','translations','partOfSpeech','difficulty','category','length','acceptedAnswers','verified','source','status'],
  };

  /* ------------------------------ validator ------------------------------ */
  const normalize = w => String(w == null ? '' : w).normalize('NFC').trim().toLowerCase();
  const wordLength = w => [...normalize(w)].length;          // code points of the normalised word (a phrase counts its space), never HTML / UTF-16 length
  const isArr = Array.isArray;
  const VocabularyValidator = {
    normalize, wordLength,
    /** @returns {{ok:boolean, errors:string[]}}  ctx.words: Set of normalised words already in the DB (duplicate check) */
    validate(entry, ctx){
      const e = [], r = entry || {};
      SCHEMA.required.forEach(k=>{ if(r[k] === undefined || r[k] === null || r[k] === '') e.push(`missing ${k}`); });
      const w = normalize(r.word);
      if(!w) e.push('word is empty');
      else if(!/^[a-z][a-z'-]*( [a-z][a-z'-]*)*$/.test(w)) e.push(`word "${r.word}" may only use a–z, ' and - (single spaces between words of a phrase)`);
      if(r.length !== undefined && w && r.length !== wordLength(w)) e.push(`length ${r.length} ≠ ${wordLength(w)}`);
      if(!isArr(r.translations) || !r.translations.length || r.translations.some(t=>typeof t!=='string' || !t.trim())) e.push('translations must be a non-empty array of text');
      if(r.preferredTranslation && isArr(r.translations) && !r.translations.includes(r.preferredTranslation)) e.push('preferredTranslation must be one of translations');
      if(r.contextTranslations && (typeof r.contextTranslations!=='object' || Object.values(r.contextTranslations).some(t=>typeof t!=='string' || !t.trim()))) e.push('contextTranslations must map context → text');
      if(!isArr(r.partOfSpeech) || r.partOfSpeech.some(p=>!SCHEMA.partsOfSpeech.includes(p))) e.push('partOfSpeech must be an array of: ' + SCHEMA.partsOfSpeech.join(', '));
      if(!Number.isInteger(r.difficulty) || r.difficulty<1 || r.difficulty>5) e.push('difficulty must be an integer 1–5');
      if(!isArr(r.category) || !r.category.length || r.category.some(c=>!SCHEMA.categories.includes(c))) e.push('category must be a non-empty array of: ' + SCHEMA.categories.join(', '));
      if(!isArr(r.acceptedAnswers) || !r.acceptedAnswers.length || r.acceptedAnswers.some(a=>!normalize(a))) e.push('acceptedAnswers must be a non-empty array');
      if(r.forms !== undefined && (!isArr(r.forms) || r.forms.some(f=>!normalize(f)))) e.push('forms must be an array of words');
      if(typeof r.verified !== 'boolean') e.push('verified must be true / false');
      if(!SCHEMA.statuses.includes(r.status)) e.push('status must be one of: ' + SCHEMA.statuses.join(', '));
      if(!SCHEMA.sources.includes(r.source)) e.push('source must be one of: ' + SCHEMA.sources.join(', '));
      if(r.verified && (r.source==='unknown' || r.source==='api')) e.push(`a ${r.source} record cannot be verified — re-source it (manual / dictionary) first`);
      if(r.verified && r.status!=='approved') e.push('verified records must be approved');
      if(r.id !== undefined && !/^word_\d{6}$/.test(r.id)) e.push('id must look like word_000001');
      if(ctx && ctx.words && w && ctx.words.has(w)) e.push(`duplicate word "${w}"`);
      if(ctx && ctx.ids && r.id && ctx.ids.has(r.id)) e.push(`duplicate id ${r.id}`);
      return { ok: !e.length, errors: e };
    },
    /** duplicates inside a list of records (case / space insensitive) */
    findDuplicates(list){
      const seen = new Map(), dup = [];
      (list||[]).forEach(r=>{ const k = normalize(r && r.word); if(!k) return; if(seen.has(k)) dup.push({ word:k, ids:[seen.get(k), r.id] }); else seen.set(k, r.id); });
      return dup;
    },
  };
  G.validateVocabularyEntry = (entry, ctx)=>VocabularyValidator.validate(entry, ctx);

  /* ------------------------------ database ------------------------------ */
  function makeDatabase(){
    const byWord = new Map(), byForm = new Map(), byId = new Map(), rejected = [];
    const db = {
      schemaVersion: SCHEMA.version, translationVersion: 1, sources: {},
      /** load records; invalid ones are kept out of the database and listed in db.rejectedOnLoad */
      load(data, opts){
        const list = (data && data.words) || [];
        this.translationVersion = (data && data.translationVersion) || 1; this.sources = (data && data.sources) || {};
        const words = new Set(), ids = new Set();
        list.forEach(r=>{ const v = VocabularyValidator.validate(r, { words, ids });
          if(!v.ok){ rejected.push({ word:r && r.word, errors:v.errors }); return; }
          words.add(normalize(r.word)); ids.add(r.id); this._index(r); });
        if(rejected.length && !(opts && opts.quiet) && typeof console!=='undefined') console.warn(`[vocab] ${rejected.length} record(s) failed validation and were not loaded`, rejected.slice(0,5));
        return this;
      },
      _index(r){
        const w = normalize(r.word); byWord.set(w, r); byId.set(r.id, r);
        (r.forms||[]).forEach(f=>{ const k = normalize(f); if(k && k!==w && !byForm.has(k)) byForm.set(k, r); });
      },
      /** add a record at runtime (game-authored words etc.) — must pass validation */
      add(r){ const v = VocabularyValidator.validate(r, { words:new Set(byWord.keys()), ids:new Set(byId.keys()) }); if(v.ok) this._index(r); return v; },
      get: w => byWord.get(normalize(w)) || null,
      getForm: w => byForm.get(normalize(w)) || null,
      getById: id => byId.get(id) || null,
      has: w => byWord.has(normalize(w)),
      all: () => [...byWord.values()],
      size: () => byWord.size,
      rejectedOnLoad: rejected,
    };
    return db;
  }

  /* ------------------------------ answer matching ------------------------------ */
  const AnswerMatcher = {
    /** exact word, ignoring case and surrounding spaces; inflected forms count only if listed in acceptedAnswers */
    matches(input, target, record){
      const a = normalize(input); if(!a) return false;
      const accepted = record && isArr(record.acceptedAnswers) ? record.acceptedAnswers.map(normalize) : [normalize(target)];
      if(target !== undefined && target !== null && !accepted.includes(normalize(target))) accepted.push(normalize(target));
      return accepted.includes(a);
    },
  };

  /* ------------------------------ translation text ------------------------------ */
  /** context-aware: ctx (string or array) → contextTranslations; else preferredTranslation; else every meaning */
  function translationText(r, ctx, sep){
    if(!r || !isArr(r.translations) || !r.translations.length) return '';
    const cs = ctx ? (isArr(ctx) ? ctx : [ctx]) : [];
    if(r.contextTranslations) for(const c of cs) if(c && r.contextTranslations[c]) return r.contextTranslations[c];
    if(r.preferredTranslation) return r.preferredTranslation;
    return r.translations.join(sep || ' / ');
  }

  /* ------------------------------ online dictionary provider ------------------------------ */
  // The only network code for vocabulary. Results are DRAFTS (pending) — never a source of truth.
  function makeProvider(){
    const P = {
      minGapMs: 350, maxConcurrent: 2, sessionCap: 150, failLimit: 3, cooldownMs: 60000, timeoutMs: 4000,
      inflight: new Map(), queue: [], active: 0, last: 0, sent: 0, fails: 0, coolUntil: 0,
      enabled: () => true, online: () => (typeof navigator==='undefined' || navigator.onLine !== false),
      fetchImpl: (url, o) => fetch(url, o),
      async _json(url){
        const ac = typeof AbortController!=='undefined' ? new AbortController() : null, t = setTimeout(()=>ac && ac.abort(), P.timeoutMs);
        try{ const r = await P.fetchImpl(url, ac ? { signal:ac.signal } : {}); if(!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { clearTimeout(t); }
      },
      /** one normalised word → { translations[], provider } | null | { skipped } | { error }. Same word in flight = same promise. */
      lookup(word){
        const w = normalize(word);
        // skipped = not asked (off / offline / cooling down / capped) · error = request failed · null = provider has no Thai for it
        if(!w || !/^[a-z]+$/.test(w) || !P.enabled() || !P.online()) return Promise.resolve({ skipped:true });
        if(Date.now() < P.coolUntil || P.sent >= P.sessionCap) return Promise.resolve({ skipped:true });
        if(P.inflight.has(w)) return P.inflight.get(w);
        const p = new Promise(res=>{ P.queue.push({ w, res }); P._pump(); }).finally(()=>P.inflight.delete(w));
        P.inflight.set(w, p); return p;
      },
      _pump(){
        if(P.active >= P.maxConcurrent || !P.queue.length) return;
        const wait = Math.max(0, P.last + P.minGapMs - Date.now());
        if(wait){ setTimeout(P._pump, wait); return; }
        const job = P.queue.shift(); P.active++; P.last = Date.now(); P.sent++;
        P._fetchOne(job.w).then(r=>{ P.fails = 0; job.res(r); }, ()=>{ if(++P.fails >= P.failLimit){ P.coolUntil = Date.now() + P.cooldownMs; P.fails = 0; } job.res({ error:true }); })
          .finally(()=>{ P.active--; P._pump(); });
      },
      async _fetchOne(w){
        const hasThai = t => /[฀-๿]/.test(t||'');
        let out = null, err = null;
        try{
          const d = await P._json('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=th&dt=t&dt=bd&q=' + encodeURIComponent(w));
          let list = [];
          if(d && d[1]) d[1].slice(0,2).forEach(e=>(e[1]||[]).slice(0,2).forEach(t=>{ if(hasThai(t)) list.push(t.trim()); }));
          if(!list.length && d && d[0] && d[0][0] && hasThai(d[0][0][0])) list = [String(d[0][0][0]).trim()];
          if(list.length) out = { translations:[...new Set(list)].slice(0,4), provider:'google-translate-gtx' };
        }catch(e){ err = e; }
        if(!out) try{
          const d = await P._json('https://api.mymemory.translated.net/get?langpair=en|th&q=' + encodeURIComponent(w));
          const t = d && d.responseData && d.responseData.translatedText;
          if(hasThai(t)) out = { translations:[String(t).trim().slice(0,60)], provider:'mymemory' };
          err = null;
        }catch(e){ err = err || e; }
        if(!out && err) throw err;
        return out;
      },
    };
    return P;
  }

  /* ------------------------------ on-device cache (pending drafts) ------------------------------ */
  function makeCache(storage){
    const KEY = 'questlines_vocab_cache_v1', LEGACY = 'questlines_tr_v1', MISS_TTL = 7*864e5;
    let data = { v:1, words:{}, miss:{} };
    const S = storage || (typeof localStorage!=='undefined' ? localStorage : null);
    try{ const raw = S && S.getItem(KEY); if(raw){ const d = JSON.parse(raw); if(d && d.words) data = Object.assign({ miss:{} }, d); } }catch(e){}
    // migrate the old web-translation cache (word → Thai text) into pending drafts, once
    try{ const old = S && S.getItem(LEGACY); if(old && !data.migrated){ const o = JSON.parse(old) || {};
      Object.entries(o).forEach(([w, th])=>{ const k = normalize(w); if(k && /^[a-z]+$/.test(k) && typeof th==='string' && th.trim() && !data.words[k]) data.words[k] = { translations:th.split(/\s*[,/]\s*/).filter(Boolean).slice(0,4), provider:'legacy-web-cache', t:Date.now() }; });
      data.migrated = true; } }catch(e){}
    const C = {
      get: w => data.words[normalize(w)] || null,
      set(w, r){ data.words[normalize(w)] = { translations:r.translations, provider:r.provider, t:Date.now() }; delete data.miss[normalize(w)]; C.save(); },
      miss(w){ data.miss[normalize(w)] = Date.now(); C.save(); },
      recentlyMissed: w => { const t = data.miss[normalize(w)]; return !!t && Date.now() - t < MISS_TTL; },
      remove(w){ delete data.words[normalize(w)]; C.save(); },
      all: () => Object.assign({}, data.words),
      save(){ try{ S && S.setItem(KEY, JSON.stringify(data)); }catch(e){} },
    };
    return C;
  }

  /* ------------------------------ manager ------------------------------ */
  function makeManager(opts){
    const DB = makeDatabase(), provider = makeProvider(), cache = makeCache(opts && opts.storage);
    let lexicon = null;
    const draftRecord = (w, c) => ({ id:null, word:w, baseWord:w, translations:c.translations, partOfSpeech:[], difficulty:null, category:['general'], length:wordLength(w),
      forms:[w], acceptedAnswers:[w], verified:false, source:'api', sourceReference:c.provider, status:'pending', translationVersion:0 });
    const M = {
      SCHEMA, db: DB, provider, cache, validator: VocabularyValidator, matcher: AnswerMatcher, translationText,
      load(data){ DB.load(data); return M; },
      /** spelling lexicon (a Set or a function returning one) — decides what a player may spell */
      setLexicon(src){ lexicon = src; },
      _lex(){ return typeof lexicon === 'function' ? lexicon() : lexicon; },
      normalize, wordLength,
      /** can this word be played? (the spelling lexicon decides; the network is never asked — an online result never makes a word playable) */
      isPlayable(w){ const k = normalize(w), L = M._lex(); if(!k) return false; if(L) return L.has(k); const r = DB.get(k); return !!(r && r.status!=='rejected'); },
      /**
       * Word data for a spelled word, offline only.
       * → { word, base, record, match:'exact'|'form'|'draft', thai, translations, target, official, verified, status, source, pending } | null
       */
      getWord(w, ctx){
        const k = normalize(w); if(!k) return null;
        let r = DB.get(k), match = 'exact';
        if(!r || r.status==='rejected'){ const f = DB.getForm(k); if(f && f.status!=='rejected'){ r = f; match = 'form'; } else r = null; }
        if(!r){ const c = cache.get(k); if(!c) return null; r = draftRecord(k, c); match = 'draft'; }
        const usable = r.status==='approved' || r.status==='deprecated';
        return { word:k, base:normalize(r.word), record:r, match, thai:translationText(r, ctx), translations:r.translations.slice(),
          target: !!r.target && usable, official: r.status==='approved' && r.verified===true, verified: r.verified===true,
          status:r.status, source:r.source, pending: r.status==='pending' };
      },
      /** legacy shape used across the game: { base, thai, bank } (drafts add web:true / pending:true) */
      lookup(w, ctx){
        const g = M.getWord(w, ctx); if(!g) return null;
        const o = { base:g.base, thai:g.thai, bank:g.target };
        if(g.pending){ o.web = true; o.pending = true; }
        return o;
      },
      /** ⭐ target word (approved / deprecated record flagged target, exact word or a listed form) */
      isTargetWord(w){ const g = M.getWord(w); return !!(g && g.target && g.match!=='draft'); },
      /** answer check for quizzes: case / space-insensitive; forms only when listed in acceptedAnswers */
      validateAnswer(input, target){ const r = DB.get(target); return AnswerMatcher.matches(input, target, r); },
      /** online draft for an unknown word — only called for display, never for gameplay rules */
      async translate(w, ctx){
        const now = M.lookup(w, ctx); if(now) return now;
        const k = normalize(w); if(!k || cache.recentlyMissed(k)) return null;
        let r = null; try{ r = await provider.lookup(k); }catch(e){ r = { error:true }; }
        if(r && r.translations && r.translations.length){ cache.set(k, r); return M.lookup(k, ctx); }
        if(r === null) cache.miss(k);            // the dictionary answered "no Thai" → don't ask again for a week
        return null;                             // unknown word: no guessed translation, ever
      },
      /** game-authored words (e.g. Boomtos' god names) — added as manual, approved, unverified */
      registerGameWord(w, thai, extra){
        const k = normalize(w); if(!k || DB.has(k)) return false;
        const rec = Object.assign({ id:'word_9' + String(DB.size()).padStart(5,'0'), word:k, baseWord:k, translations:[thai], partOfSpeech:['noun'], difficulty:3, category:['fantasy'],
          length:wordLength(k), forms:[k], acceptedAnswers:[k], verified:false, source:'manual', sourceReference:'game content', status:'approved', translationVersion:1, runtime:true }, extra||{});
        return DB.add(rec).ok;
      },
      /** list for pickers (puzzles etc.) — never rejected / deprecated / pending */
      pool(filter){ return DB.all().filter(r=>r.status==='approved' && (!filter || filter(r))); },
      search(q, limit){ const s = normalize(q); if(!s) return []; const out = [];
        for(const r of DB.all()){ if(r.word.includes(s) || r.translations.some(t=>t.includes(q.trim()))) { out.push(r); if(out.length >= (limit||50)) break; } } return out; },
      stats(){ const all = DB.all(), c = { total:all.length, approved:0, pending:0, rejected:0, deprecated:0, verified:0, official:0, target:0, drafts:Object.keys(cache.all()).length, invalidOnLoad:DB.rejectedOnLoad.length };
        all.forEach(r=>{ c[r.status]++; if(r.verified) c.verified++; if(r.verified && r.status==='approved') c.official++; if(r.target) c.target++; }); return c; },
      /** review export of online drafts (CSV) — check them, then import with tools/vocab.mjs */
      exportDraftsCSV(){ const q = s => `"${String(s==null?'':s).replace(/"/g,'""')}"`;
        const rows = Object.entries(cache.all()).map(([w, c])=>[w, c.translations.join(' / '), '', 1, 'general', 'api', c.provider, 'pending', 'false'].map(q).join(','));
        return 'word,thai,partOfSpeech,difficulty,category,source,sourceReference,status,verified\n' + rows.join('\n') + '\n'; },
    };
    return M;
  }

  G.QLVocabCore = { SCHEMA, VocabularyValidator, AnswerMatcher, makeDatabase, makeProvider, makeCache, makeManager, translationText, normalize, wordLength };
  if(typeof window !== 'undefined'){
    const VM = makeManager();
    VM.load(window.QL_VOCAB_DATA || { words:[] });
    G.VocabularyManager = VM;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
