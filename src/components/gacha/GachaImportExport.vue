<template>
  <div class="gacha-import-export">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading">
      <div class="loading-spinner"></div>
      <p>{{ loadingMessage || '处理中...' }}</p>
    </div>

    <!-- 状态消息 -->
    <div v-if="statusMessage" :class="['status-message', statusType]">
      {{ statusMessage }}
    </div>

    <!-- 导入区域 -->
    <div class="import-section">
      <h3>导入抽卡记录</h3>
      
      <!-- 从剪贴板导入 -->
      <div class="import-option">
        <h4>从剪贴板导入</h4>
        <button class="import-btn" @click="importFromClipboard" :disabled="isLoading">
          从剪贴板导入
        </button>
      </div>

      <!-- 从文件导入 -->
      <div class="import-option">
        <h4>从文件导入</h4>
        <div class="file-import">
          <input
            type="file"
            ref="fileInput"
            accept=".json,.txt"
            @change="handleFileImport"
            style="display: none;"
          />
          <button class="import-btn" @click="$refs.fileInput.click()" :disabled="isLoading">
            选择文件导入
          </button>
          <span v-if="selectedFileName">{{ selectedFileName }}</span>
        </div>
        <div class="import-tips">
          <p>支持格式: JSON, TXT</p>
          <p>最大文件大小: 10MB</p>
        </div>
      </div>
    </div>

    <!-- 导出区域 -->
    <div class="export-section">
      <h3>导出抽卡记录</h3>
      
      <!-- 导出为文件 -->
      <div class="export-option">
        <button class="export-btn" @click="exportToFile" :disabled="isLoading">
          导出为JSON文件
        </button>
        <select v-model="exportFormat" class="export-format">
          <option value="json">JSON格式</option>
          <option value="text">文本格式</option>
        </select>
      </div>

      <!-- 复制到剪贴板 -->
      <div class="export-option">
        <button class="export-btn" @click="copyToClipboard" :disabled="isLoading">
          复制到剪贴板
        </button>
        <select v-model="exportFormat" class="export-format">
          <option value="json">JSON格式</option>
          <option value="text">文本格式</option>
        </select>
      </div>
    </div>

    <!-- 数据管理区域 -->
    <div class="data-management">
      <h3>数据管理</h3>
      
      <!-- 清空数据 -->
      <div class="data-option">
        <button class="delete-btn" @click="confirmClearData" :disabled="isLoading">
          清空当前配置的所有抽卡记录
        </button>
        <p class="warning-text">警告: 此操作不可撤销！</p>
      </div>

      <!-- 数据统计 -->
      <div class="data-stats">
        <p>当前配置文件中共有 {{ totalEntries }} 条抽卡记录</p>
        <p v-if="firstEntryDate">最早记录: {{ firstEntryDate }}</p>
        <p v-if="lastEntryDate">最新记录: {{ lastEntryDate }}</p>
      </div>
    </div>

    <!-- 导入/导出日志 -->
    <div class="import-export-log">
      <h3>操作日志</h3>
      <div class="log-container">
        <div v-for="log in logs" :key="log.id" :class="['log-entry', log.type]">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { gachaService } from '../../services/gacha/GachaService';
import * as GachaUtils from '../../utils/gachaUtils.js';

