import { z } from "zod";

// Signup Schema
export const signUpSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  pin:z.string()
});

// Login Schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
