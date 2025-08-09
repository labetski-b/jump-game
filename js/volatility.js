class VolatilityEngine {
    constructor() {
        this.time = 0;
        this.baseValue = 99.8;
        this.noiseScale = 0.003;
        this.impulseFactor = 0.02;
        this.trendDirection = 1;
        this.lastImpulseTime = 0;
        this.microTrendPhase = 0;
        
        // Параметры для плавности
        this.momentum = 0;
        this.volatilityLevel = 1.0;
    }
    
    update(deltaTime) {
        this.time += deltaTime;
        
        // Базовые колебания (улучшенный Perlin Noise)
        const noiseValue = this.smoothNoise(this.time * this.noiseScale);
        
        // Случайные импульсы (имитация событий)
        const impulse = this.generateImpulse(deltaTime);
        
        // Микротренды
        const microTrend = this.calculateMicroTrend(deltaTime);
        
        // Инерция для плавности
        this.momentum = this.momentum * 0.95 + (noiseValue * 0.3 + impulse * 0.5 + microTrend * 0.2) * 0.1;
        
        // Применяем изменение
        const change = this.momentum * this.impulseFactor * this.volatilityLevel;
        this.baseValue = Math.max(1, Math.min(10000, this.baseValue * (1 + change)));
        
        // Корректируем волатильность со временем
        this.adjustVolatility();
        
        return this.baseValue;
    }
    
    smoothNoise(x) {
        // Упрощенная версия Perlin Noise для плавных колебаний
        const i = Math.floor(x);
        const f = x - i;
        const u = this.fade(f);
        
        const a = this.pseudoRandom(i);
        const b = this.pseudoRandom(i + 1);
        
        return this.lerp(a, b, u);
    }
    
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    pseudoRandom(x) {
        const n = Math.sin(x * 12.9898) * 43758.5453;
        return (n - Math.floor(n)) * 2 - 1;
    }
    
    generateImpulse(deltaTime) {
        // Случайные импульсы каждые 2-8 секунд
        if (this.time - this.lastImpulseTime > 2000 + Math.random() * 6000) {
            this.lastImpulseTime = this.time;
            const intensity = (Math.random() - 0.5) * 2;
            return intensity * 0.1; // Силу импульса можно настроить
        }
        return 0;
    }
    
    calculateMicroTrend(deltaTime) {
        this.microTrendPhase += deltaTime * 0.0005;
        
        // Смена направления тренда
        if (Math.random() < 0.001) {
            this.trendDirection *= -1;
        }
        
        return Math.sin(this.microTrendPhase) * this.trendDirection * 0.3;
    }
    
    adjustVolatility() {
        // Адаптивная волатильность - меньше движения для очень больших значений
        const logValue = Math.log10(this.baseValue / 100);
        
        if (this.baseValue > 1000) {
            // Для очень больших значений снижаем волатильность
            this.volatilityLevel = 0.3 + (1 / Math.log10(this.baseValue / 100));
        } else if (this.baseValue > 500) {
            // Для больших значений умеренная волатильность
            this.volatilityLevel = 0.7;
        } else {
            // Для нормальных значений обычная волатильность
            this.volatilityLevel = 1.0;
        }
    }
    
    // Методы для внешнего управления
    addNewsImpact(intensity) {
        this.momentum += intensity * 0.2;
    }
    
    getCurrentValue() {
        return this.baseValue;
    }
    
    getCurrentTrend() {
        return this.momentum > 0 ? 'up' : 'down';
    }
}
