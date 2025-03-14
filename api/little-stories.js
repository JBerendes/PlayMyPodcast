const axios = require('axios');
const xml2js = require('xml2js');

// In-memory cache and timestamp
let cachedData = null;
let lastFetchTime = 0;
const ONE_DAY = 24 * 60 * 60 * 1000; // milliseconds in one day

module.exports = async (req, res) => {
  const now = Date.now();

  // If we have cached data and it's been less than one day, return it
  if (cachedData && now - lastFetchTime < ONE_DAY) {
    console.log('Returning cached data');
    return res.json(cachedData);
  }

  try {
    const feedUrl = 'https://www.littlestoriestinypeople.com/podcast.xml';
    const response = await axios.get(feedUrl);

    xml2js.parseString(response.data, { explicitArray: false }, (err, result) => {
      if (err) {
        console.error('Error parsing XML:', err);
        return res.status(500).json({ error: 'Error parsing podcast feed' });
      }

      // Extract meta information from the channel element
      const channel = result.rss.channel;
      const meta = {
        title: channel.title,
        link: channel.link,
        pubDate: channel.pubDate,
        lastBuildDate: channel.lastBuildDate,
        ttl: channel.ttl,
        language: channel.language,
        copyright: channel.copyright,
        webMaster: channel.webMaster,
        description: channel.description,
        itunesSubtitle: channel['itunes:subtitle'],
        itunesOwner: channel['itunes:owner'] || {},
        itunesAuthor: channel['itunes:author'],
        itunesExplicit: channel['itunes:explicit'],
        itunesImage: channel['itunes:image'] ? channel['itunes:image'].$.href : null,
        itunesSummary: channel['itunes:summary'],
        image: channel.image
          ? {
              url: channel.image.url,
              title: channel.image.title,
              link: channel.image.link
            }
          : null,
        itunesCategories: channel['itunes:category']
      };

      // Extract podcast episodes (ensure items is an array)
      let items = channel.item;
      if (!Array.isArray(items)) {
        items = [items];
      }

      // Filter out items with "premium" in the title
      items = items.filter(item => !((item.title || '').toLowerCase().includes('premium')));

      // Reverse the order of items
      items = items.reverse();

      const playlist = items.map(item => {
        const enclosure = item.enclosure;
        const url = enclosure && enclosure.$ && enclosure.$.url ? enclosure.$.url : '';
        const title = item.title || 'Podcast Episode';
        const description = item.description || 'Podcast Episode';
        return { title, url, description };
      });

      // Update cache and timestamp
      cachedData = { meta, playlist };
      lastFetchTime = now;
      console.log('Fetched new data and updated cache');
      res.json(cachedData);
    });
  } catch (error) {
    console.error('Error fetching podcast feed:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
