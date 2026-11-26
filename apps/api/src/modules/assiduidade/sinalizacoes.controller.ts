import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import {
  consultaSinalizacoesSchema,
  type ConsultaSinalizacoes,
} from '@clinica/shared';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { SinalizacoesService } from './sinalizacoes.service';

// Sinalizações de reprovação do estagiário (RF63): só o supervisor do estagiário e
// a coordenação (RNF35). Não há rota de escrita: a sinalização nasce e é
// encerrada na transação da ausência (RF16) ou da reclassificação (RF40).
@Controller('sinalizacoes-reprovacao')
@UseGuards(AutenticadoGuard, PerfisGuard)
@Perfis('supervisor', 'coordenacao')
export class SinalizacoesController {
  constructor(private readonly sinalizacoes: SinalizacoesService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  consultar(
    @Query(new ZodValidationPipe(consultaSinalizacoesSchema))
    consulta: ConsultaSinalizacoes,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.sinalizacoes.consultar(consulta, usuario);
  }
}
