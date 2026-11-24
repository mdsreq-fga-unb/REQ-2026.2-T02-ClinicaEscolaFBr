import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { entregaRelatorioSchema, type EntregaRelatorio } from '@clinica/shared';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { ElaboracaoRelatorioService } from './elaboracao-relatorio.service';
import { RelatoriosFinaisService } from './relatorios-finais.service';

const cicloOpcional = new ParseIntPipe({ optional: true });

// Relatório final do ciclo (RF33). Qualquer perfil pode tentar: a política do
// prontuário (RF55) decide e registra a tentativa (RNF52). Sem o ciclo, vale o
// ciclo atual do caso. Não há rota de download nem de envio ao paciente.
@Controller('casos/:id/relatorio-final')
@UseGuards(AutenticadoGuard)
export class RelatoriosFinaisController {
  constructor(
    private readonly relatorios: RelatoriosFinaisService,
    private readonly elaboracao: ElaboracaoRelatorioService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  consultar(
    @Param('id', ParseUUIDPipe) casoId: string,
    @Query('ciclo', cicloOpcional) ciclo: number | undefined,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.relatorios.consultar(casoId, ciclo, usuario);
  }

  // Elaboração, envio e decisão. O corpo é validado no serviço, depois da política de
  // acesso, para o 403 não depender do que foi enviado (RNF25).
  @Get('elaboracao')
  @Header('Cache-Control', 'no-store')
  consultarElaboracao(
    @Param('id', ParseUUIDPipe) casoId: string,
    @Query('ciclo', cicloOpcional) ciclo: number | undefined,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.elaboracao.consultar(casoId, ciclo, usuario);
  }

  @Put('rascunho')
  @Header('Cache-Control', 'no-store')
  salvarRascunho(
    @Param('id', ParseUUIDPipe) casoId: string,
    @Query('ciclo', cicloOpcional) ciclo: number | undefined,
    @Body() corpo: unknown,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.elaboracao.salvarRascunho(casoId, ciclo, corpo, usuario);
  }

  @Post('envio')
  @Header('Cache-Control', 'no-store')
  enviar(
    @Param('id', ParseUUIDPipe) casoId: string,
    @Query('ciclo', cicloOpcional) ciclo: number | undefined,
    @Body() corpo: unknown,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.elaboracao.enviar(casoId, ciclo, corpo, usuario);
  }

  @Post('versoes/:versao/decisao')
  @Header('Cache-Control', 'no-store')
  decidir(
    @Param('id', ParseUUIDPipe) casoId: string,
    @Param('versao', ParseIntPipe) versao: number,
    @Query('ciclo', cicloOpcional) ciclo: number | undefined,
    @Body() corpo: unknown,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.elaboracao.decidir(casoId, ciclo, versao, corpo, usuario);
  }

  @Get('versoes/:versao/impressao')
  @Header('Cache-Control', 'no-store')
  paraImpressao(
    @Param('id', ParseUUIDPipe) casoId: string,
    @Param('versao', ParseIntPipe) versao: number,
    @Query('ciclo', cicloOpcional) ciclo: number | undefined,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.relatorios.paraImpressao(casoId, ciclo, versao, usuario);
  }

  @Post('versoes/:versao/impressoes')
  @Header('Cache-Control', 'no-store')
  registrarImpressao(
    @Param('id', ParseUUIDPipe) casoId: string,
    @Param('versao', ParseIntPipe) versao: number,
    @Query('ciclo', cicloOpcional) ciclo: number | undefined,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.relatorios.registrarImpressao(casoId, ciclo, versao, usuario);
  }

  @Post('entrega')
  @Header('Cache-Control', 'no-store')
  registrarEntrega(
    @Param('id', ParseUUIDPipe) casoId: string,
    @Query('ciclo', cicloOpcional) ciclo: number | undefined,
    @Body(new ZodValidationPipe(entregaRelatorioSchema))
    dados: EntregaRelatorio,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.relatorios.registrarEntrega(casoId, ciclo, dados, usuario);
  }
}
