import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { bearer } from "@elysiajs/bearer";
import { PrismaClient } from "@prisma/client";
import { FedimintClientBuilder } from "fedimint-ts";
import * as bolt11 from "bolt11";
import { BearerTokenGenerator } from "./auth";

const fedimint = new FedimintClientBuilder()
    .setBaseUrl(process.env.FEDIMINT_BASE_URL || "localhost:3333")
    .setPassword(process.env.FEDIMINT_PASSWORD || "password")
    .setActiveFederationId(
        process.env.FEDIMINT_FEDERATION_ID || "15db8cb4f1ec8e484d73b889372bec94812580f929e8148b7437d359af422cd3"
    )
    .build();

const prisma = new PrismaClient();

const getUser = async (token: string) => {
    return await prisma.appUser.findUnique({
        where: {
            token: token,
        },
    });
};

new Elysia()
    .use(cors())
    .use(bearer())
    .post("/register", async ({ set, body }: any) => {
        const { username, replitId, passwordHash } = body;
        const token = new BearerTokenGenerator().generateBearerToken(username, replitId, passwordHash);
        const user = await prisma.appUser.findUnique({
            where: {
                token: token.toString(),
            },
        });
        if (user != null) {
            set.status = 400;
            return "Invalid request: User already exists";
        }
        await prisma.appUser.create({
            data: {
                userHash: token.userHash,
                saltedPasswordHash: token.saltedHash,
                token: token.toString(),
            },
        });
        return token;
    }, {
        body: t.Object({
            username: t.String(),
            replitId: t.Numeric(),
            passwordHash: t.String(),
        })
    })
    .post("/login", async ({ set, body }: any) => {
        console.log("Login body", body);
        const { username, replitId, passwordHash } = body;
        console.log("username", username, "replitId", replitId, "passwordHash", passwordHash);
        const token = new BearerTokenGenerator().generateBearerToken(username, replitId, passwordHash);
        console.log("token", token.toString());
        const user = await prisma.appUser.findUnique({
            where: {
                token: token.toString(),
            },
        });
        if (user == null) {
            set.status = 400;
            console.log("Invalid request: User does not exist", username, replitId, passwordHash);
            return "Invalid request: User does not exist";
        }
        return {
            token: token.toString(),
            balance: user.balance,
        };
    }, {
        body: t.Object({
            username: t.String(),
            replitId: t.Numeric(),
            passwordHash: t.String(),
        })
    })
    .on("beforeHandle", async ({ bearer, set }) => {
        if (bearer == null) {
            set.status = 401;
            return "Unauthorized: No token";
        }
        const user = await getUser(bearer);
        if (user == null) {
            set.status = 401;
            return "Unauthorized: Invalid token";
        }
    })
    .derive(async ({ bearer, set }) => {
        if (bearer == null) {
            set.status = 401;
            return "Unauthorized: No token";
        }
        const user = await getUser(bearer);
        return { user };
    })
    .get("/balance", ({ user }: any) => {
        console.log("user", user);
        return user.balance;
    })
    .post("/await-invoice", async ({ user, set, body }: any) => {
        console.log("user starting balance", user.balance);
        const decoded = bolt11.decode(body.invoice, body.invoice.startsWith("lntbs")
            ? {
                bech32: "tbs",
                pubKeyHash: 0x6f,
                scriptHash: 0xc4,
                validWitnessVersions: [0, 1],
            }
            : undefined,);

        const amount = decoded.millisatoshis;
        if (amount == null) {
            set.status = 400;
            return "Invalid request: Amount not found";
        }

        const operationId: string | undefined = decoded.tags.find(
            x => x.tagName === "payment_hash"
        )?.data as string | undefined
        if (operationId == null) {
            set.status = 400;
            return "Invalid request: Payment hash not found";
        }

        const awaitInvoiceReq = {operationId};
        const response = await fedimint.ln.awaitInvoice(awaitInvoiceReq);
        if (response == null) {
            set.status = 500;
            return "Internal server error";
        }
        // invoice paid, increment user's balance by amount in invoice
        user = await prisma.appUser.update({
            where: {
                token: user.token,
            },
            data: {
                balance: {
                    increment: parseInt(amount, 10),
                },
            },
        });
        console.log("New balance", user.balance);
        return user.balance;
    }, {
        body: t.Object({
            invoice: t.String(),
        })
    })
    .post("/create-invoice", async ({ user, set, body }: any) => {
        console.log("Create invoice body", body);
        const response = await fedimint.ln.createInvoice(body);
        return response;
    }, {
        body: t.Object({
            amountMsat: t.Numeric(),
            description: t.String(),
        })
    })
    .post("/receive", async ({ user, set, body }: any) => {
        try {
            const response = fedimint.mint.reissue(body);
            console.log("response", response);
            return response;
        } catch (e: any) {
            console.error(e);
            set.status = 400;
            return "Invalid request: " + e.message;
        }
    }, {
        body: t.Object({
            notes: t.String(),
        })
    })
    .post("/spend", async ({ user, set, body }: any) => {
        if (body.amountMsat < user.balance) {
            set.status = 400;
            return "Insufficient funds";
        }
        const response = await fedimint.mint.spend(body);
        console.log("response", response);

        return response;
    }, {
        body: t.Object({
            amountMsat: t.Numeric(),
            allowOverpay: t.Boolean(),
            timeout: t.Numeric(),
        })
    })
    .listen(8080);
console.log("Server running on http://localhost:8080");
