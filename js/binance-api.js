class BinanceWebSocketAPI {
    constructor() {
        this.baseWsUrl = 'wss://stream.binance.com:9443';
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        this.priceCache = new Map();
        this.lastUpdate = 0;
        
        // Маппинг символов игры на пары Binance
        this.symbolMap = {
            'BTC': 'BTCUSDT',
            'ETH': 'ETHUSDT', 
            'ADA': 'ADAUSDT',
            'DOT': 'DOTUSDT'
        };
        
        // Колбэки
        this.onPriceUpdate = null;
        this.onError = null;
        this.onConnectionChange = null;
        
        console.log('🚀 Binance WebSocket API инициализирован');
    }
    
    // Запуск WebSocket подключения
    async start() {
        try {
            console.log('🔌 Подключение к Binance WebSocket...');
            
            await this.connect();
            
        } catch (error) {
            console.error('❌ Ошибка запуска Binance WebSocket API:', error);
            this.onError?.(error);
        }
    }
    
    // Создание WebSocket подключения
    connect() {
        return new Promise((resolve, reject) => {
            // Формируем список стримов для всех монет
            const streams = Object.values(this.symbolMap).map(pair => 
                `${pair.toLowerCase()}@ticker`
            ).join('/');
            
            const wsUrl = `${this.baseWsUrl}/stream?streams=${streams}`;
            
            console.log('📡 Подключение к:', wsUrl);
            
            try {
                this.ws = new WebSocket(wsUrl);
                
                this.ws.onopen = () => {
                    console.log('✅ WebSocket подключен к Binance');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.onConnectionChange?.(true);
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };
                
                this.ws.onerror = (error) => {
                    console.error('❌ WebSocket ошибка:', error);
                    this.onError?.(error);
                    if (!this.isConnected) {
                        reject(error);
                    }
                };
                
                this.ws.onclose = (event) => {
                    console.log('🔌 WebSocket закрыт:', event.code, event.reason);
                    this.isConnected = false;
                    this.onConnectionChange?.(false);
                    
                    // Попытка переподключения
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
                        
                        console.log(`🔄 Переподключение через ${delay}мс (попытка ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                        
                        setTimeout(() => {
                            this.connect().catch(err => {
                                console.error('❌ Ошибка переподключения:', err);
                            });
                        }, delay);
                    } else {
                        console.error('💥 Превышено количество попыток переподключения');
                        this.onError?.(new Error('Не удалось переподключиться к WebSocket'));
                    }
                };
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Обработка входящих сообщений
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            
            // Проверяем что это ticker данные
            if (message.stream && message.stream.includes('@ticker') && message.data) {
                const tickerData = message.data;
                const binancePair = tickerData.s; // Например: BTCUSDT
                
                // Находим символ игры по паре Binance
                const gameSymbol = Object.keys(this.symbolMap).find(
                    symbol => this.symbolMap[symbol] === binancePair
                );
                
                if (gameSymbol) {
                    const price = parseFloat(tickerData.c); // Текущая цена
                    const priceChange = parseFloat(tickerData.P); // Изменение в %
                    
                    // Обновляем кэш
                    this.priceCache.set(gameSymbol, {
                        symbol: gameSymbol,
                        price: price,
                        priceChange: priceChange,
                        lastUpdated: Date.now(),
                        volume: parseFloat(tickerData.v),
                        high24h: parseFloat(tickerData.h),
                        low24h: parseFloat(tickerData.l)
                    });
                    
                    this.lastUpdate = Date.now();
                    
                    // Уведомляем подписчиков
                    const prices = this.getGamePrices();
                    this.onPriceUpdate?.(prices);
                    
                    // Логируем только раз в 5 секунд чтобы не засорять консоль
                    if (Date.now() - (this.lastLogTime || 0) > 5000) {
                        console.log(`📈 Обновлены цены: ${Object.keys(prices).join(', ')}`);
                        this.lastLogTime = Date.now();
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Ошибка обработки сообщения:', error);
        }
    }
    
    // Получение цены конкретной монеты
    getPrice(symbol) {
        const cached = this.priceCache.get(symbol);
        return cached ? cached.price : null;
    }
    
    // Получение данных о цене с изменением
    getPriceData(symbol) {
        return this.priceCache.get(symbol) || null;
    }
    
    // Получение всех цен для игры
    getGamePrices() {
        const prices = {};
        
        for (const symbol of Object.keys(this.symbolMap)) {
            const cached = this.priceCache.get(symbol);
            if (cached) {
                prices[symbol] = {
                    price: cached.price,
                    change: cached.priceChange,
                    timestamp: cached.lastUpdated,
                    volume: cached.volume,
                    high24h: cached.high24h,
                    low24h: cached.low24h
                };
            }
        }
        
        return prices;
    }
    
    // Остановка WebSocket
    stop() {
        console.log('🛑 Остановка Binance WebSocket...');
        
        this.isConnected = false;
        this.reconnectAttempts = this.maxReconnectAttempts; // Останавливаем переподключения
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.close(1000, 'Остановка по требованию');
        }
        
        console.log('✅ Binance WebSocket остановлен');
    }
    
    // Получение статуса подключения
    getStatus() {
        return {
            connected: this.isConnected,
            lastUpdate: this.lastUpdate,
            cachedPrices: this.priceCache.size,
            timeSinceUpdate: Date.now() - this.lastUpdate,
            reconnectAttempts: this.reconnectAttempts
        };
    }
    
    // Проверка свежести данных
    isDataFresh(maxAgeMs = 10000) { // По умолчанию данные свежие 10 секунд
        return (Date.now() - this.lastUpdate) < maxAgeMs;
    }
    
    // Установка колбэков
    setPriceUpdateCallback(callback) {
        this.onPriceUpdate = callback;
    }
    
    setErrorCallback(callback) {
        this.onError = callback;
    }
    
    setConnectionChangeCallback(callback) {
        this.onConnectionChange = callback;
    }
    
    // Тест подключения
    async testConnection() {
        try {
            console.log('🧪 Тестирование подключения к Binance WebSocket...');
            
            return new Promise((resolve, reject) => {
                const testWs = new WebSocket(`${this.baseWsUrl}/ws/btcusdt@ticker`);
                
                const timeout = setTimeout(() => {
                    testWs.close();
                    reject(new Error('Тайм-аут подключения'));
                }, 5000);
                
                testWs.onopen = () => {
                    console.log('✅ Тест подключения успешен');
                    clearTimeout(timeout);
                    testWs.close();
                    resolve(true);
                };
                
                testWs.onerror = (error) => {
                    console.error('❌ Тест подключения неудачен:', error);
                    clearTimeout(timeout);
                    reject(error);
                };
                
                testWs.onmessage = (event) => {
                    // Получили данные - значит подключение работает
                    console.log('✅ Получены тестовые данные от Binance');
                    clearTimeout(timeout);
                    testWs.close();
                    resolve(true);
                };
            });
            
        } catch (error) {
            console.error('❌ Ошибка тестирования:', error);
            return false;
        }
    }
    
    // Принудительное переподключение
    async reconnect() {
        console.log('🔄 Принудительное переподключение...');
        
        this.stop();
        
        // Ждем немного перед переподключением
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        this.reconnectAttempts = 0;
        await this.start();
    }
}

// Экспортируем класс
window.BinanceWebSocketAPI = BinanceWebSocketAPI;