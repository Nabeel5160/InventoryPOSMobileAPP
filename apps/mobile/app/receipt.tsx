import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { Body, Button, Card, Muted, Screen, Title } from '@/src/ui/primitives';
import { spacing } from '@/src/theme';

/** Simple inline success animation JSON (checkmark pulse) */
const successAnim = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 45,
  w: 200,
  h: 200,
  nm: 'success',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'circle',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [0, 0, 100], e: [100, 100, 100] },
            { t: 20, s: [100, 100, 100] },
          ],
        },
      },
      shapes: [
        {
          ty: 'el',
          p: { a: 0, k: [0, 0] },
          s: { a: 0, k: [120, 120] },
        },
        {
          ty: 'fl',
          c: { a: 0, k: [0.18, 0.8, 0.44, 1] },
          o: { a: 0, k: 100 },
        },
      ],
      ip: 0,
      op: 45,
      st: 0,
    },
  ],
};

export default function ReceiptScreen() {
  const { orderId, total, offline } = useLocalSearchParams<{
    orderId: string;
    total: string;
    offline?: string;
  }>();
  const router = useRouter();

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
        <LottieView
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          source={successAnim as any}
          autoPlay
          loop={false}
          style={{ width: 140, height: 140 }}
        />
      </View>
      <Title accessibilityRole="header">Sale complete</Title>
      <Card>
        <Body>Order: {orderId}</Body>
        <Body>Total: ${Number(total ?? 0).toFixed(2)}</Body>
        {offline === '1' ? (
          <Muted>Queued offline — will sync when connected.</Muted>
        ) : (
          <Muted>Receipt stub ready for print/share (v1 PDF via Firebase Storage).</Muted>
        )}
      </Card>
      <Button label="Back to POS" onPress={() => router.replace('/(tabs)/pos')} />
      <View style={{ height: spacing.sm }} />
      <Button
        label="Dashboard"
        variant="secondary"
        onPress={() => router.replace('/(tabs)')}
      />
    </Screen>
  );
}
