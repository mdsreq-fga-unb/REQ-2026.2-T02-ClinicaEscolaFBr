import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const INSCRICAO_FECHADA =
  'As inscrições pela internet ainda não estão abertas.';

// A inscrição pública coleta dados de saúde e só abre ao público com o termo de
// consentimento (RF57). Até lá, a produção sobe com INSCRICAO_ABERTA=false, e a
// API recusa as inscrições novas antes de validar o corpo. Sem a variável
// (desenvolvimento, testes e validação), a inscrição fica aberta.
@Injectable()
export class InscricaoAbertaGuard implements CanActivate {
  private readonly aberta: boolean;

  constructor(config: ConfigService) {
    this.aberta = String(config.get('INSCRICAO_ABERTA') ?? true) !== 'false';
  }

  canActivate(): boolean {
    if (!this.aberta) throw new ForbiddenException(INSCRICAO_FECHADA);
    return true;
  }
}
