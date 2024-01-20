import { Injectable, Logger } from '@nestjs/common';
import { Attachment } from 'discord.js';
import { OpenaiAudioService } from '../../../core/ai/openai/openai-audio.service';
import axios from 'axios';
import * as path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { promisify } from 'util';
import * as stream from 'stream';
import * as fs from 'fs';

@Injectable()
export class DiscordAttachmentService {
  constructor(
    private readonly _logger: Logger,
    private readonly _openaiAudioService: OpenaiAudioService,
  ) {}

  async handleAttachment(attachment: Attachment) {
    const fileType = attachment.name?.split('.').pop();

    switch (fileType) {
      case 'mp3':
      case 'wav':
      case 'ogg':
        // Handle audio files
        await this.handleAudioAttachment(attachment);
        break;
      case 'mp4':
      case 'avi':
      case 'mkv':
        // Handle video files
        await this.handleVideoAttachment(attachment);
        break;
      case 'txt':
      case 'pdf':
        // Handle text files
        await this.handleTextAttachment(attachment);
        break;
      case 'zip':
        // Handle zip files
        await this.handleZipAttachment(attachment);
        break;
      default:
        this._logger.log('Unsupported file type:', fileType);
    }
  }

  private async handleAudioAttachment(attachment: Attachment) {
    this._logger.log('Processing audio attachment:', attachment.name);

    const tempFilePath = path.join(
      __dirname,
      'temp',
      `tempfile-${path.basename(attachment.name)}`,
    );
    try {
      const writer = createWriteStream(tempFilePath);
      const response = await axios({
        method: 'get',
        url: attachment.url,
        responseType: 'stream',
      });
      response.data.pipe(writer);

      // Use promisify to handle stream finished event with async/await
      const finished = promisify(stream.finished);
      await finished(writer);

      const transcriptionResponse =
        await this._openaiAudioService.createAudioTranscription({
          file: createReadStream(tempFilePath),
          model: 'whisper-1',
          language: 'en',
          response_format: 'verbose_json',
          temperature: 0,
        });

      this._logger.log(
        `Transcription: ${JSON.stringify(transcriptionResponse)}`,
      );
      return transcriptionResponse;
    } catch (error) {
      this._logger.error(
        `Error processing audio attachment: ${error.message || error}`,
      );
      throw error;
    } finally {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        this._logger.error(
          `Failed to clean up temporary file: ${
            cleanupError.message || cleanupError
          }`,
        );
      }
    }
  }

  private async handleVideoAttachment(attachment: Attachment) {
    // Video processing logic here
    this._logger.log('Processing video attachment:', attachment.name);
  }

  private async handleTextAttachment(attachment: Attachment) {
    // Text processing logic here
    this._logger.log('Processing text attachment:', attachment.name);
  }

  private async handleZipAttachment(attachment: Attachment) {
    // Zip processing logic here - unzip and process each file according to its type.
    this._logger.log('Processing zip attachment:', attachment.name);
  }

  private getMimeTypeForExtension(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
    };
    return mimeTypes[extension] || 'application/octet-stream'; // Fallback to binary stream
  }
}
