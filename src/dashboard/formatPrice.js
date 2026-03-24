const ZERO_DECIMAL_CURRENCIES = ['JPY'];

export function currencyDecimals(currency) {
  return ZERO_DECIMAL_CURRENCIES.includes(currency) ? 0 : 2;
}

export function toSmallestUnit(value, currency) {
  const decimals = currencyDecimals(currency);
  return Math.round(value * Math.pow(10, decimals));
}

export function formatPrice(priceInSmallestUnit, currency) {
  if (priceInSmallestUnit === 0) return '';
  const decimals = currencyDecimals(currency);
  const value = priceInSmallestUnit / Math.pow(10, decimals);
  return new Intl.NumberFormat('en-US', {style: 'currency', currency}).format(value);
}
