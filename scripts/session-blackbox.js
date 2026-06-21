const MODULE_ID = "session-blackbox";
const DEBUG = true;
const MAX_BUFFER_SIZE = 5000;
const SLOW_CAPTURE_MS = 2;
const PRIVATE_ROLL_MODES = new Set(["blindroll", "gmroll", "selfroll"]);

const buffer = [];

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

function compactMessage(message, creatingUserId) {
  const timestamp = message?.timestamp ?? null;
  const speaker = message?.speaker ?? {};
  const rollMode = getRollMode(message);
  const recipients = asArray(message?.whisper);
  const isWhisper = recipients.length > 0;
  const blind = Boolean(message?.blind) || rollMode === "blindroll";
  const isPrivate = isWhisper || blind || PRIVATE_ROLL_MODES.has(rollMode);

  return {
    schemaVersion: 1,
    source: "createChatMessage",
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
  const overflow = buffer.length - MAX_BUFFER_SIZE;
  if (overflow > 0) {
    buffer.splice(0, overflow);
  }
}

function onCreateChatMessage(message, options, userId) {
  const startedAt = performance.now();

  try {
    if (!globalThis.game?.user?.isGM) {
      debug("Skipping capture because this client is not GM.");
      return;
    }

    const entry = compactMessage(message, userId);
    buffer.push(entry);
    trimBuffer();
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
    clear() {
      buffer.length = 0;
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
  debug("GM chat capture hook registered.");
});
