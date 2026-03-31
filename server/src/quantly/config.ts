/**
 * Quantly integration env: QUANTLY_URL (base, no trailing path) and QUANTLI_API_KEY (X-Api-Key).
 */
export type QuantlyConfig = {
  quantlyUrl: string;
  quantliApiKey: string;
};

export function getQuantlyConfig(): QuantlyConfig | null {
  const quantlyUrl = process.env.QUANTLY_URL?.trim();
  const quantliApiKey = process.env.QUANTLI_API_KEY?.trim();
  if (!quantlyUrl || !quantliApiKey) return null;
  return { quantlyUrl, quantliApiKey };
}
