import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

@Global()
@Module({
  providers: [EmailService, SmsService],
  exports: [EmailService, SmsService],
})
export class NotificacoesModule {}
