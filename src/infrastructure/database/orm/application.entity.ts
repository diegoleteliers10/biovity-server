import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('application')
export class ApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column()
  public jobId: string;

  @Column()
  public candidateId: string;

  @CreateDateColumn()
  public createdAt: Date = new Date();

  @UpdateDateColumn()
  public updatedAt: Date = new Date();

  @Column()
  public status:
    | 'pendiente'
    | 'oferta'
    | 'entrevista'
    | 'rechazado'
    | 'contratado' = 'pendiente';
}
