import { and, eq } from 'drizzle-orm';
import {
  atribuicoesSupervisor,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import type { AcoesCancelamento } from '@clinica/shared';
import type { Transacao } from '../../auditoria/auditoria.service';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';
import { numeroDoParametro } from '../../parametros/parametros.service';

// Quem cancela a sessão de um caso (RF15, RF16):
// - pedido do paciente: só a secretaria, em nome dele (o paciente usa o link);
// - administrativo, para remarcar: a secretaria ou o estagiário com vínculo vigente
//   no caso; o supervisor não registra esse tipo;
// - ausência do estagiário: a secretaria, o estagiário com vínculo vigente ou o
//   supervisor com atribuição vigente no caso.
// O vínculo e a atribuição vigentes valem, e não o estagiário de cada sessão, como
// nas faltas (RF34). A coordenação não cancela por aqui.
export async function acoesDeCancelamento(
  banco: Db | Transacao,
  casoId: string,
  usuario: UsuarioAutenticado,
): Promise<AcoesCancelamento> {
  const antecedenciaMinimaMinutos = await numeroDoParametro(
    banco,
    'antecedencia_minima_cancelamento_minutos',
  );
  const nenhuma = {
    pedidoPaciente: false,
    administrativo: false,
    ausenciaEstagiario: false,
    antecedenciaMinimaMinutos,
  };
  if (usuario.perfil === 'secretaria') {
    return {
      pedidoPaciente: true,
      administrativo: true,
      ausenciaEstagiario: true,
      antecedenciaMinimaMinutos,
    };
  }
  if (usuario.perfil === 'estagiario') {
    const [vinculo] = await banco
      .select({ id: vinculosEstagiario.id })
      .from(vinculosEstagiario)
      .where(
        and(
          eq(vinculosEstagiario.casoId, casoId),
          eq(vinculosEstagiario.estagiarioId, usuario.id),
          eq(vinculosEstagiario.vigente, true),
        ),
      );
    return vinculo
      ? { ...nenhuma, administrativo: true, ausenciaEstagiario: true }
      : nenhuma;
  }
  if (usuario.perfil === 'supervisor') {
    const [atribuicao] = await banco
      .select({ id: atribuicoesSupervisor.id })
      .from(atribuicoesSupervisor)
      .where(
        and(
          eq(atribuicoesSupervisor.casoId, casoId),
          eq(atribuicoesSupervisor.supervisorId, usuario.id),
          eq(atribuicoesSupervisor.vigente, true),
        ),
      );
    return atribuicao ? { ...nenhuma, ausenciaEstagiario: true } : nenhuma;
  }
  return nenhuma;
}
