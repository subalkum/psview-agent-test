const formIds = [
  "companyName", "website", "companyContext", "culture", "hiringProfiles",
  "role", "candidateName", "candidateProfile", "tone", "cta", "intent",
];

const state = {
  configured: null,
  messages: [],
  candidate: { state: "Passive", objection: "None", action: "Personalize", signals: [] },
};

const toneProfiles = {
  "direct-warm": {
    agentName: "Ari",
    headline: "Calm operator with warm precision",
    voice: "Plainspoken, respectful, specific, and quick to explain why the role matters.",
    principle: "Earn attention through relevance, then ask for the smallest useful next step.",
    traits: ["warmth", "specificity", "pace", "credibility"],
    color: "#2457d6",
    modifier: (text) => text,
  },
  technical: {
    agentName: "Vera",
    headline: "Technical scout with systems-level taste",
    voice: "Concrete, low-fluff, and anchored in technical constraints, architecture, and evidence.",
    principle: "Lead with the hard problem, not the employer brand.",
    traits: ["precision", "depth", "proof", "restraint"],
    color: "#126146",
    modifier: (text) => text.replace("worth a real conversation", "worth a technical screen on problem quality"),
  },
  founder: {
    agentName: "Noor",
    headline: "Founder proxy with candid conviction",
    voice: "Direct, mission-led, and comfortable naming tradeoffs without sounding overproduced.",
    principle: "Behave like a founder would: candid, selective, and allergic to vague selling.",
    traits: ["candor", "mission", "ownership", "urgency"],
    color: "#101211",
    modifier: (text) => `${text}\n\nI will be direct about both the upside and the tradeoffs.`,
  },
  operator: {
    agentName: "Sera",
    headline: "Senior operator with crisp judgment",
    voice: "Brief, senior, and selective, with emphasis on scope, timing, and mutual fit.",
    principle: "Compress the thread until every line helps the candidate decide.",
    traits: ["brevity", "judgment", "caliber", "clarity"],
    color: "#384152",
    modifier: (text) => text.split("\n\n").slice(0, 2).join("\n\n"),
  },
  "high-energy": {
    agentName: "Juno",
    headline: "High-signal scout with bright momentum",
    voice: "Energetic and human, but still grounded in evidence and candidate relevance.",
    principle: "Make the thread memorable without letting personality outrun substance.",
    traits: ["energy", "curiosity", "memorability", "momentum"],
    color: "#a23a35",
    modifier: (text) => `${text}\n\nI will keep this sharp and not spammy.`,
  },
};

const traitCopy = {
  warmth: "Acknowledges hesitation and protects the candidate's time.",
  specificity: "Uses company, role, and candidate facts in every meaningful turn.",
  pace: "Moves the conversation forward without fake urgency.",
  credibility: "Leads with believable proof instead of hiring adjectives.",
  precision: "Names technical surfaces, constraints, and decision points.",
  depth: "Connects the candidate background to the hardest role problems.",
  proof: "Answers skepticism with concrete context and falsifiable claims.",
  restraint: "Stays short when the candidate is busy or skeptical.",
  candor: "States the opportunity and tradeoffs plainly.",
  mission: "Frames the role around why the work should exist.",
  ownership: "Emphasizes scope, accountability, and decision proximity.",
  urgency: "Creates momentum through relevance, not pressure.",
  brevity: "Compresses detail into senior, scannable copy.",
  judgment: "Qualifies fit and stops when the signal is poor.",
  caliber: "Signals selectivity while staying respectful.",
  clarity: "Makes the ask and next step unambiguous.",
  energy: "Adds human pace without becoming gimmicky.",
  curiosity: "Asks high-signal questions that invite real answers.",
  memorability: "Creates a distinctive thread without fluff.",
  momentum: "Turns small positive signals into a next step.",
};

const ctaCopy = {
  intro: "20 minute intro",
  technical: "technical scope call",
  coffee: "low-pressure coffee chat",
  founder: "founder conversation",
};

function readContext() {
  return Object.fromEntries(formIds.map((id) => [id, document.getElementById(id).value.trim()]));
}

function firstSentence(text) {
  return (text.split(/[.!?]/).find(Boolean) || text).trim();
}

function keywords(text, limit = 6) {
  const stop = new Set(["the", "and", "with", "that", "this", "from", "have", "for", "you", "your", "into", "role", "team", "company", "builds", "build", "work", "people", "senior", "hiring", "profile", "profiles", "candidate", "currently"]);
  return [...new Set((text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []))]
    .filter((word) => !stop.has(word))
    .slice(0, limit);
}

