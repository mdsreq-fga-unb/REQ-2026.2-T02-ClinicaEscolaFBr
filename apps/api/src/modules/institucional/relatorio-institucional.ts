import PDFDocument from 'pdfkit';
import type { Indicadores } from '@clinica/shared';
import { dataBrasilia, horaBrasilia } from '../agendamento/horario';

// Relatório institucional em PDF (RF49, prancha 9-1). O texto sai de
// `montarRelatorio`, com as mesmas frases e os mesmos números da tela do RF48, e
// `gerarPdf` só desenha. Assim os testes conferem o conteúdo sem ler o PDF.

const decimal = (valor: number) =>
  valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
const plural = (n: number, um: string, varios: string) =>
  `${n} ${n === 1 ? um : varios}`;
const dataBr = (iso: string) => iso.split('-').reverse().join('/');

export type Cartao = { rotulo: string; valor: string; detalhe: string };

export type Relatorio = {
  titulo: string;
  instituicao: string;
  periodo: string;
  cartoes: Cartao[];
  aviso: string | null;
  colunas: [string, string];
  linhas: [string, string][];
  semSupervisores: string | null;
  exportacao: string;
  nomeArquivo: string;
};

export function montarRelatorio(
  ind: Indicadores,
  exportacao: { por: string; em: Date },
): Relatorio {
  const referencia = new Date(ind.referencia);
  const dataReferencia = ind.referenciaEhAgora
    ? `${dataBrasilia(referencia)}, às ${horaBrasilia(referencia)} (momento da consulta)`
    : dataBr(ind.fim);
  const comCasos = ind.supervisores.filter((s) => s.casos > 0).length;
  const { vagas, espera, evasao } = ind;
  return {
    titulo: 'Relatório institucional · indicadores operacionais',
    instituicao: 'Clínica Escola de Psicologia · Faculdade Brasília',
    periodo: `Intervalo: ${dataBr(ind.inicio)} a ${dataBr(ind.fim)}. Data de referência das vagas e da distribuição: ${dataReferencia}.`,
    cartoes: [
      {
        rotulo: 'Vagas ocupadas',
        valor: String(vagas.ocupadas),
        detalhe:
          vagas.ofertadas !== null
            ? `de ${vagas.ofertadas} vagas · ${decimal(vagas.percentual!)}%`
            : 'vagas ocupadas',
      },
      {
        rotulo: 'Tempo médio de espera',
        valor: decimal(espera.mediaDias),
        detalhe: espera.pacientes
          ? `dias corridos, da inscrição à primeira sessão, para ${plural(espera.pacientes, 'paciente atendido', 'pacientes atendidos')} pela primeira vez`
          : 'dias corridos. Nenhuma primeira sessão realizada no período.',
      },
      {
        rotulo: 'Taxa de evasão',
        valor: `${decimal(evasao.percentual)}%`,
        detalhe: evasao.ativos
          ? `${plural(evasao.desligamentos, 'desligamento', 'desligamentos')} por faltas, de ${plural(evasao.ativos, 'paciente', 'pacientes')} em atendimento ativo`
          : 'Nenhum paciente em atendimento ativo no período.',
      },
      {
        rotulo: 'Distribuição de casos',
        valor: String(comCasos),
        detalhe:
          comCasos === 1
            ? 'supervisor com casos ativos'
            : 'supervisores com casos ativos',
      },
    ],
    // O mesmo aviso da tela (RF48) quando as vagas do semestre não foram registradas.
    aviso:
      vagas.ofertadas === null
        ? `O total de vagas ofertadas no semestre ${vagas.semestre} não foi registrado.`
        : null,
    colunas: [
      'Supervisor',
      ind.referenciaEhAgora
        ? 'Casos ativos no momento da consulta'
        : `Casos ativos em ${dataBr(ind.fim)}`,
    ],
    linhas: ind.supervisores.map((s) => [s.nome, String(s.casos)]),
    semSupervisores:
      ind.supervisores.length === 0 ? 'Não há supervisores ativos.' : null,
    exportacao: `Exportado por ${exportacao.por} em ${dataBrasilia(exportacao.em)}, às ${horaBrasilia(exportacao.em)}.`,
    nomeArquivo: `indicadores-${ind.inicio}-a-${ind.fim}.pdf`,
  };
}

