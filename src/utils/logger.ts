import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level: label => {
      return {level: label}
    },
  },
  redact: ['accessToken', 'refreshToken', 'token'],
})

export default logger
