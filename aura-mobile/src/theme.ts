import { StyleSheet } from 'react-native';

export const colors = {
  bgPrimary: '#0D1117',
  bgSecondary: '#161B22',
  bgTertiary: '#21262D',
  textPrimary: '#F0F6FC',
  textSecondary: '#8B949E',
  textMuted: '#484F58',
  accentCyan: '#58A6FF',
  accentGreen: '#3FB950',
  accentOrange: '#D29922',
  accentRed: '#F85149',
  accentPurple: '#BC8CFF',
  border: '#21262D',
};

export const theme = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 16,
  },
  input: {
    backgroundColor: colors.bgTertiary,
    color: colors.textPrimary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  text: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  textMuted: {
    color: colors.textMuted,
    fontSize: 14,
  },
  textAccent: {
    color: colors.accentCyan,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gap8: { gap: 8 },
  gap16: { gap: 16 },
  p16: { padding: 16 },
});
