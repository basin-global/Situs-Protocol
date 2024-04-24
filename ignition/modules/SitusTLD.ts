import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SitusTLDModule = buildModule("SitusTLDModule", (m) => {
  const deployer = m.getAccount(0);

  const situsMetadataStore = m.contract("SitusMetadataStore");
  const situsForbiddenTLDs = m.contract("SitusForbiddenTLDs");
  const situsResolverNonUpgradable = m.contract("SitusResolverNonUpgradable");

  const tldPrice = "900000"; // default price in ETH

  const situsTLDFactory = m.contract("SitusTLDFactory", [
    tldPrice, // FIXME
    situsForbiddenTLDs,
    situsMetadataStore
  ]);

  m.call(situsForbiddenTLDs, 'addFactoryAddress', [situsTLDFactory]);
  m.call(situsResolverNonUpgradable, 'addFactoryAddress', [situsTLDFactory]);

  const tldName = ".basin";
  const tldSymbol = ".BASIN";

  // Use this for a standard TLD without a custom metadata contract
  // m.call(situsTLDFactory, 'ownerCreateTld', [
  //   tldName,
  //   tldSymbol,
  //   deployer,
  //   0,
  //   false // buying enabled
  // ]);

  // Use a custom metadata contract
  const basinMetadata3 = m.contract("BasinMetadata3");
  const tldRoyalty = "0"; // default price in ETH
  const basinTLD = m.contract("SitusTLD", [
    tldName,
    tldSymbol,
    deployer,
    tldPrice, // FIXME
    true,
    tldRoyalty,
    situsTLDFactory,
    basinMetadata3
  ]);


  return { situsMetadataStore, situsForbiddenTLDs, situsResolverNonUpgradable, situsTLDFactory };
});

export default SitusTLDModule;
