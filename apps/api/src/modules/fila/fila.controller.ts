import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import { AutenticadoGuard } from '../../auth/usuario-autenticado';
import { FilaService } from './fila.service';

@Controller('fila')
@UseGuards(AutenticadoGuard, PerfisGuard)
@Perfis('coordenacao', 'supervisor')
export class FilaController {
  constructor(private readonly fila: FilaService) {}

  @Get('distribuicao')
  @Header('Cache-Control', 'no-store')
  listarParaDistribuicao() {
    return this.fila.listarParaDistribuicao();
  }
}
