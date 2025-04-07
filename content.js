// 保存最新的请求数据
let latestData = null;

// 获取页面cookies
function getPageCookies() {
  return document.cookie;
}

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息:', message.type);
  
  if (message.type === 'GET_PAGE_COOKIES') {
    sendResponse(getPageCookies());
    return true;
  }
  
  if (message.type === 'NEW_REQUEST' || message.type === 'API_RESPONSE') {
    latestData = message.data;
    console.log('更新数据:', latestData);
    // 发送数据到popup
    chrome.runtime.sendMessage({
      type: 'UPDATE_POPUP',
      data: latestData
    });
  }
  
  if (message.type === 'API_ERROR') {
    console.error('API错误:', message.error);
    chrome.runtime.sendMessage({
      type: 'UPDATE_POPUP_ERROR',
      error: message.error
    });
  }
  
  if (message.type === 'GET_LATEST_DATA') {
    console.log('发送最新数据:', latestData);
    sendResponse(latestData);
  }
  
  return true;
});

// 拦截XMLHttpRequest请求
const originalXHR = window.XMLHttpRequest;
window.XMLHttpRequest = function() {
  const xhr = new originalXHR();
  const originalOpen = xhr.open;
  const originalSend = xhr.send;

  xhr.open = function(method, url) {
    if (url.includes('sale.taobao.com/domain/item/query.json')) {
      console.log('检测到XHR请求:', url);
      this._isTargetRequest = true;
    }
    originalOpen.apply(xhr, arguments);
  };

  xhr.send = function(data) {
    if (this._isTargetRequest) {
      xhr.addEventListener('load', function() {
        try {
          const responseData = JSON.parse(xhr.responseText);
          latestData = {
            url: xhr.responseURL,
            method: xhr.method,
            response: responseData,
            timestamp: new Date().toISOString()
          };
          console.log('XHR响应数据:', latestData);
          // 发送数据到popup
          chrome.runtime.sendMessage({
            type: 'UPDATE_POPUP',
            data: latestData
          });
        } catch (error) {
          console.error('解析XHR响应数据失败:', error);
        }
      });
    }
    originalSend.apply(xhr, arguments);
  };

  return xhr;
};

// 拦截Fetch请求
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  if (url.toString().includes('sale.taobao.com/domain/item/query.json')) {
    console.log('检测到Fetch请求:', url);
    return originalFetch.apply(this, arguments)
      .then(response => {
        response.clone().json().then(data => {
          latestData = {
            url: response.url,
            method: options?.method || 'GET',
            response: data,
            timestamp: new Date().toISOString()
          };
          console.log('Fetch响应数据:', latestData);
          // 发送数据到popup
          chrome.runtime.sendMessage({
            type: 'UPDATE_POPUP',
            data: latestData
          });
        });
        return response;
      });
  }
  return originalFetch.apply(this, arguments);
}; 