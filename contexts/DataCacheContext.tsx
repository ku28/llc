import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface CacheEntry<T> {
    data: T
    timestamp: number
}

interface DataCacheContextType {
    getCache: <T>(key: string) => T | null
    setCache: <T>(key: string, data: T) => void
    clearCache: (key: string) => void
    clearAllCache: () => void
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined)

export function DataCacheProvider({ children }: { children: ReactNode }) {
    const [cache, setCache] = useState<Map<string, CacheEntry<any>>>(new Map())

    const getCache = useCallback(<T,>(key: string): T | null => {
        const entry = cache.get(key)
        if (!entry) return null
        return entry.data as T
    }, [cache])

    const setCacheData = useCallback(<T,>(key: string, data: T) => {
        setCache(prev => {
            const newCache = new Map(prev)
            newCache.set(key, { data, timestamp: Date.now() })
            return newCache
        })
    }, [])

    const clearCache = useCallback((key: string) => {
        setCache(prev => {
            const newCache = new Map(prev)
            newCache.delete(key)
            return newCache
        })
    }, [])

    const clearAllCache = useCallback(() => {
        setCache(new Map())
    }, [])

    return (
        <DataCacheContext.Provider value={{ getCache, setCache: setCacheData, clearCache, clearAllCache }}>
            {children}
        </DataCacheContext.Provider>
    )
}

export function useDataCache() {
    const context = useContext(DataCacheContext)
    if (!context) {
        throw new Error('useDataCache must be used within DataCacheProvider')
    }
    return context
}
