import pygame, sys, time, math, calendar

pygame.init()

# ---------------- Screen ----------------
WIDTH, HEIGHT = 360, 640
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("HaloOS 1.0")
clock = pygame.time.Clock()

# ---------------- Colors & Fonts ----------------
WHITE, BLACK, BLUE, GRAY = (255,255,255),(0,0,0),(0,100,255),(180,180,180)
font = pygame.font.SysFont("Arial", 24)
small_font = pygame.font.SysFont("Arial", 18)

# ---------------- Wallpapers ----------------
wallpapers = [WHITE, (200,255,200), (200,200,255), (255,200,200), (255,255,200)]
current_wallpaper = 0

# ---------------- Apps ----------------
apps = ["NMessage","Notes","Clock","Calendar","Settings","Power Off"]
current_app = "menu"
selected_index = 0

# ---------------- NMessage ----------------
messages = ["Alice: Hello!","Bob: Call me."]
typing_text = ""
keyboard_letters = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ ")
keyboard_keys = []

# ---------------- Notes ----------------
notes = ["Welcome to HaloOS!"]

# ---------------- Helper Functions ----------------
def draw_time():
    t = time.strftime("%H:%M:%S")
    screen.blit(small_font.render(t, True, BLACK), (WIDTH-100,10))

def draw_back():
    pygame.draw.polygon(screen, GRAY, [(10,10),(30,0),(30,20)])

