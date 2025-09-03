/**
 * 抽卡系统的通用工具函数
 */
import SupportedGame from '../../types/supportedGame';
import { getAllGachaPoolTypes, getGachaPoolType } from '../../models/gacha/GachaPoolType';

/**
 * 格式化日期字符串
 * @param {string} dateString 日期字符串
 * @param {string} format 格式化模板
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(dateString, format = 'YYYY-MM-DD HH:mm:ss') {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return dateString; // 返回原始字符串，如果日期无效
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 格式化数字，添加千位分隔符
 * @param {number|string} num 数字
 * @returns {string} 格式化后的数字字符串
 */
export function formatNumber(num) {
  return Number(num).toLocaleString('zh-CN');
}

/**
 * 计算两个日期之间的天数
 * @param {string} startDate 开始日期
 * @param {string} endDate 结束日期
 * @returns {number} 天数差
 */
export function daysBetweenDates(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * 获取指定游戏的所有抽卡池类型
 * @param {string} gameValue 游戏值
 * @returns {Array} 抽卡池类型数组
 */
export function getGachaTypesByGame(gameValue) {
  // 将游戏值转换为游戏对象
  const game = { value: gameValue };
  
  // 使用现有的getAllGachaPoolTypes函数获取所有抽卡池类型
  return getAllGachaPoolTypes(game);
}

/**
 * 根据抽卡池类型ID获取抽卡池类型名称
 * @param {string|number} gachaType 抽卡池类型ID
 * @param {Object|string} game 游戏对象或游戏类型字符串
 * @returns {string} 抽卡池类型名称
 */
export function getGachaTypeName(gachaType, game) {
  // 确保gachaType是字符串
  const gachaTypeStr = String(gachaType);
  
  // 首先进行基本的类型检查
  if (!gachaTypeStr || gachaTypeStr === 'undefined' || gachaTypeStr === 'null') {
    console.warn('getGachaTypeName: gachaType is invalid:', gachaType);
    return '未知类型';
  }
  
  // 记录调试信息
  console.log('getGachaTypeName: called with:', {
    originalGachaType: gachaType,
    gachaTypeStr,
    originalGame: game,
    gameType: typeof game
  });
  
  // 确定gameValue
  let gameValue;
  
  if (!game || game === 'undefined' || game === 'null') {
    console.warn('getGachaTypeName: game is invalid, defaulting to genshinImpact');
    gameValue = 'genshinImpact';
  } else if (typeof game === 'string') {
    // 如果game已经是字符串，直接使用
    gameValue = game;
  } else if (typeof game === 'object') {
    // 如果game是对象，尝试获取value属性
    gameValue = game.value || 'genshinImpact';
  } else {
    // 其他情况，转换为字符串
    gameValue = String(game);
    console.warn('getGachaTypeName: Converting game to string:', gameValue);
  }
  
  // 直接创建一个映射表作为备用方案，包含所有可能的gachaType值
  const gachaTypeMap = {
    'genshinImpact': {
      '100': '新手祈愿',
      '200': '常驻祈愿',
      '301': '角色活动祈愿',
      '302': '武器活动祈愿',
      '400': '角色活动祈愿',
      '500': '集录祈愿'
    },
    'starRail': {
      '1': '常驻跃迁',
      '2': '角色跃迁',
      '3': '光锥跃迁',
      '11': '新手跃迁',
      '200': '角色跃迁',
      '301': '光锥跃迁'
    },
    'zzz': {
      '1': '常驻卡池',
      '2': '角色卡池',
      '3': '武器卡池',
      '200': '角色卡池',
      '301': '武器卡池'
    }
  };
  
  // 首先尝试精确匹配
  if (gachaTypeMap[gameValue] && gachaTypeMap[gameValue][gachaTypeStr]) {
    const typeName = gachaTypeMap[gameValue][gachaTypeStr];
    console.log(`getGachaTypeName: Found exact match '${typeName}' for gachaType=${gachaTypeStr} and game=${gameValue}`);
    return typeName;
  }
  
  // 如果精确匹配失败，尝试跨游戏匹配
  for (const [gameType, types] of Object.entries(gachaTypeMap)) {
    if (types[gachaTypeStr]) {
      const typeName = types[gachaTypeStr];
      console.log(`getGachaTypeName: Found cross-game match '${typeName}' for gachaType=${gachaTypeStr} in game=${gameType}`);
      return typeName;
    }
  }
  
  // 尝试使用原有的getGachaPoolType函数作为最后的选择
  try {
    const poolType = getGachaPoolType({ value: gameValue }, gachaTypeStr);
    if (poolType && poolType.chineseName) {
      console.log(`getGachaTypeName: Found pool type '${poolType.chineseName}' for gachaType=${gachaTypeStr}`);
      return poolType.chineseName;
    }
  } catch (error) {
    console.error('getGachaTypeName: Error in getGachaPoolType', error);
  }
  
  // 基于gachaType的通用解释
  const numericGachaType = parseInt(gachaTypeStr);
  if (!isNaN(numericGachaType)) {
    if (numericGachaType === 100 || numericGachaType === 1) return '常驻卡池';
    if (numericGachaType === 200 || numericGachaType === 2 || numericGachaType === 5) return '角色卡池';
    if (numericGachaType === 301 || numericGachaType === 3 || numericGachaType === 6) return '武器卡池';
    if (numericGachaType === 400 || numericGachaType === 11) return '新手卡池';
    if (numericGachaType === 500) return '活动卡池';
  }
  
  // 如果所有方法都失败，返回带有实际值的默认文本
  console.warn(`getGachaTypeName: No pool type found for gachaType=${gachaTypeStr} and game=${gameValue}`);
  return `未知(${gachaTypeStr})`;
}

/**
 * 计算抽卡次数的保底状态
 * @param {Array} entries 抽卡记录数组
 * @param {string} gachaType 抽卡池类型
 * @param {Object} game 游戏对象
 * @returns {Object} 保底状态信息
 */
export function calculatePityStatus(entries, gachaType, game) {
  // 根据游戏和抽卡池类型确定保底规则
  let pityRules = getPityRules(game, gachaType);
  if (!pityRules) {
    // 默认保底规则
    pityRules = {
      fiveStar: 90,
      fourStar: 10,
      fiveStarSoftPity: 75,
      fourStarSoftPity: 8
    };
  }

  // 筛选指定抽卡池类型的记录
  const typeEntries = entries.filter(entry => entry.gachaType === gachaType);
  // 按时间倒序排列
  typeEntries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  let currentPity = 0;
  let sinceLastFiveStar = 0;
  let sinceLastFourStar = 0;
  let maxPity = 0;
  let pityHistory = [];
  let currentSoftPity = false;

  // 计算保底状态
  for (const entry of typeEntries) {
    currentPity++;
    sinceLastFiveStar++;
    sinceLastFourStar++;

    if (entry.rankType === '5') {
      maxPity = Math.max(maxPity, sinceLastFiveStar);
      pityHistory.push({
        rank: 5,
        pity: sinceLastFiveStar
      });
      sinceLastFiveStar = 0;
      sinceLastFourStar = 0;
    } else if (entry.rankType === '4') {
      pityHistory.push({
        rank: 4,
        pity: sinceLastFourStar
      });
      sinceLastFourStar = 0;
    }

    // 检查是否进入软保底
    if (sinceLastFiveStar >= pityRules.fiveStarSoftPity) {
      currentSoftPity = true;
    }

    // 如果已经计算到最近一次五星，就可以结束了
    if (pityHistory.length > 0 && sinceLastFiveStar === 0) {
      break;
    }
  }

  // 计算当前的概率提升（针对软保底）
  let currentProbability = getBaseProbability(game, gachaType, '5');
  if (currentSoftPity) {
    const pityRateIncrease = calculateSoftPityRate(sinceLastFiveStar, pityRules);
    currentProbability = Math.min(100, currentProbability + pityRateIncrease);
  }

  return {
    currentPity: currentPity,
    sinceLastFiveStar: sinceLastFiveStar,
    sinceLastFourStar: sinceLastFourStar,
    maxPity: maxPity,
    pityRules: pityRules,
    pityHistory: pityHistory,
    currentSoftPity: currentSoftPity,
    currentProbability: currentProbability.toFixed(2)
  };
}

/**
 * 获取游戏和抽卡池类型的保底规则
 * @param {Object} game 游戏对象
 * @param {string} gachaType 抽卡池类型
 * @returns {Object} 保底规则
 */
export function getPityRules(game, gachaType) {
  // 原神的保底规则
  if (game.value === SupportedGame.GENSHIN_IMPACT.value) {
    // 角色活动祈愿和常驻祈愿
    if (gachaType === '1' || gachaType === '5' || gachaType === '301' || gachaType === '400') {
      return {
        fiveStar: 90,
        fourStar: 10,
        fiveStarSoftPity: 75,
        fourStarSoftPity: 8
      };
    }
    // 武器活动祈愿
    else if (gachaType === '6') {
      return {
        fiveStar: 80,
        fourStar: 10,
        fiveStarSoftPity: 65,
        fourStarSoftPity: 8
      };
    }
  }
  // 星穹铁道的保底规则
  else if (game.value === SupportedGame.STAR_RAIL.value) {
    // 所有跃迁类型
    return {
      fiveStar: 90,
      fourStar: 10,
      fiveStarSoftPity: 75,
      fourStarSoftPity: 8
    };
  }
  // 绝区零的保底规则
  else if (game.value === SupportedGame.ZENLESS_ZONE.value) {
    // 所有渠道类型
    return {
      fiveStar: 80,
      fourStar: 10,
      fiveStarSoftPity: 65,
      fourStarSoftPity: 8
    };
  }

  // 默认规则
  return null;
}

/**
 * 获取基础概率
 * @param {Object} game 游戏对象
 * @param {string} gachaType 抽卡池类型
 * @param {string} rankType 星级类型
 * @returns {number} 概率（百分比）
 */
export function getBaseProbability(game, gachaType, rankType) {
  // 原神的概率
  if (game.value === SupportedGame.GENSHIN_IMPACT.value) {
    if (rankType === '5') {
      return 0.6; // 五星基础概率 0.6%
    } else if (rankType === '4') {
      return 5.1; // 四星基础概率 5.1%
    } else {
      return 94.3; // 三星基础概率 94.3%
    }
  }
  // 星穹铁道的概率
  else if (game.value === SupportedGame.STAR_RAIL.value) {
    if (rankType === '5') {
      return 0.6; // 五星基础概率 0.6%
    } else if (rankType === '4') {
      return 5.1; // 四星基础概率 5.1%
    } else {
      return 94.3; // 三星基础概率 94.3%
    }
  }
  // 绝区零的概率
  else if (game.value === SupportedGame.ZENLESS_ZONE.value) {
    if (rankType === '5') {
      return 0.7; // 五星基础概率 0.7%
    } else if (rankType === '4') {
      return 6.0; // 四星基础概率 6.0%
    } else {
      return 93.3; // 三星基础概率 93.3%
    }
  }

  // 默认概率
  return 0;
}

/**
 * 计算软保底的概率提升
 * @param {number} currentPity 当前保底计数
 * @param {Object} pityRules 保底规则
 * @returns {number} 概率提升值
 */
export function calculateSoftPityRate(currentPity, pityRules) {
  if (currentPity < pityRules.fiveStarSoftPity) {
    return 0;
  }

  // 从软保底开始，概率线性增加
  const pityRemaining = pityRules.fiveStar - currentPity;
  const totalSoftPityRange = pityRules.fiveStar - pityRules.fiveStarSoftPity;
  const baseProbability = 0.6;
  const maxProbability = 100 - baseProbability;

  // 线性提升概率
  const increaseRate = (maxProbability / totalSoftPityRange) * (currentPity - pityRules.fiveStarSoftPity + 1);
  return increaseRate;
}

/**
 * 解析抽卡数据文件（从剪贴板或文件）
 * @param {string} content 文件内容
 * @returns {Array<Object>|null} 解析后的抽卡记录数组
 */
export function parseGachaDataFile(content) {
  try {
    // 尝试直接解析为JSON
    const parsed = JSON.parse(content);
    
    // 检查是否为标准的抽卡记录格式
    if (Array.isArray(parsed) && parsed.length > 0) {
      const firstItem = parsed[0];
      // 检查是否包含必要的字段
      if (firstItem.gacha_type || firstItem.gachaType || firstItem.time || firstItem.name || firstItem.rank_type || firstItem.rankType) {
        return parsed;
      }
    }
    
    // 检查是否为嵌套格式
    if (parsed.list && Array.isArray(parsed.list)) {
      return parsed.list;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to parse gacha data file:', error);
    return null;
  }
}

/**
 * 导出抽卡数据为文件
 * @param {Array<Object>} data 抽卡数据
 * @param {string} filename 文件名
 */
export function exportGachaDataToFile(data, filename = 'gacha_data.json') {
  try {
    const jsonString = JSON.stringify(data, null, 2);
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
  } catch (error) {
    console.error('Failed to export gacha data:', error);
    throw new Error('Failed to export gacha data');
  }
}

/**
 * 读取抽卡数据文件
 * @returns {Promise<Array<Object>>} 解析后的抽卡记录数组
 */
export function readGachaDataFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const parsedData = parseGachaDataFile(content);
          if (parsedData) {
            resolve(parsedData);
          } else {
            reject(new Error('Invalid file format'));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  });
}

