import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { DB } from '../../database/database.module';
import {
  atribuicoesSupervisor,
  casos,
  prontuarios,
  usuarios,
  vinculosEstagiario,
  type Db,
} from '@clinica/database';
import type { UsuarioAutenticado } from '../../auth/usuario-autenticado';

@Injectable()
export class CasosService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly auditoria: AuditoriaService,
  ) {}

  async vincularEstagiario(
    casoId: string,
    estagiarioId: string,
    usuario: UsuarioAutenticado,
  ) {
    return this.db.transaction(async (tx) => {
      const [caso] = await tx
        .select()
        .from(casos)
        .where(eq(casos.id, casoId))
        .for('update');
      if (!caso) throw new NotFoundException('Caso não encontrado.');
      const [supervisao] = await tx
        .select({ id: atribuicoesSupervisor.id })
        .from(atribuicoesSupervisor)
        .where(
          and(
            eq(atribuicoesSupervisor.casoId, casoId),
            eq(atribuicoesSupervisor.supervisorId, usuario.id),
            eq(atribuicoesSupervisor.vigente, true),
          ),
        );
      if (!supervisao)
        throw new ForbiddenException(
          'Você não é o supervisor responsável por este caso.',
        );
      const [estagiario] = await tx
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(
          and(
            eq(usuarios.id, estagiarioId),
            eq(usuarios.perfil, 'estagiario'),
            eq(usuarios.situacao, 'ativo'),
          ),
        );
      if (!estagiario)
        throw new NotFoundException('Estagiário ativo não encontrado.');
      const [vinculoAtual] = await tx
        .select({ id: vinculosEstagiario.id })
        .from(vinculosEstagiario)
        .where(
          and(
            eq(vinculosEstagiario.casoId, casoId),
            eq(vinculosEstagiario.vigente, true),
          ),
        )
        .limit(1);
      if (vinculoAtual)
        throw new ConflictException('O caso já tem estagiário responsável.');
      const [vinculo] = await tx
        .insert(vinculosEstagiario)
        .values({ casoId, estagiarioId, vinculadoPor: usuario.id })
        .returning();
      const [prontuario] = await tx
        .insert(prontuarios)
        .values({
          casoId,
          cicloAtendimento: caso.cicloAtendimento,
          vinculoOrigemId: vinculo.id,
        })
        .onConflictDoNothing()
        .returning({ id: prontuarios.id });
      if (!prontuario)
        throw new ConflictException('O prontuário deste ciclo já existe.');
      await tx
        .update(casos)
        .set({ situacao: 'em_atendimento' })
        .where(eq(casos.id, casoId));
      await this.auditoria.registrar(
        {
          usuarioId: usuario.id,
          operacao: 'vincular_estagiario_criar_prontuario',
          entidade: 'vinculos_estagiario',
          entidadeId: vinculo.id,
          dadosNovos: {
            casoId,
            estagiarioId,
            prontuarioId: prontuario.id,
            cicloAtendimento: caso.cicloAtendimento,
          },
        },
        tx,
      );
      return {
        vinculoId: vinculo.id,
        prontuarioId: prontuario.id,
        cicloAtendimento: caso.cicloAtendimento,
      };
    });
  }
}
