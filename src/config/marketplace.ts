export const MARKETPLACE_ADDRESS = import.meta.env.VITE_MARKETPLACE_ADDRESS as string | undefined;

export const MARKETPLACE_MODULE = MARKETPLACE_ADDRESS
  ? `${MARKETPLACE_ADDRESS}::marketplace_v3`
  : '';

export const LEGACY_MARKETPLACE_MODULE = MARKETPLACE_ADDRESS
  ? `${MARKETPLACE_ADDRESS}::marketplace_v2`
  : '';

export const isMarketplaceConfigured = Boolean(MARKETPLACE_ADDRESS);

export const toOctas = (aptAmount: string) => {
  const [wholePart, fractionalPart = ''] = aptAmount.trim().split('.');
  const whole = BigInt(wholePart || '0') * 100_000_000n;
  const fractional = BigInt((fractionalPart + '00000000').slice(0, 8));
  return (whole + fractional).toString();
};

export const getMarketplaceFunction = (name: 'list' | 'buy' | 'delist', moduleName = MARKETPLACE_MODULE) => {
  if (!moduleName) return '';
  return `${moduleName}::${name}`;
};
