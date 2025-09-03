// Game type enumeration definition
const SupportedGame = {
  GENSHIN_IMPACT: {
    value: 'genshinImpact',
    rawValue: 0,
    uidPrefix: '1',
    hoyoBizID: 'hk4e_global',
    // Will be replaced by i18n in runtime
    localizedDescription: '',
    maxStamina: 200,
    staminaRecoverTime: 8,
    // Stamina recovery speed: minutes per point
    get staminaRecoverRate() {
      return this.staminaRecoverTime;
    },
    // Game asset icons
    assets: {
      primaryStamina: 'resin',
      backupStamina: 'fragile_resin',
      dailyTasks: 'daily_tasks',
      exploration: 'expedition'
    },
    // Formatted game name
    get titleMarkedName() {
      return this.localizedDescription || 'Genshin Impact';
    },
    // Generate UID with prefix
    withUid(uid) {
      return `${this.uidPrefix}${uid}`;
    }
  },
  STAR_RAIL: {
    value: 'starRail',
    rawValue: 1,
    uidPrefix: '2',
    hoyoBizID: 'hkrpg_global',
    // Will be replaced by i18n in runtime
    localizedDescription: '',
    maxStamina: 240,
    staminaRecoverTime: 6,
    // Stamina recovery speed: minutes per point
    get staminaRecoverRate() {
      return this.staminaRecoverTime;
    },
    // Game asset icons
    assets: {
      primaryStamina: 'trailblaze_power',
      backupStamina: 'consumable_power',
      dailyTasks: 'daily_tasks',
      exploration: 'expedition'
    },
    // Formatted game name
    get titleMarkedName() {
      return this.localizedDescription || 'Star Rail';
    },
    // Generate UID with prefix
    withUid(uid) {
      return `${this.uidPrefix}${uid}`;
    }
  },
  ZENLESS_ZONE: {
    value: 'zenlessZone',
    rawValue: 2,
    uidPrefix: '3',
    hoyoBizID: 'nap_global',
    // Will be replaced by i18n in runtime
    localizedDescription: '',
    maxStamina: 150,
    staminaRecoverTime: 8,
    // Stamina recovery speed: minutes per point
    get staminaRecoverRate() {
      return this.staminaRecoverTime;
    },
    // Game asset icons
    assets: {
      primaryStamina: 'vitality',
      backupStamina: 'vitality_potion',
      dailyTasks: 'daily_tasks',
      exploration: 'expedition'
    },
    // Formatted game name
    get titleMarkedName() {
      return this.localizedDescription || 'Zenless Zone';
    },
    // Generate UID with prefix
    withUid(uid) {
      return `${this.uidPrefix}${uid}`;
    }
  }
};

// Get all game types as array
export const getAllGames = () => {
  return Object.values(SupportedGame);
};

// Get game type by value
export const getGameByValue = (value) => {
  return Object.values(SupportedGame).find(game => game.value === value);
};

// Get game type by UID prefix
export const getGameByUid = (uid) => {
  if (!uid) return null;
  const prefix = uid.charAt(0);
  return Object.values(SupportedGame).find(game => game.uidPrefix === prefix);
};

export default SupportedGame;