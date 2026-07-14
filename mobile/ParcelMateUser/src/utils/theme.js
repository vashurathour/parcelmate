export const colors = {
  purple:   '#534AB7',
  purpleD:  '#3C3489',
  purpleL:  '#EEEDFE',
  teal:     '#1D9E75',
  tealL:    '#E1F5EE',
  amber:    '#BA7517',
  amberL:   '#FAEEDA',
  coral:    '#D85A30',
  coralL:   '#FAECE7',
  green:    '#3B6D11',
  greenL:   '#EAF3DE',
  bg:       '#F7F7F5',
  surface:  '#FFFFFF',
  border:   '#E5E3DC',
  text:     '#1A1A18',
  muted:    '#6B6B67',
  hint:     '#A0A09B',
};

export const STATUS_COLORS = {
  pending:          { bg: colors.amberL,  text: colors.amber  },
  confirmed:        { bg: colors.purpleL, text: colors.purple },
  picked_up:        { bg: colors.tealL,   text: colors.teal   },
  in_transit:       { bg: '#DBEAFE',      text: '#1D4ED8'     },
  out_for_delivery: { bg: '#FEF3C7',      text: '#B45309'     },
  delivered:        { bg: colors.greenL,  text: colors.green  },
  cancelled:        { bg: '#FEE2E2',      text: '#991B1B'     },
  completed:        { bg: colors.greenL,  text: colors.green  },
  refunded:         { bg: '#F3E8FF',      text: '#7C3AED'     },
};

export const typography = {
  h1: { fontSize: 24, fontWeight: '800', color: colors.text },
  h2: { fontSize: 20, fontWeight: '700', color: colors.text },
  h3: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, color: colors.text, lineHeight: 22 },
  small: { fontSize: 12, color: colors.muted },
  tiny: { fontSize: 11, color: colors.hint },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.muted },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const radius = { sm: 6, md: 8, lg: 12, full: 999 };

export const shadow = {
  shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
};
