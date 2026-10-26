import {expandSearchTerm,parseSearchQuery} from '../search';
export type NewsArticle={title:string;url:string;domain:string;published:string|null;sourceCountry:string|null;potential:'Alta'|'Média'|'Baixa';checkedAt:string;origin:'GDELT'};
/**
 * Termos padrão usados quando a pesquisa não informa termo próprio.
 * Mantidos curtos (6 frases) porque a GDELT DOC rejeita queries longas
 * ("Your query was too short or too long" — verificado ao vivo em 26/10/2026).
 */
const defaultTerms=['"proteção contra incêndio"','"sprinkler"','"fire protection"','"infraestrutura"','"centro logístico"','"reforma comercial"'];
const MAX_PHRASES=6;
const cleanPhrase=(v:string)=>`"${v.replaceAll('"','').trim().slice(0,40)}"`;
/**
 * Monta a query da GDELT DOC 2.0 com sintaxe válida:
 * - apenas UM nível de parênteses, agrupando a lista OR de frases;
 * - no máximo 6 frases (queries com 9 frases são rejeitadas pela API);
 * - localidade detectada entra como termo AND (fora dos parênteses);
 * - filtro de idioma (português/inglês) como segundo grupo OR.
 */
export function gdeltUrl(customQuery:string,days:number){const raw=customQuery.trim().replace(/[()<>]/g,' ').replace(/\s+/g,' ').slice(0,120);let phrases:string[]=[];let location:string|null=null;
 if(raw){const intent=parseSearchQuery(raw,'expanded');location=intent.location;for(const key of intent.terms.slice(0,3)){for(const v of expandSearchTerm(key).slice(0,2)){const p=cleanPhrase(v);if(!phrases.includes(p))phrases.push(p);if(phrases.length>=MAX_PHRASES)break}if(phrases.length>=MAX_PHRASES)break}
  if(!phrases.length)phrases.push(cleanPhrase(raw))}
 else phrases=defaultTerms.slice(0,MAX_PHRASES);
 const termPart=phrases.length>1?`(${phrases.join(' OR ')})`:phrases[0];
 const locPart=location?` "${location.replaceAll('"','').trim().slice(0,40)}"`:'';
 const u=new URL('https://api.gdeltproject.org/api/v2/doc/doc');u.searchParams.set('query',`${termPart}${locPart} (sourcelang:portuguese OR sourcelang:english)`);u.searchParams.set('mode','ArtList');u.searchParams.set('format','json');u.searchParams.set('maxrecords','75');u.searchParams.set('sort','DateDesc');u.searchParams.set('timespan',`${days} days`);return u.toString()}
/**
 * A GDELT devolve mensagens de erro em texto puro (ex.: rate limit
 * "Please limit requests to one every 5 seconds…"). Este parser separa
 * JSON válido dessas respostas para a UI exibir a causa real.
 */
export function parseGdeltBody(text:string):{articles:unknown[];error?:string}{try{const d=JSON.parse(text) as {articles?:unknown};return {articles:Array.isArray(d.articles)?d.articles:[]}}catch{return {articles:[],error:text.slice(0,160).trim()||'Resposta não-JSON da GDELT'}}}
export function normalizeNews(rows:unknown,checkedAt=new Date().toISOString()):NewsArticle[]{if(!Array.isArray(rows))return[];const seen=new Set<string>();return rows.flatMap((raw)=>{if(!raw||typeof raw!=='object')return[];const a=raw as Record<string,unknown>;try{const url=new URL(String(a.url||''));if(!['http:','https:'].includes(url.protocol))return[];const key=url.href.split('#')[0];if(seen.has(key))return[];seen.add(key);const title=String(a.title||'').slice(0,500);const low=title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const potential:NewsArticle['potential']=/sprinkler|fire protection|incendio/.test(low)?'Alta':/engenharia|infraestrutura|industrial|obra|reform|construcao|logistica/.test(low)?'Média':'Baixa';return[{title,url:key,domain:String(a.domain||url.hostname),published:a.seendate?String(a.seendate):null,sourceCountry:a.sourcecountry?String(a.sourcecountry):null,potential,checkedAt,origin:'GDELT'}]}catch{return[]}})}
