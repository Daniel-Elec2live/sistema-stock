import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formateo de precios
export function formatPrice(
  price: number,
  currency: string = 'EUR',
  locale: string = 'es-ES'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price)
}

// Formateo de fechas
export function formatDate(
  date: string | Date,
  locale: string = 'es-ES',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, options).format(dateObj)
}

// Formateo de fecha y hora
export function formatDateTime(
  date: string | Date,
  locale: string = 'es-ES'
): string {
  return formatDate(date, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Formateo de fecha relativa (hace X tiempo)
export function formatRelativeTime(
  date: string | Date,
  locale: string = 'es-ES'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second')
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute')
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour')
  } else if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day')
  } else if (diffInSeconds < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month')
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year')
  }
}

// Formateo de números con separadores
export function formatNumber(
  number: number,
  locale: string = 'es-ES'
): string {
  return new Intl.NumberFormat(locale).format(number)
}

// Slugify para URLs
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remover caracteres especiales
    .replace(/[\s_-]+/g, '-') // Reemplazar espacios y guiones por un solo guión
    .replace(/^-+|-+$/g, '') // Remover guiones al inicio y final
}

// Capitalizar primera letra
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

// Capitalizar cada palabra
export function capitalizeWords(text: string): string {
  return text
    .split(' ')
    .map(word => capitalize(word))
    .join(' ')
}

// Truncar texto
export function truncate(text: string, length: number, suffix: string = '...'): string {
  if (text.length <= length) return text
  return text.slice(0, length) + suffix
}

// Debounce para búsquedas
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle para eventos
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Generar ID único
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2)
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`
}

// Validar si una string es un email válido
export function isEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validar si una string es un teléfono válido (España)
export function isSpanishPhone(phone: string): boolean {
  const phoneRegex = /^(\+34|0034|34)?[6789]\d{8}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

// Limpiar número de teléfono
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

// Formatear teléfono español
export function formatSpanishPhone(phone: string): string {
  const cleaned = cleanPhoneNumber(phone)
  const match = cleaned.match(/^(\+34|34)?([6789]\d{8})$/)
  
  if (match) {
    const number = match[2]
    return `+34 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`
  }
  
  return phone // Devolver original si no es válido
}

// Obtener iniciales de un nombre
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Calcular porcentaje
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

// Formatear porcentaje
export function formatPercentage(
  value: number,
  total: number,
  decimals: number = 1
): string {
  const percentage = total === 0 ? 0 : (value / total) * 100
  return `${percentage.toFixed(decimals)}%`
}

// Generar color aleatorio para avatares
export function generateAvatarColor(seed: string): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#06b6d4',
    '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
    '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
  ]
  
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return colors[Math.abs(hash) % colors.length]
}

// Verificar si un elemento está en viewport
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}

// Scroll suave a un elemento
export function scrollToElement(
  element: HTMLElement | string,
  offset: number = 0
): void {
  const targetElement = typeof element === 'string' 
    ? document.getElementById(element) 
    : element
    
  if (targetElement) {
    const elementPosition = targetElement.offsetTop - offset
    window.scrollTo({
      top: elementPosition,
      behavior: 'smooth'
    })
  }
}

// Copiar texto al portapapeles
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('Error copying to clipboard:', error)
    return false
  }
}

// Función para manejar errores de forma consistente
export function handleError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Ha ocurrido un error inesperado'
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Función para convertir File a base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })
}

// Función para descargar archivo
export function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}