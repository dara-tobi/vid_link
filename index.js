let log = console.log;
let Twitter = require('twitter');
let auth = require('./helpers/auth');
let client = new Twitter(auth);

let phraseListenedFor = '@Vid_Link';
let stream = client.stream('statuses/filter', {
  track: phraseListenedFor
});

stream.on('data', (tweet) => {
  if (tweet.is_quote_status || tweet.in_reply_to_screen_name !== 'Vid_Link' && tweet.retweet_count < 1) {
    let statusId = tweet.is_quote_status ? tweet.quoted_status.id_str : tweet.in_reply_to_status_id_str;
    client.get('statuses/lookup', {
      id: statusId,
      tweet_mode: 'extended'
    }, (err, info, res) => {
      let vidUrl = getVidUrl(res);

      if (vidUrl) {
        let status = prepareStatus(tweet, vidUrl);
        sendStatus(status, tweet.id_str); 
      }
    });
  } else {
    log('IGNORING ', tweet);
  }
});

let prepareStatus = (tweet, vidUrl) => {
  let usernameString = `@${tweet.user.screen_name}`;
  let status = `${usernameString}\n${vidUrl}`;

  return status;
}

let sendStatus = (status, id) => {
  client.post('statuses/update',
    {
      status: status,
      in_reply_to_status_id: id
    }, (err, data) => {
      if (err) {
        throw error;
      }
  });
}

let getVidUrl = (res) => {
  let body = JSON.parse(res.body);
  body = body[0];

  if (body.extended_entities) {
    log(body.extended_entities);
    let variants = body.extended_entities.media[0].video_info.variants;
    let isMp4Variant = (variant) => variant.url.includes('.mp4?');
    let mp4Variants = variants.filter(isMp4Variant);

    if (mp4Variants.length) {
      let highestBitrate = Math.max.apply(Math, mp4Variants.map((variant) => variant.bitrate));
      let highestBitrateVid = mp4Variants.filter((variant) => variant.bitrate === highestBitrate)[0];

      return highestBitrateVid.url;
    }
  }

  return null;
}