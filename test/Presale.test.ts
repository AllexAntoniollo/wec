import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

const USDT = (n: number | string) => ethers.parseUnits(n.toString(), 6);
const WECR = (n: number | string) => ethers.parseUnits(n.toString(), 18);

describe("WECRPresale", function () {
  async function deployFixture() {
    const [owner, buyer, feeManager, other] = await ethers.getSigners();

    const Usdt = await ethers.getContractFactory("USDT");
    const usdt = await Usdt.deploy();
    const usdtAddress = await usdt.getAddress();

    const Usdc = await ethers.getContractFactory("USDT");
    const usdc = await Usdc.deploy();
    const usdcAddress = await usdc.getAddress();

    const WECR = await ethers.getContractFactory("WECR");
    const wecr = await WECR.deploy();
    const wecrAddress = await wecr.getAddress();

    const AdminsPool = await ethers.getContractFactory("AdminsPool");
    const adminsPool = await AdminsPool.deploy();
    const feeManagerAddress = await adminsPool.getAddress();
    await adminsPool.addToken(usdtAddress, "USDT");
    await adminsPool.addToken(usdcAddress, "USDC");
    await adminsPool.addToken(wecrAddress, "WECR");

    const presale = await ethers.deployContract("Presale", [
      await usdt.getAddress(),
      await usdc.getAddress(),
      await wecr.getAddress(),
      feeManagerAddress,
    ]);
    await usdt.transfer(buyer.address, ethers.parseUnits("1000", 6));
    await usdc.transfer(buyer.address, ethers.parseUnits("1000", 6));
    await wecr.transfer(presale, ethers.parseUnits("100000000", 18));
    const presaleAddress = await presale.getAddress();

    return {
      presale,
      presaleAddress,
      usdt,
      usdc,
      wecr,
      owner,
      buyer,
      feeManagerAddress,
      other,
    };
  }

  describe("swap", function () {
    it("Should swap USDT for WECR, sending 10% fee to the fee manager", async function () {
      const { presale, presaleAddress, usdt, wecr, buyer, feeManagerAddress } =
        await networkHelpers.loadFixture(deployFixture);

      const amount = USDT(100);
      // tokens = amount * 1e18 / 10000 = 1e8 * 1e18 / 1e4 = 1e22 (10,000 WECR)
      const expectedTokens = WECR(10_000);
      const expectedFee = USDT(10);
      await usdt.connect(buyer).approve(presaleAddress, amount);

      await expect(presale.connect(buyer).swap(amount))
        .to.emit(presale, "Swap")
        .withArgs(buyer.address, amount, expectedFee, expectedTokens);

      expect(await usdt.balanceOf(buyer.address)).to.equal(USDT(900));
      expect(await usdt.balanceOf(feeManagerAddress)).to.equal(expectedFee);
      expect(await usdt.balanceOf(presaleAddress)).to.equal(
        amount - expectedFee,
      );

      expect(await wecr.balanceOf(buyer.address)).to.equal(expectedTokens);
      expect(await wecr.balanceOf(presaleAddress)).to.equal(
        WECR(1_000_000_00) - expectedTokens,
      );
    });
  });

  describe("freeWithdraw", function () {
    // NOTE: the contract has no function that sets `isFreeWallet`,
    // so the authorized path cannot be exercised yet (see comment at the bottom).

    it("Should remove the buyer from the free wallets list without paying", async function () {
      const { presale, buyer, usdt } = await networkHelpers.loadFixture(
        deployFixture,
      );
      await presale.setFreeWallet(buyer.address, true);
      await presale.connect(buyer).freeWithdraw(buyer.address, WECR(1000));
      expect(await presale.debt(buyer.address)).to.equal(WECR(1100));
      await usdt.connect(buyer).approve(presale.getAddress(), USDT(20));
      await presale.connect(buyer).payDebt(USDT(10));
      expect(await presale.debt(buyer.address)).to.equal(WECR(100));
      await presale.connect(buyer).payDebt(USDT(10));
      expect(await presale.debt(buyer.address)).to.equal(WECR(0));
    });
  });
});
