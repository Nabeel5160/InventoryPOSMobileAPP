import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { PurchaseOrder } from '@iq/shared';
import { getApiClient } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import {
  Badge,
  Body,
  Button,
  Card,
  Muted,
  Screen,
  Subtitle,
  Title,
} from '@/src/ui/primitives';
import { spacing } from '@/src/theme';

export default function PurchaseOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    const order = await getApiClient().getPurchaseOrder(token, id);
    setPo(order);
  }, [token, id]);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  const canReceive =
    role === 'Admin' || role === 'Manager' || role === 'Warehouse';

  async function receiveAllRemaining() {
    if (!token || !po) return;
    const lines = po.lines
      .map((l) => ({
        productId: l.productId,
        quantity: l.quantity - l.receivedQty,
      }))
      .filter((l) => l.quantity > 0);
    if (!lines.length) {
      Alert.alert('Nothing left to receive');
      return;
    }
    setLoading(true);
    try {
      const updated = await getApiClient().receivePurchaseOrder(
        token,
        po.id,
        { lines },
      );
      setPo(updated);
      Alert.alert('Received', `PO is now ${updated.status}`);
    } catch (err) {
      Alert.alert(
        'Receive failed',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setLoading(false);
    }
  }

  if (!po) {
    return (
      <Screen>
        <Muted>Loading…</Muted>
      </Screen>
    );
  }

  return (
    <Screen>
      <Title accessibilityRole="header">
        {po.supplierName ?? 'Purchase order'}
      </Title>
      <Muted>Status</Muted>
      <Badge
        tone={
          po.status === 'received'
            ? 'ok'
            : po.status === 'partial'
              ? 'warn'
              : 'default'
        }
        label={po.status}
      />
      {po.notes ? (
        <Card style={{ marginTop: spacing.md }}>
          <Muted>{po.notes}</Muted>
        </Card>
      ) : null}

      <Subtitle style={{ marginTop: spacing.md }}>Lines</Subtitle>
      {po.lines.map((line) => (
        <Card key={line.id ?? line.productId}>
          <Body>{line.name ?? line.productId}</Body>
          <Muted>
            Ordered {line.quantity} · Received {line.receivedQty} · Cost $
            {line.unitCost.toFixed(2)}
          </Muted>
        </Card>
      ))}

      {canReceive && po.status !== 'received' && po.status !== 'cancelled' ? (
        <View style={{ marginTop: spacing.md }}>
          <Button
            label="Receive remaining"
            loading={loading}
            onPress={() => void receiveAllRemaining()}
          />
        </View>
      ) : null}
    </Screen>
  );
}
