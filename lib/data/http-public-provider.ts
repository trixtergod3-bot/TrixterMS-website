import {
  PUBLIC_API_SCHEMA_VERSION,
  PUBLIC_API_ROUTES,
  type ApiResponse,
  type AchievementDefinition,
  type BossRecord,
  type CharacterProfile,
  type ClassDirectoryEntry,
  type PatchNote,
  type PublicEvent,
  type PublicReadProvider,
  type RareDrop,
  type RankingCatalog,
  type ServerStatus,
  type WorldEvent,
} from '../contracts/public.ts';

type PublicFetch = typeof fetch;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertApiResponseEnvelope(
  value: unknown,
): asserts value is ApiResponse<unknown> {
  if (!isRecord(value) || !('data' in value) || !isRecord(value.meta)) {
    throw new Error('Public read API returned an invalid response envelope');
  }

  const { meta } = value;
  const validSource =
    meta.source === 'fixture' || meta.source === 'public-read-api';
  const validTimestamp =
    typeof meta.generatedAt === 'string' &&
    !Number.isNaN(Date.parse(meta.generatedAt));

  if (
    meta.schemaVersion !== PUBLIC_API_SCHEMA_VERSION ||
    !validSource ||
    !validTimestamp ||
    typeof meta.stale !== 'boolean'
  ) {
    throw new Error('Public read API returned incompatible response metadata');
  }
}

export class HttpPublicReadProvider implements PublicReadProvider {
  private readonly baseUrl: string;
  private readonly request: PublicFetch;

  constructor(baseUrl: string, request: PublicFetch = fetch) {
    this.baseUrl = baseUrl;
    this.request = request;
  }

  private async read<T>(path: string): Promise<ApiResponse<T>> {
    const response = await this.request(new URL(path, this.baseUrl), {
      headers: { accept: 'application/json' },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(3_000),
    });

    if (!response.ok) {
      throw new Error(
        `Public read API returned ${response.status} for ${path}`,
      );
    }

    const body: unknown = await response.json();
    assertApiResponseEnvelope(body);
    return body as ApiResponse<T>;
  }

  getStatus() {
    return this.read<ServerStatus>(PUBLIC_API_ROUTES.status);
  }

  getRankings() {
    return this.read<RankingCatalog>(PUBLIC_API_ROUTES.rankings);
  }

  getCharacter(name: string) {
    return this.read<CharacterProfile | null>(
      PUBLIC_API_ROUTES.character(name),
    );
  }

  getClasses() {
    return this.read<ClassDirectoryEntry[]>(PUBLIC_API_ROUTES.classes);
  }

  getPatchNotes() {
    return this.read<PatchNote[]>(PUBLIC_API_ROUTES.patchNotes);
  }

  getDailyRankings() {
    return this.read<RankingCatalog>(PUBLIC_API_ROUTES.dailyRankings);
  }

  getWorldEvents() {
    return this.read<WorldEvent[]>(PUBLIC_API_ROUTES.worldEvents);
  }

  getAchievements() {
    return this.read<AchievementDefinition[]>(PUBLIC_API_ROUTES.achievements);
  }

  getBossRecords() {
    return this.read<BossRecord[]>(PUBLIC_API_ROUTES.bossRecords);
  }

  getRareDrops() {
    return this.read<RareDrop[]>(PUBLIC_API_ROUTES.rareDrops);
  }

  getEvents() {
    return this.read<PublicEvent[]>(PUBLIC_API_ROUTES.events);
  }
}
