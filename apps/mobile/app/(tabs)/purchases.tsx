import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
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
  Title,
} from '@/src/ui/primitives';
import { spacing, touchTarget } from '@/src/theme';

export default function PurchasesScreen() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    const list = await getApiClient().listPurchaseOrders(token);
    setOrders(list);
  }, [token]);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  const canManage = role === 'Admin' || role === 'Manager' || role === 'Warehouse';

  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.sm,
        }}
      >
        <Title accessibilityRole="header">Purchase orders</Title>
        {canManage ? (
          <Button
            label="New PO"
            onPress={() => router.push('/po/create')}
            style={{ minWidth: 96 }}
          />
        ) : null}
      </View>
      {!canManage ? (
        <Card>
          <Muted>Sales users can view POs but cannot create or receive.</Muted>
        </Card>
      ) : null}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        onRefresh={() => void load()}
        refreshing={false}
        ListEmptyComponent={
          <Card>
            <Muted>No purchase orders yet.</Muted>
          </Card>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Purchase order ${item.supplierName ?? item.id}`}
            style={{ minHeight: touchTarget }}
            onPress={() => router.push(`/po/${item.id}`)}
          >
            <Card>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Body>{item.supplierName ?? item.supplierId}</Body>
                  <Muted>
                    {item.lines.length} line(s) · {item.status}
                  </Muted>
                </View>
                <Badge
                  tone={
                    item.status === 'received'
                      ? 'ok'
                      : item.status === 'partial'
                        ? 'warn'
                        : 'default'
                  }
                  label={item.status}
                />
              </View>
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}
