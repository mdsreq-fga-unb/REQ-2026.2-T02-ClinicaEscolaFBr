import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import {
  InscricaoVerificada,
  VerificacaoGuard,
} from '../acesso/verificacao.guard';
import { ConsultaFilaService } from './consulta-fila.service';
const numeroSchema = z
  .string()
  .trim()
  .max(40)
  .regex(/^\d{4}-\d{5,}$/, 'Informe o número da inscrição, como 2026-00001.');
@Controller('fila')
export class ConsultaFilaController {
  constructor(private readonly consulta: ConsultaFilaService) {}
  @Get('minha-situacao')
  @UseGuards(VerificacaoGuard)
  @Header('Cache-Control', 'no-store')
  minhaSituacao(@InscricaoVerificada() id: string) {
    return this.consulta.consultar({ id });
  }
  @Get('situacao')
  @UseGuards(AutenticadoGuard, PerfisGuard)
  @Perfis('secretaria')
  @Header('Cache-Control', 'no-store')
  situacao(
    @Query('numero', new ZodValidationPipe(numeroSchema)) numero: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.consulta.consultar({ numero }, usuario.id);
  }
}
