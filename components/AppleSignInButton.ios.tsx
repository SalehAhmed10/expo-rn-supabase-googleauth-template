import * as AppleAuthentication from 'expo-apple-authentication';
import { StyleSheet } from 'react-native';

import { UI } from '@/constants/theme';

type AppleSignInButtonProps = {
  onPress: () => void;
  isLoading?: boolean;
};


export function AppleSignInButton({ onPress, isLoading = false }: AppleSignInButtonProps) {
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={UI.radii.authButton}
      style={styles.button}
      onPress={isLoading ? () => {} : onPress}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 50,
    marginTop: 12,
  },
});
