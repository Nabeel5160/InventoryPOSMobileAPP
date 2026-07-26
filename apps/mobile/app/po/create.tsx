import { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Product, Supplier } from '@iq/shared';
import { getApiClient } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import {
  Body,
  Button,
  Card,
  Muted,
  Screen,
  Title,
} from '@/src/ui/primitives';
import { spacing } from '@/src/theme';

type DraftLine = { product: Product; quantity: number };

export default function CreatePurchaseOrderScreen() {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState('wh-main');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const api = getApiClient();
      const [sups, prods, whs] = await Promise.all([
        api.listSuppliers(token),
        api.listProducts(token),
        api.listWarehouses(token),
      ]);
      setSuppliers(sups);
      setProducts(prods);
      if (sups[0]) setSupplierId(sups[0].id);
      if (whs[0]) setWarehouseId(whs[0].id);
    })();
  }, [token]);

  function addProduct(product: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  async function submit() {
    if (!token || !supplierId || !lines.length) {
      Alert.alert('Select a supplier and at least one product');
      return;
    }
    setLoading(true);
    try {
      const po = await getApiClient().createPurchaseOrder(token, {
        supplierId,
        warehouseId,
        notes: 'Created from mobile',
        lines: lines.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          unitCost: l.product.unitCost,
        })),
      });
      router.replace(`/po/${po.id}`);
    } catch (err) {
      Alert.alert(
        'Failed',
        err instanceof Error ? err.message : 'Could not create PO',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView>
        <Title accessibilityRole="header">New purchase order</Title>
        <Card>
          <Body>Supplier</Body>
          {suppliers.map((s) => (
            <Button
              key={s.id}
              label={s.name}
              variant={supplierId === s.id ? 'primary' : 'secondary'}
              onPress={() => setSupplierId(s.id)}
              style={{ marginTop: spacing.sm }}
            />
          ))}
        </Card>

        <Card>
          <Body>Add products</Body>
          {products.map((p) => (
            <Button
              key={p.id}
              label={`+ ${p.name}`}
              variant="secondary"
              onPress={() => addProduct(p)}
              style={{ marginTop: spacing.sm }}
            />
          ))}
        </Card>

        <Card>
          <Body>Lines</Body>
          {lines.length === 0 ? (
            <Muted>No lines yet.</Muted>
          ) : (
            lines.map((l) => (
              <View
                key={l.product.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: spacing.sm,
                }}
              >
                <Muted>
                  {l.product.name} × {l.quantity}
                </Muted>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    label="−"
                    variant="secondary"
                    onPress={() =>
                      setLines((prev) =>
                        prev
                          .map((x) =>
                            x.product.id === l.product.id
                              ? { ...x, quantity: x.quantity - 1 }
                              : x,
                          )
                          .filter((x) => x.quantity > 0),
                      )
                    }
                    style={{ minWidth: 48 }}
                  />
                  <Button
                    label="+"
                    variant="secondary"
                    onPress={() => addProduct(l.product)}
                    style={{ minWidth: 48 }}
                  />
                </View>
              </View>
            ))
          )}
        </Card>

        <Button label="Create PO" loading={loading} onPress={() => void submit()} />
      </ScrollView>
    </Screen>
  );
}
