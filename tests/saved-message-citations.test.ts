import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSavedMessages } from '../apps/api/src/chat/saved-message-mapper.ts';

test('reopened assistant messages restore only their persisted citation metadata', () => {
  const messages = buildSavedMessages(
    [
      {
        role: 'user',
        content: 'What is the Goodspeed assessment test code?',
        source_chunk_ids: [],
      },
      {
        role: 'assistant',
        content: 'The Goodspeed assessment test code is BLUE-777.',
        source_chunk_ids: ['00000000-0000-4000-8000-000000000003'],
      },
    ],
    [
      {
        id: '00000000-0000-4000-8000-000000000003',
        document_id: '00000000-0000-4000-8000-000000000004',
        content: 'The Goodspeed assessment test code is BLUE-777.',
        document: { title: 'Goodspeed Test Document' },
      },
      {
        id: '00000000-0000-4000-8000-000000000099',
        document_id: '00000000-0000-4000-8000-000000000098',
        content: 'Unrelated owned chunk.',
        document: { title: 'Unrelated Document' },
      },
    ],
  );

  assert.deepEqual(messages, [
    {
      role: 'user',
      content: 'What is the Goodspeed assessment test code?',
      sources: [],
    },
    {
      role: 'assistant',
      content: 'The Goodspeed assessment test code is BLUE-777.',
      sources: [
        {
          documentId: '00000000-0000-4000-8000-000000000004',
          documentTitle: 'Goodspeed Test Document',
          chunkId: '00000000-0000-4000-8000-000000000003',
          content: 'The Goodspeed assessment test code is BLUE-777.',
        },
      ],
    },
  ]);
});

test('reopened messages omit citations whose chunks no longer exist after re-indexing', () => {
  const messages = buildSavedMessages(
    [
      {
        role: 'assistant',
        content: 'Historical answer',
        source_chunk_ids: ['00000000-0000-4000-8000-000000000003'],
      },
    ],
    [],
  );

  assert.deepEqual(messages[0].sources, []);
});
