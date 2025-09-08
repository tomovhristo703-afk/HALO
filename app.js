const canvas = document.getElementById("haloCanvas");
const ctx = canvas.getContext("2d");
let WIDTH = window.innerWidth;
let HEIGHT = window.innerHeight;
canvas.width = WIDTH;
canvas.height = HEIGHT;

// Colors & wallpapers
const WHITE="#FFFFFF", BLACK="#000000", BLUE="#0064FF", GRAY="#B4B4B4";
const wallpapers = [WHITE,"#C8FFC8","#C8C8FF","#FFC8C8","#FFFFC8"];
let current_wallpaper = 0;

// Apps & state
const apps = ["NMessage","Notes","Clock","Calendar","Settings","Power Off"];
let current_app="menu", selected_index=0;
let messages = ["Alice: Hello!","Bob: Call me."];
let notes = ["Welcome to HaloOS!"];
let typing_text="";
const keyboard_letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ ".split("");

// Wheel
const wheel_center = {x: WIDTH/2, y: HEIGHT-120};
const wheel_radius = 90;
let dragging=false, prev_angle=0, wheel_speed=0;

// Keyboard keys
let keyboard_keys=[];

// Helper
function drawTime(){
    const t = new Date();
    ctx.fillStyle=BLACK; ctx.font="18px Arial";
    ctx.fillText(t.toLocaleTimeString(), WIDTH-100, 30);
}
function drawBack(){
    ctx.fillStyle=GRAY; ctx.beginPath();
    ctx.moveTo(10,10); ctx.lineTo(30,0); ctx.lineTo(30,20); ctx.closePath(); ctx.fill();
}

// Wheel
function drawWheel(){
    ctx.strokeStyle=GRAY; ctx.lineWidth=30;
    ctx.beginPath(); ctx.arc(wheel_center.x,wheel_center.y,wheel_radius,0,Math.PI*2); ctx.stroke();
    ctx.lineWidth=1;
    ctx.fillStyle=WHITE; ctx.beginPath(); ctx.arc(wheel_center.x,wheel_center.y,45,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=GRAY; ctx.beginPath(); ctx.arc(wheel_center.x,wheel_center.y,15,0,Math.PI*2); ctx.fill();
}
function wheelSelect(dir){
    if(dir==="clockwise") selected_index=(selected_index+1)%apps.length;
    else if(dir==="counter") selected_index=(selected_index-1+apps.length)%apps.length;
}

// Menu
function drawMenu(){
    ctx.fillStyle=wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.fillStyle=BLUE; ctx.font="24px Arial"; ctx.fillText("HaloOS", WIDTH/2-60,50);
    ctx.font="24px Arial";
    let y=100;
    apps.forEach((app,i)=>{ctx.fillStyle=(i===selected_index)?BLUE:BLACK;ctx.fillText(app, WIDTH/2-80,y); y+=50;});
    drawTime(); drawWheel();
}

// Keyboard
function drawKeyboard(ybase){
    keyboard_keys=[];
    let kx=20, ky=ybase;
    keyboard_letters.forEach((ch,i)=>{
        const x=kx+(i%10)*32;
        const y=ky+Math.floor(i/10)*32;
        ctx.fillStyle=GRAY; ctx.fillRect(x,y,30,30);
        ctx.fillStyle=BLACK; ctx.fillText(ch,x+5,y+20);
        keyboard_keys.push({x,y,w:30,h:30,ch});
    });
}

// NMessage
function drawNMessage(){
    ctx.fillStyle=wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT);
    drawBack(); drawTime();
    ctx.fillStyle=BLACK; ctx.font="18px Arial"; let y=50;
    messages.slice(-8).forEach(m=>{ctx.fillText(m,20,y); y+=25;});
    ctx.fillStyle=WHITE; ctx.fillRect(20,HEIGHT-100,WIDTH-120,30);
    ctx.fillStyle=BLACK; ctx.fillText(typing_text,25,HEIGHT-80);
    ctx.fillStyle=BLUE; ctx.fillRect(WIDTH-90,HEIGHT-100,70,30);
    ctx.fillStyle=WHITE; ctx.fillText("Send", WIDTH-85, HEIGHT-80);
    drawKeyboard(HEIGHT-180);
}

