import type { SQLValidator } from "./sql-validator.js";

// Minimal interface for the OpenClaw Plugin API
// This avoids importing from 'openclaw' which requires the full SDK
interface OpenClawPluginApi {
  runtime: {
    agent: {
      runEmbeddedPiAgent: (params: {
        sessionId: string;
        prompt: string;
        provider: string;
        model: string;
        timeoutMs: number;
        disableTools: boolean;
      }) => Promise<{
        payloads?: Array<{ text?: string; isError?: boolean }>;
      }>;
    };
  };
}

export interface NLToSQLOptions {
  model?: string;
  temperature?: number;
}

function collectText(payloads: Array<{ text?: string; isError?: boolean }> | undefined): string {
  const texts = (payloads ?? [])
    .filter((p) => !p.isError && typeof p.text === "string")
    .map((p) => p.text ?? "");
  return texts.join("\n").trim();
}

export class NLToSQLConverter {
  private validator: SQLValidator;
  private api: OpenClawPluginApi;
  private systemPrompt: string;

  constructor(validator: SQLValidator, api: OpenClawPluginApi) {
    this.validator = validator;
    this.api = api;
    this.systemPrompt = "";
  }

  private async loadSystemPrompt(): Promise<string> {
    try {
      // In a real implementation, this would load from a file
      // For now, use the default prompt
      return this.getDefaultSystemPrompt();
    } catch {
      return this.getDefaultSystemPrompt();
    }
  }

  private getDefaultSystemPrompt(): string {
    return `你是一名数据分析专家，专门将自然语言查询转换为数数科技（ThinkingAnalytics）的 SQL 查询。

【数据表结构】
- ta.v_event_2: 事件表
  - #account_id: 用户ID (STRING)
  - #event_name: 事件名称 (STRING)
  - #event_time: 事件发生时间 (TIMESTAMP)
  - #distinct_id: 设备ID (STRING)

【重要规则】
1. 只生成 SELECT 查询
2. 必须包含 LIMIT 子句（最大100）
3. 时间过滤使用 #event_time
4. 日期函数使用标准 SQL

【输出格式】
只输出 SQL 语句，不要 markdown 代码块，不要解释。`;
  }

  async convert(naturalLanguage: string, context?: string): Promise<string> {
    // Lazy load system prompt
    if (!this.systemPrompt) {
      this.systemPrompt = await this.loadSystemPrompt();
    }

    // Build prompt
    const prompt = this.buildPrompt(naturalLanguage, context);

    // Call LLM to generate SQL
    const sql = await this.callLLM(prompt);

    // Validate SQL
    const validation = this.validator.validate(sql);
    if (!validation.valid) {
      throw new Error(`SQL 验证失败: ${validation.errors.join(", ")}`);
    }

    // Add safety limits
    return this.validator.sanitize(sql);
  }

  private buildPrompt(query: string, context?: string): string {
    let prompt = this.systemPrompt + "\n\n";

    if (context) {
      prompt += `上下文信息: ${context}\n\n`;
    }

    prompt += `用户查询: ${query}\n\n`;
    prompt += "请生成对应的 SQL 查询:";

    return prompt;
  }

  private async callLLM(prompt: string): Promise<string> {
    const result = await this.api.runtime.agent.runEmbeddedPiAgent({
      sessionId: `shushu-${Date.now()}`,
      prompt,
      provider: "my-provide",
      model: "Qwen",
      timeoutMs: 30_000,
      disableTools: true,
    });

    // Extract text from result.payloads
    const payloads = result?.payloads || [];
    const text = collectText(payloads);

    if (!text) {
      throw new Error("LLM 返回空结果");
    }

    return text;
  }
}
