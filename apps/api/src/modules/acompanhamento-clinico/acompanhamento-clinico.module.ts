import { Module } from '@nestjs/common';
import { AcessosProntuarioController } from './acessos-prontuario.controller';
import { AcessosProntuarioService } from './acessos-prontuario.service';
import { AssiduidadeModule } from '../assiduidade/assiduidade.module';
import { CorrecoesEvolucaoService } from './correcoes-evolucao.service';
import { PoliticaProntuario } from './politica-prontuario';
import { ProntuariosController } from './prontuarios.controller';
import { ProntuariosService } from './prontuarios.service';

@Module({
  imports: [AssiduidadeModule],
  controllers: [ProntuariosController, AcessosProntuarioController],
  providers: [
    PoliticaProntuario,
    ProntuariosService,
    AcessosProntuarioService,
    CorrecoesEvolucaoService,
  ],
  exports: [PoliticaProntuario],
})
export class AcompanhamentoClinicoModule {}
