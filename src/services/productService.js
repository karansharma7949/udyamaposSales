import { createClient } from '@/lib/supabase/client'

/**
 * Service for handling product-related data operations with points per unit.
 */
export const productService = {
  async getActiveProducts() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('product_name', { ascending: true })

    if (error) throw error
    return data || []
  },

  async getAllProducts({ search = '', category = '' }) {
    const supabase = createClient()
    let query = supabase
      .from('products')
      .select('*')

    if (search) {
      query = query.or(`product_name.ilike.%${search}%,product_code.ilike.%${search}%`)
    }
    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async getProductById(id) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createProduct(productData) {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single()

      if (!error) return data
      if (error && error.code === 'PGRST204') {
        // points_per_unit column not yet in DB schema
        const { points_per_unit, ...rest } = productData
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('products')
          .insert([rest])
          .select()
          .single()

        if (fallbackError) throw fallbackError
        return fallbackData
      }
      throw error
    } catch (err) {
      throw err
    }
  },

  async updateProduct(id, updates) {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (!error) return data
      if (error && error.code === 'PGRST204') {
        const { points_per_unit, ...rest } = updates
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('products')
          .update(rest)
          .eq('id', id)
          .select()
          .single()

        if (fallbackError) throw fallbackError
        return fallbackData
      }
      throw error
    } catch (err) {
      throw err
    }
  },

  async toggleProductStatus(id, currentStatus) {
    return this.updateProduct(id, { is_active: !currentStatus })
  },

  async deleteProduct(id) {
    const supabase = createClient()
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  },
}
