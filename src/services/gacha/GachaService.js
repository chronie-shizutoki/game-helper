/**
 * 抽卡服务，提供高级别的抽卡操作功能
 * 对应 GachaFetchVM 和其他抽卡相关的视图模型
 */
import { gachaDBService, saveGachaEntry, batchSaveGachaEntries, getGachaEntriesByUid, getGachaEntriesByUidSortedByTime, deleteGachaEntriesByUid, saveGachaProfile, getAllGachaProfiles } from './GachaDBService';
import { gachaAnalyticsService } from './GachaAnalyticsService';
import { GachaEntry } from '../../models/gacha/GachaEntry';
import { GachaProfileID } from '../../models/gacha/GachaProfileID';
import { getGachaPoolType, getAllGachaPoolTypes } from '../../models/gacha/GachaPoolType';
import SupportedGame from '../../types/supportedGame';

class GachaService {
  /**
   * 初始化服务
   * @returns {Promise<void>}
   */
  async init() {
    await gachaDBService.init();
  }

  /**
   * 关闭服务
   */
  close() {
    gachaDBService.close();
  }

  /**
   * 导入抽卡记录（从JSON格式）
   * @param {Array<Object>} jsonData 抽卡记录的JSON数组
   * @param {string} uid 用户ID
   * @param {Object} game 游戏对象
   * @returns {Promise<{success: boolean, imported: number, duplicates: number, errors: number}>} 导入结果
   */
  async importGachaEntries(jsonData, uid, game) {
    let importedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    try {
      const existingEntries = await getGachaEntriesByUid(uid, game.value);
      const existingIds = new Set(existingEntries.map(entry => entry.id));
      const newEntries = [];

      for (const item of jsonData) {
        try {
          // 标准化数据格式
          const normalizedItem = this._normalizeGachaEntry(item, uid, game);
          const gachaEntry = new GachaEntry(normalizedItem);

          // 检查是否已存在
          if (!existingIds.has(gachaEntry.id)) {
            newEntries.push(gachaEntry);
            importedCount++;
          } else {
            duplicateCount++;
          }
        } catch (error) {
          console.error('Failed to process entry:', item, error);
          errorCount++;
        }
      }

      // 批量保存新记录
      if (newEntries.length > 0) {
        await batchSaveGachaEntries(newEntries);
      }

      return {
        success: true,
        imported: importedCount,
        duplicates: duplicateCount,
        errors: errorCount
      };
    } catch (error) {
      console.error('Failed to import gacha entries:', error);
      return {
        success: false,
        imported: importedCount,
        duplicates: duplicateCount,
        errors: errorCount + 1
      };
    }
  }

  /**
   * 导出抽卡记录为JSON格式
   * @param {string} uid 用户ID
   * @param {Object} game 游戏对象
   * @returns {Promise<Array<Object>>} 抽卡记录的JSON数组
   */
  async exportGachaEntries(uid, game) {
    const entries = await getGachaEntriesByUidSortedByTime(uid, game.value, true);
    return entries.map(entry => entry.toJSON());
  }

