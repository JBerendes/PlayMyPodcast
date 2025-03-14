const axios = require('axios');
const xml2js = require('xml2js');

module.exports = async (req, res) => {
  try {
    const feedUrl = 'https://www.littlestoriestinypeople.com/podcast.xml';
    const response = await axios.get(feedUrl);

    xml2js.parseString(response.data, { explicitArray: false }, (err, result) => {
      if (err) {
        console.error('XML parse error:', err);
        return res.status(500).send('Error parsing podcast feed.');
      }
      let items = result.rss.channel.item;
      items = Array.isArray(items) ? items : [items];

      const mediaObjects = items.map(item => {
        const enclosure = item.enclosure;
        const url = enclosure && enclosure.$.url ? enclosure.$.url : '';
        const title = item.title || 'Podcast Episode';
        return {
          name: title,
          contentUrl: url,
          description: title
        };
      });

      const mediaResponse = {
        payload: {
          google: {
            expectUserResponse: true,
            richResponse: {
              items: [{
                simpleResponse: {
                  textToSpeech: "Playing your podcast playlist"
                }
              }]
            },
            systemIntent: {
              intent: "actions.intent.MEDIA_RESPONSE",
              data: {
                "@type": "type.googleapis.com/google.actions.v2.MediaResponse",
                mediaType: "AUDIO",
                mediaObjects: mediaObjects
              }
            }
          }
        }
      };

      res.json(mediaResponse);
    });
  } catch (error) {
    console.error('Error retrieving podcast feed:', error);
    res.status(500).send('Error retrieving podcast feed.');
  }
};
