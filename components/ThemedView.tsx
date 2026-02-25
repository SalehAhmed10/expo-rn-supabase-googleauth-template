import { StyleSheet, View, type ViewProps } from 'react-native';
import { Colors } from '@/constants/theme';

export type ThemedViewProps = ViewProps & {
};

export function ThemedView({ style, ...otherProps }: ThemedViewProps) {
  return <View style={[styles.container, style]} {...otherProps} />;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.background,
  },
});
