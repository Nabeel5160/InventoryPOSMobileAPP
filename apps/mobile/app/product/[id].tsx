import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { Product, StockLevel } from '@iq/shared';
import { isLowStock } from '@iq/shared';
import { getApiClient } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import { useCartStore } from '@/src/store/cartStore';
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

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const addProduct = useCartStore((s) => s.addProduct);
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(0);

  useEffect(() => {
    if (!token || !id) return;
    void (async () => {
      const api = getApiClient();
      const p = await api.getProduct(token, id);
      const stock = await api.listStock(token);
      const total = stock
        .filter((s: StockLevel) => s.productId === p.id)
        .reduce((a, s) => a + s.quantity, 0);
      setProduct(p);
      setQty(total);
    })();
  }, [token, id]);

  if (!product) {
    return (
      <Screen>
        <Muted>Loading…</Muted>
      </Screen>
    );
  }

  const low = isLowStock(qty, product.reorderPoint);

  return (
    <Screen>
      <Animated.View entering={FadeIn}>
        <Title accessibilityRole="header">{product.name}</Title>
        <Muted>
          {product.sku} · {product.barcode}
        </Muted>
        <Card style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Subtitle>${product.basePrice.toFixed(2)}</Subtitle>
            <Badge tone={low ? 'warn' : 'ok'} label={`Stock ${qty}`} />
          </View>
          <Body style={{ marginTop: spacing.sm }}>{product.description}</Body>
          <Muted style={{ marginTop: spacing.sm }}>
            Cost ${product.unitCost.toFixed(2)} · Tax {(product.taxRate * 100).toFixed(0)}% ·
            Reorder @ {product.reorderPoint}
          </Muted>
          {product.priceTiers.length ? (
            <View style={{ marginTop: spacing.md }}>
              <Body>Price tiers</Body>
              {product.priceTiers.map((t) => (
                <Muted key={t.id}>
                  ≥{t.minQty}: ${t.unitPrice.toFixed(2)} {t.currency}
                </Muted>
              ))}
            </View>
          ) : null}
        </Card>
        <Button
          label="Add to cart"
          onPress={() => addProduct(product)}
          accessibilityLabel={`Add ${product.name} to cart`}
        />
      </Animated.View>
    </Screen>
  );
}
