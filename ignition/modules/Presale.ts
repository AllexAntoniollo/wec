import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PresaleModule", (m) => {
  const adminsPool = m.contract("AdminsPool");

  const presale = m.contract("Presale", [
    "0xee4CBdAB01C9F5B105f384C3aCcEe703eA13A128", // USDT
    "0x24AE32084C305Bf1323e3628716E00514FFF2a9B", // USDC
    "0xf10a3a88D433BcdB568fE4dd483740f5e589165b", // WECR
    adminsPool,
  ]);

  m.call(
    adminsPool,
    "addToken",
    ["0xee4CBdAB01C9F5B105f384C3aCcEe703eA13A128", "USDT"],
    {
      id: "AdminsPoolAddUSDT",
    },
  );

  m.call(
    adminsPool,
    "addToken",
    ["0x24AE32084C305Bf1323e3628716E00514FFF2a9B", "USDC"],
    {
      id: "AdminsPoolAddUSDC",
    },
  );

  m.call(
    adminsPool,
    "addToken",
    ["0xf10a3a88D433BcdB568fE4dd483740f5e589165b", "WECR"],
    {
      id: "AdminsPoolAddWECR",
    },
  );

  return {
    adminsPool,
    presale,
  };
});
