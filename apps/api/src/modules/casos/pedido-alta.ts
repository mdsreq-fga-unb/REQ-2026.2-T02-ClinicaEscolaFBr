import { and, eq, isNull } from 'drizzle-orm';
import { encerramentosAlta } from '@clinica/database';
import type { FormaCancelamentoAlta } from '@clinica/shared';
import type { Transacao } from '../../auditoria/auditoria.service';
import { cifrar } from '../../common/criptografia';

// Fecha o pedido de alta aberto do caso, sem confirmá-lo (RF68). Usado pelo
// cancelamento do estagiário, pela recusa do supervisor e também pela
// transferência (RF25) e pelo desligamento (RF37): o pedido é do estagiário que
// deixou o caso, e confirmá-lo depois encerraria o atendimento de outra pessoa.
// Devolve o id do pedido fechado, ou null se não havia pedido aberto.
export async function fecharPedidoDeAlta(
  tx: Transacao,
  dados: {
    casoId: string;
    autorId: string;
    forma: FormaCancelamentoAlta;
    motivo: string;
    chave: string;
  },
): Promise<string | null> {
  const [fechado] = await tx
    .update(encerramentosAlta)
    .set({
      canceladoPor: dados.autorId,
      canceladoEm: new Date(),
      formaCancelamento: dados.forma,
      motivoCancelamentoCifrado: cifrar(dados.motivo, dados.chave),
    })
    .where(
      and(
        eq(encerramentosAlta.casoId, dados.casoId),
        isNull(encerramentosAlta.confirmadaEm),
        isNull(encerramentosAlta.canceladoEm),
      ),
    )
    .returning({ id: encerramentosAlta.id });
  return fechado?.id ?? null;
}
