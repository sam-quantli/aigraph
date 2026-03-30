export interface ColorAdjustOptions {
  lighten?: number
  darken?: number
  lightness?: number
  opacity?: number
}

export function adjustColor(
  color: string,
  _options?: ColorAdjustOptions
): string {
  return color
}
