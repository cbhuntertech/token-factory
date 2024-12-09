let userAddress = null;
let factory = null;
let provider = null;

async function initWeb3() {
    try {
        if (window.ethereum) {
            provider = new ethers.providers.Web3Provider(window.ethereum);
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            userAddress = accounts[0];
            
            const factoryAddress = "YOUR_FACTORY_CONTRACT_ADDRESS";
            const factoryABI = [
                // Вставьте ABI вашего контракта здесь
            ];
            
            factory = new ethers.Contract(
                factoryAddress,
                factoryABI,
                provider.getSigner()
            );
            
            generateReferralLink();
            await loadReferralStats();
        } else {
            alert('Please install MetaMask!');
        }
    } catch (error) {
        console.error('Error initializing Web3:', error);
    }
}

function generateReferralLink() {
    const baseUrl = "https://yoursite.com/create-token";
    const referralLink = `${baseUrl}?ref=${userAddress}`;
    document.getElementById('referralLink').value = referralLink;
}

async function loadReferralStats() {
    try {
        const stats = await factory.getReferralDetails(userAddress);
        const transactions = await factory.getReferralTransactions(userAddress);
        
        document.getElementById('totalEarnings').textContent = 
            `${ethers.utils.formatEther(stats.totalEarnings)} ETH`;
        document.getElementById('pendingEarnings').textContent = 
            `${ethers.utils.formatEther(stats.pendingEarnings)} ETH`;
        document.getElementById('withdrawnEarnings').textContent = 
            `${ethers.utils.formatEther(stats.withdrawnEarnings)} ETH`;
        document.getElementById('referralsCount').textContent = 
            stats.referralsCount.toString();
            
        updateTransactionsTable(transactions);
    } catch (error) {
        console.error('Error loading referral stats:', error);
    }
}

function updateTransactionsTable(transactions) {
    const tbody = document.getElementById('transactionsTable');
    tbody.innerHTML = '';
    
    transactions.forEach(tx => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(tx.timestamp * 1000).toLocaleString()}</td>
            <td>${shortenAddress(tx.referredUser)}</td>
            <td>${shortenAddress(tx.tokenCreated)}</td>
            <td>${ethers.utils.formatEther(tx.amount)} ETH</td>
        `;
        tbody.appendChild(row);
    });
}

async function claimEarnings() {
    try {
        const tx = await factory.claimReferralEarnings();
        await tx.wait();
        await loadReferralStats();
        alert('Средства успешно выведены!');
    } catch (error) {
        alert('Ошибка при выводе средств: ' + error.message);
    }
}

function copyToClipboard() {
    const linkInput = document.getElementById('referralLink');
    linkInput.select();
    document.execCommand('copy');
    alert('Ссылка скопирована!');
}

function shortenAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function createToken(params) {
    try {
        const tx = await factoryContract.createToken(params);
        const receipt = await tx.wait();
        const tokenAddress = receipt.events[0].args.token;
        
        // Показываем модальное окно с адресом токена
        showSuccessModal(tokenAddress);
        
        // Обновляем статистику рефералов
        await loadReferralStats();
    } catch (error) {
        console.error('Error creating token:', error);
        alert('Ошибка при создании токена: ' + error.message);
    }
}

// Добавляем функции для работы с модальным окном
function showSuccessModal(tokenAddress) {
    const modal = document.getElementById('successModal');
    const overlay = document.getElementById('modalOverlay');
    
    modal.innerHTML = `
        <h2 style="color: #28a745">🎉 Токен успешно создан!</h2>
        
        <div class="token-info">
            <p><strong>Адрес токена:</strong></p>
            <code>${tokenAddress}</code>
            <button onclick="copyToClipboard('${tokenAddress}')">
                📋 Копировать
            </button>
        </div>

        <div class="steps-guide">
            <h3>📝 Следующие шаги:</h3>
            
            <div class="step">
                <h4>1. Верификация контракта</h4>
                <button onclick="verifyContract('${tokenAddress}')">
                    🔍 Верифицировать
                </button>
                <p><small>Время выполнения: 2-3 минуты</small></p>
            </div>

            <div class="step">
                <h4>2. Добавление ликвидности</h4>
                <a href="https://pancakeswap.finance/add/${tokenAddress}" 
                   target="_blank"
                   style="text-decoration: none;">
                    <button>🥞 Добавить на PancakeSwap</button>
                </a>
            </div>

            <div class="step">
                <h4>3. Настройка токена</h4>
                <ul>
                    <li>✅ Добавить логотип токена</li>
                    <li>✅ Установить социальные сети</li>
                    <li>✅ Настроить whitelist адреса</li>
                </ul>
            </div>
        </div>

        <button onclick="closeModal()" class="close-button">✖</button>
    `;
    
    overlay.style.display = 'block';
}

async function verifyContract(tokenAddress) {
    try {
        const button = event.target;
        button.disabled = true;
        button.innerHTML = '⏳ Верификация...';
        
        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                address: tokenAddress,
                network: 'bsc-testnet' // или 'bsc' для mainnet
            })
        });
        
        if (response.ok) {
            button.innerHTML = '✅ Верифицировано!';
            // Добавляем ссылку на BSCScan
            const bscscanLink = document.createElement('a');
            bscscanLink.href = `https://testnet.bscscan.com/address/${tokenAddress}#code`;
            bscscanLink.target = '_blank';
            bscscanLink.textContent = 'Открыть на BSCScan';
            button.parentNode.appendChild(bscscanLink);
        } else {
            throw new Error('Ошибка верификации');
        }
    } catch (error) {
        button.innerHTML = '❌ Ошибка';
        button.disabled = false;
        console.error('Verification error:', error);
    }
}

function closeModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

// Инициализация при загрузке страницы
window.addEventListener('load', initWeb3);