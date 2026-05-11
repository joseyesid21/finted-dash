import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const PortfolioContext = createContext(null);

const INITIAL_PORTFOLIOS = [
    { id: 1, name: 'Acciones', initialCapital: 0, assets: [], transactions: [], closedTrades: [], buyHistory: [] },
    { id: 2, name: 'Préstamos', initialCapital: 0, assets: [], transactions: [], closedTrades: [], buyHistory: [] },
    { id: 3, name: 'Cryptos', initialCapital: 0, assets: [], transactions: [], closedTrades: [], buyHistory: [] },
    { id: 4, name: 'Renta Fija', initialCapital: 0, assets: [], transactions: [], closedTrades: [], buyHistory: [] },
    { id: 5, name: 'Trading Manual', initialCapital: 0, assets: [], transactions: [], closedTrades: [], buyHistory: [] },
    { id: 6, name: 'Trading Algorítmico', initialCapital: 0, assets: [], transactions: [], closedTrades: [], buyHistory: [] },
];

export function PortfolioProvider({ children, trm }) {
    const [portfolios, setPortfolios] = useState(INITIAL_PORTFOLIOS);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState(null);

    const selectedPortfolio = useMemo(
        () => portfolios.find(p => p.id === selectedPortfolioId) || null,
        [portfolios, selectedPortfolioId]
    );

    // =============================================
    // GLOBAL CALCULATIONS
    // =============================================
    const totalCapital = useMemo(() => portfolios.reduce((sum, p) => {
        const isCop = p.id === 2;
        const netTrans = (p.transactions || []).reduce((s, t) => {
            const amt = parseFloat(t.amount) || 0;
            const com = parseFloat(t.commission) || 0;
            return s + (t.type === 'deposit' ? amt - com : -amt - com);
        }, 0);
        const realizedPnL = (p.closedTrades || []).reduce((s, t) => s + (t.realizedPnL || 0), 0);
        const realizedPnLUSD = isCop ? realizedPnL / trm : realizedPnL;
        return sum + p.initialCapital + netTrans + realizedPnLUSD;
    }, 0), [portfolios, trm]);

    const allocationData = useMemo(() => portfolios.map(p => {
        const isCop = p.id === 2;
        const netTrans = (p.transactions || []).reduce((s, t) => {
            const amt = parseFloat(t.amount) || 0;
            const com = parseFloat(t.commission) || 0;
            return s + (t.type === 'deposit' ? amt - com : -amt - com);
        }, 0);
        const realizedPnL = (p.closedTrades || []).reduce((s, t) => s + (t.realizedPnL || 0), 0);
        const realizedPnLUSD = isCop ? realizedPnL / trm : realizedPnL;
        const pTotal = p.initialCapital + netTrans + realizedPnLUSD;
        return {
            name: p.name,
            value: totalCapital > 0 ? parseFloat(((pTotal / totalCapital) * 100).toFixed(1)) : 0
        };
    }).filter(p => p.value > 0), [portfolios, trm, totalCapital]);

    // =============================================
    // PORTFOLIO-LEVEL CALCULATIONS
    // =============================================
    const isCopPortfolio = selectedPortfolioId === 2;

    const portfolioCalcs = useMemo(() => {
        if (!selectedPortfolio) return {
            netTransactions: 0, totalFundedUSD: 0, totalFundedBase: 0,
            totalRealizedPnL: 0, investedCapital: 0, availableCapital: 0,
            totalCommissionsUSD: 0, totalCommissions: 0
        };

        const netTransactions = (selectedPortfolio.transactions || []).reduce((s, t) => {
            const amt = parseFloat(t.amount) || 0;
            const com = parseFloat(t.commission) || 0;
            return s + (t.type === 'deposit' ? amt - com : -amt - com);
        }, 0);

        const totalFundedUSD = selectedPortfolio.initialCapital + netTransactions;
        const totalFundedBase = isCopPortfolio ? totalFundedUSD * trm : totalFundedUSD;
        const totalRealizedPnL = (selectedPortfolio.closedTrades || []).reduce((s, t) => s + (t.realizedPnL || 0), 0);
        const investedCapital = selectedPortfolio.assets.reduce((sum, a) => sum + a.totalValue, 0);
        const availableCapital = totalFundedBase + totalRealizedPnL - investedCapital;
        const totalCommissionsUSD = (selectedPortfolio.transactions || []).reduce((s, t) => s + (parseFloat(t.commission) || 0), 0);
        const totalCommissions = isCopPortfolio ? totalCommissionsUSD * trm : totalCommissionsUSD;

        return {
            netTransactions, totalFundedUSD, totalFundedBase,
            totalRealizedPnL, investedCapital, availableCapital,
            totalCommissionsUSD, totalCommissions
        };
    }, [selectedPortfolio, isCopPortfolio, trm]);

    // =============================================
    // HANDLERS: Initial Capital
    // =============================================
    const handleInitialCapitalChange = useCallback((portfolioId, value) => {
        const numValue = parseFloat(value) || 0;
        setPortfolios(prev => prev.map(p => p.id === portfolioId ? { ...p, initialCapital: numValue } : p));
    }, []);

    // =============================================
    // HANDLERS: Cash Transactions
    // =============================================
    const saveTransaction = useCallback((transactionRecord, editingId) => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                if (editingId) {
                    return { ...p, transactions: p.transactions.map(t => t.id === editingId ? transactionRecord : t) };
                } else {
                    return { ...p, transactions: [...(p.transactions || []), transactionRecord] };
                }
            }
            return p;
        }));
    }, [selectedPortfolioId]);

    const deleteTransaction = useCallback((transactionId) => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                return { ...p, transactions: p.transactions.filter(t => t.id !== transactionId) };
            }
            return p;
        }));
    }, [selectedPortfolioId]);

    const clearTransactionHistory = useCallback(() => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                return { ...p, transactions: [] };
            }
            return p;
        }));
    }, [selectedPortfolioId]);

    // =============================================
    // HANDLERS: Assets (Buy / Edit)
    // =============================================
    const saveAsset = useCallback((assetRecord, editingAssetId) => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                if (editingAssetId) {
                    return { ...p, assets: p.assets.map(a => a.id === editingAssetId ? assetRecord : a) };
                } else {
                    const newBuyHistoryRecord = { ...assetRecord, id: Date.now() + Math.random() };
                    const newBuyHistory = [...(p.buyHistory || []), newBuyHistoryRecord];

                    const existingAssetIndex = p.assets.findIndex(a => a.ticker === assetRecord.ticker);
                    if (existingAssetIndex >= 0) {
                        const existingAsset = p.assets[existingAssetIndex];
                        const totalQty = existingAsset.quantity + assetRecord.quantity;
                        const avgPrice = ((existingAsset.quantity * existingAsset.buyPrice) + (assetRecord.quantity * assetRecord.buyPrice)) / totalQty;

                        const updatedAssets = [...p.assets];
                        updatedAssets[existingAssetIndex] = {
                            ...existingAsset,
                            quantity: totalQty,
                            buyPrice: avgPrice,
                            totalValue: totalQty * avgPrice,
                            date: assetRecord.date
                        };
                        return { ...p, assets: updatedAssets, buyHistory: newBuyHistory };
                    } else {
                        return { ...p, assets: [...p.assets, assetRecord], buyHistory: newBuyHistory };
                    }
                }
            }
            return p;
        }));
    }, [selectedPortfolioId]);

    const deleteAsset = useCallback((assetId) => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                return { ...p, assets: p.assets.filter(a => a.id !== assetId) };
            }
            return p;
        }));
    }, [selectedPortfolioId]);

    // =============================================
    // HANDLERS: Sell Asset
    // =============================================
    const sellAsset = useCallback((sellData) => {
        const sellQty = parseFloat(sellData.quantity);
        const sellPr = parseFloat(sellData.sellPrice);
        if (sellQty <= 0 || sellPr <= 0) return;

        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                const asset = p.assets.find(a => a.id === sellData.assetId);
                if (!asset) return p;

                const actualSellQty = Math.min(sellQty, asset.quantity);
                const realizedPnL = (sellPr - asset.buyPrice) * actualSellQty;

                const newTrade = {
                    id: Date.now(),
                    assetId: asset.id,
                    ticker: asset.ticker,
                    name: asset.name,
                    sellQuantity: actualSellQty,
                    sellPrice: sellPr,
                    buyPrice: asset.buyPrice,
                    realizedPnL,
                    date: sellData.date
                };

                let updatedAssets = p.assets.map(a => {
                    if (a.id === asset.id) {
                        const remQty = a.quantity - actualSellQty;
                        return { ...a, quantity: remQty, totalValue: remQty * a.buyPrice };
                    }
                    return a;
                });
                updatedAssets = updatedAssets.filter(a => a.quantity > 0);

                return { ...p, assets: updatedAssets, closedTrades: [...(p.closedTrades || []), newTrade] };
            }
            return p;
        }));
    }, [selectedPortfolioId]);

    // =============================================
    // HANDLERS: Closed Trades
    // =============================================
    const saveClosedTradeEdit = useCallback((editData) => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                return {
                    ...p,
                    closedTrades: p.closedTrades.map(t => {
                        if (t.id === editData.id) {
                            const newQty = parseFloat(editData.sellQuantity);
                            const newSell = parseFloat(editData.sellPrice);
                            const newBuy = parseFloat(editData.buyPrice);
                            return {
                                ...t,
                                ticker: editData.ticker.toUpperCase(),
                                sellQuantity: newQty, buyPrice: newBuy, sellPrice: newSell,
                                date: editData.date,
                                realizedPnL: (newSell - newBuy) * newQty
                            };
                        }
                        return t;
                    })
                };
            }
            return p;
        }));
    }, [selectedPortfolioId]);

    const deleteClosedTrade = useCallback((id) => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                return { ...p, closedTrades: p.closedTrades.filter(t => t.id !== id) };
            }
            return p;
        }));
    }, [selectedPortfolioId]);

    const clearSalesHistory = useCallback(() => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                return { ...p, closedTrades: [] };
            }
            return p;
        }));
    }, [selectedPortfolioId]);

    // =============================================
    // HANDLERS: Buy History
    // =============================================
    const saveBuyHistoryEdit = useCallback((editData) => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                return {
                    ...p,
                    buyHistory: p.buyHistory.map(b => {
                        if (b.id === editData.id) {
                            return {
                                ...b,
                                ticker: editData.ticker.toUpperCase(),
                                name: editData.name || editData.ticker.toUpperCase(),
                                quantity: parseFloat(editData.quantity),
                                buyPrice: parseFloat(editData.buyPrice),
                                date: editData.date
                            };
                        }
                        return b;
                    })
                };
            }
            return p;
        }));
    }, [selectedPortfolioId]);

    const deleteBuyHistory = useCallback((id) => {
        setPortfolios(prev => prev.map(p => {
            if (p.id === selectedPortfolioId) {
                return { ...p, buyHistory: p.buyHistory.filter(b => b.id !== id) };
            }
            return p;
        }));
    }, [selectedPortfolioId]);

    // =============================================
    // CONTEXT VALUE
    // =============================================
    const value = {
        // State
        portfolios,
        selectedPortfolioId,
        selectedPortfolio,
        isCopPortfolio,

        // Setters
        setSelectedPortfolioId,

        // Global calcs
        totalCapital,
        allocationData,

        // Portfolio-level calcs
        ...portfolioCalcs,

        // Actions
        handleInitialCapitalChange,
        saveTransaction,
        deleteTransaction,
        clearTransactionHistory,
        saveAsset,
        deleteAsset,
        sellAsset,
        saveClosedTradeEdit,
        deleteClosedTrade,
        clearSalesHistory,
        saveBuyHistoryEdit,
        deleteBuyHistory,
    };

    return (
        <PortfolioContext.Provider value={value}>
            {children}
        </PortfolioContext.Provider>
    );
}

export function usePortfolio() {
    const context = useContext(PortfolioContext);
    if (!context) {
        throw new Error('usePortfolio must be used within a PortfolioProvider');
    }
    return context;
}
