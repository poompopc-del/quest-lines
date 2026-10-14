/* Adds a "Platformer" shortcut button to the main game (all screens except battle).
   Standalone: does not touch the game's own code. Remove the <script> tag to remove the button. */
(function () {
  if (document.getElementById('plat-link')) return;
  var a = document.createElement('a');
  a.id = 'plat-link'; a.href = 'platformer.html'; a.textContent = '🎮 โหมดแพลตฟอร์ม';
  a.style.cssText = 'position:fixed;left:10px;bottom:84px;z-index:60;display:none;align-items:center;padding:8px 12px;' +
    'font:600 13px system-ui,"Noto Sans Thai",sans-serif;color:#fff;text-decoration:none;background:linear-gradient(#3b6fe0,#2a4fb0);' +
    'border:2px solid #0b1b4a;border-radius:10px;box-shadow:0 3px 0 #0b1b4a,0 6px 14px rgba(0,0,0,.4)';
  document.body.appendChild(a);
  function sync() {
    var s = ''; try { s = ui.screen; } catch (e) {}
    a.style.display = (s === 'battle' || s === 'exam') ? 'none' : 'flex';
    var top = s === 'title';            // title screen: top-right corner (bottom is the name box + START)
    a.style.top = top ? '10px' : 'auto'; a.style.right = top ? '10px' : 'auto';
    a.style.left = top ? 'auto' : '10px'; a.style.bottom = top ? 'auto' : '84px';
  }
  sync(); setInterval(sync, 300);
})();
