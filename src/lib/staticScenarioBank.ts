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
// SCENARIO F — Email Notification Service Failure
// ═══════════════════════════════════════════════════════════════

const SCENARIO_F: Scenario = {
  description:
    "The email notification service is down. The template engine has a missing closing parenthesis, the recipient resolver uses the wrong array method, and the mailer crashes when the recipient list is empty. Fix all 3 to restore email delivery.",
  files: [
    {
      id: "email-template",
      fileName: "template.ts",
      label: "Template Engine",
      description:
        "Template engine — missing closing parenthesis in the replace call causes a syntax error.",
      buggyCode: `function renderTemplate(name, vars) {
  var result = name;
  var keys = Object.keys(vars);
  for (var i = 0; i < keys.length; i++) {
    result = result.replace("{{" + keys[i] + "}}", vars[keys[i]];
  }
  return result;
}

function getSubject(template, vars) {
  return renderTemplate(template, vars);
}

function getBody(template, vars) {
  return renderTemplate(template, vars);
}`,
      fixedCode: `function renderTemplate(name, vars) {
  var result = name;
  var keys = Object.keys(vars);
  for (var i = 0; i < keys.length; i++) {
    result = result.replace("{{" + keys[i] + "}}", vars[keys[i]]);
  }
  return result;
}

function getSubject(template, vars) {
  return renderTemplate(template, vars);
}

function getBody(template, vars) {
  return renderTemplate(template, vars);
}`,
      stage: 1,
      testCases: [
        {
          description: "renderTemplate replaces a placeholder",
          assertion: `renderTemplate("Hello {{name}}", { name: "Alice" }) === "Hello Alice"`,
        },
        {
          description: "renderTemplate handles multiple placeholders",
          assertion: `renderTemplate("{{a}} and {{b}}", { a: "X", b: "Y" }) === "X and Y"`,
        },
        {
          description: "getSubject delegates to renderTemplate",
          assertion: `getSubject("Hi {{user}}", { user: "Bob" }) === "Hi Bob"`,
        },
      ],
    },
    {
      id: "email-resolver",
      fileName: "resolver.ts",
      label: "Recipient Resolver",
      description:
        "Resolver — uses find instead of filter, returning only the first matching recipient instead of all.",
      buggyCode: `function getUsers() {
  return [
    { id: 1, email: "a@test.com", subscribed: true },
    { id: 2, email: "b@test.com", subscribed: false },
    { id: 3, email: "c@test.com", subscribed: true }
  ];
}

function getSubscribers() {
  return getUsers().find(function(u) { return u.subscribed; });
}

function getEmailList() {
  var subs = getSubscribers();
  if (!Array.isArray(subs)) return [];
  return subs.map(function(u) { return u.email; });
}`,
      fixedCode: `function getUsers() {
  return [
    { id: 1, email: "a@test.com", subscribed: true },
    { id: 2, email: "b@test.com", subscribed: false },
    { id: 3, email: "c@test.com", subscribed: true }
  ];
}

function getSubscribers() {
  return getUsers().filter(function(u) { return u.subscribed; });
}

function getEmailList() {
  var subs = getSubscribers();
  if (!Array.isArray(subs)) return [];
  return subs.map(function(u) { return u.email; });
}`,
      stage: 2,
      testCases: [
        {
          description: "getSubscribers returns an array",
          assertion: `Array.isArray(getSubscribers()) === true`,
        },
        {
          description: "getSubscribers returns all subscribed users",
          assertion: `getSubscribers().length === 2`,
        },
        {
          description: "getEmailList returns email strings",
          assertion: `getEmailList().length === 2 && getEmailList()[0] === "a@test.com"`,
        },
      ],
    },
    {
      id: "email-mailer",
      fileName: "mailer.ts",
      label: "Email Mailer",
      description:
        "Mailer — crashes when recipients array is empty instead of returning a skipped status.",
      buggyCode: `function sendEmail(to, subject, body) {
  return { to: to, subject: subject, body: body, sent: true };
}

function sendBulk(recipients, subject, body) {
  var results = [];
  for (var i = 0; i < recipients.length; i++) {
    results.push(sendEmail(recipients[i], subject, body));
  }
  return { sent: results.length, failed: 0, results: results };
}

function sendNotification(recipients, subject, body) {
  var report = sendBulk(recipients, subject, body);
  return {
    total: recipients.length,
    delivered: report.sent,
    status: report.sent === recipients.length ? "complete" : "partial"
  };
}`,
      fixedCode: `function sendEmail(to, subject, body) {
  return { to: to, subject: subject, body: body, sent: true };
}

function sendBulk(recipients, subject, body) {
  if (!recipients || recipients.length === 0) {
    return { sent: 0, failed: 0, results: [] };
  }
  var results = [];
  for (var i = 0; i < recipients.length; i++) {
    results.push(sendEmail(recipients[i], subject, body));
  }
  return { sent: results.length, failed: 0, results: results };
}

function sendNotification(recipients, subject, body) {
  if (!recipients || recipients.length === 0) {
    return { total: 0, delivered: 0, status: "skipped" };
  }
  var report = sendBulk(recipients, subject, body);
  return {
    total: recipients.length,
    delivered: report.sent,
    status: report.sent === recipients.length ? "complete" : "partial"
  };
}`,
      stage: 3,
      testCases: [
        {
          description: "sendBulk with recipients returns correct sent count",
          assertion: `sendBulk(["a@t.com", "b@t.com"], "Hi", "Body").sent === 2`,
        },
        {
          description: "sendBulk with empty array returns 0 sent",
          assertion: `sendBulk([], "Hi", "Body").sent === 0`,
        },
        {
          description: "sendNotification with empty recipients returns skipped",
          assertion: `sendNotification([], "Hi", "Body").status === "skipped"`,
        },
      ],
    },
  ],
  dependencyGraph: {
    "email-template": [],
    "email-resolver": ["email-template"],
    "email-mailer": ["email-resolver"],
  },
};

