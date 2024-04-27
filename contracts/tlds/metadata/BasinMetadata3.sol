// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import {Base64} from "base64-sol/base64.sol";
import {OwnableWithManagers} from "../../access/OwnableWithManagers.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {strings} from "../../lib/strings.sol";

/// @title .basin domain metadata contract
/// @notice Contract that stores metadata for the .basin TLD
contract BasinMetadata3 is OwnableWithManagers {
    string public description =
        ".basin's are perpetual trusts that ENSURE the protection, restoration, and stewardship of PLACE, on PURPOSE, by PEOPLE";

    // READ
    function getMetadata(string calldata _domainName, string calldata _tld, uint256 _tokenId) public view returns (string memory) {
        string memory fullDomainName = string(abi.encodePacked(_domainName, _tld));
        uint256 domainLength = strings.len(strings.toSlice(_domainName));
        string memory animationUrl = getAnimationUrl(_tokenId);

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
                                description,
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
                                _getImage(fullDomainName),
                                '"}'
                            )
                        )
                    )
                )
                /* solhint-enable quotes */
            );
    }

    function getAnimationUrl(uint256 _tokenId) public pure returns (string memory) {
        return
            string(
                abi.encodePacked(
                    "https://iframe-tokenbound.vercel.app/0x4bF5A99eA2F8De061f7D77BA9edd749503D945Da/",
                    Strings.toString(_tokenId),
                    "/137"
                )
            );
    }

    function _getImage(string memory _fullDomainName) internal pure returns (string memory) {
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

    // WRITE (OWNER)
    /// @notice Only metadata contract owner can call this function.
    function changeDescription(string calldata _description) external onlyManagerOrOwner {
        description = _description;
    }
}
