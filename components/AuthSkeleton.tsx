import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Colors, UI } from '@/constants/theme';

export function AuthSkeleton() {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const backgroundColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.light.skeletonBase, Colors.light.skeletonHighlight],
  });

  return (
    <Animated.View style={styles.container}>
      <Animated.View style={[styles.button, { backgroundColor }]} />
      <Animated.View style={[styles.button, { backgroundColor }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    borderRadius: UI.radii.authButton,
    borderWidth: 1,
    borderColor: Colors.light.skeletonBase,
    height: 50,
    marginBottom: 12,
  },
});
