/**
 * IndexedDB 服务，用于存储抽卡记录和用户配置
 * 对应 GachaActor 功能
 */
import { GachaEntry } from '../../models/gacha/GachaEntry';
import { GachaProfileID } from '../../models/gacha/GachaProfileID';

// 数据库名称和版本
export const DB_NAME = 'GachaDatabase';
export const DB_VERSION = 1;

// 存储对象名称
export const STORES = {
  GACHA_ENTRIES: 'gachaEntries',
  GACHA_PROFILES: 'gachaProfiles'
};

class GachaDBService {
  constructor() {
    this.db = null;
    this.initPromise = null;
  }

  /**
   * 初始化数据库
   * @returns {Promise<IDBDatabase>} 数据库实例
   */
  async init() {
    if (this.db) {
      return this.db;
    }

    if (!this.initPromise) {
      this.initPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        // 数据库升级或创建
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          
          // 创建抽卡记录存储对象
          if (!db.objectStoreNames.contains(STORES.GACHA_ENTRIES)) {
            const gachaEntriesStore = db.createObjectStore(STORES.GACHA_ENTRIES, {
              keyPath: 'id',
              autoIncrement: false
            });
            // 创建索引
            gachaEntriesStore.createIndex('uid', 'uid', { unique: false });
            gachaEntriesStore.createIndex('game', 'game', { unique: false });
            gachaEntriesStore.createIndex('gachaType', 'gachaType', { unique: false });
            gachaEntriesStore.createIndex('time', 'time', { unique: false });
            gachaEntriesStore.createIndex('rankType', 'rankType', { unique: false });
            gachaEntriesStore.createIndex('uid_gachaType', ['uid', 'gachaType'], { unique: false });
            gachaEntriesStore.createIndex('uid_time', ['uid', 'time'], { unique: false });
          }

          // 创建抽卡配置文件存储对象
          if (!db.objectStoreNames.contains(STORES.GACHA_PROFILES)) {
            const gachaProfilesStore = db.createObjectStore(STORES.GACHA_PROFILES, {
              keyPath: 'id',
              autoIncrement: false
            });
            // 创建索引
            gachaProfilesStore.createIndex('uid', 'uid', { unique: false });
            gachaProfilesStore.createIndex('game', 'game', { unique: false });
          }
        };

        request.onsuccess = (event) => {
          this.db = event.target.result;
          resolve(this.db);
        };

        request.onerror = (event) => {
          console.error('Failed to open IndexedDB:', event.target.error);
          reject(event.target.error);
        };
      });
    }

    return this.initPromise;
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  /**
   * 执行事务操作
   * @param {string} storeName 存储对象名称
   * @param {IDBTransactionMode} mode 事务模式
   * @param {Function} callback 回调函数
   * @returns {Promise<any>} 操作结果
   */
  async executeTransaction(storeName, mode, callback) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        
        const result = callback(store);
        
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = (event) => reject(event.target.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 保存抽卡记录
   * @param {GachaEntry} entry 抽卡记录对象
   * @returns {Promise<string>} 保存的记录ID
   */
  async saveGachaEntry(entry) {
    const jsonData = entry.toJSON();
    await this.executeTransaction(STORES.GACHA_ENTRIES, 'readwrite', (store) => {
      store.put(jsonData);
    });
    return jsonData.id;
  }

  /**
   * 批量保存抽卡记录
   * @param {Array<GachaEntry>} entries 抽卡记录数组
   * @returns {Promise<Array<string>>} 保存的记录ID数组
   */
  async batchSaveGachaEntries(entries) {
    const jsonDataArray = entries.map(entry => entry.toJSON());
    const ids = jsonDataArray.map(data => data.id);
    
    await this.executeTransaction(STORES.GACHA_ENTRIES, 'readwrite', (store) => {
      jsonDataArray.forEach(data => {
        store.put(data);
      });
    });
    
    return ids;
  }

  /**
   * 根据ID获取抽卡记录
   * @param {string} id 记录ID
   * @returns {Promise<GachaEntry|null>} 抽卡记录对象或null
   */
  async getGachaEntryById(id) {
    const result = await this.executeTransaction(STORES.GACHA_ENTRIES, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
    
    return result ? GachaEntry.fromJSON(result) : null;
  }

  /**
   * 获取指定用户的所有抽卡记录
   * @param {string} uid 用户ID
   * @param {string} game 游戏类型
   * @returns {Promise<Array<GachaEntry>>} 抽卡记录数组
   */
  async getGachaEntriesByUid(uid, game) {
    const results = await this.executeTransaction(STORES.GACHA_ENTRIES, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const index = store.index('uid');
        const request = index.getAll(uid);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
    
    // 过滤指定游戏的记录
    const filteredResults = game 
      ? results.filter(entry => entry.game === game)
      : results;
    
    return filteredResults.map(entry => GachaEntry.fromJSON(entry));
  }

  /**
   * 获取指定用户和抽卡类型的抽卡记录
   * @param {string} uid 用户ID
   * @param {string} gachaType 抽卡类型
   * @returns {Promise<Array<GachaEntry>>} 抽卡记录数组
   */
  async getGachaEntriesByUidAndType(uid, gachaType) {
    const results = await this.executeTransaction(STORES.GACHA_ENTRIES, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const index = store.index('uid_gachaType');
        const request = index.getAll([uid, gachaType]);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
    
    return results.map(entry => GachaEntry.fromJSON(entry));
  }

  /**
   * 获取指定用户的所有抽卡记录并按时间排序
   * @param {string} uid 用户ID
   * @param {string} game 游戏类型
   * @param {boolean} ascending 是否升序排列
   * @returns {Promise<Array<GachaEntry>>} 排序后的抽卡记录数组
   */
  async getGachaEntriesByUidSortedByTime(uid, game, ascending = true) {
    const results = await this.executeTransaction(STORES.GACHA_ENTRIES, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.openCursor();
        const entries = [];
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const entry = cursor.value;
            if (entry.uid === uid && (!game || entry.game === game)) {
              entries.push(entry);
            }
            cursor.continue();
          } else {
            // 按时间排序
            entries.sort((a, b) => {
              const timeA = new Date(a.time).getTime();
              const timeB = new Date(b.time).getTime();
              return ascending ? timeA - timeB : timeB - timeA;
            });
            resolve(entries);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    });
    
    return results.map(entry => GachaEntry.fromJSON(entry));
  }

  /**
   * 删除抽卡记录
   * @param {string} id 记录ID
   * @returns {Promise<void>} 操作结果
   */
  async deleteGachaEntry(id) {
    await this.executeTransaction(STORES.GACHA_ENTRIES, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * 删除指定用户的所有抽卡记录
   * @param {string} uid 用户ID
   * @param {string} game 游戏类型
   * @returns {Promise<void>} 操作结果
   */
  async deleteGachaEntriesByUid(uid, game) {
    await this.executeTransaction(STORES.GACHA_ENTRIES, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.openCursor();
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const entry = cursor.value;
            if (entry.uid === uid && (!game || entry.game === game)) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * 清空所有抽卡记录
   * @returns {Promise<void>} 操作结果
   */
  async clearAllGachaEntries() {
    await this.executeTransaction(STORES.GACHA_ENTRIES, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * 保存抽卡配置文件
   * @param {GachaProfileID} profile 配置文件对象
   * @returns {Promise<string>} 保存的配置文件ID
   */
  async saveGachaProfile(profile) {
    const jsonData = profile.toJSON();
    await this.executeTransaction(STORES.GACHA_PROFILES, 'readwrite', (store) => {
      store.put({
        id: profile.id,
        uid: profile.uid,
        game: jsonData.gameValue,
        profileName: profile.profileName
      });
    });
    return profile.id;
  }

  /**
   * 获取抽卡配置文件
   * @param {string} id 配置文件ID
   * @returns {Promise<GachaProfileID|null>} 配置文件对象或null
   */
  async getGachaProfileById(id) {
    const result = await this.executeTransaction(STORES.GACHA_PROFILES, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
    
    return result ? GachaProfileID.fromJSON(result) : null;
  }

  /**
   * 获取所有抽卡配置文件
   * @returns {Promise<Array<GachaProfileID>>} 配置文件数组
   */
  async getAllGachaProfiles() {
    const results = await this.executeTransaction(STORES.GACHA_PROFILES, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
    
    return results.map(profile => GachaProfileID.fromJSON(profile));
  }

  /**
   * 删除抽卡配置文件
   * @param {string} id 配置文件ID
   * @returns {Promise<void>} 操作结果
   */
  async deleteGachaProfile(id) {
    await this.executeTransaction(STORES.GACHA_PROFILES, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * 清空所有抽卡配置文件
   * @returns {Promise<void>} 操作结果
   */
  async clearAllGachaProfiles() {
    await this.executeTransaction(STORES.GACHA_PROFILES, 'readwrite', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * 获取数据库状态信息
   * @returns {Promise<Object>} 数据库状态信息
   */
  async getDatabaseInfo() {
    const entryCount = await this.executeTransaction(STORES.GACHA_ENTRIES, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });

    const profileCount = await this.executeTransaction(STORES.GACHA_PROFILES, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });

    return {
      entryCount,
      profileCount,
      dbName: DB_NAME,
      dbVersion: DB_VERSION,
      stores: Object.values(STORES)
    };
  }
}

// 创建单例实例
export const gachaDBService = new GachaDBService();

// 导出常用的辅助函数
export async function saveGachaEntry(entry) {
  return gachaDBService.saveGachaEntry(entry);
}

export async function batchSaveGachaEntries(entries) {
  return gachaDBService.batchSaveGachaEntries(entries);
}

export async function getGachaEntriesByUid(uid, game) {
  return gachaDBService.getGachaEntriesByUid(uid, game);
}

export async function getGachaEntriesByUidSortedByTime(uid, game, ascending = true) {
  return gachaDBService.getGachaEntriesByUidSortedByTime(uid, game, ascending);
}

export async function deleteGachaEntriesByUid(uid, game) {
  return gachaDBService.deleteGachaEntriesByUid(uid, game);
}

export async function saveGachaProfile(profile) {
  return gachaDBService.saveGachaProfile(profile);
}

export async function getAllGachaProfiles() {
  return gachaDBService.getAllGachaProfiles();
}