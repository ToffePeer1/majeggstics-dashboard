// Utility functions for formatting large numbers

const LETTERS: Record<number, string> = {
  0: '',
  3: 'k',
  6: 'M',
  9: 'B',
  12: 'T',
  15: 'q',
  18: 'Q',
  21: 's',
  24: 'S',
  27: 'o',
  30: 'N',
  33: 'd',
  36: 'U',
  39: 'D',
  42: 'Td',
  45: 'qd',
  48: 'Qd',
  51: 'sd',
  54: 'Sd',
  57: 'Od',
  60: 'Nd',
  63: 'V',
  66: 'uV',
  69: 'dV',
  72: 'tV',
  75: 'qV',
  78: 'QV',
  81: 'sV',
  84: 'SV',
  87: 'OV',
  90: 'NV',
  93: 'tT',
};

export function bigNumberToString(
  number: number | null | undefined,
  decimals: number = 3,
  strLen?: number,
  trimZeros: boolean = false
): string {
  if (number === null || number === undefined) {
    return 'N/A';
  }

  if (isNaN(number)) {
    return 'NaN';
  }

  if (!isFinite(number)) {
    return 'Inf';
  }

  if (number < 0) {
    return '-' + bigNumberToString(-number, decimals, strLen ? strLen - 1 : undefined, trimZeros);
  }

  if (number === 0) {
    return '0';
  }

  if (number < 1000) {
    let numStr = number.toFixed(decimals);
    if (strLen) {
      numStr = numStr.slice(0, strLen);
      if (numStr.endsWith('.')) {
        numStr = numStr.replace('.', '');
      }
    }
    return numStr;
  }

  // Calculate power of 10
  let power = 0;
  while (number >= 10) {
    number /= 10;
    power += 1;
  }

  // Find the nearest suffix
  while (!(power in LETTERS)) {
    number *= 10;
    power -= 1;
  }

  if (strLen) {
    const integerPart = Math.floor(number);
    const integerLength = integerPart.toString().length;
    const availableDecimals = Math.max(0, strLen - integerLength - 1);
    const roundedDecimals = Math.min(availableDecimals, decimals);
    let numStr = number.toFixed(roundedDecimals);

    if (trimZeros && numStr.includes('.')) {
      numStr = numStr.replace(/\.?0+$/, '');
    }

    if (numStr.includes('.') && numStr.length > strLen) {
      numStr = numStr.replace(/0+$/, '');
      if (numStr.endsWith('.')) {
        numStr += '0';
      }
    }

    return numStr + LETTERS[power];
  }

  return number.toFixed(decimals) + LETTERS[power];
}

export function formatEbValue(value: number | null | undefined, decimals: number = 3): string {
  if (value === null || value === undefined) {
    return '';
  }

  try {
    return bigNumberToString(value, decimals) + '%';
  } catch {
    return String(value);
  }
}

export function formatSeValue(value: number | null | undefined, decimals: number = 3): string {
  if (value === null || value === undefined) {
    return '';
  }

  try {
    return bigNumberToString(value, decimals);
  } catch {
    return String(value);
  }
}

export function formatScientificNotation(value: number | null | undefined, precision: number = 3): string {
  if (value === null || value === undefined) {
    return '';
  }

  try {
    return value.toExponential(precision);
  } catch {
    return String(value);
  }
}

export function formatLargeNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  try {
    if (Math.abs(value) >= 1e15) {
      return formatScientificNotation(value);
    }
    return Math.floor(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  try {
    return Math.floor(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export function formatPercentage(value: number | null | undefined, precision: number = 2): string {
  if (value === null || value === undefined) {
    return '';
  }

  try {
    return (value * 100).toFixed(precision) + '%';
  } catch {
    return String(value);
  }
}

/**
 * Format an ISO 8601 date string into a more readable format
 * @param dateString ISO 8601 date string
 * @returns Formatted date string
 * 
 * @example
 * formatLastUpdated('2024-08-15T14:30:00Z') // "August 15th, 2:30 PM"
 */
export function formatLastUpdated(dateString: string): string {
  const date = new Date(dateString);
  
  const month = date.toLocaleString(undefined, { month: 'long' });
  const day = date.getDate();
  
  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  
  const time = date.toLocaleString(undefined, { 
    hour: 'numeric', 
    minute: '2-digit',
  });
  
  return `${month} ${ordinal(day)}, ${time}`;
}