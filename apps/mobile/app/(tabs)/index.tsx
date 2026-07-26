import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type { DashboardSummary, InventoryReport } from '@iq/shared';
import { getApiClient } from '@/src/api';
import { useAuthStore } from '@/src/store/authStore';
import { flushOutbox, subscribeSyncStatus, type SyncStatus } from '@/src/sync/syncEngine';
import { Badge, Body, Card, Muted, Screen, Subtitle, Title } from '@/src/ui/primitives';
import { colors, spacing } from '@/src/theme';

export default function DashboardScreen() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [lowStock, setLowStock] = useState<InventoryReport['lowStock']>([]);
  const [sync, setSync] = useState<SyncStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const api = getApiClient();
    const [dash, inv] = await Promise.all([
      api.dashboard(token),
      api.inventoryReport(token),
    ]);
    setSummary(dash);
    setLowStock(inv.lowStock);
    await flushOutbox(token);
  }, [token]);

  useEffect(() => {
    void load().catch(() => undefined);
    return subscribeSyncStatus(setSync);
  }, [load]);

  return (
    <Screen style={{ padding: 0 }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={() => {
              setRefreshing(true);
              void load().finally(() => setRefreshing(false));
            }}
          />
        }
      >
        <Title accessibilityRole="header">Hello, {user?.name ?? 'there'}</Title>
        <Muted>
          {user?.role} · pending sync: {sync?.pendingCount ?? 0}
          {sync?.syncing ? ' (syncing…)' : ''}
        </Muted>

        <View style={styles.grid}>
          {[
            { label: "Today's revenue", value: `$${(summary?.todayRevenue ?? 0).toFixed(2)}` },
            { label: "Today's orders", value: String(summary?.todayOrders ?? 0) },
            { label: 'Products', value: String(summary?.totalProducts ?? 0) },
            { label: 'Low stock', value: String(summary?.lowStockCount ?? 0) },
          ].map((tile, i) => (
            <Animated.View
              key={tile.label}
              entering={FadeInUp.delay(i * 80)}
              style={styles.tileWrap}
            >
              <Card style={styles.tile}>
                <Muted>{tile.label}</Muted>
                <Subtitle style={{ marginTop: 6 }}>{tile.value}</Subtitle>
              </Card>
            </Animated.View>
          ))}
        </View>

        <Subtitle style={{ marginTop: spacing.md }}>Low stock alerts</Subtitle>
        {lowStock.length === 0 ? (
          <Card>
            <Body>All stock levels look healthy.</Body>
          </Card>
        ) : (
          lowStock.map((item) => (
            <Card key={item.productId} accessibilityLabel={`${item.name} low stock`}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Body>{item.name}</Body>
                  <Muted>{item.sku}</Muted>
                </View>
                <Badge
                  tone="warn"
                  label={`${item.quantity} / ${item.reorderPoint}`}
                />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  tileWrap: { width: '48%', flexGrow: 1 },
  tile: { minHeight: 96, marginBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
