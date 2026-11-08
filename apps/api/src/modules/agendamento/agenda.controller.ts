import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { consultaAgendaSchema, type ConsultaAgenda } from '@clinica/shared';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AgendaService } from './agenda.service';

// Agenda de sessões do estagiário (RF11), com autorização própria: o supervisor
// consulta por aqui, sem ganhar acesso às rotas de agendamento (/sessoes).
@Controller('agenda')
@UseGuards(AutenticadoGuard, PerfisGuard)
@Perfis('estagiario', 'supervisor')
export class AgendaController {
  constructor(private readonly agenda: AgendaService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  consultar(
    @Query(new ZodValidationPipe(consultaAgendaSchema)) filtro: ConsultaAgenda,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.agenda.consultar(filtro, usuario);
  }

  // Só os estagiários do supervisor, para o campo "Estagiário".
  @Get('estagiarios')
  @Perfis('supervisor')
  @Header('Cache-Control', 'no-store')
  estagiarios(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.agenda.estagiariosDoSupervisor(usuario.id);
  }
}
