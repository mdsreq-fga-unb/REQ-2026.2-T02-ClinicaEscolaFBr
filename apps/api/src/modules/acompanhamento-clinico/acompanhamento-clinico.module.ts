import { Module } from '@nestjs/common';
import { AssiduidadeModule } from '../assiduidade/assiduidade.module';
import { CorrecoesEvolucaoService } from './correcoes-evolucao.service';
import { PoliticaProntuario } from './politica-prontuario';
import { ProntuariosController } from './prontuarios.controller';
import { ProntuariosService } from './prontuarios.service';

@Module({
  imports: [AssiduidadeModule],
  controllers: [ProntuariosController],
  providers: [PoliticaProntuario, ProntuariosService, CorrecoesEvolucaoService],
  exports: [PoliticaProntuario],
})
export class AcompanhamentoClinicoModule {}
