
export interface TradingSymbol {
  symbol: string;
  name: string;
  category: 'Forex' | 'Crypto' | 'Futures' | 'Stock' | 'Index';
}

export const TRADING_SYMBOLS: TradingSymbol[] = [
  { symbol: 'XAUUSD', name: 'Gold / U.S. Dollar', category: 'Forex' },
  { symbol: 'BTCUSD', name: 'Bitcoin / U.S. Dollar', category: 'Crypto' },
  { symbol: 'ETHUSD', name: 'Ethereum / U.S. Dollar', category: 'Crypto' },
  { symbol: 'EURUSD', name: 'Euro / U.S. Dollar', category: 'Forex' },
  { symbol: 'GBPUSD', name: 'British Pound / U.S. Dollar', category: 'Forex' },
  { symbol: 'USDJPY', name: 'U.S. Dollar / Japanese Yen', category: 'Forex' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', category: 'Stock' },
  { symbol: 'NQUSD', name: 'Nasdaq 100', category: 'Futures' },
  { symbol: 'GC', name: 'Gold Futures', category: 'Futures' },
  { symbol: 'MGC', name: 'Micro Gold Futures', category: 'Futures' },
  { symbol: 'NQ', name: 'Nasdaq 100 Futures', category: 'Futures' },
  { symbol: 'MNQ', name: 'Micro Nasdaq 100 Futures', category: 'Futures' },
  { symbol: 'US30', name: 'Dow Jones 30', category: 'Index' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / U.S. Dollar', category: 'Forex' },
  { symbol: 'USDCAD', name: 'U.S. Dollar / Canadian Dollar', category: 'Forex' },
  { symbol: 'SOLUSD', name: 'Solana / U.S. Dollar', category: 'Crypto' },
];
