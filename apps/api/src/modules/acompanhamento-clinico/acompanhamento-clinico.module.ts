import { Module } from '@nestjs/common';
import { HistoricoEvolucoesService } from './historico-evolucoes.service';
import { AcessosProntuarioController } from './acessos-prontuario.controller';
import { AcessosProntuarioService } from './acessos-prontuario.service';
import { AssiduidadeModule } from '../assiduidade/assiduidade.module';
import { ComplementosEvolucaoService } from './complementos-evolucao.service';
import { CorrecoesEvolucaoService } from './correcoes-evolucao.service';
import { ElaboracaoRelatorioService } from './elaboracao-relatorio.service';
import { EvolucaoDaSessaoService } from './evolucao-da-sessao.service';
import { PoliticaProntuario } from './politica-prontuario';
import { ProntuariosController } from './prontuarios.controller';
import { ProntuariosService } from './prontuarios.service';
import { ValidacoesEvolucaoService } from './validacoes-evolucao.service';
import { RelatoriosFinaisController } from './relatorios-finais.controller';
import { RelatoriosFinaisService } from './relatorios-finais.service';

@Module({
  imports: [AssiduidadeModule],
  controllers: [
    ProntuariosController,
    AcessosProntuarioController,
    RelatoriosFinaisController,
  ],
  providers: [
    HistoricoEvolucoesService,
    EvolucaoDaSessaoService,
    PoliticaProntuario,
    ProntuariosService,
    AcessosProntuarioService,
    CorrecoesEvolucaoService,
    ComplementosEvolucaoService,
    ValidacoesEvolucaoService,
    RelatoriosFinaisService,
    ElaboracaoRelatorioService,
  ],
  exports: [PoliticaProntuario],
})
export class AcompanhamentoClinicoModule {}
