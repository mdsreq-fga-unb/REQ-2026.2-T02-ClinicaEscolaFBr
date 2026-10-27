import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import {
  acessosProntuario,
  atribuicoesSupervisor,
  casos,
  inscricoes,
  prontuarios,
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
import { PoliticaProntuario } from './politica-prontuario';
import { ProntuariosService } from './prontuarios.service';

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
      .values({ inscricaoId: inscricao.id, situacao: 'em_atendimento' })
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
    servico = new ProntuariosService(
      db,
      politica,
      new ConfigService({ CHAVE_DADOS: CHAVE_TESTE }),
    );
  });

  const acessos = () => db.select().from(acessosProntuario);

  it('o estagiário responsável vê o conteúdo clínico, e o acesso é registrado', async () => {
    const prontuario = await servico.consultar(
      prontuarioId,
      pessoas.estagiarioA,
    );
    expect(prontuario.dadosIniciais.anamnese).toBe(
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
    expect(prontuario.dadosIniciais.anamnese).toBe(
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

  it('o registro de acessos não pode ser alterado nem apagado (RNF52)', async () => {
    await servico.consultar(prontuarioId, pessoas.estagiarioA);
    await expect(
      db.update(acessosProntuario).set({ permitido: false }),
    ).rejects.toThrow();
    await expect(db.delete(acessosProntuario)).rejects.toThrow();
  });
});
