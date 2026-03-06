export class Resume {
  constructor(
    public id: string,
    public userId: string,
    public summary?: string,
    public experiences: Record<string, unknown>[] = [],
    public education: Record<string, unknown>[] = [],
    public skills: string[] = [],
    public certifications: Record<string, unknown>[] = [],
    public languages: Record<string, unknown>[] = [],
    public links: { url: string }[] = [],
    public cvFile?: {
      url: string;
      originalName?: string;
      mimeType?: string;
      size?: number;
      uploadedAt?: Date;
    },
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}
}