function configureAgent() {
  const context = readContext();
  const tone = toneProfiles[context.tone] || toneProfiles["direct-warm"];
  const companyTerms = keywords(`${context.companyContext} ${context.culture} ${context.hiringProfiles}`, 8);
  const candidateTerms = keywords(context.candidateProfile, 5);
  const cta = ctaCopy[context.cta] || ctaCopy.intro;
  const persona = {
    name: `${tone.agentName}, ${context.companyName} talent agent`,
    initials: tone.agentName.slice(0, 2).toUpperCase(),
    headline: tone.headline,
    voice: tone.voice,
    principle: tone.principle,
    traits: tone.traits.map((trait) => ({ trait, copy: traitCopy[trait] })),
    color: tone.color,
    modifier: tone.modifier,
  };
  const memory = [
    `${context.companyName}: ${firstSentence(context.companyContext)}.`,
    `Website signal: ${context.website || "not provided"}`,
    `Culture: ${context.culture}`,
    `Hiring target: ${context.role}; adjacent profiles include ${context.hiringProfiles}`,
    `Candidate relevance: ${context.candidateProfile}`,
  ];
  const strategy = {
    goal: context.intent,
    appeal: candidateTerms.length ? `connect ${context.candidateName}'s ${candidateTerms.slice(0, 2).join(" + ")} background to ${companyTerms.slice(0, 2).join(" + ")}` : `connect ${context.candidateName}'s background to the company mission`,
    risk: "generic startup pitch",
    guardrail: "exit respectfully on clear no; never pretend to send real outreach",
    tactic: "start specific, adapt to objections, advance only on positive signal",
    cta,
  };
  const sequence = buildSequence(context, persona, strategy, companyTerms, candidateTerms);
  const scores = { fit: Math.min(99, 80 + companyTerms.length + candidateTerms.length * 2), voice: context.tone === "high-energy" ? 88 : 93, agency: 91 };
  state.configured = { context, persona, memory, strategy, sequence, scores, companyTerms, candidateTerms };
  state.messages = [];
  state.candidate = { state: "Passive", objection: "None", action: "Personalize", signals: [] };
  renderAll(true);
}

function buildSequence(context, persona, strategy, companyTerms, candidateTerms) {
  const companyProof = firstSentence(context.companyContext);
  const cultureProof = context.culture.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 3).join(", ");
  const candidateHook = candidateTerms.length ? `your work around ${candidateTerms.slice(0, 2).join(" and ")}` : "your background";
  const termLine = companyTerms.length ? companyTerms.slice(0, 4).join(", ") : "the company's core problems";
  return [
    { step: "01", title: "First touch", why: "Earns attention by tying the candidate to concrete company work before asking for time.", copy: persona.modifier(`${context.candidateName}, I am reaching out from ${context.companyName} because ${candidateHook} looks unusually relevant to our ${context.role} search.\n\n${companyProof}. The reason I think this might be worth a real conversation: the team values ${cultureProof}, and this role sits close to the hardest product decisions.\n\nWould a ${strategy.cta} be worth considering?`) },
    { step: "02", title: "Proof follow-up", why: "Adds substance instead of repeating the same CTA.", copy: persona.modifier(`A bit more context: ${context.companyName} is looking for people who can operate around ${termLine}, not just people with the right title.\n\nThe fit I am testing is whether ${context.role} gives you more ownership and more real-world impact than your current lane.`) },
    { step: "03", title: "Objection turn", why: "Handles passive-candidate hesitation by lowering commitment and increasing specificity.", copy: persona.modifier(`No need to be actively looking. The only useful next step is a ${strategy.cta} where we pressure-test scope, team quality, and whether the problems are actually interesting to you.\n\nIf it is not differentiated, I will say so directly.`) },
    { step: "04", title: "Close or learn", why: "The agent either advances, adapts, or exits instead of blindly nudging.", copy: persona.modifier(`If now is not right, I can close the loop. If one piece is worth exploring, I would suggest starting with the technical scope and what success looks like after six months.`) },
  ];
}

function startThread() {
  if (!state.configured) configureAgent();
  state.messages = [{ sender: "agent", text: state.configured.sequence[0].copy }];
  writeReasoning(["observe: no candidate reply yet", "infer: candidate is passive until evidence changes", "choose: send personalized first touch", "act: use company proof + candidate relevance + low-friction CTA"]);
  renderThread();
}

