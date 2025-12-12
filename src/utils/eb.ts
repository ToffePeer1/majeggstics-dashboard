// eb utils

// Farmer roles with colors for visualization and role calculation
export const FARMER_ROLES = [
  { oom: 0, name: 'Farmer I', color: '#d43500' },
  { oom: 1, name: 'Farmer II', color: '#d14400' },
  { oom: 2, name: 'Farmer III', color: '#cd5500' },
  { oom: 3, name: 'Kilofarmer I', color: '#ca6800' },
  { oom: 4, name: 'Kilofarmer II', color: '#c77a00' },
  { oom: 5, name: 'Kilofarmer III', color: '#c58a00' },
  { oom: 6, name: 'Megafarmer I', color: '#c49400' },
  { oom: 7, name: 'Megafarmer II', color: '#c39f00' },
  { oom: 8, name: 'Megafarmer III', color: '#c3a900' },
  { oom: 9, name: 'Gigafarmer I', color: '#c2b100' },
  { oom: 10, name: 'Gigafarmer II', color: '#c2ba00' },
  { oom: 11, name: 'Gigafarmer III', color: '#c2c200' },
  { oom: 12, name: 'Terafarmer I', color: '#aec300' },
  { oom: 13, name: 'Terafarmer II', color: '#99c400' },
  { oom: 14, name: 'Terafarmer III', color: '#85c600' },
  { oom: 15, name: 'Petafarmer I', color: '#51ce00' },
  { oom: 16, name: 'Petafarmer II', color: '#16dc00' },
  { oom: 17, name: 'Petafarmer III', color: '#00ec2e' },
  { oom: 18, name: 'Exafarmer I', color: '#00fa68' },
  { oom: 19, name: 'Exafarmer II', color: '#0afc9c' },
  { oom: 20, name: 'Exafarmer III', color: '#1cf7ca' },
  { oom: 21, name: 'Zettafarmer I', color: '#2af3eb' },
  { oom: 22, name: 'Zettafarmer II', color: '#35d9f0' },
  { oom: 23, name: 'Zettafarmer III', color: '#40bced' },
  { oom: 24, name: 'Yottafarmer I', color: '#46a8eb' },
  { oom: 25, name: 'Yottafarmer II', color: '#4a9aea' },
  { oom: 26, name: 'Yottafarmer III', color: '#4e8dea' },
  { oom: 27, name: 'Xennafarmer I', color: '#527ce9' },
  { oom: 28, name: 'Xennafarmer II', color: '#5463e8' },
  { oom: 29, name: 'Xennafarmer III', color: '#6155e8' },
  { oom: 30, name: 'Weccafarmer I', color: '#7952e9' },
  { oom: 31, name: 'Weccafarmer II', color: '#8b4fe9' },
  { oom: 32, name: 'Weccafarmer III', color: '#9d4aeb' },
  { oom: 33, name: 'Vendafarmer I', color: '#b343ec' },
  { oom: 34, name: 'Vendafarmer II', color: '#d636ef' },
  { oom: 35, name: 'Vendafarmer III', color: '#f327e5' },
  { oom: 36, name: 'Uadafarmer I', color: '#f915ba' },
  { oom: 37, name: 'Uadafarmer II', color: '#fc0a9c' },
  { oom: 38, name: 'Uadafarmer III', color: '#ff007d' },
  { oom: 39, name: 'Treidafarmer I', color: '#f7005d' },
  { oom: 40, name: 'Treidafarmer II', color: '#f61fd2' },
  { oom: 41, name: 'Treidafarmer III', color: '#9c4aea' },
  { oom: 42, name: 'Quadafarmer I', color: '#5559e8' },
  { oom: 43, name: 'Quadafarmer II', color: '#4a9deb' },
  { oom: 44, name: 'Quadafarmer III', color: '#2df0f2' },
  { oom: 45, name: 'Pendafarmer I', color: '#00f759' },
  { oom: 46, name: 'Pendafarmer II', color: '#7ec700' },
  { oom: 47, name: 'Pendafarmer III', color: '#c2bf00' },
  { oom: 48, name: 'Exedafarmer I', color: '#c3a000' },
  { oom: 49, name: 'Exedafarmer II', color: '#c87200' },
  { oom: 50, name: 'Exedafarmer III', color: '#d43500' },
  { oom: 51, name: 'Infinifarmer I', color: '#546e7a' },
] as const;

export type FarmerRoleName = typeof FARMER_ROLES[number]['name'];
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

  // If it's too high, consider it as 'Infinifarmer I' (last one)
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