/**
 * 复制抽卡数据到剪贴板
 * @param {Array<Object>} data 抽卡数据
 * @returns {Promise<boolean>} 操作结果
 */
export async function copyGachaDataToClipboard(data) {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    await navigator.clipboard.writeText(jsonString);
    return true;
  } catch (error) {
    console.error('Failed to copy gacha data to clipboard:', error);
    return false;
  }
}

/**
 * 从剪贴板读取抽卡数据
 * @returns {Promise<Array<Object>|null>} 解析后的抽卡记录数组
 */
export async function readGachaDataFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    return parseGachaDataFile(text);
  } catch (error) {
    console.error('Failed to read gacha data from clipboard:', error);
    return null;
  }
}

/**
 * 计算抽卡统计摘要
 * @param {Array<Object>} entries 抽卡记录数组
 * @param {Object} game 游戏对象
 * @returns {Object} 统计摘要
 */
export function calculateGachaSummary(entries, game) {
  let totalPulls = entries.length;
  let fiveStarCount = entries.filter(e => e.rankType === '5').length;
  let fourStarCount = entries.filter(e => e.rankType === '4').length;
  let threeStarCount = entries.filter(e => e.rankType === '3').length;
  
  // 计算各星级的概率
  let fiveStarRate = totalPulls > 0 ? (fiveStarCount / totalPulls * 100).toFixed(2) : '0.00';
  let fourStarRate = totalPulls > 0 ? (fourStarCount / totalPulls * 100).toFixed(2) : '0.00';
  let threeStarRate = totalPulls > 0 ? (threeStarCount / totalPulls * 100).toFixed(2) : '0.00';
  
  // 计算最近的抽卡记录
  const recentEntries = entries.sort((a, b) => 
    new Date(b.time).getTime() - new Date(a.time).getTime()
  ).slice(0, 10);
  
  // 计算抽卡时间范围
  let firstPullDate = null;
  let lastPullDate = null;
  if (entries.length > 0) {
    firstPullDate = entries.reduce((min, entry) => {
      const entryDate = new Date(entry.time);
      return entryDate < min ? entryDate : min;
    }, new Date(entries[0].time));
    
    lastPullDate = entries.reduce((max, entry) => {
      const entryDate = new Date(entry.time);
      return entryDate > max ? entryDate : max;
    }, new Date(entries[0].time));
  }
  
  // 计算总天数
  let totalDays = 0;
  if (firstPullDate && lastPullDate) {
    totalDays = daysBetweenDates(firstPullDate, lastPullDate);
  }
  
  // 计算日均抽卡次数
  let dailyAvgPulls = totalDays > 0 ? (totalPulls / totalDays).toFixed(2) : '0.00';
  
  // 计算五星间隔统计
  let fiveStarSpacings = [];
  let currentSpacing = 0;
  for (const entry of entries) {
    currentSpacing++;
    if (entry.rankType === '5') {
      fiveStarSpacings.push(currentSpacing);
      currentSpacing = 0;
    }
  }
  
  let avgFiveStarSpacing = fiveStarSpacings.length > 0 ? 
    (fiveStarSpacings.reduce((a, b) => a + b, 0) / fiveStarSpacings.length).toFixed(2) : '0.00';
  let minFiveStarSpacing = fiveStarSpacings.length > 0 ? Math.min(...fiveStarSpacings) : 0;
  let maxFiveStarSpacing = fiveStarSpacings.length > 0 ? Math.max(...fiveStarSpacings) : 0;
  
  return {
    totalPulls: totalPulls,
    fiveStarCount: fiveStarCount,
    fourStarCount: fourStarCount,
    threeStarCount: threeStarCount,
    fiveStarRate: fiveStarRate,
    fourStarRate: fourStarRate,
    threeStarRate: threeStarRate,
    recentEntries: recentEntries,
    firstPullDate: firstPullDate ? firstPullDate.toISOString() : null,
    lastPullDate: lastPullDate ? lastPullDate.toISOString() : null,
    totalDays: totalDays,
    dailyAvgPulls: dailyAvgPulls,
    fiveStarSpacings: fiveStarSpacings,
    avgFiveStarSpacing: avgFiveStarSpacing,
    minFiveStarSpacing: minFiveStarSpacing,
    maxFiveStarSpacing: maxFiveStarSpacing
  };
}

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
export function generateUniqueId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 验证UID格式
 * @param {string} uid UID字符串
 * @param {Object} game 游戏对象
 * @returns {boolean} 是否有效
 */
export function validateUid(uid, game) {
  if (!uid || typeof uid !== 'string') {
    return false;
  }
  
  // 检查UID长度和格式
  // 原神：9位数字
  if (game.value === SupportedGame.GENSHIN_IMPACT.value) {
    return /^\d{9}$/.test(uid);
  }
  // 星穹铁道：9位数字
  else if (game.value === SupportedGame.STAR_RAIL.value) {
    return /^\d{9}$/.test(uid);
  }
  // 绝区零：9位数字
  else if (game.value === SupportedGame.ZENLESS_ZONE.value) {
    return /^\d{9}$/.test(uid);
  }
  
  return false;
}