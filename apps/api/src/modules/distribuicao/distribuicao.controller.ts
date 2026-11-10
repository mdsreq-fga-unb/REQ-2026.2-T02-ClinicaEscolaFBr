import {
  Controller,
  Post,
  Body,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { DistribuicaoService } from './distribuicao.service';
import { transferirCasoSchema } from '@clinica/shared';

@Controller('distribuicao')
export class DistribuicaoController {
  constructor(private readonly distribuicaoService: DistribuicaoService) {}

  @Post('transferir')
  async transferir(@Body() body: any, @Req() req: any) {
    // Validação usando o Zod e capturando os problemas via .error.issues
    const result = transferirCasoSchema.safeParse(body);
    if (!result.success) {
      throw new Error(result.error.issues[0].message);
    }

    // Mock ou extração do usuário logado
    const usuarioLogado = req.user || {
      sub: 'uuid-admin-teste',
      perfil: 'COORDENACAO',
    };

    if (!usuarioLogado) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }

    return this.distribuicaoService.transferirCaso(
      result.data,
      usuarioLogado.sub,
      usuarioLogado.perfil,
    );
  }
}
