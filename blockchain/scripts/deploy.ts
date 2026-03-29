import hre from "hardhat";

async function main() {
  const MedicineAuth = await hre.ethers.getContractFactory("MedicineAuth");

  const contract = await MedicineAuth.deploy();

  await contract.deployed();

  console.log("Contract deployed to:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
