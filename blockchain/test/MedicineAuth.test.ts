import { expect } from "chai";
import { ethers } from "hardhat";

describe("MedicineAuth Contract", function () {
  async function deployContract() {
    const [owner, manufacturer, other] = await ethers.getSigners();

    const MedicineAuth = await ethers.getContractFactory("MedicineAuth");
    const contract = await MedicineAuth.deploy();
    await contract.deployed();

    return { contract, owner, manufacturer, other };
  }

  it("allows an approved manufacturer to register a medicine", async function () {
    const { contract, manufacturer } = await deployContract();

    await contract.connect(manufacturer).requestAccess("ABC Pharma");
    await contract.approveManufacturer(manufacturer.address);

    await contract
      .connect(manufacturer)
      .registerMedicine("MED123", "Paracetamol", "ABC Pharma", "2025", "2028");

    const result = await contract.verifyMedicine("MED123");

    expect(result[1]).to.equal("Paracetamol");
    expect(result[5]).to.equal(true);
  });

  it("does not allow duplicate medicine IDs", async function () {
    const { contract, manufacturer } = await deployContract();

    await contract.connect(manufacturer).requestAccess("ABC Pharma");
    await contract.approveManufacturer(manufacturer.address);

    await contract
      .connect(manufacturer)
      .registerMedicine("MED123", "Paracetamol", "ABC Pharma", "2025", "2028");

    await expect(
      contract
        .connect(manufacturer)
        .registerMedicine("MED123", "FakeMed", "Fake Pharma", "2025", "2027")
    ).to.be.revertedWith("Medicine already exists");
  });

  it("reverts when verifying a non-existing medicine", async function () {
    const { contract } = await deployContract();

    await expect(contract.verifyMedicine("INVALID")).to.be.revertedWith(
      "Medicine not found"
    );
  });

  it("prevents unapproved manufacturers from registering medicine", async function () {
    const { contract, other } = await deployContract();

    await expect(
      contract
        .connect(other)
        .registerMedicine("MED999", "TestMed", "XYZ", "2025", "2027")
    ).to.be.revertedWith("Not approved manufacturer");
  });

  it("lets only the owner approve a manufacturer", async function () {
    const { contract, manufacturer, other } = await deployContract();

    await contract.connect(manufacturer).requestAccess("Maker");

    await expect(
      contract.connect(other).approveManufacturer(manufacturer.address)
    ).to.be.revertedWith("Not authorized");
  });
});
