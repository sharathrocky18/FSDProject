import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# Initialize 16:9 Widescreen Presentation
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank_layout = prs.slide_layouts[6]

# Sophisticated, Human-Friendly Color Palette
# Friendly Navy/Indigo theme that looks modern, clean, and warm
C_BG_DARK = RGBColor(15, 23, 42)          # Deep Slate (#0f172a)
C_CARD_DARK = RGBColor(30, 41, 59)        # Slate Card (#1e293b)
C_BORDER_DARK = RGBColor(51, 65, 85)      # Slate Border (#334155)
C_TEXT_LIGHT = RGBColor(248, 250, 252)    # Slate 50
C_TEXT_MUTED = RGBColor(148, 163, 184)    # Slate 400

C_BG_LIGHT = RGBColor(248, 250, 252)      # Soft Clean Canvas (#f8fafc)
C_CARD_LIGHT = RGBColor(255, 255, 255)    # Crisp White
C_BORDER_LIGHT = RGBColor(226, 232, 240)  # Gentle Gray Line (#e2e8f0)
C_TEXT_DARK = RGBColor(30, 41, 59)        # Friendly Charcoal Ink
C_TEXT_DARK_MUTED = RGBColor(100, 116, 139) # Body Text Gray

C_BRAND = RGBColor(79, 70, 229)           # Indigo (#4f46e5)
C_BRAND_LIGHT = RGBColor(129, 140, 248)   # Soft Indigo (#818cf8)
C_ACCENT_SKY = RGBColor(14, 165, 233)     # Fresh Sky Blue (#0ea5e9)
C_ACCENT_GREEN = RGBColor(16, 185, 129)   # Emerald Fresh Green (#10b981)
C_ACCENT_AMBER = RGBColor(245, 158, 11)   # Warm Amber (#f59e0b)
C_ACCENT_CORAL = RGBColor(239, 68, 68)    # Coral Red (#ef4444)

SCREENSHOTS_DIR = r"d:\projects\StudySync\screenshots"

def set_slide_background(slide, color):
    bg_shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg_shape.fill.solid()
    bg_shape.fill.fore_color.rgb = color
    bg_shape.line.fill.background()
    return bg_shape

def add_header(slide, title, category="STUDYSYNC · REVIEW 1", subtitle=None, is_dark=False):
    # Category Tag / Breadcrumb
    cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.3))
    tf_c = cat_box.text_frame
    tf_c.word_wrap = True
    tf_c.margin_left = tf_c.margin_right = tf_c.margin_top = tf_c.margin_bottom = 0
    p_c = tf_c.paragraphs[0]
    p_c.text = category.upper()
    p_c.font.size = Pt(10)
    p_c.font.bold = True
    p_c.font.color.rgb = C_BRAND_LIGHT if is_dark else C_BRAND
    p_c.font.name = "Segoe UI"

    # Conversational Slide Title
    t_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.7), Inches(0.65))
    tf_t = t_box.text_frame
    tf_t.word_wrap = True
    tf_t.margin_left = tf_t.margin_right = tf_t.margin_top = tf_t.margin_bottom = 0
    p_t = tf_t.paragraphs[0]
    p_t.text = title
    p_t.font.size = Pt(22)
    p_t.font.bold = True
    p_t.font.color.rgb = C_TEXT_LIGHT if is_dark else C_TEXT_DARK
    p_t.font.name = "Segoe UI"

    # Human Subtitle / Storyline
    if subtitle:
        s_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.35), Inches(11.7), Inches(0.35))
        tf_s = s_box.text_frame
        tf_s.word_wrap = True
        tf_s.margin_left = tf_s.margin_right = tf_s.margin_top = tf_s.margin_bottom = 0
        p_s = tf_s.paragraphs[0]
        p_s.text = subtitle
        p_s.font.size = Pt(12)
        p_s.font.color.rgb = C_TEXT_MUTED if is_dark else C_TEXT_DARK_MUTED
        p_s.font.name = "Segoe UI"

def add_card(slide, left, top, width, height, bg_color=C_CARD_LIGHT, border_color=C_BORDER_LIGHT):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
    card.fill.solid()
    card.fill.fore_color.rgb = bg_color
    if border_color:
        card.line.color.rgb = border_color
        card.line.width = Pt(1)
    else:
        card.line.fill.background()
    return card

