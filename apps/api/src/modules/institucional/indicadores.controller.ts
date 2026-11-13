import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  consultaIndicadoresSchema,
  SEMESTRE_URL,
  semestreDaUrl,
  vagasOfertadasSchema,
  type ConsultaIndicadores,
  type VagasOfertadasEntrada,
} from '@clinica/shared';
import { Perfis } from '../../auth/perfis.decorator';
import { PerfisGuard } from '../../auth/perfis.guard';
import {
  AutenticadoGuard,
  UsuarioAtual,
  type UsuarioAutenticado,
} from '../../auth/usuario-autenticado';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { IndicadoresService } from './indicadores.service';

const semestre = (valor: string) => {
  if (!SEMESTRE_URL.test(valor)) {
    throw new BadRequestException('Informe o semestre, como 2026-2.');
  }
  return semestreDaUrl(valor);
};

// Indicadores operacionais (RF48): só a coordenação consulta e registra as vagas.
@Controller()
@UseGuards(AutenticadoGuard, PerfisGuard)
@Perfis('coordenacao')
export class IndicadoresController {
  constructor(private readonly indicadores: IndicadoresService) {}

  @Get('indicadores')
  @Header('Cache-Control', 'no-store')
  consultar(
    @Query(new ZodValidationPipe(consultaIndicadoresSchema))
    consulta: ConsultaIndicadores,
  ) {
    return this.indicadores.consultar(consulta);
  }

  @Get('vagas-ofertadas/:semestre')
  @Header('Cache-Control', 'no-store')
  vagas(@Param('semestre') valor: string) {
    return this.indicadores.vagas(semestre(valor));
  }

  @Put('vagas-ofertadas/:semestre')
  registrar(
    @Param('semestre') valor: string,
    @Body(new ZodValidationPipe(vagasOfertadasSchema))
    corpo: VagasOfertadasEntrada,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ) {
    return this.indicadores.registrarVagas(
      semestre(valor),
      corpo.total,
      usuario.id,
    );
  }
}
