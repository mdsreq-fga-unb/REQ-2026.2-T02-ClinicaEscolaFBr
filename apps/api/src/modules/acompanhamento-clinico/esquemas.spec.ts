import {
  dadosIniciaisSchema,
  evolucaoSchema,
  hojeEmBrasilia,
} from '@clinica/shared';

describe('Validação da evolução e dos dados iniciais', () => {
  const mensagens = (r: { error?: { issues: { message: string }[] } }) =>
    r.error?.issues.map((i) => i.message) ?? [];

  it('a evolução sem queixa ou sem planejamento é recusada, com a indicação de cada campo (RF28)', () => {
    const resultado = evolucaoSchema.safeParse({
      queixa: ' ',
      planejamento: '',
    });
    expect(mensagens(resultado)).toEqual([
      'Escreva a evolução da queixa.',
      'Escreva o planejamento da próxima sessão.',
    ]);
  });

  it('a evolução da queixa com mais de 1.000 caracteres ou de 10 linhas é recusada (RF28)', () => {
    expect(
      mensagens(
        evolucaoSchema.safeParse({
          queixa: 'a'.repeat(1001),
          planejamento: 'p',
        }),
      ),
    ).toContain('Use no máximo 1.000 caracteres.');
    expect(
      mensagens(
        evolucaoSchema.safeParse({
          queixa: Array(11).fill('linha').join('\n'),
          planejamento: 'p',
        }),
      ),
    ).toContain('Use no máximo 10 linhas.');
  });

  it('a data de assinatura do contrato não pode estar no futuro (RF69)', () => {
    const dados = { anamnese: 'a', contrato: 'c' };
    expect(
      dadosIniciaisSchema.safeParse({
        ...dados,
        dataAssinaturaContrato: hojeEmBrasilia(),
      }).success,
    ).toBe(true);
    expect(
      mensagens(
        dadosIniciaisSchema.safeParse({
          ...dados,
          dataAssinaturaContrato: '2999-01-01',
        }),
      ),
    ).toContain('A data de assinatura não pode estar no futuro.');
  });
});
