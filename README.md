# Goodspeed AI-Powered Knowledge Base

A full-stack RAG knowledge base prepared for the Goodspeed Founding AI Engineer assessment. It has been verified locally against an isolated Supabase project and a Gemini provider through the OpenAI-compatible API.

## What it demonstrates

- **Turborepo monorepo** with a Next.js frontend, NestJS API, and shared TypeScript types.
- **Supabase Auth + RLS** so users can only access their own documents, chunks, conversations, and messages.
- **Document CRUD + automatic re-indexing** whenever content changes.
- **RAG pipeline** using paragraph-aware chunking, OpenAI-compatible embeddings, pgvector retrieval, and grounded prompts.
- **Provider-agnostic AI layer** configured through base URL, API key, and model names rather than provider-specific application code.
- **Persistent conversation history** (a stretch goal) plus **source citations** showing the retrieved chunks behind each answer.

## Architecture

```text
apps/web (Next.js)
  -> Supabase Auth
  -> Bearer token
apps/api (NestJS)
  -> verifies token with Supabase Auth
  -> uses a user-scoped Supabase client so RLS remains the authorization boundary
  -> documents service -> chunking -> embedding provider -> pgvector
  -> chat service -> query embedding -> similarity RPC -> grounded chat provider

packages/shared
  -> shared API/domain types

supabase/migrations
  -> schema, RLS policies, pgvector function
```

### Why the backend uses the user's JWT

The API does **not** use a service-role key for normal CRUD. After verifying the session, it creates a Supabase client with the user's bearer token. This keeps Postgres RLS as a second authorization layer rather than trusting controller code alone.

## RAG decisions

### Chunking

The implementation uses paragraph-aware chunks of roughly **3,000 characters** with **350 characters of overlap**. This is typically in the 650-850 token range for English prose. I chose character-based chunking deliberately to avoid coupling document ingestion to one tokenizer/provider while still keeping chunks small enough for targeted retrieval.

### Retrieval

The query is embedded, then `match_document_chunks` returns the top five chunks for the authenticated user. The function filters by:

- `auth.uid()`
- embedding model
- embedding dimension

A materialized CTE ensures only dimension-compatible vectors reach the distance operator. This lets different OpenAI-compatible embedding providers be configured without hard-coding a single vector dimension into the table schema.

### Prompt construction

Retrieved chunks are marked as sources and passed as **data**, with a system instruction to ignore instructions embedded in documents. This reduces prompt-injection risk from user-authored knowledge-base content.

## Provider abstraction

No application code imports a vendor-specific wrapper beyond the OpenAI SDK's standard client interface. Providers are selected through environment variables:

```env
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
AI_API_KEY=your-chat-provider-key
AI_CHAT_MODEL=your-chat-model

EMBEDDING_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
EMBEDDING_API_KEY=your-embedding-provider-key
EMBEDDING_MODEL=your-embedding-model
```

Examples:

- OpenAI: default base URL
- OpenRouter / Together: set their OpenAI-compatible base URL and model name
- Local Ollama: point `AI_BASE_URL` to its OpenAI-compatible endpoint

Chat and embeddings are independently configurable because some OpenAI-compatible providers do not expose embedding models.

## Setup

### Prerequisites

- Node.js 20.9+
- npm 10+
- A Supabase project
- An OpenAI-compatible chat + embedding provider

### One setup command

```bash
npm run setup
```

This installs workspace dependencies and creates local environment files when missing. The web environment receives only `NEXT_PUBLIC_` settings; server AI credentials stay in `apps/api/.env`.

Then:

1. Fill `apps/api/.env` and `apps/web/.env.local` using `.env.example`.
2. Apply `supabase/migrations/20260925160702_initial_knowledge_base.sql` to a fresh, isolated Supabase project. The dedicated assessment project already has this migration applied.
3. Ensure email/password auth is enabled.
4. Start both apps:

