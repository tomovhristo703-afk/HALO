<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no" />
<title>HaloOS 1.0.2</title>
<link rel="manifest" href="manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<style>
  html,body{height:100%;margin:0;font-family:Arial, Helvetica, sans-serif;background:#fff; -webkit-tap-highlight-color: transparent;}
  canvas{display:block; touch-action:none;}
</style>
</head>
<body>
<canvas id="haloCanvas"></canvas>
<script>
/* ===========================
   HaloOS PWA - full app
   - Market with install/delete (persistent)
   - Dialer with contacts and mock call
   - Keyboard with SPACE, DEL, SEND
   - Typing box above keyboard
   - Settings, wallpapers, version display
   - Touch-first; persists data in localStorage
   =========================== */

const canvas = document.getElementById('haloCanvas');
const ctx = canvas.getContext('2d');

let WIDTH = window.innerWidth, HEIGHT = window.innerHeight;
function resizeCanvas(){
  WIDTH = window.innerWidth; HEIGHT = window.innerHeight;
  canvas.width = WIDTH; canvas.height = HEIGHT;
  // recompute wheel center
  wheel_center.x = WIDTH/2; wheel_center.y = HEIGHT - 120;
}
resizeCanvas();

window.addEventListener('resize', resizeCanvas);

// Colors & styles
const WHITE="#FFFFFF", BLACK="#000000", BLUE="#0064FF", GRAY:"#B4B4B4", LIGHTGRAY="#F6F7FB", PRIMARY="#0A63E8";
const rounded = (x,y,w,h,r=8)=>{
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
};

// persistent data keys
const LS_APPS = 'halo_installed_apps_v1';
const LS_CONTACTS = 'halo_contacts_v1';
const LS_MESSAGES = 'halo_messages_v1';
const LS_NOTES = 'halo_notes_v1';
const LS_WALL = 'halo_wall_v1';

// default system/core apps (cannot remove)
const coreApps = ["NMessage","Notes","Clock","Calendar","Settings","Halo Market","Dialer","Power Off"];

// available market apps that can be installed/uninstalled
const marketCatalogDefault = [
  {id:"calculator", name:"Calculator"},
  {id:"weather", name:"Weather"},
  {id:"music", name:"Music"},
  {id:"photos", name:"Photos"},
  {id:"camera", name:"Camera"},
  {id:"todo", name:"To-Do"}
];

// load persistent state or set defaults
let installedApps = JSON.parse(localStorage.getItem(LS_APPS) || 'null');
if(!installedApps){
  // include core apps plus nothing else by default
  installedApps = coreApps.slice();
  localStorage.setItem(LS_APPS, JSON.stringify(installedApps));
}

let marketCatalog = marketCatalogDefault.slice(); // static list for market

let contacts = JSON.parse(localStorage.getItem(LS_CONTACTS) || '[]');
let messages = JSON.parse(localStorage.getItem(LS_MESSAGES) || '["Alice: Hello!","Bob: Call me."]');
let notes = JSON.parse(localStorage.getItem(LS_NOTES) || '["Welcome to HaloOS!"]');

let current_wallpaper = parseInt(localStorage.getItem(LS_WALL) || '0',10);

// UI state
let apps = installedApps.slice(); // current menu apps
let current_app = "menu";
let selected_index = 0;
let typing_text = "";

// keyboard config
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const extra_keys = ["SPACE","DEL","SEND"];
let keyboard_keys = []; // populated per drawKeyboard()

// wheel (for menu)
let wheel_center = {x: WIDTH/2, y: HEIGHT-120};
let wheel_radius = 90;
let dragging=false, prev_angle=0;

// other UI
let callOverlay = null; // {text, untilTimestamp}

// helper draw
function fillRoundedRect(x,y,w,h,color,r=8){
  ctx.save();
  ctx.fillStyle=color;
  rounded(x,y,w,h,r);
  ctx.fill();
  ctx.restore();
}
function strokeRoundedRect(x,y,w,h,color,r=8,line=2){
  ctx.save();
  ctx.strokeStyle=color; ctx.lineWidth=line;
  rounded(x,y,w,h,r);
  ctx.stroke();
  ctx.restore();
}
function drawText(txt,x,y,opts={}){
  ctx.fillStyle = opts.color || BLACK;
  ctx.font = (opts.font || '18px Arial');
  ctx.fillText(txt,x,y);
}

// draw time small
function drawTimeSmall(){
  const t = new Date();
  ctx.fillStyle = BLACK;
  ctx.font = '16px Arial';
  const tm = t.toLocaleTimeString();
  ctx.fillText(tm, WIDTH - 110, 28);
}

// wallpapers (colors)
const wallpapers = [WHITE,"#C8FFC8","#C8C8FF","#FFC8C8","#FFFFC8","#FFF2CC","#E8E8FF","#FDECEC"];

// ================= Menu & apps =================
function drawMenu(){
  ctx.fillStyle = wallpapers[current_wallpaper] || WHITE;
  ctx.fillRect(0,0,WIDTH,HEIGHT);

  // Title
  ctx.fillStyle = PRIMARY;
  ctx.font = '28px Arial';
  ctx.fillText('HaloOS', WIDTH/2 - 60, 56);

  // App list
  ctx.font = '20px Arial';
  let y = 110;
  for(let i=0;i<apps.length;i++){
    const name = apps[i];
    // highlight selected
    if(i === selected_index){
      fillRoundedRect(WIDTH/2 - 120, y-22, 240, 38, PRIMARY, 10);
      drawText(name, WIDTH/2 - 90, y, {color:WHITE, font:'20px Arial Bold'});
    } else {
      drawText(name, WIDTH/2 - 90, y, {color:BLACK});
    }
    y += 50;
  }

  drawTimeSmall();
  drawWheel();
}

// wheel drawing
function drawWheel(){
  ctx.save();
  ctx.lineWidth = 26;
  ctx.strokeStyle = GRAY;
  ctx.beginPath();
  ctx.arc(wheel_center.x, wheel_center.y, wheel_radius, 0, Math.PI*2);
  ctx.stroke();
  ctx.restore();

  // inner circle
  fillRoundedRect(wheel_center.x - 45, wheel_center.y - 45, 90, 90, WHITE, 45);
  fillRoundedRect(wheel_center.x - 15, wheel_center.y - 15, 30, 30, GRAY, 16);
}

// ================= Keyboard & Typing box =================
function drawKeyboard(yBase){
  keyboard_keys = [];
  ctx.font = '16px Arial';
  const kx = 20, ky = yBase;
  for(let i=0;i<letters.length;i++){
    const col = i % 10;
    const row = Math.floor(i / 10);
    const x = kx + col * 36;
    const y = ky + row * 40;
    fillRoundedRect(x,y,34,36,LIGHTGRAY,6);
    drawText(letters[i], x+8, y+25, {color:BLACK, font:'16px Arial'});
    keyboard_keys.push({x,y,w:34,h:36,ch:letters[i]});
  }
  // extra keys row (space, del, send)
  const exY = ky + 3 * 40 + 8;
  const exXStart = kx;
  const exW = WIDTH - 40;
  // Divide reasonably: DEL (80), SPACE (exW-200), SEND (80)
  const delW = 80, sendW = 80, spaceW = exW - delW - sendW - 10;
  // SPACE
  fillRoundedRect(exXStart, exY, spaceW, 40, PRIMARY, 8);
  drawText('SPACE', exXStart + 12, exY + 26, {color:WHITE, font:'16px Arial Bold'});
  keyboard_keys.push({x:exXStart,y:exY,w:spaceW,h:40,ch:'SPACE'});
  // DEL
  const delX = exXStart + spaceW + 5;
  fillRoundedRect(delX, exY, delW, 40, '#333', 8);
  drawText('DEL', delX + 22, exY + 26, {color:WHITE, font:'16px Arial Bold'});
  keyboard_keys.push({x:delX,y:exY,w:delW,h:40,ch:'DEL'});
  // SEND
  const sendX = delX + delW + 5;
  fillRoundedRect(sendX, exY, sendW, 40, 'green', 8);
  drawText('SEND', sendX + 18, exY + 26, {color:WHITE, font:'16px Arial Bold'});
  keyboard_keys.push({x:sendX,y:exY,w:sendW,h:40,ch:'SEND'});
}

// typing box above keyboard
function drawTypingBox(yBase){
  // place it just above keyboard top
  const boxHeight = 48;
  const boxY = yBase - boxHeight - 12;
  strokeRoundedRect(18, boxY, WIDTH - 36, boxHeight, '#999', 8, 2);
  ctx.fillStyle = WHITE;
  ctx.fillRect(18+1, boxY+1, WIDTH-36-2, boxHeight-2);
  ctx.fillStyle = BLACK;
  ctx.font = '18px Arial';
  const textToShow = typing_text || '';
  // wrap/render with simple clipping if long
  ctx.save();
  ctx.beginPath();
  ctx.rect(22, boxY + 12, WIDTH - 76, boxHeight - 20);
  ctx.clip();
  ctx.fillText(textToShow, 24, boxY + 32);
  ctx.restore();
}

// ================= NMessage / Notes =================
function drawNMessage(){
  ctx.fillStyle = wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT);
  // header
  drawBack();
  ctx.fillStyle = PRIMARY; ctx.font = '20px Arial'; ctx.fillText('Messages', 20, 44);
  drawTimeSmall();

  // message list
  ctx.font = '16px Arial'; ctx.fillStyle = BLACK;
  let y = 80;
  const shown = messages.slice(-8);
  shown.forEach(m=>{
    strokeRoundedRect(18, y-18, WIDTH - 36, 34, '#ddd', 8, 1);
    drawText(m, 28, y, {font:'16px Arial'});
    y += 46;
  });

  // keyboard area
  const kbTop = HEIGHT - Math.min(HEIGHT*0.45, 300);
  drawKeyboard(kbTop);
  drawTypingBox(kbTop);
}

