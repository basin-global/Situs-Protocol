import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

describe("SitusTLDFactory", function () {
    const tldPrice = ethers.parseUnits("1", "ether");

    // Fixture
    async function deploySitusTLDFactoryFixture() {
        const [admin, tldOwner] = await hre.ethers.getSigners();

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

        return { situsTLDFactory, situsForbiddenTLDs, admin, tldOwner };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { situsTLDFactory } = await loadFixture(deploySitusTLDFactoryFixture);
            expect(await situsTLDFactory.getAddress()).to.be.properAddress;
            expect(await situsTLDFactory.getAddress()).to.not.equal(ethers.ZeroAddress);
        });
    });

    describe("Create TLD", function () {
        it("should confirm forbidden TLD names defined in the constructor", async function () {
            const { situsForbiddenTLDs } = await loadFixture(deploySitusTLDFactoryFixture);
            const forbiddenCom = await situsForbiddenTLDs.forbidden(".com");
            expect(forbiddenCom).to.be.true;

            const forbiddenEth = await situsForbiddenTLDs.forbidden(".eth");
            expect(forbiddenEth).to.be.true;
        });

        it("should create a new valid TLD", async function () {
            const { situsTLDFactory, admin, tldOwner } = await loadFixture(deploySitusTLDFactoryFixture);
            await situsTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await situsTLDFactory.price();
            expect(price).to.equal(tldPrice);

            // get user&admin balances BEFORE
            const balanceAdminBefore = await hre.ethers.provider.getBalance(admin.address); // admin is the factory owner
            const balanceTldOwnerBefore = await hre.ethers.provider.getBalance(tldOwner.address);

            await expect(
                situsTLDFactory.connect(tldOwner).createTld(
                    ".web3", // TLD
                    "WEB3", // symbol
                    admin.address, // TLD owner
                    ethers.parseUnits("0.2", 1), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.emit(situsTLDFactory, "TldCreated");

            // get another user's balance AFTER (should be smaller by 1 ETH + gas)
            const balanceTldOwnerAfter = await hre.ethers.provider.getBalance(tldOwner.address);
            const balUsrBef = Number(ethers.formatEther(balanceTldOwnerBefore));
            const balUsrAft = Number(ethers.formatEther(balanceTldOwnerAfter));
            expect(balUsrBef - balUsrAft).to.be.greaterThan(1); // diff: 1 ETH + gas

            // get admin's balance after (should be bigger by exactly 1 ETH)
            const balanceAdminAfter = await hre.ethers.provider.getBalance(admin.address);
            const balSigBef = Number(ethers.formatEther(balanceAdminBefore));
            const balSigAft = Number(ethers.formatEther(balanceAdminAfter));
            expect(balSigAft - balSigBef).to.equal(1); // diff: 1 ETH exactly

            // get TLD from array by index
            const firstTld = await situsTLDFactory.tlds(0);
            expect(firstTld).to.equal(".web3");

            // get TLD address by name
            const firstTldAddress = await situsTLDFactory.tldNamesAddresses(".web3");
            expect(firstTldAddress.startsWith("0x")).to.be.true;
        });

        it("should fail to create a new valid TLD if Buying TLDs disabled", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            const price = await situsTLDFactory.price();
            expect(price).to.equal(tldPrice);

            await expect(
                situsTLDFactory.createTld(
                    ".web3", // TLD
                    "WEB3", // symbol
                    admin.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLDFactory, "Disabled");
        });

        it("should fail to create a new valid TLD if payment is too low", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            await situsTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await situsTLDFactory.price();
            expect(price).to.equal(tldPrice);

            await expect(
                situsTLDFactory.createTld(
                    ".web3", // TLD
                    "WEB3", // symbol
                    admin.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: ethers.parseUnits("0.9", "ether"), // pay 0.9 ETH for the TLD - TOO LOW!
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLDFactory, "ValueBelowPrice");
        });

        it("should fail to create a new valid TLD if more than 1 dot in the name", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            await situsTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await situsTLDFactory.price();
            expect(price).to.equal(tldPrice);

            await expect(
                situsTLDFactory.createTld(
                    ".web.3", // TLD
                    "WEB3", // symbol
                    admin.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLDFactory, "MustHaveOneDot");
        });

        it("should fail to create a new valid TLD if no dot in the name", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            await situsTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await situsTLDFactory.price();
            expect(price).to.equal(tldPrice);

            await expect(
                situsTLDFactory.createTld(
                    "web3", // TLD
                    "WEB3", // symbol
                    admin.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLDFactory, "MustHaveOneDot");
        });

        it("should fail to create a new valid TLD if name does not start with dot", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            await situsTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await situsTLDFactory.price();
            expect(price).to.equal(tldPrice);

            await expect(
                situsTLDFactory.createTld(
                    "web.3", // TLD
                    "WEB3", // symbol
                    admin.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLDFactory, "MustStartWithDot");
        });

        it("should fail to create a new valid TLD if name is of length 1", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            await situsTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await situsTLDFactory.price();
            expect(price).to.equal(tldPrice);

            await expect(
                situsTLDFactory.createTld(
                    ".", // TLD
                    "WEB3", // symbol
                    admin.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLDFactory, "TLDTooShort");
        });

        it("should fail to create a new valid TLD with empty name", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            await situsTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await situsTLDFactory.price();
            expect(price).to.equal(tldPrice);

            await expect(
                situsTLDFactory.createTld(
                    "", // TLD
                    "WEB3", // symbol
                    admin.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLDFactory, "TLDTooShort");
        });

        it("should fail to create a new valid TLD if TLD already exists", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            await situsTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await situsTLDFactory.price();
            expect(price).to.equal(tldPrice);

            // create a valid TLD
            await expect(
                situsTLDFactory.createTld(
                    ".web3", // TLD
                    "WEB3", // symbol
                    admin.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.emit(situsTLDFactory, "TldCreated");

            // try to create a TLD with the same name
            await expect(
                situsTLDFactory.createTld(
                    ".web3", // TLD
                    "WEB3", // symbol
                    admin.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLDFactory, "ExistsOrForbidden");
        });

        it("should fail to create a new valid TLD if TLD name is too long", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            await situsTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await situsTLDFactory.price();
            expect(price).to.equal(tldPrice);

            // try to create a TLD with the same name
            await expect(
                situsTLDFactory.createTld(
                    ".web3dfferopfmeomeriovneriovneriovndferfgergf", // TLD
                    "WEB3", // symbol
                    admin.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLDFactory, "TLDTooLong");
        });

        it("should fail to create a new valid TLD if TLD name is forbidden", async function () {
            const { situsTLDFactory, admin } = await loadFixture(deploySitusTLDFactoryFixture);
            await situsTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await situsTLDFactory.price();
            expect(price).to.equal(tldPrice);

            // try to create a TLD that's on the forbidden list
            await expect(
                situsTLDFactory.createTld(
                    ".com", // TLD
                    "COM", // symbol
                    admin.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWithCustomError(situsTLDFactory, "ExistsOrForbidden");
        });
    });
});