function analyzeReply(text) {
  const normalized = text.toLowerCase();
  const signals = [];
  let candidateState = "Passive";
  let objection = "None";
  let action = "Personalize";
  if (/(interesting|happy|open|sure|yes|love|like|next week|call|chat|more)/.test(normalized)) { candidateState = "Interested"; signals.push("positive intent"); action = "Advance"; }
  if (/(not actively|not looking|busy|later|timing|not now)/.test(normalized)) { candidateState = candidateState === "Interested" ? "Warm but timing-sensitive" : "Passive"; objection = "Timing"; signals.push("timing concern"); action = "Lower commitment"; }
  if (/(different|why|startup|skeptical|generic|another|proof|special)/.test(normalized)) { candidateState = "Skeptical"; objection = "Differentiation"; signals.push("asks for proof"); action = "Prove differentiation"; }
  if (/(comp|salary|level|scope|equity|title|seniority|money)/.test(normalized)) { candidateState = "Evaluating"; objection = "Scope and compensation"; signals.push("evaluating level"); action = "Clarify scope"; }
  if (/(no|not interested|pass|unsubscribe|stop|remove)/.test(normalized)) { candidateState = "Closed"; objection = "No interest"; signals.push("negative intent"); action = "Exit"; }
  return { candidateState, objection, action, signals };
}

function respondToCandidate(reply) {
  if (!state.configured) configureAgent();
  const { context, persona, strategy, companyTerms, candidateTerms } = state.configured;
  const analysis = analyzeReply(reply);
  state.candidate = { state: analysis.candidateState, objection: analysis.objection, action: analysis.action, signals: analysis.signals };
  let response;
  if (analysis.action === "Advance") {
    response = `${context.candidateName}, useful signal. I would keep the first conversation narrow: what ${context.companyName} is building, why ${context.role} is open now, and whether the scope is genuinely stronger than your current path.\n\nWould Tuesday or Wednesday be easier for a ${strategy.cta}?`;
  } else if (analysis.action === "Prove differentiation") {
    response = `Fair filter. The differentiated part is not "${context.companyName} is a startup." It is that ${firstSentence(context.companyContext).toLowerCase()}.\n\nThe role is close to ${companyTerms.slice(0, 3).join(", ")} decisions, so the conversation should get specific fast. If that bar is not met, you should pass.`;
  } else if (analysis.action === "Clarify scope") {
    response = `That is the right filter. I would frame the role around three questions: what decisions you own, how close you are to production reality, and whether ${context.companyName} can give you leverage beyond implementation.\n\nI would rather validate level and scope early than sell you a vague opportunity. Want the first conversation to be only about that?`;
  } else if (analysis.action === "Lower commitment") {
    response = `Makes sense. I am not treating this as a job-search signal. The ask is only to compare the problem quality against where you are now.\n\nGiven your ${candidateTerms.slice(0, 2).join(" and ") || "background"}, the useful question is whether ${context.role} creates a meaningful jump in ownership or mission.`;
  } else if (analysis.action === "Exit") {
    response = `Understood. I will close the loop here and will not keep nudging.\n\nIf your priorities change later, the most relevant angle would be ${context.role} work at ${context.companyName}, but no reply needed now.`;
  } else {
    response = `${context.candidateName}, that helps. The signal I am hearing is that fit depends on whether the actual work matches the pitch.\n\nI would suggest we pressure-test the role against ${context.candidateProfile.toLowerCase()} and skip anything generic.`;
  }
  state.messages.push({ sender: "candidate", text: reply });
  state.messages.push({ sender: "agent", text: persona.modifier(response) });
  writeReasoning([`observe: "${reply}"`, `infer: state=${analysis.candidateState}; objection=${analysis.objection}; signals=${analysis.signals.join(", ") || "none"}`, `choose: ${analysis.action}`, `act: respond as ${persona.name}; preserve ${context.tone} voice; use ${context.companyName} facts`]);
  renderAll(false);
}

