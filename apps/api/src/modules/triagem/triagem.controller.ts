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
import { prioridadeSchema } from '@clinica/shared';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { TriagemService } from './triagem.service';

@Controller('triagem')
@UseGuards(AutenticadoGuard, PerfisGuard)
@Perfis('supervisor', 'coordenacao')
export class TriagemController {
  constructor(private readonly triagem: TriagemService) {}

  @Get('inscricoes')
  @Header('Cache-Control', 'no-store')
  listar(@Query('ordem') ordem: 'antigas' | 'recentes' = 'antigas') {
    return this.triagem.listarPendentes(ordem);
  }

  @Get('inscricoes/classificadas')
  @Header('Cache-Control', 'no-store')
  listarClassificadas() {
    return this.triagem.listarClassificadas();
  }

  @Post('inscricoes/:id/prioridade')
  @Header('Cache-Control', 'no-store')
  registrarPrioridade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(prioridadeSchema))
    dados: { cor: 'vermelha' | 'amarela' | 'verde' },
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.triagem.registrarPrioridade(id, dados.cor, usuario);
  }
}
