import { StyleSheet } from 'react-native';
import { AppThemeType } from '@/constants/theme';

export function createLoginStyles(theme: AppThemeType) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: theme.bg },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },

    backBtn:  { paddingTop: 16, paddingBottom: 8, alignSelf: 'flex-start' },
    backArrow:{ fontSize: 32, color: theme.textMuted, lineHeight: 36 },

    heading: {
      fontSize: 32,
      fontWeight: '800',
      color: theme.textPrimary,
      letterSpacing: -0.5,
      marginTop: 8,
    },
    sub: {
      fontSize: 15,
      color: theme.textMuted,
      marginTop: 6,
      marginBottom: 36,
    },

    form: { gap: 12 },

    // Input row (icon + text + optional toggle)
    input: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.bgCard,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 4,
      borderWidth: 1.5,
      borderColor: theme.border,
      gap: 10,
    },
    inputFocused: {
      borderColor: theme.primary,
      backgroundColor: theme.bgCardAlt,
    },
    inputIcon: { fontSize: 16, opacity: 0.5 },
    inputText: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: theme.textPrimary,
    },
    eyeBtn: { fontSize: 16, opacity: 0.6, paddingVertical: 14 },

    forgotWrap: { alignSelf: 'flex-end', marginTop: -2 },
    forgotText: { color: theme.primary, fontSize: 14, fontWeight: '500' },

    // Error
    errorWrap: {
      backgroundColor: `${theme.error}18`,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: `${theme.error}40`,
    },
    errorText: { color: theme.error, fontSize: 14, lineHeight: 20 },

    // Primary button
    primaryBtn: {
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 17,
      alignItems: 'center',
      marginTop: 4,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
    primaryBtnLoading: { opacity: 0.7 },
    primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },

    // Divider
    divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
    dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
    dividerText: { color: theme.textMuted, fontSize: 13 },

    // Google button
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: theme.bgCardAlt,
      borderRadius: 14,
      paddingVertical: 15,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    googleIconWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleLetter:  { fontSize: 14, fontWeight: '800', color: '#4285F4' },
    googleBtnText: { fontSize: 16, fontWeight: '600', color: theme.textPrimary },

    // Footer
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 36 },
    footerText: { color: theme.textMuted, fontSize: 15 },
    footerLink: { color: theme.primary, fontSize: 15, fontWeight: '700' },
  });
}

export type LoginStyles = ReturnType<typeof createLoginStyles>;
