# PROMAX V3 status in this repository

Status date: 2026-10-26. This update is an incremental improvement, not completion of the nationwide platform described in the brief.

## Implemented or extended in this update

- Added a first-class **Território** tab in the existing dashboard. It routes to the existing research API rather than creating a new app.
- Extended the existing OSM/Overpass adapter with controlled category filters: all, residential, commercial, logistics, industrial, healthcare, education, retail, hospitality, assembly, services, construction.
- Requires a selected municipality and UF for OSM. Queries remain one municipality and at most 80 elements per response. The API validates categories, sanitizes/rejects unsafe locality strings, and maintains its existing one-per-minute-per-IP limiter.
- Includes tagged unnamed building/place records with an explicit “name not informed” label, OSM element/source links, coordinates where returned, address tags where present, and map deep-links to OpenStreetMap.
- Maintains evidence class C and explicit wording that mapped features are context only—not confirmation of current construction, license status, code compliance, buyer need, or an AVCB/CLCB opportunity.
- Added tests for categories, locality query safety, named and unnamed results, the API OSM branch, and invalid categories.

## Not implemented (do not infer from the UI)

- There is no national or state-by-state task queue, database-backed coverage ledger, retries/resumption, scheduling, or automatic refresh. A national search/scan is not performed.
- There is no internal map, neighborhood/radius tiling, detail page per building, entity graph separating building, occupant, owner, condominium and administrator, or verified property-to-company relationship.
- There is no official fire-department license (AVCB/CLCB) connector, state-specific license status or expiry, or automatic legal-compliance claim. The app does not classify “license absent” as irregular.
- There is no dedicated, persisted CRM assignment, task/reminder, proposal or lost-reason model. Existing favorites and lead notes/stages are browser-local.
- There is no new CNPJ enrichment/attribution from OSM or other datasets. The separate CNPJ flow uses BrasilAPI only; matching by approximate address/name is deliberately not added.
- Existing heuristic priority is not a calibrated close-probability model. It does not establish commercial probability or legal urgency.
- The actual repository contains no Supabase/PostgreSQL or authentication integration, and `.env.example` has no database credentials. Prior project constraints also prohibit adding a new app database/auth layer without explicit approval. Therefore durable queues, cross-device coverage and shared CRM cannot be honestly delivered in this repository state.

## Source/attribution note

OSM-derived data must retain © OpenStreetMap contributors attribution. The OSM API is community infrastructure with usage policies and no availability guarantee; do not raise request volume or run parallel municipality crawls. Coverage gaps are unknown, not negative evidence.
