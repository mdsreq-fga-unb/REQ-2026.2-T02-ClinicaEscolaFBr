import { Module } from '@nestjs/common';
import { AcessoModule } from '../acesso/acesso.module';
import { FilaModule } from './fila.module';
import { ConsultaFilaController } from './consulta-fila.controller';
import { ConsultaFilaService } from './consulta-fila.service';
// A ordenação compartilhada não depende da autenticação pública do RF52.
@Module({
  imports: [FilaModule, AcessoModule],
  controllers: [ConsultaFilaController],
  providers: [ConsultaFilaService],
})
export class ConsultaFilaModule {}
