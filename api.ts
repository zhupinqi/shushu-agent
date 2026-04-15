// Shushu Analytics Plugin - Public API

export { ShushuAnalyticsPlugin } from "./src/shushu-analytics-plugin.js";
export { ShushuAPIClient } from "./src/shushu-api-client.js";
export { NLToSQLConverter } from "./src/nl-to-sql-converter.js";
export { SQLValidator } from "./src/sql-validator.js";
export { ResultFormatter } from "./src/result-formatter.js";
export { ConversationContext } from "./src/conversation-context.js";

// Re-export types
export type {
  ShushuAnalyticsConfig,
  ProgressInfo,
  ProgressPhase,
} from "./src/shushu-analytics-plugin.js";
export type { ShushuQueryRequest, ShushuQueryResponse } from "./src/shushu-api-client.js";
export type { NLToSQLOptions } from "./src/nl-to-sql-converter.js";
export type { ValidationResult } from "./src/sql-validator.js";
export type { OutputFormat } from "./src/result-formatter.js";
export type { ConversationTurn } from "./src/conversation-context.js";

// Default export for OpenClaw integration
export { default } from "./index.js";
