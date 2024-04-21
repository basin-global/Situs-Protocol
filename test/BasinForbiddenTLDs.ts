import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

describe("BasinForbiddenTLDs", function () {
  // Fixture
  async function deployBasinForbiddenTLDsFixture() {
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const BasinForbiddenTLDs = await hre.ethers.getContractFactory("BasinForbiddenTLDs");
    const basinForbiddenTLDs = await BasinForbiddenTLDs.deploy();

    return { basinForbiddenTLDs, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { basinForbiddenTLDs } = await loadFixture(deployBasinForbiddenTLDsFixture);
      expect(await basinForbiddenTLDs.getAddress()).to.be.properAddress;
      expect(await basinForbiddenTLDs.getAddress()).to.not.equal(ethers.ZeroAddress);
    });
  });
});
