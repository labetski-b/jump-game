# 🏗️ Crypto Jump Trading - Архитектура проекта

## 📁 Структура файлов

```
/Users/labetsky/Desktop/AI_tests/jump/
├── index.html              # Главная страница
├── styles.css              # CSS стили  
├── GAME_GUIDE.md           # Руководство по игре
├── ARCHITECTURE.md         # Техническая документация
└── js/
    ├── game.js             # Основной игровой движок
    ├── columns.js          # Логика колонн и торговли
    ├── player.js           # Игрок и анимации прыжков
    ├── ui.js               # Пользовательский интерфейс
    └── binance-api.js      # Интеграция с Binance WebSocket API
```

## 🔧 Архитектура классов

### Game (game.js) - Главный контроллер
**Ответственность:** Координация всех компонентов, игровой цикл, обработка событий

**Ключевые свойства:**
- `gameState`: 'waiting' | 'jumping' | 'calculating'
- `columnManager`: ColumnManager
- `player`: Player  
- `uiManager`: UIManager
- `canvas`: HTML5 Canvas element

**Ключевые методы:**
- `gameLoop()`: основной цикл отрисовки (requestAnimationFrame)
- `handleClick(event)`: обработка кликов по колоннам
- `executeJump(targetType, targetIndex)`: выполнение прыжка
- `setupCanvas()`: настройка полноэкранного Canvas

### ColumnManager (columns.js) - Логика торговли  
**Ответственность:** Управление колоннами, торговые операции, интеграция с Binance API

**Ключевые свойства:**
- `stableColumn`: Column (USDT)
- `volatileColumns`: Column[] (BTC, ETH, ADA, DOT)
- `binanceAPI`: BinanceWebSocketAPI
- `playerOnVolatile`: boolean
- `currentVolatileIndex`: number
- `leverage`: 1 | 10 | 100 | 500 | 1000 (дефолт: 1000)
- `marginPosition`: объект маржинальной позиции с финансированием
- `comparisonSystem`: система виртуальных позиций

**Ключевые методы маржинальной торговли:**
- `calculateFinalWalletBalance()`: итоговый баланс с учетом P/L
- `shouldLiquidate()`: проверка на margin call
- `forceClosePosition()`: принудительная ликвидация
- `getPotentialWalletDisplay()`: потенциальный баланс для отображения

**Ключевые методы виртуальных позиций:**
- `createVirtualPositions(activeCryptoIndex, buyTime)`: создает виртуальные позиции для всех неактивных валют
- `calculateVirtualWallet(cryptoSymbol)`: рассчитывает P/L для виртуальной позиции
- `calculateUSDTEquivalentForCrypto(cryptoIndex)`: определяет, что показывать на колонне (реальный или виртуальный P/L)
- `updateVolatileDisplay()`: обновляет надписи на колоннах (USDT для активной, проценты для виртуальных)

**Методы мини-графиков:**
- `loadHistoricalData()`: загружает исторические данные из Binance REST API при инициализации
- `loadSymbolHistory(cryptoName, binanceSymbol)`: загружает klines данные для одного символа
- `createMockHistoricalData()`: создает фиктивные данные если API недоступен
- `updatePriceHistory()`: обновляет исторические данные цен каждые ~8.5 секунд
- `drawMiniChart(cryptoSymbol, x, y, width, height)`: рисует график динамики цены за последние 2 минуты
- `priceHistory`: хранилище исторических данных (14 точек на валюту)

**Классические методы:**
- `draw()`: отрисовка всех колонн
- `updateVolatileDisplay()`: обновление надписей на колоннах
- `drawActiveProfitLoss()`: отрисовка крупного P/L по центру сверху
- `onPlayerLanded(columnType, columnIndex)`: обработка приземления
- `getColumnAt(x)`: определение колонны по клику

### Column (columns.js) - Отдельная колонна
**Ответственность:** Отрисовка, анимация, хранение данных колонны

**Ключевые свойства:**
- `x`: позиция по X
- `height`: высота колонны
- `type`: 'stable' | 'volatile'
- `cryptoName`: 'BTC' | 'ETH' | 'ADA' | 'DOT'
- `displayValue`: текст на колонне
- `additionalInfo`: дополнительный текст
- `isActive`: активная колонна (где игрок)
- `isVirtual`: виртуальная колонна (для сравнения)