function drawNotes(){
  ctx.fillStyle = wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT);
  drawBack();
  ctx.fillStyle = PRIMARY; ctx.font = '20px Arial'; ctx.fillText('Notes', 20, 44);
  drawTimeSmall();

  ctx.font = '16px Arial'; ctx.fillStyle = BLACK;
  let y = 80;
  notes.slice(-8).forEach(n=>{
    strokeRoundedRect(18, y-18, WIDTH - 36, 34, '#eee', 8, 1);
    drawText(n, 28, y, {font:'16px Arial'});
    y += 46;
  });

  const kbTop = HEIGHT - Math.min(HEIGHT*0.45, 300);
  drawKeyboard(kbTop);
  drawTypingBox(kbTop);
}

// ================= Clock & Calendar =================
function drawClock(){
  ctx.fillStyle = wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT);
  drawBack();
  drawTimeSmall();
  ctx.fillStyle = BLACK; ctx.font = '36px Arial';
  ctx.fillText(new Date().toLocaleTimeString(), WIDTH/2 - 100, HEIGHT/2);
}
function drawCalendar(){
  ctx.fillStyle = wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT);
  drawBack(); drawTimeSmall();
  ctx.fillStyle = BLACK; ctx.font = '20px Arial';
  const t = new Date();
  ctx.fillText(t.toLocaleDateString(undefined,{month:'long', year:'numeric'}), WIDTH/2-110, 60);
  // Simple calendar grid (days as numbers)
  const firstDay = new Date(t.getFullYear(), t.getMonth(), 1);
  const daysInMonth = new Date(t.getFullYear(), t.getMonth()+1, 0).getDate();
  let y = 100, xStart = 40;
  ctx.font = '14px Arial';
  let dayOfWeek = firstDay.getDay(); // 0..6
  let day = 1;
  for(let row=0; row<6; row++){
    let x = xStart;
    for(let col=0; col<7; col++){
      if(row===0 && col<dayOfWeek){
        // empty
      } else if(day <= daysInMonth){
        const highlight = (day === t.getDate());
        if(highlight) fillRoundedRect(x-6, y-16, 28, 28, PRIMARY, 6);
        drawText(String(day), x, y, {color: highlight ? WHITE : BLACK, font:'14px Arial'});
        day++;
      }
      x += 44;
    }
    y += 36;
  }
}

