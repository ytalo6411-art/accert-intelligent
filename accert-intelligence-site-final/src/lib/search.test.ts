import {describe,it,expect} from 'vitest';
import {opportunityMatch,parseSearchQuery,queryCoverage} from './search';
const item={title:'Construção de galpão para centro de distribuição',buyer:'Secretaria de Obras',city:'Campinas',state:'SP',type:'licitação'};
describe('search intent parsing and relevance',()=>{
 it('expands Portuguese wording to bounded canonical terms and detects location',()=>{const intent=parseSearchQuery('empresas construindo galpões logísticos em Campinas','expanded');expect(intent.terms).toEqual(expect.arrayContaining(['construcao','galpao','logistica']));expect(intent.location).toBe('campinas');expect(opportunityMatch(item,intent).accepted).toBe(true);expect(opportunityMatch(item,intent).locationMatch).toBe(true)});
 it('matches multiword contextual equivalents without requiring an exact full query',()=>{const intent=parseSearchQuery('centro logístico');expect(intent.terms).toContain('galpao');expect(opportunityMatch(item,intent).accepted).toBe(true)});
 it('does not suppress results when a source omits requested location, but rejects a known mismatch',()=>{const intent=parseSearchQuery('obra em Campinas');expect(opportunityMatch({...item,city:'',state:''},intent).accepted).toBe(true);expect(opportunityMatch({...item,city:'Santos'},intent).accepted).toBe(false)});
 it('expands small-business, clinic, and regional queries without rejecting a source that omits city',()=>{const intent=parseSearchQuery('reformas de lojas e clínicas no Nordeste');expect(intent.terms).toEqual(expect.arrayContaining(['reforma','loja','clinica']));const local={...item,title:'Reformas de lojas e clínicas',city:'',state:'BA'};expect(opportunityMatch(local,intent).accepted).toBe(true);expect(opportunityMatch({...local,state:'SP'},intent).locationMatch).toBe(false)});
 it('keeps coverage bounded and mode-specific',()=>{expect(queryCoverage('quick')).toBe(1);expect(queryCoverage('expanded')).toBe(3);expect(queryCoverage('detailed')).toBe(5)});
 it('removes generic query and period phrases rather than treating them as relevance keywords',()=>{expect(parseSearchQuery('oportunidades de obras nos últimos 30 dias').terms).toEqual(['construcao'])});
});
