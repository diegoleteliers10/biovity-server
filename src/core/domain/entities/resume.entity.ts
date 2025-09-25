export class Resume {
  constructor(
    public id: string,
    public userId: string,
    public summary?: string,
    public experiences: {
      jobTitle: string;
      company: string;
      startDate: Date;
      endDate?: Date;
      description?: string;
      achievements?: string[];
    }[] = [],
    public education: {
      institution: string;
      degree: string;
      startDate: Date;
      endDate?: Date;
      description?: string;
    }[] = [],
    public skills: string[] = [],
    public certifications: string[] = [],
    public languages: {
      name: string;
      proficiency: 'basic' | 'intermediate' | 'advanced' | 'native';
    }[] = [],
    public links: string[] = [],
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}
}