def add_card_content(slide, left, top, width, height, title, items, is_dark=False, title_color=None):
    add_card(slide, left, top, width, height, C_CARD_DARK if is_dark else C_CARD_LIGHT, C_BORDER_DARK if is_dark else C_BORDER_LIGHT)
    
    tbox = slide.shapes.add_textbox(Inches(left + 0.28), Inches(top + 0.22), Inches(width - 0.56), Inches(height - 0.44))
    tf = tbox.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

    if title:
        p0 = tf.paragraphs[0]
        p0.text = title
        p0.font.size = Pt(14)
        p0.font.bold = True
        p0.font.name = "Segoe UI"
        p0.font.color.rgb = title_color if title_color else (C_TEXT_LIGHT if is_dark else C_TEXT_DARK)
        p0.space_after = Pt(10)

    for i, item in enumerate(items):
        p = tf.add_paragraph() if (title or i > 0) else tf.paragraphs[0]
        p.space_after = Pt(7)
        p.font.size = Pt(11)
        p.font.name = "Segoe UI"
        
        if isinstance(item, tuple):
            bold_prefix, rest = item
            run_b = p.add_run()
            run_b.text = bold_prefix + " "
            run_b.font.bold = True
            run_b.font.color.rgb = C_TEXT_LIGHT if is_dark else C_TEXT_DARK
            
            run_r = p.add_run()
            run_r.text = rest
            run_r.font.bold = False
            run_r.font.color.rgb = C_TEXT_MUTED if is_dark else C_TEXT_DARK_MUTED
        else:
            run = p.add_run()
            run.text = item
            run.font.color.rgb = C_TEXT_MUTED if is_dark else C_TEXT_DARK_MUTED

def add_stat_card(slide, left, top, width, height, value, label, subtext=None, accent_color=C_BRAND, is_dark=False):
    add_card(slide, left, top, width, height, C_CARD_DARK if is_dark else C_CARD_LIGHT, C_BORDER_DARK if is_dark else C_BORDER_LIGHT)
    
    # Accent top color bar
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(0.06))
    bar.fill.solid()
    bar.fill.fore_color.rgb = accent_color
    bar.line.fill.background()

    tbox = slide.shapes.add_textbox(Inches(left + 0.22), Inches(top + 0.16), Inches(width - 0.44), Inches(height - 0.3))
    tf = tbox.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

    p_lbl = tf.paragraphs[0]
    p_lbl.text = label.upper()
    p_lbl.font.size = Pt(9.5)
    p_lbl.font.bold = True
    p_lbl.font.color.rgb = accent_color
    p_lbl.font.name = "Segoe UI"

    p_val = tf.add_paragraph()
    p_val.text = value
    p_val.font.size = Pt(22)
    p_val.font.bold = True
    p_val.font.color.rgb = C_TEXT_LIGHT if is_dark else C_TEXT_DARK
    p_val.font.name = "Segoe UI"

    if subtext:
        p_sub = tf.add_paragraph()
        p_sub.text = subtext
        p_sub.font.size = Pt(9.5)
        p_sub.font.color.rgb = C_TEXT_MUTED if is_dark else C_TEXT_DARK_MUTED
        p_sub.font.name = "Segoe UI"

def add_image_card(slide, left, top, width, height, image_filename, caption=None, border_color=C_BORDER_LIGHT):
    add_card(slide, left, top, width, height, C_CARD_LIGHT, border_color)
    
    img_path = os.path.join(SCREENSHOTS_DIR, image_filename)
    if os.path.exists(img_path):
        img_top = top + 0.15
        img_left = left + 0.15
        img_width = width - 0.3
        img_height = height - (0.55 if caption else 0.3)
        slide.shapes.add_picture(img_path, Inches(img_left), Inches(img_top), width=Inches(img_width), height=Inches(img_height))
    
    if caption:
        cbox = slide.shapes.add_textbox(Inches(left + 0.2), Inches(top + height - 0.42), Inches(width - 0.4), Inches(0.35))
        tf = cbox.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = caption
        p.font.size = Pt(9.5)
        p.font.bold = True
        p.font.color.rgb = C_TEXT_DARK_MUTED
        p.font.name = "Segoe UI"
        p.alignment = PP_ALIGN.CENTER


# ==========================================
# SLIDE 1: WELCOME & PROJECT IDENTITY
# ==========================================
s1 = prs.slides.add_slide(blank_layout)
set_slide_background(s1, C_BG_DARK)

# Glowing accent bar on left
bar1 = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.1), Inches(0.12), Inches(3.7))
bar1.fill.solid()
bar1.fill.fore_color.rgb = C_BRAND
bar1.line.fill.background()

tb1 = s1.shapes.add_textbox(Inches(1.2), Inches(1.0), Inches(11.3), Inches(3.9))
tf1 = tb1.text_frame
tf1.word_wrap = True
tf1.margin_left = tf1.margin_right = tf1.margin_top = tf1.margin_bottom = 0

p_sub = tf1.paragraphs[0]
p_sub.text = "ACADEMIC PROJECT REVIEW 1 · 40% MILESTONE DEFENSE"
p_sub.font.size = Pt(11)
p_sub.font.bold = True
p_sub.font.color.rgb = C_BRAND_LIGHT
p_sub.font.name = "Segoe UI"
p_sub.space_after = Pt(10)

p_title = tf1.add_paragraph()
p_title.text = "StudySync"
p_title.font.size = Pt(46)
p_title.font.bold = True
p_title.font.color.rgb = C_TEXT_LIGHT
p_title.font.name = "Segoe UI"
p_title.space_after = Pt(4)

p_tag = tf1.add_paragraph()
p_tag.text = "\"Where is my study time actually going?\""
p_tag.font.size = Pt(22)
p_tag.font.bold = True
p_tag.font.color.rgb = C_ACCENT_SKY
p_tag.font.name = "Segoe UI"
p_tag.space_after = Pt(14)

