import { z } from 'zod';

/**
 * Validation schema for OWNER registration
 * Validates: Full Name, Company Name, Email, Password, and CNPJ (Brazilian company ID)
 */
export const ownerRegistrationSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  companyName: z.string().min(3, 'Nome da empresa deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido (formato: XX.XXX.XXX/XXXX-XX)')
    .transform((val) => val.replace(/[^\d]/g, '')), // Remove formatting
});

/**
 * Validation schema for SELLER registration
 * Validates: Full Name, Store Name, Email, Password, and Tax ID
 */
export const sellerRegistrationSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  storeName: z.string().min(3, 'Nome da loja deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  taxId: z.string().min(5, 'Documento fiscal inválido'),
});

/**
 * Validation schema for login
 * Validates: Email and Password
 */
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

// Type exports for TypeScript
export type OwnerRegistration = z.infer<typeof ownerRegistrationSchema>;
export type SellerRegistration = z.infer<typeof sellerRegistrationSchema>;
export type LoginData = z.infer<typeof loginSchema>;
