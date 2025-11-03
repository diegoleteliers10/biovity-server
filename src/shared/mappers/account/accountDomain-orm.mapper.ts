import { Account } from '../../../core/domain/entities/account.entity';
import { AccountEntity } from '../../../infrastructure/database/orm/account.entity';
import { UserDomainOrmMapper } from '../user/userDomain-orm.mapper';

export class AccountDomainOrmMapper {
  static toOrm(domain: Account): AccountEntity {
    const accountOrm = new AccountEntity();
    accountOrm.id = domain.id;
    accountOrm.providerAccountId = domain.providerAccountId;
    accountOrm.provider = domain.provider;
    accountOrm.userId = domain.userId;
    accountOrm.accessToken = domain.accessToken;
    accountOrm.refreshToken = domain.refreshToken;
    accountOrm.idToken = domain.idToken;
    accountOrm.expiresAt = domain.expiresAt;
    accountOrm.refreshTokenExpiresAt = domain.refreshTokenExpiresAt;
    accountOrm.scope = domain.scope;
    accountOrm.password = domain.password;
    accountOrm.createdAt = domain.createdAt;
    accountOrm.updatedAt = domain.updatedAt;

    // Convert user if it exists
    if (domain.user) {
      accountOrm.user = UserDomainOrmMapper.toOrm(domain.user);
    }

    return accountOrm;
  }

  static toDomain(entity: AccountEntity): Account {
    return new Account(
      entity.id,
      entity.providerAccountId,
      entity.provider,
      entity.userId,
      entity.accessToken,
      entity.refreshToken,
      entity.idToken,
      entity.expiresAt,
      entity.refreshTokenExpiresAt,
      entity.scope,
      entity.password,
      entity.user ? UserDomainOrmMapper.toDomain(entity.user) : undefined,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
