const { BearerTokenGenerator, HashGenerator } = require("../src/auth");

// command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 3) {
    const hashGenerator = new HashGenerator();
    console.log("args", args);
    console.log("password", args[2])
    const passwordHash = hashGenerator.generateHash(args[2]);
    console.log("passwordHash", passwordHash);
    const tokenGenerator = new BearerTokenGenerator();
    const token = tokenGenerator.generateBearerToken(args[0], parseInt(args[1], 10), passwordHash);
    console.log(token.toString());
  } else {
    console.error("Usage: bun run hashes.js <username> <replitId> <password>");
  }
}
