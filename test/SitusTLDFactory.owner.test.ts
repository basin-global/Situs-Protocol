import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

describe("SitusTLDFactory", function () {
    const tldPrice = ethers.parseUnits("1", "ether");

    // Fixture
    async function deploySitusTLDFactoryFixture() {
        const [admin, otherAccount] = await hre.ethers.getSigners();

        const SitusMetadataStore = await hre.ethers.getContractFactory("SitusMetadataStore");
        const situsMetadataStore = await SitusMetadataStore.deploy();
        const situsMetadataStoreAddress = await situsMetadataStore.getAddress();

        const SitusForbiddenTLDs = await hre.ethers.getContractFactory("SitusForbiddenTLDs");
        const situsForbiddenTLDs = await SitusForbiddenTLDs.deploy();
        const situsForbiddenTLDsAddress = await situsForbiddenTLDs.getAddress();

        const SitusResolverNonUpgradable = await hre.ethers.getContractFactory("SitusResolverNonUpgradable");
        const situsResolverNonUpgradable = await SitusResolverNonUpgradable.deploy();

        const SitusTLDFactory = await hre.ethers.getContractFactory("SitusTLDFactory");
        const situsTLDFactory = await SitusTLDFactory.deploy(tldPrice, situsForbiddenTLDsAddress, situsMetadataStoreAddress);
        const situsTLDFactoryAddress = await situsTLDFactory.getAddress();

        await situsForbiddenTLDs.addFactoryAddress(situsTLDFactoryAddress);
        await situsResolverNonUpgradable.addFactoryAddress(situsTLDFactoryAddress);

        return { situsTLDFactory, situsForbiddenTLDs, admin, otherAccount };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { situsTLDFactory } = await loadFixture(deploySitusTLDFactoryFixture);
            expect(await situsTLDFactory.getAddress()).to.be.properAddress;
            expect(await situsTLDFactory.getAddress()).to.not.equal(ethers.ZeroAddress);
        });
    });

    describe("Create TLD", function () {
        const tldName = ".situs";
        const tldSymbol = ".BASIN";
        const domainPrice = ethers.parseUnits("0.0001", "ether");

        it("should create a new valid TLD through adminCreateTld()", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            await situsTLDFactory.ownerCreateTld(tldName, tldSymbol, admin.address, domainPrice, false);
        });

        it("should fail to create a new valid TLD if user is not admin", async function () {
            const { situsTLDFactory, otherAccount } = await loadFixture(deploySitusTLDFactoryFixture);
            await expect(
                situsTLDFactory.connect(otherAccount).ownerCreateTld(
                    tldName,
                    tldSymbol,
                    otherAccount.address,
                    domainPrice,
                    false, // buying enabled
                ),
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("should fail to create a new valid TLD if more than 1 dot in the name", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            await expect(
                situsTLDFactory.ownerCreateTld(
                    ".ba.sin", // Invalid TLD
                    tldSymbol,
                    admin.address,
                    domainPrice,
                    false, // buying enabled
                ),
            ).to.be.revertedWithCustomError(situsTLDFactory, "MustHaveOneDot");
        });

        it("should fail to create a new valid TLD if no dot in the name", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            await expect(
                situsTLDFactory.ownerCreateTld(
                    "situs", // Invalid TLD
                    tldSymbol,
                    admin.address,
                    domainPrice,
                    false, // buying enabled
                ),
            ).to.be.revertedWithCustomError(situsTLDFactory, "MustHaveOneDot");
        });

        it("should fail to create a new valid TLD if name does not start with dot", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            await expect(
                situsTLDFactory.ownerCreateTld(
                    "bas.in", // Invalid TLD
                    tldSymbol,
                    admin.address,
                    domainPrice,
                    false, // buying enabled
                ),
            ).to.be.revertedWithCustomError(situsTLDFactory, "MustStartWithDot");
        });

        it("should fail to create a new valid TLD if name is of length 1", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            await expect(
                situsTLDFactory.ownerCreateTld(
                    ".", // Invalid TLD
                    tldSymbol,
                    admin.address,
                    domainPrice,
                    false, // buying enabled
                ),
            ).to.be.revertedWithCustomError(situsTLDFactory, "TLDTooShort");
        });

        it("should fail to create a new valid TLD with empty name", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            await expect(
                situsTLDFactory.ownerCreateTld(
                    "", // Invalid TLD
                    tldSymbol,
                    admin.address,
                    domainPrice,
                    false, // buying enabled
                ),
            ).to.be.revertedWithCustomError(situsTLDFactory, "TLDTooShort");
        });

        it("should fail to create a new valid TLD if TLD already exists", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            // create a valid TLD
            await expect(situsTLDFactory.ownerCreateTld(tldName, tldSymbol, admin.address, domainPrice, false)).to.emit(
                situsTLDFactory,
                "TldCreated",
            );

            // try to create another TLD with the same name
            await expect(
                situsTLDFactory.ownerCreateTld(tldName, tldSymbol, admin.address, domainPrice, false),
            ).to.be.revertedWithCustomError(situsTLDFactory, "ExistsOrForbidden");
        });

        it("should fail to create a new valid TLD if TLD name is too long", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            await expect(
                situsTLDFactory.ownerCreateTld(
                    ".situs3dfferopfmeomeriovneriovneriovndferfgergf", // Invalid TLD
                    tldSymbol,
                    admin.address,
                    domainPrice,
                    false,
                ),
            ).to.be.revertedWithCustomError(situsTLDFactory, "TLDTooLong");
        });

        it("should change the TLD price", async function () {
            const { situsTLDFactory } = await loadFixture(deploySitusTLDFactoryFixture);
            const priceBefore = await situsTLDFactory.price();
            expect(priceBefore).to.equal(tldPrice);

            const newPrice = ethers.parseUnits("2", "ether");

            await situsTLDFactory.changePrice(newPrice);

            const priceAfter = await situsTLDFactory.price();
            expect(priceAfter).to.equal(newPrice);
        });

        it("non-owner cannot change the TLD price", async function () {
            const { situsTLDFactory, otherAccount } = await loadFixture(deploySitusTLDFactoryFixture);
            const priceBefore = await situsTLDFactory.price();
            expect(priceBefore).to.equal(tldPrice);

            // fail if sender is not owner
            await expect(situsTLDFactory.connect(otherAccount).changePrice(ethers.parseUnits("2", "ether"))).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );

            const priceAfter = await situsTLDFactory.price();
            expect(priceAfter).to.equal(tldPrice);
        });

        it("should change max length for a TLD name", async function () {
            const { situsTLDFactory } = await loadFixture(deploySitusTLDFactoryFixture);
            const nameMaxLengthBefore = await situsTLDFactory.nameMaxLength();
            expect(nameMaxLengthBefore).to.equal(40);

            await situsTLDFactory.changeNameMaxLength(52);

            const nameMaxLengthAfter = await situsTLDFactory.nameMaxLength();
            expect(nameMaxLengthAfter).to.equal(52);
        });

        it("non-owner cannot change max length for a TLD name", async function () {
            const { situsTLDFactory, otherAccount } = await loadFixture(deploySitusTLDFactoryFixture);
            const nameMaxLengthBefore = await situsTLDFactory.nameMaxLength();
            expect(nameMaxLengthBefore).to.equal(40);

            await expect(situsTLDFactory.connect(otherAccount).changeNameMaxLength(60)).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );

            const nameMaxLengthAfter = await situsTLDFactory.nameMaxLength();
            expect(nameMaxLengthAfter).to.equal(40);
        });

        it("should change the royalty amount", async function () {
            const { situsTLDFactory } = await loadFixture(deploySitusTLDFactoryFixture);
            const royaltyBefore = await situsTLDFactory.royalty();
            expect(royaltyBefore).to.equal(0);

            const newRoyalty = 10;

            await situsTLDFactory.changeRoyalty(newRoyalty);

            const royaltyAfter = await situsTLDFactory.royalty();
            expect(royaltyAfter).to.equal(10);
        });

        it("non-owner cannot change the royalty amount", async function () {
            const { situsTLDFactory, otherAccount } = await loadFixture(deploySitusTLDFactoryFixture);
            const royaltyBefore = await situsTLDFactory.royalty();
            expect(royaltyBefore).to.equal(0);

            await expect(situsTLDFactory.connect(otherAccount).changeRoyalty(20)).to.be.revertedWith("Ownable: caller is not the owner");

            const royaltyAfter = await situsTLDFactory.royalty();
            expect(royaltyAfter).to.equal(0);
        });

        it("should add a new forbidden domain", async function () {
            const { situsForbiddenTLDs } = await loadFixture(deploySitusTLDFactoryFixture);
            const tld = ".co";

            const forbiddenTldBefore = await situsForbiddenTLDs.forbidden(tld);
            expect(forbiddenTldBefore).to.be.false;

            await situsForbiddenTLDs.ownerAddForbiddenTld(tld);

            const forbiddenTldAfter = await situsForbiddenTLDs.forbidden(tld);
            expect(forbiddenTldAfter).to.be.true;
        });

        it("non-owner cannot add a new forbidden domain", async function () {
            const { situsForbiddenTLDs, otherAccount } = await loadFixture(deploySitusTLDFactoryFixture);
            const tld = ".co";

            const forbiddenTldBefore = await situsForbiddenTLDs.forbidden(tld);
            expect(forbiddenTldBefore).to.be.false;

            // fail if sender is not owner
            await expect(situsForbiddenTLDs.connect(otherAccount).ownerAddForbiddenTld(".io")).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );

            const forbiddenTldAfter = await situsForbiddenTLDs.forbidden(tld);
            expect(forbiddenTldAfter).to.be.false;
        });

        it("should remove a forbidden domain", async function () {
            const tld = ".eth";
            const { situsForbiddenTLDs } = await loadFixture(deploySitusTLDFactoryFixture);

            const forbiddenTldBefore = await situsForbiddenTLDs.forbidden(tld);
            expect(forbiddenTldBefore).to.be.true;

            await situsForbiddenTLDs.removeForbiddenTld(tld);

            const forbiddenTldAfter = await situsForbiddenTLDs.forbidden(tld);
            expect(forbiddenTldAfter).to.be.false;
        });

        it("non-owner cannot remove a forbidden domain", async function () {
            const tld = ".eth";
            const { situsForbiddenTLDs, otherAccount } = await loadFixture(deploySitusTLDFactoryFixture);

            const forbiddenTldBefore = await situsForbiddenTLDs.forbidden(tld);
            expect(forbiddenTldBefore).to.be.true;

            await expect(situsForbiddenTLDs.connect(otherAccount).removeForbiddenTld(".net")).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );

            const forbiddenTldAfter = await situsForbiddenTLDs.forbidden(tld);
            expect(forbiddenTldAfter).to.be.true;
        });
    });
});
