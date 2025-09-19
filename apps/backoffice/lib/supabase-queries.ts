// apps/backoffice/lib/supabase-queries.ts
// Ejemplos específicos de queries para Supabase
import { createSupabaseClient } from './supabase'
import { Product, Entry, Alert } from './types'

export class SupabaseQueries {
  private supabase = createSupabaseClient()

  // Productos con stock bajo
  async getProductsWithLowStock(limit = 10): Promise<Product[]> {
    // Obtener todos los productos y filtrar en memoria
    const { data, error } = await this.supabase
      .from('products')
      .select(`
        *,
        batches (
          id,
          cantidad,
          caducidad,
          precio_compra
        )
      `)

    if (error) throw error
    
    // Filtrar productos con stock bajo
    const lowStockProducts = (data || [])
      .filter(product => product.stock_actual < product.stock_minimo)
      .sort((a, b) => a.stock_actual - b.stock_actual)
      .slice(0, limit)

    return lowStockProducts
  }

  // Productos próximos a caducar
  async getProductsNearExpiry(days = 7): Promise<any[]> {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)
    
    const { data, error } = await this.supabase
      .from('batches')
      .select(`
        *,
        products (
          id,
          nombre,
          unidad
        )
      `)
      .lte('caducidad', futureDate.toISOString().split('T')[0])
      .gt('cantidad', 0)
      .order('caducidad', { ascending: true })

    if (error) throw error
    return data || []
  }

  // Crear entrada con productos
  async createEntryWithProducts(entry: Partial<Entry>, products: any[]): Promise<Entry> {
    const { data: entryData, error: entryError } = await this.supabase
      .from('entradas')
      .insert({
        tipo: entry.tipo,
        estado: entry.estado || 'completada',
        proveedor: entry.proveedor,
        fecha: entry.fecha,
        productos: products
      })
      .select()
      .single()

    if (entryError) throw entryError

    // Actualizar stock para cada producto
    for (const producto of products) {
      await this.updateProductStock(producto)
    }

    return entryData
  }

  // Actualizar stock de producto
  private async updateProductStock(producto: any): Promise<void> {
    // 1. Buscar o crear producto
    let { data: existingProduct } = await this.supabase
      .from('products')
      .select('id, stock_actual')
      .eq('nombre', producto.nombre)
      .single()

    if (!existingProduct) {
      const { data: newProduct, error } = await this.supabase
        .from('products')
        .insert({
          nombre: producto.nombre,
          unidad: producto.unidad,
          stock_minimo: 5,
          stock_actual: 0
        })
        .select()
        .single()

      if (error) throw error
      existingProduct = newProduct
    }

    // Verificar que tenemos un producto válido
    if (!existingProduct) {
      throw new Error(`Error: No se pudo obtener o crear el producto ${producto.nombre}`)
    }

    // 2. Crear lote si hay caducidad
    if (producto.caducidad) {
      await this.supabase
        .from('batches')
        .insert({
          product_id: existingProduct.id,
          cantidad: producto.cantidad,
          caducidad: producto.caducidad,
          precio_compra: producto.precio || 0
        })
    }

    // 3. Actualizar stock global usando función RPC
    await this.supabase.rpc('increment_stock', {
      product_id: existingProduct.id,
      amount: producto.cantidad
    })
  }

  // Obtener KPIs del dashboard
  async getDashboardKPIs(): Promise<any> {
    const [
      { count: totalProducts },
      { data: allProducts },
      { data: expiringBatches },
      { data: recentEntries }
    ] = await Promise.all([
      this.supabase.from('products').select('*', { count: 'exact', head: true }),
      this.supabase.from('products').select('id, stock_actual, stock_minimo'),
      this.supabase.from('batches').select('id').lte('caducidad', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).gt('cantidad', 0),
      this.supabase.from('entradas').select('*').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    ])

    // Filtrar productos con stock bajo en memoria
    const lowStockProducts = (allProducts || []).filter(p => p.stock_actual < p.stock_minimo)

    return {
      totalProducts: totalProducts || 0,
      lowStockCount: lowStockProducts.length,
      expiringCount: expiringBatches?.length || 0,
      monthlyEntries: recentEntries?.length || 0
    }
  }

  // Generar alertas automáticas
  async generateAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = []

    // Alertas de stock bajo
    const lowStockProducts = await this.getProductsWithLowStock(50)
    for (const product of lowStockProducts) {
      alerts.push({
        id: `stock-${product.id}`,
        tipo: 'stock_bajo',
        prioridad: product.stock_actual === 0 ? 'alta' : 'media',
        titulo: 'Stock crítico',
        descripcion: `${product.nombre}: ${product.stock_actual} ${product.unidad} (mín: ${product.stock_minimo})`,
        fecha: new Date().toISOString().split('T')[0],
        product_id: product.id
      })
    }

    // Alertas de caducidad
    const expiringProducts = await this.getProductsNearExpiry(7)
    for (const batch of expiringProducts) {
      const daysUntilExpiry = Math.ceil((new Date(batch.caducidad).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      alerts.push({
        id: `expiry-${batch.id}`,
        tipo: 'caducidad',
        prioridad: daysUntilExpiry <= 3 ? 'alta' : 'media',
        titulo: 'Próxima caducidad',
        descripcion: `${batch.products?.nombre}: caduca en ${daysUntilExpiry} días`,
        fecha: new Date().toISOString().split('T')[0],
        batch_id: batch.id
      })
    }

    return alerts
  }

  // Búsqueda de productos con filtros
  async searchProducts(filters: {
    search?: string
    categoria?: string
    stockStatus?: 'low' | 'ok' | 'critical'
    limit?: number
    offset?: number
  }): Promise<{ products: Product[], count: number }> {
    let query = this.supabase
      .from('products')
      .select(`
        *,
        batches (
          id,
          cantidad,
          caducidad,
          precio_compra
        )
      `, { count: 'exact' })

    if (filters.search) {
      query = query.or(`nombre.ilike.%${filters.search}%,proveedor.ilike.%${filters.search}%`)
    }

    if (filters.categoria) {
      query = query.eq('categoria', filters.categoria)
    }

    // Para los filtros de stock, obtenemos todos los datos y filtramos en memoria
    let finalQuery = query.order('nombre')

    if (!filters.stockStatus) {
      finalQuery = finalQuery.range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1)
    }

    const { data, error, count } = await finalQuery

    if (error) throw error

    let filteredProducts = data || []

    // Aplicar filtros de stock en memoria
    if (filters.stockStatus === 'low') {
      filteredProducts = filteredProducts.filter(p => p.stock_actual < p.stock_minimo && p.stock_actual > 0)
    } else if (filters.stockStatus === 'critical') {
      filteredProducts = filteredProducts.filter(p => p.stock_actual === 0)
    } else if (filters.stockStatus === 'ok') {
      filteredProducts = filteredProducts.filter(p => p.stock_actual >= p.stock_minimo)
    }

    // Aplicar paginación si se filtró por stock
    if (filters.stockStatus) {
      const start = filters.offset || 0
      const end = start + (filters.limit || 50)
      filteredProducts = filteredProducts.slice(start, end)
    }

    return {
      products: filteredProducts,
      count: filters.stockStatus ? filteredProducts.length : (count || 0)
    }
  }
}

// Instancia singleton para usar en toda la app
export const supabaseQueries = new SupabaseQueries()