// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IManager.sol";

contract Presale is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdt;
    IERC20 public immutable usdc;

    IERC20 public immutable wecr;

    uint256 public price;

    IManager public feeManager;

    mapping(address => bool) public isFreeWallet;
    mapping(address => uint256) public debt;

    bool public saleActive = true;

    event Swap(
        address indexed buyer,
        uint256 usPaid,
        uint256 usFee,
        uint256 tokensReceived
    );

    event FreeWithdraw(
        address indexed wallet,
        address indexed to,
        uint256 amount,
        uint256 feeTokens,
        uint256 haverAdded
    );

    event PriceUpdated(uint256 oldPrice, uint256 newPrice);

    event TokenWithdrawn(
        address indexed to,
        address indexed token,
        uint256 amount
    );
    event SaleStatusChanged(bool active);

    constructor(
        address _usdt,
        address _usdc,
        address _wecr,
        address _feeManager
    ) Ownable(msg.sender) {
        require(
            _usdt != address(0) && _usdc != address(0) && _wecr != address(0),
            "Invalid address"
        );

        require(_feeManager != address(0), "Invalid fee manager");

        usdt = IERC20(_usdt);
        usdc = IERC20(_usdc);

        wecr = IERC20(_wecr);

        feeManager = IManager(_feeManager);

        price = 10000;
    }

    // ---------------------------------------------------------------
    // SWAP: USDT -> WECR
    // ---------------------------------------------------------------
    function setFreeWallet(address wallet, bool isFree) external onlyOwner {
        require(wallet != address(0), "Invalid wallet address");
        isFreeWallet[wallet] = isFree;
    }
    function swap(uint256 usAmount, bool isUsdt) external nonReentrant {
        require(saleActive, "Sale is paused");
        require(usAmount > 0, "Amount must be greater than zero");

        uint256 tokens = (usAmount * 1 ether) / price;

        require(tokens > 0, "Amount too low");

        uint256 usFee = (usAmount * 10) / 100;

        if (isUsdt) {
            usdt.safeTransferFrom(msg.sender, address(this), usAmount);
            usdt.approve(address(feeManager), usFee);
            feeManager.incrementBalance(usFee, address(usdt));
        } else {
            usdc.safeTransferFrom(msg.sender, address(this), usAmount);
            usdc.approve(address(feeManager), usFee);
            feeManager.incrementBalance(usFee, address(usdc));
        }

        wecr.safeTransfer(msg.sender, tokens);

        emit Swap(msg.sender, usAmount, usFee, tokens);
    }

    function freeWithdraw(address to, uint256 amount) external nonReentrant {
        require(isFreeWallet[msg.sender], "Wallet is not authorized");

        require(to != address(0), "Invalid destination");

        require(amount > 0, "Amount must be greater than zero");

        uint256 feeTokens = (amount * 10) / 100;
        uint256 total = amount + feeTokens;

        debt[msg.sender] += total;

        wecr.safeTransfer(to, amount);

        wecr.approve(address(feeManager), feeTokens);
        feeManager.incrementBalance(feeTokens, address(wecr));

        emit FreeWithdraw(msg.sender, to, amount, feeTokens, total);
    }

    // ---------------------------------------------------------------
    // ADMIN
    // ---------------------------------------------------------------

    function setPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be greater than zero");

        emit PriceUpdated(price, newPrice);

        price = newPrice;
    }

    function setSaleActive(bool active) external onlyOwner {
        saleActive = active;

        emit SaleStatusChanged(active);
    }
    event DebtPaid(
        address indexed wallet,
        uint256 usdtPaid,
        uint256 debtPaid,
        uint256 remainingDebt
    );

    function payDebt(uint256 usAmount, bool isUsdt) external nonReentrant {
        require(usAmount > 0, "Amount must be greater than zero");

        uint256 userDebt = debt[msg.sender];
        require(userDebt > 0, "No debt");

        uint256 wecrAmount = (usAmount * 1 ether) / price;

        require(wecrAmount > 0, "Amount too low");

        uint256 debtPaid;
        uint256 usToPay;

        if (wecrAmount >= userDebt) {
            debtPaid = userDebt;

            usToPay = (userDebt * price) / 1 ether;

            debt[msg.sender] = 0;
        } else {
            debtPaid = wecrAmount;
            usToPay = usAmount;

            debt[msg.sender] = userDebt - wecrAmount;
        }
        if (isUsdt) {
            usdt.safeTransferFrom(msg.sender, address(this), usToPay);
        } else {
            usdc.safeTransferFrom(msg.sender, address(this), usToPay);
        }

        emit DebtPaid(msg.sender, usToPay, debtPaid, debt[msg.sender]);
    }
    function withdrawToken(
        address to,
        address tokenAddress,
        uint256 amount
    ) external onlyOwner {
        require(to != address(0), "Invalid address");

        IERC20(tokenAddress).safeTransfer(to, amount);

        emit TokenWithdrawn(to, tokenAddress, amount);
    }
}