p_desc = tf1.add_paragraph()
p_desc.text = "A clean, distraction-free study companion built for real students. Features a crash-resilient timer, instant SQLite logging, zero external build bloat, and real-time visual charts to help you stay honest about your daily study habits."
p_desc.font.size = Pt(13)
p_desc.font.color.rgb = C_TEXT_MUTED
p_desc.font.name = "Segoe UI"

# 4 Key Stat Cards at Bottom
m_y = 5.1
m_w = 2.7
m_gap = 0.3
stats = [
    ("PROGRESS", "40% Complete", "Core Loop & Engine Working", C_BRAND_LIGHT),
    ("TECH STACK", "Node + SQLite", "Built-in Node 22 native engine", C_ACCENT_SKY),
    ("FRONTEND", "Pure Vanilla JS", "Zero bloat, instant 60fps load", C_ACCENT_GREEN),
    ("VERIFICATION", "11/11 Passing", "Full automated test coverage", C_ACCENT_AMBER),
]

for idx, (label, val, sub, col) in enumerate(stats):
    mx = 0.8 + idx * (m_w + m_gap)
    add_stat_card(s1, mx, m_y, m_w, 1.6, val, label, sub, accent_color=col, is_dark=True)


# ==========================================
# SLIDE 2: THE REAL PROBLEM WE ARE SOLVING
# ==========================================
s2 = prs.slides.add_slide(blank_layout)
set_slide_background(s2, C_BG_LIGHT)
add_header(s2, "The Real Problem: Why Tracking Study Time Fails", "The Problem We Are Solving", "Every student thinks they studied for 6 hours — until the exam marks arrive.")

add_card_content(s2, 0.8, 1.8, 5.7, 5.0, "What Happens to Most Students", [
    ("The 'Desk Time' Illusion:", "Sitting at your desk with notes open for 5 hours doesn't mean 5 hours of studying. Distractions, phone checks, and wandering attention eat up half of that time silently."),
    ("Zero Visibility Into Subjects:", "Ask any student: 'How many hours did you spend on Data Structures vs. DBMS this week?' Nobody knows for sure — it's all guesswork."),
    ("The Panic Before Exams:", "Students realize too late that they neglected difficult subjects while spending days rewriting neat notes for easier ones."),
    ("Overcomplicated Tracking Apps:", "Existing tools like Notion, Toggl, or Jira require 10 clicks just to start a timer. Students use them for 2 days, get overwhelmed, and quit.")
], title_color=C_BRAND)

add_card_content(s2, 6.8, 1.8, 5.7, 5.0, "How StudySync Makes It Painless", [
    ("Two Clicks to Track:", "Open the page, click 'Start', and study. Click 'Stop & save' when you're done. No complex setup, no folder structures, no hassle."),
    ("Honest, Visual Truth:", "At a glance, you see exactly where your minutes went: horizontal bars by subject, a colorful category donut, and your daily consistency chart."),
    ("Never Loses Your Session:", "If your browser crashes, laptop battery dies, or tab reloads, the timer is still ticking right where you left it."),
    ("Built for Real Student Lives:", "Supports quick manual entries when you studied in the library without your computer, plus a quick 'Break' category so you stay honest.")
], title_color=C_ACCENT_GREEN)


# ==========================================
# SLIDE 3: SCOPE: 40% COMPLETED VS 60% PLANNED
# ==========================================
s3 = prs.slides.add_slide(blank_layout)
set_slide_background(s3, C_BG_LIGHT)
add_header(s3, "Where We Are Today: 40% Built vs. What's Coming Next", "Scope & Roadmap", "A rock-solid foundation today, followed by social sync and smart targets next.")

add_card_content(s3, 0.8, 1.8, 5.7, 5.0, "Ready & Working Right Now (40% Milestone)", [
    ("Live Resilient Stopwatch:", "Sub-second precision clock that stores its start time in localStorage so it never loses time during reloads."),
    ("Quick Manual Entry Mode:", "Type minutes directly for offline study sessions (with validation against negative or absurd numbers)."),
    ("Embedded SQLite Database:", "Stores sessions with subject, category, notes, timestamp, and duration using Node's native SQLite driver."),
    ("Instant Visual Dashboards:", "Dynamic CSS subject bars, conic-gradient donut chart, and column chart for 7, 14, and 30 day filters."),
    ("Full In-Place Editing:", "Edit past entries with an accessible dialog modal, or delete mistaken logs in one click."),
    ("100% Automated Testing:", "11 unit and integration tests verifying all edge cases and data validation.")
], title_color=C_BRAND)