const COR = {
  titulo: '#062a3d',
  texto: '#0b2a3c',
  cinza: '#5b6b77',
  borda: '#dde5ea',
  azul: '#0c5d86',
  avisoFundo: '#fff1e0',
  avisoTexto: '#8a4500',
};
const MARGEM = 48;

// PDF marcado (tagged), com título e idioma, para leitores de tela (RNF56 a
// RNF58): título, parágrafos e tabela com cabeçalhos ficam na estrutura, e as
// molduras e a paginação são artefatos.
export function gerarPdf(relatorio: Relatorio): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: MARGEM,
    pdfVersion: '1.7',
    tagged: true,
    lang: 'pt-BR',
    displayTitle: true,
    bufferPages: true,
    info: {
      Title: relatorio.titulo,
      Author: relatorio.instituicao,
      Subject: relatorio.periodo,
    },
  });
  const partes: Buffer[] = [];
  doc.on('data', (parte: Buffer) => partes.push(parte));
  const pronto = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
  });

  const largura = doc.page.width - 2 * MARGEM;
  const limite = () => doc.page.height - MARGEM - 24;
  const artefato = (desenhar: () => void) => {
    doc.markContent('Artifact', { type: 'Layout' });
    desenhar();
    doc.endMarkedContent();
  };

  const documento = doc.struct('Document');
  doc.addStructure(documento);

  documento.add(
    doc.struct('P', {}, () => {
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(COR.azul)
        .text(relatorio.instituicao, MARGEM, MARGEM, { width: largura - 90 });
    }),
  );
  documento.add(
    doc.struct('H1', {}, () => {
      doc
        .moveDown(0.6)
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor(COR.titulo)
        .text(relatorio.titulo, { width: largura });
    }),
  );
  documento.add(
    doc.struct('P', {}, () => {
      doc
        .moveDown(0.5)
        .font('Helvetica')
        .fontSize(10)
        .fillColor(COR.texto)
        .text(relatorio.periodo, { width: largura });
    }),
  );

  // Os quatro indicadores, lado a lado, como na tela.
  const espaco = 12;
  const larguraCartao = (largura - 3 * espaco) / 4;
  const alturaCartao = 104;
  const topoCartoes = doc.y + 14;
  relatorio.cartoes.forEach((cartao, i) => {
    const x = MARGEM + i * (larguraCartao + espaco);
    artefato(() => {
      doc
        .roundedRect(x, topoCartoes, larguraCartao, alturaCartao, 6)
        .lineWidth(1)
        .strokeColor(COR.borda)
        .stroke();
    });
    const interno = larguraCartao - 28;
    documento.add(
      doc.struct('Sect', {}, [
        doc.struct('H2', {}, () => {
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(COR.cinza)
            .text(cartao.rotulo, x + 14, topoCartoes + 12, { width: interno });
        }),
        doc.struct('P', {}, () => {
          doc
            .font('Helvetica-Bold')
            .fontSize(22)
            .fillColor(COR.titulo)
            .text(cartao.valor, x + 14, topoCartoes + 28, { width: interno });
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(COR.texto)
            .text(cartao.detalhe, x + 14, topoCartoes + 58, {
              width: interno,
            });
        }),
      ]),
    );
  });
  doc.x = MARGEM;
  doc.y = topoCartoes + alturaCartao + 16;

  if (relatorio.aviso) {
    const altura = 30;
    const topo = doc.y;
    artefato(() => {
      doc
        .roundedRect(MARGEM, topo, largura, altura, 6)
        .fillColor(COR.avisoFundo)
        .fill();
    });
    documento.add(
      doc.struct('P', {}, () => {
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(COR.avisoTexto)
          .text(`Atenção: ${relatorio.aviso}`, MARGEM + 12, topo + 10, {
            width: largura - 24,
          });
      }),
    );
    doc.x = MARGEM;
    doc.y = topo + altura + 14;
  }

  // Distribuição por supervisor: tabela com cabeçalho, repetido se mudar de página.
  const alturaLinha = 22;
  const coluna = largura * 0.6;
  // As células recebem a posição: o pdfkit só desenha o conteúdo de um elemento
  // da estrutura quando ele entra na árvore, depois que `doc.y` já andou.
  const celula = (
    texto: string,
    x: number,
    topo: number,
    w: number,
    cabecalho: boolean,
  ) =>
    doc
      .font(cabecalho ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(10)
      .fillColor(cabecalho ? COR.cinza : COR.texto)
      .text(texto, x, topo + 6, { width: w });
  const divisoria = (topo: number, cabecalho: boolean) =>
    artefato(() => {
      doc
        .moveTo(MARGEM, topo + alturaLinha)
        .lineTo(MARGEM + largura, topo + alturaLinha)
        .lineWidth(cabecalho ? 1.5 : 0.75)
        .strokeColor(COR.borda)
        .stroke();
    });
  const linhaDeTabela = (celulas: [string, string], cabecalho: boolean) => {
    if (doc.y + alturaLinha > limite()) {
      // Página nova: abaixo da paginação, com o cabeçalho repetido como
      // artefato, para o leitor de tela não ouvir o cabeçalho duas vezes.
      doc.addPage();
      const topo = MARGEM + 24;
      artefato(() => {
        celula(relatorio.colunas[0], MARGEM, topo, coluna - 8, true);
        celula(
          relatorio.colunas[1],
          MARGEM + coluna,
          topo,
          largura - coluna,
          true,
        );
      });
      divisoria(topo, true);
      doc.y = topo + alturaLinha;
    }
    const topo = doc.y;
    const tipo = cabecalho ? 'TH' : 'TD';
    const linha = doc.struct('TR', {}, [
      doc.struct(tipo, {}, () => {
        celula(celulas[0], MARGEM, topo, coluna - 8, cabecalho);
      }),
      doc.struct(tipo, {}, () => {
        celula(celulas[1], MARGEM + coluna, topo, largura - coluna, cabecalho);
      }),
    ]);
    divisoria(topo, cabecalho);
    doc.y = topo + alturaLinha;
    return linha;
  };

  documento.add(
    doc.struct('H2', {}, () => {
      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(COR.titulo)
        .text('Distribuição de casos por supervisor', MARGEM, doc.y, {
          width: largura,
        });
    }),
  );
  doc.y += 4;
  if (relatorio.semSupervisores) {
    documento.add(
      doc.struct('P', {}, () => {
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(COR.texto)
          .text(relatorio.semSupervisores!, MARGEM, doc.y, { width: largura });
      }),
    );
  } else {
    const tabela = doc.struct('Table');
    documento.add(tabela);
    tabela.add(linhaDeTabela(relatorio.colunas, true));
    for (const linha of relatorio.linhas) {
      tabela.add(linhaDeTabela(linha, false));
    }
    tabela.end();
  }

  if (doc.y + 30 > limite()) {
    doc.addPage();
    doc.y = MARGEM;
  }
  documento.add(
    doc.struct('P', {}, () => {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COR.cinza)
        .text(relatorio.exportacao, MARGEM, doc.y + 16, { width: largura });
    }),
  );
  documento.end();

  // Paginação no canto superior direito de cada página, como artefato.
  const { start, count } = doc.bufferedPageRange();
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i);
    doc.markContent('Artifact', { type: 'Pagination' });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COR.cinza)
      .text(`Página ${i + 1} de ${count}`, MARGEM, MARGEM, {
        width: largura,
        align: 'right',
        lineBreak: false,
      });
    doc.endMarkedContent();
  }
  doc.end();
  return pronto;
}
