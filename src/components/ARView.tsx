import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { CameraData } from '../api/upload';

// Defensively import react-native-arkit
let ARKit: any = null;
try {
  ARKit = require('react-native-arkit').default;
} catch (e) {
  console.warn('react-native-arkit not loaded, running in simulator mode');
}

interface ARViewProps {
  isScanning: boolean;
  storeId: string;
  pinnedCameras: CameraData[];
  onPinAdded: (newPin: CameraData) => void;
  arNavigatorRef: React.RefObject<any>;
  onCameraTransformUpdate: (
    position: [number, number, number],
    rotation: [number, number, number]
  ) => void;
}

export const ARView: React.FC<ARViewProps> = ({
  isScanning,
  storeId,
  pinnedCameras,
  onPinAdded,
  arNavigatorRef,
  onCameraTransformUpdate,
}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const device = useCameraDevice('back');
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const pinsGroupRef = useRef<THREE.Group | null>(null);
  const roomMeshRef = useRef<THREE.Mesh | null>(null);

  // Request camera permission
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Update camera pins in Three.js scene whenever pinnedCameras prop updates
  useEffect(() => {
    if (!pinsGroupRef.current || !sceneRef.current) return;

    // Clear existing pins
    while (pinsGroupRef.current.children.length > 0) {
      const obj = pinsGroupRef.current.children[0];
      pinsGroupRef.current.remove(obj);
    }

    // Add new pins as green spheres
    pinnedCameras.forEach((cam) => {
      const geometry = new THREE.SphereGeometry(0.12, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        toneMapped: false,
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(cam.position.x, cam.position.y, cam.position.z);
      
      pinsGroupRef.current?.add(sphere);
    });
  }, [pinnedCameras]);

  const onGLContextCreate = async (gl: any) => {
    // 1. Create Three.js Renderer
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const renderer = new THREE.WebGLRenderer({
      canvas: gl.canvas,
      context: gl,
      alpha: true, // transparent background to see camera feed
      antialias: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(gl.pixelRatio || 1);

    // 2. Create Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Add a group to hold camera pins
    const pinsGroup = new THREE.Group();
    scene.add(pinsGroup);
    pinsGroupRef.current = pinsGroup;

    // 3. Create Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 1000);
    camera.position.set(0, 0, 0);

    // 4. Create Simulated LiDAR Mesh (Room wireframe box + floor grids)
    const roomGeo = new THREE.BoxGeometry(8, 4, 8, 8, 4, 8);
    const roomMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const roomMesh = new THREE.Mesh(roomGeo, roomMat);
    roomMesh.position.set(0, 0, 0);
    scene.add(roomMesh);
    roomMeshRef.current = roomMesh;

    // Add ambient lighting
    const light = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(light);

    // 5. Render Loop
    let requestId: number;
    let simTime = 0;

    const render = async () => {
      if (!isScanning) return;

      let currentPos: [number, number, number] = [0, 0, 0];
      let currentRot: [number, number, number] = [0, 0, 0];

      // Read ARKit camera state if available
      if (ARKit) {
        try {
          const pos = await ARKit.getCameraPosition();
          const rot = await ARKit.getCameraRotation();
          if (pos && rot) {
            camera.position.set(pos.x, pos.y, pos.z);
            camera.rotation.set(rot.pitch, rot.yaw, rot.roll);
            currentPos = [pos.x, pos.y, pos.z];
            currentRot = [rot.pitch, rot.yaw, rot.roll];
          }
        } catch (e) {
          // fallback to simulator movement
        }
      } else {
        // Simulator Mock movement: gentle float
        simTime += 0.01;
        const mockX = Math.sin(simTime) * 0.5;
        const mockY = Math.cos(simTime * 0.5) * 0.2;
        const mockZ = -1.0;
        camera.position.set(mockX, mockY, mockZ);
        currentPos = [mockX, mockY, mockZ];
        currentRot = [0, simTime % (Math.PI * 2), 0];
      }

      // Update parent index.tsx with current coordinates
      onCameraTransformUpdate(currentPos, currentRot);

      // Animate the room wireframe slightly to simulate active LiDAR scan updating
      if (roomMesh) {
        roomMesh.rotation.y += 0.001;
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
      requestId = requestAnimationFrame(render);
    };

    render();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(requestId);
    };
  };

  return (
    <View style={styles.container}>
      {hasPermission && device ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isScanning}
        />
      ) : (
        <View style={styles.fallbackCamera}>
          <Text style={styles.fallbackText}>Camera Feed Unavailable</Text>
        </View>
      )}

      {/* Transparent 3D Canvas Overlay */}
      <GLView
        style={StyleSheet.absoluteFill}
        onContextCreate={onGLContextCreate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fallbackCamera: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050a15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#808da4',
    fontSize: 14,
  },
});

export default ARView;
