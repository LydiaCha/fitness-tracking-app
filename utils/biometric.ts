import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricType = 'facial' | 'fingerprint' | 'none';

export async function getBiometricType(): Promise<BiometricType> {
  try {
    if (!await LocalAuthentication.hasHardwareAsync()) return 'none';
    if (!await LocalAuthentication.isEnrolledAsync())  return 'none';

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'facial';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT))        return 'fingerprint';
  } catch {}
  return 'none';
}

export async function biometricAuthenticate(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use password',
      cancelLabel:   'Cancel',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}

export function biometricLabel(type: BiometricType): string {
  if (type === 'facial')      return 'Face ID';
  if (type === 'fingerprint') return 'Fingerprint';
  return 'Biometric';
}
