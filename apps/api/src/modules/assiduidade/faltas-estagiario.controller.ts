import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  consultaFaltasEstagiarioSchema,
  consultaFaltasSemestreSchema,
  reclassificacaoFaltaSchema,
  type ConsultaFaltasEstagiario,
  type ConsultaFaltasSemestre,
  type ReclassificacaoFalta,
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
import { FaltasSemestreService } from './faltas-semestre.service';

// Relação de faltas do estagiário (RF39) e a contagem do semestre (RF40): só o
// supervisor e a coordenação (RNF35). O estagiário e a secretaria recebem 403; o
// supervisor, só o que é dele. A reclassificação é só da coordenação.
@Controller('faltas-estagiarios')
@UseGuards(AutenticadoGuard, PerfisGuard)
@Perfis('supervisor', 'coordenacao')
export class FaltasEstagiarioController {
  constructor(
    private readonly faltas: FaltasEstagiarioService,
    private readonly semestre: FaltasSemestreService,
  ) {}

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

  // Contagem das faltas de cada estagiário no semestre (RF40).
  @Get('semestre')
  @Header('Cache-Control', 'no-store')
  consultarSemestre(
    @Query(new ZodValidationPipe(consultaFaltasSemestreSchema))
    consulta: ConsultaFaltasSemestre,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.semestre.consultar(consulta, usuario);
  }

  // Reclassificação de uma ausência registrada por engano (RF40).
  @Post(':cancelamentoId/reclassificacao')
  @Perfis('coordenacao')
  @HttpCode(200)
  reclassificar(
    @Param('cancelamentoId', ParseUUIDPipe) cancelamentoId: string,
    @Body(new ZodValidationPipe(reclassificacaoFaltaSchema))
    dados: ReclassificacaoFalta,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.semestre.reclassificar(cancelamentoId, dados, usuario);
  }
}
