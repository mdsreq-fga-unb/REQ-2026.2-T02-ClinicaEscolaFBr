import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ativacaoSchema, type Ativacao } from '@clinica/shared';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { UsuariosService } from './usuarios.service';

// Ativação da conta pelo link do convite (RF53). Rotas públicas.
@Controller('ativacao')
export class AtivacaoController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get(':token')
  consultar(@Param('token') token: string) {
    return this.usuarios.conviteValido(token);
  }

  @Post()
  @HttpCode(204)
  ativar(@Body(new ZodValidationPipe(ativacaoSchema)) dados: Ativacao) {
    return this.usuarios.ativar(dados);
  }
}
