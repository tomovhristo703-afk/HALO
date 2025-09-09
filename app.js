@@ -6,10 +6,8 @@ let HEIGHT = window.innerHeight;
canvas.width = WIDTH;
canvas.height = HEIGHT;

// Colors
const WHITE="#FFFFFF", BLACK="#000000", BLUE="#0064FF", GRAY="#B4B4B4", LIGHTGRAY="#F0F0F0", DARKBLUE="#0050AA";

// Wallpapers
// Colors & wallpapers
const WHITE="#FFFFFF", BLACK="#000000", BLUE="#0064FF", GRAY="#B4B4B4", LIGHTGRAY="#F0F0F0";
const wallpapers = [WHITE,"#C8FFC8","#C8C8FF","#FFC8C8","#FFFFC8"];
let current_wallpaper = 0;

@@ -20,7 +18,7 @@ let messages = ["Alice: Hello!","Bob: Call me."];
let notes = ["Welcome to HaloOS!"];
let typing_text="";

// Keyboard
// Keyboard letters
const keyboard_letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const extra_keys = ["SPACE","DEL","SEND"];

@@ -32,17 +30,15 @@ let dragging=false, prev_angle=0;
// Keyboard keys
let keyboard_keys=[];

// Halo Market
let availableApps = ["Calculator","Weather","Music","Photos","Camera","Notes"];
let installedApps = ["NMessage","Notes","Clock","Calendar","Settings","Halo Market","Power Off"];
// Market apps
const availableApps = ["Calculator","Weather","Music","Photos","Camera","Notes"];

// Helper functions
function drawTime(){
    const t = new Date();
    ctx.fillStyle=BLACK; ctx.font="18px Arial";
    ctx.fillText(t.toLocaleTimeString(), WIDTH-100, 30);
}

function drawBack(){
    ctx.fillStyle=GRAY; ctx.beginPath();
    ctx.moveTo(10,10); ctx.lineTo(30,0); ctx.lineTo(30,20); ctx.closePath(); ctx.fill();
@@ -56,31 +52,23 @@ function drawWheel(){
    ctx.fillStyle=WHITE; ctx.beginPath(); ctx.arc(wheel_center.x,wheel_center.y,45,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=GRAY; ctx.beginPath(); ctx.arc(wheel_center.x,wheel_center.y,15,0,Math.PI*2); ctx.fill();
}

function wheelSelect(dir){
    if(dir==="clockwise") selected_index=(selected_index+1)%installedApps.length;
    else if(dir==="counter") selected_index=(selected_index-1+installedApps.length)%installedApps.length;
    if(dir==="clockwise") selected_index=(selected_index+1)%apps.length;
    else if(dir==="counter") selected_index=(selected_index-1+apps.length)%apps.length;
}

// Menu / Home screen
// Menu
function drawMenu(){
    ctx.fillStyle=BLUE; ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.fillStyle=WHITE; ctx.fillRect(40,50,WIDTH-80,HEIGHT-200);

    ctx.fillStyle=BLACK; ctx.font="24px Arial Bold";
    ctx.fillText("HaloOS", WIDTH/2-50, 80);

    let y=130;
    installedApps.forEach((app,i)=>{
        ctx.fillStyle=LIGHTGRAY;
        ctx.fillRect(60,y,WIDTH-160,40);
        ctx.fillStyle=BLACK;
        ctx.fillText(app, 80, y+28);
        y+=60;
    ctx.fillStyle=wallpapers[current_wallpaper]; ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.fillStyle=BLUE; ctx.font="28px Arial Bold"; ctx.fillText("HaloOS", WIDTH/2-60,50);
    ctx.font="22px Arial";
    let y=100;
    apps.forEach((app,i)=>{
        ctx.fillStyle=(i===selected_index)?BLUE:BLACK;
        ctx.fillText(app, WIDTH/2-80,y);
        y+=50;
    });

    drawTime();
    drawWheel();
    drawTime(); drawWheel();
}

// Keyboard
@@ -170,19 +158,13 @@ function drawMarket(){
    ctx.fillStyle=BLACK; ctx.font="22px Arial Bold"; ctx.fillText("Halo Market", WIDTH/2-70,50);
    let y=100;
    availableApps.forEach((app,i)=>{
        ctx.fillStyle=BLUE; ctx.fillRect(40,y,WIDTH-80,50);
        ctx.fillStyle=WHITE; ctx.fillText(app, 60, y+32);

        ctx.fillStyle=WHITE;
        ctx.fillRect(WIDTH-150,y+10,100,30);
        ctx.fillStyle=BLUE; ctx.fillRect(40,y,WIDTH-80,40);
        ctx.fillStyle=WHITE; ctx.fillText(app, 60, y+25);
        ctx.fillStyle=LIGHTGRAY;
        ctx.fillRect(WIDTH-120,y+5,70,30);
        ctx.fillStyle=BLACK;
        ctx.font="16px Arial";
        if(installedApps.includes(app)){
            ctx.fillText("Delete", WIDTH-135, y+32);
        } else {
            ctx.fillText("Install", WIDTH-135, y+32);
        }
        y+=70;
        ctx.fillText("Install", WIDTH-110, y+25);
        y+=60;
    });
}

@@ -214,22 +196,10 @@ function handleTouch(e){

    const dx=mx-wheel_center.x; const dy=my-wheel_center.y; const dist=Math.sqrt(dx*dx+dy*dy);
    if(current_app==="menu"){
        if(dist<15){ const choice=installedApps[selected_index]; 
            if(choice==="Power Off"){alert("Power Off");} else{current_app=choice;} 
        } else if(dist>50 && dist<wheel_radius+15){ dragging=true; prev_angle=Math.atan2(dy,dx)*180/Math.PI; }
    } else if(current_app==="Halo Market"){
        let y=100;
        availableApps.forEach((app,i)=>{
            if(mx>WIDTH-150 && mx<WIDTH-50 && my>y+10 && my<y+40){
                if(installedApps.includes(app)){
                    installedApps = installedApps.filter(a=>a!==app);
                } else {
                    installedApps.push(app);
                }
            }
            y+=70;
        });
        if(dist<15){ const choice=apps[selected_index]; if(choice==="Power Off"){alert("Power Off");} else{current_app=choice;} }
        else if(dist>50 && dist<wheel_radius+15){ dragging=true; prev_angle=Math.atan2(dy,dx)*180/Math.PI; }
    } else {
        // keyboard tap
        keyboard_keys.forEach(k=>{
            if(mx>k.x && mx<k.x+k.w && my>k.y && my<k.h+k.y){
                if(k.ch==="SPACE") typing_text+=" ";
@@ -251,8 +221,8 @@ function handleTouchMove(e){
    if(!dragging) return;
    const touch=e.touches[0]; const mx=touch.clientX,my=touch.clientY;
    const angle=Math.atan2(my-wheel_center.y,mx-wheel_center.x)*180/Math.PI;
    if(angle-prev_angle>5){selected_index=(selected_index+1)%installedApps.length; prev_angle=angle;}
    else if(prev_angle-angle>5){selected_index=(selected_index-1+installedApps.length); prev_angle=angle;}
    if(angle-prev_angle>5){selected_index=(selected_index+1)%apps.length; prev_angle=angle;}
    else if(prev_angle-angle>5){selected_index=(selected_index-1+apps.length)%apps.length; prev_angle=angle;}
}

// Resize
