import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  correcaoContribuicaoSchema,
  registroContribuicaoSchema,
  valorContribuicaoSchema,
  type CorrecaoContribuicao,
  type RegistroContribuicao,
  type ValorContribuicaoEntrada,
} from '@clinica/shared';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { ContribuicaoService } from './contribuicao.service';

// Contribuição social (RF41): só a secretaria registra e corrige o pagamento, e
// só a coordenação altera o valor. A coordenação também consulta o pagamento e as
// versões, inclusive as dos ciclos anteriores do caso, e o histórico das
// alterações do valor, só para leitura, porque o RNF36 deixa o histórico
// disponível a ela.
@Controller()
@UseGuards(AutenticadoGuard, PerfisGuard)
export class ContribuicaoController {
  constructor(private readonly contribuicao: ContribuicaoService) {}

  @Get('casos/:id/contribuicao')
  @Perfis('secretaria', 'coordenacao')
  @Header('Cache-Control', 'no-store')
  situacao(@Param('id', ParseUUIDPipe) id: string) {
    return this.contribuicao.situacao(id);
  }

  @Post('casos/:id/contribuicao')
  @Perfis('secretaria')
  registrar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(registroContribuicaoSchema))
    dados: RegistroContribuicao,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.contribuicao.registrar(id, dados, usuario);
  }

  @Post('casos/:id/contribuicao/correcao')
  @Perfis('secretaria')
  corrigir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(correcaoContribuicaoSchema))
    dados: CorrecaoContribuicao,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.contribuicao.corrigir(id, dados, usuario);
  }

  @Get('parametros/valor-contribuicao')
  @Perfis('coordenacao')
  @Header('Cache-Control', 'no-store')
  valor() {
    return this.contribuicao.valor();
  }

  @Put('parametros/valor-contribuicao')
  @Perfis('coordenacao')
  alterarValor(
    @Body(new ZodValidationPipe(valorContribuicaoSchema))
    corpo: ValorContribuicaoEntrada,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.contribuicao.alterarValor(corpo.valorCentavos, usuario.id);
  }
}
