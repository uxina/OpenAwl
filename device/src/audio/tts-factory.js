/**
 * TTS引擎工厂
 * 统一接口，支持多种TTS引擎
 */

const config = require('../../config/voice-config');
const MeloTTSEngine = require('./melotts-tts');

class TTSFactory {
  static getEngine(engineName = null) {
    const engine = engineName || config.tts.engine;
    
    switch (engine) {
      case 'melotts':
        return new MeloTTSEngine();
      default:
        throw new Error(`不支持的TTS引擎: ${engine}`);
    }
  }
}

module.exports = TTSFactory;
