import {ChainId, Symbiosis, Token, TokenAmount} from "symbiosis-js-sdk";

const symbiosis = new Symbiosis('mainnet', 'rootstock');

const TRACKED_TOKENS = [
    new Token({
        symbol: 'USDC',
        address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        chainId: ChainId.BSC_MAINNET,
        decimals: 18,
    }),
    new Token({
        symbol: 'USDT',
        address: '0xa614f803b6fd780986a42c78ec9c7f77e6ded13c',
        chainId: ChainId.TRON_MAINNET,
        decimals: 6,
    }),
]

const LP_HOLDER = 'paste you address here in hex form'

async function main() {
    const data = []

    for (const poolConfig of symbiosis.config.omniPools) {
        const poolTokens = symbiosis.getOmniPoolTokens(poolConfig)
        for (const token of TRACKED_TOKENS) {
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

            const balance = await poolContract.balanceOf(LP_HOLDER, index)

            const precision = Math.pow(10, 4)

            data.push({
                token,
                tvl: parseFloat(asset.liability.mul(precision).div(1e18.toString()).toString()) / precision,
                diff: parseFloat(asset.cash.sub(asset.liability).mul(precision).div(1e18.toString()).toString()) / precision,
                percent: asset.liability.eq(0) ? 0 : (parseFloat(asset.cash.mul(10000).div(asset.liability).toString()) / 100 - 100),
                balance: new TokenAmount(token, balance.toString()),
            })
        }
    }


    console.log(data.map((i) => {
        if (!i) {
            return
        }
        return {
            tvl: `${i.tvl} ${i.token.symbol}`,
            diff_abs: `${i.diff} ${i.token.symbol}`,
            diff_percent: `${i.percent.toFixed(2)}%`,
            balance: `${i.balance.toSignificant()} ${i.token.symbol}`,
        }
    }))
}

main().catch((e) => console.error(e))