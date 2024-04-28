// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ISitusTLD} from "../interfaces/ISitusTLD.sol";
import {strings} from "../../lib/strings.sol";

// Minter contract
contract BasinTLDMinter is Ownable, ReentrancyGuard {
    bool public paused = true;
    uint256 public referralFee = 1_000; // share of each domain purchase (in bips) that goes to the referrer
    uint256 public royaltyFee = 3_000; // share of each domain purchase (in bips) that goes to Punk Domains
    uint256 public constant MAX_BPS = 10_000;

    uint256 public price1char; // 1 char domain price
    uint256 public price2char; // 2 chars domain price
    uint256 public price3char; // 3 chars domain price
    uint256 public price4char; // 4 chars domain price
    uint256 public price5char; // 5+ chars domain price

    // TLD contract
    ISitusTLD public immutable tldContract; // TLD contract

    error MintingPaused();
    error ValueBelowPrice();
    error SendRoyaltyFailed();
    error SendReferralFailed();
    error SendPaymentFailed();
    error SoulboundTokenNotFound();
    error AlreadyClaimedFreeDomain();
    error NameTooShort();
    error ValueZero();
    error FeeTooHigh();
    error WithdrawFailed();
    error NotRoyaltyFeeUpdater();

    // CONSTRUCTOR
    constructor(
        address _tldAddress,
        uint256 _price1char,
        uint256 _price2char,
        uint256 _price3char,
        uint256 _price4char,
        uint256 _price5char
    ) {
        tldContract = ISitusTLD(_tldAddress);

        price1char = _price1char;
        price2char = _price2char;
        price3char = _price3char;
        price4char = _price4char;
        price5char = _price5char;
    }

    // WRITE

    /// @notice payment token approval transaction needs to be made before minting
    function mint(
        string memory _domainName,
        address _domainHolder,
        address _referrer
    ) external payable nonReentrant returns (uint256 tokenId) {
        if (paused) revert MintingPaused();

        // find price
        uint256 domainLength = strings.len(strings.toSlice(_domainName));
        uint256 selectedPrice;

        if (domainLength == 1) {
            selectedPrice = price1char;
        } else if (domainLength == 2) {
            selectedPrice = price2char;
        } else if (domainLength == 3) {
            selectedPrice = price3char;
        } else if (domainLength == 4) {
            selectedPrice = price4char;
        } else {
            selectedPrice = price5char;
        }

        if (msg.value < selectedPrice) revert ValueBelowPrice();

        // send royalty fee
        if (royaltyFee > 0) {
            uint256 royaltyPayment = (selectedPrice * royaltyFee) / MAX_BPS;
            (bool sentRoyaltyFee, ) = payable(tldContract.royaltyFeeReceiver()).call{value: royaltyPayment}("");
            if (!sentRoyaltyFee) revert SendRoyaltyFailed();
        }

        // send referral fee
        if (referralFee > 0 && _referrer != address(0)) {
            uint256 referralPayment = (selectedPrice * referralFee) / MAX_BPS;
            (bool sentReferralFee, ) = payable(_referrer).call{value: referralPayment}("");
            if (!sentReferralFee) revert SendReferralFailed();
        }

        // send the rest to TLD owner
        (bool sent, ) = payable(tldContract.tldOwner()).call{value: address(this).balance}("");
        if (!sent) revert SendPaymentFailed();

        // mint a domain
        tokenId = tldContract.mint{value: 0}(_domainName, _domainHolder, address(0));
    }

    // OWNER

    /// @notice This changes price in the minter contract
    function changePrice(uint256 _price, uint256 _chars) external onlyOwner {
        if (_price == 0) revert ValueZero();

        if (_chars == 1) {
            price1char = _price;
        } else if (_chars == 2) {
            price2char = _price;
        } else if (_chars == 3) {
            price3char = _price;
        } else if (_chars == 4) {
            price4char = _price;
        } else if (_chars == 5) {
            price5char = _price;
        }
    }

    /// @notice This changes referral fee in the minter contract
    function changeReferralFee(uint256 _referral) external onlyOwner {
        if (_referral > 2000) revert FeeTooHigh();
        referralFee = _referral;
    }

    /// @notice This changes royalty fee in the minter contract
    function changeRoyaltyFee(uint256 _royalty) external {
        if (_royalty > 4000) revert FeeTooHigh();
        if (msg.sender != tldContract.royaltyFeeUpdater()) revert NotRoyaltyFeeUpdater();
        royaltyFee = _royalty;
    }

    function ownerFreeMint(string memory _domainName, address _domainHolder) external nonReentrant onlyOwner returns (uint256 tokenId) {
        // mint a domain
        tokenId = tldContract.mint{value: 0}(_domainName, _domainHolder, address(0));
    }

    /// @notice Recover any ERC-20 token mistakenly sent to this contract address
    function recoverERC20(address tokenAddress_, uint256 tokenAmount_, address recipient_) external onlyOwner {
        IERC20(tokenAddress_).transfer(recipient_, tokenAmount_);
    }

    /// @notice Recover any ERC-721 token mistakenly sent to this contract address
    function recoverERC721(address tokenAddress_, uint256 tokenId_, address recipient_) external onlyOwner {
        IERC721(tokenAddress_).transferFrom(address(this), recipient_, tokenId_);
    }

    function togglePaused() external onlyOwner {
        paused = !paused;
    }

    // withdraw ETH from contract
    function withdraw() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        if (!success) revert WithdrawFailed();
    }

    // RECEIVE & FALLBACK
    receive() external payable {}
    fallback() external payable {}
}
