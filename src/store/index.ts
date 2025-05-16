import { atom, useAtom , Atom, WritableAtom} from 'jotai'
// Remove atomWithQuery as we are removing queries
// import { atomWithQuery } from 'jotai/query' 
import {GraphQLClient} from "graphql-request";
import {atomWithLocalStorage, atomWithLocalStorageAndDefault} from '../utils/jotai_helper'
import {DEFAULT_ACTIVE_LIST_URLS} from '../constants/tokenLists'
import {getTokenList} from '../utils/getTokenLists'
// Remove unused GraphQL documents if client.request is fully removed
// import {listTokens, getPairPrice, getEthPrice,getPoolDayData} from '../docments' 
import { nanoid } from 'nanoid'
import {getAddress} from '@ethersproject/address'
import keyBy from "lodash/keyBy";
import JSBI from 'jsbi'
import { Token } from '@uniswap/sdk-core'
import {ChainId} from '@uniswap/sdk'
import {computePoolAddress, FACTORY_ADDRESS,FeeAmount, tickToPrice, TickMath} from '@uniswap/v3-sdk'

const prefix = 'osushi_2.0.2'

export type LpPosition = {
  id:string;
  type: string;
  name: string;
  depositValue: number;
  tickUpper: number;
  tickLower: number;
  depositPrice: number;
  feeAmount: FeeAmount
}

export type HodlPosition = {
  id: string;
  type: string;
  name: string;
  token0Value: number;
  token1Value: number;
}

export type Position = LpPosition | HodlPosition

export type Strategy = {
  id: string;
  name: string;
  totalDeposit: number;
  positions: {[key:string]: number}
  token0: TokenInfo
  token1: TokenInfo
}

export type Pair = {
  id: string;
  token0: TokenInfo;
  token1: TokenInfo;
}

export class TokenInfo extends Token {
  public readonly logoURI;
  constructor(chainId, address, decimals, symbol, name, logoURI){
    super(chainId, address, decimals, symbol, name)
    this.logoURI = logoURI;
  }
}

const format = (x: number) => Number(x.toPrecision(6))
export const Q128 = JSBI.exponentiate(JSBI.BigInt(2),JSBI.BigInt(128))
export const Q96 = JSBI.exponentiate(JSBI.BigInt(2),JSBI.BigInt(96))
export const Q224 = JSBI.multiply(Q128,Q96)


interface model {id: string}

const selectAtom = <A extends model>(listAtom: Atom<Atom<A>[]>, idAtom: Atom<string>) => {
  return atom(
    (get)=> {
      if(get(idAtom) === null) return null
      const itemAtom  = get(listAtom).find(x=>get(x)?.id === get(idAtom)) as Atom<A>
      return  get(itemAtom)
    },
    (get,set,update: A) =>{
      const itemAtom  = get(listAtom).find(x=>get(x)?.id === get(idAtom))  as WritableAtom<A,A>
      set(itemAtom, update)
    }    
  )
}

export const convertToTokenInfo = token => new TokenInfo(ChainId.MAINNET,token.address, token.decimals,token.symbol,token.name,token.logoURI)


export const ETH = new TokenInfo(ChainId.MAINNET, "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",18,"ETH","Ether", "https://assets.coingecko.com/coins/images/2518/thumb/weth.png?1547036627")
export const USDC = new TokenInfo(ChainId.MAINNET,  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 6, "USDC", "USD Coin", "https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png?1547042389")
// Define WBTC for dummy data
export const WBTC = new TokenInfo(ChainId.MAINNET, "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", 8, "WBTC", "Wrapped BTC", "https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png?1548822744");


// Remove GraphQL client if no longer used directly here
// const client = new GraphQLClient("https://api.thegraph.com/subgraphs/name/ianlapham/uniswapv2")
// const clientV3 = new GraphQLClient('https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-alt')

export const accountAtom = atomWithLocalStorage(prefix+'account',null)
export const accountsAtom = atomWithLocalStorage(prefix+'accounts',[])
export const poolAtom = atomWithLocalStorage(prefix+'pool',null)

// --- DUMMY DATA MODIFICATIONS START ---

// Use dummy ETH price
export const ethPriceAtom = atom(2000);

