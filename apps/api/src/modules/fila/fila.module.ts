import { Module } from '@nestjs/common';
import { FilaController } from './fila.controller';
import { FilaService } from './fila.service';

@Module({ controllers: [FilaController], providers: [FilaService] })
export class FilaModule {}
