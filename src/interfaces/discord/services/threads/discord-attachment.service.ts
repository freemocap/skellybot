import { Injectable, Logger } from '@nestjs/common';
import { Attachment } from 'discord.js';
import { OpenaiAudioService } from '../../../../core/ai/openai/openai-audio.service';
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
    const fileType = this.extractFileType(attachment.name);
    let attachmentResponse;

    if (this.isAudio(fileType)) {
      attachmentResponse = await this.processAudioAttachment(
        attachment,
        fileType,
      );
    } else if (this.isVideo(fileType)) {
      attachmentResponse = await this.processVideoAttachment(
        attachment,
        fileType,
      );
    } else if (this.isText(fileType)) {
      attachmentResponse = await this.processTextAttachment(
        attachment,
        fileType,
      );
    } else if (fileType === 'zip') {
      attachmentResponse = await this.processZipAttachment(
        attachment,
        fileType,
      );
    } else {
      this._logger.log('Unsupported file type:', fileType);
    }

    return attachmentResponse
      ? this.formatResponse(attachmentResponse, fileType, attachment)
      : null;
  }

  processAudioAttachment(attachment: Attachment, fileType: string) {
    if (!this.isAudio(fileType)) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    return this.handleAudioAttachment(attachment).then((response) => ({
      type: 'transcript',
      rawText: response.text,
      Decorator: `AUDIO TRANSCRIPT: ${attachment.name}`,
    }));
  }

  processVideoAttachment(attachment: Attachment, fileType: string) {
    if (!this.isVideo(fileType)) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    return this.handleAudioAttachment(attachment).then((response) => ({
      // assuming audio extraction from video
      type: 'transcript',
      rawText: response.text,
      Decorator: `VIDEO TRANSCRIPT: ${attachment.name}`,
    }));
  }

  processTextAttachment(attachment: Attachment, fileType: string) {
    if (!this.isText(fileType)) {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    return this.handleTextAttachment(attachment).then((rawText) => ({
      type: 'file_text',
      rawText,
      Decorator: `TEXT ATTACHMENT: ${attachment.name}`,
    }));
  }

  processZipAttachment(attachment: Attachment, fileType: string) {
    if (fileType !== 'zip') {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    return this.handleZipAttachment(attachment).then((rawText) => ({
      type: 'zip',
      rawText,
      Decorator: `ZIP ATTACHMENT: ${attachment.name}`,
    }));
  }

  formatResponse(response: any, fileType: string, attachment: Attachment) {
    const simpleUrl = attachment.url.split('?')[0];
    return {
      ...response,
      text: `> File URL: ${simpleUrl}\n\n\`\`\`\n\nBEGIN ${response.Decorator}\n\n${response.rawText}\n\nEND ${response.Decorator}\n\n\`\`\``,
    };
  }

  isAudio(fileType: string) {
    return ['mp3', 'wav', 'ogg'].includes(fileType);
  }

  isVideo(fileType: string) {
    return ['mp4', 'avi', 'mkv'].includes(fileType);
  }

  isText(fileType: string) {
    return ['txt', 'md', 'pdf'].includes(fileType);
  }

  extractFileType(filename: string | undefined): string {
    return filename?.split('.').pop() || '';
  }

  private async _downloadAttachment(attachment: Attachment): Promise<string> {
    this._logger.log('Processing audio attachment:', attachment.name);
    try {
      // Define temp directory and file paths
      const tempDirectoryPath = path.join(__dirname, 'temp');
      const tempFilePath = path.join(
        tempDirectoryPath,
        `tempfile-${path.basename(attachment.name)}`,
      );

      // Ensure temp directory exists
      await fs.promises.mkdir(tempDirectoryPath, { recursive: true });

      // Download the attachment and save to file
      const response = await axios({
        method: 'get',
        url: attachment.url,
        responseType: 'stream',
      });

      const writer = createWriteStream(tempFilePath);
      response.data.pipe(writer);
      await promisify(stream.finished)(writer);

      return tempFilePath;
    } catch (error) {
      this._logger.error(`Error downloading attachment: ${error}`);
    }
  }

  private async handleAudioAttachment(attachment: Attachment) {
    this._logger.log('Processing audio attachment:', attachment.name);
    const audioFilePath = await this._downloadAttachment(attachment);

    try {
      // Download attachment

      // Process the downloaded file for transcription
      const transcriptionResponse =
        await this._openaiAudioService.createAudioTranscription({
          file: createReadStream(audioFilePath),
          model: 'whisper-1',
          language: 'en',
          response_format: 'verbose_json',
          temperature: 0,
        });

      this._logger.log(
        `Transcription: ${JSON.stringify(transcriptionResponse, null, 2)}`,
      );
      return { ...transcriptionResponse, audioFilePath };
    } catch (error) {
      this._logger.error(
        `Error processing audio attachment: ${error.message || error}`,
      );
      throw error;
    } finally {
      //delete the audio file
      await fs.promises.unlink(audioFilePath);
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
}
