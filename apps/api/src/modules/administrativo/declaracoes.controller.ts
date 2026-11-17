import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import { AutenticadoGuard } from '../../auth/usuario-autenticado';
import {
  InscricaoVerificada,
  VerificacaoGuard,
} from '../acesso/verificacao.guard';
import { DeclaracoesService } from './declaracoes.service';

// Sessões com presença registrada (RF44, RNF38). O paciente ou o responsável,
// sem conta, vê só as sessões da inscrição cuja identidade confirmou (RF52): a
// rota não recebe id nenhum. Na equipe, só a secretaria lista, para a ficha do
// paciente; o estagiário, o supervisor e a coordenação recebem 403. Até a
// emissão (RF45, Ciclo 6), a lista é só de consulta.
@Controller()
export class DeclaracoesController {
  constructor(private readonly declaracoes: DeclaracoesService) {}

  @Get('declaracoes/minhas-sessoes')
  @UseGuards(VerificacaoGuard)
  @Header('Cache-Control', 'no-store')
  minhasSessoes(@InscricaoVerificada() inscricaoId: string) {
    return this.declaracoes.sessoesDaInscricao(inscricaoId);
  }

  @Get('pacientes/:casoId/sessoes-realizadas')
  @UseGuards(AutenticadoGuard, PerfisGuard)
  @Perfis('secretaria')
  @Header('Cache-Control', 'no-store')
  sessoesRealizadas(@Param('casoId', ParseUUIDPipe) casoId: string) {
    return this.declaracoes.sessoesDoCaso(casoId);
  }
}
