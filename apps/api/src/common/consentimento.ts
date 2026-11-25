import { UnprocessableEntityException } from '@nestjs/common';
import { casos, revogacoesConsentimento, type Db } from '@clinica/database';
import { MENSAGEM_CONSENTIMENTO_REVOGADO } from '@clinica/shared';
import { eq, sql, type SQLWrapper } from 'drizzle-orm';
import type { Transacao } from '../auditoria/auditoria.service';

export const semRevogacao = (inscricaoId: SQLWrapper) =>
  sql`not exists (select 1 from ${revogacoesConsentimento} where ${revogacoesConsentimento.inscricaoId} = ${inscricaoId})`;

export async function revogada(banco: Pick<Db, 'select'>, inscricaoId: string) {
  const [linha] = await banco
    .select({ id: revogacoesConsentimento.id })
    .from(revogacoesConsentimento)
    .where(eq(revogacoesConsentimento.inscricaoId, inscricaoId));
  return !!linha;
}

// A revogação e as novas operações serializam pelo mesmo caso. O envio ocorre
// sob essa trava: uma revogação concluída nunca é seguida por um novo envio.
export async function exigirConsentimento(tx: Transacao, casoId: string) {
  const [caso] = await tx
    .select({ inscricaoId: casos.inscricaoId })
    .from(casos)
    .where(eq(casos.id, casoId))
    .for('update');
  if (!caso || (await revogada(tx, caso.inscricaoId)))
    throw new UnprocessableEntityException(MENSAGEM_CONSENTIMENTO_REVOGADO);
}

export async function comunicarSePermitido<T>(
  db: Db,
  casoId: string,
  comunicar: () => Promise<T>,
): Promise<{ enviado: false } | { enviado: true; resultado: T }> {
  return db.transaction(async (tx) => {
    const [caso] = await tx
      .select({ inscricaoId: casos.inscricaoId })
      .from(casos)
      .where(eq(casos.id, casoId))
      .for('update');
    if (!caso || (await revogada(tx, caso.inscricaoId)))
      return { enviado: false };
    return { enviado: true, resultado: await comunicar() };
  });
}
