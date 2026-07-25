import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Package, AlertCircle, Star, Ticket } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

export function DeliveryCard({ delivery }) {
  const qrValue = `Item=${delivery.id}&Order=${delivery.eventId}`;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{delivery.title}</Text>
        <TouchableOpacity>
          <Ticket size={20} color="#FF6B00" />
        </TouchableOpacity>
      </View>

      {/* Order Info */}
      <View style={styles.orderInfo}>
        <Package size={16} color="#666666" />
        <Text style={styles.orderId}>{delivery.orderId}</Text>
      </View>

      {/* Status Info */}
      <View style={styles.statusInfo}>
        <Package size={16} color="#666666" />
        <Text style={styles.status}>{delivery.status}</Text>
      </View>

      {/* QR Code hoặc Hình ảnh */}
      <View style={styles.qrContainer}>
        { (
          <QRCode
            value={qrValue}
            style={styles.image}
            color="#000000"
            backgroundColor="white"
          />
        )}
        <Text style={styles.qrLabel}>Mã vé sự kiện</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.favoriteButton}>
          <Star size={20} color="#CCCCCC" />
        </TouchableOpacity>
        <Text style={styles.footerText}>Quét mã QR để vào sự kiện</Text>
      </View>

      {/* Cảnh báo */}
      {delivery.hasWarning && (
        <View style={styles.warningContainer}>
          <AlertCircle size={16} color="#FF6B00" />
          <Text style={styles.warningText}>{delivery.warningText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    marginRight: 8,
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  orderId: {
    fontSize: 13,
    color: '#666666',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  status: {
    fontSize: 13,
    color: '#666666',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    marginBottom: 12,
  },
  qrLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
  },
  image: {
    width: 180,
    height: 180,
    borderRadius: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  favoriteButton: {
    position: 'absolute',
    left: 0,
  },
  footerText: {
    fontSize: 13,
    color: '#666666',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF4ED',
    borderRadius: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#FF6B00',
    flex: 1,
  },
});
