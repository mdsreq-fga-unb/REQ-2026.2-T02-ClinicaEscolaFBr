import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { inscricoes, type Db } from '@clinica/database';
import {
  menorDeIdade,
  type ComprovanteInscricao,
  type Inscricao,
} from '@clinica/shared';
import { eq, sql } from 'drizzle-orm';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { cifrar, decifrar } from '../../common/criptografia';
import { TermoService } from './termo.service';
import { DB } from '../../database/database.module';

@Injectable()
export class InscricaoService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly config: ConfigService,
    private readonly auditoria: AuditoriaService,
    private readonly termo: TermoService,
  ) {}

  async registrar(dados: Inscricao): Promise<ComprovanteInscricao> {
    const {
      confirmado: _confirmado,
      aceiteTermo: _aceiteTermo,
      versaoTermo,
      chaveEnvio,
      queixa,
      percepcaoUrgencia,
      historicoRelevante,
      ...cadastro
    } = dados;
    const pessoais = {
      ...cadastro,
      // A inscrição não pede mais o canal: os contatos são por e-mail (DF48).
      canalPreferencial: 'email' as const,
      bairro: cadastro.bairro || null,
      cidadeUf: cadastro.cidadeUf || null,
      cep: cadastro.cep || null,
      sexo: cadastro.sexo || null,
      profissao: cadastro.profissao || null,
      escolaridade: cadastro.escolaridade || null,
      responsavelLegal: cadastro.responsavelLegal || null,
      cpfResponsavel: cadastro.cpfResponsavel || null,
      documentoResponsavel: cadastro.documentoResponsavel || null,
      celular: cadastro.celular || null,
      whatsapp: cadastro.whatsapp || null,
      email: cadastro.email || null,
      contatoEmergenciaNome: cadastro.contatoEmergenciaNome || null,
      contatoEmergenciaParentesco: cadastro.contatoEmergenciaParentesco || null,
      contatoEmergenciaTelefone: cadastro.contatoEmergenciaTelefone || null,
    };
    try {
      const chave = this.config.getOrThrow<string>('CHAVE_DADOS');
      return await this.db.transaction(async (tx) => {
        // Serializa a chave antes de conferir o termo: resposta perdida após troca
        // de versão continua devolvendo o comprovante já registrado.
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${chaveEnvio}, 0))`,
        );
        const [anterior] = await tx
          .select()
          .from(inscricoes)
          .where(eq(inscricoes.id, chaveEnvio));
        if (anterior) {
          const mesmoCadastro =
            anterior &&
            Object.entries(pessoais).every(
              ([campo, valor]) =>
                anterior[campo as keyof typeof pessoais] === valor,
            );
          if (
            !mesmoCadastro ||
            !anterior.queixaCifrada ||
            !anterior.percepcaoUrgenciaCifrada ||
            !anterior.historicoRelevanteCifrado ||
            decifrar(anterior.queixaCifrada, chave) !== queixa ||
            decifrar(anterior.percepcaoUrgenciaCifrada, chave) !==
              percepcaoUrgencia ||
            decifrar(anterior.historicoRelevanteCifrado, chave) !==
              historicoRelevante
          ) {
            throw new ConflictException(
              'Este envio já foi utilizado com outros dados.',
            );
          }
          return {
            numero: anterior.numero,
            criadaEm: anterior.criadaEm.toISOString(),
          };
        }
        // A versão vigente é lida na transação, antes de gravar o aceite.
        const termo = await this.termo.vigente(tx);
        const ambiente =
          this.config.get<string>('AMBIENTE_APLICACAO') ??
          (this.config.get<string>('NODE_ENV') === 'production'
            ? 'producao'
            : 'desenvolvimento');
        if (ambiente === 'producao' && termo.provisoria) {
          throw new ForbiddenException(
            'As inscrições pela internet ainda não estão abertas.',
          );
        }
        if (termo.versao !== versaoTermo)
          throw new ConflictException({
            codigo: 'termo_desatualizado',
            versaoVigente: termo.versao,
            message:
              'O termo foi atualizado. Leia a nova versão e marque sua concordância novamente.',
          });
        const aceitePeloResponsavel = menorDeIdade(pessoais.dataNascimento);
        const [nova] = await tx
          .insert(inscricoes)
          .values({
            ...pessoais,
            id: chaveEnvio,
            numero: sql`to_char(current_timestamp at time zone 'America/Sao_Paulo', 'YYYY') || '-' || (select lpad(n, greatest(5, length(n)), '0') from (select nextval('inscricoes_numero_seq')::text as n) as sequencia)`,
            queixaCifrada: cifrar(queixa, chave),
            percepcaoUrgenciaCifrada: cifrar(percepcaoUrgencia, chave),
            historicoRelevanteCifrado: cifrar(historicoRelevante, chave),
            versaoTermoAceita: termo.versao,
            termoAceitoEm: sql`current_timestamp`,
            aceitePeloResponsavel,
          })
          .returning();
        await this.auditoria.registrar(
          {
            operacao: 'registrar_inscricao',
            entidade: 'inscricoes',
            entidadeId: nova.id,
            dadosNovos: {
              numero: nova.numero,
              versaoTermoAceita: termo.versao,
              aceitePeloResponsavel,
            },
          },
          tx,
        );
        return { numero: nova.numero, criadaEm: nova.criadaEm.toISOString() };
      });
    } catch (erro) {
      if (
        erro instanceof ConflictException ||
        erro instanceof ForbiddenException
      )
        throw erro;
      // O erro do driver pode conter dados de saúde nos parâmetros. Não logar.
      throw new ServiceUnavailableException(
        'Não foi possível confirmar o registro. Tente novamente com os mesmos dados.',
      );
    }
  }
}
