import { Module } from '@nestjs/common';
import { AcessoModule } from '../acesso/acesso.module';
import { DeclaracoesController } from './declaracoes.controller';
import { DeclaracoesService } from './declaracoes.service';

// Declarações de comparecimento (CP10), parte do módulo administrativo. Fica num
// módulo próprio porque a rota do paciente usa o VerificacaoGuard do RF52, que
// vem do AcessoModule; a contribuição social (RF41) não precisa dele.
@Module({
  imports: [AcessoModule],
  controllers: [DeclaracoesController],
  providers: [DeclaracoesService],
})
export class DeclaracoesModule {}
