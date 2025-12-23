# LLM Status Monitor

Одностраничное веб-приложение для мониторинга статуса доступности LLM моделей в реальном времени.

## Возможности

- ✅ Мониторинг статуса доступности моделей
- ✅ Отображение времени ответа (latency)
- ✅ Автоматическое обновление каждые 30 секунд
- ✅ Ручное обновление по кнопке
- ✅ Группировка моделей по провайдерам
- ✅ Современный адаптивный дизайн
- ✅ Обработка ошибок и CORS

## Структура проекта

```
sbt-immers-mon/
├── index.html      # Основная HTML разметка
├── style.css       # Стили приложения
├── script.js       # Логика проверки статуса
├── config.json     # Конфигурация моделей
└── README.md       # Документация
```

## Развертывание на GitHub Pages

### Шаг 1: Создание репозитория

1. Создайте новый репозиторий на GitHub
2. Назовите его, например, `llm-status-monitor`

### Шаг 2: Загрузка файлов

1. Клонируйте репозиторий локально:
   ```bash
   git clone https://github.com/your-username/llm-status-monitor.git
   cd llm-status-monitor
   ```

2. Скопируйте все файлы проекта в репозиторий:
   - `index.html`
   - `style.css`
   - `script.js`
   - `config.json`
   - `README.md`

3. Закоммитьте и запушьте файлы:
   ```bash
   git add .
   git commit -m "Initial commit: LLM Status Monitor"
   git push origin main
   ```

### Шаг 3: Включение GitHub Pages

1. Перейдите в настройки репозитория (Settings)
2. В левом меню выберите "Pages"
3. В разделе "Source" выберите:
   - Branch: `main` (или `master`)
   - Folder: `/ (root)`
4. Нажмите "Save"

### Шаг 4: Доступ к приложению

Через несколько минут ваше приложение будет доступно по адресу:
```
https://your-username.github.io/llm-status-monitor/
```

## Настройка конфигурации

Отредактируйте файл `config.json` для добавления или изменения моделей:

```json
{
  "ProviderName": {
    "ModelName": {
      "url": "http://example.com:8000",
      "model": "/model/path",
      "access_token": "your-token"
    }
  }
}
```

## Важные замечания

### CORS (Cross-Origin Resource Sharing)

Если API серверы моделей не разрешают CORS запросы из браузера, вы увидите предупреждение на странице. В этом случае есть несколько вариантов:

1. **Настроить CORS на стороне API серверов** (рекомендуется)
   - Добавить заголовки `Access-Control-Allow-Origin` на серверах моделей

2. **Использовать прокси-сервер**
   - Развернуть простой Node.js прокси (см. раздел ниже)
   - Или использовать Netlify/Vercel с serverless functions

3. **Локальный прокси для разработки**
   - Использовать расширение браузера для обхода CORS (только для разработки)

### Локальный прокси-сервер (опционально)

Если нужен прокси для обхода CORS, создайте файл `server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());
app.use(express.static('.'));

// Прокси для API запросов
app.use('/api/proxy', createProxyMiddleware({
    target: 'http://target-url',
    changeOrigin: true,
    pathRewrite: {
        '^/api/proxy': ''
    }
}));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
```

Запуск:
```bash
npm install express cors http-proxy-middleware
node server.js
```

## Технологии

- HTML5
- Vanilla JavaScript (ES6+)
- CSS3 (Flexbox, Grid)
- OpenAI-compatible API

## Лицензия

MIT

