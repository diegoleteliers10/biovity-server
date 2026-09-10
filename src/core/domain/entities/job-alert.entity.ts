import { JobAlertFrequency } from '../enums';

export class JobAlert {
  constructor(
    public id: string,
    public userId: string,
    public keywords: string | null,
    public location: string | null,
    public category: string | null,
    public frequency: JobAlertFrequency,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}
}