**Ключевые методы:**
- `draw()`: отрисовка колонны
- `drawVolatileText()`: отрисовка текста на криптоколонне
- `getPlayerPosition()`: позиция для игрока
- `createGradient()`: цветовая схема

### Player (player.js) - Игрок и анимации
**Ответственность:** Отрисовка игрока, анимации прыжков, эмоции

**Ключевые свойства:**
- `position`: текущая позиция {x, y}
- `currentColumn`: 'stable' | 'volatile'
- `isJumping`: состояние прыжка
- `jumpPath`: JumpPath для анимации
- `trailParticles`: частицы следа

**Ключевые методы:**
- `draw()`: отрисовка игрока
- `startJump()`: начало анимации прыжка
- `getPlayerEmotion()`: определение эмоции по прибыли/убытку
- `drawPlayerBody()`: отрисовка смайлика

### UIManager (ui.js) - Интерфейс
**Ответственность:** Отображение UI, эффекты, обратная связь

**Ключевые свойства:**
- `stableHeightElement`: DOM элемент баланса
- `leverageButton`: кнопка плеча
- `connectionStatus`: статус Binance

**Ключевые методы:**
- `updateComparisonDisplay()`: отображение активной позиции
- `createSuccessEffect()`: эффект прибыли
- `createLossEffect()`: эффект убытка
- `updateLeverageDisplay()`: обновление плеча

### BinanceWebSocketAPI (binance-api.js) - Реальные данные
**Ответственность:** Подключение к Binance WebSocket, получение цен

**Ключевые свойства:**
- `symbolMap`: маппинг игровых символов на пары Binance
- `priceCache`: кэш последних цен
- `isConnected`: состояние подключения

**Ключевые методы:**
- `start()`: подключение к WebSocket
- `getGamePrices()`: получение цен для игры
- `handleMessage()`: обработка входящих сообщений

## 🔄 Поток данных

### 1. Инициализация
```
Game constructor → 
  ColumnManager constructor → 
    Column constructors (5 штук) →
    BinanceWebSocketAPI start() →
  Player constructor →
  UIManager constructor →
Game start() → gameLoop()
```

### 2. Игровой цикл (каждый кадр)
```
Game.gameLoop() →
  ColumnManager.update() →
    binanceAPI.getGamePrices() →
    updateVolatileDisplay() →
    Column.update() (для каждой)
  Player.update() →
  Game.draw() →
    ColumnManager.draw() →
      Column.draw() (для каждой)
    Player.draw()
```

### 3. Обработка клика
```
Game.handleClick(event) →
  ColumnManager.getColumnAt(x) →
Game.executeJump(targetType, targetIndex) →
  Player.startJump() →
  ColumnManager.onPlayerStartJump()
```

### 4. Завершение прыжка
```
Player.updateJumpAnimation() (progress >= 1) →
  ColumnManager.processJump() →
    IF прыжок volatile → USDT: обновление walletValue →
    IF прыжок volatile → volatile: 
      1) продажа текущей валюты в USDT (обновление walletValue)
      2) сброс состояния для покупки новой валюты
  ColumnManager.onPlayerLanded() →
    обновление comparisonSystem и создание новых виртуальных позиций →
Game.finishJump() →
  IF не промежуточная транзакция: UIManager.showGrowthFeedback()
```

## 🎨 Система позиционирования

### Колонны
- **Фиксированное расстояние**: 150px между центрами
- **Центрирование**: группа колонн центрируется на экране
- **Адаптивность**: позиции пересчитываются при ресайзе окна

### Canvas
- **Размер**: полноэкранный (window.innerWidth × window.innerHeight)
- **Координаты колонн**: пересчитываются через `calculateFixedColumnPositions()`
- **Отрисовка**: центрированная по вертикали и горизонтали

## 🎯 Критические точки архитектуры

