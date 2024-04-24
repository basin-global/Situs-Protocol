import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

describe("SitusMetadataStore", function () {
    // Fixture
    async function deploySitusMetadataStoreFixture() {
        const [owner, otherAccount] = await hre.ethers.getSigners();

        const SitusMetadataStore = await hre.ethers.getContractFactory("SitusMetadataStore");
        const situsMetadataStore = await SitusMetadataStore.deploy();

        return { situsMetadataStore, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { situsMetadataStore } = await loadFixture(deploySitusMetadataStoreFixture);
            expect(await situsMetadataStore.getAddress()).to.be.properAddress;
            expect(await situsMetadataStore.getAddress()).to.not.equal(ethers.ZeroAddress);
        });
    });
});