function renderAll(resetThread = false) {
  const { context, persona, memory, strategy, sequence, scores } = state.configured;
  document.getElementById("agentName").textContent = persona.name;
  document.getElementById("agentInitials").textContent = persona.initials;
  document.getElementById("agentInitials").style.background = persona.color;
  document.getElementById("agentSummary").textContent = `${persona.headline}. Strategy: ${strategy.appeal}.`;
  document.getElementById("fitScore").textContent = scores.fit;
  document.getElementById("voiceScore").textContent = scores.voice;
  document.getElementById("agencyScore").textContent = scores.agency;
  document.getElementById("personaHeadline").textContent = persona.headline;
  document.getElementById("personaSummary").textContent = persona.voice;
  document.getElementById("operatingPrinciple").textContent = persona.principle;
  document.getElementById("operatingCopy").textContent = `Objective: ${context.intent} The agent chooses each message from candidate state, objection, company memory, and the configured CTA.`;
  document.getElementById("traitGrid").innerHTML = persona.traits.map(({ trait, copy }) => `<div class="trait"><strong>${titleCase(trait)}</strong><p>${escapeHtml(copy)}</p></div>`).join("");
  document.getElementById("memoryList").innerHTML = memory.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  document.getElementById("sequenceList").innerHTML = sequence.map((item) => `<article class="sequence-item"><div class="sequence-step"><span>${item.step}</span><h3>${escapeHtml(item.title)}</h3></div><div class="sequence-copy"><p>${escapeHtml(item.copy)}</p><p class="sequence-why">${escapeHtml(item.why)}</p></div></article>`).join("");
  document.getElementById("kernelGrid").innerHTML = [
    ["Goal", strategy.goal],
    ["Tactic", state.candidate.action === "Personalize" ? strategy.tactic : state.candidate.action],
    ["Risk", strategy.risk],
    ["Guardrail", strategy.guardrail],
  ].map(([label, value]) => `<div class="kernel-card"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`).join("");
  document.getElementById("candidateState").textContent = state.candidate.state;
  document.getElementById("objection").textContent = state.candidate.objection;
  document.getElementById("nextBestAction").textContent = state.candidate.action;
  if (resetThread) startThread(); else renderThread();
}

function renderThread() {
  const thread = document.getElementById("thread");
  thread.innerHTML = state.messages.map((message) => `<div class="message ${message.sender}"><div class="message-meta">${message.sender === "agent" ? escapeHtml(state.configured.persona.name) : escapeHtml(state.configured.context.candidateName)}</div><div class="bubble">${escapeHtml(message.text)}</div></div>`).join("");
  thread.scrollTop = thread.scrollHeight;
}

function writeReasoning(lines) { document.getElementById("reasoningLog").textContent = lines.join("\n"); }

function resetDemo() {
  document.getElementById("companyName").value = "Northstar Robotics";
  document.getElementById("website").value = "northstarrobotics.ai";
  document.getElementById("companyContext").value = "Northstar Robotics builds autonomous warehouse robots for mid-market logistics teams. The product replaces repetitive picking routes with safe robotic fleets that deploy in weeks, not quarters.";
  document.getElementById("culture").value = "Small senior team, direct communication, high ownership, customer obsession, low ego, fast shipping cadence.";
  document.getElementById("hiringProfiles").value = "Senior robotics engineers, embedded systems engineers, motion planning specialists, founding account executives who have sold technical products.";
  document.getElementById("role").value = "Senior Motion Planning Engineer";
  document.getElementById("candidateName").value = "Maya";
  document.getElementById("candidateProfile").value = "Built planning systems at a drone delivery company, cares about real-world robot reliability, currently passive but open to unusually strong missions.";
  document.getElementById("tone").value = "direct-warm";
  document.getElementById("cta").value = "intro";
  document.getElementById("intent").value = "Start a serious conversation and earn a 20 minute intro call.";
  configureAgent();
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function titleCase(value) { return value.replace(/\b\w/g, (char) => char.toUpperCase()); }

document.getElementById("configureAgent").addEventListener("click", configureAgent);
document.getElementById("resetDemo").addEventListener("click", resetDemo);
document.getElementById("startThread").addEventListener("click", startThread);
document.getElementById("sendReply").addEventListener("click", () => {
  const input = document.getElementById("candidateReply");
  const reply = input.value.trim();
  if (!reply) return;
  respondToCandidate(reply);
  input.value = "";
});
document.querySelectorAll(".quick-replies button").forEach((button) => button.addEventListener("click", () => respondToCandidate(button.dataset.reply)));
document.querySelectorAll(".nav-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".nav-tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`${tab.dataset.view}View`).classList.add("active");
  });
});
formIds.forEach((id) => document.getElementById(id).addEventListener("change", configureAgent));
configureAgent();

