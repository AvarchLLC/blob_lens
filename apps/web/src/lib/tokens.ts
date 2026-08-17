export const TOKEN_SYMBOLS: Record<string, string> = {
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
  "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": "WBTC",
  "0x6982508145454ce325ddbe47a25d4ec3d2311933": "PEPE",
  "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce": "SHIB",
  "0x514910771af9ca656af840dff83e8264ecf986ca": "LINK",
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": "UNI",
  "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9": "AAVE",
  "0xae78736cd615f374d3085123a210448e74fc6393": "rETH",
  "0xbe9895146f7af43049ca1c1ae358b0541ea49704": "cbETH",
  "0xd533a949740bb3306d119cc777fa900ba034cd52": "CRV",
  "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2": "MKR",
  "0xaaee1a9723aadb7afa2810263653a34ba2c21c7a": "Mog",
};

export function tokenSymbol(addr: string): string {
  if (!addr) return "?";
  return TOKEN_SYMBOLS[addr.toLowerCase()] ?? addr.slice(0, 6);
}

export function fmtUsd(val: number | undefined): string {
  if (!val) return "$0";
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

export function fmtK(val: number | undefined): string {
  if (!val) return "0";
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
  return String(val);
}
