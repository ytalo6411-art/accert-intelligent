import {describe,it,expect} from 'vitest';
import {SWEEP_UFS,newSweep,nextUf,remainingCount,applySweepResult,toSweepItem,totalSwept,SWEEP_RESULT_CAP} from './sweep';
describe('varredura nacional por UF',()=>{
 it('cobre os 27 UFs sem duplicata',()=>{expect(SWEEP_UFS).toHaveLength(27);expect(new Set(SWEEP_UFS).size).toBe(27)});
 it('avança lote a lote e marca conclusão',()=>{let s=newSweep('2026-09-26','2026-10-26');expect(nextUf(s)).toBe('AC');expect(remainingCount(s)).toBe(27);for(let i=0;i<27;i++){const uf=nextUf(s)!;s=applySweepResult(s,uf,[toSweepItem({id:`${i}`,title:'t',buyer:'b',url:'https://x',origin:'PNCP'},uf)],'ok')}expect(s.done).toBe(true);expect(nextUf(s)).toBeNull();expect(remainingCount(s)).toBe(0);expect(s.counts['SP'].status).toBe('ok')});
 it('tolera erro em um UF sem interromper a varredura',()=>{let s=newSweep('2026-09-26','2026-10-26');s=applySweepResult(s,'AC',[],'erro','timeout');expect(s.counts['AC'].status).toBe('erro');expect(nextUf(s)).toBe('AL');expect(s.done).toBe(false)});
 it('acumula resultados com teto e prioriza os mais recentes',()=>{let s=newSweep('2026-09-26','2026-10-26');for(let i=0;i<SWEEP_UFS.length;i++){const uf=SWEEP_UFS[i];const items=Array.from({length:SWEEP_RESULT_CAP},(_,j)=>toSweepItem({id:`${uf}-${j}`,title:'t',buyer:'b',url:'https://x',origin:'PNCP'},uf));s=applySweepResult(s,uf,items,'ok')}expect(s.results.length).toBe(SWEEP_RESULT_CAP);expect(s.results[0].uf).toBe(SWEEP_UFS[SWEEP_UFS.length-1])});
 it('totalSwept soma os contadores por UF',()=>{let s=newSweep('2026-09-26','2026-10-26');s=applySweepResult(s,'AC',[toSweepItem({id:'1',title:'t',buyer:'b',url:'u',origin:'PNCP'},'AC')],'ok');s=applySweepResult(s,'AL',[],'erro');expect(totalSwept(s)).toBe(1)});
});
