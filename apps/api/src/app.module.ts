import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { validarEnv } from './config/env';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { AcessoModule } from './modules/acesso/acesso.module';
import { AcompanhamentoClinicoModule } from './modules/acompanhamento-clinico/acompanhamento-clinico.module';
import { AdministrativoModule } from './modules/administrativo/administrativo.module';
import { AgendamentoModule } from './modules/agendamento/agendamento.module';
import { AssiduidadeModule } from './modules/assiduidade/assiduidade.module';
import { CasosModule } from './modules/casos/casos.module';
import { FilaModule } from './modules/fila/fila.module';
import { InscricaoModule } from './modules/inscricao/inscricao.module';
import { InstitucionalModule } from './modules/institucional/institucional.module';
import { TriagemModule } from './modules/triagem/triagem.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
      validate: validarEnv,
    }),
    DatabaseModule,
    AuditoriaModule,
    NotificacoesModule,
    InscricaoModule,
    TriagemModule,
    FilaModule,
    AgendamentoModule,
    CasosModule,
    AcompanhamentoClinicoModule,
    AssiduidadeModule,
    AdministrativoModule,
    InstitucionalModule,
    AcessoModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
