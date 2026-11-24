import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  anamneseSchema,
  contratoSchema,
  dataLimiteCorrecaoSchema,
  evolucaoSchema,
  filtroHistoricoEvolucoesSchema,
  type Anamnese,
  type Contrato,
  type DataLimiteCorrecaoEntrada,
  type Evolucao,
} from '@clinica/shared';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { ComplementosEvolucaoService } from './complementos-evolucao.service';
import { CorrecoesEvolucaoService } from './correcoes-evolucao.service';
import { ProntuariosService } from './prontuarios.service';
import { ValidacoesEvolucaoService } from './validacoes-evolucao.service';
import { HistoricoEvolucoesService } from './historico-evolucoes.service';

// Restrição de acesso ao prontuário (RF55).
@Controller()
@UseGuards(AutenticadoGuard)
export class ProntuariosController {
  constructor(
    private readonly prontuarios: ProntuariosService,
    private readonly correcoes: CorrecoesEvolucaoService,
    private readonly complementos: ComplementosEvolucaoService,
    private readonly validacoes: ValidacoesEvolucaoService,
    private readonly historico: HistoricoEvolucoesService,
  ) {}

  // Qualquer perfil pode tentar: a política decide e registra a tentativa.
  @Get('prontuarios/:id')
  @Header('Cache-Control', 'no-store')
  consultar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.prontuarios.consultar(id, usuario);
  }

  // Histórico por ciclo com a política de leitura do prontuário (RF32).
  @Get('prontuarios/:id/evolucoes')
  @Header('Cache-Control', 'no-store')
  consultarHistorico(
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(filtroHistoricoEvolucoesSchema))
    filtro: { ciclo?: number },
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.historico.consultar(id, filtro.ciclo, usuario);
  }

  // Anamnese e contrato salvos separados, cada um uma vez (RF69).
  @Post('prontuarios/:id/anamnese')
  @Header('Cache-Control', 'no-store')
  registrarAnamnese(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(anamneseSchema)) dados: Anamnese,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.prontuarios.registrarAnamnese(id, dados, usuario);
  }

  @Post('prontuarios/:id/contrato')
  @Header('Cache-Control', 'no-store')
  registrarContrato(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(contratoSchema)) dados: Contrato,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.prontuarios.registrarContrato(id, dados, usuario);
  }

  @Post('prontuarios/:id/sessoes/:sessaoId/realizada')
  @Header('Cache-Control', 'no-store')
  marcarSessaoRealizada(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessaoId', ParseUUIDPipe) sessaoId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.prontuarios.marcarSessaoRealizada(id, sessaoId, usuario);
  }

  @Post('prontuarios/:id/sessoes/:sessaoId/evolucoes')
  @Header('Cache-Control', 'no-store')
  registrarEvolucao(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessaoId', ParseUUIDPipe) sessaoId: string,
    @Body(new ZodValidationPipe(evolucaoSchema)) dados: Evolucao,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.prontuarios.registrarEvolucao(id, sessaoId, dados, usuario);
  }

  // Correção da evolução (RF29). O corpo é validado no serviço, pelo formato da
  // evolução original (a ficha da DF38 ou a antiga), depois da política de acesso.
  @Post('prontuarios/:id/evolucoes/:evolucaoId/correcoes')
  @Header('Cache-Control', 'no-store')
  corrigirEvolucao(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('evolucaoId', ParseUUIDPipe) evolucaoId: string,
    @Body() corpo: unknown,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.correcoes.corrigir(id, evolucaoId, corpo, usuario);
  }

  // Complemento da evolução (RF30). O corpo é validado no serviço, depois da política
  // de acesso, como na correção.
  @Post('prontuarios/:id/evolucoes/:evolucaoId/complementos')
  @Header('Cache-Control', 'no-store')
  complementarEvolucao(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('evolucaoId', ParseUUIDPipe) evolucaoId: string,
    @Body() corpo: unknown,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.complementos.registrar(id, evolucaoId, corpo, usuario);
  }

  // Validação da evolução pelo supervisor do caso (RF67).
  @Post('prontuarios/:id/evolucoes/:evolucaoId/validacao')
  @Header('Cache-Control', 'no-store')
  validarEvolucao(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('evolucaoId', ParseUUIDPipe) evolucaoId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.validacoes.validar(id, evolucaoId, usuario);
  }

  // Data-limite para corrigir evoluções no semestre vigente (RF29): só a coordenação.
  @Get('parametros/data-limite-correcao')
  @Header('Cache-Control', 'no-store')
  @UseGuards(PerfisGuard)
  @Perfis('coordenacao')
  dataLimiteCorrecao() {
    return this.correcoes.consultarDataLimite();
  }

  @Put('parametros/data-limite-correcao')
  @Header('Cache-Control', 'no-store')
  @UseGuards(PerfisGuard)
  @Perfis('coordenacao')
  registrarDataLimiteCorrecao(
    @Body(new ZodValidationPipe(dataLimiteCorrecaoSchema))
    corpo: DataLimiteCorrecaoEntrada,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.correcoes.registrarDataLimite(corpo.dataLimite, usuario.id);
  }

  @Get('pacientes/:casoId/dados-administrativos')
  @Header('Cache-Control', 'no-store')
  @UseGuards(PerfisGuard)
  @Perfis('secretaria', 'coordenacao')
  dadosAdministrativos(
    @Param('casoId', ParseUUIDPipe) casoId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.prontuarios.dadosAdministrativos(casoId, usuario);
  }
}
