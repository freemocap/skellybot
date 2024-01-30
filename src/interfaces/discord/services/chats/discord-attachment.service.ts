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
  constructor(private readonly _openaiAudioService: OpenaiAudioService) {}

  async handleAttachment(attachment: Attachment) {
    const tempFilePath = '';
    try {
      const tempFilePath = await this._downloadAttachment(attachment);
      const mimeType = mime.lookup(attachment.name);

      if (mimeType?.startsWith('audio/')) {
        return await this.handleAudioAttachment(tempFilePath, attachment);
      } else if (mimeType?.startsWith('video/')) {
        return await this.handleVideoAttachment(attachment);
      } else if (path.extname(attachment.name).toLowerCase() === '.zip') {
        return await this.handleZipAttachment(attachment);
      } else {
        // Default to handling as a text file if we don't recognize the file type
        return await this.handleTextAttachment(tempFilePath, attachment);
      }

      // TODO - handle PDF, docx, and other complex text-type attachments
      // TODO - handle image attachments -> would need add `OpenaiImageService` `to OpenaiModule`
      // TODO - handle other attachments?
      // TODO - parse text attachements into json if possible? i.e. .md (by heading/bullet point), .csv, .toml, .yaml, etc
    } catch (error) {
      this.logger.error(`Error handling attachment: ${error}`);
      return null;
    } finally {
      try {
        // Clean up temp file, if it's still around
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

  private async handleVideoAttachment(attachment: Attachment) {
    // Add Video processing logic here - basically, strip the audio and treat it as an audio attachment
    this.logger.log('Processing video attachment:', attachment.name);
    // Example return format (adjust according to your actual logic)
    return {
      type: 'transcript',
      rawText: 'Example video content',
      decorator: `VIDEO TRANSCRIPT: ${attachment.name}`,
    };
  }

  private async handleZipAttachment(attachment: Attachment) {
    // Add Zip processing logic here - basically, unzip it and process each internal file as a separate attachment
    this.logger.log('Processing zip attachment:', attachment.name);
    // Example return format (adjust according to your actual logic)
    return {
      type: 'zip',
      rawText: 'Example zip content',
      decorator: `ZIP ATTACHMENT: ${attachment.name}`,
    };
  }

  private async _downloadAttachment(attachment: Attachment): Promise<string> {
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

  private extractFileType(filename: string | undefined): string {
    return filename?.split('.').pop() || '';
  }
}
