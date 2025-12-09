/**
 * Calculate optimal font size for an element to fit within a maximum height
 *
 * @param {HTMLElement} element - The element to adjust
 * @param {number} maxHeight - Maximum allowed height in pixels
 * @param {number} maxFontSize - Starting/maximum font size
 * @param {number} minFontSize - Minimum font size (default: 8)
 * @returns {number} The calculated font size
 */
export function calculateOptimalFontSize(element, maxHeight, maxFontSize, minFontSize = 8) {
  if (!element) return maxFontSize

  let fontSize = maxFontSize
  element.style.fontSize = `${fontSize}pt`

  let iterations = 0
  const maxIterations = 100

  while (element.scrollHeight > maxHeight && fontSize > minFontSize && iterations < maxIterations) {
    fontSize -= 0.5
    element.style.fontSize = `${fontSize}pt`
    iterations++
  }

  return fontSize
}
