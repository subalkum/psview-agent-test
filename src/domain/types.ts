export type ToneKey = "direct-warm" | "technical" | "founder" | "operator" | "high-energy";
export type CtaKey = "intro" | "technical" | "coffee" | "founder";

export interface CompanyContext {
  companyName: string;
  website: string;
  companyContext: string;
  culture: string;
  hiringProfiles: string;
  role: string;
  candidateName: string;
  candidateProfile: string;
  tone: ToneKey;
  cta: CtaKey;
  intent: string;
}

export interface ToneProfile {
  agentName: string;
  headline: string;
  voice: string;
  principle: string;
  traits: string[];
  color: string;
  modifier: (text: string) => string;
}

export interface Persona {
  name: string;
  initials: string;
  headline: string;
  voice: string;
  principle: string;
  traits: Array<{ trait: string; copy: string }>;
  color: string;
  modifier: (text: string) => string;
}

export interface CompanyIntelligence {
  thesis: string;
  proof: string;
  culture: string[];
  hiring: string[];
  candidateHook: string;
  companyHooks: string[];
  memory: string[];
}

export interface AgentPolicy {
  goal: string;
  success: string;
  tactic: string;
  risk: string;
  guardrail: string;
  cta: string;
  maxFollowups: number;
  playbook: Array<{ trigger: string; action: string; rule: string }>;
  actions: Record<string, string>;
}

export interface SequenceStep {
  step: string;
  title: string;
  why: string;
  copy: string;
}

export interface AgentConfig {
  context: CompanyContext;
  persona: Persona;
  intelligence: CompanyIntelligence;
  policy: AgentPolicy;
  sequence: SequenceStep[];
  scores: { fit: number; voice: number; agency: number };
  companyTerms: string[];
  candidateTerms: string[];
}

export interface CandidateModel {
  state: string;
  objection: string;
  action: string;
  sentiment: number;
  intent: string;
  signals: string[];
  learned: string[];
}

export interface RunState {
  turn: number;
  stage: string;
  followups: number;
  progress: number;
  lastObservation: string;
  lastDecision: string;
}

export interface AgentEvent {
  type: "start" | "silence" | "candidate-reply";
  text: string;
}

export interface Observation {
  type: AgentEvent["type"];
  text: string;
  summary: string;
}

export interface AgentDecision {
  actionLabel: string;
  stage: string;
  progress: number;
  followups: number;
  rationale: string;
}

export interface AgentCycleResult extends AgentDecision {
  observation: Observation;
  candidateModel: CandidateModel;
  message: string;
  run: RunState;
  candidate: CandidateModel;
}
