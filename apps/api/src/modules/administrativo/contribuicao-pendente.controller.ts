import {
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ContribuicaoPendenteService } from './contribuicao-pendente.service';

// Contribuição pendente (RF43): o aviso do prazo vencido e a confirmação da perda
// da vaga são só da secretaria e da coordenação. O estagiário e o supervisor veem
// o aviso pelos responsáveis do caso, sem a confirmação.
@Controller()
@UseGuards(AutenticadoGuard, PerfisGuard)
export class ContribuicaoPendenteController {
  constructor(private readonly pendente: ContribuicaoPendenteService) {}

  @Get('contribuicoes/prazos-vencidos')
  @Perfis('secretaria', 'coordenacao')
  @Header('Cache-Control', 'no-store')
  prazosVencidos() {
    return this.pendente.prazosVencidos();
  }

  @Get('casos/:id/perda-vaga')
  @Perfis('secretaria', 'coordenacao')
  @Header('Cache-Control', 'no-store')
  doCaso(@Param('id', ParseUUIDPipe) id: string) {
    return this.pendente.doCaso(id);
  }

  @Post('casos/:id/perda-vaga')
  @HttpCode(200)
  @Perfis('secretaria', 'coordenacao')
  confirmar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.pendente.confirmar(id, usuario);
  }
}
