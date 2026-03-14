import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppThemeDark } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (!this.state.hasError) return this.props.children;

    const t = AppThemeDark;
    return (
      <View style={s.root}>
        <Text style={s.icon}>⚠️</Text>
        <Text style={s.title}>Something went wrong</Text>
        <Text style={s.body}>{this.state.message}</Text>
        <TouchableOpacity style={s.btn} onPress={this.reset} activeOpacity={0.8}>
          <Text style={s.btnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppThemeDark.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  icon: { fontSize: 48 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: AppThemeDark.textPrimary,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: AppThemeDark.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: 8,
    backgroundColor: AppThemeDark.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
