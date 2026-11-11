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
  distribuicaoSchema,
  filtroMeusCasosSchema,
  transferenciaSchema,
  vinculoEstagiarioSchema,
  type Distribuicao,
  type FiltroMeusCasos,
  type Transferencia,
  type VinculoEstagiario,
} from '@clinica/shared';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { CasosService } from './casos.service';
import { TransferenciaService } from './transferencia.service';

// Distribuição de casos (CP5). Secretaria e estagiário não acessam nenhuma rota.
@Controller()
@UseGuards(AutenticadoGuard, PerfisGuard)
export class CasosController {
  constructor(
    private readonly casos: CasosService,
    private readonly transferencias: TransferenciaService,
  ) {}

  // RF18: a coordenação distribui; o supervisor só consulta.
  @Get('casos/aguardando-distribuicao')
  @Perfis('coordenacao', 'supervisor')
  @Header('Cache-Control', 'no-store')
  aguardando() {
    return this.casos.aguardandoDistribuicao();
  }

  // RF20
  @Get('supervisores/disponibilidade')
  @Perfis('coordenacao')
  @Header('Cache-Control', 'no-store')
  supervisores() {
    return this.casos.supervisoresDisponiveis();
  }

  @Post('casos/:id/supervisor')
  @Perfis('coordenacao')
  distribuir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(distribuicaoSchema)) dados: Distribuicao,
    @UsuarioAtual() autor: UsuarioAutenticado,
  ) {
    return this.casos.distribuir(id, dados.supervisorId, autor);
  }

  // RF21
  // RF21 e RF23: "Meus casos" do supervisor, com o filtro por estagiário, e "Meus
  // pacientes" do estagiário. Cada um vê só os casos sob a própria responsabilidade.
  @Get('casos/meus')
  @Perfis('supervisor', 'estagiario')
  @Header('Cache-Control', 'no-store')
  meus(
    @Query(new ZodValidationPipe(filtroMeusCasosSchema))
    filtro: FiltroMeusCasos,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.casos.meusCasos(usuario, filtro.estagiarioId);
  }

  @Get('estagiarios/disponiveis')
  @Perfis('supervisor')
  @Header('Cache-Control', 'no-store')
  estagiarios() {
    return this.casos.estagiariosDisponiveis();
  }

  @Post('casos/:id/estagiario')
  @Perfis('supervisor')
  vincular(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(vinculoEstagiarioSchema))
    dados: VinculoEstagiario,
    @UsuarioAtual() autor: UsuarioAutenticado,
  ) {
    return this.casos.vincularEstagiario(id, dados.estagiarioId, autor);
  }

  // RF25: o supervisor responsável troca o estagiário por outro estagiário dele; a
  // coordenação troca o supervisor e, se indicar, o estagiário (RNF16).
  @Get('casos/:id/transferencia')
  @Perfis('supervisor', 'coordenacao')
  @Header('Cache-Control', 'no-store')
  opcoesTransferencia(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.transferencias.opcoes(id, usuario);
  }

  @Post('casos/:id/transferencia')
  @Perfis('supervisor', 'coordenacao')
  transferir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(transferenciaSchema)) dados: Transferencia,
    @UsuarioAtual() autor: UsuarioAutenticado,
  ) {
    return this.transferencias.transferir(id, dados, autor);
  }
}
