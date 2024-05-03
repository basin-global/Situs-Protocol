import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseUnits } from "ethers";
import SitusTLDFactoryModule from "./SitusProtocol";

// Deploys a custom TLD with no minter

// Default Values
const DOMAINPRICE = parseUnits("1000000000000000000", "wei");
const BUYINGENABLED = false;

const SitusTLDModule = buildModule("SitusTLDModule", (m) => {
    const { situsTLDFactory } = m.useModule(SitusTLDFactoryModule);
    const deployer = m.getAccount(0);
  
    const customTldName = m.getParameter("customTldName", ".web2");
    const customTldSymbol = m.getParameter("customTldSymbol", ".WEB2");
    const customDomainPrice = m.getParameter("customDomainPrice", DOMAINPRICE);
    const customBuyingEnabled = m.getParameter("customBuyingEnabled", BUYINGENABLED);
  
    const callNewTLDSitus = m.call(situsTLDFactory, "ownerCreateTld", [
      customTldName,
      customTldSymbol,
      deployer, // TLD owner
      customDomainPrice,
      customBuyingEnabled, // buying enabled
    ]);
    const situsTLDAddress = m.readEventArgument(
      callNewTLDSitus,
      "TldCreated",
      "tldAddress"
    );
    const situsTLD = m.contractAt("SitusTLD", situsTLDAddress);
  
    return { situsTLD };
  });

  export default SitusTLDModule;