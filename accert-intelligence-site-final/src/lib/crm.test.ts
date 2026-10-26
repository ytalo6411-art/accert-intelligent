import {describe,it,expect} from 'vitest';
import {CRM_STAGES,migrateCrmState,setCrmStage,setCrmField,emptyCrmState,messageTemplate} from './crm';
describe('crm local',()=>{
 it('tem 10 estágios distintos',()=>{expect(CRM_STAGES).toHaveLength(10);expect(new Set(CRM_STAGES).size).toBe(10)});
 it('migra estado antigo (string) para o formato novo sem perder a etapa',()=>{const s=migrateCrmState('Contatada');expect(s).not.toBeNull();expect(s!.stage).toBe('Contatada');expect(Array.isArray(s!.history)).toBe(true)});
 it('migra LeadState de 9 estágios preservando notas e próxima ação',()=>{const s=migrateCrmState({stage:'Qualificada',notes:'nota antiga',nextAction:'ligar',updatedAt:'2026-10-01T00:00:00Z'});expect(s!.stage).toBe('Qualificada');expect(s!.notes).toBe('nota antiga');expect(s!.nextAction).toBe('ligar')});
 it('rejeita estágio desconhecido',()=>{expect(migrateCrmState({stage:'Estágio Falso'})).toBeNull()});
 it('mudança de etapa registra histórico append-only',()=>{let s=emptyCrmState();const before=s.history.length;s=setCrmStage(s,'Contatada');expect(s.stage).toBe('Contatada');expect(s.history.length).toBe(before+1);expect(s.history[s.history.length-1].text).toContain('Identificada → Contatada')});
 it('mudança de mesma etapa não duplica histórico',()=>{const s=emptyCrmState();expect(setCrmStage(s,'Identificada').history).toBe(s.history)});
 it('setCrmField truncamos campos',()=>{const s=setCrmField(emptyCrmState(),{notes:'x'.repeat(300)});expect(s.notes).toHaveLength(250)});
 it('modelos usam dados reais do lead e têm aviso de envio manual',()=>{const t=messageTemplate('abordagem',{title:'Obra de galpão',buyer:'Prefeitura X',city:'Campinas',state:'SP',origin:'Obrasgov'},['Instalação e manutenção']);expect(t).toContain('Obra de galpão');expect(t).toContain('Prefeitura X');expect(t).toContain('instalação e manutenção');const p=messageTemplate('proposta',{title:'T',buyer:'B',origin:'PNCP',deadline:'2026-11-01T00:00:00Z'},[]);expect(p).toContain('2026-11-01')});
});
