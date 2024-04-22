import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BasinTLDModule = buildModule("BasinTLDModule", (m) => {
  const deployer = m.getAccount(0);

  const basinMetadataStore = m.contract("BasinMetadataStore");
  const basinForbiddenTLDs = m.contract("BasinForbiddenTLDs");
  const basinResolverNonUpgradable = m.contract("BasinResolverNonUpgradable");

  const tldPrice = "900000"; // default price in ETH

  const basinTLDFactory = m.contract("BasinTLDFactory", [
    tldPrice, // FIXME
    basinForbiddenTLDs,
    basinMetadataStore
  ]);

  m.call(basinForbiddenTLDs, 'addFactoryAddress', [basinTLDFactory]);
  m.call(basinResolverNonUpgradable, 'addFactoryAddress', [basinTLDFactory]);

  const tldName = ".basin";
  const tldSymbol = ".BASIN";

  // Use this for a standard TLD without a custom metadata contract
  // m.call(basinTLDFactory, 'ownerCreateTld', [
  //   tldName,
  //   tldSymbol,
  //   deployer,
  //   0,
  //   false // buying enabled
  // ]);

  // Use a custom metadata contract
  const basinMetadata3 = m.contract("BasinMetadata3");
  const tldRoyalty = "0"; // default price in ETH
  const basinTLD = m.contract("BasinTLD", [
    tldName,
    tldSymbol,
    deployer,
    tldPrice, // FIXME
    true,
    tldRoyalty,
    basinTLDFactory,
    basinMetadata3
  ]);


  return { basinMetadataStore, basinForbiddenTLDs, basinResolverNonUpgradable, basinTLDFactory };
});

export default BasinTLDModule;
