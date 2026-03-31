export type StockCandleDTO = {
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  v?: number;
  t?: string;
};

export type GetSymbolCandlesResponseDTO = {
  symbolCode: string;
  timeRange: string;
  candles: StockCandleDTO[];
};
