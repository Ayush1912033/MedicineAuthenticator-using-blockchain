export const connectWallet = async () => {
  try {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return null;
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    }) as string[];

    return accounts[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};
