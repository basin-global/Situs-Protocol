import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

describe("BasinTLDFactory", function () {
  // Fixture
  async function deployBasinTLDFactoryFixture() {
    const [owner, otherAccount] = await hre.ethers.getSigners();

    const BasinMetadata = await hre.ethers.getContractFactory("BasinMetadata");
    const basinMetadata = await BasinMetadata.deploy();
    const basinMetadataAddress = await basinMetadata.getAddress();

    const BasinForbiddenTLDs = await hre.ethers.getContractFactory("BasinForbiddenTLDs");
    const basinForbiddenTLDs = await BasinForbiddenTLDs.deploy();
    const basinForbiddenTLDsAddress = await basinForbiddenTLDs.getAddress();

    const BasinResolverNonUpgradable = await hre.ethers.getContractFactory("BasinResolverNonUpgradable");
    const basinResolverNonUpgradable = await BasinResolverNonUpgradable.deploy();
    const basinResolverNonUpgradableAddress = await basinResolverNonUpgradable.getAddress();

    const price = ethers.parseUnits("1", "ether");

    const BasinTLDFactory = await hre.ethers.getContractFactory("BasinTLDFactory");
    const basinTLDFactory = await BasinTLDFactory.deploy(price, basinForbiddenTLDsAddress, basinMetadataAddress);
    const basinTLDFactoryAddress = await basinTLDFactory.getAddress();

    await basinForbiddenTLDs.addFactoryAddress(basinTLDFactoryAddress);
    await basinResolverNonUpgradable.addFactoryAddress(basinTLDFactoryAddress);

    return { basinTLDFactory, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { basinTLDFactory } = await loadFixture(deployBasinTLDFactoryFixture);
      expect(await basinTLDFactory.getAddress()).to.be.properAddress;
      expect(await basinTLDFactory.getAddress()).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("CreateBasinTLD", function() {
    it("Should create successfully", async function () {
      const { basinTLDFactory, owner } = await loadFixture(deployBasinTLDFactoryFixture);
      
      const tldName = ".basin";
      const tldSymbol = ".BASIN";
      const domainPrice = ethers.parseUnits("0.0001", "ether");

      await basinTLDFactory.ownerCreateTld(
        tldName,
        tldSymbol,
        owner.address,
        domainPrice,
        false
      )
    });
  })
});
