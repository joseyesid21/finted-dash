import { useState, useEffect } from 'react';

/**
 * Hook to fetch the TRM (Tasa Representativa del Mercado) USD → COP
 * from the Exchange Rate API.
 */
export function useTRM() {
    const [trm, setTrm] = useState(3700.03);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        fetch('https://open.er-api.com/v6/latest/USD')
            .then(res => res.json())
            .then(data => {
                if (data && data.rates && data.rates.COP) {
                    setTrm(data.rates.COP);
                }
            })
            .catch(err => console.error("Error fetching TRM", err))
            .finally(() => setIsLoading(false));
    }, []);

    return { trm, isLoadingTRM: isLoading };
}
