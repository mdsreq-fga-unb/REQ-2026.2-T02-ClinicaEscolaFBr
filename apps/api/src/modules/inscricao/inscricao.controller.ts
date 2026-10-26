import { Body, Controller, Header, Post } from '@nestjs/common';
import { inscricaoSchema, type Inscricao } from '@clinica/shared';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { InscricaoService } from './inscricao.service';

@ApiTags('Inscrições')
@Controller('inscricoes')
export class InscricaoController {
  constructor(private readonly inscricao: InscricaoService) {}

  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary:
      'RF1/RF2: registra a inscrição confirmada e retorna somente o comprovante.',
  })
  registrar(@Body(new ZodValidationPipe(inscricaoSchema)) dados: Inscricao) {
    return this.inscricao.registrar(dados);
  }
}
