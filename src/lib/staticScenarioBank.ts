/**
 * Static Scenario Bank — Pre-authored interconnected scenarios.
 *
 * Two scenarios selected by room code (even/odd last char code).
 * Each scenario has 3 files forming a dependency chain (stage 1 → 2 → 3).
 */

import type { Scenario } from "@/types/scenario";

// ═══════════════════════════════════════════════════════════════
// SCENARIO A — Payment Processing Pipeline Down
// ═══════════════════════════════════════════════════════════════

const SCENARIO_A: Scenario = {
  description:
    "The payment processing pipeline is down. 3 services are failing: the config module has a syntax error, the validator has a logic bug, and the gateway has broken error handling. Fix them in order to restore payments.",
  files: [
    {
      id: "pay-config",
      fileName: "config.ts",
      label: "Payment Config",
      description:
        "Configuration module — missing bracket causes a syntax error preventing the system from loading.",
      buggyCode: `function getConfig() {
  const settings = {
    currency: "USD",
    maxAmount: 10000,
    minAmount: 1,
    retries: 3
  ;
  return settings;
}

function getTimeout() {
  return getConfig().retries * 1000;
}`,
      fixedCode: `function getConfig() {
  const settings = {
    currency: "USD",
    maxAmount: 10000,
    minAmount: 1,
    retries: 3
  };
  return settings;
}

function getTimeout() {
  return getConfig().retries * 1000;
}`,
      stage: 1,
      testCases: [
        {
          description: "getConfig returns an object with currency USD",
          assertion: `getConfig().currency === "USD"`,
        },
        {
          description: "getConfig returns maxAmount of 10000",
          assertion: `getConfig().maxAmount === 10000`,
        },
        {
          description: "getTimeout returns retries * 1000",
          assertion: `getTimeout() === 3000`,
        },
      ],
    },
    {
      id: "pay-validator",
      fileName: "validator.ts",
      label: "Payment Validator",
      description:
        "Validation module — wrong comparison operator causes all amounts to be rejected.",
      buggyCode: `function getConfig() {
  return { currency: "USD", maxAmount: 10000, minAmount: 1, retries: 3 };
}

function validateAmount(amount) {
  const config = getConfig();
  if (amount < config.minAmount || amount < config.maxAmount) {
    return { valid: false, error: "Amount out of range" };
  }
  return { valid: true, error: null };
}

function validatePayment(amount, currency) {
  const config = getConfig();
  if (currency !== config.currency) {
    return { valid: false, error: "Invalid currency" };
  }
  return validateAmount(amount);
}`,
      fixedCode: `function getConfig() {
  return { currency: "USD", maxAmount: 10000, minAmount: 1, retries: 3 };
}

function validateAmount(amount) {
  const config = getConfig();
  if (amount < config.minAmount || amount > config.maxAmount) {
    return { valid: false, error: "Amount out of range" };
  }
  return { valid: true, error: null };
}

function validatePayment(amount, currency) {
  const config = getConfig();
  if (currency !== config.currency) {
    return { valid: false, error: "Invalid currency" };
  }
  return validateAmount(amount);
}`,
      stage: 2,
      testCases: [
        {
          description: "Valid amount 500 USD passes validation",
          assertion: `validatePayment(500, "USD").valid === true`,
        },
        {
          description: "Amount 0 is rejected as out of range",
          assertion: `validatePayment(0, "USD").valid === false`,
        },
        {
          description: "Amount 50000 is rejected as out of range",
          assertion: `validatePayment(50000, "USD").valid === false`,
        },
        {
          description: "Wrong currency is rejected",
          assertion: `validatePayment(100, "EUR").valid === false`,
        },
      ],
    },
    {
      id: "pay-gateway",
      fileName: "gateway.ts",
      label: "Payment Gateway",
      description:
        "Gateway module — missing null check on validation result causes crashes on invalid payments.",
      buggyCode: `function validatePayment(amount, currency) {
  if (amount < 1 || amount > 10000) return { valid: false, error: "Amount out of range" };
  if (currency !== "USD") return { valid: false, error: "Invalid currency" };
  return { valid: true, error: null };
}

function processPayment(amount, currency) {
  const validation = validatePayment(amount, currency);
  const receipt = {
    id: "txn_" + Date.now(),
    amount: amount,
    status: "approved",
    error: validation.error
  };
  return receipt;
}

function getPaymentStatus(amount, currency) {
  const result = processPayment(amount, currency);
  return result.status;
}`,
      fixedCode: `function validatePayment(amount, currency) {
  if (amount < 1 || amount > 10000) return { valid: false, error: "Amount out of range" };
  if (currency !== "USD") return { valid: false, error: "Invalid currency" };
  return { valid: true, error: null };
}

function processPayment(amount, currency) {
  const validation = validatePayment(amount, currency);
  if (!validation.valid) {
    return { id: null, amount: amount, status: "rejected", error: validation.error };
  }
  const receipt = {
    id: "txn_" + Date.now(),
    amount: amount,
    status: "approved",
    error: null
  };
  return receipt;
}

function getPaymentStatus(amount, currency) {
  const result = processPayment(amount, currency);
  return result.status;
}`,
      stage: 3,
      testCases: [
        {
          description: "Valid payment returns approved status",
          assertion: `getPaymentStatus(100, "USD") === "approved"`,
        },
        {
          description: "Invalid amount returns rejected status",
          assertion: `getPaymentStatus(0, "USD") === "rejected"`,
        },
        {
          description: "Invalid currency returns rejected status",
          assertion: `getPaymentStatus(100, "EUR") === "rejected"`,
        },
      ],
    },
  ],
  dependencyGraph: {
    "pay-config": [],
    "pay-validator": ["pay-config"],
    "pay-gateway": ["pay-validator"],
  },
};

