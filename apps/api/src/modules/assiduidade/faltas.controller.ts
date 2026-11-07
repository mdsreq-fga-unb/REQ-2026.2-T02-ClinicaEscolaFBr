import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  justificativaFaltaSchema,
  registroFaltaSchema,
  type JustificativaFalta,
  type RegistroFalta,
} from '@clinica/shared';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { FaltasService } from './faltas.service';

// Falta do paciente (RF34). O perfil é conferido aqui; o vínculo com o caso, no serviço.
@Controller()
@UseGuards(AutenticadoGuard, PerfisGuard)
export class FaltasController {
  constructor(private readonly faltas: FaltasService) {}

  @Post('sessoes/:id/falta')
  @Perfis('secretaria', 'estagiario')
  registrar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(registroFaltaSchema)) dados: RegistroFalta,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.faltas.registrarFalta(id, dados, usuario);
  }

  @Post('faltas/:id/justificativa')
  @HttpCode(200)
  @Perfis('secretaria', 'estagiario', 'supervisor')
  justificar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(justificativaFaltaSchema))
    dados: JustificativaFalta,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.faltas.justificar(id, dados, usuario);
  }
}
