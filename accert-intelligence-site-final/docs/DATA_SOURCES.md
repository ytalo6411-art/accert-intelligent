# Data-source audit — 2026-10-26

Only sources with code in the repository are called integrated. A catalog entry or test fixture alone is not a live-source integration. A successful live check is point-in-time and does not imply ongoing availability.

## Company/CNPJ

| Source | Actual implementation | Access, bounds, caveats |
|---|---|---|
| BrasilAPI CNPJ v1 | Integrated at `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` from server route `/api/company` | No key is configured or required by this connector. On-demand lookup, one source only, fetch timeout 8 s, Next.js revalidation 1 h; `refresh=1` disables cache. Service uptime/quotas are not guaranteed here. Live smoke checks on 2026-10-26 returned HTTP 200 for numeric CNPJ `11222333000181` and official alpha-format `00000000E08G12`. The app route initially received HTTP 403 without a User-Agent; setting a neutral app User-Agent allowed the live route to return 200 for the official alpha-format example. This is not a completeness or uptime guarantee. Docs: https://brasilapi.com.br/docs#tag/CNPJ |
| Receita Federal bulk CNPJ data | Not downloaded or indexed by this app | No unauthenticated, low-cost interactive search adapter has been verified. Bulk ingestion would require a database/storage, update pipeline, licensing/retention review, and significant capacity; none exists in this repository. Official source portal: https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cnpj |
| Other commercial CNPJ APIs | Not integrated | Do not assume free access, quota, or terms. No API key variables are present in `.env.example`.

BrasilAPI returns cadastro data such as name, status, dates, address, CNAEs, tax flags and QSA when populated by the source. Some fields may be null, masked, or stale. The app labels source omissions as not informed rather than asserting the field or entity does not exist. Capital social of zero is preserved. Coordinates are not inferred from an address. A single source means cross-source field conflicts cannot yet be resolved.

CNPJ input accepts the 14-position alphanumeric standard as well as legacy numeric CNPJ. The Receita Federal describes alphanumeric issuance from July 2026; the DV algorithm uses ASCII code minus 48 and module 11. Official reference: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico. BrasilAPI live response was observed for the official example `00.000.000/E08G-12` during this audit; broader alpha-format coverage is not guaranteed.

## Other existing public-source integrations

- **PNCP**: public REST queries for opportunities, contracts and price-registration minutes are implemented in `src/lib/providers/pncp.ts` and `/api/opportunities`. Bounded pagination and query-time limits apply. It is procurement data, not a complete business registry or confirmation of private-sector need. Official docs: https://pncp.gov.br/api/consulta/swagger-ui/index.html
- **Obrasgov.br**: public project-investment adapter in `src/lib/providers/obrasgov.ts`; fixture-tested, but live availability is not continuously verified. Project records do not guarantee active construction. Docs: https://api-publica.obrasgov.gestao.gov.br/obras/docs
- **Transferegov.br**: selected public partnership and special-action-plan adapters in `src/lib/providers/transferegov.ts`; bounded and fixture-tested. Transfers/proposals do not prove work or buying intent. Docs: https://api-publica.transferegov.gestao.gov.br/
- **GDELT DOC**: public news search adapter in `src/lib/providers/gdelt.ts`, best effort and bounded. News can be absent or stale and is not evidence of current need. Docs: https://www.gdeltproject.org/
- **OpenStreetMap / Overpass**: conditional municipal POI/building context in `src/lib/providers/overpass.ts`; user specifies city and UF and may filter static categories (residential, commercial, logistics, industry, health, education, retail, hospitality, assembly, services, construction); each request is capped at 80 results. Name-free buildings/POIs are retained as explicitly unnamed map elements where tagged. Coordinates link back to OSM. OSM POIs/buildings are not evidence of active work or licensing status and do not constitute national coverage. Usage guidance: https://wiki.openstreetmap.org/wiki/Overpass_API
- **IBGE Localidades**: used for municipality suggestions/reference codes, not an enterprise lookup. Official docs: https://servicodados.ibge.gov.br/api/docs/localidades
- **Compras.gov.br**: separate CATMAT/CATSER price-reference route; not a general text search or CNPJ registry. Docs: https://dadosabertos.compras.gov.br/swagger-ui/index.html
- **CNO and municipal licensing**: investigated but not integrated as a general free API. Municipal sources vary; there is no national unified license endpoint in this app. AVCB/CLCB status is never inferred from a CNPJ, CNAE, address or POI.

## Limits and known gaps

- No Supabase/PostgreSQL, persistence, scheduled refresh, shared query history, or audit log exists in this repository. Do not treat browser session history or framework cache as a shared database.
- No CNPJ joins have been verified for PNCP, Obrasgov, Transferegov or news. Do not manufacture cross-source matching based on company name alone.
- One unavailable source cannot be interpreted as a negative result. The present CNPJ endpoint has only one source; a BrasilAPI failure leaves the query unresolved.
- Unit tests are mocked fixtures. The point-in-time BrasilAPI smoke check is the only real CNPJ-source validation in this audit.
