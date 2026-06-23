const formIds = [
  "companyName", "website", "companyContext", "culture", "hiringProfiles",
  "role", "candidateName", "candidateProfile", "tone", "cta", "intent",
];

const state = {
  configured: null,
  messages: [],
  run: {
    turn: 0,
    stage: "not-started",
    followups: 0,
    progress: 0,
    lastObservation: "none",
    lastDecision: "not-started",
  },
  candidate: {
    state: "Unknown",
    objection: "None",
    action: "Initialize",
    sentiment: 0,
    intent: "unseen",
    signals: [],
    learned: [],
  },
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
    modifier: (text) => text.replace("real conversation", "technical screen on problem quality"),
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

function configureAgent() {
  const context = readContext();
  const tone = toneProfiles[context.tone] || toneProfiles["direct-warm"];
  const companyTerms = keywords(`${context.companyContext} ${context.culture} ${context.hiringProfiles}`, 8);
  const candidateTerms = keywords(context.candidateProfile, 6);
  const cta = ctaCopy[context.cta] || ctaCopy.intro;
  const persona = buildPersona(context, tone);
  const intelligence = interpretCompany(context, companyTerms, candidateTerms);
  const policy = buildPolicy(context, cta);
  const sequence = buildSequence(context, persona, policy, intelligence, companyTerms, candidateTerms);
  const scores = {
    fit: Math.min(99, 80 + companyTerms.length + candidateTerms.length * 2),
    voice: context.tone === "high-energy" ? 88 : 94,
    agency: 94,
  };

  state.configured = { context, persona, intelligence, policy, sequence, scores, companyTerms, candidateTerms };
  state.messages = [];
  state.run = { turn: 0, stage: "configured", followups: 0, progress: 0, lastObservation: "context loaded", lastDecision: "awaiting-start" };
  state.candidate = { state: "Unknown", objection: "None", action: "Start", sentiment: 0, intent: "unseen", signals: [], learned: [] };
  renderAll(true);
}

function buildPersona(context, tone) {
  return {
    name: `${tone.agentName}, ${context.companyName} talent agent`,
    initials: tone.agentName.slice(0, 2).toUpperCase(),
    headline: tone.headline,
    voice: tone.voice,
    principle: tone.principle,
    traits: tone.traits.map((trait) => ({ trait, copy: traitCopy[trait] })),
    color: tone.color,
    modifier: tone.modifier,
  };
}

function interpretCompany(context, companyTerms, candidateTerms) {
  const cultureItems = splitList(context.culture).slice(0, 4);
  const hiringItems = splitList(context.hiringProfiles).slice(0, 4);
  return {
    thesis: `${context.companyName}: ${firstSentence(context.companyContext)}.`,
    proof: firstSentence(context.companyContext),
    culture: cultureItems,
    hiring: hiringItems,
    candidateHook: candidateTerms.length ? candidateTerms.slice(0, 2).join(" and ") : "relevant operator background",
    companyHooks: companyTerms.slice(0, 4),
    memory: [
      `${context.companyName}: ${firstSentence(context.companyContext)}.`,
      `Website signal: ${context.website || "not provided"}`,
      `Culture: ${cultureItems.join(", ") || context.culture}`,
      `Hiring target: ${context.role}; adjacent profiles include ${hiringItems.join(", ") || context.hiringProfiles}`,
      `Candidate relevance: ${context.candidateProfile}`,
    ],
  };
}

function buildPolicy(context, cta) {
  return {
    goal: context.intent,
    success: `candidate agrees to a ${cta}`,
    tactic: "personalize first, diagnose replies, handle objections, advance only on signal",
    risk: "generic startup pitch or recruiter spam",
    guardrail: "no real sends; exit on clear no; do not over-nudge after two unanswered follow-ups",
    cta,
    maxFollowups: 2,
    playbook: [
      { trigger: "Silence", action: "Add proof", rule: "Never repeat the same CTA twice." },
      { trigger: "Skepticism", action: "Prove differentiation", rule: "Use company facts before persuasion." },
      { trigger: "Scope question", action: "Qualify seniority", rule: "Clarify level before selling." },
      { trigger: "Clear no", action: "Exit", rule: "Stop immediately and preserve trust." },
    ],
    actions: {
      start: "Send first-touch based on candidate-company fit.",
      followup: "Add new proof, not repeated pressure.",
      prove: "Answer skepticism with company-specific differentiation.",
      clarify: "Clarify level, scope, ownership, and decision proximity.",
      lower: "Reduce commitment and frame as exploration, not job search.",
      advance: "Move to scheduling with a narrow agenda.",
      exit: "Close respectfully and stop.",
    },
  };
}

function buildSequence(context, persona, policy, intelligence, companyTerms, candidateTerms) {
  const cultureProof = intelligence.culture.slice(0, 3).join(", ") || context.culture;
  const candidateHook = candidateTerms.length ? `your work around ${candidateTerms.slice(0, 2).join(" and ")}` : "your background";
  const termLine = companyTerms.length ? companyTerms.slice(0, 4).join(", ") : "the company's core problems";
  return [
    { step: "01", title: "First touch", why: "Earn attention by tying candidate history to concrete company work.", copy: persona.modifier(`${context.candidateName}, I am reaching out from ${context.companyName} because ${candidateHook} looks unusually relevant to our ${context.role} search.\n\n${intelligence.proof}. The reason I think this might be worth a real conversation: the team values ${cultureProof}, and this role sits close to the hardest product decisions.\n\nWould a ${policy.cta} be worth considering?`) },
    { step: "02", title: "Proof follow-up", why: "If no reply, the agent adds substance instead of repeating the ask.", copy: persona.modifier(`A bit more context: ${context.companyName} is looking for people who can operate around ${termLine}, not just people with the right title.\n\nThe fit I am testing is whether ${context.role} gives you more ownership and more real-world impact than your current lane.`) },
    { step: "03", title: "Low-pressure nudge", why: "The agent lowers commitment for passive candidates and offers a sharper test.", copy: persona.modifier(`No need to be actively looking. The useful next step is only a ${policy.cta} where we pressure-test scope, team quality, and whether the problems are actually interesting to you.\n\nIf it is not differentiated, I will say so directly.`) },
    { step: "04", title: "Stop rule", why: "Autonomous agents should know when to stop.", copy: persona.modifier(`I do not want to keep nudging if timing is wrong. I can close the loop here; the only reason to continue is if the ${context.role} scope at ${context.companyName} is worth comparing against your current path.`) },
  ];
}

function startThread() {
  if (!state.configured) configureAgent();
  state.messages = [];
  state.run = { turn: 0, stage: "configured", followups: 0, progress: 0, lastObservation: "context loaded", lastDecision: "awaiting-start" };
  state.candidate = { state: "Unknown", objection: "None", action: "Start", sentiment: 0, intent: "unseen", signals: [], learned: [] };
  const decision = runAgentCycle({ type: "start", text: "conversation opened" });
  commitAgentMessage(decision.message, decision);
}

function agentStep() {
  if (!state.configured) configureAgent();
  const decision = runAgentCycle({ type: "silence", text: "no candidate reply" });
  commitAgentMessage(decision.message, decision);
}

function respondToCandidate(reply) {
  if (!state.configured) configureAgent();
  state.messages.push({ sender: "candidate", text: reply });
  const decision = runAgentCycle({ type: "candidate-reply", text: reply });
  commitAgentMessage(decision.message, decision);
}

function runAgentCycle(event) {
  const observation = observe(event);
  const candidateModel = inferCandidate(observation);
  const decision = chooseAction(candidateModel, observation);
  const learned = mergeUnique(state.candidate.learned || [], candidateModel.learned || []);
  const message = composeMessage(decision, observation);

  state.candidate = {
    state: candidateModel.state,
    objection: candidateModel.objection,
    action: decision.actionLabel,
    sentiment: candidateModel.sentiment,
    intent: candidateModel.intent,
    signals: candidateModel.signals,
    learned,
  };
  state.run = {
    turn: state.run.turn + 1,
    stage: decision.stage,
    followups: decision.followups,
    progress: decision.progress,
    lastObservation: observation.summary,
    lastDecision: decision.actionLabel,
  };

  return { ...decision, observation, candidateModel, message };
}

function observe(event) {
  if (event.type === "start") {
    return { type: "start", text: event.text, summary: "thread started; no candidate signal yet" };
  }
  if (event.type === "silence") {
    return { type: "silence", text: event.text, summary: `silence after ${state.run.followups} follow-up(s)` };
  }
  return { type: "candidate-reply", text: event.text, summary: `candidate replied: ${event.text}` };
}

function inferCandidate(observation) {
  if (observation.type === "start") {
    return { state: "Uncontacted", objection: "None", sentiment: 0, intent: "unseen", signals: ["no prior reply"], learned: [] };
  }
  if (observation.type === "silence") {
    const followups = state.run.followups + 1;
    return {
      state: followups > 2 ? "Closed" : "Unresponsive",
      objection: followups > 2 ? "No signal" : "Unknown",
      sentiment: followups > 2 ? -2 : -1,
      intent: "silent",
      signals: [`silence_count=${followups}`],
      learned: followups > 1 ? ["candidate has not engaged after multiple touches"] : [],
    };
  }

  const text = observation.text.toLowerCase();
  const signals = [];
  const learned = [];
  let sentiment = 0;
  let intent = "ambiguous";
  let candidateState = "Passive";
  let objection = "None";

  if (/(interesting|happy|open|sure|yes|love|like|next week|call|chat|more)/.test(text)) {
    sentiment += 2;
    intent = "positive";
    candidateState = "Interested";
    signals.push("positive intent");
    learned.push("candidate is open to continuing if the agenda is concrete");
  }
  if (/(not actively|not looking|busy|later|timing|not now)/.test(text)) {
    sentiment -= 1;
    intent = sentiment > 0 ? "warm-timing" : "passive";
    candidateState = sentiment > 0 ? "Warm but timing-sensitive" : "Passive";
    objection = "Timing";
    signals.push("timing concern");
    learned.push("candidate is passive or timing-sensitive");
  }
  if (/(different|why|startup|skeptical|generic|another|proof|special)/.test(text)) {
    sentiment -= 1;
    intent = "skeptical";
    candidateState = "Skeptical";
    objection = "Differentiation";
    signals.push("asks for proof");
    learned.push("candidate needs differentiation proof");
  }
  if (/(comp|salary|level|scope|equity|title|seniority|money)/.test(text)) {
    sentiment += 1;
    intent = "evaluating";
    candidateState = "Evaluating";
    objection = "Scope and compensation";
    signals.push("evaluating level");
    learned.push("candidate cares about level, scope, or compensation");
  }
  if (/(no|not interested|pass|unsubscribe|stop|remove)/.test(text)) {
    sentiment = -3;
    intent = "negative";
    candidateState = "Closed";
    objection = "No interest";
    signals.push("negative intent");
    learned.push("candidate asked to close the loop");
  }

  if (!signals.length) signals.push("unclear reply");
  return { state: candidateState, objection, sentiment, intent, signals, learned };
}

function chooseAction(candidateModel, observation) {
  const { policy } = state.configured;
  if (observation.type === "start") {
    return decision("Start outreach", "first-touch", 12, state.run.followups, "Send context-rich first touch.");
  }
  if (observation.type === "silence") {
    const nextFollowups = state.run.followups + 1;
    if (nextFollowups > policy.maxFollowups) {
      return decision("Stop sequence", "closed", 0, nextFollowups, policy.actions.exit);
    }
    return decision(nextFollowups === 1 ? "Send proof follow-up" : "Send final low-pressure nudge", "follow-up", 18 + nextFollowups * 8, nextFollowups, policy.actions.followup);
  }
  if (candidateModel.intent === "negative") return decision("Exit", "closed", 0, state.run.followups, policy.actions.exit);
  if (candidateModel.intent === "positive") return decision("Advance to scheduling", "scheduling", 85, state.run.followups, policy.actions.advance);
  if (candidateModel.intent === "warm-timing" || candidateModel.intent === "passive") return decision("Lower commitment", "nurture", 46, state.run.followups, policy.actions.lower);
  if (candidateModel.intent === "skeptical") return decision("Prove differentiation", "proof", 54, state.run.followups, policy.actions.prove);
  if (candidateModel.intent === "evaluating") return decision("Clarify scope", "qualification", 66, state.run.followups, policy.actions.clarify);
  return decision("Ask diagnostic question", "diagnose", 35, state.run.followups, "Ask one useful question and keep the thread moving.");
}

function decision(actionLabel, stage, progress, followups, rationale) {
  return { actionLabel, stage, progress, followups, rationale };
}

function composeMessage(decision) {
  const { context, persona, policy, intelligence, sequence, companyTerms, candidateTerms } = state.configured;
  let response;
  if (decision.actionLabel === "Start outreach") {
    response = sequence[0].copy;
  } else if (decision.actionLabel === "Send proof follow-up") {
    response = sequence[1].copy;
  } else if (decision.actionLabel === "Send final low-pressure nudge") {
    response = sequence[2].copy;
  } else if (decision.actionLabel === "Stop sequence" || decision.actionLabel === "Exit") {
    response = `Understood. I will close the loop here and will not keep nudging.\n\nIf your priorities change later, the most relevant angle would be ${context.role} work at ${context.companyName}, but no reply needed now.`;
  } else if (decision.actionLabel === "Advance to scheduling") {
    response = `${context.candidateName}, useful signal. I would keep the first conversation narrow: what ${context.companyName} is building, why ${context.role} is open now, and whether the scope is genuinely stronger than your current path.\n\nWould Tuesday or Wednesday be easier for a ${policy.cta}?`;
  } else if (decision.actionLabel === "Prove differentiation") {
    response = `Fair filter. The differentiated part is not "${context.companyName} is a startup." It is that ${intelligence.proof.toLowerCase()}.\n\nThe role is close to ${companyTerms.slice(0, 3).join(", ")} decisions, so the conversation should get specific fast. If that bar is not met, you should pass.`;
  } else if (decision.actionLabel === "Clarify scope") {
    response = `That is the right filter. I would frame the role around three questions: what decisions you own, how close you are to production reality, and whether ${context.companyName} can give you leverage beyond implementation.\n\nI would rather validate level and scope early than sell you a vague opportunity. Want the first conversation to be only about that?`;
  } else if (decision.actionLabel === "Lower commitment") {
    response = `Makes sense. I am not treating this as a job-search signal. The ask is only to compare the problem quality against where you are now.\n\nGiven your ${candidateTerms.slice(0, 2).join(" and ") || "background"}, the useful question is whether ${context.role} creates a meaningful jump in ownership or mission.`;
  } else {
    response = `${context.candidateName}, that helps. The signal I am hearing is that fit depends on whether the actual work matches the pitch.\n\nWhat would you need to see for this to be worth a ${policy.cta}: scope, team quality, compensation, or the actual technical problem?`;
  }
  return persona.modifier(response);
}

function commitAgentMessage(message, decision) {
  state.messages.push({ sender: "agent", text: message });
  writeReasoning([
    `observe: ${decision.observation.summary}`,
    `infer: state=${decision.candidateModel.state}; intent=${decision.candidateModel.intent}; objection=${decision.candidateModel.objection}; sentiment=${decision.candidateModel.sentiment}; signals=${decision.candidateModel.signals.join(", ")}`,
    `memory_update: ${(decision.candidateModel.learned || []).join(", ") || "none"}`, 
    `choose: ${decision.actionLabel}; stage=${decision.stage}; progress=${decision.progress}%`,
    `act: ${decision.rationale}`,
  ]);
  renderAll(false);
}

function renderAll(resetThread = false) {
  const { context, persona, intelligence, policy, sequence, scores } = state.configured;
  document.getElementById("agentName").textContent = persona.name;
  document.getElementById("agentInitials").textContent = persona.initials;
  document.getElementById("agentInitials").style.background = persona.color;
  document.getElementById("agentSummary").textContent = `${persona.headline}. Strategy: ${policy.tactic}.`;
  document.getElementById("fitScore").textContent = scores.fit;
  document.getElementById("voiceScore").textContent = scores.voice;
  document.getElementById("agencyScore").textContent = scores.agency;
  document.getElementById("personaHeadline").textContent = persona.headline;
  document.getElementById("personaSummary").textContent = persona.voice;
  document.getElementById("operatingPrinciple").textContent = persona.principle;
  document.getElementById("operatingCopy").textContent = `Objective: ${context.intent} Success condition: ${policy.success}. The agent runs observe -> infer -> choose -> act, and only generates copy after choosing an action.`;
  document.getElementById("traitGrid").innerHTML = persona.traits.map(({ trait, copy }) => `<div class="trait"><strong>${titleCase(trait)}</strong><p>${escapeHtml(copy)}</p></div>`).join("");
  document.getElementById("playbookGrid").innerHTML = policy.playbook.map((item) => `<div class="playbook-card"><span>${escapeHtml(item.trigger)}</span><strong>${escapeHtml(item.action)}</strong><p>${escapeHtml(item.rule)}</p></div>`).join("");
  document.getElementById("memoryList").innerHTML = intelligence.memory.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  document.getElementById("learnedMemoryList").innerHTML = (state.candidate.learned.length ? state.candidate.learned : ["No candidate-specific memory yet. The agent will learn from replies and silence."]).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  document.getElementById("sequenceList").innerHTML = sequence.map((item) => `<article class="sequence-item"><div class="sequence-step"><span>${item.step}</span><h3>${escapeHtml(item.title)}</h3></div><div class="sequence-copy"><p>${escapeHtml(item.copy)}</p><p class="sequence-why">${escapeHtml(item.why)}</p></div></article>`).join("");
  document.getElementById("kernelGrid").innerHTML = [
    ["Goal", policy.goal],
    ["Stage", `${state.run.stage} / turn ${state.run.turn}`],
    ["Policy", state.run.lastDecision === "not-started" ? policy.tactic : state.run.lastDecision],
    ["Stop rule", policy.guardrail],
  ].map(([label, value]) => `<div class="kernel-card"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`).join("");
  document.getElementById("candidateState").textContent = `${state.candidate.state} (${state.run.progress}%)`;
  document.getElementById("objection").textContent = state.candidate.objection;
  document.getElementById("nextBestAction").textContent = state.candidate.action;
  if (resetThread) startThread(); else renderThread();
}

function renderThread() {
  const thread = document.getElementById("thread");
  thread.innerHTML = state.messages.map((message) => `<div class="message ${message.sender}"><div class="message-meta">${message.sender === "agent" ? escapeHtml(state.configured.persona.name) : escapeHtml(state.configured.context.candidateName)}</div><div class="bubble">${escapeHtml(message.text)}</div></div>`).join("");
  thread.scrollTop = thread.scrollHeight;
}

function writeReasoning(lines) {
  document.getElementById("reasoningLog").textContent = lines.join("\n");
}

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

function firstSentence(text) {
  return (text.split(/[.!?]/).find(Boolean) || text).trim();
}

function splitList(text) {
  return text.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

function keywords(text, limit = 6) {
  const stop = new Set(["the", "and", "with", "that", "this", "from", "have", "for", "you", "your", "into", "role", "team", "company", "builds", "build", "work", "people", "senior", "hiring", "profile", "profiles", "candidate", "currently", "systems", "engineers"]);
  return [...new Set((text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []))]
    .filter((word) => !stop.has(word))
    .slice(0, limit);
}

function mergeUnique(existing, incoming) {
  return [...new Set([...(existing || []), ...(incoming || [])])].slice(0, 8);
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function titleCase(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

document.getElementById("configureAgent").addEventListener("click", configureAgent);
document.getElementById("resetDemo").addEventListener("click", resetDemo);
document.getElementById("startThread").addEventListener("click", startThread);
document.getElementById("agentStep").addEventListener("click", agentStep);
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