// ================= Settings =================
function drawSettings(){
  ctx.fillStyle = wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT);
  drawBack(); drawTimeSmall();
  ctx.fillStyle = BLACK; ctx.font = '18px Arial';
  ctx.fillText('HaloOS 1.0.4', 24, 46);
  ctx.fillStyle = 'green'; ctx.font='14px Arial'; ctx.fillText('Up to date', 140, 46);

  ctx.fillStyle = BLACK; ctx.font = '18px Arial'; ctx.fillText('Wallpapers', 24, 90);
  let y = 120;
  const boxW = 80, boxH = 44, gap = 12;
  for(let i=0;i<wallpapers.length;i++){
    const x = 24 + i*(boxW + gap);
    fillRoundedRect(x, y, boxW, boxH, wallpapers[i], 8);
    if(i === current_wallpaper) strokeRoundedRect(x, y, boxW, boxH, PRIMARY, 8, 3);
  }
  // other settings
  y += boxH + 30;
  ctx.fillStyle = BLACK; ctx.font='16px Arial';
  drawText('Volume: Default', 24, y);
  y += 26;
  drawText('Theme: Light',24,y);
  y += 26;
  drawText('Language: English',24,y);
  y += 36;
  drawText('Storage: ' + (installedApps.length) + ' apps', 24, y);
}

