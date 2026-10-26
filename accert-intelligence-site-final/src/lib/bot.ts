import {classifyLead,recommendedAction} from './commercial';

export type LeadInput={id:string;title:string;buyer?:string;city?:string;state?:string;amount?:number|null;published?:string|null;deadline?:string|null;url?:string;origin:string;status?:string;score?:number;evidence?:string[];type?:string;processNumber?:string;recordNumber?:string;evidenceClass?:'A'|'B'|'C'|'D';evidenceClasses?:('A'|'B'|'C'|'D')[]};

export type LeadAnalysis={
  potential:number;
  priority:number;
  probability:number;
  reasons:Record<'potential'|'priority'|'probability',string[]>;
  approach:string;
  risks:string[];
  draft:string;
  disclaimer:string;
};

const daysAgo=(value:string|null|undefined)=>{if(!value)return null;const ms=Date.parse(value);if(!Number.isFinite(ms))return null;return (Date.now()-ms)/864e5};
const daysTo=(value:string|null|undefined)=>{if(!value)return null;const ms=Date.parse(value);if(!Number.isFinite(ms))return null;return (ms-Date.now())/864e5};
const clamp=(n:number)=>Math.max(0,Math.min(100,Math.round(n)));
const money=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});

/**
 * Assistente comercial determinístico: roda 100% no navegador sem API paga.
 * Não inventa fatos: usa somente campos trazidos pela fonte.
 * Diferencia três coisas distintas:
 *  - POTENCIAL: aderência do lead aos serviços da Accert (quanto vale a pena).
 *  - PRIORIDADE: ordem de abordagem agora (urgência de prazo/recência).
 *  - PROBABILIDADE: força da evidência disponível (confiança no dado, NÃO previsão de conversão).
 */
