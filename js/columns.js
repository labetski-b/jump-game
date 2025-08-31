class Column {
    constructor(x, initialHeight, type, canvas) {
        this.x = x;
        this.height = initialHeight;
        this.type = type; // 'stable' или 'volatile'
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 120;
        this.animatedHeight = initialHeight;
        this.targetHeight = initialHeight;
        this.animationSpeed = 0.1;
        
        // Визуальные эффекты
        this.pulsePhase = 0;
        this.isHighlighted = false;
        this.particles = [];
        
        // Состояние активности
        this.isActive = false; // Активная ли эта колонна
        this.isVirtual = false; // Виртуальная ли эта колонна (для сравнения)
        this.profitLoss = 0; // P/L для динамической окраски активной колонны
    }
    
    update(deltaTime) {
        // Плавная анимация изменения высоты
        const heightDiff = this.targetHeight - this.animatedHeight;
        if (Math.abs(heightDiff) > 0.1) {
            this.animatedHeight += heightDiff * this.animationSpeed;
        } else {
            this.animatedHeight = this.targetHeight;
        }
        
        // Обновляем визуальные эффекты
        this.pulsePhase += deltaTime * 0.005;
        this.updateParticles(deltaTime);
    }
    
    setHeight(newHeight) {
        this.height = newHeight;
        this.targetHeight = newHeight;
        
        // Добавляем визуальный эффект при значительном изменении
        if (Math.abs(newHeight - this.animatedHeight) > this.animatedHeight * 0.1) {
            this.addPulseEffect();
            this.createHeightChangeParticles();
        }
    }
    
    draw() {
        // Колонны растут только вверх от базовой линии
        const maxColumnHeight = 300; // Максимальная высота колонны
        const columnHeight = this.getScaledHeight(maxColumnHeight);
        
        // Базовая линия чуть ниже центра экрана
        const baseY = this.canvas.height / 2 + 50; // Базовая линия
        const topY = baseY - columnHeight; // Верх колонны
        
        
        this.ctx.save();
        
        // Основная колонна с градиентом
        this.drawColumnBody(topY, columnHeight);
        
        // Эффекты
        if (this.isHighlighted) {
            this.drawHighlight(topY, columnHeight);
        }
        
        this.drawParticles();
        
        // Рисуем текст на волатильной колонне
        if (this.type === 'volatile') {
            this.drawVolatileText(topY, columnHeight);
        }
        
        // Названия рисуем в ColumnManager.draw(), чтобы избежать дублирования
        
        this.ctx.restore();
    }
    
    drawColumnBody(topY, columnHeight) {
        const gradient = this.createGradient(topY, columnHeight);
        
        // Применяем затемнение для виртуальных колонн
        if (this.isVirtual) {
            this.ctx.globalAlpha = 0.5;
        }
        
        // Основная форма колонны
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(this.x - this.width/2, topY, this.width, columnHeight);
        
        // Пульсация для активной волатильной колонны
        if (this.type === 'volatile' && this.isActive) {
            const pulseIntensity = Math.sin(this.pulsePhase) * 0.2 + 0.8;
            this.ctx.globalAlpha = pulseIntensity;
            this.ctx.fillRect(this.x - this.width/2, topY, this.width, columnHeight);
        }
        
        // Восстанавливаем прозрачность
        this.ctx.globalAlpha = 1;
        
        // Контрастные контуры
        let strokeColor = '#FFFFFF';
        let lineWidth = 2;
        
        if (this.type === 'stable') {
            strokeColor = '#FFFFFF';
            lineWidth = 2;
        } else if (this.type === 'volatile') {
            if (this.isActive) {
                strokeColor = '#FFFFFF';
                lineWidth = 3;
            } else if (this.isVirtual) {
                strokeColor = '#666666';
                lineWidth = 1;
            } else {
                strokeColor = '#FFFFFF';
                lineWidth = 2;
            }
        }
        
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeRect(this.x - this.width/2, topY, this.width, columnHeight);
    }
    
    createGradient(topY, columnHeight) {
        if (this.type === 'stable') {
            // Приглушенный синий для стабильной колонны (как на death.fun)
            return '#4A90E2';
        } else {
            // Цвета для волатильных колонн
            if (this.isActive) {
                // Динамическая окраска активной колонны по P/L
                if (this.profitLoss > 0) {
                    // Прибыль - яркий зеленый
                    return '#00FF41';
                } else if (this.profitLoss < 0) {
                    // Убыток - яркий красный
                    return '#FF4444';
                } else {
                    // Нейтральный - стандартный зеленый
                    return '#7ED321';
                }
            } else if (this.isVirtual) {
                // Темно-серый для виртуальных колонн
                return '#2C3E50';
            } else {
                // Приглушенный зеленый/красный в зависимости от высоты
                const isAboveStable = this.height > (this.stableColumnHeight || 100);
                return isAboveStable ? '#5CB85C' : '#D9534F';
            }
        }
    }
    
    drawHighlight(topY, columnHeight) {
        this.ctx.strokeStyle = '#00FF41';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(this.x - this.width/2 - 5, topY - 5, this.width + 10, columnHeight + 10);
        this.ctx.setLineDash([]);
    }
    
    getScaledHeight(maxColumnHeight = null) {
        const minHeight = 60;
        const maxHeight = maxColumnHeight || 300;
        
        // Улучшенное масштабирование для центрированного вида
        const baseValue = 100; // Базовое значение
        const baseHeight = 150; // Базовая высота для 100 USDT
        
        if (this.animatedHeight <= 0) {
            return minHeight;
        }
        
        // Используем корневое масштабирование для лучшей видимости изменений
        const ratio = this.animatedHeight / baseValue;
        let scaledHeight;
        
        if (ratio >= 1) {
            // Для значений больше базового используем квадратный корень для сжатия
            scaledHeight = baseHeight + (Math.sqrt(ratio - 1) * 200);
        } else {
            // Для значений меньше базового используем линейное масштабирование
            scaledHeight = baseHeight * ratio;
        }
        
        return Math.max(minHeight, Math.min(maxHeight, scaledHeight));
    }
    
    getPlayerPosition() {
        const maxColumnHeight = 300;
        const columnHeight = this.getScaledHeight(maxColumnHeight);
        
        // Базовая линия чуть ниже центра экрана
        const baseY = this.canvas.height / 2 + 50;
        const topY = baseY - columnHeight;
        
        return {
            x: this.x,
            y: topY - 15 // Чуть выше верха колонны
        };
    }
    
    addPulseEffect() {
        this.isHighlighted = true;
        setTimeout(() => {
            this.isHighlighted = false;
        }, 300);
    }
    
    createHeightChangeParticles() {
        const pos = this.getPlayerPosition();
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: pos.x + (Math.random() - 0.5) * 50,
                y: pos.y,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 3,
                life: 1.0,
                color: this.type === 'stable' ? '#4CAF50' : '#FF9800'
            });
        }
    }
    
    updateParticles(deltaTime) {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1; // Гравитация
            particle.life -= deltaTime * 0.002;
            
            return particle.life > 0;
        });
    }
    
    drawVolatileText(topY, columnHeight) {
        // Получаем значение для отображения от ColumnManager
        const displayValue = this.getDisplayValue();
        // Если displayValue - строка (например "Купить"), используем как есть
        const text = typeof displayValue === 'string' ? displayValue : this.formatDisplayValue(displayValue);
        
        
        // Настройки текста - крупнее и читаемее
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Позиция текста (в центре колонны)
        const textX = this.x;
        const textY = topY + columnHeight / 2;
        
        // Основной текст с контрастными цветами
        if (this.isVirtual) {
            this.ctx.fillStyle = '#AAAAAA';
        } else if (this.type === 'stable') {
            this.ctx.fillStyle = '#000000'; // Черный на голубом
        } else if (this.isActive) {
            this.ctx.fillStyle = '#000000'; // Черный на желтом
        } else {
            this.ctx.fillStyle = '#000000'; // Черный на цветном
        }
        this.ctx.fillText(text, textX, textY);
        
        // Показываем дополнительную информацию
        if (this.additionalInfo) {
            this.ctx.font = 'bold 12px monospace';
            if (this.isVirtual) {
                this.ctx.fillStyle = '#AAAAAA';
            } else if (this.type === 'stable') {
                this.ctx.fillStyle = '#000000';
            } else if (this.isActive) {
                this.ctx.fillStyle = '#000000';
            } else {
                this.ctx.fillStyle = '#000000';
            }
            this.ctx.fillText(this.additionalInfo, textX, textY + 20);
        }
    }
    
    formatDisplayValue(value) {
        if (value < 0.001) {
            return value.toExponential(2);
        } else if (value < 1) {
            return value.toFixed(4);
        } else if (value < 1000) {
            return value.toFixed(2);
        } else {
            return value.toFixed(1);
        }
    }
    
    getDisplayValue() {
        // Эти значения будут обновляться от ColumnManager
        return this.displayValue || this.height;
    }
    
    setDisplayValue(value) {
        this.displayValue = value;
    }
    
    setAdditionalInfo(info) {
        this.additionalInfo = info;
    }
    
    setStableColumnHeight(height) {
        this.stableColumnHeight = height;
    }
    
    setActive(active) {
        this.isActive = active;
    }
    
    setVirtual(virtual) {
        this.isVirtual = virtual;
    }
    
    setProfitLoss(profitLoss) {
        this.profitLoss = profitLoss;
    }
    
    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.save();
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
}

class ColumnManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // СУПЕР ПРОСТОЕ фиксированное позиционирование
        // Создание колонн с фиксированным расстоянием
        
        // Фиксированное расстояние между колоннами
        this.columnWidth = 120;
        this.columnSpacing = 150; // Расстояние между центрами колонн
        const positions = this.calculateFixedColumnPositions();
        
        // Создаем стабильную колонну (USDT)
        this.stableColumn = new Column(positions[0], 100, 'stable', canvas);
        
        // Создаем 4 криптовалютные колонны
        this.cryptoNames = ['BTC', 'ETH', 'ADA', 'DOT'];
        this.volatileColumns = [];
        
        
        for (let i = 0; i < 4; i++) {
            const x = positions[i + 1];
            
            const column = new Column(x, 100, 'volatile', canvas);
            column.cryptoName = this.cryptoNames[i];
            this.volatileColumns.push(column);
            
        }
        
        
        // Состояние игрока
        this.playerOnVolatile = false;
        this.currentVolatileIndex = -1; // Индекс текущей волатильной колонны
        this.walletValue = 100; // Текущее значение кошелька
        
        // Торговые данные
        this.cryptoAmount = 0; // Количество криптовалюты у игрока
        this.buyPrice = 0; // Цена покупки криптовалюты
        this.marginPosition = null; // Текущая маржинальная позиция
        
        // Система сравнения - виртуальные позиции для сравнения
        this.comparisonSystem = {
            initialized: false,
            totalBudget: 100, // Общий бюджет
            activePosition: null, // Текущая активная позиция {symbol, amount, buyPrice, buyTime}
            virtualComparisons: {} // Виртуальные позиции для сравнения
        };
        
        // Режимы плеча
        this.leverage = 1000; // Дефолтное плечо x1000 (экстремальный режим)
        this.availableLeverages = [1, 10, 100, 500, 1000]; // Доступные режимы плеча
        
        // Binance WebSocket API интеграция - всегда включен
        this.binanceAPI = null;
        this.initializeBinanceAPI();
        
        // Система хранения исторических данных для мини-графиков
        this.priceHistory = {};
        this.maxHistoryPoints = 14; // Количество точек для графика (2 минуты при обновлениях ~8.5 сек)
        this.lastHistoryUpdate = 0;
        this.historyUpdateInterval = 8500; // Обновляем каждые ~8.5 секунд
        
        // Загружаем исторические данные при инициализации
        this.loadHistoricalData();
    }
    
    update(deltaTime) {
        // Синхронизируем высоту USDT колонны 
        // ТОЛЬКО когда игрок на USDT - при торговле она не меняется!
        if (!this.playerOnVolatile) {
            const displayBalance = this.getPotentialWalletDisplay();
            if (this.stableColumn.height !== displayBalance) {
                this.stableColumn.setHeight(displayBalance);
            }
        }
        
        // Инициализируем систему сравнения если еще не инициализирована
        if (!this.comparisonSystem.initialized && this.binanceAPI) {
            this.initializeComparisonSystem();
        }
        
        // Проверяем margin call для автоликвидации
        if (this.playerOnVolatile && this.shouldLiquidate()) {
            console.warn('🚨 MARGIN CALL! Автоматическая ликвидация позиции');
            this.forceClosePosition();
        }
        
        // Обновляем систему сравнения
        this.updateComparisonSystem();
        
        // Передаем высоту стабильной колонны во все волатильные для правильной покраски
        const stableHeight = this.stableColumn.height;
        this.volatileColumns.forEach((column, index) => {
            column.setStableColumnHeight(stableHeight);
            
            // Устанавливаем состояния активности
            if (this.playerOnVolatile) {
                if (this.currentVolatileIndex === index) {
                    column.setActive(true);
                    column.setVirtual(false);
                    
                    // Рассчитываем P/L для динамической окраски
                    const currentWallet = this.getPotentialWalletDisplay();
                    const initialWallet = this.marginPosition ? this.marginPosition.initialWallet : 100;
                    const profitLoss = currentWallet - initialWallet;
                    column.setProfitLoss(profitLoss);
                } else {
                    column.setActive(false);
                    column.setVirtual(true);
                    column.setProfitLoss(0); // Сбрасываем P/L для неактивных
                }
            } else {
                column.setActive(false);
                column.setVirtual(false);
                column.setProfitLoss(0); // Сбрасываем P/L когда на USDT
            }
        });
        
        // Обновляем высоты колонн на основе системы сравнения
        this.volatileColumns.forEach((column, index) => {
            const usdtHeight = this.calculateComparisonHeight(index);
            column.setHeight(usdtHeight);
        });
        
        // Обновляем отображаемые значения на волатильных колоннах
        this.updateVolatileDisplay();
        
        // Обновляем историю цен для мини-графиков
        this.updatePriceHistory();
        
        // Обновляем анимации всех колонн
        this.stableColumn.update(deltaTime);
        this.volatileColumns.forEach(column => column.update(deltaTime));
    }
    
    updateVolatileDisplay() {
        // Отладка состояния игрока (только при изменении)
        // console.log(`🎮 Обновление надписей: playerOnVolatile=${this.playerOnVolatile}, currentVolatileIndex=${this.currentVolatileIndex}`);
        
        this.volatileColumns.forEach((column, index) => {
            let displayValue = 'Купить';
            let additionalInfo = '';
            
            if (!this.playerOnVolatile) {
                // Игрок на USDT - показываем "Купить" на всех криптоколоннах
                displayValue = 'Купить';
                additionalInfo = `${this.walletValue.toFixed(2)} USDT`;
            } else {
                // Игрок на криптоколонне
                if (this.currentVolatileIndex === index) {
                    // Текущая активная колонна - показываем "Продать" и баланс
                    displayValue = 'Продать';
                    const currentWallet = this.getPotentialWalletDisplay();
                    additionalInfo = `${currentWallet.toFixed(2)} USDT`;
                } else {
                    // Виртуальные колонны - показываем P/L в процентах
                    displayValue = 'Купить';
                    const potentialValue = this.calculateUSDTEquivalentForCrypto(index);
                    const initialWallet = this.marginPosition ? this.marginPosition.initialWallet : this.walletValue;
                    const profitLoss = potentialValue - initialWallet;
                    const percentChange = initialWallet > 0 ? (profitLoss / initialWallet) * 100 : 0;
                    
                    // Форматируем P/L с знаком
                    const sign = percentChange >= 0 ? '+' : '';
                    additionalInfo = `${sign}${percentChange.toFixed(2)}%`;
                }
            }
            
            column.setDisplayValue(displayValue);
            column.setAdditionalInfo(additionalInfo);
        });
    }
    
    // Рассчитывает количество криптовалюты, которое можно купить за текущий USDT баланс
    calculateCryptoAmount(cryptoIndex) {
        if (!this.binanceAPI) {
            return this.walletValue * 0.998;
        }
        
        const cryptoSymbol = this.cryptoNames[cryptoIndex];
        const prices = this.binanceAPI.getGamePrices();
        const priceData = prices[cryptoSymbol];
        
        if (!priceData || !priceData.price) {
            return this.walletValue * 0.998;
        }
        
        // Сколько криптовалюты купим за наш USDT (с комиссией и плечом)
        const usdtAfterFee = this.walletValue * 0.998;
        const leveragedAmount = usdtAfterFee * this.leverage;
        return leveragedAmount / priceData.price;
    }
    
    // Рассчитывает эквивалент в USDT для волатильных колонн
    calculateUSDTEquivalent(cryptoIndex) {
        if (!this.binanceAPI || this.currentVolatileIndex === -1) {
            return this.walletValue * 0.998;
        }
        
        // Получаем текущее количество криптовалюты у игрока
        const currentCryptoAmount = this.getCurrentCryptoAmount(this.currentVolatileIndex);
        
        if (cryptoIndex === this.currentVolatileIndex) {
            // Это та же колонна, где находится игрок
            return currentCryptoAmount;
        }
        
        // Конвертируем в USDT через цену целевой криптовалюты
        const cryptoSymbol = this.cryptoNames[cryptoIndex];
        const prices = this.binanceAPI.getGamePrices();
        const priceData = prices[cryptoSymbol];
        
        if (!priceData || !priceData.price) {
            return this.walletValue * 0.998;
        }
        
        // Сначала конвертируем текущую крипту в USDT, потом в целевую крипту
        const currentCryptoSymbol = this.cryptoNames[this.currentVolatileIndex];
        const currentPriceData = prices[currentCryptoSymbol];
        
        if (!currentPriceData || !currentPriceData.price) {
            return this.walletValue * 0.998;
        }
        
        // USDT эквивалент = количество_криптовалюты * цена_за_штуку * (1 - комиссия)
        const usdtValue = currentCryptoAmount * currentPriceData.price * 0.998;
        
        // Если это стабильная (USDT), то возвращаем USDT
        if (cryptoSymbol === 'USDT' || cryptoIndex === -1) {
            return usdtValue;
        }
        
        // Конвертируем USDT в целевую криптовалюту
        return usdtValue / priceData.price;
    }
    
    // Получает текущее количество криптовалюты у игрока
    getCurrentCryptoAmount(cryptoIndex) {
        if (!this.playerOnVolatile || cryptoIndex !== this.currentVolatileIndex) {
            return 0;
        }
        
        // Возвращаем фиксированное количество криптовалюты, которое купили при прыжке
        return this.cryptoAmount;
    }
    
    // Рассчитывает USDT высоту для колонны в режиме реальных цен
    calculateColumnUSDTHeight(cryptoIndex) {
        if (!this.binanceAPI) {
            return this.walletValue;
        }
        
        const cryptoSymbol = this.cryptoNames[cryptoIndex];
        const prices = this.binanceAPI.getGamePrices();
        const priceData = prices[cryptoSymbol];
        
        if (!priceData || !priceData.price) {
            return this.walletValue * 0.998;
        }
        
        if (this.playerOnVolatile) {
            if (cryptoIndex === this.currentVolatileIndex) {
                // ТЕКУЩАЯ колонна игрока - обновляется по цене в реальном времени!
                const cryptoAmount = this.getCurrentCryptoAmount(cryptoIndex);
                const currentUsdtValue = cryptoAmount * priceData.price;
                
                // С плечом: показываем прибыль/убыток от изменения цены, умноженный на плечо
                const profitLoss = (priceData.price - this.buyPrice) * this.cryptoAmount * this.leverage;
                const totalValue = this.walletValue + profitLoss;
                
                console.log(`📈 ${cryptoSymbol}: ${cryptoAmount.toFixed(6)} × $${priceData.price} = $${currentUsdtValue.toFixed(2)}, P/L: $${profitLoss.toFixed(2)}, Total: $${totalValue.toFixed(2)}`);
                return totalValue;
            } else {
                // Другие колонны - показываем сколько USDT получим при продаже текущей крипты
                const currentUsdtValue = this.calculateUSDTFromCurrentCrypto();
                return currentUsdtValue;
            }
        } else {
            // Игрок на USDT - все колонны показывают потенциальную покупку с учетом плеча
            const effectiveWallet = this.walletValue * 0.998 * this.leverage;
            return effectiveWallet;
        }
    }
    
    draw() {
        // Обычная отрисовка
        if (this.stableColumn) {
            this.stableColumn.draw();
        }
        
        this.volatileColumns.forEach((column, index) => {
            column.draw();
        });
        
        // Рисуем подписи криптовалют
        this.drawCryptoLabels();
        
        // Отладочная информация раз в секунду
        if (Math.random() < 0.017) { // Примерно раз в секунду при 60 FPS
        }
    }
    
    processJump(fromColumn, toColumn, targetIndex = 0) {
        // Обрабатываем прыжок между колоннами
        
        if (fromColumn === 'volatile') {
            // Прыжок с волатильной колонны
            if (!this.playerOnVolatile || this.currentVolatileIndex === -1 || !this.volatileColumns[this.currentVolatileIndex]) {
                // Игрок не на криптовалюте - ошибка состояния
                return null;
            }
            
            if (toColumn === 'stable') {
                // Прыжок на стабильную - конвертируем криптовалюту в USDT
                const oldStableHeight = this.stableColumn.height;
                const newStableHeight = this.calculateUSDTFromCurrentCrypto();
                
                // Обновляем кошелек и высоту стабильной колонны
                this.walletValue = newStableHeight;
                this.stableColumn.setHeight(newStableHeight);
                
                return {
                    oldHeight: oldStableHeight,
                    newHeight: newStableHeight,
                    percentChange: oldStableHeight > 0 ? ((newStableHeight - oldStableHeight) / oldStableHeight) * 100 : 0
                };
            } else {
                // Прыжок на другую волатильную - две транзакции: продажа → USDT → покупка
                // 1. Сначала продаем текущую криптовалюту в USDT
                const oldStableHeight = this.stableColumn.height;
                const usdtAfterSale = this.calculateUSDTFromCurrentCrypto();
                
                console.log(`💱 Переход между криптовалютами: ${this.cryptoNames[this.currentVolatileIndex]} → ${this.cryptoNames[targetIndex]}`);
                
                // Обновляем кошелек после продажи
                this.walletValue = usdtAfterSale;
                this.stableColumn.setHeight(usdtAfterSale);
                
                // Сбрасываем состояние волатильности для корректной покупки новой валюты
                
                // Сбрасываем волатильное состояние
                this.playerOnVolatile = false;
                this.currentVolatileIndex = -1;
                this.cryptoAmount = 0;
                this.buyPrice = 0;
                this.marginPosition = null;
                this.comparisonSystem.activePosition = null;
                this.comparisonSystem.virtualComparisons = {};
                
                // 2. Выравниваем все криптоколонны по новому балансу для визуального эффекта
                this.alignCryptoColumnsHeight(usdtAfterSale);
                
                // 3. Теперь покупаем новую криптовалюту (это произойдет в onPlayerLanded)
                // Возвращаем результат продажи для UI
                return {
                    oldHeight: oldStableHeight,
                    newHeight: usdtAfterSale,
                    percentChange: oldStableHeight > 0 ? ((usdtAfterSale - oldStableHeight) / oldStableHeight) * 100 : 0,
                    isIntermediate: true // Помечаем как промежуточную транзакцию
                };
            }
        } else {
            // Прыжок со стабильной на волатильную
            // walletValue остается без изменений (кошелек обновляется только при возврате на USDT)
            // Покупка криптовалюты
            return null;
        }
    }
    
    // Рассчитывает итоговый баланс игрока с учетом маржинальной позиции
    calculateFinalWalletBalance() {
        if (!this.marginPosition || !this.binanceAPI) {
            return this.walletValue * 0.998 * 0.998; // Двойная комиссия
        }
        
        const prices = this.binanceAPI.getGamePrices();
        const currentPriceData = prices[this.marginPosition.symbol];
        
        if (!currentPriceData || !currentPriceData.price) {
            return this.walletValue * 0.998 * 0.998; // Fallback
        }
        
        // Текущая стоимость позиции
        const currentPositionValue = this.marginPosition.cryptoAmount * currentPriceData.price;
        
        // P/L = (текущая стоимость - размер позиции при покупке)
        const profitLoss = currentPositionValue - this.marginPosition.positionSize;
        
        // Итоговый баланс = исходный кошелек + P/L - комиссия продажи
        const finalBalance = this.marginPosition.initialWallet + profitLoss;
        const finalBalanceAfterFees = finalBalance * 0.998; // Комиссия продажи 0.2%
        
        return Math.max(0, finalBalanceAfterFees);
    }
    
    // Проверяет, нужна ли margin call (ликвидация позиции)
    shouldLiquidate() {
        if (!this.marginPosition || !this.binanceAPI) {
            return false;
        }
        
        const finalBalance = this.calculateFinalWalletBalance();
        
        // Ликвидируем если убыток приближается к размеру кошелька
        // Оставляем небольшой буфер (5% от исходного кошелька)
        const liquidationThreshold = this.marginPosition.initialWallet * 0.05;
        
        return finalBalance <= liquidationThreshold;
    }
    
    // Получает потенциальный баланс для отображения на колонне
    getPotentialWalletDisplay() {
        if (!this.marginPosition || !this.playerOnVolatile) {
            return this.walletValue; // Если не торгуем, показываем обычный баланс
        }
        
        return this.calculateFinalWalletBalance();
    }
    
    // Принудительно закрывает позицию при margin call
    forceClosePosition() {
        if (!this.marginPosition) return;
        
        // Рассчитываем итоговый баланс после ликвидации
        const finalBalance = this.calculateFinalWalletBalance();
        
        // Обновляем кошелек
        this.walletValue = Math.max(0.01, finalBalance); // Минимум 0.01 USDT остается
        
        // Сбрасываем состояние игрока
        this.playerOnVolatile = false;
        this.currentVolatileIndex = -1;
        this.cryptoAmount = 0;
        this.buyPrice = 0;
        this.marginPosition = null;
        this.comparisonSystem.activePosition = null;
        this.comparisonSystem.virtualComparisons = {}; // Очищаем виртуальные позиции
        
        // Уведомляем UI о ликвидации
        this.showLiquidationNotification();
    }
    
    // Показывает уведомление о ликвидации
    showLiquidationNotification() {
        // Можно добавить визуальное уведомление в UI
        console.warn('💥 ЛИКВИДАЦИЯ! Позиция закрыта из-за больших убытков');
    }
    
    // Создает виртуальные позиции для всех неактивных криптовалют
    createVirtualPositions(activeCryptoIndex, buyTime) {
        if (!this.binanceAPI) return;
        
        const prices = this.binanceAPI.getGamePrices();
        const virtualPositions = {};
        
        this.cryptoNames.forEach((cryptoSymbol, index) => {
            if (index !== activeCryptoIndex) {
                const priceData = prices[cryptoSymbol];
                if (priceData && priceData.price) {
                    // Создаем виртуальную позицию "что если купил эту валюту"
                    const positionSize = this.walletValue * this.leverage * 0.998;
                    const virtualCryptoAmount = positionSize / priceData.price;
                    
                    virtualPositions[cryptoSymbol] = {
                        symbol: cryptoSymbol,
                        cryptoAmount: virtualCryptoAmount,
                        buyPrice: priceData.price,
                        initialWallet: this.walletValue,
                        positionSize: positionSize,
                        leverage: this.leverage,
                        buyTime: buyTime
                    };
                }
            }
        });
        
        this.comparisonSystem.virtualComparisons = virtualPositions;
    }
    
    // Рассчитывает потенциальный баланс для виртуальной позиции
    calculateVirtualWallet(cryptoSymbol) {
        const virtualPosition = this.comparisonSystem.virtualComparisons[cryptoSymbol];
        if (!virtualPosition || !this.binanceAPI) {
            return this.walletValue; // Фоллбек
        }
        
        const prices = this.binanceAPI.getGamePrices();
        const currentPriceData = prices[cryptoSymbol];
        if (!currentPriceData || !currentPriceData.price) {
            return this.walletValue; // Фоллбек
        }
        
        // Рассчитываем текущую стоимость виртуальной позиции
        const currentPositionValue = virtualPosition.cryptoAmount * currentPriceData.price;
        const profitLoss = currentPositionValue - virtualPosition.positionSize;
        const finalWallet = virtualPosition.initialWallet + profitLoss;
        
        return Math.max(0, finalWallet * 0.998); // С комиссией
    }
    
    // Рассчитывает USDT стоимость текущей криптовалюты игрока (используется при продаже)
    calculateUSDTFromCurrentCrypto() {
        if (!this.marginPosition) {
            return this.walletValue * 0.998 * 0.998; // Fallback
        }
        
        return this.calculateFinalWalletBalance();
    }
    
    getColumnAt(x) {
        // Проверяем стабильную колонну
        if (Math.abs(x - this.stableColumn.x) < this.stableColumn.width / 2) {
            return { type: 'stable', index: -1 };
        }
        
        // Проверяем волатильные колонны
        for (let i = 0; i < this.volatileColumns.length; i++) {
            const column = this.volatileColumns[i];
            if (Math.abs(x - column.x) < column.width / 2) {
                return { type: 'volatile', index: i };
            }
        }
        
        return null;
    }
    
    getColumn(type, index = 0) {
        if (type === 'stable') {
            return this.stableColumn;
        } else {
            return this.volatileColumns[index] || this.volatileColumns[0];
        }
    }
    
    getCurrentColumn() {
        if (this.playerOnVolatile) {
            return this.volatileColumns[this.currentVolatileIndex];
        } else {
            return this.stableColumn;
        }
    }
    
    drawCryptoLabels() {
        this.ctx.save();
        
        // Настройки текста - крупнее для читаемости
        this.ctx.font = 'bold 18px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#FFFFFF';
        
        // Подписи под колоннами (ближе к колоннам)
        const baseY = this.canvas.height / 2 + 50; // Базовая линия колонн
        const labelOffset = 25; // Отступ от базовой линии вниз
        
        this.volatileColumns.forEach((column) => {
            const labelY = baseY + labelOffset;
            this.ctx.fillText(column.cryptoName, column.x, labelY);
        });
        
        // Подпись для стабильной колонны
        const stableLabelY = baseY + labelOffset;
        this.ctx.fillText('USDT', this.stableColumn.x, stableLabelY);
        
        this.ctx.restore();
    }
    
    onPlayerStartJump(fromColumn) {
        // Когда игрок начинает прыжок
    }
    
    onPlayerLanded(columnType, columnIndex = -1) {
        // Игрок приземлился
        
        if (columnType === 'volatile') {
            // Покупка криптовалюты
            this.currentVolatileIndex = columnIndex;
            this.playerOnVolatile = true;
            
            // Покупаем криптовалюту по текущей цене
            const cryptoSymbol = this.cryptoNames[columnIndex];
            const prices = this.binanceAPI?.getGamePrices();
            const priceData = prices?.[cryptoSymbol];
            
            if (priceData && priceData.price) {
                this.buyPrice = priceData.price;
                
                // Маржинальная торговля: размер позиции = кошелек * плечо
                const positionSize = this.walletValue * this.leverage * 0.998; // Комиссия 0.2%
                this.cryptoAmount = positionSize / priceData.price;
                
                // Создаем маржинальную позицию
                this.marginPosition = {
                    symbol: cryptoSymbol,
                    cryptoAmount: this.cryptoAmount,
                    buyPrice: priceData.price,
                    initialWallet: this.walletValue, // Наш исходный кошелек
                    positionSize: positionSize, // Общий размер позиции
                    leverage: this.leverage,
                    buyTime: Date.now()
                };
                
                // Обновляем систему сравнения
                this.comparisonSystem.totalBudget = positionSize; // Общий размер позиции
                this.comparisonSystem.activePosition = {
                    symbol: cryptoSymbol,
                    amount: this.cryptoAmount,
                    buyPrice: priceData.price,
                    buyTime: Date.now(),
                    leverage: this.leverage
                };
                
                // Создаем виртуальные позиции для всех неактивных криптовалют
                this.createVirtualPositions(columnIndex, Date.now());
                
                // Покупка криптовалюты с плечом
            } else {
                console.warn(`⚠️ Нет цены для ${cryptoSymbol}, используем фиктивную покупку`);
                this.buyPrice = 50000; // Fallback price
                const positionSize = this.walletValue * this.leverage * 0.998;
                this.cryptoAmount = positionSize / this.buyPrice;
                
                this.marginPosition = {
                    symbol: cryptoSymbol,
                    cryptoAmount: this.cryptoAmount,
                    buyPrice: this.buyPrice,
                    initialWallet: this.walletValue,
                    positionSize: positionSize,
                    leverage: this.leverage,
                    buyTime: Date.now()
                };
                
                this.comparisonSystem.totalBudget = positionSize; // Общий размер позиции
                this.comparisonSystem.activePosition = {
                    symbol: cryptoSymbol,
                    amount: this.cryptoAmount,
                    buyPrice: this.buyPrice,
                    buyTime: Date.now(),
                    leverage: this.leverage
                };
                
                // Создаем виртуальные позиции для всех неактивных криптовалют
                this.createVirtualPositions(columnIndex, Date.now());
            }
            
        } else if (columnType === 'stable') {
            // Продажа криптовалюты (происходит в processJump)
            this.currentVolatileIndex = -1;
            this.playerOnVolatile = false;
            this.cryptoAmount = 0;
            this.buyPrice = 0;
            this.marginPosition = null;
            this.comparisonSystem.activePosition = null;
            this.comparisonSystem.virtualComparisons = {}; // Очищаем виртуальные позиции
        }
    }
    
    // Методы для работы с Binance WebSocket API
    async initializeBinanceAPI() {
        try {
            console.log('🚀 Инициализация Binance WebSocket API...');
            
            this.binanceAPI = new BinanceWebSocketAPI();
            
            // Настраиваем колбэк для обновления цен
            this.binanceAPI.setPriceUpdateCallback((prices) => {
                this.handleRealPriceUpdate(prices);
            });
            
            // Настраиваем колбэк ошибок
            this.binanceAPI.setErrorCallback((error) => {
                console.error('💥 Ошибка Binance API:', error);
            });
            
            // Настраиваем колбэк изменения состояния подключения
            this.binanceAPI.setConnectionChangeCallback((connected) => {
                console.log(`🔌 Состояние подключения Binance: ${connected ? 'подключен' : 'отключен'}`);
            });
            
            // Автоматически подключаемся
            await this.binanceAPI.start();
            console.log('✅ Binance WebSocket API запущен автоматически');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации Binance API:', error);
        }
    }
    
    handleRealPriceUpdate(prices) {
        // Цены обновляются в реальном времени, логика просчета происходит в update()
    }
    
    getStatus() {
        if (!this.binanceAPI) {
            return { connected: false, status: 'API не инициализирован' };
        }
        
        return this.binanceAPI.getStatus();
    }
    
    // Методы работы с системой сравнения
    initializeComparisonSystem() {
        if (!this.binanceAPI || this.comparisonSystem.initialized) {
            return;
        }
        
        const prices = this.binanceAPI.getGamePrices();
        const availablePrices = Object.keys(prices).length;
        
        if (availablePrices < this.cryptoNames.length) {
            // Ожидание данных о ценах
            return;
        }
        
        this.comparisonSystem.initialized = true;
        // Система сравнения готова
    }
    
    updateComparisonSystem() {
        if (!this.comparisonSystem.initialized || !this.binanceAPI) {
            return;
        }
        // Система сравнения обновляется автоматически через calculateUSDTEquivalentForCrypto
    }
    
    calculateComparisonHeight(cryptoIndex) {
        if (this.playerOnVolatile) {
            // Показываем эквивалент в USDT для каждой валюты (виртуальный P/L)
            return this.calculateUSDTEquivalentForCrypto(cryptoIndex);
        } else {
            // Игрок на USDT, все колонны показывают одинаковую высоту
            return this.walletValue;
        }
    }
    
    // Рассчитывает, сколько USDT получим, если "продадим" в эту валюту
    calculateUSDTEquivalentForCrypto(cryptoIndex) {
        if (!this.binanceAPI || !this.playerOnVolatile) {
            return this.walletValue;
        }
        
        const prices = this.binanceAPI.getGamePrices();
        const targetCryptoSymbol = this.cryptoNames[cryptoIndex];
        const targetPriceData = prices[targetCryptoSymbol];
        
        if (!targetPriceData || !targetPriceData.price) {
            return this.walletValue;
        }
        
        if (this.currentVolatileIndex === cryptoIndex) {
            // Это наша текущая позиция - показываем реальную стоимость
            return this.calculateUSDTFromCurrentCrypto();
        } else {
            // Виртуальная позиция - используем сохраненные данные из createVirtualPositions
            return this.calculateVirtualWallet(targetCryptoSymbol);
        }
    }
    
    getComparisonSystemInfo() {
        if (!this.comparisonSystem.initialized || !this.playerOnVolatile) {
            return null;
        }
        
        const activePosition = this.comparisonSystem.activePosition;
        if (!activePosition) return null;
        
        const currentValue = this.calculateUSDTFromCurrentCrypto();
        const initialWallet = this.marginPosition ? this.marginPosition.initialWallet : this.walletValue;
        
        // P/L рассчитываем относительно нашего вклада, а не размера позиции
        const profitLoss = currentValue - initialWallet;
        const percentChange = (profitLoss / initialWallet) * 100;
        
        return {
            activeSymbol: activePosition.symbol,
            activeAmount: activePosition.amount,
            buyPrice: activePosition.buyPrice,
            currentValue: currentValue,
            profitLoss: profitLoss,
            percentChange: percentChange,
            totalBudget: this.comparisonSystem.totalBudget,
            leverage: activePosition.leverage || 1
        };
    }
    
    // Методы управления плечом
    setLeverage(leverage) {
        if (this.availableLeverages.includes(leverage)) {
            this.leverage = leverage;
            console.log(`🎚️ Установлено плечо: x${leverage}`);
            return true;
        }
        return false;
    }
    
    getLeverage() {
        return this.leverage;
    }
    
    getAvailableLeverages() {
        return this.availableLeverages;
    }
    
    cycleLeverage() {
        const currentIndex = this.availableLeverages.indexOf(this.leverage);
        const nextIndex = (currentIndex + 1) % this.availableLeverages.length;
        this.leverage = this.availableLeverages[nextIndex];
        return this.leverage;
    }
    
    getWalletValue() {
        // Для отображения в UI возвращаем потенциальный баланс с учетом маржинальной торговли
        return this.getPotentialWalletDisplay();
    }
    
    // КРИТИЧЕСКИ ВАЖНЫЙ МЕТОД DRAW ДЛЯ ОТОБРАЖЕНИЯ ВСЕХ КОЛОНН
    draw() {
        // Закомментированы спам-логи для чистой консоли
        
        // Рисуем стабильную колонну (USDT)
        this.stableColumn.draw();
        
        // Рисуем все волатильные колонны
        if (this.volatileColumns.length === 0) {
            console.log(`❌❌❌ КРИТИЧЕСКАЯ ОШИБКА: volatileColumns пустой массив!`);
            return;
        }
        
        this.volatileColumns.forEach((column) => {            
            if (!column) {
                console.log(`❌ Колонна = null/undefined`);
                return;
            }
            
            try {
                column.draw();
            } catch (error) {
                console.log(`❌ ОШИБКА в draw() для ${column.cryptoName}:`, error);
            }
        });
        
        // Рисуем названия колонн
        this.drawColumnNames();
        
        // Рисуем крупный P/L активной позиции
        this.drawActiveProfitLoss();
        
    }
    
    calculateFixedColumnPositions() {
        // Центрируем группу из 5 колонн на экране
        const totalWidth = 4 * this.columnSpacing; // 4 промежутка между 5 колоннами
        const startX = (this.canvas.width - totalWidth) / 2;
        
        const positions = [];
        for (let i = 0; i < 5; i++) {
            positions.push(startX + i * this.columnSpacing);
        }
        
        return positions;
    }
    
    updateColumnPositions() {
        const positions = this.calculateFixedColumnPositions();
        
        // Обновляем позицию стабильной колонны
        this.stableColumn.x = positions[0];
        
        // Обновляем позиции волатильных колонн
        this.volatileColumns.forEach((column, index) => {
            column.x = positions[index + 1];
        });
        
    }
    
    drawColumnNames() {
        this.ctx.save();
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        
        // Рассчитываем позицию подписи - сразу под базовой линией колонн
        const baseY = this.canvas.height / 2 + 50; // Базовая линия колонн
        const nameY = baseY + 10; // 10px отступ под базовой линией
        
        // Название для стабильной колонны
        this.ctx.fillStyle = '#95A5A6';
        this.ctx.fillText('USDT', this.stableColumn.x, nameY);
        
        // Названия для волатильных колонн
        this.volatileColumns.forEach((column) => {
            this.ctx.fillStyle = '#95A5A6';
            this.ctx.fillText(column.cryptoName, column.x, nameY);
            
            // Рисуем мини-график под названием
            const chartY = nameY + 20; // 20px под названием
            const chartWidth = 60; // Ширина графика
            const chartHeight = 20; // Высота графика
            const chartX = column.x - chartWidth / 2; // Центрируем график
            
            this.drawMiniChart(column.cryptoName, chartX, chartY, chartWidth, chartHeight);
        });
        
        this.ctx.restore();
    }
    
    drawActiveProfitLoss() {
        // Показываем P/L только когда игрок на криптовалюте
        if (!this.playerOnVolatile || !this.marginPosition) {
            return;
        }
        
        // Рассчитываем P/L
        const currentWallet = this.getPotentialWalletDisplay();
        const initialWallet = this.marginPosition.initialWallet;
        const profitLoss = currentWallet - initialWallet;
        
        this.ctx.save();
        
        // Позиция по центру сверху над колоннами
        const centerX = this.canvas.width / 2;
        const topY = this.canvas.height / 2 - 300 / 2 - 80; // Над колоннами
        
        // Определяем цвет по P/L
        let textColor = '#FFFFFF'; // Нейтральный
        if (profitLoss > 0) {
            textColor = '#00FF41'; // Яркий зеленый
        } else if (profitLoss < 0) {
            textColor = '#FF4444'; // Яркий красный
        }
        
        // Добавляем тень для лучшей читаемости
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        // Крупный основной текст P/L в долларах
        this.ctx.font = 'bold 32px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = textColor;
        
        const sign = profitLoss >= 0 ? '+' : '';
        const profitLossText = `${sign}$${profitLoss.toFixed(2)}`;
        this.ctx.fillText(profitLossText, centerX, topY);
        
        // Проценты временно скрыты
        // this.ctx.font = 'bold 20px monospace';
        // const percentSign = percentChange >= 0 ? '+' : '';
        // const percentText = `(${percentSign}${percentChange.toFixed(2)}%)`;
        // this.ctx.fillText(percentText, centerX, topY + 35);
        
        this.ctx.restore();
    }
    
    // Выравнивает все криптоколонны по одной высоте (для визуального эффекта в момент перехода)
    alignCryptoColumnsHeight(height) {
        this.volatileColumns.forEach((column) => {
            column.setHeight(height);
        });
    }
    
    // Обновляет историю цен для мини-графиков
    updatePriceHistory() {
        if (!this.binanceAPI) return;
        
        const now = Date.now();
        if (now - this.lastHistoryUpdate < this.historyUpdateInterval) {
            return; // Еще рано обновлять
        }
        
        this.lastHistoryUpdate = now;
        const prices = this.binanceAPI.getGamePrices();
        
        this.cryptoNames.forEach((cryptoSymbol) => {
            const priceData = prices[cryptoSymbol];
            if (priceData && priceData.price) {
                // Инициализируем массив если нужно
                if (!this.priceHistory[cryptoSymbol]) {
                    this.priceHistory[cryptoSymbol] = [];
                    console.log(`📊 Инициализирована история для ${cryptoSymbol}`);
                }
                
                // Добавляем новую точку
                this.priceHistory[cryptoSymbol].push({
                    price: priceData.price,
                    timestamp: now
                });
                
                // console.log(`📈 ${cryptoSymbol}: добавлена точка $${priceData.price}, всего точек: ${this.priceHistory[cryptoSymbol].length}`);
                
                // Ограничиваем количество точек
                if (this.priceHistory[cryptoSymbol].length > this.maxHistoryPoints) {
                    this.priceHistory[cryptoSymbol].shift(); // Удаляем старую точку
                }
            }
        });
    }
    
    // Рисует мини-график для криптовалюты
    drawMiniChart(cryptoSymbol, x, y, width, height) {
        const history = this.priceHistory[cryptoSymbol];
        if (!history || history.length < 2) {
            return; // Недостаточно данных для графика
        }
        
        this.ctx.save();
        
        // Находим минимум и максимум для масштабирования
        const prices = history.map(point => point.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        
        if (priceRange === 0) {
            this.ctx.restore();
            return; // Нет изменений цены
        }
        
        // Определяем цвет линии (зеленый если растет, красный если падает)
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        const lineColor = lastPrice >= firstPrice ? '#00FF41' : '#FF4444';
        
        // Рисуем линию графика
        this.ctx.strokeStyle = lineColor;
        this.ctx.lineWidth = 1.5;
        this.ctx.globalAlpha = 0.8;
        
        this.ctx.beginPath();
        
        for (let i = 0; i < history.length; i++) {
            const price = history[i].price;
            const normalizedPrice = (price - minPrice) / priceRange;
            
            const pointX = x + (i / (history.length - 1)) * width;
            const pointY = y + height - (normalizedPrice * height); // Инвертируем Y
            
            if (i === 0) {
                this.ctx.moveTo(pointX, pointY);
            } else {
                this.ctx.lineTo(pointX, pointY);
            }
        }
        
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    // Загружает исторические данные из Binance REST API
    async loadHistoricalData() {
        console.log('📊 Загрузка исторических данных...');
        
        // Создаем маппинг символов для Binance API
        const binanceSymbols = {
            'BTC': 'BTCUSDT',
            'ETH': 'ETHUSDT',
            'ADA': 'ADAUSDT',
            'DOT': 'DOTUSDT'
        };
        
        try {
            for (const [cryptoName, binanceSymbol] of Object.entries(binanceSymbols)) {
                await this.loadSymbolHistory(cryptoName, binanceSymbol);
                // Небольшая задержка между запросами
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            console.log('✅ Исторические данные загружены');
        } catch (error) {
            console.warn('⚠️ Ошибка загрузки исторических данных:', error);
            // Создаем фиктивные данные если API недоступен
            this.createMockHistoricalData();
        }
    }
    
    // Загружает историю для одного символа
    async loadSymbolHistory(cryptoName, binanceSymbol) {
        const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=10s&limit=${this.maxHistoryPoints}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const klines = await response.json();
            this.priceHistory[cryptoName] = [];
            
            klines.forEach((kline, index) => {
                const closePrice = parseFloat(kline[4]); // Цена закрытия
                const timestamp = kline[6]; // Время закрытия
                
                this.priceHistory[cryptoName].push({
                    price: closePrice,
                    timestamp: timestamp
                });
            });
            
            console.log(`📈 ${cryptoName}: загружено ${this.priceHistory[cryptoName].length} точек`);
        } catch (error) {
            console.warn(`⚠️ Ошибка загрузки ${cryptoName}:`, error);
            // Создаем фиктивные данные для этого символа
            this.createMockDataForSymbol(cryptoName);
        }
    }
    
    // Создает фиктивные исторические данные если API недоступен
    createMockHistoricalData() {
        console.log('📊 Создание фиктивных исторических данных...');
        
        const mockPrices = {
            'BTC': 65000,
            'ETH': 3200,
            'ADA': 0.45,
            'DOT': 7.2
        };
        
        Object.entries(mockPrices).forEach(([cryptoName, basePrice]) => {
            this.createMockDataForSymbol(cryptoName, basePrice);
        });
    }
    
    // Создает фиктивные данные для одного символа
    createMockDataForSymbol(cryptoName, basePrice = null) {
        if (!basePrice) {
            const mockPrices = {
                'BTC': 65000,
                'ETH': 3200, 
                'ADA': 0.45,
                'DOT': 7.2
            };
            basePrice = mockPrices[cryptoName] || 1000;
        }
        
        this.priceHistory[cryptoName] = [];
        const now = Date.now();
        
        for (let i = 0; i < this.maxHistoryPoints; i++) {
            // Создаем случайные колебания ±2%
            const variation = (Math.random() - 0.5) * 0.04; // ±2%
            const price = basePrice * (1 + variation);
            
            this.priceHistory[cryptoName].push({
                price: price,
                timestamp: now - (this.maxHistoryPoints - i - 1) * 10000 // Интервал 10 секунд
            });
        }
        
        console.log(`📈 ${cryptoName}: создано ${this.maxHistoryPoints} фиктивных точек`);
    }
}