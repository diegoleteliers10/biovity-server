import { Module } from '@nestjs/common';

@Module({})
export class EmptyDatabaseModule {
  static forRoot() {
    return {
      module: EmptyDatabaseModule,
      imports: [],
    };
  }

  static forFeature() {
    return {
      module: EmptyDatabaseModule,
      imports: [],
    };
  }
}