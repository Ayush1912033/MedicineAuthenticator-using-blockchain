import { useState, type ChangeEvent } from "react";
import QRCode from "qrcode";
import { getContract } from "../utils/contract";

type RegisterMedicineForm = {
  id: string;
  name: string;
  manufacturer: string;
  mfgDate: string;
  expiryDate: string;
};

const RegisterMedicine = () => {
  const [form, setForm] = useState<RegisterMedicineForm>({
    id: "",
    name: "",
    manufacturer: "",
    mfgDate: "",
    expiryDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [registeredId, setRegisteredId] = useState("");
  const [status, setStatus] = useState("");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async () => {
    const contract = await getContract();
    if (!contract) return;

    try {
      setLoading(true);
      setStatus("");

      const signerAddress = await contract.signer.getAddress();
      const manufacturer = await contract.manufacturers(signerAddress);

      if (!manufacturer.approved) {
        setStatus("This wallet is not approved as a manufacturer yet.");
        return;
      }

      const medicineId = form.id.trim();

      const tx = await contract.registerMedicine(
        medicineId,
        form.name,
        form.manufacturer,
        form.mfgDate,
        form.expiryDate
      );

      await tx.wait();

      const nextQrCodeUrl = await QRCode.toDataURL(medicineId, {
        width: 240,
        margin: 2,
      });

      setQrCodeUrl(nextQrCodeUrl);
      setRegisteredId(medicineId);
      setStatus("Medicine registered successfully and QR code generated.");

      setForm({
        id: "",
        name: "",
        manufacturer: "",
        mfgDate: "",
        expiryDate: "",
      });
    } catch (error: unknown) {
      console.error(error);

      if (
        typeof error === "object" &&
        error !== null &&
        "reason" in error &&
        typeof error.reason === "string"
      ) {
        setStatus(error.reason);
      } else {
        setStatus("Transaction failed while registering the medicine.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workspace-grid">
      <section className="feature-card accent-card">
        <div className="card-heading">
          <div>
            <p className="section-kicker">Registration</p>
            <h3>Publish a medicine batch</h3>
          </div>
          <span className="inline-badge">Manufacturer only</span>
        </div>

        <div className="form-grid">
          <label className="field-group">
            <span className="field-label">Batch ID</span>
            <input
              className="app-input"
              name="id"
              placeholder="MED-2026-001"
              value={form.id}
              onChange={handleChange}
            />
          </label>
          <label className="field-group">
            <span className="field-label">Medicine Name</span>
            <input
              className="app-input"
              name="name"
              placeholder="Paracetamol 500mg"
              value={form.name}
              onChange={handleChange}
            />
          </label>
          <label className="field-group">
            <span className="field-label">Manufacturer</span>
            <input
              className="app-input"
              name="manufacturer"
              placeholder="Your company name"
              value={form.manufacturer}
              onChange={handleChange}
            />
          </label>
          <label className="field-group">
            <span className="field-label">Manufacturing Date</span>
            <input
              className="app-input"
              name="mfgDate"
              placeholder="2026-03-29"
              value={form.mfgDate}
              onChange={handleChange}
            />
          </label>
          <label className="field-group">
            <span className="field-label">Expiry Date</span>
            <input
              className="app-input"
              name="expiryDate"
              placeholder="2028-03-29"
              value={form.expiryDate}
              onChange={handleChange}
            />
          </label>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => void handleSubmit()}
          disabled={loading}
        >
          {loading ? "Processing..." : "Register Medicine"}
        </button>

        {status && <p className="status-banner neutral">{status}</p>}
      </section>

      <section className="feature-card result-card">
        <div className="card-heading">
          <div>
            <p className="section-kicker">QR asset</p>
            <h3>Packaging-ready verification code</h3>
          </div>
        </div>

        {!qrCodeUrl && (
          <div className="empty-state compact">
            <div className="empty-orb" />
            <p>Register a medicine batch to generate a downloadable QR code asset.</p>
          </div>
        )}

        {qrCodeUrl && (
          <div className="qr-preview">
            <img src={qrCodeUrl} alt={`QR code for medicine ${registeredId}`} />
            <div>
              <span className="result-chip success">Ready to export</span>
              <p>Medicine ID: {registeredId}</p>
              <a className="text-link" href={qrCodeUrl} download={`medicine-${registeredId}.png`}>
                Download QR image
              </a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default RegisterMedicine;
