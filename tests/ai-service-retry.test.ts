import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import { withProviderRetry } from '../apps/api/src/ai/provider-retry.ts';

// Node's strip-types runner cannot execute Nest decorators. Compile this service
// in memory while retaining the real OpenAI SDK and application retry wrapper.
const serviceUrl = new URL('../apps/api/src/ai/ai.service.ts', import.meta.url);
const require = createRequire(serviceUrl);
const compiled = ts.transpileModule(readFileSync(serviceUrl, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true, esModuleInterop: true },
});
const serviceExports: any = {};
new Function('require', 'exports', compiled.outputText)(
  (name: string) => name === './provider-retry' ? { withProviderRetry } : require(name),
  serviceExports,
);

for (const operation of ['embed', 'answer']) {
  test(`${operation} makes at most three HTTP attempts including SDK retries`, async () => {
    const service = new serviceExports.AiService({
      get: () => undefined,
      getOrThrow: () => 'test-only-placeholder',
    });
    let requests = 0;
    const client = operation === 'embed' ? service.embeddingClient : service.chatClient;
    client.fetch = async () => {
      requests += 1;
      return new Response(JSON.stringify({ error: { message: 'temporary test failure' } }), {
        status: 503, headers: { 'Content-Type': 'application/json', 'retry-after-ms': '1' },
      });
    };
    await assert.rejects(() => operation === 'embed'
      ? service.embed('test')
      : service.answer({ question: 'test', context: 'test', history: [] }));
    assert.equal(requests, 3);
  });
}