```bash
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api

## Core user flow

1. Sign up / sign in.
2. Create a document.
3. API chunks and embeds the document, storing vectors in Supabase.
4. Ask a question.
5. API retrieves relevant chunks, builds a grounded prompt, saves conversation history, and returns the answer plus source citations.
6. Edit a document and it is automatically re-indexed.

## Failure handling and trade-offs

Document content and indexed chunks are replaced in one database transaction by `update_document_and_chunks`; provider failure occurs before that transaction and retains the prior document and index. Creation cleans up the document when indexing fails, though a failed cleanup may need manual attention. Concurrent writers can still race during embedding preparation; a version check or queued ingestion job is appropriate for production. Answers with no retrieved chunks use an explicit no-context response. Retrieval currently has no calibrated similarity threshold, so a low-similarity top result may still reach the answer model. The system is intentionally limited to text and markdown pasted into the editor.

## Verification status

The migration and transactional `supabase/tests/security_smoke.sql` passed on the dedicated Goodspeed project. Tests, lint, typecheck, and the production build pass. The API and web app start on ports 4000 and 3000, and anonymous API requests return 401.

The authenticated browser flow was verified with the real configured provider: sign-in, document reads, a reversible document update with automatic re-indexing, vector retrieval, grounded chat, citations, and conversation persistence all worked. The `BLUE-777` answer was retrieved from `Goodspeed Test Document`; the assistant message persisted the retrieved chunk UUIDs while the user message persisted an empty source array. The security smoke test confirmed cross-user reads, updates, retrieval, and parent-row attachments remain blocked by RLS and ownership constraints.

The web build requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Run the security smoke file only against an isolated assessment database because it creates temporary fixtures inside a transaction before rolling them back.

Saved conversations can be reopened. Answer citations are shown when an answer is generated; citation excerpts are not snapshotted for old messages and may disappear after re-indexing. This is an explicit history limitation.

## Deployment

The web app can run on Vercel with the `apps/web` root. The NestJS API requires a persistent Node host with `PORT`, `WEB_ORIGIN`, Supabase credentials, and AI provider credentials. Set `NEXT_PUBLIC_API_URL` to that host. No live deployment is included in this archive.

## Walkthrough recordings

The assessment asks for two Loom links in this README. Timed recording scripts are ready in [`docs/loom-scripts.md`](docs/loom-scripts.md).

- Application walkthrough: [Goodspeed AI Knowledge Base Security Workflow](https://www.loom.com/share/2de00e3d690344928ca9885c60bb5ec7) (verified playback, 4:07)
- AI-assisted development walkthrough: [Secure Retrieval Debugging, Contract Fixes, Regression Validation](https://www.loom.com/share/98143c584eaa46a7a57a0243ae43687b) (verified signed-out playback, 2:35, 1080p)

### Application walkthrough outline (under five minutes)

- 0:00–0:30: problem and architecture
- 0:30–1:15: auth and document CRUD
- 1:15–2:15: chunking, embeddings, retrieval
- 2:15–3:10: configuration and provider switching
- 3:10–4:00: grounded chat and citations
- 4:00–4:35: RLS and ownership constraints
- 4:35–5:00: trade-offs and next steps

The recording should show the authenticated `BLUE-777` flow, expanded source citations, saved conversation reopening, the provider configuration boundary, and the RLS/transactional indexing decisions.

## What I would improve with more time

- Stream assistant tokens via SSE.
- Add a background ingestion queue for large files rather than embedding inline with the CRUD request.
- Add PDF/TXT upload with extraction and ingestion status.
- Add retrieval evaluation fixtures (precision/recall against a small golden question set).
- Add structured observability: request IDs, latency, token usage, embedding counts, and provider failures.
- Add rate limiting per user and caching for repeated query embeddings.
- Add transactional/outbox handling so a document update and its re-index job cannot diverge under partial failure.
- Add integration tests against a disposable Supabase project.

## AI-assisted development

This project was built through an AI-native development workflow. **Codex performed the repository implementation, debugging, test creation, command execution, and authenticated browser verification under my direction. ChatGPT Plus supported planning, requirement interpretation, and skill-guided review.**

My role was to define the objective and constraints, provide the assessment context, approve consequential actions, handle credentials through secure handoffs, evaluate the evidence, and direct the work through completion. I did not present AI-generated code as manually typed work; the assessment explicitly permits AI coding tools, and the second walkthrough explains exactly how they were used.

The workflow still required evidence-based engineering judgment. Generated changes were checked against the assessment, exercised through regression tests, lint, typecheck, production build, database isolation checks, and the real authenticated `BLUE-777` browser flow. The security boundary, provider abstraction, retrieval contract, transactional indexing behavior, retry ownership, and remaining trade-offs are documented so reviewers can assess the resulting system rather than the typing process.
