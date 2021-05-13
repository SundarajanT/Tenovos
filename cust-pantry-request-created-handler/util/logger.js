const winston = require('winston');
const WinstonCloudWatch = require('winston-cloudwatch');
const config = {
  logLevel: 'info',
  region: 'us-east-1'
}

const consoleLogger = () => new winston.transports.Console({
  name: 'console',
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(info => `[${info.timestamp}] ${info.level} ${info.message}`),
  ),
  handleExceptions: true,
});

/**
* Add different loggers to winston
*/
const init = () => {
  if (!config.logLevel) {
    console.log('Failed to initialized Loggers.  Missing Log Level Environment Variables.');
    return;
  }
  winston.loggers.add('default', {
    level: config.logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
    ),
    transports: [
      consoleLogger(),
    ],
  });
  winston.loggers.add('failure', {
    level: config.logLevel,
    format: winston.format.combine(
      winston.format.timestamp(),
    ),
    transports: [
      consoleLogger(),
      new WinstonCloudWatch({
        name: 'cloud',
        level: config.logLevel,
        messageFormatter: info => `[${info.timestamp}] ${info.level.toUpperCase()} ${info.message}`,
        logGroupName: 'asset-actions-processing-failures',
        logStreamName: `asset-actions-processing-failures-${new Date().getTime()}`,
        awsRegion: config.region,
        handleExceptions: true,
      }),
    ]
  });
};

class Logger {
  static getLogger(name) {
    const logName = name || 'default';
    return winston.loggers.get(logName);
  }

  static flush() {
    winston.loggers.loggers.forEach((logVal) => {
      const log = logVal;
      const transport = log.transports.find(t => t.name === 'cloud');
      if (transport) {
        transport.kthxbye(() => { });
      }
    });
  }

  static updateLevel(level, name) {
    winston.loggers.loggers.forEach((logVal, logKey) => {
      const log = logVal;
      if (!name || logKey === name) {
        log.level = level;
        log.transports.forEach((transportVal) => {
          const transport = transportVal;
          transport.level = level;
        });
      }
    });
  }

  static currentLevel(name) {
    return Logger.getLogger(name).level;
  }

  static debug(message, name) {
    const log = Logger.getLogger(name);
    log.debug(message);
  }

  static info(message, name) {
    const log = Logger.getLogger(name);
    log.info(message);
  }

  static warn(message, name) {
    const log = Logger.getLogger(name);
    log.warn(message);
  }

  static error(message, name) {
    const log = Logger.getLogger(name);
    log.error(message);
  }
}

init();

module.exports = Logger;
