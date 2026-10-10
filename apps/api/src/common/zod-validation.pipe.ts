import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const resultado = this.schema.safeParse(value);
    if (!resultado.success)
      throw new BadRequestException(resultado.error.issues);
    return resultado.data;
  }
}
