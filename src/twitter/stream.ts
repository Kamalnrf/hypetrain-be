import axios from 'axios'
import logger from '../utils/logger'
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

function isUnHypedTweet(text: string) {
  return !text.includes('#hypetrain')
}

async function verifyAndPushToTweetQueue(tweet: Tweet) {
  const isValidUser = await isHypetrainUser(tweet.author_id)
  if (!isValidUser) {
    logger.info({
      message: `Tweet ${tweet.id} author is not a member`,
      tweetId: tweet.id,
      method: 'verifyAndPushToTweetQueue',
    })
    return
  }

  if (isUnHypedTweet(tweet.text)) {
    logger.info({
      message: 'Tweet does not have #hypetrain',
      tweetId: tweet.id,
      method: 'verifyAndPushToTweetQueue',
    })
  }

  if (isRetweet(tweet.text)) {
    logger.info({
      message: `Retweet tweets are not hyped`,
      tweetId: tweet.id,
      method: 'verifyAndPushToTweetQueue',
    })
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
  logger.info({
    message: `Added ${tweet.id} to the Tweet Queue`,
    tweetId: tweet.id,
    authorId: tweet.author_id,
    method: 'pushToTweetQueue',
    event: 'TWEET-ADDED-TO-HYPEQUEUE',
  })
}

async function streamTweets(retryAttempt: number) {
  try {
    const {data: stream} = await axios.get(STREAM_URL, {
      headers: {
        Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
      },
      responseType: 'stream',
    })

    logger.info({message: 'Streaming Tweets', method: 'streamTweets'})
    stream
      .on('data', (data: unknown) => {
        try {
          const json = JSON.parse(data as string)
          if (json.connection_issue) {
            streamTweets(++retryAttempt)
          } else {
            if (json.data) {
              logger.info({
                message: 'Received new Tweet in the stream ',
                data: json.data,
                method: 'streamTweets',
              })
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
            logger.error({
              message:
                'This stream is currently at the maximum allowed connection limit.',
              error: data,
              method: 'streamTweets',
            })
            process.exit(1)
          }
          // Keep alive signal received. Do nothing.
        }
      })
      .on('err', (error: {code: string}) => {
        if (error?.code !== 'ECONNRESET') {
          logger.error({
            message: 'Error consuming the stream',
            code: error.code,
            error: error,
            method: 'streamTweets',
          })
          process.exit(1)
        } else {
          // This reconnection logic will attempt to reconnect when a disconnection is detected.
          // To avoid rate limits, this logic implements exponential backoff, so the wait time
          // will increase if the client cannot reconnect to the stream.
          setTimeout(() => {
            logger.warn({
              message: `A stream connection error occurred. Reconnecting in ${
                2 ** retryAttempt
              }ms...`,
              method: 'streamTweets',
            })
            streamTweets(++retryAttempt)
          }, 2 ** retryAttempt)
        }
      })
  } catch (error) {
    // Igonre this error if it breaks with 429
    // https://twittercommunity.com/t/rate-limit-on-tweets-stream-api/144389/8
    setTimeout(() => {
      logger.warn({
        message: `Unable to create stream connection, will try again in ${
          2 ** retryAttempt
        }ms`,
        error,
      })
      streamTweets(++retryAttempt)
    }, 2 ** retryAttempt)
  }
}

function isRetweet(tweet: string) {
  return tweet.startsWith('RT')
}

async function postman() {
  setInterval(async () => {
    const tweets = await prisma.tweetQueue.findMany({
      where: {
        isHyped: false,
      },
    })

    if (tweets.length > 0) {
      logger.info({
        message: `Found ${tweets.length} tweets to be hyped in Tweet Queue`,
        method: 'postman',
      })
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
            if (user.twitterId !== tweet.authorId && !isRetweet(tweet.text)) {
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

              logger.info({
                message: `Update tweet(${tweet.tweetId}) in Activity for user(${user.userId})`,
                tweetId: tweet.tweetId,
                userId: user.userId,
                method: 'postman',
              })
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
            logger.error({
              message: `Somthing broke in hyping for user ${user.userId}`,
              user: user.userId,
              error,
              method: 'postman',
            })
          }
        })

        logger.info({
          message: `Removing tweet(${tweet.tweetId}) from the queue`,
          tweetId: tweet.tweetId,
          method: 'postman',
          event: 'TWEET-REMOVED-FROM-HYPEQUEUE',
        })

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
