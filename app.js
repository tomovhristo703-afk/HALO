/* app.js - HaloOS 1.0.4
   Fully self-contained UI logic for the HaloOS PWA.
   Drop into HALO folder and use with index.html that creates a canvas#haloCanvas.
*/

(() => {
  // Canvas setup
  const canvas = document.getElementById('haloCanvas');
  if (!canvas) {
    console.error('No canvas #haloCanvas found in DOM.');
    return;
  }
  const ctx = canvas.getContext('2d');

  // Sizes
  let WIDTH = window.innerWidth;
  let HEIGHT = window.innerHeight;
  function resizeCanvas() {
    WIDTH = window.innerWidth;
    HEIGHT = window.innerHeight;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    wheel_center.x = WIDTH / 2;
    wheel_center.y = HEIGHT - 120;
    computeKeyboardPositions();
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Colors & style
  const WHITE = '#FFFFFF', BLACK = '#000000', BLUE = '#0064FF', GRAY = '#B4B4B4', LIGHTGRAY = '#F6F7FB', PRIMARY = '#0A63E8';
  const ROUNDED = 10;
  function fillRounded(x, y, w, h, color, r = 8) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function strokeRounded(x, y, w, h, color, r = 8, line = 2) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = line;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  function text(t, x, y, opts = {}) {
    ctx.fillStyle = opts.color || BLACK;
    ctx.font = opts.font || '18px Arial';
    ctx.fillText(t, x, y);
  }

  // Persistent keys
  const LS_APPS = 'halo_installed_apps_v1';
  const LS_CONTACTS = 'halo_contacts_v1';
  const LS_MESSAGES = 'halo_messages_v1';
  const LS_NOTES = 'halo_notes_v1';
  const LS_WALL = 'halo_wall_v1';

  // default/core apps
  const coreApps = ["NMessage", "Notes", "Clock", "Calendar", "Settings", "Halo Market", "Dialer", "Power Off"];

  // market catalog (static)
  const marketCatalog = [
    { id: 'calculator', name: 'Calculator' },
    { id: 'weather', name: 'Weather' },
    { id: 'music', name: 'Music' },
    { id: 'photos', name: 'Photos' },
    { id: 'camera', name: 'Camera' },
    { id: 'todo', name: 'To-Do' }
  ];

  // load persistent state (fallbacks)
  let installedApps = JSON.parse(localStorage.getItem(LS_APPS) || 'null');
  if (!installedApps) {
    installedApps = coreApps.slice(); // start with core apps
    localStorage.setItem(LS_APPS, JSON.stringify(installedApps));
  }
  let apps = installedApps.slice();
  let contacts = JSON.parse(localStorage.getItem(LS_CONTACTS) || '[]');
  let messages = JSON.parse(localStorage.getItem(LS_MESSAGES) || '["Alice: Hello!","Bob: Call me."]');
  let notes = JSON.parse(localStorage.getItem(LS_NOTES) || '["Welcome to HaloOS!"]');
  let current_wallpaper = parseInt(localStorage.getItem(LS_WALL) || '0', 10);
  if (Number.isNaN(current_wallpaper)) current_wallpaper = 0;

  // UI state
  let current_app = 'menu';
  let selected_index = 0;
  let typing_text = '';

  // Keyboard definition
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const keyboard_keys = []; // computed positions for tap detection
  // keyboard is drawn relative to kbTop computed per render or on resize
  let kbTop = HEIGHT - Math.min(HEIGHT * 0.45, 300);

  // Wheel
  let wheel_center = { x: WIDTH / 2, y: HEIGHT - 120 };
  let wheel_radius = 90;
  let dragging = false;
  let prev_angle = 0;

  // wallpapers palette
  const wallpapers = [WHITE, "#C8FFC8", "#C8C8FF", "#FFC8C8", "#FFFFC8", "#FFF2CC", "#E8E8FF", "#FDECEC"];

  // small overlay for calls / messages show
  let overlay = null; // { text, until }

  // helpers to persist
  function saveInstalled() { localStorage.setItem(LS_APPS, JSON.stringify(installedApps)); apps = installedApps.slice(); }
  function saveContacts() { localStorage.setItem(LS_CONTACTS, JSON.stringify(contacts)); }
  function saveMessages() { localStorage.setItem(LS_MESSAGES, JSON.stringify(messages)); }
  function saveNotes() { localStorage.setItem(LS_NOTES, JSON.stringify(notes)); }
  function saveWallpaper() { localStorage.setItem(LS_WALL, String(current_wallpaper)); }

  // small UI helpers
  function drawTimeSmall() {
    const t = new Date();
    ctx.fillStyle = BLACK;
    ctx.font = '16px Arial';
    ctx.fillText(t.toLocaleTimeString(), WIDTH - 110, 28);
  }

  // ---------------- draw functions for each app ----------------
  function drawMenu() {
    ctx.fillStyle = wallpapers[current_wallpaper] || WHITE;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = PRIMARY;
    ctx.font = '28px Arial';
    ctx.fillText('HaloOS', WIDTH / 2 - 60, 56);

    ctx.font = '20px Arial';
    let y = 110;
    for (let i = 0; i < apps.length; i++) {
      const name = apps[i];
      if (i === selected_index) {
        fillRounded(WIDTH / 2 - 120, y - 22, 240, 38, PRIMARY, 10);
        text(name, WIDTH / 2 - 90, y, { color: WHITE, font: '20px Arial' });
      } else {
        text(name, WIDTH / 2 - 90, y, { color: BLACK });
      }
      y += 50;
    }

    drawTimeSmall();
    drawWheel();
  }

  function drawWheel() {
    ctx.save();
    ctx.lineWidth = 26;
    ctx.strokeStyle = GRAY;
    ctx.beginPath();
    ctx.arc(wheel_center.x, wheel_center.y, wheel_radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // inner
    fillRounded(wheel_center.x - 45, wheel_center.y - 45, 90, 90, WHITE, 45);
    fillRounded(wheel_center.x - 15, wheel_center.y - 15, 30, 30, GRAY, 16);
  }

  // draw keyboard and fill keyboard_keys for hit detection
  function drawKeyboard(kbTopLocal) {
    keyboard_keys.length = 0;
    const kx = 20, ky = kbTopLocal;
    ctx.font = '16px Arial';
    // letters rows (10 columns)
    for (let i = 0; i < letters.length; i++) {
      const col = i % 10;
      const row = Math.floor(i / 10);
      const x = kx + col * 36;
      const y = ky + row * 40;
      fillRounded(x, y, 34, 36, LIGHTGRAY, 6);
      text(letters[i], x + 8, y + 24, { font: '16px Arial' });
      keyboard_keys.push({ x, y, w: 34, h: 36, ch: letters[i] });
    }
    // extras row
    const exY = ky + 3 * 40 + 8;
    const exX = kx;
    const exW = WIDTH - 40;
    const delW = 80, sendW = 80, spaceW = exW - delW - sendW - 10;
    // Space
    fillRounded(exX, exY, spaceW, 40, PRIMARY, 8);
    text('SPACE', exX + 12, exY + 26, { color: WHITE, font: '16px Arial Bold' });
    keyboard_keys.push({ x: exX, y: exY, w: spaceW, h: 40, ch: 'SPACE' });
    // DEL
    const delX = exX + spaceW + 5;
    fillRounded(delX, exY, delW, 40, '#333', 8);
    text('DEL', delX + 22, exY + 26, { color: WHITE, font: '16px Arial Bold' });
    keyboard_keys.push({ x: delX, y: exY, w: delW, h: 40, ch: 'DEL' });
    // SEND
    const sendX = delX + delW + 5;
    fillRounded(sendX, exY, sendW, 40, 'green', 8);
    text('SEND', sendX + 18, exY + 26, { color: WHITE, font: '16px Arial Bold' });
    keyboard_keys.push({ x: sendX, y: exY, w: sendW, h: 40, ch: 'SEND' });
  }

  function drawTypingBox(kbTopLocal) {
    const boxH = 48;
    const boxY = kbTopLocal - boxH - 12;
    strokeRounded(18, boxY, WIDTH - 36, boxH, '#999', 8, 2);
    ctx.fillStyle = WHITE;
    ctx.fillRect(19, boxY + 1, WIDTH - 38, boxH - 2);
    ctx.fillStyle = BLACK;
    ctx.font = '18px Arial';
    const textToShow = typing_text || '';
    ctx.save();
    ctx.beginPath();
    ctx.rect(22, boxY + 12, WIDTH - 76, boxH - 20);
    ctx.clip();
    ctx.fillText(textToShow, 24, boxY + 32);
    ctx.restore();
  }

  function drawNMessage() {
    ctx.fillStyle = wallpapers[current_wallpaper] || WHITE;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawBackTriangle();
    ctx.fillStyle = PRIMARY;
    ctx.font = '20px Arial';
    ctx.fillText('Messages', 20, 44);
    drawTimeSmall();

    ctx.font = '16px Arial';
    ctx.fillStyle = BLACK;
    let y = 80;
    const shown = messages.slice(-8);
    for (let m of shown) {
      strokeRounded(18, y - 18, WIDTH - 36, 34, '#eee', 8, 1);
      text(m, 28, y, { font: '16px Arial' });
      y += 46;
    }

    kbTop = HEIGHT - Math.min(HEIGHT * 0.45, 300);
    drawKeyboard(kbTop);
    drawTypingBox(kbTop);
  }

  function drawNotes() {
    ctx.fillStyle = wallpapers[current_wallpaper] || WHITE;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawBackTriangle();
    ctx.fillStyle = PRIMARY;
    ctx.font = '20px Arial';
    ctx.fillText('Notes', 20, 44);
    drawTimeSmall();

    ctx.font = '16px Arial';
    ctx.fillStyle = BLACK;
    let y = 80;
    const shown = notes.slice(-8);
    for (let n of shown) {
      strokeRounded(18, y - 18, WIDTH - 36, 34, '#eee', 8, 1);
      text(n, 28, y, { font: '16px Arial' });
      y += 46;
    }

    kbTop = HEIGHT - Math.min(HEIGHT * 0.45, 300);
    drawKeyboard(kbTop);
    drawTypingBox(kbTop);
  }

  function drawClock() {
    ctx.fillStyle = wallpapers[current_wallpaper] || WHITE;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawBackTriangle();
    drawTimeSmall();
    ctx.fillStyle = BLACK;
    ctx.font = '34px Arial';
    ctx.fillText(new Date().toLocaleTimeString(), WIDTH / 2 - 90, HEIGHT / 2);
  }

  function drawCalendar() {
    ctx.fillStyle = wallpapers[current_wallpaper] || WHITE;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawBackTriangle();
    drawTimeSmall();
    ctx.fillStyle = BLACK;
    ctx.font = '20px Arial';
    const t = new Date();
    ctx.fillText(t.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), WIDTH / 2 - 110, 60);

    // simple calendar grid
    const first = new Date(t.getFullYear(), t.getMonth(), 1);
    const days = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
    let dayOfWeek = first.getDay();
    let day = 1;
    let y = 100;
    ctx.font = '14px Arial';
    for (let row = 0; row < 6; row++) {
      let x = 40;
      for (let col = 0; col < 7; col++) {
        if (row === 0 && col < dayOfWeek) {
          // empty
        } else if (day <= days) {
          const highlighted = (day === t.getDate());
          if (highlighted) fillRounded(x - 6, y - 16, 28, 28, PRIMARY, 6);
          text(String(day), x, y, { color: highlighted ? WHITE : BLACK, font: '14px Arial' });
          day++;
        }
        x += 44;
      }
      y += 36;
    }
  }

  function drawSettings() {
    ctx.fillStyle = wallpapers[current_wallpaper] || WHITE;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawBackTriangle();
    drawTimeSmall();

    ctx.fillStyle = BLACK;
    ctx.font = '18px Arial';
    ctx.fillText('HaloOS 1.0.4', 24, 46);
    ctx.fillStyle = 'green';
    ctx.font = '14px Arial';
    ctx.fillText('Up to date', 140, 46);

    ctx.fillStyle = BLACK;
    ctx.font = '18px Arial';
    ctx.fillText('Wallpapers', 24, 90);

    let y = 120;
    const boxW = 80, boxH = 44, gap = 12;
    for (let i = 0; i < wallpapers.length; i++) {
      const x = 24 + i * (boxW + gap);
      fillRounded(x, y, boxW, boxH, wallpapers[i], 8);
      if (i === current_wallpaper) strokeRounded(x, y, boxW, boxH, PRIMARY, 8, 3);
    }

    y += boxH + 30;
    ctx.fillStyle = BLACK;
    ctx.font = '16px Arial';
    text('Volume: Default', 24, y);
    y += 26;
    text('Theme: Light', 24, y);
    y += 26;
    text('Language: English', 24, y);
    y += 36;
    text('Installed apps: ' + installedApps.length, 24, y);
  }

  function drawMarket() {
    ctx.fillStyle = wallpapers[current_wallpaper] || WHITE;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawBackTriangle();
    drawTimeSmall();

    ctx.fillStyle = PRIMARY;
    ctx.font = '20px Arial';
    ctx.fillText('Halo Market', 24, 46);

    let y = 90;
    const boxH = 58;
    for (let i = 0; i < marketCatalog.length; i++) {
      const item = marketCatalog[i];
      // big blue box
      fillRounded(18, y, WIDTH - 36, boxH - 6, PRIMARY, 10);
      ctx.fillStyle = WHITE;
      ctx.font = '18px Arial';
      ctx.fillText(item.name, 36, y + 36);

      const btnW = 90, btnH = 36;
      const btnX = WIDTH - btnW - 36, btnY = y + 12;
      const installed = installedApps.includes(capitalizeName(item.name));
      if (installed) {
        fillRounded(btnX, btnY, btnW, btnH, '#333', 8);
        ctx.fillStyle = WHITE;
        ctx.font = '14px Arial';
        ctx.fillText('Delete', btnX + 16, btnY + 22);
      } else {
        fillRounded(btnX, btnY, btnW, btnH, WHITE, 8);
        strokeRounded(btnX, btnY, btnW, btnH, '#ccc', 8, 1);
        ctx.fillStyle = PRIMARY;
        ctx.font = '14px Arial';
        ctx.fillText('Install', btnX + 16, btnY + 22);
      }
      y += boxH + 12;
    }
  }

  // Dialer
  let dialInput = '';
  function drawDialer() {
    ctx.fillStyle = wallpapers[current_wallpaper] || WHITE;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawBackTriangle();
    drawTimeSmall();

    ctx.fillStyle = PRIMARY;
    ctx.font = '20px Arial';
    ctx.fillText('Dialer', 24, 46);

    // number box
    strokeRounded(18, 80, WIDTH - 36, 48, '#ccc', 8, 2);
    ctx.fillStyle = BLACK;
    ctx.font = '22px Arial';
    ctx.fillText(dialInput || 'Enter number', 36, 112);

    // Call button
    fillRounded(36, 140, WIDTH - 72, 44, '#0A8', 10);
    ctx.fillStyle = WHITE;
    ctx.font = '18px Arial';
    ctx.fillText('Call', 56, 170);

    // Add Contact
    fillRounded(36, 196, WIDTH - 72, 44, LIGHTGRAY, 10);
    ctx.fillStyle = BLACK;
    ctx.font = '18px Arial';
    ctx.fillText('Add Contact', 56, 226);

    // Contacts list
    ctx.fillStyle = '#222';
    ctx.font = '16px Arial';
    ctx.fillText('Contacts', 24, 280);
    let y = 300;
    if (contacts.length === 0) {
      ctx.fillStyle = '#666';
      ctx.fillText('(no contacts)', 36, y);
    } else {
      for (let c of contacts) {
        strokeRounded(18, y - 20, WIDTH - 36, 44, '#eee', 8, 1);
        text(c.name + ' — ' + c.number, 32, y + 12, { font: '16px Arial' });
        y += 56;
      }
    }

    // numeric keypad area
    // simple grid at bottom
    const padTop = HEIGHT - Math.min(HEIGHT * 0.45, 300);
    const cellW = (WIDTH - 72) / 3;
    const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    ctx.font = '22px Arial';
    for (let i = 0; i < labels.length; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 36 + col * (cellW + 6);
      const yCell = padTop + 12 + row * 64;
      fillRounded(x, yCell, cellW, 56, LIGHTGRAY, 10);
      ctx.fillStyle = BLACK;
      ctx.fillText(labels[i], x + cellW / 2 - 6, yCell + 36);
    }
  }

  // helper: draw the small back "triangle" shape
  function drawBackTriangle() {
    ctx.fillStyle = GRAY;
    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(30, 0);
    ctx.lineTo(30, 20);
    ctx.closePath();
    ctx.fill();
  }

  // placeholder for arbitrary installed apps (simple view)
  function drawPlaceholderApp(name) {
    ctx.fillStyle = wallpapers[current_wallpaper] || WHITE;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawBackTriangle();
    ctx.fillStyle = PRIMARY;
    ctx.font = '22px Arial';
    ctx.fillText(name, 24, 46);
    drawTimeSmall();
    ctx.fillStyle = '#333';
    ctx.font = '16px Arial';
    ctx.fillText('This is a placeholder for ' + name + '.', 24, 120);
  }

  // capitalization helper
  function capitalizeName(n) {
    return n.split(' ').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
  }

  // ------------------- Render loop -------------------
  function render() {
    if (overlay && Date.now() > overlay.until) overlay = null;

    switch (current_app) {
      case 'menu': drawMenu(); break;
      case 'NMessage': drawNMessage(); break;
      case 'Notes': drawNotes(); break;
      case 'Clock': drawClock(); break;
      case 'Calendar': drawCalendar(); break;
      case 'Settings': drawSettings(); break;
      case 'Halo Market': drawMarket(); break;
      case 'Dialer': drawDialer(); break;
      default:
        // if installed app (not a core app)
        if (installedApps.includes(current_app)) {
          drawPlaceholderApp(current_app);
        } else {
          // fallback to menu
          current_app = 'menu';
        }
    }

    if (overlay) {
      fillRounded(36, HEIGHT / 2 - 40, WIDTH - 72, 80, 'rgba(0,0,0,0.85)', 12);
      ctx.fillStyle = WHITE;
      ctx.font = '18px Arial';
      ctx.fillText(overlay.text, 54, HEIGHT / 2);
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  // ------------------- Input handling -------------------
  // compute keyboard positions for hit detection (keeps keyboard_keys array updated)
  function computeKeyboardPositions() {
    const top = HEIGHT - Math.min(HEIGHT * 0.45, 300);
    kbTop = top;
    keyboard_keys.length = 0;
    const kx = 20, ky = top;
    for (let i = 0; i < letters.length; i++) {
      const col = i % 10;
      const row = Math.floor(i / 10);
      const x = kx + col * 36;
      const y = ky + row * 40;
      keyboard_keys.push({ x, y, w: 34, h: 36, ch: letters[i] });
    }
    const exY = ky + 3 * 40 + 8;
    const exX = kx;
    const exW = WIDTH - 40;
    const delW = 80, sendW = 80, spaceW = exW - delW - sendW - 10;
    keyboard_keys.push({ x: exX, y: exY, w: spaceW, h: 40, ch: 'SPACE' });
    keyboard_keys.push({ x: exX + spaceW + 5, y: exY, w: delW, h: 40, ch: 'DEL' });
    keyboard_keys.push({ x: exX + spaceW + 5 + delW + 5, y: exY, w: sendW, h: 40, ch: 'SEND' });
  }
  computeKeyboardPositions();
  window.addEventListener('resize', computeKeyboardPositions);

  // unify pointer location extraction
  function getPoint(e) {
    if (e.touches && e.touches.length) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      return { x: e.clientX, y: e.clientY };
    }
  }

  // event registration
  canvas.addEventListener('touchstart', onPointerDown, { passive: false });
  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('touchmove', onPointerMove, { passive: false });
  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('touchend', onPointerUp);
  canvas.addEventListener('mouseup', onPointerUp);

  function onPointerDown(evt) {
    evt.preventDefault();
    const p = getPoint(evt);
    handleTap(p.x, p.y);
    startWheelDrag(p.x, p.y);
  }

  function onPointerMove(evt) {
    if (dragging) {
      const p = getPoint(evt);
      handleWheelDrag(p.x, p.y);
    }
  }

  function onPointerUp(evt) {
    dragging = false;
  }

  // start wheel drag
  function startWheelDrag(mx, my) {
    if (current_app !== 'menu') return;
    const dx = mx - wheel_center.x, dy = my - wheel_center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 50 && dist < wheel_radius + 30) {
      dragging = true;
      prev_angle = Math.atan2(dy, dx) * 180 / Math.PI;
    }
  }

  function handleWheelDrag(mx, my) {
    if (!dragging) return;
    const angle = Math.atan2(my - wheel_center.y, mx - wheel_center.x) * 180 / Math.PI;
    if (angle - prev_angle > 8) {
      selected_index = (selected_index + 1) % apps.length;
      prev_angle = angle;
    } else if (prev_angle - angle > 8) {
      selected_index = (selected_index - 1 + apps.length) % apps.length;
      prev_angle = angle;
    }
  }

  // tap handler
  function handleTap(mx, my) {
    // back button top-left
    if (mx <= 44 && my <= 40 && current_app !== 'menu') {
      current_app = 'menu';
      return;
    }

    // MENU interactions
    if (current_app === 'menu') {
      const dx = mx - wheel_center.x, dy = my - wheel_center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 18) {
        // center -> open selected
        const choice = apps[selected_index];
        if (choice === 'Power Off') {
          if (confirm('Power off HaloOS?')) {
            overlay = { text: 'Powering off...', until: Date.now() + 1000 };
          }
        } else {
          current_app = choice;
          if (current_app === 'Dialer') dialInput = '';
        }
        return;
      }
      // tap app item in list
      let y = 110;
      for (let i = 0; i < apps.length; i++) {
        if (mx >= WIDTH / 2 - 140 && mx <= WIDTH / 2 + 140 && my >= y - 28 && my <= y + 12) {
          selected_index = i;
          // if tapped directly, also open
          const choice = apps[selected_index];
          if (choice === 'Power Off') {
            if (confirm('Power off HaloOS?')) overlay = { text: 'Powering off...', until: Date.now() + 1000 };
          } else {
            current_app = choice;
            if (current_app === 'Dialer') dialInput = '';
          }
          return;
        }
        y += 50;
      }
    }

    // SETTINGS: wallpaper picks
    if (current_app === 'Settings') {
      let y = 120;
      const boxW = 80, gap = 12;
      for (let i = 0; i < wallpapers.length; i++) {
        const x = 24 + i * (boxW + gap);
        if (mx >= x && mx <= x + boxW && my >= y && my <= y + boxW) {
          current_wallpaper = i;
          saveWallpaper();
          return;
        }
      }
    }

    // MARKET: install/delete
    if (current_app === 'Halo Market') {
      let y = 90;
      for (let i = 0; i < marketCatalog.length; i++) {
        const item = marketCatalog[i];
        const btnW = 90, btnH = 36, btnX = WIDTH - btnW - 36, btnY = y + 12;
        if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
          const appName = capitalizeName(item.name);
          const installed = installedApps.includes(appName);
          if (installed) {
            if (coreApps.includes(appName)) {
              alert('Cannot remove system app.');
            } else {
              installedApps = installedApps.filter(a => a !== appName);
            }
          } else {
            if (!installedApps.includes(appName)) {
              const p = installedApps.indexOf('Power Off');
              if (p >= 0) installedApps.splice(p, 0, appName);
              else installedApps.push(appName);
            }
          }
          saveInstalled();
          return;
        }
        y += 70;
      }
    }

    // NMessage / Notes: keyboard area
    if (current_app === 'NMessage' || current_app === 'Notes') {
      const kTop = kbTop;
      if (my >= kTop) {
        for (let k of keyboard_keys) {
          if (mx >= k.x && mx <= k.x + k.w && my >= k.y && my <= k.y + k.h) {
            if (k.ch === 'SPACE') typing_text += ' ';
            else if (k.ch === 'DEL') typing_text = typing_text.slice(0, -1);
            else if (k.ch === 'SEND') {
              if (typing_text.trim() !== '') {
                if (current_app === 'NMessage') {
                  messages.push('You: ' + typing_text.trim());
                  saveMessages();
                } else {
                  notes.push(typing_text.trim());
                  saveNotes();
                }
              }
              typing_text = '';
            } else {
              typing_text += k.ch;
            }
            return;
          }
        }
      }
      // tap non-keyboard area in these apps does nothing else
      return;
    }

    // DIALER region logic
    if (current_app === 'Dialer') {
      // Call button
      if (mx >= 36 && mx <= WIDTH - 36 && my >= 140 && my <= 184) {
        if (dialInput.trim() !== '') {
          const contact = contacts.find(c => c.number === dialInput);
          const label = contact ? (contact.name + ' — ' + dialInput) : dialInput;
          overlay = { text: 'Calling ' + label, until: Date.now() + 1800 };
          messages.push('You called ' + label);
          saveMessages();
          dialInput = '';
        }
        return;
      }
      // Add Contact
      if (mx >= 36 && mx <= WIDTH - 36 && my >= 196 && my <= 240) {
        if (dialInput.trim() === '') {
          alert('Enter a number before saving.');
          return;
        }
        const name = prompt('Contact name for ' + dialInput + '?', '');
        if (name && name.trim() !== '') {
          contacts.push({ name: name.trim(), number: dialInput.trim() });
          saveContacts();
        }
        dialInput = '';
        return;
      }
      // Tap on contacts to call
      let topY = 300;
      for (let i = 0; i < contacts.length; i++) {
        const y = topY + i * 56;
        if (mx >= 18 && mx <= WIDTH - 18 && my >= y - 20 && my <= y + 44) {
          const c = contacts[i];
          overlay = { text: 'Calling ' + c.name + ' (' + c.number + ')', until: Date.now() + 1800 };
          messages.push('You called ' + c.name + ' (' + c.number + ')');
          saveMessages();
          return;
        }
      }
      // numeric keypad bottom
      const padTop = HEIGHT - Math.min(HEIGHT * 0.45, 300);
      const cellW = (WIDTH - 72) / 3;
      const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
      for (let i = 0; i < labels.length; i++) {
        const col = i % 3, row = Math.floor(i / 3);
        const x = 36 + col * (cellW + 6);
        const y = padTop + 12 + row * 64;
        if (mx >= x && mx <= x + cellW && my >= y && my <= y + 56) {
          dialInput += labels[i];
          return;
        }
      }

      return;
    }

    // If a placeholder app (installed custom app) is open, tapping back returns
    // Nothing else to handle
  }

  // ------------------- Initialization / saving -------------------
  // first-time ensure keyboard pos ready
  computeKeyboardPositions();

  // Save any initial arrays (safe)
  saveInstalled();
  saveContacts();
  saveMessages();
  saveNotes();
  saveWallpaper();

  // expose some debug helpers on console if needed
  window.HaloOS = {
    installedApps, contacts, messages, notes,
    reload: () => location.reload()
  };

  // done
  console.log('HaloOS 1.0.4 app.js loaded');
})();
