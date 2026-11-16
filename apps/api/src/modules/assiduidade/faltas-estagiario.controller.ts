import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import {
  consultaFaltasEstagiarioSchema,
  type ConsultaFaltasEstagiario,
} from '@clinica/shared';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { FaltasEstagiarioService } from './faltas-estagiario.service';

// Relação de faltas do estagiário (RF39): só o supervisor e a coordenação (RNF35).
// O estagiário e a secretaria recebem 403; o supervisor, só o que é dele.
@Controller('faltas-estagiarios')
@UseGuards(AutenticadoGuard, PerfisGuard)
@Perfis('supervisor', 'coordenacao')
export class FaltasEstagiarioController {
  constructor(private readonly faltas: FaltasEstagiarioService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  consultar(
    @Query(new ZodValidationPipe(consultaFaltasEstagiarioSchema))
    consulta: ConsultaFaltasEstagiario,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.faltas.consultar(consulta, usuario);
  }

  // Os estagiários do campo "Estagiário", pela mesma regra da consulta.
  @Get('estagiarios')
  @Header('Cache-Control', 'no-store')
  estagiarios(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.faltas.estagiarios(usuario);
  }
}
