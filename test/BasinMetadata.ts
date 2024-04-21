import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

describe("BasinMetadata", function () {
  // Fixture
  async function deployBasinMetadataFixture() {
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const BasinMetadata = await hre.ethers.getContractFactory("BasinMetadata");
    const basinMetadata = await BasinMetadata.deploy();

    return { basinMetadata, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { basinMetadata } = await loadFixture(deployBasinMetadataFixture);
      expect(await basinMetadata.getAddress()).to.be.properAddress;
      expect(await basinMetadata.getAddress()).to.not.equal(ethers.ZeroAddress);
    });
  });
});