add_card_content(s3, 6.8, 1.8, 5.7, 5.0, "What We Are Building Next (The Remaining 60%)", [
    ("Student Accounts & Profiles:", "Secure login so multiple students can use StudySync on their own devices with isolated data."),
    ("Pomodoro Focus Cycles:", "Built-in 25/5 minute work and break intervals with gentle desktop notification chimes."),
    ("Weekly Subject Targets:", "Set targets like '8 hours of DBMS this week' and see a live progress bar toward your goal."),
    ("Collaborative Study Rooms ('Sync'):", "The 'Sync' in StudySync: study in shared virtual rooms with classmates to keep each other motivated in real time."),
    ("Export & Smart Summaries:", "One-click export to CSV for assignment logs, plus weekly insights on when you study best.")
], title_color=C_ACCENT_SKY)


# ==========================================
# SLIDE 4: SYSTEM ARCHITECTURE: CLEAN & FAST
# ==========================================
s4 = prs.slides.add_slide(blank_layout)
set_slide_background(s4, C_BG_LIGHT)
add_header(s4, "Our Architecture: Why We Kept It Lean and Fast", "Architecture & Technical Choices", "No heavy frameworks, no bloated bundles — just fast, reliable web fundamentals.")

col_w = 3.7
col_gap = 0.3
add_card_content(s4, 0.8, 1.8, col_w, 4.0, "1. Frontend (Zero Bloat)", [
    ("Clean HTML5 & CSS3:", "Uses semantic HTML and modern CSS custom properties for instant styling."),
    ("Vanilla JavaScript:", "Why no React or Vue? A study tracker should load in milliseconds. Vanilla JS has zero bundle download time and zero build steps."),
    ("Hardware-Accelerated:", "Charts drawn directly with CSS and DOM elements, rendering smoothly at 60fps.")
], title_color=C_BRAND)

add_card_content(s4, 0.8 + col_w + col_gap, 1.8, col_w, 4.0, "2. Backend (Clean REST API)", [
    ("Node.js 22+ & Express 5:", "Lightweight, battle-tested server handling API routing and payload validation."),
    ("Strict Input Guards:", "Rejects invalid durations, empty subject names, and unrecognized categories."),
    ("Timezone Awareness:", "Takes the browser's local UTC offset and groups days accurately according to the student's real clock.")
], title_color=C_ACCENT_SKY)

add_card_content(s4, 0.8 + (col_w + col_gap)*2, 1.8, col_w, 4.0, "3. Database (Native SQLite)", [
    ("Node's Native SQLite:", "Built right into Node 22 (`node:sqlite`). No external database server to configure and zero node-gyp build issues."),
    ("Lightning Fast:", "Queries execute in under 1ms with ACID transaction guarantees."),
    ("Indexed Dates:", "Timestamp indexing makes calculating 7, 14, and 30-day summaries instant.")
], title_color=C_ACCENT_GREEN)

# Bottom Philosophy Banner
add_card(s4, 0.8, 6.0, 11.7, 0.9, bg_color=C_CARD_DARK)
t_b4 = s4.shapes.add_textbox(Inches(1.0), Inches(6.1), Inches(11.3), Inches(0.7))
tf_b4 = t_b4.text_frame
tf_b4.word_wrap = True
p_b1 = tf_b4.paragraphs[0]
p_b1.text = "DESIGN PHILOSOPHY: KEEP IT LIGHTWEIGHT, RELIABLE, AND DEPENDENCY-FREE"
p_b1.font.size = Pt(10.5)
p_b1.font.bold = True
p_b1.font.color.rgb = C_BRAND_LIGHT
p_b1.font.name = "Segoe UI"
p_b2 = tf_b4.add_paragraph()
p_b2.text = "By avoiding hundreds of npm dependencies, StudySync starts in under a second, never breaks due to external library deprecations, and provides a silky-smooth user experience on any computer."
p_b2.font.size = Pt(10)
p_b2.font.color.rgb = C_TEXT_LIGHT
p_b2.font.name = "Segoe UI"


# ==========================================
# SLIDE 5: DATABASE & SOLVING MESSY DATA
# ==========================================
s5 = prs.slides.add_slide(blank_layout)
set_slide_background(s5, C_BG_LIGHT)
add_header(s5, "Database Design & Solving the 'Messy Input' Problem", "Data Integrity", "How we keep study logs clean and prevent duplicate subject bars.")

add_card_content(s5, 0.8, 1.8, 5.7, 5.0, "The Database Schema (sessions table)", [
    ("id (INTEGER PRIMARY KEY):", "Automatic unique ID for each session."),
    ("subject (TEXT NOT NULL):", "Course name, trimmed and capped at 40 characters."),
    ("category (TEXT NOT NULL):", "Enforces real study categories: Study, Assignment, Project, Revision, Break, Other."),
    ("duration_min (REAL NOT NULL):", "CHECK constraint ensures duration is strictly positive and realistic."),
    ("started_at (TEXT NOT NULL):", "ISO 8601 timestamp in UTC, indexed for fast filtering."),
    ("notes (TEXT DEFAULT ''):", "Optional quick summary of what was covered during the session.")
], title_color=C_BRAND)

