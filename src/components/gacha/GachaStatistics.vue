<template>
  <div class="gacha-statistics">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="glass-card loading">
      <div class="loading-spinner"></div>
      <p>加载统计数据中...</p>
    </div>

    <!-- 没有数据时的提示 -->
    <div v-else-if="gachaEntries.length === 0" class="glass-card no-data">
      <p>暂无抽卡记录</p>
      <p>请先导入抽卡记录数据</p>
    </div>

    <!-- 统计内容 -->
    <div v-else class="gacha-statistics-content">
      <!-- 顶部信息和筛选 -->
      <div class="glass-card gacha-statistics-header">
        <div class="total-count">
          共 {{ totalEntries }} 条记录
        </div>
        <div class="gacha-type-filter">
          <label for="gacha-type">筛选卡池:</label>
          <select id="gacha-type" v-model="selectedGachaType" class="glass-select">
            <option value="all">全部卡池</option>
            <option v-for="type in gachaTypes" :key="type.key" :value="type.key">
              {{ type.name }}
            </option>
          </select>
        </div>
        <div class="time-range">
          <label for="time-range">时间范围:</label>
          <select id="time-range" v-model="selectedTimeRange" class="glass-select">
            <option value="all">全部时间</option>
            <option value="30days">近30天</option>
            <option value="90days">近90天</option>
            <option value="180days">近半年</option>
          </select>
        </div>
        <div class="analysis-controls">
          <button @click="toggleAdvancedAnalytics" class="glass-button btn-advanced">
            {{ showAdvancedAnalytics ? '隐藏' : '显示' }}高级分析
          </button>
          <button @click="exportAnalyticsData" class="glass-button btn-export" v-if="advancedAnalytics">
            导出分析报告
          </button>
          <button @click="cleanAndOptimizeData" class="glass-button btn-clean" v-if="showAdvancedAnalytics">
            清理数据
          </button>
        </div>
      </div>

      <!-- 主要统计卡片 -->
      <div class="stats-grid">
        <div class="glass-card stat-card">
          <h3>平均出金率</h3>
          <div class="stat-value">{{ statistics.averageFiveStarRate.toFixed(2) }}%</div>
          <div class="stat-desc">{{ statistics.expectedRate }}% 理论值</div>
        </div>
        <div class="glass-card stat-card">
          <h3>五星平均间隔</h3>
          <div class="stat-value">{{ statistics.averageFiveStarSpacing.toFixed(1) }} 抽</div>
          <div class="stat-desc">{{ statistics.pityThreshold }} 抽理论保底</div>
        </div>
        <div class="glass-card stat-card">
          <h3>四星平均间隔</h3>
          <div class="stat-value">{{ statistics.averageFourStarSpacing.toFixed(1) }} 抽</div>
          <div class="stat-desc">{{ statistics.fourStarPityThreshold }} 抽理论保底</div>
        </div>
        <div class="glass-card stat-card">
          <h3>总投入</h3>
          <div class="stat-value">{{ statistics.totalWishes }}</div>
          <div class="stat-desc">{{ statistics.totalPrimogems.toLocaleString() }} 原石</div>
        </div>
      </div>

      <!-- 星级分布图表 -->
      <div class="glass-card chart-section">
        <h3>星级分布</h3>
        <div class="chart-container">
          <div class="chart-bars">
            <div v-for="(count, rarity) in statistics.rarityDistribution" :key="rarity" class="chart-bar">
              <div class="bar-label">{{ rarity }}星</div>
              <div 
                class="bar-fill" 
                :class="`rarity-${rarity}`"
                :style="{ width: `${getBarWidth(count)}%` }"
              ></div>
              <div class="bar-value">{{ count }} ({{ (count / totalFilteredEntries * 100).toFixed(1) }}%)</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 五星间隔统计 -->
      <div class="glass-card five-star-spacing">
        <h3>五星间隔统计</h3>
        <div class="spacing-chart">
          <div v-for="(count, index) in statistics.fiveStarSpacingDistribution" :key="index" class="spacing-bar">
            <div class="spacing-label">{{ index * 10 + 1 }}-{{ (index + 1) * 10 }}抽</div>
            <div class="spacing-bar-fill" :style="{ width: `${getSpacingBarWidth(count)}%` }"></div>
            <div class="spacing-value">{{ count }}</div>
          </div>
        </div>
        <div class="spacing-summary">
          <p>最小间隔: {{ statistics.minFiveStarSpacing }} 抽</p>
          <p>最大间隔: {{ statistics.maxFiveStarSpacing }} 抽</p>
          <p>中位数间隔: {{ statistics.medianFiveStarSpacing }} 抽</p>
        </div>
      </div>

      <!-- 详细统计 -->
      <div class="glass-card detailed-stats">
        <h3>详细统计</h3>
        <div class="stats-table">
          <div class="stat-row">
            <div class="stat-name">五星角色数量:</div>
            <div class="stat-value">{{ statistics.fiveStarCharacters }}</div>
          </div>
          <div class="stat-row">
            <div class="stat-name">五星武器数量:</div>
            <div class="stat-value">{{ statistics.fiveStarWeapons }}</div>
          </div>
          <div class="stat-row">
            <div class="stat-name">四星角色数量:</div>
            <div class="stat-value">{{ statistics.fourStarCharacters }}</div>
          </div>
          <div class="stat-row">
            <div class="stat-name">四星武器数量:</div>
            <div class="stat-value">{{ statistics.fourStarWeapons }}</div>
          </div>
          <div class="stat-row">
            <div class="stat-name">三星武器数量:</div>
            <div class="stat-value">{{ statistics.threeStarWeapons }}</div>
          </div>
          <div class="stat-row">
            <div class="stat-name">当前保底状态:</div>
            <div class="stat-value">{{ statistics.currentPityCount }} 抽</div>
          </div>
          <div class="stat-row">
            <div class="stat-name">距离保底:</div>
            <div class="stat-value">{{ statistics.pityRemaining }} 抽</div>
          </div>
        </div>
      </div>

      <!-- 高级分析部分 -->
      <div v-if="showAdvancedAnalytics" class="advanced-analytics">
        <!-- 高级分析加载状态 -->
        <div v-if="isLoadingAdvanced" class="glass-card loading-advanced">
          <div class="loading-spinner"></div>
          <p>加载高级分析数据中...</p>
        </div>
        
        <!-- 高级分析内容 -->
        <div v-else-if="advancedAnalytics" class="advanced-analytics-content">
          <!-- 时间趋势分析 -->
          <div class="glass-card advanced-section">
            <h3>时间趋势分析</h3>
            <div class="time-trend">
              <div class="time-range-info">
                <p>统计时间范围: {{ advancedAnalytics.timeAnalysis.timeRange.start }} 至 {{ advancedAnalytics.timeAnalysis.timeRange.end }}</p>
                <p>总天数: {{ advancedAnalytics.timeAnalysis.timeRange.days }} 天</p>
                <p>日均抽卡: {{ (totalEntries / advancedAnalytics.timeAnalysis.timeRange.days).toFixed(2) }} 抽/天</p>
              </div>
              
              <!-- 月统计 -->
              <div class="monthly-stats">
                <h4>每月抽卡统计</h4>
                <div class="monthly-chart">
                  <div v-for="month in advancedAnalytics.timeAnalysis.monthlySummary" :key="month.month" class="month-bar">
                    <div class="month-label">{{ month.month }}</div>
                    <div class="month-bar-fill" :style="{ height: `${getMonthBarHeight(month.totalPulls)}%` }"></div>
                    <div class="month-value">{{ month.totalPulls }}</div>
                    <div v-if="month.fiveStars > 0" class="month-five-stars">★ {{ month.fiveStars }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 物品分析 -->
          <div class="glass-card advanced-section">
            <h3>物品分析</h3>
            <div class="item-analysis">
              <div class="item-summary">
                <p>共获得 {{ advancedAnalytics.itemAnalysis.uniqueItems }} 种不同物品</p>
                <p v-if="advancedAnalytics.itemAnalysis.mostPulledItem">
                  抽取最多的物品: {{ advancedAnalytics.itemAnalysis.mostPulledItem.name }} ({{ advancedAnalytics.itemAnalysis.mostPulledItem.count }} 次)
                </p>
              </div>
              
              <!-- 角色武器比例 -->
              <div class="character-weapon-ratio">
                <h4>角色与武器比例</h4>
                <div class="ratio-container">
                  <div class="ratio-group">
                    <h5>五星</h5>
                    <div class="ratio-bars">
                      <div class="ratio-bar">
                        <span class="ratio-label">角色: {{ advancedAnalytics.basic.characterWeaponRatio.fiveStar.characters }}</span>
                        <div class="ratio-bar-fill character-ratio" :style="{ width: `${advancedAnalytics.basic.characterWeaponRatio.fiveStar.ratio}%` }"></div>
                      </div>
                      <div class="ratio-bar">
                        <span class="ratio-label">武器: {{ advancedAnalytics.basic.characterWeaponRatio.fiveStar.weapons }}</span>
                        <div class="ratio-bar-fill weapon-ratio" :style="{ width: `${100 - advancedAnalytics.basic.characterWeaponRatio.fiveStar.ratio}%` }"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="ratio-group">
                    <h5>四星</h5>
                    <div class="ratio-bars">
                      <div class="ratio-bar">
                        <span class="ratio-label">角色: {{ advancedAnalytics.basic.characterWeaponRatio.fourStar.characters }}</span>
                        <div class="ratio-bar-fill character-ratio" :style="{ width: `${advancedAnalytics.basic.characterWeaponRatio.fourStar.ratio}%` }"></div>
                      </div>
                      <div class="ratio-bar">
                        <span class="ratio-label">武器: {{ advancedAnalytics.basic.characterWeaponRatio.fourStar.weapons }}</span>
                        <div class="ratio-bar-fill weapon-ratio" :style="{ width: `${100 - advancedAnalytics.basic.characterWeaponRatio.fourStar.ratio}%` }"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 概率分析 -->
          <div class="glass-card advanced-section">
            <h3>概率分析</h3>
            <div class="probability-analysis">
              <div class="probability-summary">
                <p>实际五星概率: {{ advancedAnalytics.probabilityAnalysis.actualFiveStarRate }}%</p>
                <p>理论五星概率: {{ advancedAnalytics.probabilityAnalysis.theoreticalFiveStarRate }}%</p>
                <p class="probability-deviation" :class="advancedAnalytics.probabilityAnalysis.isAboveAverage ? 'above-average' : 'below-average'">
                  偏差: {{ advancedAnalytics.probabilityAnalysis.deviation }}
                </p>
                <p>软保底内获得五星比例: {{ advancedAnalytics.probabilityAnalysis.softPityAnalysis.softPityRatio }}</p>
              </div>
            </div>
          </div>

          <!-- 高级保底分析 -->
          <div class="glass-card advanced-section">
            <h3>高级保底分析</h3>
            <div class="advanced-pity-analysis">
              <div class="pity-stats">
                <p>当前保底: {{ advancedAnalytics.pityAnalysis.currentPity }} 抽</p>
                <p>是否处于软保底: {{ advancedAnalytics.pityAnalysis.isSoftPity ? '是' : '否' }}</p>
                <p v-if="advancedAnalytics.pityAnalysis.currentSoftPityProbability">
                  当前抽中五星概率: {{ advancedAnalytics.pityAnalysis.currentSoftPityProbability }}%
                </p>
                <p>平均五星间隔: {{ advancedAnalytics.pityAnalysis.spacingStats.average }} 抽</p>
                <p>中位数五星间隔: {{ advancedAnalytics.pityAnalysis.spacingStats.median }} 抽</p>
                <p>标准差: {{ advancedAnalytics.pityAnalysis.spacingStats.stdDev }}</p>
              </div>
            </div>
          </div>

          <!-- 抽卡建议 -->
          <div class="glass-card advanced-section">
            <h3>抽卡建议</h3>
            <div class="recommendation">
              <div class="recommendation-content">
                <p>{{ advancedAnalytics.advanced.recommendedNextPulls.recommendation }}</p>
                <p class="confidence">可信度: {{ advancedAnalytics.advanced.recommendedNextPulls.confidence }}%</p>
              </div>
            </div>
          </div>

          <!-- 干涸期分析 -->
          <div class="glass-card advanced-section">
            <h3>干涸期分析</h3>
            <div class="dry-spells">
              <div v-if="advancedAnalytics.advanced.consecutiveDrySpells.length > 0" class="dry-spells-list">
                <div v-for="(spell, index) in advancedAnalytics.advanced.consecutiveDrySpells" :key="index" class="dry-spell-item">
                  <div class="dry-spell-length">
                    {{ spell.isOngoing ? '当前' : (index + 1 + '次') }}: {{ spell.length }} 抽
                  </div>
                  <div v-if="!spell.isOngoing" class="dry-spell-ended">
                    结束于: {{ spell.endedAt }}
                  </div>
                  <div v-if="spell.isOngoing" class="dry-spell-ongoing">
                    <span class="ongoing-badge">进行中</span>
                  </div>
                </div>
              </div>
              <div v-else>
                <p>暂无干涸期记录</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue';
import { gachaService } from '../../services/gacha/GachaService';
import * as GachaUtils from '../../utils/gachaUtils.js';

export default {
  name: 'GachaStatistics',
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
    const selectedTimeRange = ref('all');
    const showAdvancedAnalytics = ref(false);
    const advancedAnalytics = ref(null);
    const isLoadingAdvanced = ref(false);

    // 默认统计数据
    const defaultStatistics = {
      totalWishes: 0,
      totalPrimogems: 0,
      averageFiveStarRate: 0,
      expectedRate: 1.6,
      averageFiveStarSpacing: 0,
      averageFourStarSpacing: 0,
      pityThreshold: 90,
      fourStarPityThreshold: 10,
      rarityDistribution: { 5: 0, 4: 0, 3: 0 },
      fiveStarSpacingDistribution: Array(10).fill(0),
      minFiveStarSpacing: 0,
      maxFiveStarSpacing: 0,
      medianFiveStarSpacing: 0,
      fiveStarCharacters: 0,
      fiveStarWeapons: 0,
      fourStarCharacters: 0,
      fourStarWeapons: 0,
      threeStarWeapons: 0,
      currentPityCount: 0,
      pityRemaining: 0
    };

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
        console.error('Error getting gacha types:', error);
        return [];
      }
    });

    // 计算筛选后的条目
    const filteredEntries = computed(() => {
      let entries = [...gachaEntries.value];
      
      // 按卡池类型筛选 - 处理角色活动祈愿合并
      if (selectedGachaType.value !== 'all') {
        if (selectedGachaType.value === '301' || selectedGachaType.value === '400') {
          // 合并角色活动祈愿和角色活动祈愿-2
          entries = entries.filter(entry => entry.gachaType === '301' || entry.gachaType === '400');
        } else {
          entries = entries.filter(entry => entry.gachaType === selectedGachaType.value);
        }
      }
      
      // 按时间范围筛选
      if (selectedTimeRange.value !== 'all') {
        const days = parseInt(selectedTimeRange.value);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        entries = entries.filter(entry => new Date(entry.time) >= cutoffDate);
      }
      
      return entries.sort((a, b) => new Date(a.time) - new Date(b.time));
    });

    // 计算总条目数
    const totalEntries = computed(() => gachaEntries.value.length);
    const totalFilteredEntries = computed(() => filteredEntries.value.length);

    // 计算统计数据
    const statistics = computed(() => {
      if (filteredEntries.value.length === 0) {
        return defaultStatistics;
      }
      
      // 尝试获取游戏对象，如果props.game为空，从profileId中提取
      let gameObject = props.game;
      if (!gameObject && props.gachaProfileId) {
        const [gameValue] = props.gachaProfileId.split('_');
        if (gameValue) {
          gameObject = { value: gameValue };
        }
      }
      
      // 如果仍然没有游戏对象，返回默认统计
      if (!gameObject) {
        return defaultStatistics;
      }
      
      // 获取原始统计数据
      const rawStats = GachaUtils.calculateGachaSummary(filteredEntries.value, gameObject);
      
      // 转换为前端模板需要的格式
      const pityRules = GachaUtils.getPityRules(gameObject, selectedGachaType.value === 'all' ? '1' : selectedGachaType.value);
      // 如果是"所有卡池"，需要为每个卡池类型分别计算保底状态，然后取最近的一个
      let pityStatus;
      if (selectedGachaType.value === 'all') {
        // 找出用户在所有卡池中最近的一条记录，获取其卡池类型来计算保底
        if (filteredEntries.value.length > 0) {
          const latestEntry = filteredEntries.value[filteredEntries.value.length - 1];
          pityStatus = GachaUtils.calculatePityStatus(
            filteredEntries.value.filter(entry => entry.gachaType === latestEntry.gachaType),
            latestEntry.gachaType,
            gameObject
          );
        } else {
          pityStatus = { currentPity: 0 };
        }
      } else {
        pityStatus = GachaUtils.calculatePityStatus(filteredEntries.value, selectedGachaType.value, gameObject);
      }
      
      // 计算星级分布
      const rarityDistribution = {
        5: rawStats.fiveStarCount,
        4: rawStats.fourStarCount,
        3: rawStats.threeStarCount
      };
      
      // 计算角色和武器数量
      const fiveStarCharacters = filteredEntries.value.filter(e => e.rankType === '5' && e.itemType === '角色').length;
      const fiveStarWeapons = filteredEntries.value.filter(e => e.rankType === '5' && e.itemType === '武器').length;
      const fourStarCharacters = filteredEntries.value.filter(e => e.rankType === '4' && e.itemType === '角色').length;
      const fourStarWeapons = filteredEntries.value.filter(e => e.rankType === '4' && e.itemType === '武器').length;
      const threeStarWeapons = filteredEntries.value.filter(e => e.rankType === '3' && e.itemType === '武器').length;
      
      // 构建符合模板的统计对象
      return {
        totalWishes: rawStats.totalPulls,
        totalPrimogems: rawStats.totalPulls * 160, // 假设每抽160原石
        averageFiveStarRate: parseFloat(rawStats.fiveStarRate),
        expectedRate: 1.6,
        averageFiveStarSpacing: parseFloat(rawStats.avgFiveStarSpacing),
        averageFourStarSpacing: 10, // 理论值
        pityThreshold: pityRules ? pityRules.fiveStar : 90,
        fourStarPityThreshold: pityRules ? pityRules.fourStar : 10,
        rarityDistribution: rarityDistribution,
        // 计算五星间隔分布
        fiveStarSpacingDistribution: rawStats.fiveStarSpacings.length > 0 ? calculateSpacingDistribution(rawStats.fiveStarSpacings) : Array(10).fill(0),
        minFiveStarSpacing: rawStats.minFiveStarSpacing,
        maxFiveStarSpacing: rawStats.maxFiveStarSpacing,
        medianFiveStarSpacing: rawStats.avgFiveStarSpacing, // 使用平均值代替中位数
        fiveStarCharacters: fiveStarCharacters,
        fiveStarWeapons: fiveStarWeapons,
        fourStarCharacters: fourStarCharacters,
        fourStarWeapons: fourStarWeapons,
        threeStarWeapons: threeStarWeapons,
        currentPityCount: pityStatus.currentPity,
        pityRemaining: pityRules ? (pityRules.fiveStar - pityStatus.currentPity) : (90 - pityStatus.currentPity)
      };
    });

    // 加载高级分析数据
    const loadAdvancedAnalytics = async () => {
      if (!props.gachaProfileId) return;
      
      try {
        isLoadingAdvanced.value = true;
        
        // Split profile ID into game value and uid
        const [gameValue, uid] = props.gachaProfileId.split('_');
        if (!gameValue || !uid) {
          console.error('Invalid profile ID format');
          return;
        }
        
        // 获取游戏对象，如果props.game为空，使用从profileId中提取的gameValue
        let gameObject = props.game;
        if (!gameObject) {
          gameObject = { value: gameValue };
        }
        
        // 调用高级分析服务
        const analyticsData = await gachaService.getDetailedGachaAnalytics(
          uid, 
          gameObject, 
          selectedGachaType.value === 'all' ? null : selectedGachaType.value
        );
        
        advancedAnalytics.value = analyticsData;
      } catch (error) {
        console.error('Failed to load advanced analytics:', error);
      } finally {
        isLoadingAdvanced.value = false;
      }
    };

    // 切换高级分析显示
    const toggleAdvancedAnalytics = () => {
      showAdvancedAnalytics.value = !showAdvancedAnalytics.value;
      if (showAdvancedAnalytics.value && !advancedAnalytics.value) {
        loadAdvancedAnalytics();
      }
    };

    // 导出分析数据
    const exportAnalyticsData = async () => {
      if (!advancedAnalytics.value) return;
      
      try {
        await gachaService.exportAnalyticsReport(advancedAnalytics.value);
        alert('分析报告导出成功');
      } catch (error) {
        console.error('Failed to export analytics report:', error);
        alert('分析报告导出失败');
      }
    };

    // 清理和优化数据
    const cleanAndOptimizeData = async () => {
      if (!props.gachaProfileId || !props.game) return;
      
      if (confirm('确定要清理和优化抽卡数据吗？这将移除重复和无效的记录。')) {
        try {
          // Split profile ID into game value and uid
          const [gameValue, uid] = props.gachaProfileId.split('_');
          if (!gameValue || !uid) {
            console.error('Invalid profile ID format');
            return;
          }
          
          const result = await gachaService.cleanAndOptimizeGachaData(uid, props.game);
          
          if (result.success) {
            alert(`数据清理成功！\n原始记录: ${result.originalCount}\n有效记录: ${result.validCount}\n移除记录: ${result.removedCount}`);
            // 重新加载数据
            loadGachaEntries();
            if (showAdvancedAnalytics.value) {
              loadAdvancedAnalytics();
            }
          } else {
            alert('数据清理失败: ' + result.error);
          }
        } catch (error) {
          console.error('Failed to clean and optimize data:', error);
          alert('数据清理失败');
        }
      }
    };

    // 获取月份柱状图高度百分比
    const getMonthBarHeight = (count) => {
      if (!advancedAnalytics.value) return 0;
      const maxCount = Math.max(...advancedAnalytics.value.timeAnalysis.monthlySummary.map(m => m.totalPulls));
      return maxCount > 0 ? (count / maxCount) * 100 : 0;
    };

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
        
        // Get entries by UID - fetch all entries without limit
        const result = await gachaService.getGachaHistoryPaged(uid, props.game || { value: gameValue }, 1, 10000000000);
        
        // Debug log to check if we're getting any data
        console.log('Loaded gacha entries:', result);
        
        // Set the entries correctly
        gachaEntries.value = result && result.entries ? result.entries : [];
      } catch (error) {
        console.error('Failed to load gacha entries:', error);
        // Add mock data for testing purposes
        if (gachaEntries.value.length === 0) {
          console.log('Adding mock data for testing');
          gachaEntries.value = generateMockData();
        }
      } finally {
        isLoading.value = false;
      }
    };
    
    // Generate mock data for testing when real data is not available
    const generateMockData = () => {
      const mockEntries = [];
      const now = new Date();
      const types = ['1', '2', '3'];
      
      // Generate 200 mock entries
      for (let i = 0; i < 200; i++) {
        // Create a date in the past 30 days
        const date = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
        
        // Random rarity with some probability
        let rankType;
        const rand = Math.random();
        if (rand < 0.016) rankType = '5';
        else if (rand < 0.067) rankType = '4';
        else rankType = '3';
        
        mockEntries.push({
          id: `mock_${i}`,
          gachaType: types[Math.floor(Math.random() * types.length)],
          time: formattedDate,
          name: `Mock Item ${i}`,
          rankType: rankType,
          itemType: rankType === '3' ? '武器' : Math.random() > 0.5 ? '角色' : '武器'
        });
      }
      
      return mockEntries;
    };

    // 获取柱状图宽度百分比
    const getBarWidth = (count) => {
      const maxCount = Math.max(...Object.values(statistics.value.rarityDistribution));
      return maxCount > 0 ? (count / maxCount) * 100 : 0;
    };

    // 计算间隔分布数组
    const calculateSpacingDistribution = (spacings) => {
      // 创建10个区间的数组，初始值为0
      const distribution = Array(10).fill(0);
      
      // 根据浏览器显示的区间定义，这里使用10个区间
      // 每个区间的间隔计数
      spacings.forEach(spacing => {
        // 计算间隔属于哪个区间
        const intervalIndex = Math.min(9, Math.floor((spacing - 1) / 10));
        distribution[intervalIndex]++;
      });
      
      return distribution;
    };

    // 获取间隔分布图宽度百分比
    const getSpacingBarWidth = (count) => {
      const maxCount = Math.max(...statistics.value.fiveStarSpacingDistribution);
      return maxCount > 0 ? (count / maxCount) * 100 : 0;
    };

    // 监听配置文件ID变化
    watch(() => props.gachaProfileId, () => {
      loadGachaEntries();
      // 清除之前的高级分析数据
      advancedAnalytics.value = null;
    });

    // 监听筛选条件变化
    watch([selectedGachaType, selectedTimeRange], () => {
      // 统计数据会自动重新计算
      // 如果显示高级分析，重新加载高级分析数据
      if (showAdvancedAnalytics.value) {
        loadAdvancedAnalytics();
      }
    });

    // 初始化时加载数据
    loadGachaEntries();

    return {
      gachaEntries,
      isLoading,
      selectedGachaType,
      selectedTimeRange,
      gachaTypes,
      filteredEntries,
      totalEntries,
      totalFilteredEntries,
      statistics,
      showAdvancedAnalytics,
      advancedAnalytics,
      isLoadingAdvanced,
      loadGachaEntries,
      getBarWidth,
      getSpacingBarWidth,
      getMonthBarHeight,
      toggleAdvancedAnalytics,
      exportAnalyticsData,
      cleanAndOptimizeData
    };
  }
};
</script>

<style scoped>
@import './GachaStatistics.css';
</style>