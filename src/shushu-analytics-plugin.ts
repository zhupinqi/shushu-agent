import { ConversationContext } from "./conversation-context.js";
import type { NLToSQLConverter } from "./nl-to-sql-converter.js";
import type { ResultFormatter } from "./result-formatter.js";
import type { ShushuAPIClient } from "./shushu-api-client.js";
import type { SQLValidator } from "./sql-validator.js";

export interface ShushuAnalyticsConfig {
  apiEndpoint?: string;
  maxResults?: number;
}

export type ProgressPhase = "understanding" | "validating" | "querying" | "formatting";

export interface ProgressInfo {
  phase: ProgressPhase;
  message: string;
  startTime: number;
}

export class ShushuAnalyticsPlugin {
  private converter: NLToSQLConverter;
  private validator: SQLValidator;
  private client: ShushuAPIClient;
  private formatter: ResultFormatter;
  private contexts: Map<string, ConversationContext>;
  private config: ShushuAnalyticsConfig;

  constructor(
    converter: NLToSQLConverter,
    validator: SQLValidator,
    client: ShushuAPIClient,
    formatter: ResultFormatter,
    config: ShushuAnalyticsConfig = {},
  ) {
    this.converter = converter;
    this.validator = validator;
    this.client = client;
    this.formatter = formatter;
    this.config = config;
    this.contexts = new Map();
  }

  /**
   * Handle a natural language query with progress indicators
   *
   * @param userId - The user ID for context management
   * @param query - The natural language query
   * @param onProgress - Optional callback for progress updates
   * @returns Formatted query result
   */
  async handleQuery(
    userId: string,
    query: string,
    onProgress?: (progress: ProgressInfo) => void | Promise<void>,
  ): Promise<string> {
    const startTime = Date.now();

    try {
      // Get or create context
      let context = this.contexts.get(userId);
      if (!context) {
        context = new ConversationContext();
        this.contexts.set(userId, context);
      }

      // Phase 1: NL -> SQL conversion
      await this.reportProgress(onProgress, {
        phase: "understanding",
        message: "🤔 正在理解您的查询...",
        startTime,
      });

      const contextStr = context.getContextString();
      const sql = await this.converter.convert(query, contextStr);

      // Phase 2: SQL validation
      await this.reportProgress(onProgress, {
        phase: "validating",
        message: "🔒 正在验证查询安全性...",
        startTime,
      });

      const validation = this.validator.validate(sql);
      if (!validation.valid) {
        throw new Error(`SQL 验证失败: ${validation.errors.join(", ")}`);
      }

      const sanitizedSql = this.validator.sanitize(sql);

      // Phase 3: Query execution
      await this.reportProgress(onProgress, {
        phase: "querying",
        message: "📊 正在查询数数数据...",
        startTime,
      });

      const result = await this.client.querySql(sanitizedSql);

      // Phase 4: Formatting
      await this.reportProgress(onProgress, {
        phase: "formatting",
        message: "📝 正在格式化结果...",
        startTime,
      });

      const formatted = this.formatter.format(result, "table");

      // Save to context
      context.addTurn({
        query,
        sql: sanitizedSql,
        result,
        timestamp: new Date(),
      });

      const elapsedMs = Date.now() - startTime;

      return `生成的 SQL:
\`\`\`sql
${sanitizedSql}
\`\`\`

查询结果:
${formatted}

---
⏱️ 耗时: ${elapsedMs}ms`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      return `查询失败: ${message}`;
    }
  }

  /**
   * Handle query with simple message-based progress (for MVP)
   *
   * This is a simplified version that returns intermediate progress messages
   * that can be sent to the user before the final result.
   */
  async handleQueryWithProgressMessages(
    userId: string,
    query: string,
  ): Promise<{ type: "progress" | "result"; content: string }[]> {
    const results: { type: "progress" | "result"; content: string }[] = [];
    const startTime = Date.now();

    try {
      // Get or create context
      let context = this.contexts.get(userId);
      if (!context) {
        context = new ConversationContext();
        this.contexts.set(userId, context);
      }

      // Phase 1: NL -> SQL conversion
      results.push({
        type: "progress",
        content: "🤔 正在理解您的查询...",
      });

      const contextStr = context.getContextString();
      const sql = await this.converter.convert(query, contextStr);

      // Phase 2: SQL validation
      results.push({
        type: "progress",
        content: "🔒 正在验证查询安全性...",
      });

      const validation = this.validator.validate(sql);
      if (!validation.valid) {
        throw new Error(`SQL 验证失败: ${validation.errors.join(", ")}`);
      }

      const sanitizedSql = this.validator.sanitize(sql);

      // Phase 3: Query execution
      results.push({
        type: "progress",
        content: "📊 正在查询数数数据...",
      });

      const result = await this.client.querySql(sanitizedSql);

      // Phase 4: Formatting
      results.push({
        type: "progress",
        content: "📝 正在格式化结果...",
      });

      const formatted = this.formatter.format(result, "table");

      // Save to context
      context.addTurn({
        query,
        sql: sanitizedSql,
        result,
        timestamp: new Date(),
      });

      const elapsedMs = Date.now() - startTime;

      // Final result
      results.push({
        type: "result",
        content: `生成的 SQL:
\`\`\`sql
${sanitizedSql}
\`\`\`

查询结果:
${formatted}

---
⏱️ 耗时: ${elapsedMs}ms`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      results.push({
        type: "result",
        content: `查询失败: ${message}`,
      });
    }

    return results;
  }

  clearContext(userId: string): void {
    this.contexts.delete(userId);
  }

  getContext(userId: string): ConversationContext | undefined {
    return this.contexts.get(userId);
  }

  private async reportProgress(
    onProgress: ((progress: ProgressInfo) => void | Promise<void>) | undefined,
    info: ProgressInfo,
  ): Promise<void> {
    if (onProgress) {
      await onProgress(info);
    }
  }
}
