import { Verification } from '../../../core/domain/entities/verification.entity';
import { VerificationEntity } from '../../../infrastructure/database/orm/verification.entity';

export class VerificationDomainOrmMapper {
  static toOrm(domain: Verification): VerificationEntity {
    const verificationOrm = new VerificationEntity();
    verificationOrm.id = domain.id;
    verificationOrm.identifier = domain.identifier;
    verificationOrm.value = domain.value;
    verificationOrm.expiresAt = domain.expiresAt;
    verificationOrm.createdAt = domain.createdAt;
    verificationOrm.updatedAt = domain.updatedAt;

    return verificationOrm;
  }

  static toDomain(entity: VerificationEntity): Verification {
    return new Verification(
      entity.id,
      entity.identifier,
      entity.value,
      entity.expiresAt,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
