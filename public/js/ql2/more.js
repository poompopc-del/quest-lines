/* ==========================================================================
   QUEST LINES v26 — ☰ MORE
   Everything the player does not need every minute, in one calm list:
   Quest Board · Challenge Hall · Inventory · Shop · Codex · Profile ·
   Achievements · Settings · How to play. Nothing here is new logic —
   every row just opens the screen / overlay that already existed.
   ========================================================================== */
function renderMore(){
  const b = navBadges(), V = V2(), total = CHAPTERS.length*STAGES_PER;
  const tro = Object.keys(ACH).filter(k=>save.achievements[k]).length;
  const cx = (()=>{ try{ const C = cxCounts(); const a = Object.values(C).filter(x=>x[1]).reduce((s,x)=>[s[0]+x[0],s[1]+x[1]],[0,0]); return Math.round(a[0]/a[1]*100); }catch(e){ return 0; } })();
  const eg = storyDone() ? `${mrInfo().R.k} · Nightmare · Endless · Speedrun` : `🔒 ปลดล็อกเมื่อจบเนื้อเรื่อง (${save.cleared}/${total})`;
  const badge = k=>b[k] ? `<em class="q2-badge${b[k]==='!'?' dot':''}">${b[k]==='!'?'':b[k]}</em>` : '';
  const row = (act, v, ic, th, sub, k)=>`<button class="mr-row" data-act="${act}" ${v!==null?`data-v="${v}"`:''}><span class="mr-ic">${ic}</span><span class="mr-t"><b>${th}</b><small>${sub}</small></span>${badge(k)}${IC2.next}</button>`;
  const grp = (title, rows)=>`<section class="mr-grp"><h3>${title}</h3><div class="mr-list">${rows.join('')}</div></section>`;
  return `<div class="mr-head"><span class="q2-kicker">MENU</span><h2 class="q2-h">เมนูทั้งหมด</h2></div>`
    + grp('ฝึกภาษา', [
        row('go', 'ecl', `<span class="mr-emoji">🎓</span>`, 'ECL EXAM', 'ฝึกสอบ A2–C1 · Reading · Listening · Writing (ECL-style)', ''),
      ])
    + grp('ความก้าวหน้า', [
        row('go', 'quests', IC2.scroll, 'กระดานภารกิจ', 'ภารกิจหลัก · เสริม · ต่อเนื่อง · ประจำวัน', 'quests'),
        row('egView', 'hall', IC2.trophy, 'Challenge Hall', eg, 'endgame'),
      ])
    + grp('ของสะสม', [
        row('go', 'inventory', IC2.bag, 'กระเป๋า', `อุปกรณ์ · ไอเทม · ผสมยา`, 'inventory'),
        row('go', 'shop', ICON.coin, 'ร้านค้า', 'อาวุธ · เกราะ · ไอเทมเสริม · ขายวัตถุดิบ', 'shop'),
        row('go', 'codex', IC2.book, 'โคเด็กซ์', `คำศัพท์ · มอนสเตอร์ · ตำนาน · ค้นพบ ${cx}%`, ''),
      ])
    + grp('ผู้เล่น', [
        row('go', 'profile', heroFaceSvg(save.eq), esc(save.name||'Hero'), `โปรไฟล์ · Adventure Lv ${advInfo(V.adv.xp).lv} · ฉายา · สไตล์`, 'profile'),
        row('moreTrophy', null, IC2.star, 'ถ้วยรางวัล', `Achievements · ${tro}/${Object.keys(ACH).length}`, ''),
      ])
    + grp('ระบบ', [
        row('settings', null, ICON.gear, 'ตั้งค่า', 'เสียง · กราฟิก · เกมเพลย์ · เซฟ', ''),
        row('howto', null, `<span class="mr-emoji">📘</span>`, 'วิธีเล่น', 'สะกดคำ · ธาตุ · ไอเทม', ''),
      ]);
}
SCREENS.more = { nav:'more', render:renderMore };
Object.assign(ACTS2, {
  moreTrophy: ()=>{ ui.pfTab = 'trophy'; goTo('profile'); },
});
