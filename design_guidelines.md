# LookMax - Design Guidelines

## Brand Identity

**Purpose**: AI-powered facial improvement and habit-tracking app for systematic appearance enhancement through measurable progress and personalized plans.

**Aesthetic Direction**: Premium fitness app style - minimal, data-driven, motivational. NOT cartoonish or gamified. Think health & wellness tech, not beauty filter app.

**Memorable Element**: Progress-focused UI with circular consistency scores and week-over-week improvement metrics that reinforce positive behavior change.

---

## Navigation Architecture

**Root Navigation**: Bottom Tab Bar (4 tabs)
- Home (Dashboard)
- Scan (Camera + Analysis)
- Plans (Daily/Weekly Routines)
- Profile (User Settings)

**Modal Screens**:
- Scan Result Preview
- Weekly Report (locked/unlocked states)
- Plan Generator Flow

---

## Screen-by-Screen Specifications

### 1. Dashboard (Home Tab)

**Purpose**: Show current stats, daily tips, and conditional greeting

**Layout**:
- Header: Transparent, greeting card conditionally shown if improvement exists
- Main content: Scrollable
- Top inset: insets.top + 16dp
- Bottom inset: tabBarHeight + 16dp

**Components**:
- Greeting Card (conditional): "Hey {name}, Your Looks Score improved by X% this month"
- Stats Grid (6 cards): Symmetry, Jawline, Proportions, Skin Clarity, Masculinity, Cheekbones - each with progress bar and percentage
- Daily Tips List: Checklist cards (moisturize, water, sleep, facial exercises, cold water dip)

**Empty State**: Show placeholder values (87.5%, 92%, 80%, etc.) if no scan history

---

### 2. Scan Screen (Scan Tab)

**Purpose**: Capture face scan and collect lifestyle data

**Layout**:
- Header: "Scan" title, scan counter badge (1/3, 2/3, 3/3) in top-right
- Main content: Camera preview (full-height)
- Bottom sheet: Lifestyle questions form (sleep, diet, water, exercise)
- Bottom inset: tabBarHeight + 16dp

**Components**:
- Camera placeholder UI
- Scan button (large, centered)
- Questions form (slides up after scan)
- "Generate My Plan" button (below form)

**States**:
- Active (scan available)
- Disabled (daily limit reached) - show lock icon with message

---

### 3. Weekly Analysis Screen (Modal from Home)

**Purpose**: Display weekly progress metrics

**Layout**:
- Header: "Weekly Analysis", close button top-right
- Main content: Scrollable cards
- Top inset: insets.top + 16dp
- Bottom inset: insets.bottom + 16dp

**Components**:
- Total Scans card
- Improvement Since Last Week card (with ↑ arrow if positive)
- Consistency Score (circular progress indicator, centered)

**States**:
- Locked: Show lock icon + "Complete 5 days & 15 scans to unlock"
- Unlocked: Show all metrics

---

### 4. Plans Screen (Plans Tab)

**Purpose**: View and manage daily/weekly routines

**Layout**:
- Header: Segmented control (Morning Routine / Evening Routine)
- Main content: Exercise list (scrollable)
- Bottom inset: tabBarHeight + 16dp

**Components**:
- Segmented tabs at top
- Morning: 4 exercise cards (from /plans/today)
- Evening: 10 exercise cards OR "Generate Weekly Plan" button
- Each exercise: title, description, duration/reps

---

### 5. Profile Screen (Profile Tab)

**Purpose**: Edit user info and view settings

**Layout**:
- Header: "Profile"
- Main content: Form (scrollable)
- Bottom inset: tabBarHeight + 16dp

**Components**:
- Avatar (circular, editable)
- Name field
- Age field
- "Save / Update Profile" button

---

### 6. Challenges Section (Card on Dashboard)

**Purpose**: Display weekly habit goals

**Components**:
- 5 challenge cards with checkboxes:
  - Drink 6-7L water
  - Sleep 8 hours
  - Eat healthy meal
  - Do facial exercises
  - Walk 3-5km (distance value from backend)

---

## Color Palette

**Material 3 Neutral Theme**:
- Primary: #1E88E5 (trustworthy blue)
- Surface: #FFFFFF (light) / #1C1C1E (dark)
- Background: #F5F5F5 (light) / #000000 (dark)
- Text Primary: #212121 (light) / #FFFFFF (dark)
- Text Secondary: #757575 (light) / #A0A0A0 (dark)
- Success: #4CAF50 (improvement indicators)
- Progress Bar Fill: #1E88E5
- Progress Bar Track: #E0E0E0 (light) / #2C2C2E (dark)

**Interactive States**:
- Ripple effect on all touchable cards
- Disabled state: 50% opacity

---

## Typography

**Material 3 Type Scale**:
- Display (Greeting): 24sp, Medium
- Headline (Screen Titles): 20sp, Medium
- Title (Card Headers): 16sp, Medium
- Body (Content): 14sp, Regular
- Label (Metrics): 12sp, Medium

---

## Assets to Generate

1. **app-icon.png** - App icon with face analysis theme (symmetry grid motif)
   - WHERE: Device home screen

2. **splash-icon.png** - Simple logo mark
   - WHERE: App launch screen

3. **empty-scan-history.png** - Illustration of camera with dashed outline
   - WHERE: Dashboard when no scans exist

4. **locked-report.png** - Lock icon with subtle gradient background
   - WHERE: Weekly Analysis screen (locked state)

5. **avatar-default.png** - Neutral user silhouette
   - WHERE: Profile screen (default avatar)

6. **scan-placeholder.png** - Face outline guide for camera
   - WHERE: Scan screen overlay

---

## Technical Notes

- **Platform**: Flutter (stable), Material 3
- **Navigation**: Bottom navigation bar always visible except modals
- **API Integration**: All data from backend, no frontend calculations
- **Responsiveness**: Scale layout for tablets, keep portrait orientation
- **Accessibility**: Minimum touch target 48x48dp, sufficient color contrast