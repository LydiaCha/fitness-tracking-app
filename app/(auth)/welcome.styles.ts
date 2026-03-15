import { StyleSheet } from 'react-native';
import { AppThemeType } from '@/constants/theme';

export function createWelcomeStyles(theme: AppThemeType) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.bg,
      paddingHorizontal: 28,
      paddingBottom: 32,
      overflow: 'hidden',
    },

    glowTop: {
      position: 'absolute',
      top: -180,
      alignSelf: 'center',
      width: 420,
      height: 420,
      borderRadius: 210,
      backgroundColor: theme.primary,
      opacity: 0.07,
    },
    glowBottom: {
      position: 'absolute',
      bottom: -100,
      right: -60,
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: theme.secondary,
      opacity: 0.05,
    },

    // Hero
    hero: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 28,
    },
    heroText: { alignItems: 'center', gap: 10 },
    logoRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: {
      fontSize: 40,
      fontWeight: '800',
      color: theme.textPrimary,
      letterSpacing: -1.5,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textMuted,
      letterSpacing: 0.2,
    },

    // Feature pills
    pills: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 28,
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: theme.bgCardAlt,
      borderWidth: 1,
      borderColor: theme.border,
    },
    pillText: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '500',
    },

    // Actions
    actions: { gap: 12, alignItems: 'center' },
    primaryBtnWrap: {
      alignSelf: 'stretch',
      shadowColor: '#7c3aed',
      shadowOpacity: 0.45,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    primaryBtn: {
      borderRadius: 18,
      paddingVertical: 18,
      alignItems: 'center',
    },
    primaryBtnText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '700',
      letterSpacing: 0.3,
    },

    secondaryBtn: {
      paddingVertical: 14,
      alignItems: 'center',
    },
    secondaryBtnText: {
      fontSize: 14,
      color: theme.textMuted,
    },
    secondaryBtnAccent: {
      color: theme.primaryLight,
      fontWeight: '600',
    },

    terms: {
      fontSize: 11,
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 16,
      marginTop: 2,
      opacity: 0.6,
    },
  });
}

export type WelcomeStyles = ReturnType<typeof createWelcomeStyles>;
