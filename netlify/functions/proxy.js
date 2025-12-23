// Netlify Serverless Function для проксирования запросов к LLM API
// Это обходит проблему CORS, так как запросы идут через тот же домен

exports.handler = async (event, context) => {
  // Разрешаем CORS для всех источников
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Обработка preflight запроса (OPTIONS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Только POST запросы
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Парсим тело запроса
    const requestData = JSON.parse(event.body);
    const { targetUrl, body, headers: requestHeaders } = requestData;

    if (!targetUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'targetUrl is required' }),
      };
    }

    // Делаем запрос к целевому API
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...requestHeaders,
      },
      body: JSON.stringify(body),
    });

    // Получаем ответ
    const responseData = await response.text();
    let parsedData;
    
    try {
      parsedData = JSON.parse(responseData);
    } catch (e) {
      // Если не JSON, возвращаем как есть
      parsedData = responseData;
    }

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(parsedData),
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Proxy error', 
        message: error.message 
      }),
    };
  }
};