# ---------------- Circle Wheel Navigation ----------------
wheel_center = (WIDTH//2, HEIGHT-120)
wheel_radius = 90
dragging = False
prev_angle = 0

def draw_wheel():
    # Outer wheel
    pygame.draw.circle(screen, GRAY, wheel_center, wheel_radius, 30)  
    # Inner circle
    pygame.draw.circle(screen, WHITE, wheel_center, 45)
    # Center button
    pygame.draw.circle(screen, GRAY, wheel_center, 15)  

def wheel_select(direction):
    global selected_index
    if direction == "clockwise":
        selected_index = (selected_index + 1) % len(apps)
    elif direction == "counter":
        selected_index = (selected_index - 1) % len(apps)

def draw_menu():
    screen.fill(wallpapers[current_wallpaper])
    y=100
    screen.blit(font.render("HaloOS", True, BLUE), (WIDTH//2 - 60, 40))
    for i,item in enumerate(apps):
        color = BLUE if i==selected_index else BLACK
        screen.blit(font.render(item, True, color), (WIDTH//2 - 80, y))
        y += 50
    draw_time()
    draw_wheel()

# ---------------- Keyboard ----------------
def draw_keyboard(ybase):
    global keyboard_keys
    keyboard_keys=[]
    kx, ky = 20, ybase
    for i,ch in enumerate(keyboard_letters):
        rect = pygame.Rect(kx+(i%10)*32, ky+(i//10)*32, 30,30)
        pygame.draw.rect(screen,GRAY,rect)
        screen.blit(small_font.render(ch,True,BLACK),(rect.x+5,rect.y+5))
        keyboard_keys.append((rect,ch))

# ---------------- NMessage App ----------------
def draw_nmessage():
    screen.fill(wallpapers[current_wallpaper])
    draw_back(); draw_time()
    y=50
    for m in messages[-8:]:
        screen.blit(small_font.render(m,True,BLACK),(20,y)); y+=25
    # Textbox
    pygame.draw.rect(screen,WHITE,(20,HEIGHT-100, WIDTH-120,30))
    screen.blit(small_font.render(typing_text,True,BLACK),(25,HEIGHT-95))
    # Send button
    send_rect = pygame.Rect(WIDTH-90,HEIGHT-100,70,30)
    pygame.draw.rect(screen,BLUE,send_rect)
    screen.blit(small_font.render("Send",True,WHITE),(send_rect.x+5,send_rect.y+5))
    draw_keyboard(HEIGHT-180)
    return send_rect

# ---------------- Notes App ----------------
def draw_notes():
    screen.fill(wallpapers[current_wallpaper])
    draw_back(); draw_time()
    y=50
    for n in notes[-8:]:
        screen.blit(small_font.render(n,True,BLACK),(20,y)); y+=25
    # Input box
    pygame.draw.rect(screen,WHITE,(20,HEIGHT-100, WIDTH-120,30))
    screen.blit(small_font.render(typing_text,True,BLACK),(25,HEIGHT-95))
    # Add button
    add_rect = pygame.Rect(WIDTH-90,HEIGHT-100,70,30)
    pygame.draw.rect(screen,BLUE,add_rect)
    screen.blit(small_font.render("Add",True,WHITE),(add_rect.x+10,add_rect.y+5))
    draw_keyboard(HEIGHT-180)
    return add_rect

# ---------------- Clock ----------------
def draw_clock():
    screen.fill(wallpapers[current_wallpaper])
    draw_back(); draw_time()
    screen.blit(font.render(time.strftime("%H:%M:%S"), True, BLACK), (WIDTH//2 - 60, HEIGHT//2))

# ---------------- Calendar ----------------
def draw_calendar():
    screen.fill(wallpapers[current_wallpaper])
    draw_back(); draw_time()
    screen.blit(font.render(time.strftime("%B %Y"),True,BLACK),(WIDTH//2-80,40))
    cal = calendar.monthcalendar(time.localtime().tm_year,time.localtime().tm_mon)
    y=100
    for week in cal:
        x=40
        for d in week:
            text = str(d) if d>0 else " "
            col = (200,0,0) if d==time.localtime().tm_mday else BLACK
            screen.blit(small_font.render(text,True,col),(x,y))
            x+=40
        y+=30

# ---------------- Settings ----------------
def draw_settings():
    screen.fill(wallpapers[current_wallpaper])
    draw_back(); draw_time()
    screen.blit(font.render("Wallpapers:",True,BLACK),(WIDTH//2-70,80))
    y=130
    for i,c in enumerate(wallpapers):
        rect=pygame.Rect(WIDTH//2-50,y,100,40)
        pygame.draw.rect(screen,c,rect)
        if i==current_wallpaper: pygame.draw.rect(screen,BLACK,rect,2)
        y+=60

# ---------------- Main Loop ----------------
running=True
send_button=None
while running:
    screen.fill(wallpapers[current_wallpaper])

    if current_app=="menu": draw_menu()
    elif current_app=="NMessage": send_button=draw_nmessage()
    elif current_app=="Notes": send_button=draw_notes()
    elif current_app=="Clock": draw_clock()
    elif current_app=="Calendar": draw_calendar()
    elif current_app=="Settings": draw_settings()

    for e in pygame.event.get():
        if e.type==pygame.QUIT: running=False

        elif e.type==pygame.KEYDOWN:
            if current_app in ["NMessage","Notes"]:
                if e.key==pygame.K_BACKSPACE: typing_text=typing_text[:-1]
                elif e.key==pygame.K_RETURN:
                    if typing_text.strip()!="":
                        if current_app=="NMessage": messages.append("You: "+typing_text)
                        else: notes.append(typing_text)
                    typing_text=""
                elif e.unicode.upper() in "ABCDEFGHIJKLMNOPQRSTUVWXYZ ":
                    typing_text+=e.unicode.upper()

        elif e.type==pygame.MOUSEBUTTONDOWN:
            mx,my = pygame.mouse.get_pos()
            # Back button
            if 0<=mx<=30 and 0<=my<=20 and current_app!="menu":
                current_app="menu"
            # Settings
            if current_app=="Settings":
                y=130
                for i,c in enumerate(wallpapers):
                    if pygame.Rect(WIDTH//2-50,y,100,40).collidepoint(mx,my):
                        current_wallpaper=i
                    y+=60
            # Keyboard
            if current_app in ["NMessage","Notes"]:
                for rect,ch in keyboard_keys:
                    if rect.collidepoint(mx,my): typing_text+=ch
                if send_button and send_button.collidepoint(mx,my):
                    if typing_text.strip()!="":
                        if current_app=="NMessage": messages.append("You: "+typing_text)
                        else: notes.append(typing_text)
                    typing_text=""

            # Circle wheel input
            if current_app=="menu":
                dx,dy = mx-wheel_center[0], my-wheel_center[1]
                dist = math.sqrt(dx*dx+dy*dy)
                if dist < 15:  # center button
                    choice=apps[selected_index]
                    if choice=="Power Off": running=False
                    else: current_app=choice
                elif 50<dist<wheel_radius+15:
                    dragging=True
                    prev_angle=math.degrees(math.atan2(dy,dx))

        elif e.type==pygame.MOUSEBUTTONUP: dragging=False

        elif e.type==pygame.MOUSEMOTION and dragging and current_app=="menu":
            mx,my = pygame.mouse.get_pos()
            dx,dy = mx-wheel_center[0], my-wheel_center[1]
            angle=math.degrees(math.atan2(dy,dx))
            if angle-prev_angle>10: wheel_select("clockwise"); prev_angle=angle
            elif prev_angle-angle>10: wheel_select("counter"); prev_angle=angle

    pygame.display.flip(); clock.tick(30)

pygame.quit(); sys.exit()
