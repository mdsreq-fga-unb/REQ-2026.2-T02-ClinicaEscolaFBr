import {
  acessosProntuario,
  atribuicoesSupervisor,
  auditoria,
  casos,
  decisoesPrioridade,
  inscricoes,
  prontuarios,
  sessoesAtendimento,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import { criarBancoDeTeste } from '../test-utils/banco-de-teste';

// Travas do schema do Ciclo 3 aplicadas pelo próprio banco, independentes da aplicação.

// Espera que o banco recuse a operação pela trava indicada (nome da restrição ou mensagem).
async function recusada(operacao: Promise<unknown>, trava: string) {
  const erro: unknown = await operacao.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(Error);
  const { message, cause } = erro as Error & { cause?: Error };
  expect(`${message} ${cause?.message ?? ''}`).toContain(trava);
}

const MINUTO = 60_000;

describe('Travas do banco no schema do Ciclo 3', () => {
  let db: Db;
  let limpar: () => Promise<unknown>;
  let fechar: () => Promise<void>;
  let numero = 0;

  beforeAll(async () => {
    ({ db, limpar, fechar } = await criarBancoDeTeste());
  }, 60_000);

  afterAll(() => fechar());

  beforeEach(() => limpar());

  const dadosInscricao = () => ({
    numero: `2026-${String(++numero).padStart(5, '0')}`,
    nomeCompleto: 'Maria de Souza',
    dataNascimento: '1990-05-10',
    cpf: '12345678901',
    rg: '1234567',
    endereco: 'Santa Maria, DF',
    estadoCivil: 'solteira',
    celular: '61999990000' as string | null,
    email: 'maria@example.com' as string | null,
    canalPreferencial: 'email' as const,
    queixaCifrada: 'v1.x.y.z',
    percepcaoUrgenciaCifrada: 'v1.x.y.z',
    historicoRelevanteCifrado: 'v1.x.y.z',
  });

  const criarUsuario = async (
    perfil: 'secretaria' | 'estagiario' | 'supervisor' | 'coordenacao',
  ) => {
    const [usuario] = await db
      .insert(usuarios)
      .values({
        nome: perfil,
        email: `${perfil}-${++numero}@example.com`,
        perfil,
      })
      .returning();
    return usuario.id;
  };

  const criarCaso = async () => {
    const [inscricao] = await db
      .insert(inscricoes)
      .values(dadosInscricao())
      .returning();
    const [caso] = await db
      .insert(casos)
      .values({ inscricaoId: inscricao.id })
      .returning();
    return { inscricaoId: inscricao.id, casoId: caso.id };
  };

  describe('inscrição (RF1, DF24)', () => {
    it('aceita uma inscrição válida', async () => {
      await expect(
        db.insert(inscricoes).values(dadosInscricao()),
      ).resolves.toBeDefined();
    });

    it('exige pelo menos um contato', async () => {
      await recusada(
        db
          .insert(inscricoes)
          .values({ ...dadosInscricao(), celular: null, email: null }),
        'inscricoes_algum_contato',
      );
    });

    it('exige o contato do canal preferencial', async () => {
      await recusada(
        db.insert(inscricoes).values({
          ...dadosInscricao(),
          canalPreferencial: 'whatsapp',
          celular: null,
        }),
        'inscricoes_canal_com_contato',
      );
      await recusada(
        db.insert(inscricoes).values({
          ...dadosInscricao(),
          canalPreferencial: 'email',
          email: null,
        }),
        'inscricoes_canal_com_contato',
      );
    });

    it('exige CPF com 11 números', async () => {
      await recusada(
        db
          .insert(inscricoes)
          .values({ ...dadosInscricao(), cpf: '123.456.789-01' }),
        'inscricoes_cpf_11_digitos',
      );
    });
  });

  describe('vigência única na distribuição (RF20, RF21)', () => {
    it('permite só uma atribuição de supervisor vigente por caso', async () => {
      const { casoId } = await criarCaso();
      const coordenacao = await criarUsuario('coordenacao');
      const atribuir = async () =>
        db.insert(atribuicoesSupervisor).values({
          casoId,
          supervisorId: await criarUsuario('supervisor'),
          atribuidoPor: coordenacao,
        });
      await atribuir();
      await recusada(atribuir(), 'atribuicoes_supervisor_vigente_unica');
      await db.insert(atribuicoesSupervisor).values({
        casoId,
        supervisorId: await criarUsuario('supervisor'),
        atribuidoPor: coordenacao,
        vigente: false,
      });
    });

    it('permite só um vínculo de estagiário vigente por caso', async () => {
      const { casoId } = await criarCaso();
      const supervisor = await criarUsuario('supervisor');
      const vincular = async () =>
        db.insert(vinculosEstagiario).values({
          casoId,
          estagiarioId: await criarUsuario('estagiario'),
          vinculadoPor: supervisor,
        });
      await vincular();
      await recusada(vincular(), 'vinculos_estagiario_vigente_unico');
    });
  });

  describe('prontuário (RF66)', () => {
    it('permite só um prontuário por caso e ciclo', async () => {
      const { casoId } = await criarCaso();
      const [vinculo] = await db
        .insert(vinculosEstagiario)
        .values({
          casoId,
          estagiarioId: await criarUsuario('estagiario'),
          vinculadoPor: await criarUsuario('supervisor'),
        })
        .returning();
      const criar = (cicloAtendimento: number) =>
        db.insert(prontuarios).values({
          casoId,
          cicloAtendimento,
          vinculoOrigemId: vinculo.id,
        });
      await criar(1);
      await recusada(criar(1), 'prontuarios_caso_ciclo');
      await criar(2);
    });
  });

  describe('sessões de atendimento (RF10, RNF9)', () => {
    let casoA: string;
    let casoB: string;
    let estagiarioA: string;
    let estagiarioB: string;
    let secretaria: string;
    const base = new Date('2026-11-03T13:00:00Z').getTime();

    // Sessão de 50 minutos seguida de 10 minutos de anotações (DF18).
    const sessao = (
      casoId: string,
      estagiarioId: string,
      inicioEmMinutos: number,
    ) => {
      const inicio = base + inicioEmMinutos * MINUTO;
      return {
        casoId,
        estagiarioId,
        agendadaPor: secretaria,
        inicio: new Date(inicio),
        termino: new Date(inicio + 50 * MINUTO),
        fimIntervaloAnotacoes: new Date(inicio + 60 * MINUTO),
      };
    };

    beforeEach(async () => {
      ({ casoId: casoA } = await criarCaso());
      ({ casoId: casoB } = await criarCaso());
      estagiarioA = await criarUsuario('estagiario');
      estagiarioB = await criarUsuario('estagiario');
      secretaria = await criarUsuario('secretaria');
    });

    it('exige término depois do início', async () => {
      await recusada(
        db.insert(sessoesAtendimento).values({
          ...sessao(casoA, estagiarioA, 0),
          termino: new Date(base),
        }),
        'sessoes_termino_apos_inicio',
      );
    });

    it('exige o fim das anotações depois do término', async () => {
      await recusada(
        db.insert(sessoesAtendimento).values({
          ...sessao(casoA, estagiarioA, 0),
          fimIntervaloAnotacoes: new Date(base + 40 * MINUTO),
        }),
        'sessoes_intervalo_apos_termino',
      );
    });

    it('impede sessões sobrepostas do mesmo estagiário, contando o intervalo de anotações', async () => {
      await db.insert(sessoesAtendimento).values(sessao(casoA, estagiarioA, 0));
      // Começa durante as anotações da sessão anterior.
      await recusada(
        db.insert(sessoesAtendimento).values(sessao(casoB, estagiarioA, 55)),
        'sessoes_estagiario_sem_sobreposicao',
      );
      // Em sequência, logo depois das anotações, é permitido.
      await db
        .insert(sessoesAtendimento)
        .values(sessao(casoB, estagiarioA, 60));
    });

    it('impede sessões sobrepostas do mesmo paciente, contando só a sessão', async () => {
      await db.insert(sessoesAtendimento).values(sessao(casoA, estagiarioA, 0));
      await recusada(
        db.insert(sessoesAtendimento).values(sessao(casoA, estagiarioB, 30)),
        'sessoes_caso_sem_sobreposicao',
      );
      // Depois do término, mesmo durante as anotações do outro estagiário, é permitido.
      await db
        .insert(sessoesAtendimento)
        .values(sessao(casoA, estagiarioB, 50));
    });
  });

  describe('registros somente inserção (RNF5, RNF52)', () => {
    it('a auditoria não pode ser alterada nem apagada', async () => {
      await db
        .insert(auditoria)
        .values({ operacao: 'teste', entidade: 'teste' });
      await recusada(
        db.update(auditoria).set({ operacao: 'alterada' }),
        'não pode ser alterado nem apagado',
      );
      await recusada(db.delete(auditoria), 'não pode ser alterado nem apagado');
    });

    it('o registro de acessos ao prontuário não pode ser alterado nem apagado', async () => {
      await db.insert(acessosProntuario).values({
        usuarioId: await criarUsuario('estagiario'),
        perfil: 'estagiario',
        operacao: 'consultar',
        permitido: false,
      });
      await recusada(
        db.update(acessosProntuario).set({ permitido: true }),
        'não pode ser alterado nem apagado',
      );
      await recusada(
        db.delete(acessosProntuario),
        'não pode ser alterado nem apagado',
      );
    });

    it('o histórico de decisões de prioridade não pode ser alterado nem apagado', async () => {
      const { inscricaoId } = await criarCaso();
      await db.insert(decisoesPrioridade).values({
        inscricaoId,
        corCifrada: 'v1.x.y.z',
        decididaPor: await criarUsuario('supervisor'),
      });
      await recusada(
        db.update(decisoesPrioridade).set({ corCifrada: 'v1.a.b.c' }),
        'não pode ser alterado nem apagado',
      );
      await recusada(
        db.delete(decisoesPrioridade),
        'não pode ser alterado nem apagado',
      );
    });
  });
});
