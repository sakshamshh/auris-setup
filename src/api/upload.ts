import axios from 'axios';

const API_BASE_URL = 'https://auris.skymlabs.com/api';

export interface CameraPosition {
  x: number;
  y: number;
  z: number;
}

export interface CameraRotation {
  pitch: number;
  yaw: number;
  roll: number;
}

export interface CameraData {
  camera_id: string;
  position: CameraPosition;
  rotation: CameraRotation;
  height: number;
}

export interface ScanUploadPayload {
  store_id: string;
  mesh_glb_base64: string;
  cameras: CameraData[];
}

/**
 * Uploads the final LiDAR 3D mesh (GLB) and camera markers to the Auris backend.
 * @param payload The store scan details, GLB base64 data, and camera positions.
 */
export const uploadScan = async (payload: ScanUploadPayload): Promise<{ success: boolean }> => {
  try {
    const response = await axios.post<{ success: boolean }>(
      `${API_BASE_URL}/factory/scan`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error('Error uploading factory scan:', error);
    throw error;
  }
};
