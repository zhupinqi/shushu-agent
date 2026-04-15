// Shushu Analytics Plugin - OpenClaw Integration
// This file provides OpenClaw plugin integration

import { NLToSQLConverter } from "./src/nl-to-sql-converter.js";
import { ResultFormatter } from "./src/result-formatter.js";
import {
  ShushuAnalyticsPlugin,
  type ShushuAnalyticsConfig,
  type ProgressInfo,
} from "./src/shushu-analytics-plugin.js";
import { ShushuAPIClient } from "./src/shushu-api-client.js";
import { SQLValidator } from "./src/sql-validator.js";

// Minimal type definitions for OpenClaw Plugin API
interface CommandContext {
  user?: { id?: string };
  args: string[];
  reply?: (message: string) => Promise<unknown>;
}

interface MessageEvent {
  user?: { id?: string };
  message?: { content?: string };
  reply?: (message: string) => Promise<unknown>;
}

interface OpenClawPluginApi {
  getConfig: (key: string) => unknown;
  registerCommand: (cmd: {
    name: string;
    description: string;
    handler: (ctx: CommandContext) => Promise<string>;
  }) => void;
  on: (event: string, handler: (event: MessageEvent) => Promise<string | undefined>) => void;
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

// Global plugin instance cache
const pluginInstances = new Map<string, ShushuAnalyticsPlugin>();

function getOrCreatePlugin(
  api: OpenClawPluginApi,
  config: ShushuAnalyticsConfig = {},
): ShushuAnalyticsPlugin {
  const key = config.apiEndpoint || "default";

  if (!pluginInstances.has(key)) {
    const validator = new SQLValidator();
    const client = new ShushuAPIClient(config.apiEndpoint);
    const formatter = new ResultFormatter();
    const converter = new NLToSQLConverter(validator, api);

    const plugin = new ShushuAnalyticsPlugin(converter, validator, client, formatter, config);
    pluginInstances.set(key, plugin);
  }

  return pluginInstances.get(key)!;
}

// Plugin entry definition
const pluginDefinition = {
  id: "shushu-analytics",
  name: "数数数据分析",
  description: "通过自然语言查询数数科技（TA）数据",
  register(api: OpenClawPluginApi) {
    // Get configuration
    const config = (api.getConfig("shushuAnalytics") as ShushuAnalyticsConfig | undefined) || {};

    // Register the /shushu command
    api.registerCommand({
      name: "shushu",
      description: "数数数据分析查询 - 通过自然语言查询数数科技数据",
      handler: async (ctx: CommandContext) => {
        const userId = ctx.user?.id || "anonymous";
        const query = ctx.args.join(" ");

        if (!query) {
          return "请提供查询内容。例如: /shushu 昨天活跃用户数";
        }

        // Send initial progress message
        await ctx.reply?.("🤔 正在理解您的查询...");

        const plugin = getOrCreatePlugin(api, config);

        // Handle query with progress updates
        const result = await plugin.handleQuery(userId, query, async (progress: ProgressInfo) => {
          // Update progress message
          await ctx.reply?.(progress.message);
        });

        return result;
      },
    });

    // Register message handler for natural language queries
    // Pattern matches queries starting with "查询", "统计", "分析"
    api.on("message", async (event: MessageEvent) => {
      const messageText = event.message?.content || "";
      const match = messageText.match(/^(查询|统计|分析)\s*(.+)/i);

      if (!match) {
        return undefined; // Not handled
      }

      const userId = event.user?.id || "anonymous";
      const query = match[2] || messageText;

      // Send initial progress
      await event.reply?.("🤔 正在理解您的查询...");

      const plugin = getOrCreatePlugin(api, config);

      // Handle query with progress updates
      const result = await plugin.handleQuery(userId, query, async (progress: ProgressInfo) => {
        await event.reply?.(progress.message);
      });

      return result;
    });
  },
};

// Export for OpenClaw
export default pluginDefinition;

// Also export as named export for flexibility
export { pluginDefinition as shushuAnalyticsPlugin };
