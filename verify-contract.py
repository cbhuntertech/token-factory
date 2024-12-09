import requests
import time
import json

def get_flattened_contract():
    return """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

interface IUniswapV2Router02 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
    function removeLiquidityETH(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external returns (uint amountToken, uint amountETH);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}

abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _transferOwnership(_msgSender());
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

abstract contract Pausable is Context {
    event Paused(address account);
    event Unpaused(address account);

    bool private _paused;

    constructor() {
        _paused = false;
    }

    function paused() public view virtual returns (bool) {
        return _paused;
    }

    modifier whenNotPaused() {
        require(!paused(), "Pausable: paused");
        _;
    }

    modifier whenPaused() {
        require(paused(), "Pausable: not paused");
        _;
    }

    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

contract ERC20 is Context, IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function name() public view virtual returns (string memory) {
        return _name;
    }

    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual returns (uint8) {
        return 18;
    }

    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);
        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
        }
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        uint256 currentAllowance = _allowances[_msgSender()][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        unchecked {
            _approve(_msgSender(), spender, currentAllowance - subtractedValue);
        }
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        _beforeTokenTransfer(sender, recipient, amount);
        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        unchecked {
            _balances[sender] = senderBalance - amount;
        }
        _balances[recipient] += amount;
        emit Transfer(sender, recipient, amount);
        _afterTokenTransfer(sender, recipient, amount);
    }

    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");
        _beforeTokenTransfer(address(0), account, amount);
        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
        _afterTokenTransfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");
        _beforeTokenTransfer(account, address(0), amount);
        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
        }
        _totalSupply -= amount;
        emit Transfer(account, address(0), amount);
        _afterTokenTransfer(account, address(0), amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual {}

    function _afterTokenTransfer(address from, address to, uint256 amount) internal virtual {}
}

contract Token is ERC20, Ownable, Pausable {
    mapping(address => bool) public whitelist;
    uint256 public buyTax;
    uint256 public sellTax;
    uint256 public walletTax;
    string public logoUrl;
    string public website;
    string public telegram;
    bool public salesLocked;
    bool public mintable;
    uint256 public maxSupply;
    
    address public uniswapV2Pair;
    address public uniswapV3Pool;
    
    address[] public whitelistAddresses;
    
    mapping(address => bool) public isExcludedFromTax;
    
    address public creator;
    
    event WhitelistUpdated(address account, bool status);
    event LogoUpdated(string newLogo);
    event LiquidityAdded(address pair, uint256 amount);
    event LiquidityRemoved(address pair, uint256 amount);
    event TokenInfoUpdated(string newLogo, string newWebsite, string newTelegram);
    event TaxesUpdated(uint256 buyTax, uint256 sellTax, uint256 walletTax);
    event MintableToggled(bool status);
    event SalesLockToggled(bool status);
    event TaxExclusionUpdated(address account, bool excluded);
    event UniswapV3PoolSet(address pool);
    event TaxCollected(
        address indexed from,
        address indexed to,
        uint256 amount,
        string taxType
    );

    constructor(
        string memory name,
        string memory symbol,
        uint256 totalSupply,
        address[] memory _whitelist,
        uint256 _buyTax,
        uint256 _sellTax,
        uint256 _walletTax,
        string memory _logoUrl,
        string memory _website,
        string memory _telegram,
        bool _salesLocked,
        bool _mintable,
        uint256 _maxSupply,
        address tokenOwner
    ) ERC20(name, symbol) {
        require(totalSupply <= _maxSupply, "Initial supply exceeds max supply");
        require(_buyTax <= 25 && _sellTax <= 25 && _walletTax <= 25, "Tax too high");
        require(tokenOwner != address(0), "Zero owner address");
        
        creator = tokenOwner;
        _mint(tokenOwner, totalSupply);
        buyTax = _buyTax;
        sellTax = _sellTax;
        walletTax = _walletTax;
        logoUrl = _logoUrl;
        website = _website;
        telegram = _telegram;
        salesLocked = _salesLocked;
        mintable = _mintable;
        maxSupply = _maxSupply;
        
        for(uint i = 0; i < _whitelist.length; i++) {
            whitelist[_whitelist[i]] = true;
            whitelistAddresses.push(_whitelist[i]);
        }
        whitelist[tokenOwner] = true;
        whitelistAddresses.push(tokenOwner);
        
        _transferOwnership(tokenOwner);
    }

    function updateWhitelist(address account, bool status) external onlyOwner {
        if (status && !whitelist[account]) {
            whitelist[account] = true;
            whitelistAddresses.push(account);
        } else if (!status && whitelist[account]) {
            whitelist[account] = false;
            for (uint i = 0; i < whitelistAddresses.length; i++) {
                if (whitelistAddresses[i] == account) {
                    whitelistAddresses[i] = whitelistAddresses[whitelistAddresses.length - 1];
                    whitelistAddresses.pop();
                    break;
                }
            }
        }
        emit WhitelistUpdated(account, status);
    }

    function addLiquidityV2(
        address router,
        uint256 tokenAmount,
        uint256 ethAmount
    ) external payable onlyOwner {
        require(router != address(0), "Zero router address");
        require(tokenAmount > 0, "Zero token amount");
        require(ethAmount > 0, "Zero ETH amount");
        
        IUniswapV2Router02 uniswapRouter = IUniswapV2Router02(router);
        IERC20(address(this)).approve(router, tokenAmount);
        
        uniswapRouter.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0,
            0,
            owner(),
            block.timestamp + 300
        );
        
        uniswapV2Pair = IUniswapV2Factory(uniswapRouter.factory()).getPair(
            address(this),
            uniswapRouter.WETH()
        );
        
        emit LiquidityAdded(uniswapV2Pair, tokenAmount);
    }

    function addLiquidityV3(
        address router,
        uint256 tokenAmount,
        uint256 ethAmount,
        uint24 fee
    ) external payable onlyOwner {
        require(msg.value >= ethAmount, "Insufficient ETH");
        
        ISwapRouter uniswapRouter = ISwapRouter(router);
        IERC20(address(this)).approve(router, tokenAmount);
        
        emit LiquidityAdded(router, tokenAmount);
    }

    function removeLiquidityV2(
        address router,
        uint256 liquidity
    ) external onlyOwner {
        IUniswapV2Router02 uniswapRouter = IUniswapV2Router02(router);
        
        IERC20(uniswapV2Pair).approve(router, liquidity);
        
        uniswapRouter.removeLiquidityETH(
            address(this),
            liquidity,
            0,
            0,
            owner(),
            block.timestamp + 300
        );
        
        emit LiquidityRemoved(uniswapV2Pair, liquidity);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);
        
        require(!paused(), "Token transfer while paused");
        
        if (to == uniswapV2Pair || to == uniswapV3Pool) {
            require(
                whitelist[from] || from == owner(),
                "Only whitelisted addresses can sell"
            );
        }
        
        if (salesLocked) {
            require(
                whitelist[from] || whitelist[to] || 
                from == owner() || to == owner() ||
                from == address(0),
                "Trading is locked for non-whitelisted addresses"
            );
        }
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override {
        require(sender != address(0), "Transfer from zero");
        require(recipient != address(0), "Transfer to zero");

        uint256 taxAmount = 0;
        uint256 transferAmount = amount;
        
        if (!isExcludedFromTax[sender] && !isExcludedFromTax[recipient]) {
            if (recipient == uniswapV2Pair || recipient == uniswapV3Pool) {
                taxAmount = (amount * sellTax) / 100;
            } else if (sender == uniswapV2Pair || sender == uniswapV3Pool) {
                taxAmount = (amount * buyTax) / 100;
            } else {
                taxAmount = (amount * walletTax) / 100;
            }
            
            if (taxAmount > 0) {
                transferAmount = amount - taxAmount;
                super._transfer(sender, creator, taxAmount);
                emit TaxCollected(
                    sender,
                    recipient,
                    taxAmount,
                    recipient == uniswapV2Pair || recipient == uniswapV3Pool ? "sell" :
                    sender == uniswapV2Pair || sender == uniswapV3Pool ? "buy" : "wallet"
                );
            }
        }
        
        super._transfer(sender, recipient, transferAmount);
    }

    function updateTokenInfo(
        string memory _logoUrl,
        string memory _website,
        string memory _telegram
    ) external onlyOwner {
        logoUrl = _logoUrl;
        website = _website;
        telegram = _telegram;
        emit TokenInfoUpdated(_logoUrl, _website, _telegram);
    }

    function toggleSalesLock() external onlyOwner {
        salesLocked = !salesLocked;
        emit SalesLockToggled(salesLocked);
    }

    function setTaxes(
        uint256 _buyTax,
        uint256 _sellTax,
        uint256 _walletTax
    ) external onlyOwner {
        require(_buyTax <= 25 && _sellTax <= 25 && _walletTax <= 25, "Tax too high");
        buyTax = _buyTax;
        sellTax = _sellTax;
        walletTax = _walletTax;
        emit TaxesUpdated(_buyTax, _sellTax, _walletTax);
    }

    function rescueTokens(
        address tokenAddress,
        uint256 amount
    ) external onlyOwner {
        require(tokenAddress != address(this), "Cannot rescue native tokens");
        IERC20(tokenAddress).transfer(owner(), amount);
    }

    function rescueETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getTokenBasicInfo() external view returns (
        string memory _logoUrl,
        string memory _website,
        string memory _telegram,
        bool _salesLocked,
        bool _mintable
    ) {
        return (
            logoUrl,
            website,
            telegram,
            salesLocked,
            mintable
        );
    }

    function getTokenNumbers() external view returns (
        uint256 _maxSupply,
        uint256 _totalSupply,
        uint256 _buyTax,
        uint256 _sellTax,
        uint256 _walletTax
    ) {
        return (
            maxSupply,
            totalSupply(),
            buyTax,
            sellTax,
            walletTax
        );
    }

    function setUniswapV3Pool(address _pool) external onlyOwner {
        require(_pool != address(0), "Zero address");
        uniswapV3Pool = _pool;
        emit UniswapV3PoolSet(_pool);
    }

    function excludeFromTax(address account, bool excluded) external onlyOwner {
        require(account != address(0), "Zero address");
        isExcludedFromTax[account] = excluded;
        emit TaxExclusionUpdated(account, excluded);
    }

    function updateWhitelistBatch(address[] calldata accounts, bool[] calldata statuses) external onlyOwner {
        require(accounts.length == statuses.length, "Arrays length mismatch");
        for(uint i = 0; i < accounts.length; i++) {
            if (statuses[i] && !whitelist[accounts[i]]) {
                whitelist[accounts[i]] = true;
                whitelistAddresses.push(accounts[i]);
            } else if (!statuses[i] && whitelist[accounts[i]]) {
                whitelist[accounts[i]] = false;
                for (uint j = 0; j < whitelistAddresses.length; j++) {
                    if (whitelistAddresses[j] == accounts[i]) {
                        whitelistAddresses[j] = whitelistAddresses[whitelistAddresses.length - 1];
                        whitelistAddresses.pop();
                        break;
                    }
                }
            }
            emit WhitelistUpdated(accounts[i], statuses[i]);
        }
    }

    function isAddressExcludedFromTax(address account) external view returns (bool) {
        return isExcludedFromTax[account];
    }

    function calculateTax(
        address sender,
        address recipient,
        uint256 amount
    ) public view returns (uint256) {
        if (isExcludedFromTax[sender] || isExcludedFromTax[recipient]) {
            return 0;
        }
        
        if (recipient == uniswapV2Pair || recipient == uniswapV3Pool) {
            return (amount * sellTax) / 100;
        } else if (sender == uniswapV2Pair || sender == uniswapV3Pool) {
            return (amount * buyTax) / 100;
        } else {
            return (amount * walletTax) / 100;
        }
    }

    function isSellAllowed(address seller) public view returns (bool) {
        return !salesLocked || whitelist[seller] || seller == owner();
    }
}"""

