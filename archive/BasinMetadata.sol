// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4; // you can change the solidity version here

import { OwnableWithManagers } from "../../access/OwnableWithManagers.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

/// @title .basin domain metadata contract
contract BasinMetadata is OwnableWithManagers {
  string public apiEndpoint = "https://api.basin.global/metadata/"; // important: must end with a slash

  // READ
  function getMetadata(string calldata _domainName, string calldata _tld, uint256 _tokenId) public view returns(string memory) {
    return string(abi.encodePacked(apiEndpoint,Strings.toString(_tokenId),"/",_domainName));
  }

  // WRITE (OWNER)

  /// @notice Only metadata contract owner can call this function.
  function changeApiEndpoint(string calldata _apiEndpoint) external onlyManagerOrOwner {
    apiEndpoint = _apiEndpoint;
  }
}