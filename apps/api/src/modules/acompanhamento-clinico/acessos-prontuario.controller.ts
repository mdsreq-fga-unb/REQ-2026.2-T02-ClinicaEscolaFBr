import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { filtroAcessosSchema, type FiltroAcessos } from '@clinica/shared';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AcessosProntuarioService } from './acessos-prontuario.service';

@Controller('acessos-prontuario')
@UseGuards(AutenticadoGuard, PerfisGuard)
@Perfis('coordenacao')
export class AcessosProntuarioController {
  constructor(private readonly acessos: AcessosProntuarioService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  consultar(
    @Query(new ZodValidationPipe(filtroAcessosSchema)) filtro: FiltroAcessos,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.acessos.consultar(filtro, usuario.id);
  }
}
