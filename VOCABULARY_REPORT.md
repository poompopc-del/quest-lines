# Quest Lines v45 — Vocabulary Database

## ระบบเดิมที่พบก่อนแก้
| ส่วน | อยู่ที่ | ปัญหา |
|---|---|---|
| `DICT_FC` (103,128 คำ) | index.html | รายการคำสะกดที่เล่นได้ — ใช้ได้ดี แต่ปนอยู่ในโค้ดเกม |
| `WORD_BANK_RAW` (150 คำเป้าหมาย ⭐ + IPA + นิยาม + CEFR) | index.html | เป็น string ยาวในโค้ด ไม่มี id / สถานะ |
| `GLOSS_RAW` + `GLOSS_EXTRA` (~3,200 คำแปล) | index.html | หลายความหมายอัดอยู่ใน string เดียว (`"ค้างคาว, ไม้ตี"`) |
| `meaning()` + `stems()` | index.html | เดารูปคำตอนรัน (เช่น `news` → "ใหม่", `bated` → "ค้างคาว") |
| `fetchThai()` → Google / MyMemory | index.html | ผลแปลออนไลน์ถูกใช้เป็นคำแปลจริงทันที และถูกเขียนลงเซฟ |
| `save.book[word].th` | save | เก็บ “ข้อความคำแปล” ในเซฟ → แก้คำแปลแล้วเซฟเก่ายังโชว์ของเดิม |

ทั้งหมดถูก refactor เข้า VocabularyManager — ไม่ได้สร้างระบบใหม่ซ้อน

## 1. ไฟล์ที่สร้าง
| ไฟล์ | หน้าที่ |
|---|---|
| `public/data/vocabulary.js` | Vocabulary Database — 3,305 records (1 บรรทัด/คำ) |
| `public/data/lexicon.js` | Spelling Lexicon (ย้าย `DICT_FC` ออกจาก index.html) |
| `public/js/ql2/vocab.js` | VocabularyValidator · VocabularyDatabase (Map index) · AnswerMatcher · DictionaryProvider · VocabCache · VocabularyManager |
| `tools/vocab.mjs` | เครื่องมือ: stats / validate / dupes / search / show / add / edit / verify / status / delete / export / import |
| `tools/vocab.test.mjs` | Test 16 ข้อ |
| `tools/README-vocab.md` | วิธีเพิ่ม/แก้/นำเข้า/ส่งออกคำ |

> ทำไมเป็น `.js` ไม่ใช่ `.json`: เกมเป็น static script-tag ไม่มี build step — ไฟล์ `.js` โหลดแบบ synchronous ก่อนเกมเริ่ม ใช้ offline ผ่าน Service Worker ได้ทันที และข้างในคือ JSON ล้วน (`window.QL_VOCAB_DATA = {…}`) · ต้องการไฟล์ `.json` ใช้ `node tools/vocab.mjs export vocabulary.json`

## 2. ไฟล์ที่แก้
`public/index.html` (โหลดไฟล์ใหม่, ตัด data string ออก, `meaning / thaiOf / fetchThai / recordWord / evalWord / ปริศนาคำศัพท์ / word card / คำเทพของ Boomtos`), `js/ql2/codex.js` (การ์ดคำศัพท์), `js/ql2/core.js`, `js/ql2/battle-ui.js`, `js/ql2/settings.js`, `service-worker.js` (cache v45 + ไฟล์ใหม่)

## 3. Vocabulary Schema
```json
{"id":"word_001428","word":"journey","baseWord":"journey","translations":["การเดินทาง"],
 "partOfSpeech":["noun"],"difficulty":2,"category":["travel","places"],"length":7,
 "forms":["journey","journeys","journeyed","journeying"],"acceptedAnswers":["journey"],
 "target":true,"cefr":"A2","pron":"/ˈdʒɜː.ni/","definition":"A trip from one place to another, often a long one.",
 "verified":false,"source":"curated","sourceReference":"legacy:WORD_BANK","status":"approved","translationVersion":1,
 "meta":{"pos":"inferred","difficulty":"cefr","category":"keyword"}}
```
ฟิลด์เสริม: `preferredTranslation` (Manual Override) · `contextTranslations` (`{"combat":"…"}`) · `meta` บอกว่าข้อมูลส่วนไหน “เดา/ประมาณ”

## 4. จำนวนคำเริ่มต้น
**3,305 คำ** (มีคำแปลไทยทั้งหมด) — คำเป้าหมาย ⭐ 150 · หลายความหมาย 204 · มีรูปคำ 2,761
+ คำของเกม 17 คำ (ชื่อเทพ + BOOM ของ Boomtos, `source: manual`) ลงทะเบียนตอนรัน
+ Lexicon สำหรับตรวจการสะกด 103,128 คำ (คำที่สะกดได้ ≠ คำที่มีคำแปล)
ไม่ได้เพิ่มคำใหม่ — ทุกคำแปลมาจากข้อมูลเดิมของเกม

