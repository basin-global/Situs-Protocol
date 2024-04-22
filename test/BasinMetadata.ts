import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

describe("BasinMetadataStore", function () {
    // Fixture
    async function deployBasinMetadataStoreFixture() {
        const [owner, otherAccount] = await hre.ethers.getSigners();

        const BasinMetadataStore = await hre.ethers.getContractFactory("BasinMetadataStore");
        const basinMetadataStore = await BasinMetadataStore.deploy();

        return { basinMetadataStore, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { basinMetadataStore } = await loadFixture(deployBasinMetadataStoreFixture);
            expect(await basinMetadataStore.getAddress()).to.be.properAddress;
            expect(await basinMetadataStore.getAddress()).to.not.equal(ethers.ZeroAddress);
        });
    });
});
