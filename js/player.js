class Player {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.radius = 10;
        this.currentColumn = 'stable';
        this.currentIndex = -1; // Для стабильной колонны используем -1
        // Позиция игрока на первой колонне (USDT) - фиксированное позиционирование
        const startX = canvas.width * 0.15; // 15% - та же позиция что и USDT колонна
        this.position = { x: startX, y: 100 };
        this.targetPosition = { x: startX, y: 100 };
        
        // Состояния анимации
        this.isJumping = false;
        this.jumpStartTime = 0;
        this.jumpDuration = 2000; // 2 секунды
        this.jumpPath = null;
        
        // Визуальные эффекты
        this.bouncePhase = 0;
        this.trailParticles = [];
    }
    
    update(deltaTime, columnManager) {
        // Обновляем позицию на основе текущей колонны
        if (!this.isJumping) {
            const columnIndex = this.currentColumn === 'stable' ? -1 : this.currentIndex;
            const column = columnManager.getColumn(this.currentColumn, columnIndex);
            this.targetPosition = column.getPlayerPosition();
            
            // Плавное следование за колонной
            this.position.x = this.targetPosition.x;
            this.position.y = this.targetPosition.y;
        } else {
            this.updateJumpAnimation(deltaTime, columnManager);
        }
        
        // Обновляем визуальные эффекты
        this.bouncePhase += deltaTime * 0.01;
        this.updateTrailParticles(deltaTime);
    }
    
    startJump(targetColumnType, columnManager, targetIndex = 0) {
        if (this.isJumping) return false;
        
        this.isJumping = true;
        this.jumpStartTime = Date.now();
        
        const fromPos = this.position;
        const toColumn = columnManager.getColumn(targetColumnType, targetIndex);
        const toPos = toColumn.getPlayerPosition();
        
        this.jumpPath = new JumpPath(fromPos, toPos, this.jumpDuration);
        this.targetColumnType = targetColumnType;
        this.targetIndex = targetIndex;
        
        // Создаем trail эффект
        this.createJumpTrail();
        
        return true;
    }
    
    updateJumpAnimation(deltaTime, columnManager) {
        const elapsed = Date.now() - this.jumpStartTime;
        const progress = Math.min(elapsed / this.jumpDuration, 1);
        
        if (progress >= 1) {
            // Прыжок завершен - приземляемся
            this.isJumping = false;
            this.jumpPath = null;
            
            // Обновляем текущую позицию игрока
            const oldColumn = this.currentColumn;
            const oldIndex = this.currentIndex;
            
            this.currentColumn = this.targetColumnType;
            this.currentIndex = this.targetIndex;
            
            // Состояние игрока обновляется в Game.finishJump()
        } else {
            this.position = this.jumpPath.getPosition(progress);
        }
    }
    
    draw() {
        this.ctx.save();
        
        // Рисуем trail частицы
        this.drawTrailParticles();
        
        // Основное тело игрока
        this.drawPlayerBody();
        
        // Дополнительные эффекты
        if (this.isJumping) {
            this.drawJumpEffects();
        }
        
        this.ctx.restore();
    }
    
    drawPlayerBody() {
        // Минимальный bounce эффект
        const bounceOffset = Math.sin(this.bouncePhase) * 1;
        const drawY = this.position.y + bounceOffset;
        
        // Определяем эмоцию игрока
        const emotion = this.getPlayerEmotion();
        
        // Рисуем смайлик
        this.ctx.save();
        this.ctx.font = 'bold 16px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = emotion.color;
        this.ctx.fillText(emotion.emoji, this.position.x, drawY);
        this.ctx.restore();
    }
    
    getPlayerEmotion() {
        // Получаем информацию о прибыли/убытке от игры
        if (window.game && window.game.columnManager) {
            const comparisonInfo = window.game.columnManager.getComparisonSystemInfo();
            
            if (comparisonInfo) {
                // Активная позиция - показываем эмоцию на основе P/L
                const profitLoss = comparisonInfo.profitLoss;
                
                if (profitLoss > 5) {
                    return { emoji: '😄', color: '#7ED321' }; // Очень доволен - muted green
                } else if (profitLoss > 1) {
                    return { emoji: '😊', color: '#5CB85C' }; // Доволен - softer green
                } else if (profitLoss > -1) {
                    return { emoji: '😐', color: '#95A5A6' }; // Нейтрален - muted gray
                } else if (profitLoss > -5) {
                    return { emoji: '😕', color: '#D9534F' }; // Расстроен - muted red
                } else {
                    return { emoji: '😭', color: '#C0392B' }; // Очень расстроен - darker muted red
                }
            } else {
                // На USDT - нейтральная эмоция
                const stableHeight = window.game.columnManager.stableColumn?.height || 100;
                
                if (stableHeight > 105) {
                    return { emoji: '😊', color: '#5CB85C' }; // Доволен ростом - muted green
                } else if (stableHeight < 95) {
                    return { emoji: '😕', color: '#D9534F' }; // Расстроен убытком - muted red
                } else {
                    return { emoji: '😐', color: '#95A5A6' }; // Нейтрален - muted gray
                }
            }
        }
        
        // Дефолтная эмоция
        return { emoji: '😐', color: '#95A5A6' };
    }
    
    drawJumpEffects() {
        // Динамические частицы во время прыжка
        if (this.jumpPath) {
            const progress = (Date.now() - this.jumpStartTime) / this.jumpDuration;
            
            // Пульсация во время прыжка
            this.ctx.strokeStyle = `rgba(126, 211, 33, ${1 - progress})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(this.position.x, this.position.y, this.radius + 5, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }
    
    createJumpTrail() {
        // Создаем частицы для trail эффекта
        for (let i = 0; i < 8; i++) {
            this.trailParticles.push({
                x: this.position.x + (Math.random() - 0.5) * 10,
                y: this.position.y + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 1.0,
                maxLife: 1.0,
                size: Math.random() * 3 + 1
            });
        }
    }
    
    updateTrailParticles(deltaTime) {
        // Добавляем новые частицы во время движения
        if (this.isJumping && Math.random() < 0.3) {
            this.trailParticles.push({
                x: this.position.x + (Math.random() - 0.5) * 8,
                y: this.position.y + (Math.random() - 0.5) * 8,
                vx: (Math.random() - 0.5) * 1,
                vy: (Math.random() - 0.5) * 1,
                life: 0.8,
                maxLife: 0.8,
                size: Math.random() * 2 + 1
            });
        }
        
        // Обновляем существующие частицы
        this.trailParticles = this.trailParticles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= deltaTime * 0.002;
            
            return particle.life > 0;
        });
    }
    
    drawTrailParticles() {
        this.trailParticles.forEach(particle => {
            const alpha = particle.life / particle.maxLife;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = '#7ED321';
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
    
    getCurrentColumn() {
        return this.currentColumn;
    }
    
    getCurrentIndex() {
        return this.currentIndex;
    }
    
    isCurrentlyJumping() {
        return this.isJumping;
    }
}

class JumpPath {
    constructor(startPos, endPos, duration) {
        this.startPos = startPos;
        this.endPos = endPos;
        this.duration = duration;
        
        // Высота дуги прыжка
        this.arcHeight = Math.max(50, Math.abs(endPos.y - startPos.y) + 80);
    }
    
    getPosition(progress) {
        // progress от 0 до 1
        const t = progress;
        
        // Линейная интерполяция по X
        const x = this.lerp(this.startPos.x, this.endPos.x, t);
        
        // Параболическая траектория по Y
        const baseY = this.lerp(this.startPos.y, this.endPos.y, t);
        const arcOffset = this.arcHeight * 4 * t * (1 - t); // Парабола
        const y = baseY - arcOffset;
        
        return { x, y };
    }
    
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
}
