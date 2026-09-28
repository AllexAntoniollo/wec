// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

struct TokenBalance {
    address token;
    string name;
    uint256 balance;
}

abstract contract PaymentPool is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20[] public tokens;
    mapping(address => mapping(address => uint)) public recipientsClaim;
    mapping(address => uint24) public recipientsPercentage;
    mapping(address => bool) public immutableWallets;
    mapping(address => mapping(address => uint256)) public totalClaimed;

    address[] public recipients;
    uint public totalRecipients;
    uint24 public totalPercentage;
    uint24 public constant PRECISION = 1e6;
    mapping(address => uint) public balanceFree;
    mapping(address => string) public tokenNames;
    mapping(address => bool) public isRegistered;
    mapping(address => bool) public isTokenRegistered;

    event RecipientAdded(address indexed newRecipient, uint24 percentage);
    event RecipientPercentageUpdated(
        address indexed recipient,
        uint24 newPercentage
    );
    event ImmutableWalletAdded(address indexed wallet);

    function collectUntrackedFunds(address token) external {
        require(isTokenRegistered[token], "Token not registered");

        uint256 contractBalance = IERC20(token).balanceOf(address(this));

        uint256 reserved = balanceFree[token];

        for (uint256 i = 0; i < recipients.length; i++) {
            reserved += recipientsClaim[recipients[i]][token];
        }

        require(contractBalance > reserved, "No untracked funds");

        uint256 amount = contractBalance - reserved;

        balanceFree[token] += amount;
    }

    function removeToken(address token) external onlyOwner {
        require(token != address(0), "Token address cannot be zero");
        require(isTokenRegistered[token], "Token is not registered");
        isTokenRegistered[token] = false;
        uint indexToRemove;
        bool found = false;

        for (uint i = 0; i < tokens.length; i++) {
            if (address(tokens[i]) == token) {
                indexToRemove = i;
                found = true;
                break;
            }
        }

        require(found, "Token not found in the list");

        tokens[indexToRemove] = tokens[tokens.length - 1];
        tokens.pop();

        delete tokenNames[token];
    }

    function addToken(address token, string calldata name) external onlyOwner {
        require(token != address(0), "Token address cannot be zero");
        require(bytes(name).length > 0, "Token name cannot be empty");
        require(!isTokenRegistered[token], "Token is already registered");
        tokenNames[token] = name;
        isTokenRegistered[token] = true;
        tokens.push(IERC20(token));
    }

    function incrementBalance(
        uint256 amount,
        address tokenContract
    ) external nonReentrant {
        require(
            isTokenRegistered[tokenContract],
            "Token contract not registered"
        );

        uint256 balanceBefore = IERC20(tokenContract).balanceOf(address(this));

        IERC20(tokenContract).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        uint256 balanceAfter = IERC20(tokenContract).balanceOf(address(this));

        uint256 actualReceived = balanceAfter - balanceBefore;

        balanceFree[tokenContract] += actualReceived;
    }

    function claim() external nonReentrant {
        require(recipientsPercentage[msg.sender] > 0, "Invalid recipient");

        for (uint i = 0; i < tokens.length; i++) {
            address token = address(tokens[i]);
            uint amount = balanceFree[token];
            uint totalDistributed;

            if (amount == 0) {
                if (recipientsClaim[msg.sender][token] > 0) {
                    tokens[i].safeTransfer(
                        msg.sender,
                        recipientsClaim[msg.sender][token]
                    );
                    totalClaimed[msg.sender][token] += recipientsClaim[
                        msg.sender
                    ][token];

                    recipientsClaim[msg.sender][token] = 0;
                }

                continue;
            }

            for (uint j = 0; j < recipients.length; j++) {
                address user = address(recipients[j]);
                uint value = (amount * recipientsPercentage[user]) / PRECISION;
                recipientsClaim[user][token] += value;
                totalDistributed += value;
            }

            uint claimable = recipientsClaim[msg.sender][token];
            if (claimable > 0) {
                tokens[i].safeTransfer(msg.sender, claimable);
            }
            uint remainder = amount - totalDistributed;

            if (remainder > 0) {
                tokens[i].safeTransfer(owner(), remainder);
            }
            balanceFree[token] = 0;
            totalClaimed[msg.sender][token] += recipientsClaim[msg.sender][
                token
            ];
            recipientsClaim[msg.sender][token] = 0;
        }
    }

    function getUserBalance(
        address _wallet
    ) external view returns (TokenBalance[] memory) {
        TokenBalance[] memory balances = new TokenBalance[](tokens.length);

        for (uint i = 0; i < tokens.length; i++) {
            address token = address(tokens[i]);
            uint256 totalClaimable = recipientsClaim[_wallet][token];
            uint256 freeShare = (balanceFree[token] *
                recipientsPercentage[_wallet]) / PRECISION;

            balances[i] = TokenBalance({
                token: token,
                name: tokenNames[token],
                balance: totalClaimable + freeShare
            });
        }

        return balances;
    }

    function isRecipient(address user) external view returns (bool) {
        for (uint i = 0; i < recipients.length; i++) {
            if (recipients[i] == user) {
                return true;
            }
        }
        return false;
    }

    function addRecipient(
        address newRecipient,
        uint24 percentage
    ) external onlyOwner {
        require(newRecipient != address(0), "Recipient address cannot be zero");
        require(!isRegistered[newRecipient], "Recipient already exists");
        require(
            totalPercentage + percentage <= PRECISION,
            "Total percentage exceeds 100%"
        );
        recipients.push(newRecipient);
        totalRecipients++;
        isRegistered[newRecipient] = true;
        recipientsPercentage[newRecipient] = percentage;
        totalPercentage += percentage;

        emit RecipientAdded(newRecipient, percentage);
    }

    function addImmutableWallet(address wallet) public onlyOwner {
        require(wallet != address(0), "Wallet address cannot be zero");
        require(
            recipientsPercentage[wallet] > 0,
            "Wallet must be a recipient to be made immutable"
        );
        immutableWallets[wallet] = true;
        emit ImmutableWalletAdded(wallet);
    }

    function updateRecipientPercentage(
        address recipient,
        uint24 newPercentage
    ) external onlyOwner {
        require(isRegistered[recipient], "Recipient does not exist");
        require(
            !immutableWallets[recipient],
            "This recipient is immutable and cannot have their percentage updated"
        );

        uint24 currentPercentage = recipientsPercentage[recipient];
        totalPercentage = totalPercentage - currentPercentage + newPercentage;
        require(totalPercentage <= PRECISION, "Total percentage exceeds 100%");

        recipientsPercentage[recipient] = newPercentage;

        emit RecipientPercentageUpdated(recipient, newPercentage);
    }
}
