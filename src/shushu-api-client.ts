export interface ShushuQueryRequest {
  sql: string;
}

export interface ShushuQueryResponse {
  columns: string[];
  rows: unknown[][];
  totalRows: number;
}

export class ShushuAPIClient {
  private endpoint: string;

  constructor(endpoint: string = "http://117.50.185.122:8992") {
    this.endpoint = endpoint;
  }

  async querySql(sql: string): Promise<ShushuQueryResponse> {
    const response = await fetch(`${this.endpoint}/querySql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql } satisfies ShushuQueryRequest),
    });

    if (!response.ok) {
      throw new Error(`数数 API 错误: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  private parseResponse(data: unknown): ShushuQueryResponse {
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format");
    }

    const response = data as Record<string, unknown>;

    return {
      columns: Array.isArray(response.columns) ? response.columns : [],
      rows: Array.isArray(response.rows) ? response.rows : [],
      totalRows: typeof response.totalRows === "number" ? response.totalRows : 0,
    };
  }
}
