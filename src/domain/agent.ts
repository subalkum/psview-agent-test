import { ctaCopy, toneProfiles, traitCopy } from "../data/profiles.js";
import type {
  AgentConfig,
  AgentCycleResult,
  AgentDecision,
  AgentEvent,
  AgentPolicy,
  CandidateModel,
  CompanyContext,
  CompanyIntelligence,
  Observation,
  Persona,
  RunState,
  SequenceStep,
  ToneProfile,
} from "./types.js";
import { firstSentence, keywords, mergeUnique, splitList } from "./text.js";

export const initialRun: RunState = {
  turn: 0,
  stage: "configured",
  followups: 0,
  progress: 0,
  lastObservation: "context loaded",
  lastDecision: "awaiting-start",
};

export const initialCandidate: CandidateModel = {
  state: "Unknown",
  objection: "None",
  action: "Start",
  sentiment: 0,
  intent: "unseen",
  signals: [],
  learned: [],
};

export function configureAgent(context: CompanyContext): AgentConfig {
  const tone = toneProfiles[context.tone] || toneProfiles["direct-warm"];
  const companyTerms = keywords(`${context.companyContext} ${context.culture} ${context.hiringProfiles}`, 8);
  const candidateTerms = keywords(context.candidateProfile, 6);
  const cta = ctaCopy[context.cta] || ctaCopy.intro;
  const persona = buildPersona(context, tone);
  const intelligence = interpretCompany(context, companyTerms, candidateTerms);
  const policy = buildPolicy(context, cta);
  const sequence = buildSequence(context, persona, policy, intelligence, companyTerms, candidateTerms);

  return {
    context,
    persona,
    intelligence,
    policy,
    sequence,
    scores: {
      fit: Math.min(99, 80 + companyTerms.length + candidateTerms.length * 2),
      voice: context.tone === "high-energy" ? 88 : 94,
      agency: 94,
    },
    companyTerms,
    candidateTerms,
  };
}

export function runAgentCycle(
  config: AgentConfig,
  currentRun: RunState,
  currentCandidate: CandidateModel,
  event: AgentEvent,
): AgentCycleResult {
  const observation = observe(currentRun, event);
  const inferred = inferCandidate(currentRun, observation);
  const decision = chooseAction(config.policy, currentRun, inferred, observation);
  const learned = mergeUnique(currentCandidate.learned, inferred.learned);
  const candidate: CandidateModel = {
    ...inferred,
    action: decision.actionLabel,
    learned,
  };
  const run: RunState = {
    turn: currentRun.turn + 1,
    stage: decision.stage,
    followups: decision.followups,
    progress: decision.progress,
    lastObservation: observation.summary,
    lastDecision: decision.actionLabel,
  };
  const message = composeMessage(config, decision);

  return { ...decision, observation, candidateModel: inferred, message, run, candidate };
}

function buildPersona(context: CompanyContext, tone: ToneProfile): Persona {
  return {
    name: `${tone.agentName}, ${context.companyName} talent agent`,
    initials: tone.agentName.slice(0, 2).toUpperCase(),
    headline: tone.headline,
    voice: tone.voice,
    principle: tone.principle,
    traits: tone.traits.map((trait) => ({ trait, copy: traitCopy[trait] || trait })),
    color: tone.color,
    modifier: tone.modifier,
  };
}

