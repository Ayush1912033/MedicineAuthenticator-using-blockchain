import { useEffect, useState } from "react";
import AdminPanel from "../components/AdminPanel";
import ManufacturerPanel from "../components/ManufacturerPanel";
import Navbar from "../components/Navbar";
import RegisterMedicine from "../components/RegisterMedicine";
import VerifyMedicine from "../components/VerifyMedicine";
import "./App.css";
import { connectWallet } from "../utils/connectWallet";
import { getContract } from "../utils/contract";

type PortalId = "verify" | "manufacturer" | "register" | "admin";

const portals: Array<{
  id: PortalId;
  label: string;
  short: string;
}> = [
  { id: "verify", label: "Verify", short: "Check medicine" },
  { id: "manufacturer", label: "Access", short: "Request access" },
  { id: "register", label: "Register", short: "Add a batch" },
  { id: "admin", label: "Admin", short: "Review requests" },
];

const App = () => {
  const [account, setAccount] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [activePortal, setActivePortal] = useState<PortalId>("verify");
  const [walletStatus, setWalletStatus] = useState("Wallet ready");

  useEffect(() => {
    const load = async () => {
      const contract = await getContract();
      if (!contract) {
        setWalletStatus("Connect wallet");
        return;
      }

      try {
        const address = await contract.signer.getAddress();
        const owner = await contract.owner();

        setAccount(address);
        setIsOwner(address.toLowerCase() === owner.toLowerCase());
        setWalletStatus("Connected");
      } catch (error) {
        console.error(error);
        setWalletStatus("Network issue");
      }
    };

    void load();
  }, []);

  const handleConnect = async () => {
    const nextAccount = await connectWallet();

    if (!nextAccount) {
      setWalletStatus("Connect failed");
      return;
    }

    setAccount(nextAccount);
    setWalletStatus("Syncing...");

    const contract = await getContract();
    if (!contract) return;

    try {
      const owner = await contract.owner();
      setIsOwner(nextAccount.toLowerCase() === owner.toLowerCase());
      setWalletStatus("Connected");
    } catch (error) {
      console.error(error);
      setWalletStatus("Role unavailable");
    }
  };

  const activePortalDetails = portals.find((portal) => portal.id === activePortal) ?? portals[0];

  return (
    <div className="app-shell">
      <Navbar
        account={account}
        isOwner={isOwner}
        status={walletStatus}
        onConnect={handleConnect}
      />

      <main className="app-main">
        <section className="hero-panel compact-hero">
          <div className="hero-copy">
            <span className="hero-badge">MedSecure</span>
            <h1>Secure medicine verification.</h1>
            <p className="hero-text">Fast, clean, trusted.</p>

            <div className="hero-actions">
              {portals.map((portal) => (
                <button
                  key={portal.id}
                  type="button"
                  className={`portal-pill ${activePortal === portal.id ? "active" : ""}`}
                  onClick={() => setActivePortal(portal.id)}
                >
                  <span>{portal.label}</span>
                  <small>{portal.short}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="hero-visual slim-visual">
            <article className="mini-stat highlight">
              <span>{activePortalDetails.label}</span>
              <strong>{activePortalDetails.short}</strong>
            </article>
            <article className="mini-stat">
              <span>Wallet</span>
              <strong>{account ? "Connected" : "Disconnected"}</strong>
            </article>
            <article className="mini-stat">
              <span>Mode</span>
              <strong>{isOwner ? "Admin" : "User"}</strong>
            </article>
          </div>
        </section>

        <section className="portal-stage compact-stage">
          <div className="section-heading compact-heading">
            <h2>{activePortalDetails.label}</h2>
            <span className="section-tag">{activePortalDetails.short}</span>
          </div>

          {activePortal === "verify" && <VerifyMedicine />}
          {activePortal === "manufacturer" && <ManufacturerPanel />}
          {activePortal === "register" && <RegisterMedicine />}
          {activePortal === "admin" && <AdminPanel />}
        </section>
      </main>
    </div>
  );
};

export default App;
