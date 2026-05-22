/**
 * ChittiApp design tokens — "Ledger green on paper warmth"
 *
 * Light = warm paper surfaces (#FAF7F0) with deep ledger green primary (#0F5132).
 * Dark  = warm near-black ink (#0E1410) with brighter ledger green (#2A8A5F).
 * Brass accent (#C9A24B) is reserved for receipt / "math verified" moments only.
 *
 * Maps the Claude Design tokens.css palette onto the existing ThemeColors shape so
 * legacy screens keep compiling. Two additive fields — `accent` and `divider2` —
 * are used by the redesigned LoginScreen and HomeScreen.
 */

export interface ThemeColors {
  bg: string;
  card: string;
  header: string;
  border: string;
  divider2: string;
  inputBg: string;
  inputBorder: string;
  text: string;
  textSub: string;
  textMuted: string;
  textHint: string;
  primary: string;
  primaryLight: string;
  primaryText: string;
  accent: string;
  accentLight: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  statBg: string;
  overlay: string;
}

export const light: ThemeColors = {
  bg:           '#FAF7F0',
  card:         '#F2EDE2',
  header:       '#FAF7F0',
  border:       '#E7E1D2',
  divider2:     '#D7CFBC',
  inputBg:      '#F2EDE2',
  inputBorder:  '#D7CFBC',
  text:         '#1A1714',
  textSub:      '#4A4239',
  textMuted:    '#7A7062',
  textHint:     '#B6AC93',
  primary:      '#0F5132',
  primaryLight: '#DCEEE4',
  primaryText:  '#0F5132',
  accent:       '#C9A24B',
  accentLight:  '#F5E7C2',
  success:      '#0F5132',
  successLight: '#DCEEE4',
  warning:      '#6B4F11',
  warningLight: '#F4E6C3',
  danger:       '#8C3A26',
  dangerLight:  '#F2DAD3',
  statBg:       '#F2EDE2',
  overlay:      'rgba(14, 20, 16, 0.55)',
};

export const dark: ThemeColors = {
  bg:           '#0E1410',
  card:         '#1A2520',
  header:       '#0E1410',
  border:       '#22302A',
  divider2:     '#2B3C34',
  inputBg:      '#1A2520',
  inputBorder:  '#2B3C34',
  text:         '#ECE8DD',
  textSub:      '#B5AE9F',
  textMuted:    '#807767',
  textHint:     '#4D4A41',
  primary:      '#2A8A5F',
  primaryLight: '#16352A',
  primaryText:  '#7CC79E',
  accent:       '#C9A24B',
  accentLight:  '#3A3018',
  success:      '#7CC79E',
  successLight: '#16352A',
  warning:      '#E5C57A',
  warningLight: '#3A3018',
  danger:       '#E5A89A',
  dangerLight:  '#3A1D15',
  statBg:       '#1A2520',
  overlay:      'rgba(0, 0, 0, 0.6)',
};

export const fonts = {
  regular:   { fontFamily: 'Inter_400Regular'  } as const,
  medium:    { fontFamily: 'Inter_500Medium'   } as const,
  semiBold:  { fontFamily: 'Inter_600SemiBold' } as const,
  bold:      { fontFamily: 'Inter_700Bold'     } as const,
  extraBold: { fontFamily: 'Inter_800ExtraBold'} as const,
};

/**
 * Tabular numbers helper. Apply to any Text that displays an amount, phone
 * number, OTP digit, or cycle counter so columns of figures align.
 */
export const tnum = {
  fontVariant: ['tabular-nums' as const],
};

/**
 * Indian-system number formatting: 100000 → "1,00,000".
 * Used by every ₹ amount displayed in the UI.
 */
export function fmtINR(n: number): string {
  if (n == null || isNaN(n)) return '0';
  const s = Math.abs(Math.trunc(n)).toString();
  if (s.length <= 3) return (n < 0 ? '-' : '') + s;
  const last3 = s.slice(-3);
  const rest  = s.slice(0, -3);
  const restWithCommas = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + restWithCommas + ',' + last3;
}
