import { z } from 'zod';

// Shared zod schemas for API inputs. See SPEC §8.

export const NortheasternEmail = z
  .string()
  .email('Enter a valid email.')
  .refine((e) => e.toLowerCase().endsWith('@northeastern.edu'), {
    message: 'Use your Northeastern email.',
  })
  .transform((e) => e.toLowerCase().trim());

export const TeamNumber = z
  .number()
  .int('Team number must be a whole number.')
  .min(1, 'Team number must be at least 1.')
  .max(99, 'Team number must be at most 99.');

export const Password = z.string().min(6, 'Password must be at least 6 characters.');

export const RegisterInput = z.object({
  name: z.string().min(1, 'Enter your name.').max(100).transform((s) => s.trim()),
  email: NortheasternEmail,
  password: Password,
  team_number: TeamNumber,
});

export const SignInInput = z.object({
  email: NortheasternEmail,
  password: z.string().min(1, 'Enter your password.'),
});

export type RegisterInputT = z.infer<typeof RegisterInput>;
export type SignInInputT = z.infer<typeof SignInInput>;
