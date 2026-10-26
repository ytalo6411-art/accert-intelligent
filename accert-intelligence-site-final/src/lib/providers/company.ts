export type NormalizedCompany={
  cnpj:string; legalName:string|null; tradeName:string|null;
  registration:{code:string|null;label:string|null;date:string|null;reason:string|null};
  openedAt:string|null; establishmentType:string|null; legalNature:string|null; size:string|null; capitalSocial:number|null;
  address:{streetType:string|null;street:string|null;number:string|null;complement:string|null;district:string|null;city:string|null;state:string|null;postalCode:string|null;municipalityCode:string|null};
  contacts:{phones:string[];email:string|null};
  activities:{primary:{code:string|null;description:string|null}|null;secondary:{code:string|null;description:string|null}[]};
  tax:{simples:boolean|null;simplesSince:string|null;simplesUntil:string|null;mei:boolean|null;meiSince:string|null;meiUntil:string|null};
  partners:{name:string|null;qualification:string|null;since:string|null;ageRange:string|null}[];
};
const weights1=[5,4,3,2,9,8,7,6,5,4,3,2],weights2=[6,5,4,3,2,9,8,7,6,5,4,3,2];
export function normalizeCnpj(value:string){return value.toUpperCase().replace(/[^0-9A-Z]/g,'')}
function digit(base:string,weights:number[]){const sum=[...base].reduce((total,c,i)=>total+(c.charCodeAt(0)-48)*weights[i],0);const remainder=sum%11;return String(remainder<2?0:11-remainder)}
export function isValidCnpj(value:string){const cnpj=normalizeCnpj(value);if(!/^[A-Z0-9]{12}\d{2}$/.test(cnpj)||/^([A-Z0-9])\1{13}$/.test(cnpj))return false;const base=cnpj.slice(0,12);const first=digit(base,weights1);return cnpj[12]===first&&cnpj[13]===digit(base+first,weights2)}
export function formatCnpj(value:string){const s=normalizeCnpj(value).slice(0,14);return s.length<=2?s:s.length<=5?`${s.slice(0,2)}.${s.slice(2)}`:s.length<=8?`${s.slice(0,2)}.${s.slice(2,5)}.${s.slice(5)}`:s.length<=12?`${s.slice(0,2)}.${s.slice(2,5)}.${s.slice(5,8)}/${s.slice(8)}`:`${s.slice(0,2)}.${s.slice(2,5)}.${s.slice(5,8)}/${s.slice(8,12)}-${s.slice(12)}`}
const txt=(v:unknown):string|null=>typeof v==='string'&&v.trim()?v.trim():typeof v==='number'?String(v):null;
const bool=(v:unknown):boolean|null=>typeof v==='boolean'?v:null;
export function normalizeBrasilApiCompany(x:Record<string,unknown>,cnpj:string):NormalizedCompany{
  const qsa=Array.isArray(x.qsa)?x.qsa:[], secondary=Array.isArray(x.cnaes_secundarios)?x.cnaes_secundarios:[];
  const phones=[x.ddd_telefone_1,x.ddd_telefone_2].map(txt).filter((v):v is string=>!!v);
  const rawPrimary=typeof x.cnae_fiscal==='number'?String(x.cnae_fiscal):txt(x.cnae_fiscal);
  return {cnpj,legalName:txt(x.razao_social),tradeName:txt(x.nome_fantasia),registration:{code:txt(x.situacao_cadastral),label:txt(x.descricao_situacao_cadastral),date:txt(x.data_situacao_cadastral),reason:txt(x.descricao_motivo_situacao_cadastral)},openedAt:txt(x.data_inicio_atividade),establishmentType:txt(x.descricao_identificador_matriz_filial)||({1:'Matriz',2:'Filial'} as Record<string,string>)[txt(x.identificador_matriz_filial)||'']||null,legalNature:txt(x.natureza_juridica),size:txt(x.porte),capitalSocial:typeof x.capital_social==='number'&&Number.isFinite(x.capital_social)?x.capital_social:null,address:{streetType:txt(x.descricao_tipo_de_logradouro),street:txt(x.logradouro),number:txt(x.numero),complement:txt(x.complemento),district:txt(x.bairro),city:txt(x.municipio),state:txt(x.uf),postalCode:txt(x.cep),municipalityCode:txt(x.codigo_municipio_ibge)},contacts:{phones,email:txt(x.email)},activities:{primary:rawPrimary||txt(x.cnae_fiscal_descricao)?{code:rawPrimary,description:txt(x.cnae_fiscal_descricao)}:null,secondary:secondary.map((a)=>{const r=a as Record<string,unknown>;return{code:typeof r.codigo==='number'?String(r.codigo):txt(r.codigo),description:txt(r.descricao)}}).filter(a=>a.code||a.description)},tax:{simples:bool((x.opcao_pelo_simples as Record<string,unknown>|null)?.simples),simplesSince:txt((x.opcao_pelo_simples as Record<string,unknown>|null)?.data_opcao),simplesUntil:txt((x.opcao_pelo_simples as Record<string,unknown>|null)?.data_exclusao),mei:bool(x.opcao_pelo_mei),meiSince:txt(x.data_opcao_pelo_mei),meiUntil:txt(x.data_exclusao_do_mei)},partners:qsa.map((a)=>{const r=a as Record<string,unknown>;return{name:txt(r.nome_socio),qualification:txt(r.qualificacao_socio),since:txt(r.data_entrada_sociedade),ageRange:txt(r.faixa_etaria)}})}
}
