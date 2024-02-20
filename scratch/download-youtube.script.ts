import * as ytdl from 'ytdl-core';
import * as os from 'os';
import * as fs from 'fs';
import { convertToMp3 } from './convert-to-mp3';

// const youtubeUrl = 'https://www.youtube.com/watch?v=GxKmyKdnTy0';
// const outputFilename = `2022-11-rough-cut-freemocap-tutorial-video-from-youtube.mp4`;

const youtubeUrl = 'https://youtu.be/vyFMcQXDkSo';
const outputFilename = `2024-Spring-Capstone-Video2D-Assignment#3-Part3-DirectInstructions.mp4`;

//paths and stuff
const homeDir = os.homedir();
const skellyBotDataDirectory = `${homeDir}/skelly-bot-data`;
const youtubeDirectory = `${skellyBotDataDirectory}/youtube`;
if (!fs.existsSync(youtubeDirectory)) {
  fs.mkdirSync(youtubeDirectory, { recursive: true });
}
const outputFileAbsolutePath = `${youtubeDirectory}/${outputFilename}`;

const downloadYouTubeVideo = async (
  url: string,
  outputFileAbsolutePath: string,
) => {
  try {
    console.log(
      `Downloading video from '${url}' to '${outputFileAbsolutePath}'...`,
    );
    const stream = ytdl(url, { quality: 'highestaudio' });
    const writeStream = fs.createWriteStream(outputFileAbsolutePath);
    stream.pipe(writeStream);
    return new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', (error) => {
        console.error('Error downloading video:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error downloading video:', error);
  }
};

downloadYouTubeVideo(youtubeUrl, outputFileAbsolutePath)
  .then(() => {
    console.log('Download complete.');
    const outputMp3FileAbsolutePath = `${youtubeDirectory}/${outputFilename.replace(
      '.mp4',
      '.mp3',
    )}`;
    convertToMp3(outputFileAbsolutePath, outputMp3FileAbsolutePath, 25);
  })
  .catch((error) => {
    console.error('Error:', error);
  });

console.log('Script completed');
