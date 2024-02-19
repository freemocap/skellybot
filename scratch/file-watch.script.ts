import * as chokidar from 'chokidar';
import * as fs from 'fs';

import { convertToMp3 } from './convert-to.mp3';
import { promisify } from 'util';

const watchThisFolderForNewVideoFolders = 'D:/videos/obs-recordings';

const watcher = chokidar.watch(watchThisFolderForNewVideoFolders, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  depth: Infinity,
  ignoreInitial: true,
});

watcher.on('ready', () => {
  console.log(
    `Watching for new video folders in ${watchThisFolderForNewVideoFolders}`,
  );
});

watcher.on('add', async (path: string) => {
  if (path.endsWith('.mp4')) {
    console.log(`File added: ${path}`);
    await waitForFileToFinishWriting(path);
    convertToMp3(path, path.replace('.mp4', '.mp3'), 25).then(() => {
      console.log('Conversion to mp3 finished.');
    });
  }
});

async function waitForFileToFinishWriting(path: string) {
  let size = 0;
  let newSize = 0;
  do {
    size = newSize;
    await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 seconds delay
    newSize = (await promisify(fs.stat)(path)).size;
  } while (newSize > size);
}
