<template>
  <div class="gacha-system">
    <!-- 配置文件信息栏 -->
    <div v-if="selectedProfile" class="profile-info-bar">
      <div class="profile-info">
        <span class="game-name">{{ selectedProfile.gameName }}</span>
        <span class="uid">UID: {{ selectedProfile.uid }}</span>
        <span class="profile-name">{{ selectedProfile.name }}</span>
      </div>
      <div class="profile-actions">
        <button @click="toggleProfileManager" class="btn btn-secondary">
          管理配置
        </button>
      </div>
    </div>

    <!-- 没有选择配置文件时的提示 -->
    <div v-else-if="!isLoading" class="no-profile">
      <p>请先创建或选择一个抽卡配置文件</p>
      <button @click="toggleProfileManager" class="btn btn-primary">
        管理配置
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 主内容区域，当选择了配置文件时显示 -->
    <div v-if="selectedProfile && !isLoading" class="main-content">
      <!-- 标签页导航 -->
      <div class="tabs">
        <button
          :class="['tab-btn', { active: activeTab === 'history' }]"
          @click="activeTab = 'history'"
        >
          抽卡历史
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'statistics' }]"
          @click="activeTab = 'statistics'"
        >
          统计分析
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'import-export' }]"
          @click="activeTab = 'import-export'"
        >
          导入导出
        </button>
      </div>

      <!-- 标签页内容 -->
      <div class="tab-content">
        <GachaHistory
          v-if="activeTab === 'history'"
          :gachaProfileId="selectedProfile.id"
          :game="game"
        />
        <GachaStatistics
          v-if="activeTab === 'statistics'"
          :gachaProfileId="selectedProfile.id"
          :game="game"
        />
        <GachaImportExport
          v-if="activeTab === 'import-export'"
          :gachaProfileId="selectedProfile.id"
          :game="game"
          @onDataImported="handleDataImported"
        />
      </div>
    </div>

    <!-- 配置文件管理模态框 -->
    <div v-if="showProfileManager" class="modal-overlay" @click="toggleProfileManager">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>配置文件管理</h2>
          <button class="close-btn" @click="toggleProfileManager">×</button>
        </div>
        <div class="modal-body">
          <GachaProfileManager
            :selectedProfileId="selectedProfile ? selectedProfile.id : null"
            @onProfileSelect="handleProfileSelect"
            @onProfileClose="toggleProfileManager"
          />
        </div>
      </div>
    </div>

    <!-- 页脚 -->
    <footer class="footer">
      <p>© 2025 𝕾𝖙𝖊𝖑𝖑𝖆𝖌𝖔𝖌𝖚𝖊. All rights reserved.</p>
    </footer>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import GachaProfileManager from './GachaProfileManager.vue';
import GachaHistory from './GachaHistory.vue';
import GachaStatistics from './GachaStatistics.vue';
import GachaImportExport from './GachaImportExport.vue';
import { gachaService } from '../../services/gacha/GachaService';
import * as SupportedGame from '../../types/supportedGame';

export default {
  name: 'GachaSystem',
  components: {
    GachaProfileManager,
    GachaHistory,
    GachaStatistics,
    GachaImportExport
  },
  setup() {
    const selectedProfile = ref(null);
    const activeTab = ref('history');
    const showProfileManager = ref(false);
    const isLoading = ref(true);
    const game = ref(null);

    // 初始化时检查是否有默认配置文件
    onMounted(async () => {
      try {
        isLoading.value = true;
        const profiles = await gachaService.getGachaProfiles();
        
        // 如果有配置文件，默认选择第一个
        if (profiles.length > 0) {
          handleProfileSelect(profiles[0]);
        }
      } catch (error) {
        console.error('Failed to initialize gacha system:', error);
      } finally {
        isLoading.value = false;
      }
    });

    // 处理配置文件选择
    const handleProfileSelect = (profile) => {
      selectedProfile.value = profile;
      
      // 根据配置文件设置游戏
      if (profile) {
        const selectedGame = SupportedGame.getAllGames().find(g => g.value === profile.gameValue);
        game.value = selectedGame;
      } else {
        game.value = null;
      }
    };

    // 切换配置文件管理器显示
    const toggleProfileManager = () => {
      showProfileManager.value = !showProfileManager.value;
    };

    // 处理数据导入完成
    const handleDataImported = () => {
      // 数据导入后可能需要刷新相关组件的数据
      console.log('Data imported, refreshing...');
    };

    return {
      selectedProfile,
      activeTab,
      showProfileManager,
      isLoading,
      game,
      handleProfileSelect,
      toggleProfileManager,
      handleDataImported
    };
  }
};
</script>

<style scoped>
@import './GachaSystem.css';
</style>