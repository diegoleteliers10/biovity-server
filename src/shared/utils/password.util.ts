import * as bcrypt from 'bcrypt';

/**
 * Configuration for password hashing
 */
export const PASSWORD_CONFIG = {
  /** Salt rounds for bcrypt hashing (higher = more secure but slower) */
  SALT_ROUNDS: 12,
  /** Minimum password length */
  MIN_LENGTH: 8,
  /** Maximum password length */
  MAX_LENGTH: 128,
} as const;

/**
 * Password validation requirements
 */
export interface PasswordRequirements {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

/**
 * Default password requirements
 */
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: PASSWORD_CONFIG.MIN_LENGTH,
  maxLength: PASSWORD_CONFIG.MAX_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

/**
 * Hash a plain text password using bcrypt
 * @param plainPassword - The plain text password to hash
 * @param saltRounds - Number of salt rounds (defaults to PASSWORD_CONFIG.SALT_ROUNDS)
 * @returns Promise<string> - The hashed password
 * @throws Error if hashing fails
 */
export async function hashPassword(
  plainPassword: string,
  saltRounds: number = PASSWORD_CONFIG.SALT_ROUNDS,
): Promise<string> {
  try {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    return await bcrypt.hash(plainPassword, saltRounds);
  } catch (error) {
    throw new Error(
      `Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Compare a plain text password with a hashed password
 * @param plainPassword - The plain text password to verify
 * @param hashedPassword - The hashed password to compare against
 * @returns Promise<boolean> - True if passwords match, false otherwise
 * @throws Error if comparison fails
 */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  try {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Plain password must be a non-empty string');
    }

    if (!hashedPassword || typeof hashedPassword !== 'string') {
      throw new Error('Hashed password must be a non-empty string');
    }

    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    throw new Error(
      `Failed to compare passwords: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Validate password strength against requirements
 * @param password - The password to validate
 * @param requirements - Password requirements (defaults to DEFAULT_PASSWORD_REQUIREMENTS)
 * @returns ValidationResult with isValid flag and errors array
 */
export function validatePasswordStrength(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  // Check length
  if (password.length < requirements.minLength) {
    errors.push(
      `Password must be at least ${requirements.minLength} characters long`,
    );
  }

  if (password.length > requirements.maxLength) {
    errors.push(
      `Password must not exceed ${requirements.maxLength} characters`,
    );
  }

  // Check character requirements
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (requirements.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (
    requirements.requireSpecialChars &&
    !/[!@#$%^&*()_+\-=\\[\]{};':"\\|,.<>\\/?]/.test(password)
  ) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a random password with specified requirements
 * @param length - Password length (defaults to 16)
 * @param requirements - Password requirements (defaults to DEFAULT_PASSWORD_REQUIREMENTS)
 * @returns Generated password string
 */
export function generateRandomPassword(
  length: number = 16,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS,
): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let charset = '';
  let password = '';

  // Ensure at least one character from each required type
  if (requirements.requireUppercase) {
    charset += uppercase;
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
  }

  if (requirements.requireLowercase) {
    charset += lowercase;
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
  }

  if (requirements.requireNumbers) {
    charset += numbers;
    password += numbers[Math.floor(Math.random() * numbers.length)];
  }

  if (requirements.requireSpecialChars) {
    charset += specialChars;
    password += specialChars[Math.floor(Math.random() * specialChars.length)];
  }

  // Fill remaining length with random characters from charset
  const remainingLength = Math.max(0, length - password.length);
  for (let i = 0; i < remainingLength; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle the password to avoid predictable patterns
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Check if a password has been compromised (basic check against common passwords)
 * @param password - The password to check
 * @returns boolean - True if password appears to be compromised
 */
export function isPasswordCompromised(password: string): boolean {
  const commonPasswords = [
    'password',
    '123456',
    '123456789',
    'qwerty',
    'abc123',
    'password123',
    'admin',
    'letmein',
    'welcome',
    'monkey',
    '1234567890',
    'password1',
    '123123',
    '000000',
    'iloveyou',
    'dragon',
    'sunshine',
    'master',
    'hello',
    'freedom',
    'whatever',
    'qazwsx',
    'trustno1',
    'jordan23',
    'harley',
    'password1',
    'jordan',
    'jennifer',
    'superman',
    'princess',
    'michelle',
    'lovely',
    'andrea',
    'caroline',
    'carolina',
    'jordan',
    'lauren',
    'jennifer',
    'brittany',
    'amanda',
    'samantha',
    'batman',
    'summer',
    'hockey',
    'ranger',
    'shadow',
    'melissa',
    'denise',
    'carol',
    'richard',
    'thomas',
    'hockey',
    'ranger',
    'daniel',
    'heather',
    'matthew',
    'jennifer',
    'jason',
    'gary',
    'timothy',
    'jose',
    'larry',
    'jeffrey',
    'frank',
    'scott',
    'eric',
    'stephen',
    'andrew',
    'raymond',
    'gregory',
    'joshua',
    'jerry',
    'dennis',
    'walter',
    'patrick',
    'peter',
    'harold',
    'douglas',
    'henry',
    'carl',
    'arthur',
    'ryan',
    'roger',
    'joe',
    'juan',
    'jack',
    'albert',
    'jonathan',
    'justin',
    'terry',
    'gerald',
    'keith',
    'samuel',
    'willie',
    'ralph',
    'lawrence',
    'nicholas',
    'roy',
    'benjamin',
    'bruce',
    'brandon',
    'adam',
    'harry',
    'fred',
    'wayne',
    'billy',
    'steve',
    'louis',
    'jeremy',
    'aaron',
    'randy',
    'howard',
    'eugene',
    'carlos',
    'russell',
    'bobby',
    'victor',
    'martin',
    'ernest',
    'phillip',
    'todd',
    'jesse',
    'craig',
    'alan',
    'shawn',
    'clarence',
    'sean',
    'philip',
    'chris',
    'johnny',
    'earl',
    'jimmy',
    'antonio',
    'danny',
    'bryan',
    'tony',
    'luis',
    'mike',
    'stanley',
    'leonard',
    'nathan',
    'dale',
    'manuel',
    'rodney',
    'curtis',
    'norman',
    'allen',
    'marvin',
    'vincent',
    'glenn',
    'jeffery',
    'travis',
    'jeff',
    'chad',
    'jacob',
    'lee',
    'melvin',
    'alfred',
    'kyle',
    'francis',
    'bradley',
    'jesus',
    'herbert',
    'frederick',
    'ray',
    'joel',
    'edwin',
    'don',
    'eddie',
    'ricky',
    'troy',
    'randall',
    'barry',
    'alexander',
    'bernard',
    'mario',
    'leroy',
    'francisco',
    'marcus',
    'micheal',
    'theodore',
    'clifford',
    'miguel',
    'oscar',
    'jay',
    'jim',
    'tom',
    'calvin',
    'alex',
    'jon',
    'ronnie',
    'bill',
    'lloyd',
    'tommy',
    'leon',
    'derek',
    'warren',
    'darrell',
    'jerome',
    'floyd',
    'leo',
    'alvin',
    'tim',
    'wesley',
    'gordon',
    'dean',
    'greg',
    'jorge',
    'dustin',
    'pedro',
    'derrick',
    'dan',
    'lewis',
    'zachary',
    'corey',
    'herman',
    'maurice',
    'vernon',
    'roberto',
    'clyde',
    'glen',
    'hector',
    'shane',
    'ricardo',
    'sam',
    'rick',
    'lester',
    'brent',
    'ramon',
    'charlie',
    'tyler',
    'gilbert',
    'gene',
    'marc',
    'reginald',
    'ruben',
    'brett',
    'angel',
    'nathaniel',
    'rafael',
    'leslie',
    'edgar',
    'milton',
    'raul',
    'ben',
    'chesterm',
    'cesar',
    'clifford',
    'clarence',
    'daryl',
    'jamie',
    'jonathan',
    'ronald',
    'allen',
    'wayne',
    'roy',
    'ralph',
    'juan',
    'eugene',
    'russell',
    'bobby',
    'mason',
    'roy',
    'ralph',
    'eugene',
    'russell',
    'bobby',
    'mason',
    'roy',
    'ralph',
    'eugene',
    'russell',
    'bobby',
    'mason',
    'roy',
    'ralph',
    'eugene',
    'russell',
    'bobby',
    'mason',
    'roy',
    'ralph',
    'eugene',
    'russell',
    'bobby',
    'mason',
  ];

  return commonPasswords.includes(password.toLowerCase());
}
