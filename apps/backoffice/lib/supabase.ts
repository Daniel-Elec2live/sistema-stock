// apps/backoffice/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente para el servidor (con permisos completos) - IDÉNTICO a B2B
export function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Cliente para el browser (permisos limitados)
export function createSupabaseBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Tipos para la base de datos (estos deberían venir de Chat 3)
export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          unidad: string
          stock_actual: number
          stock_minimo: number
          stock_maximo: number | null
          categoria: string
          proveedor: string
          referencia: string | null
          precio_promedio: number | null
          brand: string | null
          image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          unidad: string
          stock_actual?: number
          stock_minimo: number
          stock_maximo?: number | null
          categoria?: string
          proveedor?: string
          referencia?: string | null
          precio_promedio?: number | null
          brand?: string | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          unidad?: string
          stock_actual?: number
          stock_minimo?: number
          stock_maximo?: number | null
          categoria?: string
          proveedor?: string
          referencia?: string | null
          precio_promedio?: number | null
          brand?: string | null
          image_url?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      batches: {
        Row: {
          id: string
          product_id: string
          cantidad: number
          caducidad: string
          precio_compra: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          cantidad: number
          caducidad: string
          precio_compra: number
          created_at?: string
        }
        Update: {
          cantidad?: number
          caducidad?: string
          precio_compra?: number
        }
      }
      entradas: {
        Row: {
          id: string
          tipo: 'ocr' | 'manual'
          estado: 'procesando' | 'pendiente_validacion' | 'validada' | 'completada' | 'error'
          proveedor: string | null
          fecha: string | null
          documento_url: string | null
          archivo_nombre: string | null
          productos: any | null
          confianza: number | null
          error_message: string | null
          created_at: string
          ocr_completado_at: string | null
          validada_at: string | null
        }
        Insert: {
          id?: string
          tipo: 'ocr' | 'manual'
          estado?: 'procesando' | 'pendiente_validacion' | 'validada' | 'completada' | 'error'
          proveedor?: string | null
          fecha?: string | null
          documento_url?: string | null
          archivo_nombre?: string | null
          productos?: any | null
          confianza?: number | null
          error_message?: string | null
          created_at?: string
          ocr_completado_at?: string | null
          validada_at?: string | null
        }
        Update: {
          estado?: 'procesando' | 'pendiente_validacion' | 'validada' | 'completada' | 'error'
          proveedor?: string | null
          fecha?: string | null
          productos?: any | null
          confianza?: number | null
          error_message?: string | null
          ocr_completado_at?: string | null
          validada_at?: string | null
        }
      }
      stock_adjustments: {
        Row: {
          id: string
          product_id: string
          tipo: 'merma' | 'ajuste' | 'devolucion'
          cantidad: number
          motivo: string
          observaciones: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          tipo: 'merma' | 'ajuste' | 'devolucion'
          cantidad: number
          motivo: string
          observaciones?: string | null
          created_at?: string
        }
        Update: {
          motivo?: string
          observaciones?: string | null
        }
      }
    }
  }
}