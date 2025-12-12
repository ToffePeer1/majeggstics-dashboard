// eb utils

// Farmer roles with colors for visualization and role calculation
export const FARMER_ROLES = [
  { oom: 0, name: 'Farmer I', color: '#d43500' },
  { oom: 1, name: 'Farmer I', color: '#d14400' },
  { oom: 2, name: 'Farmer I', color: '#cd5500' },
  { oom: 3, name: 'Farmer II', color: '#ca6800' },
  { oom: 4, name: 'Farmer III', color: '#c77a00' },
  { oom: 5, name: 'Kilofarmer I', color: '#c58a00' },
  { oom: 6, name: 'Kilofarmer II', color: '#c49400' },
  { oom: 7, name: 'Kilofarmer III', color: '#c39f00' },
  { oom: 8, name: 'Megafarmer I', color: '#c3a900' },
  { oom: 9, name: 'Megafarmer II', color: '#c2b100' },
  { oom: 10, name: 'Megafarmer III', color: '#c2ba00' },
  { oom: 11, name: 'Gigafarmer I', color: '#c2c200' },
  { oom: 12, name: 'Gigafarmer II', color: '#aec300' },
  { oom: 13, name: 'Gigafarmer III', color: '#99c400' },
  { oom: 14, name: 'Terafarmer I', color: '#85c600' },
  { oom: 15, name: 'Terafarmer II', color: '#51ce00' },
  { oom: 16, name: 'Terafarmer III', color: '#16dc00' },
  { oom: 17, name: 'Petafarmer I', color: '#00ec2e' },
  { oom: 18, name: 'Petafarmer II', color: '#00fa68' },
  { oom: 19, name: 'Petafarmer III', color: '#0afc9c' },
  { oom: 20, name: 'Exafarmer I', color: '#1cf7ca' },
  { oom: 21, name: 'Exafarmer II', color: '#2af3eb' },
  { oom: 22, name: 'Exafarmer III', color: '#35d9f0' },
  { oom: 23, name: 'Zettafarmer I', color: '#40bced' },
  { oom: 24, name: 'Zettafarmer II', color: '#46a8eb' },
  { oom: 25, name: 'Zettafarmer III', color: '#4a9aea' },
  { oom: 26, name: 'Yottafarmer I', color: '#4e8dea' },
  { oom: 27, name: 'Yottafarmer II', color: '#527ce9' },
  { oom: 28, name: 'Yottafarmer III', color: '#5463e8' },
  { oom: 29, name: 'Xennafarmer I', color: '#6155e8' },
  { oom: 30, name: 'Xennafarmer II', color: '#7952e9' },
  { oom: 31, name: 'Xennafarmer III', color: '#8b4fe9' },
  { oom: 32, name: 'Weccafarmer I', color: '#9d4aeb' },
  { oom: 33, name: 'Weccafarmer II', color: '#b343ec' },
  { oom: 34, name: 'Weccafarmer III', color: '#d636ef' },
  { oom: 35, name: 'Vendafarmer I', color: '#f327e5' },
  { oom: 36, name: 'Vendafarmer II', color: '#f915ba' },
  { oom: 37, name: 'Vendafarmer III', color: '#fc0a9c' },
  { oom: 38, name: 'Uadafarmer I', color: '#ff007d' },
  { oom: 39, name: 'Uadafarmer II', color: '#f7005d' },
  { oom: 40, name: 'Uadafarmer III', color: '#f61fd2' },
  { oom: 41, name: 'Infinifarmer', color: '#546e7a' },
] as const;

/**
 * Calculate farmer role from EB value
 */
export function EBtoRole(eb: number): string {
  let power = -1;
  let ebCopy = eb;
  while (ebCopy >= 1) {
    ebCopy /= 10;
    power++;
  }

  // If it's too high, consider it as 'Infinifarmer' (last one)
  const ind = Math.min(Math.max(power, 0), FARMER_ROLES.length - 1);
  return FARMER_ROLES[ind].name;
}

/**
 * Get color for a given EB value based on farmer role
 */
export function getColorForEB(eb: number): string {
  let power = -1;
  let ebCopy = eb;
  while (ebCopy >= 1) {
    ebCopy /= 10;
    power++;
  }

  const oom = Math.min(Math.max(power, 0), FARMER_ROLES.length - 1);
  return FARMER_ROLES[oom].color;
}