function interpretCompany(context: CompanyContext, companyTerms: string[], candidateTerms: string[]): CompanyIntelligence {
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

function buildPolicy(context: CompanyContext, cta: string): AgentPolicy {
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

function buildSequence(
  context: CompanyContext,
  persona: Persona,
  policy: AgentPolicy,
  intelligence: CompanyIntelligence,
  companyTerms: string[],
  candidateTerms: string[],
): SequenceStep[] {
  const cultureProof = intelligence.culture.slice(0, 3).join(", ") || context.culture;
  const candidateHook = candidateTerms.length ? `your work around ${candidateTerms.slice(0, 2).join(" and ")}` : "your background";
  const termLine = companyTerms.length ? companyTerms.slice(0, 4).join(", ") : "the company's core problems";
  return [
    {
      step: "01",
      title: "First touch",
      why: "Earn attention by tying candidate history to concrete company work.",
      copy: persona.modifier(`${context.candidateName}, I am reaching out from ${context.companyName} because ${candidateHook} looks unusually relevant to our ${context.role} search.\n\n${intelligence.proof}. The reason I think this might be worth a real conversation: the team values ${cultureProof}, and this role sits close to the hardest product decisions.\n\nWould a ${policy.cta} be worth considering?`),
    },
    {
      step: "02",
      title: "Proof follow-up",
      why: "If no reply, the agent adds substance instead of repeating the ask.",
      copy: persona.modifier(`A bit more context: ${context.companyName} is looking for people who can operate around ${termLine}, not just people with the right title.\n\nThe fit I am testing is whether ${context.role} gives you more ownership and more real-world impact than your current lane.`),
    },
    {
      step: "03",
      title: "Low-pressure nudge",
      why: "The agent lowers commitment for passive candidates and offers a sharper test.",
      copy: persona.modifier(`No need to be actively looking. The useful next step is only a ${policy.cta} where we pressure-test scope, team quality, and whether the problems are actually interesting to you.\n\nIf it is not differentiated, I will say so directly.`),
    },
    {
      step: "04",
      title: "Stop rule",
      why: "Autonomous agents should know when to stop.",
      copy: persona.modifier(`I do not want to keep nudging if timing is wrong. I can close the loop here; the only reason to continue is if the ${context.role} scope at ${context.companyName} is worth comparing against your current path.`),
    },
  ];
}

function observe(run: RunState, event: AgentEvent): Observation {
  if (event.type === "start") return { type: "start", text: event.text, summary: "thread started; no candidate signal yet" };
  if (event.type === "silence") return { type: "silence", text: event.text, summary: `silence after ${run.followups} follow-up(s)` };
  return { type: "candidate-reply", text: event.text, summary: `candidate replied: ${event.text}` };
}

function inferCandidate(run: RunState, observation: Observation): CandidateModel {
  if (observation.type === "start") {
    return { state: "Uncontacted", objection: "None", action: "Infer", sentiment: 0, intent: "unseen", signals: ["no prior reply"], learned: [] };
  }
  if (observation.type === "silence") {
    const followups = run.followups + 1;
    return {
      state: followups > 2 ? "Closed" : "Unresponsive",
      action: "Infer",
      objection: followups > 2 ? "No signal" : "Unknown",
      sentiment: followups > 2 ? -2 : -1,
      intent: "silent",
      signals: [`silence_count=${followups}`],
      learned: followups > 1 ? ["candidate has not engaged after multiple touches"] : [],
    };
  }

  const text = observation.text.toLowerCase();
  const signals: string[] = [];
  const learned: string[] = [];
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
  return { state: candidateState, objection, action: "Infer", sentiment, intent, signals, learned };
}

function chooseAction(policy: AgentPolicy, run: RunState, candidate: CandidateModel, observation: Observation): AgentDecision {
  if (observation.type === "start") return decision("Start outreach", "first-touch", 12, run.followups, policy.actions.start || "Send first touch.");
  if (observation.type === "silence") {
    const nextFollowups = run.followups + 1;
    if (nextFollowups > policy.maxFollowups) return decision("Stop sequence", "closed", 0, nextFollowups, policy.actions.exit || "Stop.");
    return decision(nextFollowups === 1 ? "Send proof follow-up" : "Send final low-pressure nudge", "follow-up", 18 + nextFollowups * 8, nextFollowups, policy.actions.followup || "Follow up.");
  }
  if (candidate.intent === "negative") return decision("Exit", "closed", 0, run.followups, policy.actions.exit || "Exit.");
  if (candidate.intent === "positive") return decision("Advance to scheduling", "scheduling", 85, run.followups, policy.actions.advance || "Advance.");
  if (candidate.intent === "warm-timing" || candidate.intent === "passive") return decision("Lower commitment", "nurture", 46, run.followups, policy.actions.lower || "Lower commitment.");
  if (candidate.intent === "skeptical") return decision("Prove differentiation", "proof", 54, run.followups, policy.actions.prove || "Prove.");
  if (candidate.intent === "evaluating") return decision("Clarify scope", "qualification", 66, run.followups, policy.actions.clarify || "Clarify.");
  return decision("Ask diagnostic question", "diagnose", 35, run.followups, "Ask one useful question and keep the thread moving.");
}

function decision(actionLabel: string, stage: string, progress: number, followups: number, rationale: string): AgentDecision {
  return { actionLabel, stage, progress, followups, rationale };
}

function composeMessage(config: AgentConfig, decision: AgentDecision): string {
  const { context, persona, policy, intelligence, sequence, companyTerms, candidateTerms } = config;
  let response: string;
  if (decision.actionLabel === "Start outreach") response = sequence[0]?.copy || "";
  else if (decision.actionLabel === "Send proof follow-up") response = sequence[1]?.copy || "";
  else if (decision.actionLabel === "Send final low-pressure nudge") response = sequence[2]?.copy || "";
  else if (decision.actionLabel === "Stop sequence" || decision.actionLabel === "Exit") response = `Understood. I will close the loop here and will not keep nudging.\n\nIf your priorities change later, the most relevant angle would be ${context.role} work at ${context.companyName}, but no reply needed now.`;
  else if (decision.actionLabel === "Advance to scheduling") response = `${context.candidateName}, useful signal. I would keep the first conversation narrow: what ${context.companyName} is building, why ${context.role} is open now, and whether the scope is genuinely stronger than your current path.\n\nWould Tuesday or Wednesday be easier for a ${policy.cta}?`;
  else if (decision.actionLabel === "Prove differentiation") response = `Fair filter. The differentiated part is not "${context.companyName} is a startup." It is that ${intelligence.proof.toLowerCase()}.\n\nThe role is close to ${companyTerms.slice(0, 3).join(", ")} decisions, so the conversation should get specific fast. If that bar is not met, you should pass.`;
  else if (decision.actionLabel === "Clarify scope") response = `That is the right filter. I would frame the role around three questions: what decisions you own, how close you are to production reality, and whether ${context.companyName} can give you leverage beyond implementation.\n\nI would rather validate level and scope early than sell you a vague opportunity. Want the first conversation to be only about that?`;
  else if (decision.actionLabel === "Lower commitment") response = `Makes sense. I am not treating this as a job-search signal. The ask is only to compare the problem quality against where you are now.\n\nGiven your ${candidateTerms.slice(0, 2).join(" and ") || "background"}, the useful question is whether ${context.role} creates a meaningful jump in ownership or mission.`;
  else response = `${context.candidateName}, that helps. The signal I am hearing is that fit depends on whether the actual work matches the pitch.\n\nWhat would you need to see for this to be worth a ${policy.cta}: scope, team quality, compensation, or the actual technical problem?`;
  return persona.modifier(response);
}

