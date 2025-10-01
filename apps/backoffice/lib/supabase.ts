// apps/backoffice/lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cliente para el servidor (con permisos completos)
export function createSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    // Deshabilitar cache de queries en el cliente
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        // Forzar que PostgREST use prefer=return=representation
        'Prefer': 'return=representation',
        // Cache-Control para evitar caching en proxies
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    }
  })
}

/**
 * UPDATE con garantía de read-after-write consistency usando RETURNING
 *
 * PROBLEMA RAÍZ: Supabase-js usa REST API donde el UPDATE va a una conexión
 * y el SELECT posterior puede ir a otra conexión con cache desactualizado
 *
 * SOLUCIÓN: Usar .select() con el UPDATE en la misma query (RETURNING clause)
 * Esto garantiza que el valor devuelto es el valor REAL post-update
 *
 * @param client Cliente de Supabase
 * @param table Nombre de la tabla
 * @param updates Objeto con campos a actualizar
 * @param match Objeto con condiciones WHERE (ej: {id: '...'})
 * @returns Promesa con {data, error} donde data es el row actualizado
 */
export async function updateWithConsistency<T = any>(
  client: SupabaseClient,
  table: string,
  updates: Record<string, any>,
  match: Record<string, any>
): Promise<{ data: T | null; error: any }> {

  const startTime = Date.now()
  console.log('[CONSISTENCY] Starting atomic UPDATE with RETURNING:', {
    table,
    updateFields: Object.keys(updates),
    matchFields: Object.keys(match),
    timestamp: new Date().toISOString()
  })

  // UPDATE con SELECT (RETURNING clause) en la misma operación
  // PostgREST ejecuta esto como una sola query SQL:
  // UPDATE table SET ... WHERE ... RETURNING *
  const { data, error } = await client
    .from(table)
    .update(updates)
    .match(match)
    .select()
    .single()

  const duration = Date.now() - startTime

  if (error) {
    console.error('[CONSISTENCY] ❌ Atomic update failed:', {
      table,
      error: error.message,
      code: error.code,
      duration: `${duration}ms`
    })
    return { data: null, error }
  }

  if (!data) {
    console.error('[CONSISTENCY] ❌ Update succeeded but no data returned (RLS issue?)')
    return {
      data: null,
      error: { message: 'No data returned - check RLS policies', code: 'NO_DATA' }
    }
  }

  console.log('[CONSISTENCY] ✅ Atomic update successful:', {
    table,
    recordId: (data as any).id?.slice(0, 8),
    duration: `${duration}ms`,
    returnedFields: Object.keys(data).length
  })

  // El valor en 'data' es GARANTIZADO el valor post-update
  // porque viene del RETURNING clause de la misma transacción SQL
  return { data: data as T, error: null }
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