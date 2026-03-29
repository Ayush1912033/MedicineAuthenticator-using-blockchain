import { connectWallet } from "../utils/connectWallet";

const Navbar = () => {
  const handleConnect = async () => {
    const account = await connectWallet();
    if (account) {
      alert(`Connected: ${account}`);
    }
  };

  return (
    <nav style={{ padding: "10px", background: "#222", color: "#fff" }}>
      <h2>Medicine Auth</h2>
      <button onClick={handleConnect}>Connect Wallet</button>
    </nav>
  );
};

export default Navbar;
