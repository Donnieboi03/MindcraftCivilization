// src/utils/mentions.js  (ESM)
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function buildAliasMap(knownBots = [], aliasesByBot = {}) {
  const map = new Map();
  for (const name of knownBots) {
    map.set(String(name).toLowerCase(), String(name));
    const aliases = Array.isArray(aliasesByBot[name]) ? aliasesByBot[name] : [];
    for (const a of aliases) map.set(String(a).toLowerCase(), String(name));
  }
  return map;
}

/**
 * hadMention: did the message contain ANY known bot/alias?
 * addressed: does it address *this* bot?
 * command: cleaned message
 */
export function extractTargetsAndCommand(
  message,
  { thisBotName, knownBots = [], aliasesByBot = {} } = {}
) {
  const original = String(message ?? "");
  const aliasMap = buildAliasMap(knownBots, aliasesByBot);
  const namesAlt = Array.from(aliasMap.keys())
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join("|");

  if (!namesAlt) {
    return { addressed: true, targets: [], command: original.trim(), hadMention: false };
  }

  const mentionRe = new RegExp(`\\b@?(?:${namesAlt})\\b`, "gi");
  const mentions = new Set();
  let m;
  while ((m = mentionRe.exec(original)) !== null) {
    const key = m[0].replace(/^@/, "").toLowerCase();
    const canonical = aliasMap.get(key);
    if (canonical) mentions.add(canonical);
  }

  const hadMention = mentions.size > 0;
  if (!hadMention) return { addressed: false, targets: [], command: "", hadMention: false };

  // Strip leading list of mentions
  const startHeaderRe = new RegExp(
    `^(?:\\s*@?(?:${namesAlt})\\s*(?:,|\\band\\b|&)?\\s*)+[:,-]?\\s*`,
    "i"
  );
  const strippedStart = original.replace(startHeaderRe, "").trim();

  // Fallback inline cleanup
  const inlineCleanupRe = new RegExp(`\\b@?(?:${namesAlt})\\b\\s*[:,]?\\s*`, "gi");
  const cleaned =
    strippedStart.length > 0
      ? strippedStart
      : original.replace(inlineCleanupRe, "").trim();

  const addressed = thisBotName ? mentions.has(thisBotName) : true;

  return {
    addressed,
    targets: Array.from(mentions),
    command: cleaned || original.trim(),
    hadMention: true
  };
}

/** Returns {matched:boolean, cleaned:string} for proximity trigger phrases */
export function stripProximityTriggerPrefix(message, triggers = []) {
  const original = String(message ?? "");
  if (!triggers?.length) return { matched: false, cleaned: original.trim() };

  // Build a prefix regex like: ^\s*(?:hey guys|hey team|hey bots)\b[:,.!-]*\s*
  const alt = triggers
    .map(s => escapeRegex(String(s).trim()))
    .sort((a, b) => b.length - a.length)
    .join("|");

  const re = new RegExp(`^\\s*(?:${alt})\\b[:,.!-]*\\s*`, "i");
  if (re.test(original)) {
    return { matched: true, cleaned: original.replace(re, "").trim() };
  }
  return { matched: false, cleaned: original.trim() };
}
