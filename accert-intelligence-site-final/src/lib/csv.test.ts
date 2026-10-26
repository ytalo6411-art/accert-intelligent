import {describe,expect,it} from 'vitest';
import {csvCell,toSemicolonCsv} from './csv';

describe('CSV export safety',()=>{
  it('quotes delimiters and escapes embedded quotes',()=>{
    expect(csvCell('Empresa; "Sul"')).toBe('"Empresa; ""Sul"""');
  });
  it('neutralizes formula prefixes, including leading whitespace',()=>{
    for (const value of ['=1+1',' +SUM(A1:A2)','\t@SUM(1,1)','-2+3']) {
      expect(csvCell(value).startsWith('"\'' )).toBe(true);
    }
  });
  it('preserves ordinary text and blank cells',()=>{
    expect(csvCell('Obra em Campinas')).toBe('"Obra em Campinas"');
    expect(csvCell(null)).toBe('""');
  });
  it('joins rows with semicolon delimiters',()=>{
    expect(toSemicolonCsv([['Nome','Valor'],['Loja','12']])).toBe('"Nome";"Valor"\n"Loja";"12"');
  });
});
