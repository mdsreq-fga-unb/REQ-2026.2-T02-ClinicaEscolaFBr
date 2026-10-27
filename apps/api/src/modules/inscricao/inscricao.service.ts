import {
  ConflictException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { inscricoes, type Db } from '@clinica/database';
import type { ComprovanteInscricao, Inscricao } from '@clinica/shared';
import { eq, sql } from 'drizzle-orm';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { cifrar, decifrar } from '../../common/criptografia';
import { DB } from '../../database/database.module';

@Injectable()
export class InscricaoService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly config: ConfigService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async registrar(dados: Inscricao): Promise<ComprovanteInscricao> {
    const {
      confirmado: _confirmado,
      chaveEnvio,
      queixa,
      percepcaoUrgencia,
      historicoRelevante,
      ...cadastro
    } = dados;
    const pessoais = {
      ...cadastro,
      celular: cadastro.celular || null,
      email: cadastro.email || null,
      responsavelLegal: cadastro.responsavelLegal || null,
    };
    try {
      const chave = this.config.getOrThrow<string>('CHAVE_DADOS');
      return await this.db.transaction(async (tx) => {
        // A chave UUID de cada envio é a PK existente: a restrição do banco
        // serializa reenvios concorrentes, inclusive após perder a resposta.
        const [nova] = await tx
          .insert(inscricoes)
          .values({
            ...pessoais,
            id: chaveEnvio,
            // Não truncar a sequência ao ultrapassar cinco dígitos. Lacunas são
            // normais em sequências (rollback/reenvio); não há reinício anual.
            numero: sql`to_char(current_timestamp at time zone 'America/Sao_Paulo', 'YYYY') || '-' || (select lpad(n, greatest(5, length(n)), '0') from (select nextval('inscricoes_numero_seq')::text as n) as sequencia)`,
            queixaCifrada: cifrar(queixa, chave),
            percepcaoUrgenciaCifrada: cifrar(percepcaoUrgencia, chave),
            historicoRelevanteCifrado: cifrar(historicoRelevante, chave),
          })
          .onConflictDoNothing({ target: inscricoes.id })
          .returning();
        if (!nova) {
          const [anterior] = await tx
            .select()
            .from(inscricoes)
            .where(eq(inscricoes.id, chaveEnvio));
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
        await this.auditoria.registrar(
          {
            operacao: 'registrar_inscricao',
            entidade: 'inscricoes',
            entidadeId: nova.id,
            dadosNovos: { numero: nova.numero },
          },
          tx,
        );
        return { numero: nova.numero, criadaEm: nova.criadaEm.toISOString() };
      });
    } catch (erro) {
      if (erro instanceof ConflictException) throw erro;
      // O erro do driver pode conter dados de saúde nos parâmetros. Não logar.
      throw new ServiceUnavailableException(
        'Não foi possível confirmar o registro. Tente novamente com os mesmos dados.',
      );
    }
  }
}
