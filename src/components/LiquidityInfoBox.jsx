import React,{ useMemo, useEffect, useState} from 'react';
import {Stack, Box,  Typography, Grid} from '@material-ui/core';
import {useAtom} from 'jotai'
import { useAtomValue } from 'jotai/utils'
import { token0Atom, token1Atom,  ethPriceAtom, token1PriceAtom,token0PriceAtom, selectedPositionAtom, getLiquidityForAmountsVariant, convertToTokenInfo} from '../store/index' // Removed getPoolDayData
import {FiberManualRecord} from '@material-ui/icons'
// import {GraphQLClient} from "graphql-request"; // Not needed if not fetching
import {withStyles} from '@material-ui/core/styles';
import {computePoolAddress, FACTORY_ADDRESS,FeeAmount} from '@uniswap/v3-sdk'
import dayjs from 'dayjs'


const formatter = new Intl.NumberFormat('en-GB', { maximumSignificantDigits: 4 })
const formatter3 = new Intl.NumberFormat('en-GB', { maximumSignificantDigits: 3 })

const green = "#27AE60"
// const clientV3 = new GraphQLClient('https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-alt'); // Remove client

const LiquidityInfoBox = React.memo(() =>{
  const [poolData, setPoolData] = useState(null); // Initialize with null
  const [fees0, setFees0] = useState(null);
  const [fees1, setFees1] = useState(null);
  const [isPoolExisted, setIsPoolExisted] = useState(false); // Default to false

  const token0Info = useAtomValue(token0Atom)
  const token1Info = useAtomValue(token1Atom)
  const token0 = convertToTokenInfo(token0Info) // Ensure these are Token instances for SDK functions
  const token1 = convertToTokenInfo(token1Info)

  const token1Price = useAtomValue(token1PriceAtom)
  const token0Price = useAtomValue(token0PriceAtom)
  const ethPrice = useAtomValue(ethPriceAtom)
  const {tickLower: m , tickUpper:M, depositValue, feeAmount} = useAtomValue(selectedPositionAtom)
  const depositAmount = depositValue / ethPrice / token1Price
  const meanDecimals = (token0.decimals + token1.decimals)/2

  const efficancy =useMemo(()=> (1 < m || M <1) ? 0 : 2/(2 - Math.sqrt(m)- 1 / Math.sqrt(M)), [m,M]) 
  const minEfficancy = useMemo(()=>Math.min(1/(1-(m/M)**(1/4)),4000), [m,M])

  const deposit_ratio = useMemo(()=>{
    if (M <= 1){
      return '0 : 100'
    }else if( m >= 1){
      return '100 : 0'
    }else{
      const x0 = 1 - 1 / Math.sqrt(M)
      const y0 = 1 - Math.sqrt(m)
      if(x0  <= y0){
        const r = Math.round((x0/(x0+y0))*100)
        return  r + ' : ' + (100 - r)
      }else{
        const r = Math.round((y0/(x0+y0))*100)
        return (100-r) + ' : ' + r
      }      
    }
  },[m,M])

  const getAveratePoolData = (poolDataType, window) =>{
    if(!poolData || poolData.length === 0) return 0; // Handle no pool data
    return poolData.slice(1,window+1).reduce((acc,c)=>acc+Number(c[poolDataType]),0)/window
  }

  const aggregatePoolData = async()=>{
    console.warn("aggregatePoolData in LiquidityInfoBox is using dummy data or disabled.");
    setIsPoolExisted(false); // Default to pool not existing
    setPoolData(null);
    setFees0(null);
    setFees1(null);

    // To show dummy data for an "existing" pool, you can uncomment and modify below:
    /*
    const dummyPoolDayDatas = Array(15).fill(null).map((_, i) => ({
      date: dayjs().subtract(i + 1, 'day').unix(), // Ensure dates are in the past
      feeGrowthGlobal0X128: (100000000000000000000000000000000000 + i * 1000000000000000000000).toString(),
      feeGrowthGlobal1X128: (200000000000000000000000000000000000 + i * 2000000000000000000000).toString(),
      tvlUSD: (1000000 - i * 10000).toString(),
      volumeUSD: (100000 - i * 1000).toString(),
      feesUSD: (300 - i * 3).toString(),
    }));
    const formattedData = dummyPoolDayDatas.map(d => ({...d,date: dayjs.unix(d.date).format()}))
    
    if (formattedData && formattedData.length >= 14 && token0 && token1) {
      setIsPoolExisted(true);
      setPoolData(formattedData);
      let liquidity = 0;
      if (token0.sortsBefore(token1)) {
        const p = token0Price / token1Price;
        liquidity = getLiquidityForAmountsVariant(p, m, M, depositValue / ethPrice / token1Price);
        const calculatedFees0 = Object.fromEntries(([3,7,14]).map(i=>([i,(Number(formattedData[0].feeGrowthGlobal0X128)-Number(formattedData[i].feeGrowthGlobal0X128)) * liquidity / (2**128) * 10**(meanDecimals -token0.decimals)])))
        const calculatedFees1 = Object.fromEntries(([3,7,14]).map(i=>([i,(Number(formattedData[0].feeGrowthGlobal1X128)-Number(formattedData[i].feeGrowthGlobal1X128)) * liquidity / (2**128) * 10**(meanDecimals -token1.decimals)])))
        setFees0(calculatedFees0);
        setFees1(calculatedFees1);
      } else {
        const p = token1Price / token0Price;
        liquidity = getLiquidityForAmountsVariant(p, 1/M, 1/m, depositValue / ethPrice / token0Price);
        const calculatedFees1 = Object.fromEntries(([3,7,14]).map(i=>([i,(Number(formattedData[0].feeGrowthGlobal0X128)-Number(formattedData[i].feeGrowthGlobal0X128)) * liquidity / (2**128) * 10**(meanDecimals -token1.decimals)])))
        const calculatedFees0 = Object.fromEntries(([3,7,14]).map(i=>([i,(Number(formattedData[0].feeGrowthGlobal1X128)-Number(formattedData[i].feeGrowthGlobal1X128)) * liquidity / (2**128) * 10**(meanDecimals -token0.decimals)])))   
        setFees0(calculatedFees0);
        setFees1(calculatedFees1);
      }
    }
    */
  }

  useEffect(() => {
    if(token0 != undefined && token1 != undefined){
      aggregatePoolData()
    }
  }, [token0?.address, token1?.address, feeAmount, m, M, depositValue]); // Add token addresses to dependency array
  
  return (
    <Box p={1} sx={{backgroundColor:'#f1f5f9', mx:-2, mb:2, px:1, py:2,mt:3, color:'slategrey'}}>
      <Box>
        <Typography variant='subtitle1' sx={{ml:1,fontWeight:600}}>Position Summary</Typography>
        <Grid container justifyContent="center" alignItems="flex-start">
          <Grid item xs={6}>
            <Box pl={1}>
              <Typography variant='subtitle1' sx={{display:'flex', alignItems: 'center', mt:1, mb:1}}><FiberManualRecord fontSize="small" style={{color: green}}/>V3 Range Position</Typography>
              <Typography variant='caption'>Capital Required</Typography>
              <Typography variant='h5' style={{color:green}}>${formatter.format(depositValue)}</Typography>
              <Typography variant='caption'>Deposit ratio ({token0?.symbol || 'T0'}:{token1?.symbol || 'T1'})</Typography>
              <Typography variant='h5' style={{color:green}}>{deposit_ratio}</Typography>                  
              <Typography variant='caption'>Current fees per $ vs. V2</Typography>
              <Typography variant='h5' style={{color:green}}>{formatter3.format(minEfficancy)}x </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box>
              <Typography variant='subtitle1' sx={{display:'flex', alignItems: 'center', mt:1, mb:1}}><FiberManualRecord fontSize="small" style={{color: 'gray'}}/>V2 Range Position</Typography>
              <Typography variant='caption'>Capital Required</Typography>
              <Typography variant='h5'>${formatter.format(depositValue * efficancy).toLocaleString()}</Typography>
              <Typography variant='caption'>Deposit ratio ({token0?.symbol || 'T0'}:{token1?.symbol || 'T1'})</Typography>
              <Typography variant='h5'>50 : 50</Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
      {
        isPoolExisted && fees0 && fees1 && poolData ? <> {/* Check if data is available */}
          <Box pt={2}>
            <Typography variant='subtitle1' sx={{ml:1,fontWeight:600}}>Estimated Fee</Typography>
            <Typography variant='body2' sx={{ml:1}}>(The same liquidity was provided / Price was always in LP Range)</Typography>
            <Grid container justifyContent="center" alignItems="flex-start">
              <Grid item xs={6}>
                <Box pl={1}>
                  <Typography variant='caption'>{token0.symbol} fees (7Day)</Typography>
                  <Typography variant='h5'>{formatter.format(fees0[7])} {token0.symbol}</Typography> 
                  <Typography variant='caption'>{token1.symbol} fees (7Day)</Typography>
                  <Typography variant='h5'>{formatter.format(fees1[7])} {token1.symbol}</Typography>    
                  <Typography variant='caption'>APY (Avg. 7Day)</Typography>
                  <Typography variant='h5'>{formatter.format((fees1[7] + fees0[7] * token0Price / token1Price)/depositAmount/7*365*100)} %</Typography>                           
                </Box> 
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant='caption'>{token0.symbol} fees (14Day)</Typography>
                  <Typography variant='h5'>{formatter.format(fees0[14])} {token0.symbol}</Typography> 
                  <Typography variant='caption'>{token1.symbol} fees (14Day)</Typography>
                  <Typography variant='h5'>{formatter.format(fees1[14])} {token1.symbol}</Typography>    
                  <Typography variant='caption'>APY (Avg. 14Day)</Typography>
                  <Typography variant='h5'>{formatter.format((fees1[14] + fees0[14] * token0Price / token1Price)/depositAmount/14*365*100)} %</Typography>              
                </Box> 
              </Grid>          
            </Grid>
          </Box>      
          <Box pt={2}>
            <Typography variant='subtitle1' sx={{ml:1,fontWeight:600}}>Pool Info</Typography>
            <Grid container justifyContent="center" alignItems="flex-start">
              <Grid item xs={6}>
                <Box pl={1}>
                  <Typography variant='caption'>TVL/day (Avg. 7Day)</Typography>
                  <Typography variant='h5'>$ {formatter.format(getAveratePoolData('tvlUSD',7))}</Typography> 
                  <Typography variant='caption'>Volume/day (Avg. 7Day)</Typography>
                  <Typography variant='h5'>$ {formatter.format(getAveratePoolData('volumeUSD',7))}</Typography> 
                  <Typography variant='caption'>Fees/day (Avg. 7Day)</Typography>
                  <Typography variant='h5'>$ {formatter.format(getAveratePoolData('feesUSD',7))}</Typography>                        
                </Box> 
              </Grid>
              <Grid item xs={6}>
                <Box>
                <Typography variant='caption'>TVL/day (Avg. 14Day)</Typography>
                  <Typography variant='h5'>$ {formatter.format(getAveratePoolData('tvlUSD',14))}</Typography> 
                  <Typography variant='caption'>Volume/day (Avg. 14Day)</Typography>
                  <Typography variant='h5'>$ {formatter.format(getAveratePoolData('volumeUSD',14))}</Typography> 
                  <Typography variant='caption'>Fees/day (Avg. 14Day)</Typography>
                  <Typography variant='h5'>$ {formatter.format(getAveratePoolData('feesUSD',14))}</Typography>                            
                </Box> 
              </Grid>          
            </Grid>
          </Box>               
        </>: <>
          <Box pt={2}>
            <Typography variant='subtitle1' sx={{ml:1,fontWeight:600}}>Estimated Fee & Pool Info</Typography>
            <Box width='100%' display='flex' justifyContent='center'>
              <Typography variant='subtitle1' sx={{ml:1, py: 2}}>Real-time pool data fetching is disabled or pool does not exist.</Typography>
            </Box>
          </Box>
        </>
      }      
    </Box>
  )
})

export default LiquidityInfoBox