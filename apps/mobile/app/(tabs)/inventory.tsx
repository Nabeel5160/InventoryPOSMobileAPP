import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight } from 'react-native-reanimated';
import type { Product, StockLevel } from '@iq/shared';
import { isLowStock } from '@iq/shared';
import { getApiClient } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import { cacheProducts, cacheStock } from '@/src/db/offline';
import { Badge, Body, Card, Muted, Screen } from '@/src/ui/primitives';
import { colors, spacing, touchTarget } from '@/src/theme';

export default function InventoryScreen() {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const [q, setQ] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockLevel[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    const api = getApiClient();
    const [plist, slist] = await Promise.all([
      api.listProducts(token, q || undefined),
      api.listStock(token),
    ]);
    setProducts(plist);
    setStock(slist);
    await cacheProducts(
      plist.map((p) => ({
        id: p.id,
        json: JSON.stringify(p),
        updatedAt: p.updatedAt ?? new Date().toISOString(),
      })),
    );
    await cacheStock(
      slist.map((s) => ({
        id: s.id,
        productId: s.productId,
        warehouseId: s.warehouseId,
        quantity: s.quantity,
        updatedAt: s.updatedAt ?? new Date().toISOString(),
      })),
    );
  }, [token, q]);

  useEffect(() => {
    const t = setTimeout(() => void load().catch(() => undefined), 250);
    return () => clearTimeout(t);
  }, [load]);

  const qtyByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stock) {
      map.set(s.productId, (map.get(s.productId) ?? 0) + s.quantity);
    }
    return map;
  }, [stock]);

  return (
    <Screen style={{ paddingBottom: 0 }}>
      <TextInput
        accessibilityLabel="Search products"
        placeholder="Search name, SKU, barcode…"
        placeholderTextColor={colors.textMuted}
        value={q}
        onChangeText={setQ}
        style={styles.search}
      />
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        renderItem={({ item, index }) => {
          const qty = qtyByProduct.get(item.id) ?? 0;
          const low = isLowStock(qty, item.reorderPoint);
          return (
            <Animated.View entering={FadeInRight.delay(Math.min(index, 8) * 40)}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, stock ${qty}`}
                onPress={() => router.push(`/product/${item.id}`)}
                style={{ minHeight: touchTarget }}
              >
                <Card>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Body>{item.name}</Body>
                      <Muted>
                        {item.sku} · ${item.basePrice.toFixed(2)}
                      </Muted>
                    </View>
                    <Badge
                      tone={low ? 'warn' : 'ok'}
                      label={low ? `Low ${qty}` : `Qty ${qty}`}
                    />
                  </View>
                </Card>
              </Pressable>
            </Animated.View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: touchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
