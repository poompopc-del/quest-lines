# Quest Lines v44 — รายงานปรับสมดุล (Balance Pass)

เป้าหมาย: **ตัวละครเก่งขึ้นต่อเนื่อง แต่ไม่มี Exponential Power Creep**
ค่าทั้งหมดอยู่ที่ไฟล์เดียว → `public/js/ql2/balance.js` (`BALANCE`)

---

## 1. ไฟล์ที่แก้ไข

| ไฟล์ | สิ่งที่แก้ |
|---|---|
| `public/js/ql2/balance.js` **(ใหม่)** | ค่าสมดุลทั้งหมด + `dmgMod()` สำหรับบวกโบนัสแบบ additive |
| `public/index.html` | สูตร `evalWord` (Base × Bonus × Burst), Ultimate, ดาเมจที่รับ, Boss Phase 2, Boomtos / ELON / Mia / X, ข้อความคำอธิบาย, โหลด balance.js, v43 → v44 |
| `public/js/ql2/armory.js` | ATK อาวุธ 11 ชิ้น + Perk เป็น additive |
| `public/js/ql2/knight.js` | Elite Knight / Plink (1 Core + 1 Passive) |
| `public/js/ql2/kirby.js` | ตัวคูณตัวอักษรจาก x2 ต่อ 10 ตัว → +50% ต่อ 10 ตัว (สูงสุด x3) |
| `public/js/ql2/boss-encounter.js` | ค่า HP/ATK บอสที่จูนเอง อ่านจาก BALANCE (King Slime HP x2.6 → x2.2) |
| `public/js/ql2/heroes.js` | สเตตัสในหน้าฮีโร่ใช้สูตรใหม่ + ข้อความสกิล |
| `public/js/ql2/wordfx.js` | ชิป WORD STREAK แสดง % ตาม BALANCE |
| `public/js/ql2/battle-ui.js`, `codex.js` | ข้อความ Power Potion / Weakness |
| `public/service-worker.js` | cache v44 + เพิ่ม balance.js |

## 2. ระบบที่แก้ — สูตรดาเมจใหม่

```
dmg = BASE × (1 + ΣBONUS) × (1 + ΣBURST) × penalties
BASE  = แต้มตัวอักษร × ความยาวคำ × ATK อาวุธ/5 × ATK Upgrade
BONUS = Combo · Mastery · Target Word · Element · Gem · Aura · Accessory · Weapon Perk · Hero Passive  (บวกกัน)
BURST = Critical · Weakness · Power Potion · คำหยาบ · Hero Crit / Rage / Finisher                    (บวกกัน)
```
ตัวอย่าง: Critical + Weakness = **+85%** (เดิม ×1.75 × ×2 = ×3.5)
ทุก wrapper ของฮีโร่/อาวุธเปลี่ยนจาก `r.dmg *= x` เป็น `dmgMod(r, 'bonus'|'burst', +x)`

## 3–4. ค่าก่อน → หลัง

