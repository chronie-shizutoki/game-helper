/**
 * 用户抽卡配置文件的数据模型，对应GachaProfileID
 */
import SupportedGame, { getGameByValue, getGameByUid } from '../../types/supportedGame';

export class GachaProfileID {
  constructor(uid, game, profileName = null) {
    this.uid = uid;
    this.game = game;
    this.profileName = profileName;
  }

  /**
   * 从UID字符串创建GachaProfileID实例
   * @param {string} uid UID字符串
   * @param {string|null} profileName 配置文件名称
   * @returns {GachaProfileID|null} GachaProfileID实例或null
   */
  static fromUid(uid, profileName = null) {
    if (!uid) {
      return null;
    }

    // 使用现有的getGameByUid函数获取游戏
    const game = getGameByUid(uid);
    if (!game) {
      return null;
    }

    // 去掉前缀获取纯UID
    const pureUid = uid.substring(1);
    if (!pureUid || isNaN(parseInt(pureUid, 10))) {
      return null;
    }

    return new GachaProfileID(pureUid, game, profileName);
  }

  /**
   * 获取包含游戏前缀的完整UID字符串
   * @returns {string} 格式为"{gamePrefix}{uid}"的字符串
   */
  get fullUid() {
    return `${this.game.uidPrefix}${this.uid}`;
  }

  /**
   * 获取唯一标识符
   * @returns {string} 唯一标识符
   */
  get id() {
    return `${this.game.value}_${this.uid}`;
  }

  /**
   * 将对象转换为JSON格式（用于IndexedDB存储）
   * @returns {Object} JSON格式的对象
   */
  toJSON() {
    return {
      uid: this.uid,
      gameValue: this.game.value,
      profileName: this.profileName
    };
  }

  /**
   * 从JSON格式创建GachaProfileID实例
   * @param {Object} json JSON格式的对象
   * @returns {GachaProfileID} GachaProfileID实例
   */
  static fromJSON(json) {
    const game = getGameByValue(json.gameValue);
    return new GachaProfileID(json.uid, game || SupportedGame.GENSHIN_IMPACT, json.profileName);
  }

  /**
   * 比较两个GachaProfileID实例是否相等
   * @param {GachaProfileID} other 另一个GachaProfileID实例
   * @returns {boolean} 是否相等
   */
  equals(other) {
    if (!(other instanceof GachaProfileID)) {
      return false;
    }
    return this.uid === other.uid && this.game.value === other.game.value;
  }
}

/**
 * 用于类型检查的接口定义
 */
export class GachaProfileIDProtocol {
  constructor() {
    throw new Error('GachaProfileIDProtocol is an interface and cannot be instantiated directly');
  }
}