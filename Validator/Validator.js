import { z } from "zod";

// Signup Schema
export const signUpSchema = z.object({
  firstname: z.string(), 
  lastname: z.string(),  
  email: z.string().email(),
  password: z.string().min(8),
});

// Login Schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
