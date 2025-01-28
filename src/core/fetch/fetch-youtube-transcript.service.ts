import { Injectable, Logger } from '@nestjs/common';
import fetch from 'node-fetch';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)';
const RE_YOUTUBE =
  /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
const RE_XML_TRANSCRIPT =
  /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;

@Injectable()
class YoutubeTranscriptService {
  private readonly logger = new Logger(YoutubeTranscriptService.name);

  async fetchTranscript(videoId: string) {
    try {
      this.logger.log(`Fetching transcript for video ID: ${videoId}`);
      const videoPageBody = await this.fetchVideoPage(videoId);
      const captions = this.extractCaptions(videoPageBody);
      const transcript = await this.fetchTranscriptData(
        captions.captionTracks[0].baseUrl,
      );
      const metadata = this.extractMetadata(
        videoPageBody,
        videoId,
        captions.captionTracks[0].languageCode,
      );

      this.logger.log(
        `Successfully fetched transcript for video ID: ${videoId}`,
      );
      return { metadata, transcript };
    } catch (error) {
      this.logger.error(
        `Failed to fetch transcript for video ID: ${videoId}`,
        error.stack,
      );
      throw new YoutubeTranscriptError(error.message);
    }
  }

  private async fetchVideoPage(videoId: string): Promise<string> {
    this.logger.log(`Fetching video page for video ID: ${videoId}`);
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch video page.');
    }
    return response.text();
  }

  private extractCaptions(videoPageBody: string) {
    this.logger.log('Extracting captions from video page body');
    const splitHTML = videoPageBody.split('"captions":');
    if (splitHTML.length <= 1) {
      throw new Error('Transcript not available or video is unavailable.');
    }
    const captions = JSON.parse(
      splitHTML[1].split(',"videoDetails')[0].replace('\n', ''),
    ).playerCaptionsTracklistRenderer;
    if (!captions || !captions.captionTracks) {
      throw new Error('No transcripts available for this video.');
    }
    return captions;
  }

  private async fetchTranscriptData(transcriptURL: string) {
    this.logger.log(`Fetching transcript data from URL: ${transcriptURL}`);
    const response = await fetch(transcriptURL, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch transcript.');
    }
    const transcriptBody = await response.text();
    const results = [...transcriptBody.matchAll(RE_XML_TRANSCRIPT)];
    return results.map((result) => ({
      text: result[3],
      duration: parseFloat(result[2]),
      offset: parseFloat(result[1]),
    }));
  }

  private extractMetadata(
    videoPageBody: string,
    videoId: string,
    languageCode: string,
  ) {
    this.logger.log('Extracting metadata from video page body');
    return {
      videoId,
      title: this.extractField(videoPageBody, 'title'),
      author: this.extractField(videoPageBody, 'author'),
      viewCount: this.extractField(videoPageBody, 'viewCount'),
      description: this.extractField(videoPageBody, 'shortDescription'),
      publishedDate: this.extractField(videoPageBody, 'publishDate'),
      channelId: this.extractField(videoPageBody, 'channelId'),
      channelTitle: this.extractField(videoPageBody, 'ownerChannelName'),
      tags: this.extractField(videoPageBody, 'keywords'),
      likeCount: this.extractField(videoPageBody, 'likeCount'),
      dislikeCount: this.extractField(videoPageBody, 'dislikeCount'),
      commentCount: this.extractField(videoPageBody, 'commentCount'),
      duration: this.extractField(videoPageBody, 'lengthSeconds'),
      thumbnailUrl: this.extractField(videoPageBody, 'thumbnailUrl'),
      lang: languageCode,
    };
  }

  private extractField(html: string, key: string) {
    const regex = new RegExp(`"${key}":"(.*?)"`);
    const match = html.match(regex);
    return match ? match[1] : null;
  }

  retrieveVideoId(videoIdOrUrl: string) {
    this.logger.log(`Retrieving video ID from input: ${videoIdOrUrl}`);
    if (videoIdOrUrl.length === 11) {
      return videoIdOrUrl;
    }
    const matchId = videoIdOrUrl.match(RE_YOUTUBE);
    if (matchId && matchId.length) {
      return matchId[1];
    }
    throw new YoutubeTranscriptError('Invalid YouTube video ID or URL.');
  }
}

class YoutubeTranscriptError extends Error {
  constructor(message: string) {
    super(`[YoutubeTranscript] 🚨 ${message}`);
  }
}

export { YoutubeTranscriptService, YoutubeTranscriptError };

async function main() {
  const service = new YoutubeTranscriptService();
  try {
    const result = await service.fetchTranscript('59Etzj5gvsE');
    console.log(result);
  } catch (error) {
    console.error(error.message);
  }
}

main();
