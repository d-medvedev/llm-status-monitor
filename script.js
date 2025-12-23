// Конфигурация
let modelsConfig = {};
let updateInterval = null;
let corsErrorDetected = false;
const CONFIG_STORAGE_KEY = 'llm_monitor_config';

// Определяем, используем ли мы Netlify (проверка по домену)
const isNetlify = window.location.hostname.includes('netlify.app') || 
                  window.location.hostname.includes('netlify.com');
const PROXY_URL = '/.netlify/functions/proxy';

// Загрузка конфигурации
async function loadConfig() {
    // Сначала пробуем загрузить из localStorage
    const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (savedConfig) {
        try {
            modelsConfig = JSON.parse(savedConfig);
            hideConfigForm();
            renderModels();
            return;
        } catch (error) {
            console.error('Ошибка парсинга сохраненной конфигурации:', error);
            localStorage.removeItem(CONFIG_STORAGE_KEY);
        }
    }

    // Если нет в localStorage, пробуем загрузить config.json (для локальной разработки)
    try {
        const response = await fetch('config.json');
        if (response.ok) {
            modelsConfig = await response.json();
            // Сохраняем в localStorage для будущего использования
            localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(modelsConfig));
            hideConfigForm();
            renderModels();
            return;
        }
    } catch (error) {
        console.log('config.json не найден, используем форму ввода');
    }

    // Если ничего не загрузилось, показываем форму
    showConfigForm();
}

// Сохранение конфигурации
function saveConfig(config) {
    try {
        modelsConfig = typeof config === 'string' ? JSON.parse(config) : config;
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(modelsConfig));
        hideConfigForm();
        renderModels();
        // Запускаем проверку после загрузки конфигурации
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        checkAllModels();
        updateInterval = setInterval(checkAllModels, 30000);
    } catch (error) {
        alert('Ошибка: Неверный формат JSON. Проверьте конфигурацию.');
        console.error('Ошибка сохранения конфигурации:', error);
    }
}

// Показать форму конфигурации
function showConfigForm() {
    const form = document.getElementById('configForm');
    if (form) {
        form.style.display = 'block';
    }
    const container = document.getElementById('modelsContainer');
    if (container) {
        container.style.display = 'none';
    }
}

// Скрыть форму конфигурации
function hideConfigForm() {
    const form = document.getElementById('configForm');
    if (form) {
        form.style.display = 'none';
    }
    const container = document.getElementById('modelsContainer');
    if (container) {
        container.style.display = 'block';
    }
}

// Загрузка конфигурации из файла
function loadConfigFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const config = JSON.parse(e.target.result);
            saveConfig(config);
        } catch (error) {
            alert('Ошибка: Неверный формат JSON файла.');
            console.error('Ошибка загрузки файла:', error);
        }
    };
    reader.readAsText(file);
}

