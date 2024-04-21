import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

describe("BasinTLDFactory", function () {
  const tldPrice = ethers.parseUnits("1", "ether");

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

    const BasinTLDFactory = await hre.ethers.getContractFactory("BasinTLDFactory");
    const basinTLDFactory = await BasinTLDFactory.deploy(tldPrice, basinForbiddenTLDsAddress, basinMetadataAddress);
    const basinTLDFactoryAddress = await basinTLDFactory.getAddress();

    await basinForbiddenTLDs.addFactoryAddress(basinTLDFactoryAddress);
    await basinResolverNonUpgradable.addFactoryAddress(basinTLDFactoryAddress);

    return { basinTLDFactory, basinForbiddenTLDs, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const { basinTLDFactory } = await loadFixture(deployBasinTLDFactoryFixture);
      expect(await basinTLDFactory.getAddress()).to.be.properAddress;
      expect(await basinTLDFactory.getAddress()).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Create TLD", function() {
    const tldName = ".basin";
    const tldSymbol = ".BASIN";
    const domainPrice = ethers.parseUnits("0.0001", "ether");

    it("should create a new valid TLD through ownerCreateTld()", async function () {
      const { basinTLDFactory, owner } = await loadFixture(deployBasinTLDFactoryFixture);
      await basinTLDFactory.ownerCreateTld(
        tldName,
        tldSymbol,
        owner.address,
        domainPrice,
        false
      );
    });

    it("should fail to create a new valid TLD if user is not owner", async function () {
      const { basinTLDFactory, otherAccount } = await loadFixture(deployBasinTLDFactoryFixture);
      await expect(basinTLDFactory.connect(otherAccount).ownerCreateTld(
        tldName,
        tldSymbol,
        otherAccount.address,
        domainPrice,
        false // buying enabled
      )).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it("should fail to create a new valid TLD if more than 1 dot in the name", async function () {
      const { basinTLDFactory, owner } = await loadFixture(deployBasinTLDFactoryFixture);
      await expect(basinTLDFactory.ownerCreateTld(
        ".ba.sin", // Invalid TLD
        tldSymbol,
        owner.address,
        domainPrice,
        false // buying enabled
      )).to.be.revertedWith('Name must have 1 dot');
    });

    it("should fail to create a new valid TLD if no dot in the name", async function () {
      const { basinTLDFactory, owner } = await loadFixture(deployBasinTLDFactoryFixture);
      await expect(basinTLDFactory.ownerCreateTld(
        "basin", // Invalid TLD
        tldSymbol,
        owner.address,
        domainPrice,
        false // buying enabled
      )).to.be.revertedWith('Name must have 1 dot');
    });

    it("should fail to create a new valid TLD if name does not start with dot", async function () {
      const { basinTLDFactory, owner } = await loadFixture(deployBasinTLDFactoryFixture);
      await expect(basinTLDFactory.ownerCreateTld(
        "bas.in", // Invalid TLD
        tldSymbol,
        owner.address,
        domainPrice,
        false // buying enabled
      )).to.be.revertedWith('Name must start with dot');
    });

    it("should fail to create a new valid TLD if name is of length 1", async function () {
      const { basinTLDFactory, owner } = await loadFixture(deployBasinTLDFactoryFixture);
      await expect(basinTLDFactory.ownerCreateTld(
        ".", // Invalid TLD
        tldSymbol,
        owner.address,
        domainPrice,
        false // buying enabled
      )).to.be.revertedWith('TLD too short');
    });

    it("should fail to create a new valid TLD with empty name", async function () {
      const { basinTLDFactory, owner } = await loadFixture(deployBasinTLDFactoryFixture);
      await expect(basinTLDFactory.ownerCreateTld(
        "", // Invalid TLD
        tldSymbol,
        owner.address,
        domainPrice,
        false // buying enabled
      )).to.be.revertedWith('TLD too short');
    });

    it("should fail to create a new valid TLD if TLD already exists", async function () {
      const { basinTLDFactory, owner } = await loadFixture(deployBasinTLDFactoryFixture);
      // create a valid TLD
      await expect(basinTLDFactory.ownerCreateTld(
        tldName,
        tldSymbol,
        owner.address,
        domainPrice,
        false
      )).to.emit(basinTLDFactory, 'TldCreated');
      
      // try to create another TLD with the same name
      await expect(basinTLDFactory.ownerCreateTld(
        tldName,
        tldSymbol,
        owner.address,
        domainPrice,
        false
      )).to.be.revertedWith('TLD already exists or forbidden');
    });

    it("should fail to create a new valid TLD if TLD name is too long", async function () {
      const { basinTLDFactory, owner } = await loadFixture(deployBasinTLDFactoryFixture);
      await expect(basinTLDFactory.ownerCreateTld(
        ".basin3dfferopfmeomeriovneriovneriovndferfgergf", // Invalid TLD
        tldSymbol,
        owner.address,
        domainPrice,
        false
      )).to.be.revertedWith('TLD too long');
    });

    it("should change the TLD price", async function () {
      const { basinTLDFactory } = await loadFixture(deployBasinTLDFactoryFixture);
      const priceBefore = await basinTLDFactory.price();
      expect(priceBefore).to.equal(tldPrice);

      const newPrice = ethers.parseUnits("2", "ether");

      await basinTLDFactory.changePrice(newPrice);
  
      const priceAfter = await basinTLDFactory.price();
      expect(priceAfter).to.equal(newPrice);
    });

    it("non-owner cannot change the TLD price", async function () {
      const { basinTLDFactory, otherAccount } = await loadFixture(deployBasinTLDFactoryFixture);
      const priceBefore = await basinTLDFactory.price();
      expect(priceBefore).to.equal(tldPrice);
  
      // fail if sender is not owner
      await expect(basinTLDFactory.connect(otherAccount).changePrice(
        ethers.parseUnits("2", "ether")
      )).to.be.revertedWith('Ownable: caller is not the owner');

      const priceAfter = await basinTLDFactory.price();
      expect(priceAfter).to.equal(tldPrice);
    });

    it("should change max length for a TLD name", async function () {
      const { basinTLDFactory } = await loadFixture(deployBasinTLDFactoryFixture);
      const nameMaxLengthBefore = await basinTLDFactory.nameMaxLength();
      expect(nameMaxLengthBefore).to.equal(40);
  
      await basinTLDFactory.changeNameMaxLength(52);
  
      const nameMaxLengthAfter = await basinTLDFactory.nameMaxLength();
      expect(nameMaxLengthAfter).to.equal(52);
    });

    it("non-owner cannot change max length for a TLD name", async function () {
      const { basinTLDFactory, otherAccount } = await loadFixture(deployBasinTLDFactoryFixture);
      const nameMaxLengthBefore = await basinTLDFactory.nameMaxLength();
      expect(nameMaxLengthBefore).to.equal(40);
  
      await expect(basinTLDFactory.connect(otherAccount).changeNameMaxLength(60)).to.be.revertedWith('Ownable: caller is not the owner');
  
      const nameMaxLengthAfter = await basinTLDFactory.nameMaxLength();
      expect(nameMaxLengthAfter).to.equal(40);
    });

    it("should change the royalty amount", async function () {
      const { basinTLDFactory } = await loadFixture(deployBasinTLDFactoryFixture);
      const royaltyBefore = await basinTLDFactory.royalty();
      expect(royaltyBefore).to.equal(0);
  
      const newRoyalty = 10;
      
      await basinTLDFactory.changeRoyalty(newRoyalty);
  
      const royaltyAfter = await basinTLDFactory.royalty();
      expect(royaltyAfter).to.equal(10);
    });

    it("non-owner cannot change the royalty amount", async function () {
      const { basinTLDFactory, otherAccount } = await loadFixture(deployBasinTLDFactoryFixture);
      const royaltyBefore = await basinTLDFactory.royalty();
      expect(royaltyBefore).to.equal(0);
      
      await expect(basinTLDFactory.connect(otherAccount).changeRoyalty(20)).to.be.revertedWith('Ownable: caller is not the owner');
  
      const royaltyAfter = await basinTLDFactory.royalty();
      expect(royaltyAfter).to.equal(0);
    });

    it("should add a new forbidden domain", async function () {
      const { basinForbiddenTLDs } = await loadFixture(deployBasinTLDFactoryFixture);
      const tld = ".co";
  
      const forbiddenTldBefore = await basinForbiddenTLDs.forbidden(tld);
      expect(forbiddenTldBefore).to.be.false;
  
      await basinForbiddenTLDs.ownerAddForbiddenTld(tld);
  
      const forbiddenTldAfter = await basinForbiddenTLDs.forbidden(tld);
      expect(forbiddenTldAfter).to.be.true;
    });

    it("non-owner cannot add a new forbidden domain", async function () {
      const { basinForbiddenTLDs, otherAccount } = await loadFixture(deployBasinTLDFactoryFixture);
      const tld = ".co";
  
      const forbiddenTldBefore = await basinForbiddenTLDs.forbidden(tld);
      expect(forbiddenTldBefore).to.be.false;
  
      // fail if sender is not owner
      await expect(basinForbiddenTLDs.connect(otherAccount).ownerAddForbiddenTld(".io")).to.be.revertedWith('Ownable: caller is not the owner');

      const forbiddenTldAfter = await basinForbiddenTLDs.forbidden(tld);
      expect(forbiddenTldAfter).to.be.false;
    });

    it("should remove a forbidden domain", async function () {
      const tld = ".eth";
      const { basinForbiddenTLDs } = await loadFixture(deployBasinTLDFactoryFixture);

      const forbiddenTldBefore = await basinForbiddenTLDs.forbidden(tld);
      expect(forbiddenTldBefore).to.be.true;
  
      await basinForbiddenTLDs.removeForbiddenTld(tld);
  
      const forbiddenTldAfter = await basinForbiddenTLDs.forbidden(tld);
      expect(forbiddenTldAfter).to.be.false;
    });

    it("non-owner cannot remove a forbidden domain", async function () {
      const tld = ".eth";
      const { basinForbiddenTLDs, otherAccount } = await loadFixture(deployBasinTLDFactoryFixture);

      const forbiddenTldBefore = await basinForbiddenTLDs.forbidden(tld);
      expect(forbiddenTldBefore).to.be.true;
  
      await expect(basinForbiddenTLDs.connect(otherAccount).removeForbiddenTld(".net")).to.be.revertedWith('Ownable: caller is not the owner');
  
      const forbiddenTldAfter = await basinForbiddenTLDs.forbidden(tld);
      expect(forbiddenTldAfter).to.be.true;
    });
  })
});
