import * as ytdl from 'ytdl-core';
import * as os from 'os';
import * as fs from 'fs';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';

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

const convertToMp3 = async (
  inputFilePath: string,
  outputFilePath: string,
  targetSizeInMB: number,
) => {
  console.log(`Converting '${inputFilePath}' to mp3...`);
  const durationInSeconds = await getVideoDuration(inputFilePath);
  const bitrate = (targetSizeInMB * 8 * 1024) / durationInSeconds;
  ffmpeg(inputFilePath)
    .audioCodec('libmp3lame')
    .audioBitrate(bitrate)
    .toFormat('mp3')
    .on('end', function () {
      console.log('Conversion to mp3 finished.');
    })
    .on('error', function (err: Error) {
      console.log('Error converting to mp3:', err.message);
    })
    .saveToFile(outputFilePath);
};

const getVideoDuration = (filePath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
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

import chokidar from 'chokidar';

const folderPath: string = '/path/to/your/folder';

const watcher = chokidar.watch(folderPath, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
});

watcher.on('add', (path: string) => {
  if (path.endsWith('.mp4')) {
    console.log(`File added: ${path}`);
    // Trigger your event here
  }
});
console.log('Script completed');
