class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Игровые компоненты
        this.columnManager = new ColumnManager(this.canvas);
        this.player = new Player(this.canvas);
        this.uiManager = new UIManager();
        
        // Состояние игры
        this.gameState = 'waiting'; // 'waiting', 'jumping', 'calculating'
        this.lastFrameTime = Date.now();
        this.isRunning = false;
        
        // Состояние UI
        this.isHoveringLeverageIndicator = false;
        
        // Статистика
        this.stats = {
            totalJumps: 0,
            maxHeight: 100,
            startTime: Date.now(),
            startingWallet: 100 // Начальный кошелек для расчета процентов
        };
        
        this.init();
    }
    
    init() {
        // Настройка canvas
        this.setupCanvas();
        
        // Обработчики событий
        this.setupEventListeners();
        
        // Инициализация UI
        this.uiManager.updateStableColumnInfo(100, 0);
        this.uiManager.showWaitingState('stable');
        
        // Инициализируем отображение кнопки плеча с дефолтным значением x1000
        this.uiManager.updateLeverageDisplay(this.columnManager.getLeverage());
        
        // Подключение статуса Binance
        this.setupBinanceStatus();
        
        // Запуск игрового цикла
        this.start();
    }
    
    setupCanvas() {
        // Полноэкранный режим
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Отключаем сглаживание для четких пикселей
        this.ctx.imageSmoothingEnabled = false;
        
        // Обновляем позиции колонн после изменения размера canvas
        if (this.columnManager) {
            this.columnManager.updateColumnPositions();
        }
    }
    
    setupEventListeners() {
        // Клики по canvas
        this.canvas.addEventListener('click', (e) => {
            this.handleClick(e);
        });
        
        // Наведение мыши для hover эффектов
        this.canvas.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });
        
        // Адаптация под изменение размера окна
        window.addEventListener('resize', () => {
            this.setupCanvas();
        });
        
        // Обработка visibility API для паузы
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
    }
    
    handleClick(event) {
        if (this.gameState !== 'waiting') return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Проверяем, не кликнули ли мы в области UI элементов
        if (this.isClickInUIArea(x, y)) {
            return; // Игнорируем клики в области UI
        }
        
        // Определяем на какую колонну кликнули
        const targetInfo = this.columnManager.getColumnAt(x);
        
        if (targetInfo) {
            // Проверяем, не пытается ли игрок прыгнуть на ту же колонну
            const currentColumn = this.player.getCurrentColumn();
            const currentIndex = this.player.getCurrentIndex();
            
            if (targetInfo.type === currentColumn && targetInfo.index === currentIndex) {
                // Игрок пытается прыгнуть на ту же колонну - игнорируем
                return;
            }
            
            this.executeJump(targetInfo.type, targetInfo.index);
        }
    }
    
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Меняем курсор для игрового поля
        this.canvas.style.cursor = 'crosshair';
    }
    
    executeJump(targetColumnType, targetIndex = 0) {
        if (this.gameState !== 'waiting') return;
        
        this.gameState = 'jumping';
        this.uiManager.showJumpingState();
        
        // Определяем текущую колонну игрока
        const currentColumnType = this.player.getCurrentColumn();
        
        // Уведомляем ColumnManager о начале прыжка
        this.columnManager.onPlayerStartJump(currentColumnType);
        
        // Запускаем анимацию прыжка
        const targetColumn = this.columnManager.getColumn(targetColumnType, targetIndex);
        const jumpSuccess = this.player.startJump(targetColumnType, this.columnManager, targetIndex);
        
        if (jumpSuccess) {
            this.stats.totalJumps++;
            
            // Сохраняем информацию о цели и источнике для finishJump
            this.jumpTarget = { 
                type: targetColumnType, 
                index: targetIndex,
                fromType: currentColumnType,
                fromIndex: this.player.getCurrentIndex()
            };
            
            // Проверяем завершение прыжка каждые 100мс
            this.checkJumpCompletion();
        } else {
            // Если прыжок не удался, возвращаемся в состояние ожидания
            this.gameState = 'waiting';
            this.uiManager.showWaitingState(this.player.getCurrentColumn());
        }
    }
    
    checkJumpCompletion() {
        // Проверяем, завершился ли прыжок игрока
        if (!this.player.isCurrentlyJumping()) {
            this.finishJump();
        } else {
            // Если прыжок еще не завершился, проверяем через 100мс
            setTimeout(() => {
                this.checkJumpCompletion();
            }, 100);
        }
    }
    
    finishJump() {
        this.gameState = 'calculating';
        
        const targetType = this.jumpTarget.type;
        const targetIndex = this.jumpTarget.index;
        
        // Используем сохраненную информацию о том, откуда прыгаем
        const fromColumnType = this.jumpTarget.fromType;
        const fromColumnIndex = this.jumpTarget.fromIndex;
        
        // Обрабатываем результат прыжка ПЕРЕД тем как onPlayerLanded изменит состояние
        const jumpResult = this.columnManager.processJump(
            fromColumnType,
            targetType,
            targetIndex
        );
        
        // Теперь обновляем состояние игрока после обработки
        this.columnManager.onPlayerLanded(targetType, targetIndex);
        
        // Обновляем UI кошелька при любых результатах прыжка (включая промежуточные)
        if (jumpResult) {
            const currentWallet = this.columnManager.getWalletValue();
            const walletChange = this.stats.startingWallet ? 
                ((currentWallet - this.stats.startingWallet) / this.stats.startingWallet) * 100 : 0;
            
            this.uiManager.updateStableColumnInfo(currentWallet, walletChange);
            
            // Показываем обратную связь только для финальных транзакций (не промежуточных)
            if (!jumpResult.isIntermediate) {
                // Рассчитываем правильный P/L относительно исходного кошелька
                const initialWallet = this.stats.startingWallet;
                const profitLoss = currentWallet - initialWallet;
                const profitLossPercent = initialWallet > 0 ? (profitLoss / initialWallet) * 100 : 0;
                
                this.uiManager.showGrowthFeedback(
                    jumpResult.oldHeight,
                    jumpResult.newHeight,
                    profitLossPercent
                );
                
                // Проверяем достижения
                this.checkMilestones(jumpResult.newHeight);
            }
            
            // Обновляем статистику
            if (jumpResult.newHeight > this.stats.maxHeight) {
                this.stats.maxHeight = jumpResult.newHeight;
            }
        }
        
        // Возвращаемся в состояние ожидания
        setTimeout(() => {
            this.gameState = 'waiting';
            this.uiManager.showWaitingState(this.player.getCurrentColumn());
        }, 500);
    }
    
    checkMilestones(currentHeight) {
        const milestones = [200, 500, 1000, 2000, 5000, 10000];
        
        milestones.forEach(milestone => {
            if (currentHeight >= milestone && this.stats.maxHeight < milestone) {
                this.uiManager.showMilestone(`${milestone} достигнуто`);
            }
        });
    }
    
    update(deltaTime) {
        if (!this.isRunning) return;
        
        // Обновляем все игровые компоненты
        this.columnManager.update(deltaTime);
        this.player.update(deltaTime, this.columnManager);
        
        // Обновляем UI с информацией о системе сравнения
        const comparisonInfo = this.columnManager.getComparisonSystemInfo();
        if (comparisonInfo && this.gameState === 'waiting') {
            // Добавляем метод для получения текущей цены
            this.uiManager.getCurrentPrice = (symbol) => {
                const prices = this.columnManager.binanceAPI?.getGamePrices();
                return prices?.[symbol]?.price || null;
            };
            this.uiManager.updateComparisonDisplay(comparisonInfo);
        }
        
        // Дополнительная логика в зависимости от состояния
        switch (this.gameState) {
            case 'waiting':
                // Можно добавить дополнительную логику ожидания
                break;
            case 'jumping':
                // Логика во время прыжка
                break;
            case 'calculating':
                // Логика расчетов
                break;
        }
    }
    
    draw() {
        // Очищаем canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем игровые объекты
        this.columnManager.draw();
        this.player.draw();
        
        // Дополнительные визуальные эффекты
        this.drawBackground();
        this.drawDebugInfo();
    }
    
    drawBackground() {
        // Убираем сетку по просьбе пользователя
        // Оставляем чистый черный фон
    }
    
    drawScaleIndicator() {
        let maxVolatileHeight = 0;
        if (this.columnManager.volatileColumns && this.columnManager.volatileColumns.length > 0) {
            maxVolatileHeight = Math.max(...this.columnManager.volatileColumns.map(col => col.height));
        }
        
        const maxHeight = Math.max(
            this.columnManager.stableColumn.height,
            maxVolatileHeight
        );
        
        // Показываем индикатор масштаба только для больших значений
        if (maxHeight > 500) {
            this.ctx.save();
            
            // Позиция индикатора
            const x = this.canvas.width - 100;
            const y = 50;
            
            // Фон
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(x - 10, y - 5, 80, 25);
            
            // Текст
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('LOG SCALE', x + 30, y + 10);
            
            this.ctx.restore();
        }
    }
    
    
    isClickInUIArea(x, y) {
        // Область правого верхнего угла для UI элементов
        if (x >= this.canvas.width - 150 && y <= 120) {
            return true;
        }
        
        return false;
    }
    
    drawDebugInfo() {
        // Отображаем FPS и другую отладочную информацию в development режиме
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const fps = Math.round(1000 / (Date.now() - this.lastFrameTime));
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`FPS: ${fps}`, 10, this.canvas.height - 75);
            this.ctx.fillText(`Jumps: ${this.stats.totalJumps}`, 10, this.canvas.height - 60);
            this.ctx.fillText(`Max: ${this.stats.maxHeight.toFixed(1)}`, 10, this.canvas.height - 45);
            this.ctx.fillText(`State: ${this.gameState}`, 10, this.canvas.height - 30);
            this.ctx.fillText(`Leverage: x${this.columnManager.getLeverage()}`, 10, this.canvas.height - 15);
        }
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        
        // Ограничиваем deltaTime для стабильности
        const clampedDeltaTime = Math.min(deltaTime, 50);
        
        this.update(clampedDeltaTime);
        this.draw();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastFrameTime = Date.now();
        this.gameLoop();
        
        console.log('🎮 Игра запущена!');
    }
    
    pause() {
        this.isRunning = false;
        console.log('⏸ Игра приостановлена');
    }
    
    resume() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastFrameTime = Date.now();
        this.gameLoop();
        
        console.log('▶ Игра возобновлена');
    }
    
    reset() {
        // Сброс игры к начальному состоянию
        this.pause();
        
        this.columnManager = new ColumnManager(this.canvas);
        this.player = new Player(this.canvas);
        this.gameState = 'waiting';
        
        this.stats = {
            totalJumps: 0,
            maxHeight: 100,
            startTime: Date.now(),
            startingWallet: 100
        };
        
        this.uiManager.updateStableColumnInfo(100, 0);
        this.uiManager.showWaitingState('stable');
        
        this.start();
        
        console.log('🔄 Игра перезапущена');
    }
    
    // Методы для внешнего управления (например, для тестирования)
    getStats() {
        return {
            ...this.stats,
            currentHeight: this.columnManager.stableColumn?.height || 100,
            volatileHeight: this.columnManager.volatileColumns?.[0]?.height || 0,
            gameTime: Date.now() - this.stats.startTime
        };
    }
    
    setVolatilityLevel(level) {
        if (this.columnManager.volatilityEngine) {
            this.columnManager.volatilityEngine.impulseFactor = level;
        }
    }
    
    // Методы для работы со статусом Binance
    setupBinanceStatus() {
        // Проверяем статус каждые 2 секунды
        setInterval(() => {
            const status = this.columnManager.getStatus();
            this.uiManager.updateConnectionStatus(status.connected);
        }, 2000);
        
        // Устанавливаем начальный статус
        setTimeout(() => {
            const status = this.columnManager.getStatus();
            this.uiManager.updateConnectionStatus(status.connected);
        }, 1000);
    }
    
    // Статус API
    getBinanceStatus() {
        return this.columnManager.getStatus();
    }
}

// Инициализация игры когда DOM готов
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
    
    // Глобальные горячие клавиши для отладки
    document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyR' && e.ctrlKey) {
            e.preventDefault();
            window.game.reset();
        }
        if (e.code === 'KeyP' && e.ctrlKey) {
            e.preventDefault();
            if (window.game.isRunning) {
                window.game.pause();
            } else {
                window.game.resume();
            }
        }
    });
    
    console.log('🚀 Игра "Прыжки между колоннами" загружена!');
    console.log('Горячие клавиши: Ctrl+R - рестарт, Ctrl+P - пауза/возобновление');
});
