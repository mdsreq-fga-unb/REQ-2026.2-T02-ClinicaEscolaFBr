import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDb } from '@clinica/database';

export const DB = Symbol('DB');

@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createDb(config.getOrThrow<string>('DATABASE_URL')),
    },
  ],
  exports: [DB],
})
export class DatabaseModule {}
