/**
 * 抽卡数据分析服务，提供高级统计分析功能
 * 对应数据分析部分
 */
import { gachaDBService } from './GachaDBService';
import { GachaEntry } from '../../models/gacha/GachaEntry';
import SupportedGame from '../../types/supportedGame';

class GachaAnalyticsService {
  constructor() {
    // 初始化分析服务
  }

  /**
   * 获取详细的抽卡统计数据
   * @param {string} uid 用户ID
   * @param {string} game 游戏类型
   * @param {string} gachaType 可选，抽卡池类型
   * @returns {Promise<Object>} 详细统计数据
   */
  async getDetailedAnalytics(uid, game, gachaType = null) {
    // 获取原始数据
    let entries = await this.getFilteredEntries(uid, game, gachaType);
    
    // 计算各种统计指标
    const stats = {
      // 基础统计
      basic: this.calculateBasicStats(entries),
      // 时间趋势分析
      timeAnalysis: this.calculateTimeAnalysis(entries),
      // 保底分析
      pityAnalysis: this.calculatePityAnalysis(entries, game, gachaType),
      // 物品分析
      itemAnalysis: this.calculateItemAnalysis(entries),
      // 概率分析
      probabilityAnalysis: this.calculateProbabilityAnalysis(entries, game, gachaType),
      // 高级统计
      advanced: this.calculateAdvancedStats(entries, game)
    };
    
    return stats;
  }

  /**
   * 获取过滤后的抽卡记录
   * @private
   */
  async getFilteredEntries(uid, game, gachaType = null) {
    let entries;
    
    if (gachaType) {
      entries = await gachaDBService.getGachaEntriesByUidAndType(uid, gachaType);
    } else {
      entries = await gachaDBService.getGachaEntriesByUidSortedByTime(uid, game, true);
    }
    
    return entries;
  }

  /**
   * 计算基础统计数据
   * @private
   */
  calculateBasicStats(entries) {
    const totalPulls = entries.length;
    const fiveStarCount = entries.filter(e => e.rankType === '5').length;
    const fourStarCount = entries.filter(e => e.rankType === '4').length;
    const threeStarCount = entries.filter(e => e.rankType === '3').length;
    
    const fiveStarRate = totalPulls > 0 ? (fiveStarCount / totalPulls * 100).toFixed(2) : '0.00';
    const fourStarRate = totalPulls > 0 ? (fourStarCount / totalPulls * 100).toFixed(2) : '0.00';
    
    // 计算角色和武器分布
    const fiveStarCharacters = entries.filter(e => e.rankType === '5' && e.itemType === '角色').length;
    const fiveStarWeapons = entries.filter(e => e.rankType === '5' && e.itemType === '武器').length;
    const fourStarCharacters = entries.filter(e => e.rankType === '4' && e.itemType === '角色').length;
    const fourStarWeapons = entries.filter(e => e.rankType === '4' && e.itemType === '武器').length;
    
    return {
      totalPulls,
      fiveStarCount,
      fourStarCount,
      threeStarCount,
      fiveStarRate,
      fourStarRate,
      characterWeaponRatio: {
        fiveStar: {
          characters: fiveStarCharacters,
          weapons: fiveStarWeapons,
          ratio: fiveStarCount > 0 ? (fiveStarCharacters / fiveStarCount * 100).toFixed(1) : '0.0'
        },
        fourStar: {
          characters: fourStarCharacters,
          weapons: fourStarWeapons,
          ratio: fourStarCount > 0 ? (fourStarCharacters / fourStarCount * 100).toFixed(1) : '0.0'
        }
      }
    };
  }

