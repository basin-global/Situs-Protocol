// scripts/deploy.js

async function main() {
    // Retrieve the contract factories
    const SVGStorage = await ethers.getContractFactory("SVGStorage");
    const OnchainImageMeta = await ethers.getContractFactory("OnchainImageMeta");

    // Deploys the SVGStorage contract first
    const svgStorage = await SVGStorage.deploy();
    await svgStorage.deployed();
    console.log("SVGStorage deployed to:", svgStorage.address);

    // Deploys the OnchainImageMeta contract with the address of the deployed SVGStorage
    const onchainImageMeta = await OnchainImageMeta.deploy(svgStorage.address);
    await onchainImageMeta.deployed();
    console.log("OnchainImageMeta deployed to:", onchainImageMeta.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
