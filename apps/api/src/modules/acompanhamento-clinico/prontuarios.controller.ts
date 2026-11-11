import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  anamneseSchema,
  contratoSchema,
  evolucaoSchema,
  type Anamnese,
  type Contrato,
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
import { ProntuariosService } from './prontuarios.service';

// Restrição de acesso ao prontuário (RF55).
@Controller()
@UseGuards(AutenticadoGuard)
export class ProntuariosController {
  constructor(private readonly prontuarios: ProntuariosService) {}

  // Qualquer perfil pode tentar: a política decide e registra a tentativa.
  @Get('prontuarios/:id')
  @Header('Cache-Control', 'no-store')
  consultar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.prontuarios.consultar(id, usuario);
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
