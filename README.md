# PSVIEW Agent Console

A static web app that configures and previews an autonomous candidate engagement agent from company context.

## Links

- GitHub repo: https://github.com/subalkum/psview-agent-test
- GitHub Pages target: http://subal.me/psview-agent-test/

## What I Built

The app captures company context, culture, hiring profiles, candidate background, voice, CTA, and intent. From that, it builds a recruiting agent with a stable personality, interpreted company memory, learned candidate memory, outreach sequence, autonomy kernel, decision playbook, policy, stop rules, and simulated conversation loop. Reviewers can type candidate replies or hit Agent step to let the agent autonomously follow up, update candidate state, identify objections, choose a next action, and respond in the configured voice.

## Structure

- `src/domain`: typed autonomous agent engine, policy, inference, memory, and message planner.
- `src/data`: tone profiles, company presets, CTA copy, and trait definitions.
- `src/ui`: DOM controller that wires the app to the agent engine.
- `dist`: compiled static JavaScript loaded by `index.html`.

## Choices


- TypeScript domain/UI split with compiled static output for speed, no API-key dependency, and zero deployment friction.
- App-first console UI, not a marketing landing page.
- Visible intelligence panel showing memory, candidate state, decision policy, autonomy kernel, stop rules, current stage, and latest reasoning summary.
- YC-style SaaS direction: dense workspace, crisp typography, restrained color, fast scanning, and no decorative fluff.

## What Makes The Agent Intelligent?

It is not a single prompt wrapper: it first interprets company context into memory, persona, policy, success conditions, and stop rules, then runs an observe -> infer -> choose -> act loop where candidate-state inference, learned memory, silence handling, and objection handling decide the next conversational action before any message is written.

## Run Locally

Build the TypeScript, then open `index.html` directly in a browser, or run:

```bash
tsc --project tsconfig.json
python -m http.server 5173
```

Then visit `http://localhost:5173`.

## Deploy

This is a static app. Deploy the folder to Vercel, Netlify, Cloudflare Pages, or GitHub Pages.




