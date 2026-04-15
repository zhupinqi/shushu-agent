import { describe, it, expect, beforeEach } from "vitest";
import { ResultFormatter } from "../src/result-formatter.js";
import type { ShushuQueryResponse } from "../src/shushu-api-client.js";

describe("ResultFormatter", () => {
  let formatter: ResultFormatter;
  let mockResponse: ShushuQueryResponse;

  beforeEach(() => {
    formatter = new ResultFormatter();
    mockResponse = {
      columns: ["name", "value", "count"],
      rows: [
        ["test1", 123, 10],
        ["test2", 456, 20],
      ],
      totalRows: 2,
    };
  });

  describe("format as table", () => {
    it("should format as markdown table by default", () => {
      const result = formatter.format(mockResponse, "table");

      expect(result).toContain("name | value | count");
      expect(result).toContain("--- | --- | ---");
      expect(result).toContain("test1 | 123 | 10");
      expect(result).toContain("test2 | 456 | 20");
      expect(result).toContain("共 2 条记录");
    });

    it("should handle empty result", () => {
      const emptyResponse: ShushuQueryResponse = {
        columns: [],
        rows: [],
        totalRows: 0,
      };

      const result = formatter.format(emptyResponse, "table");

      expect(result).toBe("查询结果为空");
    });

    it("should handle null values", () => {
      const responseWithNull: ShushuQueryResponse = {
        columns: ["name", "value"],
        rows: [["test", null]],
        totalRows: 1,
      };

      const result = formatter.format(responseWithNull, "table");

      expect(result).toContain("test | -");
    });

    it("should handle object values", () => {
      const responseWithObject: ShushuQueryResponse = {
        columns: ["name", "data"],
        rows: [["test", { key: "value" }]],
        totalRows: 1,
      };

      const result = formatter.format(responseWithObject, "table");

      expect(result).toContain('"key":"value"');
    });
  });

  describe("format as markdown", () => {
    it("should format same as table", () => {
      const tableResult = formatter.format(mockResponse, "table");
      const markdownResult = formatter.format(mockResponse, "markdown");

      expect(markdownResult).toBe(tableResult);
    });
  });

  describe("format as CSV", () => {
    it("should format as CSV", () => {
      const result = formatter.format(mockResponse, "csv");

      expect(result).toContain("name,value,count");
      expect(result).toContain('"test1","123","10"');
      expect(result).toContain('"test2","456","20"');
    });

    it("should escape quotes in CSV", () => {
      const responseWithQuotes: ShushuQueryResponse = {
        columns: ["name"],
        rows: [['value "with" quotes']],
        totalRows: 1,
      };

      const result = formatter.format(responseWithQuotes, "csv");

      expect(result).toContain('"value ""with"" quotes"');
    });

    it("should handle null values in CSV", () => {
      const responseWithNull: ShushuQueryResponse = {
        columns: ["name", "value"],
        rows: [["test", null]],
        totalRows: 1,
      };

      const result = formatter.format(responseWithNull, "csv");

      expect(result).toContain('"test",""');
    });
  });

  describe("format as summary", () => {
    it("should show summary with record count", () => {
      const result = formatter.format(mockResponse, "summary");

      expect(result).toContain("查询返回 2 条记录");
    });

    it("should show first 5 rows in summary", () => {
      const largeResponse: ShushuQueryResponse = {
        columns: ["id"],
        rows: [[1], [2], [3], [4], [5], [6], [7]],
        totalRows: 7,
      };

      const result = formatter.format(largeResponse, "summary");

      expect(result).toContain("前 5 条数据");
      expect(result).toContain("id: 1");
      expect(result).toContain("id: 5");
      expect(result).not.toContain("id: 6");
    });

    it("should handle empty result in summary", () => {
      const emptyResponse: ShushuQueryResponse = {
        columns: [],
        rows: [],
        totalRows: 0,
      };

      const result = formatter.format(emptyResponse, "summary");

      expect(result).toBe("查询结果为空");
    });
  });

  describe("invalid format fallback", () => {
    it("should fallback to table for unknown format", () => {
      const result = formatter.format(mockResponse, "unknown" as "table");

      expect(result).toContain("name | value | count");
    });
  });
});
