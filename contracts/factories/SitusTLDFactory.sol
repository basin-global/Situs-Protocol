// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import {strings} from "../lib/strings.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {SitusTLD} from "../tlds/SitusTLD.sol";
import {ISitusTLDFactory} from "./interfaces/ISitusTLDFactory.sol";
import {ISitusForbiddenTLDs} from "../registries/interfaces/ISitusForbiddenTLDs.sol";

/// @title Situs TLD Factory contract
/// @author Tempe Techie
/// @notice Factory contract dynamically generates new TLD contracts.
contract SitusTLDFactory is ISitusTLDFactory, Ownable, ReentrancyGuard {
    using strings for string;

    string[] public tlds; // existing TLDs
    mapping(string => address) public override tldNamesAddresses; // a mapping of TLDs (string => TLDaddress)

    address public forbiddenTlds; // address of the contract that stores the list of forbidden TLDs
    address public metadataAddress; // default SitusMetadataStore address

    uint256 public price; // price for creating a new TLD
    uint256 public royalty = 0; // royalty for Situs Domains when new domain is minted
    bool public buyingEnabled = false; // buying TLDs enabled (true/false)
    uint256 public nameMaxLength = 40; // the maximum length of a TLD name

    event TldCreated(address indexed user, address indexed owner, string tldName, address tldAddress);
    event ChangeTldPrice(address indexed user, uint256 tldPrice);

    error TLDTooShort();
    error TLDTooLong();
    error MustHaveOneDot();
    error MustHaveNoSpaces();
    error MustStartWithDot();
    error ExistsOrForbidden();
    error Disabled();
    error ValueBelowPrice();
    error PaymentFailed();

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
        if (strings.len(strings.toSlice(_name)) <= 1) revert TLDTooShort();
        if (bytes(_name).length >= nameMaxLength) revert TLDTooLong();
        if (strings.count(strings.toSlice(_name), strings.toSlice(".")) != 1) revert MustHaveOneDot();
        if (strings.count(strings.toSlice(_name), strings.toSlice(" ")) != 0) revert MustHaveNoSpaces();
        if (strings.startsWith(strings.toSlice(_name), strings.toSlice(".")) == false) revert MustStartWithDot();

        ISitusForbiddenTLDs forbidden = ISitusForbiddenTLDs(forbiddenTlds);
        if (forbidden.isTldForbidden(_name)) revert ExistsOrForbidden();
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
        if (!buyingEnabled) revert Disabled();
        if (msg.value < price) revert ValueBelowPrice();

        (bool sent, ) = payable(owner()).call{value: address(this).balance}("");
        if (!sent) revert PaymentFailed();
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

        SitusTLD tld = new SitusTLD(_name, _symbol, _tldOwner, _domainPrice, _buyingEnabled, royalty, address(this), metadataAddress);

        ISitusForbiddenTLDs forbidden = ISitusForbiddenTLDs(forbiddenTlds);
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
