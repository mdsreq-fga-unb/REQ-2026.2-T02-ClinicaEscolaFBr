import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { avisoManualSchema, type AvisoManual } from '@clinica/shared';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AvisosCancelamentoService } from './avisos-cancelamento.service';

// Avisos ao paciente do cancelamento por ausência do estagiário (RF17). Só a
// secretaria: o estagiário, o supervisor e a coordenação recebem 403.
@Controller('cancelamentos')
@UseGuards(AutenticadoGuard, PerfisGuard)
@Perfis('secretaria')
export class CancelamentosController {
  constructor(private readonly avisos: AvisosCancelamentoService) {}

  @Get('avisos-pendentes')
  avisosPendentes() {
    return this.avisos.pendentes();
  }

  // Registra que o paciente foi avisado, pelo WhatsApp ou por outro contato.
  @Post(':id/aviso')
  @HttpCode(200)
  registrarAviso(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(avisoManualSchema)) dados: AvisoManual,
    @UsuarioAtual() autor: UsuarioAutenticado,
  ) {
    return this.avisos.registrar(id, dados, autor);
  }
}
