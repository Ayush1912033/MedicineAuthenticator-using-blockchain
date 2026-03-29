// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MedicineAuth {

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    // ================================
    // 🏭 MANUFACTURER SYSTEM
    // ================================

    struct Manufacturer {
        string name;
        bool approved;
        bool requested;
    }

    mapping(address => Manufacturer) public manufacturers;

    // 🔥 NEW: Track all requests (for admin dashboard)
    address[] public requestedManufacturers;

    modifier onlyApprovedManufacturer() {
        require(manufacturers[msg.sender].approved, "Not approved manufacturer");
        _;
    }

    // 📝 Request access
    function requestAccess(string memory _name) public {
        require(!manufacturers[msg.sender].requested, "Already requested");

        manufacturers[msg.sender] = Manufacturer({
            name: _name,
            approved: false,
            requested: true
        });

        requestedManufacturers.push(msg.sender);
    }

    // ✅ Approve manufacturer
    function approveManufacturer(address _addr) public onlyOwner {
        require(manufacturers[_addr].requested, "No request found");
        manufacturers[_addr].approved = true;
    }

    // ❌ Reject manufacturer (NEW)
    function rejectManufacturer(address _addr) public onlyOwner {
        require(manufacturers[_addr].requested, "No request found");
        delete manufacturers[_addr];
    }

    // 📋 Get all pending requests (NEW)
    function getAllRequests() public view returns (address[] memory) {
        return requestedManufacturers;
    }

    // ================================
    // 💊 MEDICINE SYSTEM
    // ================================

    struct Medicine {
        string id;
        string name;
        string manufacturer;
        string mfgDate;
        string expiryDate;
        bool exists;
    }

    mapping(string => Medicine) private medicines;

    event MedicineRegistered(
        string id,
        string name,
        string manufacturer,
        string mfgDate,
        string expiryDate,
        address registeredBy
    );

    // 🔒 Register medicine
    function registerMedicine(
        string memory _id,
        string memory _name,
        string memory _manufacturer,
        string memory _mfgDate,
        string memory _expiryDate
    ) public onlyApprovedManufacturer {

        require(bytes(_id).length > 0, "ID cannot be empty");
        require(!medicines[_id].exists, "Medicine already exists");

        medicines[_id] = Medicine({
            id: _id,
            name: _name,
            manufacturer: _manufacturer,
            mfgDate: _mfgDate,
            expiryDate: _expiryDate,
            exists: true
        });

        emit MedicineRegistered(
            _id,
            _name,
            _manufacturer,
            _mfgDate,
            _expiryDate,
            msg.sender
        );
    }

    // 🔍 Verify medicine
    function verifyMedicine(string memory _id)
        public
        view
        returns (
            string memory id,
            string memory name,
            string memory manufacturer,
            string memory mfgDate,
            string memory expiryDate,
            bool exists
        )
    {
        require(bytes(_id).length > 0, "Invalid ID");

        Medicine memory med = medicines[_id];
        require(med.exists, "Medicine not found");

        return (
            med.id,
            med.name,
            med.manufacturer,
            med.mfgDate,
            med.expiryDate,
            med.exists
        );
    }

    // 🔎 Check existence
    function medicineExists(string memory _id) public view returns (bool) {
        return medicines[_id].exists;
    }
}