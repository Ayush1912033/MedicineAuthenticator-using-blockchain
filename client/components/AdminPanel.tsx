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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (addr: string) => {
    const contract = await getContract();
    if (!contract) return;

    try {
      setActionAddress(addr);
      const tx = await contract.approveManufacturer(addr);
      await tx.wait();
      alert("Approved successfully");
      await loadRequests();
    } catch (err) {
      console.error(err);
      alert("Approval failed");
    } finally {
      setActionAddress(null);
    }
  };

  const reject = async (addr: string) => {
    const contract = await getContract();
    if (!contract) return;

    try {
      setActionAddress(addr);
      const tx = await contract.rejectManufacturer(addr);
      await tx.wait();
      alert("Rejected successfully");
      await loadRequests();
    } catch (err) {
      console.error(err);
      alert("Reject failed");
    } finally {
      setActionAddress(null);
    }
  };

  if (!isOwner && !loading) return null;

  return (
    <div style={{ padding: "20px", margin: "20px", border: "1px solid gray" }}>
      <h2>Admin Panel</h2>

      {loading && <p>Loading requests...</p>}
      {!loading && requests.length === 0 && <p>No pending requests found</p>}

      {requests.map((req) => {
        const disabled = actionAddress === req.address;

        return (
          <div key={req.address} style={{ marginBottom: "10px" }}>
            <p>
              <strong>Address:</strong> {req.address}
            </p>
            <p>
              <strong>Company:</strong> {req.name}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              {req.approved ? (
                <span style={{ color: "green" }}>Approved</span>
              ) : (
                <span style={{ color: "orange" }}>Pending</span>
              )}
            </p>

            {!req.approved && (
              <>
                <button onClick={() => approve(req.address)} disabled={disabled}>
                  {disabled ? "Working..." : "Approve"}
                </button>

                <button
                  onClick={() => reject(req.address)}
                  disabled={disabled}
                  style={{ marginLeft: "10px", background: "red", color: "white" }}
                >
                  {disabled ? "Working..." : "Reject"}
                </button>
              </>
            )}

            <hr />
          </div>
        );
      })}
    </div>
  );
};

export default AdminPanel;