// ═══════════════════════════════════════════════════════════════
// SCENARIO B — Real-time Chat System Offline
// ═══════════════════════════════════════════════════════════════

const SCENARIO_B: Scenario = {
  description:
    "The real-time chat system is offline. The database layer has a typo crashing queries, the message queue has an off-by-one error dropping messages, and the chat server is missing a null check causing connection failures. Fix all 3 to restore chat.",
  files: [
    {
      id: "chat-database",
      fileName: "database.ts",
      label: "Chat Database",
      description:
        "Database layer — typo in method name causes all queries to crash.",
      buggyCode: `function createConnection() {
  return {
    connected: true,
    query: function(sql) {
      return { rows: [], count: 0 };
    }
  };
}

function getMessages(limit) {
  const conn = createConnection();
  const result = conn.qurey("SELECT * FROM messages LIMIT " + limit);
  return result.rows;
}

function getMessageCount() {
  const conn = createConnection();
  const result = conn.query("SELECT COUNT(*) FROM messages");
  return result.count;
}`,
      fixedCode: `function createConnection() {
  return {
    connected: true,
    query: function(sql) {
      return { rows: [], count: 0 };
    }
  };
}

function getMessages(limit) {
  const conn = createConnection();
  const result = conn.query("SELECT * FROM messages LIMIT " + limit);
  return result.rows;
}

function getMessageCount() {
  const conn = createConnection();
  const result = conn.query("SELECT COUNT(*) FROM messages");
  return result.count;
}`,
      stage: 1,
      testCases: [
        {
          description: "createConnection returns connected true",
          assertion: `createConnection().connected === true`,
        },
        {
          description: "getMessages returns an array without throwing",
          assertion: `Array.isArray(getMessages(10))`,
        },
        {
          description: "getMessageCount returns a number",
          assertion: `typeof getMessageCount() === "number"`,
        },
      ],
    },
    {
      id: "chat-queue",
      fileName: "messageQueue.ts",
      label: "Message Queue",
      description:
        "Message queue — off-by-one error causes the last message in a batch to be dropped.",
      buggyCode: `function createQueue() {
  var items = [];
  return {
    push: function(item) { items.push(item); },
    size: function() { return items.length; },
    getItems: function() { return items.slice(); }
  };
}

function processBatch(messages) {
  var queue = createQueue();
  for (var i = 0; i < messages.length - 1; i++) {
    queue.push(messages[i]);
  }
  return {
    processed: queue.size(),
    total: messages.length,
    items: queue.getItems()
  };
}

function getDroppedCount(messages) {
  var result = processBatch(messages);
  return result.total - result.processed;
}`,
      fixedCode: `function createQueue() {
  var items = [];
  return {
    push: function(item) { items.push(item); },
    size: function() { return items.length; },
    getItems: function() { return items.slice(); }
  };
}

function processBatch(messages) {
  var queue = createQueue();
  for (var i = 0; i < messages.length; i++) {
    queue.push(messages[i]);
  }
  return {
    processed: queue.size(),
    total: messages.length,
    items: queue.getItems()
  };
}

function getDroppedCount(messages) {
  var result = processBatch(messages);
  return result.total - result.processed;
}`,
      stage: 2,
      testCases: [
        {
          description: "processBatch processes all messages in a batch of 3",
          assertion: `processBatch(["a","b","c"]).processed === 3`,
        },
        {
          description: "No messages are dropped for a batch of 5",
          assertion: `getDroppedCount(["a","b","c","d","e"]) === 0`,
        },
        {
          description: "Single message batch is fully processed",
          assertion: `processBatch(["x"]).processed === 1`,
        },
      ],
    },
    {
      id: "chat-server",
      fileName: "chatServer.ts",
      label: "Chat Server",
      description:
        "Chat server — missing null check on user lookup causes crashes when sending to offline users.",
      buggyCode: `function getUser(userId) {
  var users = { u1: { name: "Alice", online: true }, u2: { name: "Bob", online: false } };
  return users[userId] || null;
}

function sendMessage(fromId, toId, text) {
  var sender = getUser(fromId);
  var receiver = getUser(toId);
  var status = receiver.online ? "delivered" : "queued";
  return {
    from: sender ? sender.name : "Unknown",
    to: receiver.name,
    text: text,
    status: status
  };
}

function canDeliver(fromId, toId) {
  var sender = getUser(fromId);
  var receiver = getUser(toId);
  if (!sender || !receiver) return false;
  return receiver.online;
}`,
      fixedCode: `function getUser(userId) {
  var users = { u1: { name: "Alice", online: true }, u2: { name: "Bob", online: false } };
  return users[userId] || null;
}

function sendMessage(fromId, toId, text) {
  var sender = getUser(fromId);
  var receiver = getUser(toId);
  if (!receiver) {
    return { from: sender ? sender.name : "Unknown", to: "Unknown", text: text, status: "failed" };
  }
  var status = receiver.online ? "delivered" : "queued";
  return {
    from: sender ? sender.name : "Unknown",
    to: receiver.name,
    text: text,
    status: status
  };
}

function canDeliver(fromId, toId) {
  var sender = getUser(fromId);
  var receiver = getUser(toId);
  if (!sender || !receiver) return false;
  return receiver.online;
}`,
      stage: 3,
      testCases: [
        {
          description: "Sending to online user returns delivered",
          assertion: `sendMessage("u1", "u1", "hi").status === "delivered"`,
        },
        {
          description: "Sending to offline user returns queued",
          assertion: `sendMessage("u1", "u2", "hi").status === "queued"`,
        },
        {
          description:
            "Sending to non-existent user returns failed instead of crashing",
          assertion: `sendMessage("u1", "u999", "hi").status === "failed"`,
        },
        {
          description: "canDeliver returns false for non-existent receiver",
          assertion: `canDeliver("u1", "u999") === false`,
        },
      ],
    },
  ],
  dependencyGraph: {
    "chat-database": [],
    "chat-queue": ["chat-database"],
    "chat-server": ["chat-queue"],
  },
};

