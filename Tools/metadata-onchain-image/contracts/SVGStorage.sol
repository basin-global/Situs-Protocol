// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import {Base64} from "base64-sol/base64.sol";

/// @title SVG Storage for TLD Metadata
contract SVGStorage {
    // Store the Base64-encoded SVG data URI
    string public constant svgBase64Encoded = "data:image/svg+xml;base64,<your-base64-image-sting-here>";

    /// @dev Returns the Base64 encoded SVG data URI
    function getSvgDataUri() public view returns (string memory) {
        return svgBase64Encoded;
    }
}
