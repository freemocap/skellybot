export class UserCreateDto {
  readonly id: string;
  readonly discordUsername?: string;
  readonly discordId?: string;
  readonly metadata?: object;
}
