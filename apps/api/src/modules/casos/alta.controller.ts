import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  pedidoAltaSchema,
  reaberturaCasoSchema,
  type PedidoAlta,
  type ReaberturaCaso,
} from '@clinica/shared';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AltaService } from './alta.service';

// Encerramento do caso por alta (RF68). O perfil e a responsabilidade pelo caso
// são conferidos no serviço, e não no PerfisGuard, para a tentativa negada ficar
// na auditoria.
@Controller('casos/:id')
@UseGuards(AutenticadoGuard)
export class AltaController {
  constructor(private readonly alta: AltaService) {}

  @Get('alta')
  @Header('Cache-Control', 'no-store')
  situacao(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.alta.situacao(id, usuario);
  }

  @Post('alta')
  pedir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(pedidoAltaSchema)) dados: PedidoAlta,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.alta.pedir(id, dados, usuario);
  }

  @Post('alta/confirmacao')
  @HttpCode(200)
  confirmar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.alta.confirmar(id, usuario);
  }

  @Post('reabertura')
  @HttpCode(200)
  reabrir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reaberturaCasoSchema)) dados: ReaberturaCaso,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.alta.reabrir(id, dados, usuario);
  }
}
