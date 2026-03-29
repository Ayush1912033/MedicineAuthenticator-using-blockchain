import { ethers } from "ethers";
import { medicineAuthAbi } from "../src/abi/MedicineAuth";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const getContract = async () => {
  try {
    if (!window.ethereum) {
      alert("Install MetaMask");
      return null;
    }

    await window.ethereum.request({ method: "eth_requestAccounts" });

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const code = await provider.getCode(contractAddress);

    if (code === "0x") {
      alert("No contract found on this network!");
      return null;
    }

    const signer = provider.getSigner();

    return new ethers.Contract(contractAddress, medicineAuthAbi, signer);
  } catch (error) {
    console.error("Error getting contract:", error);
    return null;
  }
};
