import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { CasosService } from './casos.service';

const vinculoSchema = z.object({ estagiarioId: z.uuid() });

@Controller('casos')
@UseGuards(AutenticadoGuard, PerfisGuard)
@Perfis('supervisor')
export class CasosController {
  constructor(private readonly casos: CasosService) {}

  @Post(':id/estagiario')
  vincular(
    @Param('id', ParseUUIDPipe) casoId: string,
    @Body(new ZodValidationPipe(vinculoSchema))
    dados: z.infer<typeof vinculoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.casos.vincularEstagiario(casoId, dados.estagiarioId, usuario);
  }
}
