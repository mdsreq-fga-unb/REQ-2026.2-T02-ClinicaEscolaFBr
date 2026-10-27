import { Module } from '@nestjs/common';
import { PoliticaProntuario } from './politica-prontuario';
import { ProntuariosController } from './prontuarios.controller';
import { ProntuariosService } from './prontuarios.service';

@Module({
  controllers: [ProntuariosController],
  providers: [PoliticaProntuario, ProntuariosService],
  exports: [PoliticaProntuario],
})
export class AcompanhamentoClinicoModule {}
