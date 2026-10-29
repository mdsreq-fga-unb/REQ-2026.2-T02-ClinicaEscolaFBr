import { Body, Controller, Header, Post, UseGuards } from '@nestjs/common';
import { inscricaoSchema, type Inscricao } from '@clinica/shared';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LimiteDeEnviosGuard } from '../../common/limite-de-envios.guard';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { InscricaoAbertaGuard } from './inscricao-aberta.guard';
import { InscricaoService } from './inscricao.service';

@ApiTags('Inscrições')
@Controller('inscricoes')
export class InscricaoController {
  constructor(private readonly inscricao: InscricaoService) {}

  @Post()
  @UseGuards(InscricaoAbertaGuard, LimiteDeEnviosGuard)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'RF1/RF2: registra a inscrição confirmada e retorna somente o comprovante.',
  })
  registrar(@Body(new ZodValidationPipe(inscricaoSchema)) dados: Inscricao) {
    return this.inscricao.registrar(dados);
  }
}
