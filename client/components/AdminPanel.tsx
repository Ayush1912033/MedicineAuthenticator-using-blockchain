import { useEffect, useState } from "react";
import { getContract } from "../utils/contract";

type Request = {
  address: string;
  name: string;
  approved: boolean;
};

const AdminPanel = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionAddress, setActionAddress] = useState<string | null>(null);

  useEffect(() => {
    void loadRequests();
  }, []);

  const loadRequests = async () => {
    const contract = await getContract();
    if (!contract) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const user = await contract.signer.getAddress();
      const owner = await contract.owner();

      if (user.toLowerCase() !== owner.toLowerCase()) {
        setIsOwner(false);
        setRequests([]);
        return;
      }

      setIsOwner(true);

      const addresses = await contract.getAllRequests();
      const data: Request[] = [];

      for (const addr of addresses) {
        const manufacturer = await contract.manufacturers(addr);

        if (!manufacturer.requested) {
          continue;
        }

        data.push({
          address: addr,
          name: manufacturer.name,
          approved: manufacturer.approved,
        });
      }

      setRequests(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (address: string) => {
    const contract = await getContract();
    if (!contract) return;

    try {
      setActionAddress(address);
      const tx = await contract.approveManufacturer(address);
      await tx.wait();
      await loadRequests();
    } catch (error) {
      console.error(error);
    } finally {
      setActionAddress(null);
    }
  };

  const reject = async (address: string) => {
    const contract = await getContract();
    if (!contract) return;

    try {
      setActionAddress(address);
      const tx = await contract.rejectManufacturer(address);
      await tx.wait();
      await loadRequests();
    } catch (error) {
      console.error(error);
    } finally {
      setActionAddress(null);
    }
  };

  if (!isOwner && !loading) {
    return (
      <section className="feature-card info-card">
        <div className="card-heading">
          <div>
            <p className="section-kicker">Admin access</p>
            <h3>Owner wallet required</h3>
          </div>
        </div>
        <p className="muted-text">
          Connect with the contract owner wallet to review pending manufacturer requests.
        </p>
      </section>
    );
  }

  return (
    <section className="feature-card full-width-card">
      <div className="card-heading">
        <div>
          <p className="section-kicker">Governance queue</p>
          <h3>Manufacturer approval requests</h3>
        </div>
        <span className="inline-badge">{loading ? "Syncing" : `${requests.length} requests`}</span>
      </div>

      {loading && <p className="status-banner neutral">Loading requests...</p>}
      {!loading && requests.length === 0 && (
        <div className="empty-state compact">
          <div className="empty-orb" />
          <p>No pending requests found.</p>
        </div>
      )}

      <div className="request-list">
        {requests.map((request) => {
          const disabled = actionAddress === request.address;

          return (
            <article key={request.address} className="request-card">
              <div>
                <span className="request-label">Wallet Address</span>
                <strong>{request.address}</strong>
              </div>
              <div>
                <span className="request-label">Company</span>
                <strong>{request.name}</strong>
              </div>
              <div>
                <span className="request-label">Status</span>
                <strong>{request.approved ? "Approved" : "Pending review"}</strong>
              </div>
              <div className="request-actions">
                {!request.approved && (
                  <>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void approve(request.address)}
                      disabled={disabled}
                    >
                      {disabled ? "Working..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => void reject(request.address)}
                      disabled={disabled}
                    >
                      {disabled ? "Working..." : "Reject"}
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default AdminPanel;
