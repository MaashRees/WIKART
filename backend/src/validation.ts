import type { Context } from 'hono';
import type { z } from 'zod';

type ValidationResult = {
  success: boolean;
  error?: z.core.$ZodError;
};

export function validationError(result: ValidationResult, c: Context) {
  if (!result.success) {
		const msg = `${result.error?.issues[0]?.path} - ${result.error?.issues[0]?.message}`;
    return c.json(
      { error: msg },
      400,
    );
  }
}
