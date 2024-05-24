// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

interface ISitusMetadataStore {
    function getMetadata(
        address _tldAddress,
        string calldata _domainName,
        string calldata _tld,
        uint256 _tokenId
    ) external view returns (string memory);
}