| ระบบ | ก่อน | หลัง |
|---|---|---|
| Weapon ATK | 5 → 30 (×6) | 5 → 14 (×2.8) — Wood 5 · Iron 6 · Axe 7 · Hammer 8 · Staff 9 · Flame 10 · Thunder 11 · Royal 12 · Lynel/Ancient 13 · Master 14 · Hellblade 11 |
| Critical | ×1.75 | +35% (Burst) + เติมเกจ Ultimate +1 |
| Combo | +8%/คำ สูงสุด +40% | +5%/คำ สูงสุด +25% |
| Target Word ⭐ | ×1.5 | +25% |
| Scholar's Lens | ×2 | +40% |
| Power Potion | ×2 | +50% (Burst) |
| Weakness | ×2 | +50% (Burst) + ข้อความ "WEAKNESS! +50%" |
| คำหยาบ | ×2 | +50% (ยังเสีย HP 30%) |
| Gem / Aura | ×1.5 / ×1.35 ต่อชิ้น (คูณทบ) | +30% / +20% ต่อชิ้น (บวก) |
| Sage Stone | ×1.25 | +20% |
| ATK Upgrade | +8%/Lv → +80% | +5%/Lv → +50% |
| DEF Upgrade | -3%/Lv → -30% | -2%/Lv → -20% |
| Armor | 12/22/30/38% | 10/18/25/30% |
| ลดดาเมจรวมสูงสุด | ไม่มีเพดาน (63%) | เพดาน 55% |
| Boss Phase 2 | ATK +35% | ATK +20% + ได้ความสามารถใหม่ (สาปหิน หรือ ดูดเลือด) + เปิดจุดอ่อนตัวอักษรใหม่ |
| Fire burn / Thunder echo | 30% / 60% | 20% / 50% |
| Ultimate | ไม่มีเพดานจากจำนวนคำ | +0.5/คำ สูงสุด +60 |
| Weapon perks | ×1.3–×2 | +20–30% (Guardian +3%/คอมโบ สูงสุด +24%, Master +25% / +30%) |
| Knight | ท่าไม้ตาย +20% · HP ต่ำ +15% · -15% | Core: รับดาเมจ -15% · Passive: HP < 50% → +10% (ท่าไม้ตายยังมีอนิเมชัน) |
| Plink | ลำแสง +30% · ท่าไม้ตาย ×1.5 · โล่ 15% | Core: ลำแสง HP เต็ม +20% · Passive: โล่ 15% |
| Mia | +30% / ×1.5 / ×1.8 · ไฟ ×1.3 · เสน่ห์ +25% | +10% / +20% / +30% · ไฟ +10% · เสน่ห์ +10% |
| ELON | ปืน ×1.25/×1.5/×1.8→×2.3 · Focus ×1.3 · Crit ×1.8 · Quick Shot ×0.45/ตัวอักษร × Crit ×1.5 | ปืน +10/20/30% (สูงสุด +40%) · Focus +15% · Crit +35% · Quick Shot +10%/ตัวอักษร (30–100%) |
| Boomtos | โทสะ ×2 ทุกเทิร์น → ×32 · HP<10% ×10 · BOOM ฆ่าทุกอย่าง | โทสะ +20%/เทิร์น → ×2 · HP<10% +50% · BOOM: ศัตรูทั่วไปตายทันที ทะลุ 50% HP / บอส-มินิบอสโดน ดาเมจ + 20% Max HP |
| X | ปล่อยชาร์จ ×n ไม่จำกัด · ทะลุ 100% | ×1 → ×1.25 → … สูงสุด ×2 · ทะลุ 50% |
| Kirby | ×2 ทุก 10 ตัวอักษร (×8 ที่ 30) · กลืน = +100% HP | +50% ทุก 10 ตัวอักษร (สูงสุด ×3) · กลืน = +50% HP |
| God words (Boomtos) | Ares ×2 · Zeus 3×50% · Artemis 3×35% | สูงสุด +50% · Zeus 3×30% · Artemis 3×25% |

## 5. Balance Test (ของจริงผ่าน `evalWord()` ในเบราว์เซอร์ · Elite Knight)

| Scenario | ชุด | 6 ตัว | Critical (9 ตัว) | Weakness | Crit + Weak | Potion + Crit + Weak | Ultimate |
|---|---|---|---|---|---|---|---|
| A เริ่มต้น | Wooden Sword · บท 1-1 | 17 → **14** | 56 → **36** | 32 → **20** | 114 → **50** | 227 → **63** | 32 → **32** |
| B กลางเกม | Crystal Staff · ATK+4 · บท 3-4 | 58 → **32** | 240 → **105** | 114 → **49** | 479 → **144** | 958 → **183** | 92 → **84** |
| C ท้ายเกม | Thunder Spear · ATK+7 · บท 5-4 | 91 → **40** | 398 → **135** | 182 → **60** | 796 → **185** | 1592 → **236** | 159 → **138** |
| D Max Upgrade | Master Sword · ATK+10 | 263 → **71** | 918 → **191** | 526 → **106** | 1838 → **263** | 3674 → **333** | 198 → **165** |
| J Best build | D + Lens + Sage + Aura 2 ตัว + Combo 5 + Mastery 5 + Potion + Weak + Crit | 13,594 → **603** |

