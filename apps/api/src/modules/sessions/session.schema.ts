import { z } from 'zod';

export const codeSchema = z.string().trim().min(1);
export const sessionRequestSchema = z.object({ code: codeSchema });
