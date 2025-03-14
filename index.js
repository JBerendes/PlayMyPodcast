const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');

const app = express();
const port = process.env.PORT || 3007;

app.get('/', async (req, res) => {
  try {
    const feedUrl = 'https://www.littlestoriestinypeople.com/podcast.xml';
    const response = await axios.get(feedUrl);

    // Parse the RSS feed XML
    xml2js.parseString(response.data, { explicitArray: false }, (err, result) => {
      if (err) {
        console.error('Error parsing XML:', err);
        return res.status(500).send('Error parsing podcast feed.');
      }

      // Extract podcast items; ensure it's an array
      let items = result.rss.channel.item;
      if (!Array.isArray(items)) {
        items = [items];
      }

      // Build a playlist array from the feed items
      const playlist = items.map(item => {
        const enclosure = item.enclosure;
        const url = enclosure && enclosure.$ && enclosure.$.url ? enclosure.$.url : '';
        const title = item.title || 'Podcast Episode';
        return { title, url };
      });

      // Build the HTML page with a media player and playlist
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Podcast Playlist Player</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              #playlist { margin-top: 20px; }
              #trackList { list-style: none; padding: 0; }
              .track { padding: 5px; cursor: pointer; }
              .track.active { background-color: #ddd; }
            </style>
          </head>
          <body>
            <h1>Podcast Playlist Player</h1>
            <audio id="audioPlayer" controls autoplay></audio>
            <div id="playlist">
              <h3>Playlist</h3>
              <ul id="trackList"></ul>
            </div>
            <script>
              const playlist = ${JSON.stringify(playlist)};
              let currentTrack = 0;
              const audioPlayer = document.getElementById('audioPlayer');
              const trackList = document.getElementById('trackList');
              
              // Function to load and play a track by its index
              function loadTrack(index) {
                if (index >= playlist.length) {
                  return; // End of playlist
                }
                audioPlayer.src = playlist[index].url;
                highlightTrack(index);
                audioPlayer.play();
              }
              
              // Highlight the current track in the playlist
              function highlightTrack(index) {
                const tracks = document.querySelectorAll('.track');
                tracks.forEach((track, idx) => {
                  track.classList.toggle('active', idx === index);
                });
              }
              
              // Populate the track list in the UI
              playlist.forEach((track, index) => {
                const li = document.createElement('li');
                li.textContent = track.title;
                li.className = 'track';
                li.onclick = () => {
                  currentTrack = index;
                  loadTrack(currentTrack);
                };
                trackList.appendChild(li);
              });
              
              // When the current track ends, move to the next one automatically
              audioPlayer.addEventListener('ended', () => {
                currentTrack++;
                if (currentTrack < playlist.length) {
                  loadTrack(currentTrack);
                }
              });
              
              // Start playing the first track
              loadTrack(currentTrack);
            </script>
          </body>
        </html>
      `;
      res.send(html);
    });
  } catch (error) {
    console.error("Error fetching podcast feed:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Media player web server is running on port ${port}`);
  });