import {describe,expect,it} from 'vitest';
import {formatCnpj,isValidCnpj,normalizeBrasilApiCompany,normalizeCnpj} from './company';

describe('CNPJ validation and normalization',()=>{
 it('accepts numeric CNPJ with and without punctuation',()=>{expect(isValidCnpj('11.222.333/0001-81')).toBe(true);expect(isValidCnpj('11222333000181')).toBe(true)});
 it('accepts official alphanumeric CNPJ format with valid check digits',()=>{expect(isValidCnpj('00.000.000/E08G-12')).toBe(true);expect(normalizeCnpj('00.000.000/e08g-12')).toBe('00000000E08G12')});
 it('rejects bad length, repeated values, invalid check digits and letters in check digits',()=>{for(const value of ['123','00.000.000/0000-00','11.222.333/0001-82','00.000.000/E08G-1A'])expect(isValidCnpj(value)).toBe(false)});
 it('formats digits and letters as a CNPJ is entered',()=>{expect(formatCnpj('00000000E08G12')).toBe('00.000.000/E08G-12')});
});
describe('BrasilAPI company normalization',()=>{
 it('normalizes cadastro, address, activities, tax status and partners without fabricating nulls',()=>{const c=normalizeBrasilApiCompany({cnpj:'11222333000181',razao_social:'Empresa Exemplo',nome_fantasia:'Exemplo',situacao_cadastral:2,descricao_situacao_cadastral:'ATIVA',data_inicio_atividade:'2009-09-02',descricao_identificador_matriz_filial:'MATRIZ',natureza_juridica:'Associação',porte:'DEMAIS',capital_social:0,logradouro:'Rua A',numero:'10',municipio:'Campinas',uf:'SP',cep:'13000000',ddd_telefone_1:'1933334444',email:null,cnae_fiscal:4321500,cnae_fiscal_descricao:'Instalação elétrica',cnaes_secundarios:[{codigo:4322302,descricao:'Instalação de sistema'}],opcao_pelo_simples:{simples:true,data_opcao:'2020-01-01'},opcao_pelo_mei:false,qsa:[{nome_socio:'Pessoa Exemplo',qualificacao_socio:'Sócia',data_entrada_sociedade:'2021-05-01'}]},'11222333000181');expect(c.legalName).toBe('Empresa Exemplo');expect(c.capitalSocial).toBe(0);expect(c.address.city).toBe('Campinas');expect(c.activities.primary?.code).toBe('4321500');expect(c.activities.secondary).toHaveLength(1);expect(c.tax.simples).toBe(true);expect(c.partners[0].name).toBe('Pessoa Exemplo');expect(c.contacts.email).toBeNull()});
});
