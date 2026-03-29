type NavbarProps = {
  account: string;
  isOwner: boolean;
  status: string;
  onConnect: () => void | Promise<void>;
};

const Navbar = ({ account, isOwner, status, onConnect }: NavbarProps) => {
  return (
    <nav className="topbar">
      <div className="brand-block">
        <div className="brand-mark">MS</div>
        <div>
          <h2>MedSecure</h2>
        </div>
      </div>

      <div className="topbar-actions">
        <div className="wallet-chip compact-chip">
          <span className={`status-dot ${account ? "online" : ""}`} />
          <div>
            <strong>{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : status}</strong>
            <small>{isOwner ? "Admin" : "User"}</small>
          </div>
        </div>

        <button type="button" className="primary-button" onClick={() => void onConnect()}>
          {account ? "Reconnect" : "Connect"}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
