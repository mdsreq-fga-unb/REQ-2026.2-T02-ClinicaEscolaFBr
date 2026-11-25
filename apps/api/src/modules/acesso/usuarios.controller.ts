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
  cadastroUsuarioSchema,
  filtroUsuariosSchema,
  type CadastroUsuario,
  type FiltroUsuarios,
} from '@clinica/shared';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { UsuariosService } from './usuarios.service';

// Gestão de usuários institucionais pela coordenação (RF53 e RF54).
@Controller('usuarios')
@UseGuards(AutenticadoGuard, PerfisGuard)
@Perfis('coordenacao')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  listar(
    @Query(new ZodValidationPipe(filtroUsuariosSchema)) filtro: FiltroUsuarios,
  ) {
    return this.usuarios.listar(filtro);
  }

  @Post()
  cadastrar(
    @Body(new ZodValidationPipe(cadastroUsuarioSchema)) dados: CadastroUsuario,
    @UsuarioAtual() autor: UsuarioAutenticado,
  ) {
    return this.usuarios.cadastrar(dados, autor);
  }

  @Post(':id/convite')
  @HttpCode(204)
  reenviarConvite(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() autor: UsuarioAutenticado,
  ) {
    return this.usuarios.reenviarConvite(id, autor);
  }

  @Post(':id/desativacao')
  @HttpCode(204)
  desativar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() autor: UsuarioAutenticado,
  ) {
    return this.usuarios.desativar(id, autor);
  }
}
