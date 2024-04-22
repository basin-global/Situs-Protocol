// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import {Base64} from "base64-sol/base64.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IBasinMetadataStore} from "./interfaces/IBasinMetadataStore.sol";

/// @title Basin Domains TLD Metadata contract
/// @author Tempe Techie
/// @notice Contract that stores metadata for TLD contracts.
contract BasinMetadataStore is IBasinMetadataStore {
    mapping(address => string) public descriptions; // TLD-specific descriptions, mapping(tldAddress => description)
    mapping(address => string) public brands; // TLD-specific brand names, mapping(tldAddress => brandName)

    // EVENTS
    event BrandChanged(address indexed user, string brand);
    event DescriptionChanged(address indexed user, string description);

    // READ
    // solhint-disable-next-line no-unused-vars
    function getMetadata(string calldata _domainName, string calldata _tld, uint256 _tokenId) public view returns (string memory) {
        string memory fullDomainName = string(abi.encodePacked(_domainName, _tld));

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

    function _getImage(string memory _fullDomainName, string memory _brandName) internal pure returns (string memory) {
        string memory svgBase64Encoded = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        /* solhint-disable quotes */ 
                        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">',
                        '<defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">',
                        '<stop offset="0%" style="stop-color:rgb(68,67,241);stop-opacity:1" />',
                        '<stop offset="100%" style="stop-color:rgb(144,85,247);stop-opacity:1" /></linearGradient></defs>',
                        '<rect x="0" y="0" width="500" height="500" fill="url(#grad)"/>',
                        '<text x="50%" y="50%" dominant-baseline="middle" fill="white" text-anchor="middle" font-size="x-large">',
                        _fullDomainName,
                        '</text><text x="50%" y="70%" dominant-baseline="middle" fill="white" text-anchor="middle">',
                        _brandName,
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
