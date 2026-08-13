import {
  SalaryExperienceLevel,
  SalaryEducationLevel,
  SalaryWorkMode,
} from '../enums';

export class SalarySubmission {
  constructor(
    public id: string,
    public profession: string,
    public industry: string,
    public experienceYears: number,
    public experienceLevel: SalaryExperienceLevel,
    public educationLevel: SalaryEducationLevel,
    public region: string,
    public workMode: SalaryWorkMode,
    public monthlySalaryClp: number,
    public annualBonusClp: number = 0,
    public benefits: string[] = [],
    public skills: string[] = [],
    public isVerified: boolean = false,
    public createdAt: Date = new Date(),
  ) {}
}
