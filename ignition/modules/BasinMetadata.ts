import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BasinMetadataModule = buildModule("BasinMetadataModule", (m) => {
  const basinMetadata = m.contract("BasinMetadata");

  return { basinMetadata };
});

export default BasinMetadataModule;