  /**
   * 获取指定用户的抽卡统计信息
   * @param {string} uid 用户ID
   * @param {Object} game 游戏对象
   * @returns {Promise<Object>} 统计信息
   */
  async getGachaStatistics(uid, game) {
    const entries = await getGachaEntriesByUidSortedByTime(uid, game.value, true);
    const poolTypes = getAllGachaPoolTypes(game);

    // 按抽卡池类型分组
    const byPoolType = {};
    poolTypes.forEach(type => {
      byPoolType[type.type] = {
        type,
        count: 0,
        fiveStarCount: 0,
        fourStarCount: 0,
        threeStarCount: 0,
        entries: [],
        pity: {
          current: 0,
          max: 0,
          lastFiveStar: 0
        }
      };
    });

    // 全局统计
    const globalStats = {
      totalPulls: 0,
      fiveStarCount: 0,
      fourStarCount: 0,
      threeStarCount: 0,
      fiveStarRate: 0,
      fourStarRate: 0,
      threeStarRate: 0,
      recentFiveStars: [],
      recentFourStars: []
    };

    // 计算每个抽卡池类型的统计信息
    let currentPityByType = {};
    let maxPityByType = {};
    let lastFiveStarByType = {};

    entries.forEach((entry, index) => {
      const { gachaType, rankType } = entry;
      const typeStats = byPoolType[gachaType] || {
        type: null,
        count: 0,
        fiveStarCount: 0,
        fourStarCount: 0,
        threeStarCount: 0,
        entries: [],
        pity: {
          current: 0,
          max: 0,
          lastFiveStar: 0
        }
      };

      // 更新计数
      typeStats.count++;
      globalStats.totalPulls++;

      if (rankType === '5') {
        typeStats.fiveStarCount++;
        globalStats.fiveStarCount++;
        globalStats.recentFiveStars.unshift(entry);
        
        // 重置该类型的保底计数
        if (currentPityByType[gachaType] !== undefined) {
          typeStats.pity.lastFiveStar = currentPityByType[gachaType] + 1;
          if (currentPityByType[gachaType] + 1 > maxPityByType[gachaType]) {
            maxPityByType[gachaType] = currentPityByType[gachaType] + 1;
          }
        }
        currentPityByType[gachaType] = 0;
      } else if (rankType === '4') {
        typeStats.fourStarCount++;
        globalStats.fourStarCount++;
        globalStats.recentFourStars.unshift(entry);
        
        // 增加该类型的保底计数
        currentPityByType[gachaType] = (currentPityByType[gachaType] || 0) + 1;
      } else {
        typeStats.threeStarCount++;
        globalStats.threeStarCount++;
        
        // 增加该类型的保底计数
        currentPityByType[gachaType] = (currentPityByType[gachaType] || 0) + 1;
      }

      typeStats.entries.push(entry);
      byPoolType[gachaType] = typeStats;
    });

    // 更新当前保底计数和最大保底计数
    Object.keys(currentPityByType).forEach(gachaType => {
      const stats = byPoolType[gachaType];
      stats.pity.current = currentPityByType[gachaType];
      stats.pity.max = maxPityByType[gachaType] || 0;
    });

    // 计算概率
    if (globalStats.totalPulls > 0) {
      globalStats.fiveStarRate = (globalStats.fiveStarCount / globalStats.totalPulls * 100).toFixed(2);
      globalStats.fourStarRate = (globalStats.fourStarCount / globalStats.totalPulls * 100).toFixed(2);
      globalStats.threeStarRate = (globalStats.threeStarCount / globalStats.totalPulls * 100).toFixed(2);
    }

    // 限制最近抽到的角色/武器数量
    globalStats.recentFiveStars = globalStats.recentFiveStars.slice(0, 10);
    globalStats.recentFourStars = globalStats.recentFourStars.slice(0, 10);

    return {
      global: globalStats,
      byPoolType,
      entries: entries
    };
  }

  /**
   * 获取指定用户和抽卡池类型的抽卡记录
   * @param {string} uid 用户ID
   * @param {Object} game 游戏对象
   * @param {string} gachaType 抽卡池类型
   * @param {number} limit 限制返回的记录数
   * @returns {Promise<Array<GachaEntry>>} 抽卡记录数组
   */
  async getGachaEntriesByType(uid, game, gachaType, limit = 100) {
    const entries = await getGachaEntriesByUidSortedByTime(uid, game.value, false);
    const filteredEntries = entries.filter(entry => entry.gachaType === gachaType);
    return filteredEntries.slice(0, limit);
  }

  /**
   * 获取指定用户的抽卡历史（分页）
   * @param {string} uid 用户ID
   * @param {Object} game 游戏对象
   * @param {number} page 页码
   * @param {number} pageSize 每页记录数
   * @returns {Promise<{entries: Array<GachaEntry>, total: number, page: number, pageSize: number, totalPages: number}>} 分页数据
   */
  async getGachaHistoryPaged(uid, game, page = 1, pageSize = 100) {
    const entries = await getGachaEntriesByUidSortedByTime(uid, game.value, false);
    const total = entries.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);
    const paginatedEntries = entries.slice(startIndex, endIndex);

