import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseUnits } from "ethers";
import SitusTLDFactoryModule from "./SitusProtocol";

// Default Values
const PRICE1CHAR = "1";
const PRICE2CHAR = "0.1";
const PRICE3CHAR = "0.03";
const PRICE4CHAR = "0.008";
const PRICE5CHAR = "0.0002";

const SitusTLDModule = buildModule("SitusTLDModule", (m) => {
    const { situsTLDFactory } = m.useModule(SitusTLDFactoryModule);
    const deployer = m.getAccount(0);
  
    const customTldName = m.getParameter("customTldName", ".demo");
    const customTldSymbol = m.getParameter("customTldName", ".DEMO");
    const customTldDomainPrice = 0;
    const customPrice1char = m.getParameter("customPrice1char", PRICE1CHAR);
    const customPrice2char = m.getParameter("customPrice2char", PRICE2CHAR);
    const customPrice3char = m.getParameter("customPrice3char", PRICE3CHAR);
    const customPrice4char = m.getParameter("customPrice4char", PRICE4CHAR);
    const customPrice5char = m.getParameter("customPrice5char", PRICE5CHAR);
    const customPrice1 = parseUnits(customPrice1char.defaultValue || PRICE1CHAR, "ether");
    const customPrice2 = parseUnits(customPrice2char.defaultValue || PRICE2CHAR,  "ether");
    const customPrice3 = parseUnits(customPrice3char.defaultValue || PRICE3CHAR,  "ether");
    const customPrice4 = parseUnits(customPrice4char.defaultValue || PRICE4CHAR,  "ether");
    const customPrice5 = parseUnits(customPrice5char.defaultValue || PRICE5CHAR,  "ether");
  
    const callNewTLDSitus = m.call(situsTLDFactory, "ownerCreateTld", [
      customTldName,
      customTldSymbol,
      deployer,
      customTldDomainPrice,
      false, // buying enabled
    ]);
    const situsTLDAddress = m.readEventArgument(
      callNewTLDSitus,
      "TldCreated",
      "tldAddress"
    );
    const customTLDContract = m.contractAt("SitusTLD", situsTLDAddress);
  
    const customTLDMinter = m.contract("SitusTLDMinter", [
        customTLDContract,
        customPrice1,
        customPrice2,
        customPrice3,
        customPrice4,
        customPrice5,
    ]);
    m.call(customTLDContract, "changeMinter", [customTLDMinter]);
  
    return { customTLDContract, customTLDMinter };
  });

  export default SitusTLDModule;