import { StyleSheet } from 'react-native';
import { AppThemeType } from '@/constants/theme';

export function createSignupStyles(theme: AppThemeType) {
  return StyleSheet.create({
    root:   { flex: 1, backgroundColor: theme.bg },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },

    backBtn:   { paddingTop: 16, paddingBottom: 8, alignSelf: 'flex-start' },
    backArrow: { fontSize: 32, color: theme.textMuted, lineHeight: 36 },

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

    errorWrap: {
      backgroundColor: `${theme.error}18`,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: `${theme.error}40`,
    },
    errorText: { color: theme.error, fontSize: 14, lineHeight: 20 },

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
    primaryBtnText:    { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },

    divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
    dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
    dividerText: { color: theme.textMuted, fontSize: 13 },

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

    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 36 },
    footerText: { color: theme.textMuted, fontSize: 15 },
    footerLink: { color: theme.primary, fontSize: 15, fontWeight: '700' },

    // Done state
    doneWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    doneIconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    doneIconGlow: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.primary,
      opacity: 0.15,
    },
    doneIconEmoji: { fontSize: 60 },
    doneTitle: { fontSize: 26, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.3 },
    doneSub:   { fontSize: 15, color: theme.textMuted, textAlign: 'center' },
    doneEmail: { fontSize: 15, color: theme.primary, fontWeight: '600' },
    doneSub2:  { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22, marginTop: -4 },
    doneBtn: {
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 40,
      marginTop: 12,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 6,
    },
    doneBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  });
}

export type SignupStyles = ReturnType<typeof createSignupStyles>;
