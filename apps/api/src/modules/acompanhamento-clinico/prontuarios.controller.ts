import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ProntuariosService } from './prontuarios.service';

// Restrição de acesso ao prontuário (RF55).
@Controller()
@UseGuards(AutenticadoGuard)
export class ProntuariosController {
  constructor(private readonly prontuarios: ProntuariosService) {}

  // Qualquer perfil pode tentar: a política decide e registra a tentativa.
  @Get('prontuarios/:id')
  consultar(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.prontuarios.consultar(id, usuario);
  }

  @Get('pacientes/:casoId/dados-administrativos')
  @UseGuards(PerfisGuard)
  @Perfis('secretaria', 'coordenacao')
  dadosAdministrativos(@Param('casoId', ParseUUIDPipe) casoId: string) {
    return this.prontuarios.dadosAdministrativos(casoId);
  }
}
