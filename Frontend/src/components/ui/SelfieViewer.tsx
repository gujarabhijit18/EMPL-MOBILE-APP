import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface SelfieViewerProps {
  checkInSelfie?: string | null;
  checkOutSelfie?: string | null;
  employeeName?: string;
}

export const SelfieViewer: React.FC<SelfieViewerProps> = ({
  checkInSelfie,
  checkOutSelfie,
  employeeName = 'Employee',
}) => {
  const [selectedSelfie, setSelectedSelfie] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'check-in' | 'check-out' | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
  };

  const openSelfie = (selfie: string | null | undefined, type: 'check-in' | 'check-out') => {
    if (selfie) {
      setImageLoading(true);
      setSelectedSelfie(selfie);
      setSelectedType(type);
    }
  };

  const closeSelfie = () => {
    setSelectedSelfie(null);
    setSelectedType(null);
  };

  return (
    <>
      {/* Selfie Thumbnails */}
      <View style={styles.container}>
        {/* Check-in Selfie */}
        <TouchableOpacity
          style={[styles.selfieBox, !checkInSelfie && styles.emptySelfieBox]}
          onPress={() => openSelfie(checkInSelfie, 'check-in')}
          disabled={!checkInSelfie}
        >
          {checkInSelfie ? (
            <>
              <Image
                source={{ uri: checkInSelfie }}
                style={styles.selfieImage}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
              <View style={styles.selfieLabel}>
                <Text style={styles.selfieLabelText}>Check-in</Text>
              </View>
            </>
          ) : (
            <View style={styles.emptyPlaceholder}>
              <Ionicons name="camera-outline" size={24} color="#9ca3af" />
              <Text style={styles.emptyText}>No Check-in</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Check-out Selfie */}
        <TouchableOpacity
          style={[styles.selfieBox, !checkOutSelfie && styles.emptySelfieBox]}
          onPress={() => openSelfie(checkOutSelfie, 'check-out')}
          disabled={!checkOutSelfie}
        >
          {checkOutSelfie ? (
            <>
              <Image
                source={{ uri: checkOutSelfie }}
                style={styles.selfieImage}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
              <View style={styles.selfieLabel}>
                <Text style={styles.selfieLabelText}>Check-out</Text>
              </View>
            </>
          ) : (
            <View style={styles.emptyPlaceholder}>
              <Ionicons name="camera-outline" size={24} color="#9ca3af" />
              <Text style={styles.emptyText}>No Check-out</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Full Screen Modal */}
      <Modal
        visible={!!selectedSelfie}
        transparent
        animationType="fade"
        onRequestClose={closeSelfie}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {employeeName} - {selectedType === 'check-in' ? 'Check-in' : 'Check-out'} Selfie
            </Text>
            <TouchableOpacity onPress={closeSelfie} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {imageLoading && (
              <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
            )}
            {selectedSelfie && (
              <Image
                source={{ uri: selectedSelfie }}
                style={styles.fullImage}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  selfieBox: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  emptySelfieBox: {
    backgroundColor: '#f9fafb',
    borderColor: '#d1d5db',
  },
  selfieImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  selfieLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  selfieLabelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1f2937',
    paddingTop: 12,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  loader: {
    position: 'absolute',
  },
});
