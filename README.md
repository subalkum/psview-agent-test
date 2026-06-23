# PSVIEW Agent Console

A static web app that configures and previews an autonomous candidate engagement agent from company context.

## Links

- GitHub repo: https://github.com/subalkum/psview-agent-test
- GitHub Pages target: http://subal.me/psview-agent-test/

## What I Built

The app captures company context, culture, hiring profiles, candidate background, voice, CTA, and intent. From that, it builds a recruiting agent with a stable personality, company memory, outreach sequence, autonomy kernel, and simulated conversation loop. Reviewers can type candidate replies and see the agent update candidate state, identify objections, choose a next action, and respond in the configured voice.

## Choices

- Plain HTML/CSS/JS for speed, no API-key dependency, and zero deployment friction.
- App-first console UI, not a marketing landing page.
- Visible intelligence panel showing memory, candidate state, decision policy, autonomy kernel, and latest reasoning summary.
- YC-style SaaS direction: dense workspace, crisp typography, restrained color, fast scanning, and no decorative fluff.

## What Makes The Agent Intelligent?

It is not a single prompt wrapper: it first builds an internal strategy and personality from company context, then runs an observe -> infer -> choose -> act loop where candidate-state inference and objection handling decide the next conversational action before any message is written.

## Run Locally

Open `index.html` directly in a browser, or run:

```bash
python -m http.server 5173
```

Then visit `http://localhost:5173`.

## Deploy

This is a static app. Deploy the folder to Vercel, Netlify, Cloudflare Pages, or GitHub Pages.