add_card_content(s5, 6.8, 1.8, 5.7, 5.0, "Solving the 'Messy Typo' Problem", [
    ("The Problem We Discovered:", "Students naturally type 'dbms', 'DBMS', or ' DBMS ' with extra spaces. Without protection, the dashboard would show 3 different bars for the same subject!"),
    ("Step 1: Input Cleaning (cleanSubject):", "Collapses double spaces, strips messy whitespace, and normalizes user input on every request."),
    ("Step 2: Smart Case Matching (resolveSubject):", "Uses SQLite's `COLLATE NOCASE` matching. If 'DBMS' already exists in the database, typing 'dbms' automatically maps to 'DBMS'."),
    ("Step 3: Startup Self-Healing (migrateSubjects):", "Whenever the server starts, it audits the database, finds the most popular spelling of each subject, and automatically cleans up older entries.")
], title_color=C_ACCENT_SKY)


# ==========================================
# SLIDE 6: REST API & THE TIMEZONE PUZZLE
# ==========================================
s6 = prs.slides.add_slide(blank_layout)
set_slide_background(s6, C_BG_LIGHT)
add_header(s6, "REST API Design & Solving the Timezone Puzzle", "Backend Engineering", "A clear RESTful API and the story of how we made daily charts accurate across timezones.")

# Top: API Endpoints Table Card
add_card_content(s6, 0.8, 1.8, 11.7, 2.7, "Our REST API: 7 Focused Endpoints", [
    ("POST   /api/sessions", "Log a new session with subject, duration, category, and notes."),
    ("GET    /api/sessions?limit=N", "Fetch recent study sessions in reverse chronological order (newest first)."),
    ("PUT    /api/sessions/:id", "Update any details of an existing session (with instant re-validation)."),
    ("DELETE /api/sessions/:id", "Remove a mistaken or duplicate session in one click."),
    ("GET    /api/summary?days=7&tz=330", "The dashboard powerhouse: aggregates total minutes, daily averages, and chart data."),
    ("GET    /api/subjects & /categories", "Helper routes for dynamic chips and dropdown menus.")
], title_color=C_BRAND)

# Bottom Left: The Timezone Story
add_card_content(s6, 0.8, 4.7, 5.7, 2.2, "The Midnight Timezone Trap", [
    ("The Trap:", "If you study at 11:30 PM in India (UTC+5:30), UTC time is 6:00 PM. A naive server groups that session into the previous day!"),
    ("Our Solution:", "The browser sends its local offset (`tz=330`). The server computes local midnight and uses SQLite's datetime modifier (`+330 minutes`) so your night sessions stay on the right day.")
], title_color=C_ACCENT_CORAL)

# Bottom Right: Zero-Gap Days
add_card_content(s6, 6.8, 4.7, 5.7, 2.2, "Zero-Gap Days on the Chart", [
    ("The Problem:", "A standard SQL query skips days where you didn't study, squishing your chart and making gaps invisible."),
    ("Our Solution:", "The server automatically fills inactive days with 0 minutes. If you took Sunday off, Sunday still appears on the chart so your study rhythm is completely honest.")
], title_color=C_ACCENT_GREEN)


# ==========================================
# SLIDE 7: FRONTEND UX: THOUGHTFUL DETAILS
# ==========================================
s7 = prs.slides.add_slide(blank_layout)
set_slide_background(s7, C_BG_LIGHT)
add_header(s7, "Frontend Engineering: Thoughtful Details That Matter", "User Experience", "Small engineering touches that make the app feel effortless to use daily.")

add_card_content(s7, 0.8, 1.8, col_w, 5.0, "The Crash-Proof Timer", [
    ("No Lost Time:", "Instead of relying on a fragile JavaScript timer that resets when tabs sleep, StudySync saves the exact start timestamp to localStorage."),
    ("Survives Everything:", "Accidentally closed the browser? Laptop rebooted? Open the tab again and the timer is still ticking accurately."),
    ("Monospace Numbers:", "Rendered with tabular numbers (`00:00:00`) so the digits don't jump or wobble while counting.")
], title_color=C_BRAND)

add_card_content(s7, 0.8 + col_w + col_gap, 1.8, col_w, 5.0, "Zero-Bloat Visual Charts", [
    ("CSS Conic Donut:", "The category donut chart is generated dynamically using CSS `conic-gradient` — no 500KB chart libraries needed!"),
    ("Proportional Bars:", "Subject bars calculate relative percentages against your top subject and smoothly expand using CSS animations."),
    ("Instant Switching:", "Toggle between 7, 14, and 30 days with instant DOM updates and zero page refresh.")
], title_color=C_ACCENT_SKY)

add_card_content(s7, 0.8 + (col_w + col_gap)*2, 1.8, col_w, 5.0, "Friction-Free UX", [
    ("Subject Chips:", "Clickable pills for your recent subjects. One click fills the subject box so you don't have to retype 'Data Structures' every day."),
    ("Native Edit Modal:", "Uses HTML5 native `<dialog>` for quick updates — lightweight, accessible, and closes with the Escape key."),
    ("Dark Mode Built-in:", "Adapts automatically to your system theme so your eyes don't hurt during midnight cram sessions.")
], title_color=C_ACCENT_GREEN)


