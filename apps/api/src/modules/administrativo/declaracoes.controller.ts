import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  registroAutorizacaoMenorSchema,
  type RegistroAutorizacaoMenor,
} from '@clinica/shared';
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
import { DeclaracoesService } from './declaracoes.service';

// Sessões com presença registrada (RF44, RNF38) e declaração de comparecimento
// (RF45, RNF39). O paciente ou o responsável, sem conta, usa só as sessões da
// inscrição cuja identidade confirmou (RF52). Na equipe, só a secretaria lista e
// emite; o estagiário, o supervisor e a coordenação recebem 403.
@Controller()
export class DeclaracoesController {
  constructor(private readonly declaracoes: DeclaracoesService) {}

  @Get('declaracoes/minhas-sessoes')
  @UseGuards(VerificacaoGuard)
  @Header('Cache-Control', 'no-store')
  minhasSessoes(@InscricaoVerificada() inscricaoId: string) {
    return this.declaracoes.sessoesDaInscricao(inscricaoId);
  }

  // Emissão pelo paciente ou pelo responsável. POST, e não GET: cada emissão é
  // um registro novo (RNF39), e um GET repetido pelo navegador criaria emissões.
  @Post('declaracoes/minhas-sessoes/:sessaoId/emissao')
  @UseGuards(VerificacaoGuard)
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  emitirPelaVerificacao(
    @Param('sessaoId', ParseUUIDPipe) sessaoId: string,
    @InscricaoVerificada() inscricaoId: string,
  ) {
    return this.declaracoes.emitirPelaVerificacao(sessaoId, inscricaoId);
  }

  @Get('pacientes/:casoId/sessoes-realizadas')
  @UseGuards(AutenticadoGuard, PerfisGuard)
  @Perfis('secretaria')
  @Header('Cache-Control', 'no-store')
  sessoesRealizadas(@Param('casoId', ParseUUIDPipe) casoId: string) {
    return this.declaracoes.sessoesDoCaso(casoId);
  }

  // Emissão pela equipe: o perfil é conferido no serviço, e não no PerfisGuard,
  // para a tentativa negada ficar registrada (RNF39).
  @Post('declaracoes/sessoes/:sessaoId/emissao')
  @UseGuards(AutenticadoGuard)
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  emitirPelaEquipe(
    @Param('sessaoId', ParseUUIDPipe) sessaoId: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.declaracoes.emitirPelaEquipe(sessaoId, usuario);
  }

  // Autorização para acompanhamento de criança ou adolescente, na ficha do
  // paciente da secretaria (RF45).
  @Get('pacientes/:casoId/autorizacao-menor')
  @UseGuards(AutenticadoGuard, PerfisGuard)
  @Perfis('secretaria')
  @Header('Cache-Control', 'no-store')
  autorizacao(@Param('casoId', ParseUUIDPipe) casoId: string) {
    return this.declaracoes.autorizacaoDoCaso(casoId);
  }

  @Put('pacientes/:casoId/autorizacao-menor')
  @UseGuards(AutenticadoGuard, PerfisGuard)
  @Perfis('secretaria')
  registrarAutorizacao(
    @Param('casoId', ParseUUIDPipe) casoId: string,
    @Body(new ZodValidationPipe(registroAutorizacaoMenorSchema))
    dados: RegistroAutorizacaoMenor,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.declaracoes.registrarAutorizacao(casoId, dados, usuario);
  }
}
