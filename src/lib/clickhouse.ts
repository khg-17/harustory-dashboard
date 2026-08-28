import { createClient } from '@clickhouse/client';

const host = process.env.CLICKHOUSE_HOST || 'http://localhost:8123';
const username = process.env.CLICKHOUSE_USER || 'default';
const password = process.env.CLICKHOUSE_PASSWORD || '';
const database = process.env.CLICKHOUSE_DATABASE || 'default';

// Create a single ClickHouse client instance
const client = createClient({
  url: host,
  username: username,
  password: password,
  database: database,
  clickhouse_settings: {
    max_execution_time: 30, // 30s query timeout limit as per Rule 2
    max_memory_usage: '4294967296', // 4GB memory limit per query to prevent MEMORY_LIMIT_EXCEEDED
    max_bytes_before_external_group_by: '268435456', // 256MB spill to disk before external group by
    max_partitions_to_read: '1000', // Allow reading up to 1000 partitions for wide date ranges
    max_rows_to_read: '0', // Allow reading large tables without hitting 50M row limit
  },
});

export async function queryClickHouse<T = any>(sql: string): Promise<T[]> {
  try {
    const resultSet = await client.query({
      query: sql,
      format: 'JSONEachRow',
    });
    const dataset = await resultSet.json<T>();
    return dataset;
  } catch (error) {
    console.error('ClickHouse query execution error:', error);
    throw error;
  }
}
