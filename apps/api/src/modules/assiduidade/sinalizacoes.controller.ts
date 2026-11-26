import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  consultaSinalizacoesSchema,
  registroDecisaoSchema,
  type ConsultaSinalizacoes,
  type RegistroDecisao,
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
// a coordenação (RNF35). A sinalização nasce e é encerrada sem decisão na
// transação da ausência (RF16) ou da reclassificação (RF40); a única escrita é a
// decisão institucional, só da coordenação (RF64).
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

  // Decisão institucional sobre a sinalização (RF64).
  @Post(':id/decisoes')
  @Perfis('coordenacao')
  registrarDecisao(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(registroDecisaoSchema))
    dados: RegistroDecisao,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.sinalizacoes.registrarDecisao(id, dados, usuario);
  }
}
