import axios from 'axios'
import logger from 'loglevel'
import {PrismaClient} from '@prisma/client'
import EventEmitter from 'events'
import {lookUpUser, likeTweet, retweet} from './actions'

const postmanEmitter = new EventEmitter()

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

async function verifyAndPushToTweetQueue(tweet: Tweet) {
  const isValidUser = await isHypetrainUser(tweet.author_id)
  if (!isValidUser) {
    logger.info(`Tweet ${tweet.id} author is not a member`)
    return
  }

  pushToTweetQueue(tweet)
  postmanEmitter.emit('tweet')
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

async function streamTweets(retryAttempt: number) {
  try {
    const {data: stream} = await axios.get(STREAM_URL, {
      headers: {
        Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
      },
      responseType: 'stream',
    })

    logger.info('Streaming Tweets')
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
          logger.error('Error consuming the stream', error.code)
          process.exit(1)
        } else {
          // This reconnection logic will attempt to reconnect when a disconnection is detected.
          // To avoid rate limits, this logic implements exponential backoff, so the wait time
          // will increase if the client cannot reconnect to the stream.
          setTimeout(() => {
            logger.warn('A stream connection error occurred. Reconnecting...')
            streamTweets(++retryAttempt)
          }, 2 ** retryAttempt)
        }
      })
  } catch (error) {
    // Igonre this error if it breaks with 429
    // https://twittercommunity.com/t/rate-limit-on-tweets-stream-api/144389/8
    setTimeout(() => {
      logger.warn('Unable to create stream connection', error)
      streamTweets(++retryAttempt)
    }, 2 ** retryAttempt)
  }
}

async function postman() {
  setInterval(async () => {
    const tweets = await prisma.tweetQueue.findMany({
      where: {
        isHyped: false,
      },
    })

    if (tweets.length > 0) {
      logger.info(`Found ${tweets.length} tweets to be hyped in Tweet Queue`)
      tweets.forEach(async tweet => {
        const users: {
          twitterId: string
          likeTweets: boolean
          retweetTweets: boolean
          userId: number
        }[] = await prisma.$queryRaw`
        SELECT 
          *
        FROM "User"
        RIGHT JOIN "Preferences"
          ON "User".id = "Preferences"."userId";`

        users.forEach(async user => {
          try {
            if (user.twitterId !== tweet.authorId) {
              const accessToken = await lookUpUser(user.twitterId)
              let isLiked = false
              let isReTweeted = false
              if (user.likeTweets) {
                isLiked = await likeTweet({
                  twitterAccessToken: accessToken,
                  userId: user.userId,
                  twitterId: user.twitterId,
                  tweetId: tweet.tweetId,
                })
              }

              if (user.retweetTweets) {
                isReTweeted = await retweet({
                  twitterAccessToken: accessToken,
                  userId: user.userId,
                  twitterId: user.twitterId,
                  tweetId: tweet.tweetId,
                })
              }

              logger.info(
                `Update tweet(${tweet.tweetId}) in Activity for user(${user.userId})`,
              )
              await prisma.activity.create({
                data: {
                  tweetId: tweet.tweetId,
                  authorId: tweet.authorId,
                  userId: user.userId,
                  isLike: isLiked,
                  isRetweet: isReTweeted,
                },
              })
            }
          } catch (error) {
            logger.error(error)
          }
        })

        logger.info(`Update tweet(${tweet.tweetId}) from the queue`)
        await prisma.tweetQueue.update({
          where: {
            tweetId: tweet.tweetId,
          },
          data: {
            isHyped: true,
          },
        })
      })
    }
  }, 5000)
}

export default () => {
  logger.info('Initiating Twitter stream connection and postman')
  streamTweets(1)
  postman()
}
