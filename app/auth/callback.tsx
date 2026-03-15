import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/utils/supabase';
import { logger } from '@/utils/logger';

WebBrowser.maybeCompleteAuthSession();

export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    const handle = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (!url) return;

        const fragment = url.split('#')[1] ?? '';
        const params   = Object.fromEntries(new URLSearchParams(fragment));

        if (params.access_token) {
          const { error } = await supabase.auth.setSession({
            access_token:  params.access_token,
            refresh_token: params.refresh_token ?? '',
          });
          if (error) {
            logger.error('auth', 'callback', 'Failed to set session from callback', { error: error.message });
          } else {
            logger.info('auth', 'callback', 'Session set from OAuth callback');
          }
        }
      } catch (e) {
        logger.error('auth', 'callback', 'Unexpected error in OAuth callback', { error: String(e) });
      } finally {
        router.replace('/(tabs)');
      }
    };

    handle();
  }, []);

  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
