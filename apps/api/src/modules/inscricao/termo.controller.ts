import { Controller, Get, Header } from '@nestjs/common';
import { TermoService } from './termo.service';
@Controller('termo')
export class TermoController {
  constructor(private readonly termo: TermoService) {}
  @Get('vigente')
  @Header('Cache-Control', 'no-store')
  vigente() {
    return this.termo.vigente();
  }
}
