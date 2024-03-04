export class HashGenerator {
    private salt: string;

    constructor() {
        this.salt = process.env.SALT || ''; // Use SALT from environment variables or default to an empty string
    }

    // Function to generate a SHA-256 hash of any string
    public generateHash(input: string): string {
        const hasher = new Bun.CryptoHasher("sha256");
        hasher.update(input);
        const hash = hasher.digest("base64");
        return hash;
    }

    // Function to generate the userHash based on username and replitId
    public generateUserHash(username: string, replitId: number): string {
        return this.generateHash(`${username}${replitId}`);
    }

    // Function to generate the passwordHash
    public generateSaltedHash(password: string): string {
        return this.generateHash(`${password}${this.salt}`);
    }
}

class Token {
    userHash: string;
    saltedHash: string;

    constructor(userHash: string, saltedHash: string) {
        this.userHash = userHash;
        this.saltedHash = saltedHash;
    }

    toString(): string {
        return `${this.userHash}:${this.saltedHash}`;
    }
}

export class BearerTokenGenerator {
    private hashGenerator: HashGenerator;

    constructor() {
        this.hashGenerator = new HashGenerator();
    }

    public generateBearerToken(username: string, replitId: number, password: string): Token {
        username = username.trim().toLowerCase();
        const userHash = this.hashGenerator.generateUserHash(username, replitId);
        const saltedHash = this.hashGenerator.generateSaltedHash(password);
        return new Token(userHash, saltedHash);
    }
}
