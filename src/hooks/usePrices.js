import { useState, useCallback } from 'react';

/**
 * Hook to fetch live market prices from Yahoo Finance
 * via allorigins proxy (to bypass CORS).
 */
export function usePrices() {
    const [livePrices, setLivePrices] = useState({});
    const [isFetchingPrices, setIsFetchingPrices] = useState(false);

    const fetchPrices = useCallback(async (assets) => {
        if (!assets || assets.length === 0) return;
        setIsFetchingPrices(true);

        const newPrices = { ...livePrices };
        for (const asset of assets) {
            if (!asset.ticker) continue;
            try {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${asset.ticker}`;
                const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
                if (response.ok) {
                    const data = await response.json();
                    const yfData = JSON.parse(data.contents);
                    if (yfData.chart && yfData.chart.result && yfData.chart.result.length > 0) {
                        newPrices[asset.ticker] = yfData.chart.result[0].meta.regularMarketPrice;
                    }
                }
            } catch (error) {
                console.error("Error fetching price for", asset.ticker, error);
            }
        }
        setLivePrices(newPrices);
        setIsFetchingPrices(false);
    }, [livePrices]);

    return { livePrices, isFetchingPrices, fetchPrices };
}
