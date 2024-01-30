import { Injectable, Logger } from '@nestjs/common';
import { Attachment, AttachmentBuilder } from 'discord.js';
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
  constructor(
    private readonly _logger: Logger,
    private readonly _openaiAudioService: OpenaiAudioService,
  ) {}

  async handleAttachment(attachment: Attachment) {
    const fileType = this.extractFileType(attachment.name);
    let handler;

    if (fileType === 'zip') {
      handler = this.handleZipAttachment.bind(this);
    } else if (this.isAudioType(mime.lookup(attachment.name))) {
      handler = this.handleAudioAttachment.bind(this);
    } else if (this.isVideoType(mime.lookup(attachment.name))) {
      handler = this.handleVideoAttachment.bind(this);
    } else {
      // Attempt to read as text
      try {
        const tempFilePath = await this._downloadAttachment(attachment);
        await fs.promises.readFile(tempFilePath, 'utf8');
        // If this point is reached, it's likely a text file
        handler = this.handleTextAttachment.bind(this);
      } catch (error) {
        // If it's not text, determine the handler based on MIME type
        this._logger.error(`Error determining file type: ${error}`);
        return null;
      }
    }

    try {
      const response = await handler(attachment);
      return this.formatResponse(
        response,
        mime.lookup(attachment.name),
        attachment,
      );
    } catch (error) {
      this._logger.error(`Error processing attachment: ${error}`);
      return null;
    }
  }
  private isAudioType(mimeType: string) {
    return mimeType.startsWith('audio/');
  }

  private isVideoType(mimeType: string) {
    return mimeType.startsWith('video/');
  }

  private async handleAudioAttachment(attachment: Attachment) {
    this._logger.log('Processing audio attachment:', attachment.name);
    const audioFilePath = await this._downloadAttachment(attachment);

    try {
      const transcriptionResponse =
        await this._openaiAudioService.createAudioTranscription({
          file: createReadStream(audioFilePath),
          model: 'whisper-1',
          language: 'en',
          response_format: 'verbose_json',
          temperature: 0,
        });

      this._logger.log(
        `Transcription: ${JSON.stringify(transcriptionResponse.text, null, 2)}`,
      );

      return {
        type: 'transcript',
        rawText: transcriptionResponse.text,
        decorator: `AUDIO TRANSCRIPT: ${attachment.name}`,
        verboseOutput: transcriptionResponse,
      };
    } catch (error) {
      this._logger.error(
        `Error processing audio attachment: ${error.message || error}`,
      );
      throw error;
    } finally {
      await fs.promises.unlink(audioFilePath);
    }
  }

  private async handleTextAttachment(attachment: Attachment) {
    // Add Text processing logic here
    this._logger.log('Processing text attachment:', attachment.name);
    // Example return format (adjust according to your actual logic)
    return {
      type: 'file_text',
      rawText: 'Example text content',
      decorator: `TEXT ATTACHMENT: ${attachment.name}`,
    };
  }

  private async handleVideoAttachment(attachment: Attachment) {
    // Add Video processing logic here
    this._logger.log('Processing video attachment:', attachment.name);
    // Example return format (adjust according to your actual logic)
    return {
      type: 'transcript',
      rawText: 'Example video content',
      decorator: `VIDEO TRANSCRIPT: ${attachment.name}`,
    };
  }

  private async handleZipAttachment(attachment: Attachment) {
    // Add Zip processing logic here
    this._logger.log('Processing zip attachment:', attachment.name);
    // Example return format (adjust according to your actual logic)
    return {
      type: 'zip',
      rawText: 'Example zip content',
      decorator: `ZIP ATTACHMENT: ${attachment.name}`,
    };
  }

  private async _downloadAttachment(attachment: Attachment): Promise<string> {
    this._logger.log('Downloading attachment:', attachment.name);
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
      this._logger.error(`Error downloading attachment: ${error}`);
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

  private extractFileType(filename: string | undefined): string {
    return filename?.split('.').pop() || '';
  }
}
