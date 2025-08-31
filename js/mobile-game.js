class MobileGame extends Game {
    constructor() {
        // Добавляем класс body для мобильных стилей
        document.body.classList.add('mobile');
        
        super();
        
        // Мобильные элементы UI
        this.mobileWallet = document.getElementById('mobileWallet');
        this.mobilePnL = document.getElementById('mobilePnL');
        this.mobileLeverage = document.getElementById('mobileLeverage');
        this.mobileConnectionStatus = document.getElementById('mobileConnectionStatus');
        this.positionModal = document.getElementById('positionModal');
        
        // Настройка мобильного интерфейса
        this.setupMobileControls();
        this.setupMobileUI();
        this.setupSwipeGestures();
        
        // Адаптируем canvas под мобильный размер
        this.adaptCanvasForMobile();
        
        console.log('📱 Мобильная версия инициализирована');
    }
    
    setupCanvas() {
        // Адаптированная настройка canvas для мобильных
        const gameArea = document.querySelector('.game-area');
        const rect = gameArea.getBoundingClientRect();
        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Отключаем сглаживание для четких пикселей
        this.ctx.imageSmoothingEnabled = false;
        
        // Обновляем позиции колонн для мобильного размера
        if (this.columnManager) {
            this.columnManager.updateColumnPositions();
        }
    }
    
    adaptCanvasForMobile() {
        // Уменьшаем количество колонн или их размер для мобильного
        if (this.columnManager) {
            this.columnManager.columnSpacing = 80; // Меньше расстояние между колоннами
            this.columnManager.updateColumnPositions();
        }
    }
    
    setupMobileControls() {
        // Touch-события для кнопок криптовалют
        document.querySelectorAll('.crypto-btn').forEach((btn, index) => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleCryptoButtonTap(btn, index);
            });
            
            // Также поддерживаем клики для тестирования в браузере
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleCryptoButtonTap(btn, index);
            });
        });
        
        // Кнопка плеча
        this.mobileLeverage.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleLeverageButtonTap();
        });
        
        this.mobileLeverage.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLeverageButtonTap();
        });
        
        // Закрытие модального окна
        const closeBtn = document.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.hidePositionModal();
            });
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.hidePositionModal();
            });
        }
    }
    
    handleCryptoButtonTap(button, index) {
        if (this.gameState !== 'waiting') return;
        
        const cryptoType = button.dataset.crypto;
        
        if (cryptoType === 'usdt') {
            // USDT кнопка
            this.executeJump('stable', 0);
        } else {
            // Криптовалютная кнопка
            const cryptoIndex = parseInt(cryptoType);
            this.executeJump('volatile', cryptoIndex);
        }
        
        // Визуальная обратная связь
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }
    
    handleLeverageButtonTap() {
        if (this.columnManager) {
            const newLeverage = this.columnManager.cycleLeverage();
            this.updateMobileLeverageDisplay(newLeverage);
        }
    }
    
    setupSwipeGestures() {
        let startY = 0;
        let startX = 0;
        
        this.canvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            startY = touch.clientY;
            startX = touch.clientX;
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0];
            const endY = touch.clientY;
            const endX = touch.clientX;
            
            const diffY = startY - endY;
            const diffX = Math.abs(startX - endX);
            
            // Проверяем что это вертикальный свайп
            if (Math.abs(diffY) > 50 && diffX < 100) {
                if (diffY > 0 && this.columnManager.playerOnVolatile) {
                    // Свайп вверх - показать детали позиции
                    this.showPositionModal();
                } else if (diffY < 0) {
                    // Свайп вниз - скрыть детали
                    this.hidePositionModal();
                }
            }
        });
        
        // Закрытие модального окна по свайпу вниз
        this.positionModal.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
        });
        
        this.positionModal.addEventListener('touchend', (e) => {
            const endY = e.changedTouches[0].clientY;
            const diff = endY - startY;
            
            if (diff > 100) {
                this.hidePositionModal();
            }
        });
    }
    
    update(deltaTime) {
        // Вызываем родительский update
        super.update(deltaTime);
        
        // Обновляем мобильный UI
        this.updateMobileUI();
    }
    
    updateMobileUI() {
        // Обновляем баланс кошелька
        const walletValue = this.columnManager.getWalletValue();
        this.mobileWallet.textContent = `$${walletValue.toFixed(1)}`;
        
        // Обновляем P/L дисплей
        if (this.columnManager.playerOnVolatile && this.columnManager.marginPosition) {
            const currentWallet = this.columnManager.getPotentialWalletDisplay();
            const initialWallet = this.columnManager.marginPosition.initialWallet;
            const profitLoss = currentWallet - initialWallet;
            
            const sign = profitLoss >= 0 ? '+' : '';
            this.mobilePnL.textContent = `${sign}$${profitLoss.toFixed(2)}`;
            this.mobilePnL.className = 'pnl-display ' + (profitLoss >= 0 ? 'positive' : 'negative');
        } else {
            this.mobilePnL.textContent = '$0.00';
            this.mobilePnL.className = 'pnl-display';
        }
        
        // Обновляем кнопки состоянием
        this.updateCryptoButtons();
        
        // Обновляем статус подключения
        this.updateMobileConnectionStatus();
        
        // Обновляем мини-графики в кнопках
        this.updateButtonCharts();
    }
    
    updateCryptoButtons() {
        document.querySelectorAll('.crypto-btn').forEach((btn, index) => {
            const cryptoType = btn.dataset.crypto;
            
            if (cryptoType === 'usdt') {
                // USDT кнопка
                btn.classList.toggle('active', !this.columnManager.playerOnVolatile);
                const usdtInfo = btn.querySelector('.crypto-info');
                if (usdtInfo) {
                    const potentialValue = this.columnManager.getPotentialWalletDisplay();
                    usdtInfo.textContent = `$${potentialValue.toFixed(1)}`;
                }
            } else {
                // Криптовалютные кнопки
                const cryptoIndex = parseInt(cryptoType);
                const isActive = this.columnManager.playerOnVolatile && 
                               this.columnManager.currentVolatileIndex === cryptoIndex;
                
                btn.classList.toggle('active', isActive);
                
                const info = btn.querySelector('.crypto-info');
                if (info) {
                    if (!this.columnManager.playerOnVolatile) {
                        info.textContent = 'Купить';
                    } else if (isActive) {
                        info.textContent = 'Продать';
                    } else {
                        // Показываем виртуальный P/L в процентах
                        const potentialValue = this.columnManager.calculateUSDTEquivalentForCrypto(cryptoIndex);
                        const initialWallet = this.columnManager.marginPosition ? 
                            this.columnManager.marginPosition.initialWallet : this.columnManager.walletValue;
                        const profitLoss = potentialValue - initialWallet;
                        const percentChange = initialWallet > 0 ? (profitLoss / initialWallet) * 100 : 0;
                        
                        const sign = percentChange >= 0 ? '+' : '';
                        info.textContent = `${sign}${percentChange.toFixed(1)}%`;
                    }
                }
            }
        });
    }
    
    updateMobileLeverageDisplay(leverage) {
        this.mobileLeverage.textContent = `x${leverage}`;
        
        // Обновляем цвет кнопки в зависимости от плеча
        this.mobileLeverage.className = 'leverage-btn';
        if (leverage >= 1000) {
            this.mobileLeverage.style.background = '#E74C3C';
            this.mobileLeverage.style.borderColor = '#C0392B';
        } else if (leverage >= 500) {
            this.mobileLeverage.style.background = '#9B59B6';
            this.mobileLeverage.style.borderColor = '#8E44AD';
        } else if (leverage >= 100) {
            this.mobileLeverage.style.background = '#FF4444';
            this.mobileLeverage.style.borderColor = '#FF6B6B';
        } else if (leverage >= 10) {
            this.mobileLeverage.style.background = '#F39C12';
            this.mobileLeverage.style.borderColor = '#E67E22';
        } else {
            this.mobileLeverage.style.background = '#95A5A6';
            this.mobileLeverage.style.borderColor = '#7F8C8D';
        }
    }
    
    updateMobileConnectionStatus() {
        const status = this.columnManager.getStatus();
        this.mobileConnectionStatus.textContent = status.connected ? 
            '🟢 Binance подключен' : '🔴 Подключение...';
        this.mobileConnectionStatus.className = 'status-indicator ' + 
            (status.connected ? 'connected' : '');
    }
    
    updateButtonCharts() {
        document.querySelectorAll('.crypto-btn .mini-chart').forEach((canvas, index) => {
            const cryptoName = this.columnManager.cryptoNames[index];
            this.drawButtonMiniChart(canvas, cryptoName);
        });
    }
    
    drawButtonMiniChart(canvas, cryptoSymbol) {
        const ctx = canvas.getContext('2d');
        const history = this.columnManager.priceHistory[cryptoSymbol];
        
        if (!history || history.length < 2) {
            return; // Недостаточно данных
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Находим минимум и максимум для масштабирования
        const prices = history.map(point => point.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice;
        
        if (priceRange === 0) return;
        
        // Определяем цвет линии
        const firstPrice = prices[0];
        const lastPrice = prices[prices.length - 1];
        const lineColor = lastPrice >= firstPrice ? '#00FF41' : '#FF4444';
        
        // Рисуем линию графика
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.8;
        
        ctx.beginPath();
        
        for (let i = 0; i < history.length; i++) {
            const price = history[i].price;
            const normalizedPrice = (price - minPrice) / priceRange;
            
            const x = (i / (history.length - 1)) * canvas.width;
            const y = canvas.height - (normalizedPrice * canvas.height);
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    
    showPositionModal() {
        if (!this.columnManager.playerOnVolatile) return;
        
        // Обновляем содержимое модального окна
        this.updatePositionModalContent();
        
        // Показываем модальное окно
        this.positionModal.classList.add('visible');
    }
    
    hidePositionModal() {
        this.positionModal.classList.remove('visible');
    }
    
    updatePositionModalContent() {
        const detailsDiv = document.getElementById('positionDetails');
        const comparisonInfo = this.columnManager.getComparisonSystemInfo();
        
        if (!comparisonInfo) {
            detailsDiv.innerHTML = '<p>Нет активной позиции</p>';
            return;
        }
        
        const marginInfo = this.columnManager.marginPosition;
        const leverage = comparisonInfo.leverage || 1;
        const ownMoney = marginInfo ? marginInfo.initialWallet : comparisonInfo.totalBudget;
        const borrowedMoney = marginInfo ? marginInfo.positionSize - ownMoney : 0;
        
        detailsDiv.innerHTML = `
            <div style="margin-bottom: 15px;">
                <strong>Плечо:</strong> x${leverage}<br>
                <strong>${comparisonInfo.activeSymbol}:</strong> ${comparisonInfo.activeAmount.toFixed(6)}<br>
                <strong>Цена покупки:</strong> $${comparisonInfo.buyPrice.toFixed(2)}
            </div>
            
            <div style="margin-bottom: 15px; padding-top: 15px; border-top: 1px solid #444;">
                <h4 style="margin: 0 0 10px 0; color: #888; font-size: 14px;">ФИНАНСИРОВАНИЕ:</h4>
                <strong>Свои деньги:</strong> $${ownMoney.toFixed(2)}<br>
                ${leverage > 1 ? `<strong>Заемные:</strong> $${borrowedMoney.toFixed(2)}<br>` : ''}
                <strong>Размер позиции:</strong> $${comparisonInfo.totalBudget.toFixed(2)}
            </div>
            
            <div style="padding-top: 15px; border-top: 1px solid #444;">
                <strong>Текущая стоимость:</strong> $${comparisonInfo.currentValue.toFixed(2)}<br>
                <strong style="color: ${comparisonInfo.profitLoss >= 0 ? '#00FF41' : '#FF4444'}">
                    P/L: ${comparisonInfo.profitLoss >= 0 ? '+' : ''}$${comparisonInfo.profitLoss.toFixed(2)} 
                    (${comparisonInfo.percentChange >= 0 ? '+' : ''}${comparisonInfo.percentChange.toFixed(2)}%)
                </strong>
            </div>
        `;
    }
    
    // Переопределяем обработчик кликов для мобильной версии
    handleClick(event) {
        // В мобильной версии клики по canvas отключены
        // Используем только кнопки
        return;
    }
    
    // Инициализация мобильного плеча
    init() {
        super.init();
        this.updateMobileLeverageDisplay(this.columnManager.getLeverage());
    }
}

// Определение мобильного устройства
function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth < 768;
}

// Автоматическое перенаправление с десктопной версии
if (isMobileDevice() && !window.location.pathname.includes('mobile.html')) {
    window.location.href = 'mobile.html';
}