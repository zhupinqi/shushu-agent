export interface ConversationTurn {
  query: string;
  sql: string;
  result?: unknown;
  timestamp: Date;
}

export class ConversationContext {
  private history: ConversationTurn[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 5) {
    this.maxHistory = maxHistory;
  }

  addTurn(turn: ConversationTurn): void {
    this.history.push(turn);

    // 保持历史记录在限制范围内
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getContextString(): string {
    if (this.history.length === 0) {
      return "";
    }

    const lines: string[] = ["对话历史:"];

    for (const turn of this.history) {
      lines.push(`- 用户: ${turn.query}`);
      lines.push(`  SQL: ${turn.sql}`);
    }

    return lines.join("\n");
  }

  getLastQuery(): string | undefined {
    const last = this.history[this.history.length - 1];
    return last?.query;
  }

  clear(): void {
    this.history = [];
  }

  getHistory(): ConversationTurn[] {
    return [...this.history];
  }
}
