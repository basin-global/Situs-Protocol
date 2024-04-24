import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "hardhat";

describe("SitusForbiddenTLDs", function () {
    // Fixture
    async function deploySitusForbiddenTLDsFixture() {
        const [owner, otherAccount] = await hre.ethers.getSigners();

        const SitusForbiddenTLDs = await hre.ethers.getContractFactory("SitusForbiddenTLDs");
        const situsForbiddenTLDs = await SitusForbiddenTLDs.deploy();

        return { situsForbiddenTLDs, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { situsForbiddenTLDs } = await loadFixture(deploySitusForbiddenTLDsFixture);
            expect(await situsForbiddenTLDs.getAddress()).to.be.properAddress;
            expect(await situsForbiddenTLDs.getAddress()).to.not.equal(ethers.ZeroAddress);
        });
    });
});
