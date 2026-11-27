import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
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
import { EmailService } from '../../notificacoes/email.service';
import { dataBrasilia, horaBrasilia } from '../agendamento/horario';

@Injectable()
export class InscricaoService {
  private readonly logger = new Logger(InscricaoService.name);
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly config: ConfigService,
    private readonly auditoria: AuditoriaService,
    private readonly termo: TermoService,
    private readonly email: EmailService,
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
      rg: cadastro.rg || null,
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
      const { comprovante, nova } = await this.db.transaction(async (tx) => {
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
            comprovante: {
              numero: anterior.numero,
              criadaEm: anterior.criadaEm.toISOString(),
            },
            nova: false,
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
        return {
          comprovante: {
            numero: nova.numero,
            criadaEm: nova.criadaEm.toISOString(),
          },
          nova: true,
        };
      });
      // O comprovante também vai para o e-mail (DF76), depois do commit e fora da
      // resposta: a falha no envio não desfaz a inscrição, e a repetição do mesmo
      // envio (a mesma chave) não manda outro e-mail.
      if (nova && pessoais.email)
        void this.enviarComprovante(pessoais.email, comprovante);
      return comprovante;
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

  // Só o número, a data e a hora do registro: nenhum dado de saúde vai no e-mail.
  private async enviarComprovante(
    email: string,
    comprovante: ComprovanteInscricao,
  ) {
    const criadaEm = new Date(comprovante.criadaEm);
    const web = this.config.get<string>('WEB_URL')?.replace(/\/$/, '');
    try {
      await this.email.enviar(
        email,
        `Inscrição ${comprovante.numero} recebida na Clínica Escola FBr`,
        `<p>Olá.</p>
<p>Recebemos a sua inscrição para atendimento psicológico na Clínica Escola de Psicologia da FBr. Guarde este e-mail como comprovante.</p>
<p><strong>Número da inscrição:</strong> ${comprovante.numero}<br>
<strong>Data e hora do registro:</strong> ${dataBrasilia(criadaEm)}, às ${horaBrasilia(criadaEm)} (horário de Brasília)</p>
<p>A inscrição não garante vaga nem agendamento. O atendimento depende da triagem feita pela equipe e da disponibilidade de vagas. Se houver vaga, a clínica entrará em contato por este e-mail.</p>
${web ? `<p>Para acompanhar a situação da inscrição, acesse <a href="${web}/consultar">${web}/consultar</a> e informe o número da inscrição ou o CPF.</p>` : ''}
<p>Se você não fez esta inscrição, procure a secretaria da clínica.</p>`,
      );
    } catch (erro) {
      // Só o número: o erro do envio não leva dado da inscrição para o log.
      this.logger.error(
        `Comprovante da inscrição ${comprovante.numero} não enviado`,
        erro,
      );
    }
  }
}
