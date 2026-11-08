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
import {
  reversaoDesligamentoSchema,
  type ReversaoDesligamento,
} from '@clinica/shared';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { DesligamentosService } from './desligamentos.service';

// Desligamento por faltas (RF37), vaga liberada e reversão (RF38).
@Controller()
@UseGuards(AutenticadoGuard, PerfisGuard)
export class DesligamentosController {
  constructor(private readonly desligamentos: DesligamentosService) {}

  @Post('casos/:id/desligamento')
  @Perfis('secretaria', 'coordenacao')
  desligar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.desligamentos.desligar(id, usuario);
  }

  @Get('vagas/liberadas')
  @Perfis('coordenacao', 'supervisor')
  vagas(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.desligamentos.vagasAbertas(usuario);
  }

  @Get('casos/aguardando-vaga')
  @Perfis('coordenacao')
  aguardandoVaga() {
    return this.desligamentos.aguardandoVaga();
  }

  @Post('desligamentos/:id/reversao')
  @HttpCode(200)
  @Perfis('coordenacao')
  reverter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(reversaoDesligamentoSchema))
    dados: ReversaoDesligamento,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.desligamentos.reverter(id, dados, usuario);
  }
}
