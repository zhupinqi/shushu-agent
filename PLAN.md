# 飞书数数数据分析插件 - 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建一个 OpenClaw 飞书插件，让用户通过自然语言查询数数科技（TA）数据，LLM 直接生成 SQL 并返回格式化结果。

**Architecture:** 基于 OpenClaw 插件 SDK 构建，使用 LLM 将自然语言转换为 SQL，调用数数 HTTP API，返回格式化表格。支持多轮对话上下文。

**Tech Stack:** TypeScript, OpenClaw Plugin SDK, 数数科技 API

---

## 文件结构

```
extensions/shushu-analytics/
├── openclaw.plugin.json          # 插件清单
├── package.json                  # 包配置
├── tsconfig.json                 # TypeScript 配置
├── index.ts                      # 插件入口
├── api.ts                        # 公开 API 接口
├── src/
│   ├── shushu-analytics-plugin.ts    # 主插件逻辑
│   ├── nl-to-sql-converter.ts        # 自然语言转 SQL
│   ├── sql-validator.ts              # SQL 安全验证
│   ├── shushu-api-client.ts          # 数数 API 客户端
│   ├── result-formatter.ts           # 结果格式化
│   └── conversation-context.ts       # 对话上下文管理
├── test/
│   └── shushu-analytics.test.ts      # 测试文件
└── prompts/
    └── nl-to-sql-system-prompt.txt   # LLM 系统提示词
```

---

## 依赖分析

需要调研 OpenClaw 插件如何接入飞书消息系统。从飞书官方插件文档可以看出：
- 飞书插件通过 `@larksuite/openclaw-lark` 包接入
- OpenClaw 插件需要注册特定的 handlers 来处理消息
- 需要查看现有插件如何处理飞书消息

---

## Task 1: 基础插件结构

**Files:**
- Create: `extensions/shushu-analytics/package.json`
- Create: `extensions/shushu-analytics/tsconfig.json`
- Create: `extensions/shushu-analytics/openclaw.plugin.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "@openclaw/shushu-analytics",
  "version": "1.0.0",
  "description": "数数科技数据分析插件 - 通过自然语言查询 TA 数据",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "dependencies": {
    "openclaw": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: 创建 openclaw.plugin.json**

```json
{
  "id": "shushu-analytics",
  "name": "数数数据分析",
  "description": "通过自然语言查询数数科技（TA）数据，支持活跃用户、留存率、事件分析等",
  "version": "1.0.0",
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "shushuAnalytics": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "apiEndpoint": {
            "type": "string",
            "description": "数数 API 地址",
            "default": "http://117.50.185.122:8992"
          },
          "maxResults": {
            "type": "number",
            "description": "最大返回结果数",
            "default": 100
          }
        }
      }
    }
  }
}
```

- [ ] **Step 4: 安装依赖**

```bash
cd extensions/shushu-analytics
npm install
```

---

## Task 2: 数数 API 客户端

**Files:**
- Create: `extensions/shushu-analytics/src/shushu-api-client.ts`

- [ ] **Step 1: 创建 API 客户端**

```typescript
export interface ShushuQueryRequest {
  sql: string;
  params?: Record<string, unknown>;
}

export interface ShushuQueryResponse {
  columns: string[];
  rows: unknown[][];
  totalRows: number;
}

export class ShushuAPIClient {
  private endpoint: string;

  constructor(endpoint: string = 'http://117.50.185.122:8992') {
    this.endpoint = endpoint;
  }