// Dummy data for top coins, matching expected structure for currentPricesAtom and activeTokenListsAtom
const dummyTopCoinListData = [
  {
    id: ETH.address,
    symbol: ETH.symbol,
    name: ETH.name,
    decimals: ETH.decimals.toString(),
    derivedETH: '1', // ETH relative to ETH is 1
    tradeVolumeUSD: '1000000000',
    totalLiquidity: '100000000',
    logoURI: ETH.logoURI,
    totalSupply: '100000000000000000000000000',
    tradeVolume: '500000',
    txCount: '10000',
    tokenDayData: [], pairDayDataBase: [], pairDayDataQuote: [], pairBase: [], pairQuote: [], untrackedVolumeUSD: '0',
  },
  {
    id: USDC.address,
    symbol: USDC.symbol,
    name: USDC.name,
    decimals: USDC.decimals.toString(),
    derivedETH: (1 / 2000).toString(), // USDC is 1 USD, ETH is 2000 USD
    tradeVolumeUSD: '500000000',
    totalLiquidity: '50000000',
    logoURI: USDC.logoURI,
    totalSupply: '500000000000000',
    tradeVolume: '250000',
    txCount: '5000',
    tokenDayData: [], pairDayDataBase: [], pairDayDataQuote: [], pairBase: [], pairQuote: [], untrackedVolumeUSD: '0',
  },
  {
    id: WBTC.address,
    symbol: WBTC.symbol,
    name: WBTC.name,
    decimals: WBTC.decimals.toString(),
    derivedETH: (100000 / 2000).toString(), // BTC is 100000 USD, ETH is 2000 USD
    tradeVolumeUSD: '2000000000',
    totalLiquidity: '200000000',
    logoURI: WBTC.logoURI,
    totalSupply: '20000000000000',
    tradeVolume: '20000',
    txCount: '8000',
    tokenDayData: [], pairDayDataBase: [], pairDayDataQuote: [], pairBase: [], pairQuote: [], untrackedVolumeUSD: '0',
  }
];

export const topCoinListsAtom = atom(dummyTopCoinListData);

// Dummy data for allTokenListAtom (used for token selection UI)
// This should be an array of TokenInfo-like objects as expected by getTokenList consumers
const dummyAllTokenListData = [
  { chainId: ETH.chainId, address: ETH.address, name: ETH.name, decimals: ETH.decimals, symbol: ETH.symbol, logoURI: ETH.logoURI },
  { chainId: USDC.chainId, address: USDC.address, name: USDC.name, decimals: USDC.decimals, symbol: USDC.symbol, logoURI: USDC.logoURI },
  { chainId: WBTC.chainId, address: WBTC.address, name: WBTC.name, decimals: WBTC.decimals, symbol: WBTC.symbol, logoURI: WBTC.logoURI },
];

export const allTokenListAtom = atom(dummyAllTokenListData);


// activeTokenListsAtom will now use the dummy atoms above
export const activeTokenListsAtom = atom((get) => {
    // Simpler derivation if atomWithQuery is removed
    const tokenAddressMap = Object.fromEntries(get(allTokenListAtom).flat().map(token => [token.address, token]));
    const res = Object.fromEntries(
      get(topCoinListsAtom)
        .filter(tokenFromTopList => tokenAddressMap[tokenFromTopList.id]?.address) // Ensure token exists in our allTokenListAtom
        .map(tokenFromTopList => {
          // Use the more complete info from allTokenListAtom for constructing TokenInfo
          const fullTokenInfo = tokenAddressMap[tokenFromTopList.id];
          const tokenInfoInstance = convertToTokenInfo(fullTokenInfo);
          return [tokenInfoInstance.address, tokenInfoInstance];
        })
    );
    res[ETH.address] = ETH; // Ensure ETH is present
    res[USDC.address] = USDC; // Ensure USDC is present
    res[WBTC.address] = WBTC; // Ensure WBTC is present
    return res;
});

// currentPricesAtom should work correctly with the dummy topCoinListsAtom
export const currentPricesAtom = atom((get) =>{
  return Object.fromEntries(get(topCoinListsAtom).map(token => [getAddress(token.id), token.derivedETH]))
});


// --- DUMMY DATA MODIFICATIONS END ---