export function analyzeLead(o:LeadInput,preferredRegion=''):LeadAnalysis{
  const lead=classifyLead({title:o.title,buyer:o.buyer||'',origin:o.origin,published:o.published,state:o.state,city:o.city,type:o.type},preferredRegion);
  const pReasons:string[]=[];const prReasons:string[]=[];const prbReasons:string[]=[];
  // POTENCIAL — aderência comercial
  let potential=lead.level==='Necessidade comprovada por evidência'?70:lead.level==='Oportunidade provável'?50:25;
  pReasons.push(lead.level==='Necessidade comprovada por evidência'?'Fonte pública menciona segurança contra incêndio diretamente':lead.level==='Oportunidade provável'?'Sinal de obra/atividade compatível com serviços da Accert':'Sinal amplo, exploratório');
  if(lead.segment&&lead.segment!=='Organização/empreendimento'){potential+=8;pReasons.push(`Segmento identificado: ${lead.segment}`)}
  if(o.type==='licitação'){potential+=8;pReasons.push('Canal formal (licitação) com objeto documentado')}
  if(o.amount!=null&&o.amount>=50000){potential+=10;pReasons.push(`Valor divulgado (${money(o.amount)}) sugere porte relevante`)}
  else if(o.amount!=null){potential+=4;pReasons.push(`Valor divulgado: ${money(o.amount)}`)}
  potential=clamp(potential);
  // PRIORIDADE — urgência de abordagem
  let priority=lead.priority;
  prReasons.push(`Base da qualificação: ${lead.priority} pts (${lead.evidenceConfidence})`);
  const age=daysAgo(o.published);
  if(age!=null&&age>=0&&age<7){priority+=15;prReasons.push('Publicada há menos de 7 dias')}
  else if(age!=null&&age>=0&&age<30){priority+=8;prReasons.push('Publicada nos últimos 30 dias')}
  const until=daysTo(o.deadline);
  if(until!=null&&until>=0&&until<=14){priority+=15;prReasons.push(`Prazo se encerra em ${Math.ceil(until)} dia(s)`)}
  else if(until!=null&&until>=0&&until<=30){priority+=8;prReasons.push('Prazo dentro de 30 dias')}
  else if(until!=null&&until<0){priority-=10;prReasons.push('Prazo já encerrado na fonte')}
  priority=clamp(priority);
  // PROBABILIDADE — força da evidência (confiança no dado)
  let probability=0;
  const cls=o.evidenceClasses?.length?o.evidenceClasses:[o.evidenceClass].filter(Boolean) as ('A'|'B'|'C'|'D')[];
  const best=cls.includes('A')?'A':cls.includes('B')?'B':cls.includes('C')?'C':cls.includes('D')?'D':null;
  if(best==='A'){probability+=45;prbReasons.push('Classe A: dado direto da fonte oficial')}
  else if(best==='B'){probability+=35;prbReasons.push('Classe B: registro público verificável')}
  else if(best==='C'){probability+=25;prbReasons.push('Classe C: sinal indireto')}
  else if(best==='D'){probability+=15;prbReasons.push('Classe D: sinal jornalístico/exploratório')}
  else probability+=o.origin==='PNCP'||o.origin==='Compras.gov.br'?30:20;
  if(!best)prbReasons.push(`Origem declarada: ${o.origin}`);
  if(o.amount!=null){probability+=15;prbReasons.push('Valor divulgado pela fonte')}
  if(o.deadline){probability+=10;prbReasons.push('Prazo divulgado pela fonte')}
  if(o.buyer&&o.buyer!=='Órgão não informado'){probability+=10;prbReasons.push('Contratante identificada')}
  if(o.processNumber||o.recordNumber){probability+=10;prbReasons.push(`Rastreável na fonte (${o.processNumber||o.recordNumber})`)}
  probability=clamp(probability);
  // ABORDAGEM — regras explícitas por tipo
  let approach=recommendedAction(lead.level);
  if(o.type==='licitação'&&o.deadline){approach+=` O prazo da fonte se encerra em ${o.deadline.slice(0,10)}; conferir o edital e os requisitos de prevenção/combate a incêndio antes de planejar a proposta.`}
  else if(o.type==='projeto público de infraestrutura'){approach+=' Identificar na fonte o responsável pela execução da obra e os requisitos de segurança contra incêndio do projeto.'}
  else if(lead.services.includes('Projeto de prevenção')){approach+=' Validar se há projeto de prevenção em andamento ou recém-concluído que exija manutenção/certificação.'}
  // RISCOS — lacunas reais dos dados
  const risks:string[]=[];
  if(o.amount==null)risks.push('Valor não divulgado pela fonte — porte desconhecido');
  if(!o.deadline&&o.type==='licitação')risks.push('Sem prazo de abertura divulgado');
  if(!o.buyer||o.buyer==='Órgão não informado')risks.push('Contratante não identificada na fonte');
  if(!o.city)risks.push('Município não informado — alcance local a confirmar');
  if(best==='D')risks.push('Base jornalística: confirmar o fato com a organização antes de investir em contato');
  if(!risks.length)risks.push('Sem lacunas relevantes de dados na fonte para este registro');
  // RASCUNHO — apenas dados reais, envio manual
  const where=[o.city,o.state].filter(Boolean).join(', ')||'localidade não informada na fonte';
  const when=o.published?`publicada em ${o.published.slice(0,10)}`:'de data não informada';
  const scope=lead.services.length?`apoio em ${lead.services.join(', ').toLowerCase()}`:'apoio em segurança contra incêndio';
  const greeting=o.buyer&&o.buyer!=='Órgão não informado'?`Olá, equipe do(a) ${o.buyer}.`:'Olá,';
  const draft=[
    `${greeting}`,
    `Identificamos na fonte ${o.origin} o registro "${o.title}" em ${where} (${when}).`,
    `Considerando a atuação da Accert Engenharia em segurança contra incêndio, gostaríamos de apresentar como podemos oferecer ${scope}.`,
    'Caso haja interesse, poderiam nos indicar o responsável pela área técnica?',
  ].join('\n');
  return {potential,priority,probability,reasons:{potential:pReasons,priority:prReasons,probability:prbReasons},approach,risks,draft,disclaimer:'Análise gerada por regras determinísticas a partir dos dados da fonte. Probabilidade mede a força da evidência, não a previsão de fechamento. Revise o rascunho e envie manualmente — não há disparo automático.'};
}
