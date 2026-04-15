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

    // 检查禁止的操作 - 使用词边界匹配防止绕过
    for (const keyword of this.forbiddenKeywords) {
      // 使用正则表达式词边界匹配，防止 "my_DELETE_table" 被误判
      const forbiddenPattern = new RegExp(`\\b${keyword}\\b`, 'i');
      if (forbiddenPattern.test(sql)) {
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
