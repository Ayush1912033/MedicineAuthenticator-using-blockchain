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

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    const contract = await getContract();
    if (!contract) return;

    try {
      setLoading(true);

      const signerAddress = await contract.signer.getAddress();
      const manufacturer = await contract.manufacturers(signerAddress);

      if (!manufacturer.approved) {
        alert("You are not an approved manufacturer");
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
        width: 220,
        margin: 2,
      });

      setQrCodeUrl(nextQrCodeUrl);
      setRegisteredId(medicineId);
      alert("Medicine registered successfully");

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
        alert(error.reason);
      } else {
        alert("Transaction failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Register Medicine</h2>

      <input name="id" placeholder="ID" value={form.id} onChange={handleChange} />
      <input name="name" placeholder="Name" value={form.name} onChange={handleChange} />
      <input
        name="manufacturer"
        placeholder="Manufacturer"
        value={form.manufacturer}
        onChange={handleChange}
      />
      <input name="mfgDate" placeholder="MFG Date" value={form.mfgDate} onChange={handleChange} />
      <input
        name="expiryDate"
        placeholder="Expiry Date"
        value={form.expiryDate}
        onChange={handleChange}
      />

      <button onClick={handleSubmit} disabled={loading}>
        {loading ? "Processing..." : "Register"}
      </button>

      {qrCodeUrl && (
        <div style={{ marginTop: "20px" }}>
          <h3>Medicine QR Code</h3>
          <p>Scan this QR code to verify medicine ID: {registeredId}</p>
          <img src={qrCodeUrl} alt={`QR code for medicine ${registeredId}`} />
          <div style={{ marginTop: "10px" }}>
            <a href={qrCodeUrl} download={`medicine-${registeredId}.png`}>
              Download QR
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterMedicine;
