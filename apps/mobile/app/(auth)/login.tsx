import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Body, Button, Muted, Screen, Title } from '@/src/ui/primitives';
import { useAuthStore } from '@/src/store/authStore';
import { colors, spacing, touchTarget } from '@/src/theme';
import { getApiMode } from '@/src/api';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const [email, setEmail] = useState('sales@iqcomputers.local');
  const [password, setPassword] = useState('password123');

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrap}
      >
        <Animated.View entering={FadeInDown.duration(500)}>
          <Title accessibilityRole="header">IQ Computers</Title>
          <Muted style={{ marginTop: spacing.sm }}>
            Wholesale Inventory & POS · mode: {getApiMode()}
          </Muted>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.form}>
          <Body>Email</Body>
          <TextInput
            accessibilityLabel="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholderTextColor={colors.textMuted}
            placeholder="you@iqcomputers.local"
          />
          <Body style={{ marginTop: spacing.md }}>Password</Body>
          <TextInput
            accessibilityLabel="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            placeholderTextColor={colors.textMuted}
            placeholder="••••••••"
          />
          {error ? (
            <Muted style={{ color: colors.danger, marginTop: spacing.sm }}>
              {error}
            </Muted>
          ) : null}
          <View style={{ marginTop: spacing.lg }}>
            <Button
              label="Sign in"
              loading={loading}
              onPress={() => void login(email.trim(), password)}
            />
          </View>
          <Muted style={{ marginTop: spacing.md }}>
            Demo: admin@ / sales@ / warehouse@ iqcomputers.local · password123
          </Muted>
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center' },
  form: { marginTop: spacing.xl },
  input: {
    marginTop: spacing.sm,
    minHeight: touchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 16,
  },
});
