import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMessageRows } from '../apps/api/src/chat/chat-persistence.ts';

test('every persisted chat row supplies a non-null source chunk array', () => {
  const rows = buildMessageRows({
    userId: '00000000-0000-4000-8000-000000000001',
    conversationId: '00000000-0000-4000-8000-000000000002',
    question: 'What is the test code?',
    answer: 'BLUE-777',
    sourceChunkIds: ['00000000-0000-4000-8000-000000000003'],
    timestamp: 1_000,
  });

  assert.deepEqual(rows[0].source_chunk_ids, []);
  assert.deepEqual(rows[1].source_chunk_ids, ['00000000-0000-4000-8000-000000000003']);
});

test('assistant persistence uses an empty array when retrieval has no sources', () => {
  const rows = buildMessageRows({
    userId: '00000000-0000-4000-8000-000000000001',
    conversationId: '00000000-0000-4000-8000-000000000002',
    question: 'Unsupported question',
    answer: 'No relevant information found.',
    sourceChunkIds: [],
    timestamp: 1_000,
  });

  assert.deepEqual(rows.map((row) => row.source_chunk_ids), [[], []]);
});
