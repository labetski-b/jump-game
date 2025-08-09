class Column {
    constructor(x, initialHeight, type, canvas) {
        this.x = x;
        this.height = initialHeight;
        this.type = type; // 'stable' или 'volatile'
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 80;
        this.animatedHeight = initialHeight;
        this.targetHeight = initialHeight;
        this.animationSpeed = 0.1;
        
        // Визуальные эффекты
        this.pulsePhase = 0;
        this.isHighlighted = false;
        this.particles = [];
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
        const baseY = this.canvas.height - 50; // Нижняя точка
        const columnHeight = this.getScaledHeight();
        const topY = baseY - columnHeight;
        
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
        
        this.ctx.restore();
    }
    
    drawColumnBody(topY, columnHeight) {
        const gradient = this.createGradient(topY, columnHeight);
        
        // Основная форма колонны
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(this.x - this.width/2, topY, this.width, columnHeight);
        
        // Пульсация для волатильной колонны
        if (this.type === 'volatile') {
            const pulseIntensity = Math.sin(this.pulsePhase) * 0.1 + 0.9;
            this.ctx.globalAlpha = pulseIntensity;
            this.ctx.fillRect(this.x - this.width/2, topY, this.width, columnHeight);
            this.ctx.globalAlpha = 1;
        }
        
        // Контур
        this.ctx.strokeStyle = this.type === 'stable' ? '#999999' : '#FF9800';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.x - this.width/2, topY, this.width, columnHeight);
    }
    
    createGradient(topY, columnHeight) {
        const gradient = this.ctx.createLinearGradient(0, topY, 0, topY + columnHeight);
        
        if (this.type === 'stable') {
            // Нейтральный серый градиент для стабильной колонны
            gradient.addColorStop(0, '#555555');
            gradient.addColorStop(1, '#777777');
        } else {
            // Зеленый/красный в зависимости от высоты относительно стабильной
            const isAboveStable = this.height > (this.stableColumnHeight || 100);
            
            if (isAboveStable) {
                // Зеленый градиент (выше стабильной)
                gradient.addColorStop(0, '#2E7D32');
                gradient.addColorStop(0.5, '#4CAF50');
                gradient.addColorStop(1, '#66BB6A');
            } else {
                // Красный градиент (ниже стабильной)
                gradient.addColorStop(0, '#C62828');
                gradient.addColorStop(0.5, '#F44336');
                gradient.addColorStop(1, '#EF5350');
            }
        }
        
        return gradient;
    }
    
    drawHighlight(topY, columnHeight) {
        this.ctx.strokeStyle = '#00FF41';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(this.x - this.width/2 - 5, topY - 5, this.width + 10, columnHeight + 10);
        this.ctx.setLineDash([]);
    }
    
    getScaledHeight() {
        const minHeight = 50;
        const maxHeight = this.canvas.height - 100;
        
        // Логарифмическое масштабирование для больших значений
        // Базовая высота 100 = 200px, растет логарифмически
        const baseHeight = 200;
        const logScale = Math.log10(this.animatedHeight / 100);
        const scaledHeight = baseHeight + (logScale * 100);
        
        return Math.max(minHeight, Math.min(maxHeight, scaledHeight));
    }
    
    getPlayerPosition() {
        const columnHeight = this.getScaledHeight();
        const topY = this.canvas.height - 50 - columnHeight;
        
        return {
            x: this.x,
            y: topY - 10 // Чуть выше верха колонны
        };
    }
    
    getCurrentTrend() {
        // Определяем тренд по недавним изменениям
        return this.targetHeight > this.height ? 'up' : 'down';
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
        const text = displayValue.toFixed(1);
        
        // Настройки текста
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Позиция текста (в центре колонны)
        const textX = this.x;
        const textY = topY + columnHeight / 2;
        
        // Цвет текста в зависимости от состояния
        const textColor = this.getTextColor();
        
        // Создаем прямоугольный фон для текста
        const textWidth = this.ctx.measureText(text).width;
        const padding = 8;
        const bgX = textX - textWidth/2 - padding;
        const bgY = textY - 12;
        const bgWidth = textWidth + padding * 2;
        const bgHeight = 24;
        
        // Полупрозрачный фон
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
        
        // Контур фона
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
        
        // Основной текст
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(text, textX, textY);
        
        // Показываем индикатор сжатия для больших значений
        if (this.animatedHeight > 500) {
            this.ctx.font = 'bold 10px Arial';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.fillText('LOG', textX, textY + 20);
        }
    }
    
    getDisplayValue() {
        // Эти значения будут обновляться от ColumnManager
        return this.displayValue || this.height;
    }
    
    getTextColor() {
        // Цвет в зависимости от состояния
        if (this.isVolatilityActive) {
            // Динамический цвет при активности
            const trend = this.getCurrentTrend();
            return trend === 'up' ? '#4CAF50' : '#FF4444';
        } else {
            // Статичный оранжевый
            return '#FF9800';
        }
    }
    
    setDisplayValue(value) {
        this.displayValue = value;
    }
    
    setVolatilityActive(active) {
        this.isVolatilityActive = active;
    }
    
    setStableColumnHeight(height) {
        this.stableColumnHeight = height;
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
        
        // Создаем стабильную колонну
        this.stableColumn = new Column(120, 100, 'stable', canvas);
        
        // Создаем 4 волатильные колонны с криптовалютами
        this.cryptoNames = ['BTC', 'ETH', 'ADA', 'DOT'];
        this.volatileColumns = [];
        this.volatilityEngines = [];
        
        for (let i = 0; i < 4; i++) {
            const x = 300 + i * 150; // Распределяем по ширине
            const column = new Column(x, 100, 'volatile', canvas);
            column.cryptoName = this.cryptoNames[i];
            this.volatileColumns.push(column);
            
            // Каждая колонна имеет свой движок волатильности
            const engine = new VolatilityEngine();
            // Настраиваем разную волатильность для каждой криптовалюты
            engine.impulseFactor = 0.015 + i * 0.005; // От 0.015 до 0.03
            engine.noiseScale = 0.002 + i * 0.001;    // Разная частота
            this.volatilityEngines.push(engine);
        }
        
        // Состояние волатильности
        this.isVolatilityActive = false;
        this.playerOnVolatile = false;
        this.currentVolatileIndex = -1; // Индекс текущей волатильной колонны
        this.walletValue = 100; // Текущее значение кошелька
    }
    
    update(deltaTime) {
        // Передаем высоту стабильной колонны во все волатильные для правильной покраски
        const stableHeight = this.stableColumn.height;
        this.volatileColumns.forEach(column => {
            column.setStableColumnHeight(stableHeight);
        });
        
        // Обновляем волатильные колонны ТОЛЬКО если волатильность активна
        if (this.isVolatilityActive) {
            this.volatileColumns.forEach((column, index) => {
                const newHeight = this.volatilityEngines[index].update(deltaTime);
                column.setHeight(newHeight);
            });
        }
        
        // Обновляем отображаемые значения на волатильных колоннах
        this.updateVolatileDisplay();
        
        // Обновляем анимации всех колонн
        this.stableColumn.update(deltaTime);
        this.volatileColumns.forEach(column => column.update(deltaTime));
    }
    
    updateVolatileDisplay() {
        this.volatileColumns.forEach((column, index) => {
            let displayValue;
            
            if (this.playerOnVolatile) {
                // Показываем текущую высоту каждой волатильной колонны
                displayValue = column.height;
            } else {
                // Показываем значение кошелька минус комиссия
                displayValue = this.walletValue * 0.998;
            }
            
            column.setDisplayValue(displayValue);
            column.setVolatilityActive(this.isVolatilityActive);
        });
    }
    
    draw() {
        this.stableColumn.draw();
        this.volatileColumns.forEach(column => column.draw());
        
        // Рисуем подписи криптовалют
        this.drawCryptoLabels();
    }
    
    processJump(fromColumn, toColumn, targetIndex = 0) {
        if (fromColumn === 'volatile') {
            // Прыжок с волатильной колонны
            if (this.currentVolatileIndex === -1 || !this.volatileColumns[this.currentVolatileIndex]) {
                console.error('❌ Неверный currentVolatileIndex:', this.currentVolatileIndex);
                return null;
            }
            
            const currentVolatileHeight = this.volatileColumns[this.currentVolatileIndex].height;
            
            if (toColumn === 'stable') {
                // Прыжок на стабильную - фиксируем кошелек
                const newStableHeight = currentVolatileHeight * 0.998;
                const oldStableHeight = this.stableColumn.height;
                
                this.stableColumn.setHeight(newStableHeight);
                this.walletValue = newStableHeight;
                this.playerOnVolatile = false;
                this.currentVolatileIndex = -1;
                
                // ВАЖНО: Сбрасываем все волатильные колонны к новой стабильной высоте
                this.resetAllVolatileColumns();
                
                return {
                    oldHeight: oldStableHeight,
                    newHeight: newStableHeight,
                    percentChange: ((newStableHeight - oldStableHeight) / oldStableHeight) * 100
                };
            } else {
                // Прыжок на другую волатильную - обновляем кошелек и все колонны
                this.walletValue = currentVolatileHeight * 0.998;
                this.currentVolatileIndex = targetIndex;
                this.resetAllVolatileColumns();
                
                return null;
            }
        } else {
            // Прыжок со стабильной на волатильную
            this.walletValue = this.stableColumn.height * 0.998;
            this.currentVolatileIndex = targetIndex;
            this.playerOnVolatile = true;
            this.resetAllVolatileColumns();
            
            return null;
        }
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
    
    resetAllVolatileColumns() {
        // Устанавливаем все волатильные колонны на значение кошелька
        this.volatileColumns.forEach((column, index) => {
            column.setHeight(this.walletValue);
            this.volatilityEngines[index].baseValue = this.walletValue;
        });
    }
    
    drawCryptoLabels() {
        this.canvas.getContext('2d').save();
        
        // Настройки текста
        this.canvas.getContext('2d').font = 'bold 14px Arial';
        this.canvas.getContext('2d').textAlign = 'center';
        this.canvas.getContext('2d').fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        // Рисуем подписи под каждой волатильной колонной
        this.volatileColumns.forEach((column, index) => {
            const labelY = this.canvas.height - 5;
            
            // Тень для читаемости
            this.canvas.getContext('2d').fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.canvas.getContext('2d').fillText(column.cryptoName, column.x + 1, labelY + 1);
            
            // Основной текст
            this.canvas.getContext('2d').fillStyle = '#FFD700'; // Золотой цвет
            this.canvas.getContext('2d').fillText(column.cryptoName, column.x, labelY);
        });
        
        // Подпись для стабильной колонны
        const stableLabelY = this.canvas.height - 5;
        this.canvas.getContext('2d').fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.canvas.getContext('2d').fillText('USDT', this.stableColumn.x + 1, stableLabelY + 1);
        
        this.canvas.getContext('2d').fillStyle = '#4CAF50';
        this.canvas.getContext('2d').fillText('USDT', this.stableColumn.x, stableLabelY);
        
        this.canvas.getContext('2d').restore();
    }
    
    // Методы для управления состоянием волатильности
    activateVolatility() {
        this.isVolatilityActive = true;

    }
    
    deactivateVolatility() {
        this.isVolatilityActive = false;

    }
    
    onPlayerLanded(columnType, columnIndex = -1) {
        if (columnType === 'volatile') {
            // Игрок приземлился на волатильную - активируем движение
            this.activateVolatility();
            this.currentVolatileIndex = columnIndex;
            this.playerOnVolatile = true;
            
            // Инициализируем все движки волатильности
            this.volatilityEngines.forEach((engine, index) => {
                engine.baseValue = this.volatileColumns[index].height;
            });
        } else if (columnType === 'stable') {
            // Игрок приземлился на стабильную - останавливаем движение
            this.deactivateVolatility();
            this.currentVolatileIndex = -1;
            this.playerOnVolatile = false;
        }
    }
    
    onPlayerStartJump(fromColumn) {
        // Если прыгает с волатильной, то волатильность продолжается до приземления
        if (fromColumn === 'volatile') {
            // Волатильность остается активной во время прыжка

        }
    }
}