# ==========================================
# SLIDE 8: DEMO SCREENSHOT: MAIN DASHBOARD
# ==========================================
s8 = prs.slides.add_slide(blank_layout)
set_slide_background(s8, C_BG_LIGHT)
add_header(s8, "Live Implementation: The Main Dashboard", "Live Application Demo", "A clean single-page view showing your entire study picture at a glance.")

add_image_card(s8, 0.8, 1.8, 7.8, 5.1, "01_dashboard_hero.png", caption="StudySync Main Dashboard — Light Theme (Live Application Screenshot)")

add_card_content(s8, 8.8, 1.8, 3.7, 5.1, "What You See Here", [
    ("1. Fast Date Toggles:", "Switch easily between 7, 14, or 30 days to review your week or whole month."),
    ("2. Four Essential Metrics:", "Total study time, number of sessions, daily average, and your most studied subject."),
    ("3. Balanced Split View:", "Left card handles logging (timer or manual); right card shows where the time went."),
    ("4. Clean & Responsive:", "No clutter or distraction — just clean data and high-contrast readability.")
], title_color=C_BRAND)


# ==========================================
# SLIDE 9: DEMO SCREENSHOT: TIMER & LOGGING
# ==========================================
s9 = prs.slides.add_slide(blank_layout)
set_slide_background(s9, C_BG_LIGHT)
add_header(s9, "Live Implementation: Logging in Two Clicks", "Live Application Demo", "Start the timer when you begin, or type in minutes if you studied away from the screen.")

add_image_card(s9, 0.8, 1.8, 5.7, 5.1, "02_timer_active_card.png", caption="Active Stopwatch Timer with Quick Subject Chips & Category Dropdown")

add_card_content(s9, 6.8, 1.8, 5.7, 5.1, "How the Logging Works", [
    ("Start & Stop in 1 Click:", "Click 'Start' when you begin. The clock turns brand indigo and counts live. When you take a break, click 'Stop & save'."),
    ("Quick Subject Chips:", "Pills at the top show your frequent subjects ('DBMS', 'Data Structures', 'Break'). Click one to fill the form instantly."),
    ("Manual Minute Mode:", "Studied in the library or attended a lab session? Just type 45 minutes directly into the input."),
    ("Categorize Easily:", "Tag as Study, Project, Revision, Assignment, or Break to see how your time is split between hands-on work and theory."),
    ("Smart Error Prevention:", "Prevents accidental zero-minute saves or impossible numbers (>24 hours).")
], title_color=C_BRAND)


# ==========================================
# SLIDE 10: DEMO SCREENSHOT: CHARTS & BREAKDOWN
# ==========================================
s10 = prs.slides.add_slide(blank_layout)
set_slide_background(s10, C_BG_LIGHT)
add_header(s10, "Live Implementation: Where Your Time Actually Went", "Live Application Demo", "Instant clarity on your top subjects and how your categories balance out.")

add_image_card(s10, 0.8, 1.8, 5.7, 5.1, "03_analytics_card.png", caption="Subject Progress Bars & Dynamic CSS Conic-Gradient Category Donut")

add_card_content(s10, 6.8, 1.8, 5.7, 5.1, "Turning Minutes Into Insights", [
    ("Subject Breakdown Bars:", "Automatically ranks your subjects by total time. In this sample week, DBMS led with 5.3h (31%), followed by Data Structures with 4.4h (26%)."),
    ("Proportional Visual Sizing:", "The longest subject gets a full bar; other subjects scale proportionally so differences are instantly obvious."),
    ("CSS Conic Donut Chart:", "Drawn purely with CSS angles. Visualizes your balance between Project work (320m), Study (265m), Revision (175m), and Breaks (150m)."),
    ("Color-Coded Legend:", "Clean swatches show exact category minutes at a glance."),
    ("Answers the Core Question:", "Eliminates guessing: you can clearly see whether you actually spent enough time preparing for upcoming exams.")
], title_color=C_BRAND)


# ==========================================
# SLIDE 11: DEMO SCREENSHOT: TRENDS & HISTORY
# ==========================================
s11 = prs.slides.add_slide(blank_layout)
set_slide_background(s11, C_BG_LIGHT)
add_header(s11, "Live Implementation: Daily Consistency & Session History", "Live Application Demo", "See your study rhythm across the week and easily edit or remove past entries.")

add_image_card(s11, 0.8, 1.8, 6.5, 2.2, "04_daily_trend_card.png", caption="Minutes per Day Column Chart (7-Day Continuous View)")
add_image_card(s11, 0.8, 4.2, 6.5, 2.7, "05_recent_sessions_card.png", caption="Recent Sessions Table with Quick Edit and Delete Action Buttons")

add_card_content(s11, 7.6, 1.8, 4.9, 5.1, "Consistency & Easy Corrections", [
    ("Daily Column Chart:", "Vertical columns show daily study volume. You can immediately spot your most productive days vs. rest days."),
    ("Continuous Date Timeline:", "Even if you didn't study on a particular day, the date remains visible at zero height so you see the gap."),
    ("Full Session Ledger:", "Displays exact date/time, subject, category badge, duration, and notes for every session."),
    ("Easy Corrections:", "Made a typo in notes or forgot the timer was running? Click the pencil to edit or the trash can to delete.")
], title_color=C_BRAND)


