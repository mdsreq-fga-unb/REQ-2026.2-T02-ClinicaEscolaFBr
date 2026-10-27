import { Module } from '@nestjs/common';
import { AtivacaoController } from './ativacao.controller';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  controllers: [UsuariosController, AtivacaoController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class AcessoModule {}