// ═══════════════════════════════════════════════════════════════
// SCENARIO G — File Upload Processor Broken
// ═══════════════════════════════════════════════════════════════

const SCENARIO_G: Scenario = {
  description:
    "The file upload processor is broken. The file validator has a flipped size check rejecting valid files, the metadata extractor has a typo crashing on every file, and the upload handler doesn't handle duplicate filenames. Fix all 3 to restore uploads.",
  files: [
    {
      id: "upload-validator",
      fileName: "validator.ts",
      label: "File Validator",
      description:
        "Validator — size comparison is flipped, rejecting files under the max size and accepting oversized ones.",
      buggyCode: `function validateFile(file) {
  var maxSize = 5000000;
  var allowedTypes = ["image/png", "image/jpeg", "application/pdf"];
  if (file.size < maxSize) {
    return { valid: false, error: "File too large" };
  }
  if (allowedTypes.indexOf(file.type) === -1) {
    return { valid: false, error: "Invalid file type" };
  }
  return { valid: true, error: null };
}

function isImage(file) {
  return file.type === "image/png" || file.type === "image/jpeg";
}

function getMaxSize() {
  return 5000000;
}`,
      fixedCode: `function validateFile(file) {
  var maxSize = 5000000;
  var allowedTypes = ["image/png", "image/jpeg", "application/pdf"];
  if (file.size > maxSize) {
    return { valid: false, error: "File too large" };
  }
  if (allowedTypes.indexOf(file.type) === -1) {
    return { valid: false, error: "Invalid file type" };
  }
  return { valid: true, error: null };
}

function isImage(file) {
  return file.type === "image/png" || file.type === "image/jpeg";
}

function getMaxSize() {
  return 5000000;
}`,
      stage: 1,
      testCases: [
        {
          description: "Small valid PNG passes validation",
          assertion: `validateFile({ size: 1000, type: "image/png" }).valid === true`,
        },
        {
          description: "Oversized file is rejected",
          assertion: `validateFile({ size: 9999999, type: "image/png" }).valid === false`,
        },
        {
          description: "Invalid type is rejected",
          assertion: `validateFile({ size: 100, type: "text/html" }).valid === false`,
        },
      ],
    },
    {
      id: "upload-metadata",
      fileName: "metadata.ts",
      label: "Metadata Extractor",
      description:
        "Metadata extractor — typo in property access (naem instead of name) causes undefined values.",
      buggyCode: `function extractMetadata(file) {
  return {
    fileName: file.naem,
    size: file.size,
    type: file.type,
    extension: file.name ? file.name.split(".").pop() : "unknown"
  };
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return Math.round(bytes / 1024) + " KB";
  return Math.round(bytes / 1048576) + " MB";
}

function getSummary(file) {
  var meta = extractMetadata(file);
  return meta.fileName + " (" + formatSize(meta.size) + ")";
}`,
      fixedCode: `function extractMetadata(file) {
  return {
    fileName: file.name,
    size: file.size,
    type: file.type,
    extension: file.name ? file.name.split(".").pop() : "unknown"
  };
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return Math.round(bytes / 1024) + " KB";
  return Math.round(bytes / 1048576) + " MB";
}

function getSummary(file) {
  var meta = extractMetadata(file);
  return meta.fileName + " (" + formatSize(meta.size) + ")";
}`,
      stage: 2,
      testCases: [
        {
          description: "extractMetadata returns the correct fileName",
          assertion: `extractMetadata({ name: "photo.png", size: 2048, type: "image/png" }).fileName === "photo.png"`,
        },
        {
          description: "extractMetadata extracts the file extension",
          assertion: `extractMetadata({ name: "doc.pdf", size: 100, type: "application/pdf" }).extension === "pdf"`,
        },
        {
          description: "getSummary includes the file name",
          assertion: `getSummary({ name: "test.txt", size: 512, type: "text/plain" }).indexOf("test.txt") !== -1`,
        },
      ],
    },
    {
      id: "upload-handler",
      fileName: "handler.ts",
      label: "Upload Handler",
      description:
        "Handler — doesn't check for duplicate filenames, silently overwriting existing files.",
      buggyCode: `function createStorage() {
  var files = {};
  return {
    has: function(name) { return name in files; },
    put: function(name, data) { files[name] = data; },
    get: function(name) { return files[name] || null; },
    count: function() { return Object.keys(files).length; }
  };
}

function uploadFile(storage, fileName, data) {
  storage.put(fileName, data);
  return { fileName: fileName, status: "uploaded", overwritten: false };
}

function uploadBatch(fileList) {
  var storage = createStorage();
  var results = [];
  for (var i = 0; i < fileList.length; i++) {
    results.push(uploadFile(storage, fileList[i].name, fileList[i].data));
  }
  return { total: fileList.length, stored: storage.count(), results: results };
}`,
      fixedCode: `function createStorage() {
  var files = {};
  return {
    has: function(name) { return name in files; },
    put: function(name, data) { files[name] = data; },
    get: function(name) { return files[name] || null; },
    count: function() { return Object.keys(files).length; }
  };
}

function uploadFile(storage, fileName, data) {
  if (storage.has(fileName)) {
    return { fileName: fileName, status: "duplicate", overwritten: false };
  }
  storage.put(fileName, data);
  return { fileName: fileName, status: "uploaded", overwritten: false };
}

function uploadBatch(fileList) {
  var storage = createStorage();
  var results = [];
  for (var i = 0; i < fileList.length; i++) {
    results.push(uploadFile(storage, fileList[i].name, fileList[i].data));
  }
  return { total: fileList.length, stored: storage.count(), results: results };
}`,
      stage: 3,
      testCases: [
        {
          description: "Uploading a unique file returns uploaded status",
          assertion: `(function() { var s = createStorage(); return uploadFile(s, "a.txt", "data").status === "uploaded"; })()`,
        },
        {
          description: "Uploading a duplicate file returns duplicate status",
          assertion: `(function() { var s = createStorage(); uploadFile(s, "a.txt", "d1"); return uploadFile(s, "a.txt", "d2").status === "duplicate"; })()`,
        },
        {
          description: "uploadBatch with duplicates stores only unique files",
          assertion: `uploadBatch([{name:"a",data:"1"},{name:"b",data:"2"},{name:"a",data:"3"}]).stored === 2`,
        },
      ],
    },
  ],
  dependencyGraph: {
    "upload-validator": [],
    "upload-metadata": ["upload-validator"],
    "upload-handler": ["upload-metadata"],
  },
};

