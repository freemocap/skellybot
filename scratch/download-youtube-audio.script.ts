import ytdl from 'ytdl-core';
import fs from 'fs';
import os from 'os';

const downloadYouTubeAudio = async (url: string, outputFilename: string) => {
  try {
    const stream = ytdl(url, { quality: 'highestaudio' });
    stream.pipe(fs.createWriteStream(outputFilename));
    console.log(`Downloading audio to ${outputFilename}...`);
    stream.on('end', () => console.log('Download complete.'));
  } catch (error) {
    console.error('Error downloading audio:', error);
  }
};

const homeDir = os.homedir();
const skellyBotDataDirectory = `${homeDir}/skelly-bot-data`;
if (!fs.existsSync(skellyBotDataDirectory)) {
  fs.mkdirSync(skellyBotDataDirectory);
}

const youtubeUrl = 'https://www.youtube.com/watch?v=5qap5aO4i9A';
const outputFilename = `${skellyBotDataDirectory}/youtube/2022-11-rough-cut-freemocap-tutorial-audio-output.mp3`;
console.log(`Downloading audio from '${youtubeUrl}' to '${outputFilename}'...`);
downloadYouTubeAudio(youtubeUrl, outputFilename)
  .then(() => console.log('Download complete!'))
  .catch((e) => console.error('Error downloading audio:', e));

console.log('Done?');
