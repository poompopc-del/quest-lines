# คลังคำศัพท์ Quest Lines — วิธีใช้

ไฟล์ข้อมูล: `public/data/vocabulary.js` (1 บรรทัด = 1 คำ) · แก้ผ่านเครื่องมือนี้เท่านั้น เพราะเครื่องมือจะตรวจ Validation ให้ทุกครั้ง
รันจากโฟลเดอร์ `quest-lines-app` (ต้องมี Node.js)

## ดู / ค้นหา
```bash
node tools/vocab.mjs stats            # สรุปจำนวนคำ, สถานะ, verified, หมวด
node tools/vocab.mjs validate         # ตรวจทุก record
node tools/vocab.mjs dupes            # หาคำซ้ำ (apple / Apple / APPLE = คำเดียวกัน)
node tools/vocab.mjs search ธนาคาร     # ค้นได้ทั้งอังกฤษและไทย
node tools/vocab.mjs show bank
```

## เพิ่มคำ
```bash
node tools/vocab.mjs add warlock --th "พ่อมด|ผู้ใช้เวทมนตร์ดำ" --pos noun --difficulty 3 --category fantasy --source manual
```
- `--th` คั่นหลายความหมายด้วย `|`
- `--forms warlocks` = รูปคำที่ให้แสดงคำแปลของคำนี้ · `--accept warlock` = คำตอบที่ถือว่าถูก (ค่าเริ่มต้น = ตัวคำเอง)
- `--target` = เป็นคำเป้าหมาย ⭐ (ต้องมี `--cefr A2|B1|B2` ด้วย ถ้าอยากให้ไปอยู่ในปริศนาคำศัพท์)
- source: `dictionary` · `manual` · `curated` · `api` · `unknown` (ห้ามใส่แหล่งที่ไม่จริง — ไม่รู้ให้ใช้ `unknown`)

## แก้คำแปล
```bash
node tools/vocab.mjs edit bank --add-th "ริมฝั่ง"                 # เพิ่มความหมาย
node tools/vocab.mjs edit charge --preferred "พุ่งเข้าโจมตี"        # เลือกคำแปลหลัก (Manual Override)
node tools/vocab.mjs edit charge --context "combat=พุ่งเข้าโจมตี;technology=ชาร์จ"   # คำแปลตาม Context
node tools/vocab.mjs edit bank --remove-th "ริมฝั่ง"
```
แก้คำแปลแล้ว `translationVersion` จะเพิ่มเอง และ `verified` จะกลับเป็น `false` (ต้องตรวจใหม่)
เซฟผู้เล่นเก็บแค่ “คีย์คำ” — แก้คำแปลเมื่อไหร่ผู้เล่นก็เห็นคำแปลใหม่ทันที เซฟไม่พัง

## ตรวจแล้ว → Official
```bash
node tools/vocab.mjs verify bank bat journey      # verified=true, status=approved
node tools/vocab.mjs status gizmo rejected        # pending | approved | rejected | deprecated
node tools/vocab.mjs delete oldword               # = deprecated (เก็บไว้ให้เซฟเก่า) · --hard = ลบจริง
```
Official = `status: approved` + `verified: true` เท่านั้น (คำจาก `api` / `unknown` verify ไม่ได้ ต้องเปลี่ยน source ก่อน)

## Import / Export (JSON · CSV)
```bash
node tools/vocab.mjs export review.csv --unverified     # เปิดใน Excel / Google Sheets ได้
node tools/vocab.mjs import review.csv --dry-run         # ลองก่อน ดูว่าจะเพิ่ม/แก้/ปฏิเสธกี่คำ
node tools/vocab.mjs import review.csv
```
CSV อย่างน้อย: `word,thai,partOfSpeech,difficulty,category` (หลายค่าในช่องเดียวคั่นด้วย `|`)
คอลัมน์ที่ไม่มีในไฟล์จะไม่ไปทับข้อมูลเดิม · แถวที่ไม่ผ่าน Validation จะไม่ถูกนำเข้า

## คำที่เกมแปลออนไลน์ให้ (ฉบับร่าง)
คำที่ผู้เล่นสะกดได้แต่ยังไม่มีในคลัง เกมจะแปลออนไลน์เป็น **pending** เก็บไว้ในเครื่องผู้เล่นเท่านั้น
ดึงออกมาตรวจ: เปิดเกม → DevTools Console → `copy(VocabularyManager.exportDraftsCSV())` → วางเป็นไฟล์ `drafts.csv`
→ แก้ให้ถูก เปลี่ยน `source` เป็น `manual` / `status` เป็น `approved` → `node tools/vocab.mjs import drafts.csv`

## ทดสอบ
```bash
node tools/vocab.test.mjs
```