# ==========================================
# SLIDE 12: DEMO SCREENSHOT: EDIT MODAL & DARK THEME
# ==========================================
s12 = prs.slides.add_slide(blank_layout)
set_slide_background(s12, C_BG_LIGHT)
add_header(s12, "Live Implementation: Quick Editing & Eye-Friendly Dark Theme", "Live Application Demo", "Native modal dialog for fast updates and a sleek dark theme for late nights.")

add_image_card(s12, 0.8, 1.8, 5.7, 5.1, "06_edit_session_modal.png", caption="Accessible Native <dialog> Modal for Editing Sessions")
add_image_card(s12, 6.8, 1.8, 5.7, 5.1, "07_dashboard_dark.png", caption="StudySync in Dark Mode (Automatic Night Theme)")


# ==========================================
# SLIDE 13: AUTOMATED TESTING: 100% PASSING
# ==========================================
s13 = prs.slides.add_slide(blank_layout)
set_slide_background(s13, C_BG_LIGHT)
add_header(s13, "Automated Testing & Code Quality: It Just Works", "Quality Assurance & Testing", "11 automated unit and integration tests passing in 304 milliseconds.")

add_image_card(s13, 0.8, 1.8, 6.5, 5.1, "08_test_suite_terminal.png", caption="Node.js Native Test Runner (node:test) — 11/11 Tests Passing in 304ms")

add_card_content(s13, 7.6, 1.8, 4.9, 5.1, "What Our Tests Verify", [
    ("Catches Invalid Inputs:", "Rejects empty subjects, zero minutes, negative numbers, and absurd durations (>24 hours)."),
    ("Enforces Categories:", "Rejects random invalid category strings with clear HTTP 400 messages."),
    ("Checks Sorting & Ordering:", "Ensures sessions always return sorted newest-first so recent work is at the top."),
    ("Validates Summary Totals:", "Guarantees that total minutes, daily averages, and category sums calculate correctly."),
    ("Verifies Date Ranges:", "Ensures sessions older than 7 days are excluded from the 7-day summary."),
    ("Tests Data Migrations:", "Confirms that case-matching and startup subject cleanup work reliably.")
], title_color=C_BRAND)


# ==========================================
# SLIDE 14: REAL ENGINEERING CHALLENGES WE OVERCAME
# ==========================================
s14 = prs.slides.add_slide(blank_layout)
set_slide_background(s14, C_BG_LIGHT)
add_header(s14, "Real Engineering Challenges (And How We Solved Them)", "Behind the Scenes", "The unexpected hurdles we ran into during development and how we fixed them.")

ch_w = 5.7
ch_h = 2.3
ch_x1 = 0.8
ch_x2 = 6.8
ch_y1 = 1.8
ch_y2 = 4.4

add_card_content(s14, ch_x1, ch_y1, ch_w, ch_h, "1. The Timezone Day-Shift Trap", [
    ("The Problem:", "Server UTC timestamps caused late-night sessions (11:30 PM in IST) to register on the previous calendar date in charts!"),
    ("The Fix:", "The browser sends its local offset (`tz=330`). The server computes local midnight and uses SQLite's datetime modifier (`+330 minutes`) for grouping.")
], title_color=C_BRAND)

add_card_content(s14, ch_x2, ch_y1, ch_w, ch_h, "2. The 'DBMS' vs 'dbms' Duplication", [
    ("The Problem:", "Different casing created messy duplicate bars on the dashboard for the exact same subject."),
    ("The Fix:", "Implemented case-insensitive matching (`COLLATE NOCASE`) so 'dbms' maps to 'DBMS', plus an idempotent startup cleaner.")
], title_color=C_ACCENT_SKY)

add_card_content(s14, ch_x1, ch_y2, ch_w, ch_h, "3. The Disappearing Timer on Refresh", [
    ("The Problem:", "Early prototypes lost the active timer whenever the user refreshed the page or closed the laptop."),
    ("The Fix:", "Stored the start timestamp in browser `localStorage`. On reload, the app calculates elapsed time from the stored timestamp and resumes ticking.")
], title_color=C_ACCENT_GREEN)

add_card_content(s14, ch_x2, ch_y2, ch_w, ch_h, "4. Avoiding 50 npm Dependencies", [
    ("The Problem:", "Standard charting libraries (Chart.js, D3) bloat project bundle sizes and introduce security warnings."),
    ("The Fix:", "Wrote lightweight chart renderers using pure CSS conic-gradients and DOM flexbox bars. Faster, cleaner, and zero bloat.")
], title_color=C_ACCENT_AMBER)


# ==========================================
# SLIDE 15: THE 60% ROADMAP AHEAD
# ==========================================
s15 = prs.slides.add_slide(blank_layout)
set_slide_background(s15, C_BG_LIGHT)
add_header(s15, "The Roadmap Ahead: What's Coming in Reviews 2 & 3", "Project Roadmap (60% Remaining)", "Our clear plan to take StudySync from a single-user tracker to a social study hub.")

