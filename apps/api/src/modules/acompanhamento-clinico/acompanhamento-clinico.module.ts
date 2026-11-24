import { Module } from '@nestjs/common';
import { HistoricoEvolucoesService } from './historico-evolucoes.service';
import { AcessosProntuarioController } from './acessos-prontuario.controller';
import { AcessosProntuarioService } from './acessos-prontuario.service';
import { AssiduidadeModule } from '../assiduidade/assiduidade.module';
import { ComplementosEvolucaoService } from './complementos-evolucao.service';
import { CorrecoesEvolucaoService } from './correcoes-evolucao.service';
import { PoliticaProntuario } from './politica-prontuario';
import { ProntuariosController } from './prontuarios.controller';
import { ProntuariosService } from './prontuarios.service';
import { ValidacoesEvolucaoService } from './validacoes-evolucao.service';

@Module({
  imports: [AssiduidadeModule],
  controllers: [ProntuariosController, AcessosProntuarioController],
  providers: [
    HistoricoEvolucoesService,
    PoliticaProntuario,
    ProntuariosService,
    AcessosProntuarioService,
    CorrecoesEvolucaoService,
    ComplementosEvolucaoService,
    ValidacoesEvolucaoService,
  ],
  exports: [PoliticaProntuario],
})
export class AcompanhamentoClinicoModule {}
