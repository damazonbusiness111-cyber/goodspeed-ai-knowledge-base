# Goodspeed Loom recording scripts

These scripts keep both requested walkthroughs below five minutes. Replace the pending entries in the root README with the final Loom URLs after recording.

## 1. Application walkthrough — target 4:40

### 0:00–0:30 — Outcome and architecture

“This is an AI-powered knowledge base built as a Turborepo with a Next.js web app, a NestJS API, shared TypeScript types, and Supabase for Auth, PostgreSQL, RLS, and pgvector. Users manage private documents and ask grounded questions against their own content.”

Show the repository structure and the architecture diagram in the README.

### 0:30–1:10 — Authentication and documents

Show the signed-in workspace and `Goodspeed Test Document`. Explain that the browser sends the Supabase bearer token to the API and the API creates a user-scoped Supabase client, keeping RLS as the database authorization boundary. Open the document and point out title, tags, content, and timestamps. Mention that create and update automatically re-index content, while delete removes the document and cascades to its chunks.

### 1:10–2:00 — Ingestion and retrieval

Show the chunking utility, the document service, and `match_document_chunks`. Explain the paragraph-aware 3,000-character chunks with 350-character overlap, provider-independent character sizing, model and dimension filtering, and authenticated-user filtering before vector similarity ordering.

### 2:00–2:40 — Provider switching

Show only `.env.example`; never show a real `.env` file. Explain that chat and embeddings each use an OpenAI SDK client configured by base URL, API key, and model. Switching to another OpenAI-compatible provider changes configuration rather than application code. Mention that application-level retries own a bounded three-attempt budget.

### 2:40–3:40 — Grounded answer and citations

In the app, ask: “What is the Goodspeed assessment test code?” Show the `BLUE-777` response and expand the citations. Point out the source title, excerpt, and similarity. Refresh the page and reopen the saved conversation to demonstrate persistence.

### 3:40–4:15 — Security and failure handling

Show the migration policies and transactional update function. Explain ownership constraints, RLS, prompt-injection treatment of retrieved text as data, embeddings prepared before document replacement, and atomic document-and-chunk updates. Mention the security smoke test that verifies cross-user isolation.

### 4:15–4:40 — Trade-offs

“Given more time, I would add streaming, queued ingestion, retrieval evaluation, rate limiting, caching, observability, and file extraction. The current scope prioritizes a working, secure, explainable vertical slice.”

## 2. AI-assisted development walkthrough — target 3:30

### 0:00–0:35 — How AI was used

“I used an AI-native development workflow. Codex performed the repository implementation, debugging, test creation, command execution, and authenticated browser verification under my direction. I used ChatGPT Plus for planning, interpreting the assessment, and skill-guided review. I’m being explicit about that because the assessment permits AI coding tools and I want you to see how I used them, not imply that I manually typed the code.”

### 0:35–1:20 — Architecture and implementation acceleration

Show the monorepo layout, shared types, migration, and service boundaries. Explain that you supplied the scope, constraints, and assessment context; Codex inspected and changed the repository; and ChatGPT Plus helped structure the plan and review criteria. Show how the workflow preserved explicit decisions around the user-JWT/RLS model, provider-independent configuration, transactional re-indexing, and retrieval contract.

### 1:20–2:10 — Debugging with evidence

Show `chat-persistence.ts` and its tests. Explain the original database failure: the user message omitted the non-null `source_chunk_ids` array. The fix explicitly persists `[]` for user and ungrounded messages and retrieved chunk UUIDs for grounded assistant messages. Show the regression tests.

### 2:10–2:50 — Retry review

Show `provider-retry.ts`, `ai.service.ts`, and the retry tests. Explain that review found nested OpenAI SDK retries could multiply three wrapper attempts into nine HTTP requests. Disabling SDK retries left one bounded owner with three total attempts and 250/500 ms delays for HTTP 429 and 5xx responses, with no retry for ordinary HTTP 400 failures.

### 2:50–3:30 — Human verification and limits

Show the test commands and the live `BLUE-777` result. Explain that Codex did not stop at code generation: it ran tests, lint, typecheck, build, a transactional RLS smoke test, and the authenticated browser flow. Explain your role in authorizing scoped actions, securely handling credentials, reviewing the evidence, and deciding when the assessment requirements were satisfied. Close by noting that local secrets are ignored and the README uses placeholders only.
