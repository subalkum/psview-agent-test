import { configureAgent, initialCandidate, initialRun, runAgentCycle } from "../domain/agent.js";
import type { AgentConfig, AgentEvent, CandidateModel, CompanyContext, RunState } from "../domain/types.js";
import { escapeHtml, titleCase } from "../domain/text.js";
import { presets } from "../data/profiles.js";

type Message = { sender: "agent" | "candidate"; text: string };

const formIds = [
  "companyName", "website", "companyContext", "culture", "hiringProfiles",
  "role", "candidateName", "candidateProfile", "tone", "cta", "intent",
] as const satisfies readonly (keyof CompanyContext)[];

const app = {
  config: null as AgentConfig | null,
  run: { ...initialRun } as RunState,
  candidate: { ...initialCandidate } as CandidateModel,
  messages: [] as Message[],
};

export function initApp(): void {
  bindEvents();
  rebuildAgent(true);
}

function bindEvents(): void {
  byId("configureAgent").addEventListener("click", () => rebuildAgent(true));
  byId("resetDemo").addEventListener("click", () => applyPreset("robotics"));
  byId("startThread").addEventListener("click", startThread);
  byId("agentStep").addEventListener("click", agentStep);
  byId("sendReply").addEventListener("click", sendReply);

  document.querySelectorAll<HTMLButtonElement>(".quick-replies button").forEach((button) => {
    button.addEventListener("click", () => respondToCandidate(button.dataset.reply || ""));
  });

  document.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.preset || "robotics"));
  });

  document.querySelectorAll<HTMLButtonElement>(".nav-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".nav-tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
      tab.classList.add("active");
      byId(`${tab.dataset.view}View`).classList.add("active");
    });
  });

  formIds.forEach((id) => byId(id).addEventListener("change", () => rebuildAgent(true)));
}

function rebuildAgent(autoStart: boolean): void {
  app.config = configureAgent(readContext());
  app.run = { ...initialRun };
  app.candidate = { ...initialCandidate };
  app.messages = [];
  renderAll();
  if (autoStart) startThread();
}

function startThread(): void {
  if (!app.config) rebuildAgent(false);
  app.run = { ...initialRun };
  app.candidate = { ...initialCandidate };
  app.messages = [];
  runAndCommit({ type: "start", text: "conversation opened" });
}

function agentStep(): void {
  runAndCommit({ type: "silence", text: "no candidate reply" });
}

function sendReply(): void {
  const input = byId<HTMLTextAreaElement>("candidateReply");
  const reply = input.value.trim();
  if (!reply) return;
  respondToCandidate(reply);
  input.value = "";
}

function respondToCandidate(reply: string): void {
  if (!reply) return;
  app.messages.push({ sender: "candidate", text: reply });
  runAndCommit({ type: "candidate-reply", text: reply });
}

function runAndCommit(event: AgentEvent): void {
  if (!app.config) return;
  const result = runAgentCycle(app.config, app.run, app.candidate, event);
  app.run = result.run;
  app.candidate = result.candidate;
  app.messages.push({ sender: "agent", text: result.message });
  writeReasoning([
    `observe: ${result.observation.summary}`,
    `infer: state=${result.candidateModel.state}; intent=${result.candidateModel.intent}; objection=${result.candidateModel.objection}; sentiment=${result.candidateModel.sentiment}; signals=${result.candidateModel.signals.join(", ")}`,
    `memory_update: ${result.candidateModel.learned.join(", ") || "none"}`,
    `choose: ${result.actionLabel}; stage=${result.stage}; progress=${result.progress}%`,
    `act: ${result.rationale}`,
  ]);
  renderAll();
}

function readContext(): CompanyContext {
  const values = Object.fromEntries(formIds.map((id) => [id, field(id).value.trim()])) as Record<keyof CompanyContext, string>;
  return {
    ...values,
    tone: values.tone as CompanyContext["tone"],
    cta: values.cta as CompanyContext["cta"],
  };
}

function applyPreset(key: string): void {
  const preset = presets[key] ?? presets["robotics"];
  if (!preset) return;
  (Object.entries(preset) as Array<[keyof CompanyContext, string]>).forEach(([id, value]) => {
    field(id).value = value;
  });
  rebuildAgent(true);
}

function renderAll(): void {
  const config = app.config;
  if (!config) return;
  const { context, persona, intelligence, policy, sequence, scores } = config;
  byId("agentName").textContent = persona.name;
  byId("agentInitials").textContent = persona.initials;
  byId<HTMLElement>("agentInitials").style.background = persona.color;
  byId("agentSummary").textContent = `${persona.headline}. Strategy: ${policy.tactic}.`;
  byId("fitScore").textContent = String(scores.fit);
  byId("voiceScore").textContent = String(scores.voice);
  byId("agencyScore").textContent = String(scores.agency);
  byId("personaHeadline").textContent = persona.headline;
  byId("personaSummary").textContent = persona.voice;
  byId("operatingPrinciple").textContent = persona.principle;
  byId("operatingCopy").textContent = `Objective: ${context.intent} Success condition: ${policy.success}. The agent runs observe -> infer -> choose -> act, and only generates copy after choosing an action.`;

  byId("traitGrid").innerHTML = persona.traits
    .map(({ trait, copy }) => `<div class="trait"><strong>${titleCase(trait)}</strong><p>${escapeHtml(copy)}</p></div>`)
    .join("");
  byId("playbookGrid").innerHTML = policy.playbook
    .map((item) => `<div class="playbook-card"><span>${escapeHtml(item.trigger)}</span><strong>${escapeHtml(item.action)}</strong><p>${escapeHtml(item.rule)}</p></div>`)
    .join("");
  byId("memoryList").innerHTML = intelligence.memory.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  byId("learnedMemoryList").innerHTML = (app.candidate.learned.length ? app.candidate.learned : ["No candidate-specific memory yet. The agent will learn from replies and silence."])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  byId("sequenceList").innerHTML = sequence
    .map((item) => `<article class="sequence-item"><div class="sequence-step"><span>${item.step}</span><h3>${escapeHtml(item.title)}</h3></div><div class="sequence-copy"><p>${escapeHtml(item.copy)}</p><p class="sequence-why">${escapeHtml(item.why)}</p></div></article>`)
    .join("");
  byId("kernelGrid").innerHTML = [
    ["Goal", policy.goal],
    ["Stage", `${app.run.stage} / turn ${app.run.turn}`],
    ["Policy", app.run.lastDecision === "not-started" ? policy.tactic : app.run.lastDecision],
    ["Stop rule", policy.guardrail],
  ].map(([label, value]) => `<div class="kernel-card"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`).join("");

  byId("candidateState").textContent = `${app.candidate.state} (${app.run.progress}%)`;
  byId("objection").textContent = app.candidate.objection;
  byId("nextBestAction").textContent = app.candidate.action;
  renderThread();
}

function renderThread(): void {
  const config = app.config;
  if (!config) return;
  const thread = byId("thread");
  thread.innerHTML = app.messages
    .map((message) => `<div class="message ${message.sender}"><div class="message-meta">${message.sender === "agent" ? escapeHtml(config.persona.name) : escapeHtml(config.context.candidateName)}</div><div class="bubble">${escapeHtml(message.text)}</div></div>`)
    .join("");
  thread.scrollTop = thread.scrollHeight;
}

function writeReasoning(lines: string[]): void {
  byId("reasoningLog").textContent = lines.join("\n");
}

function field(id: keyof CompanyContext): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return byId<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id);
}

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: ${id}`);
  return element as T;
}