// export const selectedPairIdAtom = atomWithLocalStorage<string>(prefix+'selectedPairId', "ETH-USDC")
export const selectedPositionIdAtom = atomWithLocalStorage<string>(prefix+'selectedPositionId',null)
export const selectedStrategyIdAtom = atomWithLocalStorage<string>(prefix+'selectedStrategyId',null)

export const defaultLpPosition = atomWithLocalStorage(prefix+'firstPositionLpId',{
    id: `${prefix}firstPositionLpId`,
    type: 'uniswap_v3_lp',
    name: 'Moderate Range',
    depositValue : 100000,
    tickUpper: 2.5,
    tickLower: 0.4,
    feeAmount: FeeAmount.MEDIUM
  }
)
export const defaultHodlPosition1 = atomWithLocalStorage<HodlPosition>(prefix+'firstPositionHodlId',{
    id: `${prefix}firstPositionHodlId`,
    type: 'hodl',
    name: '100:0 HODL',
    token0Value: 100000,
    token1Value: 0,
  }
)
export const defaultHodlPosition2 = atomWithLocalStorage<HodlPosition>(prefix+'secondPositionHodlId',{
    id: `${prefix}secondPositionHodlId`,
    type: 'hodl',
    name: '50:50 HODL',
    token0Value: 50000,
    token1Value: 50000,
  }
)

export const positionsAtom = atomWithLocalStorage<Atom<LpPosition | HodlPosition>[]>(prefix+'positions_atom',[defaultLpPosition,defaultHodlPosition1,defaultHodlPosition2])

export const createNewLpPositionAtom = atom(null,
  (get,set) =>{
    const id = prefix+nanoid()
    set(positionsAtom,([
      ...get(positionsAtom), atomWithLocalStorage<LpPosition>(id, {
        id, 
        name: `Position ${get(positionsAtom).length+1}`,
        type: 'uniswap_v3_lp',
        depositValue : 100000,
        tickUpper: 2.5,
        tickLower: 0.4, 
        feeAmount: FeeAmount.MEDIUM
      })
    ]));
    const prevStrategy = get(selectedStrategyAtom)
    const newStrategy = {...prevStrategy}
    newStrategy.positions[id] = 1
    set(selectedStrategyAtom, newStrategy)
    set(selectedPositionIdAtom, id)
  }
)
export const createNewHodlPositionAtom = atom(null,
  (get,set) =>{
    const id = prefix+nanoid()
    set(positionsAtom,[
      ...get(positionsAtom), atomWithLocalStorage<HodlPosition>(id, {
        id,    
        name: `Position ${get(positionsAtom).length+1}`,
        type: 'hodl',
        token0Value: 50000,
        token1Value: 50000
      })
    ]);
    const prevStrategy = get(selectedStrategyAtom)
    const newStrategy = {...prevStrategy}
    newStrategy.positions[id] = 1
    set(selectedStrategyAtom, newStrategy)
    set(selectedPositionIdAtom, id)
  }
)  
export const createNewStrategyAtom = atom(null,
  (get,set) => {
    const id = prefix+nanoid();
    const name = `Strategy ${get(strategiesAtom).length+1}`

    set(strategiesAtom, [
      ...get(strategiesAtom), atomWithLocalStorage<Strategy>(id,{
        id,
        name,
        totalDeposit:null,
        positions:{},
        token0: ETH,
        token1: USDC
      })
    ]);
    set(selectedStrategyIdAtom, id);
  }
)
export const deletePositionAtom = atom(null,
  (get,set, id:string) => {
    set(positionsAtom, get(positionsAtom).filter(position => get(position).id != id))

    get(strategiesAtom).forEach(strategyAtom =>{
      const prev = get(strategyAtom)
      if(id in prev.positions){
        const {[id]: _ , ...positions} = prev.positions
        set(selectAtom(strategiesAtom, atom(prev.id)), {...prev, positions})
      }
    })

    set(selectedPositionIdAtom, null)
  }
)
export const deletePositionFromStrategyAtom = atom(null,
  (get,set,id : string) => {
    const prev = get(selectedStrategyAtom)
    const {[id]: _ ,...positions} = prev.positions
    set(selectedStrategyAtom, {...prev, positions })
  }
)
export const deleteStrategyAtom = atom(null,
  (get,set,id:string) => {
    const selectedStrategyPositionIds = Object.keys(get(selectedStrategyAtom).positions)
    set(positionsAtom, get(positionsAtom).filter(positionAtom => !selectedStrategyPositionIds.includes(get(positionAtom).id)))
    set(strategiesAtom, get(strategiesAtom).filter(strategyAtom => get(strategyAtom).id != id ))
    set(selectedStrategyIdAtom, null)
  }
)

