import {normalizeText,type Opportunity} from './intelligence';
export type SearchMode='quick'|'expanded'|'detailed';
export type SearchIntent={raw:string;terms:string[];location:string|null;service:string|null;mode:SearchMode};
const STOP=new Set(['a','o','as','os','de','da','do','das','dos','em','no','na','nos','nas','por','para','com','e','ou','me','mostre','buscar','pesquise','empresa','empresas','oportunidade','oportunidades','publicado','publicadas','recente','recentes','quero','preciso','servico','servicos','fonte','fontes','que','estao','esta','um','uma','ultimos','ultimas','dias']);
const SYNONYMS:Record<string,string[]>={
 'galpao':['galpao','galpoes','armazem','warehouse','centro logistico','centro de distribuicao','cd logistica'],
 'logistica':['logistica','logistico','logisticos','operador logistico','centro de distribuicao','centro logistico'],
 'construcao':['construcao','construindo','obra','obras','implantacao','edificacao','empreendimento','pequena obra','obra comercial'],
 'reforma':['reforma','reformas','reforma comercial','adequacao','readequacao','modernizacao','revitalizacao'],
 'loja':['loja','lojas','nova loja','varejo','filial','nova unidade','ponto de venda'],
 'restaurante':['restaurante','restaurantes','lanchonete','cafeteria','bar','cozinha industrial'],
 'clinica':['clinica','clinicas','consultorio','consultorios','centro de saude','laboratorio','odontologia'],
 'educacao':['escola','escolas','creche','universidade','faculdade','centro educacional','curso'],
 'mercado':['mercado','supermercado','mercados','atacarejo','mercearia'],
 'academia':['academia','academias','centro de treinamento','studio fitness'],
 'hotel':['hotel','pousada','hospedagem','resort'],
 'oficina':['oficina','oficinas','auto center','centro automotivo'],
 'condominio':['condominio','condominios','residencial','edificio residencial'],
 'igreja':['igreja','templo','centro religioso','local de culto'],
 'escritorio':['escritorio','escritorios','sala comercial','coworking'],
 'inauguracao':['inauguracao','inaugurado','abertura','reabertura','nova unidade'],
 'manutencao-incendio':['manutencao de hidrantes','manutencao de sprinklers','manutencao de extintores','sistema de alarme','deteccao de incendio','protecao contra incendio'],
 'ampliacao':['ampliacao','expansao','nova unidade','inauguracao','reforma'],
 'industria':['industria','industrial','fabrica','planta industrial'],
 'incendio':['incendio','avcb','clcb','bombeiros','prevencao contra incendio','seguranca contra incendio','combate a incendio'],
 'sprinkler':['sprinkler','sprinklers','chuveiro automatico','sistema de sprinkler'],
 'hidrante':['hidrante','hidrantes','rede de hidrantes'],
 'extintor':['extintor','extintores','equipamento de incendio'],
 'manutencao':['manutencao','manutencao preventiva','inspecao','revisao'],
 'projeto':['projeto','projetos','projeto tecnico','engenharia'],
 'hospital':['hospital','hospitais','clinica','clinicas'],
 'escola':['escola','escolas','universidade','instituicao de ensino'],
 'comercial':['comercial','shopping','centro comercial','loja','supermercado'],
 'licitacao':['licitacao','edital','contratacao publica','pregao']
};
const phraseMap=Object.entries(SYNONYMS).flatMap(([key,values])=>values.filter(x=>x.includes(' ')).map(x=>[normalizeText(x),key] as const)).sort((a,b)=>b[0].length-a[0].length);
const UF_NAMES:Record<string,string>={ac:'acre',al:'alagoas',ap:'amapa',am:'amazonas',ba:'bahia',ce:'ceara',df:'distrito federal',es:'espirito santo',go:'goias',ma:'maranhao',mt:'mato grosso',ms:'mato grosso do sul',mg:'minas gerais',pa:'para',pb:'paraiba',pr:'parana',pe:'pernambuco',pi:'piaui',rj:'rio de janeiro',rn:'rio grande do norte',rs:'rio grande do sul',ro:'rondonia',rr:'roraima',sc:'santa catarina',sp:'sao paulo',se:'sergipe',to:'tocantins'};
const REGIONS:Record<string,string[]>={norte:['ac','ap','am','pa','ro','rr','to'],nordeste:['al','ba','ce','ma','pb','pe','pi','rn','se'],sudeste:['es','mg','rj','sp'],sul:['pr','rs','sc'],'centro oeste':['df','go','mt','ms']};
export function locationToUfs(value:string|null){if(!value)return[];const loc=normalizeText(value).replace(/^interior de /,'').trim();if(REGIONS[loc])return REGIONS[loc];const uf=Object.entries(UF_NAMES).find(([sig,name])=>loc===sig||loc===name);return uf?[uf[0]]:[]}
export function expandSearchTerm(term:string){return SYNONYMS[term]||[term]}
export function parseSearchQuery(query:string,mode:SearchMode='quick'):SearchIntent{const raw=query.trim().slice(0,160);const norm=normalizeText(raw);let location:string|null=null;const loc=norm.match(/\b(?:no municipio de|na cidade de|no estado de|no interior de|na regiao (?:do|da)|em|no|na|nos|nas)\s+([a-z0-9 -]{2,50}?)(?:\s+(?:no estado|nos ultimos|nos ultimas|para|sobre|com|e|ou)\b|$)/);if(loc)location=loc[1].trim().replace(/\s+/g,' ');let rest=loc?norm.replace(loc[0],' '):norm;rest=rest.replace(/\b(?:nos? ultimos?|nas? ultimas?)\s+\d+\s+dias?\b/g,' ');for(const [phrase,key] of phraseMap)rest=rest.replace(new RegExp(`\\b${phrase}\\b`,'g'),` ${key} `);const terms:string[]=[];for(const word of rest.match(/[a-z0-9]+/g)||[]){if(STOP.has(word)||word.length<3)continue;const canonical=Object.keys(SYNONYMS).find(k=>SYNONYMS[k].some(s=>normalizeText(s)===word))||word;if(!terms.includes(canonical))terms.push(canonical)}const service=terms.some(t=>['avcb','incendio','sprinkler','hidrante','extintor','manutencao','projeto'].includes(t))?'segurança contra incêndio':null;return {raw,terms,location,service,mode}}
export function queryCoverage(mode:SearchMode){return mode==='detailed'?5:mode==='expanded'?3:1}
export function opportunityMatch(item:Pick<Opportunity,'title'|'buyer'|'city'|'state'|'type'> & {description?:string},intent:SearchIntent){const text=normalizeText(`${item.title} ${item.buyer} ${item.city||''} ${item.state||''} ${item.type||''} ${item.description||''}`);const matched=intent.terms.filter(term=>expandSearchTerm(term).some(x=>text.includes(normalizeText(x))));const termCoverage=intent.terms.length?matched.length/intent.terms.length:1;const wantedUfs=locationToUfs(intent.location);const state=normalizeText(item.state||'');const stateCode=Object.keys(UF_NAMES).find(sig=>state===sig||state===UF_NAMES[sig]);const city=normalizeText(item.city||'');let locationMatch:boolean|null=null;if(intent.location){if(wantedUfs.length)locationMatch=stateCode?wantedUfs.includes(stateCode):null;else if(REGIONS[normalizeText(intent.location)])locationMatch=stateCode?REGIONS[normalizeText(intent.location)].includes(stateCode):null;else if(city)locationMatch=city.includes(normalizeText(intent.location))||normalizeText(intent.location).includes(city);else locationMatch=null}const accepted=(intent.terms.length===0||matched.length>0)&&locationMatch!==false;const score=Math.round((intent.terms.length?termCoverage:0.5)*72+(locationMatch===true?20:locationMatch===false?0:5)+(item.type==='licitação'?8:0));return {accepted,matchedTerms:matched,termCoverage,locationMatch,searchRelevance:score,searchEvidence:[matched.length?`Termos relacionados: ${matched.join(', ')}`:'Consulta exploratória sem termo específico',intent.location?(locationMatch?'Localidade coincide com a busca':locationMatch===false?'Localidade difere da busca':'Localidade não foi confirmada pela fonte'):'Sem localidade específica']}}