// Проверка статуса модели
async function checkModelStatus(provider, modelName, config) {
    const startTime = Date.now();
    const statusElement = document.getElementById(`status-${provider}-${modelName}`);
    const latencyElement = document.getElementById(`latency-${provider}-${modelName}`);
    
    // Устанавливаем состояние "проверяется"
    if (statusElement) {
        statusElement.textContent = '⏳ Проверяется...';
        statusElement.className = 'status checking';
    }
    if (latencyElement) {
        latencyElement.textContent = '—';
    }

    try {
        const apiUrl = `${config.url}/v1/chat/completions`;
        const requestBody = {
            model: config.model,
            messages: [
                {
                    role: "user",
                    content: "test"
                }
            ],
            max_tokens: 5
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут

        let response;
        
        // Используем прокси на Netlify, иначе прямой запрос
        if (isNetlify) {
            // Запрос через Netlify прокси
            response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    targetUrl: apiUrl,
                    body: requestBody,
                    headers: {
                        'Authorization': `Bearer ${config.access_token}`
                    }
                }),
                signal: controller.signal
            });
        } else {
            // Прямой запрос (для локальной разработки или если CORS настроен)
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.access_token}`
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });
        }

        clearTimeout(timeoutId);
        const endTime = Date.now();
        const latency = endTime - startTime;

        if (response.ok) {
            // Модель доступна
            if (statusElement) {
                statusElement.textContent = '🟢 Доступна';
                statusElement.className = 'status available';
            }
            if (latencyElement) {
                latencyElement.textContent = `${latency} мс`;
            }
            return { status: 'available', latency };
        } else {
            // Модель недоступна
            if (statusElement) {
                statusElement.textContent = '🔴 Недоступна';
                statusElement.className = 'status unavailable';
            }
            if (latencyElement) {
                latencyElement.textContent = `Ошибка ${response.status}`;
            }
            return { status: 'unavailable', latency: null, error: `HTTP ${response.status}` };
        }
    } catch (error) {
        const endTime = Date.now();
        const latency = endTime - startTime;

        // Проверка на CORS ошибку (только если не используем Netlify)
        if (!isNetlify && error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            if (!corsErrorDetected) {
                corsErrorDetected = true;
                document.getElementById('errorBanner').style.display = 'block';
            }
        }

        if (statusElement) {
            statusElement.textContent = '🔴 Ошибка';
            statusElement.className = 'status error';
        }
        if (latencyElement) {
            if (error.name === 'AbortError') {
                latencyElement.textContent = 'Таймаут';
            } else {
                latencyElement.textContent = 'Ошибка сети';
            }
        }
        return { status: 'error', latency: null, error: error.message };
    }
}

// Проверка всех моделей
async function checkAllModels() {
    const providers = Object.keys(modelsConfig);
    
    for (const provider of providers) {
        const models = Object.keys(modelsConfig[provider]);
        
        for (const modelName of models) {
            const config = modelsConfig[provider][modelName];
            await checkModelStatus(provider, modelName, config);
            // Небольшая задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    updateLastUpdateTime();
}

// Обновление времени последнего обновления
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ru-RU');
    document.getElementById('lastUpdate').textContent = `Последнее обновление: ${timeString}`;
}

// Рендеринг моделей
function renderModels() {
    const container = document.getElementById('modelsContainer');
    container.innerHTML = '';

    const providers = Object.keys(modelsConfig);

    providers.forEach(provider => {
        const providerSection = document.createElement('div');
        providerSection.className = 'provider-section';
        
        const providerHeader = document.createElement('h2');
        providerHeader.className = 'provider-name';
        providerHeader.textContent = provider;
        providerSection.appendChild(providerHeader);

        const modelsGrid = document.createElement('div');
        modelsGrid.className = 'models-grid';

        const models = Object.keys(modelsConfig[provider]);
        models.forEach(modelName => {
            const config = modelsConfig[provider][modelName];
            const modelCard = document.createElement('div');
            modelCard.className = 'model-card';
            modelCard.innerHTML = `
                <div class="model-header">
                    <h3 class="model-name">${modelName}</h3>
                </div>
                <div class="model-info">
                    <div class="info-row">
                        <span class="info-label">Статус:</span>
                        <span class="status" id="status-${provider}-${modelName}">—</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Время ответа:</span>
                        <span class="latency" id="latency-${provider}-${modelName}">—</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">URL:</span>
                        <span class="model-url">${config.url}</span>
                    </div>
                </div>
            `;
            modelsGrid.appendChild(modelCard);
        });

        providerSection.appendChild(modelsGrid);
        container.appendChild(providerSection);
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();

    // Кнопка обновления
    document.getElementById('refreshBtn').addEventListener('click', () => {
        checkAllModels();
    });

    // Кнопка настроек
    document.getElementById('configBtn').addEventListener('click', () => {
        showConfigForm();
    });

    // Загрузка конфигурации из файла
    document.getElementById('configFileInput').addEventListener('change', loadConfigFromFile);

    // Сохранение конфигурации из текстового поля
    document.getElementById('saveConfigBtn').addEventListener('click', () => {
        const configText = document.getElementById('configTextarea').value.trim();
        if (configText) {
            saveConfig(configText);
        } else {
            alert('Пожалуйста, введите конфигурацию в текстовое поле.');
        }
    });

    // Автоматическое обновление каждые 30 секунд (только если конфигурация загружена)
    if (Object.keys(modelsConfig).length > 0) {
        checkAllModels();
        updateInterval = setInterval(checkAllModels, 30000);
    }
});

// Очистка интервала при закрытии страницы
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});

