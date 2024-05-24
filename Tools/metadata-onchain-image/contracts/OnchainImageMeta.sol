// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {Base64} from "base64-sol/base64.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ISitusMetadataStore} from "./interfaces/ISitusMetadataStore.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {strings} from "./lib/strings.sol";
import "./SVGStorage.sol";

/// @title adapted Situs TLD Metadata contract
/// @notice Contract that stores metadata for TLD contracts.
contract OnchainImageMeta is ISitusMetadataStore {
    mapping(address => string) public descriptions; // TLD-specific descriptions, mapping(tldAddress => description)
    mapping(address => string) public brands; // TLD-specific brand names, mapping(tldAddress => brandName)

    SVGStorage public svgStorage;
    
    constructor(address _svgStorageAddress) {
        svgStorage = SVGStorage(_svgStorageAddress);
    }

    // EVENTS
    event BrandChanged(address indexed user, string brand);
    event DescriptionChanged(address indexed user, string description);

    error NotTLDOwner();

    // READ
    function getMetadata(
        address _tldAddress,
        string calldata _domainName,
        string calldata _tld,
        uint256 _tokenId
    ) public view returns (string memory) {
        string memory fullDomainName = string(abi.encodePacked(_domainName, _tld));
        uint256 domainLength = strings.len(strings.toSlice(_domainName));
        string memory animationUrl = getAnimationUrl(_tldAddress, _tokenId);

        return
            string(
                abi.encodePacked(
                    "data:application/json;base64,",
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name": "',
                                fullDomainName,
                                '", ',
                                '"description": "',
                                descriptions[msg.sender],
                                '", ',
                                '"attributes": [',
                                '{"trait_type": "length", "value": "',
                                Strings.toString(domainLength),
                                '"},',
                                "], ",
                                '"animation_url": "',
                                animationUrl,
                                '", ',
                                '"image": "',
                                _getImage(fullDomainName),
                                '"}'
                            )
                        )
                    )
                )
            );
    }

    function getAnimationUrl(address _tldAddress, uint256 _tokenId) public view returns (string memory) {
        return
            string(
                abi.encodePacked(
                    "https://iframe-tokenbound.vercel.app/",
                    Strings.toHexString(uint256(uint160(_tldAddress)), 20),
                    "/",
                    Strings.toString(_tokenId),
                    "/",
                    Strings.toString(block.chainid)
                )
            );
    }

    function _getImage(string memory _fullDomainName) internal view returns (string memory) {
        string memory svgBase64Encoded = svgStorage.getSvgDataUri();
        return svgBase64Encoded; // Return the stored Base64 data URI directly
    }

    // WRITE (TLD OWNERS)
    function changeBrand(address _tldAddress, string calldata _brand) external {
        if (msg.sender != getTldOwner(_tldAddress)) revert NotTLDOwner();
        brands[_tldAddress] = _brand;
        emit BrandChanged(msg.sender, _brand);
    }

    function changeDescription(address _tldAddress, string calldata _description) external {
        if (msg.sender != getTldOwner(_tldAddress)) revert NotTLDOwner();
        descriptions[_tldAddress] = _description;
        emit DescriptionChanged(msg.sender, _description);
    }

    function getTldOwner(address _tldAddress) public view returns (address) {
        Ownable tld = Ownable(_tldAddress);
        return tld.owner();
    }
}
