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
  buscaListaPacientesSchema,
  distribuicaoSchema,
  vinculoEstagiarioSchema,
  type BuscaListaPacientes,
  type Distribuicao,
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

// Distribuição e consulta de casos (CP5). Cada rota é restrita ao perfil autorizado.
@Controller()
@UseGuards(AutenticadoGuard, PerfisGuard)
export class CasosController {
  constructor(private readonly casos: CasosService) {}

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
  @Get('casos/meus')
  @Perfis('supervisor')
  @Header('Cache-Control', 'no-store')
  meus(@UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.casos.meusCasos(usuario);
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

  // RF22: lista de Pacientes, com os responsáveis de cada caso. Só a secretaria e a
  // coordenação; nada de dado clínico (RNF17), e sem cache por ter nome de paciente.
  @Get('pacientes')
  @Perfis('secretaria', 'coordenacao')
  @Header('Cache-Control', 'no-store')
  pacientes(
    @Query(new ZodValidationPipe(buscaListaPacientesSchema))
    filtro: BuscaListaPacientes,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.casos.listaDePacientes(filtro.busca || undefined, usuario);
  }

  // RF22: responsáveis pelo caso. Sem @Perfis: o serviço decide, porque o
  // estagiário e o supervisor só veem os casos em que são responsáveis.
  @Get('casos/:id/responsaveis')
  @Header('Cache-Control', 'no-store')
  responsaveis(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.casos.responsaveis(id, usuario);
  }
}