// ═══════════════════════════════════════════════════════════════
// SCENARIO C — Inventory Management System Crash
// ═══════════════════════════════════════════════════════════════

const SCENARIO_C: Scenario = {
  description:
    "The inventory management system has crashed. The storage layer has a missing return statement, the stock calculator has a wrong operator, and the order processor fails to handle empty inventory. Fix all 3 to restore inventory tracking.",
  files: [
    {
      id: "inv-storage",
      fileName: "storage.ts",
      label: "Inventory Storage",
      description:
        "Storage layer — missing return statement causes all lookups to return undefined.",
      buggyCode: `function createStore() {
  var items = {};
  return {
    set: function(key, value) { items[key] = value; },
    get: function(key) { items[key]; },
    has: function(key) { return key in items; },
    getAll: function() { return Object.assign({}, items); }
  };
}

function initInventory() {
  var store = createStore();
  store.set("widget", { name: "Widget", qty: 100, price: 9.99 });
  store.set("gadget", { name: "Gadget", qty: 50, price: 24.99 });
  return store;
}`,
      fixedCode: `function createStore() {
  var items = {};
  return {
    set: function(key, value) { items[key] = value; },
    get: function(key) { return items[key]; },
    has: function(key) { return key in items; },
    getAll: function() { return Object.assign({}, items); }
  };
}

function initInventory() {
  var store = createStore();
  store.set("widget", { name: "Widget", qty: 100, price: 9.99 });
  store.set("gadget", { name: "Gadget", qty: 50, price: 24.99 });
  return store;
}`,
      stage: 1,
      testCases: [
        {
          description: "Store get returns the set value",
          assertion: `(function() { var s = createStore(); s.set("a", 42); return s.get("a") === 42; })()`,
        },
        {
          description: "initInventory returns a store with widget",
          assertion: `initInventory().get("widget").name === "Widget"`,
        },
        {
          description: "Store has returns true for existing key",
          assertion: `(function() { var s = createStore(); s.set("x", 1); return s.has("x") === true; })()`,
        },
      ],
    },
    {
      id: "inv-calculator",
      fileName: "calculator.ts",
      label: "Stock Calculator",
      description:
        "Calculator — multiplication used instead of addition when combining stock quantities.",
      buggyCode: `function calculateTotal(quantities) {
  var total = 0;
  for (var i = 0; i < quantities.length; i++) {
    total = total * quantities[i];
  }
  return total;
}

function getStockValue(qty, price) {
  return qty * price;
}

function isLowStock(qty, threshold) {
  if (threshold === undefined) threshold = 10;
  return qty < threshold;
}`,
      fixedCode: `function calculateTotal(quantities) {
  var total = 0;
  for (var i = 0; i < quantities.length; i++) {
    total = total + quantities[i];
  }
  return total;
}

function getStockValue(qty, price) {
  return qty * price;
}

function isLowStock(qty, threshold) {
  if (threshold === undefined) threshold = 10;
  return qty < threshold;
}`,
      stage: 2,
      testCases: [
        {
          description: "calculateTotal sums an array of numbers",
          assertion: `calculateTotal([10, 20, 30]) === 60`,
        },
        {
          description: "getStockValue returns qty times price",
          assertion: `getStockValue(5, 10) === 50`,
        },
        {
          description: "isLowStock returns true when qty below threshold",
          assertion: `isLowStock(3, 10) === true && isLowStock(15, 10) === false`,
        },
      ],
    },
    {
      id: "inv-orders",
      fileName: "orders.ts",
      label: "Order Processor",
      description:
        "Order processor — doesn't check if item exists before deducting stock, causing negative inventory.",
      buggyCode: `function getStock(itemName) {
  var inventory = { widget: 100, gadget: 50, gizmo: 0 };
  return inventory[itemName] !== undefined ? inventory[itemName] : -1;
}

function placeOrder(itemName, quantity) {
  var stock = getStock(itemName);
  var newStock = stock - quantity;
  return {
    item: itemName,
    ordered: quantity,
    remaining: newStock,
    status: "confirmed"
  };
}

function canFulfill(itemName, quantity) {
  var stock = getStock(itemName);
  return stock >= quantity;
}`,
      fixedCode: `function getStock(itemName) {
  var inventory = { widget: 100, gadget: 50, gizmo: 0 };
  return inventory[itemName] !== undefined ? inventory[itemName] : -1;
}

function placeOrder(itemName, quantity) {
  var stock = getStock(itemName);
  if (stock < 0 || stock < quantity) {
    return { item: itemName, ordered: 0, remaining: stock, status: "rejected" };
  }
  var newStock = stock - quantity;
  return {
    item: itemName,
    ordered: quantity,
    remaining: newStock,
    status: "confirmed"
  };
}

function canFulfill(itemName, quantity) {
  var stock = getStock(itemName);
  return stock >= quantity;
}`,
      stage: 3,
      testCases: [
        {
          description: "Valid order returns confirmed",
          assertion: `placeOrder("widget", 10).status === "confirmed"`,
        },
        {
          description: "Order for non-existent item returns rejected",
          assertion: `placeOrder("unknown", 1).status === "rejected"`,
        },
        {
          description: "Order exceeding stock returns rejected",
          assertion: `placeOrder("gizmo", 5).status === "rejected"`,
        },
      ],
    },
  ],
  dependencyGraph: {
    "inv-storage": [],
    "inv-calculator": ["inv-storage"],
    "inv-orders": ["inv-calculator"],
  },
};

