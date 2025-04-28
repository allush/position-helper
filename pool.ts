import {Symbiosis, TokenAmount} from "symbiosis-js-sdk";

import { BigNumber } from '@ethersproject/bignumber'
const symbiosis = new Symbiosis('mainnet', 'rootstock');

const LP_HOLDER = '0x...'

const WAD = BigNumber.from(10).pow(18)

async function main() {
    const data = []

    const trackedTokens = symbiosis.tokens()
    for (const poolConfig of symbiosis.config.omniPools) {
        const poolTokens = symbiosis.getOmniPoolTokens(poolConfig)
        for (const token of trackedTokens) {
            const rep = symbiosis.getRepresentation(token, poolConfig.chainId)
            if (!rep) {
                continue
            }
            if (!poolTokens.find((i) => i.equals(rep))) {
                continue
            }
            const index = symbiosis.getOmniPoolTokenIndex(poolConfig, rep)
            const poolContract = symbiosis.omniPool(poolConfig)
            const asset = await poolContract.indexToAsset(index)

            const lpBalance = await poolContract.balanceOf(LP_HOLDER, index)

            if (asset.liability.eq(0) || asset.cash.eq(0)) {
                continue
            }
            const decimals = BigNumber.from(10).pow(token.decimals)
            const share = lpBalance
                .mul(asset.liability)
                .div(asset.totalSupply)
                .mul(decimals)
                .div(WAD)

            const precision = Math.pow(10, 4)

            data.push({
                token,
                tvl: parseFloat(asset.liability.mul(precision).div(WAD).toString()) / precision,
                diff: parseFloat(asset.cash.sub(asset.liability).mul(precision).div(WAD).toString()) / precision,
                percent: asset.liability.eq(0) ? 0 : (parseFloat(asset.cash.mul(10000).div(asset.liability).toString()) / 100 - 100),
                balance: new TokenAmount(rep, share.toString()),
            })
        }
    }

    console.log(data.sort((a, b) => b.balance.greaterThan('0') ? 1 : -1).map((i) => {
        if (!i) {
            return
        }
        return {
            token: `${(i.token.chainFrom || i.token.chain)?.name}.${i.token.symbol}`,
            tvl: `${i.tvl} `,
            diff_abs: `${i.diff}`,
            diff_percent: `${i.percent.toFixed(2)}%`,
            balance: `${i.balance.toSignificant()}`,
        }
    }))
}

main().catch((e) => console.error(e))