def verify_contract():
    url = "https://api-testnet.bscscan.com/api"
    
    contract_code = get_flattened_contract()
    
    params = {
        "apikey": "A12FVH4CZCY6B7C98VJRDWSK7U4Y5UI2X4",
        "module": "contract",
        "action": "verifysourcecode",
        "contractaddress": "0xc2697d924fe6cf2eb3dfe4ec6c7bcf2dbfc10966",
        "sourceCode": contract_code,
        "codeformat": "solidity-single-file",
        "contractname": "Token",
        "compilerversion": "v0.8.19",
        "optimizationUsed": "1",
        "runs": "200",
        "constructorArguments": "000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000004004D554D550000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000034D554D00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000186A00000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000A000000000000000000000000000000000000000000000000000000000000000E000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000186A000000000000000000000000037160534b276b54f21b831663d55f12a5aaf68c8000000000000000000000000000000000000000000000000000000000000000B68747470733A2F2F2E2E2E000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000B68747470733A2F2F2E2E2E000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000F68747470733A2F2F742E6D652F2E2E2E0000000000000000000000000000000000"
    }

    response = requests.post(url, data=params)
    result = response.json()
    
    print("Initial response:", json.dumps(result, indent=2))
    
    if "result" in result:
        guid = result["result"]
        print(f"\nGUID получен: {guid}")
        print("Ожидание верификации...")
        check_verification_status(guid)
    else:
        print("Ошибка при отправке запроса на верификации:", result.get("message", "Unknown error"))

def check_verification_status(guid):
    url = "https://api-testnet.bscscan.com/api"
    
    params = {
        "apikey": "A12FVH4CZCY6B7C98VJRDWSK7U4Y5UI2X4",
        "module": "contract",
        "action": "checkverifystatus",
        "guid": guid
    }
    
    max_attempts = 10
    attempt = 0
    
    while attempt < max_attempts:
        response = requests.get(url, params=params)
        result = response.json()
        
        print(f"Попытка {attempt + 1}: {result['result']}")
        
        if "Pending in queue" not in result["result"]:
            print("\nФинальный статус:", result["result"])
            break
            
        attempt += 1
        time.sleep(10)

if __name__ == "__main__":
    verify_contract()