// ═══════════════════════════════════════════════════════════════
// SCENARIO H — Rate Limiting Gateway Overloaded
// ═══════════════════════════════════════════════════════════════

const SCENARIO_H: Scenario = {
  description:
    "The rate limiting gateway is overloaded. The clock module returns seconds instead of milliseconds breaking all timers, the rate counter uses the wrong comparison allowing unlimited requests, and the gateway never resets expired windows. Fix all 3 to restore rate limiting.",
  files: [
    {
      id: "rate-clock",
      fileName: "clock.ts",
      label: "Clock Module",
      description:
        "Clock — divides Date.now() by 1000, returning seconds instead of milliseconds and breaking downstream time comparisons.",
      buggyCode: `function now() {
  return Math.floor(Date.now() / 1000);
}

function elapsed(startTime) {
  return Date.now() - startTime;
}

function isWithinWindow(startTime, windowMs) {
  return elapsed(startTime) < windowMs;
}`,
      fixedCode: `function now() {
  return Date.now();
}

function elapsed(startTime) {
  return Date.now() - startTime;
}

function isWithinWindow(startTime, windowMs) {
  return elapsed(startTime) < windowMs;
}`,
      stage: 1,
      testCases: [
        {
          description: "now returns a value in milliseconds (> 1e12)",
          assertion: `now() > 1000000000000`,
        },
        {
          description: "elapsed returns a non-negative number",
          assertion: `elapsed(Date.now()) >= 0`,
        },
        {
          description: "isWithinWindow returns true for a recent start time",
          assertion: `isWithinWindow(Date.now(), 5000) === true`,
        },
      ],
    },
    {
      id: "rate-counter",
      fileName: "counter.ts",
      label: "Rate Counter",
      description:
        "Counter — uses >= instead of > for the limit check, blocking requests exactly at the limit instead of over it.",
      buggyCode: `function createCounter(limit) {
  var count = 0;
  return {
    increment: function() { count++; return count; },
    getCount: function() { return count; },
    isExceeded: function() { return count >= limit; },
    reset: function() { count = 0; }
  };
}

function checkLimit(counter) {
  if (counter.isExceeded()) {
    return { allowed: false, reason: "Rate limit exceeded" };
  }
  counter.increment();
  return { allowed: true, reason: null };
}

function getRemainingRequests(counter, limit) {
  return Math.max(0, limit - counter.getCount());
}`,
      fixedCode: `function createCounter(limit) {
  var count = 0;
  return {
    increment: function() { count++; return count; },
    getCount: function() { return count; },
    isExceeded: function() { return count > limit; },
    reset: function() { count = 0; }
  };
}

function checkLimit(counter) {
  if (counter.isExceeded()) {
    return { allowed: false, reason: "Rate limit exceeded" };
  }
  counter.increment();
  return { allowed: true, reason: null };
}

function getRemainingRequests(counter, limit) {
  return Math.max(0, limit - counter.getCount());
}`,
      stage: 2,
      testCases: [
        {
          description: "Counter with limit 2 allows 2 requests",
          assertion: `(function() { var c = createCounter(2); checkLimit(c); checkLimit(c); return c.getCount() === 2 && !c.isExceeded(); })()`,
        },
        {
          description: "Counter exceeds after going over limit",
          assertion: `(function() { var c = createCounter(1); checkLimit(c); checkLimit(c); return c.isExceeded() === true; })()`,
        },
        {
          description: "getRemainingRequests returns correct count",
          assertion: `(function() { var c = createCounter(5); checkLimit(c); return getRemainingRequests(c, 5) === 4; })()`,
        },
      ],
    },
    {
      id: "rate-gateway",
      fileName: "gateway.ts",
      label: "Rate Gateway",
      description:
        "Gateway — never resets the counter when the time window expires, permanently blocking users after first window.",
      buggyCode: `function createLimiter(maxRequests, windowMs) {
  var count = 0;
  var windowStart = Date.now();
  return {
    request: function() {
      count++;
      if (count > maxRequests) {
        return { allowed: false, retryAfter: windowMs - (Date.now() - windowStart) };
      }
      return { allowed: true, retryAfter: 0 };
    },
    getCount: function() { return count; },
    getWindowStart: function() { return windowStart; }
  };
}

function processRequest(limiter) {
  var result = limiter.request();
  return {
    status: result.allowed ? "ok" : "throttled",
    retryAfter: result.retryAfter
  };
}

function isHealthy(limiter, maxRequests) {
  return limiter.getCount() <= maxRequests;
}`,
      fixedCode: `function createLimiter(maxRequests, windowMs) {
  var count = 0;
  var windowStart = Date.now();
  return {
    request: function() {
      if (Date.now() - windowStart > windowMs) {
        count = 0;
        windowStart = Date.now();
      }
      count++;
      if (count > maxRequests) {
        return { allowed: false, retryAfter: windowMs - (Date.now() - windowStart) };
      }
      return { allowed: true, retryAfter: 0 };
    },
    getCount: function() { return count; },
    getWindowStart: function() { return windowStart; }
  };
}

function processRequest(limiter) {
  var result = limiter.request();
  return {
    status: result.allowed ? "ok" : "throttled",
    retryAfter: result.retryAfter
  };
}

function isHealthy(limiter, maxRequests) {
  return limiter.getCount() <= maxRequests;
}`,
      stage: 3,
      testCases: [
        {
          description: "First request is allowed",
          assertion: `processRequest(createLimiter(5, 60000)).status === "ok"`,
        },
        {
          description: "Requests over limit are throttled",
          assertion: `(function() { var l = createLimiter(1, 60000); processRequest(l); return processRequest(l).status === "throttled"; })()`,
        },
        {
          description: "isHealthy returns true when under limit",
          assertion: `(function() { var l = createLimiter(10, 60000); processRequest(l); return isHealthy(l, 10) === true; })()`,
        },
      ],
    },
  ],
  dependencyGraph: {
    "rate-clock": [],
    "rate-counter": ["rate-clock"],
    "rate-gateway": ["rate-counter"],
  },
};

