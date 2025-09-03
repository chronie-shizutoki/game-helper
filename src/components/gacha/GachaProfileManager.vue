<template>
  <div class="gacha-profile-manager">
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 状态消息 -->
    <div v-if="statusMessage" :class="['status-message', statusType]">
      {{ statusMessage }}
    </div>

    <!-- 创建配置文件表单 -->
    <div class="create-profile-form">
      <h3>创建新配置</h3>
      <div class="form-group">
        <label for="game-select">选择游戏:</label>
        <select id="game-select" v-model="newProfile.gameValue">
          <option value="">-- 请选择游戏 --</option>
          <option v-for="game in supportedGames" :key="game.value" :value="game.value">
            {{ game.name }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label for="uid-input">UID:</label>
        <input
          id="uid-input"
          type="text"
          v-model="newProfile.uid"
          placeholder="请输入游戏UID"
        />
      </div>
      <div class="form-group">
        <label for="name-input">配置名称:</label>
        <input
          id="name-input"
          type="text"
          v-model="newProfile.name"
          placeholder="请输入配置名称"
        />
      </div>
      <button class="create-btn" @click="createProfile">
        创建配置
      </button>
    </div>

    <!-- 配置文件列表 -->
    <div class="profiles-list">
      <h3>已保存的配置</h3>
      <div v-if="profiles.length > 0" class="profiles-grid">
        <div
          v-for="profile in profiles"
          :key="profile.id"
          :class="['profile-card', { selected: selectedProfileId === profile.id }]"
          @click="selectProfile(profile)"
        >
          <div class="profile-header">
            <div class="game-icon">{{ getGameName(profile.gameValue) }}</div>
            <button class="delete-btn" @click.stop="deleteProfile(profile.id)">×</button>
          </div>
          <div class="profile-info">
            <div class="game-name">{{ getGameName(profile.gameValue) }}</div>
            <div class="uid">UID: {{ profile.uid }}</div>
            <div class="profile-name">{{ profile.name }}</div>
          </div>
        </div>
      </div>
      <div v-else class="no-profiles">
        <p>暂无配置文件</p>
      </div>
    </div>

  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { gachaService } from '../../services/gacha/GachaService';
import * as SupportedGame from '../../types/supportedGame';

export default {
  name: 'GachaProfileManager',
  props: {
    selectedProfileId: {
      type: String,
      default: null
    }
  },
  emits: ['onProfileSelect', 'onProfileClose'],
  setup(props, { emit }) {
    const profiles = ref([]);
    const isLoading = ref(true);
    const statusMessage = ref('');
    const statusType = ref('info');
    
    // 新配置文件表单数据
    const newProfile = ref({
      gameValue: '',
      uid: '',
      name: ''
    });

    // 获取支持的游戏列表
    const supportedGames = computed(() => {
      return SupportedGame.getAllGames();
    });

    // 加载配置文件列表
    const loadProfiles = async () => {
      try {
        isLoading.value = true;
        profiles.value = await gachaService.getGachaProfiles();
      } catch (error) {
        console.error('Failed to load profiles:', error);
        showStatusMessage('加载配置文件失败', 'error');
      } finally {
        isLoading.value = false;
      }
    };

    // 创建新配置文件
    const createProfile = async () => {
      // 表单验证
      if (!newProfile.value.gameValue) {
        showStatusMessage('请选择游戏', 'error');
        return;
      }
      if (!newProfile.value.uid.trim()) {
        showStatusMessage('请输入UID', 'error');
        return;
      }
      if (!newProfile.value.name.trim()) {
        showStatusMessage('请输入配置名称', 'error');
        return;
      }

      try {
        isLoading.value = true;
        const profile = await gachaService.createGachaProfile(
          newProfile.value.uid.trim(),
          SupportedGame.getAllGames().find(g => g.value === newProfile.value.gameValue),
          newProfile.value.name.trim()
        );
        
        // 重置表单
        newProfile.value = {
          gameValue: '',
          uid: '',
          name: ''
        };
        
        // 重新加载配置文件列表
        await loadProfiles();
        
        // 选择新创建的配置文件
        emit('onProfileSelect', profile);
        showStatusMessage('配置文件创建成功', 'success');
      } catch (error) {
        console.error('Failed to create profile:', error);
        showStatusMessage('配置文件创建失败', 'error');
      } finally {
        isLoading.value = false;
      }
    };

    // 选择配置文件
    const selectProfile = (profile) => {
      emit('onProfileSelect', profile);
    };

    // 删除配置文件
    const deleteProfile = async (profileId) => {
      if (confirm('确定要删除这个配置文件吗？所有相关的抽卡记录也将被删除。')) {
        try {
          isLoading.value = true;
          const gachaService = new GachaService();
          await gachaService.deleteGachaProfile(profileId);
          
          // 如果删除的是当前选中的配置文件，则清除选中状态
          if (props.selectedProfileId === profileId) {
            emit('onProfileSelect', null);
          }
          
          // 重新加载配置文件列表
          await loadProfiles();
          showStatusMessage('配置文件删除成功', 'success');
        } catch (error) {
          console.error('Failed to delete profile:', error);
          showStatusMessage('配置文件删除失败', 'error');
        } finally {
          isLoading.value = false;
        }
      }
    };

    // 显示状态消息
    const showStatusMessage = (message, type = 'info') => {
      statusMessage.value = message;
      statusType.value = type;
      
      // 3秒后自动清除消息
      setTimeout(() => {
        statusMessage.value = '';
      }, 3000);
    };

    // 获取游戏名称
    const getGameName = (gameValue) => {
      const game = SupportedGame.getAllGames().find(g => g.value === gameValue);
      return game ? game.name : '未知游戏';
    };

    // 初始化时加载配置文件列表
    onMounted(() => {
      loadProfiles();
    });

    return {
      profiles,
      isLoading,
      statusMessage,
      statusType,
      newProfile,
      supportedGames,
      createProfile,
      selectProfile,
      deleteProfile,
      getGameName
    };
  }
};
</script>

<style scoped>
@import './GachaProfileManager.css';
</style>