// ================= Halo Market =================
function drawMarket(){
  ctx.fillStyle = wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT);
  drawBack(); drawTimeSmall();
  ctx.fillStyle = PRIMARY; ctx.font = '20px Arial'; ctx.fillText('Halo Market', 24, 46);

  // list apps in blue boxes
  let y = 90;
  const boxH = 58;
  for(let i=0;i<marketCatalog.length;i++){
    const item = marketCatalog[i];
    // blue box
    fillRoundedRect(18, y, WIDTH - 36, boxH - 6, PRIMARY, 10);
    ctx.fillStyle = WHITE; ctx.font='18px Arial';
    ctx.fillText(item.name, 36, y + 36);

    // install/uninstall button area (light)
    const btnW = 90, btnH = 36, btnX = WIDTH - btnW - 36, btnY = y + 12;
    const isInstalled = installedApps.includes(capitalizeName(item.name));
    fillRoundedRect(btnX, btnY, btnW, btnH, isInstalled ? '#333' : '#fff', 8);
    strokeRoundedRect(btnX, btnY, btnW, btnH, '#ccc', 8, 1);
    ctx.fillStyle = isInstalled ? WHITE : PRIMARY;
    ctx.font='14px Arial';
    ctx.fillText(isInstalled ? 'Delete' : 'Install', btnX + 16, btnY + 22);

    y += boxH + 12;
  }
}

// ================= Dialer =================
let dialInput = "";
function drawDialer(){
  ctx.fillStyle = wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT);
  drawBack(); drawTimeSmall();
  ctx.fillStyle = PRIMARY; ctx.font='20px Arial'; ctx.fillText('Dialer', 24, 46);

  // show input as a rounded box
  strokeRoundedRect(18, 80, WIDTH - 36, 48, '#ccc', 8, 2);
  ctx.font = '22px Arial';
  ctx.fillStyle = BLACK;
  ctx.fillText(dialInput || 'Enter number', 36, 112);

  // quick actions: Call, Add Contact
  fillRoundedRect(36, 140, WIDTH - 72, 44, '#0A8', 10);
  drawText('Call', 56, 170, {color:WHITE, font:'18px Arial Bold'});

  fillRoundedRect(36, 196, WIDTH - 72, 44, LIGHTGRAY, 10);
  drawText('Add Contact', 56, 226, {color:BLACK, font:'18px Arial Bold'});

  // contacts list
  ctx.fillStyle = '#222'; ctx.font='16px Arial';
  drawText('Contacts', 24, 280);
  let y = 300;
  if(contacts.length === 0){
    ctx.fillStyle = '#666'; drawText('(no contacts)', 36, y);
  } else {
    contacts.forEach(c=>{
      strokeRoundedRect(18, y-20, WIDTH - 36, 44, '#eee', 8, 1);
      drawText(c.name + ' — ' + c.number, 32, y+12, {font:'16px Arial'});
      y += 56;
    });
  }
}

