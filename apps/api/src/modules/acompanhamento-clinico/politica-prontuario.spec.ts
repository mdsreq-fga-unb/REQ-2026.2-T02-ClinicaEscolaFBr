import { TriagemService } from '../triagem/triagem.service';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import {
  acessosProntuario,
  atribuicoesSupervisor,
  casos,
  decisoesPrioridade,
  evolucoes,
  inscricoes,
  prontuarios,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar } from '../../common/criptografia';
import {
  CHAVE_TESTE,
  criarBancoDeTeste,
} from '../../test-utils/banco-de-teste';
import { FilaService } from '../fila/fila.service';
import { DesligamentosService } from '../assiduidade/desligamentos.service';
import { FaltasService } from '../assiduidade/faltas.service';
import { PoliticaProntuario } from './politica-prontuario';
import { ProntuariosService } from './prontuarios.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';

describe('Restrição de acesso ao prontuário (RF55)', () => {
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let servico: ProntuariosService;
  let politica: PoliticaProntuario;
  let prontuarioId: string;
  let casoId: string;
  const pessoas: Record<string, UsuarioAutenticado> = {};

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());
  }, 60_000);

  afterAll(() => fechar());

  beforeEach(async () => {
    await limpar();
    const criar = async (
      chave: string,
      nome: string,
      perfil: UsuarioAutenticado['perfil'],
    ) => {
      const [u] = await db
        .insert(usuarios)
        .values({
          nome,
          email: `${chave}@fbr.edu.br`,
          perfil,
          situacao: 'ativo',
        })
        .returning();
      pessoas[chave] = { id: u.id, nome, perfil };
    };
    await criar('estagiarioA', 'Ana Beatriz Costa', 'estagiario');
    await criar('estagiarioB', 'João Victor Almeida', 'estagiario');
    await criar('supervisor', 'Ricardo Menezes', 'supervisor');
    await criar('outroSupervisor', 'Carla Mendes Souza', 'supervisor');
    await criar('secretaria', 'Juliana Rocha', 'secretaria');
    await criar('coordenacao', 'Helena Duarte', 'coordenacao');

    const [inscricao] = await db
      .insert(inscricoes)
      .values({
        numero: '2026-00398',
        nomeCompleto: 'Mariana Alves Toledo',
        dataNascimento: '1994-08-22',
        cpf: '11144477735',
        rg: '3.214.567',
        endereco: 'SQN 104',
        estadoCivil: 'solteira',
        celular: '61998765432',
        email: 'mariana@exemplo.com.br',
        canalPreferencial: 'whatsapp',
        queixaCifrada: cifrar(
          'Cansaço e desânimo há quatro meses.',
          CHAVE_TESTE,
        ),
        percepcaoUrgenciaCifrada: cifrar('media', CHAVE_TESTE),
        historicoRelevanteCifrado: cifrar('Terapia em 2021.', CHAVE_TESTE),
      })
      .returning();
    const [caso] = await db
      .insert(casos)
      .values({
        entradaNaFilaEm: inscricao.criadaEm,
        inscricaoId: inscricao.id,
        situacao: 'em_atendimento',
      })
      .returning();
    casoId = caso.id;
    await db.insert(atribuicoesSupervisor).values({
      casoId,
      supervisorId: pessoas.supervisor.id,
      atribuidoPor: pessoas.coordenacao.id,
    });
    const [vinculo] = await db
      .insert(vinculosEstagiario)
      .values({
        casoId,
        estagiarioId: pessoas.estagiarioA.id,
        vinculadoPor: pessoas.supervisor.id,
      })
      .returning();
    const [prontuario] = await db
      .insert(prontuarios)
      .values({
        casoId,
        cicloAtendimento: 1,
        vinculoOrigemId: vinculo.id,
        anamneseCifrada: cifrar('Relata cansaço e desânimo.', CHAVE_TESTE),
      })
      .returning();
    prontuarioId = prontuario.id;

    politica = new PoliticaProntuario(db);
    const config = new ConfigService({ CHAVE_DADOS: CHAVE_TESTE });
    servico = new ProntuariosService(
      db,
      politica,
      config,
      new AuditoriaService(db),
      new FaltasService(db, config, new AuditoriaService(db)),
      new DesligamentosService(
        db,
        config,
        new AuditoriaService(db),
        new FilaService(db, config),
      ),
    );
  });

  const acessos = () => db.select().from(acessosProntuario);

  it('o estagiário responsável vê o conteúdo clínico, e o acesso é registrado', async () => {
    const prontuario = await servico.consultar(
      prontuarioId,
      pessoas.estagiarioA,
    );
    expect(prontuario.dadosIniciais.anamnese?.queixaPrincipal).toBe(
      'Relata cansaço e desânimo.',
    );
    expect(prontuario).toMatchObject({
      nome: 'Mariana Alves Toledo',
      estagiario: 'Ana Beatriz Costa',
      supervisor: 'Ricardo Menezes',
    });
    expect(await acessos()).toEqual([
      expect.objectContaining({
        usuarioId: pessoas.estagiarioA.id,
        permitido: true,
        prontuarioId,
      }),
    ]);
  });

  it('o supervisor do caso vê o conteúdo clínico', async () => {
    await expect(
      servico.consultar(prontuarioId, pessoas.supervisor),
    ).resolves.toMatchObject({ id: prontuarioId });
  });

  it('a coordenação vê o conteúdo clínico de qualquer prontuário, e o acesso é registrado (DF32)', async () => {
    const prontuario = await servico.consultar(
      prontuarioId,
      pessoas.coordenacao,
    );
    expect(prontuario.dadosIniciais.anamnese?.queixaPrincipal).toBe(
      'Relata cansaço e desânimo.',
    );
    expect(await acessos()).toEqual([
      expect.objectContaining({
        usuarioId: pessoas.coordenacao.id,
        perfil: 'coordenacao',
        permitido: true,
        prontuarioId,
      }),
    ]);
  });

  it('a coordenação não tem acesso de escrita ao prontuário', async () => {
    await expect(
      politica.exigirAcesso(
        pessoas.coordenacao,
        prontuarioId,
        'registrar_evolucao',
        'escrita',
      ),
    ).rejects.toMatchObject({ status: 403 });
    const [registro] = await acessos();
    expect(registro).toMatchObject({ permitido: false, prontuarioId });
  });

  it.each(['estagiarioB', 'outroSupervisor', 'secretaria'])(
    '%s tem o acesso negado na API, e a tentativa é registrada (RNF25)',
    async (quem) => {
      await expect(
        servico.consultar(prontuarioId, pessoas[quem]),
      ).rejects.toMatchObject({ status: 403 });
      expect(await acessos()).toEqual([
        expect.objectContaining({
          usuarioId: pessoas[quem].id,
          permitido: false,
          prontuarioId,
        }),
      ]);
    },
  );

  it('prontuário inexistente recebe a mesma resposta negada, sem revelar que não existe (RNF25)', async () => {
    await expect(
      servico.consultar(
        '00000000-0000-4000-8000-000000000000',
        pessoas.estagiarioB,
      ),
    ).rejects.toMatchObject({ status: 403 });
    const [registro] = await acessos();
    expect(registro).toMatchObject({ permitido: false, prontuarioId: null });
  });

  it('a negação continua depois que o vínculo do estagiário deixa de ser vigente', async () => {
    await db
      .update(vinculosEstagiario)
      .set({ vigente: false })
      .where(eq(vinculosEstagiario.casoId, casoId));
    await expect(
      servico.consultar(prontuarioId, pessoas.estagiarioA),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('os dados administrativos não trazem conteúdo clínico (RNF25)', async () => {
    const dados = await servico.dadosAdministrativos(
      casoId,
      pessoas.secretaria,
    );
    expect(dados).toMatchObject({
      nome: 'Mariana Alves Toledo',
      celular: '61998765432',
      canalPreferencial: 'whatsapp',
      situacao: 'em_atendimento',
      estagiario: 'Ana Beatriz Costa',
    });
    const texto = JSON.stringify(dados);
    for (const clinico of [
      'Cansaço',
      'desânimo',
      'Terapia',
      'anamnese',
      'queixa',
    ]) {
      expect(texto).not.toContain(clinico);
    }
  });

  it('só a coordenação recebe o id do prontuário nos dados administrativos', async () => {
    await expect(
      servico.dadosAdministrativos(casoId, pessoas.coordenacao),
    ).resolves.toMatchObject({ prontuarioId });
    const daSecretaria = await servico.dadosAdministrativos(
      casoId,
      pessoas.secretaria,
    );
    expect(daSecretaria).not.toHaveProperty('prontuarioId');
  });

  describe('RF69 — anamnese e contrato terapêutico', () => {
    const contrato = {
      aceiteTclePesquisa: true,
      viaContratoGuardada: true as const,
      dataAssinaturaContrato: '2026-10-27',
    };
    const anamneseSo = (queixaPrincipal: string) => ({
      queixaPrincipal,
      historiaProblemaAtual: null,
      historicoFamiliar: null,
      desenvolvimento: null,
      historicoMedico: null,
      aspectosPsicossociais: null,
    });

    beforeEach(async () => {
      await db
        .update(prontuarios)
        .set({ anamneseCifrada: null })
        .where(eq(prontuarios.id, prontuarioId));
    });

    it('o formulário vem com a queixa da inscrição só para o estagiário responsável e só enquanto a anamnese não existe', async () => {
      const doEstagiario = await servico.consultar(
        prontuarioId,
        pessoas.estagiarioA,
      );
      expect(doEstagiario.dadosIniciais).toMatchObject({
        anamnese: null,
        contrato: null,
        queixaDaInscricao: 'Cansaço e desânimo há quatro meses.',
      });
      // As outras respostas da triagem (RF4) não vêm junto.
      expect(JSON.stringify(doEstagiario)).not.toMatch(/Terapia em 2021|media/);
      for (const quem of ['supervisor', 'coordenacao']) {
        const leitura = await servico.consultar(prontuarioId, pessoas[quem]);
        expect(leitura.dadosIniciais.queixaDaInscricao).toBeNull();
      }
      await servico.registrarAnamnese(
        prontuarioId,
        anamneseSo('Cansaço.'),
        pessoas.estagiarioA,
      );
      const depois = await servico.consultar(prontuarioId, pessoas.estagiarioA);
      expect(depois.dadosIniciais.queixaDaInscricao).toBeNull();
    });

    it('a anamnese só com a queixa principal é salva cifrada, com autor e data/hora, e as outras seções ficam em branco', async () => {
      await expect(
        servico.registrarAnamnese(
          prontuarioId,
          anamneseSo('Queixa sigilosa de teste'),
          pessoas.estagiarioA,
        ),
      ).resolves.toEqual({ registrada: true });
      const [linha] = await db
        .select()
        .from(prontuarios)
        .where(eq(prontuarios.id, prontuarioId));
      expect(linha.anamneseCifrada).not.toContain('Queixa sigilosa');
      expect(linha.anamnesePor).toBe(pessoas.estagiarioA.id);
      expect(linha.anamneseEm).toBeInstanceOf(Date);
      // O contrato continua sem registro: as partes são independentes.
      expect(linha.contratoEm).toBeNull();
      const { dadosIniciais } = await servico.consultar(
        prontuarioId,
        pessoas.supervisor,
      );
      expect(dadosIniciais.anamnese).toMatchObject({
        ...anamneseSo('Queixa sigilosa de teste'),
        registradaPor: 'Ana Beatriz Costa',
      });
      expect(dadosIniciais.contrato).toBeNull();
    });

    it('a anamnese completa guarda as seis seções', async () => {
      const completa = {
        queixaPrincipal: 'Ansiedade.',
        historiaProblemaAtual: 'Começou há um ano.',
        historicoFamiliar: 'Pais separados.',
        desenvolvimento: 'Sem intercorrências.',
        historicoMedico: 'Hipotireoidismo.',
        aspectosPsicossociais: 'Mora sozinha.',
      };
      await servico.registrarAnamnese(
        prontuarioId,
        completa,
        pessoas.estagiarioA,
      );
      const { dadosIniciais } = await servico.consultar(
        prontuarioId,
        pessoas.estagiarioA,
      );
      expect(dadosIniciais.anamnese).toMatchObject(completa);
    });

    it('a segunda anamnese no mesmo prontuário é recusada com 409', async () => {
      await servico.registrarAnamnese(
        prontuarioId,
        anamneseSo('Primeira.'),
        pessoas.estagiarioA,
      );
      await expect(
        servico.registrarAnamnese(
          prontuarioId,
          anamneseSo('Substituição proibida.'),
          pessoas.estagiarioA,
        ),
      ).rejects.toMatchObject({ status: 409 });
      const { dadosIniciais } = await servico.consultar(
        prontuarioId,
        pessoas.estagiarioA,
      );
      expect(dadosIniciais.anamnese?.queixaPrincipal).toBe('Primeira.');
    });

    it('o contrato é salvo à parte, com autor e data/hora, e o segundo é recusado com 409', async () => {
      await expect(
        servico.registrarContrato(prontuarioId, contrato, pessoas.estagiarioA),
      ).resolves.toEqual({ registrado: true });
      const { dadosIniciais } = await servico.consultar(
        prontuarioId,
        pessoas.estagiarioA,
      );
      expect(dadosIniciais.anamnese).toBeNull();
      expect(dadosIniciais.contrato).toMatchObject({
        dataAssinatura: '2026-10-27',
        aceiteTclePesquisa: true,
        viaGuardada: true,
        textoLivre: null,
        registradoPor: 'Ana Beatriz Costa',
      });
      await expect(
        servico.registrarContrato(
          prontuarioId,
          { ...contrato, aceiteTclePesquisa: false },
          pessoas.estagiarioA,
        ),
      ).rejects.toMatchObject({ status: 409 });
    });

    it.each(['supervisor', 'coordenacao', 'secretaria', 'estagiarioB'])(
      '%s não registra anamnese nem contrato (403), e a tentativa fica registrada',
      async (quem) => {
        await expect(
          servico.registrarAnamnese(
            prontuarioId,
            anamneseSo('Tentativa.'),
            pessoas[quem],
          ),
        ).rejects.toMatchObject({ status: 403 });
        await expect(
          servico.registrarContrato(prontuarioId, contrato, pessoas[quem]),
        ).rejects.toMatchObject({ status: 403 });
        const [linha] = await db
          .select()
          .from(prontuarios)
          .where(eq(prontuarios.id, prontuarioId));
        expect(linha.anamneseCifrada).toBeNull();
        expect(linha.dataAssinaturaContrato).toBeNull();
        expect((await acessos()).map((a) => [a.operacao, a.permitido])).toEqual(
          [
            ['registrar_anamnese', false],
            ['registrar_contrato', false],
          ],
        );
      },
    );

    it('o registro antigo, de texto único, aparece como a queixa principal, com o autor dos dados iniciais', async () => {
      await db
        .update(prontuarios)
        .set({
          anamneseCifrada: cifrar('Texto único antigo.', CHAVE_TESTE),
          dataAssinaturaContrato: '2026-10-01',
          viaContratoGuardada: true,
          dadosIniciaisPor: pessoas.estagiarioA.id,
          dadosIniciaisEm: new Date('2026-10-02T12:00:00Z'),
        })
        .where(eq(prontuarios.id, prontuarioId));
      const { dadosIniciais } = await servico.consultar(
        prontuarioId,
        pessoas.supervisor,
      );
      expect(dadosIniciais.anamnese).toMatchObject({
        ...anamneseSo('Texto único antigo.'),
        registradaPor: 'Ana Beatriz Costa',
        registradaEm: new Date('2026-10-02T12:00:00Z'),
      });
      expect(dadosIniciais.contrato).toMatchObject({
        dataAssinatura: '2026-10-01',
        registradoPor: 'Ana Beatriz Costa',
      });
    });
  });

  describe('RF28 — evolução da sessão realizada', () => {
    const ficha = {
      humorAparencia: 'Humor confidencial',
      conteudoTrabalhado: 'Conteúdo confidencial',
      tecnicasUtilizadas: 'Técnica confidencial',
      intervencoesEncaminhamentos: null,
      planoProximaSessao: 'Plano confidencial',
    };
    let horas = 0;
    // Sessões sem sobreposição, uma a cada dia para trás.
    const sessao = async (
      status:
        | 'agendada'
        | 'confirmada'
        | 'cancelada'
        | 'realizada'
        | 'falta_paciente',
      extra: { casoId?: string; estagiarioId?: string } = {},
    ) => {
      horas += 24;
      const inicio = new Date(Date.now() - horas * 3_600_000);
      const [nova] = await db
        .insert(sessoesAtendimento)
        .values({
          casoId: extra.casoId ?? casoId,
          cicloAtendimento: 1,
          estagiarioId: extra.estagiarioId ?? pessoas.estagiarioA.id,
          inicio,
          termino: new Date(inicio.getTime() + 50 * 60_000),
          fimIntervaloAnotacoes: new Date(inicio.getTime() + 60 * 60_000),
          agendadaPor: pessoas.supervisor.id,
          status,
        })
        .returning();
      return nova.id;
    };
    const registrar = (sessaoId: string, quem = pessoas.estagiarioA) =>
      servico.registrarEvolucao(prontuarioId, sessaoId, ficha, quem);

    beforeEach(() => {
      horas = 0;
    });

    it('a evolução válida fica cifrada, ligada à sessão, ao prontuário e ao ciclo, com autor e data/hora, e o original é imutável', async () => {
      const agendada = await sessao('agendada');
      await servico.marcarSessaoRealizada(
        prontuarioId,
        agendada,
        pessoas.estagiarioA,
      );
      await expect(registrar(agendada)).resolves.toMatchObject({
        registrada: true,
        numeroNoCiclo: 1,
        fechamentoAvaliativo: false,
      });
      const [linha] = await db
        .select()
        .from(evolucoes)
        .where(eq(evolucoes.sessaoId, agendada));
      expect(linha).toMatchObject({
        prontuarioId,
        registradaPor: pessoas.estagiarioA.id,
        queixaCifrada: null,
        intervencoesEncaminhamentosCifrado: null,
      });
      expect(JSON.stringify(linha)).not.toContain('confidencial');
      const { sessoes } = await servico.consultar(
        prontuarioId,
        pessoas.supervisor,
      );
      expect(sessoes).toEqual([
        expect.objectContaining({
          id: agendada,
          status: 'realizada',
          numeroNoCiclo: 1,
          evolucao: expect.objectContaining({
            ...ficha,
            queixa: null,
            planejamento: null,
            registradaPor: 'Ana Beatriz Costa',
          }),
        }),
      ]);
      await expect(
        db.update(evolucoes).set({ humorAparenciaCifrado: 'alteração' }),
      ).rejects.toThrow();
    });

    it('a segunda evolução da mesma sessão é recusada com 409', async () => {
      const realizada = await sessao('realizada');
      await registrar(realizada);
      await expect(registrar(realizada)).rejects.toMatchObject({
        status: 409,
      });
    });

    it.each(['agendada', 'confirmada', 'cancelada', 'falta_paciente'] as const)(
      'sessão %s não aceita evolução (422)',
      async (status) => {
        const naoRealizada = await sessao(status);
        await expect(registrar(naoRealizada)).rejects.toMatchObject({
          status: 422,
        });
        expect(await db.select().from(evolucoes)).toEqual([]);
      },
    );

    it('sessão de outro paciente não aceita evolução por este prontuário (403)', async () => {
      const [outraInscricao] = await db
        .insert(inscricoes)
        .values({
          numero: '2026-00399',
          nomeCompleto: 'Outro Paciente Teste',
          dataNascimento: '1990-01-01',
          cpf: '52998224725',
          rg: '1.234.567',
          endereco: 'SQN 105',
          estadoCivil: 'solteiro',
          celular: '61991234567',
          email: 'outro@exemplo.com.br',
          canalPreferencial: 'email',
        })
        .returning();
      const [outroCaso] = await db
        .insert(casos)
        .values({
          entradaNaFilaEm: outraInscricao.criadaEm,
          inscricaoId: outraInscricao.id,
          situacao: 'em_atendimento',
        })
        .returning();
      const deOutro = await sessao('realizada', { casoId: outroCaso.id });
      await expect(registrar(deOutro)).rejects.toMatchObject({ status: 403 });
    });

    it('estagiário com o vínculo revogado não registra evolução (403)', async () => {
      const realizada = await sessao('realizada');
      await db
        .update(vinculosEstagiario)
        .set({ vigente: false })
        .where(eq(vinculosEstagiario.casoId, casoId));
      await expect(registrar(realizada)).rejects.toMatchObject({
        status: 403,
      });
    });

    it.each(['supervisor', 'coordenacao', 'estagiarioB'])(
      '%s não registra evolução (403)',
      async (quem) => {
        const realizada = await sessao('realizada');
        await expect(registrar(realizada, pessoas[quem])).rejects.toMatchObject(
          { status: 403 },
        );
      },
    );

    it('o aviso de fechamento avaliativo vem na 10ª e na 20ª sessão realizadas do ciclo, e não na 9ª nem na 11ª', async () => {
      // Criadas da mais recente para a mais antiga: a última da lista é a 1ª do ciclo.
      const ids: string[] = [];
      for (let i = 0; i < 21; i++) ids.unshift(await sessao('realizada'));
      const avisos: Record<number, boolean> = {};
      for (const [indice, id] of ids.entries()) {
        const resposta = await registrar(id);
        expect(resposta.numeroNoCiclo).toBe(indice + 1);
        avisos[indice + 1] = resposta.fechamentoAvaliativo;
      }
      expect(avisos).toMatchObject({
        9: false,
        10: true,
        11: false,
        19: false,
        20: true,
        21: false,
      });
    });

    it('a evolução registrada fora de ordem usa o número da própria sessão, e não o total no momento do registro', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 10; i++) ids.unshift(await sessao('realizada'));
      // A 10ª é registrada primeiro: o aviso vem com ela.
      await expect(registrar(ids[9])).resolves.toMatchObject({
        numeroNoCiclo: 10,
        fechamentoAvaliativo: true,
      });
      await expect(registrar(ids[0])).resolves.toMatchObject({
        numeroNoCiclo: 1,
        fechamentoAvaliativo: false,
      });
      const consulta = await servico.consultar(
        prontuarioId,
        pessoas.supervisor,
      );
      expect(consulta.fechamentoAvaliativoPendente).toBe(true);
    });

    it('a evolução antiga, com queixa e planejamento, continua legível com os campos antigos', async () => {
      const realizada = await sessao('realizada');
      await db.insert(evolucoes).values({
        prontuarioId,
        sessaoId: realizada,
        queixaCifrada: cifrar('Queixa antiga', CHAVE_TESTE),
        planejamentoCifrado: cifrar('Plano antigo', CHAVE_TESTE),
        registradaPor: pessoas.estagiarioA.id,
      });
      const { sessoes } = await servico.consultar(
        prontuarioId,
        pessoas.estagiarioA,
      );
      expect(sessoes[0].evolucao).toMatchObject({
        queixa: 'Queixa antiga',
        planejamento: 'Plano antigo',
        humorAparencia: null,
      });
    });

    it('o banco recusa evolução sem a ficha completa, nem a antiga nem a da DF38', async () => {
      const realizada = await sessao('realizada');
      await expect(
        db.insert(evolucoes).values({
          prontuarioId,
          sessaoId: realizada,
          humorAparenciaCifrado: 'x',
          registradaPor: pessoas.estagiarioA.id,
        }),
      ).rejects.toThrow();
    });
  });

  it('o registro de acessos não pode ser alterado nem apagado (RNF52)', async () => {
    await servico.consultar(prontuarioId, pessoas.estagiarioA);
    await expect(
      db.update(acessosProntuario).set({ permitido: false }),
    ).rejects.toThrow();
    await expect(db.delete(acessosProntuario)).rejects.toThrow();
  });
  it('RF6 mantém a nova prioridade vigente mesmo se a decisão anterior tiver horário adiantado', async () => {
    const [caso] = await db.select().from(casos).where(eq(casos.id, casoId));
    await db.insert(decisoesPrioridade).values({
      inscricaoId: caso.inscricaoId,
      corCifrada: cifrar('verde', CHAVE_TESTE),
      decididaPor: pessoas.supervisor.id,
      decididaEm: new Date('2099-01-01T00:00:00Z'),
    });
    const triagem = new TriagemService(
      db,
      new ConfigService({ CHAVE_DADOS: CHAVE_TESTE }),
      new AuditoriaService(db),
    );
    await triagem.registrarPrioridade(
      caso.inscricaoId,
      'vermelha',
      pessoas.supervisor,
    );
    expect(await triagem.listarClassificadas()).toEqual([
      expect.objectContaining({
        prioridade: 'vermelha',
        historico: [
          expect.objectContaining({ prioridade: 'vermelha' }),
          expect.objectContaining({ prioridade: 'verde' }),
        ],
      }),
    ]);
  });
});
