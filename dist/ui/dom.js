import { configureAgent, initialCandidate, initialRun, runAgentCycle } from "../domain/agent.js";
import { escapeHtml, titleCase } from "../domain/text.js";
import { presets } from "../data/profiles.js";
const formIds = [
    "companyName", "website", "companyContext", "culture", "hiringProfiles",
    "role", "candidateName", "candidateProfile", "tone", "cta", "intent",
];
const app = {
    config: null,
    run: { ...initialRun },
    candidate: { ...initialCandidate },
    messages: [],
};
export function initApp() {
    bindEvents();
    rebuildAgent(true);
}
function bindEvents() {
    byId("configureAgent").addEventListener("click", () => rebuildAgent(true));
    byId("resetDemo").addEventListener("click", () => applyPreset("robotics"));
    byId("startThread").addEventListener("click", startThread);
    byId("agentStep").addEventListener("click", agentStep);
    byId("sendReply").addEventListener("click", sendReply);
    document.querySelectorAll(".quick-replies button").forEach((button) => {
        button.addEventListener("click", () => respondToCandidate(button.dataset.reply || ""));
    });
    document.querySelectorAll("[data-preset]").forEach((button) => {
        button.addEventListener("click", () => applyPreset(button.dataset.preset || "robotics"));
    });
    document.querySelectorAll(".nav-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".nav-tab").forEach((item) => item.classList.remove("active"));
            document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
            tab.classList.add("active");
            byId(`${tab.dataset.view}View`).classList.add("active");
        });
    });
    formIds.forEach((id) => byId(id).addEventListener("change", () => rebuildAgent(true)));
}
function rebuildAgent(autoStart) {
    app.config = configureAgent(readContext());
    app.run = { ...initialRun };
    app.candidate = { ...initialCandidate };
    app.messages = [];
    renderAll();
    if (autoStart)
        startThread();
}
function startThread() {
    if (!app.config)
        rebuildAgent(false);
    app.run = { ...initialRun };
    app.candidate = { ...initialCandidate };
    app.messages = [];
    runAndCommit({ type: "start", text: "conversation opened" });
}
function agentStep() {
    runAndCommit({ type: "silence", text: "no candidate reply" });
}
function sendReply() {
    const input = byId("candidateReply");
    const reply = input.value.trim();
    if (!reply)
        return;
    respondToCandidate(reply);
    input.value = "";
}
function respondToCandidate(reply) {
    if (!reply)
        return;
    app.messages.push({ sender: "candidate", text: reply });
    runAndCommit({ type: "candidate-reply", text: reply });
}
function runAndCommit(event) {
    if (!app.config)
        return;
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
function readContext() {
    const values = Object.fromEntries(formIds.map((id) => [id, field(id).value.trim()]));
    return {
        ...values,
        tone: values.tone,
        cta: values.cta,
    };
}
function applyPreset(key) {
    const preset = presets[key] ?? presets["robotics"];
    if (!preset)
        return;
    Object.entries(preset).forEach(([id, value]) => {
        field(id).value = value;
    });
    rebuildAgent(true);
}
function renderAll() {
    const config = app.config;
    if (!config)
        return;
    const { context, persona, intelligence, policy, sequence, scores } = config;
    byId("agentName").textContent = persona.name;
    byId("agentInitials").textContent = persona.initials;
    byId("agentInitials").style.background = persona.color;
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
function renderThread() {
    const config = app.config;
    if (!config)
        return;
    const thread = byId("thread");
    thread.innerHTML = app.messages
        .map((message) => `<div class="message ${message.sender}"><div class="message-meta">${message.sender === "agent" ? escapeHtml(config.persona.name) : escapeHtml(config.context.candidateName)}</div><div class="bubble">${escapeHtml(message.text)}</div></div>`)
        .join("");
    thread.scrollTop = thread.scrollHeight;
}
function writeReasoning(lines) {
    byId("reasoningLog").textContent = lines.join("\n");
}
function field(id) {
    return byId(id);
}
function byId(id) {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Missing element: ${id}`);
    return element;
}