ช่วงต้น→ท้าย (คำ 6 ตัว): เดิม ×15.5 → ใหม่ ×5

### ฮีโร่ (ชุด Master Sword · ATK+10 · กรณีดีที่สุดของแต่ละตัว)

| ฮีโร่ | คำ 6 ตัว | คำ 9 ตัว Crit + Combo 5 | จุดพีค |
|---|---|---|---|
| Elite Knight | 263 → 71 | 985 → 206 | — |
| Plink | 427 → 82 | 2,088 → 260 | — |
| Mia | 329 → 82 | 2,411 → 290 | คำไฟ 7 ตัว 1,256 → 147 |
| ELON | 219 → 71 | 7,148 → 331 (ปืนใหญ่+Focus+Crit) | Quick Shot 43,421 → 552 |
| Boomtos | 107 → 49 | โทสะเต็ม+HP ต่ำ 167,680 → 386 | โทสะเต็ม คำ 6 ตัว 3,424 → 94 |
| X | 219 → 71 | ปล่อยชาร์จ x5 (6 เทิร์น) 2,595 → 643 | x8 5,592 → 943 |
| Kirby | 219 → 71 | พ่นดาว 30 ตัวอักษร 4,152 → 928 | 45 ตัวอักษร 10,704 → 1,563 |

## Balance Table 1 — ค่ารวมทุกตัวละคร

| Character | Core | Passive | Weapon ATK | Max Upgrade | Critical | Combo | Weakness | Potion | Armor | Mastery | Max Expected (ต่อคำ) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Elite Knight | รับดาเมจ -15% | HP<50% +10% | 5–14 | +50% | +35% | +25% | +50% | +50% | ≤30% (รวม ≤55%) | +16% | ~210 (Best ~600) |
| Plink | ลำแสง HP เต็ม +20% | โล่ 15% | 5–14 | +50% | +35% | +25% | +50% | +50% | ≤30% | +16% | ~260 |
| Mia | ท่าตามความยาว +10/20/30% | หลบ 20% · เสน่ห์ +10% | 5–14 | +50% | +35% | +25% | +50% | +50% | ≤30% | +16% | ~290 |
| ELON | ปืนตามคอมโบ +10→40% | Quick Shot / Focus | 5–14 | +50% | +35% (ลุ้น 25%) | +25% | +50% | +50% | ≤30% | +16% | ~330 (QS ~550) |
| Boomtos | โทสะ +20%/เทิร์น (×2) | HP<10% +50% | 11 (Hellblade) | +50% | +35% | +25% | +50% | +50% | ≤30% | +16% | ~390 |
| X | ชาร์จ ×1→×2 | ถือชาร์จ -15% ดาเมจ | 5–14 | +50% | +35% | +25% | +50% | +50% | ≤30% (รวม ≤55%) | +16% | ~640 / 6 เทิร์น |
| Kirby | พ่นดาว +50%/10 ตัว (×3) | กลืนศัตรู (+50% HP) | 5–14 | +50% | +35% | +25% | +50% | +50% | ≤30% | +16% | ~930 / 3 เทิร์น |

## Balance Table 2 — Power Curve ตามบท

อุปกรณ์สมมติ: บท 1 Iron+ATK1 · บท 2 Hammer+ATK3 · บท 3 Staff+ATK5 · บท 4 Thunder+ATK7 · บท 5 Master+ATK10
Average = คำ 6 ตัว Combo 2 · Strong = คำเป้าหมาย 7 ตัว Combo 5