### 1. Маржинальная торговля и синхронизация ⚠️ КРИТИЧНО
- **`marginPosition`** - объект с полной информацией о позиции:
  - `initialWallet`: исходный кошелек игрока (наши деньги)
  - `positionSize`: общий размер позиции (наши + заемные)  
  - `leverage`: текущее плечо (1-1000)
  - `cryptoAmount`, `buyPrice`: параметры позиции
- **Отображение баланса**: `getPotentialWalletDisplay()` показывает потенциальный баланс в реальном времени
- **Автоликвидация**: `shouldLiquidate()` проверяет margin call каждый кадр
- **ПОРЯДОК ОПЕРАЦИЙ КРИТИЧЕН:**
  1. `Game.finishJump()` вызывает `processJump()` с ТЕКУЩИМ состоянием
  2. `processJump()` обрабатывает торговлю пока `playerOnVolatile` еще true
  3. Затем `onPlayerLanded()` обновляет состояние на новое
  4. Если поменять порядок - кошелек не обновится!
- **P/L расчеты**: всегда относительно `initialWallet`, НЕ размера позиции

### 2. Система виртуальных позиций (Virtual Positions) ⚠️ КРИТИЧНО
**Концепция:** Показывает альтернативные сценарии "что если бы купил другую валюту"

**Компоненты системы:**
- `comparisonSystem.activePosition`: текущая реальная криптопозиция
- `comparisonSystem.virtualComparisons`: объект с виртуальными позициями для всех неактивных валют
- Создается при покупке любой криптовалюты через `createVirtualPositions()`
- Очищается при возврате на USDT или ликвидации

**Логика работы:**
1. **При покупке криптовалюты (onPlayerLanded):**
   - Создается реальная позиция для выбранной валюты
   - Вызывается `createVirtualPositions()` для всех остальных валют
   - Каждая виртуальная позиция запоминает:
     - Цену покупки на момент реальной покупки
     - Количество валюты, которое было бы куплено
     - Размер позиции с учетом плеча
   
2. **Во время торговли (update):**
   - USDT колонна НЕ обновляется (остается статичной)
   - Активная колонна показывает реальный P/L в USDT
   - Виртуальные колонны показывают P/L в процентах через `calculateVirtualWallet()`
   
3. **Отображение (updateVolatileDisplay):**
   - Активная колонна: "Продать" + баланс в USDT
   - Виртуальные колонны: "Купить" + P/L в процентах (например, "+2.35%")
   - USDT колонна: показывает потенциальный баланс при продаже

4. **При возврате на USDT:**
   - Виртуальные позиции очищаются
   - Кошелек обновляется с учетом P/L
   - Система готова к новому циклу торговли

### 3. Интеграция реального времени
- WebSocket подключение инициируется в ColumnManager
- Цены кэшируются в BinanceWebSocketAPI
- Обновления проходят через колбэк `onPriceUpdate`

### 4. Canvas rendering pipeline
- Game.draw() → ColumnManager.draw() → Column.draw()
- Каждый компонент отвечает за свою отрисовку
- Player рисуется поверх колонн

### 5. Экстремальные плечи и управление рисками ⚠️ 
- **Плечи**: x1, x10, x100, x500, x1000 (дефолт x100)
- **Ликвидационный порог**: 5% от исходного кошелька
- **Автоликвидация**: срабатывает каждый кадр в `update()`
- **Критические плечи**:
  - x500: ликвидация при движении 0.2%
  - x1000: ликвидация при движении 0.1%
- **Цветовая индикация риска**: чем выше плечо, тем "горячее" цвет кнопки

## 🚀 Точки расширения

### Добавление новых криптовалют
1. Добавить символ в `cryptoNames` в ColumnManager
2. Добавить маппинг в `symbolMap` в BinanceWebSocketAPI
3. Увеличить количество создаваемых колонн

### Новые торговые механики  
1. Расширить `comparisonSystem` в ColumnManager
2. Добавить новые методы расчета в Column
3. Обновить UI отображение в UIManager

### Дополнительные визуальные эффекты
1. Расширить `drawPlayerBody()` в Player
2. Добавить новые эффекты в UIManager
3. Создать новые анимации в Column

---

*Эта архитектура обеспечивает модульность, расширяемость и понятность кода.*