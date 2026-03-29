import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Html5Qrcode } from "html5-qrcode";
import jsQR from "jsqr";
import { getContract } from "../utils/contract";

type VerifiedMedicine = {
  id: string;
  name: string;
  manufacturer: string;
  mfgDate: string;
  expiry: string;
};

type VerificationResult = VerifiedMedicine | "notfound" | "error" | null;
type CameraDevice = {
  deviceId: string;
  label: string;
};

const scannerElementId = "medicine-qr-reader";

const VerifyMedicine = () => {
  const [id, setId] = useState("");
  const [result, setResult] = useState<VerificationResult>(null);
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [activeCameraLabel, setActiveCameraLabel] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const loadCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const nextCameras = devices
        .filter((device) => device.kind === "videoinput")
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
        }));

      setCameras(nextCameras);

      if (!selectedCameraId && nextCameras.length > 0) {
        setSelectedCameraId(nextCameras[0].deviceId);
      }
    } catch (error) {
      console.error(error);
    }
  }, [selectedCameraId]);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    try {
      if (scanner?.isScanning) {
        await scanner.stop();
      }
      if (scanner) {
        await scanner.clear();
      }
    } catch (error) {
      console.error(error);
    }

    setScanMode(false);
    setActiveCameraLabel("");
  }, []);

  const verifyMedicineById = async (medicineId: string) => {
    if (!medicineId.trim()) {
      alert("Please enter a medicine ID");
      return;
    }

    const contract = await getContract();
    if (!contract) return;

    try {
      setLoading(true);
      setResult(null);

      const data = await contract.verifyMedicine(medicineId.trim());

      setResult({
        id: data[0],
        name: data[1],
        manufacturer: data[2],
        mfgDate: data[3],
        expiry: data[4],
      });
    } catch (error: unknown) {
      console.error(error);

      if (
        typeof error === "object" &&
        error !== null &&
        "reason" in error &&
        typeof error.reason === "string" &&
        error.reason.includes("Medicine not found")
      ) {
        setResult("notfound");
      } else {
        setResult("error");
      }
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    await verifyMedicineById(id);
  };

  const startScanner = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setScanMessage("Camera access is not available in this browser.");
      return;
    }

    await stopScanner();

    const scanner = new Html5Qrcode(scannerElementId);
    scannerRef.current = scanner;

    const cameraConfigs: Array<
      string | { deviceId: { exact: string } } | { facingMode: "environment" }
    > = [];

    if (selectedCameraId) {
      cameraConfigs.push({ deviceId: { exact: selectedCameraId } });
    }

    cameraConfigs.push({ facingMode: "environment" });

    if (cameras.length > 0) {
      cameraConfigs.push(cameras[0].deviceId);
    }

    const seenConfigs = new Set<string>();
    const uniqueConfigs = cameraConfigs.filter((config) => {
      const key = typeof config === "string" ? config : JSON.stringify(config);
      if (seenConfigs.has(key)) return false;
      seenConfigs.add(key);
      return true;
    });

    const scannerConfig = {
      fps: 10,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1,
    };

    setScanMode(true);
    setScanMessage("Point the camera at the medicine QR code.");

    let lastErrorMessage = "Unable to start the camera scanner.";

    for (const cameraConfig of uniqueConfigs) {
      try {
        const activeCamera =
          typeof cameraConfig === "string"
            ? cameras.find((camera) => camera.deviceId === cameraConfig)?.label ?? cameraConfig
            : "Selected camera";

        setActiveCameraLabel(activeCamera);

        await scanner.start(
          cameraConfig,
          scannerConfig,
          async (decodedText) => {
            const rawValue = decodedText.trim();
            if (!rawValue) return;

            setId(rawValue);
            setScanMessage(`Scanned medicine ID: ${rawValue}`);
            await stopScanner();
            await verifyMedicineById(rawValue);
          },
          () => {}
        );

        return;
      } catch (error) {
        console.error(error);

        if (error instanceof Error && error.message) {
          lastErrorMessage = error.message;
        }

        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
          await scanner.clear();
        } catch (clearError) {
          console.error(clearError);
        }
      }
    }

    setScanMessage(`Unable to start the camera scanner: ${lastErrorMessage}`);
    await stopScanner();
  };

  const handleImageScan = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      const image = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        image.close();
        setScanMessage("Unable to prepare the uploaded image for scanning.");
        return;
      }

      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(imageData.data, imageData.width, imageData.height);
      image.close();

      const rawValue = decoded?.data?.trim();

      if (!rawValue) {
        setScanMessage("No QR code was detected in that image.");
        return;
      }

      setId(rawValue);
      setScanMessage(`Scanned medicine ID: ${rawValue}`);
      await verifyMedicineById(rawValue);
    } catch (error) {
      console.error(error);
      setScanMessage("Unable to scan that image.");
    }
  };

  useEffect(() => {
    void loadCameras();

    return () => {
      void stopScanner();
    };
  }, [loadCameras, stopScanner]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Verify Medicine</h2>

      <input
        placeholder="Enter Medicine ID"
        value={id}
        onChange={(e) => setId(e.target.value)}
      />

      <button onClick={verify} disabled={loading}>
        {loading ? "Checking..." : "Verify"}
      </button>

      <div style={{ marginTop: "12px" }}>
        {cameras.length > 0 && (
          <div style={{ marginBottom: "10px" }}>
            <label>
              Camera:
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                style={{ marginLeft: "10px" }}
              >
                {cameras.map((camera) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <button onClick={startScanner} disabled={scanMode || loading}>
          {scanMode ? "Scanner Active" : "Scan QR with Camera"}
        </button>
        {scanMode && (
          <button onClick={() => void stopScanner()} style={{ marginLeft: "10px" }}>
            Stop Scanner
          </button>
        )}
      </div>

      <div style={{ marginTop: "12px" }}>
        <label>
          Upload QR image:
          <input type="file" accept="image/*" onChange={handleImageScan} />
        </label>
      </div>

      <div style={{ marginTop: "16px", display: scanMode ? "block" : "none" }}>
        <div id={scannerElementId} style={{ maxWidth: "360px" }} />
        {activeCameraLabel && <p style={{ marginTop: "8px" }}>Using camera: {activeCameraLabel}</p>}
      </div>

      {scanMessage && <p style={{ marginTop: "10px" }}>{scanMessage}</p>}

      {result && typeof result === "object" && (
        <div style={{ marginTop: "20px" }}>
          <h3 style={{ color: "green" }}>Authentic Medicine</h3>
          <p>
            <strong>ID:</strong> {result.id}
          </p>
          <p>
            <strong>Name:</strong> {result.name}
          </p>
          <p>
            <strong>Manufacturer:</strong> {result.manufacturer}
          </p>
          <p>
            <strong>MFG Date:</strong> {result.mfgDate}
          </p>
          <p>
            <strong>Expiry:</strong> {result.expiry}
          </p>
        </div>
      )}

      {result === "notfound" && <p style={{ color: "orange" }}>Medicine not found</p>}
      {result === "error" && <p style={{ color: "red" }}>Something went wrong</p>}
    </div>
  );
};

export default VerifyMedicine;
