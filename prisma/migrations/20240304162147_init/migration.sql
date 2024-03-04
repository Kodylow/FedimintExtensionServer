-- CreateTable
CREATE TABLE "AppUser" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userHash" TEXT NOT NULL,
    "saltedPasswordHash" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "AppUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_token_key" ON "AppUser"("token");

-- CreateIndex
CREATE UNIQUE INDEX "AppUser_userHash_key" ON "AppUser"("userHash");