  /**
   * 计算时间趋势分析
   * @private
   */
  calculateTimeAnalysis(entries) {
    if (entries.length === 0) {
      return { 
        dailyDistribution: [],
        monthlySummary: [],
        timeRange: null
      };
    }
    
    // 按日期分组统计
    const dailyMap = new Map();
    let earliestDate = new Date(entries[0].time);
    let latestDate = new Date(entries[0].time);
    
    entries.forEach(entry => {
      const date = new Date(entry.time);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { date: dateKey, count: 0, fiveStars: 0, fourStars: 0 });
      }
      
      const dayData = dailyMap.get(dateKey);
      dayData.count++;
      if (entry.rankType === '5') dayData.fiveStars++;
      if (entry.rankType === '4') dayData.fourStars++;
      
      // 更新最早和最晚日期
      if (date < earliestDate) earliestDate = date;
      if (date > latestDate) latestDate = date;
    });
    
    // 转换为数组并排序
    const dailyDistribution = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    
    // 按月统计
    const monthlyMap = new Map();
    dailyDistribution.forEach(day => {
      const monthKey = day.date.substring(0, 7); // YYYY-MM
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { month: monthKey, totalPulls: 0, fiveStars: 0 });
      }
      
      const monthData = monthlyMap.get(monthKey);
      monthData.totalPulls += day.count;
      monthData.fiveStars += day.fiveStars;
    });
    
    const monthlySummary = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    
    return {
      dailyDistribution,
      monthlySummary,
      timeRange: {
        start: earliestDate.toISOString().split('T')[0],
        end: latestDate.toISOString().split('T')[0],
        days: Math.ceil((latestDate - earliestDate) / (1000 * 60 * 60 * 24)) + 1
      }
    };
  }

  /**
   * 计算保底分析
   * @private
   */
  calculatePityAnalysis(entries, game, gachaType = null) {
    // 获取游戏的保底规则
    const pityRules = this.getGamePityRules(game, gachaType);
    
    // 计算五星保底分布
    const fiveStarSpacings = [];
    let currentSpacing = 0;
    
    entries.forEach(entry => {
      currentSpacing++;
      if (entry.rankType === '5') {
        fiveStarSpacings.push(currentSpacing);
        currentSpacing = 0;
      }
    });
    
    // 计算当前保底状态
    const currentPity = currentSpacing;
    const isSoftPity = currentPity >= pityRules.fiveStarSoftPity;
    
    // 计算保底分布统计
    const spacingStats = this.calculateSpacingStats(fiveStarSpacings, pityRules.fiveStar);
    
    return {
      currentPity,
      isSoftPity,
      pityRules,
      spacingDistribution: spacingStats.distribution,
      spacingStats: {
        average: spacingStats.average,
        median: spacingStats.median,
        min: spacingStats.min,
        max: spacingStats.max,
        stdDev: spacingStats.stdDev
      },
      // 软保底内的抽卡概率
      currentSoftPityProbability: isSoftPity ? this.calculateSoftPityProbability(currentPity, pityRules) : null
    };
  }

  /**
   * 计算物品分析
   * @private
   */
  calculateItemAnalysis(entries) {
    // 统计每个物品的获取次数
    const itemMap = new Map();
    
    entries.forEach(entry => {
      const key = `${entry.name}_${entry.rankType}`;
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          name: entry.name,
          rankType: entry.rankType,
          count: 0,
          firstObtained: entry.time,
          lastObtained: entry.time,
          totalPullsToObtain: 0,
          occurrences: []
        });
      }
      
      const itemData = itemMap.get(key);
      itemData.count++;
      itemData.lastObtained = entry.time;
      itemData.occurrences.push(entry.timestamp);
    });
    
    // 转换为数组并计算额外统计
    const itemList = Array.from(itemMap.values()).map(item => {
      // 计算获取间隔
      const gaps = [];
      for (let i = 1; i < item.occurrences.length; i++) {
        const gap = Math.ceil((item.occurrences[i] - item.occurrences[i-1]) / (1000 * 60 * 60 * 24));
        gaps.push(gap);
      }
      
      const avgGap = gaps.length > 0 ? (gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1) : null;
      
      return {
        ...item,
        avgDaysBetween: avgGap,
        rarity: parseInt(item.rankType)
      };
    });
    
    // 按稀有度和获取次数排序
    itemList.sort((a, b) => {
      if (a.rarity !== b.rarity) return b.rarity - a.rarity;
      return b.count - a.count;
    });
    
    return {
      items: itemList,
      uniqueItems: itemList.length,
      mostPulledItem: itemList.length > 0 ? itemList[0] : null
    };
  }

  /**
   * 计算概率分析
   * @private
   */
  calculateProbabilityAnalysis(entries, game, gachaType = null) {
    const pityRules = this.getGamePityRules(game, gachaType);
    const fiveStarCount = entries.filter(e => e.rankType === '5').length;
    const totalPulls = entries.length;
    
    // 计算实际概率
    const actualFiveStarRate = totalPulls > 0 ? (fiveStarCount / totalPulls * 100).toFixed(3) : '0.000';
    
    // 计算理论概率（根据游戏规则）
    const baseRate = this.getBaseRate(game);
    
    // 计算概率偏差
    const deviation = totalPulls > 0 ? 
      ((parseFloat(actualFiveStarRate) - baseRate) / baseRate * 100).toFixed(2) : '0.00';
    
    // 计算软保底内的抽卡分布
    const softPityAnalysis = this.analyzeSoftPityDistribution(entries, pityRules);
    
    return {
      actualFiveStarRate,
      theoreticalFiveStarRate: baseRate.toFixed(3),
      deviation: `${deviation}%`,
      softPityAnalysis,
      isAboveAverage: parseFloat(deviation) > 0
    };
  }

  /**
   * 计算高级统计数据
   * @private
   */
  calculateAdvancedStats(entries, game) {
    if (entries.length === 0) {
      return {
        // 各种高级统计数据
        consecutiveDrySpells: [],
        luckyUnluckyPeriods: [],
        recommendedNextPulls: null
      };
    }
    
    // 计算连续无五星的最长记录
    const drySpells = this.findDrySpells(entries);
    
    // 分析幸运和不幸的时期
    const luckyPeriods = this.findLuckyUnluckyPeriods(entries);
    
    // 推荐下一次抽卡时机
    const recommendedPulls = this.calculateRecommendedPulls(entries, game);
    
    return {
      consecutiveDrySpells: drySpells,
      luckyUnluckyPeriods: luckyPeriods,
      recommendedNextPulls: recommendedPulls
    };
  }

  /**
   * 获取游戏的保底规则
   * @private
   */
  getGamePityRules(game, gachaType = null) {
    // 根据游戏类型和抽卡池类型返回对应的保底规则
    if (game === SupportedGame.GENSHIN_IMPACT.value) {
      if (gachaType === '6') {
        // 武器池
        return {
          fiveStar: 80,
          fourStar: 10,
          fiveStarSoftPity: 65,
          fourStarSoftPity: 8
        };
      } else {
        // 角色池和常驻池
        return {
          fiveStar: 90,
          fourStar: 10,
          fiveStarSoftPity: 75,
          fourStarSoftPity: 8
        };
      }
    } else if (game === SupportedGame.STAR_RAIL.value) {
      return {
        fiveStar: 90,
        fourStar: 10,
        fiveStarSoftPity: 75,
        fourStarSoftPity: 8
      };
    } else if (game === SupportedGame.ZENLESS_ZONE.value) {
      return {
        fiveStar: 80,
        fourStar: 10,
        fiveStarSoftPity: 65,
        fourStarSoftPity: 8
      };
    }
    
    // 默认规则
    return {
      fiveStar: 90,
      fourStar: 10,
      fiveStarSoftPity: 75,
      fourStarSoftPity: 8
    };
  }

  /**
   * 计算保底间隔统计
   * @private
   */
  calculateSpacingStats(spacings, maxPity) {
    if (spacings.length === 0) {
      return {
        distribution: Array(10).fill(0),
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        stdDev: 0
      };
    }
    
    // 计算分布（每10抽为一组）
    const distribution = Array(10).fill(0);
    spacings.forEach(spacing => {
      const bucketIndex = Math.min(Math.floor((spacing - 1) / 10), 9);
      distribution[bucketIndex]++;
    });
    
    // 计算平均值
    const average = (spacings.reduce((a, b) => a + b, 0) / spacings.length).toFixed(2);
    
    // 计算中位数
    const sortedSpacings = [...spacings].sort((a, b) => a - b);
    const medianIndex = Math.floor(sortedSpacings.length / 2);
    const median = sortedSpacings.length % 2 === 0
      ? ((sortedSpacings[medianIndex - 1] + sortedSpacings[medianIndex]) / 2).toFixed(2)
      : sortedSpacings[medianIndex];
    
    // 计算标准差
    const mean = parseFloat(average);
    const squaredDifferences = spacings.map(spacing => Math.pow(spacing - mean, 2));
    const variance = squaredDifferences.reduce((a, b) => a + b, 0) / spacings.length;
    const stdDev = Math.sqrt(variance).toFixed(2);
    
    return {
      distribution,
      average: parseFloat(average),
      median: parseFloat(median),
      min: Math.min(...spacings),
      max: Math.max(...spacings),
      stdDev: parseFloat(stdDev)
    };
  }

  /**
   * 计算软保底概率
   * @private
   */
  calculateSoftPityProbability(currentPity, pityRules) {
    if (currentPity < pityRules.fiveStarSoftPity) {
      return 0.6; // 基础概率
    }
    
    // 软保底概率计算
    const pityRemaining = pityRules.fiveStar - currentPity;
    const totalSoftPityRange = pityRules.fiveStar - pityRules.fiveStarSoftPity;
    const baseProbability = 0.6;
    const maxProbability = 100 - baseProbability;
    
    // 线性提升概率
    const probability = baseProbability + (maxProbability / totalSoftPityRange) * (currentPity - pityRules.fiveStarSoftPity + 1);
    
    return Math.min(100, probability).toFixed(2);
  }

  /**
   * 获取游戏的基础概率
   * @private
   */
  getBaseRate(game) {
    if (game === SupportedGame.GENSHIN_IMPACT.value || game === SupportedGame.STAR_RAIL.value) {
      return 0.6;
    } else if (game === SupportedGame.ZENLESS_ZONE.value) {
      return 0.7;
    }
    return 0.6;
  }

  /**
   * 分析软保底分布
   * @private
   */
  analyzeSoftPityDistribution(entries, pityRules) {
    const fiveStarEntries = entries.filter(e => e.rankType === '5');
    
    // 统计在软保底内获得五星的比例
    const withinSoftPity = fiveStarEntries.filter((entry, index) => {
      if (index === 0) return false; // 第一个五星之前没有数据
      
      const prevFiveStar = fiveStarEntries[index - 1];
      const entriesBetween = entries.filter(e => 
        new Date(e.time) > new Date(prevFiveStar.time) && 
        new Date(e.time) <= new Date(entry.time)
      );
      
      return entriesBetween.length >= pityRules.fiveStarSoftPity;
    });
    
    const softPityRatio = fiveStarEntries.length > 0 
      ? (withinSoftPity.length / fiveStarEntries.length * 100).toFixed(1)
      : '0.0';
    
    return {
      totalFiveStars: fiveStarEntries.length,
      withinSoftPityCount: withinSoftPity.length,
      softPityRatio: `${softPityRatio}%`
    };
  }

  /**
   * 查找连续无五星的时期（干涸期）
   * @private
   */
  findDrySpells(entries) {
    const drySpells = [];
    let currentDrySpell = 0;
    
    entries.forEach(entry => {
      currentDrySpell++;
      
      if (entry.rankType === '5') {
        if (currentDrySpell > 1) {
          drySpells.push({
            length: currentDrySpell,
            endedAt: entry.time
          });
        }
        currentDrySpell = 0;
      }
    });
    
    // 处理未结束的干涸期
    if (currentDrySpell > 0) {
      drySpells.push({
        length: currentDrySpell,
        isOngoing: true
      });
    }
    
    // 按长度排序
    drySpells.sort((a, b) => b.length - a.length);
    
    return drySpells.slice(0, 5); // 返回前5个最长的干涸期
  }

  /**
   * 查找幸运和不幸的时期
   * @private
   */
  findLuckyUnluckyPeriods(entries) {
    // 定义时间段大小（7天）
    const periodSize = 7 * 24 * 60 * 60 * 1000;
    
    if (entries.length === 0) return [];
    
    const startDate = new Date(entries[0].time).getTime();
    const endDate = new Date(entries[entries.length - 1].time).getTime();
    
    const periods = [];
    
    // 遍历所有时间段
    for (let periodStart = startDate; periodStart <= endDate; periodStart += periodSize) {
      const periodEnd = periodStart + periodSize;
      
      // 查找该时间段内的所有抽卡记录
      const periodEntries = entries.filter(entry => {
        const entryTime = new Date(entry.time).getTime();
        return entryTime >= periodStart && entryTime < periodEnd;
      });
      
      if (periodEntries.length === 0) continue;
      
      const fiveStarCount = periodEntries.filter(e => e.rankType === '5').length;
      const expectedFiveStars = (periodEntries.length * 0.6) / 100; // 预期五星数量
      const luckFactor = expectedFiveStars > 0 ? fiveStarCount / expectedFiveStars : 0;
      
      periods.push({
        startDate: new Date(periodStart).toISOString().split('T')[0],
        endDate: new Date(periodEnd - 1).toISOString().split('T')[0],
        totalPulls: periodEntries.length,
        fiveStarCount: fiveStarCount,
        luckFactor: luckFactor.toFixed(2),
        isLucky: luckFactor > 1.5,
        isUnlucky: luckFactor < 0.5
      });
    }
    
    // 按幸运因子排序
    periods.sort((a, b) => b.luckFactor - a.luckFactor);
    
    return periods.slice(0, 10); // 返回前10个时期
  }

  /**
   * 计算推荐的下一次抽卡时机
   * @private
   */
  calculateRecommendedPulls(entries, game) {
    const pityRules = this.getGamePityRules(game);
    
    // 计算当前保底状态
    let currentPity = 0;
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].rankType === '5') {
        break;
      }
      currentPity++;
    }
    
    // 分析历史抽卡模式
    const timeAnalysis = this.calculateTimeAnalysis(entries);
    const avgDailyPulls = timeAnalysis.timeRange && timeAnalysis.timeRange.days > 0
      ? (entries.length / timeAnalysis.timeRange.days).toFixed(2)
      : '0';
    
    // 生成推荐
    let recommendation = '暂无推荐';
    let confidence = 0;
    
    if (currentPity >= pityRules.fiveStarSoftPity) {
      recommendation = `当前已${currentPity}抽，处于软保底阶段，建议继续抽卡`;
      confidence = 90;
    } else if (currentPity >= pityRules.fiveStarSoftPity - 5) {
      recommendation = `当前已${currentPity}抽，即将进入软保底阶段，可考虑准备抽卡`;
      confidence = 75;
    } else if (parseFloat(avgDailyPulls) > 5) {
      recommendation = '抽卡频率较高，建议适当控制节奏';
      confidence = 60;
    } else {
      recommendation = '当前抽卡状态正常，可按计划进行';
      confidence = 80;
    }
    
    return {
      recommendation,
      confidence,
      currentPity,
      avgDailyPulls
    };
  }

  /**
   * 批量分析多个用户的抽卡数据
   * @param {Array<string>} uids 用户ID数组
   * @param {string} game 游戏类型
   * @returns {Promise<Array<Object>>} 批量分析结果
   */
  async batchAnalyzeUsers(uids, game) {
    const results = [];
    
    for (const uid of uids) {
      try {
        const userStats = await this.getDetailedAnalytics(uid, game);
        results.push({
          uid,
          success: true,
          data: userStats
        });
      } catch (error) {
        console.error(`Failed to analyze user ${uid}:`, error);
        results.push({
          uid,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * 导出分析报告
   * @param {Object} analyticsData 分析数据
   * @param {string} filename 文件名
   * @returns {Promise<boolean>} 导出是否成功
   */
  async exportAnalyticsReport(analyticsData, filename = 'gacha_analytics_report.json') {
    try {
      const jsonString = JSON.stringify(analyticsData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // 清理
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Failed to export analytics report:', error);
      return false;
    }
  }

  /**
   * 数据清理和优化
   * @param {string} uid 用户ID
   * @param {string} game 游戏类型
   * @returns {Promise<Object>} 清理结果
   */
  async cleanAndOptimizeData(uid, game) {
    // 对应Swift端的bleachTrashItemsByTimeTagSansCommission
    try {
      const entries = await gachaDBService.getGachaEntriesByUid(uid, game);
      
      // 查找并移除无效或重复的条目
      const validEntries = [];
      const seenIds = new Set();
      const invalidEntries = [];
      
      entries.forEach(entry => {
        // 检查数据有效性
        const isValid = entry.uid && entry.time && entry.rankType && 
                      ['3', '4', '5'].includes(entry.rankType) && 
                      !isNaN(new Date(entry.time).getTime());
        
        // 检查重复
        const isDuplicate = seenIds.has(entry.id);
        
        if (isValid && !isDuplicate) {
          validEntries.push(entry);
          seenIds.add(entry.id);
        } else {
          invalidEntries.push(entry);
        }
      });
      
      // 删除无效条目并重新保存有效条目
      if (invalidEntries.length > 0) {
        await gachaDBService.deleteGachaEntriesByUid(uid, game);
        await gachaDBService.batchSaveGachaEntries(validEntries);
      }
      
      return {
        originalCount: entries.length,
        validCount: validEntries.length,
        removedCount: invalidEntries.length,
        success: true
      };
    } catch (error) {
      console.error('Failed to clean and optimize data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// 创建单例实例
export const gachaAnalyticsService = new GachaAnalyticsService();

// 导出常用的辅助函数
export async function getDetailedAnalytics(uid, game, gachaType = null) {
  return gachaAnalyticsService.getDetailedAnalytics(uid, game, gachaType);
}

export async function cleanAndOptimizeData(uid, game) {
  return gachaAnalyticsService.cleanAndOptimizeData(uid, game);
}

export async function exportAnalyticsReport(analyticsData, filename = 'gacha_analytics_report.json') {
  return gachaAnalyticsService.exportAnalyticsReport(analyticsData, filename);
}