// ═══════════════════════════════════════════════════════════════
// SCENARIO D — User Authentication Service Down
// ═══════════════════════════════════════════════════════════════

const SCENARIO_D: Scenario = {
  description:
    "The authentication service is completely down. The token generator has a syntax error, the session manager uses the wrong expiry check, and the auth middleware crashes on missing headers. Fix all 3 to restore user login.",
  files: [
    {
      id: "auth-token",
      fileName: "tokenGen.ts",
      label: "Token Generator",
      description:
        "Token generator — uses wrong string syntax, producing literal ${} in tokens instead of values.",
      buggyCode: `function generateToken(userId, role) {
  var timestamp = Date.now();
  var payload = userId + ":" + role + ":" + timestamp;
  var token = "tk_\${payload}";
  return token;
}

function parseToken(token) {
  var parts = token.replace("tk_", "").split(":");
  return {
    userId: parts[0],
    role: parts[1],
    timestamp: Number(parts[2])
  };
}

function isValidFormat(token) {
  return typeof token === "string" && token.startsWith("tk_") && token.split(":").length >= 3;
}`,
      fixedCode: `function generateToken(userId, role) {
  var timestamp = Date.now();
  var payload = userId + ":" + role + ":" + timestamp;
  var token = "tk_" + payload;
  return token;
}

function parseToken(token) {
  var parts = token.replace("tk_", "").split(":");
  return {
    userId: parts[0],
    role: parts[1],
    timestamp: Number(parts[2])
  };
}

function isValidFormat(token) {
  return typeof token === "string" && token.startsWith("tk_") && token.split(":").length >= 3;
}`,
      stage: 1,
      testCases: [
        {
          description: "generateToken produces a token starting with tk_",
          assertion: `generateToken("user1", "admin").startsWith("tk_")`,
        },
        {
          description: "Generated token contains the userId",
          assertion: `generateToken("user1", "admin").includes("user1")`,
        },
        {
          description: "isValidFormat accepts a properly generated token",
          assertion: `isValidFormat(generateToken("u1", "user")) === true`,
        },
      ],
    },
    {
      id: "auth-session",
      fileName: "session.ts",
      label: "Session Manager",
      description:
        "Session manager — expiry check is inverted, marking valid sessions as expired.",
      buggyCode: `function createSession(userId, durationMs) {
  return {
    userId: userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + durationMs,
    active: true
  };
}

function isExpired(session) {
  return Date.now() < session.expiresAt;
}

function getSessionStatus(session) {
  if (!session.active) return "inactive";
  if (isExpired(session)) return "expired";
  return "valid";
}`,
      fixedCode: `function createSession(userId, durationMs) {
  return {
    userId: userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + durationMs,
    active: true
  };
}

function isExpired(session) {
  return Date.now() > session.expiresAt;
}

function getSessionStatus(session) {
  if (!session.active) return "inactive";
  if (isExpired(session)) return "expired";
  return "valid";
}`,
      stage: 2,
      testCases: [
        {
          description: "New session with long duration is not expired",
          assertion: `isExpired(createSession("u1", 60000)) === false`,
        },
        {
          description: "Session with past expiry is expired",
          assertion: `isExpired({ userId: "u1", createdAt: 0, expiresAt: 1, active: true }) === true`,
        },
        {
          description: "New valid session has status valid",
          assertion: `getSessionStatus(createSession("u1", 60000)) === "valid"`,
        },
      ],
    },
    {
      id: "auth-middleware",
      fileName: "middleware.ts",
      label: "Auth Middleware",
      description:
        "Middleware — crashes when authorization header is missing instead of returning 401.",
      buggyCode: `function extractToken(headers) {
  var auth = headers["authorization"];
  return auth.replace("Bearer ", "");
}

function authenticate(headers) {
  var token = extractToken(headers);
  if (!token || token.length < 5) {
    return { authenticated: false, error: "Invalid token" };
  }
  return { authenticated: true, token: token, error: null };
}

function requireAuth(headers) {
  var result = authenticate(headers);
  return {
    allowed: result.authenticated,
    status: result.authenticated ? 200 : 401,
    message: result.error || "OK"
  };
}`,
      fixedCode: `function extractToken(headers) {
  var auth = headers["authorization"];
  if (!auth) return null;
  return auth.replace("Bearer ", "");
}

function authenticate(headers) {
  var token = extractToken(headers);
  if (!token || token.length < 5) {
    return { authenticated: false, error: "Invalid token" };
  }
  return { authenticated: true, token: token, error: null };
}

function requireAuth(headers) {
  var result = authenticate(headers);
  return {
    allowed: result.authenticated,
    status: result.authenticated ? 200 : 401,
    message: result.error || "OK"
  };
}`,
      stage: 3,
      testCases: [
        {
          description: "Valid Bearer token authenticates successfully",
          assertion: `authenticate({ authorization: "Bearer tk_user1:admin:12345" }).authenticated === true`,
        },
        {
          description: "Missing authorization header returns not authenticated",
          assertion: `authenticate({}).authenticated === false`,
        },
        {
          description: "requireAuth with no header returns 401",
          assertion: `requireAuth({}).status === 401`,
        },
      ],
    },
  ],
  dependencyGraph: {
    "auth-token": [],
    "auth-session": ["auth-token"],
    "auth-middleware": ["auth-session"],
  },
};

