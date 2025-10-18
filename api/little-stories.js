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
        const title = emojisForText(item.title)+ ' ' + item.title || 'Podcast Episode';
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

// a helper function that checks for words that could be emojis
function containsEmojiWords(text) {
  const emojiWords = [
    'smile', 'heart', 'star', 'fire', 'thumbs up', 'clap', 'laugh', 'cry', 'angry', 'surprised',
    'fox', 'rabbit', 'bear', 'mouse', 'cake', 'sleep', 'train', 'superhero', 'robot', 'moon', 'school',
    'halloween', 'garden', 'tree', 'friend', 'baby', 'pizza', 'cookie', 'bus', 'rocket', 'bee', 'cat',
    'dog', 'owl', 'frog', 'hedgehog', 'squirrel', 'fish', 'turtle', 'star', 'camp', 'picnic', 'balloon',
    'apology', 'birthday', 'circus', 'snow', 'soup', 'jam', 'review', 'family', 'adventure', 'sleep', 'nap',
    'field', 'woods', 'forest', 'house', 'artist', 'mistake', 'garden', 'seed', 'elf', 'valentine', 'friendship', 'school',
    'pet', 'apple', 'painting', 'recipe', 'wait', 'spelling', 'bee', 'city', 'country', 'bow', 'career', 'picnic',
    'apothecary', 'raft', 'pie', 'jam', 'restaurant', 'dormouse'
  ];
  const lowerText = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  return emojiWords.some(word => lowerText.includes(word));
}

module.exports.containsEmojiWords = containsEmojiWords;

function emojisForText(text) {
  const emojiMap = {
    smile: '😊', heart: '❤️', star: '⭐', fire: '🔥', sea: '🌊', book: '📚', tunnel: '🚇', bird: '🐦', caterpillar: '🐛', salamander: '🦎', beetle: '🐞', 'roly poly': '🐞',  'thumbs up': '👍', clap: '👏', laugh: '😂', cry: '😢', angry: '😠', surprised: '😲', music: '🎵',
    fox: '🦊', rabbit: '🐰', bear: '🐻', mouse: '🐭', cake: '🍰', sleep: '😴', train: '🚂', superhero: '🦸', robot: '🤖', moon: '🌙', school: '🏫', night: '🌙', winter: '❄️', summer: '🌞', 'new year': '🎉',
    halloween: '🎃', garden: '🌻', tree: '🌳', friend: '🤝', baby: '👶', pizza: '🍕', cookie: '🍪', bus: '🚌', rocket: '🚀', bee: '🐝', strange: '🌀', swing: '🏖️', voice: '🗣️', bake: '🧁',
    railroad: '🚆', vase: '🏺', van: '🚐', cat: '🐱', dog: '🐶', owl: '🦉', frog: '🐸', hedgehog: '🦔', squirrel: '🐿️', fish: '🐟', turtle: '🐢', camp: '🏕️', picnic: '🧺', balloon: '🎈',
    apology: '🙏', birthday: '🎂', circus: '🎪', snow: '❄️', soup: '🍲', jam: '🍓', review: '📝', family: '👨‍👩‍👧‍👦', adventure: '🗺️', nap: '🛏️', toothbrush: '🪥', snake: '🐍',
    field: '🌾', woods: '🌳🌲', forest: '🌳🌲', house: '🏠', artist: '🎨', mistake: '😬', seed: '🌱', elf: '🧝', valentine: '💌', friendship: '🤗', pet: '🐾',
    apple: '🍎', painting: '🖌️', recipe: '📖', wait: '⏳', spelling: '🔤', city: '🏙️', country: '🌄', bow: '🎀', career: '💼', apothecary: '⚗️',
    raft: '🛶', pie: '🥧', treasure: '💰', plane: '✈️', restaurant: '🍽️', bridge: '🌉', fence: '🪵', pig: '🐷', parrot: '🦜', sick: '🤒', donkey: '🐴', zebra: '🦓', clover: '☘️', poem: '📜', rhyming: '🔔',
    ruby: '💎♦️', dormouse: '🐭', fairy: '🧚', fairies: '🧚', sock: '🧦', sofa: '🛋️', badger: '🦡', mountain: '⛰️', tooth: '🦷', teeth: '🦷', hamster: '🐹', door: '🚪', gnome: '🧙🏻‍♂️🍄'
  };
  const lowerText = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const found = new Set();
  Object.keys(emojiMap).forEach(word => {
    if (lowerText.includes(word)) {
      found.add(emojiMap[word]);
    }
  });
  return Array.from(found).join(' ');
}