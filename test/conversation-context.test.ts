import { describe, it, expect, beforeEach } from "vitest";
import { ConversationContext } from "../src/conversation-context.js";

describe("ConversationContext", () => {
  let context: ConversationContext;

  beforeEach(() => {
    context = new ConversationContext();
  });

  it("should store conversation turns", () => {
    context.addTurn({
      query: "昨天活跃用户",
      sql: "SELECT COUNT(*) FROM ta.v_event_2 LIMIT 10",
      timestamp: new Date(),
    });

    const contextStr = context.getContextString();
    expect(contextStr).toContain("昨天活跃用户");
    expect(contextStr).toContain("SELECT COUNT(*)");
  });

  it("should return empty string for empty context", () => {
    const contextStr = context.getContextString();
    expect(contextStr).toBe("");
  });

  it("should respect max history limit of 5", () => {
    // Add 7 turns
    for (let i = 0; i < 7; i++) {
      context.addTurn({
        query: `query ${i}`,
        sql: `sql ${i}`,
        timestamp: new Date(),
      });
    }

    const contextStr = context.getContextString();

    // Should only contain the last 5
    expect(contextStr).not.toContain("query 0");
    expect(contextStr).not.toContain("query 1");
    expect(contextStr).toContain("query 2");
    expect(contextStr).toContain("query 6");
  });

  it("should get last query", () => {
    context.addTurn({
      query: "first query",
      sql: "SELECT 1",
      timestamp: new Date(),
    });
    context.addTurn({
      query: "second query",
      sql: "SELECT 2",
      timestamp: new Date(),
    });

    const lastQuery = context.getLastQuery();
    expect(lastQuery).toBe("second query");
  });

  it("should return undefined for last query when empty", () => {
    const lastQuery = context.getLastQuery();
    expect(lastQuery).toBeUndefined();
  });

  it("should clear context", () => {
    context.addTurn({
      query: "test query",
      sql: "SELECT 1",
      timestamp: new Date(),
    });

    context.clear();

    expect(context.getContextString()).toBe("");
    expect(context.getLastQuery()).toBeUndefined();
  });

  it("should include result in turn if provided", () => {
    context.addTurn({
      query: "test query",
      sql: "SELECT 1",
      result: { count: 100 },
      timestamp: new Date(),
    });

    const contextStr = context.getContextString();
    expect(contextStr).toContain("test query");
  });
});
