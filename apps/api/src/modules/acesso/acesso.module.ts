import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AtivacaoController } from './ativacao.controller';
import { AuthController } from './auth.controller';
import { SessaoGuard } from './sessao.guard';
import { SessoesService } from './sessoes.service';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  controllers: [UsuariosController, AtivacaoController, AuthController],
  providers: [
    UsuariosService,
    SessoesService,
    // Lê a sessão em todas as rotas, antes dos guards de cada controller (RF50).
    { provide: APP_GUARD, useClass: SessaoGuard },
  ],
  exports: [UsuariosService],
})
export class AcessoModule {}
