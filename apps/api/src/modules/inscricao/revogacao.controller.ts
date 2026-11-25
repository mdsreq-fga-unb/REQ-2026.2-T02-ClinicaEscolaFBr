import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { revogacaoSchema, type Revogacao } from '@clinica/shared';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { COOKIE_VERIFICACAO } from '../acesso/cookie-sessao';
import { RevogacaoService } from './revogacao.service';

@Controller()
@UseGuards(AutenticadoGuard, PerfisGuard)
export class RevogacaoController {
  constructor(private readonly revogacoes: RevogacaoService) {}
  @Get('casos/:id/consentimento')
  @Header('Cache-Control', 'no-store')
  doCaso(
    @Param('id', ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.revogacoes.doCaso(id, usuario);
  }
  @Get('inscricoes/:id/consentimento')
  @Perfis('secretaria', 'coordenacao')
  @Header('Cache-Control', 'no-store')
  consultar(@Param('id', ParseUUIDPipe) id: string) {
    return this.revogacoes.consultar(id);
  }
  @Post('inscricoes/:id/revogacao')
  @Perfis('secretaria')
  @Header('Cache-Control', 'no-store')
  registrar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(revogacaoSchema)) dados: Revogacao,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Req() req: Request,
  ) {
    const token = (req.cookies as Record<string, string> | undefined)?.[
      COOKIE_VERIFICACAO
    ];
    return this.revogacoes.registrar(id, dados, usuario, token);
  }
}
