import { z } from 'zod'

// Validaciones para autenticación
export const LoginSchema = z.object({
  email: z
    .string()
    .email('Ingresa un email válido')
    .min(1, 'El email es requerido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(100, 'La contraseña es demasiado larga')
})

export const RegisterSchema = z.object({
  email: z
    .string()
    .email('Ingresa un email válido')
    .min(1, 'El email es requerido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres') // Relajado para dev
    .max(100, 'La contraseña es demasiado larga'),
    // Quitamos los regex de mayúscula/minúscula/número para simplificar
  confirmPassword: z.string(),
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'El nombre solo puede contener letras y espacios'),
  company_name: z
    .string()
    .max(200, 'El nombre de la empresa es demasiado largo')
    .optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || (val.length >= 9 && /^[+]?[0-9\s\-()]+$/.test(val)), {
      message: 'Formato de teléfono inválido o muy corto'
    }), // Permite vacío o válido
  address: z
    .string()
    .max(500, 'La dirección es demasiado larga')
    .optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"]
})

// Validaciones para productos
export const ProductFilterSchema = z.object({
  search: z.string().optional(),
  categoria: z.string().optional(),
  min_precio: z.number().min(0).optional(),
  max_precio: z.number().min(0).optional(),
  solo_con_stock: z.boolean().optional(),
  ordenar_por: z.enum(['nombre', 'precio_promedio', 'stock_actual']).optional(),
  orden: z.enum(['asc', 'desc']).optional()
})

// Validaciones para carrito y pedidos
export const CartItemSchema = z.object({
  product_id: z.string().uuid('ID de producto inválido'),
  quantity: z
    .number()
    .int('La cantidad debe ser un número entero')
    .min(1, 'La cantidad mínima es 1')
    .max(1000, 'La cantidad máxima es 1000')
})

export const CreateOrderSchema = z.object({
  items: z
    .array(CartItemSchema)
    .min(1, 'El pedido debe tener al menos un producto'),
  allow_backorder: z.boolean().default(false),
  notes: z
    .string()
    .max(500, 'Las notas no pueden exceder 500 caracteres')
    .optional()
})

export const CancelOrderSchema = z.object({
  reason: z
    .string()
    .max(300, 'La razón no puede exceder 300 caracteres')
    .optional()
})

// Validaciones para actualizar perfil de cliente
export const UpdateCustomerSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo')
    .optional(),
  company_name: z
    .string()
    .max(200, 'El nombre de la empresa es demasiado largo')
    .optional(),
  phone: z
    .string()
    .regex(/^[+]?[0-9\s\-()]+$/, 'Formato de teléfono inválido')
    .min(9, 'El teléfono debe tener al menos 9 dígitos')
    .max(20, 'El teléfono es demasiado largo')
    .optional(),
  address: z
    .string()
    .max(500, 'La dirección es demasiado larga')
    .optional()
})

// Validaciones para cambio de contraseña
export const ChangePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'La contraseña actual es requerida'),
  newPassword: z
    .string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
    .max(100, 'La contraseña es demasiado larga')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una minúscula')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
  confirmNewPassword: z.string()
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmNewPassword"]
})

// Validaciones para formularios de contacto
export const ContactSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo'),
  email: z
    .string()
    .email('Ingresa un email válido'),
  subject: z
    .string()
    .min(5, 'El asunto debe tener al menos 5 caracteres')
    .max(200, 'El asunto es demasiado largo'),
  message: z
    .string()
    .min(10, 'El mensaje debe tener al menos 10 caracteres')
    .max(1000, 'El mensaje es demasiado largo')
})

// Validaciones para búsqueda
export const SearchSchema = z.object({
  query: z
    .string()
    .min(1, 'Ingresa un término de búsqueda')
    .max(100, 'El término de búsqueda es demasiado largo')
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-.,]+$/, 'El término de búsqueda contiene caracteres inválidos')
})

// Tipos derivados de los esquemas
export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type ProductFilterInput = z.infer<typeof ProductFilterSchema>
export type CartItemInput = z.infer<typeof CartItemSchema>
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type CancelOrderInput = z.infer<typeof CancelOrderSchema>
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
export type ContactInput = z.infer<typeof ContactSchema>
export type SearchInput = z.infer<typeof SearchSchema>

// Función helper para validar datos
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: boolean; data?: T; errors?: string[] } {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map((err: z.ZodIssue) => 
        `${err.path.join('.')}: ${err.message}`
      )
      return { success: false, errors }
    }
    return { success: false, errors: ['Error de validación desconocido'] }
  }
}

// Función helper para sanitizar strings
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ') // Múltiples espacios -> un espacio
    .replace(/[<>]/g, '') // Remover < y >
}

// Función helper para validar email sin schema completo
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Función helper para validar teléfono español
export function isValidSpanishPhone(phone: string): boolean {
  const phoneRegex = /^(\+34|0034|34)?[6789]\d{8}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}