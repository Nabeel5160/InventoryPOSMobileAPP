import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { PaymentMethod } from '@iq/shared';
import { getApiClient } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import { useCartStore } from '@/src/store/cartStore';
import { enqueueMutation } from '@/src/db/offline';
import { flushOutbox } from '@/src/sync/syncEngine';
import {
  Body,
  Button,
  Card,
  Muted,
  Screen,
  Subtitle,
  Title,
} from '@/src/ui/primitives';
import { spacing } from '@/src/theme';

export default function CheckoutScreen() {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const warehouseId = useCartStore((s) => s.warehouseId);
  const discountPercent = useCartStore((s) => s.discountPercent);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const totals = useCartStore((s) => s.totals);
  const clear = useCartStore((s) => s.clear);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [loading, setLoading] = useState(false);
  const t = totals();

  async function completeSale() {
    if (!token || !lines.length) return;
    setLoading(true);
    const clientMutationId = `sale-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = {
      warehouseId,
      paymentMethod: method,
      discountPercent,
      clientMutationId,
      lines: lines.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRate: l.product.taxRate,
      })),
    };

    try {
      const order = await getApiClient().createSalesOrder(token, payload);
      clear();
      router.replace({
        pathname: '/receipt',
        params: { orderId: order.id, total: String(order.total) },
      });
    } catch {
      await enqueueMutation({
        clientMutationId,
        type: 'sales_order',
        payload,
        clientUpdatedAt: new Date().toISOString(),
      });
      Alert.alert(
        'Saved offline',
        'Sale queued. It will sync when you are back online.',
      );
      clear();
      void flushOutbox(token);
      router.replace({
        pathname: '/receipt',
        params: { orderId: clientMutationId, total: String(t.total), offline: '1' },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Title accessibilityRole="header">Checkout</Title>
      <Card>
        {lines.map((l) => (
          <Body key={l.product.id}>
            {l.product.name} × {l.quantity} — $
            {(l.unitPrice * l.quantity).toFixed(2)}
          </Body>
        ))}
        <Muted style={{ marginTop: spacing.sm }}>
          Discount {discountPercent}% · Subtotal ${t.subtotal.toFixed(2)} · Tax $
          {t.taxTotal.toFixed(2)}
        </Muted>
        <Subtitle style={{ marginTop: spacing.sm }}>
          Total ${t.total.toFixed(2)}
        </Subtitle>
      </Card>

      <Card>
        <Body>Payment method (no card PAN stored)</Body>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.sm }}>
          <Button
            label="Cash"
            variant={method === 'cash' ? 'primary' : 'secondary'}
            onPress={() => setMethod('cash')}
            style={{ flex: 1 }}
          />
          <Button
            label="Terminal"
            variant={method === 'terminal' ? 'primary' : 'secondary'}
            onPress={() => setMethod('terminal')}
            style={{ flex: 1 }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.sm }}>
          <Button
            label="0% off"
            variant="secondary"
            onPress={() => setDiscount(0)}
            style={{ flex: 1 }}
          />
          <Button
            label="5% off"
            variant="secondary"
            onPress={() => setDiscount(5)}
            style={{ flex: 1 }}
          />
          <Button
            label="10% off"
            variant="secondary"
            onPress={() => setDiscount(10)}
            style={{ flex: 1 }}
          />
        </View>
      </Card>

      <Button
        label="Complete sale"
        loading={loading}
        disabled={!lines.length}
        onPress={() => void completeSale()}
      />
    </Screen>
  );
}
