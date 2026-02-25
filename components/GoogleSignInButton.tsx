import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Colors, UI } from '@/constants/theme';
import { ThemedText } from './ThemedText';

const googleLogo = require('../assets/images/google-sign-in.png');

type GoogleSignInButtonProps = {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
};

export function GoogleSignInButton({ onPress, isLoading = false, disabled = false }: GoogleSignInButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      <Image source={googleLogo} style={styles.googleIcon} resizeMode="contain" />
      <ThemedText style={styles.googleButtonText}>Sign in with Google</ThemedText>
      <View style={styles.spacer} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: UI.radii.authButton,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
    width: '100%',
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  googleButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '500',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  spacer: {
    width: 16,
  },
});
