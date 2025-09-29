// apps/backoffice/lib/proveedorMatching.ts

/**
 * Calcula similitud entre dos strings usando algoritmo simple
 * basado en caracteres comunes y longitud
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  if (s1 === s2) return 1.0

  // Normalizar espacios y caracteres especiales
  const normalize = (s: string) => s
    .replace(/\s+/g, ' ')
    .replace(/[.,;:-]/g, '')
    .replace(/s\.?l\.?/gi, 'sl')
    .replace(/s\.?a\.?/gi, 'sa')
    .trim()

  const n1 = normalize(s1)
  const n2 = normalize(s2)

  if (n1 === n2) return 0.95

  // Levenshtein distance simplificado
  const maxLen = Math.max(n1.length, n2.length)
  if (maxLen === 0) return 1.0

  let matches = 0
  const minLen = Math.min(n1.length, n2.length)

  // Contar caracteres comunes en posiciones similares
  for (let i = 0; i < minLen; i++) {
    if (n1[i] === n2[i]) matches++
  }

  // Bonus por palabras comunes
  const words1 = n1.split(' ')
  const words2 = n2.split(' ')
  let wordMatches = 0

  for (const word1 of words1) {
    if (word1.length > 2) { // Solo palabras significativas
      for (const word2 of words2) {
        if (word1 === word2) {
          wordMatches++
          break
        }
      }
    }
  }

  const positionSimilarity = matches / maxLen
  const wordSimilarity = wordMatches / Math.max(words1.length, words2.length)

  // Combinación ponderada
  return (positionSimilarity * 0.6) + (wordSimilarity * 0.4)
}

/**
 * Busca el proveedor más similar en la lista existente
 * @param geminiProveedor - Nombre del proveedor extraído por Gemini
 * @param proveedoresExistentes - Lista de proveedores en la BD
 * @param umbralMinimo - Umbral mínimo de similitud (default: 0.75)
 * @returns Proveedor matched o null si no hay match suficiente
 */
export function matchProveedor(
  geminiProveedor: string,
  proveedoresExistentes: string[],
  umbralMinimo: number = 0.75
): { proveedor: string; similitud: number } | null {
  if (!geminiProveedor || !proveedoresExistentes.length) {
    return null
  }

  let mejorMatch: { proveedor: string; similitud: number } | null = null

  for (const proveedorExistente of proveedoresExistentes) {
    const similitud = calculateSimilarity(geminiProveedor, proveedorExistente)

    if (similitud >= umbralMinimo && (
      !mejorMatch || similitud > mejorMatch.similitud
    )) {
      mejorMatch = { proveedor: proveedorExistente, similitud }
    }
  }

  return mejorMatch
}

/**
 * Sugiere proveedores similares para mostrar al usuario
 * @param geminiProveedor - Nombre del proveedor extraído por Gemini
 * @param proveedoresExistentes - Lista de proveedores en la BD
 * @param maxSugerencias - Máximo número de sugerencias (default: 3)
 * @returns Lista de proveedores ordenados por similitud
 */
export function sugerirProveedores(
  geminiProveedor: string,
  proveedoresExistentes: string[],
  maxSugerencias: number = 3
): Array<{ proveedor: string; similitud: number }> {
  if (!geminiProveedor || !proveedoresExistentes.length) {
    return []
  }

  const similitudes = proveedoresExistentes
    .map(proveedor => ({
      proveedor,
      similitud: calculateSimilarity(geminiProveedor, proveedor)
    }))
    .filter(item => item.similitud > 0.3) // Filtrar similitudes muy bajas
    .sort((a, b) => b.similitud - a.similitud) // Ordenar descendente
    .slice(0, maxSugerencias)

  return similitudes
}

/**
 * Normaliza un nombre de proveedor para almacenamiento consistente
 * @param proveedor - Nombre del proveedor a normalizar
 * @returns Nombre normalizado
 */
export function normalizeProveedorName(proveedor: string): string {
  return proveedor
    .trim()
    .replace(/\s+/g, ' ') // Espacios múltiples a uno solo
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Separar camelCase
    .split(' ')
    .map(word =>
      // Capitalizar primera letra de cada palabra, excepto artículos
      ['de', 'del', 'la', 'el', 'y', 's.l.', 's.a.', 'sl', 'sa'].includes(word.toLowerCase())
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ')
    .replace(/\bS\.?L\.?\b/gi, 'S.L.') // Normalizar S.L.
    .replace(/\bS\.?A\.?\b/gi, 'S.A.') // Normalizar S.A.
}