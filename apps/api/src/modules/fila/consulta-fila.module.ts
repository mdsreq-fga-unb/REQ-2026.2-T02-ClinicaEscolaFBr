import { Module } from '@nestjs/common';
import { AcessoModule } from '../acesso/acesso.module';
import { ConsultaFilaController } from './consulta-fila.controller';
import { ConsultaFilaService } from './consulta-fila.service';
// A consulta usa a identidade do RF52, sem calcular a fila interna (DF55).
@Module({
  imports: [AcessoModule],
  controllers: [ConsultaFilaController],
  providers: [ConsultaFilaService],
})
export class ConsultaFilaModule {}
