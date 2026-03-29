import { useEffect, useState } from "react";
import AdminPanel from "../components/AdminPanel";
import ManufacturerPanel from "../components/ManufacturerPanel";
import Navbar from "../components/Navbar";
import RegisterMedicine from "../components/RegisterMedicine";
import VerifyMedicine from "../components/VerifyMedicine";
import { getContract } from "../utils/contract";

function App() {
  const [account, setAccount] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const load = async () => {
      const contract = await getContract();
      if (!contract) return;

      const address = await contract.signer.getAddress();
      const owner = await contract.owner();

      setAccount(address);
      setIsOwner(address.toLowerCase() === owner.toLowerCase());
    };

    void load();
  }, []);

  return (
    <div>
      <Navbar />

      <div style={{ padding: "10px" }}>
        <p>
          <strong>Connected:</strong> {account}
        </p>
        {isOwner && <p style={{ color: "green" }}>Admin Mode</p>}
      </div>

      <AdminPanel />
      <ManufacturerPanel />
      <RegisterMedicine />
      <VerifyMedicine />
    </div>
  );
}

export default App;
