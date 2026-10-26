import {describe,it,expect,vi,afterEach} from 'vitest';
import {NextRequest} from 'next/server';
import {GET} from './route';
afterEach(()=>vi.unstubAllGlobals());
const request=(url:string,ip:string)=>new NextRequest(`http://localhost/api/opportunities${url}`,{headers:{'x-real-ip':ip}});
describe('GET /api/opportunities',()=>{
 it('performs bounded multi-page contextual PNCP search and reports remaining coverage',async()=>{
  const fetchMock=vi.fn(async(input:string|URL|Request)=>{const page=Number(new URL(String(input)).searchParams.get('pagina'));const row=page===1?{numeroControlePNCP:'match-1',objetoCompra:'Construção de galpão para centro de distribuição',orgaoEntidade:{razaoSocial:'Município de Campinas'},unidadeOrgao:{municipioNome:'Campinas',ufSigla:'SP'},dataPublicacaoPncp:'2026-10-20'}:{numeroControlePNCP:`other-${page}`,objetoCompra:'Aquisição de material de expediente',orgaoEntidade:{razaoSocial:'Órgão público'},dataPublicacaoPncp:'2026-10-20'};return new Response(JSON.stringify({data:[row],totalPaginas:10,totalRegistros:100}),{status:200,headers:{'content-type':'application/json'}})});
  vi.stubGlobal('fetch',fetchMock);const res=await GET(request('/?kind=opportunities&q=centro%20log%C3%ADstico&mode=expanded&batch=0&from=2026-10-01&to=2026-10-25','198.51.100.31'));const body=await res.json();expect(res.status).toBe(200);expect(fetchMock).toHaveBeenCalledTimes(3);expect(body.scanPages).toBe(3);expect(body.results).toHaveLength(1);expect(body.results[0].matchedTerms).toContain('galpao');expect(body.hasMore).toBe(true);expect(body.sourceStatus).toBe('ok');
 });
 it('rejects impossible calendar dates before calling a provider',async()=>{const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);const res=await GET(request('/?kind=contracts&from=2026-02-31&to=2026-03-10','198.51.100.32'));expect(res.status).toBe(400);expect(fetchMock).not.toHaveBeenCalled()});
});
