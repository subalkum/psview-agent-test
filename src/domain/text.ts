export function firstSentence(text: string): string {
  return (text.split(/[.!?]/).find(Boolean) || text).trim();
}

export function splitList(text: string): string[] {
  return text.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

export function keywords(text: string, limit = 6): string[] {
  const stop = new Set([
    "the", "and", "with", "that", "this", "from", "have", "for", "you", "your",
    "into", "role", "team", "company", "builds", "build", "work", "people",
    "senior", "hiring", "profile", "profiles", "candidate", "currently", "systems", "engineers",
  ]);
  return [...new Set(text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || [])]
    .filter((word) => !stop.has(word))
    .slice(0, limit);
}

export function mergeUnique(existing: string[], incoming: string[]): string[] {
  return [...new Set([...existing, ...incoming])].slice(0, 8);
}

export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
