/**
 * 抽卡记录的数据模型，对应PZGachaEntrySendable
 * 用于跨组件传输抽卡数据
 */
export class GachaEntry {
  constructor({
    game = 'GI',
    uid = '000000000',
    gachaType = '5',
    itemID = '',
    count = '1',
    time = '2000-01-01 00:00:00',
    name = 'YJSNPI',
    lang = 'zh-cn',
    itemType = '武器',
    rankType = '3',
    id = '',
    gachaID = '0'
  } = {}) {
    this.game = game;
    this.uid = uid;
    this.gachaType = gachaType;
    this.itemID = itemID || this._generateUUID();
    this.count = count;
    this.time = time;
    this.name = name;
    this.lang = lang;
    this.itemType = itemType;
    this.rankType = rankType;
    this.id = id || this._generateID();
    this.gachaID = gachaID;
  }

  /**
   * 生成唯一ID
   * @private
   * @returns {string} 唯一ID
   */
  _generateID() {
    // 在web环境中，我们可以使用时间戳加随机数生成ID
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${timestamp}-${random}`;
  }

  /**
   * 生成UUID
   * @private
   * @returns {string} UUID
   */
  _generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 将对象转换为JSON格式（用于IndexedDB存储）
   * @returns {Object} JSON格式的对象
   */
  toJSON() {
    return {
      game: this.game,
      uid: this.uid,
      gachaType: this.gachaType,
      itemID: this.itemID,
      count: this.count,
      time: this.time,
      name: this.name,
      lang: this.lang,
      itemType: this.itemType,
      rankType: this.rankType,
      id: this.id,
      gachaID: this.gachaID
    };
  }

  /**
   * 从JSON格式创建GachaEntry实例
   * @param {Object} json JSON格式的对象
   * @returns {GachaEntry} GachaEntry实例
   */
  static fromJSON(json) {
    return new GachaEntry(json);
  }

  /**
   * 获取记录的时间戳（毫秒）
   * @returns {number} 时间戳
   */
  get timestamp() {
    return new Date(this.time).getTime();
  }

  /**
   * 获取物品的星级（数字）
   * @returns {number} 星级
   */
  get starRank() {
    return parseInt(this.rankType, 10);
  }

  /**
   * 检查是否是限定池
   * @returns {boolean} 是否是限定池
   */
  get isLimitedPool() {
    // 根据gachaType判断是否是限定池
    // 原神：
    // - 5: 角色活动祈愿
    // - 6: 武器活动祈愿
    // 星铁：
    // - 1: 角色活动跃迁
    // - 2: 光锥活动跃迁
    // 绝区零：
    // - 1: 限定渠道
    // - 2: 武器渠道
    const limitedTypes = ['5', '6', '1', '2'];
    return limitedTypes.includes(this.gachaType);
  }
}

/**
 * 用于类型检查的接口定义
 */
export class GachaEntryProtocol {
  constructor() {
    throw new Error('GachaEntryProtocol is an interface and cannot be instantiated directly');
  }
}