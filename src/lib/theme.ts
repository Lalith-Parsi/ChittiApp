export interface ThemeColors {
  bg: string;
  card: string;
  header: string;
  border: string;
  inputBg: string;
  inputBorder: string;
  text: string;
  textSub: string;
  textMuted: string;
  textHint: string;
  primary: string;
  primaryLight: string;
  primaryText: string;
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
  bg:           '#F5F5FF',
  card:         '#FFFFFF',
  header:       '#FFFFFF',
  border:       '#EFEFEF',
  inputBg:      '#FAFAFF',
  inputBorder:  '#E8E8F0',
  text:         '#1A1A1A',
  textSub:      '#555555',
  textMuted:    '#888888',
  textHint:     '#BBBBBB',
  primary:      '#4F46E5',
  primaryLight: '#EEF2FF',
  primaryText:  '#4F46E5',
  success:      '#34C759',
  successLight: '#F0FFF4',
  warning:      '#FF9500',
  warningLight: '#FFF8EE',
  danger:       '#FF3B30',
  dangerLight:  '#FFF0F0',
  statBg:       '#F8F8FF',
  overlay:      'rgba(0,0,0,0.5)',
};

export const dark: ThemeColors = {
  bg:           '#0F0F1A',
  card:         '#1C1C2E',
  header:       '#16162A',
  border:       '#2A2A40',
  inputBg:      '#1A1A2E',
  inputBorder:  '#333355',
  text:         '#EDEDFF',
  textSub:      '#AAAABB',
  textMuted:    '#777788',
  textHint:     '#44445A',
  primary:      '#7C73FF',
  primaryLight: '#1E1B4B',
  primaryText:  '#9D97FF',
  success:      '#34D058',
  successLight: '#0B2818',
  warning:      '#FF9F0A',
  warningLight: '#231500',
  danger:       '#FF453A',
  dangerLight:  '#200A08',
  statBg:       '#1A1A2E',
  overlay:      'rgba(0,0,0,0.75)',
};

export const fonts = {
  regular:   { fontFamily: 'Inter_400Regular'  } as const,
  medium:    { fontFamily: 'Inter_500Medium'   } as const,
  semiBold:  { fontFamily: 'Inter_600SemiBold' } as const,
  bold:      { fontFamily: 'Inter_700Bold'     } as const,
  extraBold: { fontFamily: 'Inter_800ExtraBold'} as const,
};
