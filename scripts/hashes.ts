
// Function to generate a SHA-256 hash of any string
function generateHash(input: string): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(input);
  return hasher.digest("base64");
}

// Function to generate the userHash based on username and replitId
function generateUserHash(username: string, replitId: number): string {
  return generateHash(`${username}${replitId}`);
}

// Function to generate the passwordHash
function generatePasswordHash(password: string): string {
  const salt = process.env.SALT; // Use SALT from environment variables or default to an empty string
  return generateHash(password + salt);
}

// Function to generate the bearer token for authentication
function generateBearerToken(username: string, replitId: number, password: string): string {
  username = username.trim().toLowerCase();
  const userHash = generateUserHash(username, replitId);
  const passwordHash = generatePasswordHash(password);
  // Using ':' as a delimiter to separate userHash and passwordHash
  return `${userHash}:${passwordHash}`;
}

// command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 3) {
    console.log(generateBearerToken(args[0], parseInt(args[1], 10), args[2]));
  } else {
    console.error("Usage: bun run hashes.js <username> <replitId> <password>");
  }
}
