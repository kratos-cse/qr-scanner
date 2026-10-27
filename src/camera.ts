import { BrowserQRCodeReader } from "@zxing/browser";

export type CameraHandle = { stop: () => void };

export async function startQrCamera(
  video: HTMLVideoElement,
  onToken: (token: string) => void,
): Promise<CameraHandle> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser cannot use the camera. Enter the QR token manually.");
  }
  const reader = new BrowserQRCodeReader();
  try {
    const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
      if (result) onToken(result.getText());
    });
    return { stop: () => controls.stop() };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      throw new Error("Camera permission was denied. Allow the camera or enter the QR token manually.");
    }
    if (name === "NotFoundError" || name === "NotReadableError") {
      throw new Error("No camera is available. Enter the QR token manually.");
    }
    throw new Error("The camera could not start. Enter the QR token manually.");
  }
}
