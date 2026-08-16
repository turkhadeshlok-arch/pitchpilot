# PitchPilot

PitchPilot is an adaptive conversation coach for founders and salespeople.

It helps people turn what they are selling into better conversations—and practice until they can close confidently.

## Product modes

### Founder Mode

- Pressure-test a startup idea
- Evaluate problem, market, differentiation, and feasibility
- Identify risks, assumptions, opportunities, and next steps
- Generate an investor-ready pitch
- Use Judge Mode and Presentation Mode for hackathon preparation

### Salesperson Mode

- Build a personalized sales conversation kit
- Generate opening lines, discovery questions, objection responses, and closing lines
- Create door-to-door, phone, and WhatsApp scripts
- Practice with adaptive AI customer personas
- Use typed or voice roleplay
- Receive scores for clarity, confidence, relevance, listening, objection handling, and closing strength
- Review conversation replays and suggested next responses
- Track door-to-door visits and leads through a sales pipeline
- Use industry templates for common sales contexts
## Run locally

PitchPilot is a client-side web app. Serve the project through a local web server so browser modules, storage, and API requests work correctly.

Using Python:

```bash
python -m http.server 4173
```

Then open:

```text
http://localhost:4173/
```

## How to use the app

### 1. Choose a mode

From the landing page, choose one of the available workspaces:

- **Founder Mode** — validate and sharpen a startup idea.
- **Salesperson Mode** — build and practice a sales conversation.

You can also open the main workspace directly. Click **+ New project** and choose Founder Mode or Salesperson Mode.

### 2. Use Founder Mode

1. Open **+ New project → Founder Mode**.
2. Describe what you are building.
3. Add the target customer and problem being solved.
4. Optionally add a business model and additional context.
5. Click **Challenge my idea**.
6. Review the analysis: conviction score, risks, assumptions, opportunities, brutal feedback, and next steps.
7. Click **Improve idea** to revise the input, or **Generate pitch** to create an investor pitch.
8. Use Judge Mode, Presentation Mode, speaker notes, or PDF export on the pitch page.

Founder projects are saved in the workspace dashboard under **Project history**.

### 3. Use Salesperson Mode

1. Open **+ New project → Salesperson Mode**.
2. Answer the onboarding questions:
   - What are you selling?
   - What does it cost?
   - Who usually buys it?
   - How are you selling it?
   - What objections do customers give you?
   - What is the goal of the conversation?
3. Add location, household/business type, and an industry template if useful.
4. Click **Build my sales kit**.
5. Use the generated opening line, explanation, discovery questions, objection responses, closing lines, and channel-specific scripts.

### 4. Practice a conversation

From the sales kit, click **Practice a conversation**.

1. Choose a customer persona.
2. Select the difficulty level.
3. Choose the customer's opening objection.
4. Type a response or use **Speak** for voice input.
5. PitchPilot responds as the customer and reads the response aloud when supported.
6. Review your scores for clarity, confidence, relevance, listening, objection handling, and closing strength.
7. Use the suggested replies when you get stuck.
8. Try another round to improve the score.
9. Click **Review replay** to see strong moments and missed opportunities.

The selected conversation goal is used when scoring the response, so the coaching changes depending on whether you want to book a demo, schedule a follow-up, qualify a lead, or close a sale.

### 5. Track field visits and leads

From the sales kit, click **Start a field visit**.

1. Add the person or business name.
2. Add the location and household/business type.
3. Select a lead status: New, Interested, Follow-up, Won, or Lost.
4. Add the best revisit time and quick notes.
5. Use **Pipeline view** to see leads grouped by status.

Sales practice sessions and field visits are saved locally in the browser.

### 7. Customize the workspace

In Founder Mode, click **Settings** to customize:

- Text size
- Text color
- Light, dark, or dusk appearance
- Orange, blue, violet, or green accent colors
- Compact workspace mode

Preferences are saved automatically on the device.

## Gemini configuration

The app supports Gemini through `window.PITCHPILOT_CONFIG`, loaded before `js/ai.js`:

```html
<script>
  window.PITCHPILOT_CONFIG = {
    mode: "live",
    transport: "direct",
    apiKey: "YOUR_GEMINI_API_KEY"
  };
</script>
<script src="../js/ai.js"></script>
```

The configured model is:

```text
gemini-3.6-flash
```

Development Mock remains available when live configuration is missing or disabled.
## Storage

PitchPilot uses IndexedDB as its primary browser database:

```text
pitchpilot_db
```

Stored collections include:

- Founder projects
- Sales practice sessions
- Sales visits and pipeline records
- Workspace preferences

`localStorage` is retained as a backup and migration source when IndexedDB is unavailable.

## Project structure

```text
.
├── index.html              # Landing page
├── css/
│   ├── style.css           # Core design system
│   ├── components.css      # Product components and motion
│   └── responsive.css      # Responsive layouts
├── js/
│   ├── ai.js               # Gemini provider and mock fallback
│   ├── app.js              # Founder workspace and dashboard logic
│   ├── sales.js            # Sales coach, roleplay, scoring, and pipeline
│   ├── storage.js          # IndexedDB and localStorage fallback
│   ├── motion.js           # Landing and application animation system
│   ├── settings.js         # Workspace customization preferences
│   └── features.js         # Judge, presentation, PDF, and speaker-note features
└── pages/
    ├── workspace.html      # Founder dashboard and idea workspace
    ├── sales.html          # Salesperson Mode
    ├── pitch.html          # Generated pitch view
    └── history.html        # Project history
```

## Accessibility and resilience

- Supports `prefers-reduced-motion`
- Includes a Development Mock fallback for demos
- Includes clear API, network, rate-limit, and malformed-response errors
- Keeps Founder Mode and Salesperson Mode usable without a backend during local demos
