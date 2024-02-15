import * as ytdl from 'ytdl-core';
import * as os from 'os';
import * as fs from 'fs';

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
const youtubeDirectory = `${skellyBotDataDirectory}/youtube`;
if (!fs.existsSync(youtubeDirectory)) {
  fs.mkdirSync(youtubeDirectory, { recursive: true });
}

const youtubeUrl = 'https://www.youtube.com/watch?v=GxKmyKdnTy0';
const outputFilename = `2022-11-rough-cut-freemocap-tutorial-audio-output.mp3`;
const outputFileAbsolutePath = `${youtubeDirectory}/${outputFilename}`;
console.log(
  `Downloading audio from '${youtubeUrl}' to '${outputFileAbsolutePath}'...`,
);

downloadYouTubeAudio(youtubeUrl, outputFilename)
  .then(() => console.log('Done?'))
  .catch((e) => console.error('Error downloading audio:', e));

console.log('Done?');
