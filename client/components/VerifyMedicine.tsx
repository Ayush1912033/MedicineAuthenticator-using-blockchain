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
type ScanTab = "manual" | "camera" | "upload";

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
  const [activeTab, setActiveTab] = useState<ScanTab>("manual");
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
      setScanMessage("Enter or scan a medicine ID to start verification.");
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
      setScanMessage("Authentic medicine record found on-chain.");
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
        setScanMessage("No blockchain record matched that medicine ID.");
      } else {
        setResult("error");
        setScanMessage("Verification could not be completed right now.");
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
    <div className="workspace-grid verify-layout">
      <section className="feature-card accent-card">
        <div className="card-heading">
          <div>
            <p className="section-kicker">Verification studio</p>
            <h3>Confirm medicine authenticity in seconds</h3>
          </div>
          <span className="inline-badge">{loading ? "Checking" : "Ready"}</span>
        </div>

        <p className="muted-text">Pick a method and verify.</p>

        <div className="tab-row">
          <button
            type="button"
            className={`tab-button ${activeTab === "manual" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("manual");
              void stopScanner();
            }}
          >
            Manual ID
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === "camera" ? "active" : ""}`}
            onClick={() => setActiveTab("camera")}
          >
            Camera Scan
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("upload");
              void stopScanner();
            }}
          >
            Upload Image
          </button>
        </div>

        <div className="input-panel">
          <label className="field-label" htmlFor="medicine-id">
            Medicine ID
          </label>
          <div className="input-action-row">
            <input
              id="medicine-id"
              className="app-input"
              placeholder="Enter or scan a medicine batch ID"
              value={id}
              onChange={(event) => setId(event.target.value)}
            />
            <button
              type="button"
              className="primary-button"
              onClick={() => void verify()}
              disabled={loading}
            >
              {loading ? "Checking..." : "Verify"}
            </button>
          </div>
        </div>

        {activeTab === "camera" && (
          <div className="protocol-panel">
            <div className="protocol-header">
              <div>
                <h4>Camera verification</h4>
                <p>Scan a QR code live.</p>
              </div>
              <div className="protocol-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void startScanner()}
                  disabled={scanMode || loading}
                >
                  {scanMode ? "Scanner Active" : "Start Scanner"}
                </button>
                {scanMode && (
                  <button type="button" className="ghost-button" onClick={() => void stopScanner()}>
                    Stop
                  </button>
                )}
              </div>
            </div>

            {cameras.length > 0 && (
              <label className="field-label" htmlFor="camera-select">
                Camera Source
                <select
                  id="camera-select"
                  className="app-select"
                  value={selectedCameraId}
                  onChange={(event) => setSelectedCameraId(event.target.value)}
                >
                  {cameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className={`scanner-shell ${scanMode ? "active" : ""}`}>
              <div id={scannerElementId} className="scanner-view" />
              {!scanMode && (
                <p className="scanner-placeholder">Activate the scanner to begin live verification.</p>
              )}
            </div>

            {activeCameraLabel && <p className="helper-text">Using camera: {activeCameraLabel}</p>}
          </div>
        )}

        {activeTab === "upload" && (
          <div className="protocol-panel">
            <div className="protocol-header">
              <div>
                <h4>Image upload analysis</h4>
                <p>Upload a QR image.</p>
              </div>
            </div>
            <label className="upload-card" htmlFor="qr-upload">
              <span className="upload-illustration" />
              <strong>Add QR image</strong>
              <small>PNG, JPG, or camera screenshot</small>
              <input id="qr-upload" type="file" accept="image/*" onChange={handleImageScan} />
            </label>
          </div>
        )}

        {scanMessage && <p className="status-banner neutral">{scanMessage}</p>}
      </section>

      <section className="feature-card result-card">
        <div className="card-heading">
          <div>
            <p className="section-kicker">Result panel</p>
            <h3>Medicine trust snapshot</h3>
          </div>
        </div>

        {!result && (
          <div className="empty-state">
            <div className="empty-orb" />
            <p>Scan or enter an ID.</p>
          </div>
        )}

        {result && typeof result === "object" && (
          <div className="verification-success">
            <span className="result-chip success">Authentic</span>
            <h4>{result.name}</h4>
            <div className="result-grid">
              <article>
                <span>ID</span>
                <strong>{result.id}</strong>
              </article>
              <article>
                <span>Manufacturer</span>
                <strong>{result.manufacturer}</strong>
              </article>
              <article>
                <span>MFG Date</span>
                <strong>{result.mfgDate}</strong>
              </article>
              <article>
                <span>Expiry</span>
                <strong>{result.expiry}</strong>
              </article>
            </div>
          </div>
        )}

        {result === "notfound" && (
          <div className="status-panel warning">
            <span className="result-chip warning">Record not found</span>
            <p>This medicine ID is not currently registered on-chain.</p>
          </div>
        )}

        {result === "error" && (
          <div className="status-panel danger">
            <span className="result-chip danger">Verification error</span>
            <p>The verification request failed. Check wallet access and network status, then retry.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default VerifyMedicine;
