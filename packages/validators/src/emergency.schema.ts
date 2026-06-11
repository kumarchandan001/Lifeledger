import { z } from 'zod';

export const createTrustedContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(20, 'Phone must be under 20 characters').optional().nullable(),
  relationship: z.enum([
    'Spouse',
    'Parent',
    'Child',
    'Sibling',
    'Lawyer',
    'Doctor',
    'Executor',
    'Friend',
    'Other',
  ]),
});

export const updateTrustedContactSchema = createTrustedContactSchema.partial();

export const createAccessRequestSchema = z.object({
  ownerEmail: z.string().email('Owner email is required'),
  requesterEmail: z.string().email('Requester email is required'),
  requesterName: z.string().min(1, 'Requester name is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters long'),
  supportingInfo: z.string().optional(),
});

export const resolveAccessRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  sessionDuration: z.enum(['24h', '72h', '7d']).optional().default('72h'),
  accessScope: z.object({
    categories: z.array(z.string()).optional(),
    documentIds: z.array(z.string()).optional(),
  }).optional(),
});

export const updateEmergencySettingsSchema = z.object({
  emergencyWaitingPeriod: z.union([z.literal(3), z.literal(7), z.literal(14), z.literal(30)]),
});
