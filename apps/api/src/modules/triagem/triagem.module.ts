import { Module } from '@nestjs/common';
import { TriagemController } from './triagem.controller';
import { TriagemService } from './triagem.service';

@Module({ controllers: [TriagemController], providers: [TriagemService] })
export class TriagemModule {}
