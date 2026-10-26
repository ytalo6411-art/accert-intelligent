/**
 * Varredura nacional por UF (fase 2 do PROMAX): lotes sequenciais de um UF por vez,
 * pausados para respeitar o rate limit do agregador (8 pesquisas/min por IP).
 * Estado persistido em localStorage → permite retomar varredura interrompida.
 */
export const SWEEP_UFS=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PE','PI','PR','RJ','RN','RS','RO','RR','SC','SE','SP','TO'];
export type SweepResultItem={id:string;title:string;buyer:string;city:string;state:string;amount:number|null;published:string;deadline:string|null;url:string;origin:string;score:number;uf:string};
export type SweepUfStatus={total:number;at:string;status:'ok'|'erro';message?:string};
export type SweepState={version:1;startedAt:string;from:string;to:string;index:number;done:boolean;counts:Record<string,SweepUfStatus>;results:SweepResultItem[]};
export const SWEEP_RESULT_CAP=600;
export const SWEEP_PACING_MS=7600;
export function newSweep(from:string,to:string):SweepState{return {version:1,startedAt:new Date().toISOString(),from,to,index:0,done:false,counts:{},results:[]}}
export function nextUf(s:SweepState):string|null{return s.done?null:SWEEP_UFS[s.index]||null}
export function remainingCount(s:SweepState):number{return s.done?0:SWEEP_UFS.length-s.index}
export function toSweepItem(o:{id:string;title:string;buyer:string;city?:string;state?:string;amount?:number|null;published?:string|null;deadline?:string|null;url:string;origin:string;score?:number},uf:string):SweepResultItem{return {id:o.id,title:o.title,buyer:o.buyer,city:o.city||'',state:o.state||uf,amount:o.amount??null,published:o.published||'',deadline:o.deadline||null,url:o.url,origin:o.origin,score:o.score||0,uf}}
export function applySweepResult(s:SweepState,uf:string,items:SweepResultItem[],status:'ok'|'erro',message?:string):SweepState{const results=[...items.map(x=>({...x,uf})),...s.results].slice(0,SWEEP_RESULT_CAP);return {version:1,startedAt:s.startedAt,from:s.from,to:s.to,index:Math.min(s.index+1,SWEEP_UFS.length),done:s.index+1>=SWEEP_UFS.length,counts:{...s.counts,[uf]:{total:items.length,at:new Date().toISOString(),status,message}},results}}
export function totalSwept(s:SweepState):number{return Object.values(s.counts).reduce((a,x)=>a+x.total,0)}
