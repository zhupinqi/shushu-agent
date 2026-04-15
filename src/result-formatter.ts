import type { ShushuQueryResponse } from "./shushu-api-client.js";

export type OutputFormat = "table" | "markdown" | "csv" | "summary";

export class ResultFormatter {
  format(result: ShushuQueryResponse, format: OutputFormat = "table"): string {
    switch (format) {
      case "table":
        return this.formatAsTable(result);
      case "markdown":
        return this.formatAsMarkdown(result);
      case "csv":
        return this.formatAsCSV(result);
      case "summary":
        return this.formatAsSummary(result);
      default:
        return this.formatAsTable(result);
    }
  }

  private formatAsTable(result: ShushuQueryResponse): string {
    if (result.rows.length === 0) {
      return "查询结果为空";
    }

    const lines: string[] = [];

    // 表头
    lines.push(result.columns.join(" | "));
    lines.push(result.columns.map(() => "---").join(" | "));

    // 数据行
    for (const row of result.rows) {
      lines.push(row.map((cell) => this.cellToString(cell)).join(" | "));
    }

    // 统计信息
    lines.push("");
    lines.push(`共 ${result.totalRows} 条记录`);

    return lines.join("\n");
  }

  private formatAsMarkdown(result: ShushuQueryResponse): string {
    return this.formatAsTable(result);
  }

  private formatAsCSV(result: ShushuQueryResponse): string {
    const lines: string[] = [];
    lines.push(result.columns.join(","));

    for (const row of result.rows) {
      lines.push(row.map((cell) => this.cellToCSV(cell)).join(","));
    }

    return lines.join("\n");
  }

  private formatAsSummary(result: ShushuQueryResponse): string {
    if (result.rows.length === 0) {
      return "查询结果为空";
    }

    // 简单统计摘要
    const lines: string[] = [];
    lines.push(`查询返回 ${result.totalRows} 条记录`);
    lines.push("");

    // 显示前几条数据
    const displayCount = Math.min(5, result.rows.length);
    lines.push(`前 ${displayCount} 条数据:`);

    for (let i = 0; i < displayCount; i++) {
      const row = result.rows[i];
      const pairs = result.columns.map((col, idx) => `${col}: ${this.cellToString(row[idx])}`);
      lines.push(`- ${pairs.join(", ")}`);
    }

    return lines.join("\n");
  }

  private cellToString(cell: unknown): string {
    if (cell === null || cell === undefined) {
      return "-";
    }
    if (typeof cell === "object") {
      return JSON.stringify(cell);
    }
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return String(cell);
  }

  private cellToCSV(cell: unknown): string {
    if (cell === null || cell === undefined) {
      return '""';
    }
    if (typeof cell === "object") {
      const str = JSON.stringify(cell);
      return `"${str.replace(/"/g, '""')}"`;
    }
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return `"${String(cell).replace(/"/g, '""')}"`;
  }
}
