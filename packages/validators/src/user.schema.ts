import { z } from 'zod';

// ─── Update Profile ───
export const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(255).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, 'Invalid phone number')
    .optional()
    .nullable(),
  dateOfBirth: z.string().datetime().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional().nullable(),
  preferredLanguage: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
