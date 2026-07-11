export class SavedSearch {
  constructor(
    public id: string,
    public organizationId: string,
    public name: string,
    public filters: Record<string, unknown> = {},
    public notifyEnabled: boolean = false,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}
}