// Notes
function drawNotes(){
    ctx.fillStyle=wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT);
    drawBack(); drawTime();
    ctx.fillStyle=BLACK; ctx.font="18px Arial"; let y=50;
    notes.slice(-8).forEach(n=>{ctx.fillText(n,20,y); y+=25;});
    ctx.fillStyle=WHITE; ctx.fillRect(20,HEIGHT-100,WIDTH-120,30);
    ctx.fillStyle=BLACK; ctx.fillText(typing_text,25,HEIGHT-80);
    ctx.fillStyle=BLUE; ctx.fillRect(WIDTH-90,HEIGHT-100,70,30);
    ctx.fillStyle=WHITE; ctx.fillText("Add", WIDTH-75, HEIGHT-80);
    drawKeyboard(HEIGHT-180);
}

// Clock
function drawClock(){ctx.fillStyle=wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT); drawBack(); drawTime();
    ctx.fillStyle=BLACK; ctx.font="24px Arial"; ctx.fillText(new Date().toLocaleTimeString(), WIDTH/2-60, HEIGHT/2);
}

// Calendar
function drawCalendar(){ctx.fillStyle=wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT); drawBack(); drawTime();
    ctx.fillStyle=BLACK; ctx.font="24px Arial"; const t=new Date(); ctx.fillText(t.toLocaleDateString(undefined,{month:'long',year:'numeric'}), WIDTH/2-80,50);
}

// Settings
function drawSettings(){ctx.fillStyle=wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT); drawBack(); drawTime();
    ctx.fillStyle=BLACK; ctx.font="24px Arial"; ctx.fillText("Wallpapers:", WIDTH/2-70,80);
    let y=130; wallpapers.forEach((c,i)=>{ctx.fillStyle=c; ctx.fillRect(WIDTH/2-50,y,100,40); if(i===current_wallpaper){ctx.strokeStyle=BLACK;ctx.lineWidth=2;ctx.strokeRect(WIDTH/2-50,y,100,40);} y+=60;});
}

// Main loop
function mainLoop(){
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    if(current_app==="menu"){drawMenu(); selected_index=(selected_index+wheel_speed+apps.length)%apps.length;}
    else if(current_app==="NMessage") drawNMessage();
    else if(current_app==="Notes") drawNotes();
    else if(current_app==="Clock") drawClock();
    else if(current_app==="Calendar") drawCalendar();
    else if(current_app==="Settings") drawSettings();
    wheel_speed *=0.95; // inertia
    requestAnimationFrame(mainLoop);
}
mainLoop();

// Touch input
canvas.addEventListener("touchstart",e=>{
    e.preventDefault();
    const touch=e.touches[0]; const mx=touch.clientX,my=touch.clientY;
    if(mx<=30 && my<=20 && current_app!=="menu"){ current_app="menu"; return; }
    const dx=mx-wheel_center.x; const dy=my-wheel_center.y; const dist=Math.sqrt(dx*dx+dy*dy);
    if(current_app==="menu"){
        if(dist<15){ const choice=apps[selected_index]; if(choice==="Power Off"){alert("Power Off");} else{current_app=choice;} }
        else if(dist>50 && dist<wheel_radius+15){ dragging=true; prev_angle=Math.atan2(dy,dx)*180/Math.PI; }
    }
});
canvas.addEventListener("touchmove",e=>{
    if(!dragging) return;
    const touch=e.touches[0]; const mx=touch.clientX,my=touch.clientY;
    const angle=Math.atan2(my-wheel_center.y,mx-wheel_center.x)*180/Math.PI;
    if(angle-prev_angle>5){wheelSelect("clockwise"); prev_angle=angle;}
    else if(prev_angle-angle>5){wheelSelect("counter"); prev_angle=angle;}
});
canvas.addEventListener("touchend",()=>{dragging=false;});

// Click/keyboard for messages
canvas.addEventListener("click",e=>{
    const mx=e.clientX,my=e.clientY;
    if(current_app==="NMessage" || current_app==="Notes"){
        keyboard_keys.forEach(k=>{if(mx>k.x && mx<k.x+k.w && my>k.y && my<k.y+k.h){typing_text+=k.ch;}});
        if(mx>WIDTH-90 && mx<WIDTH-20 && my>HEIGHT-100 && my<HEIGHT-70){
            if(typing_text.trim()!==""){
                if(current_app==="NMessage") messages.push("You: "+typing_text);
                else notes.push(typing_text);
            }
            typing_text="";
        }
    }
});

// Resize
window.addEventListener("resize",()=>{
    WIDTH=window.innerWidth; HEIGHT=window.innerHeight;
    canvas.width=WIDTH; canvas.height=HEIGHT;
});
