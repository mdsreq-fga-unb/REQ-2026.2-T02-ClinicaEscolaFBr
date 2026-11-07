import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  agendamentoSchema,
  buscaPacientesSchema,
  filtroAgendaSchema,
  type Agendamento,
  type BuscaPacientes,
  type FiltroAgenda,
} from '@clinica/shared';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { ConfirmacaoService } from './confirmacao.service';
import { SessoesService } from './sessoes.service';

// Agendamento de sessão pela secretaria ou pelo estagiário responsável (RF10).
// Supervisor e coordenação não agendam.
@Controller('sessoes')
@UseGuards(AutenticadoGuard, PerfisGuard)
@Perfis('secretaria', 'estagiario')
export class SessoesController {
  constructor(
    private readonly sessoes: SessoesService,
    private readonly confirmacao: ConfirmacaoService,
  ) {}

  // Sessões sem confirmação no fim do prazo, para o contato ativo (RF14).
  @Get('sem-confirmacao')
  @Perfis('secretaria')
  semConfirmacao() {
    return this.confirmacao.semConfirmacao();
  }

  // Confirmação recebida pela secretaria, por telefone (RF14).
  @Post(':id/confirmacao')
  @HttpCode(200)
  @Perfis('secretaria')
  registrarConfirmacao(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() autor: UsuarioAutenticado,
  ) {
    return this.confirmacao.registrarPelaSecretaria(id, autor);
  }

  @Get('pacientes')
  buscarPacientes(
    @Query(new ZodValidationPipe(buscaPacientesSchema)) filtro: BuscaPacientes,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.sessoes.buscarPacientes(filtro, usuario);
  }

  @Get('agenda')
  agenda(
    @Query(new ZodValidationPipe(filtroAgendaSchema)) filtro: FiltroAgenda,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.sessoes.agenda(filtro, usuario);
  }

  @Post()
  agendar(
    @Body(new ZodValidationPipe(agendamentoSchema)) dados: Agendamento,
    @UsuarioAtual() autor: UsuarioAutenticado,
  ) {
    return this.sessoes.agendar(dados, autor);
  }

  @Post(':id/whatsapp')
  @HttpCode(200)
  registrarWhatsapp(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() autor: UsuarioAutenticado,
  ) {
    return this.sessoes.registrarWhatsapp(id, autor);
  }
}