// ═══════════════════════════════════════════════════════════════
// SCENARIO E — Analytics Data Pipeline Broken
// ═══════════════════════════════════════════════════════════════

const SCENARIO_E: Scenario = {
  description:
    "The analytics data pipeline is broken. The data parser has a missing comma in an object literal, the aggregator starts its sum at 1 instead of 0, and the reporter divides by zero on empty datasets. Fix all 3 to restore analytics.",
  files: [
    {
      id: "analytics-parser",
      fileName: "parser.ts",
      label: "Data Parser",
      description:
        "Parser — missing comma in object literal causes a syntax error when creating event objects.",
      buggyCode: `function parseEvent(raw) {
  var parts = raw.split("|");
  return {
    type: parts[0],
    value: Number(parts[1])
    timestamp: Number(parts[2])
  };
}

function parseEvents(rawList) {
  var results = [];
  for (var i = 0; i < rawList.length; i++) {
    results.push(parseEvent(rawList[i]));
  }
  return results;
}

function isValidEvent(event) {
  return event.type && !isNaN(event.value) && !isNaN(event.timestamp);
}`,
      fixedCode: `function parseEvent(raw) {
  var parts = raw.split("|");
  return {
    type: parts[0],
    value: Number(parts[1]),
    timestamp: Number(parts[2])
  };
}

function parseEvents(rawList) {
  var results = [];
  for (var i = 0; i < rawList.length; i++) {
    results.push(parseEvent(rawList[i]));
  }
  return results;
}

function isValidEvent(event) {
  return event.type && !isNaN(event.value) && !isNaN(event.timestamp);
}`,
      stage: 1,
      testCases: [
        {
          description: "parseEvent parses a pipe-delimited string",
          assertion: `parseEvent("click|5|1000").type === "click"`,
        },
        {
          description: "parseEvent extracts numeric value",
          assertion: `parseEvent("view|10|2000").value === 10`,
        },
        {
          description: "parseEvents handles multiple events",
          assertion: `parseEvents(["a|1|100", "b|2|200"]).length === 2`,
        },
      ],
    },
    {
      id: "analytics-aggregator",
      fileName: "aggregator.ts",
      label: "Data Aggregator",
      description:
        "Aggregator — sum starts at 1 instead of 0, making every total off by one.",
      buggyCode: `function sum(values) {
  var total = 1;
  for (var i = 0; i < values.length; i++) {
    total = total + values[i];
  }
  return total;
}

function average(values) {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

function max(values) {
  if (values.length === 0) return 0;
  var result = values[0];
  for (var i = 1; i < values.length; i++) {
    if (values[i] > result) result = values[i];
  }
  return result;
}`,
      fixedCode: `function sum(values) {
  var total = 0;
  for (var i = 0; i < values.length; i++) {
    total = total + values[i];
  }
  return total;
}

function average(values) {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

function max(values) {
  if (values.length === 0) return 0;
  var result = values[0];
  for (var i = 1; i < values.length; i++) {
    if (values[i] > result) result = values[i];
  }
  return result;
}`,
      stage: 2,
      testCases: [
        {
          description: "sum of [10, 20, 30] equals 60",
          assertion: `sum([10, 20, 30]) === 60`,
        },
        {
          description: "sum of empty array equals 0",
          assertion: `sum([]) === 0`,
        },
        {
          description: "average of [10, 20] equals 15",
          assertion: `average([10, 20]) === 15`,
        },
      ],
    },
    {
      id: "analytics-reporter",
      fileName: "reporter.ts",
      label: "Report Generator",
      description:
        "Reporter — divides by zero when generating reports for empty datasets, returning NaN.",
      buggyCode: `function generateReport(data) {
  var total = 0;
  for (var i = 0; i < data.length; i++) {
    total = total + data[i].value;
  }
  var avg = total / data.length;
  return {
    total: total,
    average: avg,
    count: data.length,
    status: "complete"
  };
}

function isReportValid(report) {
  return !isNaN(report.total) && !isNaN(report.average) && report.count >= 0;
}`,
      fixedCode: `function generateReport(data) {
  var total = 0;
  for (var i = 0; i < data.length; i++) {
    total = total + data[i].value;
  }
  var avg = data.length > 0 ? total / data.length : 0;
  return {
    total: total,
    average: avg,
    count: data.length,
    status: "complete"
  };
}

function isReportValid(report) {
  return !isNaN(report.total) && !isNaN(report.average) && report.count >= 0;
}`,
      stage: 3,
      testCases: [
        {
          description: "Report with data has correct total",
          assertion: `generateReport([{value:10},{value:20}]).total === 30`,
        },
        {
          description: "Empty dataset report has average 0 not NaN",
          assertion: `generateReport([]).average === 0`,
        },
        {
          description: "Report is valid for empty dataset",
          assertion: `isReportValid(generateReport([])) === true`,
        },
      ],
    },
  ],
  dependencyGraph: {
    "analytics-parser": [],
    "analytics-aggregator": ["analytics-parser"],
    "analytics-reporter": ["analytics-aggregator"],
  },
};

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

const SCENARIOS: Scenario[] = [
  SCENARIO_A,
  SCENARIO_B,
  SCENARIO_C,
  SCENARIO_D,
  SCENARIO_E,
];

/**
 * Deterministically select a scenario based on the room code.
 * Uses the sum of all character codes modulo the number of scenarios.
 */
export function getStaticScenario(roomCode: string): Scenario {
  let sum = 0;
  for (let i = 0; i < roomCode.length; i++) {
    sum += roomCode.charCodeAt(i);
  }
  return SCENARIOS[sum % SCENARIOS.length];
}

export { SCENARIOS };
