import { useState } from "react";
import { getContract } from "../utils/contract";

const ManufacturerPanel = () => {
  const [name, setName] = useState("");

  const requestAccess = async () => {
    const contract = await getContract();
    if (!contract) return;

    try {
      const tx = await contract.requestAccess(name);
      await tx.wait();
      alert("Request submitted");
    } catch (err) {
      console.error(err);
      alert("Error requesting access");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Manufacturer Access</h2>

      <div>
        <h3>Request Access</h3>
        <input
          placeholder="Company Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={requestAccess}>Request</button>
      </div>
    </div>
  );
};

export default ManufacturerPanel;
