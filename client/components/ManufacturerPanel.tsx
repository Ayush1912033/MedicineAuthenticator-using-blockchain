import { useState } from "react";
import { getContract } from "../utils/contract";

const ManufacturerPanel = () => {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const requestAccess = async () => {
    const contract = await getContract();
    if (!contract) return;

    try {
      setLoading(true);
      setStatus("");
      const tx = await contract.requestAccess(name);
      await tx.wait();
      setStatus("Access request submitted successfully. Admin review is now pending.");
      setName("");
    } catch (error) {
      console.error(error);
      setStatus("Unable to submit the manufacturer access request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workspace-grid">
      <section className="feature-card accent-card">
        <div className="card-heading">
          <div>
            <p className="section-kicker">Onboarding</p>
            <h3>Activate your manufacturer identity</h3>
          </div>
          <span className="inline-badge">Access control</span>
        </div>

        <p className="muted-text">
          Verified manufacturers can register medicines and generate QR codes for traceable
          packaging. Submit your company profile for approval.
        </p>

        <label className="field-label" htmlFor="company-name">
          Company Name
        </label>
        <input
          id="company-name"
          className="app-input"
          placeholder="Enter your legal company name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <button
          type="button"
          className="primary-button"
          onClick={() => void requestAccess()}
          disabled={loading}
        >
          {loading ? "Submitting..." : "Request Manufacturer Access"}
        </button>

        {status && <p className="status-banner neutral">{status}</p>}
      </section>

      <section className="feature-card info-card">
        <div className="card-heading">
          <div>
            <p className="section-kicker">How it works</p>
            <h3>Approval path</h3>
          </div>
        </div>

        <div className="step-list">
          <article>
            <strong>1. Submit your brand profile</strong>
            <p>Send your company name through the access control contract.</p>
          </article>
          <article>
            <strong>2. Wait for governance review</strong>
            <p>An admin approves or rejects the manufacturer request on-chain.</p>
          </article>
          <article>
            <strong>3. Register medicine batches</strong>
            <p>Approved manufacturers gain access to the registration portal.</p>
          </article>
        </div>
      </section>
    </div>
  );
};

export default ManufacturerPanel;