  async querySql(sql: string): Promise<ShushuQueryResponse> {
    const response = await fetch(`${this.endpoint}/querySql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      throw new Error(`数数 API 错误: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.parseResponse(data);
  }

  private parseResponse(data: unknown): ShushuQueryResponse {
    // 解析数数 API 返回的数据格式
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format');
    }

    const response = data as Record<string, unknown>;

    return {
      columns: Array.isArray(response.columns) ? response.columns : [],
      rows: Array.isArray(response.rows) ? response.rows : [],
      totalRows: typeof response.totalRows === 'number' ? response.totalRows : 0,
    };
  }
}
```

---

## Task 3: SQL 安全验证器

**Files:**
- Create: `extensions/shushu-analytics/src/sql-validator.ts`

- [ ] **Step 1: 创建 SQL 验证器**

```typescript
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class SQLValidator {
  // 禁止的操作
  private readonly forbiddenKeywords = [
    'DELETE',
    'DROP',
    'TRUNCATE',
    'ALTER',
    'CREATE',
    'INSERT',
    'UPDATE',
    'GRANT',
    'REVOKE',
  ];

  // 只允许查询的事件表
  private readonly allowedTables = [
    'ta.v_event_2',
    'ta.v_user',
    'user_result_cluster_2',
  ];

  validate(sql: string): ValidationResult {
    const errors: string[] = [];
    const upperSql = sql.toUpperCase();

    // 检查禁止的操作
    for (const keyword of this.forbiddenKeywords) {
      if (upperSql.includes(keyword)) {
        errors.push(`禁止的操作: ${keyword}`);
      }
    }

    // 确保是 SELECT 查询
    if (!upperSql.trim().startsWith('SELECT')) {
      errors.push('只允许 SELECT 查询');
    }

    // 检查 LIMIT（防止大量数据查询）
    if (!upperSql.includes('LIMIT')) {
      errors.push('查询必须包含 LIMIT 子句');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // 自动添加安全限制
  sanitize(sql: string): string {
    let sanitized = sql.trim();

    // 如果没有 LIMIT，添加默认限制
    if (!sanitized.toUpperCase().includes('LIMIT')) {
      sanitized += ' LIMIT 100';
    }

    return sanitized;
  }
}
```

---

## Task 4: 自然语言转 SQL 模块

**Files:**
- Create: `extensions/shushu-analytics/src/nl-to-sql-converter.ts`
- Create: `extensions/shushu-analytics/prompts/nl-to-sql-system-prompt.txt`

- [ ] **Step 1: 创建系统提示词**

```text
你是一名数据分析专家，专门将自然语言查询转换为数数科技（ThinkingAnalytics）的 SQL 查询。

数数科技数据表结构：
- 主事件表: ta.v_event_2
  - #account_id: 用户ID (string)
  - #event_name: 事件名称 (string)
  - #zone: 时区 (string, 默认 'Asia/Shanghai')
  - #event_time: 事件发生时间 (timestamp)
  - #ip: IP地址
  - #distinct_id: 设备ID
  - 事件属性: 根据事件不同有自定义属性

- 用户属性表: ta.v_user
  - #account_id: 用户ID
  - 各种用户属性字段

常见事件名称：
- ta_app_launch: 应用启动
- ta_app_click: 应用点击
- ta_app_view: 页面浏览
- finish-daily: 完成打卡
- buy_furniture: 购买家具

转换规则：
1. 只生成 SELECT 查询，禁止生成 DELETE/DROP/INSERT/UPDATE
2. 所有查询必须包含 LIMIT，默认 LIMIT 100
3. 时间条件优先使用 #event_time
4. 日期范围使用日期函数处理
5. 聚合查询使用 GROUP BY

输出格式：
直接输出 SQL 语句，不要包含 markdown 代码块标记。
```

- [ ] **Step 2: 创建转换器**

```typescript
import type { SQLValidator } from './sql-validator.js';

export interface NLToSQLOptions {
  model?: string;
  temperature?: number;
}

export class NLToSQLConverter {
  private validator: SQLValidator;
  private systemPrompt: string;

  constructor(validator: SQLValidator) {
    this.validator = validator;
    this.systemPrompt = this.loadSystemPrompt();
  }

  private loadSystemPrompt(): string {
    // 在实际实现中从文件加载
    return `你是一名数据分析专家...`; // 简化版
  }

  async convert(
    naturalLanguage: string,
    context?: string
  ): Promise<string> {
    // 构建提示词
    const prompt = this.buildPrompt(naturalLanguage, context);

    // 调用 LLM 生成 SQL
    const sql = await this.callLLM(prompt);

    // 验证 SQL
    const validation = this.validator.validate(sql);
    if (!validation.valid) {
      throw new Error(`SQL 验证失败: ${validation.errors.join(', ')}`);
    }

    // 添加安全限制
    return this.validator.sanitize(sql);
  }

  private buildPrompt(query: string, context?: string): string {
    let prompt = this.systemPrompt + '\n\n';

    if (context) {
      prompt += `上下文信息: ${context}\n\n`;
    }

    prompt += `用户查询: ${query}\n\n`;
    prompt += '请生成对应的 SQL 查询:';

    return prompt;
  }

  private async callLLM(prompt: string): Promise<string> {
    // 这里通过 OpenClaw 的模型调用接口
    // 实际实现会注入模型调用依赖
    throw new Error('Not implemented - requires model integration');
  }
}
```

---

## Task 5: 结果格式化器

**Files:**
- Create: `extensions/shushu-analytics/src/result-formatter.ts`

- [ ] **Step 1: 创建格式化器**

```typescript
import type { ShushuQueryResponse } from './shushu-api-client.js';

export type OutputFormat = 'table' | 'markdown' | 'csv' | 'summary';

export class ResultFormatter {
  format(result: ShushuQueryResponse, format: OutputFormat = 'table'): string {
    switch (format) {
      case 'table':
        return this.formatAsTable(result);
      case 'markdown':
        return this.formatAsMarkdown(result);
      case 'csv':
        return this.formatAsCSV(result);
      case 'summary':
        return this.formatAsSummary(result);
      default:
        return this.formatAsTable(result);
    }
  }

  private formatAsTable(result: ShushuQueryResponse): string {
    if (result.rows.length === 0) {
      return '查询结果为空';
    }

    const lines: string[] = [];

    // 表头
    lines.push(result.columns.join(' | '));
    lines.push(result.columns.map(() => '---').join(' | '));

    // 数据行
    for (const row of result.rows) {
      lines.push(row.map(cell => String(cell ?? '-')).join(' | '));
    }

    // 统计信息
    lines.push('');
    lines.push(`共 ${result.totalRows} 条记录`);

    return lines.join('\n');
  }

  private formatAsMarkdown(result: ShushuQueryResponse): string {
    return this.formatAsTable(result);
  }

  private formatAsCSV(result: ShushuQueryResponse): string {
    const lines: string[] = [];
    lines.push(result.columns.join(','));

    for (const row of result.rows) {
      lines.push(row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','));
    }

    return lines.join('\n');
  }

  private formatAsSummary(result: ShushuQueryResponse): string {
    if (result.rows.length === 0) {
      return '查询结果为空';
    }

    // 简单统计摘要
    const lines: string[] = [];
    lines.push(`查询返回 ${result.totalRows} 条记录`);
    lines.push('');

    // 显示前几条数据
    const displayCount = Math.min(5, result.rows.length);
    lines.push(`前 ${displayCount} 条数据:`);

    for (let i = 0; i < displayCount; i++) {
      const row = result.rows[i];
      const pairs = result.columns.map((col, idx) => `${col}: ${row[idx]}`);
      lines.push(`- ${pairs.join(', ')}`);
    }

    return lines.join('\n');
  }
}
```

---

## Task 6: 对话上下文管理

**Files:**
- Create: `extensions/shushu-analytics/src/conversation-context.ts`

- [ ] **Step 1: 创建上下文管理器**

```typescript
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
      return '';
    }

    const lines: string[] = ['对话历史:'];

    for (const turn of this.history) {
      lines.push(`- 用户: ${turn.query}`);
      lines.push(`  SQL: ${turn.sql}`);
    }

    return lines.join('\n');
  }

  getLastQuery(): string | undefined {
    const last = this.history[this.history.length - 1];
    return last?.query;
  }

  clear(): void {
    this.history = [];
  }
}
```

---

## Task 7: 主插件实现

**Files:**
- Create: `extensions/shushu-analytics/src/shushu-analytics-plugin.ts`
- Create: `extensions/shushu-analytics/index.ts`
- Create: `extensions/shushu-analytics/api.ts`

- [ ] **Step 1: 创建主插件类**

```typescript
import type { NLToSQLConverter } from './nl-to-sql-converter.js';
import type { SQLValidator } from './sql-validator.js';
import type { ShushuAPIClient } from './shushu-api-client.js';
import type { ResultFormatter } from './result-formatter.js';
import type { ConversationContext } from './conversation-context.js';

