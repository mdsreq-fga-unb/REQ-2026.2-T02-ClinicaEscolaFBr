import { Module } from '@nestjs/common';
import { IndicadoresController } from './indicadores.controller';
import { IndicadoresService } from './indicadores.service';

// Indicadores e relatórios institucionais (CP11).
@Module({
  controllers: [IndicadoresController],
  providers: [IndicadoresService],
})
export class InstitucionalModule {}
