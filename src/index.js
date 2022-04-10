const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
//contract info
const contractAddress = "0x0A5A090431C493B924cb3264167a98885B415F4C";
const contract = require("../contract/MY-NFT.json");
const forwarderOrigin = 'http://localhost:9010'
const alchemyHttpApi = 'https://eth-mainnet.alchemyapi.io/v2/_LdmO5wsVBL5ETQlVRE8BgqWeXMNP7FG';
const targetChainId = '0x3';

// Dapp Status Section
const networkDiv = document.getElementById('network')
const chainIdDiv = document.getElementById('chainId')
const accountsDiv = document.getElementById('accounts')

//Basic Actions Section
const mintButton = document.getElementById('mintButton');
const onboardButton = document.getElementById('connectButton');
const getAccountsButton = document.getElementById('getAccounts');
const getAccountsResult = document.getElementById('getAccountsResult');
const mintStatus = document.getElementById('mintStatus')

const initialize = () => {
  //We create a new MetaMask onboarding object to use in our app
  const MetaMaskOnboarding = require('@metamask/onboarding').default;
  const onboarding = new MetaMaskOnboarding({ forwarderOrigin });

  console.log("alchemyHttpApi: " + alchemyHttpApi);
  const web3 = createAlchemyWeb3(alchemyHttpApi);
  console.log("合约ABI: " + JSON.stringify(contract.abi));
  //NFT合约
  const nftContract = new web3.eth.Contract(contract.abi, contractAddress);
  //You will start here     

  mintButton.addEventListener('click', async () => {
    await switchEthereumChain();
    //获取当前用户地址
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    const publicAddress = accounts[0];
    console.log("publicAddress: " + publicAddress);
    const nonce = await web3.eth.getTransactionCount(publicAddress, 'latest'); //get latest nonce
    console.log("nonce: " + nonce);
    console.log("nftContract: ", nftContract);
    const transactionParameters = {      
      to: contractAddress, // Required except during contract publications. 
      from: publicAddress, // must match user's active address.
      value: '0x00', // TODO: 这个价格要改一下
      data: nftContract.methods.mint(publicAddress).encodeABI(),
      chainId: targetChainId, // Used to prevent transaction reuse across blockchains. Auto-filled by MetaMask.
    };
    //打印交易参数
    console.log(`Transaction Parameters: ${JSON.stringify(transactionParameters)}`);
    // 直接使用ethereum调用交易    
    const mintResult = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [transactionParameters],
    });
    console.log('Transaction txHash', mintResult);
    mintStatus.innerHTML = mintResult;
  });

  function handleNewChain(chainId) {
    chainIdDiv.innerHTML = chainId
    //如果当前网络ID非目标网络ID，重置按钮
    if (chainId != targetChainId) {
      //If it is installed we change our button text
      onboardButton.innerText = 'Connect';
      getAccountsResult.innerHTML = '';
      //When the button is clicked we call this function to connect the users MetaMask Wallet
      onboardButton.onclick = onClickConnect;
    }
  }

  function handleNewNetwork(networkId) {
    networkDiv.innerHTML = networkId
  }

  function handleNewAccounts(newAccounts) {
    accounts = newAccounts
    accountsDiv.innerHTML = accounts
  }

  async function getNetworkAndChainId() {
    try {
      const chainId = await ethereum.request({
        method: 'eth_chainId',
      })
      handleNewChain(chainId)

      const networkId = await ethereum.request({
        method: 'net_version',
      })
      handleNewNetwork(networkId)
    } catch (err) {
      console.error(err)
    }
  }

  //Created check function to see if the MetaMask extension is installed
  const isMetaMaskInstalled = () => {
    //Have to check the ethereum binding on the window object to see if it's installed
    const { ethereum } = window;
    return Boolean(ethereum && ethereum.isMetaMask);
  };

  //------Inserted Code------\\
  const MetaMaskClientCheck = async () => {
    //Now we check to see if MetaMask is installed
    if (!isMetaMaskInstalled()) {
      //If it isn't installed we ask the user to click to install it
      onboardButton.innerText = 'Click here to install MetaMask!';
      //When the button is clicked we call this function
      onboardButton.onclick = onClickInstall;
      //The button is now disabled
      onboardButton.disabled = false;
    } else {
      ethereum.autoRefreshOnNetworkChange = false

      //If it is installed we change our button text
      onboardButton.innerText = 'Connect';
      //When the button is clicked we call this function to connect the users MetaMask Wallet
      onboardButton.onclick = onClickConnect;
      //The button is now disabled
      onboardButton.disabled = false;

      //获取当前钱包链接网络信息
      getNetworkAndChainId()
      //设置事件
      ethereum.on('chainChanged', handleNewChain)
      ethereum.on('networkChanged', handleNewNetwork)
      ethereum.on('accountsChanged', handleNewAccounts)

      //如果当前以链接钱包，则重置按钮名称为Disconnect(0xxxxx)
      const isConnected = ethereum.isConnected();
      if (!isConnected) {
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        handleNewAccounts(accounts)
        const account = accounts[0].substr(0, 4) + '...' + accounts[0].substr(-4);
        //设置断开钱包操作
        onboardButton.onclick = onClickDisConnect;
        onboardButton.innerText = 'Disconnect(' + account + ')'
        getAccountsResult.innerHTML = account
      }
    }
  };

  //This will start the onboarding proccess
  const onClickInstall = () => {
    onboardButton.innerText = 'Onboarding in progress';
    onboardButton.disabled = true;
    //On this object we have startOnboarding which will start the onboarding process for our end user
    onboarding.startOnboarding();
  };

  //断开钱包操作
  const onClickDisConnect = async () => {
    try {
      //执行断开钱包链接操作      
      // ethereum.on('disconnect', handler: (error: ProviderRpcError) => void);
      ethereum.on('disconnect', (error) => {
        console.log('execute disconnect!, result:' + JSON.stringify(error));
      });
      //判断是否已断开，如果断开则修改按钮样式和事件方法
      const disconnect = ethereum.isConnected();
      if (disconnect) {
        //If it is installed we change our button text
        onboardButton.innerText = 'Connect';
        getAccountsResult.innerHTML = '';
        //When the button is clicked we call this function to connect the users MetaMask Wallet
        onboardButton.onclick = onClickConnect;
      }
    } catch (error) {
      console.error(error);
    }
  };

  async function switchEthereumChain() {
    const chainId = await ethereum.request({
      method: 'eth_chainId',
    })
    //如果不是目标，则请求切换网络
    if (chainId != targetChainId) {
      const switchEthereumChain = await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainId }],
      });
    }
  }

  //链接钱包操作
  const onClickConnect = async () => {
    try {
      switchEthereumChain();
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0].substr(0, 4) + '...' + accounts[0].substr(-4);
      onboardButton.onclick = onClickDisConnect;
      onboardButton.innerText = 'Disconnect(' + account + ')'
      getAccountsResult.innerHTML = account
    } catch (error) {
      console.error(error);
    }
  };

  //Eth_Accounts-getAccountsButton
  getAccountsButton.addEventListener('click', async () => {
    //we use eth_accounts because it returns a list of addresses owned by us.
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    //We take the first address in the array of addresses and display it
    const account = accounts[0].substr(0, 4) + '...' + accounts[0].substr(-4);
    getAccountsResult.innerHTML = account || 'Not able to get accounts';
  });

  MetaMaskClientCheck();
}
window.addEventListener('DOMContentLoaded', initialize)