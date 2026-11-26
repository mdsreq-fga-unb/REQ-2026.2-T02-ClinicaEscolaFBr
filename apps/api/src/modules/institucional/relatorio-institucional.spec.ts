import type { Indicadores } from '@clinica/shared';
import { gerarPdf, montarRelatorio } from './relatorio-institucional';

// Conteúdo do relatório institucional (RF49), conferido no texto que o PDF
// desenha. Os números e as frases são os mesmos da tela do RF48.
describe('Relatório institucional em PDF (RF49)', () => {
  const agosto: Indicadores = {
    inicio: '2026-08-01',
    fim: '2026-08-31',
    referencia: '2026-09-01T02:59:59.999Z',
    referenciaEhAgora: false,
    vagas: { ocupadas: 82, semestre: '2026/2', ofertadas: 100, percentual: 82 },
    espera: { mediaDias: 38.4, pacientes: 12 },
    evasao: { percentual: 3.5, desligamentos: 3, ativos: 86 },
    supervisores: [
      { id: '1', nome: 'Ricardo Menezes', casos: 34 },
      { id: '2', nome: 'Silvia Prado', casos: 0 },
    ],
  };
  const exportacao = {
    por: 'Helena Duarte',
    em: new Date('2026-11-16T15:42:00-03:00'),
  };

  it('traz os quatro indicadores com os valores da tela, o intervalo, a referência, a data/hora e quem exportou (RF49)', () => {
    const r = montarRelatorio(agosto, exportacao);
    expect(r.periodo).toBe(
      'Intervalo: 01/08/2026 a 31/08/2026. Data de referência das vagas e da distribuição: 31/08/2026.',
    );
    expect(r.cartoes).toEqual([
      {
        rotulo: 'Vagas ocupadas',
        valor: '82',
        detalhe: 'de 100 vagas · 82,0%',
      },
      {
        rotulo: 'Tempo médio de espera',
        valor: '38,4',
        detalhe:
          'dias corridos, da inscrição à primeira sessão, para 12 pacientes atendidos pela primeira vez',
      },
      {
        rotulo: 'Taxa de evasão',
        valor: '3,5%',
        detalhe:
          '3 desligamentos por faltas, de 86 pacientes em atendimento ativo',
      },
      {
        rotulo: 'Distribuição de casos',
        valor: '1',
        detalhe: 'supervisor com casos ativos',
      },
    ]);
    expect(r.colunas).toEqual(['Supervisor', 'Casos ativos em 31/08/2026']);
    expect(r.linhas).toEqual([
      ['Ricardo Menezes', '34'],
      ['Silvia Prado', '0'],
    ]);
    expect(r.aviso).toBeNull();
    expect(r.exportacao).toBe(
      'Exportado por Helena Duarte em 16/11/2026, às 15:42.',
    );
    expect(r.nomeArquivo).toBe('indicadores-2026-08-01-a-2026-08-31.pdf');
  });

  it('sem as vagas ofertadas do semestre, reproduz o aviso da tela (RF49)', () => {
    const r = montarRelatorio(
      {
        ...agosto,
        vagas: { ...agosto.vagas, ofertadas: null, percentual: null },
      },
      exportacao,
    );
    expect(r.aviso).toBe(
      'O total de vagas ofertadas no semestre 2026/2 não foi registrado.',
    );
    expect(r.cartoes[0]).toMatchObject({
      valor: '82',
      detalhe: 'vagas ocupadas',
    });
  });

  it('com a data final de hoje, a referência é o instante da consulta exibida', () => {
    const r = montarRelatorio(
      {
        ...agosto,
        fim: '2026-11-16',
        referencia: '2026-11-16T13:05:00.000Z',
        referenciaEhAgora: true,
      },
      exportacao,
    );
    expect(r.periodo).toContain(
      'Data de referência das vagas e da distribuição: 16/11/2026, às 10:05 (momento da consulta).',
    );
    expect(r.colunas[1]).toBe('Casos ativos no momento da consulta');
  });

  it('sem supervisores ativos, avisa em vez de mostrar a tabela vazia', () => {
    const r = montarRelatorio({ ...agosto, supervisores: [] }, exportacao);
    expect(r.semSupervisores).toBe('Não há supervisores ativos.');
    expect(r.linhas).toEqual([]);
  });

  it('gera um PDF marcado, com título e idioma, inclusive com a tabela em mais de uma página (RNF56)', async () => {
    const muitos = {
      ...agosto,
      supervisores: Array.from({ length: 40 }, (_, i) => ({
        id: String(i),
        nome: `Supervisor Fictício ${i + 1}`,
        casos: i,
      })),
    };
    const pdf = await gerarPdf(montarRelatorio(muitos, exportacao));
    const bruto = pdf.toString('latin1');
    expect(bruto.startsWith('%PDF-1.7')).toBe(true);
    expect(bruto).toContain('/Lang (pt-BR)');
    expect(bruto).toContain('/MarkInfo');
    expect(bruto).toContain('/Marked true');
    expect(bruto).toContain('/StructTreeRoot');
    expect(bruto).toContain('/DisplayDocTitle true');
    // 11 linhas na primeira página e 19 nas seguintes.
    expect(bruto.match(/\/Type \/Page\b/g)).toHaveLength(3);
  });
});