export interface ShushuAnalyticsConfig {
  apiEndpoint?: string;
  maxResults?: number;
}

export class ShushuAnalyticsPlugin {
  private converter: NLToSQLConverter;
  private validator: SQLValidator;
  private client: ShushuAPIClient;
  private formatter: ResultFormatter;
  private contexts: Map<string, ConversationContext>;

  constructor(config: ShushuAnalyticsConfig = {}) {
    this.validator = new SQLValidator();
    this.client = new ShushuAPIClient(config.apiEndpoint);
    this.converter = new NLToSQLConverter(this.validator);
    this.formatter = new ResultFormatter();
    this.contexts = new Map();
  }

  async handleQuery(
    userId: string,
    query: string
  ): Promise<string> {
    try {
      // 获取或创建上下文
      let context = this.contexts.get(userId);
      if (!context) {
        context = new ConversationContext();
        this.contexts.set(userId, context);
      }

      // 转换自然语言为 SQL
      const contextStr = context.getContextString();
      const sql = await this.converter.convert(query, contextStr);

      // 执行查询
      const result = await this.client.querySql(sql);

      // 格式化结果
      const formatted = this.formatter.format(result, 'table');

      // 保存到上下文
      context.addTurn({
        query,
        sql,
        result,
        timestamp: new Date(),
      });

      return `生成的 SQL:\n\`\`\`sql\n${sql}\n\`\`\`\n\n查询结果:\n${formatted}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      return `查询失败: ${message}`;
    }
  }

  clearContext(userId: string): void {
    this.contexts.delete(userId);
  }
}
```

- [ ] **Step 2: 创建插件入口**

```typescript
import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { ShushuAnalyticsPlugin } from './src/shushu-analytics-plugin.js';

export default definePluginEntry({
  id: 'shushu-analytics',
  name: '数数数据分析',
  description: '通过自然语言查询数数科技（TA）数据',
  register(api) {
    // 获取配置
    const config = api.getConfig('shushuAnalytics') || {};

    // 创建插件实例
    const plugin = new ShushuAnalyticsPlugin(config);

    // 注册命令处理器
    api.registerCommand({
      name: 'shushu',
      description: '数数数据分析查询',
      handler: async (ctx) => {
        const userId = ctx.user?.id || 'anonymous';
        const query = ctx.args.join(' ');

        if (!query) {
          return '请提供查询内容。例如: /shushu 昨天活跃用户数';
        }

        return await plugin.handleQuery(userId, query);
      },
    });

    // 注册消息处理器（用于自然语言交互）
    api.registerMessageHandler({
      pattern: /^(查询|统计|分析)/,
      handler: async (ctx) => {
        const userId = ctx.user?.id || 'anonymous';
        const query = ctx.message.content;
        return await plugin.handleQuery(userId, query);
      },
    });
  },
});
```

- [ ] **Step 3: 创建 API 导出**

```typescript
export { ShushuAnalyticsPlugin } from './src/shushu-analytics-plugin.js';
export { ShushuAPIClient } from './src/shushu-api-client.js';
export { NLToSQLConverter } from './src/nl-to-sql-converter.js';
export { SQLValidator } from './src/sql-validator.js';
export { ResultFormatter } from './src/result-formatter.js';
export { ConversationContext } from './src/conversation-context.js';
```

---

## Task 8: 测试

**Files:**
- Create: `extensions/shushu-analytics/test/shushu-analytics.test.ts`

- [ ] **Step 1: 创建测试文件**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SQLValidator } from '../src/sql-validator.js';
import { ResultFormatter } from '../src/result-formatter.js';
import { ConversationContext } from '../src/conversation-context.js';

describe('SQLValidator', () => {
  let validator: SQLValidator;

  beforeEach(() => {
    validator = new SQLValidator();
  });

  it('should validate SELECT query', () => {
    const result = validator.validate('SELECT * FROM ta.v_event_2 LIMIT 10');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject DELETE query', () => {
    const result = validator.validate('DELETE FROM ta.v_event_2');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('禁止的操作: DELETE');
  });

  it('should require LIMIT clause', () => {
    const result = validator.validate('SELECT * FROM ta.v_event_2');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('查询必须包含 LIMIT 子句');
  });
});

describe('ResultFormatter', () => {
  let formatter: ResultFormatter;

  beforeEach(() => {
    formatter = new ResultFormatter();
  });

  it('should format as table', () => {
    const result = formatter.format({
      columns: ['name', 'value'],
      rows: [['test', 123]],
      totalRows: 1,
    }, 'table');

    expect(result).toContain('name | value');
    expect(result).toContain('test | 123');
    expect(result).toContain('共 1 条记录');
  });

  it('should handle empty result', () => {
    const result = formatter.format({
      columns: [],
      rows: [],
      totalRows: 0,
    }, 'table');

    expect(result).toBe('查询结果为空');
  });
});

describe('ConversationContext', () => {
  let context: ConversationContext;

  beforeEach(() => {
    context = new ConversationContext();
  });

  it('should store and retrieve context', () => {
    context.addTurn({
      query: '昨天活跃用户',
      sql: 'SELECT COUNT(*) FROM ta.v_event_2 LIMIT 10',
      timestamp: new Date(),
    });

    const contextStr = context.getContextString();
    expect(contextStr).toContain('昨天活跃用户');
    expect(contextStr).toContain('SELECT');
  });

  it('should respect max history limit', () => {
    for (let i = 0; i < 10; i++) {
      context.addTurn({
        query: `query ${i}`,
        sql: `sql ${i}`,
        timestamp: new Date(),
      });
    }

    // 最大 5 条历史
    const contextStr = context.getContextString();
    expect(contextStr).not.toContain('query 0');
    expect(contextStr).toContain('query 9');
  });
});
```

---

## Task 9: 集成 OpenClaw 飞书插件

**调研点:**
需要了解飞书插件如何接收消息并调用其他插件。

从飞书官方插件文档看：
- 飞书插件通过 `@larksuite/openclaw-lark` 安装
- OpenClaw 插件之间可以通过 API 调用
- 需要查看飞书插件的扩展点

**可能的集成方式：**
1. 作为独立的 OpenClaw 插件，通过命令 `/shushu 查询内容` 调用
2. 作为飞书插件的子功能，通过消息处理器自动识别数据查询意图

**待调研：**
- 如何在 OpenClaw 插件中调用 LLM
- 飞书插件的消息处理器接口

---

## 已知问题与限制

1. **LLM 调用:** 需要调研 OpenClaw 插件如何调用配置的模型
2. **飞书集成:** 需要了解飞书插件的具体消息处理接口
3. **权限:** 数数 API 需要特定的网络访问权限
4. **数据安全:** SQL 验证器是关键安全组件，需要充分测试

---

## 后续迭代

### Phase 2
- [ ] 支持图表展示（柱状图、折线图）
- [ ] 支持查询结果导出为文件
- [ ] 支持定时报表推送

### Phase 3
- [ ] 自然语言描述生成数据洞察
- [ ] 支持自定义数据指标
- [ ] 与飞书多维表格集成

---

## 执行检查清单

- [ ] Task 1: 基础插件结构
- [ ] Task 2: 数数 API 客户端
- [ ] Task 3: SQL 安全验证器
- [ ] Task 4: 自然语言转 SQL 模块
- [ ] Task 5: 结果格式化器
- [ ] Task 6: 对话上下文管理
- [ ] Task 7: 主插件实现
- [ ] Task 8: 测试
- [ ] Task 9: 集成 OpenClaw 飞书插件（需调研）
