import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraData, uploadScan } from '../api/upload';

interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  storeId: string;
  cameras: CameraData[];
  onUploadSuccess: () => void;
  // Function to generate the mesh GLB base64 representation
  generateMeshBase64: () => string;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  visible,
  onClose,
  storeId,
  cameras,
  onUploadSuccess,
  generateMeshBase64,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progressText, setProgressText] = useState('');

  const handleUpload = async () => {
    if (!storeId.trim()) {
      Alert.alert('Error', 'Please provide a valid Factory Store ID.');
      return;
    }

    setUploading(true);
    setProgressText('Encoding LiDAR 3D mesh to GLB format...');

    try {
      // Simulate/Trigger GLB generation
      const mesh_glb_base64 = generateMeshBase64();
      
      setProgressText('Uploading 3D model and camera markers...');
      const result = await uploadScan({
        store_id: storeId,
        mesh_glb_base64,
        cameras,
      });

      if (result.success) {
        setProgressText('Upload Complete!');
        setTimeout(() => {
          setUploading(false);
          Alert.alert('Success', 'Scan uploaded successfully to Auris Cloud.');
          onUploadSuccess();
          onClose();
        }, 800);
      } else {
        throw new Error('Server returned unsuccessful upload response.');
      }
    } catch (error: any) {
      console.error(error);
      setUploading(false);
      Alert.alert(
        'Upload Failed',
        error.message || 'An error occurred while uploading your scan data.'
      );
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>UPLOAD FACTORY SCAN</Text>
          <Text style={styles.subtitle}>Store: {storeId}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionHeader}>Cameras Pinned ({cameras.length})</Text>
          
          <ScrollView style={styles.scrollArea}>
            {cameras.length === 0 ? (
              <Text style={styles.emptyText}>No cameras pinned. Tap "Pin Camera" to add some.</Text>
            ) : (
              cameras.map((cam, idx) => (
                <View key={idx} style={styles.cameraRow}>
                  <View style={styles.cameraLabelContainer}>
                    <Text style={styles.cameraIdText}>{cam.camera_id}</Text>
                    <Text style={styles.heightText}>Height: {cam.height.toFixed(2)}m</Text>
                  </View>
                  <View style={styles.coordsContainer}>
                    <Text style={styles.coordText}>X: {cam.position.x.toFixed(2)}</Text>
                    <Text style={styles.coordText}>Y: {cam.position.y.toFixed(2)}</Text>
                    <Text style={styles.coordText}>Z: {cam.position.z.toFixed(2)}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.divider} />

          {uploading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00ff88" />
              <Text style={styles.progressText}>{progressText}</Text>
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={handleUpload}
              >
                <Text style={styles.confirmButtonText}>UPLOAD SCAN</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#121829',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00ff88',
    padding: 24,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  title: {
    fontFamily: 'System',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#a0aabf',
    textAlign: 'center',
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    marginVertical: 16,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00ff88',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  scrollArea: {
    maxHeight: 180,
    marginBottom: 8,
  },
  emptyText: {
    color: '#a0aabf',
    fontStyle: 'italic',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  cameraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1e2538',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00ff88',
  },
  cameraLabelContainer: {
    justifyContent: 'center',
  },
  cameraIdText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  heightText: {
    color: '#a0aabf',
    fontSize: 11,
    marginTop: 2,
  },
  coordsContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  coordText: {
    color: '#00ff88',
    fontFamily: 'Courier',
    fontSize: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  progressText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 13,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#a0aabf',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#a0aabf',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
  },
  confirmButton: {
    backgroundColor: '#00ff88',
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#0a0f1e',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
  },
});

export default UploadModal;