p_w = 3.7
p_gap = 0.3
add_card_content(s15, 0.8, 1.8, p_w, 5.0, "Review 2 Milestone (25%)", [
    ("Target Date:", "Next Sprint (Weeks 6-8)."),
    ("Student Login & Accounts:", "Secure user registration and login (bcrypt password hashing + JWT session cookies)."),
    ("Private Study Databases:", "Each student sees only their own study history."),
    ("Pomodoro Focus Mode:", "25-minute focus intervals followed by 5-minute break chimes."),
    ("Milestone Output:", "Live demo of login and Pomodoro focus sessions.")
], title_color=C_BRAND)

add_card_content(s15, 0.8 + p_w + p_gap, 1.8, p_w, 5.0, "Review 3 Milestone (25%)", [
    ("Target Date:", "Mid-Semester (Weeks 9-11)."),
    ("Weekly Study Goals:", "Set goals like '10 hours of DBMS this week' with a live deficit/surplus progress bar."),
    ("The 'Sync' in StudySync:", "Shared virtual rooms where friends can study together online and see live study statuses."),
    ("Real-Time Presence:", "Lightweight WebSockets to see who is studying right now."),
    ("Milestone Output:", "Working collaborative group study room demo.")
], title_color=C_ACCENT_SKY)

add_card_content(s15, 0.8 + (p_w + p_gap)*2, 1.8, p_w, 5.0, "Final Polish (10%)", [
    ("Target Date:", "Final Submission (Weeks 12-14)."),
    ("Export to CSV & PDF:", "One-click export for faculty assignment logs and study proof."),
    ("Smart Study Insights:", "Algorithms that detect study fatigue and recommend optimal break timings."),
    ("PWA Offline Support:", "Installable on laptops and phones with full offline tracking."),
    ("Milestone Output:", "Final comprehensive project defense & deployment.")
], title_color=C_ACCENT_GREEN)


# ==========================================
# SLIDE 16: CONCLUSION & DEMO READINESS
# ==========================================
s16 = prs.slides.add_slide(blank_layout)
set_slide_background(s16, C_CARD_DARK)
add_header(s16, "Review 1 Summary: Deliverables & Demo Readiness", "Conclusion & Defense", "The 40% milestone is built, verified, and ready for your questions.", is_dark=True)

add_card_content(s16, 0.8, 1.8, 11.7, 4.0, "What We Have Delivered for Review 1", [
    ("Working Web Application:", "Full-stack StudySync application running locally with instant response times, resilient timer, and live charts."),
    ("Embedded SQLite Engine:", "Complete relational schema with positive duration checks, autoincrement keys, and indexed timestamps."),
    ("REST API Architecture:", "7 tested endpoints handling session logging, updates, deletions, and timezone-aware daily aggregation."),
    ("Automated Testing Suite:", "11 unit and integration tests passing with 100% success rate in 304ms."),
    ("Data Hygiene & Self-Healing:", "Case-insensitive matching and startup deduplication preventing messy duplicate charts."),
    ("Ready for Live Faculty Demo:", "Preloaded with a realistic week of sample study sessions ready for a live walkthrough.")
], is_dark=True, title_color=C_BRAND_LIGHT)

# Bottom Thank You & Q&A Banner
add_card(s16, 0.8, 6.0, 11.7, 0.9, bg_color=C_BRAND, border_color=None)
t_end = s16.shapes.add_textbox(Inches(1.0), Inches(6.1), Inches(11.3), Inches(0.7))
tf_e = t_end.text_frame
tf_e.word_wrap = True
p_eq = tf_e.paragraphs[0]
p_eq.text = "THANK YOU — READY FOR LIVE DEMO & EVALUATOR QUESTIONS"
p_eq.font.size = Pt(13)
p_eq.font.bold = True
p_eq.font.color.rgb = C_TEXT_LIGHT
p_eq.font.name = "Segoe UI"
p_ed = tf_e.add_paragraph()
p_ed.text = "StudySync is running live. We invite the faculty evaluation panel to test the timer, review the codebase, and ask questions."
p_ed.font.size = Pt(10.5)
p_ed.font.color.rgb = C_BRAND_LIGHT
p_ed.font.name = "Segoe UI"

# Save presentation to multiple target paths
out_paths = [
    r"d:\projects\StudySync\StudySync_Review1_40Percent_Submission.pptx",
    r"d:\projects\StudySync\studysync\StudySync_Review1_40Percent_Submission.pptx",
    r"C:\Users\user\.gemini\antigravity\brain\108dc659-b539-4919-bc6b-fc7bfd388808\StudySync_Review1_40Percent_Submission.pptx"
]

for out_path in out_paths:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    prs.save(out_path)
    print(f"Humanized presentation saved successfully to: {out_path} ({os.path.getsize(out_path):,} bytes)")

print("Humanized presentation generated successfully!")
