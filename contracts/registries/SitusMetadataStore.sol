// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import {Base64} from "base64-sol/base64.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ISitusMetadataStore} from "./interfaces/ISitusMetadataStore.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {strings} from "../lib/strings.sol";

/// @title Situs TLD Metadata contract
/// @author Tempe Techie
/// @notice Contract that stores metadata for TLD contracts.
contract SitusMetadataStore is ISitusMetadataStore {
    mapping(address => string) public descriptions; // TLD-specific descriptions, mapping(tldAddress => description)
    mapping(address => string) public brands; // TLD-specific brand names, mapping(tldAddress => brandName)

    // EVENTS
    event BrandChanged(address indexed user, string brand);
    event DescriptionChanged(address indexed user, string description);

    // READ
    // solhint-disable-next-line no-unused-vars
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
                                /* solhint-disable quotes */
                                '{"name": "',
                                fullDomainName,
                                '", ',
                                '"description": "',
                                descriptions[msg.sender],
                                '", ',
                                '"attributes": [',
                                '{"trait_type": "length", "value": "',
                                Strings.toString(domainLength),
                                '"}'
                                "], ",
                                '"animation_url": "',
                                animationUrl,
                                '", ',
                                '"image": "',
                                _getImage(fullDomainName, brands[msg.sender]),
                                '"}'
                                /* solhint-enable quotes */
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

    function _getImage(string memory _fullDomainName, string memory _brandName) internal pure returns (string memory) {
        string memory svgBase64Encoded = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        /* solhint-disable quotes */
                        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">',
                        '<defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">',
                        '<stop offset="0%" style="stop-color:black;stop-opacity:1" />',
                        '<stop offset="100%" style="stop-color:rgb(43, 43, 43);stop-opacity:1" /></linearGradient></defs>',
                        '<rect x="0" y="0" width="500" height="500" fill="url(#grad)"/>',
                        '<text x="50%" y="50%" dominant-baseline="middle" fill="white" text-anchor="middle" font-family="monospace" font-size="24px" font-weight="bold">',
                        _fullDomainName,
                        "</text>",
                        "</svg>"
                        /* solhint-enable quotes */
                    )
                )
            )
        );

        return string(abi.encodePacked("data:image/svg+xml;base64,", svgBase64Encoded));
    }

    function getTldOwner(address _tldAddress) public view returns (address) {
        Ownable tld = Ownable(_tldAddress);
        return tld.owner();
    }

    // WRITE (TLD OWNERS)

    /// @notice Only TLD contract owner can call this function.
    function changeBrand(address _tldAddress, string calldata _brand) external {
        require(msg.sender == getTldOwner(_tldAddress), "Sender not TLD owner");
        brands[_tldAddress] = _brand;
        emit BrandChanged(msg.sender, _brand);
    }

    /// @notice Only TLD contract owner can call this function.
    function changeDescription(address _tldAddress, string calldata _description) external {
        require(msg.sender == getTldOwner(_tldAddress), "Sender not TLD owner");
        descriptions[_tldAddress] = _description;
        emit DescriptionChanged(msg.sender, _description);
    }
}
