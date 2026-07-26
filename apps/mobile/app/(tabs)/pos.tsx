import { useState } from 'react';
import { Alert, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
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
} from '@/src/ui/primitives';
import { colors, spacing, touchTarget } from '@/src/theme';

export default function PosScreen() {
  const token = useAuthStore((s) => s.token);
  const canSell = useAuthStore((s) => s.canCompleteSales);
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const addProduct = useCartStore((s) => s.addProduct);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeLine = useCartStore((s) => s.removeLine);
  const totals = useCartStore((s) => s.totals);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [lastScan, setLastScan] = useState<string | null>(null);

  async function lookup(code: string) {
    if (!token || !code.trim()) return;
    try {
      const product = await getApiClient().getProductByBarcode(
        token,
        code.trim(),
      );
      addProduct(product);
      setLastScan(product.name);
      setManualCode('');
    } catch (err) {
      Alert.alert(
        'Not found',
        err instanceof Error ? err.message : 'Product not found',
      );
    }
  }

  const t = totals();

  return (
    <Screen>
      {!canSell() ? (
        <Card>
          <Body>Your role cannot complete sales.</Body>
          <Muted>Warehouse users can manage stock from Inventory.</Muted>
        </Card>
      ) : null}

      <View style={styles.row}>
        <TextInput
          accessibilityLabel="Barcode or SKU"
          style={styles.input}
          placeholder="Enter barcode / SKU"
          placeholderTextColor={colors.textMuted}
          value={manualCode}
          onChangeText={setManualCode}
          onSubmitEditing={() => void lookup(manualCode)}
        />
        <Button
          label="Add"
          onPress={() => void lookup(manualCode)}
          style={{ minWidth: 88 }}
        />
      </View>

      <View style={{ marginVertical: spacing.sm }}>
        <Button
          label={scanning ? 'Close scanner' : 'Scan barcode'}
          variant="secondary"
          onPress={async () => {
            if (!permission?.granted) {
              const res = await requestPermission();
              if (!res.granted) {
                Alert.alert('Camera permission required');
                return;
              }
            }
            setScanning((v) => !v);
          }}
        />
      </View>

      {scanning ? (
        <View style={styles.cameraWrap} accessibilityLabel="Barcode camera scanner">
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'upc_a', 'upc_e'],
            }}
            onBarcodeScanned={({ data }) => {
              if (data === lastScan) return;
              setScanning(false);
              void lookup(data);
            }}
          />
        </View>
      ) : null}

      {lastScan ? <Muted>Added: {lastScan}</Muted> : null}

      <Subtitle style={{ marginTop: spacing.md }}>Cart</Subtitle>
      <FlatList
        data={lines}
        keyExtractor={(item) => item.product.id}
        style={{ flex: 1 }}
        ListEmptyComponent={
          <Card>
            <Muted>Scan or look up items to build the cart.</Muted>
          </Card>
        }
        renderItem={({ item }) => (
          <Card>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Body>{item.product.name}</Body>
                <Muted>
                  ${item.unitPrice.toFixed(2)} × {item.quantity}
                </Muted>
              </View>
              <Badge label={`$${(item.unitPrice * item.quantity).toFixed(2)}`} />
            </View>
            <View style={[styles.row, { marginTop: spacing.sm }]}>
              <Button
                label="−"
                variant="secondary"
                onPress={() => updateQty(item.product.id, item.quantity - 1)}
                style={styles.qtyBtn}
              />
              <Button
                label="+"
                variant="secondary"
                onPress={() => updateQty(item.product.id, item.quantity + 1)}
                style={styles.qtyBtn}
              />
              <Button
                label="Remove"
                variant="danger"
                onPress={() => removeLine(item.product.id)}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        )}
      />

      <Card>
        <Body>Subtotal ${t.subtotal.toFixed(2)}</Body>
        <Body>Tax ${t.taxTotal.toFixed(2)}</Body>
        <Subtitle>Total ${t.total.toFixed(2)}</Subtitle>
        <View style={{ marginTop: spacing.sm }}>
          <Button
            label="Checkout"
            disabled={!lines.length || !canSell()}
            onPress={() => router.push('/checkout')}
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: touchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  cameraWrap: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyBtn: { minWidth: 56 },
});
