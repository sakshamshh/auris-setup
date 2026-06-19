import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  FlatList,
  ScrollView,
} from 'react-native';
import ARView from '../components/ARView';
import UploadModal from '../components/UploadModal';
import { CameraData } from '../api/upload';

// Dropdown options updated to cam1 through cam8
const AVAILABLE_CAMERA_IDS = ['cam1', 'cam2', 'cam3', 'cam4', 'cam5', 'cam6', 'cam7', 'cam8'];

export default function HomeScreen() {
  const [storeId, setStoreId] = useState('rudrapur_factory');
  const [isScanning, setIsScanning] = useState(false);
  
  // Real-time camera tracking state from ARKit/sensors
  const [cameraPos, setCameraPos] = useState<[number, number, number]>([0, 0, 0]);
  const [cameraRot, setCameraRot] = useState<[number, number, number]>([0, 0, 0]);
  
  // List of cameras pinned in the 3D space
  const [pinnedCameras, setPinnedCameras] = useState<CameraData[]>([]);
  
  // Pinned camera manual coordinate adjustments
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [showIdDropdown, setShowIdDropdown] = useState(false);
  const [showOffsetPanel, setShowOffsetPanel] = useState(false);
  
  // Offset sliders/input fields
  const [offsetX, setOffsetX] = useState('0.0');
  const [offsetY, setOffsetY] = useState('2.5'); // Default height offset
  const [offsetZ, setOffsetZ] = useState('-1.5'); // Default distance offset

  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  const arNavigatorRef = useRef<any>(null);

  const toggleScan = () => {
    if (!storeId.trim()) {
      Alert.alert('Error', 'Please enter a valid Factory Store ID first.');
      return;
    }
    if (isScanning) {
      setIsScanning(false);
    } else {
      setPinnedCameras([]); // Reset on new scan
      setIsScanning(true);
    }
  };

  // Callback from ARView when camera moves in the spatial environment
  const handleCameraTransformUpdate = (
    position: [number, number, number],
    rotation: [number, number, number]
  ) => {
    setCameraPos(position);
    setCameraRot(rotation);
  };

  const handlePinPress = () => {
    setShowIdDropdown(true);
  };

  // Triggers when user selects a Camera ID
  const selectCameraId = (cameraId: string) => {
    setShowIdDropdown(false);
    
    // Check if camera ID is already pinned
    if (pinnedCameras.some(c => c.camera_id === cameraId)) {
      Alert.alert('Duplicate Pin', `Camera ${cameraId} has already been pinned in this factory scan.`);
      return;
    }

    setSelectedCameraId(cameraId);
    setShowOffsetPanel(true);
  };

  // Save the camera pin with manual offsets
  const confirmPinCoordinates = () => {
    if (!selectedCameraId) return;

    const xVal = parseFloat(offsetX) || 0.0;
    const yVal = parseFloat(offsetY) || 0.0;
    const zVal = parseFloat(offsetZ) || 0.0;

    // Capture the current camera/device position in ARKit space
    const devX = cameraPos[0];
    const devY = cameraPos[1];
    const devZ = cameraPos[2];

    const pitch = parseFloat(cameraRot[0].toFixed(1));
    const yaw = parseFloat(cameraRot[1].toFixed(1));
    const roll = parseFloat(cameraRot[2].toFixed(1));

    // Final position = device position + offset estimates
    const finalX = parseFloat((devX + xVal).toFixed(3));
    const finalY = parseFloat((devY + yVal).toFixed(3));
    const finalZ = parseFloat((devZ + zVal).toFixed(3));

    // Vertical height estimate is calculated relative to starting position
    const heightVal = parseFloat(Math.abs(finalY).toFixed(2));

    const newPin: CameraData = {
      camera_id: selectedCameraId,
      position: { x: finalX, y: finalY, z: finalZ },
      rotation: { pitch, yaw, roll },
      height: heightVal,
    };

    setPinnedCameras(prev => [...prev, newPin]);
    setShowOffsetPanel(false);
    setSelectedCameraId(null);

    // Reset default offsets
    setOffsetX('0.0');
    setOffsetY('2.5');
    setOffsetZ('-1.5');

    Alert.alert(
      'Camera Pinned', 
      `Successfully pinned ${selectedCameraId} at coordinates:\n[X: ${finalX}, Y: ${finalY}, Z: ${finalZ}]\nHeight: ${heightVal}m`
    );
  };

  // Mock generator of a wireframe factory mesh GLB base64 representation
  const generateMeshBase64 = () => {
    // Return a dummy valid 3D GLTF-binary base64 representation of the wireframe mesh
    return "Z2xURgIAAACwAgAAtAIAAA8AAABnZW9tZXRyeQAAAAAA";
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background AR View */}
      {isScanning ? (
        <ARView
          arNavigatorRef={arNavigatorRef}
          isScanning={isScanning}
          storeId={storeId}
          onCameraTransformUpdate={handleCameraTransformUpdate}
          pinnedCameras={pinnedCameras}
          onPinAdded={(newPin) => setPinnedCameras(prev => [...prev, newPin])}
        />
      ) : (
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>AURIS SCANNER</Text>
          <Text style={styles.welcomeDescription}>
            LiDAR-powered factory 3D reconstruction and CCTV camera positioning utility.
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>⚡ Real-time simulated LiDAR Mesh wireframe mapping</Text>
            <Text style={styles.featureItem}>📍 Manual Pinning at current device location with offsets</Text>
            <Text style={styles.featureItem}>📱 Dropdown select for Camera IDs (cam1 - cam8)</Text>
            <Text style={styles.featureItem}>☁️ Automatic GCS GLB and MongoDB scan upload</Text>
          </View>
        </View>
      )}

      {/* Floating HUD Overlays */}
      <SafeAreaView style={styles.hudOverlay} pointerEvents="box-none">
        
        {/* Top Control Bar */}
        <View style={styles.topBar}>
          <TextInput
            style={styles.storeInput}
            value={storeId}
            onChangeText={setStoreId}
            placeholder="Store ID"
            placeholderTextColor="#808da4"
            editable={!isScanning}
          />
          <TouchableOpacity
            style={[styles.scanButton, isScanning && styles.stopButton]}
            onPress={toggleScan}
          >
            <Text style={styles.scanButtonText}>
              {isScanning ? 'STOP SCAN' : 'START SCAN'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live HUD Scanner Panel */}
        {isScanning && (
          <View style={styles.scannerPanel}>
            <Text style={styles.scannerPanelTitle}>HUD SCANNER STATUS</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>AR Engine:</Text>
              <Text style={styles.statusValueActive}>EXPO-GL + THREE</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Position Tracking:</Text>
              <Text style={[styles.statusValueActive, { color: '#00ff88' }]}>
                ARKit ACTIVE
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Cameras Pinned:</Text>
              <Text style={styles.statusValue}>{pinnedCameras.length}</Text>
            </View>
            <View style={styles.coordsPanel}>
              <Text style={styles.coordLabel}>Device Coordinates:</Text>
              <Text style={styles.coordText}>X: {cameraPos[0].toFixed(2)}</Text>
              <Text style={styles.coordText}>Y: {cameraPos[1].toFixed(2)}</Text>
              <Text style={styles.coordText}>Z: {cameraPos[2].toFixed(2)}</Text>
              <Text style={styles.coordText}>Pitch: {cameraRot[0].toFixed(0)}°</Text>
              <Text style={styles.coordText}>Yaw: {cameraRot[1].toFixed(0)}°</Text>
            </View>
          </View>
        )}

        {/* Bottom Interactive Bar */}
        <View style={styles.bottomBar} pointerEvents="box-none">
          {isScanning && (
            <TouchableOpacity
              style={styles.pinButton}
              onPress={handlePinPress}
            >
              <Text style={styles.pinButtonText}>📍 PIN CAMERA HERE</Text>
            </TouchableOpacity>
          )}

          {isScanning && (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => setUploadModalVisible(true)}
            >
              <Text style={styles.uploadButtonText}>UPLOAD SCAN</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Camera ID Dropdown Selector Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showIdDropdown}
        onRequestClose={() => setShowIdDropdown(false)}
      >
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>SELECT CAMERA ID</Text>
            <FlatList
              data={AVAILABLE_CAMERA_IDS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => selectCameraId(item)}
                >
                  <Text style={styles.dropdownItemText}>{item}</Text>
                  {pinnedCameras.some(c => c.camera_id === item) && (
                    <Text style={styles.pinnedBadge}>PINNED</Text>
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.dropdownCloseButton}
              onPress={() => setShowIdDropdown(false)}
            >
              <Text style={styles.dropdownCloseText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manual Coordinates Offset Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showOffsetPanel}
        onRequestClose={() => {
          setShowOffsetPanel(false);
          setSelectedCameraId(null);
        }}
      >
        <View style={styles.offsetOverlay}>
          <View style={styles.offsetContainer}>
            <Text style={styles.offsetTitle}>ESTIMATE POSITION OFFSET</Text>
            <Text style={styles.offsetSubtitle}>Camera: {selectedCameraId}</Text>
            
            <View style={styles.divider} />
            
            <ScrollView style={styles.offsetForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>X Offset (Left/Right - meters):</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={offsetX}
                  onChangeText={setOffsetX}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Y Offset (Height/Vertical - meters):</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={offsetY}
                  onChangeText={setOffsetY}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Z Offset (Forward/Backward - meters):</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={offsetZ}
                  onChangeText={setOffsetZ}
                />
              </View>
            </ScrollView>

            <View style={styles.divider} />

            <View style={styles.offsetButtons}>
              <TouchableOpacity
                style={[styles.offsetBtn, styles.offsetCancelBtn]}
                onPress={() => {
                  setShowOffsetPanel(false);
                  setSelectedCameraId(null);
                }}
              >
                <Text style={styles.offsetCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.offsetBtn, styles.offsetConfirmBtn]}
                onPress={confirmPinCoordinates}
              >
                <Text style={styles.offsetConfirmText}>CONFIRM PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Final Upload Preview and Submission Modal */}
      <UploadModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        storeId={storeId}
        cameras={pinnedCameras}
        onUploadSuccess={() => {
          setIsScanning(false);
          setPinnedCameras([]);
        }}
        generateMeshBase64={generateMeshBase64}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#0a0f1e',
  },
  welcomeTitle: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00ff88',
    letterSpacing: 3,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 255, 136, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  welcomeDescription: {
    fontSize: 15,
    color: '#a0aabf',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 35,
  },
  featureList: {
    alignSelf: 'stretch',
    backgroundColor: '#121829',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.1)',
  },
  featureItem: {
    color: '#ffffff',
    fontSize: 14,
    marginBottom: 12,
  },
  hudOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 15, 30, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 136, 0.1)',
  },
  storeInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#121829',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(160, 170, 191, 0.3)',
    color: '#ffffff',
    paddingHorizontal: 12,
    marginRight: 12,
    fontSize: 14,
  },
  scanButton: {
    height: 44,
    backgroundColor: '#00ff88',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  stopButton: {
    backgroundColor: '#ff4949',
  },
  scanButtonText: {
    color: '#0a0f1e',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
  },
  scannerPanel: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(18, 24, 41, 0.85)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00ff88',
    padding: 14,
    marginLeft: 16,
    marginTop: 16,
    width: 200,
  },
  scannerPanelTitle: {
    color: '#a0aabf',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusLabel: {
    color: '#ffffff',
    fontSize: 11,
  },
  statusValue: {
    color: '#00ff88',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusValueActive: {
    color: '#00ff88',
    fontSize: 10,
    fontWeight: 'bold',
  },
  coordsPanel: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 255, 136, 0.1)',
    paddingTop: 8,
  },
  coordLabel: {
    color: '#a0aabf',
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  coordText: {
    color: '#00ff88',
    fontFamily: 'Courier',
    fontSize: 11,
  },
  bottomBar: {
    padding: 16,
    gap: 12,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  pinButton: {
    width: '100%',
    maxWidth: 300,
    height: 52,
    backgroundColor: '#00ff88',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  pinButtonText: {
    color: '#0a0f1e',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1.5,
  },
  uploadButton: {
    width: '100%',
    maxWidth: 300,
    height: 50,
    backgroundColor: '#121829',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#00ff88',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#00ff88',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1.5,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.8)',
    justifyContent: 'flex-end',
  },
  dropdownContainer: {
    backgroundColor: '#121829',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    padding: 24,
    maxHeight: '60%',
  },
  dropdownTitle: {
    color: '#00ff88',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(160, 170, 191, 0.1)',
  },
  dropdownItemText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  pinnedBadge: {
    color: '#ff4949',
    fontSize: 11,
    fontWeight: 'bold',
  },
  dropdownCloseButton: {
    marginTop: 16,
    height: 48,
    backgroundColor: '#1e2538',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownCloseText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  offsetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  offsetContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#121829',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#00ff88',
    padding: 20,
  },
  offsetTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  offsetSubtitle: {
    fontSize: 12,
    color: '#00ff88',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    marginVertical: 12,
  },
  offsetForm: {
    maxHeight: 250,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: '#a0aabf',
    fontSize: 12,
    marginBottom: 6,
  },
  textInput: {
    height: 40,
    backgroundColor: '#1e2538',
    borderRadius: 6,
    color: '#ffffff',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(160, 170, 191, 0.2)',
  },
  offsetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  offsetBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offsetCancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#a0aabf',
    marginRight: 6,
  },
  offsetCancelText: {
    color: '#a0aabf',
    fontWeight: 'bold',
  },
  offsetConfirmBtn: {
    backgroundColor: '#00ff88',
    marginLeft: 6,
  },
  offsetConfirmText: {
    color: '#0a0f1e',
    fontWeight: 'bold',
  },
});