## 5. Translation
- เก็บหลายความหมายได้ · ไม่มี Context → แสดงทุกความหมาย (`ค้างคาว / ไม้ตี`)
- มี Context → `contextTranslations[context]` → `preferredTranslation` → ทุกความหมาย (ในการต่อสู้ส่ง context `combat`)
- การ์ด Codex แสดงแบบลำดับ `1. ค้างคาว 2. ไม้ตี` + ชนิดคำ + ระดับ + หมวด + สถานะ

## 6. Verification
- `pending` · `approved` · `rejected` · `deprecated` + `verified`
- **Official = approved + verified เท่านั้น**
- ⚠️ **ตอนนี้ verified = 0 คำ** — ข้อมูลเดิมเขียนขึ้นระหว่างพัฒนาเกม ไม่มีใครตรวจทานจริง ผม (AI) ไม่ใช่ source of truth ตามข้อ 31 จึงไม่ติ๊ก verified ให้เอง
  ข้อมูลเดิมจึงเป็น `approved` (ใช้ในเกมได้เหมือนเดิม) แต่ `verified: false` → Codex แสดง “คลังคำของเกม · ยังไม่ได้ตรวจทาน”
  ตรวจแล้วใช้ `node tools/vocab.mjs verify <คำ…>` หรือ export CSV → ตรวจใน Sheets → import
- `rejected` = ห้ามใช้ (ไม่แสดงคำแปล ไม่เป็นคำเป้าหมาย) · `deprecated` = ของเก่ายังทำงาน แต่ไม่ถูกเลือกไปสร้างเนื้อหาใหม่ (ปริศนา)

## 7. API
- `DictionaryProvider` เป็นที่เดียวที่เรียก Google Translate (gtx) / MyMemory · ระบบต่อสู้ไม่เรียก API เลย
- ใช้เฉพาะ **แสดงคำแปล** ของคำที่สะกดถูกแต่ยังไม่มีในคลัง → ผลเป็น `pending`, `source: api`, ติดป้าย “แปลอัตโนมัติ · รอตรวจ”
- ผลจาก API ไม่ทำให้คำเล่นได้ ไม่เป็นคำเป้าหมาย ไม่เป็น Official
- ป้องกัน: คำเดียวกันใช้ request เดียว · ห่างกัน ≥350ms · พร้อมกันสูงสุด 2 · ล้ม 3 ครั้งติด → พัก 60 วิ · สูงสุด 150 ครั้ง/รอบเล่น · timeout 4 วิ · ปิดได้ในตั้งค่า “แปลคำด้วยอินเทอร์เน็ต”
- API ล่ม / ออฟไลน์ / ไม่พบ → **Unknown Word · ยังไม่มีคำแปล** (ไม่สุ่ม ไม่เดาคำแปล) และการต่อสู้เดินต่อ

## 8. Cache
- `localStorage: questlines_vocab_cache_v1` เก็บฉบับร่างจาก API (+ จำคำที่ API ไม่รู้จัก 7 วัน)
- ย้ายแคชเก่า `questlines_tr_v1` เข้ามาเป็น pending ให้อัตโนมัติ (ไม่หาย)
- ดึงออกไปตรวจ: `copy(VocabularyManager.exportDraftsCSV())` ใน Console

## 9. Answer Matching
- `VocabularyManager.validateAnswer(input, target)` — ไม่สนตัวพิมพ์เล็ก/ใหญ่และช่องว่างหน้า/หลัง
- รูปคำ (apples, running, ran) **ไม่ถูกนับเป็นคำตอบเดียวกัน** เว้นแต่อยู่ใน `acceptedAnswers`
- `forms` ใช้แค่แสดงคำแปล “จากคำว่า …” — และตอนนี้เป็นรายการที่ตรวจกับ Lexicon แล้ว ไม่ได้เดาตอนรัน (แก้ `news` = "ใหม่", `bated` = "ค้างคาว")
- ปริศนาคำศัพท์หลังมินิบอสใช้ตัวนี้ตรวจคำตอบ

## 10. Difficulty
1 Beginner · 2 Easy · 3 Intermediate · 4 Advanced · 5 Expert
- คำเป้าหมาย: จาก CEFR เดิม (A2→2, B1→3, B2→4)
- คำในอภิธานศัพท์: **ประมาณ** จากกลุ่มที่มา (คำพื้นฐาน=1, กลุ่มเสริม=2) — `meta.difficulty: "estimated"` เพราะยังไม่มีข้อมูลความถี่คำ

## 11. Category
16 หมวด: general, animals, food, nature, technology, science, body, people, places, school, travel, sports, weapons, fantasy, combat, daily_life
จัดอัตโนมัติจากคำธาตุ + รายการคำสำคัญ + นิยาม (453 คำ) · ที่เหลือ `general` (`meta.category` บอกวิธีที่จัด)

