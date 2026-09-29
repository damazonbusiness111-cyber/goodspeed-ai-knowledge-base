import assert from 'node:assert/strict';
import test from 'node:test';
import { withProviderRetry } from '../apps/api/src/ai/provider-retry.ts';

test('transient provider failures are retried with bounded exponential backoff', async () => {
  let attempts = 0;
  const delays: number[] = [];

  const result = await withProviderRetry(async () => {
    attempts += 1;
    if (attempts < 3) throw Object.assign(new Error('temporarily unavailable'), { status: 503 });
    return 'BLUE-777';
  }, async (milliseconds) => { delays.push(milliseconds); });

  assert.equal(result, 'BLUE-777');
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [250, 500]);
});

test('non-transient provider failures are not retried', async () => {
  let attempts = 0;

  await assert.rejects(() => withProviderRetry(async () => {
    attempts += 1;
    throw Object.assign(new Error('bad request'), { status: 400 });
  }, async () => {}), /bad request/);

  assert.equal(attempts, 1);
});

for (const status of [429, 500, 503]) {
  test(`persistent HTTP ${status} stops after three attempts`, async () => {
    let attempts = 0;
    const delays: number[] = [];
    const error = Object.assign(new Error('provider failure'), { status });
    await assert.rejects(() => withProviderRetry(async () => {
      attempts += 1;
      throw error;
    }, async (ms) => { delays.push(ms); }), (actual) => actual === error);
    assert.equal(attempts, 3);
    assert.deepEqual(delays, [250, 500]);
  });
}
