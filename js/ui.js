class UIManager {
    constructor() {
        this.stableHeightElement = document.getElementById('stableHeight');
        this.percentChangeElement = document.getElementById('percentChange');
        this.instructionsElement = document.getElementById('instructions');
        
        // Элемент статуса подключения
        this.connectionStatus = document.getElementById('connectionStatus');
        
        // Элементы управления плечом
        this.leverageButton = document.getElementById('leverageButton');
        this.setupLeverageControl();
        
        // Состояние UI
        this.lastStableHeight = 100.0;
        this.animationQueue = [];
    }
    
    updateStableColumnInfo(height, percentChange) {
        // Обновляем высоту с анимацией
        this.animateValue(this.stableHeightElement, this.lastStableHeight, height, 1000, (value) => {
            return value.toFixed(1);
        });
        
        // Обновляем процентное изменение
        this.updatePercentChange(percentChange);
        
        this.lastStableHeight = height;
    }
    
    updatePercentChange(percentChange) {
        const element = this.percentChangeElement;
        const formattedPercent = (percentChange >= 0 ? '+' : '') + percentChange.toFixed(2) + '%';
        
        // Анимация появления
        element.style.transform = 'scale(0.8)';
        element.style.opacity = '0.5';
        
        setTimeout(() => {
            element.textContent = formattedPercent;
            
            // Цветовая кодировка
            element.classList.remove('positive', 'negative');
            if (percentChange > 0) {
                element.classList.add('positive');
                this.createSuccessEffect();
            } else if (percentChange < 0) {
                element.classList.add('negative');
                this.createLossEffect();
            }
            
            // Анимация появления
            element.style.transform = 'scale(1)';
            element.style.opacity = '1';
            
            // Добавляем pulse эффект для значительных изменений
            if (Math.abs(percentChange) > 5) {
                element.classList.add('pulse');
                setTimeout(() => {
                    element.classList.remove('pulse');
                }, 500);
            }
        }, 100);
    }
    
    showGrowthFeedback(oldHeight, newHeight, percentChange) {
        // Рассчитываем правильный P/L относительно исходного депозита (100 USDT)
        const initialDeposit = 100; // Исходный депозит
        const profitLoss = newHeight - initialDeposit;
        const profitLossText = (profitLoss >= 0 ? '+' : '') + profitLoss.toFixed(1);
        
        // Создаем всплывающий элемент с информацией о росте
        const feedbackElement = document.createElement('div');
        feedbackElement.style.position = 'absolute';
        feedbackElement.style.top = '120px';
        feedbackElement.style.left = '50%';
        feedbackElement.style.transform = 'translateX(-50%)';
        feedbackElement.style.background = percentChange >= 0 ? 'rgba(126, 211, 33, 0.9)' : 'rgba(217, 83, 79, 0.9)';
        feedbackElement.style.color = 'white';
        feedbackElement.style.padding = '12px 20px';
        feedbackElement.style.borderRadius = '8px';
        feedbackElement.style.fontSize = '16px';
        feedbackElement.style.fontWeight = 'bold';
        feedbackElement.style.textAlign = 'center';
        feedbackElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        feedbackElement.style.zIndex = '1000';
        feedbackElement.style.animation = 'growthFeedback 3s ease-out forwards';
        feedbackElement.style.pointerEvents = 'none';
        
        feedbackElement.innerHTML = `
            <div style="font-size: 18px; margin-bottom: 4px;">
                ${newHeight.toFixed(1)} USDT
            </div>
            <div style="font-size: 14px; opacity: 0.9;">
                ${profitLossText} (${(percentChange >= 0 ? '+' : '') + percentChange.toFixed(2)}%)
            </div>
        `;
        
        document.getElementById('ui').appendChild(feedbackElement);
        
        // Убираем элемент через 3 секунды
        setTimeout(() => {
            if (feedbackElement.parentNode) {
                feedbackElement.parentNode.removeChild(feedbackElement);
            }
        }, 3000);
        
        // Добавляем CSS анимацию если её нет
        this.ensureGrowthFeedbackAnimation();
    }
    
    updateInstructions(text) {
        this.instructionsElement.textContent = text;
    }
    
    showJumpingState() {
        // Скрываем инструкции во время прыжка
        this.instructionsElement.style.display = 'none';
        
        // Визуальная обратная связь о состоянии прыжка
        this.percentChangeElement.style.opacity = '0.5';
    }
    
    showWaitingState(currentColumn) {
        // Скрываем инструкции по просьбе пользователя
        this.instructionsElement.style.display = 'none';
        this.percentChangeElement.style.opacity = '1';
    }
    
    // Обновление статуса подключения к Binance
    updateConnectionStatus(connected, details = '') {
        if (!this.connectionStatus) return;
        
        if (connected) {
            this.connectionStatus.textContent = '🟢 Binance подключен';
            this.connectionStatus.className = 'price-status active';
        } else {
            this.connectionStatus.textContent = '🔴 Подключение...';
            this.connectionStatus.className = 'price-status error';
        }
        
        if (details) {
            this.connectionStatus.title = details;
        }
    }
    
    animateValue(element, startValue, endValue, duration, formatter) {
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing функция для плавности
            const easedProgress = this.easeOutCubic(progress);
            const currentValue = startValue + (endValue - startValue) * easedProgress;
            
            element.textContent = formatter(currentValue);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    createSuccessEffect() {
        // Создаем временный элемент для эффекта успеха
        const effect = document.createElement('div');
        effect.style.position = 'absolute';
        effect.style.top = '20px';
        effect.style.right = '20px';
        effect.style.color = '#7ED321';
        effect.style.fontSize = '24px';
        effect.style.fontWeight = 'bold';
        effect.style.textShadow = '0 0 10px rgba(126, 211, 33, 0.8)';
        effect.style.animation = 'fadeInOut 2s ease-out forwards';
        effect.textContent = '↗ ПРИБЫЛЬ!';
        effect.style.pointerEvents = 'none';
        
        document.getElementById('ui').appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 2000);
        
        // Добавляем CSS анимацию, если её нет
        this.ensureFadeInOutAnimation();
    }
    
    createLossEffect() {
        // Эффект тряски для убытков
        const gameContainer = document.getElementById('gameContainer');
        gameContainer.classList.add('shake');
        
        setTimeout(() => {
            gameContainer.classList.remove('shake');
        }, 500);
        
        // Создаем текстовый эффект убытка
        const effect = document.createElement('div');
        effect.style.position = 'absolute';
        effect.style.top = '20px';
        effect.style.right = '20px';
        effect.style.color = '#D9534F';
        effect.style.fontSize = '24px';
        effect.style.fontWeight = 'bold';
        effect.style.textShadow = '0 0 10px rgba(217, 83, 79, 0.8)';
        effect.style.animation = 'fadeInOut 2s ease-out forwards';
        effect.textContent = '↘ УБЫТОК!';
        effect.style.pointerEvents = 'none';
        
        document.getElementById('ui').appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 2000);
    }
    
    ensureFadeInOutAnimation() {
        // Проверяем, есть ли уже такая анимация
        const existingStyle = document.getElementById('fadeInOutAnimation');
        if (existingStyle) return;
        
        const style = document.createElement('style');
        style.id = 'fadeInOutAnimation';
        style.textContent = `
            @keyframes fadeInOut {
                0% {
                    opacity: 0;
                    transform: translateY(-20px) scale(0.8);
                }
                20% {
                    opacity: 1;
                    transform: translateY(0) scale(1.1);
                }
                80% {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-10px) scale(0.9);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Дополнительные методы для расширенной обратной связи
    showMilestone(milestone) {
        const effect = document.createElement('div');
        effect.style.position = 'absolute';
        effect.style.top = '50%';
        effect.style.left = '50%';
        effect.style.transform = 'translate(-50%, -50%)';
        effect.style.color = '#F39C12';
        effect.style.fontSize = '32px';
        effect.style.fontWeight = 'bold';
        effect.style.textShadow = '0 0 20px rgba(243, 156, 18, 0.8)';
        effect.style.animation = 'milestoneAnimation 3s ease-out forwards';
        effect.textContent = `🎉 ${milestone}!`;
        effect.style.pointerEvents = 'none';
        effect.style.zIndex = '1000';
        
        document.getElementById('ui').appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 3000);
        
        this.ensureMilestoneAnimation();
    }
    
    ensureMilestoneAnimation() {
        const existingStyle = document.getElementById('milestoneAnimation');
        if (existingStyle) return;
        
        const style = document.createElement('style');
        style.id = 'milestoneAnimation';
        style.textContent = `
            @keyframes milestoneAnimation {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.3);
                }
                10% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.2);
                }
                90% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    ensureGrowthFeedbackAnimation() {
        const existingStyle = document.getElementById('growthFeedbackAnimation');
        if (existingStyle) return;
        
        const style = document.createElement('style');
        style.id = 'growthFeedbackAnimation';
        style.textContent = `
            @keyframes growthFeedback {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px) scale(0.8);
                }
                15% {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0px) scale(1.1);
                }
                85% {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0px) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-10px) scale(0.9);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Обновление информации о системе сравнения
    updateComparisonDisplay(comparisonInfo) {
        if (!comparisonInfo) return;
        
        // Создаем элемент для отображения сравнения, если его нет
        let comparisonElement = document.getElementById('comparisonInfo');
        if (!comparisonElement) {
            comparisonElement = document.createElement('div');
            comparisonElement.id = 'comparisonInfo';
            comparisonElement.style.position = 'absolute';
            comparisonElement.style.top = '120px'; // Увеличено для избежания слипания
            comparisonElement.style.left = '20px';
            comparisonElement.style.background = 'rgba(0, 0, 0, 0.8)';
            comparisonElement.style.color = '#FFFFFF';
            comparisonElement.style.padding = '12px';
            comparisonElement.style.fontSize = '12px';
            comparisonElement.style.fontFamily = 'JetBrains Mono, monospace';
            comparisonElement.style.zIndex = '1000';
            comparisonElement.style.border = '1px solid #333333';
            comparisonElement.style.lineHeight = '1.4';
            document.getElementById('ui').appendChild(comparisonElement);
        }
        
        // Получаем текущую цену от game
        const currentPrice = this.getCurrentPrice ? this.getCurrentPrice(comparisonInfo.activeSymbol) : null;
        
        // Форматируем информацию о сравнении
        const changeColor = comparisonInfo.profitLoss >= 0 ? '#7ED321' : '#D9534F';
        
        // Получаем данные о маржинальной позиции
        const marginInfo = window.game?.columnManager?.marginPosition;
        const leverage = comparisonInfo.leverage || 1;
        const ownMoney = marginInfo ? marginInfo.initialWallet : comparisonInfo.totalBudget;
        const borrowedMoney = marginInfo ? marginInfo.positionSize - ownMoney : 0;
        
        comparisonElement.innerHTML = `
            <div style="color: #666666; margin-bottom: 6px; font-size: 9px; text-transform: uppercase;">ACTIVE POSITION</div>
            <div style="color: #FFA500; font-weight: bold;">Плечо: x${leverage}</div>
            <div>${comparisonInfo.activeSymbol}: ${comparisonInfo.activeAmount.toFixed(6)}</div>
            <div>Buy: $${comparisonInfo.buyPrice.toFixed(2)}</div>
            ${currentPrice ? `<div>Now: $${currentPrice.toFixed(2)}</div>` : ''}
            <div style="margin-top: 6px; border-top: 1px solid #444; padding-top: 4px;">
                <div style="color: #888; font-size: 11px;">ФИНАНСИРОВАНИЕ:</div>
                <div>Свои: $${ownMoney.toFixed(2)}</div>
                ${leverage > 1 ? `<div>Займ: $${borrowedMoney.toFixed(2)}</div>` : ''}
                <div>Позиция: $${comparisonInfo.totalBudget.toFixed(2)}</div>
            </div>
            <div style="margin-top: 4px;">
                <div>Стоимость: $${comparisonInfo.currentValue.toFixed(2)}</div>
                <div style="color: ${changeColor};">
                    P/L: ${comparisonInfo.profitLoss >= 0 ? '+' : ''}$${comparisonInfo.profitLoss.toFixed(2)} 
                    (${comparisonInfo.percentChange >= 0 ? '+' : ''}${comparisonInfo.percentChange.toFixed(1)}%)
                </div>
            </div>
        `;
    }
    
    // Методы управления плечом
    setupLeverageControl() {
        if (!this.leverageButton) return;
        
        this.leverageButton.addEventListener('click', () => {
            if (window.game && window.game.columnManager) {
                const newLeverage = window.game.columnManager.cycleLeverage();
                this.updateLeverageDisplay(newLeverage);
            }
        });
    }
    
    updateLeverageDisplay(leverage) {
        if (!this.leverageButton) return;
        
        this.leverageButton.textContent = `x${leverage}`;
        
        // Удаляем все классы плеча
        this.leverageButton.classList.remove('x10', 'x100', 'x500', 'x1000');
        
        // Добавляем соответствующий класс
        if (leverage === 10) {
            this.leverageButton.classList.add('x10');
        } else if (leverage === 100) {
            this.leverageButton.classList.add('x100');
        } else if (leverage === 500) {
            this.leverageButton.classList.add('x500');
        } else if (leverage === 1000) {
            this.leverageButton.classList.add('x1000');
        }
    }
}