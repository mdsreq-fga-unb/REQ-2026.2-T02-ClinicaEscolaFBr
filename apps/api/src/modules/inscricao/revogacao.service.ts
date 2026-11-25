import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  casos,
  inscricoes,
  revogacoesConsentimento,
  usuarios,
  verificacoesIdentidade,
  versoesTermo,
  type Db,
} from '@clinica/database';
import {
  menorDeIdade,
  type ConsentimentoDaInscricao,
  type Revogacao,
} from '@clinica/shared';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { cifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';
import { hashToken } from '../acesso/credenciais';
import { CasosService } from '../casos/casos.service';

@Injectable()
export class RevogacaoService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
    private readonly config: ConfigService,
    private readonly casosService: CasosService,
  ) {}

  async doCaso(casoId: string, usuario: UsuarioAutenticado) {
    await this.casosService.responsaveis(casoId, usuario);
    const [caso] = await this.db
      .select({ inscricaoId: casos.inscricaoId })
      .from(casos)
      .where(eq(casos.id, casoId));
    return this.consultar(caso.inscricaoId);
  }

  async consultar(inscricaoId: string): Promise<ConsentimentoDaInscricao> {
    const [i] = await this.db
      .select({
        numero: inscricoes.numero,
        nomeCompleto: inscricoes.nomeCompleto,
        dataNascimento: inscricoes.dataNascimento,
        responsavelLegal: inscricoes.responsavelLegal,
        versaoTermoAceita: inscricoes.versaoTermoAceita,
        termoAceitoEm: inscricoes.termoAceitoEm,
        aceitePeloResponsavel: inscricoes.aceitePeloResponsavel,
      })
      .from(inscricoes)
      .where(eq(inscricoes.id, inscricaoId));
    if (!i) throw new NotFoundException('Inscrição não encontrada.');
    const [caso] = await this.db
      .select({ id: casos.id, situacao: casos.situacao })
      .from(casos)
      .where(eq(casos.inscricaoId, inscricaoId));
    const [r] = await this.db
      .select({
        id: revogacoesConsentimento.id,
        versao: revogacoesConsentimento.versaoTermo,
        em: revogacoesConsentimento.registradaEm,
        por: usuarios.nome,
        solicitante: revogacoesConsentimento.solicitante,
        formaVerificacao: revogacoesConsentimento.formaVerificacao,
      })
      .from(revogacoesConsentimento)
      .innerJoin(
        usuarios,
        eq(usuarios.id, revogacoesConsentimento.registradaPor),
      )
      .where(eq(revogacoesConsentimento.inscricaoId, inscricaoId));
    return {
      inscricaoId,
      casoId: caso?.id ?? null,
      numero: i.numero,
      paciente: i.nomeCompleto,
      menor: menorDeIdade(i.dataNascimento),
      responsavelLegal: i.responsavelLegal,
      situacao: caso?.situacao ?? null,
      aceite:
        i.versaoTermoAceita && i.termoAceitoEm
          ? {
              versao: i.versaoTermoAceita,
              em: i.termoAceitoEm.toISOString(),
              peloResponsavel: i.aceitePeloResponsavel!,
            }
          : null,
      revogacao: r ? { ...r, em: r.em.toISOString() } : null,
    };
  }

  async registrar(
    inscricaoId: string,
    dados: Revogacao,
    usuario: UsuarioAutenticado,
    token?: string,
  ) {
    if (usuario.perfil !== 'secretaria')
      throw new ForbiddenException('Só a secretaria registra a revogação.');
    await this.db.transaction(async (tx) => {
      const [i] = await tx
        .select()
        .from(inscricoes)
        .where(eq(inscricoes.id, inscricaoId))
        .for('update');
      if (!i) throw new NotFoundException('Inscrição não encontrada.');
      const [caso] = await tx
        .select()
        .from(casos)
        .where(eq(casos.inscricaoId, inscricaoId))
        .for('update');
      const [anterior] = await tx
        .select({ id: revogacoesConsentimento.id })
        .from(revogacoesConsentimento)
        .where(eq(revogacoesConsentimento.inscricaoId, inscricaoId));
      if (anterior)
        throw new ConflictException(
          'A revogação deste consentimento já foi registrada.',
        );
      if (!i.versaoTermoAceita || !i.termoAceitoEm)
        throw new UnprocessableEntityException(
          'Esta inscrição não possui aceite de consentimento registrado.',
        );
      const [termo] = await tx
        .select({ provisoria: versoesTermo.provisoria })
        .from(versoesTermo)
        .where(eq(versoesTermo.versao, i.versaoTermoAceita));
      const ambiente =
        this.config.get<string>('AMBIENTE_APLICACAO') ??
        (this.config.get<string>('NODE_ENV') === 'production'
          ? 'producao'
          : 'desenvolvimento');
      if (ambiente === 'producao' && termo.provisoria)
        throw new ForbiddenException(
          'A revogação com termo provisório está disponível somente em validação.',
        );
      if (menorDeIdade(i.dataNascimento) && dados.solicitante !== 'responsavel')
        throw new BadRequestException({
          message:
            'Para criança ou adolescente, o responsável legal deve pedir a revogação.',
          campo: 'solicitante',
        });
      if (dados.solicitante === 'responsavel' && !i.responsavelLegal)
        throw new BadRequestException({
          message:
            'Não há responsável legal identificado nesta inscrição. Confira o cadastro.',
          campo: 'solicitante',
        });
      let verificacaoId: string | null = null;
      if (dados.formaVerificacao === 'verificacao_rf52') {
        const [verificacao] = token
          ? await tx
              .select({ id: verificacoesIdentidade.id })
              .from(verificacoesIdentidade)
              .where(
                and(
                  eq(verificacoesIdentidade.inscricaoId, inscricaoId),
                  eq(verificacoesIdentidade.tokenHash, hashToken(token)),
                  isNull(verificacoesIdentidade.encerradaEm),
                  gt(verificacoesIdentidade.expiraEm, new Date()),
                ),
              )
              .for('update')
          : [];
        if (!verificacao)
          throw new BadRequestException({
            message:
              'Confirme a identidade desta inscrição pelo sistema. A verificação pode ter expirado.',
            campo: 'formaVerificacao',
          });
        verificacaoId = verificacao.id;
      }
      const [revogacao] = await tx
        .insert(revogacoesConsentimento)
        .values({
          inscricaoId,
          versaoTermo: i.versaoTermoAceita,
          solicitante: dados.solicitante,
          formaVerificacao: dados.formaVerificacao,
          documentoCifrado:
            dados.formaVerificacao === 'documento'
              ? cifrar(
                  dados.documento!,
                  this.config.getOrThrow<string>('CHAVE_DADOS'),
                )
              : null,
          verificacaoId,
          registradaPor: usuario.id,
        })
        .returning();
      const estavaNaFila =
        caso &&
        [
          'aguardando_distribuicao',
          'aguardando_vinculo',
          'aguardando_vaga',
        ].includes(caso.situacao);
      if (estavaNaFila)
        await tx
          .update(casos)
          .set({ situacao: 'cancelado_por_revogacao' })
          .where(eq(casos.id, caso.id));
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'revogar_consentimento',
          entidade: 'revogacoes_consentimento',
          entidadeId: revogacao.id,
          dadosAnteriores: { situacao: caso?.situacao ?? null },
          dadosNovos: {
            inscricaoId,
            versaoTermo: revogacao.versaoTermo,
            solicitante: dados.solicitante,
            formaVerificacao: dados.formaVerificacao,
            situacao: estavaNaFila
              ? 'cancelado_por_revogacao'
              : (caso?.situacao ?? null),
          },
        },
        tx,
      );
    });
    return this.consultar(inscricaoId);
  }
}
