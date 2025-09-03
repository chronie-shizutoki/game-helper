/**
 * 抽卡池类型枚举，对应GachaPoolExpressible
 * 定义了不同游戏的抽卡池类型
 */
import SupportedGame from '../../types/supportedGame';

export const GachaPoolType = {
  // 原神抽卡池类型
  GENSHIN: {
    STANDARD: {
      type: '200',
      name: 'standardWish',
      chineseName: '常驻祈愿',
      game: SupportedGame.GENSHIN_IMPACT,
      color: '#B0B0B0',
      isAnalyzable: true,
      description: 'standardWishDescription'
    },
    CHARACTER_EVENT: {
      type: '301',
      name: 'characterEventWish',
      chineseName: '角色活动祈愿',
      game: SupportedGame.GENSHIN_IMPACT,
      color: '#FF7A7A',
      isAnalyzable: true,
      description: 'characterEventWishDescription'
    },
    WEAPON_EVENT: {
      type: '302',
      name: 'weaponEventWish',
      chineseName: '武器活动祈愿',
      game: SupportedGame.GENSHIN_IMPACT,
      color: '#FFB466',
      isAnalyzable: true,
      description: 'weaponEventWishDescription'
    },
    BEGINNERS: {
      type: '100',
      name: 'beginnersWish',
      chineseName: '新手祈愿',
      game: SupportedGame.GENSHIN_IMPACT,
      color: '#99CCFF',
      isAnalyzable: true,
      description: 'beginnersWishDescription'
    },
    CHAR_ACTIVITY_2: {
      type: '400',
      name: 'charActivity2',
      chineseName: '角色活动祈愿-2',
      game: SupportedGame.GENSHIN_IMPACT,
      color: '#FF7A7A',
      isAnalyzable: true,
      description: 'charActivity2Description'
    }
  },

  // 星穹铁道抽卡池类型
  STAR_RAIL: {
    STANDARD: {
      type: '1',
      name: 'standardWarp',
      chineseName: '常驻跃迁',
      game: SupportedGame.STAR_RAIL,
      color: '#B0B0B0',
      isAnalyzable: true,
      description: 'standardWarpDescription'
    },
    CHARACTER_EVENT: {
      type: '2',
      name: 'characterEventWarp',
      chineseName: '角色活动跃迁',
      game: SupportedGame.STAR_RAIL,
      color: '#FF7A7A',
      isAnalyzable: true,
      description: 'characterEventWarpDescription'
    },
    LIGHT_CONE_EVENT: {
      type: '3',
      name: 'lightConeEventWarp',
      chineseName: '光锥活动跃迁',
      game: SupportedGame.STAR_RAIL,
      color: '#FFB466',
      isAnalyzable: true,
      description: 'lightConeEventWarpDescription'
    },
    BEGINNERS: {
      type: '11',
      name: 'beginnersWarp',
      chineseName: '新手跃迁',
      game: SupportedGame.STAR_RAIL,
      color: '#99CCFF',
      isAnalyzable: true,
      description: 'beginnersWarpDescription'
    }
  },

  // 绝区零抽卡池类型
  ZONE_0: {
    STANDARD: {
      type: '1',
      name: 'standardDraw',
      chineseName: '常驻渠道',
      game: SupportedGame.ZENLESS_ZONE,
      color: '#B0B0B0',
      isAnalyzable: true,
      description: 'standardDrawDescription'
    },
    LIMITED_CHARACTER: {
      type: '2',
      name: 'limitedCharacterDraw',
      chineseName: '限定渠道',
      game: SupportedGame.ZENLESS_ZONE,
      color: '#FF7A7A',
      isAnalyzable: true,
      description: 'limitedCharacterDrawDescription'
    },
    LIMITED_WEAPON: {
      type: '3',
      name: 'limitedWeaponDraw',
      chineseName: '武器渠道',
      game: SupportedGame.ZENLESS_ZONE,
      color: '#FFB466',
      isAnalyzable: true,
      description: 'limitedWeaponDrawDescription'
    },
    BEGINNERS: {
      type: '11',
      name: 'beginnersDraw',
      chineseName: '新手渠道',
      game: SupportedGame.ZENLESS_ZONE,
      color: '#99CCFF',
      isAnalyzable: true,
      description: 'beginnersDrawDescription'
    }
  }
};

/**
 * 根据游戏和抽卡池类型ID获取抽卡池类型对象
 * @param {Object} game 游戏对象
 * @param {string|number} typeId 抽卡池类型ID
 * @returns {Object|null} 抽卡池类型对象或null
 */
export function getGachaPoolType(game, typeId) {
  if (!game || !typeId) {
    return null;
  }

  const typeStr = String(typeId);
  
  // 根据游戏获取对应的抽卡池类型集合
  let poolTypes;
  if (game.value === SupportedGame.GENSHIN_IMPACT.value) {
    poolTypes = GachaPoolType.GENSHIN;
  } else if (game.value === SupportedGame.STAR_RAIL.value) {
    poolTypes = GachaPoolType.STAR_RAIL;
  } else if (game.value === SupportedGame.ZENLESS_ZONE.value) {
    poolTypes = GachaPoolType.ZONE_0;
  } else {
    return null;
  }

  // 在对应游戏的抽卡池类型集合中查找匹配的类型
  return Object.values(poolTypes).find(poolType => poolType.type === typeStr) || null;
}

/**
 * 获取指定游戏的所有抽卡池类型
 * @param {Object} game 游戏对象
 * @returns {Array} 抽卡池类型数组
 */
export function getAllGachaPoolTypes(game) {
  if (!game) {
    return [];
  }

  if (game.value === SupportedGame.GENSHIN_IMPACT.value) {
    return Object.values(GachaPoolType.GENSHIN);
  } else if (game.value === SupportedGame.STAR_RAIL.value) {
    return Object.values(GachaPoolType.STAR_RAIL);
  } else if (game.value === SupportedGame.ZENLESS_ZONE.value) {
    return Object.values(GachaPoolType.ZONE_0);
  }

  return [];
}

/**
 * 检查抽卡池类型是否可分析
 * @param {Object} poolType 抽卡池类型对象
 * @returns {boolean} 是否可分析
 */
export function isPoolTypeAnalyzable(poolType) {
  return poolType && poolType.isAnalyzable !== false;
}

/**
 * 获取抽卡池类型的本地化标题
 * @param {Object} poolType 抽卡池类型对象
 * @param {string} lang 语言代码
 * @returns {string} 本地化标题
 */
export function getPoolTypeLocalizedTitle(poolType, lang = 'zh-cn') {
  if (!poolType) {
    return '';
  }

  // 在实际应用中，这里应该使用i18n系统获取本地化标题
  // 现在我们直接返回中文名称作为默认值
  if (lang.startsWith('zh')) {
    return poolType.chineseName;
  }

  // 对于其他语言，我们可以返回英文名称或使用i18n系统
  return poolType.name;
}

/**
 * 获取抽卡池类型的颜色
 * @param {Object} poolType 抽卡池类型对象
 * @returns {string} 颜色代码
 */
export function getPoolTypeColor(poolType) {
  return poolType ? poolType.color : '#B0B0B0';
}

/**
 * 获取抽卡池类型的描述
 * @param {Object} poolType 抽卡池类型对象
 * @param {string} lang 语言代码
 * @returns {string} 描述文本
 */
export function getPoolTypeDescription(poolType, lang = 'zh-cn') {
  if (!poolType) {
    return '';
  }

  // 在实际应用中，这里应该使用i18n系统获取本地化描述
  return poolType.description;
}