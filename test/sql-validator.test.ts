import { describe, it, expect, beforeEach } from 'vitest';
import { SQLValidator } from '../src/sql-validator.js';

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

describe('SQLValidator Security - Word Boundary Matching', () => {
  let validator: SQLValidator;

  beforeEach(() => {
    validator = new SQLValidator();
  });

  // 正常表名不应被误判
  it('should allow table names containing forbidden keywords as substring', () => {
    const result = validator.validate('SELECT * FROM my_DELETE_table LIMIT 10');
    expect(result.valid).toBe(true);
    expect(result.errors).not.toContain('禁止的操作: DELETE');
  });

  it('should allow table names with DROP substring', () => {
    const result = validator.validate('SELECT * FROM airdrop_events LIMIT 10');
    expect(result.valid).toBe(true);
    expect(result.errors).not.toContain('禁止的操作: DROP');
  });

  it('should allow column names with INSERT substring', () => {
    const result = validator.validate('SELECT insert_time FROM ta.v_event_2 LIMIT 10');
    expect(result.valid).toBe(true);
    expect(result.errors).not.toContain('禁止的操作: INSERT');
  });

  // SQL注入攻击应该被检测
  it('should detect DELETE in multi-statement injection', () => {
    const result = validator.validate('SELECT * FROM ta.v_event_2; DELETE FROM users LIMIT 10');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('禁止的操作: DELETE');
  });

  it('should detect DELETE with comment injection', () => {
    const result = validator.validate('SELECT * FROM ta.v_event_2-- DELETE FROM users LIMIT 10');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('禁止的操作: DELETE');
  });

  it('should detect DELETE in block comment injection', () => {
    const result = validator.validate('SELECT * FROM ta.v_event_2 /* DELETE */ WHERE id=1 LIMIT 10');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('禁止的操作: DELETE');
  });

  it('should detect DROP TABLE injection', () => {
    const result = validator.validate('SELECT * FROM ta.v_event_2; DROP TABLE users LIMIT 10');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('禁止的操作: DROP');
  });

  it('should detect INSERT injection', () => {
    const result = validator.validate('SELECT * FROM ta.v_event_2; INSERT INTO users VALUES (1) LIMIT 10');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('禁止的操作: INSERT');
  });

  it('should detect UPDATE injection', () => {
    const result = validator.validate('SELECT * FROM ta.v_event_2; UPDATE users SET name=\'hacked\' LIMIT 10');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('禁止的操作: UPDATE');
  });

  it('should detect TRUNCATE injection', () => {
    const result = validator.validate('SELECT * FROM ta.v_event_2; TRUNCATE TABLE users LIMIT 10');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('禁止的操作: TRUNCATE');
  });

  it('should detect ALTER injection', () => {
    const result = validator.validate('SELECT * FROM ta.v_event_2; ALTER TABLE users ADD COLUMN hack TEXT LIMIT 10');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('禁止的操作: ALTER');
  });

  it('should detect CREATE injection', () => {
    const result = validator.validate('SELECT * FROM ta.v_event_2; CREATE TABLE hack (id INT) LIMIT 10');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('禁止的操作: CREATE');
  });

  // 大小写不敏感测试
  it('should detect lowercase delete', () => {
    const result = validator.validate('select * from ta.v_event_2; delete from users limit 10');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('禁止的操作: DELETE');
  });

  it('should detect mixed case DeLeTe', () => {
    const result = validator.validate('SELECT * FROM ta.v_event_2; DeLeTe FROM users LIMIT 10');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('禁止的操作: DELETE');
  });

  // 边界情况
  it('should detect keyword at start of string', () => {
    const result = validator.validate('DELETE FROM ta.v_event_2 LIMIT 10');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('禁止的操作: DELETE');
  });

  it('should detect keyword at end of string', () => {
    const result = validator.validate('SELECT * FROM ta.v_event_2; DELETE LIMIT 10');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('禁止的操作: DELETE');
  });
});
