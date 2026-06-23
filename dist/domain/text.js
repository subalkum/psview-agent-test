export function firstSentence(text) {
    return (text.split(/[.!?]/).find(Boolean) || text).trim();
}
export function splitList(text) {
    return text.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}
export function keywords(text, limit = 6) {
    const stop = new Set([
        "the", "and", "with", "that", "this", "from", "have", "for", "you", "your",
        "into", "role", "team", "company", "builds", "build", "work", "people",
        "senior", "hiring", "profile", "profiles", "candidate", "currently", "systems", "engineers",
    ]);
    return [...new Set(text.toLowerCase().match(/[a-z][a-z-]{3,}/g) || [])]
        .filter((word) => !stop.has(word))
        .slice(0, limit);
}
export function mergeUnique(existing, incoming) {
    return [...new Set([...existing, ...incoming])].slice(0, 8);
}
export function titleCase(value) {
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
export function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
