export class PipelineStage {
  constructor(
    public id: string,
    public jobId: string,
    public name: string,
    public order: number = 0,
    public color: string = '#6366f1',
  ) {}
}