    return {
      entries: paginatedEntries,
      total,
      page,
      pageSize,
      totalPages
    };
  }

  /**
   * 删除指定用户的所有抽卡记录
   * @param {string} uid 用户ID
   * @param {Object} game 游戏对象
   * @returns {Promise<boolean>} 操作结果
   */
  async clearAllGachaEntries(uid, game) {
    try {
      await deleteGachaEntriesByUid(uid, game.value);
      return true;
    } catch (error) {
      console.error('Failed to clear gacha entries:', error);
      return false;
    }
  }

  /**
   * 创建新的抽卡配置文件
   * @param {string} uid 用户ID
   * @param {Object} game 游戏对象
   * @param {string|null} profileName 配置文件名称
   * @returns {Promise<GachaProfileID|null>} 配置文件对象或null
   */
  async createGachaProfile(uid, game, profileName = null) {
    try {
      const profile = new GachaProfileID(uid, game, profileName);
      await saveGachaProfile(profile);
      return profile;
    } catch (error) {
      console.error('Failed to create gacha profile:', error);
      return null;
    }
  }

  /**
   * 获取所有抽卡配置文件
   * @returns {Promise<Array<GachaProfileID>>} 配置文件数组
   */
  async getGachaProfiles() {
    return getAllGachaProfiles();
  }

  /**
   * 获取指定游戏的所有抽卡配置文件
   * @param {Object} game 游戏对象
   * @returns {Promise<Array<GachaProfileID>>} 配置文件数组
   */
  async getGachaProfilesByGame(game) {
    const allProfiles = await getAllGachaProfiles();
    return allProfiles.filter(profile => profile.game.value === game.value);
  }

  /**
   * 获取抽卡池类型信息
   * @param {Object} game 游戏对象
   * @param {string} gachaType 抽卡池类型ID
   * @returns {Object|null} 抽卡池类型对象或null
   */
  getPoolTypeInfo(game, gachaType) {
    return getGachaPoolType(game, gachaType);
  }

  /**
   * 获取所有抽卡池类型
   * @param {Object} game 游戏对象
   * @returns {Array<Object>} 抽卡池类型数组
   */
  getAllPoolTypes(game) {
    return getAllGachaPoolTypes(game);
  }

  /**
   * 获取详细的抽卡数据分析
   * @param {string} uid 用户ID
   * @param {Object} game 游戏对象
   * @param {string} gachaType 可选，抽卡池类型
   * @returns {Promise<Object>} 详细分析数据
   */
  async getDetailedGachaAnalytics(uid, game, gachaType = null) {
    try {
      return await gachaAnalyticsService.getDetailedAnalytics(uid, game.value, gachaType);
    } catch (error) {
      console.error('Failed to get detailed gacha analytics:', error);
      throw error;
    }
  }

  /**
   * 清理和优化抽卡数据
   * @param {string} uid 用户ID
   * @param {Object} game 游戏对象
   * @returns {Promise<Object>} 清理结果
   */
  async cleanAndOptimizeGachaData(uid, game) {
    try {
      return await gachaAnalyticsService.cleanAndOptimizeData(uid, game.value);
    } catch (error) {
      console.error('Failed to clean and optimize gacha data:', error);
      throw error;
    }
  }

  /**
   * 导出分析报告
   * @param {Object} analyticsData 分析数据
   * @param {string} filename 文件名
   * @returns {Promise<boolean>} 导出是否成功
   */
  async exportAnalyticsReport(analyticsData, filename = 'gacha_analytics_report.json') {
    try {
      return await gachaAnalyticsService.exportAnalyticsReport(analyticsData, filename);
    } catch (error) {
      console.error('Failed to export analytics report:', error);
      throw error;
    }
  }

  /**
   * 标准化抽卡记录数据格式
   * @private
   * @param {Object} item 原始抽卡记录
   * @param {string} uid 用户ID
   * @param {Object} game 游戏对象
   * @returns {Object} 标准化后的抽卡记录
   */
  _normalizeGachaEntry(item, uid, game) {
    // 确保所有必需字段都存在
    const normalized = {
      game: game.value,
      uid: uid,
      gachaType: item.gacha_type || item.gachaType || '1',
      itemID: item.item_id || item.itemID || '',
      count: item.count || '1',
      time: item.time || new Date().toISOString().replace('T', ' ').substring(0, 19),
      name: item.name || 'Unknown',
      lang: item.lang || 'zh-cn',
      itemType: item.item_type || item.itemType || '',
      rankType: item.rank_type || item.rankType || '3',
      id: item.id || '',
      gachaID: item.gacha_id || item.gachaID || '0'
    };

    // 转换日期格式（如果需要）
    if (normalized.time && !normalized.time.includes(' ')) {
      // ISO格式转换为YYYY-MM-DD HH:mm:ss
      if (normalized.time.includes('T')) {
        normalized.time = normalized.time.replace('T', ' ').substring(0, 19);
      }
    }

    return normalized;
  }

  /**
   * 生成抽卡模拟数据（用于测试）
   * @param {string} uid 用户ID
   * @param {Object} game 游戏对象
   * @param {number} count 生成的记录数量
   * @returns {Promise<Array<GachaEntry>>} 模拟抽卡记录数组
   */
  async generateMockGachaEntries(uid, game, count = 100) {
    const poolTypes = getAllGachaPoolTypes(game);
    const mockEntries = [];
    const currentDate = new Date();

    // 根据游戏生成不同的模拟数据
    const getItemType = (rankType) => {
      if (game.value === SupportedGame.GENSHIN_IMPACT.value) {
        if (rankType === '5') {
          return Math.random() > 0.5 ? '角色' : '武器';
        } else if (rankType === '4') {
          return Math.random() > 0.3 ? '角色' : '武器';
        }
        return '武器';
      } else if (game.value === SupportedGame.STAR_RAIL.value) {
        if (rankType === '5' || rankType === '4') {
          return Math.random() > 0.5 ? '角色' : '光锥';
        }
        return '光锥';
      } else {
        if (rankType === '5' || rankType === '4') {
          return Math.random() > 0.5 ? '角色' : '武器';
        }
        return '武器';
      }
    };

    const getRandomName = (rankType, itemType) => {
      const fiveStarNames = game.value === SupportedGame.GENSHIN_IMPACT.value ? 
        ['优菈', '万叶', '甘雨', '钟离', '雷电将军', '神里绫华', '纳西妲', '温迪'] :
        (game.value === SupportedGame.STAR_RAIL.value ? 
          ['刃', '景元', '希儿', '银狼', '罗刹', '白露', '符玄', '彦卿'] :
          ['狼獾', '妮可', '可琳', '珂蕾妲', '本', '安东', '伊索德', '维多利亚']
        );

      const fourStarNames = game.value === SupportedGame.GENSHIN_IMPACT.value ? 
        ['香菱', '行秋', '班尼特', '重云', '凝光', '北斗', '烟绯', '迪奥娜'] :
        (game.value === SupportedGame.STAR_RAIL.value ? 
          ['三月七', '丹恒', '艾丝妲', '娜塔莎', '虎克', '佩拉', '希露瓦', '桑博'] :
          ['艾克', '艾米', '伊芙琳', '金', '莫特', '普莉希拉', '山姆', '索菲亚']
        );

      const threeStarNames = game.value === SupportedGame.GENSHIN_IMPACT.value ? 
        ['铁影阔剑', '冷刃', '黎明神剑', '弹弓', '神射手之誓', '讨龙英杰谭', '魔导绪论'] :
        (game.value === SupportedGame.STAR_RAIL.value ? 
          ['新手标准杆', '早餐的仪式感', '论剑', '没问题', '唯有沉默', '晚安与睡颜', '记忆中的模样'] :
          ['基础型武器', '简易型武器', '练习用武器', '标准型武器', '入门级武器', '基础装备', '训练用装备']
        );

      let nameList;
      if (rankType === '5') {
        nameList = fiveStarNames;
      } else if (rankType === '4') {
        nameList = fourStarNames;
      } else {
        nameList = threeStarNames;
      }

      return nameList[Math.floor(Math.random() * nameList.length)];
    };

    // 生成模拟记录
    for (let i = 0; i < count; i++) {
      // 模拟概率
      let rankType;
      const rand = Math.random();
      if (rand < 0.006) {
        rankType = '5'; // 0.6% 概率
      } else if (rand < 0.13) {
        rankType = '4'; // 13% 概率
      } else {
        rankType = '3'; // 86.4% 概率
      }

      const itemType = getItemType(rankType);
      const name = getRandomName(rankType, itemType);
      const poolType = poolTypes[Math.floor(Math.random() * poolTypes.length)];
      
      // 生成随机时间（过去3个月内）
      const randomDays = Math.floor(Math.random() * 90);
      const randomHours = Math.floor(Math.random() * 24);
      const randomMinutes = Math.floor(Math.random() * 60);
      const entryDate = new Date(currentDate);
      entryDate.setDate(entryDate.getDate() - randomDays);
      entryDate.setHours(randomHours, randomMinutes, 0, 0);
      const formattedTime = entryDate.toISOString().replace('T', ' ').substring(0, 19);

      const entry = new GachaEntry({
        game: game.value,
        uid: uid,
        gachaType: poolType.type,
        itemID: '',
        count: '1',
        time: formattedTime,
        name: name,
        lang: 'zh-cn',
        itemType: itemType,
        rankType: rankType,
        gachaID: '0'
      });

      mockEntries.push(entry);
    }

    // 按时间排序
    mockEntries.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    // 批量保存模拟数据
    await batchSaveGachaEntries(mockEntries);

    return mockEntries;
  }
}

// 创建单例实例
export const gachaService = new GachaService();

// 导出常用的辅助函数
export async function importGachaData(jsonData, uid, game) {
  return gachaService.importGachaEntries(jsonData, uid, game);
}

export async function exportGachaData(uid, game) {
  return gachaService.exportGachaEntries(uid, game);
}

export async function getGachaStats(uid, game) {
  return gachaService.getGachaStatistics(uid, game);
}

export async function getGachaHistory(uid, game, page = 1, pageSize = 100) {
  return gachaService.getGachaHistoryPaged(uid, game, page, pageSize);
}

export async function createProfile(uid, game, profileName = null) {
  return gachaService.createGachaProfile(uid, game, profileName);
}

export async function getProfiles() {
  return gachaService.getGachaProfiles();
}

export async function getProfilesByGame(game) {
  return gachaService.getGachaProfilesByGame(game);
}

export async function generateMockData(uid, game, count = 100) {
  return gachaService.generateMockGachaEntries(uid, game, count);
}