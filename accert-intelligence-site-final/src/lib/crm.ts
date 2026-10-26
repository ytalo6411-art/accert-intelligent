/**
 * CRM local (fase 5 do PROMAX). Persistência: localStorage do navegador.
 * 10 estágios; responsável; notas; histórico cronológico (append-only).
 * Modelos de mensagem são cópia manual — NUNCA há disparo automático.
 */
export const CRM_STAGES=['Identificada','Em investigação','Aguardando verificação','Qualificada','Contato planejado','Contatada','Proposta enviada','Em negociação','Convertida','Descartada'] as const;
export type CrmStage=typeof CRM_STAGES[number];
export type CrmHistoryEntry={text:string;at:string};
export type CrmLeadState={stage:CrmStage;owner:string;notes:string;nextAction:string;history:CrmHistoryEntry[];updatedAt:string};
const MAX_HISTORY=40;const now=()=>new Date().toISOString();
export function emptyCrmState(stage:CrmStage='Identificada'):CrmLeadState{return {stage,owner:'',notes:'',nextAction:'',history:[{text:`Etapa inicial: ${stage}`,at:now()}],updatedAt:now()}}
/** Migração segura de estados antigos (string solto ou LeadState de 9 estágios) para o formato de 10 estágios. */
export function migrateCrmState(raw:unknown):CrmLeadState|null{
  if(typeof raw==='string'){const stage:CrmStage=raw==='Contatada'?'Contatada':raw==='Verificada'?'Aguardando verificação':'Em investigação';return {...emptyCrmState(stage),updatedAt:now()}}
  if(raw&&typeof raw==='object'&&'stage'in raw){const v=raw as Record<string,unknown>;if(!CRM_STAGES.includes(v.stage as CrmStage))return null;const base=emptyCrmState(v.stage as CrmStage);const at=typeof v.updatedAt==='string'?v.updatedAt:now();base.owner=typeof v.owner==='string'?v.owner.slice(0,80):'';base.notes=typeof v.notes==='string'?v.notes.slice(0,1000):'';base.nextAction=typeof v.nextAction==='string'?v.nextAction.slice(0,250):'';base.updatedAt=at;base.history=Array.isArray(v.history)?v.history.filter((h):h is CrmHistoryEntry=>!!h&&typeof h==='object'&&typeof (h as CrmHistoryEntry).text==='string').slice(-MAX_HISTORY):[{text:`Etapa: ${base.stage}`,at:at}];return base}
  return null}
export function setCrmStage(current:CrmLeadState,stage:CrmStage):CrmLeadState{if(stage===current.stage)return current;return {...current,stage,history:[...current.history,{text:`Etapa: ${current.stage} → ${stage}`,at:now()}].slice(-MAX_HISTORY),updatedAt:now()}}
export function setCrmField(current:CrmLeadState,patch:Partial<Pick<CrmLeadState,'owner'|'notes'|'nextAction'>>):CrmLeadState{return {...current,...Object.fromEntries(Object.entries(patch).filter(([,v])=>typeof v==='string').map(([k,v])=>[k,v.slice(0,250)])),updatedAt:now()}}
/** Modelos de mensagem com dados reais do lead. A cópia é manual; sem disparo automático (LGPD/anti-spam). */
export function messageTemplate(kind:'abordagem'|'proposta'|'followup',o:{title:string;buyer:string;city?:string;state?:string;deadline?:string|null;origin:string},services:string[]){
  const who=o.buyer&&o.buyer!=='Órgão não informado'?o.buyer:'a organização responsável';
  const where=[o.city,o.state].filter(Boolean).join(', ')||'na localidade do registro';
  const scope=services.length?services.join(', ').toLowerCase():'serviços de segurança contra incêndio';
  if(kind==='abordagem')return `Olá, equipe de ${who}.\nIdentificamos, na fonte ${o.origin}, o registro "${o.title}" em ${where} e gostaríamos de apresentar como a Accert Engenharia pode apoiar em ${scope}.\nPoderiam nos indicar o responsável pela área técnica?`;
  if(kind==='proposta')return `Olá, equipe de ${who}.\nCom base no registro "${o.title}" (${o.origin}${o.deadline?`, prazo informado até ${o.deadline.slice(0,10)}`:''}), segue nossa proposta de apoio em ${scope}.\nPodemos apresentar o escopo em reunião?`;
  return `Olá, equipe de ${who}.\nRetorno sobre nossa mensagem referente ao registro "${o.title}" em ${where}. Continuamos à disposição para apresentar como a Accert pode apoiar em ${scope}.`;
}