// ================= Main render loop =================
function render(){
  // clear background
  ctx.clearRect(0,0,WIDTH,HEIGHT);

  if(callOverlay && Date.now() > callOverlay.until){
    callOverlay = null;
  }

  switch(current_app){
    case 'menu': drawMenu(); break;
    case 'NMessage': drawNMessage(); break;
    case 'Notes': drawNotes(); break;
    case 'Clock': drawClock(); break;
    case 'Calendar': drawCalendar(); break;
    case 'Settings': drawSettings(); break;
    case 'Halo Market': drawMarket(); break;
    case 'Dialer': drawDialer(); break;
    default:
      // custom installed app view: show a simple app placeholder
      ctx.fillStyle = wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT);
      drawBack();
      ctx.fillStyle = PRIMARY; ctx.font='22px Arial';
      ctx.fillText(current_app, 24, 46);
      drawTimeSmall();
      ctx.fillStyle = '#333';
      ctx.font = '16px Arial';
      ctx.fillText('This is a simple placeholder for ' + current_app + '.', 24, 120);
  }

  // call overlay
  if(callOverlay){
    fillRoundedRect(36, HEIGHT/2 - 40, WIDTH - 72, 80, 'rgba(0,0,0,0.85)', 12);
    ctx.fillStyle = WHITE; ctx.font = '18px Arial';
    ctx.fillText(callOverlay.text, 54, HEIGHT/2);
  }

  requestAnimationFrame(render);
}
requestAnimationFrame(render);

// ============== Helper utilities ==============
function saveInstalled(){ localStorage.setItem(LS_APPS, JSON.stringify(installedApps)); apps = installedApps.slice(); }
function saveContacts(){ localStorage.setItem(LS_CONTACTS, JSON.stringify(contacts)); }
function saveMessages(){ localStorage.setItem(LS_MESSAGES, JSON.stringify(messages)); }
function saveNotes(){ localStorage.setItem(LS_NOTES, JSON.stringify(notes)); }
function saveWallpaper(){ localStorage.setItem(LS_WALL, String(current_wallpaper)); }
function capitalizeName(n){ return n.split(' ').map(s => s[0].toUpperCase() + s.slice(1)).join(' '); }

// ================= Touch handling =================
// convert touch/click point to x,y
function getPointFromEvent(e){
  if(e.touches && e.touches.length) {
    return {x: e.touches[0].clientX, y: e.touches[0].clientY};
  } else {
    return {x: e.clientX, y: e.clientY};
  }
}

canvas.addEventListener('touchstart', onTouchStart, {passive:false});
canvas.addEventListener('mousedown', onMouseDown);

function onMouseDown(evt){
  evt.preventDefault();
  const p = getPointFromEvent(evt);
  handleTap(p.x, p.y);
  // emulate drag start if on wheel
  handleDragStart(p.x, p.y);
}
canvas.addEventListener('touchmove', onTouchMove, {passive:false});
canvas.addEventListener('mousemove', onMouseMove);

function onTouchMove(evt){
  evt.preventDefault();
  if(evt.touches && evt.touches.length) {
    const p = getPointFromEvent(evt);
    handleDragMove(p.x, p.y);
  }
}
function onMouseMove(evt){
  if(evt.buttons !== 1) return;
  const p = getPointFromEvent(evt);
  handleDragMove(p.x, p.y);
}
canvas.addEventListener('touchend', onTouchEnd, {passive:false});
canvas.addEventListener('mouseup', onMouseUp);

function onTouchEnd(evt){
  evt.preventDefault();
  handleDragEnd();
}
function onMouseUp(evt){
  handleDragEnd();
}

function onTouchStart(evt){
  evt.preventDefault();
  const p = getPointFromEvent(evt);
  handleTap(p.x,p.y);
  handleDragStart(p.x,p.y);
}

function handleDragStart(mx,my){
  // only allow wheel dragging in menu
  if(current_app === 'menu'){
    const dx = mx - wheel_center.x, dy = my - wheel_center.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(dist > 50 && dist < wheel_radius + 30){
      dragging = true;
      prev_angle = Math.atan2(dy, dx) * 180 / Math.PI;
    }
  }
}

