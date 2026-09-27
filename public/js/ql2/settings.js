/* ==========================================================================
   QUEST LINES 2.0 — SETTINGS (⚙️ overlay, no longer a main tab)
   Audio · Graphics · Gameplay · Save. Uses the existing setting keys and
   the existing export / import / reset actions.
   ========================================================================== */
function openSettings(tab){
  tab = tab || ui.setTab || 'audio'; ui.setTab = tab;
  const s = save.settings, battle = ui.screen==='battle';
  const tg = (k, l, d, act)=>`<div class="set2-row"><div class="lab">${l}${d?`<small>${d}</small>`:''}</div><button class="tog ${s[k]?'on':''}" data-act="${act||'tog2'}" data-v="${k}" role="switch" aria-checked="${!!s[k]}" aria-label="${l}"></button></div>`;
  const tabs = [['audio','🔊','เสียง'],['gfx','🎨','กราฟิก'],['play','🎮','เกมเพลย์'],['save','💾','เซฟ']];
  let body = '';
  if(tab==='audio'){
    body = `<div class="set2-row col"><div class="lab">เสียงเอฟเฟกต์ (SFX) <small id="sfxV">${s.sfx}%</small></div><input type="range" min="0" max="100" value="${s.sfx}" data-input="sfx" aria-label="ระดับเสียงเอฟเฟกต์"></div>
      ${tg('music','เพลงประกอบ (Music)','ดนตรีเบาๆ ระหว่างเล่น')}
      ${tg('tts','เสียงอ่านคำศัพท์','อ่านคำภาษาอังกฤษด้วยเสียงของเครื่อง')}
      ${tg('autoSpeak','อ่านทุกคำที่โจมตี','อ่านออกเสียงคำที่สะกดทุกครั้ง')}`;
  } else if(tab==='gfx'){
    body = `<div class="set2-row"><div class="lab">ภาพแนวพิกเซล<small>ฉากและมอนสเตอร์เป็นภาพพิกเซล${battle?' · เปลี่ยนได้นอกการต่อสู้':' · เกมจะโหลดใหม่'}</small></div><button class="tog ${PIXEL.on?'on':''}" data-act="pixelTog" ${battle?'disabled':''} role="switch" aria-checked="${PIXEL.on}" aria-label="ภาพแนวพิกเซล"></button></div>
      ${tg('rim','เอฟเฟกต์เรืองแสง','แสงจันทร์ขอบตัวละคร — ปิดได้ถ้าเครื่องกระตุก')}
      ${tg('anim','แอนิเมชันเปลี่ยนหน้า','สไลด์ · ซูม · ประตูมิติก่อนเข้าด่าน')}
      ${canFull()?`<div class="set2-row"><div class="lab">โหมดเต็มจอ<small>ซ่อนแถบเบราว์เซอร์เมื่อเริ่มเล่น (Android / PC)</small></div><button class="tog ${s.fullscreen?'on':''}" data-act="fullscreen" role="switch" aria-checked="${!!s.fullscreen}" aria-label="โหมดเต็มจอ"></button></div>`
        : `<div class="set2-row"><div class="lab">เล่นแบบเต็มจอบน iPhone<small>Safari → ปุ่มแชร์ → "เพิ่มไปยังหน้าจอโฮม" แล้วเปิดจากไอคอน</small></div></div>`}`;
  } else if(tab==='play'){
    body = `<div class="set2-row col"><div class="lab">ชื่อผู้เล่น</div><input class="text-in" data-input="rename" maxlength="14" value="${esc(save.name)}" aria-label="ชื่อผู้เล่น"></div>
      ${tg('haptic','การสั่นเมื่อแตะ','สั่นเบาๆ เมื่อสะกดคำยาว (มือถือ)')}
      ${tg('awake','หน้าจอไม่ดับระหว่างเล่น','ให้จอเปิดค้างไว้ตลอดที่เปิดเกม')}
      ${tg('webTr','แปลคำด้วยอินเทอร์เน็ต','คำที่ไม่มีในพจนานุกรมในเครื่องจะแปลออนไลน์แล้วจำไว้')}
      <div class="set2-keys"><b>⌨️ คีย์บอร์ด (Controls)</b>
        <span><kbd>A–Z</kbd> เลือกตัวอักษร</span><span><kbd>Backspace</kbd> ลบตัวล่าสุด</span><span><kbd>Enter</kbd> โจมตี</span><span><kbd>Space</kbd> สลับตัวอักษร</span><span><kbd>Esc</kbd> หยุดเกม</span></div>
      <button class="cbtn blue block" data-act="howto">📘 วิธีเล่น</button>`;
  } else {
    body = `<div class="set2-row"><div class="lab">สำรอง / ย้ายเซฟ (Export)<small>คัดลอกรหัสไปวางในอีกเครื่อง</small></div><button class="cbtn small wood" data-act="export">Export</button></div>
      <div class="set2-row"><div class="lab">นำเข้าเซฟ (Import)<small>วางรหัสจากเครื่องอื่น</small></div><button class="cbtn small wood" data-act="importOpen">Import</button></div>
      <div class="set2-row danger"><div class="lab">ล้างข้อมูลทั้งหมด (Reset)<small>ลบความคืบหน้า ทอง และอุปกรณ์</small></div><button class="cbtn small red" data-act="resetAsk" ${battle?'disabled':''}>Reset</button></div>
      <p class="sub set2-ver">Quest Lines ${QL2.ver} · World &amp; Progression · เซฟอยู่ในเครื่องนี้ · เล่นออฟไลน์ได้</p>`;
  }
  modal(`<div class="set2"><div class="set2-head"><span class="set2-k">⚙️ SETTINGS<small>ตั้งค่า</small></span><button class="q2-x" data-act="closeModal" aria-label="ปิด">${IC2.close}</button></div>
    <div class="seg set2-tabs" role="tablist">${tabs.map(([k,i,l])=>`<button class="${k===tab?'on':''}" data-act="settings" data-v="${k}" role="tab" aria-selected="${k===tab}">${i} ${l}</button>`).join('')}</div>
    <div class="set2-body">${body}</div></div>`, { dismiss:true });
  const m = document.querySelector('#overlay .modal'); if(m) m.classList.add('set2-modal');
}
Object.assign(ACTS2, {
  tog2: v=>{
    save.settings[v] = !save.settings[v];
    if(v==='music') setMusic(save.settings.music);
    if(v==='awake'){ save.settings.awake ? keepAwake() : releaseAwake(); }
    if(v==='rim') document.body.classList.toggle('lowfx', save.settings.rim===false);
    if(v==='anim') document.documentElement.classList.toggle('noanim', save.settings.anim===false);
    persist(); sfx.tap && sfx.tap(3); openSettings();
  },
});
// haptics respect the new setting (the battle code calls navigator.vibrate directly)
try{
  if(navigator.vibrate){ const _vib = navigator.vibrate.bind(navigator); navigator.vibrate = function(p){ return save.settings.haptic===false ? false : _vib(p); }; }
}catch(e){}
