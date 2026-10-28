import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  distribuicaoSchema,
  vinculoEstagiarioSchema,
  type Distribuicao,
  type VinculoEstagiario,
} from '@clinica/shared';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { CasosService } from './casos.service';

// Distribuição de casos (CP5). Secretaria e estagiário não acessam nenhuma rota.
@Controller()
@UseGuards(AutenticadoGuard, PerfisGuard)
export class CasosController {
  constructor(private readonly casos: CasosService) {}

  // RF18: a coordenação distribui; o supervisor só consulta.
  @Get('casos/aguardando-distribuicao')
  @Perfis('coordenacao', 'supervisor')
  @Header('Cache-Control', 'no-store')
  aguardando() {
    return this.casos.aguardandoDistribuicao();
  }

  // RF20
  @Get('supervisores/disponibilidade')
  @Perfis('coordenacao')
  @Header('Cache-Control', 'no-store')
  supervisores() {
    return this.casos.supervisoresDisponiveis();
  }

  @Post('casos/:id/supervisor')
  @Perfis('coordenacao')
  distribuir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(distribuicaoSchema)) dados: Distribuicao,
    @UsuarioAtual() autor: UsuarioAutenticado,
  ) {
    return this.casos.distribuir(id, dados.supervisorId, autor);
  }

  // RF21
  @Get('casos/meus')
  @Perfis('supervisor')
  @Header('Cache-Control', 'no-store')
  meus(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.casos.meusCasos(usuario);
  }

  @Get('estagiarios/disponiveis')
  @Perfis('supervisor')
  @Header('Cache-Control', 'no-store')
  estagiarios() {
    return this.casos.estagiariosDisponiveis();
  }

  @Post('casos/:id/estagiario')
  @Perfis('supervisor')
  vincular(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(vinculoEstagiarioSchema))
    dados: VinculoEstagiario,
    @UsuarioAtual() autor: UsuarioAutenticado,
  ) {
    return this.casos.vincularEstagiario(id, dados.estagiarioId, autor);
  }
}
