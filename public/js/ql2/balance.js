/* ==========================================================================
   QUEST LINES v44 — BALANCE
   --------------------------------------------------------------------------
   Every combat number that shapes the power curve lives here, so the game
   can be re-tuned without hunting through files. Loaded BEFORE the main
   game script (index.html) — nothing here touches the DOM or the save.

   Damage formula (evalWord + every hero / weapon wrapper):

       dmg = BASE × (1 + ΣBONUS) × (1 + ΣBURST) × penalties

     BASE   letter points × word length × weapon ATK/5 × ATK upgrade
     BONUS  combo · mastery · target word · element · gems · aura ·
            accessories · weapon perks · hero passives      (added together)
     BURST  critical · weakness · power potion · rude word ·
            hero crits / low-HP rage / finishers            (added together)

   Bonuses inside a group ADD, so Critical + Weakness = +85%, not ×2.03.
   Wrappers call dmgMod(r, 'bonus'|'burst', +x) instead of multiplying r.dmg.
   ========================================================================== */
const BALANCE = {
  /* ----------------------------- BASE ----------------------------- */
  LEN_STEP: .25,            // +25% per letter past 4 (word damage — unchanged)
  WEAPON_REF: 5,            // weapon ATK / 5 → Wooden Sword = ×1
  // weapon ATK — soft, near-linear curve (was 5 → 30, now 5 → 14)
  WEAPON_ATK: { wood:5, iron:6, axe:7, boomer:7, hammer:8, gerudo:8, moon:8, staff:9, sickle:9,
                frost:10, flame:10, storm:11, guardian:11, thunder:11, royal:12, savage:13, ancient:13, master:14,
                hellblade:11 },
  ATK_UP_PER_LV: .05,       // ATK upgrade: +5% per level, max 10 → +50% (was +8% → +80%)
  DEF_UP_PER_LV: .02,       // DEF upgrade: -2% per level, max 10 → -20% (was -3% → -30%)

  /* ----------------------------- BONUS ---------------------------- */
  COMBO_PER: .05, COMBO_MAX_STACK: 5,      // combo 1..5 → +5% .. +25% (was +8% .. +40%)
  MASTERY_PER_LV: .04,                     // word mastery Lv2..5 → +4% .. +16% (unchanged)
  TARGET_WORD_BONUS: .25,                  // ⭐ target word (was ×1.5)
  SCHOLAR_LENS_BONUS: .40,                 // ⭐ target word with Scholar's Lens (was ×2)
  GEM_BONUS: .30,                          // per gem tile (was ×1.5 each, multiplied)
  AURA_BONUS: .20,                         // per aura letter (was ×1.35 each, multiplied)
  SAGE_BONUS: .20,                         // Sage Stone, 5+ letters (was ×1.25)
  HOLY_UNDEAD_BONUS: .50,                  // holy word vs ghosts / skeletons (was ×1.5)
  // element words: bonus = ELEMENTS[el].mult - 1 (fire +20%, earth +15%, ice +10%, wind +5%)
  BURN_ELEMENT: .20,                       // fire element burn per turn (was 30% of the hit)
  THUNDER_ECHO: .50,                       // thunder element second strike (was 60%)
  GOD_MULT_MAX: 1.5,                       // Boomtos' god words: no god above +50% (Ares was ×2)
  GOD_HIT: { zeus:.30, artemis:.25 },      // extra god strikes, per hit (was 50% / 35%)

  /* ----------------------------- BURST ---------------------------- */
  CRIT_BONUS: .35,          // CRITICAL WORD (8+ letters or 2 rare letters) — was ×1.75
  CRIT_ULT_GAIN: 1,         // a critical word also fills +1 extra Ultimate pip
  WEAKNESS_BONUS: .50,      // weakness letter — was ×2
  POWER_POTION_BONUS: .50,  // Power Potion — was ×2
  RUDE_BONUS: .50,          // rude word (still costs 30% HP) — was ×2

  /* ----------------------------- ULTIMATE ------------------------- */
  ULT_BASE: 32, ULT_PER_STAGE: 2, ULT_PER_WORD: .5, ULT_WORD_CAP: 60,

  /* ----------------------------- DEFENCE -------------------------- */
  ARMOR_BLOCK: { none:0, buckler:.10, kite:.18, dragon:.25, mythril:.30 },   // was .12/.22/.30/.38
  MIN_TAKEN: .45,           // armor × hero passive × DEF upgrade can never cut a hit by more than 55%

  /* ----------------------------- ENEMIES -------------------------- */
  BOSS_PHASE2_ATK: .20,     // boss phase 2: +20% ATK (was +35%) …
  BOSS_PHASE2_HEAL: .08,    // … heals 8% (unchanged) …
  BOSS_PHASE2_TRAITS: ['stone','vamp'],   // … learns the first of these it lacks, and reveals a NEW weakness letter
  // hand-tuned bosses (js/ql2/boss-encounter.js) — multipliers on the stage's normal boss HP / ATK
  BOSS_TUNING: { kingslime:{ hp:2.2, atk:1.3 },   // chapter 1 boss (was HP x2.6 — player damage in chapter 1 is lower now)
                 necro:    { hp:2.4, atk:1.35 } }, // Tyrant, chapter 5 final boss (unchanged)
  // Dr. Zomboss (chapter 2 boss, js/ql2/zombies.js) — a long fight in cycles, like the original:
  //   head UP  (upTurns enemy turns): claw / stomp / crush, words only deal upDmg (the head is out of reach)
  //   head DOWN: eye turns yellow (fireball) or blue (iceball) → next turn it fires; the head stays low one
  //              more turn → words deal +weakBonus. An ice word stops a fireball, a fire word stops an iceball.
  ZOMBOSS: { hp:2.2, upTurns:2, upTurnsRage:1, upDmg:.6, weakBonus:.5, crushAtk:1.25, iceAtk:.75, iceStones:2, counterBonus:.5 },   // v58: less tanky (was hp 3.2 · up 3/2 turns · 35% dmg while up · headbutt ×1.4 · 3 stones)

  /* ----------------------------- WEAPON PERKS --------------------- */
  PERK: {
    axeLong: .25,           // Battle Axe, 6+ letters (was ×1.4)
    flame: .10,             // Flame Blade hidden bonus (was ×1.1)
    flameBurn: .20,         // Flame Blade burn per turn (was 30%)
    echo: .25,              // Boomerang, 5+ letters (was ×1.4)
    twin: .25,              // Gerudo, double letters (was ×1.5)
    scholar: .20,           // Scholar's Scimitar on ⭐ words (was ×1.5)
    reap: .30,              // Moonlit Sickle, enemy under 30% (was ×1.6)
    guardianPer: .03, guardianMax: 8,   // Guardian Sword, per combo (was +6% → +48%)
    heavyShort: .5,         // Lynel Crusher, 3-letter words (penalty, unchanged)
    heavyLong: .20,         // Lynel Crusher, 6+ letters (was ×1.3)
    masterBeam: .25,        // Master Sword at 90%+ HP (was ×1.5)
    masterHoly: .30,        // Master Sword holy vs undead (was ×2)
    chain: .50, chainOdds: .30,   // Lightning Blade (unchanged)
  },

  /* ----------------------------- NEW ACCESSORIES (v51, js/ql2/items.js) --- */
  ACC_NEW: { prism:.15, monocle:.25, rune:.20, leaf:.03, ironHeart:.15, hourglassUlt:2 },
  BOOTS_CHANCE: .30,        // Swift Boots (400 gold): shuffling keeps your turn 30% of the time (was: always)

  /* ----------------------------- HEROES --------------------------- */
  // Each hero: ONE damage mechanic (core) + ONE supporting passive.
  KNIGHT: { lowHp: .5, lowBonus: .10, finBonus: 0 },            // core: -15% damage taken · passive: HP < 50% → +10%
  PLINK:  { beamBonus: .20, finBonus: 0, block: .15 },          // core: full-HP sword beam +20% · passive: 15% shield block
  MIA:    { fan: .10, roll: .20, fin: .30, fire: .10, charm: .10 },   // core: moves by word length · passive: dodge / charm
  ELON:   { double: .25, longPer: .04, tier:{ melee:0, pistol:.10, xbow:.20, rpg:.30 }, rpgStep: .02, rpgCap: .10,
            focus: .15, qsPer: .10, qsMin: .30, qsMax: 1.0 },  // core: combo weapon tiers · passive: skills
  BOOM:   { rageStep: .20, rageMax: 2.0, lowHp: .1, lowHpBonus: .50, finisher: .50,   // core: rage stacks (linear, was x2/turn → x32) · passive: hellfire at low HP (was x10)
            carry: .50, bossPct: .20 },  // BOOM: normal enemy dies, 50% of its HP carries on (was 150%) · boss/mini takes the hit + 20% max HP (was: instant kill)
  X:      { releaseStep: .25, releaseMax: 2.0, pierce: .50 },   // release ×1, ×1.25, ×1.5 … max ×2 (was ×1, ×2, ×3 … unlimited) · x4+ pierce 50% (was 100%)
  KIRBY:  { per: 10, step: .50, max: 3.0, eatHp: .50 },
  // v66 Luffy — core: Gum-Gum move by word length · passive: rubber body vs heavy blows
  SONIC:  { dashLen: 5, dash: .20, homLen: 7, homing: .30, ringCut: .50, killRings: 10, superDmg: .30, superPer: 20, superMax: 3 },   // rings soak half a hit; Super Sonic = immune
  LUFFY:  { axeLen: 5, axe: .15, axeStun: .25, gatLen: 6, gatling: .22, bazLen: 8, bazooka: .35, rubber: .40, reflect: .25 },         // every 10 letters +50% (max ×3); a swallowed enemy adds 50% of its HP (was 100%)
  // v69 YOTA — core: palm → beam → hyper beam by word length (hyper pierces the queue) · passive: 📄 rent debt per surviving enemy turn, a beam collects it (heal)
  // v81: buffed hard on request — every hit ×2 (power), bigger move bonuses, the tactical Ultimate is now a damage finisher (FINAL EVICTION ×5 Ultimate)
  YOTA:   { power: 1.0, beamLen: 5, beam: .60, hyperLen: 7, hyper: 1.20, pierce: .60, pierceN: 3, debtPer: .15, debtMax: 5, healPer: .04, finalMul: 5, finalPierce: .75 },
  // v73 CREAM — core: split button charge (store + HEAT) → release ×(1+25%/HEAT, max ×2.25) · passive: aura guard −20% while HEAT > 0
  // v81: buffed hard on request — every hit ×2 (power), release +50%/HEAT up to ×4, the tactical Ultimate is now a damage finisher (BLOOD MOON ×5 Ultimate)
  CREAM:  { power: 1.0, relStep: .50, relMax: 4.0, guard: .80, crossLen: 5, cross: .50, kickLen: 7, kick: 1.0, rushHeat: 3, moonHeat: 5, finalMul: 7, finalSplash: .50 },

  /* ----------------------------- v64 TACTICS ---------------------- */
  // Enemy intent · word roles · guard · chain · perfect · objectives · events · tactical Ultimates (js/ql2/tactics.js, events.js)
  TAC: {
    guard: .75, guardCapHp: .60, guardRole: .25,     // 🛡 Guard: shield = 75% of the word's damage (max 60% max HP) · combat/weapon/body words +25%
    precisionLen: 6,                                 // 🎯 6+ letters (or a Critical Word) = PRECISION: shatters enemy shields
    controlEls: ['ice','thunder','wind','earth'],    // 🌀 CONTROL words interrupt spells and heals
    breakPct: .20,                                   // …so does any single hit of 20% of the enemy's max HP
    foodHeal: .06,                                   // 💚 food words heal 6% max HP
    chargeUlt: 1,                                    // ⚡ fantasy / technology / science words: Ultimate +1 extra
    chainStep: .08, chainMax: 5,                     // 🔗 word chain (next word starts with the last letter): +8% per link, max 5 links (+40%)
    perfect: .15, perfectUlt: 1,                     // ✨ PERFECT word (counters the intent): +15% burst · Ultimate +1
    enemyShield: .30, healPct: .12, healPoisoned: .5,// enemy DEFEND shield 30% max HP · HEAL 12% (half while burning / poisoned)
    hexMul: .5, hexStones: 3, venomMul: .8, venomTurns: 3, venomPct: .04, repeatVenom: 2,
    castMul: 2.0, castStones: 2, mimicPct: .40, summonMax: 2, summonHp: .45,
    bossFinal: .15, finalLen: 5,                     // boss FINAL WORD: under 15% HP only a 5+ letter word (or Ultimate) can finish it
    objChance: .55, objGold: 20, objGoldPer: 3, objXp: 30,
    elite: { hp: .40, atk: .20, gold: 2, gem: 1 },   // choice event: Elite battle
    freeShuffle: true,                               // shuffling a board with no playable word costs no turn
  },

  /* ----------------------------- helpers -------------------------- */
  weaponAtk(id, fallback){ const v = this.WEAPON_ATK[id]; return typeof v === 'number' ? v : fallback; },
  armorBlock(id, fallback){ const v = this.ARMOR_BLOCK[id]; return typeof v === 'number' ? v : fallback; },
  takenMul(block, charTaken, defMul){ return Math.max(this.MIN_TAKEN, (1 - (block||0)) * (charTaken==null ? 1 : charTaken) * (defMul==null ? 1 : defMul)); },
  comboBonus(c){ return Math.min(this.COMBO_MAX_STACK, Math.max(0, c||0)) * this.COMBO_PER; },
  ultDamage(b){ const am = typeof atkMul === 'function' ? atkMul() : 1;
    return Math.max(20, Math.round((this.ULT_BASE + b.stage.s*this.ULT_PER_STAGE + Math.min(this.ULT_WORD_CAP, (b.words||0)*this.ULT_PER_WORD)) * am)); },
  xRelease(n){ return n > 0 ? Math.min(this.X.releaseMax, 1 + (n-1)*this.X.releaseStep) : 1; },
  kirbyMult(letters){ return Math.min(this.KIRBY.max, 1 + this.KIRBY.step * Math.floor((letters||0) / this.KIRBY.per)); },
  pct(x){ return Math.round(x*100); },
};

/* Move a word's damage by +x inside its BONUS or BURST group.
   r.bonus / r.burst hold the group sums, so a +20% bonus on top of an existing
   +30% bonus scales the hit by 1.5/1.3 (additive) rather than ×1.2. */
function dmgMod(r, group, add, note){
  if(!r || r.state !== 'ok' || !add) return r;
  const g = group === 'burst' ? 'burst' : 'bonus';
  const cur = r[g] || 0, next = cur + add;
  r[g] = next;
  if(r.dmg > 0) r.dmg = Math.max(1, Math.round(r.dmg * (1 + next) / (1 + cur)));
  if(note && r.notes) r.notes.unshift(note);
  return r;
}