// ═══════════════════════════════════════════════════════════════
// SCENARIO I — Search Indexing Service Corrupted
// ═══════════════════════════════════════════════════════════════

const SCENARIO_I: Scenario = {
  description:
    "The search indexing service is corrupted. The tokenizer splits on the wrong delimiter producing garbage tokens, the index builder overwrites entries instead of appending, and the search engine returns results in the wrong order. Fix all 3 to restore search.",
  files: [
    {
      id: "search-tokenizer",
      fileName: "tokenizer.ts",
      label: "Tokenizer",
      description:
        "Tokenizer — splits on commas instead of spaces, producing incorrect tokens from sentences.",
      buggyCode: `function tokenize(text) {
  return text.toLowerCase().split(",").filter(function(t) {
    return t.trim().length > 0;
  });
}

function countTokens(text) {
  return tokenize(text).length;
}

function uniqueTokens(text) {
  var tokens = tokenize(text);
  var seen = {};
  var result = [];
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i].trim();
    if (!seen[t]) { seen[t] = true; result.push(t); }
  }
  return result;
}`,
      fixedCode: `function tokenize(text) {
  return text.toLowerCase().split(" ").filter(function(t) {
    return t.trim().length > 0;
  });
}

function countTokens(text) {
  return tokenize(text).length;
}

function uniqueTokens(text) {
  var tokens = tokenize(text);
  var seen = {};
  var result = [];
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i].trim();
    if (!seen[t]) { seen[t] = true; result.push(t); }
  }
  return result;
}`,
      stage: 1,
      testCases: [
        {
          description: "tokenize splits on spaces",
          assertion: `tokenize("hello world").length === 2`,
        },
        {
          description: "tokenize lowercases tokens",
          assertion: `tokenize("Hello World")[0] === "hello"`,
        },
        {
          description: "countTokens returns correct count",
          assertion: `countTokens("the quick brown fox") === 4`,
        },
      ],
    },
    {
      id: "search-index",
      fileName: "indexBuilder.ts",
      label: "Index Builder",
      description:
        "Index builder — overwrites the posting list instead of appending, so each token maps to only the last document.",
      buggyCode: `function createIndex() {
  var index = {};
  return {
    add: function(token, docId) {
      index[token] = [docId];
    },
    lookup: function(token) {
      return index[token] || [];
    },
    size: function() {
      return Object.keys(index).length;
    }
  };
}

function buildIndex(documents) {
  var idx = createIndex();
  for (var i = 0; i < documents.length; i++) {
    var tokens = documents[i].text.toLowerCase().split(" ");
    for (var j = 0; j < tokens.length; j++) {
      idx.add(tokens[j], documents[i].id);
    }
  }
  return idx;
}

function getIndexedTerms(idx) {
  return idx.size();
}`,
      fixedCode: `function createIndex() {
  var index = {};
  return {
    add: function(token, docId) {
      if (!index[token]) index[token] = [];
      if (index[token].indexOf(docId) === -1) index[token].push(docId);
    },
    lookup: function(token) {
      return index[token] || [];
    },
    size: function() {
      return Object.keys(index).length;
    }
  };
}

function buildIndex(documents) {
  var idx = createIndex();
  for (var i = 0; i < documents.length; i++) {
    var tokens = documents[i].text.toLowerCase().split(" ");
    for (var j = 0; j < tokens.length; j++) {
      idx.add(tokens[j], documents[i].id);
    }
  }
  return idx;
}

function getIndexedTerms(idx) {
  return idx.size();
}`,
      stage: 2,
      testCases: [
        {
          description: "Index maps a token to multiple documents",
          assertion: `(function() { var idx = createIndex(); idx.add("hello", 1); idx.add("hello", 2); return idx.lookup("hello").length === 2; })()`,
        },
        {
          description: "buildIndex indexes shared words across docs",
          assertion: `buildIndex([{id:1,text:"hello world"},{id:2,text:"hello there"}]).lookup("hello").length === 2`,
        },
        {
          description: "lookup returns empty array for unknown token",
          assertion: `createIndex().lookup("missing").length === 0`,
        },
      ],
    },
    {
      id: "search-engine",
      fileName: "searchEngine.ts",
      label: "Search Engine",
      description:
        "Search engine — sorts results ascending by score instead of descending, showing worst matches first.",
      buggyCode: `function search(index, query) {
  var tokens = query.toLowerCase().split(" ");
  var scores = {};
  for (var i = 0; i < tokens.length; i++) {
    var docs = index.lookup(tokens[i]);
    for (var j = 0; j < docs.length; j++) {
      scores[docs[j]] = (scores[docs[j]] || 0) + 1;
    }
  }
  var results = Object.keys(scores).map(function(docId) {
    return { docId: docId, score: scores[docId] };
  });
  results.sort(function(a, b) { return a.score - b.score; });
  return results;
}

function topResult(index, query) {
  var results = search(index, query);
  return results.length > 0 ? results[0] : null;
}

function resultCount(index, query) {
  return search(index, query).length;
}`,
      fixedCode: `function search(index, query) {
  var tokens = query.toLowerCase().split(" ");
  var scores = {};
  for (var i = 0; i < tokens.length; i++) {
    var docs = index.lookup(tokens[i]);
    for (var j = 0; j < docs.length; j++) {
      scores[docs[j]] = (scores[docs[j]] || 0) + 1;
    }
  }
  var results = Object.keys(scores).map(function(docId) {
    return { docId: docId, score: scores[docId] };
  });
  results.sort(function(a, b) { return b.score - a.score; });
  return results;
}

function topResult(index, query) {
  var results = search(index, query);
  return results.length > 0 ? results[0] : null;
}

function resultCount(index, query) {
  return search(index, query).length;
}`,
      stage: 3,
      testCases: [
        {
          description: "Search returns highest scoring result first",
          assertion: `(function() { var idx = { lookup: function(t) { if (t === "a") return [1,2]; if (t === "b") return [2]; return []; } }; return search(idx, "a b")[0].docId === "2"; })()`,
        },
        {
          description: "topResult returns the best match",
          assertion: `(function() { var idx = { lookup: function(t) { if (t === "x") return [1,2]; if (t === "y") return [2]; return []; } }; return topResult(idx, "x y").docId === "2"; })()`,
        },
        {
          description: "resultCount returns number of matching docs",
          assertion: `(function() { var idx = { lookup: function(t) { return [1,2,3]; } }; return resultCount(idx, "test") === 3; })()`,
        },
      ],
    },
  ],
  dependencyGraph: {
    "search-tokenizer": [],
    "search-index": ["search-tokenizer"],
    "search-engine": ["search-index"],
  },
};