function handleDragMove(mx,my){
  if(!dragging) return;
  const angle = Math.atan2(my - wheel_center.y, mx - wheel_center.x) * 180 / Math.PI;
  if(angle - prev_angle > 8){
    // clockwise
    selected_index = (selected_index + 1) % apps.length;
    prev_angle = angle;
  } else if(prev_angle - angle > 8){
    selected_index = (selected_index - 1 + apps.length) % apps.length;
    prev_angle = angle;
  }
}

function handleDragEnd(){
  dragging = false;
}

// main tap handler for all UI (coordinates)
function handleTap(mx,my){
  // back button (top-left triangle)
  if(mx <= 44 && my <= 40 && current_app !== 'menu'){
    current_app = 'menu';
    return;
  }

  // if in menu: check center button tap or wheel tap
  if(current_app === 'menu'){
    const dx = mx - wheel_center.x, dy = my - wheel_center.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if(dist < 18){
      // center button pressed -> open selected app
      const choice = apps[selected_index];
      if(choice === 'Power Off'){
        // simple confirm
        if(confirm('Power off HaloOS?')){
          // use a brief overlay message
          callOverlay = {text: 'Powering off...', until: Date.now() + 1200};
        }
      } else {
        current_app = choice;
        // small special init
        if(current_app === 'Dialer') dialInput = "";
      }
      return;
    }
    // also allow tapping on app list text
    // compute approximate vertical area
    let y = 110;
    for(let i=0;i<apps.length;i++){
      if(mx >= WIDTH/2 - 140 && mx <= WIDTH/2 + 140 && my >= y - 28 && my <= y + 12){
        selected_index = i;
        return;
      }
      y += 50;
    }
  }

  // ========= inside apps tap handling =========
  if(current_app === 'Settings'){
    // wallpaper boxes
    let y = 120, boxW = 80, gap=12;
    for(let i=0;i<wallpapers.length;i++){
      const x = 24 + i*(boxW + gap);
      if(mx >= x && mx <= x + boxW && my >= y && my <= y + boxW - 36){
        current_wallpaper = i;
        saveWallpaper();
        return;
      }
    }
  }

  if(current_app === 'Halo Market'){
    // check install/delete buttons per item
    let y = 90;
    for(let i=0;i<marketCatalog.length;i++){
      const btnW = 90, btnH = 36, btnX = WIDTH - btnW - 36, btnY = y + 12;
      if(mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH){
        const item = marketCatalog[i];
        const appName = capitalizeName(item.name);
        const isInstalled = installedApps.includes(appName);
        if(isInstalled){
          // delete (but block core apps)
          if(coreApps.includes(appName)){
            alert('Cannot remove system app.');
            return;
          }
          installedApps = installedApps.filter(a => a !== appName);
        } else {
          // install: add before Power Off
          // ensure not duplicate
          if(!installedApps.includes(appName)){
            // insert before "Power Off" if exists
            const p = installedApps.indexOf('Power Off');
            if(p >= 0) installedApps.splice(p, 0, appName);
            else installedApps.push(appName);
          }
        }
        saveInstalled();
        return;
      }
      y += 70;
    }
  }

  if(current_app === 'NMessage' || current_app === 'Notes'){
    // keyboard area taps + send/add actions
    const kbTop = HEIGHT - Math.min(HEIGHT*0.45, 300);
    // if tapping in keyboard area compute keys
    if(my >= kbTop){
      for(const k of keyboard_keys){
        if(mx >= k.x && mx <= k.x + k.w && my >= k.y && my <= k.y + k.h){
          if(k.ch === 'SPACE') typing_text += ' ';
          else if(k.ch === 'DEL') typing_text = typing_text.slice(0, -1);
          else if(k.ch === 'SEND'){
            if(typing_text.trim() !== ''){
              if(current_app === 'NMessage'){
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
    // Also check Send/Add top-right button that used to exist (we don't draw a separate button now)
    return;
  }

  if(current_app === 'Dialer'){
    // quick actions and contacts tap handling
    // Call button region: 36..WIDTH-36 horizontally, 140..140+44 vertically
    if(mx >= 36 && mx <= WIDTH-36 && my >= 140 && my <= 184){
      // Call pressed
      if(dialInput.trim() !== ''){
        const name = (contacts.find(c => c.number === dialInput) || {}).name;
        const label = name ? (name + ' (' + dialInput + ')') : dialInput;
        callOverlay = {text: 'Calling ' + label + '...', until: Date.now() + 1800};
        // optionally add to messages for mock call log
        messages.push('You called ' + label);
        saveMessages();
        dialInput = '';
      }
      return;
    }
    // Add Contact button region
    if(mx >= 36 && mx <= WIDTH-36 && my >= 196 && my <= 240){
      // prompt for name
      if(dialInput.trim() === '') { alert('Enter a number before saving.'); return; }
      const name = prompt('Contact name for ' + dialInput + '?', '');
      if(name && name.trim() !== ''){
        contacts.push({name: name.trim(), number: dialInput.trim()});
        saveContacts();
      }
      dialInput = '';
      return;
    }
    // tap on contacts list to dial
    let topY = 300;
    for(let i=0;i<contacts.length;i++){
      const y1 = topY + i*56;
      if(mx >= 18 && mx <= WIDTH - 18 && my >= y1 - 20 && my <= y1 + 44){
        const c = contacts[i];
        callOverlay = {text: 'Calling ' + c.name + ' (' + c.number + ')', until: Date.now() + 1800};
        messages.push('You called ' + c.name + ' (' + c.number + ')');
        saveMessages();
        return;
      }
    }
    // keypad area: we'll provide numeric keypad by tapping areas at bottom - quick simple implementation:
    // define numeric keypad layout at bottom region
    const padTop = HEIGHT - Math.min(HEIGHT*0.45, 300);
    const cellW = (WIDTH - 72) / 3;
    const labels = ['1','2','3','4','5','6','7','8','9','*','0','#'];
    for(let i=0;i<labels.length;i++){
      const col = i % 3, row = Math.floor(i/3);
      const x = 36 + col * (cellW + 6);
      const y = padTop + 12 + row * 64;
      if(mx >= x && mx <= x + cellW && my >= y && my <= y + 56){
        dialInput += labels[i];
        return;
      }
    }
    return;
  }

  // For a placeholder installed app: we allow tapping center area as 'close' to return
  // No more handlers for placeholders
}

// ================== Initialize keyboard keys for message pages ==================
function computeKeyboardPositions(){
  // compute for current layout so keyboard_keys array used by taps is valid:
  const kbTop = HEIGHT - Math.min(HEIGHT*0.45, 300);
  // we will draw keys on each render; here we just call drawKeyboard to update keyboard_keys
  // But drawKeyboard uses ctx and will draw - to avoid flicker we simply build keyboard_keys here same way
  keyboard_keys = [];
  const kx = 20, ky = kbTop;
  // letters
  for(let i=0;i<letters.length;i++){
    const col = i % 10;
    const row = Math.floor(i / 10);
    const x = kx + col * 36;
    const y = ky + row * 40;
    keyboard_keys.push({x,y,w:34,h:36,ch:letters[i]});
  }
  // extras
  const exY = ky + 3 * 40 + 8;
  const exXStart = kx;
  const exW = WIDTH - 40;
  const delW = 80, sendW = 80, spaceW = exW - delW - sendW - 10;
  keyboard_keys.push({x:exXStart,y:exY,w:spaceW,h:40,ch:'SPACE'});
  keyboard_keys.push({x:exXStart + spaceW + 5,y:exY,w:delW,h:40,ch:'DEL'});
  keyboard_keys.push({x:exXStart + spaceW + 5 + delW + 5,y:exY,w:sendW,h:40,ch:'SEND'});
}

// call computeKeyboardPositions on resize and when needed
window.addEventListener('resize', computeKeyboardPositions);
computeKeyboardPositions();

// persist basic arrays initially
saveInstalled();
saveContacts();
saveMessages();
saveNotes();
saveWallpaper();

// ensure wheel center updates after resize
function refreshWheelCenter(){
  wheel_center.x = WIDTH/2;
  wheel_center.y = HEIGHT - 120;
}
window.addEventListener('resize', refreshWheelCenter);
refreshWheelCenter();

/* ======= End of script ======= */
</script>
</body>
</html>
