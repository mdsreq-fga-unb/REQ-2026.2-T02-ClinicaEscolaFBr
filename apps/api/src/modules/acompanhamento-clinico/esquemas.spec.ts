import {
  anamneseSchema,
  contratoSchema,
  evolucaoSchema,
  hojeEmBrasilia,
} from '@clinica/shared';

describe('Validação da evolução, da anamnese e do contrato', () => {
  const mensagens = (r: { error?: { issues: { message: string }[] } }) =>
    r.error?.issues.map((i) => i.message) ?? [];
  const campos = (r: { error?: { issues: { path: PropertyKey[] }[] } }) =>
    r.error?.issues.map((i) => i.path[0]) ?? [];

  const evolucaoCompleta = {
    humorAparencia: 'Humor estável, aparência cuidada.',
    conteudoTrabalhado: 'Rotina de sono.',
    tecnicasUtilizadas: 'Psicoeducação.',
    intervencoesEncaminhamentos: 'Encaminhada ao clínico geral.',
    planoProximaSessao: 'Retomar o diário de sono.',
  };

  it('a evolução segue a ficha da DF38: sem um dos quatro obrigatórios não salva, e cada campo é indicado (RF28, RNF25, RNF27, RNF30)', () => {
    const resultado = evolucaoSchema.safeParse({
      humorAparencia: ' ',
      conteudoTrabalhado: '',
      tecnicasUtilizadas: '',
      planoProximaSessao: '',
    });
    expect(campos(resultado)).toEqual([
      'humorAparencia',
      'conteudoTrabalhado',
      'tecnicasUtilizadas',
      'planoProximaSessao',
    ]);
    expect(mensagens(resultado)).toEqual([
      'Descreva o humor e a aparência do paciente.',
      'Descreva o conteúdo trabalhado.',
      'Informe as técnicas utilizadas.',
      'Escreva o plano para a próxima sessão.',
    ]);
  });

  it('intervenções e encaminhamentos pode ficar em branco e vira null (RF28, RNF25, RNF27, RNF30)', () => {
    const semIntervencoes: Partial<typeof evolucaoCompleta> = {
      ...evolucaoCompleta,
    };
    delete semIntervencoes.intervencoesEncaminhamentos;
    expect(
      evolucaoSchema.parse(semIntervencoes).intervencoesEncaminhamentos,
    ).toBeNull();
    expect(
      evolucaoSchema.parse({
        ...evolucaoCompleta,
        intervencoesEncaminhamentos: '  ',
      }).intervencoesEncaminhamentos,
    ).toBeNull();
  });

  it.each(Object.keys(evolucaoCompleta))(
    'o campo %s da evolução com mais de 1.000 caracteres é recusado, com a indicação do limite (RF28, RNF25, RNF27, RNF30)',
    (campo) => {
      const resultado = evolucaoSchema.safeParse({
        ...evolucaoCompleta,
        [campo]: 'a'.repeat(1001),
      });
      expect(campos(resultado)).toEqual([campo]);
      expect(mensagens(resultado)).toEqual(['Use no máximo 1.000 caracteres.']);
    },
  );

  it('a evolução não tem limite de linhas: 30 linhas e 1.000 caracteres são aceitos (RF28, RNF25, RNF27, RNF30)', () => {
    expect(
      evolucaoSchema.safeParse({
        ...evolucaoCompleta,
        conteudoTrabalhado: Array(30).fill('linha').join('\n'),
      }).success,
    ).toBe(true);
    expect(
      evolucaoSchema.safeParse({
        ...evolucaoCompleta,
        humorAparencia: 'a'.repeat(1000),
      }).success,
    ).toBe(true);
  });

  it('a anamnese só com a queixa principal é aceita, e as outras seções viram null (RF69, RNF25, RNF51, RNF52, DF37)', () => {
    expect(anamneseSchema.parse({ queixaPrincipal: 'Ansiedade.' })).toEqual({
      queixaPrincipal: 'Ansiedade.',
      historiaProblemaAtual: null,
      historicoFamiliar: null,
      desenvolvimento: null,
      historicoMedico: null,
      aspectosPsicossociais: null,
    });
  });

  it('a anamnese sem queixa principal não é salva (RF69, RNF25, RNF51, RNF52)', () => {
    const resultado = anamneseSchema.safeParse({
      queixaPrincipal: '  ',
      historicoFamiliar: 'Pais separados.',
    });
    expect(campos(resultado)).toEqual(['queixaPrincipal']);
    expect(mensagens(resultado)).toEqual(['Informe a queixa principal.']);
  });

  it('a seção da anamnese com 1.001 caracteres é recusada, com a indicação da seção (RF69, RNF25, RNF51, RNF52)', () => {
    const resultado = anamneseSchema.safeParse({
      queixaPrincipal: 'Ansiedade.',
      historicoMedico: 'a'.repeat(1001),
    });
    expect(campos(resultado)).toEqual(['historicoMedico']);
    expect(mensagens(resultado)).toEqual(['Use no máximo 1.000 caracteres.']);
  });

  it('o contrato da clínica exige confirmar a guarda da via assinada, e o aceite do termo para pesquisa é opcional (RF69, RNF25, RNF51, RNF52, DF41)', () => {
    const base = { dataAssinaturaContrato: '2026-10-01' };
    expect(mensagens(contratoSchema.safeParse(base))).toContain(
      'Confirme que a via assinada do contrato está guardada na clínica.',
    );
    const ok = contratoSchema.parse({ ...base, viaContratoGuardada: true });
    expect(ok.aceiteTclePesquisa).toBe(false);
  });

  it('a data de assinatura do contrato não pode estar no futuro (RF69, RNF25, RNF51, RNF52)', () => {
    const dados = { viaContratoGuardada: true };
    expect(
      contratoSchema.safeParse({
        ...dados,
        dataAssinaturaContrato: hojeEmBrasilia(),
      }).success,
    ).toBe(true);
    expect(
      mensagens(
        contratoSchema.safeParse({
          ...dados,
          dataAssinaturaContrato: '2999-01-01',
        }),
      ),
    ).toContain('A data de assinatura não pode estar no futuro.');
  });
});
