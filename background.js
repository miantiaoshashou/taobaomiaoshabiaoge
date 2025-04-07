// 存储最新的请求数据
let latestRequestData = null;

// 监听网络请求
chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.url.includes('sale.taobao.com/domain/item/query.json')) {
      console.log('检测到API请求:', details.url);
      // 获取请求参数
      const url = new URL(details.url);
      const params = Object.fromEntries(url.searchParams);
      latestRequestData = {
        url: details.url,
        method: details.method,
        params: params,
        timestamp: new Date().toISOString()
      };
      console.log('请求数据:', latestRequestData);

      // 立即通知所有标签页有新的请求
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'NEW_REQUEST',
            data: latestRequestData
          }).catch(() => {
            // 忽略发送消息失败的错误
          });
        });
      });
    }
  },
  { urls: ["*://*.taobao.com/*"] },
  ["requestBody"]
);

// 监听请求完成
chrome.webRequest.onCompleted.addListener(
  function(details) {
    if (details.url.includes('sale.taobao.com/domain/item/query.json')) {
      console.log('API请求完成:', details.url);
      
      // 使用原始请求的cookie和headers
      chrome.tabs.sendMessage(details.tabId, {
        type: 'GET_PAGE_COOKIES'
      }, async function(cookies) {
        try {
          const response = await fetch(details.url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Cookie': cookies || '',
              'Referer': 'https://sale.taobao.com/'
            },
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('API响应数据:', data);
          
          // 更新latestRequestData添加响应数据
          latestRequestData = {
            ...latestRequestData,
            response: data,
            responseTimestamp: new Date().toISOString()
          };

          // 通知所有标签页
          chrome.tabs.query({}, function(tabs) {
            tabs.forEach(tab => {
              chrome.tabs.sendMessage(tab.id, {
                type: 'API_RESPONSE',
                data: latestRequestData
              }).catch(() => {
                // 忽略发送消息失败的错误
              });
            });
          });
        } catch (error) {
          console.error('获取响应数据失败:', error);
          // 通知错误
          chrome.tabs.sendMessage(details.tabId, {
            type: 'API_ERROR',
            error: error.message
          });
        }
      });
    }
  },
  { urls: ["*://*.taobao.com/*"] }
);

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_LATEST_DATA') {
    console.log('发送最新数据:', latestRequestData);
    sendResponse(latestRequestData);
  }
  return true;
}); 