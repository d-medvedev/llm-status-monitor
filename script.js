// Конфигурация
let modelsConfig = {};
let updateInterval = null;
let corsErrorDetected = false;

// Загрузка конфигурации
async function loadConfig() {
    try {
        const response = await fetch('config.json');
        modelsConfig = await response.json();
        renderModels();
    } catch (error) {
        console.error('Ошибка загрузки конфигурации:', error);
        document.getElementById('modelsContainer').innerHTML = 
            '<div class="error">Не удалось загрузить конфигурацию моделей</div>';
    }
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

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.access_token}`
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

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

        // Проверка на CORS ошибку
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
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

    // Автоматическое обновление каждые 30 секунд
    checkAllModels(); // Первая проверка сразу
    updateInterval = setInterval(checkAllModels, 30000);
});

// Очистка интервала при закрытии страницы
window.addEventListener('beforeunload', () => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});