export const defaultStrategy1 = atomWithLocalStorage<Strategy>(prefix+'defaultStrategy1',
  {
    id: `${prefix}defaultStrategy1`,
    name: 'Moderate Range Strategy',
    totalDeposit: null,
    positions: { 
      [prefix+'firstPositionLpId']: 1
    },
    token0: ETH,
    token1: USDC,
  },
)
export const defaultStrategy2 = atomWithLocalStorage<Strategy>(prefix+'defaultStrategy2',
  {
    id: `${prefix}defaultStrategy2`,
    name: '50:50 HODL Strategy',
    totalDeposit: null,
    positions: { 
      [prefix+'secondPositionHodlId']: 1
    },
    token0: ETH,
    token1: USDC,
  },
)
export const defaultStrategy3 = atomWithLocalStorage<Strategy>(prefix+'defaultStrategy3',
  {
    id: `${prefix}defaultStrategy3`,
    name: '100:0 HODL Strategy',
    totalDeposit: null,
    positions: { 
      [prefix+'firstPositionHodlId']: 1
    },
    token0: ETH,
    token1: USDC,
  },
)
export const strategiesAtom = atomWithLocalStorage<Atom<Strategy>[]>(prefix+'strategiesAtom',[defaultStrategy1,defaultStrategy2,defaultStrategy3])
export const strategiesReadOnlyAtom = atom(get => {
  const positions = get(positionsAtom).map(position => get(position))
  return get(strategiesAtom).map(strategyAtom => {
    const strategy = get(strategyAtom)
    return {id:strategy.id, name: strategy.name,token0:strategy.token0,token1:strategy.token1, positions: Object.entries(strategy.positions).map(([id,ratio]) => ({ratio, ...positions.find(pos => pos.id === id)}))}
  })
})

export const selectedStrategyPositionsAtom = atom((get)=> {
  const selectedStrategy = get(selectedStrategyAtom);
  if (!selectedStrategy) return []; // Handle case where no strategy is selected
  const selectedStrategyPositionIds = Object.keys(selectedStrategy.positions)
  return  get(positionsAtom).filter(positionAtom => selectedStrategyPositionIds.includes(get(positionAtom).id))
})

export const selectedPositionAtom = selectAtom<LpPosition | HodlPosition>(positionsAtom, selectedPositionIdAtom)
export const selectedStrategyAtom = selectAtom<Strategy>(strategiesAtom, selectedStrategyIdAtom)

export const token0Atom = atom((get)=>{
  const strategy = get(selectedStrategyAtom);
  return strategy ? strategy.token0 : ETH; // Fallback if no strategy selected
})
export const token1Atom = atom((get)=>{
  const strategy = get(selectedStrategyAtom);
  return strategy ? strategy.token1 : USDC; // Fallback
})


export const priceV2Atom = atom<number>((get)=>{
  const currentPricesMap = get(currentPricesAtom)
  const t0 = get(token0Atom)
  const t1 = get(token1Atom)
  if (currentPricesMap && t0 && t1 && currentPricesMap[t0.address] && currentPricesMap[t1.address]) {
    return currentPricesMap[t0.address]/currentPricesMap[t1.address]
  }
  return 1; // Fallback price
})

export const token0PriceAtom = atom<number>((get)=>{
  const currentPricesMap = get(currentPricesAtom)
  const t0 = get(token0Atom)
  if (currentPricesMap && t0 && currentPricesMap[t0.address]) {
    return currentPricesMap[t0.address]
  }
  return 1; // Fallback price
})

export const token1PriceAtom = atom<number>((get)=>{
  const currentPricesMap = get(currentPricesAtom)
  const t1 = get(token1Atom)
  if (currentPricesMap && t1 && currentPricesMap[t1.address]) {
    return currentPricesMap[t1.address]
  }
  return 1/2000; // Fallback price for USDC relative to ETH if ETH is 1
})

