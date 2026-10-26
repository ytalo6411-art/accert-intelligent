# Architecture audit — Accert Intelligence

Audited against the checked-in repository on 2026-10-26. This is a Next.js 15.5.28 App Router / TypeScript application, not the described Next.js 14.2.35 + Supabase system. The requested `docs/ARCHITECTURE.md` and `docs/DATA_SOURCES.md` did not exist at audit time; this file is a newly written description of the actual code, not a claim that the requested prior docs were present.

## Runtime structure

- `src/app/page.tsx`: client-side dashboard and tabs, including the CNPJ investigation panel. Favorites, preferences, and lead notes/stages are local-browser state/storage.
- `src/app/api/*/route.ts`: server-side API routes. The company lookup currently uses `/api/company?cnpj=...` rather than a path-param endpoint; the existing endpoint was extended instead of duplicated.
- `src/lib/providers/*`: independent provider and normalization code. `company.ts` validates/formats numeric and alphanumeric CNPJ and normalizes the BrasilAPI CNPJ payload.
- `src/lib/rate-limit.ts`: in-memory per-instance best-effort limiter. This is not distributed enforcement.
- Vitest tests use controlled fixtures/mocks; external services are not needed by unit tests.

## Security and persistence findings

- There is no Supabase/PostgreSQL client, database schema/migration, authentication or authorization middleware in this repository. `.env.example` has no configured secrets. The existing app is public and has no user identity. This task therefore does not add database persistence or invent a private-auth setup; the CNPJ query/history is not shared or durable, and favorites remain browser-local.
- The BrasilAPI key is not needed for the current connector and no API secret is sent to the browser. Provider fetch and validation happen in the server route.
- Requests are input-validated, limited to 10 per IP/minute per server instance, capped at 8 seconds, and cacheable for one hour with a shorter stale window. `refresh=1` bypasses the fetch cache. The in-memory limiter can reset or diverge across serverless instances; use a platform firewall or a shared limiter before production if stronger enforcement is needed.
- No provider credentials, request bodies, partner identifiers beyond the returned normalized public response, or secrets are written to application logs by the CNPJ route.

## CNPJ endpoint behavior

`GET /api/company?cnpj=...` accepts numeric and alphanumeric 14-character identifiers, with or without punctuation. It verifies module-11 check digits and rejects repeated-character values. On a valid request it queries BrasilAPI even if the CNPJ has never appeared in local browser state.

The response includes normalized company fields, one source report with status and elapsed time, observation time, and a limitation disclaimer. A source 404 is represented as `not_found_in_source`, not as proof that the company does not exist. Provider timeout, malformed JSON, mismatched CNPJ, 429/5xx, and network errors are explicit errors and are not represented as empty company data.

No CNPJ-to-PNCP/Transferegov/Obrasgov matching is currently performed. Those datasets have separate semantics and are not joined without a verified company identifier.