## 12. การเชื่อมกับ Combat
| ก่อน | หลัง |
|---|---|
| `DICT.has(w)` | `VocabularyManager.isPlayable(w)` |
| `w.length` | `VocabularyManager.wordLength(w)` |
| `BANK[w] \|\| meaning(w).bank` | `VocabularyManager.isTargetWord(w)` |
| `meaning(w)` / `thaiOf(w)` | `VocabularyManager.lookup(w, 'combat')` |
| `fetchThai(w)` | `VocabularyManager.translate(w)` → DictionaryProvider |
Vocabulary ตอบแค่ ถูก/ผิด + ข้อมูลคำ · Damage / Combo / Critical / Weakness / Skill อยู่ใน Combat เหมือนเดิม

## 13–15. เพิ่มคำ / แก้คำแปล / Import-Export
ดู `tools/README-vocab.md` — ตัวอย่าง:
```bash
node tools/vocab.mjs add warlock --th "พ่อมด" --pos noun --difficulty 3 --category fantasy --source manual
node tools/vocab.mjs edit bank --add-th "ริมฝั่ง"
node tools/vocab.mjs export review.csv --unverified
node tools/vocab.mjs import review.csv --dry-run
```

## 16. Test Results
`node tools/vocab.test.mjs` → **16 passed · 0 failed**
| # | Test | ผล |
|---|---|---|
| 1–3 | apple / Apple / APPLE พบเป็นคำเดียวกัน | ✓ |
| 4 | xyzabc → null ไม่ crash ไม่เล่นได้ | ✓ |
| 5 | หลายความหมาย (bat, fan, fly) + context | ✓ |
| 6 | run ≠ running ≠ ran · apple ≠ apples | ✓ |
| 7 | Offline: คำในคลังแปล/เป็นคำเป้าหมายได้ ไม่เรียกเน็ต | ✓ |
| 8 | API Error: ไม่ throw, พักเมื่อพังติดกัน, request ซ้ำรวมเป็นอันเดียว | ✓ |
| 9 | ตรวจคำซ้ำ | ✓ |
| 10 | Record ผิดไม่ถูกนำเข้า | ✓ |
| + | ทั้งคลังผ่าน Validation, rejected/deprecated ไม่ถูกใช้สร้างเนื้อหาใหม่ | ✓ |

ในเบราว์เซอร์จริง:
- ปิด API แล้วสะกดคำนอกคลัง (`zygote`) → โจมตีได้ปกติ, ไม่ error
- ตัดเน็ตแล้วสะกด `journey` → ได้คำแปล + ⭐ +25% ตามเดิม
- Codex แสดงรายการ + การ์ด (หลายความหมาย/ชนิดคำ/ระดับ/หมวด/สถานะ) · คำจากเซฟเก่าที่ไม่มีในคลังยังโชว์คำแปลเดิม
- บอทเล่นจริง 8 ด่าน ฮีโร่ครบ 7 ตัว ผ่านทุกด่าน · Save → Reload ครบ
- CLI: export CSV/JSON → import กลับ = ไม่เปลี่ยนอะไร · แถวผิด/ซ้ำถูกปฏิเสธ

## 17–18. Error ที่พบ / แก้แล้ว
- `figure out` (คำเป้าหมายเป็นวลี) ไม่ผ่าน Validation → ปรับให้รองรับวลีที่เว้นวรรคเดียว
- รูปคำผิดจากการเดาเดิม (`news`, `bated`) → สร้างรายการ forms ใหม่ที่ตรวจกับ Lexicon
- Codex หน้ารายการคำ error ระหว่างพัฒนา (`escbookThai`) → แก้แล้ว ทดสอบซ้ำผ่าน
- CSV import ที่มีคอลัมน์ไม่ครบเคยทับข้อมูลเดิม → แก้ให้ทับเฉพาะคอลัมน์ที่มี

## 19. ระบบเดิมที่ได้รับผลกระทบ
- **เซฟ:** คำใหม่ใน `save.book` เก็บแค่คีย์ + ตัวนับ (ไม่เก็บข้อความคำแปล) · ของเก่าที่มี `th` ยังอยู่และใช้เป็น fallback — ไม่ต้อง migrate
- **Word card:** คำแปลอัตโนมัติมีป้าย “รอตรวจ” · ไม่มีคำแปล = “Unknown Word”
- **ปริศนาคำศัพท์:** เลือกจากคำเป้าหมายสถานะ approved เท่านั้น
- index.html เล็กลง 1.1 MB → 0.66 MB (ข้อมูลย้ายไป `data/`) — gzip รวมเพิ่มจากเดิมราว 120 KB

## 20. Combat Balance
รัน Balance harness ชุดเดียวกับ v44 (Scenario A–J + ฮีโร่ทุกตัว) → **ตัวเลขตรงกับ v44 ทุกค่า (IDENTICAL)**
Critical / Combo / Weakness / Potion / Weapon / Armor / Passive / Mastery / Upgrade ไม่ถูกแตะ