export const getTokenEthPriceAtom = (token:TokenInfo) => atom<number>((get)=> {
  const currentPricesMap = get(currentPricesAtom);
  return (currentPricesMap && token && currentPricesMap[token.address]) ? currentPricesMap[token.address] : 0;
})
export const getTokenPriceAtom = (token:TokenInfo) => atom<number>((get)=> {
  const ethP = get(ethPriceAtom);
  const tokenEthP = get(getTokenEthPriceAtom(token));
  return tokenEthP * ethP;
})


export const slideDirectionAtom = atomWithLocalStorage(prefix+'slideDirection','right')

const PRICE_FIXED_DIGITS = 4
const DEFAULT_SURROUNDING_TICKS = 300
const FEE_TIER_TO_TICK_SPACING = (feeTier: string): number => {
  switch (feeTier) {
    case '10000':
      return 200
    case '3000':
      return 60
    case '500':
      return 10
    default:
      // throw Error(`Tick spacing for fee tier ${feeTier} undefined.`)
      console.warn(`Tick spacing for fee tier ${feeTier} undefined, defaulting to 60 (0.3%)`)
      return 60; 
  }
}

interface TickPool {
  tick: string
  feeTier: string
  token0: {
    symbol: string
    id: string
    decimals: string
  }
  token1: {
    symbol: string
    id: string
    decimals: string
  }
  sqrtPrice: string
  liquidity: string
}

interface Tick {
  tickIdx: string
  liquidityGross: string
  liquidityNet: string
  price0: string
  price1: string
}

export interface TickProcessed {
  liquidityGross: JSBI
  liquidityNet: JSBI
  tickIdx: number
  liquidityActive: JSBI
  price0: string
  price1: string
}

// Dummy fetchInitializedTicks as it's complex and relies on TheGraph
const fetchInitializedTicks = async (
  poolAddress: string,
  tickIdxLowerBound: number,
  tickIdxUpperBound: number
): Promise<Tick[]> => {
  console.warn("fetchInitializedTicks is using dummy data (empty array).");
  return []; // Return empty array to simulate no ticks or disable this feature part
}

export interface PoolTickData {
  ticksProcessed: TickProcessed[]
  feeTier: string
  tickSpacing: number
  activeTickIdx: number
}

// Dummy fetchTicksSurroundingPrice
export const fetchTicksSurroundingPrice = async (
  poolAddress: string,
  numSurroundingTicks = DEFAULT_SURROUNDING_TICKS
): Promise<{ data: PoolTickData | null, error?: string }> => {
  console.warn("fetchTicksSurroundingPrice is using dummy data.");
  // Provide a minimal valid structure for PoolTickData or null
  return {
    data: {
      ticksProcessed: [],
      feeTier: FeeAmount.MEDIUM.toString(), // Default fee tier as string
      tickSpacing: FEE_TIER_TO_TICK_SPACING(FeeAmount.MEDIUM.toString()),
      activeTickIdx: 0,
    },
  };
}


export const getLiquidityForAmountsVariant = (p0,m,M,w0)=>{
  const sqrt_p0 = Math.sqrt(p0);
  const sqrt_m = Math.sqrt(m);
  const sqrt_M = Math.sqrt(M);
  if(1<=m){
    return w0/sqrt_p0 * sqrt_m * sqrt_M / (sqrt_M-sqrt_m) 
  }else if(M<=1){
    return w0/sqrt_p0/(sqrt_M-sqrt_m)
  }else{
    return w0/sqrt_p0/(2-sqrt_m-1/sqrt_M) 
  }
}

export const getLiquidityForAmountsOriginal = (sqrtP0, sqrtPa, sqrtPb,amount0,amount1) =>{
  const w0 = amount1 + amount0 * sqrtP0 * sqrtP0;
  if(sqrtP0 <= sqrtPa){
    return w0 / sqrtP0 /sqrtP0 * sqrtPa * sqrtPb/(sqrtPb-sqrtPa)
  }else if(sqrtPb <= sqrtP0 ){
    return w0/(sqrtPb-sqrtPa)
  }else{
    return w0/(2*sqrtP0 -sqrtPa - sqrtP0*sqrtP0/sqrtPb)
  }
}