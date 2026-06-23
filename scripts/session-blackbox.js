const MODULE_ID = "session-blackbox";
const DEBUG = true;
const MAX_BUFFER_ENTRIES = 10000;
const SLOW_CAPTURE_MS = 2;
const PRIVATE_ROLL_MODES = new Set(["blindroll", "gmroll", "selfroll"]);

const buffer = [];
const seenIds = new Set();
let totalCaptured = 0;
let droppedEntries = 0;

function debug(...args) {
  if (DEBUG) {
    console.debug(`[${MODULE_ID}]`, ...args);
  }
}

function cloneValue(value) {
  if (value == null) {
    return value;
  }

  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getId(document) {
  return document?.id ?? document?._id ?? null;
}

function getMessageIdentifier(message) {
  return getId(message) ?? message?.uuid ?? null;
}

function getUserId(user) {
  if (!user) {
    return null;
  }

  return typeof user === "string" ? user : user.id ?? null;
}

function compactRecipients(recipients) {
  return recipients.map((recipient) => getUserId(recipient) ?? recipient?._id ?? null);
}

function getRollMode(message) {
  return message?.rollMode
    ?? message?.flags?.core?.rollMode
    ?? message?.getFlag?.("core", "rollMode")
    ?? null;
}

function toIsoTimestamp(timestamp) {
  return typeof timestamp === "number" && Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : null;
}

function compactDie(die) {
  return {
    faces: die?.faces ?? null,
    number: die?.number ?? null,
    results: asArray(die?.results).map((result) => ({
      result: result?.result ?? result?.value ?? null,
      active: result?.active ?? null,
      discarded: result?.discarded ?? null
    }))
  };
}

function parseRoll(roll) {
  if (typeof roll !== "string") {
    return roll;
  }

  try {
    return JSON.parse(roll);
  } catch (error) {
    debug("Could not parse roll JSON", error);
    return { result: roll };
  }
}

function compactRoll(roll, index) {
  const parsedRoll = parseRoll(roll);

  return {
    index,
    formula: parsedRoll?.formula ?? null,
    total: parsedRoll?.total ?? null,
    result: parsedRoll?.result ?? null,
    dice: asArray(parsedRoll?.dice).map(compactDie)
  };
}

function compactMessage(message, creatingUserId, source = "createChatMessage") {
  const timestamp = message?.timestamp ?? null;
  const speaker = message?.speaker ?? {};
  const rollMode = getRollMode(message);
  const recipients = asArray(message?.whisper);
  const isWhisper = recipients.length > 0;
  const blind = Boolean(message?.blind) || rollMode === "blindroll";
  const isPrivate = isWhisper || blind || PRIVATE_ROLL_MODES.has(rollMode);

  return {
    schemaVersion: 1,
    source,
    id: getId(message),
    uuid: message?.uuid ?? null,
    timestamp,
    createdAt: toIsoTimestamp(timestamp),
    capturedAt: new Date().toISOString(),
    creatingUserId: creatingUserId ?? null,
    userId: getUserId(message?.user) ?? message?.author?.id ?? null,
    speaker: {
      alias: speaker?.alias ?? null,
      actor: speaker?.actor ?? null,
      token: speaker?.token ?? null,
      scene: speaker?.scene ?? null
    },
    type: message?.type ?? null,
    style: message?.style ?? null,
    rollMode,
    whisper: {
      isWhisper,
      recipients: compactRecipients(recipients)
    },
    blind,
    private: isPrivate,
    content: isPrivate ? null : message?.content ?? null,
    flavor: isPrivate ? null : message?.flavor ?? null,
    contentOmitted: isPrivate,
    rolls: asArray(message?.rolls).map(compactRoll)
  };
}

function trimBuffer() {
  const overflow = buffer.length - MAX_BUFFER_ENTRIES;
  if (overflow > 0) {
    buffer.splice(0, overflow);
    droppedEntries += overflow;
  }
}

function appendEntry(entry) {
  const identifier = getMessageIdentifier(entry);

  if (identifier) {
    seenIds.add(identifier);
  }

  buffer.push(entry);
  totalCaptured += 1;
  trimBuffer();
}

function toJsonl() {
  return buffer.map((entry) => JSON.stringify(entry)).join("\n");
}

function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}

function getJsonlByteLength(jsonl) {
  return new TextEncoder().encode(jsonl).length;
}

function getStats() {
  const size = buffer.length;
  const jsonlBytes = getJsonlByteLength(toJsonl());
  const avgBytesPerEntry = size > 0 ? jsonlBytes / size : 0;

  return {
    size,
    maxEntries: MAX_BUFFER_ENTRIES,
    totalCaptured,
    droppedEntries,
    jsonlBytes,
    jsonlKB: roundToTwoDecimals(jsonlBytes / 1024),
    jsonlMB: roundToTwoDecimals(jsonlBytes / 1024 / 1024),
    avgBytesPerEntry,
    avgKBPerEntry: size > 0 ? roundToTwoDecimals(avgBytesPerEntry / 1024) : 0
  };
}

function onCreateChatMessage(message, options, userId) {
  const startedAt = performance.now();

  try {
    if (!globalThis.game?.user?.isGM) {
      debug("Skipping capture because this client is not GM.");
      return;
    }

    const identifier = getMessageIdentifier(message);

    if (identifier && seenIds.has(identifier)) {
      debug("Skipping duplicate chat message capture", { id: identifier });
      return;
    }

    const entry = compactMessage(message, userId);
    appendEntry(entry);
    debug("Captured chat message", { id: entry.id, size: buffer.length });
  } catch (error) {
    console.warn(`[${MODULE_ID}] Failed to capture chat message.`, error);
  } finally {
    const elapsedMs = performance.now() - startedAt;

    if (elapsedMs > SLOW_CAPTURE_MS) {
      console.warn(`[${MODULE_ID}] Chat message capture took ${elapsedMs.toFixed(2)}ms.`);
    }
  }
}

function onPreDeleteChatMessage(message) {
  try {
    if (!globalThis.game?.user?.isGM) {
      debug("Skipping pre-delete capture because this client is not GM.");
      return;
    }

    const identifier = getMessageIdentifier(message);

    if (!identifier) {
      debug("Skipping pre-delete fallback because message has no stable identifier.");
      return;
    }

    if (seenIds.has(identifier)) {
      debug("Skipping duplicate pre-delete fallback", { id: identifier });
      return;
    }

    const entry = compactMessage(message, null, "preDeleteChatMessage");
    appendEntry(entry);
    debug("Captured pre-delete fallback chat message", { id: entry.id, size: buffer.length });
  } catch (error) {
    console.warn(`[${MODULE_ID}] Failed to capture pre-delete chat message fallback.`, error);
  }
}

function exposeDebugApi() {
  globalThis.SessionBlackbox = Object.freeze({
    size() {
      return buffer.length;
    },
    getLast() {
      return cloneValue(buffer.at(-1) ?? null);
    },
    getBuffer() {
      return cloneValue(buffer);
    },
    toJsonl,
    stats() {
      return getStats();
    },
    clear() {
      buffer.length = 0;
      seenIds.clear();
      totalCaptured = 0;
      droppedEntries = 0;
    }
  });
}

Hooks.once("ready", () => {
  if (!globalThis.game?.user?.isGM) {
    debug("Client is not GM; chat capture hook was not registered.");
    return;
  }

  exposeDebugApi();
  Hooks.on("createChatMessage", onCreateChatMessage);
  Hooks.on("preDeleteChatMessage", onPreDeleteChatMessage);
  debug("GM chat capture hooks registered.");
});
