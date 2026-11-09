import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AtivacaoController } from './ativacao.controller';
import { AuthController } from './auth.controller';
import { SessaoGuard } from './sessao.guard';
import { SessoesService } from './sessoes.service';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { VerificacaoController } from './verificacao.controller';
import { VerificacaoGuard } from './verificacao.guard';
import { VerificacaoService } from './verificacao.service';

@Module({
  controllers: [
    UsuariosController,
    AtivacaoController,
    AuthController,
    VerificacaoController,
  ],
  providers: [
    UsuariosService,
    SessoesService,
    VerificacaoService,
    VerificacaoGuard,
    // Lê a sessão em todas as rotas, antes dos guards de cada controller (RF50).
    { provide: APP_GUARD, useClass: SessaoGuard },
  ],
  // O VerificacaoGuard protege as rotas do paciente nos outros módulos (RF8, CP10).
  exports: [UsuariosService, VerificacaoService, VerificacaoGuard],
})
export class AcessoModule {}