export default {
  name: 'GachaImportExport',
  props: {
    gachaProfileId: {
      type: String,
      required: true
    },
    game: {
      type: Object,
      default: null
    }
  },
  emits: ['onDataImported'],
  setup(props, { emit }) {
    const isLoading = ref(false);
    const loadingMessage = ref('');
    const statusMessage = ref('');
    const statusType = ref('info');
    const selectedFileName = ref('');
    const exportFormat = ref('json');
    const logs = ref([]);
    const totalEntries = ref(0);
    const firstEntryDate = ref('');
    const lastEntryDate = ref('');

    // 加载抽卡记录数量和日期范围
    const loadEntryInfo = async () => {
      if (!props.gachaProfileId) return;
      
      try {
        // Split profile ID into game value and uid
        const [gameValue, uid] = props.gachaProfileId.split('_');
        if (!gameValue || !uid) {
          console.error('Invalid profile ID format');
          return;
        }
        
        // Get entries by UID
        const entries = await gachaService.getGachaHistoryPaged(uid, props.game || { value: gameValue }, 1, 1000);
        
        totalEntries.value = entries.total;
        
        if (entries.entries.length > 0) {
          // 按日期排序
          const sortedEntries = [...entries.entries].sort((a, b) => new Date(a.time) - new Date(b.time));
          firstEntryDate.value = GachaUtils.formatDate(sortedEntries[0].time);
          lastEntryDate.value = GachaUtils.formatDate(sortedEntries[sortedEntries.length - 1].time);
        } else {
          firstEntryDate.value = '';
          lastEntryDate.value = '';
        }
      } catch (error) {
        console.error('Failed to load entry info:', error);
      }
    };

    // 从剪贴板导入
    const importFromClipboard = async () => {
      try {
        isLoading.value = true;
        loadingMessage.value = '正在从剪贴板导入...';
        
        const text = await navigator.clipboard.readText();
        
        if (!text.trim()) {
          showStatusMessage('剪贴板为空', 'error');
          return;
        }
        
        await processImportedData(text);
      } catch (error) {
        console.error('Failed to import from clipboard:', error);
        showStatusMessage('从剪贴板导入失败: ' + error.message, 'error');
        addLog('从剪贴板导入失败', 'error');
      } finally {
        isLoading.value = false;
        loadingMessage.value = '';
      }
    };

    // 处理文件导入
    const handleFileImport = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      selectedFileName.value = file.name;
      
      try {
        isLoading.value = true;
        loadingMessage.value = '正在处理文件...';
        
        const text = await readFileAsText(file);
        
        await processImportedData(text);
      } catch (error) {
        console.error('Failed to import from file:', error);
        showStatusMessage('从文件导入失败: ' + error.message, 'error');
        addLog(`从文件 ${file.name} 导入失败`, 'error');
      } finally {
        isLoading.value = false;
        loadingMessage.value = '';
        // 清除文件选择，以便可以重新选择同一个文件
        event.target.value = '';
      }
    };

    // 读取文件内容
    const readFileAsText = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
    };

    // 处理导入的数据
    const processImportedData = async (text) => {
      try {
        isLoading.value = true;
        loadingMessage.value = '正在解析数据...';
        
        // Parse the JSON data
        const parsedData = JSON.parse(text);
        
        // Ensure data is in the correct format (an array)
        // Try to extract entries from common properties
        let jsonData = parsedData;
        
        // First level detection
        if (!Array.isArray(jsonData)) {
          // Try common root properties
          if (jsonData.list || jsonData.entries || jsonData.data) {
            jsonData = jsonData.list || jsonData.entries || jsonData.data;
          }
          // Try nested properties that are commonly used
          else if (jsonData.data?.list || jsonData.data?.entries || jsonData.data?.records) {
            jsonData = jsonData.data.list || jsonData.data.entries || jsonData.data.records;
          }
          else if (jsonData.result?.list || jsonData.result?.entries || jsonData.result?.records) {
            jsonData = jsonData.result.list || jsonData.result.entries || jsonData.result.records;
          }
          // Support for format with game ID as key (e.g., { "hk4e": [...] })
          else {
            // Check if the data has a game ID key (like "hk4e", "hkrpg", etc.)
            const keys = Object.keys(jsonData);
            // Find the first key that is not "info" and contains an array with list property
            for (const key of keys) {
              if (key !== 'info' && Array.isArray(jsonData[key]) && jsonData[key].length > 0) {
                // Extract list from the first item in the array
                const firstItem = jsonData[key][0];
                if (firstItem?.list) {
                  jsonData = firstItem.list;
                  break;
                }
              }
            }
            
            // If still not an array after all extraction attempts
            if (!Array.isArray(jsonData)) {
              console.log('Unsupported data structure:', keys);
              throw new Error('导入的数据格式不支持。请确保数据是数组格式，或包含list、entries、data或records属性，或符合UIGF格式。');
            }
          }
        }
        
        // Final check after extraction
        if (!Array.isArray(jsonData)) {
          throw new Error('提取后的数据仍不是数组格式，请检查数据结构。');
        }
        
        // Extract uid from profileId
        const [gameValue, uid] = props.gachaProfileId.split('_');
        if (!gameValue || !uid) {
          throw new Error('Invalid profile ID format');
        }
        
        // Get game object
        const game = props.game || { value: gameValue };
        
        // Import the data
        const importResult = await gachaService.importGachaEntries(jsonData, uid, game);
        
        showStatusMessage(`成功导入 ${importResult.imported} 条记录，重复 ${importResult.duplicates} 条记录`, 'success');
        addLog(`导入成功: ${importResult.imported} 条新记录，${importResult.duplicates} 条重复记录`, 'success');
        
        // 重新加载记录信息
        await loadEntryInfo();
        
        // 通知父组件数据已导入
        emit('onDataImported');
      } catch (error) {
        console.error('Failed to process imported data:', error);
        showStatusMessage('数据处理失败: ' + error.message, 'error');
        addLog('数据处理失败', 'error');
        throw error;
      }
    };

    // 导出为文件
    const exportToFile = async () => {
      try {
        isLoading.value = true;
        loadingMessage.value = '正在生成导出文件...';
        
        // Split profile ID into game value and uid
        const [gameValue, uid] = props.gachaProfileId.split('_');
        if (!gameValue || !uid) {
          throw new Error('Invalid profile ID format');
        }
        
        const game = props.game || { value: gameValue };
        const entries = await gachaService.exportGachaEntries(uid, game);
        
        if (entries.length === 0) {
          showStatusMessage('没有抽卡记录可导出', 'warning');
          return;
        }
        
        // 格式化导出数据
        const exportData = JSON.stringify(entries, null, 2);
        
        // 创建下载链接
        const blob = new Blob([exportData], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 生成文件名
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const gameName = props.game ? props.game.name : 'unknown';
        a.download = `gacha_export_${gameName}_${timestamp}.${exportFormat.value}`;
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showStatusMessage('导出成功', 'success');
        addLog(`导出为 ${exportFormat.value.toUpperCase()} 文件`, 'success');
      } catch (error) {
        console.error('Failed to export to file:', error);
        showStatusMessage('导出失败: ' + error.message, 'error');
        addLog('导出失败', 'error');
      } finally {
        isLoading.value = false;
        loadingMessage.value = '';
      }
    };

    // 复制到剪贴板
    const copyToClipboard = async () => {
      try {
        isLoading.value = true;
        loadingMessage.value = '正在准备复制内容...';
        
        // Split profile ID into game value and uid
        const [gameValue, uid] = props.gachaProfileId.split('_');
        if (!gameValue || !uid) {
          throw new Error('Invalid profile ID format');
        }
        
        const game = props.game || { value: gameValue };
        const entries = await gachaService.exportGachaEntries(uid, game);
        
        if (entries.length === 0) {
          showStatusMessage('没有抽卡记录可复制', 'warning');
          return;
        }
        
        // 格式化导出数据
        const exportData = JSON.stringify(entries, null, 2);
        
        await navigator.clipboard.writeText(exportData);
        
        showStatusMessage('内容已复制到剪贴板', 'success');
        addLog(`复制 ${exportFormat.value.toUpperCase()} 格式数据到剪贴板`, 'success');
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        showStatusMessage('复制失败: ' + error.message, 'error');
        addLog('复制失败', 'error');
      } finally {
        isLoading.value = false;
        loadingMessage.value = '';
      }
    };

    // 确认清空数据
    const confirmClearData = () => {
      if (confirm('确定要清空当前配置文件的所有抽卡记录吗？此操作不可撤销！')) {
        clearAllData();
      }
    };

    // 清空所有数据
    const clearAllData = async () => {
      try {
        isLoading.value = true;
        loadingMessage.value = '正在清空数据...';
        
        // Split profile ID into game value and uid
        const [gameValue, uid] = props.gachaProfileId.split('_');
        if (!gameValue || !uid) {
          throw new Error('Invalid profile ID format');
        }
        
        const game = props.game || { value: gameValue };
        await gachaService.clearAllGachaEntries(uid, game);
        
        // 重新加载条目信息
        await loadEntryInfo();
        
        showStatusMessage('所有抽卡记录已清空', 'success');
        addLog('清空所有抽卡记录', 'success');
        
        // 通知父组件数据已更新
        emit('onDataImported');
      } catch (error) {
        console.error('Failed to clear data:', error);
        showStatusMessage('清空数据失败: ' + error.message, 'error');
        addLog('清空数据失败', 'error');
      } finally {
        isLoading.value = false;
        loadingMessage.value = '';
      }
    };

    // 显示状态消息
    const showStatusMessage = (message, type = 'info') => {
      statusMessage.value = message;
      statusType.value = type;
      
      // 5秒后自动清除消息
      setTimeout(() => {
        statusMessage.value = '';
      }, 5000);
    };

    // 添加日志
    const addLog = (message, type = 'info') => {
      const timestamp = new Date().toLocaleTimeString();
      logs.value.unshift({
        id: Date.now() + Math.random(),
        time: timestamp,
        message: message,
        type: type
      });
      
      // 限制日志数量为50条
      if (logs.value.length > 50) {
        logs.value = logs.value.slice(0, 50);
      }
    };

    // 监听配置文件ID变化
    watch(() => props.gachaProfileId, () => {
      loadEntryInfo();
    });

    // 初始化时加载数据
    loadEntryInfo();

    return {
      isLoading,
      loadingMessage,
      statusMessage,
      statusType,
      selectedFileName,
      exportFormat,
      logs,
      totalEntries,
      firstEntryDate,
      lastEntryDate,
      importFromClipboard,
      handleFileImport,
      exportToFile,
      copyToClipboard,
      confirmClearData
    };
  }
};
</script>

<style scoped>
@import './GachaImportExport.css';
</style>