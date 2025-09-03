<template>
  <div class="gacha-history">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading">
      <div class="loading-spinner"></div>
      <p>加载抽卡记录中...</p>
    </div>

    <!-- 没有数据时的提示 -->
    <div v-else-if="gachaEntries.length === 0" class="no-data">
      <p>暂无抽卡记录</p>
      <p>请先导入抽卡记录数据</p>
    </div>

    <!-- 抽卡历史内容 -->
    <div v-else class="gacha-history-content">
      <!-- 顶部信息和筛选 -->
      <div class="gacha-history-header">
        <div class="total-count">
          共 {{ totalEntries }} 条记录
        </div>
        <div class="gacha-type-filter">
          <label for="gacha-type">筛选卡池:</label>
          <select id="gacha-type" v-model="selectedGachaType">
            <option value="all">全部卡池</option>
            <option v-for="type in gachaTypes" :key="type.key" :value="type.key">
              {{ type.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- 保底状态显示 -->
      <div class="pity-status">
        <div class="pity-info">
          <span>当前累计抽数:</span>
          <span class="pity-count">{{ currentPityCount }}</span>
          <span>距离保底还剩:</span>
          <span class="pity-remaining">{{ pityThreshold - currentPityCount }}</span>
        </div>
      </div>

      <!-- 分页控制 -->
      <div class="pagination">
        <button @click="prevPage" :disabled="currentPage <= 1">上一页</button>
        <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button @click="nextPage" :disabled="currentPage >= totalPages">下一页</button>
        <div class="page-size">
          <label for="page-size">每页显示:</label>
          <select id="page-size" v-model="pageSize" @change="resetPage">
            <option value="20">20条</option>
            <option value="50">50条</option>
            <option value="100">100条</option>
          </select>
        </div>
      </div>

      <!-- 抽卡记录表格 -->
      <div class="gacha-entries">
        <table class="gacha-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>类型</th>
              <th>名称</th>
              <th>星级</th>
              <th>卡池</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="entry in paginatedEntries"
              :key="entry.id"
              :class="['gacha-entry', `rarity-${entry.rankType}`]"
            >
              <td>{{ formatDate(entry.time) }}</td>
              <td>{{ entry.itemType || '-' }}</td>
              <td>{{ entry.name || '-' }}</td>
              <td :class="`rarity-badge rarity-${entry.rankType || '0'}`">
                {{ entry.rankType ? `${entry.rankType}星` : '-' }}
              </td>
              <td>{{ getGachaTypeName(entry.gachaType) || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { gachaService } from '../../services/gacha/GachaService';
import * as GachaUtils from '../../utils/gachaUtils.js';

export default {
  name: 'GachaHistory',
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
  setup(props) {
    const gachaEntries = ref([]);
    const isLoading = ref(false);
    const selectedGachaType = ref('all');
    const currentPage = ref(1);
    const pageSize = ref(50);
    const currentPityCount = ref(0);
    const pityThreshold = ref(90); // 默认90抽保底

    // 计算卡池类型列表
    const gachaTypes = computed(() => {
      try {
        // 尝试获取游戏对象，如果props.game为空，从profileId中提取
        let gameObject = props.game;
        if (!gameObject && props.gachaProfileId) {
          const [gameValue] = props.gachaProfileId.split('_');
          if (gameValue) {
            gameObject = { value: gameValue };
          }
        }
        
        // 如果仍然没有游戏对象，返回空数组
        if (!gameObject) return [];
        
        // 调用GachaUtils获取卡池类型
        const poolTypes = GachaUtils.getGachaTypesByGame(gameObject.value);
        // 确保返回的是带有key和name属性的对象数组
        return poolTypes.map(type => ({
          key: type.type,
          name: type.chineseName || type.name
        })).filter(type => type.key && type.name); // 过滤掉无效的卡池类型
      } catch (error) {
        console.error('Error retrieving gacha types:', error);
        return [];
      }
    });

    // 计算筛选后的条目
    const filteredEntries = computed(() => {
      if (selectedGachaType.value === 'all') {
        return gachaEntries.value;
      }
      
      // 处理角色活动祈愿合并
      if (selectedGachaType.value === '301' || selectedGachaType.value === '400') {
        // 合并角色活动祈愿和角色活动祈愿-2
        return gachaEntries.value.filter(entry => entry.gachaType === '301' || entry.gachaType === '400');
      }
      
      return gachaEntries.value.filter(entry => entry.gachaType === selectedGachaType.value);
    });

    // 计算总条目数
    const totalEntries = computed(() => {
      return filteredEntries.value.length;
    });

    // 计算总页数
    const totalPages = computed(() => {
      return Math.max(1, Math.ceil(totalEntries.value / pageSize.value));
    });

    // 计算当前页显示的条目
    const paginatedEntries = computed(() => {
      const startIndex = (currentPage.value - 1) * pageSize.value;
      const endIndex = startIndex + pageSize.value;
      return filteredEntries.value.slice(startIndex, endIndex);
    });

    // 加载抽卡记录
    const loadGachaEntries = async () => {
      if (!props.gachaProfileId) return;
      
      try {
        isLoading.value = true;
        // Split profile ID into game value and uid
        const [gameValue, uid] = props.gachaProfileId.split('_');
        if (!gameValue || !uid) {
          console.error('Invalid profile ID format');
          return;
        }
        
        // Get entries by UID，增加记录数量限制到10000条
        const entries = await gachaService.getGachaHistoryPaged(uid, props.game || { value: gameValue }, 1, 100000000000);
        
        // 按时间倒序排列（最新的在前）
        gachaEntries.value = entries.entries.sort((a, b) => new Date(b.time) - new Date(a.time));
        
        // 计算当前保底状态
        calculatePityStatus();
        
        // 重置分页
        currentPage.value = 1;
      } catch (error) {
        console.error('Failed to load gacha entries:', error);
      } finally {
        isLoading.value = false;
      }
    };

    // 计算保底状态
    const calculatePityStatus = () => {
      if (gachaEntries.value.length === 0) {
        currentPityCount.value = 0;
        return;
      }

      try {
        // 获取当前筛选的卡池类型
        let targetGachaType = selectedGachaType.value;
        
        // 如果选择了所有卡池，使用最近记录的卡池类型
        if (targetGachaType === 'all' && gachaEntries.value.length > 0) {
          targetGachaType = gachaEntries.value[0].gachaType;
        }

        // 获取游戏对象
        const game = props.game && props.game.value ? props.game : {
          value: gachaEntries.value[0].game || 'genshinImpact'
        };

        // 处理角色活动祈愿合并情况
        let entriesToCalculate = gachaEntries.value;
        if (targetGachaType === '301' || targetGachaType === '400') {
          // 使用合并后的条目来计算保底状态
          entriesToCalculate = entriesToCalculate.filter(
            entry => entry.gachaType === '301' || entry.gachaType === '400'
          );
        } else if (targetGachaType !== 'all') {
          // 其他情况下，只使用特定卡池类型的条目
          entriesToCalculate = entriesToCalculate.filter(
            entry => entry.gachaType === targetGachaType
          );
        }

        // 使用GachaUtils中的保底计算函数
        const pityStatus = GachaUtils.calculatePityStatus(
          entriesToCalculate,
          targetGachaType,
          game
        );

        currentPityCount.value = pityStatus.currentPity;
        
        // 获取保底规则
        const pityRules = GachaUtils.getPityRules(game, targetGachaType);
        pityThreshold.value = pityRules && pityRules.fiveStar ? pityRules.fiveStar : 90;
      } catch (error) {
        console.error('Error calculating pity status:', error);
        // 错误时使用默认值
        currentPityCount.value = 0;
        pityThreshold.value = 90;
      }
    };

    // 上一页
    const prevPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--;
      }
    };

    // 下一页
    const nextPage = () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++;
      }
    };

    // 重置页码
    const resetPage = () => {
      currentPage.value = 1;
    };

    // 格式化日期
    const formatDate = (timestamp) => {
      return GachaUtils.formatDate(timestamp);
    };

    // 获取卡池类型名称
    const getGachaTypeName = (gachaType) => {
      // 添加详细的调试信息
      console.log('getGachaTypeName called with:', {
        gachaType,
        game: props.game,
        gameType: typeof props.game,
        gameValue: props.game?.value,
        gameStringified: props.game ? JSON.stringify(props.game) : 'null'
      });
      
      if (!gachaType) {
        console.warn('Missing gachaType');
        return '未知类型';
      }
      
      // 确保我们传递一个有效的game对象给GachaUtils.getGachaTypeName
      let gameToPass = props.game;
      
      // 如果game不是一个对象或者没有value属性，尝试使用我们知道的游戏类型
      if (!gameToPass || typeof gameToPass !== 'object' || !gameToPass.value) {
        console.warn('Game object is not valid, using default game value');
        
        // 从调试信息中我们看到有原神相关的gachaType值（200, 301, 302, 500），默认使用原神
        gameToPass = { value: 'genshinImpact' };
      }
      
      try {
        const result = GachaUtils.getGachaTypeName(gachaType, gameToPass);
        console.log('getGachaTypeName result:', result);
        return result || `未知(${gachaType})`;
      } catch (error) {
        console.error('Error in getGachaTypeName:', error);
        return `错误(${gachaType})`;
      }
    };

    // 监听配置文件ID变化
    watch(() => props.gachaProfileId, () => {
      loadGachaEntries();
    });

    // 监听筛选条件变化
    watch(selectedGachaType, () => {
      resetPage();
      calculatePityStatus();
    });

    // 初始化时加载数据
    loadGachaEntries();

    return {
      gachaEntries,
      isLoading,
      selectedGachaType,
      currentPage,
      pageSize,
      currentPityCount,
      pityThreshold,
      gachaTypes,
      filteredEntries,
      totalEntries,
      totalPages,
      paginatedEntries,
      loadGachaEntries,
      prevPage,
      nextPage,
      resetPage,
      formatDate,
      getGachaTypeName
    };
  }
};
</script>

<style scoped>
@import './GachaHistory.css';
</style>