| Chapter | Enemy HP | Enemy ATK | Average Dmg (เดิม→ใหม่) | Strong Dmg (เดิม→ใหม่) | Boss | Boss HP | Boss ATK (ชาร์จ) | ตีบอสกี่ที (เดิม→ใหม่) |
|---|---|---|---|---|---|---|---|---|
| 1 | 18–34 | 4–8 | 29 → 18 | 80 → 40 | King Slime | 187 → 158 | 12 (26) | 6.4 → 8.8 |
| 2 | 33–47 | 9–14 | 53 → 26 | 144 → 58 | Forest Ogre | 121 | 15 (33) | 2.3 → 4.7 |
| 3 | 49–70 | 14–20 | 78 → 38 | 222 → 89 | Frost Titan | 154 | 20 | 2.0 → 4.1 |
| 4 | 57–88 | 18–23 | 108 → 42 | 470 → 148 | Ember Dragon | 207 | 26 (57) | 1.9 → 4.9 |
| 5 | 77–107 | 23–30 | 310 → 72 | 857 → 154 | Tyrant | 533 | 43 (95) | 1.7 → 7.4 |

ศัตรูทั่วไปใช้ 1.3–1.8 ครั้ง (เดิม 0.3–0.9 = ตีทีเดียวตายตลอดเกม)

## 6. สิ่งที่ตั้งใจไม่เปลี่ยน

- สูตร HP/ATK ศัตรู (ไม่เพิ่ม HP ชดเชย) · ท่าชาร์จ ×2.2 · Tower · Tyrant
- แต้มตัวอักษร, ความยาวคำ +25%/ตัว (Word Damage = Base)
- ราคา, ทอง, ค่าอัปเกรด, HP ของฮีโร่
- Endgame: Nightmare, Challenge modifiers, True Final Boss (จุดอ่อนธาตุ ×2.5 เป็นกลไกบังคับของบอส)
- ทุกฟีเจอร์/ท่า/อนิเมชัน/ระบบเดิมยังอยู่ — แก้แค่ตัวเลข
- โครงสร้าง Save: ไม่เปลี่ยน field — Upgrade Lv เดิมยังอยู่ แค่ได้ % ตามค่าใหม่

## 7. ผลการทดสอบ

- Syntax check ทุกไฟล์ (`node --check` + inline script ใน index.html): ผ่าน
- บอทเล่นจริง 8 ด่านด้วยฮีโร่ครบ 7 ตัว (รวม Forest Ogre, Ember Dragon, Tyrant และ Tower): ชนะครบ
- Boss Phase 2 ทำงาน: Ogre ได้ `stone + weak` ใหม่, Dragon ได้ `stone + weak` ใหม่ · Tyrant (จูนเอง) ข้ามเหมือนเดิม
- Critical / Combo / Weakness / Potion / Ultimate / Quick Shot / X Charge / Kirby Inhale ทำงาน
- Save → Reload → Save เดิมครบ (gold, upgrade, equipment, ฮีโร่, ความคืบหน้า)
- หน้า Map / Hub / Heroes / Shop / Inventory / Codex / Profile เรนเดอร์ได้

## 8. Error

ไม่พบ Error ใหม่ พบ `updateHud … null` เฉพาะตอนสคริปต์ทดสอบบังคับออกจากฉากกลางอนิเมชัน — เกิดใน v43 เดิมเหมือนกัน (ไม่ใช่การเล่นปกติ)

## 9. ควร Balance ต่อในอนาคต

1. **ราคา ATK/DEF Upgrade** — ได้ % น้อยลงแต่ราคาเท่าเดิม (Lv 9→10 = ~3,460 ทอง แลก +5%)
2. **Endgame** — Nightmare / True Final Boss (HP ~920) ยากขึ้นมากเพราะดาเมจผู้เล่นลดลง
3. **Kirby** — ดูดศัตรูทั่วไปตายทันทีด้วยคำ 4 ตัวใดก็ได้ยังแรงมาก
4. **X / Kirby** — ธนาคารดาเมจยังโตแบบเส้นตรงไม่จำกัด ถ้าเล่นยืดมากๆ อาจต้องใส่ Soft Cap
5. **พลังโจมตีศัตรูช่วงท้าย** — ผู้เล่นที่เล่นดีแทบไม่เสีย HP ในด่านธรรมดา
6. โค้ดตัวละครเก่าที่ถูกถอด (`rook`, `bruna`, `luma`, `mira`, `kiko`) ยังค้างอยู่ใน evalWord (ไม่มีผล)
