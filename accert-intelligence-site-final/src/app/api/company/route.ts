import {NextRequest,NextResponse} from 'next/server';
import {rateLimit} from '@/lib/rate-limit';
import {isValidCnpj,normalizeCnpj,normalizeBrasilApiCompany} from '@/lib/providers/company';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const ip=(req.headers.get('x-real-ip')||(req.headers.get('x-forwarded-for')||'unknown').split(',').pop()||'unknown').trim();
 const rl=rateLimit(`company:${ip}`,10,60_000);
 if(!rl.allowed)return NextResponse.json({error:'Limite temporário de consultas cadastrais atingido.',retryAfterSeconds:Math.max(1,Math.ceil((rl.resetAt-Date.now())/1000))},{status:429,headers:{'Retry-After':String(Math.max(1,Math.ceil((rl.resetAt-Date.now())/1000))),'Cache-Control':'no-store'}});
 const raw=req.nextUrl.searchParams.get('cnpj')||'';const cnpj=normalizeCnpj(raw);
 if(!isValidCnpj(cnpj))return NextResponse.json({error:'CNPJ inválido. Confira os 14 caracteres e os dígitos verificadores.'},{status:400,headers:{'Cache-Control':'no-store'}});
 const refresh=req.nextUrl.searchParams.get('refresh')==='1';const started=Date.now();const observedAt=new Date().toISOString();
 try{
  const response=await fetch(`https://brasilapi.com.br/api/cnpj/v1/${encodeURIComponent(cnpj)}`,{signal:AbortSignal.timeout(8000),headers:{accept:'application/json','user-agent':'AccertIntelligence/1.0'},...(refresh?{cache:'no-store' as RequestCache}:{next:{revalidate:3600}})});
  const durationMs=Date.now()-started;
  if(response.status===404)return NextResponse.json({queryStatus:'not_found_in_source',company:null,sources:[{id:'brasilapi',name:'BrasilAPI / CNPJ',status:'not_found',durationMs,observedAt,message:'A fonte não retornou um cadastro para este identificador. Isso não prova que a empresa não exista.'}],disclaimer:'Consulta limitada à fonte indicada; uma ausência não comprova inexistência.'},{headers:{'Cache-Control':'no-store'}});
  if(!response.ok)return NextResponse.json({queryStatus:'partial_or_unavailable',company:null,sources:[{id:'brasilapi',name:'BrasilAPI / CNPJ',status:'error',durationMs,observedAt,message:`Fonte respondeu HTTP ${response.status}.`}],error:'A fonte cadastral não está disponível no momento. Não foi possível concluir a consulta.'},{status:503,headers:{'Retry-After':'30','Cache-Control':'no-store'}});
  const payload:unknown=await response.json();
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('Resposta fora do esquema esperado');
  const data=payload as Record<string,unknown>;const returned=normalizeCnpj(String(data.cnpj||''));
  if(returned!==cnpj)throw new Error('Identificador divergente na resposta');
  const company=normalizeBrasilApiCompany(data,cnpj);
  return NextResponse.json({queryStatus:'found',company,sources:[{id:'brasilapi',name:'BrasilAPI / CNPJ',status:'ok',durationMs,observedAt,referenceDate:company.registration.date,message:'Dados retornados pela fonte pública.'}],fieldSource:'BrasilAPI / CNPJ',disclaimer:'Dados cadastrais reproduzidos da fonte consultada; não atestam solvência, capacidade, conformidade ou necessidade comercial. Campos ausentes não foram informados pela fonte.'},{headers:{'Cache-Control':refresh?'no-store':'s-maxage=3600, stale-while-revalidate=600'}})
 }catch{
  return NextResponse.json({queryStatus:'unavailable',company:null,sources:[{id:'brasilapi',name:'BrasilAPI / CNPJ',status:'error',durationMs:Date.now()-started,observedAt,message:'Timeout, falha de rede ou resposta inválida.'}],error:'A fonte cadastral não respondeu de forma válida no prazo. Nenhuma conclusão sobre existência foi feita.'},{status:503,headers:{'Retry-After':'30','Cache-Control':'no-store'}})
 }
}
