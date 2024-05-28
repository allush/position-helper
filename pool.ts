import {ChainId, Symbiosis, Token} from "symbiosis-js-sdk";

const symbiosis = new Symbiosis('mainnet', 'rootstock');

const TRACKED_TOKENS = [
    new Token({
        name: 'Tether USD',
        symbol: 'rUSDT',
        address: '0xef213441a85df4d7acbdae0cf78004e1e486bb96',
        chainId: ChainId.RSK_MAINNET,
        decimals: 18,
        icons: {
            large: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png',
            small: 'https://s2.coinmarketcap.com/static/img/coins/128x128/825.png',
        },
    }),
    new Token({
        name: 'Wrapped RBTC',
        symbol: 'WRBTC',
        address: '0x542fda317318ebf1d3deaf76e0b632741a7e677d',
        chainId: ChainId.RSK_MAINNET,
        decimals: 18,
        icons: {
            large: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
            small: 'https://s2.coinmarketcap.com/static/img/coins/128x128/1.png',
        },
    }),
]

async function main() {
    const promises = symbiosis.config.omniPools.map(async (poolConfig) => {
        const tokens = symbiosis.getOmniPoolTokens(poolConfig)
        const token = TRACKED_TOKENS.find((trackedToken) => {
            const rep = symbiosis.getRepresentation(trackedToken, poolConfig.chainId)
            if (!rep) {
                return false
            }
            return !!tokens.find((i) => i.equals(rep))
        })
        if (!token) {
            return
        }
        const rep = symbiosis.getRepresentation(token, poolConfig.chainId)
        if (!rep) {
            return false
        }
        const index = symbiosis.getOmniPoolTokenIndex(poolConfig, rep)
        const poolContract = symbiosis.omniPool(poolConfig)
        const asset = await poolContract.indexToAsset(index)

        const precision = Math.pow(10, 4)

        return {
            token,
            tvl: parseFloat(asset.liability.mul(precision).div(1e18.toString()).toString()) / precision,
            diff: parseFloat(asset.cash.sub(asset.liability).mul(precision).div(1e18.toString()).toString()) / precision,
            percent: asset.liability.eq(0) ? 0 : (parseFloat(asset.cash.mul(10000).div(asset.liability).toString()) / 100 - 100),
        }
    })

    const results = await Promise.allSettled(promises)

    const data = results.map((item) => {
        if (item.status !== 'fulfilled') {
            return
        }
        return item.value
    }).filter(Boolean)


    console.log(data.map((i) => {
        if (!i) {
            return
        }
        return `TVL=${i.tvl} ${i.token.symbol}, DIFF=${i.diff} ${i.token.symbol} | ${i.percent.toFixed(2)}%`
    }))
}

main().catch((e) => console.error(e))