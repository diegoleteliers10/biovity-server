export abstract class BaseMapper<DomainEntity, DataEntity> {
  abstract toDomain(dataEntity: DataEntity): DomainEntity;
  abstract toData(domainEntity: DomainEntity): DataEntity;
}
