import { toast } from '@/components/ui/toast'

// Helper functions for common toast messages
export const showToast = {
  success: (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: 'success',
      duration: 3000
    })
  },

  error: (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: 'destructive',
      duration: 5000
    })
  },

  warning: (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: 'warning',
      duration: 4000
    })
  },

  info: (title: string, description?: string) => {
    toast({
      title,
      description,
      variant: 'info',
      duration: 3000
    })
  },

  // Specific app messages
  auth: {
    loginSuccess: () => showToast.success('¡Bienvenido!', 'Has iniciado sesión correctamente'),
    loginError: (error?: string) => showToast.error('Error de inicio de sesión', error || 'Credenciales incorrectas'),
    registerSuccess: () => showToast.success('Registro exitoso', 'Tu cuenta está pendiente de aprobación'),
    registerError: (error?: string) => showToast.error('Error en el registro', error),
    logoutSuccess: () => showToast.info('Sesión cerrada', 'Has cerrado sesión correctamente')
  },

  cart: {
    itemAdded: (productName: string) => showToast.success('Producto agregado', `${productName} se agregó al carrito`),
    itemRemoved: (productName: string) => showToast.info('Producto eliminado', `${productName} se eliminó del carrito`),
    itemUpdated: (productName: string) => showToast.info('Cantidad actualizada', `Se actualizó la cantidad de ${productName}`),
    cartCleared: () => showToast.info('Carrito vacío', 'Se eliminaron todos los productos del carrito'),
    stockInsufficient: (productName: string) => showToast.warning('Stock insuficiente', `No hay suficiente stock de ${productName}`)
  },

  order: {
    created: (orderId: string) => showToast.success('Pedido creado', `Tu pedido ${orderId.slice(0, 8)} se ha creado correctamente`),
    createError: (error?: string) => showToast.error('Error al crear pedido', error || 'No se pudo procesar tu pedido'),
    cancelled: (orderId: string) => showToast.info('Pedido cancelado', `El pedido ${orderId.slice(0, 8)} ha sido cancelado`),
    cancelError: (error?: string) => showToast.error('Error al cancelar', error || 'No se pudo cancelar el pedido')
  },

  network: {
    offline: () => showToast.warning('Sin conexión', 'Comprueba tu conexión a internet'),
    reconnected: () => showToast.success('Conexión restablecida', 'Ya puedes seguir navegando'),
    serverError: () => showToast.error('Error del servidor', 'Inténtalo de nuevo más tarde')
  }
}