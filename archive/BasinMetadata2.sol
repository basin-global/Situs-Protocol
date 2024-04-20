// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "base64-sol/base64.sol";
import { OwnableWithManagers } from "../../access/OwnableWithManagers.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../../lib/strings.sol";

/// @title .basin domain metadata contract
/// @notice Contract that stores metadata for the .basin TLD
contract BasinMetadata2 is OwnableWithManagers {
  string public description = "Add your description here";
  string public bgImage = "https://cloudflare-ipfs.com/ipfs/bafybeiea4smmcoij2c5e25qf4qsgbrqx32mxpf4sn5msvq4ifvapj5su7a/83m58h7118kea9xnyeqsi.gif";

  // READ
  function getMetadata(string calldata _domainName, string calldata _tld, uint256 _tokenId) public view returns(string memory) {
    string memory fullDomainName = string(abi.encodePacked(_domainName, _tld));
    uint256 domainLength = strings.len(strings.toSlice(_domainName));

    return string(
      abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(abi.encodePacked(
        '{"name": "', fullDomainName, '", ',
        '"description": "', description, '", ',
        '"attributes": [',
          '{"trait_type": "length", "value": "', Strings.toString(domainLength) ,'"}'
        '], '
        '"image": "', _getImage(fullDomainName), '"}'))))
    );
  }

  function _getImage(string memory _fullDomainName) internal view returns (string memory) {
    string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">',
        '<image href="',bgImage,'" width="500" height="500"/>',
        '<text x="50%" y="52%" dominant-baseline="middle" fill="white" text-anchor="middle" font-family="monospace" font-size="24px" font-weight="bold">',
        _fullDomainName,'</text>',
      '</svg>'
    ))));

    return string(abi.encodePacked("data:image/svg+xml;base64,", svgBase64Encoded));
  }

  // WRITE (OWNER)

  /// @notice Only metadata contract owner can call this function.
  function changeDescription(string calldata _description) external onlyManagerOrOwner {
    description = _description;
  }

  /// @notice Only metadata contract owner can call this function.
  function changeBgImage(string calldata _bgImage) external onlyManagerOrOwner {
    bgImage = _bgImage;
  }
}