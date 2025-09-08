// Canvas setup
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
let apps = ["NMessage","Notes","Clock","Calendar","Settings","Halo Market","Power Off"];
let current_app="menu", selected_index=0;
let messages = ["Alice: Hello!","Bob: Call me."];
let notes = ["Welcome to HaloOS!"];
let typing_text="";

// Keyboard letters
const keyboard_letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const extra_keys = ["SPACE","DEL"];

// Wheel
const wheel_center = {x: WIDTH/2, y: HEIGHT-120};
const wheel_radius = 90;
let dragging=false, prev_angle=0;

// Keyboard keys
let keyboard_keys=[];

// Market apps
const availableApps = ["Calculator","Weather","Music","Photos","Camera","Notes"]; // sample apps

// Helper functions
function drawTime(){
    const t = new Date();
    ctx.fillStyle=BLACK; ctx.font="18px Arial";
    ctx.fillText(t.toLocaleTimeString(), WIDTH-100, 30);
}
function drawBack(){
    ctx.fillStyle=GRAY; ctx.beginPath();
    ctx.moveTo(10,10); ctx.lineTo(30,0); ctx.lineTo(30,20); ctx.closePath(); ctx.fill();
}

// Wheel functions
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
    extra_keys.forEach((key,i)=>{
        const x = kx + i*100;
        const y = ky + 3*32;
        ctx.fillStyle=GRAY; ctx.fillRect(x,y,90,30);
        ctx.fillStyle=BLACK; ctx.fillText(key, x+15, y+20);
        keyboard_keys.push({x,y,w:90,h:30,ch:key});
    });
}

// NMessage / Notes
function drawTypingBox(){
    ctx.fillStyle=WHITE; 
    const boxHeight = 40;
    const boxY = HEIGHT-180 - (keyboard_letters.length/10 + 1)*32; // above keyboard
    ctx.fillRect(20, boxY, WIDTH-40, boxHeight);
    ctx.fillStyle=BLACK; ctx.font="18px Arial";
    ctx.fillText(typing_text, 25, boxY+28);
}

function drawNMessage(){
    ctx.fillStyle=wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT);
    drawBack(); drawTime();
    ctx.fillStyle=BLACK; ctx.font="18px Arial"; 
    let y=50;
    messages.slice(-8).forEach(m=>{ctx.fillText(m,20,y); y+=25;});
    drawKeyboard(HEIGHT-180);
    drawTypingBox();
}

function drawNotes(){
    ctx.fillStyle=wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT);
    drawBack(); drawTime();
    ctx.fillStyle=BLACK; ctx.font="18px Arial"; 
    let y=50;
    notes.slice(-8).forEach(n=>{ctx.fillText(n,20,y); y+=25;});
    drawKeyboard(HEIGHT-180);
    drawTypingBox();
}

// Clock, Calendar remain same
function drawClock(){ctx.fillStyle=wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT); drawBack(); drawTime();
    ctx.fillStyle=BLACK; ctx.font="24px Arial"; ctx.fillText(new Date().toLocaleTimeString(), WIDTH/2-60, HEIGHT/2);
}
function drawCalendar(){ctx.fillStyle=wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT); drawBack(); drawTime();
    ctx.fillStyle=BLACK; ctx.font="24px Arial"; const t=new Date(); ctx.fillText(t.toLocaleDateString(undefined,{month:'long',year:'numeric'}), WIDTH/2-80,50);
}

// Settings
function drawSettings(){
    ctx.fillStyle=wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT);
    drawBack(); drawTime();
    ctx.fillStyle=BLACK; ctx.font="20px Arial"; 
    ctx.fillText("HaloOS 1.0.2 - Up to date", 40,50);

    ctx.fillText("Wallpapers:", 40, 90);
    let y=130; wallpapers.forEach((c,i)=>{
        ctx.fillStyle=c; ctx.fillRect(WIDTH/2-50,y,100,40); 
        if(i===current_wallpaper){ctx.strokeStyle=BLACK; ctx.lineWidth=2; ctx.strokeRect(WIDTH/2-50,y,100,40);} 
        y+=60;
    });

    // Placeholder for other settings
    ctx.fillStyle=BLACK;
    ctx.fillText("Volume: Default", 40, y); y+=40;
    ctx.fillText("Theme: Light", 40, y); y+=40;
    ctx.fillText("Language: English", 40, y);
}

// Halo Market
function drawMarket(){
    ctx.fillStyle=wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT);
    drawBack(); drawTime();
    ctx.fillStyle=BLACK; ctx.font="20px Arial"; ctx.fillText("Halo Market", WIDTH/2-60,50);
    let y=100;
    availableApps.forEach((app,i)=>{
        ctx.fillStyle=BLUE; ctx.fillRect(40,y,150,30);
        ctx.fillStyle=WHITE; ctx.fillText("Install", 50, y+20);
        ctx.fillStyle=BLACK; ctx.fillText(app, 210, y+20);
        y+=50;
    });
}

// Main loop
function mainLoop(){
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    if(current_app==="menu"){drawMenu(); selected_index=(selected_index+apps.length)%apps.length;}
    else if(current_app==="NMessage") drawNMessage();
    else if(current_app==="Notes") drawNotes();
    else if(current_app==="Clock") drawClock();
    else if(current_app==="Calendar") drawCalendar();
    else if(current_app==="Settings") drawSettings();
    else if(current_app==="Halo Market") drawMarket();
    requestAnimationFrame(mainLoop);
}
mainLoop();

// Touch & Click Events
canvas.addEventListener("touchstart", handleTouch);
canvas.addEventListener("touchmove", handleTouchMove);
canvas.addEventListener("touchend", ()=>{dragging=false;});

function handleTouch(e){
    e.preventDefault();
    const touch = e.touches[0];
    const mx=touch.clientX,my=touch.clientY;

    if(mx<=30 && my<=20 && current_app!=="menu"){ current_app="menu"; return; }

    const dx=mx-wheel_center.x; const dy=my-wheel_center.y; const dist=Math.sqrt(dx*dx+dy*dy);
    if(current_app==="menu"){
        if(dist<15){ const choice=apps[selected_index]; if(choice==="Power Off"){alert("Power Off");} else{current_app=choice;} }
        else if(dist>50 && dist<wheel_radius+15){ dragging=true; prev_angle=Math.atan2(dy,dx)*180/Math.PI; }
    } else {
        // keyboard tap
        keyboard_keys.forEach(k=>{
            if(mx>k.x && mx<k.x+k.w && my>k.y && my<k.h+k.y){
                if(k.ch==="SPACE") typing_text+=" ";
                else if(k.ch==="DEL") typing_text=typing_text.slice(0,-1);
                else typing_text+=k.ch;
            }
        });
    }
}

function handleTouchMove(e){
    if(!dragging) return;
    const touch=e.touches[0]; const mx=touch.clientX,my=touch.clientY;
    const angle=Math.atan2(my-wheel_center.y,mx-wheel_center.x)*180/Math.PI;
    if(angle-prev_angle>5){selected_index=(selected_index+1)%apps.length; prev_angle=angle;}
    else if(prev_angle-angle>5){selected_index=(selected_index-1+apps.length)%apps.length; prev_angle=angle;}
}

// Resize
window.addEventListener("resize",()=>{
    WIDTH=window.innerWidth; HEIGHT=window.innerHeight;
    canvas.width=WIDTH; canvas.height=HEIGHT;
});
