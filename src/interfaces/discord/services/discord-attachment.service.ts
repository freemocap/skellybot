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
    let attachmentResponse;
    switch (fileType) {
      case 'mp3':
      case 'wav':
      case 'ogg':
        // Handle audio files
        attachmentResponse = {
          type: 'transcript',
          ...(await this.handleAudioAttachment(attachment)),
        };
        attachmentResponse.rawText = attachmentResponse.text;
        attachmentResponse.text = `BEGIN AUDIO TRANSCRIPT: ${attachment.name}\n\n${attachmentResponse.text}\n\nEND AUDIO TRANSCRIPT: ${attachment.name}\n\n`;
        break;
      case 'mp4':
      case 'avi':
      case 'mkv':
        // Handle video files
        attachmentResponse = {
          type: 'transcript',
          ...(await this.handleAudioAttachment(attachment)),
        };
        attachmentResponse.rawText = attachmentResponse.text;
        attachmentResponse.text = `BEGIN VIDEO TRANSCRIPT: ${attachment.name}\n\n${attachmentResponse.text}\n\nEND VIDEO TRANSCRIPT: ${attachment.name}\n\n`;
        break;
      case 'txt':
      case 'pdf':
        attachmentResponse = {
          type: 'file_text',
          rawText: await this.handleTextAttachment(attachment),
        };
        attachmentResponse.text = `BEGIN TEXT ATTACHMENT: ${attachment.name}\n\n${attachmentResponse.rawText}\n\nEND TEXT ATTACHMENT: ${attachment.name}\n\n`;
        break;
      case 'zip':
        attachmentResponse = {
          type: 'zip',
          rawText: await this.handleZipAttachment(attachment),
        };
        attachmentResponse.text = `BEGIN ZIP ATTACHMENT: ${attachment.name}\n\n${attachmentResponse.rawText}\n\nEND ZIP ATTACHMENT: ${attachment.name}\n\n`;
        break;
      default:
        this._logger.log('Unsupported file type:', fileType);
    }
    return attachmentResponse;
  }

  private async _downloadAttachment(attachment: Attachment): Promise<string> {
    this._logger.log('Processing audio attachment:', attachment.name);

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
  }

  private async handleAudioAttachment(attachment: Attachment) {
    this._logger.log('Processing audio attachment:', attachment.name);
    let tempFilePath: string;

    try {
      // Download attachment
      tempFilePath = await this._downloadAttachment(attachment);

      // Process the downloaded file for transcription
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
      // Clean up the temp file
      if (tempFilePath) {
        try {
          await fs.promises.unlink(tempFilePath);
        } catch (cleanupError) {
          this._logger.error(
            `Failed to clean up temporary file: ${
              cleanupError.message || cleanupError
            }`,
          );
        }
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
