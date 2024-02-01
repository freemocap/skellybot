import { Injectable, Logger } from '@nestjs/common';
import { Attachment } from 'discord.js';
import { OpenaiAudioService } from '../../../../core/ai/openai/openai-audio.service';
import axios from 'axios';
import * as mime from 'mime-types'; // Ensure to import mime-types
import * as path from 'path';
import * as fs from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { promisify } from 'util';
import * as stream from 'stream';

@Injectable()
export class DiscordAttachmentService {
  private readonly logger = new Logger(DiscordAttachmentService.name);

  private fileHandlerMap: Record<
    string,
    (tempFilePath: string, attachment: Attachment) => Promise<any>
  >;

  constructor(private readonly _openaiAudioService: OpenaiAudioService) {
    this.fileHandlerMap = {
      // Audio types
      '.mp3': this.handleAudioAttachment,
      '.wav': this.handleAudioAttachment,
      '.ogg': this.handleAudioAttachment,
      '.flac': this.handleAudioAttachment,
      '.m4a': this.handleAudioAttachment,
      '.aac': this.handleAudioAttachment,
      '.wma': this.handleAudioAttachment,
      // Video types
      '.mp4': this.handleVideoAttachment,
      '.avi': this.handleVideoAttachment,
      '.mov': this.handleVideoAttachment,
      '.wmv': this.handleVideoAttachment,
      '.flv': this.handleVideoAttachment,
      '.mkv': this.handleVideoAttachment,
      '.webm': this.handleVideoAttachment,
      '.mpg': this.handleVideoAttachment,
      '.mpeg': this.handleVideoAttachment,
      '.m4v': this.handleVideoAttachment,
      // ... other file types
      '.zip': this.handleZipAttachment,
      // Default handler for text files and others
      default: this.handleTextAttachment,
    };
  }

  async handleAttachment(attachment: Attachment) {
    this.logger.log('Handling attachment:', attachment.name);
    const tempFilePath = '';
    try {
      const tempFilePath = await this.downloadAttachment(attachment);
      const fileExtension = path.extname(attachment.name).toLowerCase();

      const handler =
        this.fileHandlerMap[fileExtension] || this.fileHandlerMap['default'];
      return await handler.call(this, tempFilePath, attachment);

      // TODOs remain the same
    } catch (error) {
      this.logger.error(`Error handling attachment: ${error}`);
      return null;
    } finally {
      try {
        await fs.promises.unlink(tempFilePath);
      } catch {}
    }
  }

  private async handleAudioAttachment(
    audioFilePath: string,
    attachment: Attachment,
  ) {
    this.logger.log('Processing audio attachment:', attachment.name);

    try {
      const transcriptionResponse =
        await this._openaiAudioService.createAudioTranscription({
          file: createReadStream(audioFilePath),
          model: 'whisper-1',
          language: 'en',
          response_format: 'verbose_json',
          temperature: 0,
        });

      this.logger.log(
        `Transcription: \n\n ${JSON.stringify(
          transcriptionResponse.text,
          null,
          2,
        )}`,
      );

      const rawResponse = {
        type: 'transcript',
        rawText: transcriptionResponse.text,
        decorator: `AUDIO TRANSCRIPT: ${attachment.name}`,
        verboseOutput: transcriptionResponse,
      };
      return this.formatResponse(
        rawResponse,
        mime.lookup(attachment.name),
        attachment,
      );
    } catch (error) {
      this.logger.error(
        `Error processing audio attachment: ${error.message || error}`,
      );
      throw error;
    } finally {
    }
  }

  private async handleTextAttachment(
    tempFilePath: string,
    attachment: Attachment,
  ) {
    this.logger.log('Processing text attachment:', attachment.name);
    try {
      const textFileContent = await fs.promises.readFile(tempFilePath, 'utf-8');
      this.logger.log('Processing text attachment:', attachment.name);
      const rawResponse = {
        type: 'text_file',
        rawText: textFileContent,
        decorator: `TEXT ATTACHMENT: ${attachment.name}`,
      };
      return this.formatResponse(
        rawResponse,
        mime.lookup(attachment.name),
        attachment,
      );
    } catch {
      return false;
    }
  }

  private async handleVideoAttachment(
    tempFilePath: string,
    attachment: Attachment,
  ) {
    this.logger.log('Processing video attachment:', attachment.name);
    // Add Video processing logic here - basically, strip the audio and treat it as an audio attachment
    this.logger.log('Processing video attachment:', attachment.name);
    // Example return format (adjust according to your actual logic)
    return {
      type: 'transcript',
      rawText: 'Example video content',
      decorator: `VIDEO TRANSCRIPT: ${attachment.name}`,
    };
  }

  private async handleZipAttachment(
    tempFilePath: string,
    attachment: Attachment,
  ) {
    this.logger.log('Processing zip attachment:', attachment.name);
    // Add Zip processing logic here - basically, unzip it and process each internal file as a separate attachment
    this.logger.log('Processing zip attachment:', attachment.name);
    // Example return format (adjust according to your actual logic)
    return {
      type: 'zip',
      rawText: 'Example zip content',
      decorator: `ZIP ATTACHMENT: ${attachment.name}`,
    };
  }

  public async downloadAttachment(attachment: Attachment): Promise<string> {
    this.logger.log('Downloading attachment:', attachment.name);
    try {
      const tempDirectoryPath = path.join(__dirname, 'temp');
      const tempFilePath = path.join(
        tempDirectoryPath,
        `tempfile-${path.basename(attachment.name)}`,
      );
      await fs.promises.mkdir(tempDirectoryPath, { recursive: true });
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
      this.logger.error(`Error downloading attachment: ${error}`);
      throw error;
    }
  }

  private formatResponse(
    response: any,
    fileType: string,
    attachment: Attachment,
  ) {
    const simpleUrl = attachment.url.split('?')[0];
    return {
      ...response,
      text: `> ${fileType} file URL: ${simpleUrl}\n\n\`\`\`\n\nBEGIN ${response.decorator}\n\n${response.rawText}\n\nEND ${response.decorator}\n\n\`\`\``,
    };
  }
}
