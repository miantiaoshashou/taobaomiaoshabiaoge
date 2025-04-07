let originalData = []; // 存储原始数据

// 更新表格数据
function updateTable(data, filterStatus = '') {
  const tbody = document.querySelector('#data-table tbody');
  tbody.innerHTML = ''; // 清空现有数据
  
  // 检查数据结构
  console.log('Received data:', data);
  
  // 确保我们有正确的数据结构
  if (data && data.response && data.response.data && data.response.data.data) {
    const items = data.response.data.data;
    originalData = items; // 保存原始数据
    
    // 根据筛选状态过滤数据
    const filteredItems = filterStatus 
      ? items.filter(item => item.statusName === filterStatus)
      : items;
    
    filteredItems.forEach(item => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.itemId || '-'}</td>
        <td>${item.juId || '-'}</td>
        <td>${item.statusName || '-'}</td>
      `;
      tbody.appendChild(row);
    });
  } else {
    console.error('Invalid data structure:', data);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="3" style="text-align: center;">暂无数据</td>
    `;
    tbody.appendChild(row);
  }
}

// 复制表格数据
function copyTableData() {
  const table = document.getElementById('data-table');
  const rows = Array.from(table.querySelectorAll('tr'));
  
  // 构建表格文本
  let text = '';
  rows.forEach(row => {
    const cells = Array.from(row.querySelectorAll('th, td'));
    text += cells.map(cell => cell.textContent).join('\t') + '\n';
  });
  
  // 复制到剪贴板
  navigator.clipboard.writeText(text)
    .then(() => {
      const button = document.getElementById('copyTableButton');
      button.textContent = '已复制！';
      setTimeout(() => {
        button.textContent = '复制表格';
      }, 2000);
    })
    .catch(err => {
      console.error('复制失败:', err);
    });
}

// 刷新数据
function refreshData() {
  // 获取当前标签页
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs[0]) {
      console.error('无法获取当前标签页');
      return;
    }
    
    // 发送消息给content script
    chrome.tabs.sendMessage(tabs[0].id, {type: 'GET_LATEST_DATA'}, function(response) {
      if (chrome.runtime.lastError) {
        console.error('获取数据失败:', chrome.runtime.lastError);
        return;
      }
      
      if (response) {
        updateTable(response);
      }
    });
  });
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_POPUP') {
    updateTable(message.data);
  }
});

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  // 获取数据
  refreshData();
  
  // 绑定复制表格按钮事件
  document.getElementById('copyTableButton').addEventListener('click', copyTableData);
  
  // 绑定筛选按钮事件
  document.getElementById('filterButton').addEventListener('click', function() {
    const filterStatus = document.getElementById('statusFilter').value;
    updateTable({ response: { data: { data: originalData } } }, filterStatus);
  });
  
  // 绑定重置按钮事件
  document.getElementById('resetButton').addEventListener('click', function() {
    document.getElementById('statusFilter').value = '';
    updateTable({ response: { data: { data: originalData } } });
  });
}); 