const express = require('express');
const axios = require('axios');
const app = express();

const TARGET_URL = 'https://chatgpt.com/backend-api/codex';

// Middleware для парсинга JSON и других типов данных
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// Проксирование всех запросов
app.all('*', async (req, res) => {
  try {
    // Формируем целевой URL
    const targetPath = req.path === '/' ? '' : req.path;
    const targetUrl = `${TARGET_URL}${targetPath}${req.url.includes('?') ? req.url.substring(req.path.length) : ''}`;

    console.log(`Proxying ${req.method} ${req.path} -> ${targetUrl}`);

    // Подготавливаем заголовки (исключаем host и другие заголовки, которые могут вызвать проблемы)
    const headers = { ...req.headers };
    delete headers.host;
    delete headers['content-length'];
    delete headers['connection'];
    delete headers['accept-encoding'];

    // Опции для запроса
    const axiosConfig = {
      method: req.method,
      url: targetUrl,
      headers: headers,
      validateStatus: () => true, // Принимаем все статусы ответа
    };

    // Добавляем тело запроса, если оно есть
    if (req.body && Object.keys(req.body).length > 0) {
      axiosConfig.data = req.body;
    } else if (req.body && Buffer.isBuffer(req.body)) {
      axiosConfig.data = req.body;
    }

    // Выполняем запрос
    const response = await axios(axiosConfig);

    // Пересылаем ответ клиенту
    res.status(response.status);
    
    // Копируем заголовки ответа
    Object.keys(response.headers).forEach(key => {
      // Исключаем некоторые заголовки, которые могут вызвать проблемы
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, response.headers[key]);
      }
    });

    res.send(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({
      error: 'Proxy error',
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server is running on port ${PORT}`);
  console.log(`All requests will be forwarded to: ${TARGET_URL}`);
});
