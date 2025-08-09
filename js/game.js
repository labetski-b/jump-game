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
        
        // Статистика
        this.stats = {
            totalJumps: 0,
            maxHeight: 100,
            startTime: Date.now()
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
        
        // Запуск игрового цикла
        this.start();
    }
    
    setupCanvas() {
        // Упрощенная настройка canvas без DPR пока
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Сглаживание
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }
    
    setupEventListeners() {
        // Клики по canvas
        this.canvas.addEventListener('click', (e) => {
            this.handleClick(e);
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
            fromType: this.player.getCurrentColumn(),
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
        
        // СНАЧАЛА обрабатываем результат прыжка (пока currentVolatileIndex еще правильный)
        const jumpResult = this.columnManager.processJump(
            fromColumnType,
            targetType,
            targetIndex
        );
        
        // ЗАТЕМ уведомляем ColumnManager о приземлении игрока (это обновит состояние колонн)
        this.columnManager.onPlayerLanded(targetType, targetIndex);
        
        // Обновляем UI если есть изменения (только для прыжков на стабильную)
        if (jumpResult) {
            // Показываем специальную обратную связь о росте
            this.uiManager.showGrowthFeedback(
                jumpResult.oldHeight,
                jumpResult.newHeight,
                jumpResult.percentChange
            );
            
            this.uiManager.updateStableColumnInfo(
                jumpResult.newHeight,
                jumpResult.percentChange
            );
            
            // Проверяем достижения
            this.checkMilestones(jumpResult.newHeight);
            
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
        this.ctx.fillStyle = '#1A1A1A';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем игровые объекты
        this.columnManager.draw();
        this.player.draw();
        
        // Дополнительные визуальные эффекты
        this.drawBackground();
        this.drawScaleIndicator();
        this.drawDebugInfo();
    }
    
    drawBackground() {
        // Тонкие вертикальные линии для атмосферы
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
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
    
    drawDebugInfo() {
        // Отображаем FPS и другую отладочную информацию в development режиме
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const fps = Math.round(1000 / (Date.now() - this.lastFrameTime));
            
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(`FPS: ${fps}`, 10, this.canvas.height - 60);
            this.ctx.fillText(`Jumps: ${this.stats.totalJumps}`, 10, this.canvas.height - 45);
            this.ctx.fillText(`Max: ${this.stats.maxHeight.toFixed(1)}`, 10, this.canvas.height - 30);
            this.ctx.fillText(`State: ${this.gameState}`, 10, this.canvas.height - 15);
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
            startTime: Date.now()
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
            currentHeight: this.columnManager.stableColumn.height,
            volatileHeight: this.columnManager.volatileColumn.height,
            gameTime: Date.now() - this.stats.startTime
        };
    }
    
    setVolatilityLevel(level) {
        this.columnManager.volatilityEngine.impulseFactor = level;
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
