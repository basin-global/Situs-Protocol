import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

describe("BasinTLDFactory", function () {
    const tldPrice = ethers.parseUnits("1", "ether");

    // Fixture
    async function deployBasinTLDFactoryFixture() {
        const [signer, anotherUser] = await hre.ethers.getSigners();

        const BasinMetadataStore = await hre.ethers.getContractFactory("BasinMetadataStore");
        const basinMetadataStore = await BasinMetadataStore.deploy();
        const basinMetadataStoreAddress = await basinMetadataStore.getAddress();

        const BasinForbiddenTLDs = await hre.ethers.getContractFactory("BasinForbiddenTLDs");
        const basinForbiddenTLDs = await BasinForbiddenTLDs.deploy();
        const basinForbiddenTLDsAddress = await basinForbiddenTLDs.getAddress();

        const BasinResolverNonUpgradable = await hre.ethers.getContractFactory("BasinResolverNonUpgradable");
        const basinResolverNonUpgradable = await BasinResolverNonUpgradable.deploy();

        const BasinTLDFactory = await hre.ethers.getContractFactory("BasinTLDFactory");
        const basinTLDFactory = await BasinTLDFactory.deploy(tldPrice, basinForbiddenTLDsAddress, basinMetadataStoreAddress);
        const basinTLDFactoryAddress = await basinTLDFactory.getAddress();

        await basinForbiddenTLDs.addFactoryAddress(basinTLDFactoryAddress);
        await basinResolverNonUpgradable.addFactoryAddress(basinTLDFactoryAddress);

        return { basinTLDFactory, basinForbiddenTLDs, signer, anotherUser };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { basinTLDFactory } = await loadFixture(deployBasinTLDFactoryFixture);
            expect(await basinTLDFactory.getAddress()).to.be.properAddress;
            expect(await basinTLDFactory.getAddress()).to.not.equal(ethers.ZeroAddress);
        });
    });

    describe("Create TLD", function () {
        it("should confirm forbidden TLD names defined in the constructor", async function () {
            const { basinForbiddenTLDs } = await loadFixture(deployBasinTLDFactoryFixture);
            const forbiddenCom = await basinForbiddenTLDs.forbidden(".com");
            expect(forbiddenCom).to.be.true;

            const forbiddenEth = await basinForbiddenTLDs.forbidden(".eth");
            expect(forbiddenEth).to.be.true;
        });

        it("should create a new valid TLD", async function () {
            const { basinTLDFactory, signer, anotherUser } = await loadFixture(deployBasinTLDFactoryFixture);
            await basinTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await basinTLDFactory.price();
            expect(price).to.equal(tldPrice);

            // get user&signer balances BEFORE
            const balanceSignerBefore = await hre.ethers.provider.getBalance(signer.address); // signer is the factory owner
            const balanceUserBefore = await hre.ethers.provider.getBalance(anotherUser.address);

            await expect(
                basinTLDFactory.connect(anotherUser).createTld(
                    ".web3", // TLD
                    "WEB3", // symbol
                    signer.address, // TLD owner
                    ethers.parseUnits("0.2", 1), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.emit(basinTLDFactory, "TldCreated");

            // get another user's balance AFTER (should be smaller by 1 ETH + gas)
            const balanceUserAfter = await hre.ethers.provider.getBalance(anotherUser.address);
            const balUsrBef = Number(ethers.formatEther(balanceUserBefore));
            const balUsrAft = Number(ethers.formatEther(balanceUserAfter));
            expect(balUsrBef - balUsrAft).to.be.greaterThan(1); // diff: 1 ETH + gas

            // get signer's balance after (should be bigger by exactly 1 ETH)
            const balanceSignerAfter = await hre.ethers.provider.getBalance(signer.address);
            const balSigBef = Number(ethers.formatEther(balanceSignerBefore));
            const balSigAft = Number(ethers.formatEther(balanceSignerAfter));
            expect(balSigAft - balSigBef).to.equal(1); // diff: 1 ETH exactly

            // get TLD from array by index
            const firstTld = await basinTLDFactory.tlds(0);
            expect(firstTld).to.equal(".web3");

            // get TLD address by name
            const firstTldAddress = await basinTLDFactory.tldNamesAddresses(".web3");
            expect(firstTldAddress.startsWith("0x")).to.be.true;
        });

        it("should fail to create a new valid TLD if Buying TLDs disabled", async function () {
            const { basinTLDFactory, signer } = await loadFixture(deployBasinTLDFactoryFixture);
            const price = await basinTLDFactory.price();
            expect(price).to.equal(tldPrice);

            await expect(
                basinTLDFactory.createTld(
                    ".web3", // TLD
                    "WEB3", // symbol
                    signer.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWith("Buying TLDs disabled");
        });

        it("should fail to create a new valid TLD if payment is too low", async function () {
            const { basinTLDFactory, signer } = await loadFixture(deployBasinTLDFactoryFixture);
            await basinTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await basinTLDFactory.price();
            expect(price).to.equal(tldPrice);

            await expect(
                basinTLDFactory.createTld(
                    ".web3", // TLD
                    "WEB3", // symbol
                    signer.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: ethers.parseUnits("0.9", "ether"), // pay 0.9 ETH for the TLD - TOO LOW!
                    },
                ),
            ).to.be.revertedWith("Value below price");
        });

        it("should fail to create a new valid TLD if more than 1 dot in the name", async function () {
            const { basinTLDFactory, signer } = await loadFixture(deployBasinTLDFactoryFixture);
            await basinTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await basinTLDFactory.price();
            expect(price).to.equal(tldPrice);

            await expect(
                basinTLDFactory.createTld(
                    ".web.3", // TLD
                    "WEB3", // symbol
                    signer.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWith("Name must have 1 dot");
        });

        it("should fail to create a new valid TLD if no dot in the name", async function () {
            const { basinTLDFactory, signer } = await loadFixture(deployBasinTLDFactoryFixture);
            await basinTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await basinTLDFactory.price();
            expect(price).to.equal(tldPrice);

            await expect(
                basinTLDFactory.createTld(
                    "web3", // TLD
                    "WEB3", // symbol
                    signer.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWith("Name must have 1 dot");
        });

        it("should fail to create a new valid TLD if name does not start with dot", async function () {
            const { basinTLDFactory, signer } = await loadFixture(deployBasinTLDFactoryFixture);
            await basinTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await basinTLDFactory.price();
            expect(price).to.equal(tldPrice);

            await expect(
                basinTLDFactory.createTld(
                    "web.3", // TLD
                    "WEB3", // symbol
                    signer.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWith("Name must start with dot");
        });

        it("should fail to create a new valid TLD if name is of length 1", async function () {
            const { basinTLDFactory, signer } = await loadFixture(deployBasinTLDFactoryFixture);
            await basinTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await basinTLDFactory.price();
            expect(price).to.equal(tldPrice);

            await expect(
                basinTLDFactory.createTld(
                    ".", // TLD
                    "WEB3", // symbol
                    signer.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWith("TLD too short");
        });

        it("should fail to create a new valid TLD with empty name", async function () {
            const { basinTLDFactory, signer } = await loadFixture(deployBasinTLDFactoryFixture);
            await basinTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await basinTLDFactory.price();
            expect(price).to.equal(tldPrice);

            await expect(
                basinTLDFactory.createTld(
                    "", // TLD
                    "WEB3", // symbol
                    signer.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWith("TLD too short");
        });

        it("should fail to create a new valid TLD if TLD already exists", async function () {
            const { basinTLDFactory, signer } = await loadFixture(deployBasinTLDFactoryFixture);
            await basinTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await basinTLDFactory.price();
            expect(price).to.equal(tldPrice);

            // create a valid TLD
            await expect(
                basinTLDFactory.createTld(
                    ".web3", // TLD
                    "WEB3", // symbol
                    signer.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.emit(basinTLDFactory, "TldCreated");

            // try to create a TLD with the same name
            await expect(
                basinTLDFactory.createTld(
                    ".web3", // TLD
                    "WEB3", // symbol
                    signer.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWith("TLD already exists or forbidden");
        });

        it("should fail to create a new valid TLD if TLD name is too long", async function () {
            const { basinTLDFactory, signer } = await loadFixture(deployBasinTLDFactoryFixture);
            await basinTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await basinTLDFactory.price();
            expect(price).to.equal(tldPrice);

            // try to create a TLD with the same name
            await expect(
                basinTLDFactory.createTld(
                    ".web3dfferopfmeomeriovneriovneriovndferfgergf", // TLD
                    "WEB3", // symbol
                    signer.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWith("TLD too long");
        });

        it("should fail to create a new valid TLD if TLD name is forbidden", async function () {
            const { basinTLDFactory, signer } = await loadFixture(deployBasinTLDFactoryFixture);
            await basinTLDFactory.toggleBuyingTlds(); // enable buying TLDs

            const price = await basinTLDFactory.price();
            expect(price).to.equal(tldPrice);

            // try to create a TLD that's on the forbidden list
            await expect(
                basinTLDFactory.createTld(
                    ".com", // TLD
                    "COM", // symbol
                    signer.address, // TLD owner
                    ethers.parseUnits("0.2", "ether"), // domain price
                    false, // buying enabled
                    {
                        value: tldPrice, // pay 1 ETH for the TLD
                    },
                ),
            ).to.be.revertedWith("TLD already exists or forbidden");
        });
    });
});