// ═══════════════════════════════════════════════════════════════
// SCENARIO J — Cache Invalidation Service Stale
// ═══════════════════════════════════════════════════════════════

const SCENARIO_J: Scenario = {
  description:
    "The cache invalidation service is serving stale data. The cache store has a missing return in its get method, the TTL checker compares timestamps backwards marking fresh entries as expired, and the cache manager never actually deletes expired entries. Fix all 3 to restore caching.",
  files: [
    {
      id: "cache-store",
      fileName: "cacheStore.ts",
      label: "Cache Store",
      description:
        "Cache store — get method is missing a return statement, always returning undefined even for cached entries.",
      buggyCode: `function createCache() {
  var data = {};
  return {
    set: function(key, value, ttl) {
      data[key] = { value: value, expiresAt: Date.now() + ttl };
    },
    get: function(key) {
      if (data[key]) {
        data[key].value;
      }
      return undefined;
    },
    has: function(key) {
      return key in data;
    },
    remove: function(key) {
      delete data[key];
    },
    size: function() {
      return Object.keys(data).length;
    }
  };
}

function initCache() {
  var cache = createCache();
  cache.set("config", { theme: "dark" }, 60000);
  return cache;
}`,
      fixedCode: `function createCache() {
  var data = {};
  return {
    set: function(key, value, ttl) {
      data[key] = { value: value, expiresAt: Date.now() + ttl };
    },
    get: function(key) {
      if (data[key]) {
        return data[key].value;
      }
      return undefined;
    },
    has: function(key) {
      return key in data;
    },
    remove: function(key) {
      delete data[key];
    },
    size: function() {
      return Object.keys(data).length;
    }
  };
}

function initCache() {
  var cache = createCache();
  cache.set("config", { theme: "dark" }, 60000);
  return cache;
}`,
      stage: 1,
      testCases: [
        {
          description: "Cache get returns the stored value",
          assertion: `(function() { var c = createCache(); c.set("k", 42, 5000); return c.get("k") === 42; })()`,
        },
        {
          description: "Cache get returns undefined for missing key",
          assertion: `createCache().get("nope") === undefined`,
        },
        {
          description: "initCache stores config with theme dark",
          assertion: `initCache().get("config").theme === "dark"`,
        },
      ],
    },
    {
      id: "cache-ttl",
      fileName: "ttlChecker.ts",
      label: "TTL Checker",
      description:
        "TTL checker — comparison is backwards, marking fresh entries as expired and expired entries as fresh.",
      buggyCode: `function isExpired(entry) {
  return entry.expiresAt > Date.now();
}

function getTimeRemaining(entry) {
  var remaining = entry.expiresAt - Date.now();
  return remaining > 0 ? remaining : 0;
}

function shouldRefresh(entry, thresholdMs) {
  var remaining = getTimeRemaining(entry);
  return remaining < thresholdMs;
}`,
      fixedCode: `function isExpired(entry) {
  return entry.expiresAt < Date.now();
}

function getTimeRemaining(entry) {
  var remaining = entry.expiresAt - Date.now();
  return remaining > 0 ? remaining : 0;
}

function shouldRefresh(entry, thresholdMs) {
  var remaining = getTimeRemaining(entry);
  return remaining < thresholdMs;
}`,
      stage: 2,
      testCases: [
        {
          description: "Entry with future expiry is not expired",
          assertion: `isExpired({ expiresAt: Date.now() + 60000 }) === false`,
        },
        {
          description: "Entry with past expiry is expired",
          assertion: `isExpired({ expiresAt: 1 }) === true`,
        },
        {
          description: "getTimeRemaining returns 0 for expired entry",
          assertion: `getTimeRemaining({ expiresAt: 1 }) === 0`,
        },
      ],
    },
    {
      id: "cache-manager",
      fileName: "cacheManager.ts",
      label: "Cache Manager",
      description:
        "Cache manager — cleanup iterates keys but never actually removes expired entries from the cache.",
      buggyCode: `function cleanup(cache, entries) {
  var removed = 0;
  var keys = Object.keys(entries);
  for (var i = 0; i < keys.length; i++) {
    if (entries[keys[i]].expiresAt < Date.now()) {
      removed++;
    }
  }
  return { removed: removed, remaining: cache.size() };
}

function getStats(cache) {
  return {
    size: cache.size(),
    healthy: cache.size() < 1000
  };
}

function refreshEntry(cache, key, value, ttl) {
  cache.remove(key);
  cache.set(key, value, ttl);
  return { key: key, refreshed: true };
}`,
      fixedCode: `function cleanup(cache, entries) {
  var removed = 0;
  var keys = Object.keys(entries);
  for (var i = 0; i < keys.length; i++) {
    if (entries[keys[i]].expiresAt < Date.now()) {
      cache.remove(keys[i]);
      removed++;
    }
  }
  return { removed: removed, remaining: cache.size() };
}

function getStats(cache) {
  return {
    size: cache.size(),
    healthy: cache.size() < 1000
  };
}

function refreshEntry(cache, key, value, ttl) {
  cache.remove(key);
  cache.set(key, value, ttl);
  return { key: key, refreshed: true };
}`,
      stage: 3,
      testCases: [
        {
          description: "cleanup removes expired entries from cache",
          assertion: `(function() { var c = createCache(); c.set("old", 1, 0); var entries = { old: { expiresAt: 1 } }; var r = cleanup(c, entries); return r.removed === 1 && c.has("old") === false; })()`,
        },
        {
          description: "getStats returns healthy for small cache",
          assertion: `(function() { var c = createCache(); c.set("a", 1, 5000); return getStats(c).healthy === true; })()`,
        },
        {
          description: "refreshEntry replaces the cached value",
          assertion: `(function() { var c = createCache(); c.set("k", "old", 5000); refreshEntry(c, "k", "new", 5000); return c.get("k") === "new"; })()`,
        },
      ],
    },
  ],
  dependencyGraph: {
    "cache-store": [],
    "cache-ttl": ["cache-store"],
    "cache-manager": ["cache-ttl"],
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
  SCENARIO_F,
  SCENARIO_G,
  SCENARIO_H,
  SCENARIO_I,
  SCENARIO_J,
];

/**
 * Deterministically select a scenario based on the room code.
 * Uses the sum of all character codes modulo the number of scenarios.
 */
export function getStaticScenario(roomCode: string): Scenario {
  // let sum = 0;
  // for (let i = 0; i < roomCode.length; i++) {
  //   sum += roomCode.charCodeAt(i);
  // }
  // return SCENARIOS[sum % SCENARIOS.length];

  return SCENARIO_I;
}

export { SCENARIOS };
