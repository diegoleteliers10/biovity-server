import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('offer_letter')
@Index('idx_offer_letter_application', ['applicationId'])
@Index('idx_offer_letter_candidate', ['candidateId'])
export class OfferLetterEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'application_id', type: 'uuid', nullable: false })
  public applicationId: string;

  @Column({ name: 'job_id', type: 'uuid', nullable: false })
  public jobId: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: false })
  public organizationId: string;

  @Column({ name: 'candidate_id', type: 'uuid', nullable: false })
  public candidateId: string;

  @Column({ name: 'chat_id', type: 'uuid', nullable: true })
  public chatId?: string | null;

  @Column({ name: 'message_id', type: 'uuid', nullable: true })
  public messageId?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'sent' })
  public status: 'sent' | 'accepted' | 'rejected';

  @Column({ type: 'varchar', length: 200, nullable: true })
  public title?: string | null;

  @Column({ name: 'letter_data', type: 'jsonb', nullable: false })
  public letterData: Record<string, unknown>;

  @Column({ name: 'pdf_path', type: 'text', nullable: true })
  public pdfPath?: string | null;

  @Column({ name: 'sent_at', type: 'timestamptz', default: () => 'now()' })
  public sentAt: Date;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  public respondedAt?: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  public createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  public updatedAt: Date;
}
