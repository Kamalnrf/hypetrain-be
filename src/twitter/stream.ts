import axios from 'axios'
import logger from 'loglevel'
import {PrismaClient} from '@prisma/client'

const STREAM_URL =
  'https://api.twitter.com/2/tweets/search/stream?tweet.fields=text&expansions=author_id'

const prisma = new PrismaClient()

function isHypetrainUser(authorId: string) {
  const user = prisma.user.findUnique({
    where: {
      twitterId: authorId,
    },
    select: {
      id: true,
      twitterId: true,
    },
  })

  return user
}

type Tweet = {
  author_id: string
  edit_history_tweet_ids: string[]
  id: string
  text: string
}

function verifyAndPushToTweetQueue(tweet: Tweet) {
  const isValidUser = isHypetrainUser(tweet.author_id)
  if (!isValidUser) {
    logger.info(`Tweet ${tweet.id} author is not a member`)
  }

  pushToTweetQueue(tweet)
}

async function pushToTweetQueue(tweet: Tweet) {
  await prisma.tweetQueue.upsert({
    where: {tweetId: tweet.id},
    create: {
      tweetId: tweet.id,
      authorId: tweet.author_id,
      text: tweet.text,
      isHyped: false,
    },
    update: {},
  })
  logger.info(`Added ${tweet.id} to the Tweet Queue`)
}

const streamTweets = async (retryAttempt: number) => {
  const {data: stream} = await axios.get(STREAM_URL, {
    headers: {
      Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
    },
    responseType: 'stream',
  })

  stream
    .on('data', (data: unknown) => {
      try {
        const json = JSON.parse(data as string)
        if (json.connection_issue) {
          streamTweets(++retryAttempt)
        } else {
          if (json.data) {
            logger.info('Received new Tweet in the stream ', json.data)
            verifyAndPushToTweetQueue(json.data)
          } else {
            logger.error(json.data)
          }
        }
      } catch (error) {
        if (
          (data as {detail?: string})?.detail ===
          'This stream is currently at the maximum allowed connection limit.'
        ) {
          logger.error(data)
          process.exit(1)
        }
        // Keep alive signal received. Do nothing.
      }
    })
    .on('err', (error: {code: string}) => {
      if (error?.code !== 'ECONNRESET') {
        logger.error(error.code)
        process.exit(1)
      } else {
        // This reconnection logic will attempt to reconnect when a disconnection is detected.
        // To avoid rate limits, this logic implements exponential backoff, so the wait time
        // will increase if the client cannot reconnect to the stream.
        setTimeout(() => {
          console.warn('A connection error occurred. Reconnecting...')
          streamTweets(++retryAttempt)
        }, 2 ** retryAttempt)
      }
    })
}

export default () => {
  logger.info('Initiating Twitter stream connection')
  streamTweets(0)
}
