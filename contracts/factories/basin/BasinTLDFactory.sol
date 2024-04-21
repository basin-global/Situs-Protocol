// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "../../lib/strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./BasinTLD.sol";
import "../../interfaces/IBasinTLDFactory.sol";
import "../../interfaces/IBasinForbiddenTlds.sol";

/// @title Basin Domains TLD Factory contract
/// @author Tempe Techie
/// @notice Factory contract dynamically generates new TLD contracts.
contract BasinTLDFactory is IBasinTLDFactory, Ownable, ReentrancyGuard {
    using strings for string;

    string[] public tlds; // existing TLDs
    mapping(string => address) public override tldNamesAddresses; // a mapping of TLDs (string => TLDaddress)

    address public forbiddenTlds; // address of the contract that stores the list of forbidden TLDs
    address public metadataAddress; // default BasinMetadata address

    uint256 public price; // price for creating a new TLD
    uint256 public royalty = 0; // royalty for Basin Domains when new domain is minted
    bool public buyingEnabled = false; // buying TLDs enabled (true/false)
    uint256 public nameMaxLength = 40; // the maximum length of a TLD name

    event TldCreated(address indexed user, address indexed owner, string tldName, address tldAddress);
    event ChangeTldPrice(address indexed user, uint256 tldPrice);

    constructor(uint256 _price, address _forbiddenTlds, address _metadataAddress) {
        price = _price;
        forbiddenTlds = _forbiddenTlds;
        metadataAddress = _metadataAddress;
    }

    // READ
    function getTldsArray() public view override returns (string[] memory) {
        return tlds;
    }

    function _validTldName(string memory _name) internal view {
        // ex-modifier turned into internal function to optimize contract size
        require(strings.len(strings.toSlice(_name)) > 1, "TLD too short"); // at least two chars, which is a dot and a letter
        require(bytes(_name).length < nameMaxLength, "TLD too long");
        require(strings.count(strings.toSlice(_name), strings.toSlice(".")) == 1, "Name must have 1 dot");
        require(strings.count(strings.toSlice(_name), strings.toSlice(" ")) == 0, "Name must have no spaces");
        require(strings.startsWith(strings.toSlice(_name), strings.toSlice(".")) == true, "Name must start with dot");

        IBasinForbiddenTlds forbidden = IBasinForbiddenTlds(forbiddenTlds);
        require(forbidden.isTldForbidden(_name) == false, "TLD already exists or forbidden");
    }

    // WRITE

    /// @notice Create a new top-level domain contract (ERC-721).
    /// @param _name Enter TLD name starting with a dot and make sure letters are in lowercase form.
    /// @return TLD contract address
    function createTld(
        string memory _name,
        string memory _symbol,
        address _tldOwner,
        uint256 _domainPrice,
        bool _buyingEnabled
    ) external payable override nonReentrant returns (address) {
        require(buyingEnabled == true, "Buying TLDs disabled");
        require(msg.value >= price, "Value below price");

        (bool sent, ) = payable(owner()).call{value: address(this).balance}("");
        require(sent, "Failed to send TLD payment to factory owner");

        return _createTld(_name, _symbol, _tldOwner, _domainPrice, _buyingEnabled);
    }

    // create a new TLD (internal non-payable)
    function _createTld(
        string memory _nameRaw,
        string memory _symbol,
        address _tldOwner,
        uint256 _domainPrice,
        bool _buyingEnabled
    ) internal returns (address) {
        string memory _name = strings.lower(_nameRaw);

        _validTldName(_name);

        BasinTLD tld = new BasinTLD(_name, _symbol, _tldOwner, _domainPrice, _buyingEnabled, royalty, address(this), metadataAddress);

        IBasinForbiddenTlds forbidden = IBasinForbiddenTlds(forbiddenTlds);
        forbidden.addForbiddenTld(_name);

        tldNamesAddresses[_name] = address(tld); // store TLD name and address into mapping
        tlds.push(_name); // store TLD name into array

        emit TldCreated(_msgSender(), _tldOwner, _name, address(tld));

        return address(tld);
    }

    // OWNER

    /// @notice Factory contract owner can change the ForbiddenTlds contract address.
    function changeForbiddenTldsAddress(address _forbiddenTlds) external onlyOwner {
        forbiddenTlds = _forbiddenTlds;
    }

    /// @notice Factory contract owner can change the metadata contract address.
    function changeMetadataAddress(address _mAddr) external onlyOwner {
        metadataAddress = _mAddr;
    }

    /// @notice Factory contract owner can change TLD max name length.
    function changeNameMaxLength(uint256 _maxLength) external onlyOwner {
        nameMaxLength = _maxLength;
    }

    /// @notice Factory contract owner can change price for minting new TLDs.
    function changePrice(uint256 _price) external onlyOwner {
        price = _price;
        emit ChangeTldPrice(_msgSender(), _price);
    }

    /// @notice Factory contract owner can change royalty fee for future contracts.
    function changeRoyalty(uint256 _royalty) external onlyOwner {
        royalty = _royalty;
    }

    /// @notice Factory owner can create a new TLD for a specified address for free
    /// @param _name Enter TLD name starting with a dot and make sure letters are in lowercase form.
    /// @return TLD contract address
    function ownerCreateTld(
        string memory _name,
        string memory _symbol,
        address _tldOwner,
        uint256 _domainPrice,
        bool _buyingEnabled
    ) external onlyOwner returns (address) {
        return _createTld(_name, _symbol, _tldOwner, _domainPrice, _buyingEnabled);
    }

    /// @notice Factory contract owner can enable or disable public minting of new TLDs.
    function toggleBuyingTlds() external onlyOwner {
        buyingEnabled = !buyingEnabled;
    }
}
