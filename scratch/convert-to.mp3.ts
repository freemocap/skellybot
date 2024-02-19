import * as ffmpeg from 'fluent-ffmpeg';

export const convertToMp3 = async (
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
