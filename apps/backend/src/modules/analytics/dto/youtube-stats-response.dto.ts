import { Expose } from "class-transformer";
import { Period } from "~/modules/analytics/dto/get-overview.dto";

export class YoutubeHeatmapCellDto {
  @Expose()
  date!: string;

  @Expose()
  intensity!: number;

  @Expose()
  views!: number;
}

export class YoutubeTopVideoDto {
  @Expose()
  videoId!: string;

  @Expose()
  title!: string;

  @Expose()
  thumbnailUrl!: string;

  @Expose()
  views!: number;

  @Expose()
  retentionRate!: number;

  @Expose()
  sparkline!: number[];
}

export class YoutubeSubscriberPointDto {
  @Expose()
  date!: string;

  @Expose()
  subscribers!: number;

  @Expose()
  subscribersGained!: number;
}

export class YoutubeStatsDto {
  @Expose()
  period!: Period;

  @Expose()
  averageRetention!: number;

  @Expose()
  averageRetentionDelta!: number;

  @Expose()
  subscribersTotal!: number;

  @Expose()
  subscribersGained!: number;

  @Expose()
  heatmap!: YoutubeHeatmapCellDto[];

  @Expose()
  topVideos!: YoutubeTopVideoDto[];

  @Expose()
  subscribersSeries!: YoutubeSubscriberPointDto[];

  @Expose()
  lastUpdatedAt!: Date;
}
