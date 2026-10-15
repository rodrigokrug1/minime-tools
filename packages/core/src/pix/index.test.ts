import { describe, expect, it } from 'vitest';
import { conferirCrc, crc16, montarPix } from './index.js';

describe('crc16', () => {
  // Vetor de teste clássico do CRC-16/CCITT-FALSE.
  it('produz 29B1 para "123456789"', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('sempre devolve quatro caracteres', () => {
    expect(crc16('a')).toHaveLength(4);
    expect(crc16('')).toBe('FFFF');
  });
});

describe('montarPix', () => {
  const base = {
    chave: 'teste@exemplo.com',
    nome: 'Fulano de Tal',
    cidade: 'Novo Hamburgo',
  };

  it('monta um código que passa na própria conferência de CRC', () => {
    const resultado = montarPix(base);

    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(conferirCrc(resultado.codigo)).toBe(true);
  });

  it('começa com a versão do payload e o tipo estático', () => {
    const resultado = montarPix(base);

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.codigo.startsWith('000201010211')).toBe(true);
  });

  it('inclui o GUI do PIX e a chave', () => {
    const resultado = montarPix(base);

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.codigo).toContain('0014br.gov.bcb.pix');
    expect(resultado.codigo).toContain('teste@exemplo.com');
  });

  it('inclui o valor com duas casas quando informado', () => {
    const resultado = montarPix({ ...base, valor: 12.5 });

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.codigo).toContain('540512.50');
  });

  it('omite o campo de valor quando ausente ou zero', () => {
    for (const valor of [undefined, 0]) {
      const resultado = montarPix({ ...base, valor });

      if (!resultado.ok) throw new Error('esperava sucesso');
      expect(resultado.codigo).not.toContain('5405');
      expect(resultado.codigo).not.toContain('5404');
    }
  });

  it('remove acentos do nome e da cidade, e avisa', () => {
    const resultado = montarPix({ ...base, nome: 'João Araújo', cidade: 'São Paulo' });

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.codigo).toContain('JOAO ARAUJO');
    expect(resultado.codigo).toContain('SAO PAULO');
    expect(resultado.avisos).toHaveLength(2);
  });

  it('não avisa quando nada precisou ser ajustado', () => {
    const resultado = montarPix(base);

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.avisos).toHaveLength(0);
  });

  it('usa *** como identificador padrão', () => {
    const resultado = montarPix(base);

    if (!resultado.ok) throw new Error('esperava sucesso');
    expect(resultado.codigo).toContain('62070503***');
  });

  it.each([
    ['chave', { ...base, chave: '  ' }, 'chave-vazia'],
    ['nome', { ...base, nome: '' }, 'nome-vazio'],
    ['cidade', { ...base, cidade: '' }, 'cidade-vazia'],
  ])('recusa %s em branco', (_rotulo, dados, motivo) => {
    const resultado = montarPix(dados);

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe(motivo);
  });

  it('recusa valor negativo', () => {
    const resultado = montarPix({ ...base, valor: -1 });

    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.motivo).toBe('valor-negativo');
  });
});

describe('conferirCrc', () => {
  it('recusa um código adulterado', () => {
    const resultado = montarPix({ chave: 'a@b.com', nome: 'Teste', cidade: 'Porto Alegre' });

    if (!resultado.ok) throw new Error('esperava sucesso');
    const adulterado = resultado.codigo.replace('Teste'.toUpperCase(), 'OUTRO');

    expect(conferirCrc(adulterado)).toBe(false);
  });

  it('recusa texto curto demais', () => {
    expect(conferirCrc('123')).toBe(false);
  });
});
