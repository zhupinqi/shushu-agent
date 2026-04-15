import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NLToSQLConverter } from "../src/nl-to-sql-converter.js";
import type { ResultFormatter } from "../src/result-formatter.js";
import {
  ShushuAnalyticsPlugin,
  type ShushuAnalyticsConfig,
  type ProgressInfo,
} from "../src/shushu-analytics-plugin.js";
import type { ShushuAPIClient, ShushuQueryResponse } from "../src/shushu-api-client.js";
import type { SQLValidator } from "../src/sql-validator.js";

describe("ShushuAnalyticsPlugin - Progress Indicators", () => {
  let plugin: ShushuAnalyticsPlugin;
  let mockConverter: NLToSQLConverter;
  let mockValidator: SQLValidator;
  let mockClient: ShushuAPIClient;
  let mockFormatter: ResultFormatter;
  let config: ShushuAnalyticsConfig;

  beforeEach(() => {
    // Create mocks
    mockConverter = {
      convert: vi.fn().mockResolvedValue("SELECT * FROM ta.v_event_2 LIMIT 10"),
    } as unknown as NLToSQLConverter;

    mockValidator = {
      validate: vi.fn().mockReturnValue({ valid: true, errors: [] }),
      sanitize: vi.fn().mockReturnValue("SELECT * FROM ta.v_event_2 LIMIT 10"),
    } as unknown as SQLValidator;

    mockClient = {
      querySql: vi.fn().mockResolvedValue({
        columns: ["col1", "col2"],
        rows: [["val1", "val2"]],
        totalRows: 1,
      } as ShushuQueryResponse),
    } as unknown as ShushuAPIClient;

    mockFormatter = {
      format: vi.fn().mockReturnValue("col1 | col2\n--- | ---\nval1 | val2"),
    } as unknown as ResultFormatter;

    config = { apiEndpoint: "http://test.example.com", maxResults: 50 };
    plugin = new ShushuAnalyticsPlugin(
      mockConverter,
      mockValidator,
      mockClient,
      mockFormatter,
      config,
    );
  });

  it("should call progress callback for each phase", async () => {
    const progressCalls: ProgressInfo[] = [];
    const onProgress = vi.fn((progress: ProgressInfo) => {
      progressCalls.push(progress);
    });

    await plugin.handleQuery("user1", "test query", onProgress);

    expect(onProgress).toHaveBeenCalledTimes(4);
    expect(progressCalls[0].phase).toBe("understanding");
    expect(progressCalls[0].message).toBe("🤔 正在理解您的查询...");
    expect(progressCalls[1].phase).toBe("validating");
    expect(progressCalls[1].message).toBe("🔒 正在验证查询安全性...");
    expect(progressCalls[2].phase).toBe("querying");
    expect(progressCalls[2].message).toBe("📊 正在查询数数数据...");
    expect(progressCalls[3].phase).toBe("formatting");
    expect(progressCalls[3].message).toBe("📝 正在格式化结果...");
  });

  it("should include startTime in progress info", async () => {
    const beforeStart = Date.now();
    const progressCalls: ProgressInfo[] = [];

    await plugin.handleQuery("user1", "test query", (progress) => {
      progressCalls.push(progress);
    });

    const afterStart = Date.now();

    expect(progressCalls[0].startTime).toBeGreaterThanOrEqual(beforeStart);
    expect(progressCalls[0].startTime).toBeLessThanOrEqual(afterStart);
  });

  it("should work without progress callback", async () => {
    const result = await plugin.handleQuery("user1", "test query");

    expect(result).toContain("生成的 SQL:");
    expect(result).toContain("查询结果:");
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(mockConverter.convert).mockRejectedValue(new Error("Conversion failed"));

    const result = await plugin.handleQuery("user1", "test query");

    expect(result).toContain("查询失败:");
    expect(result).toContain("Conversion failed");
  });

  it("should return progress messages with handleQueryWithProgressMessages", async () => {
    const results = await plugin.handleQueryWithProgressMessages("user1", "test query");

    expect(results).toHaveLength(5);
    expect(results[0]).toEqual({ type: "progress", content: "🤔 正在理解您的查询..." });
    expect(results[1]).toEqual({ type: "progress", content: "🔒 正在验证查询安全性..." });
    expect(results[2]).toEqual({ type: "progress", content: "📊 正在查询数数数据..." });
    expect(results[3]).toEqual({ type: "progress", content: "📝 正在格式化结果..." });
    expect(results[4].type).toBe("result");
    expect(results[4].content).toContain("生成的 SQL:");
  });

  it("should handle errors in handleQueryWithProgressMessages", async () => {
    vi.mocked(mockConverter.convert).mockRejectedValue(new Error("Conversion failed"));

    const results = await plugin.handleQueryWithProgressMessages("user1", "test query");

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ type: "progress", content: "🤔 正在理解您的查询..." });
    expect(results[1].type).toBe("result");
    expect(results[1].content).toContain("查询失败:");
  });

  it("should call converter with context", async () => {
    await plugin.handleQuery("user1", "test query");

    expect(mockConverter.convert).toHaveBeenCalledWith("test query", "");
  });

  it("should include context from previous queries", async () => {
    // First query
    await plugin.handleQuery("user1", "first query");

    // Reset mock
    vi.mocked(mockConverter.convert).mockClear();
    vi.mocked(mockConverter.convert).mockResolvedValue("SELECT 2");

    // Second query
    await plugin.handleQuery("user1", "second query");

    expect(mockConverter.convert).toHaveBeenCalledWith(
      "second query",
      expect.stringContaining("first query"),
    );
  });
});
